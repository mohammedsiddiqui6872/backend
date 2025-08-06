const mongoose = require('mongoose');
const Role = require('../src/models/Role');
const defaultRoles = require('../src/constants/defaultRoles');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || "mongodb+srv://admin:!Jafar18022017@cluster0.mzlqfml.mongodb.net/gritservices?retryWrites=true&w=majority&appName=Cluster0";

async function updateRestaurantAdminRole() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    // Get the admin permissions from defaultRoles
    const adminDefault = defaultRoles.find(r => r.code === 'ADMIN');
    
    if (!adminDefault) {
      console.error('Admin default role not found');
      process.exit(1);
    }

    // Find all Restaurant Admin roles across all tenants
    const restaurantAdminRoles = await Role.find({
      $or: [
        { code: 'ADMIN' },
        { name: 'Restaurant Admin' },
        { name: { $regex: /^admin$/i } }
      ]
    });

    console.log(`Found ${restaurantAdminRoles.length} Restaurant Admin roles to update`);

    if (restaurantAdminRoles.length === 0) {
      // Create Restaurant Admin roles for each tenant if they don't exist
      const tenantIds = await Role.distinct('tenantId');
      console.log(`Found ${tenantIds.length} tenants`);

      for (const tenantId of tenantIds) {
        if (tenantId) {
          const newRole = new Role({
            name: 'Restaurant Admin',
            code: 'ADMIN',
            description: adminDefault.description,
            permissions: adminDefault.permissions,
            uiAccess: adminDefault.uiAccess,
            level: adminDefault.level,
            isActive: true,
            isSystem: false,
            tenantId: tenantId
          });

          await newRole.save();
          console.log(`Created Restaurant Admin role for tenant: ${tenantId}`);
        }
      }
    } else {
      // Update existing Restaurant Admin roles
      for (const role of restaurantAdminRoles) {
        role.permissions = adminDefault.permissions;
        role.uiAccess = adminDefault.uiAccess;
        await role.save();
        console.log(`Updated Restaurant Admin role for tenant: ${role.tenantId}`);
      }
    }

    // Verify the updates
    console.log('\n--- Verification ---');
    const updatedRoles = await Role.find({
      $or: [
        { code: 'ADMIN' },
        { name: 'Restaurant Admin' }
      ]
    });

    updatedRoles.forEach(role => {
      console.log(`\n${role.name} (${role.code}) - Tenant: ${role.tenantId}`);
      console.log(`  Total permissions: ${role.permissions.length}`);
      console.log(`  Has inventory.reports: ${role.permissions.includes('inventory.reports')}`);
      console.log(`  Has inventory.manage: ${role.permissions.includes('inventory.manage')}`);
      console.log(`  Has purchase.view: ${role.permissions.includes('purchase.view')}`);
      console.log(`  Sample permissions: ${role.permissions.slice(0, 5).join(', ')}...`);
    });

    console.log('\nRestaurant Admin role permissions updated successfully');
    console.log('Users need to log out and log back in for the new permissions to take effect.');
    process.exit(0);
  } catch (error) {
    console.error('Error updating Restaurant Admin role permissions:', error);
    process.exit(1);
  }
}

updateRestaurantAdminRole();