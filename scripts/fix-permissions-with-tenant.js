require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../src/models/User');
const Tenant = require('../src/models/Tenant');

async function fixPermissionsWithTenant() {
  try {
    // Connect without any middleware
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // First, let's bypass the tenant filter by querying directly
    const db = mongoose.connection.db;
    
    // Get all users directly from the database
    const usersCollection = db.collection('users');
    const allUsers = await usersCollection.find({}).toArray();
    
    console.log(`\nTotal users in database: ${allUsers.length}`);
    
    // Show some users
    console.log('\nSample users:');
    allUsers.slice(0, 10).forEach(user => {
      console.log(`  - ${user.email} (${user.role}) - Tenant: ${user.tenantId}`);
    });

    // All permissions for admin users
    const adminPermissions = [
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

    // Find and update admin users
    const adminUsers = allUsers.filter(user => 
      user.role === 'admin' || 
      user.email?.toLowerCase().includes('admin@')
    );

    console.log(`\nFound ${adminUsers.length} admin users to update`);

    for (const user of adminUsers) {
      console.log(`\nUpdating ${user.email}:`);
      
      // Update directly in database
      const result = await usersCollection.updateOne(
        { _id: user._id },
        { 
          $set: { 
            permissions: adminPermissions,
            role: 'admin'
          } 
        }
      );
      
      console.log(`  Updated: ${result.modifiedCount > 0 ? 'Success' : 'No changes'}`);
    }

    // Specifically check for Hard Rock Cafe admin
    const hardRockAdmin = await usersCollection.findOne({ 
      email: 'admin@hardrockcafe.ae' 
    });
    
    if (hardRockAdmin) {
      console.log(`\nHard Rock Cafe admin found:`);
      console.log(`  Current permissions: ${hardRockAdmin.permissions?.length || 0}`);
      
      const updateResult = await usersCollection.updateOne(
        { _id: hardRockAdmin._id },
        { 
          $set: { 
            permissions: adminPermissions,
            role: 'admin'
          } 
        }
      );
      
      console.log(`  Update result: ${updateResult.modifiedCount > 0 ? 'Permissions updated!' : 'No changes needed'}`);
    }

    console.log('\nPermissions update completed!');
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

fixPermissionsWithTenant();