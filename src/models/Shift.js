const mongoose = require('mongoose');
const { getCurrentTenantId } = require('../middleware/tenantContext');

const shiftSchema = new mongoose.Schema({
  tenantId: { 
    type: String, 
    required: true, 
    index: true,
    default: function() {
      return getCurrentTenantId();
    }
  },
  
  employee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  date: {
    type: Date,
    required: true,
    index: true
  },
  
  shiftType: {
    type: String,
    enum: ['morning', 'afternoon', 'evening', 'night', 'custom'],
    required: true
  },
  
  scheduledTimes: {
    start: { type: Date, required: true },
    end: { type: Date, required: true }
  },
  
  actualTimes: {
    clockIn: Date,
    clockOut: Date,
    breaks: [{
      start: Date,
      end: Date,
      type: { type: String, enum: ['meal', 'short', 'prayer'], default: 'short' }
    }]
  },
  
  status: {
    type: String,
    enum: ['scheduled', 'in-progress', 'completed', 'cancelled', 'no-show'],
    default: 'scheduled'
  },
  
  department: String,
  position: String,
  
  // Swap requests
  swapRequest: {
    requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    requestedWith: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    reason: String,
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    requestDate: Date,
    responseDate: Date
  },
  
  // Overtime tracking
  overtime: {
    hours: { type: Number, default: 0 },
    rate: { type: Number, default: 1.5 },
    approved: { type: Boolean, default: false },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  },
  
  // Performance during shift
  performance: {
    ordersServed: { type: Number, default: 0 },
    tablesServed: { type: Number, default: 0 },
    revenue: { type: Number, default: 0 },
    customerRatings: [Number],
    issues: [{
      type: { type: String, enum: ['late', 'early-leave', 'no-show', 'complaint', 'commendation'] },
      description: String,
      reportedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      timestamp: Date
    }]
  },
  
  notes: String,
  
  // Payroll calculation
  payroll: {
    regularHours: { type: Number, default: 0 },
    overtimeHours: { type: Number, default: 0 },
    breakDeduction: { type: Number, default: 0 },
    totalHours: { type: Number, default: 0 },
    hourlyRate: Number,
    totalPay: Number,
    tips: { type: Number, default: 0 },
    deductions: [{
      type: String,
      amount: Number,
      reason: String
    }]
  }
}, { 
  timestamps: true,
  indexes: [
    { tenantId: 1, date: 1 },
    { tenantId: 1, employee: 1, date: 1 },
    { tenantId: 1, status: 1 }
  ]
});

// Virtual for shift duration
shiftSchema.virtual('scheduledDuration').get(function() {
  if (this.scheduledTimes.start && this.scheduledTimes.end) {
    return (this.scheduledTimes.end - this.scheduledTimes.start) / (1000 * 60 * 60); // hours
  }
  return 0;
});

shiftSchema.virtual('actualDuration').get(function() {
  if (this.actualTimes.clockIn && this.actualTimes.clockOut) {
    const duration = (this.actualTimes.clockOut - this.actualTimes.clockIn) / (1000 * 60 * 60); // hours
    const breakDuration = this.actualTimes.breaks.reduce((total, break_) => {
      if (break_.start && break_.end) {
        return total + (break_.end - break_.start) / (1000 * 60 * 60);
      }
      return total;
    }, 0);
    return duration - breakDuration;
  }
  return 0;
});

// Middleware to calculate payroll before saving
shiftSchema.pre('save', function(next) {
  if (this.actualTimes.clockIn && this.actualTimes.clockOut) {
    const actualHours = this.actualDuration;
    const scheduledHours = this.scheduledDuration;
    
    // Calculate regular and overtime hours
    const regularHours = Math.min(actualHours, 8); // 8 hours regular
    const overtimeHours = Math.max(0, actualHours - 8);
    
    this.payroll.regularHours = regularHours;
    this.payroll.overtimeHours = overtimeHours;
    this.payroll.totalHours = actualHours;
    
    // Calculate pay if hourly rate is set
    if (this.payroll.hourlyRate) {
      const regularPay = regularHours * this.payroll.hourlyRate;
      const overtimePay = overtimeHours * this.payroll.hourlyRate * (this.overtime.rate || 1.5);
      this.payroll.totalPay = regularPay + overtimePay;
    }
  }
  
  next();
});

// Add tenant filter
shiftSchema.pre(/^find/, function() {
  const tenantId = getCurrentTenantId();
  if (tenantId) {
    this.where({ tenantId });
  }
});

shiftSchema.pre('save', function(next) {
  if (!this.tenantId) {
    this.tenantId = getCurrentTenantId();
  }
  next();
});

module.exports = mongoose.model('Shift', shiftSchema);