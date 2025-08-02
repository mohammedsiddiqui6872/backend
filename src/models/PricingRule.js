const mongoose = require('mongoose');

const pricingRuleSchema = new mongoose.Schema({
  tenantId: {
    type: String,
    required: true,
    index: true
  },
  menuItem: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'MenuItem',
    required: true
  },
  name: {
    type: String,
    required: true
  },
  description: String,
  type: {
    type: String,
    enum: ['time_based', 'day_of_week', 'quantity_based', 'combo', 'bogo', 'percentage_discount', 'fixed_discount'],
    required: true
  },
  priority: {
    type: Number,
    default: 0 // Higher priority rules apply first
  },
  isActive: {
    type: Boolean,
    default: true
  },
  
  // Time-based pricing
  timeRules: [{
    startTime: String, // Format: "HH:MM"
    endTime: String,   // Format: "HH:MM"
    price: Number,     // Override price
    discountPercentage: Number, // Or use percentage discount
    days: [{ // Days when this time rule applies
      type: String,
      enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
    }]
  }],
  
  // Day of week pricing
  dayOfWeekRules: [{
    day: {
      type: String,
      enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
    },
    price: Number,
    discountPercentage: Number
  }],
  
  // Quantity-based discounts
  quantityRules: [{
    minQuantity: Number,
    maxQuantity: Number,
    discountPercentage: Number,
    fixedDiscount: Number
  }],
  
  // Combo rules
  comboRules: {
    comboItems: [{
      menuItem: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'MenuItem'
      },
      quantity: {
        type: Number,
        default: 1
      }
    }],
    comboPrice: Number,
    comboDuration: Number // Minutes the combo is valid after first item ordered
  },
  
  // BOGO rules
  bogoRules: {
    buyQuantity: Number,
    getQuantity: Number,
    getItemId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'MenuItem'
    }, // If different from main item
    maxUsesPerOrder: Number
  },
  
  // Validity period
  validFrom: {
    type: Date,
    default: Date.now
  },
  validUntil: Date,
  
  // Usage limits
  maxUsesTotal: Number,
  maxUsesPerCustomer: Number,
  currentUses: {
    type: Number,
    default: 0
  },
  
  // Conditions
  conditions: {
    minOrderAmount: Number,
    maxOrderAmount: Number,
    customerTypes: [String], // e.g., 'new', 'returning', 'vip'
    channels: [String], // e.g., 'dine-in', 'takeaway', 'delivery'
    tables: [String], // Specific table numbers
    paymentMethods: [String] // e.g., 'cash', 'card', 'wallet'
  }
}, {
  timestamps: true
});

// Indexes
pricingRuleSchema.index({ tenantId: 1, menuItem: 1, isActive: 1 });
pricingRuleSchema.index({ tenantId: 1, type: 1, isActive: 1 });
pricingRuleSchema.index({ validFrom: 1, validUntil: 1 });

// Calculate effective price based on current time and conditions
pricingRuleSchema.methods.calculatePrice = function(basePrice, quantity = 1, context = {}) {
  if (!this.isActive) return basePrice;
  
  const now = new Date();
  
  // Check validity period
  if (this.validFrom && now < this.validFrom) return basePrice;
  if (this.validUntil && now > this.validUntil) return basePrice;
  
  // Check usage limits
  if (this.maxUsesTotal && this.currentUses >= this.maxUsesTotal) return basePrice;
  
  // Check conditions
  if (this.conditions) {
    const { orderAmount, customerType, channel, tableNumber, paymentMethod } = context;
    
    if (this.conditions.minOrderAmount && orderAmount < this.conditions.minOrderAmount) return basePrice;
    if (this.conditions.maxOrderAmount && orderAmount > this.conditions.maxOrderAmount) return basePrice;
    if (this.conditions.customerTypes?.length && !this.conditions.customerTypes.includes(customerType)) return basePrice;
    if (this.conditions.channels?.length && !this.conditions.channels.includes(channel)) return basePrice;
    if (this.conditions.tables?.length && !this.conditions.tables.includes(tableNumber)) return basePrice;
    if (this.conditions.paymentMethods?.length && !this.conditions.paymentMethods.includes(paymentMethod)) return basePrice;
  }
  
  let finalPrice = basePrice;
  
  switch (this.type) {
    case 'time_based':
      finalPrice = this.calculateTimeBasedPrice(basePrice, now);
      break;
      
    case 'day_of_week':
      finalPrice = this.calculateDayOfWeekPrice(basePrice, now);
      break;
      
    case 'quantity_based':
      finalPrice = this.calculateQuantityBasedPrice(basePrice, quantity);
      break;
      
    case 'percentage_discount':
      // Simple percentage discount
      if (this.discountPercentage) {
        finalPrice = basePrice * (1 - this.discountPercentage / 100);
      }
      break;
      
    case 'fixed_discount':
      // Simple fixed discount
      if (this.fixedDiscount) {
        finalPrice = Math.max(0, basePrice - this.fixedDiscount);
      }
      break;
  }
  
  return finalPrice;
};

// Calculate time-based pricing
pricingRuleSchema.methods.calculateTimeBasedPrice = function(basePrice, now) {
  if (!this.timeRules || this.timeRules.length === 0) return basePrice;
  
  const currentTime = now.toTimeString().slice(0, 5); // HH:MM format
  const currentDay = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][now.getDay()];
  
  for (const rule of this.timeRules) {
    // Check if current day is included
    if (rule.days && rule.days.length > 0 && !rule.days.includes(currentDay)) continue;
    
    // Check if current time is in range
    if (rule.startTime <= currentTime && currentTime <= rule.endTime) {
      if (rule.price) return rule.price;
      if (rule.discountPercentage) return basePrice * (1 - rule.discountPercentage / 100);
    }
  }
  
  return basePrice;
};

// Calculate day of week pricing
pricingRuleSchema.methods.calculateDayOfWeekPrice = function(basePrice, now) {
  if (!this.dayOfWeekRules || this.dayOfWeekRules.length === 0) return basePrice;
  
  const currentDay = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][now.getDay()];
  
  const rule = this.dayOfWeekRules.find(r => r.day === currentDay);
  if (rule) {
    if (rule.price) return rule.price;
    if (rule.discountPercentage) return basePrice * (1 - rule.discountPercentage / 100);
  }
  
  return basePrice;
};

// Calculate quantity-based pricing
pricingRuleSchema.methods.calculateQuantityBasedPrice = function(basePrice, quantity) {
  if (!this.quantityRules || this.quantityRules.length === 0) return basePrice * quantity;
  
  // Find applicable rule
  const rule = this.quantityRules.find(r => {
    const minOk = !r.minQuantity || quantity >= r.minQuantity;
    const maxOk = !r.maxQuantity || quantity <= r.maxQuantity;
    return minOk && maxOk;
  });
  
  if (rule) {
    if (rule.discountPercentage) {
      return basePrice * quantity * (1 - rule.discountPercentage / 100);
    }
    if (rule.fixedDiscount) {
      return Math.max(0, (basePrice * quantity) - rule.fixedDiscount);
    }
  }
  
  return basePrice * quantity;
};

// Get active pricing rules for a menu item
pricingRuleSchema.statics.getActiveRules = async function(tenantId, menuItemId, context = {}) {
  const now = new Date();
  
  const rules = await this.find({
    tenantId,
    menuItem: menuItemId,
    isActive: true,
    $or: [
      { validFrom: { $exists: false } },
      { validFrom: { $lte: now } }
    ],
    $or: [
      { validUntil: { $exists: false } },
      { validUntil: { $gte: now } }
    ]
  }).sort({ priority: -1 });
  
  return rules;
};

// Apply best pricing rule
pricingRuleSchema.statics.getBestPrice = async function(tenantId, menuItemId, basePrice, quantity = 1, context = {}) {
  const rules = await this.getActiveRules(tenantId, menuItemId, context);
  
  let bestPrice = basePrice * quantity;
  let appliedRule = null;
  
  for (const rule of rules) {
    const price = rule.calculatePrice(basePrice, quantity, context);
    if (price < bestPrice) {
      bestPrice = price;
      appliedRule = rule;
    }
  }
  
  return {
    originalPrice: basePrice * quantity,
    finalPrice: bestPrice,
    discount: basePrice * quantity - bestPrice,
    appliedRule: appliedRule ? {
      id: appliedRule._id,
      name: appliedRule.name,
      type: appliedRule.type
    } : null
  };
};

module.exports = mongoose.model('PricingRule', pricingRuleSchema);