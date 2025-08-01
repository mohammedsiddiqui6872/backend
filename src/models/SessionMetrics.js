const mongoose = require('mongoose');

const sessionEventSchema = new mongoose.Schema({
  eventType: {
    type: String,
    required: true,
    enum: [
      'session_started',
      'order_placed',
      'order_modified',
      'order_cancelled',
      'payment_initiated',
      'payment_completed',
      'waiter_called',
      'waiter_assigned',
      'waiter_changed',
      'session_ended',
      'table_cleaned'
    ]
  },
  timestamp: { type: Date, default: Date.now },
  data: mongoose.Schema.Types.Mixed,
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  userName: String
});

const sessionMetricsSchema = new mongoose.Schema({
  tenantId: { type: String, required: true, index: true },
  tableId: { type: mongoose.Schema.Types.ObjectId, ref: 'Table', required: true },
  tableNumber: { type: String, required: true },
  sessionId: { type: mongoose.Schema.Types.ObjectId, ref: 'CustomerSession' },
  
  // Session timing
  startTime: { type: Date, required: true, default: Date.now },
  endTime: Date,
  duration: Number, // in milliseconds
  
  // Customer info
  customerName: String,
  customerPhone: String,
  numberOfGuests: { type: Number, default: 1 },
  
  // Orders
  orders: [{
    orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
    orderNumber: String,
    amount: Number,
    itemCount: Number,
    placedAt: Date,
    completedAt: Date,
    preparationTime: Number // in minutes
  }],
  totalOrderAmount: { type: Number, default: 0 },
  totalItemsOrdered: { type: Number, default: 0 },
  
  // Service metrics
  waiterId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  waiterName: String,
  waiterResponseTimes: [{
    callTime: Date,
    responseTime: Date,
    responseDelay: Number // in seconds
  }],
  averageWaiterResponseTime: Number, // in seconds
  
  // Payment
  paymentMethod: String,
  paymentTime: Date,
  billAmount: Number,
  tipAmount: { type: Number, default: 0 },
  tipPercentage: Number,
  
  // Session quality metrics
  orderToPaymentTime: Number, // in minutes
  tableOccupancyTime: Number, // in minutes
  customerWaitTime: Number, // time from seated to first order in minutes
  
  // Events timeline
  events: [sessionEventSchema],
  
  // Feedback
  customerRating: { type: Number, min: 1, max: 5 },
  customerFeedback: String,
  
  // Status
  status: {
    type: String,
    enum: ['active', 'completed', 'abandoned'],
    default: 'active'
  },
  
  // Analytics flags
  peakHour: Boolean,
  dayOfWeek: Number, // 0-6 (Sunday-Saturday)
  hourOfDay: Number, // 0-23
  isRepeatCustomer: Boolean,
  
  // Anomalies
  anomalies: [{
    type: {
      type: String,
      enum: ['long_wait', 'no_order', 'abandoned', 'high_tip', 'low_tip', 'long_session']
    },
    description: String,
    detectedAt: Date
  }]
}, {
  timestamps: true
});

// Indexes for efficient querying
sessionMetricsSchema.index({ tenantId: 1, startTime: -1 });
sessionMetricsSchema.index({ tenantId: 1, tableId: 1, startTime: -1 });
sessionMetricsSchema.index({ tenantId: 1, waiterId: 1, startTime: -1 });
sessionMetricsSchema.index({ tenantId: 1, status: 1 });
sessionMetricsSchema.index({ tenantId: 1, dayOfWeek: 1, hourOfDay: 1 });

// Calculate derived metrics before saving
sessionMetricsSchema.pre('save', function(next) {
  // Calculate duration
  if (this.endTime && this.startTime) {
    this.duration = this.endTime - this.startTime;
    this.tableOccupancyTime = Math.round(this.duration / 60000); // Convert to minutes
  }
  
  // Calculate day and hour
  const start = new Date(this.startTime);
  this.dayOfWeek = start.getDay();
  this.hourOfDay = start.getHours();
  this.peakHour = this.hourOfDay >= 12 && this.hourOfDay <= 14 || 
                  this.hourOfDay >= 19 && this.hourOfDay <= 21;
  
  // Calculate order metrics
  if (this.orders && this.orders.length > 0) {
    this.totalOrderAmount = this.orders.reduce((sum, order) => sum + (order.amount || 0), 0);
    this.totalItemsOrdered = this.orders.reduce((sum, order) => sum + (order.itemCount || 0), 0);
    
    // Customer wait time (time to first order)
    const firstOrder = this.orders.sort((a, b) => a.placedAt - b.placedAt)[0];
    if (firstOrder && firstOrder.placedAt) {
      this.customerWaitTime = Math.round((firstOrder.placedAt - this.startTime) / 60000);
    }
  }
  
  // Calculate payment metrics
  if (this.paymentTime && this.orders.length > 0) {
    const lastOrder = this.orders.sort((a, b) => b.placedAt - a.placedAt)[0];
    if (lastOrder && lastOrder.placedAt) {
      this.orderToPaymentTime = Math.round((this.paymentTime - lastOrder.placedAt) / 60000);
    }
  }
  
  // Calculate tip percentage
  if (this.billAmount && this.tipAmount) {
    this.tipPercentage = Math.round((this.tipAmount / this.billAmount) * 100);
  }
  
  // Calculate average waiter response time
  if (this.waiterResponseTimes && this.waiterResponseTimes.length > 0) {
    const totalDelay = this.waiterResponseTimes.reduce((sum, r) => sum + (r.responseDelay || 0), 0);
    this.averageWaiterResponseTime = Math.round(totalDelay / this.waiterResponseTimes.length);
  }
  
  // Detect anomalies
  this.detectAnomalies();
  
  next();
});

// Method to add event
sessionMetricsSchema.methods.addEvent = function(eventType, data, userId, userName) {
  this.events.push({
    eventType,
    data,
    userId,
    userName,
    timestamp: new Date()
  });
  return this.save();
};

// Method to detect anomalies
sessionMetricsSchema.methods.detectAnomalies = function() {
  const anomalies = [];
  
  // Long wait time
  if (this.customerWaitTime > 15) {
    anomalies.push({
      type: 'long_wait',
      description: `Customer waited ${this.customerWaitTime} minutes before ordering`,
      detectedAt: new Date()
    });
  }
  
  // No order placed
  if (this.duration > 600000 && this.orders.length === 0) { // 10 minutes
    anomalies.push({
      type: 'no_order',
      description: 'Session active for over 10 minutes with no orders',
      detectedAt: new Date()
    });
  }
  
  // Long session
  if (this.tableOccupancyTime > 180) { // 3 hours
    anomalies.push({
      type: 'long_session',
      description: `Table occupied for ${this.tableOccupancyTime} minutes`,
      detectedAt: new Date()
    });
  }
  
  // Tip anomalies
  if (this.tipPercentage > 30) {
    anomalies.push({
      type: 'high_tip',
      description: `Unusually high tip: ${this.tipPercentage}%`,
      detectedAt: new Date()
    });
  } else if (this.billAmount > 50 && this.tipPercentage < 5) {
    anomalies.push({
      type: 'low_tip',
      description: `Low tip: ${this.tipPercentage}% on bill of ${this.billAmount}`,
      detectedAt: new Date()
    });
  }
  
  this.anomalies = anomalies;
};

// Static methods for analytics
sessionMetricsSchema.statics.getTableAnalytics = async function(tenantId, tableId, dateRange) {
  const match = { tenantId, tableId, status: 'completed' };
  
  if (dateRange) {
    match.startTime = {
      $gte: dateRange.start,
      $lte: dateRange.end
    };
  }
  
  const analytics = await this.aggregate([
    { $match: match },
    {
      $group: {
        _id: '$tableId',
        totalSessions: { $sum: 1 },
        totalRevenue: { $sum: '$totalOrderAmount' },
        totalGuests: { $sum: '$numberOfGuests' },
        avgSessionDuration: { $avg: '$tableOccupancyTime' },
        avgOrderValue: { $avg: '$totalOrderAmount' },
        avgWaitTime: { $avg: '$customerWaitTime' },
        avgResponseTime: { $avg: '$averageWaiterResponseTime' },
        avgTipPercentage: { $avg: '$tipPercentage' },
        totalTips: { $sum: '$tipAmount' }
      }
    }
  ]);
  
  return analytics[0] || {};
};

sessionMetricsSchema.statics.getPeakHours = async function(tenantId, dateRange) {
  const match = { tenantId, status: 'completed' };
  
  if (dateRange) {
    match.startTime = {
      $gte: dateRange.start,
      $lte: dateRange.end
    };
  }
  
  return this.aggregate([
    { $match: match },
    {
      $group: {
        _id: {
          dayOfWeek: '$dayOfWeek',
          hour: '$hourOfDay'
        },
        count: { $sum: 1 },
        avgOccupancy: { $avg: '$tableOccupancyTime' },
        totalRevenue: { $sum: '$totalOrderAmount' }
      }
    },
    { $sort: { count: -1 } }
  ]);
};

sessionMetricsSchema.statics.getWaiterPerformance = async function(tenantId, waiterId, dateRange) {
  const match = { tenantId, waiterId, status: 'completed' };
  
  if (dateRange) {
    match.startTime = {
      $gte: dateRange.start,
      $lte: dateRange.end
    };
  }
  
  const performance = await this.aggregate([
    { $match: match },
    {
      $group: {
        _id: '$waiterId',
        totalSessions: { $sum: 1 },
        totalRevenue: { $sum: '$totalOrderAmount' },
        avgResponseTime: { $avg: '$averageWaiterResponseTime' },
        avgTipPercentage: { $avg: '$tipPercentage' },
        totalTips: { $sum: '$tipAmount' },
        avgRating: { $avg: '$customerRating' },
        tablesServed: { $addToSet: '$tableId' }
      }
    },
    {
      $project: {
        totalSessions: 1,
        totalRevenue: 1,
        avgResponseTime: 1,
        avgTipPercentage: 1,
        totalTips: 1,
        avgRating: 1,
        uniqueTablesServed: { $size: '$tablesServed' }
      }
    }
  ]);
  
  return performance[0] || {};
};

module.exports = mongoose.model('SessionMetrics', sessionMetricsSchema);