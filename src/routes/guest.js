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
    
    const session = await CustomerSession.findOne({
      tableNumber,
      isActive: true,
      tenantId: req.tenant?.tenantId
    });
    
    res.json({ success: true, data: session });
  } catch (error) {
    console.error('Error fetching customer session:', error);
    res.status(500).json({ success: false, message: 'Error fetching session' });
  }
});

// Create customer session (guest welcome screen)
router.post('/customer-session', async (req, res) => {
  try {
    const { tableNumber, customerName, customerPhone, customerEmail, occupancy } = req.body;
    
    if (!tableNumber || !customerName) {
      return res.status(400).json({ 
        success: false,
        message: 'Table number and customer name are required' 
      });
    }
    
    // Check if table exists
    const table = await Table.findOne({ 
      number: tableNumber,
      tenantId: req.tenant?.tenantId 
    });
    
    if (!table) {
      return res.status(404).json({ 
        success: false,
        message: 'Table not found' 
      });
    }
    
    // Create or update customer session
    let session = await CustomerSession.findOne({
      tableNumber,
      isActive: true,
      tenantId: req.tenant?.tenantId
    });
    
    if (!session) {
      session = new CustomerSession({
        tenantId: req.tenant?.tenantId,
        tableNumber,
        customerName,
        customerPhone,
        customerEmail,
        occupancy: occupancy || 1,
        startTime: new Date(),
        isActive: true
      });
    } else {
      // Update existing session
      session.customerName = customerName;
      session.customerPhone = customerPhone || session.customerPhone;
      session.customerEmail = customerEmail || session.customerEmail;
      session.occupancy = occupancy || session.occupancy;
    }
    
    await session.save();
    
    res.json({ 
      success: true, 
      data: session,
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
    
    // Update customer session with order
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

module.exports = router;