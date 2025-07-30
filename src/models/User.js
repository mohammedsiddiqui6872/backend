// src/models/User.js
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  tenantId: { type: String, required: true, index: true },
  name: { type: String, required: true },
  email: { type: String, required: true, lowercase: true },
  password: { type: String, required: true },
  role: { 
    type: String, 
    enum: ['admin', 'manager', 'chef', 'waiter', 'cashier'],
    default: 'waiter'
  },
  phone: String,
  avatar: String,
  isActive: { type: Boolean, default: true },
  lastLogin: Date,
  permissions: [{
    type: String,
    enum: ['menu.view', 'menu.edit', 'orders.view', 'orders.edit', 'analytics.view', 'users.manage']
  }],
  fcmToken: {
    type: String,
    default: null
  },
  platform: {
    type: String,
    enum: ['ios', 'android'],
    default: null
  },
  lastTokenUpdate: {
    type: Date,
    default: null
  }
}, { timestamps: true });

userSchema.methods.comparePassword = async function(password) {
  return await bcrypt.compare(password, this.password);
};

userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

// Compound index for tenant-specific email uniqueness
userSchema.index({ tenantId: 1, email: 1 }, { unique: true });

module.exports = mongoose.model('User', userSchema);