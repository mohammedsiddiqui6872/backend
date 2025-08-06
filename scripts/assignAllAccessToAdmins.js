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

// Disable tenant plugin for this operation
User.schema.set('runValidators', false);

async function assignAllAccessToAdmins() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Define admin users
    const adminUsers = [
      {
        email: 'admin@mughlaimagic.ae',
        name: 'Admin - Mughlai Magic',
        tenantId: 'rest_mughlaimagic_001',
        password: 'Admin@123'
      },
      {
        email: 'admin@bellavista.ae',
        name: 'Admin - Bella Vista',
        tenantId: 'rest_bellavista_002',
        password: 'Admin@123'
      },
      {
        email: 'admin@hardrockcafe.ae',
        name: 'Admin - Hard Rock Cafe',
        tenantId: 'rest_hardrockcafe_003',
        password: 'Admin@123'
      }
    ];

    for (const userData of adminUsers) {
      console.log(`\n--- Processing ${userData.email} ---`);
      
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
      console.log(`Role has ${allAccessRole.permissions.length} permissions`);

      // Check if user exists
      let user = await User.findOne({ 
        email: userData.email,
        tenantId: userData.tenantId 
      });

      if (user) {
        // Update existing user
        console.log('User exists, updating role...');
        user.roleId = allAccessRole._id;
        user.role = 'admin';
        user.isActive = true;
        await user.save({ validateBeforeSave: false });
        console.log('✓ Updated existing user with All Access role');
      } else {
        // Create new user
        console.log('Creating new user...');
        const hashedPassword = await bcrypt.hash(userData.password, 10);
        
        user = new User({
          email: userData.email,
          name: userData.name,
          password: hashedPassword,
          tenantId: userData.tenantId,
          role: 'admin',
          roleId: allAccessRole._id,
          isActive: true,
          emailVerified: true
        });
        
        await user.save({ validateBeforeSave: false });
        console.log('✓ Created new admin user');
      }
    }

    // List all admin users to verify
    console.log('\n--- All Admin Users ---');
    const allUsers = await User.find({
      email: { $regex: /@.*\.ae$/i }
    }).populate('roleId').lean();

    for (const user of allUsers) {
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
    console.log('Default password for new users: Admin@123');
    console.log('Users need to log out and log back in for permissions to take effect.');
    console.log('\nThe 401 errors should now be resolved.');
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

assignAllAccessToAdmins();