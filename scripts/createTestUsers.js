// scripts/createTestUsers.js - Add this to your BACKEND project
const mongoose = require('mongoose');
const User = require('../src/models/User');
require('dotenv').config();

async function createTestUsers() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/restaurant');
    console.log('Connected to MongoDB');

    // Create test waiter
    const waiterData = {
      name: 'John Waiter',
      email: 'waiter@restaurant.com',
      password: 'password123',
      role: 'waiter',
      phone: '+1234567890',
      isActive: true,
      permissions: ['orders.view', 'orders.edit', 'menu.view']
    };

    // Create test chef
    const chefData = {
      name: 'Chef Gordon',
      email: 'chef@restaurant.com',
      password: 'password123',
      role: 'chef',
      phone: '+1234567891',
      isActive: true,
      permissions: ['orders.view', 'menu.view']
    };

    // Create test manager
    const managerData = {
      name: 'Manager Smith',
      email: 'manager@restaurant.com',
      password: 'password123',
      role: 'manager',
      phone: '+1234567892',
      isActive: true,
      permissions: ['menu.view', 'menu.edit', 'orders.view', 'orders.edit', 'analytics.view']
    };

    // Check if users already exist
    const existingWaiter = await User.findOne({ email: waiterData.email });
    if (!existingWaiter) {
      await User.create(waiterData);
      console.log('✅ Test waiter created');
    } else {
      console.log('ℹ️ Test waiter already exists');
    }

    const existingChef = await User.findOne({ email: chefData.email });
    if (!existingChef) {
      await User.create(chefData);
      console.log('✅ Test chef created');
    } else {
      console.log('ℹ️ Test chef already exists');
    }

    const existingManager = await User.findOne({ email: managerData.email });
    if (!existingManager) {
      await User.create(managerData);
      console.log('✅ Test manager created');
    } else {
      console.log('ℹ️ Test manager already exists');
    }

    console.log('\nTest credentials:');
    console.log('Waiter: waiter@restaurant.com / password123');
    console.log('Chef: chef@restaurant.com / password123');
    console.log('Manager: manager@restaurant.com / password123');

    // Create test tables
    const Table = require('../src/models/Table');
    
    for (let i = 1; i <= 5; i++) {
      const existingTable = await Table.findOne({ number: i.toString() });
      if (!existingTable) {
        await Table.create({
          number: i.toString(),
          capacity: 4,
          status: 'available',
          location: { floor: '1', section: 'main' }
        });
        console.log(`✅ Table ${i} created`);
      }
    }

    mongoose.connection.close();
    console.log('\n✅ Setup complete!');
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

createTestUsers();