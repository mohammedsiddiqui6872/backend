const TableStatusRule = require('../models/TableStatusRule');
const Table = require('../models/Table');
const Order = require('../models/Order');
const { sendNotification } = require('../utils/notifications');

class TableStatusRuleEngine {
  constructor(io) {
    this.io = io;
    this.timers = new Map(); // Store active timers
  }

  /**
   * Process rules for a specific event
   */
  async processEvent(tenantId, triggerEvent, tableNumber, context = {}) {
    try {
      // Get the table
      const table = await Table.findOne({ tenantId, number: tableNumber });
      if (!table) {
        console.error(`Table ${tableNumber} not found for tenant ${tenantId}`);
        return;
      }

      // Get applicable rules
      const rules = await TableStatusRule.getApplicableRules(tenantId, triggerEvent, table);
      
      console.log(`Found ${rules.length} rules for ${triggerEvent} on table ${tableNumber}`);
      
      if (rules.length === 0) {
        console.log(`No applicable rules for event ${triggerEvent} on table ${tableNumber}`);
        return;
      }

      // Build evaluation context
      const evaluationContext = await this.buildContext(table, context);
      
      console.log('Evaluation context:', JSON.stringify(evaluationContext, null, 2));

      // Process each rule
      for (const rule of rules) {
        try {
          console.log(`Evaluating rule "${rule.name}" with conditions:`, rule.conditions);
          const conditionResult = rule.evaluateConditions(evaluationContext);
          console.log(`Condition result: ${conditionResult}`);
          
          if (conditionResult) {
            console.log(`Executing rule "${rule.name}" for table ${tableNumber}`);
            await this.executeActions(rule, table, evaluationContext);
          }
        } catch (error) {
          console.error(`Error executing rule ${rule.name}:`, error);
        }
      }
    } catch (error) {
      console.error('Error processing status rules:', error);
    }
  }

  /**
   * Build context for rule evaluation
   */
  async buildContext(table, additionalContext = {}) {
    const context = {
      ...additionalContext,
      table: {
        _id: table._id,
        number: table.number,
        type: table.type,
        status: table.status,
        capacity: table.capacity,
        location: table.location,
        features: table.features
      }
    };

    // Add order information if table is occupied
    if (table.currentOrder) {
      const order = await Order.findById(table.currentOrder);
      if (order) {
        context.order = {
          _id: order._id,
          amount: order.totalAmount,
          status: order.status,
          paymentStatus: order.paymentStatus
        };
      }
    }

    // Add session information
    context.session = {
      startTime: table.sessionStartTime,
      duration: table.sessionStartTime ? Date.now() - new Date(table.sessionStartTime).getTime() : 0
    };

    // Add status timing information
    context.status = {
      current: table.status,
      changedAt: table.statusChangedAt,
      timeSinceChange: table.statusChangedAt ? Date.now() - new Date(table.statusChangedAt).getTime() : 0
    };

    return context;
  }

  /**
   * Execute rule actions
   */
  async executeActions(rule, table, context) {
    for (const action of rule.actions) {
      try {
        switch (action.type) {
          case 'change_status':
            const { newStatus, reason, delay } = action.config || {};
            if (delay) {
              // Schedule status change
              setTimeout(async () => {
                // Reload table to get current state
                const currentTable = await Table.findById(table._id);
                if (currentTable) {
                  await this.changeTableStatus(currentTable, newStatus, reason || `Auto: ${rule.name}`);
                }
              }, delay);
            } else {
              await this.changeTableStatus(table, newStatus, reason || `Auto: ${rule.name}`);
            }
            break;
          
          case 'send_notification':
            await this.sendNotification(table, action.config, rule.name, context);
            break;
          
          case 'assign_waiter':
            await this.assignWaiter(table, action.config);
            break;
          
          case 'create_alert':
            await this.createAlert(table, action.config, context);
            break;
          
          case 'start_timer':
            this.startTimer(table, action.config.duration, rule);
            break;
          
          case 'log_event':
            await this.logEvent(table, action.config.message || `Rule ${rule.name} executed`, context);
            break;
        }
      } catch (error) {
        console.error(`Error executing action ${action.type}:`, error);
      }
    }
  }

  /**
   * Change table status
   */
  async changeTableStatus(table, newStatus, reason) {
    const oldStatus = table.status;
    
    table.status = newStatus;
    table.statusChangedAt = new Date();
    table.statusChangeReason = reason;
    
    await table.save();

    // Emit real-time update
    if (this.io) {
      this.io.to(table.tenantId).emit('table-status-update', {
        tableNumber: table.number,
        oldStatus,
        newStatus,
        reason,
        timestamp: new Date()
      });
    }

    // Log the status change
    console.log(`Table ${table.number} status changed from ${oldStatus} to ${newStatus} (${reason})`);
  }

  /**
   * Send notifications to staff
   */
  async sendNotification(table, config, ruleName, context) {
    const { channel = 'push', recipients = [], message: messageTemplate } = config;
    
    // Replace template variables in message
    let message = messageTemplate || `Table ${table.number}: ${ruleName}`;
    message = message.replace(/\{\{table\.number\}\}/g, table.number)
                     .replace(/\{\{table\.status\}\}/g, table.status)
                     .replace(/\{\{rule\.name\}\}/g, ruleName);
    
    const data = {
      tableNumber: table.number,
      tableStatus: table.status,
      ruleName,
      context,
      timestamp: new Date()
    };

    // Send real-time notification via socket
    if (this.io) {
      const recipientRoles = Array.isArray(recipients) ? recipients : [recipients];
      recipientRoles.forEach(role => {
        this.io.to(`${table.tenantId}-${role}`).emit('table-alert', {
          ...data,
          priority: 'high',
          message
        });
      });
    }

    // Send other notification types
    await sendNotification({
      tenantId: table.tenantId,
      channel,
      recipients: Array.isArray(recipients) ? recipients : [recipients],
      message,
      data
    });
  }

  /**
   * Assign waiter to table
   */
  async assignWaiter(table, config) {
    // TODO: Implement waiter assignment logic
    console.log(`Assign waiter to table ${table.number}:`, config);
  }

  /**
   * Create alert
   */
  async createAlert(table, config, context) {
    // TODO: Implement alert creation
    console.log(`Create alert for table ${table.number}:`, config);
  }

  /**
   * Start a timer for delayed actions
   */
  startTimer(table, duration, rule) {
    const timerId = `${table.tenantId}-${table.number}-${rule._id}`;
    
    // Clear existing timer if any
    if (this.timers.has(timerId)) {
      clearTimeout(this.timers.get(timerId));
    }

    // Set new timer
    const timer = setTimeout(() => {
      this.processEvent(table.tenantId, 'timer_expired', table.number, {
        timer_rule_id: rule._id,
        timer_duration: duration
      });
      this.timers.delete(timerId);
    }, duration * 60 * 1000); // Convert minutes to milliseconds

    this.timers.set(timerId, timer);
    console.log(`Timer started for table ${table.number}: ${duration} minutes`);
  }

  /**
   * Log an event
   */
  async logEvent(table, message, context) {
    // You can implement a proper audit log model here
    console.log(`[Table ${table.number}] ${message}`, context);
  }

  /**
   * Clear all timers for a table
   */
  clearTableTimers(tenantId, tableNumber) {
    const prefix = `${tenantId}-${tableNumber}-`;
    for (const [timerId, timer] of this.timers.entries()) {
      if (timerId.startsWith(prefix)) {
        clearTimeout(timer);
        this.timers.delete(timerId);
      }
    }
  }

  /**
   * Get active rules for a tenant
   */
  static async getActiveRules(tenantId) {
    return TableStatusRule.find({ 
      tenantId, 
      isActive: true 
    }).sort({ priority: -1 });
  }
}

module.exports = TableStatusRuleEngine;