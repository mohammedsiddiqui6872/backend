const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Tenant = require('../models/Tenant');
require('dotenv').config();

async function debugPasswordReset() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Test password hashing
    const testPassword = 'TestPassword123!';
    console.log('\n=== Testing Password Hashing ===');
    console.log('Original password:', testPassword);
    
    // Test direct bcrypt hash (what securePasswordReset.js does)
    const directHash = await bcrypt.hash(testPassword, 10);
    console.log('Direct bcrypt hash:', directHash);
    
    // Test what happens when we set it on a user
    const testSubdomain = 'mughlaimagic';
    const tenant = await Tenant.findOne({ subdomain: testSubdomain });
    
    if (!tenant) {
      console.error('Tenant not found:', testSubdomain);
      return;
    }

    console.log('\nFound tenant:', tenant.name);

    // Find an admin user
    const adminUser = await User.findOne({
      tenantId: tenant.tenantId,
      email: `admin@${testSubdomain}.ae`
    }).setOptions({ skipTenantFilter: true });

    if (!adminUser) {
      console.error('Admin user not found');
      return;
    }

    console.log('\nFound admin user:', adminUser.email);
    console.log('Current password hash:', adminUser.password);

    // Test 1: Set password directly (this will trigger pre-save hook)
    console.log('\n=== Test 1: Setting password directly ===');
    adminUser.password = testPassword;
    await adminUser.save();
    console.log('Password after save:', adminUser.password);
    
    // Test password comparison
    const directCompare = await bcrypt.compare(testPassword, adminUser.password);
    console.log('Direct password comparison:', directCompare);
    
    const methodCompare = await adminUser.comparePassword(testPassword);
    console.log('Method password comparison:', methodCompare);

    // Test 2: Simulate what secure password reset does (double hashing issue)
    console.log('\n=== Test 2: Simulating secure password reset (double hash) ===');
    const preHashedPassword = await bcrypt.hash(testPassword, 10);
    console.log('Pre-hashed password:', preHashedPassword);
    
    adminUser.password = preHashedPassword;
    await adminUser.save();
    console.log('Password after save (double hashed):', adminUser.password);
    
    // This will fail because password is double-hashed
    const doubleHashCompare = await adminUser.comparePassword(testPassword);
    console.log('Double hash password comparison:', doubleHashCompare);
    
    // But comparing with the pre-hashed password won't work either
    const preHashCompare = await adminUser.comparePassword(preHashedPassword);
    console.log('Pre-hash password comparison:', preHashCompare);

    console.log('\n=== ISSUE IDENTIFIED ===');
    console.log('The secure password reset is hashing the password before setting it on the user.');
    console.log('The User model pre-save hook then hashes it AGAIN, causing double hashing.');
    console.log('This is why login fails - the password is double-hashed!');

  } catch (error) {
    console.error('Debug error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  }
}

debugPasswordReset();