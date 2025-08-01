const mongoose = require('mongoose');

const tableServiceHistorySchema = new mongoose.Schema({
  tenantId: { type: String, required: true, index: true },
  tableId: { type: mongoose.Schema.Types.ObjectId, ref: 'Table', required: true },
  tableNumber: { type: String, required: true },
  
  // Session Information
  sessionId: { type: mongoose.Schema.Types.ObjectId, ref: 'CustomerSession' },
  sessionMetricsId: { type: mongoose.Schema.Types.ObjectId, ref: 'SessionMetrics' },
  
  // Service Timeline
  serviceStart: { type: Date, required: true },
  serviceEnd: { type: Date },
  duration: { type: Number }, // in minutes
  
  // Customer Information
  customerName: String,
  customerPhone: String,
  numberOfGuests: { type: Number, default: 1 },
  
  // Service Details
  waiterId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  waiterName: String,
  assistingWaiters: [{
    waiterId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    waiterName: String,
    joinedAt: Date,
    leftAt: Date
  }],
  
  // Order Information
  orders: [{
    orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
    orderNumber: String,
    amount: Number,
    itemCount: Number,
    placedAt: Date,
    completedAt: Date
  }],
  totalOrderAmount: { type: Number, default: 0 },
  totalOrders: { type: Number, default: 0 },
  
  // Service Metrics
  metrics: {
    seatingTime: Number, // Time to seat after arrival (minutes)
    orderTime: Number, // Time to first order (minutes)
    firstFoodDelivery: Number, // Time to first food delivery (minutes)
    totalServiceTime: Number, // Total service duration (minutes)
    tableOccupancyTime: Number, // Total time table was occupied (minutes)
    turnoverTime: Number, // Time between services (minutes)
    waitingPeriods: [{ // Periods where customer waited
      reason: String,
      startTime: Date,
      endTime: Date,
      duration: Number
    }]
  },
  
  // Payment Information
  payment: {
    method: String,
    amount: Number,
    tipAmount: Number,
    tipPercentage: Number,
    paidAt: Date
  },
  
  // Feedback
  feedback: {
    rating: Number,
    foodRating: Number,
    serviceRating: Number,
    ambienceRating: Number,
    comment: String,
    submittedAt: Date
  },
  
  // Service Quality Indicators
  serviceQuality: {
    waiterResponseTime: Number, // Average response time
    orderAccuracy: { type: Boolean, default: true },
    complaints: [{
      type: String,
      description: String,
      resolvedAt: Date,
      resolution: String
    }],
    compliments: [String],
    specialRequests: [{
      request: String,
      fulfilled: Boolean,
      note: String
    }]
  },
  
  // Table Condition
  tableCondition: {
    beforeService: {
      cleanliness: { type: Number, min: 1, max: 5 },
      setup: { type: Number, min: 1, max: 5 },
      notes: String
    },
    afterService: {
      cleanliness: { type: Number, min: 1, max: 5 },
      damage: String,
      notes: String
    }
  },
  
  // Special Events/Notes
  specialEvents: [{
    type: { type: String, enum: ['birthday', 'anniversary', 'business', 'date', 'family', 'other'] },
    description: String
  }],
  
  // Analytics Flags
  peakHour: { type: Boolean, default: false },
  dayOfWeek: { type: Number, min: 0, max: 6 }, // 0 = Sunday
  isRepeatCustomer: { type: Boolean, default: false },
  weatherCondition: String, // Can affect outdoor tables
  
  notes: String,
  
  // Archival
  isArchived: { type: Boolean, default: false },
  archivedAt: Date
}, { 
  timestamps: true,
  indexes: [
    { tenantId: 1, tableId: 1, serviceStart: -1 },
    { tenantId: 1, serviceStart: -1 },
    { tenantId: 1, waiterId: 1, serviceStart: -1 },
    { tenantId: 1, customerPhone: 1 }
  ]
});

// Calculate duration before saving
tableServiceHistorySchema.pre('save', function(next) {
  if (this.serviceEnd && this.serviceStart) {
    this.duration = Math.round((this.serviceEnd - this.serviceStart) / (1000 * 60)); // minutes
    this.metrics.totalServiceTime = this.duration;
  }
  
  // Set day of week
  if (this.serviceStart) {
    this.dayOfWeek = this.serviceStart.getDay();
    
    // Determine if peak hour (11:30-14:00 or 18:30-21:00)
    const hour = this.serviceStart.getHours();
    const minutes = this.serviceStart.getMinutes();
    const timeInMinutes = hour * 60 + minutes;
    
    this.peakHour = (timeInMinutes >= 690 && timeInMinutes <= 840) || // 11:30-14:00
                    (timeInMinutes >= 1110 && timeInMinutes <= 1260); // 18:30-21:00
  }
  
  next();
});

// Static methods for analytics
tableServiceHistorySchema.statics.getTableAnalytics = async function(tenantId, tableId, dateRange = {}) {
  const match = {
    tenantId,
    tableId,
    isArchived: false
  };
  
  if (dateRange.start) match.serviceStart = { $gte: dateRange.start };
  if (dateRange.end) {
    match.serviceStart = match.serviceStart || {};
    match.serviceStart.$lte = dateRange.end;
  }
  
  const analytics = await this.aggregate([
    { $match: match },
    {
      $group: {
        _id: null,
        totalServices: { $sum: 1 },
        totalRevenue: { $sum: '$totalOrderAmount' },
        totalGuests: { $sum: '$numberOfGuests' },
        avgDuration: { $avg: '$duration' },
        avgOrderValue: { $avg: '$totalOrderAmount' },
        avgGuests: { $avg: '$numberOfGuests' },
        avgRating: { $avg: '$feedback.rating' },
        avgTipPercentage: { $avg: '$payment.tipPercentage' },
        peakHourServices: { $sum: { $cond: ['$peakHour', 1, 0] } },
        repeatCustomers: { $sum: { $cond: ['$isRepeatCustomer', 1, 0] } }
      }
    },
    {
      $project: {
        _id: 0,
        totalServices: 1,
        totalRevenue: { $round: ['$totalRevenue', 2] },
        totalGuests: 1,
        avgDuration: { $round: ['$avgDuration', 0] },
        avgOrderValue: { $round: ['$avgOrderValue', 2] },
        avgGuests: { $round: ['$avgGuests', 1] },
        avgRating: { $round: ['$avgRating', 1] },
        avgTipPercentage: { $round: ['$avgTipPercentage', 1] },
        peakHourServices: 1,
        repeatCustomers: 1,
        occupancyRate: {
          $round: [
            { $multiply: [
              { $divide: ['$peakHourServices', '$totalServices'] },
              100
            ]},
            1
          ]
        }
      }
    }
  ]);
  
  // Get popular times
  const popularTimes = await this.aggregate([
    { $match: match },
    {
      $group: {
        _id: {
          dayOfWeek: '$dayOfWeek',
          hour: { $hour: '$serviceStart' }
        },
        count: { $sum: 1 },
        avgDuration: { $avg: '$duration' },
        avgRevenue: { $avg: '$totalOrderAmount' }
      }
    },
    { $sort: { count: -1 } },
    { $limit: 10 }
  ]);
  
  // Get waiter performance for this table
  const waiterPerformance = await this.aggregate([
    { $match: match },
    {
      $group: {
        _id: {
          waiterId: '$waiterId',
          waiterName: '$waiterName'
        },
        services: { $sum: 1 },
        avgRating: { $avg: '$feedback.rating' },
        avgTips: { $avg: '$payment.tipPercentage' },
        totalRevenue: { $sum: '$totalOrderAmount' }
      }
    },
    { $sort: { services: -1 } },
    { $limit: 5 }
  ]);
  
  return {
    summary: analytics[0] || {
      totalServices: 0,
      totalRevenue: 0,
      totalGuests: 0,
      avgDuration: 0,
      avgOrderValue: 0,
      avgGuests: 0,
      avgRating: 0,
      avgTipPercentage: 0,
      peakHourServices: 0,
      repeatCustomers: 0,
      occupancyRate: 0
    },
    popularTimes: popularTimes.map(pt => ({
      dayOfWeek: pt._id.dayOfWeek,
      hour: pt._id.hour,
      services: pt.count,
      avgDuration: Math.round(pt.avgDuration),
      avgRevenue: Math.round(pt.avgRevenue * 100) / 100
    })),
    topWaiters: waiterPerformance.map(wp => ({
      waiterId: wp._id.waiterId,
      waiterName: wp._id.waiterName,
      services: wp.services,
      avgRating: Math.round(wp.avgRating * 10) / 10,
      avgTips: Math.round(wp.avgTips * 10) / 10,
      totalRevenue: Math.round(wp.totalRevenue * 100) / 100
    }))
  };
};

// Get service trends
tableServiceHistorySchema.statics.getServiceTrends = async function(tenantId, tableId, period = '30d') {
  const now = new Date();
  const startDate = new Date();
  
  switch (period) {
    case '7d':
      startDate.setDate(now.getDate() - 7);
      break;
    case '30d':
      startDate.setDate(now.getDate() - 30);
      break;
    case '90d':
      startDate.setDate(now.getDate() - 90);
      break;
    case '1y':
      startDate.setFullYear(now.getFullYear() - 1);
      break;
  }
  
  const trends = await this.aggregate([
    {
      $match: {
        tenantId,
        tableId,
        serviceStart: { $gte: startDate },
        isArchived: false
      }
    },
    {
      $group: {
        _id: {
          year: { $year: '$serviceStart' },
          month: { $month: '$serviceStart' },
          day: { $dayOfMonth: '$serviceStart' }
        },
        services: { $sum: 1 },
        revenue: { $sum: '$totalOrderAmount' },
        guests: { $sum: '$numberOfGuests' },
        avgDuration: { $avg: '$duration' }
      }
    },
    {
      $sort: {
        '_id.year': 1,
        '_id.month': 1,
        '_id.day': 1
      }
    }
  ]);
  
  return trends.map(t => ({
    date: new Date(t._id.year, t._id.month - 1, t._id.day),
    services: t.services,
    revenue: Math.round(t.revenue * 100) / 100,
    guests: t.guests,
    avgDuration: Math.round(t.avgDuration)
  }));
};

const TableServiceHistory = mongoose.model('TableServiceHistory', tableServiceHistorySchema);

module.exports = TableServiceHistory;