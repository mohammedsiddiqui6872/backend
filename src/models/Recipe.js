const mongoose = require('mongoose');

const recipeIngredientSchema = new mongoose.Schema({
  ingredient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Ingredient',
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    min: 0
  },
  unit: {
    type: String,
    required: true,
    enum: ['g', 'kg', 'ml', 'l', 'piece', 'cup', 'tbsp', 'tsp', 'oz', 'lb']
  }
});

const recipeSchema = new mongoose.Schema({
  tenantId: { type: String, required: true, index: true },
  menuItem: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'MenuItem',
    required: true,
    unique: true
  },
  ingredients: [recipeIngredientSchema],
  instructions: [{
    step: Number,
    instruction: String,
    prepTime: Number // in minutes
  }],
  yieldAmount: {
    type: Number,
    default: 1
  },
  yieldUnit: {
    type: String,
    default: 'serving'
  },
  totalPrepTime: {
    type: Number, // in minutes
    default: 0
  },
  totalCookTime: {
    type: Number, // in minutes
    default: 0
  },
  skillLevel: {
    type: String,
    enum: ['beginner', 'intermediate', 'advanced'],
    default: 'intermediate'
  },
  notes: String,
  allergenInfo: String,
  nutritionCalculated: {
    type: Boolean,
    default: false
  }
}, { timestamps: true });

// Indexes
recipeSchema.index({ tenantId: 1, menuItem: 1 }, { unique: true });

// Virtual for total time
recipeSchema.virtual('totalTime').get(function() {
  return this.totalPrepTime + this.totalCookTime;
});

// Method to calculate cost based on ingredients
recipeSchema.methods.calculateCost = async function() {
  const Ingredient = mongoose.model('Ingredient');
  let totalCost = 0;
  
  for (const item of this.ingredients) {
    const ingredient = await Ingredient.findById(item.ingredient);
    if (ingredient && ingredient.costPerUnit) {
      // Convert quantity to base unit for calculation
      const quantityInBaseUnit = this.convertToBaseUnit(item.quantity, item.unit, ingredient.baseUnit);
      totalCost += quantityInBaseUnit * ingredient.costPerUnit;
    }
  }
  
  return totalCost / this.yieldAmount; // Cost per serving
};

// Helper method to convert units
recipeSchema.methods.convertToBaseUnit = function(quantity, fromUnit, toUnit) {
  // Simplified conversion - in production, use a proper conversion library
  const conversions = {
    'g': { 'kg': 0.001, 'g': 1 },
    'kg': { 'g': 1000, 'kg': 1 },
    'ml': { 'l': 0.001, 'ml': 1 },
    'l': { 'ml': 1000, 'l': 1 },
    'tsp': { 'tbsp': 0.333, 'ml': 5 },
    'tbsp': { 'tsp': 3, 'ml': 15 },
    'cup': { 'ml': 237 },
    'oz': { 'g': 28.35, 'ml': 29.57 },
    'lb': { 'kg': 0.453, 'g': 453.6 }
  };
  
  if (fromUnit === toUnit) return quantity;
  
  if (conversions[fromUnit] && conversions[fromUnit][toUnit]) {
    return quantity * conversions[fromUnit][toUnit];
  }
  
  // If no direct conversion, return original (should handle better in production)
  return quantity;
};

// Method to check if ingredients are available
recipeSchema.methods.checkIngredientsAvailability = async function() {
  const Ingredient = mongoose.model('Ingredient');
  const unavailable = [];
  const lowStock = [];
  
  for (const item of this.ingredients) {
    const ingredient = await Ingredient.findById(item.ingredient);
    if (!ingredient) {
      unavailable.push({ ingredient: item.ingredient, reason: 'not_found' });
      continue;
    }
    
    const requiredQuantity = this.convertToBaseUnit(item.quantity, item.unit, ingredient.baseUnit);
    
    if (ingredient.currentStock < requiredQuantity) {
      unavailable.push({
        ingredient: ingredient.name,
        required: requiredQuantity,
        available: ingredient.currentStock,
        unit: ingredient.baseUnit
      });
    } else if (ingredient.currentStock - requiredQuantity <= ingredient.lowStockThreshold) {
      lowStock.push({
        ingredient: ingredient.name,
        afterUse: ingredient.currentStock - requiredQuantity,
        threshold: ingredient.lowStockThreshold,
        unit: ingredient.baseUnit
      });
    }
  }
  
  return { available: unavailable.length === 0, unavailable, lowStock };
};

// Method to deduct ingredients when menu item is ordered
recipeSchema.methods.deductIngredients = async function(quantity = 1) {
  const Ingredient = mongoose.model('Ingredient');
  const IngredientTransaction = mongoose.model('IngredientTransaction');
  const deductions = [];
  
  for (const item of this.ingredients) {
    const ingredient = await Ingredient.findById(item.ingredient);
    if (!ingredient) continue;
    
    const requiredQuantity = this.convertToBaseUnit(item.quantity * quantity, item.unit, ingredient.baseUnit);
    
    if (ingredient.currentStock < requiredQuantity) {
      throw new Error(`Insufficient stock for ${ingredient.name}`);
    }
    
    // Update ingredient stock
    ingredient.currentStock -= requiredQuantity;
    await ingredient.save();
    
    // Create transaction record
    const transaction = await IngredientTransaction.create({
      tenantId: this.tenantId,
      ingredient: ingredient._id,
      transactionType: 'recipe_usage',
      quantity: -requiredQuantity,
      relatedRecipe: this._id,
      notes: `Used in ${quantity} x ${this.menuItem}`
    });
    
    deductions.push({
      ingredient: ingredient.name,
      quantity: requiredQuantity,
      unit: ingredient.baseUnit,
      transaction: transaction._id
    });
  }
  
  return deductions;
};

// Pre-save middleware for tenant isolation
recipeSchema.pre('save', function(next) {
  if (!this.tenantId) {
    return next(new Error('tenantId is required'));
  }
  next();
});

// Ensure tenant isolation in queries
recipeSchema.pre(/^find/, function() {
  const context = require('../middleware/tenantContext').getCurrentTenantId();
  if (context && !this.getQuery().tenantId) {
    this.where({ tenantId: context });
  }
});

module.exports = mongoose.model('Recipe', recipeSchema);