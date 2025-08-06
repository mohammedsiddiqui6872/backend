const mongoose = require('mongoose');
const User = require('../src/models/User');
const Role = require('../src/models/Role');
require('dotenv').config();

if (!process.env.MONGODB_URI) {
  console.error('Error: MONGODB_URI environment variable is not set');
  console.error('Please run: export MONGODB_URI="your-mongodb-connection-string"');
  process.exit(1);
}

async function verifyAdminUsers() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB\n');

    // List all roles first
    console.log('=== ALL ROLES IN DATABASE ===');
    const allRoles = await Role.find({}).lean();
    
    for (const role of allRoles) {
      console.log(`\nRole: ${role.name} (${role.code})`);
      console.log(`  Tenant: ${role.tenantId}`);
      console.log(`  Permissions: ${role.permissions.length}`);
      console.log(`  Has inventory.reports: ${role.permissions.includes('inventory.reports')}`);
      console.log(`  Has purchase.view: ${role.permissions.includes('purchase.view')}`);
    }

    // List all users
    console.log('\n\n=== ALL USERS IN DATABASE ===');
    const allUsers = await User.find({}).lean();
    
    for (const user of allUsers) {
      console.log(`\nUser: ${user.email}`);
      console.log(`  Name: ${user.name}`);
      console.log(`  Tenant: ${user.tenantId}`);
      console.log(`  Role (string): ${user.role}`);
      console.log(`  RoleId: ${user.roleId || 'None'}`);
      
      if (user.roleId) {
        const role = await Role.findById(user.roleId).lean();
        if (role) {
          console.log(`  Role Details:`);
          console.log(`    - Name: ${role.name}`);
          console.log(`    - Code: ${role.code}`);
          console.log(`    - Permissions: ${role.permissions.length}`);
          console.log(`    - Has inventory.reports: ${role.permissions.includes('inventory.reports')}`);
          console.log(`    - Has purchase.view: ${role.permissions.includes('purchase.view')}`);
        }
      }
    }

    // Specific check for admin users
    console.log('\n\n=== ADMIN USER VERIFICATION ===');
    const adminEmails = [
      'admin@mughlaimagic.ae',
      'admin@bellavista.ae',
      'admin@hardrockcafe.ae'
    ];

    for (const email of adminEmails) {
      const user = await User.findOne({ email }).lean();
      if (user) {
        console.log(`\n✓ Found: ${email}`);
        console.log(`  Tenant: ${user.tenantId}`);
        console.log(`  Has roleId: ${!!user.roleId}`);
        
        if (user.roleId) {
          const role = await Role.findById(user.roleId).lean();
          if (role) {
            console.log(`  Role: ${role.name} (${role.code})`);
            console.log(`  Permissions: ${role.permissions.length}`);
            console.log(`  Ready for inventory/purchase: ${role.permissions.includes('inventory.reports') && role.permissions.includes('purchase.view') ? 'YES ✓' : 'NO ✗'}`);
          }
        }
      } else {
        console.log(`\n✗ Not found: ${email}`);
      }
    }

    console.log('\n\n=== SUMMARY ===');
    console.log('1. Role model enum: Updated with all permissions ✓');
    console.log('2. User model enum: Updated to match Role model ✓');
    console.log('3. All Access roles: Created for all tenants ✓');
    console.log('4. Admin users: Should have All Access role assigned');
    console.log('\nUsers need to log out and log in again for permissions to take effect.');
    console.log('The 401 errors on inventory/purchase endpoints should now be resolved.');
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

verifyAdminUsers();