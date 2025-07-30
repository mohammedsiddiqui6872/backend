// src/models/MenuItem.js
const mongoose = require('mongoose');

const menuItemSchema = new mongoose.Schema({
  tenantId: { type: String, required: true, index: true },
  id: { type: Number, required: true },
  name: { type: String, required: true },
  nameAr: String, // Arabic name
  category: {
    type: String,
    required:true,
  },
  price: { type: Number, required: true, min: 0 },
  cost: { type: Number, min: 0 }, // Cost price for profit calculation
  description: { type: String, required: true },
  descriptionAr: String,
  image: String,
  images: {
    type: [{
      type: String,
      trim: true
    }],
    default: []
  }, // Multiple images
  available: { type: Boolean, default: true },
  inStock: { type: Boolean, default: true },
  stockQuantity: { type: Number, default: -1 }, // -1 means unlimited
  
  // Soft delete fields
  isDeleted: { type: Boolean, default: false },
  deletedAt: { type: Date, default: null },
  deletedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  allergens: {
    type: [{
      type: String,
      trim: true
    }],
    default: []
  },
  dietary: {
    type: [{
      type: String,
      trim: true
    }],
    default: []
  },
  prepTime: { type: Number, default: 15 },
  rating: { type: Number, default: 0, min: 0, max: 5 },
  reviews: { type: Number, default: 0 },
  calories: Number,
  protein: Number,
  carbs: Number,
  fat: Number,
  isSpecial: { type: Boolean, default: false },
  discount: { type: Number, default: 0, min: 0, max: 100 },
  recommended: { type: Boolean, default: false },
  featured: { type: Boolean, default: false },
  customizations: {
    type: Map,
    of: [String]
  },
  tags: {
    type: [{
      type: String,
      trim: true
    }],
    default: []
  },
  soldCount: { type: Number, default: 0 },
  viewCount: { type: Number, default: 0 }
}, { timestamps: true });

// Virtual properties for AdminJS upload feature
menuItemSchema.virtual('imageFile').get(function() {
  return null;
});

menuItemSchema.virtual('imagePath').get(function() {
  return this.image;
});

menuItemSchema.virtual('imageFilename').get(function() {
  if (this.image) {
    return this.image.split('/').pop();
  }
  return null;
});

// Compound index for tenant-specific uniqueness
menuItemSchema.index({ tenantId: 1, id: 1 }, { unique: true });

// Indexes for search and filtering
menuItemSchema.index({ name: 'text', description: 'text', tags: 'text' });
menuItemSchema.index({ category: 1, isDeleted: 1 });
menuItemSchema.index({ isDeleted: 1, available: 1 });
menuItemSchema.index({ price: 1, isDeleted: 1 });

// Method to get full image URL
menuItemSchema.methods.getImageUrl = function() {
  if (!this.image) return null;
  
  // If it's already a full URL (e.g., from Cloudinary), return as is
  if (this.image.startsWith('http://') || this.image.startsWith('https://')) {
    return this.image;
  }
  
  // Otherwise, prepend the base URL
  const baseUrl = process.env.FRONTEND_URL || 'http://localhost:5000';
  return `${baseUrl}${this.image}`;
};

// Pre-save hook to handle image path and ensure arrays are arrays
menuItemSchema.pre('save', function(next) {
  // If image is being updated and it's a relative path, ensure it starts with /
  if (this.isModified('image') && this.image && !this.image.startsWith('http') && !this.image.startsWith('/')) {
    this.image = '/' + this.image;
  }
  
  // Ensure array fields are arrays
  const arrayFields = ['allergens', 'dietary', 'tags', 'images'];
  
  arrayFields.forEach(field => {
    if (this[field] !== undefined && !Array.isArray(this[field])) {
      if (!this[field]) {
        this[field] = [];
      } else if (typeof this[field] === 'string') {
        this[field] = this[field].split(',').map(s => s.trim()).filter(Boolean);
      } else {
        this[field] = [this[field]];
      }
    }
  });
  
  next();
});

// Soft delete method
menuItemSchema.methods.softDelete = function(deletedBy = null) {
  this.isDeleted = true;
  this.deletedAt = new Date();
  this.deletedBy = deletedBy;
  this.available = false; // Also mark as unavailable
  return this.save();
};

// Restore method
menuItemSchema.methods.restore = function() {
  this.isDeleted = false;
  this.deletedAt = null;
  this.deletedBy = null;
  return this.save();
};

// Override default find to exclude deleted items
menuItemSchema.pre(/^find/, function() {
  // Only apply filter if not explicitly looking for deleted items
  if (!this.getQuery().hasOwnProperty('isDeleted')) {
    this.where({ isDeleted: false });
  }
});

// Static method to find deleted items
menuItemSchema.statics.findDeleted = function() {
  return this.find({ isDeleted: true });
};

// Static method to find with deleted items
menuItemSchema.statics.findWithDeleted = function() {
  return this.find({});
};

module.exports = mongoose.model('MenuItem', menuItemSchema);