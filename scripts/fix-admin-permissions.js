require('dotenv').config();
const mongoose = require('mongoose');

async function fixPermissionsValidOnly() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const db = mongoose.connection.db;
    const usersCollection = db.collection('users');

    // Valid permissions according to the User model
    const validAdminPermissions = [
      'menu.view', 'menu.edit', 'menu.delete',
      'orders.view', 'orders.edit', 'orders.delete', 'orders.cancel',
      'analytics.view', 'analytics.export',
      'users.view', 'users.manage', 'users.delete',
      'tables.view', 'tables.manage',
      'inventory.view', 'inventory.manage',
      'payments.view', 'payments.process', 'payments.refund',
      'settings.view', 'settings.manage',
      'shifts.view', 'shifts.manage', 'shifts.approve'
    ];

    // Find all admin users
    const adminUsers = await usersCollection.find({
      $or: [
        { role: 'admin' },
        { email: { $regex: 'admin@', $options: 'i' } }
      ]
    }).toArray();

    console.log(`Found ${adminUsers.length} admin users to fix`);

    for (const user of adminUsers) {
      console.log(`\nFixing ${user.email}:`);
      console.log(`  Current permissions: ${user.permissions?.length || 0}`);
      
      // Update with only valid permissions
      const result = await usersCollection.updateOne(
        { _id: user._id },
        { 
          $set: { 
            permissions: validAdminPermissions,
            role: 'admin'
          } 
        }
      );
      
      console.log(`  Updated: ${result.modifiedCount > 0 ? 'Success' : 'No changes'}`);
    }

    // Specifically fix Hard Rock Cafe admin
    const hardRockAdmin = await usersCollection.findOne({ 
      email: 'admin@hardrockcafe.ae' 
    });
    
    if (hardRockAdmin) {
      console.log(`\nFixing Hard Rock Cafe admin specifically:`);
      
      const updateResult = await usersCollection.updateOne(
        { _id: hardRockAdmin._id },
        { 
          $set: { 
            permissions: validAdminPermissions,
            role: 'admin'
          } 
        }
      );
      
      console.log(`  Update result: ${updateResult.modifiedCount > 0 ? 'Permissions fixed!' : 'Already fixed'}`);
    }

    // Also fix any other restaurant admins
    const restaurantDomains = ['mughlaimagic.ae', 'bellavista.ae', 'hardrockcafe.ae'];
    
    for (const domain of restaurantDomains) {
      const adminEmail = `admin@${domain}`;
      const admin = await usersCollection.findOne({ email: adminEmail });
      
      if (admin) {
        await usersCollection.updateOne(
          { _id: admin._id },
          { 
            $set: { 
              permissions: validAdminPermissions,
              role: 'admin'
            } 
          }
        );
        console.log(`Fixed ${adminEmail}`);
      }
    }

    console.log('\nAll admin permissions fixed with valid values only!');
    console.log('\nValid permissions set:');
    validAdminPermissions.forEach(p => console.log(`  - ${p}`));
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

fixPermissionsValidOnly();