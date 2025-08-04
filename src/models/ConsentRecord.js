const mongoose = require('mongoose');

const consentRecordSchema = new mongoose.Schema({
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
  customerSessionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CustomerSession',
    index: true
  },
  email: {
    type: String,
    index: true
  },
  consentType: {
    type: String,
    enum: [
      'terms_of_service',
      'privacy_policy',
      'cookie_consent',
      'marketing_emails',
      'data_processing',
      'third_party_sharing',
      'analytics',
      'personalization',
      'location_tracking'
    ],
    required: true
  },
  status: {
    type: String,
    enum: ['granted', 'denied', 'withdrawn'],
    required: true
  },
  version: {
    type: String,
    required: true
  },
  legalDocumentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'LegalDocument'
  },
  ipAddress: {
    type: String,
    required: true
  },
  userAgent: {
    type: String,
    required: true
  },
  location: {
    country: String,
    region: String,
    city: String
  },
  consentMethod: {
    type: String,
    enum: ['checkbox', 'button_click', 'scroll', 'api', 'imported', 'verbal', 'written'],
    required: true
  },
  consentContext: {
    page: String,
    action: String,
    referrer: String
  },
  expiryDate: Date,
  metadata: {
    source: String,
    campaign: String,
    additionalInfo: mongoose.Schema.Types.Mixed
  },
  withdrawalDate: Date,
  withdrawalReason: String
}, { 
  timestamps: true 
});

// Indexes
consentRecordSchema.index({ tenantId: 1, userId: 1, consentType: 1 });
consentRecordSchema.index({ tenantId: 1, email: 1, consentType: 1 });
consentRecordSchema.index({ createdAt: 1 });
consentRecordSchema.index({ expiryDate: 1 });

// Check if consent is valid
consentRecordSchema.methods.isValid = function() {
  if (this.status !== 'granted') return false;
  if (this.expiryDate && this.expiryDate < new Date()) return false;
  if (this.withdrawalDate) return false;
  return true;
};

// Withdraw consent
consentRecordSchema.methods.withdraw = async function(reason) {
  this.status = 'withdrawn';
  this.withdrawalDate = new Date();
  this.withdrawalReason = reason;
  return this.save();
};

// Get active consent
consentRecordSchema.statics.getActiveConsent = async function(tenantId, identifier, consentType) {
  const query = {
    tenantId,
    consentType,
    status: 'granted',
    withdrawalDate: null
  };

  if (identifier.userId) {
    query.userId = identifier.userId;
  } else if (identifier.email) {
    query.email = identifier.email;
  } else if (identifier.customerSessionId) {
    query.customerSessionId = identifier.customerSessionId;
  }

  const consent = await this.findOne(query).sort({ createdAt: -1 });
  
  if (consent && consent.isValid()) {
    return consent;
  }
  
  return null;
};

// Record new consent
consentRecordSchema.statics.recordConsent = async function(data) {
  // Invalidate any previous consents of the same type
  const query = {
    tenantId: data.tenantId,
    consentType: data.consentType
  };

  if (data.userId) {
    query.userId = data.userId;
  } else if (data.email) {
    query.email = data.email;
  } else if (data.customerSessionId) {
    query.customerSessionId = data.customerSessionId;
  }

  await this.updateMany(
    query,
    { $set: { withdrawalDate: new Date(), withdrawalReason: 'Superseded by new consent' } }
  );

  // Create new consent record
  return this.create(data);
};

module.exports = mongoose.model('ConsentRecord', consentRecordSchema);