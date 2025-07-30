// src/models/TableState.js
const mongoose = require('mongoose');

const tableStateSchema = new mongoose.Schema({
  tableNumber: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  status: {
    type: String,
    enum: ['available', 'occupied', 'reserved', 'cleaning', 'maintenance'],
    default: 'available'
  },
  currentWaiter: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  assistingWaiters: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  activeCustomerSession: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CustomerSession'
  },
  capacity: {
    type: Number,
    default: 4
  },
  section: {
    type: String,
    default: 'main'
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  },
  notes: {
    type: String
  },
  assignmentHistory: [{
    waiter: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    assignedAt: {
      type: Date,
      default: Date.now
    },
    assignedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    action: {
      type: String,
      enum: ['assigned', 'removed', 'handover']
    }
  }]
}, {
  timestamps: true
});

// Indexes - removed tableNumber index (already unique in schema)
tableStateSchema.index({ status: 1 });
tableStateSchema.index({ currentWaiter: 1 });

// Methods
tableStateSchema.methods.assignWaiter = function(waiterId, assignedBy = null) {
  this.currentWaiter = waiterId;
  this.lastUpdated = new Date();
  
  // Add to history
  this.assignmentHistory.push({
    waiter: waiterId,
    assignedBy: assignedBy || waiterId,
    action: 'assigned'
  });
  
  return this.save();
};

tableStateSchema.methods.addAssistingWaiter = function(waiterId) {
  if (!this.assistingWaiters.includes(waiterId)) {
    this.assistingWaiters.push(waiterId);
    this.lastUpdated = new Date();
    return this.save();
  }
  return Promise.resolve(this);
};

tableStateSchema.methods.removeAssistingWaiter = function(waiterId) {
  this.assistingWaiters = this.assistingWaiters.filter(
    id => id.toString() !== waiterId.toString()
  );
  this.lastUpdated = new Date();
  return this.save();
};

tableStateSchema.methods.handoverTable = function(fromWaiterId, toWaiterId, handedOverBy = null) {
  // Remove from waiter if they were assisting
  this.assistingWaiters = this.assistingWaiters.filter(
    id => id.toString() !== toWaiterId.toString()
  );
  
  // Set new current waiter
  this.currentWaiter = toWaiterId;
  this.lastUpdated = new Date();
  
  // Add to history
  this.assignmentHistory.push({
    waiter: toWaiterId,
    assignedBy: handedOverBy || fromWaiterId,
    action: 'handover'
  });
  
  return this.save();
};

tableStateSchema.methods.updateStatus = function(newStatus) {
  this.status = newStatus;
  this.lastUpdated = new Date();
  
  // Clear assignments when table becomes available
  if (newStatus === 'available') {
    this.currentWaiter = null;
    this.assistingWaiters = [];
    this.activeCustomerSession = null;
  }
  
  return this.save();
};

tableStateSchema.methods.setCustomerSession = function(sessionId) {
  this.activeCustomerSession = sessionId;
  this.status = 'occupied';
  this.lastUpdated = new Date();
  return this.save();
};

tableStateSchema.methods.clearCustomerSession = function() {
  this.activeCustomerSession = null;
  this.status = 'available';
  this.lastUpdated = new Date();
  return this.save();
};

// Statics
tableStateSchema.statics.getTablesByWaiter = async function(waiterId) {
  return this.find({
    $or: [
      { currentWaiter: waiterId },
      { assistingWaiters: waiterId }
    ]
  })
  .populate('currentWaiter', 'name email')
  .populate('assistingWaiters', 'name email')
  .populate('activeCustomerSession');
};

tableStateSchema.statics.getAvailableTables = async function() {
  return this.find({ status: 'available' })
    .sort('tableNumber');
};

tableStateSchema.statics.getAllTableStates = async function() {
  return this.find({})
    .populate('currentWaiter', 'name email')
    .populate('assistingWaiters', 'name email')
    .populate('activeCustomerSession')
    .sort('tableNumber');
};

module.exports = mongoose.model('TableState', tableStateSchema);