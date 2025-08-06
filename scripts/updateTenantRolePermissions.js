const mongoose = require('mongoose');
const Role = require('../src/models/Role');
const defaultRoles = require('../src/constants/defaultRoles');
require('dotenv').config();

if (!process.env.MONGODB_URI) {
  console.error('Error: MONGODB_URI environment variable is not set');
  console.error('Please run: export MONGODB_URI="your-mongodb-connection-string"');
  process.exit(1);
}

async function updateTenantRolePermissions() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Get the admin permissions from defaultRoles
    const adminDefault = defaultRoles.find(r => r.code === 'ADMIN');
    const superAdminDefault = defaultRoles.find(r => r.code === 'SUPER_ADMIN');
    
    if (!adminDefault) {
      console.error('Admin default role not found');
      process.exit(1);
    }

    // Update Super Admin roles (tenant-specific)
    const superAdminResult = await Role.updateMany(
      { 
        code: 'SUPER_ADMIN',
        tenantId: { $exists: true }
      },
      { 
        $set: { 
          permissions: superAdminDefault.permissions,
          uiAccess: superAdminDefault.uiAccess
        } 
      }
    );
    console.log(`Updated tenant Super Admin roles: ${superAdminResult.modifiedCount} documents modified`);

    // Update All Access roles (which seem to be acting as admin roles)
    const allAccessResult = await Role.updateMany(
      { 
        code: 'ALL ACCESS',
        tenantId: { $exists: true }
      },
      { 
        $set: { 
          permissions: adminDefault.permissions,
          uiAccess: adminDefault.uiAccess
        } 
      }
    );
    console.log(`Updated All Access roles: ${allAccessResult.modifiedCount} documents modified`);

    // Also update any roles that have substantial permissions but are missing inventory/purchase permissions
    const rolesWithManyPermissions = await Role.find({
      tenantId: { $exists: true },
      'permissions.40': { $exists: true } // Has at least 40 permissions
    });

    console.log(`\nFound ${rolesWithManyPermissions.length} roles with many permissions to check`);

    for (const role of rolesWithManyPermissions) {
      const hasInventoryReports = role.permissions.includes('inventory.reports');
      const hasPurchaseView = role.permissions.includes('purchase.view');
      
      if (!hasInventoryReports || !hasPurchaseView) {
        console.log(`\nUpdating role: ${role.name} (${role.code}) for tenant ${role.tenantId}`);
        
        // Add missing inventory and purchase permissions
        const inventoryPermissions = [
          'inventory.view', 'inventory.update', 'inventory.manage', 
          'inventory.reports', 'inventory.receive', 'inventory.count', 
          'inventory.order', 'inventory.approve'
        ];
        
        const purchasePermissions = [
          'purchase.view', 'purchase.create', 'purchase.edit', 
          'purchase.approve', 'purchase.send', 'purchase.receive', 
          'purchase.payment', 'purchase.cancel', 'purchase.return', 
          'purchase.dispute', 'purchase.export'
        ];
        
        // Add permissions that don't already exist
        const newPermissions = [...role.permissions];
        
        [...inventoryPermissions, ...purchasePermissions].forEach(perm => {
          if (!newPermissions.includes(perm)) {
            newPermissions.push(perm);
          }
        });
        
        role.permissions = newPermissions;
        await role.save();
        console.log(`Added ${newPermissions.length - role.permissions.length} new permissions`);
      }
    }

    // Show final status
    console.log('\n--- Final Status ---');
    const updatedRoles = await Role.find({
      tenantId: { $exists: true },
      $or: [
        { code: 'SUPER_ADMIN' },
        { code: 'ALL ACCESS' },
        { 'permissions.40': { $exists: true } }
      ]
    });

    updatedRoles.forEach(role => {
      console.log(`\n${role.name} (${role.code}) - Tenant: ${role.tenantId}`);
      console.log(`  Has inventory.reports: ${role.permissions.includes('inventory.reports')}`);
      console.log(`  Has purchase.view: ${role.permissions.includes('purchase.view')}`);
      console.log(`  Total permissions: ${role.permissions.length}`);
    });

    console.log('\nAll tenant role permissions updated successfully');
    process.exit(0);
  } catch (error) {
    console.error('Error updating tenant role permissions:', error);
    process.exit(1);
  }
}

updateTenantRolePermissions();