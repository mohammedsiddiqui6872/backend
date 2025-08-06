const mongoose = require('mongoose');
const User = require('../src/models/User');
const Role = require('../src/models/Role');
const bcrypt = require('bcryptjs');
require('dotenv').config();

if (!process.env.MONGODB_URI) {
  console.error('Error: MONGODB_URI environment variable is not set');
  console.error('Please run: export MONGODB_URI="your-mongodb-connection-string"');
  process.exit(1);
}

async function createAdminUsersWithAllAccess() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Define admin users to create
    const adminUsersToCreate = [
      {
        email: 'admin@mughlaimagic.ae',
        name: 'Admin - Mughlai Magic',
        tenantId: 'rest_mughlaimagic_001',
        password: 'Admin@123' // You should change this
      },
      {
        email: 'admin@bellavista.ae',
        name: 'Admin - Bella Vista',
        tenantId: 'rest_bellavista_002',
        password: 'Admin@123' // You should change this
      },
      {
        email: 'admin@hardrockcafe.ae',
        name: 'Admin - Hard Rock Cafe',
        tenantId: 'rest_hardrockcafe_003',
        password: 'Admin@123' // You should change this
      }
    ];

    for (const userData of adminUsersToCreate) {
      console.log(`\n--- Processing ${userData.email} ---`);
      
      // Check if user already exists
      const existingUser = await User.findOne({ email: userData.email });
      if (existingUser) {
        console.log('User already exists');
        continue;
      }

      // Find the All Access role for this tenant
      const allAccessRole = await Role.findOne({
        tenantId: userData.tenantId,
        $or: [
          { code: 'ALL_ACCESS' },
          { name: 'All Access' },
          { code: 'ALL ACCESS' }
        ]
      });

      if (!allAccessRole) {
        console.log(`No All Access role found for tenant ${userData.tenantId}`);
        continue;
      }

      console.log(`Found All Access role: ${allAccessRole.name} (${allAccessRole.code})`);

      // Hash the password
      const hashedPassword = await bcrypt.hash(userData.password, 10);

      // Create the user
      const newUser = new User({
        email: userData.email,
        name: userData.name,
        password: hashedPassword,
        tenantId: userData.tenantId,
        role: 'admin',
        roleId: allAccessRole._id,
        isActive: true,
        emailVerified: true,
        permissions: allAccessRole.permissions // Copy permissions to user as well
      });

      await newUser.save();
      console.log(`✓ Created admin user: ${userData.email}`);
      console.log(`  Assigned role: ${allAccessRole.name}`);
      console.log(`  Permissions: ${allAccessRole.permissions.length}`);
    }

    // Verify all admin users
    console.log('\n--- Verification of Admin Users ---');
    const allAdminUsers = await User.find({
      email: { $regex: /^admin@.*\.ae$/i }
    }).populate('roleId');

    for (const user of allAdminUsers) {
      console.log(`\nUser: ${user.email}`);
      console.log(`  Name: ${user.name}`);
      console.log(`  Tenant: ${user.tenantId}`);
      console.log(`  Role: ${user.roleId?.name || 'No role'}`);
      console.log(`  Role Code: ${user.roleId?.code || 'N/A'}`);
      console.log(`  Permissions: ${user.roleId?.permissions?.length || 0}`);
      console.log(`  Has inventory.reports: ${user.roleId?.permissions?.includes('inventory.reports') || false}`);
      console.log(`  Has purchase.view: ${user.roleId?.permissions?.includes('purchase.view') || false}`);
    }

    console.log('\n\nAdmin users created successfully!');
    console.log('Default password is: Admin@123 (please change it)');
    console.log('Users can now log in with their credentials.');
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

createAdminUsersWithAllAccess();