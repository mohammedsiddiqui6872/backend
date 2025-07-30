// Script to check and fix user roles
require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../src/models/User');

async function checkUserRoles() {
  try {
    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/restaurant-pos');
    console.log('Connected to database');

    // Find all users
    const users = await User.find({}, 'name email role isActive').sort('role');
    
    console.log('\n=== ALL USERS IN DATABASE ===');
    console.log(`Total users: ${users.length}\n`);
    
    // Group by role
    const usersByRole = {};
    users.forEach(user => {
      if (!usersByRole[user.role]) {
        usersByRole[user.role] = [];
      }
      usersByRole[user.role].push(user);
    });
    
    // Display users by role
    Object.keys(usersByRole).forEach(role => {
      console.log(`\n${role.toUpperCase()} (${usersByRole[role].length} users):`);
      usersByRole[role].forEach(user => {
        console.log(`  - ${user.name} (${user.email}) - Active: ${user.isActive}`);
      });
    });
    
    // Check for specific test users
    console.log('\n=== CHECKING TEST USERS ===');
    const testEmails = [
      'waiter@restaurant.com',
      'waiter1@restaurant.com',
      'waiter2@restaurant.com',
      'chef@restaurant.com',
      'manager@restaurant.com',
      'admin@restaurant.com'
    ];
    
    for (const email of testEmails) {
      const user = await User.findOne({ email });
      if (user) {
        console.log(`\n${email}:`);
        console.log(`  Name: ${user.name}`);
        console.log(`  Role: ${user.role}`);
        console.log(`  Active: ${user.isActive}`);
        console.log(`  Last Login: ${user.lastLogin || 'Never'}`);
      } else {
        console.log(`\n${email}: NOT FOUND`);
      }
    }
    
    // Check for users with unexpected roles
    console.log('\n=== CHECKING FOR ISSUES ===');
    const validRoles = ['admin', 'manager', 'chef', 'waiter', 'cashier'];
    const usersWithInvalidRoles = users.filter(user => !validRoles.includes(user.role));
    
    if (usersWithInvalidRoles.length > 0) {
      console.log('Users with invalid roles:');
      usersWithInvalidRoles.forEach(user => {
        console.log(`  - ${user.name} (${user.email}) has role: "${user.role}"`);
      });
    } else {
      console.log('✓ All users have valid roles');
    }
    
    // Check for inactive users
    const inactiveUsers = users.filter(user => !user.isActive);
    if (inactiveUsers.length > 0) {
      console.log(`\n⚠️  ${inactiveUsers.length} inactive users found`);
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from database');
  }
}

// Run the script
checkUserRoles();