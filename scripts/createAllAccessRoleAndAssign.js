const mongoose = require('mongoose');
const Role = require('../src/models/Role');
const User = require('../src/models/User');
require('dotenv').config();

if (!process.env.MONGODB_URI) {
  console.error('Error: MONGODB_URI environment variable is not set');
  console.error('Please run: export MONGODB_URI="your-mongodb-connection-string"');
  process.exit(1);
}

async function createAllAccessRoleAndAssign() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Get all available permissions from the Role schema
    const roleSchemaPath = Role.schema.path('permissions');
    const allPermissions = roleSchemaPath.caster.enumValues;
    
    console.log(`Total available permissions: ${allPermissions.length}`);
    console.log('Permissions:', allPermissions.join(', '));

    // Get all unique tenant IDs
    const tenantIds = await Role.distinct('tenantId');
    console.log(`\nFound ${tenantIds.length} tenants`);

    for (const tenantId of tenantIds) {
      if (!tenantId) continue;
      
      console.log(`\n--- Processing tenant: ${tenantId} ---`);
      
      // Check if "All Access" role already exists for this tenant
      let allAccessRole = await Role.findOne({
        tenantId: tenantId,
        name: 'All Access'
      });

      if (allAccessRole) {
        console.log('All Access role already exists, updating permissions...');
        allAccessRole.permissions = allPermissions;
        allAccessRole.code = 'ALL_ACCESS';
        allAccessRole.description = 'Full access to all features and permissions';
        allAccessRole.uiAccess = {
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
        await allAccessRole.save();
        console.log('Updated existing All Access role');
      } else {
        // Create new All Access role
        allAccessRole = new Role({
          tenantId: tenantId,
          name: 'All Access',
          code: 'ALL_ACCESS',
          description: 'Full access to all features and permissions',
          permissions: allPermissions,
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
        await allAccessRole.save();
        console.log('Created new All Access role');
      }

      // Find and update users with email admin@tenant.ae
      const adminUsers = await User.find({
        tenantId: tenantId,
        email: 'admin@tenant.ae'
      });

      console.log(`Found ${adminUsers.length} users with email admin@tenant.ae`);

      for (const user of adminUsers) {
        const oldRoleId = user.roleId;
        user.roleId = allAccessRole._id;
        user.role = 'admin'; // Ensure role string is set to admin
        await user.save();
        console.log(`Updated user: ${user.email} (${user.name})`);
        console.log(`  Old roleId: ${oldRoleId}`);
        console.log(`  New roleId: ${allAccessRole._id}`);
      }

      // Also check for any users with similar admin emails (case variations)
      const adminVariations = await User.find({
        tenantId: tenantId,
        email: { $regex: /^admin@tenant\.ae$/i }
      });

      if (adminVariations.length > adminUsers.length) {
        console.log(`Found ${adminVariations.length - adminUsers.length} additional admin users with case variations`);
        for (const user of adminVariations) {
          if (!adminUsers.find(u => u._id.equals(user._id))) {
            user.roleId = allAccessRole._id;
            user.role = 'admin';
            await user.save();
            console.log(`Updated user: ${user.email} (${user.name})`);
          }
        }
      }
    }

    // Final verification
    console.log('\n--- Final Verification ---');
    const allAccessRoles = await Role.find({ code: 'ALL_ACCESS' });
    console.log(`Total All Access roles created: ${allAccessRoles.length}`);

    for (const role of allAccessRoles) {
      const usersWithRole = await User.countDocuments({ roleId: role._id });
      console.log(`\nTenant: ${role.tenantId}`);
      console.log(`  Role ID: ${role._id}`);
      console.log(`  Permissions: ${role.permissions.length}`);
      console.log(`  Users assigned: ${usersWithRole}`);
    }

    // List all admin@tenant.ae users and their roles
    console.log('\n--- Admin Users Status ---');
    const allAdminUsers = await User.find({
      email: { $regex: /admin@tenant\.ae/i }
    }).populate('roleId');

    for (const user of allAdminUsers) {
      console.log(`\nUser: ${user.email}`);
      console.log(`  Name: ${user.name}`);
      console.log(`  Tenant: ${user.tenantId}`);
      console.log(`  Role: ${user.roleId?.name || 'No role assigned'}`);
      console.log(`  Role Code: ${user.roleId?.code || 'N/A'}`);
      console.log(`  Permissions: ${user.roleId?.permissions?.length || 0}`);
    }

    console.log('\n\nAll Access roles created and assigned successfully!');
    console.log('Users need to log out and log back in for the new permissions to take effect.');
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

createAllAccessRoleAndAssign();