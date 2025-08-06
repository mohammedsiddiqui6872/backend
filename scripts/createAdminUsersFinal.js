const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

if (!process.env.MONGODB_URI) {
  console.error('Error: MONGODB_URI environment variable is not set');
  console.error('Please run: export MONGODB_URI="your-mongodb-connection-string"');
  process.exit(1);
}

async function createAdminUsersFinal() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Direct database operations to bypass model validations
    const db = mongoose.connection.db;
    const usersCollection = db.collection('users');
    const rolesCollection = db.collection('roles');

    // Admin users to create
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
      const allAccessRole = await rolesCollection.findOne({
        tenantId: userData.tenantId,
        $or: [
          { code: 'ALL_ACCESS' },
          { name: 'All Access' }
        ]
      });

      if (!allAccessRole) {
        console.log(`No All Access role found for tenant ${userData.tenantId}`);
        continue;
      }

      console.log(`Found All Access role: ${allAccessRole.name} (${allAccessRole.code})`);

      // Check if user exists
      const existingUser = await usersCollection.findOne({
        email: userData.email,
        tenantId: userData.tenantId
      });

      if (existingUser) {
        // Update existing user
        await usersCollection.updateOne(
          { _id: existingUser._id },
          {
            $set: {
              roleId: allAccessRole._id,
              role: 'admin',
              isActive: true,
              emailVerified: true,
              updatedAt: new Date()
            }
          }
        );
        console.log('✓ Updated existing user with All Access role');
      } else {
        // Create new user
        const hashedPassword = await bcrypt.hash(userData.password, 10);
        
        await usersCollection.insertOne({
          email: userData.email,
          name: userData.name,
          password: hashedPassword,
          tenantId: userData.tenantId,
          role: 'admin',
          roleId: allAccessRole._id,
          isActive: true,
          emailVerified: true,
          permissions: [], // Empty array, permissions come from role
          createdAt: new Date(),
          updatedAt: new Date()
        });
        console.log('✓ Created new admin user');
      }
    }

    // Verify the users were created/updated
    console.log('\n--- Verification ---');
    const adminUsersInDb = await usersCollection.find({
      email: { $in: ['admin@mughlaimagic.ae', 'admin@bellavista.ae', 'admin@hardrockcafe.ae'] }
    }).toArray();

    for (const user of adminUsersInDb) {
      const role = await rolesCollection.findOne({ _id: user.roleId });
      console.log(`\nUser: ${user.email}`);
      console.log(`  Tenant: ${user.tenantId}`);
      console.log(`  Role: ${role?.name || 'No role'} (${role?.code || 'N/A'})`);
      console.log(`  Permissions from role: ${role?.permissions?.length || 0}`);
      console.log(`  Has inventory.reports: ${role?.permissions?.includes('inventory.reports') || false}`);
      console.log(`  Has purchase.view: ${role?.permissions?.includes('purchase.view') || false}`);
    }

    console.log('\n\n✅ SUCCESS! Admin users created/updated.');
    console.log('Default password: Admin@123');
    console.log('Users can now log in and access inventory/purchase endpoints.');
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

createAdminUsersFinal();