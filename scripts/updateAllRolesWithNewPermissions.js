const mongoose = require('mongoose');
const Role = require('../src/models/Role');
const defaultRoles = require('../src/constants/defaultRoles');
require('dotenv').config();

if (!process.env.MONGODB_URI) {
  console.error('Error: MONGODB_URI environment variable is not set');
  console.error('Please run: export MONGODB_URI="your-mongodb-connection-string"');
  process.exit(1);
}

async function updateAllRoles() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Get the admin permissions from defaultRoles
    const adminDefault = defaultRoles.find(r => r.code === 'ADMIN');
    const superAdminDefault = defaultRoles.find(r => r.code === 'SUPER_ADMIN');
    
    // Update Super Admin roles
    const superAdminResult = await Role.updateMany(
      { code: 'SUPER_ADMIN' },
      { 
        $set: { 
          permissions: superAdminDefault.permissions,
          uiAccess: superAdminDefault.uiAccess
        } 
      }
    );
    console.log(`Updated Super Admin roles: ${superAdminResult.modifiedCount} documents modified`);

    // Update All Access roles with admin permissions
    const allAccessResult = await Role.updateMany(
      { code: 'ALL ACCESS' },
      { 
        $set: { 
          permissions: adminDefault.permissions,
          uiAccess: adminDefault.uiAccess
        } 
      }
    );
    console.log(`Updated All Access roles: ${allAccessResult.modifiedCount} documents modified`);

    // Update any roles with names containing "Admin"
    const adminNameRoles = await Role.find({
      name: { $regex: /admin/i },
      code: { $ne: 'ADMIN' } // Exclude the ones we already updated
    });

    for (const role of adminNameRoles) {
      role.permissions = adminDefault.permissions;
      role.uiAccess = adminDefault.uiAccess;
      await role.save();
      console.log(`Updated ${role.name} (${role.code}) for tenant ${role.tenantId}`);
    }

    // Show final status
    console.log('\n--- Final Status ---');
    const allRoles = await Role.find({});
    
    console.log(`Total roles in database: ${allRoles.length}`);
    
    allRoles.forEach(role => {
      console.log(`\n${role.name} (${role.code}) - Tenant: ${role.tenantId}`);
      console.log(`  Total permissions: ${role.permissions.length}`);
      console.log(`  Has inventory.reports: ${role.permissions.includes('inventory.reports')}`);
      console.log(`  Has purchase.view: ${role.permissions.includes('purchase.view')}`);
      console.log(`  UI Access - Inventory: ${role.uiAccess?.inventory}`);
    });

    console.log('\n\nAll roles updated successfully!');
    console.log('Users need to log out and log back in for the new permissions to take effect.');
    process.exit(0);
  } catch (error) {
    console.error('Error updating roles:', error);
    process.exit(1);
  }
}

updateAllRoles();