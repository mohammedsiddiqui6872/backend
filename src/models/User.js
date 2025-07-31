// src/models/User.js
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  tenantId: { type: String, required: true, index: true },
  name: { type: String, required: true },
  email: { type: String, required: true, lowercase: true },
  password: { type: String, required: true },
  role: { 
    type: String, 
    enum: ['admin', 'manager', 'chef', 'waiter', 'cashier', 'host', 'bartender'],
    default: 'waiter'
  },
  phone: String,
  avatar: String,
  isActive: { type: Boolean, default: true },
  lastLogin: Date,
  permissions: [{
    type: String,
    enum: [
      'menu.view', 'menu.edit', 'menu.delete',
      'orders.view', 'orders.edit', 'orders.delete', 'orders.cancel',
      'analytics.view', 'analytics.export',
      'users.view', 'users.manage', 'users.delete',
      'tables.view', 'tables.manage',
      'inventory.view', 'inventory.manage',
      'payments.view', 'payments.process', 'payments.refund',
      'settings.view', 'settings.manage',
      'shifts.view', 'shifts.manage', 'shifts.approve'
    ]
  }],
  
  // Enhanced Profile Fields
  profile: {
    dateOfBirth: Date,
    gender: { type: String, enum: ['male', 'female', 'other'] },
    nationality: String,
    address: {
      street: String,
      city: String,
      state: String,
      country: String,
      postalCode: String
    },
    emergencyContact: {
      name: String,
      relationship: String,
      phone: String,
      email: String
    },
    employeeId: String,
    department: String,
    position: String,
    hireDate: { type: Date, default: Date.now },
    contractEndDate: Date, // For contract/temporary employees
    employmentType: { 
      type: String, 
      enum: ['full-time', 'part-time', 'contract', 'intern'],
      default: 'full-time'
    },
    supervisor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // Who this user reports to
    salary: {
      amount: Number,
      currency: { type: String, default: 'AED' },
      type: { type: String, enum: ['hourly', 'monthly'], default: 'monthly' }
    },
    bankDetails: {
      accountName: String,
      accountNumber: String,
      bankName: String,
      iban: String
    },
    documents: [{
      type: { type: String, enum: ['id', 'passport', 'visa', 'contract', 'certificate', 'other'] },
      name: String,
      url: String,
      expiryDate: Date,
      uploadedAt: { type: Date, default: Date.now }
    }],
    notes: String
  },
  
  // Shift preferences
  shiftPreferences: {
    preferredShifts: [{ type: String, enum: ['morning', 'afternoon', 'evening', 'night'] }],
    maxHoursPerWeek: { type: Number, default: 40 },
    availableDays: [{
      day: { type: String, enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] },
      available: Boolean,
      preferredTimes: [{
        start: String,
        end: String
      }]
    }]
  },
  
  // Performance metrics
  metrics: {
    totalOrdersServed: { type: Number, default: 0 },
    averageRating: { type: Number, default: 0 },
    totalHoursWorked: { type: Number, default: 0 },
    punctualityScore: { type: Number, default: 100 },
    lastReviewDate: Date
  },
  
  // Notification preferences
  fcmToken: {
    type: String,
    default: null
  },
  platform: {
    type: String,
    enum: ['ios', 'android'],
    default: null
  },
  lastTokenUpdate: {
    type: Date,
    default: null
  }
}, { timestamps: true });

userSchema.methods.comparePassword = async function(password) {
  return await bcrypt.compare(password, this.password);
};

userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

// Import getCurrentTenantId for tenant filtering
const { getCurrentTenantId } = require('../middleware/tenantContext');

// Add tenant filter to all find operations
userSchema.pre(/^find/, function() {
  const tenantId = getCurrentTenantId();
  if (tenantId && !this.getQuery().tenantId) {
    // Only add tenant filter if not already present
    this.where({ tenantId });
  }
});

// Ensure tenantId is set when creating new users
userSchema.pre('save', function(next) {
  if (!this.tenantId) {
    const tenantId = getCurrentTenantId();
    if (tenantId) {
      this.tenantId = tenantId;
    }
  }
  next();
});

// Compound index for tenant-specific email uniqueness
userSchema.index({ tenantId: 1, email: 1 }, { unique: true });

module.exports = mongoose.model('User', userSchema);