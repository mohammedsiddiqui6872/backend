const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const ContactPersonSchema = new Schema({
  name: { type: String, required: true },
  position: String,
  email: String,
  phone: String,
  mobile: String,
  isPrimary: { type: Boolean, default: false },
  department: String,
  notes: String
});

const DeliveryScheduleSchema = new Schema({
  dayOfWeek: {
    type: Number,
    min: 0,
    max: 6,
    required: true
  },
  timeSlots: [{
    startTime: String, // "09:00"
    endTime: String,   // "12:00"
  }],
  minimumOrderValue: Number,
  deliveryCharge: Number
});

const PaymentTermsSchema = new Schema({
  termType: {
    type: String,
    enum: ['NET', 'COD', 'PREPAID', 'CREDIT_CARD', 'EOM'],
    default: 'NET'
  },
  netDays: { type: Number, default: 30 },
  earlyPaymentDiscount: {
    percentage: Number,
    withinDays: Number
  },
  creditLimit: Number,
  currentBalance: { type: Number, default: 0 },
  overdueBalance: { type: Number, default: 0 }
});

const CertificationSchema = new Schema({
  name: { type: String, required: true },
  certificateNumber: String,
  issuingBody: String,
  issueDate: Date,
  expiryDate: Date,
  documentUrl: String,
  verified: { type: Boolean, default: false },
  verifiedDate: Date
});

const InsuranceSchema = new Schema({
  type: {
    type: String,
    enum: ['LIABILITY', 'PRODUCT', 'TRANSIT', 'COMPREHENSIVE'],
    required: true
  },
  policyNumber: String,
  provider: String,
  coverageAmount: Number,
  expiryDate: Date,
  documentUrl: String
});

const PerformanceMetricsSchema = new Schema({
  onTimeDeliveryRate: { type: Number, min: 0, max: 100, default: 100 },
  qualityRating: { type: Number, min: 1, max: 5, default: 5 },
  responseTime: { type: Number, default: 0 }, // Hours
  defectRate: { type: Number, min: 0, max: 100, default: 0 },
  returnRate: { type: Number, min: 0, max: 100, default: 0 },
  totalOrders: { type: Number, default: 0 },
  totalSpend: { type: Number, default: 0 },
  lastOrderDate: Date,
  averageOrderValue: Number,
  priceCompetitiveness: { type: Number, min: 1, max: 5, default: 3 }
});

const IntegrationSchema = new Schema({
  type: {
    type: String,
    enum: ['API', 'EDI', 'EMAIL', 'PORTAL', 'MANUAL'],
    default: 'MANUAL'
  },
  apiEndpoint: String,
  apiKey: String,
  ediDetails: {
    protocol: String,
    connectionString: String
  },
  portalUrl: String,
  credentials: {
    username: String,
    password: String // Should be encrypted
  },
  syncFrequency: String, // cron expression
  lastSyncDate: Date,
  isActive: { type: Boolean, default: false }
});

const ContractSchema = new Schema({
  contractNumber: String,
  startDate: { type: Date, required: true },
  endDate: Date,
  autoRenew: { type: Boolean, default: false },
  terms: String,
  minimumOrderValue: Number,
  volumeDiscounts: [{
    minQuantity: Number,
    discount: Number
  }],
  rebates: [{
    target: Number,
    percentage: Number
  }],
  documentUrl: String,
  status: {
    type: String,
    enum: ['ACTIVE', 'EXPIRED', 'PENDING', 'CANCELLED'],
    default: 'ACTIVE'
  }
});

const SupplierSchema = new Schema({
  tenantId: {
    type: String,
    required: true,
    index: true
  },
  
  // Basic Information
  name: {
    type: String,
    required: true,
    index: true
  },
  code: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  legalName: String,
  tradingName: String,
  
  // Classification
  type: {
    type: String,
    enum: ['MANUFACTURER', 'DISTRIBUTOR', 'WHOLESALER', 'IMPORTER', 'LOCAL_FARM', 'DIRECT'],
    required: true
  },
  categories: [{
    type: String,
    enum: ['produce', 'meat', 'seafood', 'dairy', 'dry-goods', 'beverages', 'supplies', 'packaging']
  }],
  
  // Contact Information
  primaryContact: ContactPersonSchema,
  contacts: [ContactPersonSchema],
  
  // Address
  address: {
    street: String,
    city: String,
    state: String,
    country: String,
    postalCode: String,
    coordinates: {
      lat: Number,
      lng: Number
    }
  },
  
  // Billing Address (if different)
  billingAddress: {
    street: String,
    city: String,
    state: String,
    country: String,
    postalCode: String
  },
  
  // Communication
  phone: String,
  fax: String,
  email: { type: String, index: true },
  website: String,
  orderEmail: String,
  invoiceEmail: String,
  
  // Tax Information
  taxId: String,
  vatNumber: String,
  taxExempt: { type: Boolean, default: false },
  taxExemptionCertificate: String,
  
  // Payment Terms
  paymentTerms: PaymentTermsSchema,
  paymentMethods: [{
    type: String,
    enum: ['CASH', 'CHECK', 'BANK_TRANSFER', 'CREDIT_CARD', 'DEBIT_CARD', 'ONLINE']
  }],
  bankDetails: {
    bankName: String,
    accountName: String,
    accountNumber: String,
    routingNumber: String,
    iban: String,
    swift: String
  },
  
  // Delivery Information
  deliverySchedules: [DeliveryScheduleSchema],
  leadTimeDays: { type: Number, default: 1 },
  minimumOrderValue: Number,
  deliveryCharge: Number,
  freeDeliveryThreshold: Number,
  
  // Ordering
  orderMethods: [{
    type: String,
    enum: ['PHONE', 'EMAIL', 'FAX', 'PORTAL', 'API', 'EDI', 'WHATSAPP']
  }],
  orderCutoffTime: String, // "14:00"
  
  // Certifications & Compliance
  certifications: [CertificationSchema],
  insurance: [InsuranceSchema],
  
  // Performance Metrics
  metrics: PerformanceMetricsSchema,
  rating: { type: Number, min: 1, max: 5, default: 3 },
  
  // Risk Assessment
  riskLevel: {
    type: String,
    enum: ['LOW', 'MEDIUM', 'HIGH'],
    default: 'MEDIUM'
  },
  riskFactors: [String],
  blacklisted: { type: Boolean, default: false },
  blacklistReason: String,
  
  // Contracts
  contracts: [ContractSchema],
  currentContract: { type: Schema.Types.ObjectId },
  
  // Integration
  integration: IntegrationSchema,
  
  // Alternative Suppliers (for backup)
  alternativeSuppliers: [{
    type: Schema.Types.ObjectId,
    ref: 'Supplier'
  }],
  
  // Products/Items
  suppliedItems: [{
    inventoryItem: { type: Schema.Types.ObjectId, ref: 'InventoryItem' },
    supplierSKU: String,
    supplierProductName: String,
    packSize: String,
    unitPrice: Number,
    moq: Number,
    leadTime: Number
  }],
  
  // Preferences
  preferredForCategories: [String],
  notes: String,
  internalNotes: String,
  
  // Status
  status: {
    type: String,
    enum: ['ACTIVE', 'INACTIVE', 'SUSPENDED', 'PENDING_APPROVAL'],
    default: 'ACTIVE'
  },
  approvalStatus: {
    approved: { type: Boolean, default: false },
    approvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    approvedDate: Date
  },
  
  // Documents
  documents: [{
    name: String,
    type: String,
    url: String,
    uploadedDate: Date
  }],
  
  // Audit
  createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  lastReviewDate: Date,
  nextReviewDate: Date
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
SupplierSchema.index({ tenantId: 1, code: 1 }, { unique: true });
SupplierSchema.index({ tenantId: 1, name: 1 });
SupplierSchema.index({ tenantId: 1, categories: 1 });
SupplierSchema.index({ tenantId: 1, status: 1 });
SupplierSchema.index({ tenantId: 1, rating: 1 });

// Virtual for overall score
SupplierSchema.virtual('overallScore').get(function() {
  if (!this.metrics) return 0;
  
  const weights = {
    onTimeDelivery: 0.3,
    quality: 0.25,
    price: 0.2,
    responseTime: 0.15,
    defectRate: 0.1
  };
  
  const score = 
    (this.metrics.onTimeDeliveryRate / 100) * weights.onTimeDelivery * 5 +
    this.metrics.qualityRating * weights.quality +
    this.metrics.priceCompetitiveness * weights.price +
    (5 - Math.min(this.metrics.responseTime / 24, 4)) * weights.responseTime +
    ((100 - this.metrics.defectRate) / 100) * weights.defectRate * 5;
    
  return Math.round(score * 10) / 10;
});

// Methods
SupplierSchema.methods.calculateRiskScore = function() {
  let riskScore = 0;
  
  // Check certifications
  const expiredCerts = this.certifications.filter(cert => 
    cert.expiryDate && cert.expiryDate < new Date()
  );
  riskScore += expiredCerts.length * 10;
  
  // Check insurance
  const expiredInsurance = this.insurance.filter(ins => 
    ins.expiryDate && ins.expiryDate < new Date()
  );
  riskScore += expiredInsurance.length * 15;
  
  // Check performance
  if (this.metrics.onTimeDeliveryRate < 80) riskScore += 20;
  if (this.metrics.qualityRating < 3) riskScore += 25;
  if (this.metrics.defectRate > 5) riskScore += 15;
  
  // Check financial
  if (this.paymentTerms.overdueBalance > 0) riskScore += 10;
  
  // Determine risk level
  if (riskScore < 20) this.riskLevel = 'LOW';
  else if (riskScore < 50) this.riskLevel = 'MEDIUM';
  else this.riskLevel = 'HIGH';
  
  return riskScore;
};

SupplierSchema.methods.updateMetrics = function(orderData) {
  if (!this.metrics) {
    this.metrics = new PerformanceMetricsSchema();
  }
  
  // Update metrics based on order data
  this.metrics.totalOrders += 1;
  this.metrics.totalSpend += orderData.totalAmount;
  this.metrics.lastOrderDate = new Date();
  this.metrics.averageOrderValue = this.metrics.totalSpend / this.metrics.totalOrders;
  
  // Update on-time delivery
  if (orderData.deliveredOnTime !== undefined) {
    const currentRate = this.metrics.onTimeDeliveryRate || 100;
    const totalDeliveries = this.metrics.totalOrders;
    const onTimeDeliveries = (currentRate / 100) * (totalDeliveries - 1) + (orderData.deliveredOnTime ? 1 : 0);
    this.metrics.onTimeDeliveryRate = (onTimeDeliveries / totalDeliveries) * 100;
  }
  
  // Update quality rating
  if (orderData.qualityRating) {
    const currentRating = this.metrics.qualityRating || 5;
    const totalRatings = this.metrics.totalOrders;
    const sumRatings = currentRating * (totalRatings - 1) + orderData.qualityRating;
    this.metrics.qualityRating = sumRatings / totalRatings;
  }
};

// Middleware
SupplierSchema.pre('save', function(next) {
  // Calculate risk score
  this.calculateRiskScore();
  
  // Set primary contact if not set
  if (this.contacts.length > 0 && !this.primaryContact) {
    const primary = this.contacts.find(c => c.isPrimary);
    if (primary) {
      this.primaryContact = primary;
    } else {
      this.primaryContact = this.contacts[0];
      this.contacts[0].isPrimary = true;
    }
  }
  
  next();
});

// Ensure tenant isolation
SupplierSchema.pre(/^find/, function() {
  if (!this.getOptions().skipTenantFilter && this.getQuery().tenantId === undefined) {
    throw new Error('tenantId is required for supplier queries');
  }
});

const Supplier = mongoose.model('Supplier', SupplierSchema);

module.exports = Supplier;