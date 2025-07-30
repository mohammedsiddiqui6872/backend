const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../../middleware/auth');

router.use(authenticate);
router.use(authorize('admin', 'manager'));

// Get real-time metrics
router.get('/metrics/live', async (req, res) => {
  try {
    const [
      occupancy,
      activeOrders,
      kitchenLoad,
      staffOnline,
      todayRevenue
    ] = await Promise.all([
      calculateOccupancy(),
      Order.countDocuments({ 
        status: { $in: ['confirmed', 'preparing'] } 
      }),
      calculateKitchenLoad(),
      User.countDocuments({ isOnline: true }),
      calculateTodayRevenue()
    ]);
    
    res.json({
      currentOccupancy: occupancy,
      activeOrders,
      kitchenLoad,
      staffOnDuty: staffOnline,
      todayRevenue,
      avgWaitTime: await calculateAvgWaitTime()
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Broadcast message to staff
router.post('/broadcast', async (req, res) => {
  try {
    const { message, target, priority } = req.body;
    
    const broadcast = {
      id: Date.now(),
      message,
      from: req.user.name,
      priority,
      timestamp: new Date()
    };
    
    // Send to appropriate channels
    if (target === 'all' || target === 'kitchen') {
      req.app.get('io').to('kitchen').emit('broadcast-message', broadcast);
    }
    if (target === 'all' || target === 'waiters') {
      req.app.get('io').to('waiters').emit('broadcast-message', broadcast);
    }
    
    // Store in database
    await Broadcast.create({
      ...broadcast,
      sentBy: req.user._id,
      target
    });
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Quick actions
router.post('/quick-action', async (req, res) => {
  try {
    const { action, data } = req.body;
    
    switch (action) {
      case 'close-kitchen':
        await MenuItem.updateMany({}, { available: false });
        req.app.get('io').emit('kitchen-closed');
        break;
        
      case 'stop-orders':
        await Setting.findOneAndUpdate(
          { key: 'accepting_orders' },
          { value: false }
        );
        break;
        
      case 'emergency':
        req.app.get('io').emit('emergency-alert', {
          message: data.message,
          severity: 'critical'
        });
        break;
    }
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});