// src/routes/customerSessions.js
const express = require('express');
const router = express.Router();
const CustomerSession = require('../models/CustomerSession');
const TableSession = require('../models/TableSession');
const TableState = require('../models/TableState');
const WaiterSession = require('../models/WaiterSession');
const Order = require('../models/Order');
const Table = require('../models/Table');
const { authenticate } = require('../middleware/auth');

// Test endpoint - remove after testing
router.get('/test', (req, res) => {
  res.json({ message: 'Customer sessions route is working!' });
});

// Create customer session (after welcome screen)
router.post('/create', authenticate, async (req, res) => {
  try {
    const { tableNumber, customerName, customerPhone, customerEmail, occupancy } = req.body;
    
    // Validate required fields
    if (!tableNumber || !customerName) {
      return res.status(400).json({ 
        error: 'Table number and customer name are required' 
      });
    }
    
    // NEW: Check if waiter is assigned to this table
    const tableState = await TableState.findOne({ tableNumber: String(tableNumber) });
    
    if (!tableState) {
      return res.status(404).json({ 
        error: 'Table not found' 
      });
    }
    
    // Check if waiter has access to this table
    const hasAccess = tableState.currentWaiter?.toString() === req.user._id.toString() ||
                     tableState.assistingWaiters.some(w => w.toString() === req.user._id.toString());
    
    if (!hasAccess) {
      return res.status(403).json({ 
        error: 'You are not assigned to this table' 
      });
    }
    
    // Check if there's already an active customer session for this table
    const existingSession = await CustomerSession.findOne({
      tableNumber: String(tableNumber),
      isActive: true
    });
    
    if (existingSession) {
      return res.status(400).json({ 
        error: 'Active customer session already exists for this table' 
      });
    }
    
    // Create new customer session with new fields
    const customerSession = new CustomerSession({
      tableNumber: String(tableNumber),
      primaryWaiter: req.user._id,
      waiter: req.user._id, // Keep for backward compatibility
      customerName,
      customerPhone: customerPhone || null,
      customerEmail: customerEmail || null,
      occupancy: occupancy || 1,
      loginTime: new Date(),
      isActive: true,
      status: 'active'
    });
    
    await customerSession.save();
    
    // Update table state
    await tableState.setCustomerSession(customerSession._id);
    
    // Start service history tracking
    try {
      const tableServiceHistoryService = req.app.get('tableServiceHistoryService');
      if (tableServiceHistoryService) {
        const table = await Table.findOne({ 
          number: String(tableNumber),
          tenantId: req.tenantId 
        });
        
        if (table) {
          await tableServiceHistoryService.startService(
            req.tenantId,
            table._id,
            String(tableNumber),
            {
              sessionId: customerSession._id,
              sessionMetricsId: null, // Will be set later when metrics are available
              customerName,
              customerPhone,
              numberOfGuests: occupancy || 1,
              waiterId: req.user._id,
              waiterName: req.user.name,
              notes: `Session started by ${req.user.name}`
            }
          );
        }
      }
    } catch (serviceError) {
      console.warn('Service history tracking failed:', serviceError);
      // Don't fail the session creation
    }
    
    // Check if there are any existing orders on this table that should be linked
    const existingOrders = await Order.find({
      tableNumber: String(tableNumber),
      status: { $in: ['pending', 'confirmed', 'preparing', 'ready', 'served'] },
      paymentStatus: { $ne: 'paid' },
      customerSessionId: null // Not already linked to a session
    });
    
    if (existingOrders.length > 0) {
      // Link existing orders to this new session
      const orderIds = existingOrders.map(o => o._id);
      customerSession.orders = orderIds;
      customerSession.totalAmount = existingOrders.reduce((sum, o) => sum + (o.total || 0), 0);
      await customerSession.save();
      
      // Update orders to link to this session
      await Order.updateMany(
        { _id: { $in: orderIds } },
        { $set: { customerSessionId: customerSession._id } }
      );
    }
    
    // Emit socket event for real-time updates
    if (req.app.get('io')) {
      req.app.get('io').emit('customer-session-created', {
        tableNumber: String(tableNumber),
        customerName,
        occupancy: occupancy || 1,
        waiter: req.user.name,
        timestamp: new Date()
      });
    }
    
    res.json({
      success: true,
      session: customerSession,
      message: 'Customer session created successfully'
    });
  } catch (error) {
    console.error('Error creating customer session:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get active customer session for a table
router.get('/table/:tableNumber', authenticate, async (req, res) => {
  try {
    const session = await CustomerSession.getActiveSession(req.params.tableNumber);
    res.json({ activeSession: session || null });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Check for active customer session (for login resume)
router.get('/active/:tableNumber', authenticate, async (req, res) => {
  try {
    // First check for active customer session
    let session = await CustomerSession.findOne({
      tableNumber: String(req.params.tableNumber),
      isActive: true
    }).populate('waiter', 'name').populate('orders');
    
    // If no customer session, check if there are active orders on this table
    if (!session) {
      const activeOrders = await Order.find({
        tableNumber: String(req.params.tableNumber),
        status: { $in: ['pending', 'confirmed', 'preparing', 'ready', 'served'] },
        paymentStatus: { $ne: 'paid' }
      }).sort('-createdAt');
      
      if (activeOrders.length > 0) {
        // Create a virtual session from the order data
        const latestOrder = activeOrders[0];
        session = {
          _id: null,
          tableNumber: req.params.tableNumber,
          customerName: latestOrder.customerName || 'Guest',
          customerPhone: latestOrder.customerPhone,
          customerEmail: latestOrder.customerEmail,
          orders: activeOrders.map(o => o._id),
          totalAmount: activeOrders.reduce((sum, o) => sum + (o.total || 0), 0),
          loginTime: latestOrder.createdAt,
          isActive: true,
          isVirtual: true // Flag to indicate this is reconstructed from orders
        };
      }
    }
    
    res.json({
      activeSession: session || null
    });
  } catch (error) {
    console.error('Error checking active session:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update customer session with order
router.patch('/:sessionId/order', authenticate, async (req, res) => {
  try {
    const { orderId, orderAmount } = req.body;
    
    const session = await CustomerSession.findById(req.params.sessionId);
    
    if (!session) {
      return res.status(404).json({ error: 'Customer session not found' });
    }
    
    if (!session.isActive) {
      return res.status(400).json({ error: 'Customer session is not active' });
    }
    
    // Add order to session
    session.orders.push(orderId);
    session.totalAmount += orderAmount || 0;
    
    await session.save();
    
    res.json({
      success: true,
      session,
      message: 'Order added to customer session'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Checkout customer session (before feedback)
router.post('/:sessionId/checkout', authenticate, async (req, res) => {
  try {
    const session = await CustomerSession.findById(req.params.sessionId);
    
    if (!session) {
      return res.status(404).json({ error: 'Customer session not found' });
    }
    
    if (!session.isActive) {
      return res.status(400).json({ error: 'Customer session is already closed' });
    }
    
    // Calculate total from all orders
    const orders = await Order.find({ _id: { $in: session.orders } });
    const totalAmount = orders.reduce((sum, order) => sum + order.total, 0);
    
    session.totalAmount = totalAmount;
    await session.checkout();
    
    // Emit socket event
    if (req.app.get('io')) {
      req.app.get('io').emit('customer-session-checkout', {
        tableNumber: session.tableNumber,
        duration: session.duration,
        totalAmount: session.totalAmount,
        timestamp: new Date()
      });
    }
    
    res.json({
      success: true,
      session,
      message: 'Customer checked out successfully'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Close session after feedback
router.post('/:sessionId/close', authenticate, async (req, res) => {
  try {
    const session = await CustomerSession.findById(req.params.sessionId);
    
    if (!session) {
      return res.status(404).json({ error: 'Customer session not found' });
    }
    
    session.feedbackSubmitted = true;
    session.isActive = false;
    
    if (!session.checkoutTime) {
      session.checkoutTime = new Date();
      session.duration = Math.round((session.checkoutTime - session.loginTime) / (1000 * 60));
    }
    
    await session.save();
    
    // Complete service history
    try {
      const tableServiceHistoryService = req.app.get('tableServiceHistoryService');
      if (tableServiceHistoryService) {
        await tableServiceHistoryService.completeService(
          req.tenantId,
          session.tableNumber,
          {
            payment: {
              method: session.paymentMethod || 'cash',
              amount: session.totalAmount || 0,
              tip: session.tipAmount || 0
            },
            feedback: session.feedback ? {
              rating: session.feedback.rating,
              foodRating: session.feedback.foodRating,
              serviceRating: session.feedback.serviceRating,
              ambienceRating: session.feedback.ambienceRating,
              comment: session.feedback.comment,
              submittedAt: new Date()
            } : null
          }
        );
      }
    } catch (serviceError) {
      console.warn('Service history completion failed:', serviceError);
      // Don't fail the session closure
    }
    
    // Update table status to available
    const Table = require('../models/Table');
    await Table.findOneAndUpdate(
      { number: session.tableNumber },
      { status: 'available', currentOrder: null }
    );
    
    // Emit socket event
    if (req.app.get('io')) {
      req.app.get('io').emit('customer-session-closed', {
        tableNumber: session.tableNumber,
        timestamp: new Date()
      });
    }
    
    res.json({
      success: true,
      message: 'Session closed successfully'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all active customer sessions (for admin)
router.get('/active', authenticate, async (req, res) => {
  try {
    if (!['admin', 'manager'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const sessions = await CustomerSession.getActiveSessions();
    
    res.json({
      sessions,
      total: sessions.length
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get table statistics
router.get('/stats/table/:tableNumber', authenticate, async (req, res) => {
  try {
    const { date } = req.query;
    const stats = await CustomerSession.getTableStats(req.params.tableNumber, date);
    
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;