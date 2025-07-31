// src/routes/kitchen.js
const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const { authenticate, authorize } = require('../middleware/auth');

// Get active kitchen orders
router.get('/orders', authenticate, authorize('chef', 'admin'), async (req, res) => {
  try {
    const orderFilter = {
      status: { $in: ['confirmed', 'preparing'] }
    };
    if (req.tenantId) {
      orderFilter.tenantId = req.tenantId;
    }
    const orders = await Order.find(orderFilter)
    .populate('items.menuItem')
    .sort('createdAt');

    res.json(orders);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update order item status
router.patch('/orders/:orderId/items/:itemId', authenticate, authorize('chef', 'admin'), async (req, res) => {
  try {
    const { status } = req.body;
    
    const orderFilter = { _id: req.params.orderId };
    if (req.tenantId) {
      orderFilter.tenantId = req.tenantId;
    }
    const order = await Order.findOne(orderFilter);
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const item = order.items.id(req.params.itemId);
    if (!item) {
      return res.status(404).json({ error: 'Item not found' });
    }

    item.status = status;
    
    // Check if all items are ready
    const allReady = order.items.every(item => item.status === 'ready');
    if (allReady && order.status === 'preparing') {
      order.status = 'ready';
      order.preparedAt = new Date();
    }

    await order.save();

    // Notify waiters
    req.app.get('io').emit('kitchen-update', {
      orderId: order._id,
      tableNumber: order.tableNumber,
      itemStatus: { itemId: req.params.itemId, status },
      orderStatus: order.status
    });

    res.json({
      success: true,
      order,
      message: 'Item status updated'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Mark order as preparing
router.patch('/orders/:orderId/start', authenticate, authorize('chef', 'admin'), async (req, res) => {
  try {
    const orderFilter = { _id: req.params.orderId };
    if (req.tenantId) {
      orderFilter.tenantId = req.tenantId;
    }
    const order = await Order.findOneAndUpdate(
      orderFilter,
      { 
        status: 'preparing',
        chef: req.user._id,
        confirmedAt: new Date()
      },
      { new: true }
    );

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Notify waiters
    req.app.get('io').emit('order-status-update', {
      orderId: order._id,
      status: 'preparing',
      tableNumber: order.tableNumber
    });

    res.json({
      success: true,
      order,
      message: 'Order preparation started'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;