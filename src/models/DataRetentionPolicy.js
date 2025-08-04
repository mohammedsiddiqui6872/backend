const mongoose = require('mongoose');

const dataRetentionPolicySchema = new mongoose.Schema({
  tenantId: { 
    type: String, 
    required: true, 
    index: true 
  },
  dataType: {
    type: String,
    enum: [
      'customer_data',
      'order_history',
      'payment_records',
      'analytics_data',
      'audit_logs',
      'employee_data',
      'session_data',
      'feedback_data',
      'marketing_data',
      'security_logs',
      'backup_data'
    ],
    required: true
  },
  retentionPeriod: {
    value: {
      type: Number,
      required: true
    },
    unit: {
      type: String,
      enum: ['days', 'months', 'years'],
      required: true
    }
  },
  description: {
    type: String,
    required: true
  },
  legalBasis: {
    type: String,
    enum: [
      'legal_obligation',
      'legitimate_interest',
      'consent',
      'contract_fulfillment',
      'vital_interests',
      'public_task'
    ],
    required: true
  },
  actionOnExpiry: {
    type: String,
    enum: ['delete', 'anonymize', 'archive', 'review'],
    default: 'delete'
  },
  exceptions: [{
    condition: String,
    additionalPeriod: {
      value: Number,
      unit: String
    },
    reason: String
  }],
  automatedDeletion: {
    type: Boolean,
    default: false
  },
  notificationSettings: {
    enabled: Boolean,
    daysBefore: Number,
    recipients: [String]
  },
  complianceReferences: [{
    regulation: String,
    article: String,
    requirement: String
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  lastExecuted: Date,
  nextExecution: Date
}, { 
  timestamps: true 
});

// Calculate retention end date
dataRetentionPolicySchema.methods.calculateRetentionEndDate = function(fromDate) {
  const date = new Date(fromDate);
  const { value, unit } = this.retentionPeriod;
  
  switch (unit) {
    case 'days':
      date.setDate(date.getDate() + value);
      break;
    case 'months':
      date.setMonth(date.getMonth() + value);
      break;
    case 'years':
      date.setFullYear(date.getFullYear() + value);
      break;
  }
  
  return date;
};

// Check if data should be retained
dataRetentionPolicySchema.methods.shouldRetain = function(dataDate, context = {}) {
  const retentionEndDate = this.calculateRetentionEndDate(dataDate);
  
  // Check exceptions
  for (const exception of this.exceptions) {
    if (this.evaluateException(exception, context)) {
      const exceptionDate = new Date(retentionEndDate);
      switch (exception.additionalPeriod.unit) {
        case 'days':
          exceptionDate.setDate(exceptionDate.getDate() + exception.additionalPeriod.value);
          break;
        case 'months':
          exceptionDate.setMonth(exceptionDate.getMonth() + exception.additionalPeriod.value);
          break;
        case 'years':
          exceptionDate.setFullYear(exceptionDate.getFullYear() + exception.additionalPeriod.value);
          break;
      }
      return new Date() < exceptionDate;
    }
  }
  
  return new Date() < retentionEndDate;
};

// Evaluate exception conditions
dataRetentionPolicySchema.methods.evaluateException = function(exception, context) {
  // Simple evaluation - in production, use a proper expression evaluator
  try {
    const condition = exception.condition;
    // Example: "hasLegalHold === true" or "isUnderInvestigation === true"
    const func = new Function('context', `return ${condition}`);
    return func(context);
  } catch (error) {
    console.error('Error evaluating exception:', error);
    return false;
  }
};

// Get all active policies for a tenant
dataRetentionPolicySchema.statics.getActivePolicies = async function(tenantId) {
  return this.find({ tenantId, isActive: true });
};

module.exports = mongoose.model('DataRetentionPolicy', dataRetentionPolicySchema);