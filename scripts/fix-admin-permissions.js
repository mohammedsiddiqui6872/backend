require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../src/models/User');
const Role = require('../src/models/Role');

async function fixAdminPermissions() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Find all admin users
    const adminUsers = await User.find({ role: 'admin' });
    console.log(`Found ${adminUsers.length} admin users`);

    // Update each admin user to ensure they have all permissions
    for (const user of adminUsers) {
      // Add all possible permissions to admin users
      user.permissions = [
        'dashboard.view',
        'analytics.view',
        'analytics.export',
        'menu.view',
        'menu.create',
        'menu.edit',
        'menu.delete',
        'orders.view',
        'orders.create',
        'orders.edit',
        'orders.delete',
        'tables.view',
        'tables.create',
        'tables.edit',
        'tables.delete',
        'users.view',
        'users.create',
        'users.edit',
        'users.delete',
        'users.manage', // This is the important one for document upload
        'inventory.view',
        'inventory.manage',
        'settings.view',
        'settings.edit'
      ];

      await user.save();
      console.log(`Updated permissions for ${user.email}`);
    }

    // Also check/create admin role with all permissions
    const adminRole = await Role.findOne({ code: 'admin' });
    if (adminRole) {
      adminRole.permissions = [
        'dashboard.view',
        'analytics.view',
        'analytics.export',
        'menu.view',
        'menu.create',
        'menu.edit',
        'menu.delete',
        'orders.view',
        'orders.create',
        'orders.edit',
        'orders.delete',
        'tables.view',
        'tables.create',
        'tables.edit',
        'tables.delete',
        'users.view',
        'users.create',
        'users.edit',
        'users.delete',
        'users.manage',
        'inventory.view',
        'inventory.manage',
        'settings.view',
        'settings.edit'
      ];
      await adminRole.save();
      console.log('Updated admin role permissions');
    }

    console.log('Permissions fixed successfully');
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

fixAdminPermissions();