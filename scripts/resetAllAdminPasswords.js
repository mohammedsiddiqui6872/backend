const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../src/models/User');
const Tenant = require('../src/models/Tenant');
require('dotenv').config();

async function resetAllAdminPasswords() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB\n');

    // Get all tenants
    const tenants = await Tenant.find({ isActive: true });
    console.log(`Found ${tenants.length} active restaurants\n`);

    const newPassword = 'password@123';
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    let totalUpdated = 0;
    
    // Process each tenant
    for (const tenant of tenants) {
      console.log(`\nProcessing: ${tenant.name} (${tenant.subdomain}.gritservices.ae)`);
      console.log('Tenant ID:', tenant.tenantId);
      
      // Find all admin users for this tenant
      const adminUsers = await User.find({
        tenantId: tenant.tenantId,
        role: 'admin',
        $or: [
          { isActive: true },
          { isActive: { $exists: false } }
        ]
      });
      
      console.log(`  Found ${adminUsers.length} admin user(s)`);
      
      // Update each admin user's password
      for (const admin of adminUsers) {
        admin.password = hashedPassword;
        admin.isActive = true; // Ensure they're active
        await admin.save();
        
        console.log(`  ✓ Updated: ${admin.email} (${admin.name || 'No name'})`);
        totalUpdated++;
      }
      
      // If no admin users found, list all users for debugging
      if (adminUsers.length === 0) {
        const allUsers = await User.find({ tenantId: tenant.tenantId });
        console.log(`  ⚠ No admin users found. Total users: ${allUsers.length}`);
        if (allUsers.length > 0) {
          console.log('  Available users:');
          allUsers.forEach(user => {
            console.log(`    - ${user.email} (Role: ${user.role || 'No role'})`);
          });
        }
      }
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('PASSWORD RESET COMPLETE');
    console.log('='.repeat(60));
    console.log(`Total admin users updated: ${totalUpdated}`);
    console.log(`New password for all admin users: ${newPassword}`);
    console.log('\nAdmin users can now login to their respective admin panels with:');
    console.log('- Their existing email address');
    console.log('- Password: password@123');
    console.log('\nIMPORTANT: Users should change this password after logging in!');
    console.log('='.repeat(60));
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\nDisconnected from MongoDB');
  }
}

// Add confirmation prompt for safety
const readline = require('readline');
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('⚠️  WARNING: This will reset ALL admin passwords across ALL restaurants!');
console.log('New password will be: password@123\n');

rl.question('Are you sure you want to continue? (yes/no): ', (answer) => {
  if (answer.toLowerCase() === 'yes') {
    rl.close();
    resetAllAdminPasswords();
  } else {
    console.log('Operation cancelled.');
    rl.close();
    process.exit(0);
  }
});