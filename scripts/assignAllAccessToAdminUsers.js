const mongoose = require('mongoose');
const Role = require('../src/models/Role');
const User = require('../src/models/User');
require('dotenv').config();

if (!process.env.MONGODB_URI) {
  console.error('Error: MONGODB_URI environment variable is not set');
  console.error('Please run: export MONGODB_URI="your-mongodb-connection-string"');
  process.exit(1);
}

async function assignAllAccessToAdminUsers() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // First, let's find all users with admin emails
    const adminUsers = await User.find({
      email: { $regex: /^admin@.*\.ae$/i }
    });

    console.log(`Found ${adminUsers.length} admin users with @*.ae emails`);

    // Group users by tenant
    const usersByTenant = {};
    adminUsers.forEach(user => {
      if (!usersByTenant[user.tenantId]) {
        usersByTenant[user.tenantId] = [];
      }
      usersByTenant[user.tenantId].push(user);
    });

    // Process each tenant
    for (const [tenantId, users] of Object.entries(usersByTenant)) {
      console.log(`\n--- Processing tenant: ${tenantId} ---`);
      
      // Find the All Access role for this tenant
      const allAccessRole = await Role.findOne({
        tenantId: tenantId,
        $or: [
          { code: 'ALL_ACCESS' },
          { name: 'All Access' },
          { code: 'ALL ACCESS' } // Check for the old format too
        ]
      });

      if (!allAccessRole) {
        console.log('No All Access role found for this tenant!');
        continue;
      }

      console.log(`Found All Access role: ${allAccessRole.name} (${allAccessRole.code})`);
      console.log(`Role has ${allAccessRole.permissions.length} permissions`);

      // Update each user
      for (const user of users) {
        const oldRole = await Role.findById(user.roleId);
        console.log(`\nUpdating user: ${user.email}`);
        console.log(`  Name: ${user.name}`);
        console.log(`  Current role: ${oldRole?.name || 'None'} (${oldRole?.code || 'N/A'})`);
        
        user.roleId = allAccessRole._id;
        user.role = 'admin'; // Ensure role string is set
        await user.save();
        
        console.log(`  ✓ Assigned All Access role`);
      }
    }

    // Also check for any specific known admin emails
    const knownAdminEmails = [
      'admin@mughlaimagic.ae',
      'admin@bellavista.ae',
      'admin@hardrockcafe.ae'
    ];

    console.log('\n--- Checking specific admin emails ---');
    for (const email of knownAdminEmails) {
      const user = await User.findOne({ email: { $regex: new RegExp(`^${email}$`, 'i') } });
      if (user) {
        console.log(`\nFound user: ${user.email}`);
        const allAccessRole = await Role.findOne({
          tenantId: user.tenantId,
          $or: [
            { code: 'ALL_ACCESS' },
            { name: 'All Access' },
            { code: 'ALL ACCESS' }
          ]
        });
        
        if (allAccessRole) {
          user.roleId = allAccessRole._id;
          user.role = 'admin';
          await user.save();
          console.log(`  ✓ Assigned All Access role`);
        }
      }
    }

    // Final verification
    console.log('\n--- Final Verification ---');
    const updatedUsers = await User.find({
      email: { $regex: /^admin@.*\.ae$/i }
    }).populate('roleId');

    for (const user of updatedUsers) {
      console.log(`\nUser: ${user.email}`);
      console.log(`  Name: ${user.name}`);
      console.log(`  Tenant: ${user.tenantId}`);
      console.log(`  Role: ${user.roleId?.name || 'No role'}`);
      console.log(`  Role Code: ${user.roleId?.code || 'N/A'}`);
      console.log(`  Permissions: ${user.roleId?.permissions?.length || 0}`);
      console.log(`  Has inventory.reports: ${user.roleId?.permissions?.includes('inventory.reports') || false}`);
      console.log(`  Has purchase.view: ${user.roleId?.permissions?.includes('purchase.view') || false}`);
    }

    console.log('\n\nAll admin users have been assigned the All Access role!');
    console.log('Users need to log out and log back in for the new permissions to take effect.');
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

assignAllAccessToAdminUsers();