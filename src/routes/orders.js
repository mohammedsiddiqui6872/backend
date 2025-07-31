// src/routes/orders.js - Complete file with proper status management
const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Order = require('../models/Order');
const CustomerSession = require('../models/CustomerSession');
const Table = require('../models/Table');
const TableSession = require('../models/TableSession');
const { authenticate } = require('../middleware/auth');

// Get all orders (with optional filters)
router.get('/', authenticate, async (req, res) => {
  try {
    const { tableNumber, status, waiterId, startDate, endDate, customerSession } = req.query;
    const filter = {};
    
    // Add tenant isolation
    if (req.tenantId) {
      filter.tenantId = req.tenantId;
    }
    
    // If customerSession is provided, only return orders for that session
    if (customerSession) {
      const sessionFilter = { _id: customerSession };
      if (req.tenantId) {
        sessionFilter.tenantId = req.tenantId;
      }
      const session = await CustomerSession.findOne(sessionFilter).populate('orders');
      if (!session) {
        return res.json([]);
      }
      // Return only the orders from this customer session
      const orderFilter = { _id: { $in: session.orders } };
      if (req.tenantId) {
        orderFilter.tenantId = req.tenantId;
      }
      const orders = await Order.find(orderFilter)
        .populate('waiter', 'name')
        .sort('-createdAt');
      return res.json(orders);
    }
    
    // Otherwise, use the existing filter logic
    if (tableNumber) filter.tableNumber = tableNumber;
    if (status) filter.status = status;
    if (waiterId) {
      filter.$or = [
        { waiterId: waiterId },
        { waiter: waiterId },
        { 'waiterInfo.id': waiterId },
        { assignedTo: waiterId },
        { createdBy: waiterId }
      ];
    }
    
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }
    
    const orders = await Order.find(filter)
      .populate('waiter', 'name')
      .sort('-createdAt');
      
    res.json(orders);
  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get order history for a waiter using CustomerSessions
router.get('/waiter/history', authenticate, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const filter = { waiter: req.user._id };
    
    // Add tenant isolation
    if (req.tenantId) {
      filter.tenantId = req.tenantId;
    }
    
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }
    
    // Get all customer sessions for this waiter
    const sessions = await CustomerSession.find(filter)
      .populate({
        path: 'orders',
        populate: {
          path: 'waiter',
          select: 'name'
        }
      })
      .sort('-createdAt');
    
    // Extract all orders from sessions
    const orders = sessions.reduce((allOrders, session) => {
      return allOrders.concat(session.orders || []);
    }, []);
    
    res.json({
      orders,
      totalOrders: orders.length,
      sessions: sessions.length
    });
  } catch (error) {
    console.error('Error fetching waiter order history:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get order by ID
router.get('/:orderId', authenticate, async (req, res) => {
  try {
    const orderFilter = { _id: req.params.orderId };
    if (req.tenantId) {
      orderFilter.tenantId = req.tenantId;
    }
    const order = await Order.findOne(orderFilter)
      .populate('waiter', 'name');
      
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }
    
    res.json(order);
  } catch (error) {
    console.error('Error fetching order:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create order with customer session association
router.post('/', authenticate, async (req, res) => {
  try {
    const orderData = req.body;
    
    // Validate that order has items (unless it's a special case)
    if (!orderData.items || orderData.items.length === 0) {
      // Don't create empty orders
      return res.status(400).json({ 
        error: 'Cannot create order without items' 
      });
    }
    
    // Validate menu items
    const MenuItem = require('../models/MenuItem');
    if (orderData.items && orderData.items.length > 0) {
      for (let i = 0; i < orderData.items.length; i++) {
        const item = orderData.items[i];
        
        // Validate menuItem ID format
        if (!item.menuItem || typeof item.menuItem !== 'string') {
          return res.status(400).json({ 
            error: `Invalid menu item ID for item ${i + 1}` 
          });
        }
        
        // Check if it's a valid MongoDB ObjectId
        if (!item.menuItem.match(/^[0-9a-fA-F]{24}$/)) {
          return res.status(400).json({ 
            error: `Invalid menu item ID format: ${item.menuItem}. Expected MongoDB ObjectId.` 
          });
        }
        
        // Verify the menu item exists
        const menuItemFilter = { _id: item.menuItem };
        if (req.tenantId) {
          menuItemFilter.tenantId = req.tenantId;
        }
        const menuItem = await MenuItem.findOne(menuItemFilter);
        if (!menuItem) {
          return res.status(400).json({ 
            error: `Menu item not found: ${item.menuItem}` 
          });
        }
        
        // Ensure required fields are present
        if (!item.price || item.price <= 0) {
          return res.status(400).json({ 
            error: `Invalid price for item: ${menuItem.name}` 
          });
        }
        
        // Auto-populate name if not provided
        if (!item.name) {
          item.name = menuItem.name;
        }
      }
    }
    
    // Remove payment method if sent as 'pending'
    if (orderData.paymentMethod === 'pending') {
      delete orderData.paymentMethod;
    }
    
    // STEP 1: Find the waiter who's logged into this table
    const tableSessionFilter = {
      tableNumber: String(orderData.tableNumber),
      isActive: true
    };
    if (req.tenantId) {
      tableSessionFilter.tenantId = req.tenantId;
    }
    const tableSession = await TableSession.findOne(tableSessionFilter).sort('-loginTime').populate('waiter', 'name email');
    
    if (!tableSession || !tableSession.waiter) {
      console.error('No waiter found for table:', orderData.tableNumber);
      return res.status(400).json({ 
        error: 'No waiter is logged into this table. Please ask your waiter to log in.' 
      });
    }
    
    // STEP 2: Check for active customer session (optional - for better tracking)
    const customerSessionFilter = {
      tableNumber: String(orderData.tableNumber),
      isActive: true
    };
    if (req.tenantId) {
      customerSessionFilter.tenantId = req.tenantId;
    }
    const customerSession = await CustomerSession.findOne(customerSessionFilter);
    
    // STEP 3: Create the order WITH waiter information
    const order = new Order({
      ...orderData,
      
      // CRITICAL: Set tenant ID for isolation
      tenantId: req.tenantId,
      
      // CRITICAL: Set all waiter fields from TableSession
      waiter: tableSession.waiter._id,
      waiterId: tableSession.waiter._id,
      assignedTo: tableSession.waiter._id,
      waiterInfo: {
        id: tableSession.waiter._id.toString(),
        name: tableSession.waiter.name,
        email: tableSession.waiter.email
      },
      
      // Link to sessions
      tableSessionId: tableSession._id,
      customerSessionId: customerSession?._id,
      
      // Ensure customer info is set
      customerName: orderData.customerName || customerSession?.customerName || 'Guest',
      customerPhone: orderData.customerPhone || customerSession?.customerPhone,
      customerEmail: orderData.customerEmail || customerSession?.customerEmail,
      
      // Order defaults
      status: orderData.status || 'pending',
      paymentStatus: 'pending',
      orderType: orderData.orderType || 'dine-in'
    });
    
    // Save the order
    await order.save();
    
    console.log('Order created:', order.orderNumber, 'assigned to waiter:', tableSession.waiter.name);
    
    // Try to deduct inventory (but don't fail the order if inventory tracking is not set up)
    try {
      const inventoryService = require('../services/inventoryService');
      await inventoryService.deductForOrder(order._id, order.items, tableSession.waiter._id);
      console.log('Inventory deducted for order:', order.orderNumber);
    } catch (inventoryError) {
      console.warn('Inventory deduction failed:', inventoryError.message);
      // Don't fail the order, just log the warning
      // In production, you might want to send an alert to admin
    }
    
    // Update customer session if exists
    if (customerSession) {
      customerSession.orders.push(order._id);
      customerSession.totalAmount = (customerSession.totalAmount || 0) + (order.total || 0);
      
      // Also ensure customer session has waiter reference
      if (!customerSession.waiter) {
        customerSession.waiter = tableSession.waiter._id;
      }
      
      await customerSession.save();
    }
    
    // Update table status
    const tableFilter = { number: String(orderData.tableNumber) };
    if (req.tenantId) {
      tableFilter.tenantId = req.tenantId;
    }
    await Table.findOneAndUpdate(
      tableFilter,
      { 
        status: 'occupied',
        currentOrder: order._id,
        currentGuests: customerSession?.occupancy || 1
      }
    );
    
    // Notify the specific waiter via socket
    if (req.app.get('io')) {
      const io = req.app.get('io');
      
      // Send to specific waiter's room
      io.to(`waiter-${tableSession.waiter._id}`).emit('new-order', {
        order: order.toObject(),
        tableNumber: order.tableNumber,
        customerName: order.customerName,
        waiterName: tableSession.waiter.name,
        message: `New order from Table ${order.tableNumber}`
      });
      
      // Also emit general order event
      io.emit('order-created', {
        orderId: order._id,
        tableNumber: order.tableNumber,
        status: order.status
      });
    }
    
    // Return the complete order
    res.status(201).json({
      success: true,
      order: order.toObject(),
      message: `Order ${order.orderNumber} created successfully and assigned to ${tableSession.waiter.name}`
    });
    
  } catch (error) {
    console.error('Error creating order:', error);
    res.status(500).json({ 
      error: error.message || 'Failed to create order' 
    });
  }
});

// Confirm order (waiter or admin only)
router.post('/:orderId/confirm', authenticate, async (req, res) => {
  try {
    const orderFilter = { _id: req.params.orderId };
    if (req.tenantId) {
      orderFilter.tenantId = req.tenantId;
    }
    const order = await Order.findOne(orderFilter);
    
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }
    
    if (order.status !== 'pending') {
      return res.status(400).json({ error: 'Only pending orders can be confirmed' });
    }
    
    order.status = 'confirmed';
    await order.save({ validateModifiedOnly: true });
    
    // Emit to kitchen
    if (req.app.get('io')) {
      req.app.get('io').emit('order-confirmed', {
        order,
        tableNumber: order.tableNumber
      });
    }
    
    res.json({
      success: true,
      order,
      message: 'Order confirmed and sent to kitchen'
    });
  } catch (error) {
    console.error('Error confirming order:', error);
    res.status(500).json({ error: error.message });
  }
});

// Cancel order (waiter or customer)
router.post('/:orderId/cancel', authenticate, async (req, res) => {
  try {
    const { reason } = req.body;
    const orderFilter = { _id: req.params.orderId };
    if (req.tenantId) {
      orderFilter.tenantId = req.tenantId;
    }
    const order = await Order.findOne(orderFilter);
    
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }
    
    // Check if order can be cancelled
    if (!order.canBeCancelled()) {
      return res.status(400).json({ 
        error: 'Order can only be cancelled when status is pending or confirmed' 
      });
    }
    
    // Track who cancelled the order
    order.status = 'cancelled';
    order.cancelReason = reason;
    order.cancelledBy = req.user._id;
    order.cancelledByRole = req.user.role;
    order.cancelledAt = new Date();
    
    await order.save({ validateModifiedOnly: true });
    
    // Return inventory for cancelled order
    try {
      const inventoryService = require('../services/inventoryService');
      await inventoryService.returnForOrder(order._id, order.items, req.user._id);
      console.log('Inventory returned for cancelled order:', order.orderNumber);
    } catch (inventoryError) {
      console.warn('Inventory return failed:', inventoryError.message);
    }
    
    // Update customer session
    const customerSessionFilter = {
      orders: order._id,
      isActive: true
    };
    if (req.tenantId) {
      customerSessionFilter.tenantId = req.tenantId;
    }
    const customerSession = await CustomerSession.findOne(customerSessionFilter);
    
    if (customerSession) {
      customerSession.totalAmount -= order.total || 0;
      await customerSession.save();
    }
    
    // Emit socket event with cancellation details
    if (req.app.get('io')) {
      req.app.get('io').emit('order-cancelled', {
        orderId: order._id,
        tableNumber: order.tableNumber,
        cancelledBy: req.user.name,
        cancelledByRole: req.user.role,
        reason
      });
    }
    
    res.json({
      success: true,
      order,
      message: 'Order cancelled successfully'
    });
  } catch (error) {
    console.error('Error cancelling order:', error);
    res.status(500).json({ error: error.message });
  }
});

// Add item to existing order (NO payment validation for ongoing orders)
router.post('/:orderId/items', authenticate, async (req, res) => {
  try {
    const { orderId } = req.params;
    const newItem = req.body;
    
    // Find the order
    const orderFilter = { _id: orderId };
    if (req.tenantId) {
      orderFilter.tenantId = req.tenantId;
    }
    const order = await Order.findOne(orderFilter);
    
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }
    
    // Check if order is already paid/completed
    if (order.paymentStatus === 'paid' || order.status === 'paid' || order.status === 'cancelled') {
      return res.status(400).json({ 
        error: 'Cannot add items to a paid, completed, or cancelled order' 
      });
    }
    
    // Add the new item with default status
    const itemToAdd = {
      ...newItem,
      status: newItem.status || 'pending',
      _id: new mongoose.Types.ObjectId()
    };
    
    order.items.push(itemToAdd);
    
    // Recalculate totals (with null checks)
    order.subtotal = order.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    order.tax = order.subtotal * 0.1; // 10% tax
    order.total = order.subtotal + order.tax + (order.discount || 0) + (order.deliveryCharge || 0) + (order.tip || 0);
    
    // Update customer session total if exists
    const customerSessionFilter = {
      orders: orderId,
      isActive: true
    };
    if (req.tenantId) {
      customerSessionFilter.tenantId = req.tenantId;
    }
    const customerSession = await CustomerSession.findOne(customerSessionFilter);
    
    if (customerSession) {
      // Recalculate session total properly
      const orderFilter = { _id: { $in: customerSession.orders } };
      if (req.tenantId) {
        orderFilter.tenantId = req.tenantId;
      }
      const allOrders = await Order.find(orderFilter);
      customerSession.totalAmount = allOrders.reduce((sum, o) => sum + (o.total || 0), 0);
      await customerSession.save();
    }
    
    // Save without triggering full validation - this is the key!
    await order.save({ validateModifiedOnly: true });
    
    // Emit socket event for real-time updates
    if (req.app.get('io')) {
      req.app.get('io').emit('order-updated', {
        orderId: order._id,
        tableNumber: order.tableNumber,
        action: 'item-added',
        item: itemToAdd
      });
    }
    
    res.json({
      success: true,
      order,
      message: 'Item added successfully'
    });
  } catch (error) {
    console.error('Error adding item to order:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update order item (e.g., quantity, special requests)
router.put('/:orderId/items/:itemId', authenticate, async (req, res) => {
  try {
    const { orderId, itemId } = req.params;
    const updates = req.body;
    
    // Find the order
    const orderFilter = { _id: orderId };
    if (req.tenantId) {
      orderFilter.tenantId = req.tenantId;
    }
    const order = await Order.findOne(orderFilter);
    
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }
    
    // Check if order is already paid/completed
    if (order.paymentStatus === 'paid' || order.status === 'paid' || order.status === 'cancelled') {
      return res.status(400).json({ 
        error: 'Cannot modify items in a paid, completed, or cancelled order' 
      });
    }
    
    // Find and update the item
    const itemIndex = order.items.findIndex(item => item._id.toString() === itemId);
    
    if (itemIndex === -1) {
      return res.status(404).json({ error: 'Item not found in order' });
    }
    
    // Update only the allowed fields
    const allowedUpdates = ['quantity', 'specialRequests', 'status'];
    allowedUpdates.forEach(field => {
      if (updates[field] !== undefined) {
        order.items[itemIndex][field] = updates[field];
      }
    });
    
    // Recalculate totals if quantity changed
    if (updates.quantity !== undefined) {
      order.subtotal = order.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      order.tax = order.subtotal * 0.1;
      order.total = order.subtotal + order.tax + (order.discount || 0) + (order.deliveryCharge || 0) + (order.tip || 0);
    }
    
    // Save with partial validation
    await order.save({ validateModifiedOnly: true });
    
    // Emit socket event
    if (req.app.get('io')) {
      req.app.get('io').emit('order-item-updated', {
        orderId: order._id,
        itemId: itemId,
        tableNumber: order.tableNumber,
        updates: updates
      });
    }
    
    res.json({
      success: true,
      order,
      message: 'Item updated successfully'
    });
  } catch (error) {
    console.error('Error updating order item:', error);
    res.status(500).json({ error: error.message });
  }
});

// Remove item from order
router.delete('/:orderId/items/:itemId', authenticate, async (req, res) => {
  try {
    const { orderId, itemId } = req.params;
    
    const orderFilter = { _id: orderId };
    if (req.tenantId) {
      orderFilter.tenantId = req.tenantId;
    }
    const order = await Order.findOne(orderFilter);
    
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }
    
    // Check if order is already paid/completed
    if (order.paymentStatus === 'paid' || order.status === 'paid' || order.status === 'cancelled') {
      return res.status(400).json({ 
        error: 'Cannot remove items from a paid, completed, or cancelled order' 
      });
    }
    
    // Remove the item
    order.items = order.items.filter(item => item._id.toString() !== itemId);
    
    // Recalculate totals
    order.subtotal = order.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    order.tax = order.subtotal * 0.1;
    order.total = order.subtotal + order.tax + (order.discount || 0) + (order.deliveryCharge || 0) + (order.tip || 0);
    
    await order.save({ validateModifiedOnly: true });
    
    // Emit socket event
    if (req.app.get('io')) {
      req.app.get('io').emit('order-item-removed', {
        orderId: order._id,
        itemId: itemId,
        tableNumber: order.tableNumber
      });
    }
    
    res.json({
      success: true,
      order,
      message: 'Item removed successfully'
    });
  } catch (error) {
    console.error('Error removing item:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update order status (for kitchen and service flow)
router.patch('/:orderId/status', authenticate, async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status } = req.body;
    
    const orderFilter = { _id: orderId };
    if (req.tenantId) {
      orderFilter.tenantId = req.tenantId;
    }
    const order = await Order.findOne(orderFilter);
    
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }
    
    // Validate status transitions based on user role
    const validTransitions = {
      waiter: {
        pending: ['confirmed', 'cancelled'],
        confirmed: ['cancelled'],
        ready: ['served']
      },
      chef: {
        confirmed: ['preparing'],
        preparing: ['ready']
      },
      admin: {
        // Admin can change to any status
        pending: ['confirmed', 'cancelled'],
        confirmed: ['preparing', 'cancelled'],
        preparing: ['ready', 'cancelled'],
        ready: ['served'],
        served: ['paid']
      }
    };
    
    const userRole = req.user.role;
    const currentStatus = order.status;
    const allowedStatuses = validTransitions[userRole]?.[currentStatus] || [];
    
    if (userRole !== 'admin' && !allowedStatuses.includes(status)) {
      return res.status(400).json({ 
        error: `Cannot change status from ${currentStatus} to ${status} as ${userRole}` 
      });
    }
    
    // Update status
    order.status = status;
    
    // Save with partial validation
    await order.save({ validateModifiedOnly: true });
    
    // Emit socket event
    if (req.app.get('io')) {
      req.app.get('io').emit('order-status-updated', {
        orderId: order._id,
        tableNumber: order.tableNumber,
        status: status,
        timestamp: new Date()
      });
    }
    
    res.json({
      success: true,
      order,
      message: `Order status updated to ${status}`
    });
  } catch (error) {
    console.error('Error updating order status:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update item status
router.patch('/:orderId/items/:itemId/status', authenticate, async (req, res) => {
  try {
    const { orderId, itemId } = req.params;
    const { status } = req.body;
    
    const orderFilter = { _id: orderId };
    if (req.tenantId) {
      orderFilter.tenantId = req.tenantId;
    }
    const order = await Order.findOne(orderFilter);
    
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }
    
    const itemIndex = order.items.findIndex(item => item._id.toString() === itemId);
    
    if (itemIndex === -1) {
      return res.status(404).json({ error: 'Item not found' });
    }
    
    order.items[itemIndex].status = status;
    
    await order.save({ validateModifiedOnly: true });
    
    // Emit socket event
    if (req.app.get('io')) {
      req.app.get('io').emit('order-item-status-updated', {
        orderId: order._id,
        itemId: itemId,
        status: status,
        tableNumber: order.tableNumber
      });
    }
    
    res.json({
      success: true,
      order,
      message: 'Item status updated'
    });
  } catch (error) {
    console.error('Error updating item status:', error);
    res.status(500).json({ error: error.message });
  }
});

// Process payment
router.post('/:orderId/payment', authenticate, async (req, res) => {
  try {
    const { orderId } = req.params;
    const { paymentMethod, amountPaid, tip } = req.body;
    
    const orderFilter = { _id: orderId };
    if (req.tenantId) {
      orderFilter.tenantId = req.tenantId;
    }
    const order = await Order.findOne(orderFilter);
    
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }
    
    if (order.paymentStatus === 'paid') {
      return res.status(400).json({ error: 'Order is already paid' });
    }
    
    if (!['cash', 'card', 'upi', 'wallet'].includes(paymentMethod)) {
      return res.status(400).json({ error: 'Invalid payment method' });
    }
    
    // Update payment information
    order.paymentMethod = paymentMethod;  // NOW we set the payment method
    order.paymentStatus = 'paid';
    order.status = 'paid';
    order.tip = tip || 0;
    order.total = order.subtotal + order.tax + (order.discount || 0) + (order.deliveryCharge || 0) + order.tip;
    
    // Now it's OK to validate payment fields since we're actually processing payment
    await order.save();
    
    // Update customer session
    const customerSessionFilter = {
      orders: orderId,
      isActive: true
    };
    if (req.tenantId) {
      customerSessionFilter.tenantId = req.tenantId;
    }
    const customerSession = await CustomerSession.findOne(customerSessionFilter);
    
    if (customerSession) {
      // Properly recalculate total amount
      const orderFilter = { _id: { $in: customerSession.orders } };
      if (req.tenantId) {
        orderFilter.tenantId = req.tenantId;
      }
      const allOrders = await Order.find(orderFilter);
      customerSession.totalAmount = allOrders.reduce((sum, o) => sum + (o.total || 0), 0);
      await customerSession.save();
    }
    
    // Emit socket event
    if (req.app.get('io')) {
      req.app.get('io').emit('order-paid', {
        orderId: order._id,
        tableNumber: order.tableNumber,
        total: order.total,
        paymentMethod: paymentMethod
      });
    }
    
    res.json({
      success: true,
      order,
      message: 'Payment processed successfully'
    });
  } catch (error) {
    console.error('Error processing payment:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;