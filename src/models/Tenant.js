const mongoose = require('mongoose');

const tenantSchema = new mongoose.Schema({
  tenantId: { 
    type: String, 
    unique: true, 
    required: true,
    index: true 
  },
  name: { 
    type: String, 
    required: true 
  },
  subdomain: { 
    type: String, 
    unique: true, 
    required: true,
    lowercase: true,
    index: true
  },
  customDomain: {
    type: String,
    sparse: true,
    unique: true
  },
  plan: { 
    type: String, 
    enum: ['trial', 'basic', 'pro', 'enterprise'],
    default: 'trial'
  },
  status: {
    type: String,
    enum: ['active', 'suspended', 'cancelled'],
    default: 'active'
  },
  owner: {
    name: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String, required: true }
  },
  address: String,
  settings: {
    primaryColor: { type: String, default: '#3b82f6' },
    logo: String,
    currency: { type: String, default: 'AED' },
    timezone: { type: String, default: 'Asia/Dubai' },
    language: { type: String, default: 'en' },
    orderPrefix: { type: String, default: 'ORD' }
  },
  billing: {
    stripeCustomerId: String,
    subscriptionId: String,
    currentPeriodEnd: Date,
    paymentMethod: String
  },
  limits: {
    maxOrders: { type: Number, default: 1000 },
    maxUsers: { type: Number, default: 10 },
    maxTables: { type: Number, default: 50 },
    maxMenuItems: { type: Number, default: 200 },
    maxStorageMB: { type: Number, default: 100 }
  },
  usage: {
    currentOrders: { type: Number, default: 0 },
    currentUsers: { type: Number, default: 0 },
    currentStorageMB: { type: Number, default: 0 },
    lastResetDate: { type: Date, default: Date.now }
  },
  features: {
    customDomain: { type: Boolean, default: false },
    whiteLabel: { type: Boolean, default: false },
    apiAccess: { type: Boolean, default: false },
    advancedAnalytics: { type: Boolean, default: false },
    multiLocation: { type: Boolean, default: false },
    loyaltyProgram: { type: Boolean, default: false }
  },
  metadata: {
    onboardedBy: String,
    notes: String,
    tags: [String]
  }
}, { 
  timestamps: true 
});

// Indexes for performance
tenantSchema.index({ status: 1, plan: 1 });
tenantSchema.index({ 'billing.currentPeriodEnd': 1 });
tenantSchema.index({ createdAt: -1 });

// Methods
tenantSchema.methods.isActive = function() {
  return this.status === 'active';
};

tenantSchema.methods.canAddOrder = function() {
  return this.limits.maxOrders === -1 || this.usage.currentOrders < this.limits.maxOrders;
};

tenantSchema.methods.canAddUser = function() {
  return this.limits.maxUsers === -1 || this.usage.currentUsers < this.limits.maxUsers;
};

tenantSchema.methods.incrementUsage = async function(field, amount = 1) {
  this.usage[field] = (this.usage[field] || 0) + amount;
  return this.save();
};

// Feature checks based on plan
tenantSchema.methods.hasFeature = function(feature) {
  const planFeatures = {
    trial: [],
    basic: [],
    pro: ['whiteLabel', 'advancedAnalytics'],
    enterprise: ['customDomain', 'whiteLabel', 'apiAccess', 'advancedAnalytics', 'multiLocation', 'loyaltyProgram']
  };
  
  return planFeatures[this.plan]?.includes(feature) || false;
};

// Static methods
tenantSchema.statics.findBySubdomain = function(subdomain) {
  return this.findOne({ subdomain: subdomain.toLowerCase(), status: 'active' });
};

tenantSchema.statics.findByDomain = function(domain) {
  return this.findOne({ 
    $or: [
      { customDomain: domain },
      { subdomain: domain.split('.')[0] }
    ],
    status: 'active'
  });
};

module.exports = mongoose.model('Tenant', tenantSchema);