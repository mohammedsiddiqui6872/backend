const mongoose = require('mongoose');

const ingredientTransactionSchema = new mongoose.Schema({
  tenantId: { type: String, required: true, index: true },
  ingredient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Ingredient',
    required: true,
    index: true
  },
  transactionType: {
    type: String,
    required: true,
    enum: ['purchase', 'recipe_usage', 'waste', 'adjustment', 'return', 'transfer'],
    index: true
  },
  quantity: {
    type: Number,
    required: true
    // Positive for additions (purchase, return)
    // Negative for deductions (usage, waste)
  },
  unit: {
    type: String,
    required: true
  },
  previousStock: {
    type: Number,
    required: true,
    min: 0
  },
  newStock: {
    type: Number,
    required: true,
    min: 0
  },
  costPerUnit: Number,
  totalCost: Number,
  
  // Related entities
  relatedOrder: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order'
  },
  relatedRecipe: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Recipe'
  },
  relatedBatch: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'IngredientBatch'
  },
  supplier: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Supplier'
  },
  
  // Additional information
  invoiceNumber: String,
  reason: String,
  notes: String,
  performedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // For transfers between locations
  fromLocation: String,
  toLocation: String,
  
  // Expiry tracking
  expiryDate: Date,
  batchNumber: String
}, { timestamps: true });

// Indexes for performance
ingredientTransactionSchema.index({ tenantId: 1, ingredient: 1, createdAt: -1 });
ingredientTransactionSchema.index({ tenantId: 1, transactionType: 1, createdAt: -1 });
ingredientTransactionSchema.index({ tenantId: 1, relatedOrder: 1 });
ingredientTransactionSchema.index({ tenantId: 1, supplier: 1, createdAt: -1 });

// Virtual for transaction impact
ingredientTransactionSchema.virtual('impact').get(function() {
  return this.quantity > 0 ? 'increase' : 'decrease';
});

// Static method to get transaction summary
ingredientTransactionSchema.statics.getTransactionSummary = async function(ingredientId, startDate, endDate) {
  const match = {
    ingredient: mongoose.Types.ObjectId(ingredientId)
  };
  
  if (startDate || endDate) {
    match.createdAt = {};
    if (startDate) match.createdAt.$gte = new Date(startDate);
    if (endDate) match.createdAt.$lte = new Date(endDate);
  }
  
  return await this.aggregate([
    { $match: match },
    {
      $group: {
        _id: '$transactionType',
        count: { $sum: 1 },
        totalQuantity: { $sum: '$quantity' },
        totalCost: { $sum: '$totalCost' }
      }
    },
    {
      $project: {
        transactionType: '$_id',
        count: 1,
        totalQuantity: 1,
        totalCost: 1,
        _id: 0
      }
    }
  ]);
};

// Static method to calculate ingredient cost over period
ingredientTransactionSchema.statics.calculateIngredientCost = async function(ingredientId, startDate, endDate) {
  const match = {
    ingredient: mongoose.Types.ObjectId(ingredientId),
    transactionType: 'purchase'
  };
  
  if (startDate || endDate) {
    match.createdAt = {};
    if (startDate) match.createdAt.$gte = new Date(startDate);
    if (endDate) match.createdAt.$lte = new Date(endDate);
  }
  
  const result = await this.aggregate([
    { $match: match },
    {
      $group: {
        _id: null,
        totalQuantity: { $sum: '$quantity' },
        totalCost: { $sum: '$totalCost' }
      }
    }
  ]);
  
  if (result.length > 0) {
    return {
      totalQuantity: result[0].totalQuantity,
      totalCost: result[0].totalCost,
      averageCostPerUnit: result[0].totalCost / result[0].totalQuantity
    };
  }
  
  return { totalQuantity: 0, totalCost: 0, averageCostPerUnit: 0 };
};

// Pre-save middleware for validation
ingredientTransactionSchema.pre('save', async function(next) {
  if (!this.tenantId) {
    return next(new Error('tenantId is required'));
  }
  
  // Validate stock calculations
  if (this.isNew) {
    const expectedNewStock = this.previousStock + this.quantity;
    if (Math.abs(expectedNewStock - this.newStock) > 0.01) {
      return next(new Error('Stock calculation mismatch'));
    }
  }
  
  next();
});

// Ensure tenant isolation in queries
ingredientTransactionSchema.pre(/^find/, function() {
  const { getCurrentTenant } = require('../middleware/enterpriseTenantIsolation');
  const contextData = getCurrentTenant();
  const context = contextData?.tenantId;
  if (context && !this.getQuery().tenantId) {
    this.where({ tenantId: context });
  }
});

module.exports = mongoose.model('IngredientTransaction', ingredientTransactionSchema);