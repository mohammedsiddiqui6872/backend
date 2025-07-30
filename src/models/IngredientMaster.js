const mongoose = require('mongoose');

const ingredientMasterSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  category: {
    type: String,
    required: true,
    enum: ['vegetables', 'fruits', 'meat', 'seafood', 'dairy', 'grains', 'spices', 'condiments', 'beverages', 'other']
  },
  unit: {
    type: String,
    required: true,
    enum: ['kg', 'g', 'l', 'ml', 'pieces', 'dozen', 'pack', 'bottle', 'can']
  },
  costPerUnit: {
    type: Number,
    required: true,
    min: 0
  },
  suppliers: [{
    name: String,
    contact: String,
    price: Number,
    isPreferred: Boolean
  }],
  nutritionalInfo: {
    caloriesPerUnit: Number,
    proteinPerUnit: Number,
    carbsPerUnit: Number,
    fatPerUnit: Number
  },
  storageInstructions: String,
  shelfLife: {
    value: Number,
    unit: {
      type: String,
      enum: ['days', 'weeks', 'months']
    }
  },
  reorderLevel: {
    type: Number,
    default: 10
  },
  reorderQuantity: {
    type: Number,
    default: 50
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, { timestamps: true });

// Indexes
ingredientMasterSchema.index({ name: 1 });
ingredientMasterSchema.index({ category: 1 });

module.exports = mongoose.model('IngredientMaster', ingredientMasterSchema);