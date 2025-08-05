const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const User = require('../src/models/User');

async function createTestUser() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Create a test waiter user for Mughlai Magic
    const hashedPassword = await bcrypt.hash('Test@123', 10);
    
    const testUser = await User.findOneAndUpdate(
      { email: 'testwaiter@mughlaimagic.ae' },
      {
        name: 'Test Waiter',
        email: 'testwaiter@mughlaimagic.ae',
        password: hashedPassword,
        role: 'waiter',
        tenantId: 'rest_mughlaimagic_001',
        isActive: true,
        permissions: ['view_orders', 'manage_tables', 'update_order_status'],
      },
      { upsert: true, new: true }
    );

    console.log('Test user created successfully:', {
      email: testUser.email,
      password: 'Test@123',
      tenantId: testUser.tenantId,
      role: testUser.role
    });

    process.exit(0);
  } catch (error) {
    console.error('Error creating test user:', error);
    process.exit(1);
  }
}

createTestUser();