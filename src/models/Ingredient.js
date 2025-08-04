const mongoose = require('mongoose');

const ingredientSchema = new mongoose.Schema({
  tenantId: { type: String, required: true, index: true },
  name: {
    type: String,
    required: true
  },
  nameAr: String,
  category: {
    type: String,
    required: true,
    enum: ['vegetables', 'fruits', 'meat', 'poultry', 'seafood', 'dairy', 'grains', 'spices', 'oils', 'sauces', 'beverages', 'other']
  },
  description: String,
  barcode: {
    type: String,
    sparse: true,
    index: true
  },
  sku: {
    type: String,
    sparse: true
  },
  baseUnit: {
    type: String,
    required: true,
    enum: ['g', 'kg', 'ml', 'l', 'piece']
  },
  currentStock: {
    type: Number,
    default: 0,
    min: 0
  },
  lowStockThreshold: {
    type: Number,
    default: 10
  },
  reorderPoint: {
    type: Number,
    default: 20
  },
  reorderQuantity: {
    type: Number,
    default: 50
  },
  costPerUnit: {
    type: Number,
    default: 0,
    min: 0
  },
  supplier: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Supplier'
  },
  alternativeSuppliers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Supplier'
  }],
  storageLocation: String,
  storageTemp: {
    type: String,
    enum: ['frozen', 'refrigerated', 'room_temp'],
    default: 'room_temp'
  },
  shelfLife: {
    value: Number,
    unit: {
      type: String,
      enum: ['days', 'weeks', 'months']
    }
  },
  allergens: [{
    type: String,
    enum: ['gluten', 'dairy', 'eggs', 'soy', 'nuts', 'shellfish', 'fish', 'sesame']
  }],
  nutritionPer100: {
    calories: Number,
    protein: Number,
    carbs: Number,
    fat: Number,
    fiber: Number,
    sugar: Number,
    sodium: Number
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastOrderDate: Date,
  lastReceivedDate: Date,
  averageMonthlyUsage: {
    type: Number,
    default: 0
  }
}, { timestamps: true });

// Compound index for tenant-specific uniqueness
ingredientSchema.index({ tenantId: 1, name: 1 }, { unique: true });
ingredientSchema.index({ tenantId: 1, barcode: 1 }, { unique: true, sparse: true });

// Virtual for stock status
ingredientSchema.virtual('stockStatus').get(function() {
  if (this.currentStock === 0) return 'out_of_stock';
  if (this.currentStock <= this.lowStockThreshold) return 'low_stock';
  if (this.currentStock <= this.reorderPoint) return 'reorder_needed';
  return 'in_stock';
});

// Virtual for stock value
ingredientSchema.virtual('stockValue').get(function() {
  return this.currentStock * this.costPerUnit;
});

// Method to check expiry for batches
ingredientSchema.methods.getExpiringBatches = async function(daysAhead = 7) {
  const IngredientBatch = mongoose.model('IngredientBatch');
  const expiryDate = new Date();
  expiryDate.setDate(expiryDate.getDate() + daysAhead);
  
  return await IngredientBatch.find({
    ingredient: this._id,
    expiryDate: { $lte: expiryDate, $gte: new Date() },
    remainingQuantity: { $gt: 0 }
  });
};

// Method to calculate usage rate
ingredientSchema.methods.calculateUsageRate = async function(days = 30) {
  const IngredientTransaction = mongoose.model('IngredientTransaction');
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  
  const transactions = await IngredientTransaction.aggregate([
    {
      $match: {
        ingredient: this._id,
        transactionType: { $in: ['recipe_usage', 'waste', 'adjustment'] },
        createdAt: { $gte: startDate },
        quantity: { $lt: 0 } // Only deductions
      }
    },
    {
      $group: {
        _id: null,
        totalUsed: { $sum: { $abs: '$quantity' } }
      }
    }
  ]);
  
  const totalUsed = transactions[0]?.totalUsed || 0;
  return totalUsed / days; // Average daily usage
};

// Method to predict stock runout
ingredientSchema.methods.predictStockRunout = async function() {
  const dailyUsage = await this.calculateUsageRate();
  if (dailyUsage === 0) return null;
  
  const daysRemaining = Math.floor(this.currentStock / dailyUsage);
  const runoutDate = new Date();
  runoutDate.setDate(runoutDate.getDate() + daysRemaining);
  
  return {
    daysRemaining,
    runoutDate,
    dailyUsage
  };
};

// Pre-save middleware for tenant isolation
ingredientSchema.pre('save', function(next) {
  if (!this.tenantId) {
    return next(new Error('tenantId is required'));
  }
  next();
});

// Ensure tenant isolation in queries
ingredientSchema.pre(/^find/, function() {
  const { getCurrentTenant } = require('../middleware/enterpriseTenantIsolation');
  const contextData = getCurrentTenant();
  const context = contextData?.tenantId;
  if (context && !this.getQuery().tenantId) {
    this.where({ tenantId: context });
  }
});

module.exports = mongoose.model('Ingredient', ingredientSchema);