const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const UnitConversionSchema = new Schema({
  fromUnit: { type: String, required: true },
  toUnit: { type: String, required: true },
  factor: { type: Number, required: true }
});

const StockLevelSchema = new Schema({
  location: { type: String, required: true }, // freezer, chiller, dry-storage, bar
  zone: String, // A, B, C zones
  bin: String, // Specific bin number
  quantity: { type: Number, default: 0 },
  reservedQuantity: { type: Number, default: 0 },
  availableQuantity: { type: Number, default: 0 }
});

const BatchSchema = new Schema({
  batchNumber: { type: String, required: true },
  expiryDate: Date,
  manufacturingDate: Date,
  quantity: { type: Number, required: true },
  location: String,
  cost: Number,
  supplier: { type: Schema.Types.ObjectId, ref: 'Supplier' },
  receivedDate: { type: Date, default: Date.now },
  qualityCheckPassed: { type: Boolean, default: true },
  quarantined: { type: Boolean, default: false }
});

const SupplierInfoSchema = new Schema({
  supplier: { type: Schema.Types.ObjectId, ref: 'Supplier', required: true },
  supplierSKU: String,
  cost: { type: Number, required: true },
  leadTimeDays: { type: Number, default: 1 },
  moq: { type: Number, default: 1 }, // Minimum Order Quantity
  preferredSupplier: { type: Boolean, default: false },
  lastPurchaseDate: Date,
  averagePrice: Number
});

const SeasonalVariationSchema = new Schema({
  month: { type: Number, min: 1, max: 12 },
  demandMultiplier: { type: Number, default: 1 },
  notes: String
});

const InventoryItemSchema = new Schema({
  tenantId: { 
    type: String, 
    required: true, 
    index: true 
  },
  
  // Basic Information
  name: { 
    type: String, 
    required: true,
    index: true 
  },
  description: String,
  sku: { 
    type: String, 
    required: true,
    unique: true,
    index: true 
  },
  barcode: { 
    type: String,
    sparse: true,
    index: true 
  },
  qrCode: String,
  
  // Categorization
  category: { 
    type: String, 
    required: true,
    enum: ['produce', 'meat', 'seafood', 'dairy', 'dry-goods', 'beverages', 'supplies', 'packaging'],
    index: true
  },
  subCategory: String,
  
  // Units and Conversions
  baseUnit: { 
    type: String, 
    required: true,
    enum: ['kg', 'g', 'l', 'ml', 'piece', 'dozen', 'case', 'pack', 'box', 'bag', 'bottle', 'can']
  },
  unitConversions: [UnitConversionSchema],
  
  // Stock Levels
  stockLevels: [StockLevelSchema],
  totalQuantity: { type: Number, default: 0, index: true },
  totalReserved: { type: Number, default: 0 },
  totalAvailable: { type: Number, default: 0 },
  
  // Reorder Management
  reorderPoint: { type: Number, required: true },
  reorderQuantity: Number,
  safetyStock: { type: Number, default: 0 },
  maxStock: Number,
  minStock: Number,
  economicOrderQuantity: Number, // EOQ
  
  // Costing Methods
  costingMethod: {
    type: String,
    enum: ['FIFO', 'LIFO', 'WEIGHTED_AVG', 'SPECIFIC'],
    default: 'FIFO'
  },
  currentCost: { type: Number, required: true },
  averageCost: Number,
  lastPurchaseCost: Number,
  
  // Batch Tracking
  batchTracking: { type: Boolean, default: false },
  batches: [BatchSchema],
  
  // Supplier Information
  suppliers: [SupplierInfoSchema],
  preferredSupplierId: { type: Schema.Types.ObjectId, ref: 'Supplier' },
  
  // Storage Requirements
  storageTemp: {
    min: Number,
    max: Number,
    unit: { type: String, enum: ['C', 'F'], default: 'C' }
  },
  humidity: {
    min: Number,
    max: Number
  },
  storageInstructions: String,
  shelfLife: {
    value: Number,
    unit: { type: String, enum: ['days', 'weeks', 'months', 'years'] }
  },
  
  // Allergen & Dietary Info
  allergens: [{
    type: String,
    enum: ['gluten', 'dairy', 'eggs', 'soy', 'nuts', 'peanuts', 'fish', 'shellfish', 'sesame', 'celery', 'mustard', 'sulphites', 'lupin', 'molluscs']
  }],
  dietaryInfo: {
    vegetarian: { type: Boolean, default: false },
    vegan: { type: Boolean, default: false },
    glutenFree: { type: Boolean, default: false },
    halal: { type: Boolean, default: false },
    kosher: { type: Boolean, default: false },
    organic: { type: Boolean, default: false }
  },
  
  // Nutritional Information (per 100g/100ml)
  nutritionalInfo: {
    calories: Number,
    protein: Number,
    carbohydrates: Number,
    fat: Number,
    saturatedFat: Number,
    fiber: Number,
    sugar: Number,
    sodium: Number
  },
  
  // Compliance & Certifications
  certifications: [{
    name: String,
    number: String,
    expiryDate: Date,
    issuingBody: String,
    document: String // URL to document
  }],
  countryOfOrigin: String,
  customsCode: String,
  
  // Waste Tracking
  wastePercentage: { type: Number, default: 0 },
  prepWastePercentage: { type: Number, default: 0 },
  
  // Seasonal Variations
  isSeasonalItem: { type: Boolean, default: false },
  seasonalVariations: [SeasonalVariationSchema],
  
  // Performance Metrics
  turnoverRate: Number,
  stockoutDays: { type: Number, default: 0 },
  overstockDays: { type: Number, default: 0 },
  lastStockoutDate: Date,
  lastCountDate: Date,
  lastCountVariance: Number,
  
  // Status
  isActive: { type: Boolean, default: true },
  isDiscontinued: { type: Boolean, default: false },
  discontinuedDate: Date,
  replacementItemId: { type: Schema.Types.ObjectId, ref: 'InventoryItem' },
  
  // Images
  images: [String],
  thumbnail: String,
  
  // Notes
  internalNotes: String,
  supplierNotes: String,
  
  // Audit
  createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  
  // Integration
  externalId: String, // For third-party integrations
  syncedAt: Date
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for performance
InventoryItemSchema.index({ tenantId: 1, sku: 1 }, { unique: true });
InventoryItemSchema.index({ tenantId: 1, category: 1 });
InventoryItemSchema.index({ tenantId: 1, 'suppliers.supplier': 1 });
InventoryItemSchema.index({ tenantId: 1, totalQuantity: 1 });
InventoryItemSchema.index({ tenantId: 1, reorderPoint: 1 });
InventoryItemSchema.index({ tenantId: 1, 'batches.expiryDate': 1 });

// Virtual for value
InventoryItemSchema.virtual('totalValue').get(function() {
  return this.totalQuantity * this.currentCost;
});

// Methods
InventoryItemSchema.methods.updateStockLevels = function() {
  let total = 0;
  let reserved = 0;
  let available = 0;
  
  this.stockLevels.forEach(level => {
    total += level.quantity;
    reserved += level.reservedQuantity;
    available += level.availableQuantity;
  });
  
  this.totalQuantity = total;
  this.totalReserved = reserved;
  this.totalAvailable = available;
};

InventoryItemSchema.methods.checkReorderNeeded = function() {
  return this.totalAvailable <= this.reorderPoint;
};

InventoryItemSchema.methods.calculateEOQ = function(annualDemand, orderingCost) {
  // Economic Order Quantity = sqrt((2 * Annual Demand * Ordering Cost) / Holding Cost per unit)
  const holdingCost = this.currentCost * 0.25; // Assuming 25% holding cost
  return Math.sqrt((2 * annualDemand * orderingCost) / holdingCost);
};

InventoryItemSchema.methods.getExpiringBatches = function(daysAhead = 7) {
  const expiryThreshold = new Date();
  expiryThreshold.setDate(expiryThreshold.getDate() + daysAhead);
  
  return this.batches.filter(batch => 
    batch.expiryDate && batch.expiryDate <= expiryThreshold && batch.quantity > 0
  );
};

// Middleware
InventoryItemSchema.pre('save', function(next) {
  // Update stock levels
  this.updateStockLevels();
  
  // Calculate average cost if using weighted average
  if (this.costingMethod === 'WEIGHTED_AVG' && this.batches.length > 0) {
    let totalValue = 0;
    let totalQty = 0;
    
    this.batches.forEach(batch => {
      if (!batch.quarantined) {
        totalValue += batch.quantity * batch.cost;
        totalQty += batch.quantity;
      }
    });
    
    if (totalQty > 0) {
      this.averageCost = totalValue / totalQty;
    }
  }
  
  next();
});

// Ensure tenant isolation
InventoryItemSchema.pre(/^find/, function() {
  if (!this.getOptions().skipTenantFilter && this.getQuery().tenantId === undefined) {
    throw new Error('tenantId is required for inventory queries');
  }
});

const InventoryItem = mongoose.model('InventoryItem', InventoryItemSchema);

module.exports = InventoryItem;