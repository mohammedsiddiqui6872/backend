// src/models/Feedback.js
const mongoose = require('mongoose');
const encryptionService = require('../services/encryption.service');

const feedbackSchema = new mongoose.Schema({
  tableNumber: {
    type: String,
    required: true
  },
  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order'
  },
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5
  },
  foodQuality: {
    type: Number,
    required: true,
    min: 1,
    max: 5
  },
  serviceQuality: {
    type: Number,
    required: true,
    min: 1,
    max: 5
  },
  ambience: {
    type: Number,
    required: true,
    min: 1,
    max: 5
  },
  cleanliness: {
    type: Number,
    required: true,
    min: 1,
    max: 5
  },
  comment: {
    type: String,
    maxlength: 500
  },
  customerName: {
    type: String,
    default: null
  },
  customerContact: {
    type: String,
    default: null
  },
  customerContactEncrypted: {
    type: String,
    default: null
  },
  customerContactHash: {
    type: String,
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Calculate average rating
feedbackSchema.virtual('averageRating').get(function() {
  return ((this.rating + this.foodQuality + this.serviceQuality + this.ambience + this.cleanliness) / 5).toFixed(1);
});

// Encryption middleware
feedbackSchema.pre('save', function(next) {
  if (this.isModified('customerContact') && this.customerContact) {
    this.customerContactEncrypted = encryptionService.encrypt(this.customerContact);
    this.customerContactHash = encryptionService.hash(this.customerContact);
    // Mask the contact - could be phone or email
    if (this.customerContact.includes('@')) {
      this.customerContact = encryptionService.maskEmail(this.customerContact);
    } else {
      this.customerContact = encryptionService.mask(this.customerContact, 4, 2);
    }
  }
  next();
});

// Method to get decrypted contact
feedbackSchema.methods.getDecryptedContact = function() {
  if (!this.customerContactEncrypted) return null;
  try {
    return encryptionService.decrypt(this.customerContactEncrypted);
  } catch (error) {
    console.error('Failed to decrypt contact:', error);
    return this.customerContact;
  }
};

// Add indexes for better query performance
feedbackSchema.index({ tableNumber: 1, createdAt: -1 });
feedbackSchema.index({ orderId: 1 });
feedbackSchema.index({ rating: 1 });
feedbackSchema.index({ createdAt: -1 });
feedbackSchema.index({ foodQuality: 1, serviceQuality: 1, ambience: 1, cleanliness: 1 });
feedbackSchema.index({ customerContactHash: 1 });

module.exports = mongoose.model('Feedback', feedbackSchema);