const mongoose = require('mongoose');

const assignmentRuleSchema = new mongoose.Schema({
  tenantId: {
    type: String,
    required: true,
    index: true
  },
  name: {
    type: String,
    required: true
  },
  description: String,
  isActive: {
    type: Boolean,
    default: true
  },
  priority: {
    type: Number,
    default: 1,
    min: 1,
    max: 100
  },
  conditions: {
    shiftType: [{
      type: String,
      enum: ['morning', 'afternoon', 'evening', 'night', 'custom']
    }],
    tableSection: [String],
    tableFloor: [String],
    tableType: [{
      type: String,
      enum: ['regular', 'vip', 'outdoor', 'private', 'bar']
    }],
    waiterRole: [String],
    dayOfWeek: [{
      type: Number,
      min: 0,
      max: 6
    }],
    timeRange: {
      start: String, // HH:mm format
      end: String    // HH:mm format
    },
    minExperience: Number // months
  },
  actions: {
    autoAssign: {
      type: Boolean,
      default: true
    },
    preferredWaiters: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }],
    maxTablesPerWaiter: {
      type: Number,
      default: 4
    },
    assignmentStrategy: {
      type: String,
      enum: ['round_robin', 'least_loaded', 'performance_based', 'random'],
      default: 'round_robin'
    },
    notifyOnAssignment: {
      type: Boolean,
      default: true
    }
  },
  lastTriggered: Date,
  triggerCount: {
    type: Number,
    default: 0
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

// Index for efficient rule matching
assignmentRuleSchema.index({ tenantId: 1, isActive: 1, priority: -1 });

// Method to check if rule matches current conditions
assignmentRuleSchema.methods.matchesConditions = function(context) {
  const conditions = this.conditions;
  
  // Check day of week
  if (conditions.dayOfWeek?.length > 0) {
    const currentDay = new Date().getDay();
    if (!conditions.dayOfWeek.includes(currentDay)) return false;
  }
  
  // Check time range
  if (conditions.timeRange?.start && conditions.timeRange?.end) {
    const now = new Date();
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    if (currentTime < conditions.timeRange.start || currentTime > conditions.timeRange.end) return false;
  }
  
  // Check shift type
  if (conditions.shiftType?.length > 0 && context.shiftType) {
    if (!conditions.shiftType.includes(context.shiftType)) return false;
  }
  
  // Check table conditions
  if (context.table) {
    if (conditions.tableType?.length > 0 && !conditions.tableType.includes(context.table.type)) return false;
    if (conditions.tableSection?.length > 0 && !conditions.tableSection.includes(context.table.section)) return false;
    if (conditions.tableFloor?.length > 0 && !conditions.tableFloor.includes(context.table.floor)) return false;
  }
  
  // Check waiter conditions
  if (context.waiter && conditions.minExperience) {
    const monthsExperience = context.waiter.monthsExperience || 0;
    if (monthsExperience < conditions.minExperience) return false;
  }
  
  return true;
};

// Method to get suggested waiters based on strategy
assignmentRuleSchema.methods.getSuggestedWaiters = async function(availableWaiters, currentLoads) {
  const strategy = this.actions.assignmentStrategy;
  const maxTables = this.actions.maxTablesPerWaiter;
  
  // Filter waiters by capacity
  let eligibleWaiters = availableWaiters.filter(w => {
    const load = currentLoads.find(l => l.waiterId.toString() === w._id.toString());
    return !load || load.currentTables < maxTables;
  });
  
  // Apply preferred waiters if any
  if (this.actions.preferredWaiters?.length > 0) {
    const preferred = eligibleWaiters.filter(w => 
      this.actions.preferredWaiters.some(p => p.toString() === w._id.toString())
    );
    if (preferred.length > 0) eligibleWaiters = preferred;
  }
  
  // Apply strategy
  switch (strategy) {
    case 'least_loaded':
      eligibleWaiters.sort((a, b) => {
        const loadA = currentLoads.find(l => l.waiterId.toString() === a._id.toString())?.currentTables || 0;
        const loadB = currentLoads.find(l => l.waiterId.toString() === b._id.toString())?.currentTables || 0;
        return loadA - loadB;
      });
      break;
      
    case 'performance_based':
      // TODO: Sort by performance metrics
      eligibleWaiters.sort((a, b) => (b.performanceScore || 0) - (a.performanceScore || 0));
      break;
      
    case 'random':
      eligibleWaiters.sort(() => Math.random() - 0.5);
      break;
      
    case 'round_robin':
    default:
      // Sort by last assignment time
      eligibleWaiters.sort((a, b) => {
        const lastA = currentLoads.find(l => l.waiterId.toString() === a._id.toString())?.lastAssignmentTime || 0;
        const lastB = currentLoads.find(l => l.waiterId.toString() === b._id.toString())?.lastAssignmentTime || 0;
        return lastA - lastB;
      });
      break;
  }
  
  return eligibleWaiters;
};

// Static method to get active rules
assignmentRuleSchema.statics.getActiveRules = function(tenantId) {
  return this.find({ tenantId, isActive: true })
    .populate('preferredWaiters', 'name')
    .populate('createdBy', 'name')
    .sort('priority');
};

// Static method to test rule
assignmentRuleSchema.statics.testRule = async function(ruleId) {
  const rule = await this.findById(ruleId).populate('preferredWaiters', 'name');
  if (!rule) throw new Error('Rule not found');
  
  // Get unassigned tables
  const Table = mongoose.model('Table');
  const StaffAssignment = mongoose.model('StaffAssignment');
  
  const tables = await Table.find({ 
    tenantId: rule.tenantId,
    status: 'available'
  });
  
  const activeAssignments = await StaffAssignment.find({
    tenantId: rule.tenantId,
    status: 'active'
  });
  
  const assignedTableIds = activeAssignments.map(a => a.tableId.toString());
  const unassignedTables = tables.filter(t => !assignedTableIds.includes(t._id.toString()));
  
  // Test which tables match conditions
  const matches = [];
  for (const table of unassignedTables) {
    const context = {
      table: {
        type: table.type,
        section: table.location?.section,
        floor: table.location?.floor
      }
    };
    
    if (rule.matchesConditions(context)) {
      matches.push({
        tableId: table._id,
        tableNumber: table.number,
        suggestedWaiters: [] // TODO: Add waiter suggestions
      });
    }
  }
  
  return {
    matches,
    wouldAssign: matches.length
  };
};

module.exports = mongoose.model('AssignmentRule', assignmentRuleSchema);