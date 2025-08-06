const mongoose = require('mongoose');
const { getCurrentTenant } = require('../middleware/enterpriseTenantIsolation');

const errorLogSchema = new mongoose.Schema({
  tenantId: { 
    type: String, 
    required: true, 
    index: true,
    default: function() {
      const context = getCurrentTenant();
      return context?.tenantId || 'system';
    }
  },
  
  // Error details
  type: {
    type: String,
    enum: ['api', 'database', 'validation', 'auth', 'payment', 'email', 'sms', 'integration', 'system', 'unknown'],
    default: 'unknown',
    index: true
  },
  
  severity: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium',
    index: true
  },
  
  status: {
    type: String,
    enum: ['new', 'acknowledged', 'investigating', 'resolved', 'ignored'],
    default: 'new',
    index: true
  },
  
  error: {
    message: String,
    stack: String,
    code: String,
    name: String
  },
  
  // Context information
  context: {
    url: String,
    method: String,
    ip: String,
    userAgent: String,
    userId: String,
    userName: String,
    userRole: String,
    requestBody: mongoose.Schema.Types.Mixed,
    requestQuery: mongoose.Schema.Types.Mixed,
    requestParams: mongoose.Schema.Types.Mixed,
    responseStatus: Number,
    responseTime: Number
  },
  
  // Additional metadata
  metadata: {
    browser: String,
    os: String,
    device: String,
    apiVersion: String,
    appVersion: String,
    environment: String
  },
  
  // Resolution details
  resolution: {
    resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    resolvedAt: Date,
    notes: String,
    fixApplied: String
  },
  
  // Tracking
  occurrences: { type: Number, default: 1 },
  firstOccurred: { type: Date, default: Date.now },
  lastOccurred: { type: Date, default: Date.now },
  
  // Notifications sent
  notifications: [{
    type: { type: String, enum: ['email', 'sms', 'slack', 'webhook'] },
    sentTo: String,
    sentAt: Date,
    success: Boolean
  }]
}, { 
  timestamps: true,
  indexes: [
    { tenantId: 1, type: 1, severity: 1 },
    { tenantId: 1, status: 1 },
    { tenantId: 1, createdAt: -1 },
    { 'error.code': 1 },
    { 'context.userId': 1 }
  ]
});

// Static method to log errors
errorLogSchema.statics.logError = async function(errorData) {
  try {
    // Check if similar error exists in last hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const existingError = await this.findOne({
      tenantId: errorData.tenantId || 'system',
      'error.message': errorData.error?.message,
      'error.code': errorData.error?.code,
      lastOccurred: { $gte: oneHourAgo }
    });
    
    if (existingError) {
      // Update existing error
      existingError.occurrences += 1;
      existingError.lastOccurred = new Date();
      await existingError.save();
      return existingError;
    } else {
      // Create new error log
      return await this.create(errorData);
    }
  } catch (err) {
    console.error('Failed to log error:', err);
    return null;
  }
};

// Get error statistics
errorLogSchema.statics.getStatistics = async function(tenantId, days = 7) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  
  const stats = await this.aggregate([
    {
      $match: {
        tenantId: tenantId,
        createdAt: { $gte: startDate }
      }
    },
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        critical: {
          $sum: { $cond: [{ $eq: ['$severity', 'critical'] }, 1, 0] }
        },
        high: {
          $sum: { $cond: [{ $eq: ['$severity', 'high'] }, 1, 0] }
        },
        medium: {
          $sum: { $cond: [{ $eq: ['$severity', 'medium'] }, 1, 0] }
        },
        low: {
          $sum: { $cond: [{ $eq: ['$severity', 'low'] }, 1, 0] }
        },
        resolved: {
          $sum: { $cond: [{ $eq: ['$status', 'resolved'] }, 1, 0] }
        },
        new: {
          $sum: { $cond: [{ $eq: ['$status', 'new'] }, 1, 0] }
        }
      }
    }
  ]);
  
  // Get errors by type
  const byType = await this.aggregate([
    {
      $match: {
        tenantId: tenantId,
        createdAt: { $gte: startDate }
      }
    },
    {
      $group: {
        _id: '$type',
        count: { $sum: 1 }
      }
    },
    { $sort: { count: -1 } }
  ]);
  
  // Get trend data
  const trend = await this.aggregate([
    {
      $match: {
        tenantId: tenantId,
        createdAt: { $gte: startDate }
      }
    },
    {
      $group: {
        _id: {
          $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
        },
        count: { $sum: 1 },
        critical: {
          $sum: { $cond: [{ $eq: ['$severity', 'critical'] }, 1, 0] }
        }
      }
    },
    { $sort: { _id: 1 } }
  ]);
  
  return {
    summary: stats[0] || {
      total: 0,
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
      resolved: 0,
      new: 0
    },
    byType,
    trend
  };
};

// Apply tenant filter
errorLogSchema.pre(/^find/, function() {
  const context = getCurrentTenant();
  if (context?.tenantId && this.getQuery().tenantId === undefined) {
    this.where({ tenantId: context.tenantId });
  }
});

module.exports = mongoose.model('ErrorLog', errorLogSchema);