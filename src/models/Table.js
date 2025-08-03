// src/models/Table.js
const mongoose = require('mongoose');
const crypto = require('crypto');

const tableSchema = new mongoose.Schema({
  tenantId: { type: String, required: true, index: true },
  number: { type: String, required: true },
  displayName: { type: String },
  capacity: { type: Number, required: true, min: 1 },
  originalCapacity: { type: Number }, // Store original capacity for split operations
  minCapacity: { type: Number },
  maxCapacity: { type: Number },
  type: {
    type: String,
    enum: ['regular', 'vip', 'outdoor', 'private', 'bar'],
    default: 'regular'
  },
  shape: {
    type: String,
    enum: ['square', 'rectangle', 'round', 'oval', 'custom'],
    default: 'square'
  },
  status: {
    type: String,
    enum: ['available', 'occupied', 'reserved', 'cleaning', 'maintenance'],
    default: 'available'
  },
  location: {
    floor: { type: String, default: 'main' },
    section: { type: String, default: 'dining' },
    zone: String,
    x: { type: Number, default: 0 },
    y: { type: Number, default: 0 },
    rotation: { type: Number, default: 0 },
    width: { type: Number },
    height: { type: Number }
  },
  qrCode: {
    code: { type: String, unique: true, sparse: true },
    url: String,
    customization: {
      logo: String,
      color: String,
      style: String
    }
  },
  features: [{
    type: String,
    enum: ['window_view', 'wheelchair_accessible', 'power_outlet', 'privacy_screen', 'outdoor_heater', 'shade_umbrella']
  }],
  isCombinable: { type: Boolean, default: false },
  combinesWith: [{ type: String }], // Table numbers that can be combined
  
  // Combination tracking
  combination: {
    isCombined: { type: Boolean, default: false },
    isMainTable: { type: Boolean, default: false }, // True for the main table in a combination
    mainTableId: { type: mongoose.Schema.Types.ObjectId, ref: 'Table' }, // Reference to main table if this is a sub-table
    combinedTables: [{ 
      tableId: { type: mongoose.Schema.Types.ObjectId, ref: 'Table' },
      tableNumber: String
    }], // List of tables combined (only populated on main table)
    combinedAt: Date,
    combinedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    totalCapacity: Number, // Total capacity when combined
    arrangement: {
      type: String,
      enum: ['linear', 'square', 'L-shape', 'U-shape', 'custom'],
      default: 'linear'
    }
  },
  metadata: {
    lastCleaned: Date,
    maintenanceNotes: String,
    preferredWaiters: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
  },
  // Relations
  currentWaiter: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  assistingWaiters: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  activeCustomerSession: { type: mongoose.Schema.Types.ObjectId, ref: 'CustomerSession' },
  currentOrder: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
  // Stats
  stats: {
    totalSessions: { type: Number, default: 0 },
    totalRevenue: { type: Number, default: 0 },
    averageOccupancyTime: { type: Number, default: 0 },
    lastOccupied: Date
  },
  
  // Status tracking fields for rule engine
  sessionStartTime: Date,
  statusChangedAt: { type: Date, default: Date.now },
  statusChangeReason: String,
  
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

// Compound index for tenant-specific table numbers
tableSchema.index({ tenantId: 1, number: 1 }, { unique: true });
tableSchema.index({ tenantId: 1, status: 1 });
// qrCode.code already has unique: true in schema, which creates an index automatically
tableSchema.index({ tenantId: 1, 'location.floor': 1, 'location.section': 1 });

// Validate and generate defaults before saving
tableSchema.pre('save', async function(next) {
  // ENTERPRISE TENANT VALIDATION
  if (!this.tenantId) {
    return next(new Error('Tenant ID is required for table creation'));
  }
  
  // Verify tenant exists and is active
  const Tenant = require('./Tenant');
  const tenant = await Tenant.findOne({ 
    tenantId: this.tenantId, 
    status: 'active' 
  });
  
  if (!tenant) {
    return next(new Error('Invalid or inactive tenant'));
  }
  
  if (!this.qrCode || !this.qrCode.code) {
    // Generate encrypted QR code
    const { generateEncryptedQRCode } = require('../utils/tableEncryption');
    const qrData = generateEncryptedQRCode(
      this.tenantId, 
      this._id.toString(), 
      this.number,
      0 // No expiry for permanent QR codes
    );
    
    // Get tenant subdomain for direct URL
    const subdomain = tenant.subdomain || this.tenantId;
    const directUrl = `https://${subdomain}.gritservices.ae?table=${this.number}`;
    
    this.qrCode = {
      code: qrData.code,
      url: directUrl, // Direct URL for QR code
      validationUrl: qrData.url, // URL for encrypted validation if needed
      customization: {
        encrypted: true
      }
    };
  }
  
  // Set display name if not provided
  if (!this.displayName) {
    this.displayName = `Table ${this.number}`;
  }
  
  // Store original capacity if not set
  if (!this.originalCapacity && !this.combination.isCombined) {
    this.originalCapacity = this.capacity;
  }
  
  // Set min/max capacity defaults
  if (!this.minCapacity) {
    this.minCapacity = Math.max(1, Math.floor(this.capacity * 0.5));
  }
  if (!this.maxCapacity) {
    this.maxCapacity = Math.ceil(this.capacity * 1.5);
  }
  
  next();
});

// Methods
tableSchema.methods.updateStatus = function(newStatus, reason) {
  const previousStatus = this.status;
  this.status = newStatus;
  
  // Update stats based on status change
  if (previousStatus === 'occupied' && newStatus !== 'occupied') {
    this.stats.lastOccupied = new Date();
  }
  
  // Clear assignments when table becomes available
  if (newStatus === 'available') {
    this.currentWaiter = null;
    this.assistingWaiters = [];
    this.activeCustomerSession = null;
    this.currentOrder = null;
  }
  
  return this.save();
};

tableSchema.methods.assignWaiter = function(waiterId, role = 'primary') {
  if (role === 'primary') {
    this.currentWaiter = waiterId;
  } else if (role === 'assistant' && !this.assistingWaiters.includes(waiterId)) {
    this.assistingWaiters.push(waiterId);
  }
  return this.save();
};

tableSchema.methods.removeWaiter = function(waiterId) {
  if (this.currentWaiter?.toString() === waiterId.toString()) {
    this.currentWaiter = null;
  }
  this.assistingWaiters = this.assistingWaiters.filter(
    id => id.toString() !== waiterId.toString()
  );
  return this.save();
};

tableSchema.methods.canCombineWith = function(tableNumber) {
  console.log(`[canCombineWith] Checking if table ${this.number} can combine with ${tableNumber}`);
  console.log(`  this.isCombinable:`, this.isCombinable);
  console.log(`  this.combinesWith:`, this.combinesWith);
  console.log(`  tableNumber type:`, typeof tableNumber);
  console.log(`  combinesWith types:`, this.combinesWith.map(n => typeof n));
  
  // Ensure string comparison
  const tableNumberStr = String(tableNumber);
  const combinesWithStrings = this.combinesWith.map(n => String(n));
  const canCombine = this.isCombinable && combinesWithStrings.includes(tableNumberStr);
  
  console.log(`  String comparison result:`, canCombine);
  return canCombine;
};

// Combination methods
tableSchema.methods.combineWith = async function(tablesToCombine, userId, arrangement = 'linear') {
  console.log(`[combineWith] Starting combination process for table ${this.number}`);
  console.log(`  Tables to combine:`, tablesToCombine);
  console.log(`  Main table combinesWith:`, this.combinesWith);
  
  if (!this.isCombinable) {
    throw new Error('This table is not combinable');
  }
  
  if (this.combination.isCombined) {
    throw new Error('This table is already part of a combination');
  }
  
  if (this.status !== 'available') {
    throw new Error('Table must be available to combine');
  }
  
  const Table = this.constructor;
  
  // Validate all tables can be combined
  const tableObjects = [];
  let totalCapacity = this.capacity;
  
  for (const tableInfo of tablesToCombine) {
    const table = await Table.findOne({ 
      tenantId: this.tenantId, 
      number: tableInfo.tableNumber,
      isActive: true
    });
    
    if (!table) {
      throw new Error(`Table ${tableInfo.tableNumber} not found`);
    }
    
    if (!this.canCombineWith(table.number)) {
      console.log(`[Table.combineWith] Table ${this.number} cannot combine with ${table.number}`);
      console.log(`  Main table's combinesWith list:`, this.combinesWith);
      console.log(`  Attempting to combine with:`, table.number);
      throw new Error(`Table ${this.number} is not configured to combine with table ${table.number}. Please update the table settings.`);
    }
    
    if (table.combination.isCombined) {
      throw new Error(`Table ${table.number} is already part of a combination`);
    }
    
    if (table.status !== 'available') {
      throw new Error(`Table ${table.number} must be available to combine`);
    }
    
    tableObjects.push(table);
    totalCapacity += table.capacity;
  }
  
  // Set this table as the main table
  this.combination.isCombined = true;
  this.combination.isMainTable = true;
  this.combination.combinedTables = tableObjects.map(t => ({
    tableId: t._id,
    tableNumber: t.number
  }));
  this.combination.combinedAt = new Date();
  this.combination.combinedBy = userId;
  this.combination.totalCapacity = totalCapacity;
  this.combination.arrangement = arrangement;
  this.capacity = totalCapacity; // Update main table capacity
  
  await this.save();
  
  // Update all combined tables
  for (const table of tableObjects) {
    table.combination.isCombined = true;
    table.combination.isMainTable = false;
    table.combination.mainTableId = this._id;
    table.combination.combinedAt = new Date();
    table.combination.combinedBy = userId;
    table.status = 'occupied'; // Mark sub-tables as occupied
    await table.save();
  }
  
  return this;
};

tableSchema.methods.split = async function(userId) {
  if (!this.combination.isCombined) {
    throw new Error('This table is not part of a combination');
  }
  
  const Table = this.constructor;
  
  if (this.combination.isMainTable) {
    // This is the main table, split all tables
    const combinedTableIds = this.combination.combinedTables.map(t => t.tableId);
    
    // Reset all combined tables
    await Table.updateMany(
      { _id: { $in: combinedTableIds } },
      {
        $set: {
          'combination.isCombined': false,
          'combination.isMainTable': false,
          'combination.mainTableId': null,
          'combination.combinedAt': null,
          'combination.combinedBy': null,
          status: 'available'
        }
      }
    );
    
    // Reset main table
    this.combination.isCombined = false;
    this.combination.isMainTable = false;
    this.combination.combinedTables = [];
    this.combination.combinedAt = null;
    this.combination.combinedBy = null;
    this.combination.totalCapacity = null;
    this.combination.arrangement = 'linear';
    
    // Restore original capacity
    this.capacity = this.originalCapacity || this.capacity;
    
    await this.save();
  } else {
    // This is a sub-table, need to split from main table
    const mainTable = await Table.findById(this.combination.mainTableId);
    if (mainTable) {
      await mainTable.split(userId);
    }
  }
  
  return this;
};

// Statics
tableSchema.statics.getTablesByFloor = async function(tenantId, floor) {
  return this.find({ 
    tenantId, 
    'location.floor': floor,
    isActive: true 
  })
  .populate('currentWaiter', 'name email')
  .populate('assistingWaiters', 'name email')
  .sort('number');
};

tableSchema.statics.getAvailableTables = async function(tenantId, capacity = null) {
  const query = { 
    tenantId, 
    status: 'available',
    isActive: true 
  };
  
  if (capacity) {
    query.minCapacity = { $lte: capacity };
    query.maxCapacity = { $gte: capacity };
  }
  
  return this.find(query).sort('number');
};

tableSchema.statics.getTableByQRCode = async function(qrCode) {
  return this.findOne({ 'qrCode.code': qrCode, isActive: true })
    .populate('currentWaiter', 'name email')
    .populate('activeCustomerSession');
};

tableSchema.statics.bulkUpdateStatus = async function(tenantId, tableIds, newStatus) {
  const updateData = { status: newStatus };
  
  // Clear assignments when tables become available
  if (newStatus === 'available') {
    updateData.currentWaiter = null;
    updateData.assistingWaiters = [];
    updateData.activeCustomerSession = null;
    updateData.currentOrder = null;
  }
  
  return this.updateMany(
    { tenantId, _id: { $in: tableIds } },
    { $set: updateData }
  );
};

module.exports = mongoose.model('Table', tableSchema);