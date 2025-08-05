const mongoose = require('mongoose');

const tableTimelineSchema = new mongoose.Schema({
  tenantId: {
    type: String,
    required: true,
    index: true
  },
  tableNumber: {
    type: String,
    required: true,
    index: true
  },
  tableId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Table'
  },
  sessionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CustomerSession'
  },
  eventType: {
    type: String,
    enum: [
      // Customer events
      'customer_seated',
      'menu_viewed',
      'order_placed',
      'order_modified',
      'order_cancelled',
      'payment_initiated',
      'payment_completed',
      'customer_left',
      
      // Service events
      'service_requested',
      'service_acknowledged',
      'service_completed',
      'waiter_called',
      'bill_requested',
      'complaint_registered',
      'compliment_given',
      
      // Waiter events
      'waiter_assigned',
      'waiter_arrived',
      'waiter_changed',
      'table_checked',
      
      // Order events
      'order_confirmed',
      'order_preparing',
      'order_ready',
      'order_served',
      
      // Table events
      'table_reserved',
      'table_occupied',
      'table_cleaned',
      'table_available'
    ],
    required: true
  },
  description: {
    type: String,
    required: true
  },
  actor: {
    type: {
      type: String,
      enum: ['customer', 'waiter', 'manager', 'chef', 'system'],
      required: true
    },
    id: mongoose.Schema.Types.ObjectId,
    name: String
  },
  metadata: {
    orderId: mongoose.Schema.Types.ObjectId,
    serviceRequestId: mongoose.Schema.Types.ObjectId,
    previousValue: mongoose.Schema.Types.Mixed,
    newValue: mongoose.Schema.Types.Mixed,
    responseTime: Number, // seconds
    itemsCount: Number,
    amount: Number,
    notes: String
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Indexes for performance
tableTimelineSchema.index({ tenantId: 1, tableNumber: 1, timestamp: -1 });
tableTimelineSchema.index({ tenantId: 1, sessionId: 1, timestamp: -1 });
tableTimelineSchema.index({ tenantId: 1, eventType: 1, timestamp: -1 });

// Static methods
tableTimelineSchema.statics.logEvent = async function(data) {
  return this.create(data);
};

tableTimelineSchema.statics.getTableHistory = async function(tenantId, tableNumber, options = {}) {
  const query = {
    tenantId,
    tableNumber,
    isActive: true
  };

  if (options.sessionId) {
    query.sessionId = options.sessionId;
  }

  if (options.startDate || options.endDate) {
    query.timestamp = {};
    if (options.startDate) {
      query.timestamp.$gte = new Date(options.startDate);
    }
    if (options.endDate) {
      query.timestamp.$lte = new Date(options.endDate);
    }
  }

  if (options.eventTypes && options.eventTypes.length > 0) {
    query.eventType = { $in: options.eventTypes };
  }

  const timeline = await this.find(query)
    .sort({ timestamp: -1 })
    .limit(options.limit || 100)
    .lean();

  return timeline;
};

tableTimelineSchema.statics.getServiceMetrics = async function(tenantId, tableNumber, period = 'day') {
  const now = new Date();
  let startDate;

  switch (period) {
    case 'hour':
      startDate = new Date(now - 60 * 60 * 1000);
      break;
    case 'day':
      startDate = new Date(now - 24 * 60 * 60 * 1000);
      break;
    case 'week':
      startDate = new Date(now - 7 * 24 * 60 * 60 * 1000);
      break;
    default:
      startDate = new Date(now - 24 * 60 * 60 * 1000);
  }

  const serviceEvents = await this.aggregate([
    {
      $match: {
        tenantId,
        tableNumber,
        eventType: { $in: ['service_requested', 'service_completed'] },
        timestamp: { $gte: startDate }
      }
    },
    {
      $sort: { timestamp: 1 }
    },
    {
      $group: {
        _id: '$metadata.serviceRequestId',
        events: { $push: '$$ROOT' }
      }
    }
  ]);

  // Calculate metrics
  const metrics = {
    totalRequests: 0,
    completedRequests: 0,
    averageResponseTime: 0,
    requestTypes: {}
  };

  let totalResponseTime = 0;
  let responseCount = 0;

  serviceEvents.forEach(group => {
    const requestEvent = group.events.find(e => e.eventType === 'service_requested');
    const completeEvent = group.events.find(e => e.eventType === 'service_completed');

    if (requestEvent) {
      metrics.totalRequests++;
      
      // Count request types
      const requestType = requestEvent.metadata?.requestType || 'other';
      metrics.requestTypes[requestType] = (metrics.requestTypes[requestType] || 0) + 1;

      if (completeEvent) {
        metrics.completedRequests++;
        const responseTime = (completeEvent.timestamp - requestEvent.timestamp) / 1000; // seconds
        totalResponseTime += responseTime;
        responseCount++;
      }
    }
  });

  if (responseCount > 0) {
    metrics.averageResponseTime = Math.round(totalResponseTime / responseCount);
  }

  return metrics;
};

tableTimelineSchema.statics.getWaiterPerformance = async function(tenantId, waiterId, period = 'day') {
  const now = new Date();
  let startDate;

  switch (period) {
    case 'hour':
      startDate = new Date(now - 60 * 60 * 1000);
      break;
    case 'day':
      startDate = new Date(now - 24 * 60 * 60 * 1000);
      break;
    case 'week':
      startDate = new Date(now - 7 * 24 * 60 * 60 * 1000);
      break;
    default:
      startDate = new Date(now - 24 * 60 * 60 * 1000);
  }

  const events = await this.find({
    tenantId,
    'actor.id': waiterId,
    timestamp: { $gte: startDate }
  }).lean();

  const performance = {
    tablesServed: new Set(),
    serviceRequests: {
      acknowledged: 0,
      completed: 0,
      averageResponseTime: 0
    },
    ordersServed: 0,
    activityTimeline: []
  };

  events.forEach(event => {
    performance.tablesServed.add(event.tableNumber);

    switch (event.eventType) {
      case 'service_acknowledged':
        performance.serviceRequests.acknowledged++;
        break;
      case 'service_completed':
        performance.serviceRequests.completed++;
        if (event.metadata?.responseTime) {
          performance.serviceRequests.averageResponseTime += event.metadata.responseTime;
        }
        break;
      case 'order_served':
        performance.ordersServed++;
        break;
    }

    performance.activityTimeline.push({
      time: event.timestamp,
      type: event.eventType,
      table: event.tableNumber
    });
  });

  // Convert Set to count
  performance.tablesServed = performance.tablesServed.size;

  // Calculate average response time
  if (performance.serviceRequests.completed > 0) {
    performance.serviceRequests.averageResponseTime = Math.round(
      performance.serviceRequests.averageResponseTime / performance.serviceRequests.completed
    );
  }

  return performance;
};

module.exports = mongoose.model('TableTimeline', tableTimelineSchema);