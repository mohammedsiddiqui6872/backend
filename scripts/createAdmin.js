const mongoose = require('mongoose');
const User = require('../src/models/User');
require('dotenv').config();

async function createAdmin() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    
    const adminData = {
      name: 'Admin User',
      email: 'admin@restaurant.com',
      password: 'Admin@123',
      role: 'admin',
      permissions: [
        'menu.view', 'menu.edit',
        'orders.view', 'orders.edit',
        'analytics.view',
        'users.manage'
      ]
    };

    const admin = new User(adminData);
    await admin.save();
    
    console.log('Admin user created successfully');
    console.log('Email:', adminData.email);
    console.log('Password:', adminData.password);
    
    await mongoose.connection.close();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

createAdmin();