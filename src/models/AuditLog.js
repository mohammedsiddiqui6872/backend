const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  tenantId: { 
    type: String, 
    required: true, 
    index: true 
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    index: true
  },
  userEmail: String,
  userName: String,
  action: {
    type: String,
    required: true,
    index: true
  },
  category: {
    type: String,
    enum: [
      'authentication',
      'data_access',
      'data_modification',
      'data_deletion',
      'consent_management',
      'security',
      'compliance',
      'system',
      'configuration',
      'export'
    ],
    required: true,
    index: true
  },
  resourceType: {
    type: String,
    index: true
  },
  resourceId: {
    type: String,
    index: true
  },
  details: {
    method: String,
    endpoint: String,
    statusCode: Number,
    requestBody: mongoose.Schema.Types.Mixed,
    responseBody: mongoose.Schema.Types.Mixed,
    previousValue: mongoose.Schema.Types.Mixed,
    newValue: mongoose.Schema.Types.Mixed,
    reason: String,
    additionalInfo: mongoose.Schema.Types.Mixed
  },
  metadata: {
    ipAddress: String,
    userAgent: String,
    location: {
      country: String,
      region: String,
      city: String
    },
    sessionId: String,
    requestId: String,
    correlationId: String
  },
  risk: {
    level: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'low'
    },
    factors: [String],
    score: Number
  },
  compliance: {
    isGdprRelated: Boolean,
    isPiiAccess: Boolean,
    isSensitiveOperation: Boolean,
    regulations: [String]
  },
  duration: Number, // in milliseconds
  success: {
    type: Boolean,
    default: true
  },
  error: {
    code: String,
    message: String,
    stack: String
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  }
}, { 
  timestamps: false // We use custom timestamp field
});

// Indexes for efficient querying
auditLogSchema.index({ tenantId: 1, timestamp: -1 });
auditLogSchema.index({ tenantId: 1, userId: 1, timestamp: -1 });
auditLogSchema.index({ tenantId: 1, category: 1, timestamp: -1 });
auditLogSchema.index({ tenantId: 1, 'compliance.isGdprRelated': 1, timestamp: -1 });

// Virtual for formatted timestamp
auditLogSchema.virtual('formattedTimestamp').get(function() {
  return this.timestamp.toISOString();
});

// Method to determine if log entry contains PII
auditLogSchema.methods.containsPII = function() {
  const piiFields = ['email', 'phone', 'address', 'ssn', 'creditCard', 'bankAccount'];
  const dataString = JSON.stringify(this.details);
  
  return piiFields.some(field => dataString.toLowerCase().includes(field));
};

// Static method to create audit log
auditLogSchema.statics.createLog = async function(data) {
  // Enhance with risk assessment
  const riskFactors = [];
  let riskLevel = 'low';
  
  // Assess risk based on action
  if (data.category === 'data_deletion' || data.action.includes('delete')) {
    riskFactors.push('deletion_operation');
    riskLevel = 'medium';
  }
  
  if (data.category === 'security' || data.action.includes('permission')) {
    riskFactors.push('security_operation');
    riskLevel = 'high';
  }
  
  if (data.details?.requestBody?.password || data.details?.previousValue?.password) {
    riskFactors.push('password_operation');
    riskLevel = 'high';
  }
  
  // Check for mass operations
  if (data.details?.affectedRecords > 100) {
    riskFactors.push('mass_operation');
    riskLevel = 'high';
  }
  
  // Add risk assessment
  data.risk = {
    level: riskLevel,
    factors: riskFactors,
    score: riskFactors.length * 25
  };
  
  // Check compliance flags
  data.compliance = {
    isGdprRelated: ['consent_management', 'data_deletion', 'export'].includes(data.category),
    isPiiAccess: data.details?.requestBody?.email || data.details?.responseBody?.email || false,
    isSensitiveOperation: ['security', 'compliance', 'data_deletion'].includes(data.category),
    regulations: []
  };
  
  if (data.compliance.isGdprRelated) {
    data.compliance.regulations.push('GDPR');
  }
  
  return this.create(data);
};

// Query methods
auditLogSchema.statics.getGdprLogs = async function(tenantId, startDate, endDate) {
  return this.find({
    tenantId,
    'compliance.isGdprRelated': true,
    timestamp: {
      $gte: startDate,
      $lte: endDate
    }
  }).sort({ timestamp: -1 });
};

auditLogSchema.statics.getUserActivityLogs = async function(tenantId, userId, startDate, endDate) {
  return this.find({
    tenantId,
    userId,
    timestamp: {
      $gte: startDate,
      $lte: endDate
    }
  }).sort({ timestamp: -1 });
};

auditLogSchema.statics.getHighRiskLogs = async function(tenantId, hours = 24) {
  const startDate = new Date();
  startDate.setHours(startDate.getHours() - hours);
  
  return this.find({
    tenantId,
    'risk.level': { $in: ['high', 'critical'] },
    timestamp: { $gte: startDate }
  }).sort({ timestamp: -1 });
};

module.exports = mongoose.model('AuditLog', auditLogSchema);