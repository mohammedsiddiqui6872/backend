require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../src/models/User');
const Tenant = require('../src/models/Tenant');
const asyncLocalStorage = require('../src/utils/asyncLocalStorage');

async function createAdminUsers() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/gritservices');
    console.log('Connected to MongoDB');

    // Define admin users for each tenant
    const adminUsers = [
      {
        tenantId: 'rest_mughlaimagic_001',
        subdomain: 'mughlaimagic',
        users: [
          {
            name: 'Admin',
            email: 'admin@mughlaimagic.ae',
            password: 'password123',
            role: 'admin',
            permissions: ['menu.view', 'menu.edit', 'orders.view', 'orders.edit', 'analytics.view', 'users.manage'],
            phone: '+971501234567',
            tenantId: 'rest_mughlaimagic_001'
          }
        ]
      },
      {
        tenantId: 'rest_bellavista_002',
        subdomain: 'bellavista',
        users: [
          {
            name: 'Admin',
            email: 'admin@bellavista.ae',
            password: 'password123',
            role: 'admin',
            permissions: ['menu.view', 'menu.edit', 'orders.view', 'orders.edit', 'analytics.view', 'users.manage'],
            phone: '+971501234568',
            tenantId: 'rest_bellavista_002'
          }
        ]
      },
      {
        tenantId: 'rest_hardrockcafe_003',
        subdomain: 'hardrockcafe',
        users: [
          {
            name: 'Admin',
            email: 'admin@hardrockcafe.ae',
            password: 'password123',
            role: 'admin',
            permissions: ['menu.view', 'menu.edit', 'orders.view', 'orders.edit', 'analytics.view', 'users.manage'],
            phone: '+971501234569',
            tenantId: 'rest_hardrockcafe_003'
          }
        ]
      }
    ];

    for (const tenantData of adminUsers) {
      console.log(`\nProcessing tenant: ${tenantData.subdomain}`);
      
      // Check if tenant exists
      const tenant = await Tenant.findOne({ tenantId: tenantData.tenantId });
      if (!tenant) {
        console.log(`Tenant ${tenantData.subdomain} not found, skipping...`);
        continue;
      }

      // Set tenant context for User model
      await asyncLocalStorage.run({ tenantId: tenantData.tenantId }, async () => {
        for (const userData of tenantData.users) {
          try {
            // Check if user already exists
            const existingUser = await User.findOne({ email: userData.email });
            
            if (existingUser) {
              console.log(`User ${userData.email} already exists`);
              
              // Update user details
              existingUser.password = userData.password; // Will be hashed by pre-save hook
              existingUser.role = userData.role;
              existingUser.permissions = userData.permissions;
              existingUser.isActive = true;
              await existingUser.save();
              
              console.log(`Updated password and role for ${userData.email}`);
            } else {
              // Create new user
              const newUser = new User({
                ...userData,
                isActive: true,
                createdAt: new Date(),
                updatedAt: new Date()
              });
              
              await newUser.save();
              console.log(`Created admin user: ${userData.email}`);
            }
          } catch (error) {
            console.error(`Error creating/updating user ${userData.email}:`, error.message);
          }
        }
      });
    }

    console.log('\nAdmin users creation completed!');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Run the script
createAdminUsers();