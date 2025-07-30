const mongoose = require('mongoose');

const restaurantConfigSchema = new mongoose.Schema({
  tenantId: {
    type: String,
    required: true,
    index: true
  },
  name: {
    type: String,
    required: true
  },
  isOrderingEnabled: {
    type: Boolean,
    default: true
  },
  orderPrefix: {
    type: String,
    default: 'ORD'
  },
  taxRate: {
    type: Number,
    default: 5
  },
  currency: {
    type: String,
    default: 'AED'
  },
  timezone: {
    type: String,
    default: 'Asia/Dubai'
  },
  themes: {
    primaryColor: {
      type: String,
      default: '#3B82F6'
    },
    secondaryColor: {
      type: String,
      default: '#10B981'
    },
    fontFamily: {
      type: String,
      default: 'Inter'
    }
  },
  operatingHours: {
    monday: { open: String, close: String, isOpen: { type: Boolean, default: true } },
    tuesday: { open: String, close: String, isOpen: { type: Boolean, default: true } },
    wednesday: { open: String, close: String, isOpen: { type: Boolean, default: true } },
    thursday: { open: String, close: String, isOpen: { type: Boolean, default: true } },
    friday: { open: String, close: String, isOpen: { type: Boolean, default: true } },
    saturday: { open: String, close: String, isOpen: { type: Boolean, default: true } },
    sunday: { open: String, close: String, isOpen: { type: Boolean, default: true } }
  },
  features: {
    tableOrdering: { type: Boolean, default: true },
    takeaway: { type: Boolean, default: false },
    delivery: { type: Boolean, default: false },
    reservations: { type: Boolean, default: false },
    loyalty: { type: Boolean, default: false }
  },
  paymentMethods: [{
    type: String,
    enum: ['cash', 'card', 'online']
  }],
  socialMedia: {
    facebook: String,
    instagram: String,
    twitter: String,
    website: String
  }
}, {
  timestamps: true
});

// Compound index for tenant-specific uniqueness
restaurantConfigSchema.index({ tenantId: 1, name: 1 }, { unique: true });

module.exports = mongoose.model('RestaurantConfig', restaurantConfigSchema);