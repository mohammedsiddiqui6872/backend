// src/models/Inventory.js
const mongoose = require('mongoose');

const inventorySchema = new mongoose.Schema({
  // Changed from menuItem to ingredient for proper tracking
  ingredient: { type: mongoose.Schema.Types.ObjectId, ref: 'IngredientMaster', required: true },
  menuItem: { type: mongoose.Schema.Types.ObjectId, ref: 'MenuItem' }, // Optional, for backward compatibility
  currentStock: { type: Number, default: 0, min: 0 },
  minStock: { type: Number, default: 10 },
  maxStock: { type: Number, default: 100 },
  unit: { type: String, required: true },
  lastRestocked: Date,
  supplier: String,
  costPerUnit: Number,
  totalValue: { type: Number, default: 0 }, // currentStock * costPerUnit
  location: {
    warehouse: String,
    shelf: String,
    bin: String
  },
  batches: [{
    batchNumber: String,
    quantity: Number,
    costPerUnit: Number,
    expiryDate: Date,
    receivedDate: { type: Date, default: Date.now },
    supplier: String,
    isActive: { type: Boolean, default: true }
  }],
  movements: [{
    type: { type: String, enum: ['in', 'out', 'waste', 'return', 'adjustment', 'production'] },
    quantity: Number,
    reason: String,
    performedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    date: { type: Date, default: Date.now },
    batchNumber: String,
    relatedOrder: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
    cost: Number,
    notes: String
  }],
  
  // Alert settings
  lowStockAlert: { type: Boolean, default: true },
  expiryAlert: { type: Boolean, default: true },
  expiryAlertDays: { type: Number, default: 7 }
}, { timestamps: true });

// Methods for inventory management
inventorySchema.methods.addStock = async function(quantity, batchInfo, userId) {
  this.currentStock += quantity;
  this.lastRestocked = new Date();
  this.totalValue = this.currentStock * (this.costPerUnit || 0);
  
  // Add batch if info provided
  if (batchInfo) {
    this.batches.push({
      ...batchInfo,
      quantity,
      receivedDate: new Date()
    });
  }
  
  // Record movement
  this.movements.push({
    type: 'in',
    quantity,
    reason: 'Stock received',
    performedBy: userId,
    batchNumber: batchInfo?.batchNumber,
    cost: quantity * (batchInfo?.costPerUnit || this.costPerUnit || 0)
  });
  
  return this.save();
};

inventorySchema.methods.removeStock = async function(quantity, reason, userId, orderId) {
  if (this.currentStock < quantity) {
    throw new Error(`Insufficient stock. Available: ${this.currentStock}, Requested: ${quantity}`);
  }
  
  this.currentStock -= quantity;
  this.totalValue = this.currentStock * (this.costPerUnit || 0);
  
  // Use FIFO to remove from batches
  let remaining = quantity;
  for (const batch of this.batches.filter(b => b.isActive && b.quantity > 0)) {
    if (remaining <= 0) break;
    
    const taken = Math.min(batch.quantity, remaining);
    batch.quantity -= taken;
    remaining -= taken;
    
    if (batch.quantity === 0) {
      batch.isActive = false;
    }
  }
  
  // Record movement
  this.movements.push({
    type: 'out',
    quantity,
    reason: reason || 'Stock used',
    performedBy: userId,
    relatedOrder: orderId,
    cost: quantity * (this.costPerUnit || 0)
  });
  
  return this.save();
};

inventorySchema.methods.recordWaste = async function(quantity, reason, userId) {
  if (this.currentStock < quantity) {
    throw new Error(`Cannot record waste more than current stock: ${this.currentStock}`);
  }
  
  this.currentStock -= quantity;
  this.totalValue = this.currentStock * (this.costPerUnit || 0);
  
  this.movements.push({
    type: 'waste',
    quantity,
    reason: reason || 'Waste recorded',
    performedBy: userId,
    cost: quantity * (this.costPerUnit || 0)
  });
  
  return this.save();
};

inventorySchema.methods.adjustStock = async function(newQuantity, reason, userId) {
  const difference = newQuantity - this.currentStock;
  
  this.currentStock = newQuantity;
  this.totalValue = this.currentStock * (this.costPerUnit || 0);
  
  this.movements.push({
    type: 'adjustment',
    quantity: difference,
    reason: reason || 'Stock adjustment',
    performedBy: userId,
    cost: Math.abs(difference) * (this.costPerUnit || 0)
  });
  
  return this.save();
};

// Static methods
inventorySchema.statics.getLowStockItems = function() {
  return this.find({
    $expr: { $lte: ['$currentStock', '$minStock'] },
    lowStockAlert: true
  }).populate('ingredient');
};

inventorySchema.statics.getExpiringItems = function(days = 7) {
  const expiryDate = new Date();
  expiryDate.setDate(expiryDate.getDate() + days);
  
  return this.find({
    'batches.expiryDate': { $lte: expiryDate },
    'batches.isActive': true,
    expiryAlert: true
  }).populate('ingredient');
};

inventorySchema.statics.getStockValue = async function() {
  const result = await this.aggregate([
    {
      $group: {
        _id: null,
        totalValue: { $sum: '$totalValue' },
        totalItems: { $sum: 1 }
      }
    }
  ]);
  
  return result[0] || { totalValue: 0, totalItems: 0 };
};

// Indexes
inventorySchema.index({ ingredient: 1 }, { unique: true });
inventorySchema.index({ currentStock: 1 });
inventorySchema.index({ lastRestocked: -1 });
inventorySchema.index({ 'batches.expiryDate': 1 });
inventorySchema.index({ 'movements.date': -1 });
inventorySchema.index({ supplier: 1 });

module.exports = mongoose.model('Inventory', inventorySchema);