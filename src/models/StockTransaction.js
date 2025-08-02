const mongoose = require('mongoose');

const stockTransactionSchema = new mongoose.Schema({
  tenantId: {
    type: String,
    required: true,
    index: true
  },
  menuItemId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'MenuItem',
    required: true,
    index: true
  },
  transactionType: {
    type: String,
    required: true,
    enum: ['adjustment', 'sale', 'return', 'restock', 'waste', 'initial'],
    index: true
  },
  quantity: {
    type: Number,
    required: true,
    validate: {
      validator: function(value) {
        return value !== 0;
      },
      message: 'Quantity cannot be zero'
    }
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
  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    sparse: true,
    index: true
  },
  reason: {
    type: String,
    trim: true,
    maxlength: 500
  },
  performedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Compound indexes for efficient querying
stockTransactionSchema.index({ tenantId: 1, menuItemId: 1, createdAt: -1 });
stockTransactionSchema.index({ tenantId: 1, transactionType: 1, createdAt: -1 });
stockTransactionSchema.index({ tenantId: 1, performedBy: 1, createdAt: -1 });
stockTransactionSchema.index({ tenantId: 1, orderId: 1 }, { sparse: true });

// Virtual for absolute quantity (always positive)
stockTransactionSchema.virtual('absoluteQuantity').get(function() {
  return Math.abs(this.quantity);
});

// Virtual for transaction impact (positive/negative)
stockTransactionSchema.virtual('impact').get(function() {
  return this.quantity > 0 ? 'increase' : 'decrease';
});

// Pre-save middleware to validate stock calculations
stockTransactionSchema.pre('save', function(next) {
  // Validate that the stock calculation is correct
  const expectedNewStock = this.previousStock + this.quantity;
  
  if (this.newStock !== expectedNewStock) {
    return next(new Error(`Stock calculation error: Expected ${expectedNewStock}, got ${this.newStock}`));
  }

  // Ensure new stock is not negative
  if (this.newStock < 0) {
    return next(new Error('Stock cannot be negative'));
  }

  next();
});

// Static method to get stock history for a menu item
stockTransactionSchema.statics.getStockHistory = function(tenantId, menuItemId, options = {}) {
  const query = { tenantId, menuItemId };
  
  // Add date range filter if provided
  if (options.startDate || options.endDate) {
    query.createdAt = {};
    if (options.startDate) query.createdAt.$gte = new Date(options.startDate);
    if (options.endDate) query.createdAt.$lte = new Date(options.endDate);
  }

  // Add transaction type filter if provided
  if (options.transactionType) {
    query.transactionType = options.transactionType;
  }

  return this.find(query)
    .populate('performedBy', 'name email')
    .populate('orderId', 'orderNumber')
    .sort({ createdAt: -1 })
    .limit(options.limit || 100);
};

// Static method to get stock summary by transaction type
stockTransactionSchema.statics.getStockSummary = function(tenantId, menuItemId, dateRange = {}) {
  const matchStage = { tenantId, menuItemId };
  
  if (dateRange.start || dateRange.end) {
    matchStage.createdAt = {};
    if (dateRange.start) matchStage.createdAt.$gte = new Date(dateRange.start);
    if (dateRange.end) matchStage.createdAt.$lte = new Date(dateRange.end);
  }

  return this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: '$transactionType',
        totalQuantity: { $sum: '$quantity' },
        transactionCount: { $sum: 1 },
        avgQuantity: { $avg: '$quantity' }
      }
    },
    { $sort: { _id: 1 } }
  ]);
};

// Static method to get low stock alerts
stockTransactionSchema.statics.getLowStockItems = function(tenantId, threshold = 10) {
  return this.aggregate([
    { $match: { tenantId } },
    { $sort: { menuItemId: 1, createdAt: -1 } },
    {
      $group: {
        _id: '$menuItemId',
        latestStock: { $first: '$newStock' },
        lastTransaction: { $first: '$createdAt' }
      }
    },
    { $match: { latestStock: { $lte: threshold } } },
    {
      $lookup: {
        from: 'menuitems',
        localField: '_id',
        foreignField: '_id',
        as: 'menuItem'
      }
    },
    { $unwind: '$menuItem' },
    {
      $project: {
        menuItemId: '$_id',
        menuItemName: '$menuItem.name',
        currentStock: '$latestStock',
        lastTransactionDate: '$lastTransaction'
      }
    },
    { $sort: { currentStock: 1 } }
  ]);
};

// Instance method to format transaction for display
stockTransactionSchema.methods.getFormattedTransaction = function() {
  return {
    id: this._id,
    type: this.transactionType,
    quantity: this.quantity,
    impact: this.impact,
    previousStock: this.previousStock,
    newStock: this.newStock,
    reason: this.reason,
    date: this.createdAt,
    performedBy: this.performedBy?.name || 'Unknown'
  };
};

const StockTransaction = mongoose.model('StockTransaction', stockTransactionSchema);

module.exports = StockTransaction;