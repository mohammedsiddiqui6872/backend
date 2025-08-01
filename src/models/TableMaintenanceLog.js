const mongoose = require('mongoose');

const tableMaintenanceLogSchema = new mongoose.Schema({
  tenantId: { type: String, required: true, index: true },
  tableId: { type: mongoose.Schema.Types.ObjectId, ref: 'Table', required: true },
  tableNumber: { type: String, required: true },
  
  // Maintenance Type
  type: {
    type: String,
    enum: [
      'cleaning',
      'deep_cleaning',
      'repair',
      'inspection',
      'setup_change',
      'furniture_replacement',
      'equipment_check',
      'sanitization',
      'damage_assessment',
      'routine_maintenance',
      'emergency_maintenance'
    ],
    required: true
  },
  
  // Priority and Status
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  
  status: {
    type: String,
    enum: ['scheduled', 'in_progress', 'completed', 'cancelled', 'postponed'],
    default: 'scheduled'
  },
  
  // Scheduling
  scheduledDate: { type: Date, required: true },
  scheduledDuration: { type: Number, default: 30 }, // minutes
  actualStartTime: Date,
  actualEndTime: Date,
  actualDuration: Number, // minutes
  
  // Assignment
  assignedTo: {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    name: String,
    role: String
  },
  
  performedBy: [{
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    name: String,
    role: String,
    startTime: Date,
    endTime: Date
  }],
  
  // Maintenance Details
  description: { type: String, required: true },
  
  checklist: [{
    item: String,
    completed: { type: Boolean, default: false },
    notes: String,
    completedAt: Date,
    completedBy: String
  }],
  
  // Issues and Resolutions
  issuesFound: [{
    category: {
      type: String,
      enum: ['damage', 'wear', 'malfunction', 'cleanliness', 'safety', 'other']
    },
    description: String,
    severity: {
      type: String,
      enum: ['minor', 'moderate', 'major', 'critical']
    },
    photoUrl: String,
    resolved: { type: Boolean, default: false },
    resolution: String,
    followUpRequired: { type: Boolean, default: false }
  }],
  
  // Parts and Supplies
  suppliesUsed: [{
    item: String,
    quantity: Number,
    unit: String,
    cost: Number
  }],
  
  partsReplaced: [{
    partName: String,
    partNumber: String,
    quantity: Number,
    cost: Number,
    supplier: String
  }],
  
  totalCost: { type: Number, default: 0 },
  
  // Before/After Condition
  conditionBefore: {
    overall: { type: Number, min: 1, max: 5 },
    cleanliness: { type: Number, min: 1, max: 5 },
    functionality: { type: Number, min: 1, max: 5 },
    appearance: { type: Number, min: 1, max: 5 },
    notes: String,
    photos: [String]
  },
  
  conditionAfter: {
    overall: { type: Number, min: 1, max: 5 },
    cleanliness: { type: Number, min: 1, max: 5 },
    functionality: { type: Number, min: 1, max: 5 },
    appearance: { type: Number, min: 1, max: 5 },
    notes: String,
    photos: [String]
  },
  
  // Impact on Service
  serviceImpact: {
    tableUnavailable: { type: Boolean, default: false },
    unavailableFrom: Date,
    unavailableTo: Date,
    alternativeArrangements: String,
    affectedReservations: Number,
    revenueLoss: Number
  },
  
  // Recurring Maintenance
  isRecurring: { type: Boolean, default: false },
  recurringSchedule: {
    frequency: {
      type: String,
      enum: ['daily', 'weekly', 'biweekly', 'monthly', 'quarterly', 'annually']
    },
    dayOfWeek: Number, // 0-6 for weekly
    dayOfMonth: Number, // 1-31 for monthly
    time: String, // HH:MM format
    endDate: Date,
    nextScheduled: Date
  },
  
  // Quality Assurance
  qualityCheck: {
    inspectedBy: {
      userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      name: String
    },
    inspectedAt: Date,
    passed: Boolean,
    comments: String,
    signature: String // Base64 or URL
  },
  
  // Notes and Attachments
  notes: String,
  attachments: [{
    type: { type: String, enum: ['photo', 'document', 'invoice', 'report'] },
    url: String,
    description: String,
    uploadedAt: Date,
    uploadedBy: String
  }],
  
  // Notifications
  notifications: [{
    type: { type: String, enum: ['reminder', 'overdue', 'completed', 'issue_found'] },
    sentTo: [String], // User IDs or emails
    sentAt: Date,
    message: String
  }],
  
  // Completion
  completedAt: Date,
  completionNotes: String,
  signOffBy: {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    name: String,
    role: String,
    signedAt: Date
  },
  
  // Metadata
  createdBy: {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    name: String,
    role: String
  },
  
  lastModifiedBy: {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    name: String,
    role: String
  },
  
  tags: [String],
  
  // Archival
  isArchived: { type: Boolean, default: false },
  archivedAt: Date,
  archivedBy: String
}, { 
  timestamps: true,
  indexes: [
    { tenantId: 1, tableId: 1, scheduledDate: -1 },
    { tenantId: 1, status: 1, scheduledDate: 1 },
    { tenantId: 1, type: 1, status: 1 },
    { tenantId: 1, 'assignedTo.userId': 1, status: 1 }
  ]
});

// Calculate actual duration
tableMaintenanceLogSchema.pre('save', function(next) {
  if (this.actualStartTime && this.actualEndTime) {
    this.actualDuration = Math.round((this.actualEndTime - this.actualStartTime) / (1000 * 60)); // minutes
  }
  
  // Calculate total cost
  let totalCost = 0;
  if (this.suppliesUsed && this.suppliesUsed.length > 0) {
    totalCost += this.suppliesUsed.reduce((sum, supply) => sum + (supply.cost || 0), 0);
  }
  if (this.partsReplaced && this.partsReplaced.length > 0) {
    totalCost += this.partsReplaced.reduce((sum, part) => sum + (part.cost || 0), 0);
  }
  this.totalCost = totalCost;
  
  // Set next scheduled date for recurring maintenance
  if (this.isRecurring && this.recurringSchedule && this.status === 'completed') {
    const nextDate = new Date(this.scheduledDate);
    
    switch (this.recurringSchedule.frequency) {
      case 'daily':
        nextDate.setDate(nextDate.getDate() + 1);
        break;
      case 'weekly':
        nextDate.setDate(nextDate.getDate() + 7);
        break;
      case 'biweekly':
        nextDate.setDate(nextDate.getDate() + 14);
        break;
      case 'monthly':
        nextDate.setMonth(nextDate.getMonth() + 1);
        break;
      case 'quarterly':
        nextDate.setMonth(nextDate.getMonth() + 3);
        break;
      case 'annually':
        nextDate.setFullYear(nextDate.getFullYear() + 1);
        break;
    }
    
    if (!this.recurringSchedule.endDate || nextDate <= this.recurringSchedule.endDate) {
      this.recurringSchedule.nextScheduled = nextDate;
    }
  }
  
  next();
});

// Static methods
tableMaintenanceLogSchema.statics.getUpcomingMaintenance = async function(tenantId, days = 7) {
  const endDate = new Date();
  endDate.setDate(endDate.getDate() + days);
  
  return this.find({
    tenantId,
    status: { $in: ['scheduled', 'in_progress'] },
    scheduledDate: { $lte: endDate },
    isArchived: false
  })
  .populate('tableId', 'number displayName location')
  .sort('scheduledDate');
};

tableMaintenanceLogSchema.statics.getMaintenanceHistory = async function(tenantId, tableId, limit = 50) {
  return this.find({
    tenantId,
    tableId,
    status: 'completed',
    isArchived: false
  })
  .sort('-completedAt')
  .limit(limit)
  .select('type description scheduledDate completedAt performedBy totalCost conditionAfter');
};

tableMaintenanceLogSchema.statics.getMaintenanceStats = async function(tenantId, dateRange = {}) {
  const match = {
    tenantId,
    status: 'completed',
    isArchived: false
  };
  
  if (dateRange.start) match.completedAt = { $gte: dateRange.start };
  if (dateRange.end) {
    match.completedAt = match.completedAt || {};
    match.completedAt.$lte = dateRange.end;
  }
  
  const stats = await this.aggregate([
    { $match: match },
    {
      $group: {
        _id: '$type',
        count: { $sum: 1 },
        totalCost: { $sum: '$totalCost' },
        avgDuration: { $avg: '$actualDuration' },
        avgConditionImprovement: {
          $avg: {
            $subtract: [
              '$conditionAfter.overall',
              '$conditionBefore.overall'
            ]
          }
        }
      }
    },
    {
      $project: {
        type: '$_id',
        count: 1,
        totalCost: { $round: ['$totalCost', 2] },
        avgDuration: { $round: ['$avgDuration', 0] },
        avgConditionImprovement: { $round: ['$avgConditionImprovement', 1] }
      }
    }
  ]);
  
  // Get overdue maintenance
  const overdue = await this.countDocuments({
    tenantId,
    status: 'scheduled',
    scheduledDate: { $lt: new Date() },
    isArchived: false
  });
  
  return {
    byType: stats,
    overdueTasks: overdue,
    totalCompleted: stats.reduce((sum, s) => sum + s.count, 0),
    totalCost: stats.reduce((sum, s) => sum + s.totalCost, 0)
  };
};

// Create recurring maintenance task
tableMaintenanceLogSchema.statics.createRecurringTask = async function(taskData) {
  const task = new this(taskData);
  task.isRecurring = true;
  
  // Set first scheduled date
  const now = new Date();
  const scheduled = new Date();
  
  if (task.recurringSchedule.time) {
    const [hours, minutes] = task.recurringSchedule.time.split(':');
    scheduled.setHours(parseInt(hours), parseInt(minutes), 0, 0);
  }
  
  switch (task.recurringSchedule.frequency) {
    case 'daily':
      if (scheduled <= now) scheduled.setDate(scheduled.getDate() + 1);
      break;
    case 'weekly':
      const targetDay = task.recurringSchedule.dayOfWeek;
      const currentDay = scheduled.getDay();
      let daysToAdd = targetDay - currentDay;
      if (daysToAdd <= 0) daysToAdd += 7;
      scheduled.setDate(scheduled.getDate() + daysToAdd);
      break;
    case 'monthly':
      scheduled.setDate(task.recurringSchedule.dayOfMonth);
      if (scheduled <= now) scheduled.setMonth(scheduled.getMonth() + 1);
      break;
  }
  
  task.scheduledDate = scheduled;
  return task.save();
};

const TableMaintenanceLog = mongoose.model('TableMaintenanceLog', tableMaintenanceLogSchema);

module.exports = TableMaintenanceLog;