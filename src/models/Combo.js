const mongoose = require('mongoose');

const comboSchema = new mongoose.Schema({
  tenantId: {
    type: String,
    required: true,
    index: true
  },
  name: {
    type: String,
    required: true
  },
  nameAr: String,
  description: String,
  descriptionAr: String,
  image: String,
  isActive: {
    type: Boolean,
    default: true
  },
  category: {
    type: String,
    default: 'Combos'
  },
  
  // Combo Items
  items: [{
    menuItem: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'MenuItem',
      required: true
    },
    quantity: {
      type: Number,
      default: 1,
      min: 1
    },
    isRequired: {
      type: Boolean,
      default: true
    },
    // For choice-based combos (e.g., choose 1 of 3 sides)
    choiceGroup: String,
    minChoice: {
      type: Number,
      default: 1
    },
    maxChoice: {
      type: Number,
      default: 1
    }
  }],
  
  // Pricing
  price: {
    type: Number,
    required: true,
    min: 0
  },
  savings: {
    type: Number,
    default: 0
  },
  
  // Display options
  displayOrder: {
    type: Number,
    default: 0
  },
  tags: [String],
  
  // Availability
  available: {
    type: Boolean,
    default: true
  },
  availableDays: [{
    type: String,
    enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
  }],
  availableStartTime: String, // HH:MM
  availableEndTime: String,   // HH:MM
  
  // Stock tracking
  maxDailyQuantity: {
    type: Number,
    default: -1 // -1 means unlimited
  },
  currentDailyQuantity: {
    type: Number,
    default: 0
  },
  lastResetDate: Date,
  
  // Validity period
  validFrom: Date,
  validUntil: Date,
  
  // Analytics
  totalOrders: {
    type: Number,
    default: 0
  },
  totalRevenue: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Indexes
comboSchema.index({ tenantId: 1, isActive: 1 });
comboSchema.index({ tenantId: 1, category: 1 });
comboSchema.index({ validFrom: 1, validUntil: 1 });

// Calculate total price if items were ordered separately
comboSchema.methods.calculateOriginalPrice = async function() {
  await this.populate('items.menuItem');
  
  let totalPrice = 0;
  for (const item of this.items) {
    if (item.menuItem && item.menuItem.price) {
      totalPrice += item.menuItem.price * item.quantity;
    }
  }
  
  return totalPrice;
};

// Calculate savings
comboSchema.methods.calculateSavings = async function() {
  const originalPrice = await this.calculateOriginalPrice();
  return originalPrice - this.price;
};

// Check if combo is currently available
comboSchema.methods.isAvailable = function() {
  if (!this.isActive || !this.available) return false;
  
  const now = new Date();
  
  // Check validity period
  if (this.validFrom && now < this.validFrom) return false;
  if (this.validUntil && now > this.validUntil) return false;
  
  // Check day availability
  if (this.availableDays && this.availableDays.length > 0) {
    const currentDay = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][now.getDay()];
    if (!this.availableDays.includes(currentDay)) return false;
  }
  
  // Check time availability
  if (this.availableStartTime && this.availableEndTime) {
    const currentTime = now.toTimeString().slice(0, 5); // HH:MM
    if (currentTime < this.availableStartTime || currentTime > this.availableEndTime) return false;
  }
  
  // Check daily quantity limit
  if (this.maxDailyQuantity > 0) {
    // Reset daily quantity if needed
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (!this.lastResetDate || this.lastResetDate < today) {
      this.currentDailyQuantity = 0;
      this.lastResetDate = today;
    }
    
    if (this.currentDailyQuantity >= this.maxDailyQuantity) return false;
  }
  
  return true;
};

// Check if all items in combo are available
comboSchema.methods.checkItemsAvailability = async function() {
  await this.populate('items.menuItem');
  
  const availability = {
    available: true,
    unavailableItems: [],
    warnings: []
  };
  
  for (const item of this.items) {
    if (!item.menuItem) {
      availability.available = false;
      availability.unavailableItems.push({ item: 'Unknown item', reason: 'Item not found' });
      continue;
    }
    
    // Check if item is available
    if (!item.menuItem.available) {
      if (item.isRequired) {
        availability.available = false;
        availability.unavailableItems.push({
          item: item.menuItem.name,
          reason: 'Item not available'
        });
      } else {
        availability.warnings.push({
          item: item.menuItem.name,
          message: 'Optional item not available'
        });
      }
    }
    
    // Check stock
    if (item.menuItem.stockQuantity !== -1) {
      const requiredQuantity = item.quantity;
      if (item.menuItem.stockQuantity < requiredQuantity) {
        if (item.isRequired) {
          availability.available = false;
          availability.unavailableItems.push({
            item: item.menuItem.name,
            reason: `Insufficient stock (need ${requiredQuantity}, have ${item.menuItem.stockQuantity})`
          });
        } else {
          availability.warnings.push({
            item: item.menuItem.name,
            message: `Low stock (need ${requiredQuantity}, have ${item.menuItem.stockQuantity})`
          });
        }
      }
    }
  }
  
  return availability;
};

// Validate combo choices
comboSchema.methods.validateChoices = function(selectedItems) {
  const choiceGroups = {};
  
  // Group items by choice group
  this.items.forEach((item, index) => {
    if (item.choiceGroup) {
      if (!choiceGroups[item.choiceGroup]) {
        choiceGroups[item.choiceGroup] = {
          items: [],
          minChoice: item.minChoice,
          maxChoice: item.maxChoice
        };
      }
      choiceGroups[item.choiceGroup].items.push({ ...item.toObject(), index });
    }
  });
  
  // Validate each choice group
  for (const [groupName, group] of Object.entries(choiceGroups)) {
    const selectedInGroup = selectedItems.filter(idx => 
      group.items.some(item => item.index === idx)
    ).length;
    
    if (selectedInGroup < group.minChoice) {
      throw new Error(`Please select at least ${group.minChoice} item(s) from ${groupName}`);
    }
    
    if (selectedInGroup > group.maxChoice) {
      throw new Error(`Please select at most ${group.maxChoice} item(s) from ${groupName}`);
    }
  }
  
  // Validate required items
  const requiredIndices = this.items
    .map((item, index) => ({ item, index }))
    .filter(({ item }) => item.isRequired && !item.choiceGroup)
    .map(({ index }) => index);
  
  const missingRequired = requiredIndices.filter(idx => !selectedItems.includes(idx));
  if (missingRequired.length > 0) {
    throw new Error('All required items must be included in the combo');
  }
  
  return true;
};

// Get active combos
comboSchema.statics.getActiveCombos = async function(tenantId) {
  const combos = await this.find({
    tenantId,
    isActive: true
  }).populate('items.menuItem', 'name nameAr price image available stockQuantity');
  
  // Filter combos that are currently available
  const availableCombos = [];
  for (const combo of combos) {
    if (combo.isAvailable()) {
      const itemsAvailability = await combo.checkItemsAvailability();
      if (itemsAvailability.available) {
        const comboObj = combo.toObject();
        comboObj.savings = await combo.calculateSavings();
        comboObj.itemsAvailability = itemsAvailability;
        availableCombos.push(comboObj);
      }
    }
  }
  
  return availableCombos;
};

module.exports = mongoose.model('Combo', comboSchema);