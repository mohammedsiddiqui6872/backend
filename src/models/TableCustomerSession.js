// src/models/TableCustomerSession.js
const mongoose = require('mongoose');

const tableCustomerSessionSchema = new mongoose.Schema({
  tenantId: { type: String, required: true, index: true },
  tableId: { type: mongoose.Schema.Types.ObjectId, ref: 'Table', required: true },
  tableNumber: { type: String, required: true },
  sessionCode: { type: String, unique: true, sparse: true },
  startTime: { type: Date, default: Date.now },
  endTime: Date,
  duration: Number, // in minutes
  status: {
    type: String,
    enum: ['active', 'completed', 'cancelled', 'no_show'],
    default: 'active'
  },
  // Customer info
  customerName: String,
  customerPhone: String,
  customerEmail: String,
  numberOfGuests: { type: Number, default: 1 },
  specialRequests: String,
  // Orders
  orders: [{
    orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
    orderNumber: String,
    amount: Number,
    items: Number,
    placedAt: { type: Date, default: Date.now }
  }],
  totalAmount: { type: Number, default: 0 },
  // Service info
  waiterId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  waiterName: String,
  serviceRating: {
    food: { type: Number, min: 1, max: 5 },
    service: { type: Number, min: 1, max: 5 },
    ambiance: { type: Number, min: 1, max: 5 },
    overall: { type: Number, min: 1, max: 5 }
  },
  feedback: {
    comment: String,
    wouldRecommend: Boolean,
    submittedAt: Date
  },
  // Timing metrics
  metrics: {
    seatedAt: Date,
    firstOrderAt: Date,
    lastOrderAt: Date,
    billRequestedAt: Date,
    paidAt: Date,
    waitTimeMinutes: Number,
    serviceTimeMinutes: Number
  },
  // Handover tracking
  handovers: [{
    fromWaiter: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    toWaiter: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    handoverTime: { type: Date, default: Date.now },
    reason: String,
    notes: String
  }],
  // Analytics
  source: {
    type: String,
    enum: ['walk_in', 'qr_code', 'reservation', 'online', 'phone'],
    default: 'walk_in'
  },
  qrScanCount: { type: Number, default: 0 },
  deviceInfo: {
    userAgent: String,
    ip: String,
    location: {
      lat: Number,
      lng: Number
    }
  }
}, { timestamps: true });

// Indexes
tableCustomerSessionSchema.index({ tenantId: 1, startTime: -1 });
tableCustomerSessionSchema.index({ tenantId: 1, tableId: 1, startTime: -1 });
tableCustomerSessionSchema.index({ tenantId: 1, waiterId: 1, startTime: -1 });
tableCustomerSessionSchema.index({ tenantId: 1, status: 1 });
tableCustomerSessionSchema.index({ sessionCode: 1 });

// Validate and generate session code before saving
tableCustomerSessionSchema.pre('save', async function(next) {
  // ENTERPRISE TENANT VALIDATION
  if (!this.tenantId) {
    return next(new Error('Tenant ID is required for customer session'));
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
  
  // Verify table belongs to same tenant
  if (this.tableId) {
    const Table = require('./Table');
    const table = await Table.findOne({ 
      _id: this.tableId, 
      tenantId: this.tenantId 
    });
    
    if (!table) {
      return next(new Error('Table does not belong to this tenant'));
    }
  }
  
  if (this.isNew && !this.sessionCode) {
    // Generate a readable session code with tenant prefix
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 5).toUpperCase();
    this.sessionCode = `${this.tenantId.substring(0, 4)}-${this.tableNumber}-${timestamp}-${random}`;
  }
  
  // Calculate duration if session is ending
  if (this.endTime && this.startTime) {
    this.duration = Math.round((this.endTime - this.startTime) / 60000); // Convert to minutes
  }
  
  // Calculate total amount from orders
  if (this.orders && this.orders.length > 0) {
    this.totalAmount = this.orders.reduce((sum, order) => sum + (order.amount || 0), 0);
  }
  
  next();
});

// Methods
tableCustomerSessionSchema.methods.endSession = function(endData = {}) {
  this.endTime = endData.endTime || new Date();
  this.status = endData.status || 'completed';
  
  // Calculate metrics
  if (this.metrics.seatedAt) {
    this.metrics.serviceTimeMinutes = Math.round((this.endTime - this.metrics.seatedAt) / 60000);
  }
  
  return this.save();
};

tableCustomerSessionSchema.methods.addOrder = function(orderData) {
  const order = {
    orderId: orderData.orderId,
    orderNumber: orderData.orderNumber,
    amount: orderData.amount,
    items: orderData.items,
    placedAt: orderData.placedAt || new Date()
  };
  
  this.orders.push(order);
  
  // Update metrics
  if (!this.metrics.firstOrderAt) {
    this.metrics.firstOrderAt = order.placedAt;
  }
  this.metrics.lastOrderAt = order.placedAt;
  
  // Update total amount
  this.totalAmount += order.amount;
  
  return this.save();
};

tableCustomerSessionSchema.methods.handoverTable = function(fromWaiterId, toWaiterId, reason, notes) {
  this.handovers.push({
    fromWaiter: fromWaiterId,
    toWaiter: toWaiterId,
    reason,
    notes
  });
  
  this.waiterId = toWaiterId;
  return this.save();
};

tableCustomerSessionSchema.methods.submitFeedback = function(feedbackData) {
  if (feedbackData.rating) {
    this.serviceRating = feedbackData.rating;
  }
  
  this.feedback = {
    comment: feedbackData.comment,
    wouldRecommend: feedbackData.wouldRecommend,
    submittedAt: new Date()
  };
  
  return this.save();
};

// Statics
tableCustomerSessionSchema.statics.getActiveSession = async function(tenantId, tableId) {
  return this.findOne({
    tenantId,
    tableId,
    status: 'active'
  }).populate('waiterId', 'name email');
};

tableCustomerSessionSchema.statics.getSessionsByTable = async function(tenantId, tableId, options = {}) {
  const query = { tenantId, tableId };
  
  if (options.startDate || options.endDate) {
    query.startTime = {};
    if (options.startDate) query.startTime.$gte = options.startDate;
    if (options.endDate) query.startTime.$lte = options.endDate;
  }
  
  if (options.status) {
    query.status = options.status;
  }
  
  return this.find(query)
    .populate('waiterId', 'name email')
    .populate('orders.orderId', 'orderNumber')
    .sort('-startTime')
    .limit(options.limit || 50);
};

tableCustomerSessionSchema.statics.getSessionsByWaiter = async function(tenantId, waiterId, options = {}) {
  const query = { 
    tenantId,
    $or: [
      { waiterId },
      { 'handovers.toWaiter': waiterId },
      { 'handovers.fromWaiter': waiterId }
    ]
  };
  
  if (options.date) {
    const startOfDay = new Date(options.date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(options.date);
    endOfDay.setHours(23, 59, 59, 999);
    
    query.startTime = {
      $gte: startOfDay,
      $lte: endOfDay
    };
  }
  
  return this.find(query)
    .populate('tableId', 'number displayName')
    .sort('-startTime');
};

tableCustomerSessionSchema.statics.getTableAnalytics = async function(tenantId, tableId, period = 'month') {
  const now = new Date();
  let startDate = new Date();
  
  switch (period) {
    case 'day':
      startDate.setDate(now.getDate() - 1);
      break;
    case 'week':
      startDate.setDate(now.getDate() - 7);
      break;
    case 'month':
      startDate.setMonth(now.getMonth() - 1);
      break;
    case 'year':
      startDate.setFullYear(now.getFullYear() - 1);
      break;
  }
  
  const sessions = await this.find({
    tenantId,
    tableId,
    startTime: { $gte: startDate },
    status: 'completed'
  });
  
  // Calculate analytics
  const totalSessions = sessions.length;
  const totalRevenue = sessions.reduce((sum, session) => sum + session.totalAmount, 0);
  const totalGuests = sessions.reduce((sum, session) => sum + session.numberOfGuests, 0);
  const averageDuration = sessions.reduce((sum, session) => sum + (session.duration || 0), 0) / totalSessions || 0;
  const averageOrderValue = totalRevenue / totalSessions || 0;
  
  // Calculate ratings
  const ratedSessions = sessions.filter(s => s.serviceRating && s.serviceRating.overall);
  const averageRating = ratedSessions.reduce((sum, s) => sum + s.serviceRating.overall, 0) / ratedSessions.length || 0;
  
  // Popular times
  const hourCounts = {};
  sessions.forEach(session => {
    const hour = session.startTime.getHours();
    hourCounts[hour] = (hourCounts[hour] || 0) + 1;
  });
  
  const popularTimes = Object.entries(hourCounts)
    .map(([hour, count]) => ({ hour: parseInt(hour), count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
  
  return {
    totalSessions,
    totalRevenue,
    totalGuests,
    averageDuration: Math.round(averageDuration),
    averageOrderValue: Math.round(averageOrderValue * 100) / 100,
    averageRating: Math.round(averageRating * 10) / 10,
    turnoverRate: totalSessions / 30, // Average per day
    popularTimes,
    period
  };
};

module.exports = mongoose.model('TableCustomerSession', tableCustomerSessionSchema);