require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../src/models/User');
const Tenant = require('../src/models/Tenant');

async function createMobileAppTestUser() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/restaurant_saas');
    console.log('Connected to MongoDB');

    // Find the mughlaimagic tenant
    const tenant = await Tenant.findOne({ subdomain: 'mughlaimagic' });
    if (!tenant) {
      console.error('Mughlai Magic tenant not found!');
      process.exit(1);
    }

    console.log('Found tenant:', tenant.name, 'with ID:', tenant.tenantId);

    // Check if user already exists
    const existingUser = await User.findOne({ 
      email: 'mobilewaiter@mughlaimagic.com',
      tenantId: tenant.tenantId
    });

    if (existingUser) {
      console.log('User already exists. Updating password...');
      existingUser.password = 'Test@123';
      existingUser.isActive = true;
      existingUser.role = 'waiter';
      await existingUser.save();
      console.log('Password updated successfully');
    } else {
      // Create new waiter user
      const waiterUser = new User({
        name: 'Mobile Test Waiter',
        email: 'mobilewaiter@mughlaimagic.com',
        password: 'Test@123',
        role: 'waiter',
        tenantId: tenant.tenantId,
        phone: '+971501234567',
        isActive: true,
        permissions: [
          'tables.view',
          'tables.manage',
          'orders.view',
          'orders.edit',
          'orders.cancel'
        ]
      });

      await waiterUser.save();
      console.log('Mobile waiter user created successfully!');
    }

    // Also create a chef user for testing
    const existingChef = await User.findOne({ 
      email: 'mobilechef@mughlaimagic.com',
      tenantId: tenant.tenantId
    });

    if (existingChef) {
      console.log('Chef user already exists. Updating password...');
      existingChef.password = 'Test@123';
      existingChef.isActive = true;
      existingChef.role = 'chef';
      await existingChef.save();
      console.log('Chef password updated successfully');
    } else {
      const chefUser = new User({
        name: 'Mobile Test Chef',
        email: 'mobilechef@mughlaimagic.com',
        password: 'Test@123',
        role: 'chef',
        tenantId: tenant.tenantId,
        phone: '+971501234568',
        isActive: true,
        permissions: [
          'orders.view',
          'orders.edit',
          'menu.view'
        ]
      });

      await chefUser.save();
      console.log('Mobile chef user created successfully!');
    }

    // Also create a manager user for testing
    const existingManager = await User.findOne({ 
      email: 'mobilemanager@mughlaimagic.com',
      tenantId: tenant.tenantId
    });

    if (existingManager) {
      console.log('Manager user already exists. Updating password...');
      existingManager.password = 'Test@123';
      existingManager.isActive = true;
      existingManager.role = 'manager';
      await existingManager.save();
      console.log('Manager password updated successfully');
    } else {
      const managerUser = new User({
        name: 'Mobile Test Manager',
        email: 'mobilemanager@mughlaimagic.com',
        password: 'Test@123',
        role: 'manager',
        tenantId: tenant.tenantId,
        phone: '+971501234569',
        isActive: true,
        permissions: [
          'tables.view',
          'tables.manage',
          'orders.view',
          'orders.edit',
          'orders.cancel',
          'menu.view',
          'menu.edit',
          'users.view',
          'users.manage',
          'analytics.view',
          'shifts.view',
          'shifts.manage'
        ]
      });

      await managerUser.save();
      console.log('Mobile manager user created successfully!');
    }

    console.log('\n=== Mobile App Test Users Created ===');
    console.log('Waiter: mobilewaiter@mughlaimagic.com / Test@123');
    console.log('Chef: mobilechef@mughlaimagic.com / Test@123');
    console.log('Manager: mobilemanager@mughlaimagic.com / Test@123');
    console.log('Tenant ID:', tenant.tenantId);
    console.log('Subdomain:', tenant.subdomain);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
  }
}

createMobileAppTestUser();