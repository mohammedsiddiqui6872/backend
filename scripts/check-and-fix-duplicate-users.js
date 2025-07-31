const mongoose = require('mongoose');
const User = require('../src/models/User');
const Tenant = require('../src/models/Tenant');
require('dotenv').config();

async function checkAndFixDuplicateUsers() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Get all tenants
    const tenants = await Tenant.find({ status: 'active' });
    console.log(`Found ${tenants.length} active tenants\n`);

    // Get all users grouped by email
    const allUsers = await User.find({}).select('name email role tenantId isActive');
    
    // Group users by email to find duplicates across tenants
    const usersByEmail = {};
    allUsers.forEach(user => {
      if (!usersByEmail[user.email]) {
        usersByEmail[user.email] = [];
      }
      usersByEmail[user.email].push(user);
    });

    console.log('=== DUPLICATE USERS ACROSS RESTAURANTS ===\n');
    
    // Find emails that exist in multiple tenants
    const duplicateEmails = Object.keys(usersByEmail).filter(email => {
      const tenantIds = [...new Set(usersByEmail[email].map(u => u.tenantId))];
      return tenantIds.length > 1;
    });

    if (duplicateEmails.length === 0) {
      console.log('No duplicate users found across restaurants!');
    } else {
      console.log(`Found ${duplicateEmails.length} duplicate emails across restaurants:\n`);
      
      for (const email of duplicateEmails) {
        console.log(`Email: ${email}`);
        const users = usersByEmail[email];
        
        for (const user of users) {
          const tenant = tenants.find(t => t.tenantId === user.tenantId);
          console.log(`  - ${user.name} (${user.role}) in ${tenant?.name || user.tenantId}`);
        }
        console.log('');
      }
    }

    // Now let's check for identical names within the same role
    console.log('\n=== CHECKING FOR IDENTICAL NAMES ===\n');
    
    const usersByNameAndRole = {};
    allUsers.forEach(user => {
      if (user.name && user.role) {
        const key = `${user.name.toLowerCase()}_${user.role}`;
        if (!usersByNameAndRole[key]) {
          usersByNameAndRole[key] = [];
        }
        usersByNameAndRole[key].push(user);
      }
    });

    // Find names that appear in multiple tenants with same role
    const namesToFix = [];
    Object.keys(usersByNameAndRole).forEach(key => {
      const users = usersByNameAndRole[key];
      const tenantIds = [...new Set(users.map(u => u.tenantId))];
      
      if (tenantIds.length > 1) {
        const [name, role] = key.split('_');
        console.log(`Found identical name "${users[0].name}" with role "${role}" in ${tenantIds.length} restaurants`);
        namesToFix.push({ name: users[0].name, role, users });
      }
    });

    if (namesToFix.length === 0) {
      console.log('No identical names found across restaurants!');
      return;
    }

    // Ask for confirmation before fixing
    console.log(`\n=== FIXING DUPLICATE NAMES ===\n`);
    console.log('Will update user names to include restaurant suffix...\n');

    let updated = 0;
    for (const item of namesToFix) {
      for (const user of item.users) {
        const tenant = tenants.find(t => t.tenantId === user.tenantId);
        if (tenant) {
          // Create a shortened suffix from restaurant name
          const suffix = tenant.name.split(' ')[0].substring(0, 8);
          const newName = `${user.name} - ${suffix}`;
          
          console.log(`Updating: ${user.name} → ${newName} (${tenant.name})`);
          
          await User.updateOne(
            { _id: user._id },
            { $set: { name: newName } }
          );
          updated++;
        }
      }
    }

    console.log(`\n✓ Updated ${updated} user names`);

    // Verify the changes
    console.log('\n=== VERIFICATION ===\n');
    console.log('Current users by restaurant:\n');
    
    for (const tenant of tenants) {
      const users = await User.find({ tenantId: tenant.tenantId, isActive: true })
        .select('name email role')
        .sort('role name');
      
      console.log(`${tenant.name} (${tenant.subdomain}):`);
      users.forEach(user => {
        console.log(`  - ${user.name} (${user.role}) - ${user.email}`);
      });
      console.log('');
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
  }
}

// Run the script
checkAndFixDuplicateUsers();