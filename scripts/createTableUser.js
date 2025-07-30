// scripts/createTableUser.js
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../src/models/User');
require('dotenv').config();

async function createTableUser() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    
    // Create a table staff user
    const userData = {
      name: 'Table Staff 1',
      email: 'table1@restaurant.com',
      password: await bcrypt.hash('Table123!', 10),
      role: 'waiter', // or 'staff' depending on your roles
      permissions: [
        'orders.create',
        'orders.view',
        'menu.view'
      ],
      isActive: true
    };

    // Check if user already exists
    const existingUser = await User.findOne({ email: userData.email });
    if (existingUser) {
      console.log('User already exists. Updating password...');
      existingUser.password = userData.password;
      await existingUser.save();
    } else {
      const user = new User(userData);
      await user.save();
      console.log('Table user created successfully');
    }
    
    console.log('Email:', userData.email);
    console.log('Password: Table123!');
    
    await mongoose.connection.close();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

createTableUser();