const mongoose = require('mongoose');

const serviceRequestSchema = new mongoose.Schema({
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
  customerSessionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CustomerSession'
  },
  requestType: {
    type: String,
    enum: [
      'call_waiter',
      'request_bill',
      'water',
      'napkins',
      'cutlery',
      'assistance',
      'complaint',
      'compliment',
      'custom'
    ],
    required: true
  },
  priority: {
    type: String,
    enum: ['low', 'normal', 'high', 'urgent'],
    default: 'normal'
  },
  status: {
    type: String,
    enum: ['pending', 'acknowledged', 'in_progress', 'completed', 'cancelled'],
    default: 'pending',
    index: true
  },
  message: {
    type: String,
    maxlength: 500
  },
  assignedWaiter: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  requestedBy: {
    type: {
      type: String,
      enum: ['customer', 'waiter', 'manager', 'system']
    },
    id: mongoose.Schema.Types.ObjectId,
    name: String
  },
  timestamps: {
    requested: {
      type: Date,
      default: Date.now
    },
    acknowledged: Date,
    started: Date,
    completed: Date,
    cancelled: Date
  },
  responseTime: {
    acknowledgement: Number, // seconds
    completion: Number // seconds
  },
  location: {
    floor: String,
    section: String,
    zone: String
  },
  metadata: {
    deviceType: String,
    ipAddress: String,
    userAgent: String
  },
  rating: {
    score: {
      type: Number,
      min: 1,
      max: 5
    },
    feedback: String
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Indexes for performance
serviceRequestSchema.index({ tenantId: 1, status: 1, priority: -1 });
serviceRequestSchema.index({ tenantId: 1, tableNumber: 1, status: 1 });
serviceRequestSchema.index({ tenantId: 1, assignedWaiter: 1, status: 1 });
serviceRequestSchema.index({ tenantId: 1, 'timestamps.requested': -1 });

// Pre-save middleware to calculate response times
serviceRequestSchema.pre('save', function(next) {
  if (this.isModified('status')) {
    const now = new Date();
    
    switch (this.status) {
      case 'acknowledged':
        this.timestamps.acknowledged = now;
        if (this.timestamps.requested) {
          this.responseTime.acknowledgement = Math.round(
            (now - this.timestamps.requested) / 1000
          );
        }
        break;
      case 'in_progress':
        this.timestamps.started = now;
        break;
      case 'completed':
        this.timestamps.completed = now;
        if (this.timestamps.requested) {
          this.responseTime.completion = Math.round(
            (now - this.timestamps.requested) / 1000
          );
        }
        break;
      case 'cancelled':
        this.timestamps.cancelled = now;
        break;
    }
  }
  next();
});

// Static methods
serviceRequestSchema.statics.getActiveRequests = async function(tenantId, filters = {}) {
  const query = {
    tenantId,
    status: { $in: ['pending', 'acknowledged', 'in_progress'] },
    isActive: true
  };

  if (filters.tableNumber) {
    query.tableNumber = filters.tableNumber;
  }
  if (filters.assignedWaiter) {
    query.assignedWaiter = filters.assignedWaiter;
  }
  if (filters.priority) {
    query.priority = filters.priority;
  }

  return this.find(query)
    .populate('assignedWaiter', 'name')
    .populate('tableId', 'number location')
    .sort({ priority: -1, 'timestamps.requested': 1 });
};

serviceRequestSchema.statics.getPendingRequestsCount = async function(tenantId, waiterId = null) {
  const query = {
    tenantId,
    status: 'pending',
    isActive: true
  };

  if (waiterId) {
    query.assignedWaiter = waiterId;
  }

  return this.countDocuments(query);
};

serviceRequestSchema.statics.getAverageResponseTime = async function(tenantId, period = 'day') {
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

  const result = await this.aggregate([
    {
      $match: {
        tenantId,
        status: 'completed',
        'timestamps.completed': { $gte: startDate }
      }
    },
    {
      $group: {
        _id: null,
        avgAcknowledgement: { $avg: '$responseTime.acknowledgement' },
        avgCompletion: { $avg: '$responseTime.completion' },
        count: { $sum: 1 }
      }
    }
  ]);

  return result[0] || {
    avgAcknowledgement: 0,
    avgCompletion: 0,
    count: 0
  };
};

// Instance methods
serviceRequestSchema.methods.acknowledge = async function(waiterId) {
  if (this.status !== 'pending') {
    throw new Error('Request must be pending to acknowledge');
  }

  this.status = 'acknowledged';
  this.assignedWaiter = waiterId;
  return this.save();
};

serviceRequestSchema.methods.start = async function() {
  if (this.status !== 'acknowledged') {
    throw new Error('Request must be acknowledged before starting');
  }

  this.status = 'in_progress';
  return this.save();
};

serviceRequestSchema.methods.complete = async function(rating = null) {
  if (!['acknowledged', 'in_progress'].includes(this.status)) {
    throw new Error('Request must be acknowledged or in progress to complete');
  }

  this.status = 'completed';
  if (rating) {
    this.rating = rating;
  }
  return this.save();
};

serviceRequestSchema.methods.cancel = async function(reason = null) {
  if (this.status === 'completed' || this.status === 'cancelled') {
    throw new Error('Cannot cancel completed or already cancelled request');
  }

  this.status = 'cancelled';
  if (reason) {
    this.message = reason;
  }
  return this.save();
};

module.exports = mongoose.model('ServiceRequest', serviceRequestSchema);