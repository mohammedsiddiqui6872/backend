// src/models/TableSession.js
const mongoose = require('mongoose');

const tableSessionSchema = new mongoose.Schema({
  waiter: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  tableNumber: { 
    type: String, 
    required: true 
  },
  loginTime: { 
    type: Date, 
    default: Date.now 
  },
  lastActivity: { 
    type: Date, 
    default: Date.now 
  },
  isActive: { 
    type: Boolean, 
    default: true 
  },
  deviceInfo: {
    type: { type: String }, // 'web', 'mobile', 'tablet'
    browser: String,
    ip: String
  }
}, { 
  timestamps: true 
});

// Compound index to ensure unique active sessions per waiter-table combination
tableSessionSchema.index({ waiter: 1, tableNumber: 1, isActive: 1 });

// Update lastActivity on any activity
tableSessionSchema.methods.updateActivity = async function() {
  this.lastActivity = new Date();
  await this.save();
};

// Static method to get all active tables for a waiter
tableSessionSchema.statics.getActiveTables = async function(waiterId) {
  return await this.find({ 
    waiter: waiterId, 
    isActive: true 
  }).sort('-loginTime');
};

// Static method to clean up old sessions (e.g., after 8 hours of inactivity)
tableSessionSchema.statics.cleanupInactiveSessions = async function() {
  const eightHoursAgo = new Date(Date.now() - 8 * 60 * 60 * 1000);
  await this.updateMany(
    { 
      lastActivity: { $lt: eightHoursAgo },
      isActive: true 
    },
    { isActive: false }
  );
};

module.exports = mongoose.model('TableSession', tableSessionSchema);