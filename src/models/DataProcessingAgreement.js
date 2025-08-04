const mongoose = require('mongoose');

const dataProcessingAgreementSchema = new mongoose.Schema({
  tenantId: {
    type: String,
    required: true,
    index: true
  },
  processorName: {
    type: String,
    required: true
  },
  processorType: {
    type: String,
    enum: ['payment_processor', 'cloud_provider', 'analytics_provider', 'email_provider', 'sms_provider', 'marketing_platform', 'other'],
    required: true
  },
  agreementDate: {
    type: Date,
    required: true
  },
  expiryDate: {
    type: Date,
    required: false
  },
  dataCategories: [{
    type: String,
    enum: ['personal_data', 'payment_data', 'location_data', 'contact_data', 'behavioral_data', 'health_data', 'biometric_data']
  }],
  processingPurposes: [{
    type: String,
    enum: ['service_provision', 'payment_processing', 'analytics', 'marketing', 'support', 'legal_compliance', 'security']
  }],
  securityMeasures: {
    encryption: {
      type: Boolean,
      default: false
    },
    accessControl: {
      type: Boolean,
      default: false
    },
    dataMinimization: {
      type: Boolean,
      default: false
    },
    regularAudits: {
      type: Boolean,
      default: false
    },
    incidentResponse: {
      type: Boolean,
      default: false
    },
    certifications: [String]
  },
  subProcessors: [{
    name: String,
    purpose: String,
    location: String
  }],
  dataTransfers: {
    hasInternationalTransfers: {
      type: Boolean,
      default: false
    },
    transferMechanisms: [{
      type: String,
      enum: ['scc', 'bcr', 'adequacy_decision', 'derogations', 'certification']
    }],
    countries: [String]
  },
  auditRights: {
    allowsAudits: {
      type: Boolean,
      default: true
    },
    auditFrequency: {
      type: String,
      enum: ['annually', 'bi-annually', 'quarterly', 'on-demand']
    },
    lastAuditDate: Date,
    nextAuditDate: Date
  },
  liabilityTerms: {
    liabilityCap: Number,
    indemnification: {
      type: Boolean,
      default: false
    },
    insuranceRequired: {
      type: Boolean,
      default: false
    },
    insuranceAmount: Number
  },
  contact: {
    name: String,
    email: String,
    phone: String,
    dpoEmail: String
  },
  documentUrl: String,
  signedDocumentHash: String,
  status: {
    type: String,
    enum: ['draft', 'pending_signature', 'active', 'expired', 'terminated'],
    default: 'draft'
  },
  terminationDate: Date,
  terminationReason: String,
  notes: String,
  version: {
    type: String,
    default: '1.0'
  },
  reviewSchedule: {
    frequency: {
      type: String,
      enum: ['monthly', 'quarterly', 'semi-annually', 'annually'],
      default: 'annually'
    },
    lastReviewDate: Date,
    nextReviewDate: Date
  }
}, {
  timestamps: true
});

// Indexes
dataProcessingAgreementSchema.index({ tenantId: 1, processorName: 1 });
dataProcessingAgreementSchema.index({ tenantId: 1, status: 1 });
dataProcessingAgreementSchema.index({ expiryDate: 1, status: 1 });

// Methods
dataProcessingAgreementSchema.methods.isActive = function() {
  return this.status === 'active' && 
         (!this.expiryDate || this.expiryDate > new Date());
};

dataProcessingAgreementSchema.methods.needsReview = function() {
  if (!this.reviewSchedule.nextReviewDate) return false;
  return new Date() > this.reviewSchedule.nextReviewDate;
};

dataProcessingAgreementSchema.methods.terminate = function(reason) {
  this.status = 'terminated';
  this.terminationDate = new Date();
  this.terminationReason = reason;
  return this.save();
};

// Statics
dataProcessingAgreementSchema.statics.findActiveByTenant = function(tenantId) {
  return this.find({
    tenantId,
    status: 'active',
    $or: [
      { expiryDate: { $exists: false } },
      { expiryDate: { $gt: new Date() } }
    ]
  });
};

dataProcessingAgreementSchema.statics.findExpiring = function(daysAhead = 30) {
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + daysAhead);
  
  return this.find({
    status: 'active',
    expiryDate: {
      $exists: true,
      $lte: futureDate,
      $gt: new Date()
    }
  });
};

dataProcessingAgreementSchema.statics.findNeedingReview = function() {
  return this.find({
    status: 'active',
    'reviewSchedule.nextReviewDate': { $lte: new Date() }
  });
};

const DataProcessingAgreement = mongoose.model('DataProcessingAgreement', dataProcessingAgreementSchema);

module.exports = DataProcessingAgreement;