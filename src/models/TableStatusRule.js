const mongoose = require('mongoose');

const conditionSchema = new mongoose.Schema({
  field: {
    type: String,
    required: true
    // Removed enum to allow flexible field paths like 'table.status', 'session.duration', etc.
  },
  operator: {
    type: String,
    required: true,
    enum: ['equals', 'not_equals', 'greater_than', 'less_than', 'greater_than_or_equals', 'less_than_or_equals', 'contains', 'not_contains', 'exists', 'not_exists']
  },
  value: mongoose.Schema.Types.Mixed
});

const actionSchema = new mongoose.Schema({
  type: {
    type: String,
    required: true,
    enum: ['change_status', 'send_notification', 'assign_waiter', 'create_alert', 'start_timer', 'log_event']
  },
  config: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  }
});

const tableStatusRuleSchema = new mongoose.Schema({
  tenantId: { type: String, required: true, index: true },
  name: { type: String, required: true },
  description: String,
  triggerEvent: {
    type: String,
    required: true,
    enum: ['order_placed', 'payment_completed', 'table_reserved', 'status_changed', 'session_check', 'manual_trigger', 'timer_expired']
  },
  conditions: [conditionSchema],
  conditionLogic: {
    type: String,
    enum: ['all', 'any'],
    default: 'all'
  },
  actions: [actionSchema],
  priority: {
    type: Number,
    default: 0 // Higher priority rules execute first
  },
  isActive: { type: Boolean, default: true },
  appliesTo: {
    tableTypes: [{
      type: String,
      enum: ['regular', 'vip', 'outdoor', 'private', 'bar']
    }],
    floors: [String],
    sections: [String],
    specificTables: [String]
  },
  schedule: {
    enabled: { type: Boolean, default: false },
    days: [{
      type: String,
      enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
    }],
    startTime: String, // HH:mm format
    endTime: String    // HH:mm format
  },
  isDefault: { type: Boolean, default: false }, // System-created rules
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, {
  timestamps: true
});

// Compound indexes
tableStatusRuleSchema.index({ tenantId: 1, isActive: 1, priority: -1 });
tableStatusRuleSchema.index({ tenantId: 1, triggerEvent: 1, isActive: 1 });

// Helper function to get nested value from object
function getNestedValue(obj, path) {
  return path.split('.').reduce((curr, prop) => curr?.[prop], obj);
}

// Method to evaluate conditions
tableStatusRuleSchema.methods.evaluateConditions = function(context) {
  if (this.conditions.length === 0) return true;
  
  const results = this.conditions.map(condition => {
    const contextValue = getNestedValue(context, condition.field);
    
    switch (condition.operator) {
      case 'equals':
        return contextValue === condition.value;
      case 'not_equals':
        return contextValue !== condition.value;
      case 'greater_than':
        return contextValue > condition.value;
      case 'less_than':
        return contextValue < condition.value;
      case 'greater_than_or_equals':
        return contextValue >= condition.value;
      case 'less_than_or_equals':
        return contextValue <= condition.value;
      case 'contains':
        return contextValue && String(contextValue).includes(condition.value);
      case 'not_contains':
        return contextValue && !String(contextValue).includes(condition.value);
      case 'exists':
        return contextValue !== undefined && contextValue !== null;
      case 'not_exists':
        return contextValue === undefined || contextValue === null;
      default:
        return false;
    }
  });
  
  return this.conditionLogic === 'all' 
    ? results.every(r => r) 
    : results.some(r => r);
};

// Method to check if rule applies to a table
tableStatusRuleSchema.methods.appliesToTable = function(table) {
  const { appliesTo } = this;
  
  // If no specific filters, applies to all
  if (!appliesTo.tableTypes?.length && 
      !appliesTo.floors?.length && 
      !appliesTo.sections?.length && 
      !appliesTo.specificTables?.length) {
    return true;
  }
  
  // Check specific tables first
  if (appliesTo.specificTables?.includes(table.number)) {
    return true;
  }
  
  // Check table type
  if (appliesTo.tableTypes?.length && !appliesTo.tableTypes.includes(table.type)) {
    return false;
  }
  
  // Check floor
  if (appliesTo.floors?.length && !appliesTo.floors.includes(table.location.floor)) {
    return false;
  }
  
  // Check section
  if (appliesTo.sections?.length && !appliesTo.sections.includes(table.location.section)) {
    return false;
  }
  
  return true;
};

// Method to check if rule is active based on schedule
tableStatusRuleSchema.methods.isActiveNow = function() {
  if (!this.isActive) return false;
  if (!this.schedule.enabled) return true;
  
  const now = new Date();
  const currentDay = now.toLocaleLowerCase();
  const currentTime = now.toTimeString().slice(0, 5); // HH:mm
  
  // Check day
  if (!this.schedule.days.includes(currentDay)) {
    return false;
  }
  
  // Check time
  if (this.schedule.startTime && currentTime < this.schedule.startTime) {
    return false;
  }
  
  if (this.schedule.endTime && currentTime > this.schedule.endTime) {
    return false;
  }
  
  return true;
};

// Static method to get applicable rules for an event
tableStatusRuleSchema.statics.getApplicableRules = async function(tenantId, triggerEvent, table) {
  const rules = await this.find({
    tenantId,
    triggerEvent,
    isActive: true
  }).sort({ priority: -1 });
  
  return rules.filter(rule => 
    rule.isActiveNow() && 
    rule.appliesToTable(table)
  );
};

module.exports = mongoose.model('TableStatusRule', tableStatusRuleSchema);