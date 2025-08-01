// src/models/Table.js
const mongoose = require('mongoose');
const crypto = require('crypto');

const tableSchema = new mongoose.Schema({
  tenantId: { type: String, required: true, index: true },
  number: { type: String, required: true },
  displayName: { type: String },
  capacity: { type: Number, required: true, min: 1 },
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
    
    this.qrCode = {
      code: qrData.code,
      url: qrData.url,
      customization: {
        encrypted: true
      }
    };
  }
  
  // Set display name if not provided
  if (!this.displayName) {
    this.displayName = `Table ${this.number}`;
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
  return this.isCombinable && this.combinesWith.includes(tableNumber);
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