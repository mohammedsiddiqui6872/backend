const mongoose = require('mongoose');
const { getCurrentTenant } = require('../middleware/enterpriseTenantIsolation');

const modifierOptionSchema = new mongoose.Schema({
  name: { type: String, required: true },
  nameAr: String,
  price: { type: Number, default: 0 },
  isDefault: { type: Boolean, default: false },
  calories: Number,
  available: { type: Boolean, default: true },
  maxQuantity: { type: Number, default: 1 },
  displayOrder: { type: Number, default: 0 }
});

const modifierGroupSchema = new mongoose.Schema({
  tenantId: { 
    type: String, 
    required: true, 
    index: true,
    default: function() {
      const context = getCurrentTenant();
      return context?.tenantId;
    }
  },
  
  name: { type: String, required: true },
  nameAr: String,
  description: String,
  
  // Configuration
  type: {
    type: String,
    enum: ['single', 'multiple'], // single = radio buttons, multiple = checkboxes
    default: 'single'
  },
  
  required: { type: Boolean, default: false },
  
  // Min/max selections for multiple type
  minSelections: { type: Number, default: 0 },
  maxSelections: { type: Number, default: 1 },
  
  // Options
  options: [modifierOptionSchema],
  
  // Display
  displayOrder: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true },
  
  // Tracking
  menuItems: [{ type: mongoose.Schema.Types.ObjectId, ref: 'MenuItem' }],
  
  // Analytics
  analytics: {
    totalUsage: { type: Number, default: 0 },
    popularOptions: [{
      optionName: String,
      count: Number
    }],
    lastUsed: Date
  }
}, { 
  timestamps: true,
  indexes: [
    { tenantId: 1, name: 1 },
    { tenantId: 1, isActive: 1 },
    { tenantId: 1, menuItems: 1 }
  ]
});

// Validate min/max selections
modifierGroupSchema.pre('save', function(next) {
  if (this.type === 'single') {
    this.minSelections = this.required ? 1 : 0;
    this.maxSelections = 1;
  } else if (this.type === 'multiple') {
    if (this.minSelections > this.maxSelections) {
      return next(new Error('Minimum selections cannot be greater than maximum selections'));
    }
    if (this.required && this.minSelections === 0) {
      this.minSelections = 1;
    }
  }
  
  // Ensure only one default option for single type
  if (this.type === 'single') {
    const defaultOptions = this.options.filter(opt => opt.isDefault);
    if (defaultOptions.length > 1) {
      // Keep only the first default
      this.options.forEach((opt, index) => {
        if (opt.isDefault && defaultOptions.indexOf(opt) > 0) {
          opt.isDefault = false;
        }
      });
    }
  }
  
  next();
});

// Calculate total price for a selection
modifierGroupSchema.methods.calculatePrice = function(selectedOptions) {
  let totalPrice = 0;
  
  if (!selectedOptions || selectedOptions.length === 0) {
    return totalPrice;
  }
  
  selectedOptions.forEach(selection => {
    const option = this.options.find(opt => 
      opt._id.toString() === selection.optionId || opt.name === selection.optionName
    );
    
    if (option) {
      const quantity = selection.quantity || 1;
      totalPrice += option.price * quantity;
    }
  });
  
  return totalPrice;
};

// Validate selections
modifierGroupSchema.methods.validateSelections = function(selectedOptions) {
  if (!selectedOptions || !Array.isArray(selectedOptions)) {
    selectedOptions = [];
  }
  
  // Check if required
  if (this.required && selectedOptions.length === 0) {
    return { valid: false, error: `${this.name} is required` };
  }
  
  // Check selection count
  if (this.type === 'multiple') {
    if (selectedOptions.length < this.minSelections) {
      return { 
        valid: false, 
        error: `Please select at least ${this.minSelections} option(s) for ${this.name}` 
      };
    }
    if (selectedOptions.length > this.maxSelections) {
      return { 
        valid: false, 
        error: `Please select at most ${this.maxSelections} option(s) for ${this.name}` 
      };
    }
  } else if (this.type === 'single' && selectedOptions.length > 1) {
    return { 
      valid: false, 
      error: `Please select only one option for ${this.name}` 
    };
  }
  
  // Validate each selection
  for (const selection of selectedOptions) {
    const option = this.options.find(opt => 
      opt._id.toString() === selection.optionId || opt.name === selection.optionName
    );
    
    if (!option) {
      return { valid: false, error: `Invalid option selected for ${this.name}` };
    }
    
    if (!option.available) {
      return { valid: false, error: `${option.name} is not available` };
    }
    
    if (selection.quantity > option.maxQuantity) {
      return { 
        valid: false, 
        error: `Maximum quantity for ${option.name} is ${option.maxQuantity}` 
      };
    }
  }
  
  return { valid: true };
};

// Update analytics
modifierGroupSchema.methods.updateAnalytics = function(selectedOptions) {
  this.analytics.totalUsage += 1;
  this.analytics.lastUsed = new Date();
  
  selectedOptions.forEach(selection => {
    const option = this.options.find(opt => 
      opt._id.toString() === selection.optionId || opt.name === selection.optionName
    );
    
    if (option) {
      const popularOption = this.analytics.popularOptions.find(
        pop => pop.optionName === option.name
      );
      
      if (popularOption) {
        popularOption.count += 1;
      } else {
        this.analytics.popularOptions.push({
          optionName: option.name,
          count: 1
        });
      }
    }
  });
  
  // Sort by popularity
  this.analytics.popularOptions.sort((a, b) => b.count - a.count);
  
  // Keep only top 10
  if (this.analytics.popularOptions.length > 10) {
    this.analytics.popularOptions = this.analytics.popularOptions.slice(0, 10);
  }
};

// Enterprise-grade tenant filter
modifierGroupSchema.pre(/^find/, function() {
  if (this.getOptions().skipTenantFilter) {
    console.log('ModifierGroup model: Skipping tenant filter (super admin operation)');
    return;
  }
  
  const queryTenantId = this.getQuery().tenantId;
  const context = getCurrentTenant();
  
  if (queryTenantId && context?.tenantId && queryTenantId !== context.tenantId) {
    console.error('ModifierGroup model: SECURITY WARNING - Query tenant mismatch!', {
      queryTenantId,
      contextTenantId: context.tenantId
    });
    this.where({ _id: null });
    return;
  }
  
  if (context?.tenantId) {
    console.log('ModifierGroup model: Applying enterprise tenant filter:', context.tenantId);
    this.where({ tenantId: context.tenantId });
  } else if (!queryTenantId) {
    console.warn('ModifierGroup model: No tenant context available');
    this.where({ _id: null });
  }
});

// Ensure tenantId on save
modifierGroupSchema.pre('save', function(next) {
  if (!this.tenantId) {
    const context = getCurrentTenant();
    if (context?.tenantId) {
      this.tenantId = context.tenantId;
      console.log('ModifierGroup model: Setting tenantId on save:', context.tenantId);
    } else {
      return next(new Error('Cannot create modifier group without tenant context'));
    }
  }
  next();
});

module.exports = mongoose.model('ModifierGroup', modifierGroupSchema);