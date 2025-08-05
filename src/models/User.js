// src/models/User.js
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  tenantId: { 
    type: String, 
    required: function() {
      return this.role !== 'super_admin';
    }, 
    index: true 
  },
  name: { type: String, required: true },
  email: { type: String, required: true, lowercase: true },
  password: { type: String, required: true },
  role: { 
    type: String, 
    enum: ['admin', 'manager', 'chef', 'waiter', 'cashier', 'host', 'bartender', 'super_admin'],
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
      data: String, // Base64 encoded file data
      mimeType: String, // File mime type (e.g., 'image/jpeg', 'application/pdf')
      size: Number, // File size in bytes
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
  },
  
  // System user flag to prevent deletion
  isSystemUser: { type: Boolean, default: false },
  
  // Additional metadata
  metadata: {
    createdBy: String,
    purpose: String,
    cannotBeDeleted: Boolean
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

// Prevent deletion of system users
userSchema.pre('deleteOne', { document: true, query: false }, function(next) {
  if (this.isSystemUser || this.metadata?.cannotBeDeleted) {
    return next(new Error('System users cannot be deleted'));
  }
  next();
});

userSchema.pre('findOneAndDelete', async function(next) {
  const user = await this.model.findOne(this.getQuery());
  if (user && (user.isSystemUser || user.metadata?.cannotBeDeleted)) {
    return next(new Error('System users cannot be deleted'));
  }
  next();
});

userSchema.pre('deleteMany', async function(next) {
  const users = await this.model.find(this.getQuery());
  const hasSystemUser = users.some(user => user.isSystemUser || user.metadata?.cannotBeDeleted);
  if (hasSystemUser) {
    return next(new Error('Cannot delete system users'));
  }
  next();
});

// Import getCurrentTenant for enterprise tenant filtering
const { getCurrentTenant } = require('../middleware/enterpriseTenantIsolation');

// Enterprise-grade tenant filter for all find operations
userSchema.pre(/^find/, function() {
  // Skip if tenantId is explicitly set to null (for super admin operations)
  if (this.getOptions().skipTenantFilter) {
    console.log('User model: Skipping tenant filter (super admin operation)');
    return;
  }
  
  // If query already has tenantId, verify it matches current context
  const queryTenantId = this.getQuery().tenantId;
  const context = getCurrentTenant();
  
  if (queryTenantId && context?.tenantId && queryTenantId !== context.tenantId) {
    console.error('User model: SECURITY WARNING - Query tenant mismatch!', {
      queryTenantId,
      contextTenantId: context.tenantId,
      userId: context.userId,
      requestId: context.requestId
    });
    // Force empty result for security
    this.where({ _id: null });
    return;
  }
  
  // Apply tenant filter from context
  if (context?.tenantId) {
    console.log('User model: Applying enterprise tenant filter:', context.tenantId);
    this.where({ tenantId: context.tenantId });
  } else if (!queryTenantId) {
    console.warn('User model: No tenant context available - this should not happen in production');
    // Force empty result for security when no tenant context
    this.where({ _id: null });
  }
});

// Ensure tenantId is set when creating new users
userSchema.pre('save', function(next) {
  // Skip tenant requirement for super admin users or when explicitly disabled
  if (this.role === 'super_admin' || process.env.DISABLE_TENANT_ISOLATION === 'true') {
    return next();
  }
  
  if (!this.tenantId) {
    const context = getCurrentTenant();
    if (context?.tenantId) {
      this.tenantId = context.tenantId;
      console.log('User model: Setting tenantId on save:', context.tenantId);
    } else {
      return next(new Error('Cannot create user without tenant context'));
    }
  }
  next();
});

// Compound index for tenant-specific email uniqueness
userSchema.index({ tenantId: 1, email: 1 }, { unique: true });

module.exports = mongoose.model('User', userSchema);