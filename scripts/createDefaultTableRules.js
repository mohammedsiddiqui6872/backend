const mongoose = require('mongoose');
const TableStatusRule = require('../src/models/TableStatusRule');
const Tenant = require('../src/models/Tenant');
require('dotenv').config();

async function createDefaultRules() {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log('Connected to MongoDB');

    // Get all active tenants
    const tenants = await Tenant.find({ status: 'active' });

    for (const tenant of tenants) {
      console.log(`\nCreating default rules for ${tenant.name} (${tenant.tenantId})`);

      // Check if default rules already exist
      const existingRules = await TableStatusRule.find({ 
        tenantId: tenant.tenantId,
        isDefault: true 
      });

      if (existingRules.length > 0) {
        console.log(`Default rules already exist for ${tenant.name}`);
        continue;
      }

      // Rule 1: Auto-occupy table when order is placed
      await TableStatusRule.create({
        tenantId: tenant.tenantId,
        name: 'Auto-occupy on order',
        description: 'Automatically mark table as occupied when an order is placed',
        triggerEvent: 'order_placed',
        conditions: [
          {
            field: 'table.status',
            operator: 'equals',
            value: 'available'
          }
        ],
        actions: [
          {
            type: 'change_status',
            config: {
              newStatus: 'occupied',
              reason: 'Order placed'
            }
          }
        ],
        priority: 10,
        isActive: true,
        isDefault: true
      });

      // Rule 2: Auto-clean table after payment with delay
      await TableStatusRule.create({
        tenantId: tenant.tenantId,
        name: 'Mark for cleaning after payment',
        description: 'Mark table as cleaning 2 minutes after payment',
        triggerEvent: 'payment_completed',
        conditions: [
          {
            field: 'table.status',
            operator: 'equals',
            value: 'occupied'
          }
        ],
        actions: [
          {
            type: 'change_status',
            config: {
              newStatus: 'cleaning',
              reason: 'Payment completed',
              delay: 120000 // 2 minutes
            }
          }
        ],
        priority: 9,
        isActive: true,
        isDefault: true
      });

      // Rule 3: Alert on long sessions (over 2 hours)
      await TableStatusRule.create({
        tenantId: tenant.tenantId,
        name: 'Long session alert',
        description: 'Alert staff when a table is occupied for over 2 hours',
        triggerEvent: 'session_check',
        conditions: [
          {
            field: 'table.status',
            operator: 'equals',
            value: 'occupied'
          },
          {
            field: 'session.duration',
            operator: 'greater_than',
            value: 7200000 // 2 hours in milliseconds
          }
        ],
        actions: [
          {
            type: 'send_notification',
            config: {
              channel: 'push',
              recipients: ['managers', 'waiters'],
              message: 'Table {{table.number}} has been occupied for over 2 hours'
            }
          }
        ],
        priority: 5,
        isActive: true,
        isDefault: true
      });

      // Rule 4: VIP table preparation
      await TableStatusRule.create({
        tenantId: tenant.tenantId,
        name: 'VIP table preparation',
        description: 'Alert staff to prepare VIP tables when reserved',
        triggerEvent: 'table_reserved',
        conditions: [
          {
            field: 'table.type',
            operator: 'equals',
            value: 'vip'
          },
          {
            field: 'reservation.time_until',
            operator: 'less_than',
            value: 1800000 // 30 minutes
          }
        ],
        actions: [
          {
            type: 'send_notification',
            config: {
              channel: 'push',
              recipients: ['managers'],
              message: 'VIP table {{table.number}} needs preparation for upcoming reservation'
            }
          }
        ],
        priority: 8,
        isActive: true,
        isDefault: true
      });

      // Rule 5: Auto-available after cleaning period
      await TableStatusRule.create({
        tenantId: tenant.tenantId,
        name: 'Auto-available after cleaning',
        description: 'Mark table as available 10 minutes after cleaning status',
        triggerEvent: 'status_changed',
        conditions: [
          {
            field: 'table.status',
            operator: 'equals',
            value: 'cleaning'
          },
          {
            field: 'event.newStatus',
            operator: 'equals',
            value: 'cleaning'
          }
        ],
        actions: [
          {
            type: 'change_status',
            config: {
              newStatus: 'available',
              reason: 'Cleaning completed',
              delay: 600000 // 10 minutes
            }
          }
        ],
        priority: 7,
        isActive: true,
        isDefault: true
      });

      console.log(`Created 5 default rules for ${tenant.name}`);
    }

    console.log('\nDefault rules creation completed!');
    process.exit(0);

  } catch (error) {
    console.error('Error creating default rules:', error);
    process.exit(1);
  }
}

// Run the script
createDefaultRules();