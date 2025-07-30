// src/models/Category.js
const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
  tenantId: {
    type: String,
    required: true,
    index: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  nameAr: {
    type: String,
    required: false,
    default: ''
  },
  slug: {
    type: String,
    required: true,
    lowercase: true
  },
  icon: {
    type: String,
    default: 'utensils'
  },
  image: {
    type: String,  // Cloudinary URL
    default: null
  },
  displayOrder: {
    type: Number,
    default: 0
  },
  isActive: {
    type: Boolean,
    default: true
  },
  description: String,
  descriptionAr: String,
  createdAt: {
    type: Date,
    default: Date.now
  },
  
  // Soft delete fields
  isDeleted: { type: Boolean, default: false },
  deletedAt: { type: Date, default: null },
  deletedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }
});

// Auto-generate slug from name
categorySchema.pre('save', function(next) {
  if (this.isModified('name')) {
    this.slug = this.name.toLowerCase().replace(/\s+/g, '-');
  }
  next();
});

// Soft delete methods
categorySchema.methods.softDelete = function(deletedBy = null) {
  this.isDeleted = true;
  this.deletedAt = new Date();
  this.deletedBy = deletedBy;
  this.isActive = false;
  return this.save();
};

categorySchema.methods.restore = function() {
  this.isDeleted = false;
  this.deletedAt = null;
  this.deletedBy = null;
  this.isActive = true;
  return this.save();
};

// Override default find to exclude deleted items
categorySchema.pre(/^find/, function() {
  if (!this.getQuery().hasOwnProperty('isDeleted')) {
    this.where({ isDeleted: false });
  }
});

// Validation to prevent deletion if menu items exist
categorySchema.pre('remove', async function(next) {
  const MenuItem = mongoose.model('MenuItem');
  const count = await MenuItem.countDocuments({ category: this._id });
  if (count > 0) {
    return next(new Error(`Cannot delete category. ${count} menu items are using this category.`));
  }
  next();
});

// Compound indexes for tenant-specific uniqueness
categorySchema.index({ tenantId: 1, name: 1 }, { unique: true });
categorySchema.index({ tenantId: 1, slug: 1 }, { unique: true });

module.exports = mongoose.model('Category', categorySchema);