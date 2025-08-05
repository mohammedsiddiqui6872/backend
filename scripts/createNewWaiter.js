const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const User = require('../src/models/User');

async function createNewWaiter() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Delete existing test user if exists
    await User.deleteOne({ email: 'mobiletest@mughlaimagic.ae' });

    // Create new user with minimal required fields
    const hashedPassword = await bcrypt.hash('Test@123', 10);
    
    const newUser = new User({
      name: 'Mobile Test User',
      email: 'mobiletest@mughlaimagic.ae',
      password: hashedPassword,
      role: 'waiter',
      tenantId: 'rest_mughlaimagic_001',
      isActive: true
    });

    await newUser.save();
    console.log('User created successfully!');
    
    console.log('\nLogin credentials:');
    console.log('Email: mobiletest@mughlaimagic.ae');
    console.log('Password: Test@123');
    console.log('Tenant: mughlaimagic');

    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    if (error.errors) {
      Object.keys(error.errors).forEach(key => {
        console.error(`${key}: ${error.errors[key].message}`);
      });
    }
    process.exit(1);
  }
}

createNewWaiter();