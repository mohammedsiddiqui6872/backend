// src/routes/payments.js
const express = require('express');
const router = express.Router();
const Payment = require('../models/Payment');
const Order = require('../models/Order');
const { authenticate } = require('../middleware/auth');

// Process payment
router.post('/process', authenticate, async (req, res) => {
  try {
    const { orderId, method, amount, tip = 0 } = req.body;

    // Verify order exists and is not already paid with tenant filter
    const orderFilter = { _id: orderId };
    if (req.tenantId) {
      orderFilter.tenantId = req.tenantId;
    }
    const order = await Order.findOne(orderFilter);
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    if (order.paymentStatus === 'paid') {
      return res.status(400).json({ error: 'Order already paid' });
    }

    // Create payment record
    const payment = new Payment({
      order: orderId,
      amount: amount + tip,
      method,
      tip,
      processedBy: req.user._id,
      status: 'completed',
      tenantId: req.tenantId
    });

    // Handle different payment methods
    if (method === 'cash') {
      payment.cashDetails = {
        received: req.body.received,
        change: req.body.received - (amount + tip)
      };
    } else if (method === 'card') {
      // In production, integrate with payment gateway
      payment.transactionId = 'TXN' + Date.now();
      payment.cardDetails = {
        last4: req.body.cardLast4,
        brand: req.body.cardBrand
      };
    }

    await payment.save();

    // Update order
    order.paymentStatus = 'paid';
    order.status = 'paid';
    order.completedAt = new Date();
    await order.save();

    // Update table status
    const Table = require('../models/Table');
    const tableFilter = { number: order.tableNumber };
    if (req.tenantId) {
      tableFilter.tenantId = req.tenantId;
    }
    await Table.findOneAndUpdate(
      tableFilter,
      { status: 'available', currentOrder: null }
    );

    // Emit payment confirmation
    req.app.get('io').emit('payment-processed', {
      orderId: order._id,
      tableNumber: order.tableNumber
    });

    res.json({
      success: true,
      payment,
      message: 'Payment processed successfully'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get payment details
router.get('/:paymentId', authenticate, async (req, res) => {
  try {
    const paymentFilter = { _id: req.params.paymentId };
    if (req.tenantId) {
      paymentFilter.tenantId = req.tenantId;
    }
    const payment = await Payment.findOne(paymentFilter)
      .populate('order')
      .populate('processedBy', 'name');

    if (!payment) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    res.json(payment);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Process refund
router.post('/:paymentId/refund', authenticate, async (req, res) => {
  try {
    const { amount, reason } = req.body;

    const paymentFilter = { _id: req.params.paymentId };
    if (req.tenantId) {
      paymentFilter.tenantId = req.tenantId;
    }
    const payment = await Payment.findOne(paymentFilter);
    if (!payment) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    if (payment.status === 'refunded') {
      return res.status(400).json({ error: 'Payment already refunded' });
    }

    payment.status = 'refunded';
    payment.refund = {
      amount: amount || payment.amount,
      reason,
      processedAt: new Date(),
      processedBy: req.user._id
    };

    await payment.save();

    res.json({
      success: true,
      payment,
      message: 'Refund processed successfully'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;