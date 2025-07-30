// src/models/CustomerSession.js
const mongoose = require('mongoose');
const encryptionService = require('../services/encryption.service');

const customerSessionSchema = new mongoose.Schema({
  sessionId: {
    type: String,
    unique: true,
    default: function() {
      return `CS-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }
  },
  tableNumber: { 
    type: String, 
    required: true,
    index: true 
  },
  primaryWaiter: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User',
    required: true 
  },
  // Keep waiter field for backward compatibility, will remove in phase 4
  waiter: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User',
    required: true 
  },
  customerName: { 
    type: String, 
    required: true 
  },
  customerPhone: { 
    type: String,
    default: null
  },
  customerEmail: { 
    type: String,
    default: null
  },
  
  // Encrypted PII fields
  customerPhoneEncrypted: {
    type: String,
    default: null
  },
  customerEmailEncrypted: {
    type: String,
    default: null
  },
  
  // Hashed fields for searching
  customerPhoneHash: {
    type: String,
    default: null
  },
  customerEmailHash: {
    type: String,
    default: null
  },
  occupancy: { 
    type: Number, 
    default: 1,
    min: 1,
    max: 20
  },
  status: {
    type: String,
    enum: ['active', 'payment_pending', 'closed'],
    default: 'active'
  },
  startTime: { 
    type: Date, 
    default: Date.now 
  },
  endTime: { 
    type: Date,
    default: null
  },
  // Keep old fields for compatibility
  loginTime: { 
    type: Date, 
    default: Date.now 
  },
  checkoutTime: { 
    type: Date,
    default: null
  },
  feedbackSubmitted: {
    type: Boolean,
    default: false
  },
  isActive: { 
    type: Boolean, 
    default: true,
    index: true
  },
  orders: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order'
  }],
  totalAmount: {
    type: Number,
    default: 0
  },
  duration: {
    type: Number, // in minutes
    default: null
  },
  // New fields
  sessionNotes: {
    type: String,
    default: ''
  },
  handoverHistory: [{
    fromWaiter: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    toWaiter: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
    reason: {
      type: String,
      default: ''
    }
  }]
}, { 
  timestamps: true 
});

// Index for active sessions
customerSessionSchema.index({ tableNumber: 1, isActive: 1 });
customerSessionSchema.index({ waiter: 1, isActive: 1 });

// Calculate duration when checking out
customerSessionSchema.methods.checkout = async function() {
  this.checkoutTime = new Date();
  this.endTime = this.checkoutTime;
  this.duration = Math.round((this.checkoutTime - this.loginTime) / (1000 * 60)); // Convert to minutes
  this.status = 'payment_pending';
  this.isActive = false;
  await this.save();
};

// New method for waiter handover
customerSessionSchema.methods.handoverToWaiter = async function(fromWaiterId, toWaiterId, reason = '') {
  this.primaryWaiter = toWaiterId;
  this.waiter = toWaiterId; // Keep backward compatibility
  
  this.handoverHistory.push({
    fromWaiter: fromWaiterId,
    toWaiter: toWaiterId,
    timestamp: new Date(),
    reason: reason
  });
  
  await this.save();
};

// Static method to get active session for a table
customerSessionSchema.statics.getActiveSession = async function(tableNumber) {
  return await this.findOne({ 
    tableNumber: String(tableNumber), 
    isActive: true 
  }).populate('waiter', 'name');
};

// Static method to get all active sessions
customerSessionSchema.statics.getActiveSessions = async function() {
  return await this.find({ isActive: true })
    .populate('waiter', 'name')
    .populate('orders')
    .sort('-loginTime');
};

// Static method to get table statistics
customerSessionSchema.statics.getTableStats = async function(tableNumber, date) {
  const query = { tableNumber: String(tableNumber) };
  
  if (date) {
    const startDate = new Date(date);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(date);
    endDate.setHours(23, 59, 59, 999);
    query.loginTime = { $gte: startDate, $lte: endDate };
  }
  
  const sessions = await this.find(query)
    .populate('orders')
    .populate('waiter', 'name');
    
  const stats = {
    totalSessions: sessions.length,
    totalCustomers: sessions.reduce((sum, s) => sum + (s.occupancy || 1), 0),
    totalRevenue: sessions.reduce((sum, s) => sum + s.totalAmount, 0),
    averageDuration: sessions.length > 0 
      ? Math.round(sessions.reduce((sum, s) => sum + (s.duration || 0), 0) / sessions.length)
      : 0,
    sessions: sessions
  };
  
  return stats;
};

// Encryption middleware - encrypt PII before saving
customerSessionSchema.pre('save', function(next) {
  // Encrypt phone number
  if (this.isModified('customerPhone') && this.customerPhone) {
    this.customerPhoneEncrypted = encryptionService.encrypt(this.customerPhone);
    this.customerPhoneHash = encryptionService.hash(this.customerPhone);
    this.customerPhone = encryptionService.mask(this.customerPhone, 4, 2); // Store masked version
  }
  
  // Encrypt email
  if (this.isModified('customerEmail') && this.customerEmail) {
    this.customerEmailEncrypted = encryptionService.encrypt(this.customerEmail);
    this.customerEmailHash = encryptionService.hash(this.customerEmail.toLowerCase());
    this.customerEmail = encryptionService.maskEmail(this.customerEmail); // Store masked version
  }
  
  next();
});

// Add methods to get decrypted data
customerSessionSchema.methods.getDecryptedPhone = function() {
  if (!this.customerPhoneEncrypted) return null;
  try {
    return encryptionService.decrypt(this.customerPhoneEncrypted);
  } catch (error) {
    console.error('Failed to decrypt phone:', error);
    return this.customerPhone; // Return masked version
  }
};

customerSessionSchema.methods.getDecryptedEmail = function() {
  if (!this.customerEmailEncrypted) return null;
  try {
    return encryptionService.decrypt(this.customerEmailEncrypted);
  } catch (error) {
    console.error('Failed to decrypt email:', error);
    return this.customerEmail; // Return masked version
  }
};

// Add method to get full customer data (for authorized users only)
customerSessionSchema.methods.getCustomerData = function(includeDecrypted = false) {
  const data = {
    name: this.customerName,
    phone: this.customerPhone,
    email: this.customerEmail,
    occupancy: this.occupancy
  };
  
  if (includeDecrypted) {
    data.phoneDecrypted = this.getDecryptedPhone();
    data.emailDecrypted = this.getDecryptedEmail();
  }
  
  return data;
};

// Static method to find by phone or email (using hash)
customerSessionSchema.statics.findByPhone = function(phone) {
  const phoneHash = encryptionService.hash(phone);
  return this.find({ customerPhoneHash: phoneHash });
};

customerSessionSchema.statics.findByEmail = function(email) {
  const emailHash = encryptionService.hash(email.toLowerCase());
  return this.find({ customerEmailHash: emailHash });
};

// Add indexes for hash fields
customerSessionSchema.index({ customerPhoneHash: 1 });
customerSessionSchema.index({ customerEmailHash: 1 });

module.exports = mongoose.model('CustomerSession', customerSessionSchema);