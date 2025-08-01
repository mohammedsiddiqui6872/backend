require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../src/models/User');

// Disable automatic tenant filtering for this script
process.env.BYPASS_TENANT_FILTER = 'true';

async function checkAndFixPermissions() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // First, let's see what users exist
    const allUsers = await User.find({}).select('email role permissions tenantId');
    console.log(`\nTotal users in database: ${allUsers.length}`);
    
    // Group users by role
    const usersByRole = {};
    allUsers.forEach(user => {
      const role = user.role || 'no-role';
      if (!usersByRole[role]) {
        usersByRole[role] = [];
      }
      usersByRole[role].push(user);
    });

    console.log('\nUsers by role:');
    Object.keys(usersByRole).forEach(role => {
      console.log(`  ${role}: ${usersByRole[role].length} users`);
    });

    // Show some sample users
    console.log('\nSample users:');
    allUsers.slice(0, 5).forEach(user => {
      console.log(`  - ${user.email} (${user.role}) - Tenant: ${user.tenantId} - Permissions: ${user.permissions?.length || 0}`);
    });

    // Find admin users (could be 'admin', 'administrator', or users with admin emails)
    const adminUsers = await User.find({
      $or: [
        { role: 'admin' },
        { role: 'administrator' },
        { email: { $regex: 'admin@', $options: 'i' } }
      ]
    });

    console.log(`\nFound ${adminUsers.length} potential admin users`);

    // All permissions that should be granted to admins
    const allPermissions = [
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
      'users.manage', // Required for document upload
      'inventory.view',
      'inventory.manage',
      'settings.view',
      'settings.edit',
      'shifts.view',
      'shifts.manage',
      'team.view',
      'team.manage'
    ];

    // Update each admin user
    for (const user of adminUsers) {
      console.log(`\nUpdating ${user.email}:`);
      console.log(`  Current permissions: ${user.permissions?.length || 0}`);
      
      // Set all permissions
      user.permissions = allPermissions;
      
      // Make sure role is 'admin'
      if (user.role !== 'admin') {
        console.log(`  Changing role from '${user.role}' to 'admin'`);
        user.role = 'admin';
      }
      
      await user.save();
      console.log(`  Updated permissions: ${user.permissions.length}`);
    }

    // Also update any user with @hardrockcafe.ae email
    const hardRockUsers = await User.find({ 
      email: { $regex: '@hardrockcafe.ae$', $options: 'i' } 
    });
    
    console.log(`\nFound ${hardRockUsers.length} Hard Rock Cafe users`);
    
    for (const user of hardRockUsers) {
      if (user.email.startsWith('admin@')) {
        console.log(`Updating Hard Rock admin: ${user.email}`);
        user.permissions = allPermissions;
        user.role = 'admin';
        await user.save();
      }
    }

    console.log('\nPermissions update completed successfully!');
    
    // Test specific user
    const testUser = await User.findOne({ email: 'admin@hardrockcafe.ae' });
    if (testUser) {
      console.log(`\nTest user admin@hardrockcafe.ae:`);
      console.log(`  Role: ${testUser.role}`);
      console.log(`  Has users.manage: ${testUser.permissions?.includes('users.manage')}`);
      console.log(`  Total permissions: ${testUser.permissions?.length}`);
    }

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkAndFixPermissions();