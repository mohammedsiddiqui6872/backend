const mongoose = require('mongoose');
const { getCurrentTenantId } = require('../middleware/tenantContext');

const roleSchema = new mongoose.Schema({
  tenantId: { 
    type: String, 
    required: true, 
    index: true,
    default: function() {
      return getCurrentTenantId();
    }
  },
  
  name: {
    type: String,
    required: true
  },
  
  code: {
    type: String,
    required: true,
    uppercase: true
  },
  
  description: String,
  
  isSystem: {
    type: Boolean,
    default: false // System roles can't be deleted
  },
  
  permissions: [{
    type: String,
    enum: [
      // Menu permissions
      'menu.view', 'menu.edit', 'menu.delete', 'menu.create',
      
      // Order permissions
      'orders.view', 'orders.edit', 'orders.delete', 'orders.cancel', 
      'orders.create', 'orders.assign', 'orders.complete',
      
      // Analytics permissions
      'analytics.view', 'analytics.export', 'analytics.financial',
      
      // User management permissions
      'users.view', 'users.manage', 'users.delete', 'users.create',
      'users.roles', 'users.permissions',
      
      // Table permissions
      'tables.view', 'tables.manage', 'tables.assign',
      
      // Inventory permissions
      'inventory.view', 'inventory.manage', 'inventory.order',
      
      // Payment permissions
      'payments.view', 'payments.process', 'payments.refund', 'payments.reports',
      
      // Settings permissions
      'settings.view', 'settings.manage', 'settings.billing',
      
      // Shift permissions
      'shifts.view', 'shifts.manage', 'shifts.approve', 'shifts.swap',
      'shifts.clock', 'shifts.reports',
      
      // Customer permissions
      'customers.view', 'customers.manage', 'customers.communicate',
      
      // Report permissions
      'reports.view', 'reports.export', 'reports.financial', 'reports.staff'
    ]
  }],
  
  // UI access control
  uiAccess: {
    dashboard: { type: Boolean, default: true },
    orders: { type: Boolean, default: true },
    menu: { type: Boolean, default: false },
    tables: { type: Boolean, default: false },
    customers: { type: Boolean, default: false },
    analytics: { type: Boolean, default: false },
    inventory: { type: Boolean, default: false },
    staff: { type: Boolean, default: false },
    settings: { type: Boolean, default: false }
  },
  
  // Hierarchy level (for org structure)
  level: {
    type: Number,
    default: 1 // 1 = highest, higher numbers = lower in hierarchy
  },
  
  // Who this role reports to
  reportsTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Role'
  },
  
  isActive: {
    type: Boolean,
    default: true
  }
}, { 
  timestamps: true,
  indexes: [
    { tenantId: 1, code: 1 },
    { tenantId: 1, isActive: 1 }
  ]
});

// Add tenant filter
roleSchema.pre(/^find/, function() {
  const tenantId = getCurrentTenantId();
  if (tenantId) {
    this.where({ tenantId });
  }
});

roleSchema.pre('save', function(next) {
  if (!this.tenantId) {
    this.tenantId = getCurrentTenantId();
  }
  next();
});

// Create compound unique index
roleSchema.index({ tenantId: 1, code: 1 }, { unique: true });

module.exports = mongoose.model('Role', roleSchema);