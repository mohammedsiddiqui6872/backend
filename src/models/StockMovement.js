const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const StockMovementSchema = new Schema({
  tenantId: {
    type: String,
    required: true,
    index: true
  },
  
  // Movement Type
  type: {
    type: String,
    enum: [
      'PURCHASE',      // Stock received from supplier
      'SALE',          // Stock sold to customer
      'TRANSFER',      // Inter-location transfer
      'ADJUSTMENT',    // Manual adjustment
      'PRODUCTION',    // Used in production/recipes
      'WASTE',         // Waste/spoilage
      'RETURN_SUPPLIER', // Returned to supplier
      'RETURN_CUSTOMER', // Returned from customer
      'CYCLE_COUNT',   // Cycle count adjustment
      'OPENING_STOCK', // Initial stock
      'DAMAGE',        // Damaged goods
      'THEFT',         // Theft/loss
      'EXPIRED',       // Expired items
      'SAMPLE',        // Given as sample
      'DONATION'       // Donated
    ],
    required: true,
    index: true
  },
  
  // Item Information
  inventoryItem: {
    type: Schema.Types.ObjectId,
    ref: 'InventoryItem',
    required: true,
    index: true
  },
  itemName: String, // Denormalized for performance
  sku: String,       // Denormalized for performance
  
  // Quantity
  quantity: {
    type: Number,
    required: true
  },
  unit: String,
  
  // Location
  fromLocation: {
    location: String,
    zone: String,
    bin: String
  },
  toLocation: {
    location: String,
    zone: String,
    bin: String
  },
  
  // Batch Information
  batchNumber: String,
  expiryDate: Date,
  
  // Cost Information
  unitCost: Number,
  totalCost: Number,
  costingMethod: {
    type: String,
    enum: ['FIFO', 'LIFO', 'WEIGHTED_AVG', 'SPECIFIC']
  },
  
  // Stock Levels (snapshot after movement)
  stockBefore: Number,
  stockAfter: Number,
  
  // Reference Information
  reference: {
    type: {
      type: String,
      enum: ['PURCHASE_ORDER', 'SALES_ORDER', 'TRANSFER_ORDER', 'PRODUCTION_ORDER', 'ADJUSTMENT', 'COUNT']
    },
    id: String,
    number: String
  },
  
  // Related Documents
  purchaseOrder: { type: Schema.Types.ObjectId, ref: 'PurchaseOrder' },
  salesOrder: { type: Schema.Types.ObjectId, ref: 'Order' },
  transferOrder: String,
  productionOrder: String,
  
  // Reason & Notes
  reason: {
    type: String,
    enum: [
      'REGULAR_OPERATION',
      'EXPIRED',
      'DAMAGED',
      'QUALITY_ISSUE',
      'WRONG_DELIVERY',
      'OVERSTOCK',
      'UNDERSTOCK',
      'THEFT',
      'COUNTING_ERROR',
      'SYSTEM_ERROR',
      'CUSTOMER_COMPLAINT',
      'PREP_WASTE',
      'COOKING_WASTE',
      'SPOILAGE',
      'OTHER'
    ]
  },
  notes: String,
  
  // Waste Specific
  wasteCategory: {
    type: String,
    enum: ['PREP', 'COOKING', 'SPOILAGE', 'PLATE_WASTE', 'EXPIRED', 'OTHER']
  },
  preventionMeasures: String,
  
  // Approval (for adjustments)
  requiresApproval: { type: Boolean, default: false },
  approvalStatus: {
    type: String,
    enum: ['PENDING', 'APPROVED', 'REJECTED'],
    default: 'APPROVED'
  },
  approvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  approvedDate: Date,
  
  // Audit Trail
  performedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  performedDate: {
    type: Date,
    default: Date.now,
    index: true
  },
  
  // Verification
  verified: { type: Boolean, default: false },
  verifiedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  verifiedDate: Date,
  
  // System Fields
  isReversed: { type: Boolean, default: false },
  reversedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  reversedDate: Date,
  reversalReference: { type: Schema.Types.ObjectId, ref: 'StockMovement' },
  
  // Integration
  externalId: String,
  syncedAt: Date
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
StockMovementSchema.index({ tenantId: 1, inventoryItem: 1, performedDate: -1 });
StockMovementSchema.index({ tenantId: 1, type: 1, performedDate: -1 });
StockMovementSchema.index({ tenantId: 1, 'reference.type': 1, 'reference.id': 1 });
StockMovementSchema.index({ tenantId: 1, batchNumber: 1 });
StockMovementSchema.index({ tenantId: 1, performedBy: 1, performedDate: -1 });

// Methods
StockMovementSchema.methods.calculateCost = async function() {
  if (!this.unitCost && this.inventoryItem) {
    const InventoryItem = mongoose.model('InventoryItem');
    const item = await InventoryItem.findById(this.inventoryItem);
    
    if (item) {
      switch (item.costingMethod) {
        case 'FIFO':
          // Get oldest batch cost
          const oldestBatch = item.batches
            .filter(b => !b.quarantined && b.quantity > 0)
            .sort((a, b) => a.receivedDate - b.receivedDate)[0];
          this.unitCost = oldestBatch ? oldestBatch.cost : item.currentCost;
          break;
          
        case 'LIFO':
          // Get newest batch cost
          const newestBatch = item.batches
            .filter(b => !b.quarantined && b.quantity > 0)
            .sort((a, b) => b.receivedDate - a.receivedDate)[0];
          this.unitCost = newestBatch ? newestBatch.cost : item.currentCost;
          break;
          
        case 'WEIGHTED_AVG':
          this.unitCost = item.averageCost || item.currentCost;
          break;
          
        default:
          this.unitCost = item.currentCost;
      }
    }
  }
  
  this.totalCost = Math.abs(this.quantity) * (this.unitCost || 0);
};

StockMovementSchema.methods.reverse = async function(userId) {
  if (this.isReversed) {
    throw new Error('Movement already reversed');
  }
  
  const StockMovement = mongoose.model('StockMovement');
  
  // Create reversal movement
  const reversal = new StockMovement({
    tenantId: this.tenantId,
    type: 'ADJUSTMENT',
    inventoryItem: this.inventoryItem,
    itemName: this.itemName,
    sku: this.sku,
    quantity: -this.quantity, // Reverse the quantity
    unit: this.unit,
    fromLocation: this.toLocation,
    toLocation: this.fromLocation,
    unitCost: this.unitCost,
    totalCost: this.totalCost,
    reason: 'SYSTEM_ERROR',
    notes: `Reversal of movement ${this._id}`,
    performedBy: userId,
    reversalReference: this._id
  });
  
  await reversal.save();
  
  // Mark original as reversed
  this.isReversed = true;
  this.reversedBy = userId;
  this.reversedDate = new Date();
  await this.save();
  
  return reversal;
};

// Statics
StockMovementSchema.statics.getMovementSummary = async function(tenantId, inventoryItemId, startDate, endDate) {
  const match = {
    tenantId,
    inventoryItem: inventoryItemId,
    performedDate: {
      $gte: startDate,
      $lte: endDate
    }
  };
  
  const summary = await this.aggregate([
    { $match: match },
    {
      $group: {
        _id: '$type',
        count: { $sum: 1 },
        totalQuantity: { $sum: '$quantity' },
        totalCost: { $sum: '$totalCost' }
      }
    },
    {
      $project: {
        type: '$_id',
        count: 1,
        totalQuantity: 1,
        totalCost: 1,
        _id: 0
      }
    }
  ]);
  
  return summary;
};

StockMovementSchema.statics.getWasteSummary = async function(tenantId, startDate, endDate) {
  const wasteTypes = ['WASTE', 'DAMAGE', 'EXPIRED', 'THEFT'];
  
  const summary = await this.aggregate([
    {
      $match: {
        tenantId,
        type: { $in: wasteTypes },
        performedDate: {
          $gte: startDate,
          $lte: endDate
        }
      }
    },
    {
      $group: {
        _id: {
          type: '$type',
          reason: '$reason',
          category: '$wasteCategory'
        },
        count: { $sum: 1 },
        totalQuantity: { $sum: { $abs: '$quantity' } },
        totalCost: { $sum: '$totalCost' }
      }
    },
    {
      $group: {
        _id: '$_id.type',
        reasons: {
          $push: {
            reason: '$_id.reason',
            category: '$_id.category',
            count: '$count',
            quantity: '$totalQuantity',
            cost: '$totalCost'
          }
        },
        totalCount: { $sum: '$count' },
        totalQuantity: { $sum: '$totalQuantity' },
        totalCost: { $sum: '$totalCost' }
      }
    }
  ]);
  
  return summary;
};

// Middleware
StockMovementSchema.pre('save', async function(next) {
  // Calculate cost if not provided
  if (!this.totalCost) {
    await this.calculateCost();
  }
  
  // Update inventory item stock levels
  if (this.isNew && !this.isReversed) {
    const InventoryItem = mongoose.model('InventoryItem');
    const item = await InventoryItem.findById(this.inventoryItem);
    
    if (item) {
      // Record stock levels
      this.stockBefore = item.totalQuantity;
      
      // Update based on movement type
      const isIncoming = ['PURCHASE', 'RETURN_CUSTOMER', 'OPENING_STOCK', 'ADJUSTMENT'].includes(this.type);
      const isOutgoing = ['SALE', 'TRANSFER', 'PRODUCTION', 'WASTE', 'RETURN_SUPPLIER', 'DAMAGE', 'THEFT', 'EXPIRED', 'SAMPLE', 'DONATION'].includes(this.type);
      
      if (isIncoming && this.quantity > 0) {
        item.totalQuantity += this.quantity;
      } else if (isOutgoing && this.quantity > 0) {
        item.totalQuantity -= this.quantity;
      } else if (this.type === 'ADJUSTMENT') {
        item.totalQuantity += this.quantity; // Can be positive or negative
      } else if (this.type === 'CYCLE_COUNT') {
        item.totalQuantity = this.stockAfter; // Set to counted quantity
      }
      
      this.stockAfter = item.totalQuantity;
      
      // Update location-specific stock if provided
      if (this.toLocation && this.toLocation.location) {
        const stockLevel = item.stockLevels.find(sl => 
          sl.location === this.toLocation.location
        );
        if (stockLevel) {
          stockLevel.quantity += this.quantity;
        }
      }
      
      if (this.fromLocation && this.fromLocation.location) {
        const stockLevel = item.stockLevels.find(sl => 
          sl.location === this.fromLocation.location
        );
        if (stockLevel) {
          stockLevel.quantity -= this.quantity;
        }
      }
      
      await item.save();
    }
  }
  
  next();
});

// Ensure tenant isolation
StockMovementSchema.pre(/^find/, function() {
  if (!this.getOptions().skipTenantFilter && this.getQuery().tenantId === undefined) {
    throw new Error('tenantId is required for stock movement queries');
  }
});

const StockMovement = mongoose.model('StockMovement', StockMovementSchema);

module.exports = StockMovement;