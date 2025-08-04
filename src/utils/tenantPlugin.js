// Mongoose plugin to add tenant support to all models
const { getCurrentTenant } = require('../middleware/enterpriseTenantIsolation');

function tenantPlugin(schema) {
  // Add tenantId field to all schemas
  schema.add({
    tenantId: {
      type: String,
      required: true,
      index: true
    }
  });

  // Add compound indexes for better query performance
  schema.index({ tenantId: 1, createdAt: -1 });
  
  // Pre-save hook to ensure tenantId is set
  schema.pre('save', function(next) {
    if (!this.tenantId) {
      const tenantId = getCurrentTenant()?.tenantId;
      if (tenantId) {
        this.tenantId = tenantId;
      } else if (!this.isNew) {
        // For updates, keep existing tenantId
        next();
        return;
      } else {
        return next(new Error('Tenant context is required'));
      }
    }
    next();
  });

  // Pre-find hooks to add tenant filter
  const findHooks = [
    'find',
    'findOne',
    'findOneAndUpdate',
    'findOneAndDelete',
    'findOneAndRemove',
    'count',
    'countDocuments',
    'distinct'
  ];

  findHooks.forEach(method => {
    schema.pre(method, function() {
      // Skip tenant filtering if explicitly disabled
      if (this.getOptions().skipTenant) {
        return;
      }

      const tenantId = getCurrentTenant()?.tenantId;
      if (tenantId) {
        this.where({ tenantId });
      }
    });
  });

  // Pre-aggregate hook
  schema.pre('aggregate', function() {
    // Skip tenant filtering if explicitly disabled
    const options = this.options;
    if (options.skipTenant) {
      return;
    }

    const tenantId = getCurrentTenantId();
    if (tenantId) {
      // Add tenant filter as first stage
      this.pipeline().unshift({ $match: { tenantId } });
    }
  });

  // Instance method to check if document belongs to current tenant
  schema.methods.belongsToCurrentTenant = function() {
    const currentTenantId = getCurrentTenant()?.tenantId;
    return currentTenantId && this.tenantId === currentTenantId;
  };

  // Static method to find without tenant filter
  schema.statics.findWithoutTenant = function(...args) {
    return this.find(...args).setOptions({ skipTenant: true });
  };

  // Static method to count without tenant filter
  schema.statics.countWithoutTenant = function(...args) {
    return this.countDocuments(...args).setOptions({ skipTenant: true });
  };
}

module.exports = tenantPlugin;