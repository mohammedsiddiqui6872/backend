// src/models/Table.js
const mongoose = require('mongoose');

const tableSchema = new mongoose.Schema({
  tenantId: { type: String, required: true, index: true },
  number: { type: String, required: true },
  capacity: { type: Number, required: true, min: 1 },
  status: {
    type: String,
    enum: ['available', 'occupied', 'reserved', 'cleaning'],
    default: 'available'
  },
  currentOrder: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
  waiter: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  location: {
    floor: String,
    section: String,
    x: Number, // For visual table layout
    y: Number
  },
  qrCode: String,
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

// Compound index for tenant-specific table numbers
tableSchema.index({ tenantId: 1, number: 1 }, { unique: true });

module.exports = mongoose.model('Table', tableSchema);