const mongoose = require('mongoose');

const ingredientBatchSchema = new mongoose.Schema({
  tenantId: { type: String, required: true, index: true },
  ingredient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Ingredient',
    required: true,
    index: true
  },
  batchNumber: {
    type: String,
    required: true
  },
  supplier: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Supplier'
  },
  purchaseDate: {
    type: Date,
    required: true,
    default: Date.now
  },
  expiryDate: {
    type: Date,
    required: true,
    index: true
  },
  manufacturingDate: Date,
  initialQuantity: {
    type: Number,
    required: true,
    min: 0
  },
  remainingQuantity: {
    type: Number,
    required: true,
    min: 0
  },
  unit: {
    type: String,
    required: true
  },
  costPerUnit: {
    type: Number,
    required: true,
    min: 0
  },
  totalCost: {
    type: Number,
    required: true,
    min: 0
  },
  storageLocation: String,
  temperatureLog: [{
    temperature: Number,
    timestamp: Date,
    recordedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  }],
  qualityChecks: [{
    checkType: {
      type: String,
      enum: ['visual', 'taste', 'temperature', 'ph', 'other']
    },
    result: {
      type: String,
      enum: ['pass', 'fail', 'warning']
    },
    notes: String,
    checkedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    checkedAt: {
      type: Date,
      default: Date.now
    }
  }],
  status: {
    type: String,
    enum: ['active', 'expired', 'recalled', 'consumed', 'discarded'],
    default: 'active'
  },
  recallInfo: {
    recalled: {
      type: Boolean,
      default: false
    },
    recallDate: Date,
    recallReason: String,
    recallNotificationSent: {
      type: Boolean,
      default: false
    }
  },
  notes: String
}, { timestamps: true });

// Compound indexes
ingredientBatchSchema.index({ tenantId: 1, batchNumber: 1 }, { unique: true });
ingredientBatchSchema.index({ tenantId: 1, ingredient: 1, expiryDate: 1 });
ingredientBatchSchema.index({ tenantId: 1, status: 1 });
ingredientBatchSchema.index({ tenantId: 1, 'recallInfo.recalled': 1 });

// Virtual for days until expiry
ingredientBatchSchema.virtual('daysUntilExpiry').get(function() {
  const today = new Date();
  const diffTime = this.expiryDate - today;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
});

// Virtual for usage percentage
ingredientBatchSchema.virtual('usagePercentage').get(function() {
  if (this.initialQuantity === 0) return 100;
  return ((this.initialQuantity - this.remainingQuantity) / this.initialQuantity) * 100;
});

// Virtual for is expired
ingredientBatchSchema.virtual('isExpired').get(function() {
  return this.expiryDate < new Date();
});

// Method to use from batch (FIFO)
ingredientBatchSchema.methods.useFromBatch = async function(quantity) {
  if (this.remainingQuantity < quantity) {
    throw new Error(`Insufficient quantity in batch. Available: ${this.remainingQuantity}`);
  }
  
  if (this.isExpired) {
    throw new Error('Cannot use from expired batch');
  }
  
  if (this.status !== 'active') {
    throw new Error(`Cannot use from ${this.status} batch`);
  }
  
  this.remainingQuantity -= quantity;
  
  if (this.remainingQuantity === 0) {
    this.status = 'consumed';
  }
  
  await this.save();
  
  return {
    usedQuantity: quantity,
    remainingQuantity: this.remainingQuantity,
    batchNumber: this.batchNumber
  };
};

// Method to check quality
ingredientBatchSchema.methods.addQualityCheck = async function(checkData) {
  this.qualityChecks.push({
    checkType: checkData.checkType,
    result: checkData.result,
    notes: checkData.notes,
    checkedBy: checkData.checkedBy,
    checkedAt: new Date()
  });
  
  // If quality check fails, update status
  if (checkData.result === 'fail') {
    this.status = 'discarded';
  }
  
  await this.save();
};

// Static method to get expiring batches
ingredientBatchSchema.statics.getExpiringBatches = async function(tenantId, daysAhead = 7) {
  const expiryDate = new Date();
  expiryDate.setDate(expiryDate.getDate() + daysAhead);
  
  return await this.find({
    tenantId,
    expiryDate: { $lte: expiryDate, $gte: new Date() },
    status: 'active',
    remainingQuantity: { $gt: 0 }
  }).populate('ingredient', 'name');
};

// Static method to get batches by FIFO
ingredientBatchSchema.statics.getBatchesFIFO = async function(ingredientId, tenantId) {
  return await this.find({
    tenantId,
    ingredient: ingredientId,
    status: 'active',
    remainingQuantity: { $gt: 0 },
    expiryDate: { $gte: new Date() }
  }).sort({ purchaseDate: 1, expiryDate: 1 });
};

// Pre-save middleware
ingredientBatchSchema.pre('save', function(next) {
  if (!this.tenantId) {
    return next(new Error('tenantId is required'));
  }
  
  // Auto-update status based on expiry
  if (this.isExpired && this.status === 'active') {
    this.status = 'expired';
  }
  
  next();
});

// Ensure tenant isolation in queries
ingredientBatchSchema.pre(/^find/, function() {
  const { getCurrentTenant } = require('../middleware/enterpriseTenantIsolation');
  const contextData = getCurrentTenant();
  const context = contextData?.tenantId;
  if (context && !this.getQuery().tenantId) {
    this.where({ tenantId: context });
  }
});

module.exports = mongoose.model('IngredientBatch', ingredientBatchSchema);