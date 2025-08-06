const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const PurchaseOrderItemSchema = new Schema({
  inventoryItem: { 
    type: Schema.Types.ObjectId, 
    ref: 'InventoryItem', 
    required: true 
  },
  supplierSKU: String,
  description: String,
  quantity: { type: Number, required: true },
  unit: String,
  unitPrice: { type: Number, required: true },
  discount: { type: Number, default: 0 },
  tax: { type: Number, default: 0 },
  subtotal: Number,
  total: Number,
  
  // Receiving
  receivedQuantity: { type: Number, default: 0 },
  receivedBatches: [{
    batchNumber: String,
    quantity: Number,
    expiryDate: Date,
    receivedDate: Date,
    receivedBy: { type: Schema.Types.ObjectId, ref: 'User' }
  }],
  
  // Quality Check
  qualityCheck: {
    required: { type: Boolean, default: false },
    passed: Boolean,
    checkedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    checkedDate: Date,
    notes: String,
    temperature: Number,
    appearance: String,
    packaging: String
  },
  
  // Issues
  issues: [{
    type: {
      type: String,
      enum: ['DAMAGED', 'WRONG_ITEM', 'QUALITY', 'QUANTITY', 'EXPIRED']
    },
    quantity: Number,
    description: String,
    resolution: String,
    reportedDate: Date,
    resolvedDate: Date
  }],
  
  status: {
    type: String,
    enum: ['PENDING', 'PARTIAL', 'RECEIVED', 'CANCELLED'],
    default: 'PENDING'
  }
});

const ApprovalSchema = new Schema({
  level: { type: Number, required: true },
  approver: { type: Schema.Types.ObjectId, ref: 'User' },
  status: {
    type: String,
    enum: ['PENDING', 'APPROVED', 'REJECTED'],
    default: 'PENDING'
  },
  approvedDate: Date,
  comments: String,
  signature: String
});

const DeliverySchema = new Schema({
  expectedDate: Date,
  actualDate: Date,
  deliveryNote: String,
  driver: String,
  vehicleNumber: String,
  temperature: {
    vehicle: Number,
    items: [{
      item: String,
      temperature: Number
    }]
  },
  receivedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  signature: String,
  photos: [String]
});

const PaymentRecordSchema = new Schema({
  amount: { type: Number, required: true },
  paymentDate: { type: Date, required: true },
  paymentMethod: {
    type: String,
    enum: ['CASH', 'CHECK', 'BANK_TRANSFER', 'CREDIT_CARD', 'CREDIT_NOTE']
  },
  reference: String,
  checkNumber: String,
  notes: String,
  recordedBy: { type: Schema.Types.ObjectId, ref: 'User' }
});

const ReturnSchema = new Schema({
  items: [{
    inventoryItem: { type: Schema.Types.ObjectId, ref: 'InventoryItem' },
    quantity: Number,
    reason: String,
    batchNumber: String
  }],
  returnDate: Date,
  creditNoteNumber: String,
  creditAmount: Number,
  status: {
    type: String,
    enum: ['PENDING', 'APPROVED', 'COMPLETED'],
    default: 'PENDING'
  },
  approvedBy: { type: Schema.Types.ObjectId, ref: 'User' }
});

const PurchaseOrderSchema = new Schema({
  tenantId: {
    type: String,
    required: true,
    index: true
  },
  
  // Order Information
  orderNumber: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  type: {
    type: String,
    enum: ['REGULAR', 'URGENT', 'SCHEDULED', 'BLANKET', 'CONTRACT'],
    default: 'REGULAR'
  },
  priority: {
    type: String,
    enum: ['LOW', 'NORMAL', 'HIGH', 'CRITICAL'],
    default: 'NORMAL'
  },
  
  // Supplier
  supplier: {
    type: Schema.Types.ObjectId,
    ref: 'Supplier',
    required: true,
    index: true
  },
  supplierName: String, // Denormalized for performance
  supplierOrderNumber: String,
  
  // Dates
  orderDate: {
    type: Date,
    default: Date.now,
    index: true
  },
  requiredDate: Date,
  expectedDeliveryDate: Date,
  
  // Items
  items: [PurchaseOrderItemSchema],
  
  // Financial
  subtotal: { type: Number, default: 0 },
  discountAmount: { type: Number, default: 0 },
  discountPercentage: { type: Number, default: 0 },
  taxAmount: { type: Number, default: 0 },
  shippingCost: { type: Number, default: 0 },
  otherCharges: { type: Number, default: 0 },
  totalAmount: { type: Number, required: true },
  currency: { type: String, default: 'AED' },
  exchangeRate: { type: Number, default: 1 },
  
  // Payment
  paymentTerms: String,
  paymentDueDate: Date,
  paymentStatus: {
    type: String,
    enum: ['UNPAID', 'PARTIAL', 'PAID', 'OVERDUE', 'CREDIT'],
    default: 'UNPAID',
    index: true
  },
  paidAmount: { type: Number, default: 0 },
  balanceAmount: Number,
  payments: [PaymentRecordSchema],
  
  // Delivery
  deliveryAddress: {
    location: String,
    street: String,
    city: String,
    instructions: String
  },
  deliveryMethod: {
    type: String,
    enum: ['SUPPLIER_DELIVERY', 'PICKUP', 'THIRD_PARTY']
  },
  deliveries: [DeliverySchema],
  
  // Status & Workflow
  status: {
    type: String,
    enum: ['DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'SENT', 'ACKNOWLEDGED', 'PARTIAL_RECEIVED', 'RECEIVED', 'COMPLETED', 'CANCELLED', 'DISPUTED'],
    default: 'DRAFT',
    index: true
  },
  
  // Approvals
  approvalRequired: { type: Boolean, default: false },
  approvals: [ApprovalSchema],
  currentApprovalLevel: { type: Number, default: 0 },
  
  // Receiving
  receivingStatus: {
    type: String,
    enum: ['NOT_RECEIVED', 'PARTIAL', 'COMPLETE'],
    default: 'NOT_RECEIVED'
  },
  receivedDate: Date,
  receivedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  
  // Returns & Disputes
  hasReturns: { type: Boolean, default: false },
  returns: [ReturnSchema],
  hasDispute: { type: Boolean, default: false },
  dispute: {
    reason: String,
    description: String,
    raisedDate: Date,
    resolvedDate: Date,
    resolution: String,
    creditAmount: Number
  },
  
  // Budget & Cost Center
  budgetCategory: String,
  costCenter: String,
  department: String,
  project: String,
  
  // Documents
  documents: [{
    type: {
      type: String,
      enum: ['PO', 'INVOICE', 'DELIVERY_NOTE', 'PACKING_LIST', 'CERTIFICATE', 'OTHER']
    },
    name: String,
    url: String,
    uploadedDate: Date,
    uploadedBy: { type: Schema.Types.ObjectId, ref: 'User' }
  }],
  
  // Communication
  sentToSupplier: { type: Boolean, default: false },
  sentDate: Date,
  sentMethod: {
    type: String,
    enum: ['EMAIL', 'FAX', 'PORTAL', 'API', 'MANUAL']
  },
  acknowledgedBySupplier: { type: Boolean, default: false },
  acknowledgedDate: Date,
  
  // Notes
  internalNotes: String,
  supplierNotes: String,
  receivingNotes: String,
  
  // Source
  source: {
    type: String,
    enum: ['MANUAL', 'AUTO_REORDER', 'REQUISITION', 'CONTRACT', 'IMPORT'],
    default: 'MANUAL'
  },
  sourceReference: String, // Requisition ID, Contract ID, etc.
  
  // Audit
  createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  cancelledBy: { type: Schema.Types.ObjectId, ref: 'User' },
  cancelledDate: Date,
  cancellationReason: String,
  
  // Integration
  externalId: String,
  syncedAt: Date,
  syncStatus: String
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
PurchaseOrderSchema.index({ tenantId: 1, orderNumber: 1 }, { unique: true });
PurchaseOrderSchema.index({ tenantId: 1, supplier: 1, orderDate: -1 });
PurchaseOrderSchema.index({ tenantId: 1, status: 1 });
PurchaseOrderSchema.index({ tenantId: 1, paymentStatus: 1 });
PurchaseOrderSchema.index({ tenantId: 1, requiredDate: 1 });

// Virtual for completion percentage
PurchaseOrderSchema.virtual('completionPercentage').get(function() {
  if (!this.items || this.items.length === 0) return 0;
  
  let totalOrdered = 0;
  let totalReceived = 0;
  
  this.items.forEach(item => {
    totalOrdered += item.quantity;
    totalReceived += item.receivedQuantity || 0;
  });
  
  return totalOrdered > 0 ? Math.round((totalReceived / totalOrdered) * 100) : 0;
});

// Methods
PurchaseOrderSchema.methods.calculateTotals = function() {
  let subtotal = 0;
  
  this.items.forEach(item => {
    item.subtotal = item.quantity * item.unitPrice;
    item.total = item.subtotal - (item.discount || 0) + (item.tax || 0);
    subtotal += item.subtotal;
  });
  
  this.subtotal = subtotal;
  this.totalAmount = subtotal - this.discountAmount + this.taxAmount + this.shippingCost + this.otherCharges;
  this.balanceAmount = this.totalAmount - this.paidAmount;
};

PurchaseOrderSchema.methods.updateReceivingStatus = function() {
  const allReceived = this.items.every(item => 
    item.receivedQuantity >= item.quantity
  );
  
  const anyReceived = this.items.some(item => 
    item.receivedQuantity > 0
  );
  
  if (allReceived) {
    this.receivingStatus = 'COMPLETE';
    this.status = 'COMPLETED';
  } else if (anyReceived) {
    this.receivingStatus = 'PARTIAL';
    this.status = 'PARTIAL_RECEIVED';
  } else {
    this.receivingStatus = 'NOT_RECEIVED';
  }
};

PurchaseOrderSchema.methods.updatePaymentStatus = function() {
  if (this.paidAmount >= this.totalAmount) {
    this.paymentStatus = 'PAID';
  } else if (this.paidAmount > 0) {
    this.paymentStatus = 'PARTIAL';
  } else if (this.paymentDueDate && this.paymentDueDate < new Date()) {
    this.paymentStatus = 'OVERDUE';
  } else {
    this.paymentStatus = 'UNPAID';
  }
};

PurchaseOrderSchema.methods.canApprove = function(userId, level) {
  if (!this.approvalRequired) return false;
  if (this.status !== 'PENDING_APPROVAL') return false;
  
  const approval = this.approvals.find(a => 
    a.level === level && a.status === 'PENDING'
  );
  
  return approval && approval.approver.toString() === userId.toString();
};

// Generate order number
PurchaseOrderSchema.statics.generateOrderNumber = async function(tenantId) {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  
  const lastOrder = await this.findOne({
    tenantId,
    orderNumber: new RegExp(`^PO-${year}${month}`)
  }).sort({ orderNumber: -1 });
  
  let sequence = 1;
  if (lastOrder) {
    const lastSequence = parseInt(lastOrder.orderNumber.split('-')[2]);
    sequence = lastSequence + 1;
  }
  
  return `PO-${year}${month}-${String(sequence).padStart(4, '0')}`;
};

// Middleware
PurchaseOrderSchema.pre('save', function(next) {
  // Calculate totals
  this.calculateTotals();
  
  // Update statuses
  this.updateReceivingStatus();
  this.updatePaymentStatus();
  
  next();
});

// Ensure tenant isolation
PurchaseOrderSchema.pre(/^find/, function() {
  if (!this.getOptions().skipTenantFilter && this.getQuery().tenantId === undefined) {
    throw new Error('tenantId is required for purchase order queries');
  }
});

const PurchaseOrder = mongoose.model('PurchaseOrder', PurchaseOrderSchema);

module.exports = PurchaseOrder;