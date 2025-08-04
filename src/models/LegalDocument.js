const mongoose = require('mongoose');

const legalDocumentSchema = new mongoose.Schema({
  tenantId: { 
    type: String, 
    required: true, 
    index: true 
  },
  type: {
    type: String,
    enum: ['terms_of_service', 'privacy_policy', 'cookie_policy', 'data_processing_agreement', 'gdpr_notice'],
    required: true
  },
  version: {
    type: String,
    required: true
  },
  title: {
    type: String,
    required: true
  },
  content: {
    type: String,
    required: true
  },
  contentHtml: {
    type: String,
    required: true
  },
  language: {
    type: String,
    default: 'en',
    enum: ['en', 'ar', 'fr', 'es', 'de', 'it', 'zh', 'ja', 'hi', 'ur']
  },
  effectiveDate: {
    type: Date,
    required: true
  },
  expiryDate: {
    type: Date
  },
  isActive: {
    type: Boolean,
    default: true
  },
  requiresAcceptance: {
    type: Boolean,
    default: true
  },
  metadata: {
    author: String,
    approvedBy: String,
    approvalDate: Date,
    lastReviewDate: Date,
    nextReviewDate: Date,
    changes: [{
      date: Date,
      description: String,
      author: String
    }]
  },
  customSections: [{
    title: String,
    content: String,
    order: Number
  }],
  jurisdiction: {
    country: String,
    state: String,
    applicableLaws: [String]
  }
}, { 
  timestamps: true 
});

// Indexes
legalDocumentSchema.index({ tenantId: 1, type: 1, language: 1, isActive: 1 });
legalDocumentSchema.index({ effectiveDate: 1 });

// Get active document
legalDocumentSchema.statics.getActiveDocument = async function(tenantId, type, language = 'en') {
  return this.findOne({
    tenantId,
    type,
    language,
    isActive: true,
    effectiveDate: { $lte: new Date() },
    $or: [
      { expiryDate: null },
      { expiryDate: { $gt: new Date() } }
    ]
  }).sort({ version: -1 });
};

// Archive old versions
legalDocumentSchema.methods.archive = async function() {
  // Deactivate all other versions of this document type
  await this.constructor.updateMany(
    {
      tenantId: this.tenantId,
      type: this.type,
      language: this.language,
      _id: { $ne: this._id }
    },
    { isActive: false }
  );
};

module.exports = mongoose.model('LegalDocument', legalDocumentSchema);