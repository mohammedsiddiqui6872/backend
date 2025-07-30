// src/models/WaiterSession.js
const mongoose = require('mongoose');

const waiterSessionSchema = new mongoose.Schema({
  waiter: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  loginTime: {
    type: Date,
    default: Date.now,
    required: true
  },
  assignedTables: [{
    type: String,
    trim: true
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  lastActivity: {
    type: Date,
    default: Date.now
  },
  logoutTime: {
    type: Date
  },
  deviceInfo: {
    userAgent: String,
    ipAddress: String
  },
  sessionToken: {
    type: String,
    unique: true,
    sparse: true
  }
}, {
  timestamps: true
});

// Indexes
waiterSessionSchema.index({ waiter: 1, isActive: 1 });
waiterSessionSchema.index({ sessionToken: 1 });
waiterSessionSchema.index({ lastActivity: 1 });

// Methods
waiterSessionSchema.methods.updateActivity = function() {
  this.lastActivity = new Date();
  return this.save();
};

waiterSessionSchema.methods.addTable = function(tableNumber) {
  if (!this.assignedTables.includes(tableNumber)) {
    this.assignedTables.push(tableNumber);
    return this.save();
  }
  return Promise.resolve(this);
};

waiterSessionSchema.methods.removeTable = function(tableNumber) {
  this.assignedTables = this.assignedTables.filter(t => t !== tableNumber);
  return this.save();
};

waiterSessionSchema.methods.endSession = function() {
  this.isActive = false;
  this.logoutTime = new Date();
  this.assignedTables = [];
  return this.save();
};

// Statics
waiterSessionSchema.statics.getActiveSession = async function(waiterId) {
  return this.findOne({
    waiter: waiterId,
    isActive: true
  }).populate('waiter', 'name email role');
};

waiterSessionSchema.statics.getActiveSessions = async function() {
  return this.find({ isActive: true })
    .populate('waiter', 'name email role')
    .sort('-loginTime');
};

module.exports = mongoose.model('WaiterSession', waiterSessionSchema);