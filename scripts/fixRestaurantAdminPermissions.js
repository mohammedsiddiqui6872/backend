const mongoose = require('mongoose');
const Role = require('../src/models/Role');
require('dotenv').config();

if (!process.env.MONGODB_URI) {
  console.error('Error: MONGODB_URI environment variable is not set');
  console.error('Please run: export MONGODB_URI="your-mongodb-connection-string"');
  process.exit(1);
}

async function fixRestaurantAdminPermissions() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // These are the permissions that exist in the Role model enum
    const validPermissions = [
      // Menu permissions
      'menu.view', 'menu.edit', 'menu.delete', 'menu.create',
      
      // Order permissions
      'orders.view', 'orders.edit', 'orders.delete', 'orders.cancel', 
      'orders.create', 'orders.assign', 'orders.complete',
      
      // Analytics permissions
      'analytics.view', 'analytics.export', 'analytics.financial',
      
      // User management permissions
      'users.view', 'users.manage', 'users.delete', 'users.create',
      'users.roles', 'users.permissions',
      
      // Table permissions
      'tables.view', 'tables.manage', 'tables.assign',
      
      // Inventory permissions - THESE ARE THE ONES WE NEED
      'inventory.view', 'inventory.manage', 'inventory.order',
      
      // Payment permissions
      'payments.view', 'payments.process', 'payments.refund', 'payments.reports',
      
      // Settings permissions
      'settings.view', 'settings.manage', 'settings.billing',
      
      // Shift permissions
      'shifts.view', 'shifts.manage', 'shifts.approve', 'shifts.swap',
      'shifts.clock', 'shifts.reports',
      
      // Customer permissions
      'customers.view', 'customers.manage', 'customers.communicate',
      
      // Report permissions
      'reports.view', 'reports.export', 'reports.financial', 'reports.staff'
    ];

    // Admin should have all permissions
    const adminPermissions = validPermissions;

    // Find all admin-like roles
    const adminRoles = await Role.find({
      $or: [
        { code: 'ADMIN' },
        { name: 'Restaurant Admin' },
        { name: { $regex: /admin/i } },
        { code: 'ALL ACCESS' },
        { code: 'SUPER_ADMIN' }
      ]
    });

    console.log(`Found ${adminRoles.length} admin roles to update`);

    for (const role of adminRoles) {
      console.log(`\nUpdating role: ${role.name} (${role.code}) for tenant ${role.tenantId}`);
      console.log(`  Current permissions: ${role.permissions.length}`);
      
      // Update permissions
      role.permissions = adminPermissions;
      
      // Update UI access to give access to everything
      role.uiAccess = {
        dashboard: true,
        orders: true,
        menu: true,
        tables: true,
        customers: true,
        analytics: true,
        inventory: true,
        staff: true,
        settings: true
      };
      
      await role.save();
      console.log(`  Updated permissions: ${role.permissions.length}`);
    }

    // Create Restaurant Admin role for tenants that don't have one
    const tenantIds = await Role.distinct('tenantId');
    for (const tenantId of tenantIds) {
      if (tenantId) {
        const hasAdminRole = await Role.findOne({
          tenantId: tenantId,
          $or: [
            { code: 'ADMIN' },
            { name: 'Restaurant Admin' }
          ]
        });

        if (!hasAdminRole) {
          console.log(`\nCreating Restaurant Admin role for tenant: ${tenantId}`);
          const newRole = new Role({
            tenantId: tenantId,
            name: 'Restaurant Admin',
            code: 'ADMIN',
            description: 'Full access to manage the restaurant',
            permissions: adminPermissions,
            uiAccess: {
              dashboard: true,
              orders: true,
              menu: true,
              tables: true,
              customers: true,
              analytics: true,
              inventory: true,
              staff: true,
              settings: true
            },
            level: 1,
            isActive: true,
            isSystem: false
          });

          await newRole.save();
          console.log('Created successfully');
        }
      }
    }

    // Verify the updates
    console.log('\n--- Verification ---');
    const updatedRoles = await Role.find({
      $or: [
        { code: 'ADMIN' },
        { name: 'Restaurant Admin' },
        { code: 'ALL ACCESS' },
        { code: 'SUPER_ADMIN' }
      ]
    });

    updatedRoles.forEach(role => {
      console.log(`\n${role.name} (${role.code}) - Tenant: ${role.tenantId}`);
      console.log(`  Total permissions: ${role.permissions.length}`);
      console.log(`  Has inventory.view: ${role.permissions.includes('inventory.view')}`);
      console.log(`  Has inventory.manage: ${role.permissions.includes('inventory.manage')}`);
      console.log(`  Has inventory.order: ${role.permissions.includes('inventory.order')}`);
    });

    console.log('\n\nIMPORTANT NOTE:');
    console.log('The Role model only supports limited inventory permissions: inventory.view, inventory.manage, inventory.order');
    console.log('The routes require permissions like inventory.reports, purchase.view which are NOT in the Role model.');
    console.log('This is a schema mismatch that needs to be fixed in the Role model.');
    
    console.log('\nRestaurant Admin roles updated with available permissions.');
    console.log('Users need to log out and log back in for the new permissions to take effect.');
    process.exit(0);
  } catch (error) {
    console.error('Error updating permissions:', error);
    process.exit(1);
  }
}

fixRestaurantAdminPermissions();