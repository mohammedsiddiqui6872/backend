const mongoose = require('mongoose');
const TableStatusRule = require('../models/TableStatusRule');
const Restaurant = require('../models/Restaurant');
require('dotenv').config();

const defaultRules = [
  {
    name: 'Auto-Occupy on Order',
    description: 'Automatically mark table as occupied when an order is placed',
    triggerEvent: 'order_placed',
    conditions: [
      {
        field: 'current_status',
        operator: 'equals',
        value: 'available'
      }
    ],
    actions: [
      {
        type: 'change_status',
        targetStatus: 'occupied'
      }
    ],
    priority: 100
  },
  {
    name: 'Request Cleaning After Payment',
    description: 'Mark table for cleaning after payment is completed',
    triggerEvent: 'payment_completed',
    conditions: [
      {
        field: 'payment_completed',
        operator: 'equals',
        value: true
      }
    ],
    actions: [
      {
        type: 'change_status',
        targetStatus: 'cleaning'
      },
      {
        type: 'notify_staff',
        notificationChannel: 'socket',
        notificationRecipients: ['cleaning_staff', 'waiter']
      },
      {
        type: 'start_timer',
        timerDuration: 15 // 15 minutes to clean
      }
    ],
    priority: 90
  },
  {
    name: 'Auto-Available After Cleaning',
    description: 'Mark table as available 15 minutes after cleaning status',
    triggerEvent: 'timer_expired',
    conditions: [
      {
        field: 'current_status',
        operator: 'equals',
        value: 'cleaning'
      }
    ],
    actions: [
      {
        type: 'change_status',
        targetStatus: 'available'
      },
      {
        type: 'log_event',
        logMessage: 'Table automatically marked as available after cleaning timeout'
      }
    ],
    priority: 80
  },
  {
    name: 'VIP Table Notification',
    description: 'Notify manager when VIP table is occupied',
    triggerEvent: 'order_placed',
    conditions: [
      {
        field: 'table_type',
        operator: 'equals',
        value: 'vip'
      }
    ],
    actions: [
      {
        type: 'notify_staff',
        notificationChannel: 'socket',
        notificationRecipients: ['manager']
      },
      {
        type: 'log_event',
        logMessage: 'VIP table occupied - manager notified'
      }
    ],
    appliesTo: {
      tableTypes: ['vip']
    },
    priority: 95
  },
  {
    name: 'Long Session Alert',
    description: 'Alert staff when table has been occupied for over 2 hours',
    triggerEvent: 'manual_trigger', // This would be triggered by a periodic check
    conditions: [
      {
        field: 'session_duration',
        operator: 'greater_than',
        value: 120 // 2 hours
      },
      {
        field: 'current_status',
        operator: 'equals',
        value: 'occupied'
      }
    ],
    actions: [
      {
        type: 'notify_staff',
        notificationChannel: 'socket',
        notificationRecipients: ['waiter', 'manager']
      },
      {
        type: 'log_event',
        logMessage: 'Table occupied for over 2 hours'
      }
    ],
    priority: 70
  }
];

async function createDefaultRules() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/restaurant-saas');
    console.log('Connected to MongoDB');

    // Get all restaurants
    const restaurants = await Restaurant.find({ isActive: true });
    console.log(`Found ${restaurants.length} active restaurants`);

    for (const restaurant of restaurants) {
      console.log(`\nCreating default rules for ${restaurant.name} (${restaurant.tenantId})`);

      // Check if rules already exist
      const existingRules = await TableStatusRule.countDocuments({ 
        tenantId: restaurant.tenantId 
      });

      if (existingRules > 0) {
        console.log(`Rules already exist for ${restaurant.name}, skipping...`);
        continue;
      }

      // Create default rules for this tenant
      for (const ruleData of defaultRules) {
        const rule = new TableStatusRule({
          ...ruleData,
          tenantId: restaurant.tenantId,
          isActive: true
        });

        await rule.save();
        console.log(`Created rule: ${rule.name}`);
      }
    }

    console.log('\nDefault rules created successfully!');
  } catch (error) {
    console.error('Error creating default rules:', error);
  } finally {
    await mongoose.connection.close();
  }
}

// Run if called directly
if (require.main === module) {
  createDefaultRules();
}

module.exports = createDefaultRules;