const mongoose = require('mongoose');
const User = require('../src/models/User');
const Role = require('../src/models/Role');
require('dotenv').config();

if (!process.env.MONGODB_URI) {
  console.error('Error: MONGODB_URI environment variable is not set');
  console.error('Please run: export MONGODB_URI="your-mongodb-connection-string"');
  process.exit(1);
}

async function checkUserRoles() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Find admin users
    const adminUsers = await User.find({
      $or: [
        { role: 'admin' },
        { email: { $regex: /admin/i } },
        { roleId: { $exists: true } }
      ]
    }).populate('roleId');

    console.log(`\nFound ${adminUsers.length} potential admin users:`);

    for (const user of adminUsers) {
      console.log(`\n--- User: ${user.email} ---`);
      console.log(`  Name: ${user.name}`);
      console.log(`  TenantId: ${user.tenantId}`);
      console.log(`  Role (string): ${user.role}`);
      console.log(`  RoleId: ${user.roleId?._id}`);
      if (user.roleId) {
        console.log(`  Role Name: ${user.roleId.name}`);
        console.log(`  Role Code: ${user.roleId.code}`);
        console.log(`  Role Permissions: ${user.roleId.permissions.length}`);
        console.log(`  Has inventory.reports: ${user.roleId.permissions.includes('inventory.reports')}`);
        console.log(`  Has purchase.view: ${user.roleId.permissions.includes('purchase.view')}`);
      }
    }

    process.exit(0);
  } catch (error) {
    console.error('Error checking user roles:', error);
    process.exit(1);
  }
}

checkUserRoles();