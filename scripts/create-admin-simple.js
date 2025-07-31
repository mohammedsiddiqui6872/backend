// Simple script to create admin users - can be run on server
// Usage: MONGODB_URI=your_uri node create-admin-simple.js

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

async function createAdminUsers() {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/gritservices';
  
  try {
    await mongoose.connect(uri);
    console.log('Connected to MongoDB');

    const db = mongoose.connection.db;
    const usersCollection = db.collection('users');

    const adminUsers = [
      {
        tenantId: 'rest_mughlaimagic_001',
        name: 'Admin',
        email: 'admin@mughlaimagic.ae',
        password: await bcrypt.hash('password123', 10),
        role: 'admin',
        permissions: ['menu.view', 'menu.edit', 'orders.view', 'orders.edit', 'analytics.view', 'users.manage'],
        phone: '+971501234567',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        tenantId: 'rest_bellavista_002',
        name: 'Admin',
        email: 'admin@bellavista.ae',
        password: await bcrypt.hash('password123', 10),
        role: 'admin',
        permissions: ['menu.view', 'menu.edit', 'orders.view', 'orders.edit', 'analytics.view', 'users.manage'],
        phone: '+971501234568',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        tenantId: 'rest_hardrockcafe_003',
        name: 'Admin',
        email: 'admin@hardrockcafe.ae',
        password: await bcrypt.hash('password123', 10),
        role: 'admin',
        permissions: ['menu.view', 'menu.edit', 'orders.view', 'orders.edit', 'analytics.view', 'users.manage'],
        phone: '+971501234569',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    for (const user of adminUsers) {
      try {
        await usersCollection.updateOne(
          { email: user.email, tenantId: user.tenantId },
          { $set: user },
          { upsert: true }
        );
        console.log(`Created/Updated admin user: ${user.email}`);
      } catch (error) {
        console.error(`Error with user ${user.email}:`, error.message);
      }
    }

    console.log('Admin users creation completed!');
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
  }
}

createAdminUsers();