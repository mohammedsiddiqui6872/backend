// src/models/Analytics.js
const mongoose = require('mongoose');

const analyticsSchema = new mongoose.Schema({
  date: { type: Date, required: true, unique: true },
  revenue: {
    total: { type: Number, default: 0 },
    cash: { type: Number, default: 0 },
    card: { type: Number, default: 0 },
    online: { type: Number, default: 0 }
  },
  orders: {
    total: { type: Number, default: 0 },
    completed: { type: Number, default: 0 },
    cancelled: { type: Number, default: 0 },
    average: { type: Number, default: 0 }
  },
  items: {
    sold: { type: Number, default: 0 },
    topSelling: [{
      menuItem: { type: mongoose.Schema.Types.ObjectId, ref: 'MenuItem' },
      quantity: Number,
      revenue: Number
    }]
  },
  customers: {
    total: { type: Number, default: 0 },
    new: { type: Number, default: 0 },
    returning: { type: Number, default: 0 }
  },
  tables: {
    turnover: { type: Number, default: 0 },
    averageOccupancy: { type: Number, default: 0 }
  },
  hourlyBreakdown: [{
    hour: Number,
    orders: Number,
    revenue: Number
  }],
  categoryBreakdown: [{
    category: String,
    quantity: Number,
    revenue: Number
  }]
}, { timestamps: true });

module.exports = mongoose.model('Analytics', analyticsSchema);