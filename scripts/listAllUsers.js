const mongoose = require('mongoose');
const User = require('../src/models/User');
require('dotenv').config();

if (!process.env.MONGODB_URI) {
  console.error('Error: MONGODB_URI environment variable is not set');
  console.error('Please run: export MONGODB_URI="your-mongodb-connection-string"');
  process.exit(1);
}

// Bypass tenant plugin for this script
mongoose.set('runValidators', false);

async function listAllUsers() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Get all users without tenant filtering
    const users = await User.find({}).select('email name tenantId role roleId').lean();
    
    console.log(`Total users found: ${users.length}\n`);
    
    // Group by tenant
    const usersByTenant = {};
    users.forEach(user => {
      const tenant = user.tenantId || 'No tenant';
      if (!usersByTenant[tenant]) {
        usersByTenant[tenant] = [];
      }
      usersByTenant[tenant].push(user);
    });

    // Display users by tenant
    for (const [tenant, tenantUsers] of Object.entries(usersByTenant)) {
      console.log(`\n--- Tenant: ${tenant} ---`);
      tenantUsers.forEach(user => {
        console.log(`  Email: ${user.email}`);
        console.log(`    Name: ${user.name}`);
        console.log(`    Role: ${user.role}`);
        console.log(`    RoleId: ${user.roleId || 'None'}`);
      });
    }

    // Look for admin-like users
    console.log('\n--- Admin-like users ---');
    const adminUsers = users.filter(u => 
      u.email?.includes('admin') || 
      u.role === 'admin' ||
      u.email?.endsWith('.ae')
    );
    
    adminUsers.forEach(user => {
      console.log(`\nEmail: ${user.email}`);
      console.log(`  Name: ${user.name}`);
      console.log(`  Tenant: ${user.tenantId}`);
      console.log(`  Role: ${user.role}`);
      console.log(`  RoleId: ${user.roleId || 'None'}`);
    });

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

listAllUsers();