// src/models/Payment.js
const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true },
  amount: { type: Number, required: true },
  method: {
    type: String,
    enum: ['cash', 'card', 'online', 'wallet'],
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed', 'refunded'],
    default: 'pending'
  },
  transactionId: String,
  cardDetails: {
    last4: String,
    brand: String
  },
  onlinePayment: {
    gateway: String,
    referenceId: String
  },
  cashDetails: {
    received: Number,
    change: Number
  },
  processedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  refund: {
    amount: Number,
    reason: String,
    processedAt: Date,
    processedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  },
  tip: { type: Number, default: 0 },
  notes: String
}, { timestamps: true });

// Add indexes for better query performance
paymentSchema.index({ order: 1 });
paymentSchema.index({ status: 1, createdAt: -1 });
paymentSchema.index({ method: 1, createdAt: -1 });
paymentSchema.index({ processedBy: 1, createdAt: -1 });
paymentSchema.index({ transactionId: 1 });
paymentSchema.index({ 'refund.processedAt': -1 });

module.exports = mongoose.model('Payment', paymentSchema);