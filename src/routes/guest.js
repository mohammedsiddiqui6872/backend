const express = require('express');
const router = express.Router();
const CustomerSession = require('../models/CustomerSession');
const Order = require('../models/Order');
const Table = require('../models/Table');
const MenuItem = require('../models/MenuItem');
const Category = require('../models/Category');

// Guest endpoints - no authentication required

// Get active customer session for a table
router.get('/customer-session/table/:tableNumber', async (req, res) => {
  try {
    const { tableNumber } = req.params;
    
    // Log for debugging
    console.log('Guest API - Getting session for table:', tableNumber, 'Tenant:', req.tenant?.tenantId);
    
    // For guest sessions, we'll just return null if no waiter-created session exists
    // The frontend can handle creating a guest session locally
    const session = await CustomerSession.findOne({
      tableNumber,
      isActive: true,
      tenantId: req.tenant?.tenantId
    });
    
    // Return empty data if no session found instead of null
    res.json({ success: true, data: session || null });
  } catch (error) {
    console.error('Error fetching customer session:', error);
    res.status(500).json({ success: false, message: 'Error fetching session' });
  }
});

// Create customer session (guest welcome screen)
router.post('/customer-session', async (req, res) => {
  try {
    const { tableNumber, customerName, customerPhone, customerEmail, occupancy } = req.body;
    
    console.log('Guest API - Creating session:', { tableNumber, customerName, tenantId: req.tenant?.tenantId });
    
    if (!tableNumber || !customerName) {
      return res.status(400).json({ 
        success: false,
        message: 'Table number and customer name are required' 
      });
    }
    
    // Check if table exists - use String() to ensure proper comparison
    const table = await Table.findOne({ 
      number: String(tableNumber),
      tenantId: req.tenant?.tenantId 
    });
    
    if (!table) {
      return res.status(404).json({ 
        success: false,
        message: 'Table not found' 
      });
    }
    
    // For guest sessions, we don't need to create a CustomerSession
    // since that requires a waiter. Instead, we'll just validate the table
    // and return a simple session object that the frontend can use
    
    // Generate a unique session ID for this guest session
    const sessionId = `guest-${tableNumber}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // Return a session-like object without saving to database
    // This avoids the waiter requirement while still allowing guests to order
    const guestSessionData = {
      _id: sessionId,
      sessionId: sessionId,
      tenantId: req.tenant?.tenantId,
      tableNumber,
      customerName,
      customerPhone,
      customerEmail,
      occupancy: occupancy || 1,
      startTime: new Date(),
      isActive: true,
      status: 'active',
      orders: []
    };
    
    res.json({ 
      success: true, 
      data: guestSessionData,
      message: 'Welcome! You can now place your order.' 
    });
  } catch (error) {
    console.error('Error creating customer session:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error creating session' 
    });
  }
});

// Create order (guest)
router.post('/orders', async (req, res) => {
  try {
    const { tableNumber, items, customerName, customerPhone, specialInstructions } = req.body;
    
    if (!tableNumber || !items || items.length === 0) {
      return res.status(400).json({ 
        success: false,
        message: 'Table number and items are required' 
      });
    }
    
    // Calculate total amount
    const totalAmount = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    
    // Create order
    const order = new Order({
      tenantId: req.tenant?.tenantId,
      tableNumber,
      customerName: customerName || 'Guest',
      customerPhone,
      items,
      totalAmount,
      specialInstructions,
      status: 'pending',
      paymentStatus: 'pending',
      orderType: 'dine-in',
      source: 'guest-app'
    });
    
    await order.save();
    
    // For guest orders, we don't need to update a session
    // The order itself contains all necessary information
    // If there's a waiter-created session, update it
    const session = await CustomerSession.findOne({
      tableNumber,
      isActive: true,
      tenantId: req.tenant?.tenantId
    });
    
    if (session) {
      session.orders.push(order._id);
      await session.save();
    }
    
    // Emit order to kitchen
    const io = req.app.get('io');
    io.to(`tenant-${req.tenant?.tenantId}`).emit('new-order', order);
    
    res.json({ 
      success: true, 
      data: order,
      message: 'Order placed successfully!' 
    });
  } catch (error) {
    console.error('Error creating guest order:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error creating order' 
    });
  }
});

// Get orders for a table
router.get('/orders/table/:tableNumber', async (req, res) => {
  try {
    const { tableNumber } = req.params;
    
    const orders = await Order.find({
      tableNumber,
      tenantId: req.tenant?.tenantId,
      createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } // Last 24 hours
    }).sort({ createdAt: -1 });
    
    res.json({ success: true, data: orders });
  } catch (error) {
    console.error('Error fetching table orders:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching orders' 
    });
  }
});

// Track order status
router.get('/orders/:orderId/track', async (req, res) => {
  try {
    const { orderId } = req.params;
    
    const order = await Order.findOne({
      _id: orderId,
      tenantId: req.tenant?.tenantId
    }).select('orderNumber status items totalAmount createdAt estimatedTime');
    
    if (!order) {
      return res.status(404).json({ 
        success: false,
        message: 'Order not found' 
      });
    }
    
    res.json({ success: true, data: order });
  } catch (error) {
    console.error('Error tracking order:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error tracking order' 
    });
  }
});

// Call waiter
router.post('/call-waiter', async (req, res) => {
  try {
    const { tableNumber, reason } = req.body;
    
    if (!tableNumber) {
      return res.status(400).json({ 
        success: false,
        message: 'Table number is required' 
      });
    }
    
    // Emit waiter call notification
    const io = req.app.get('io');
    io.to(`tenant-${req.tenant?.tenantId}`).emit('waiter-call', {
      tableNumber,
      reason: reason || 'Customer needs assistance',
      timestamp: new Date()
    });
    
    res.json({ 
      success: true, 
      message: 'Waiter has been notified' 
    });
  } catch (error) {
    console.error('Error calling waiter:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error calling waiter' 
    });
  }
});

// Service request (more comprehensive than call-waiter)
router.post('/service-request', async (req, res) => {
  try {
    const { tableNumber, type, message, urgent } = req.body;
    
    if (!tableNumber || !type) {
      return res.status(400).json({ 
        success: false,
        message: 'Table number and request type are required' 
      });
    }
    
    // Map request types to messages
    const requestMessages = {
      'call-waiter': 'Customer requests waiter assistance',
      'water': 'Customer needs water refill',
      'napkins': 'Customer needs napkins',
      'bill': 'Customer requests the bill',
      'other': message || 'Customer needs assistance'
    };
    
    // Emit service request notification
    const io = req.app.get('io');
    io.to(`tenant-${req.tenant?.tenantId}`).emit('service-request', {
      tableNumber,
      type,
      message: requestMessages[type] || message,
      urgent: urgent || false,
      timestamp: new Date()
    });
    
    res.json({ 
      success: true, 
      data: {
        message: 'Service request sent successfully',
        type,
        estimatedTime: type === 'bill' ? 5 : 2 // Minutes
      }
    });
  } catch (error) {
    console.error('Error creating service request:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error creating service request' 
    });
  }
});

// Submit feedback
router.post('/feedback', async (req, res) => {
  try {
    const { 
      tableNumber, 
      sessionId, 
      rating, 
      foodQuality, 
      serviceQuality, 
      ambiance, 
      comments 
    } = req.body;
    
    if (!tableNumber || !rating) {
      return res.status(400).json({ 
        success: false,
        message: 'Table number and rating are required' 
      });
    }
    
    // Create feedback object
    const feedback = {
      tenantId: req.tenant?.tenantId,
      tableNumber,
      sessionId,
      rating,
      foodQuality,
      serviceQuality,
      ambiance,
      comments,
      createdAt: new Date()
    };
    
    // TODO: Save feedback to database when Feedback model is created
    console.log('Guest feedback received:', feedback);
    
    // Emit feedback notification to admin
    const io = req.app.get('io');
    io.to(`tenant-${req.tenant?.tenantId}`).emit('new-feedback', feedback);
    
    res.json({ 
      success: true, 
      message: 'Thank you for your feedback!' 
    });
  } catch (error) {
    console.error('Error submitting feedback:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error submitting feedback' 
    });
  }
});

// Get table information
router.get('/table/:tableNumber/info', async (req, res) => {
  try {
    const { tableNumber } = req.params;
    
    const table = await Table.findOne({ 
      number: String(tableNumber),
      tenantId: req.tenant?.tenantId 
    });
    
    if (!table) {
      return res.status(404).json({ 
        success: false,
        message: 'Table not found' 
      });
    }
    
    // Get active orders for the table
    const activeOrders = await Order.find({
      tableNumber,
      tenantId: req.tenant?.tenantId,
      status: { $in: ['pending', 'preparing', 'ready'] }
    }).sort({ createdAt: -1 });
    
    // Get active session
    const session = await CustomerSession.findOne({
      tableNumber,
      isActive: true,
      tenantId: req.tenant?.tenantId
    });
    
    res.json({ 
      success: true, 
      data: {
        table: {
          number: table.number,
          capacity: table.capacity,
          status: table.status,
          section: table.section
        },
        activeOrders: activeOrders.length,
        currentSession: session ? {
          customerName: session.customerName,
          occupancy: session.occupancy,
          startTime: session.startTime
        } : null
      }
    });
  } catch (error) {
    console.error('Error fetching table info:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching table information' 
    });
  }
});

// Get wait time estimates
router.get('/wait-times', async (req, res) => {
  try {
    // Get current order statistics
    const now = new Date();
    const thirtyMinutesAgo = new Date(now - 30 * 60 * 1000);
    
    const recentOrders = await Order.find({
      tenantId: req.tenant?.tenantId,
      createdAt: { $gte: thirtyMinutesAgo },
      status: { $in: ['pending', 'preparing'] }
    });
    
    // Calculate average wait times based on current load
    const pendingCount = recentOrders.filter(o => o.status === 'pending').length;
    const preparingCount = recentOrders.filter(o => o.status === 'preparing').length;
    
    // Base wait times (in minutes)
    const baseWaitTimes = {
      appetizers: 10,
      mainCourse: 20,
      desserts: 15,
      beverages: 5
    };
    
    // Adjust based on kitchen load
    const loadMultiplier = 1 + (pendingCount + preparingCount) * 0.1;
    
    const adjustedWaitTimes = {};
    for (const [category, baseTime] of Object.entries(baseWaitTimes)) {
      adjustedWaitTimes[category] = Math.round(baseTime * loadMultiplier);
    }
    
    res.json({ 
      success: true, 
      data: {
        estimatedWaitTimes: adjustedWaitTimes,
        kitchenLoad: pendingCount + preparingCount > 10 ? 'high' : 
                     pendingCount + preparingCount > 5 ? 'medium' : 'low',
        lastUpdated: now
      }
    });
  } catch (error) {
    console.error('Error calculating wait times:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error calculating wait times' 
    });
  }
});

module.exports = router;