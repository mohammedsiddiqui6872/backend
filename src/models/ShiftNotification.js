const mongoose = require('mongoose');
const { getCurrentTenant } = require('../middleware/enterpriseTenantIsolation');

const shiftNotificationSchema = new mongoose.Schema({
  tenantId: { 
    type: String, 
    required: true, 
    index: true,
    default: function() {
      const context = getCurrentTenant();
      return context?.tenantId;
    }
  },
  
  shift: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Shift',
    required: true
  },
  
  employee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  type: {
    type: String,
    enum: [
      'shift-reminder',      // Reminder before shift starts
      'shift-start',         // Shift starting notification
      'no-show-warning',     // Employee hasn't clocked in
      'no-show-alert',       // Employee marked as no-show
      'swap-request',        // New swap request
      'swap-approved',       // Swap request approved
      'swap-rejected',       // Swap request rejected
      'shift-cancelled',     // Shift cancelled
      'shift-assigned',      // New shift assigned
      'shift-updated',       // Shift details changed
      'overtime-warning',    // Approaching overtime
      'break-reminder',      // Time for break
      'clock-out-reminder',  // Reminder to clock out
      'schedule-published'   // New schedule available
    ],
    required: true
  },
  
  status: {
    type: String,
    enum: ['pending', 'sent', 'delivered', 'read', 'failed'],
    default: 'pending'
  },
  
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  
  channels: [{
    type: String,
    enum: ['push', 'email', 'sms', 'in-app']
  }],
  
  scheduledFor: {
    type: Date,
    required: true,
    index: true
  },
  
  sentAt: Date,
  deliveredAt: Date,
  readAt: Date,
  
  title: {
    type: String,
    required: true
  },
  
  message: {
    type: String,
    required: true
  },
  
  data: {
    shiftDate: Date,
    shiftStart: String,
    shiftEnd: String,
    department: String,
    position: String,
    swapRequestId: String,
    otherEmployee: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    reminderMinutes: Number, // Minutes before shift
    customData: mongoose.Schema.Types.Mixed
  },
  
  deliveryStatus: {
    push: {
      sent: Boolean,
      sentAt: Date,
      error: String,
      deviceTokens: [String]
    },
    email: {
      sent: Boolean,
      sentAt: Date,
      error: String,
      messageId: String
    },
    sms: {
      sent: Boolean,
      sentAt: Date,
      error: String,
      messageId: String
    },
    inApp: {
      sent: Boolean,
      sentAt: Date
    }
  },
  
  retryCount: {
    type: Number,
    default: 0
  },
  
  maxRetries: {
    type: Number,
    default: 3
  },
  
  metadata: {
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    reason: String,
    relatedNotifications: [{ type: mongoose.Schema.Types.ObjectId, ref: 'ShiftNotification' }]
  }
}, { 
  timestamps: true,
  indexes: [
    { tenantId: 1, scheduledFor: 1, status: 1 },
    { tenantId: 1, employee: 1, type: 1, createdAt: -1 },
    { tenantId: 1, shift: 1, type: 1 },
    { tenantId: 1, status: 1, scheduledFor: 1 } // For notification queue
  ]
});

// Virtual for notification age
shiftNotificationSchema.virtual('age').get(function() {
  return Date.now() - this.createdAt;
});

// Virtual for time until scheduled
shiftNotificationSchema.virtual('timeUntilScheduled').get(function() {
  return this.scheduledFor - Date.now();
});

// Method to check if notification is overdue
shiftNotificationSchema.methods.isOverdue = function() {
  return this.status === 'pending' && this.scheduledFor < new Date();
};

// Method to mark as sent
shiftNotificationSchema.methods.markAsSent = async function(channel) {
  this.sentAt = new Date();
  this.status = 'sent';
  
  if (channel && this.deliveryStatus[channel]) {
    this.deliveryStatus[channel].sent = true;
    this.deliveryStatus[channel].sentAt = new Date();
  }
  
  return this.save();
};

// Method to mark as delivered
shiftNotificationSchema.methods.markAsDelivered = async function() {
  this.deliveredAt = new Date();
  this.status = 'delivered';
  return this.save();
};

// Method to mark as read
shiftNotificationSchema.methods.markAsRead = async function() {
  this.readAt = new Date();
  this.status = 'read';
  return this.save();
};

// Method to mark as failed
shiftNotificationSchema.methods.markAsFailed = async function(error) {
  this.status = 'failed';
  this.retryCount += 1;
  
  if (error) {
    this.metadata.lastError = error.message || error;
  }
  
  return this.save();
};

// Static method to create reminder notifications
shiftNotificationSchema.statics.createShiftReminder = async function(shift, minutesBefore = 30) {
  const reminderTime = new Date(shift.date);
  const [hours, minutes] = shift.scheduledTimes.start.split(':');
  reminderTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
  reminderTime.setMinutes(reminderTime.getMinutes() - minutesBefore);
  
  return this.create({
    tenantId: shift.tenantId,
    shift: shift._id,
    employee: shift.employee,
    type: 'shift-reminder',
    priority: 'high',
    channels: ['push', 'in-app'],
    scheduledFor: reminderTime,
    title: `Shift Reminder`,
    message: `Your ${shift.shiftType} shift starts in ${minutesBefore} minutes at ${shift.scheduledTimes.start}`,
    data: {
      shiftDate: shift.date,
      shiftStart: shift.scheduledTimes.start,
      shiftEnd: shift.scheduledTimes.end,
      department: shift.department,
      position: shift.position,
      reminderMinutes: minutesBefore
    }
  });
};

// Enterprise-grade tenant filter for all find operations
shiftNotificationSchema.pre(/^find/, function() {
  if (this.getOptions().skipTenantFilter) {
    console.log('ShiftNotification model: Skipping tenant filter (super admin operation)');
    return;
  }
  
  const queryTenantId = this.getQuery().tenantId;
  const context = getCurrentTenant();
  
  if (queryTenantId && context?.tenantId && queryTenantId !== context.tenantId) {
    console.error('ShiftNotification model: SECURITY WARNING - Query tenant mismatch!', {
      queryTenantId,
      contextTenantId: context.tenantId,
      userId: context.userId,
      requestId: context.requestId
    });
    this.where({ _id: null });
    return;
  }
  
  if (context?.tenantId) {
    console.log('ShiftNotification model: Applying enterprise tenant filter:', context.tenantId);
    this.where({ tenantId: context.tenantId });
  } else if (!queryTenantId) {
    console.warn('ShiftNotification model: No tenant context available');
    this.where({ _id: null });
  }
});

// Ensure tenantId is set when creating new notifications
shiftNotificationSchema.pre('save', function(next) {
  if (!this.tenantId) {
    const context = getCurrentTenant();
    if (context?.tenantId) {
      this.tenantId = context.tenantId;
      console.log('ShiftNotification model: Setting tenantId on save:', context.tenantId);
    } else {
      return next(new Error('Cannot create shift notification without tenant context'));
    }
  }
  next();
});

module.exports = mongoose.model('ShiftNotification', shiftNotificationSchema);