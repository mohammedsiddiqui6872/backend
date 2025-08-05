const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const User = require('../src/models/User');

async function createTestUser() {
  try {
    // Use production MongoDB URI
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to Production MongoDB');

    // Create a test waiter user for Mughlai Magic
    const hashedPassword = await bcrypt.hash('Test@123', 10);
    
    // First check if user exists
    const existingUser = await User.findOne({ 
      email: 'testwaiter@mughlaimagic.ae',
      tenantId: 'rest_mughlaimagic_001'
    });

    if (existingUser) {
      console.log('User already exists, updating password...');
      existingUser.password = hashedPassword;
      existingUser.isActive = true;
      await existingUser.save();
      console.log('Password updated successfully');
    } else {
      const testUser = await User.create({
        name: 'Test Waiter',
        email: 'testwaiter@mughlaimagic.ae',
        password: hashedPassword,
        role: 'waiter',
        tenantId: 'rest_mughlaimagic_001',
        isActive: true,
        // permissions: ['view_orders', 'manage_tables', 'update_order_status'],
        employeeId: 'EMP-TEST-001',
        department: 'Service',
        position: 'Waiter',
        personalInfo: {
          dateOfBirth: new Date('1990-01-01'),
          gender: 'male',
          nationality: 'UAE',
          address: {
            street: 'Test Street',
            city: 'Dubai',
            state: 'Dubai',
            country: 'UAE',
            zipCode: '12345'
          },
          phone: '+971501234567',
          emergencyContact: {
            name: 'Emergency Contact',
            relationship: 'Friend',
            phone: '+971501234568'
          }
        }
      });

      console.log('Test user created successfully');
    }

    console.log('Test user credentials:', {
      email: 'testwaiter@mughlaimagic.ae',
      password: 'Test@123',
      tenantId: 'rest_mughlaimagic_001',
      role: 'waiter'
    });

    process.exit(0);
  } catch (error) {
    console.error('Error creating test user:', error.message);
    if (error.errors) {
      Object.keys(error.errors).forEach(field => {
        console.error(`${field}: ${error.errors[field].message}`);
      });
    }
    process.exit(1);
  }
}

createTestUser();