const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../src/models/User');
const Tenant = require('../src/models/Tenant');
require('dotenv').config();

async function debugAdminLogin() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB\n');

    // Find the tenant
    const tenant = await Tenant.findOne({ subdomain: 'mughlaimagic' });
    if (!tenant) {
      console.log('Tenant not found!');
      return;
    }

    console.log('Tenant found:', tenant.name);
    console.log('Tenant ID:', tenant.tenantId);

    // Find the admin user
    const adminUser = await User.findOne({
      tenantId: tenant.tenantId,
      email: 'admin@mughlaimagic.ae'
    }).setOptions({ skipTenantFilter: true });

    if (!adminUser) {
      console.log('\nAdmin user not found!');
      
      // List all users for this tenant
      const allUsers = await User.find({ 
        tenantId: tenant.tenantId 
      }).setOptions({ skipTenantFilter: true }).select('email role isActive');
      
      console.log('\nAll users for this tenant:');
      allUsers.forEach(user => {
        console.log(`- ${user.email} (${user.role}) - Active: ${user.isActive}`);
      });
      return;
    }

    console.log('\nAdmin user found:');
    console.log('Email:', adminUser.email);
    console.log('Role:', adminUser.role);
    console.log('Active:', adminUser.isActive);
    console.log('Has password:', !!adminUser.password);
    console.log('Password hash:', adminUser.password?.substring(0, 20) + '...');

    // Test password
    const testPassword = 'password@123'; // Replace with the password you set
    const isValid = await bcrypt.compare(testPassword, adminUser.password);
    console.log('\nPassword test with "password@123":', isValid);

    // Check if password uses bcrypt format
    const isBcrypt = adminUser.password?.startsWith('$2a$') || adminUser.password?.startsWith('$2b$');
    console.log('Password is bcrypt format:', isBcrypt);

    // Reset password to a known value for testing
    console.log('\n--- RESETTING PASSWORD FOR TESTING ---');
    const newPassword = 'TestPassword123!';
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    adminUser.password = hashedPassword;
    adminUser.isActive = true;
    await adminUser.save();
    
    console.log('Password reset to: TestPassword123!');
    console.log('You can now login with:');
    console.log('Email: admin@mughlaimagic.ae');
    console.log('Password: TestPassword123!');

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\nDisconnected from MongoDB');
  }
}

debugAdminLogin();