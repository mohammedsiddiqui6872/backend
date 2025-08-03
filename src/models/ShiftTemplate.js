const mongoose = require('mongoose');
const { getCurrentTenant } = require('../middleware/enterpriseTenantIsolation');

const shiftTemplateSchema = new mongoose.Schema({
  tenantId: { 
    type: String, 
    required: true, 
    index: true,
    default: function() {
      const context = getCurrentTenant();
      return context?.tenantId;
    }
  },
  
  name: {
    type: String,
    required: true
  },
  
  description: String,
  
  isActive: {
    type: Boolean,
    default: true
  },
  
  pattern: {
    type: String,
    enum: ['weekly', 'biweekly', 'monthly', 'custom'],
    default: 'weekly'
  },
  
  shifts: [{
    dayOfWeek: {
      type: Number, // 0 = Sunday, 1 = Monday, etc.
      min: 0,
      max: 6,
      required: true
    },
    shiftType: {
      type: String,
      enum: ['morning', 'afternoon', 'evening', 'night', 'custom'],
      required: true
    },
    scheduledTimes: {
      start: { type: String, required: true }, // Format: "HH:MM"
      end: { type: String, required: true }    // Format: "HH:MM"
    },
    department: String,
    position: String,
    roles: [String], // Which roles can work this shift
    minStaff: {
      type: Number,
      default: 1
    },
    maxStaff: {
      type: Number,
      default: 1
    }
  }],
  
  applicableFrom: {
    type: Date,
    default: Date.now
  },
  
  applicableTo: Date,
  
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  
  lastUsed: Date,
  
  usageCount: {
    type: Number,
    default: 0
  }
}, { 
  timestamps: true,
  indexes: [
    { tenantId: 1, name: 1 },
    { tenantId: 1, isActive: 1 },
    { tenantId: 1, pattern: 1 }
  ]
});

// Enterprise-grade tenant filter for all find operations
shiftTemplateSchema.pre(/^find/, function() {
  // Skip if tenantId is explicitly set to null (for super admin operations)
  if (this.getOptions().skipTenantFilter) {
    console.log('ShiftTemplate model: Skipping tenant filter (super admin operation)');
    return;
  }
  
  // If query already has tenantId, verify it matches current context
  const queryTenantId = this.getQuery().tenantId;
  const context = getCurrentTenant();
  
  if (queryTenantId && context?.tenantId && queryTenantId !== context.tenantId) {
    console.error('ShiftTemplate model: SECURITY WARNING - Query tenant mismatch!', {
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
    console.log('ShiftTemplate model: Applying enterprise tenant filter:', context.tenantId);
    this.where({ tenantId: context.tenantId });
  } else if (!queryTenantId) {
    console.warn('ShiftTemplate model: No tenant context available - this should not happen in production');
    // Force empty result for security when no tenant context
    this.where({ _id: null });
  }
});

// Ensure tenantId is set when creating new templates
shiftTemplateSchema.pre('save', function(next) {
  if (!this.tenantId) {
    const context = getCurrentTenant();
    if (context?.tenantId) {
      this.tenantId = context.tenantId;
      console.log('ShiftTemplate model: Setting tenantId on save:', context.tenantId);
    } else {
      return next(new Error('Cannot create shift template without tenant context'));
    }
  }
  next();
});

// Update usage stats when template is used
shiftTemplateSchema.methods.recordUsage = function() {
  this.usageCount += 1;
  this.lastUsed = new Date();
  return this.save();
};

module.exports = mongoose.model('ShiftTemplate', shiftTemplateSchema);