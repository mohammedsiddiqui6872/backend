const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  // Core fields
  tenantId: { 
    type: String, 
    required: true, 
    index: true 
  },
  eventId: {
    type: String,
    required: true,
    unique: true,
    default: () => `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  },
  
  // Event Information
  action: {
    type: String,
    required: true,
    enum: [
      // Authentication & Authorization
      'auth.login', 'auth.logout', 'auth.login_failed', 'auth.token_refresh', 'auth.password_reset',
      'auth.2fa_enabled', 'auth.2fa_disabled', 'auth.2fa_verified', 'auth.2fa_failed',
      'auth.session_expired', 'auth.permission_denied', 'auth.role_assigned', 'auth.role_removed',
      
      // User Management
      'user.create', 'user.update', 'user.delete', 'user.activate', 'user.deactivate',
      'user.role_change', 'user.permissions_change', 'user.profile_update', 'user.password_change',
      'user.email_verified', 'user.phone_verified', 'user.profile_photo_upload',
      
      // Data Operations
      'data.create', 'data.read', 'data.update', 'data.delete', 'data.export', 'data.import',
      'data.bulk_create', 'data.bulk_update', 'data.bulk_delete', 'data.archive', 'data.restore',
      
      // System Operations
      'system.backup', 'system.restore', 'system.config_change', 'system.maintenance',
      'system.integration_connect', 'system.integration_disconnect', 'system.health_check',
      'system.cache_clear', 'system.restart', 'system.update',
      
      // Security Events
      'security.access_denied', 'security.suspicious_activity', 'security.brute_force_attempt',
      'security.data_breach_attempt', 'security.unauthorized_access', 'security.ip_blocked',
      'security.api_key_generated', 'security.api_key_revoked', 'security.encryption_key_rotated',
      
      // Business Operations
      'order.create', 'order.update', 'order.cancel', 'order.complete', 'order.refund',
      'payment.process', 'payment.refund', 'payment.failed', 'payment.method_added', 'payment.method_removed',
      'table.assign', 'table.release', 'table.status_change', 'table.combine', 'table.split',
      'menu.create', 'menu.update', 'menu.delete', 'menu.publish', 'menu.unpublish',
      'inventory.update', 'inventory.adjust', 'inventory.transfer', 'inventory.count',
      'shift.start', 'shift.end', 'shift.break_start', 'shift.break_end', 'shift.swap',
      
      // Compliance & Legal
      'compliance.gdpr_request', 'compliance.data_export', 'compliance.data_deletion',
      'compliance.consent_given', 'compliance.consent_withdrawn', 'compliance.audit_report',
      'compliance.terms_accepted', 'compliance.privacy_policy_accepted',
      
      // API Operations
      'api.call', 'api.rate_limit_exceeded', 'api.key_created', 'api.key_revoked',
      'api.webhook_sent', 'api.webhook_failed', 'api.integration_error',
      
      // Reporting & Analytics
      'report.generate', 'report.export', 'report.schedule', 'report.email',
      'analytics.query', 'analytics.export', 'analytics.dashboard_view'
    ],
    index: true
  },
  
  category: {
    type: String,
    enum: [
      'authentication',
      'authorization',
      'user_management',
      'data_access',
      'data_modification',
      'data_deletion',
      'system_operation',
      'security',
      'compliance',
      'business_operation',
      'api_operation',
      'reporting',
      'configuration',
      'integration'
    ],
    required: true,
    index: true
  },
  
  // Resource Information
  resource: {
    type: {
      type: String,
      required: true,
      enum: ['user', 'order', 'table', 'menu', 'payment', 'shift', 'report', 'settings', 'api', 'system', 'tenant', 'role', 'permission'],
      index: true
    },
    id: String,
    name: String,
    collection: String,
    path: String,
    parentType: String,
    parentId: String
  },
  
  // Actor Information
  actor: {
    type: {
      type: String,
      enum: ['user', 'system', 'api', 'integration', 'anonymous', 'scheduled_job'],
      required: true
    },
    id: String,
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    name: String,
    email: String,
    role: String,
    permissions: [String],
    ip: String,
    userAgent: String,
    deviceId: String,
    sessionId: String,
    apiKeyId: String,
    integrationName: String
  },
  
  // Request Details
  request: {
    method: String,
    endpoint: String,
    params: mongoose.Schema.Types.Mixed,
    query: mongoose.Schema.Types.Mixed,
    body: mongoose.Schema.Types.Mixed,
    headers: mongoose.Schema.Types.Mixed,
    files: [{
      fieldname: String,
      originalname: String,
      mimetype: String,
      size: Number
    }],
    responseStatus: Number,
    responseTime: Number, // in milliseconds
    responseSize: Number, // in bytes
    errorMessage: String,
    errorStack: String,
    errorCode: String
  },
  
  // Change Details
  changes: [{
    field: String,
    fieldPath: String,
    oldValue: mongoose.Schema.Types.Mixed,
    newValue: mongoose.Schema.Types.Mixed,
    oldValueType: String,
    newValueType: String,
    operation: {
      type: String,
      enum: ['set', 'unset', 'push', 'pull', 'increment', 'decrement', 'multiply']
    },
    arrayIndex: Number,
    isEncrypted: Boolean,
    isSensitive: Boolean
  }],
  
  // Additional Context
  context: {
    browser: String,
    browserVersion: String,
    os: String,
    osVersion: String,
    device: String,
    deviceType: String,
    location: {
      country: String,
      countryCode: String,
      region: String,
      city: String,
      postalCode: String,
      latitude: Number,
      longitude: Number,
      timezone: String,
      isp: String,
      org: String,
      as: String
    },
    referrer: String,
    campaign: String,
    source: String,
    medium: String,
    sessionDuration: Number,
    pageViews: Number,
    previousPage: String
  },
  
  // Metadata
  metadata: mongoose.Schema.Types.Mixed,
  
  // Security & Risk Assessment
  security: {
    severity: {
      type: String,
      enum: ['info', 'low', 'medium', 'high', 'critical'],
      default: 'info',
      index: true
    },
    riskScore: {
      type: Number,
      min: 0,
      max: 100,
      default: 0
    },
    riskFactors: [{
      factor: String,
      weight: Number,
      description: String
    }],
    anomalyScore: Number,
    isAnomaly: Boolean,
    threatIndicators: [String],
    mitigationActions: [String]
  },
  
  // Compliance & Legal
  compliance: {
    isGdprRelated: Boolean,
    isPiiAccess: Boolean,
    isSensitiveOperation: Boolean,
    isFinancialData: Boolean,
    isHealthData: Boolean,
    regulations: [{
      type: String,
      enum: ['GDPR', 'CCPA', 'HIPAA', 'PCI-DSS', 'SOX', 'ISO27001', 'SOC2'],
      applicable: Boolean,
      requirements: [String]
    }],
    dataClassification: {
      type: String,
      enum: ['public', 'internal', 'confidential', 'restricted']
    },
    legalBasis: String,
    purpose: String,
    dataSubjects: Number,
    crossBorderTransfer: Boolean,
    thirdPartySharing: Boolean
  },
  
  // Tags and Categorization
  tags: [{
    type: String,
    index: true
  }],
  
  // Flags
  flags: {
    suspicious: { type: Boolean, default: false },
    reviewed: { type: Boolean, default: false },
    archived: { type: Boolean, default: false },
    requiresReview: { type: Boolean, default: false },
    falsePositive: { type: Boolean, default: false },
    incident: { type: Boolean, default: false },
    automated: { type: Boolean, default: false }
  },
  
  // Review and Investigation
  review: {
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    reviewedAt: Date,
    reviewNotes: String,
    reviewDecision: {
      type: String,
      enum: ['approved', 'rejected', 'escalated', 'no_action_needed']
    },
    escalatedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    escalatedAt: Date,
    incidentId: String
  },
  
  // Relationships
  relationships: {
    parentEventId: String,
    childEventIds: [String],
    relatedEventIds: [{
      eventId: String,
      relationship: String,
      description: String
    }],
    correlationId: String,
    traceId: String,
    spanId: String,
    conversationId: String
  },
  
  // Performance Metrics
  performance: {
    duration: Number, // Total operation duration in ms
    databaseQueries: Number,
    databaseTime: Number, // ms spent in database
    cacheHits: Number,
    cacheMisses: Number,
    externalApiCalls: Number,
    externalApiTime: Number, // ms spent in external APIs
    memoryUsed: Number, // in bytes
    cpuUsage: Number // percentage
  },
  
  // Success/Failure Information
  result: {
    success: { type: Boolean, default: true },
    errorType: String,
    errorMessage: String,
    errorCode: String,
    errorStack: String,
    retryCount: Number,
    failureReason: String
  },
  
  // Retention and Archival
  retention: {
    policy: String,
    retentionPeriod: Number, // in days
    retentionDate: {
      type: Date,
      index: true
    },
    archivalStatus: {
      type: String,
      enum: ['active', 'archived', 'deleted', 'pending_deletion']
    },
    archivalDate: Date,
    deletionDate: Date
  },
  
  // Timestamps
  timestamp: {
    type: Date,
    default: Date.now,
    required: true,
    index: true
  },
  receivedAt: {
    type: Date,
    default: Date.now
  },
  processedAt: Date
}, { 
  timestamps: true,
  // Optimize for time-series data
  timeseries: {
    timeField: 'timestamp',
    metaField: 'metadata',
    granularity: 'seconds'
  }
});

// Indexes for efficient querying
auditLogSchema.index({ tenantId: 1, timestamp: -1 });
auditLogSchema.index({ tenantId: 1, action: 1, timestamp: -1 });
auditLogSchema.index({ tenantId: 1, 'actor.userId': 1, timestamp: -1 });
auditLogSchema.index({ tenantId: 1, 'resource.type': 1, 'resource.id': 1, timestamp: -1 });
auditLogSchema.index({ tenantId: 1, 'security.severity': 1, timestamp: -1 });
auditLogSchema.index({ tenantId: 1, 'flags.suspicious': 1, timestamp: -1 });
auditLogSchema.index({ tenantId: 1, 'flags.requiresReview': 1, timestamp: -1 });
auditLogSchema.index({ tenantId: 1, tags: 1, timestamp: -1 });
auditLogSchema.index({ tenantId: 1, 'request.endpoint': 1, timestamp: -1 });
auditLogSchema.index({ tenantId: 1, 'compliance.isGdprRelated': 1, timestamp: -1 });
auditLogSchema.index({ 'relationships.correlationId': 1 });
auditLogSchema.index({ 'retention.retentionDate': 1 }, { expireAfterSeconds: 0 });

// Virtual fields
auditLogSchema.virtual('formattedTimestamp').get(function() {
  return this.timestamp.toISOString();
});

auditLogSchema.virtual('durationFormatted').get(function() {
  if (!this.performance?.duration) return null;
  const ms = this.performance.duration;
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(2)}s`;
  return `${(ms / 60000).toFixed(2)}m`;
});

// Methods
auditLogSchema.methods.redactSensitiveData = function() {
  const sensitiveFields = ['password', 'token', 'apiKey', 'secret', 'creditCard', 'ssn', 'bankAccount', 'pin', 'cvv'];
  
  // Helper function to redact
  const redactValue = (obj, path = '') => {
    if (!obj || typeof obj !== 'object') return obj;
    
    const redacted = Array.isArray(obj) ? [] : {};
    
    for (const [key, value] of Object.entries(obj)) {
      const fullPath = path ? `${path}.${key}` : key;
      
      if (sensitiveFields.some(field => key.toLowerCase().includes(field.toLowerCase()))) {
        redacted[key] = '[REDACTED]';
      } else if (typeof value === 'object' && value !== null) {
        redacted[key] = redactValue(value, fullPath);
      } else {
        redacted[key] = value;
      }
    }
    
    return redacted;
  };
  
  // Redact request body
  if (this.request?.body) {
    this.request.body = redactValue(this.request.body);
  }
  
  // Redact response body
  if (this.request?.responseBody) {
    this.request.responseBody = redactValue(this.request.responseBody);
  }
  
  // Redact changes
  if (this.changes) {
    this.changes = this.changes.map(change => ({
      ...change,
      oldValue: sensitiveFields.some(f => change.field.toLowerCase().includes(f.toLowerCase())) 
        ? '[REDACTED]' : change.oldValue,
      newValue: sensitiveFields.some(f => change.field.toLowerCase().includes(f.toLowerCase())) 
        ? '[REDACTED]' : change.newValue
    }));
  }
  
  return this;
};

auditLogSchema.methods.calculateRiskScore = function() {
  let score = 0;
  const factors = [];
  
  // Base score by action type
  if (this.action.includes('delete')) score += 20;
  if (this.action.includes('bulk')) score += 15;
  if (this.action.includes('export')) score += 10;
  if (this.action.includes('permission') || this.action.includes('role')) score += 25;
  if (this.action.includes('security')) score += 30;
  if (this.action.includes('failed')) score += 15;
  
  // Time-based factors
  const hour = new Date(this.timestamp).getHours();
  if (hour < 6 || hour > 22) {
    score += 10;
    factors.push({ factor: 'unusual_hours', weight: 10, description: 'Activity outside business hours' });
  }
  
  // Location-based factors
  if (this.context?.location?.country && this.context.location.country !== 'AE') {
    score += 15;
    factors.push({ factor: 'foreign_access', weight: 15, description: 'Access from foreign location' });
  }
  
  // Volume-based factors
  if (this.changes?.length > 50) {
    score += 20;
    factors.push({ factor: 'high_volume_changes', weight: 20, description: 'Large number of changes' });
  }
  
  // Error-based factors
  if (!this.result?.success) {
    score += 10;
    factors.push({ factor: 'operation_failed', weight: 10, description: 'Failed operation' });
  }
  
  // Compliance factors
  if (this.compliance?.isPiiAccess) score += 15;
  if (this.compliance?.isFinancialData) score += 20;
  if (this.compliance?.crossBorderTransfer) score += 25;
  
  // Normalize score to 0-100
  score = Math.min(100, score);
  
  // Determine severity
  let severity = 'info';
  if (score >= 20) severity = 'low';
  if (score >= 40) severity = 'medium';
  if (score >= 60) severity = 'high';
  if (score >= 80) severity = 'critical';
  
  this.security = {
    ...this.security,
    riskScore: score,
    riskFactors: factors,
    severity: severity
  };
  
  return this;
};

auditLogSchema.methods.checkAnomaly = async function() {
  // Check for anomalous behavior based on historical patterns
  const Model = this.constructor;
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  
  // Get user's typical activity pattern
  const userActivity = await Model.aggregate([
    {
      $match: {
        tenantId: this.tenantId,
        'actor.userId': this.actor.userId,
        timestamp: { $gte: oneDayAgo }
      }
    },
    {
      $group: {
        _id: {
          hour: { $hour: '$timestamp' },
          action: '$action'
        },
        count: { $sum: 1 }
      }
    }
  ]);
  
  // Simple anomaly detection
  const currentHour = new Date(this.timestamp).getHours();
  const similarActivity = userActivity.find(a => 
    a._id.hour === currentHour && a._id.action === this.action
  );
  
  const avgCount = userActivity.reduce((sum, a) => sum + a.count, 0) / userActivity.length || 1;
  const isAnomaly = !similarActivity || similarActivity.count > avgCount * 3;
  
  if (isAnomaly) {
    this.security.isAnomaly = true;
    this.security.anomalyScore = similarActivity ? similarActivity.count / avgCount : 100;
    this.flags.suspicious = true;
    this.flags.requiresReview = true;
  }
  
  return this;
};

// Static methods
auditLogSchema.statics.logEvent = async function(eventData) {
  try {
    // Generate unique event ID
    if (!eventData.eventId) {
      eventData.eventId = `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    
    // Determine category from action
    const actionPrefix = eventData.action.split('.')[0];
    const categoryMap = {
      'auth': 'authentication',
      'user': 'user_management',
      'data': 'data_modification',
      'system': 'system_operation',
      'security': 'security',
      'order': 'business_operation',
      'payment': 'business_operation',
      'table': 'business_operation',
      'menu': 'business_operation',
      'compliance': 'compliance',
      'api': 'api_operation',
      'report': 'reporting',
      'analytics': 'reporting'
    };
    
    if (!eventData.category) {
      eventData.category = categoryMap[actionPrefix] || 'system_operation';
    }
    
    // Set retention policy
    let retentionDays = 90; // Default 90 days
    
    if (eventData.security?.severity === 'critical') {
      retentionDays = 730; // 2 years for critical events
    } else if (eventData.compliance?.isGdprRelated || eventData.compliance?.regulations?.length > 0) {
      retentionDays = 2555; // 7 years for compliance events
    } else if (eventData.category === 'security' || eventData.category === 'authentication') {
      retentionDays = 365; // 1 year for security events
    }
    
    eventData.retention = {
      policy: 'standard',
      retentionPeriod: retentionDays,
      retentionDate: new Date(Date.now() + retentionDays * 24 * 60 * 60 * 1000),
      archivalStatus: 'active'
    };
    
    // Create log entry
    const log = new this(eventData);
    
    // Calculate risk score
    log.calculateRiskScore();
    
    // Check for anomalies
    await log.checkAnomaly();
    
    // Save the log
    await log.save();
    
    // Emit real-time event
    const io = global.io;
    if (io) {
      // Emit full audit log for real-time monitoring
      io.to(`tenant:${eventData.tenantId}`).emit('audit-log', log.toObject());
      
      // Also emit legacy format for backward compatibility
      io.to(`tenant:${eventData.tenantId}`).emit('audit:new', {
        eventId: log.eventId,
        action: log.action,
        actor: log.actor,
        resource: log.resource,
        severity: log.security.severity,
        timestamp: log.timestamp
      });
      
      // Emit high-priority alerts
      if (log.security.severity === 'critical' || log.flags.suspicious) {
        io.to(`tenant:${eventData.tenantId}:admins`).emit('audit:alert', {
          eventId: log.eventId,
          message: `Critical security event: ${log.action}`,
          severity: log.security.severity,
          actor: log.actor,
          timestamp: log.timestamp
        });
      }
    }
    
    return log;
  } catch (error) {
    console.error('Failed to create audit log:', error);
    // Don't throw - audit logging should not break the application
    return null;
  }
};

// Advanced query methods
auditLogSchema.statics.search = async function(tenantId, filters = {}) {
  const query = { tenantId };
  
  // Time range
  if (filters.startDate || filters.endDate) {
    query.timestamp = {};
    if (filters.startDate) query.timestamp.$gte = new Date(filters.startDate);
    if (filters.endDate) query.timestamp.$lte = new Date(filters.endDate);
  }
  
  // Action filter
  if (filters.action) {
    if (Array.isArray(filters.action)) {
      query.action = { $in: filters.action };
    } else if (filters.action.includes('*')) {
      query.action = new RegExp(filters.action.replace('*', '.*'));
    } else {
      query.action = filters.action;
    }
  }
  
  // Category filter
  if (filters.category) {
    query.category = Array.isArray(filters.category) 
      ? { $in: filters.category } 
      : filters.category;
  }
  
  // Actor filters
  if (filters.actorId) query['actor.userId'] = filters.actorId;
  if (filters.actorEmail) query['actor.email'] = filters.actorEmail;
  if (filters.actorType) query['actor.type'] = filters.actorType;
  
  // Resource filters
  if (filters.resourceType) query['resource.type'] = filters.resourceType;
  if (filters.resourceId) query['resource.id'] = filters.resourceId;
  
  // Security filters
  if (filters.severity) query['security.severity'] = { $in: Array.isArray(filters.severity) ? filters.severity : [filters.severity] };
  if (filters.minRiskScore) query['security.riskScore'] = { $gte: filters.minRiskScore };
  
  // Flags
  if (filters.suspicious !== undefined) query['flags.suspicious'] = filters.suspicious;
  if (filters.requiresReview !== undefined) query['flags.requiresReview'] = filters.requiresReview;
  if (filters.reviewed !== undefined) query['flags.reviewed'] = filters.reviewed;
  
  // Compliance
  if (filters.gdprOnly) query['compliance.isGdprRelated'] = true;
  if (filters.complianceRegulation) query['compliance.regulations.type'] = filters.complianceRegulation;
  
  // Tags
  if (filters.tags) query.tags = { $in: Array.isArray(filters.tags) ? filters.tags : [filters.tags] };
  
  // Text search
  if (filters.search) {
    query.$or = [
      { action: new RegExp(filters.search, 'i') },
      { 'actor.name': new RegExp(filters.search, 'i') },
      { 'actor.email': new RegExp(filters.search, 'i') },
      { 'resource.name': new RegExp(filters.search, 'i') },
      { 'request.endpoint': new RegExp(filters.search, 'i') }
    ];
  }
  
  // Build query
  let queryBuilder = this.find(query);
  
  // Sorting
  const sortField = filters.sortBy || 'timestamp';
  const sortOrder = filters.sortOrder === 'asc' ? 1 : -1;
  queryBuilder = queryBuilder.sort({ [sortField]: sortOrder });
  
  // Pagination
  if (filters.limit) queryBuilder = queryBuilder.limit(filters.limit);
  if (filters.skip) queryBuilder = queryBuilder.skip(filters.skip);
  
  // Population
  if (filters.populate) {
    if (filters.populate.includes('actor')) {
      queryBuilder = queryBuilder.populate('actor.userId', 'name email role');
    }
    if (filters.populate.includes('reviewer')) {
      queryBuilder = queryBuilder.populate('review.reviewedBy', 'name email');
    }
  }
  
  return queryBuilder.exec();
};

auditLogSchema.statics.getStats = async function(tenantId, timeRange) {
  const pipeline = [
    { 
      $match: { 
        tenantId,
        timestamp: { $gte: timeRange.start, $lte: timeRange.end }
      }
    },
    {
      $facet: {
        overview: [
          {
            $group: {
              _id: null,
              totalEvents: { $sum: 1 },
              failedEvents: { $sum: { $cond: [{ $eq: ['$result.success', false] }, 1, 0] } },
              suspiciousEvents: { $sum: { $cond: ['$flags.suspicious', 1, 0] } },
              avgResponseTime: { $avg: '$request.responseTime' },
              avgRiskScore: { $avg: '$security.riskScore' }
            }
          }
        ],
        byAction: [
          { $group: { _id: '$action', count: { $sum: 1 } } },
          { $sort: { count: -1 } },
          { $limit: 20 }
        ],
        byCategory: [
          { $group: { _id: '$category', count: { $sum: 1 } } },
          { $sort: { count: -1 } }
        ],
        bySeverity: [
          { $group: { _id: '$security.severity', count: { $sum: 1 } } },
          { $sort: { _id: 1 } }
        ],
        byActor: [
          { 
            $group: { 
              _id: '$actor.userId',
              name: { $first: '$actor.name' },
              email: { $first: '$actor.email' },
              count: { $sum: 1 },
              actions: { $addToSet: '$action' }
            }
          },
          { $sort: { count: -1 } },
          { $limit: 10 }
        ],
        byResource: [
          { $group: { _id: '$resource.type', count: { $sum: 1 } } },
          { $sort: { count: -1 } }
        ],
        timeline: [
          {
            $group: {
              _id: {
                $dateToString: {
                  format: '%Y-%m-%d %H:00',
                  date: '$timestamp'
                }
              },
              count: { $sum: 1 },
              failures: { $sum: { $cond: [{ $eq: ['$result.success', false] }, 1, 0] } }
            }
          },
          { $sort: { _id: 1 } }
        ],
        topErrors: [
          { $match: { 'result.success': false } },
          { $group: { 
            _id: '$result.errorCode',
            message: { $first: '$result.errorMessage' },
            count: { $sum: 1 }
          }},
          { $sort: { count: -1 } },
          { $limit: 10 }
        ],
        riskDistribution: [
          {
            $bucket: {
              groupBy: '$security.riskScore',
              boundaries: [0, 20, 40, 60, 80, 100],
              default: 'Unknown',
              output: { count: { $sum: 1 } }
            }
          }
        ]
      }
    }
  ];
  
  const [stats] = await this.aggregate(pipeline);
  return stats;
};

auditLogSchema.statics.getUserActivitySummary = async function(tenantId, userId, days = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  
  return this.aggregate([
    {
      $match: {
        tenantId,
        'actor.userId': userId,
        timestamp: { $gte: startDate }
      }
    },
    {
      $group: {
        _id: {
          date: { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } },
          action: '$action'
        },
        count: { $sum: 1 }
      }
    },
    {
      $group: {
        _id: '$_id.date',
        activities: {
          $push: {
            action: '$_id.action',
            count: '$count'
          }
        },
        totalActions: { $sum: '$count' }
      }
    },
    { $sort: { _id: -1 } }
  ]);
};

auditLogSchema.statics.getComplianceReport = async function(tenantId, regulation, timeRange) {
  const query = {
    tenantId,
    timestamp: { $gte: timeRange.start, $lte: timeRange.end }
  };
  
  if (regulation === 'GDPR') {
    query['compliance.isGdprRelated'] = true;
  } else {
    query['compliance.regulations.type'] = regulation;
  }
  
  return this.aggregate([
    { $match: query },
    {
      $group: {
        _id: '$action',
        count: { $sum: 1 },
        actors: { $addToSet: '$actor.email' },
        resources: { $addToSet: { type: '$resource.type', id: '$resource.id' } },
        dataSubjectsAffected: { $sum: '$compliance.dataSubjects' }
      }
    },
    { $sort: { count: -1 } }
  ]);
};

module.exports = mongoose.model('AuditLog', auditLogSchema);