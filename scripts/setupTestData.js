// scripts/setupTestData.js
// Sets up clean test data for E2E testing

const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

// Import models
const User = require('../src/models/User');
const Table = require('../src/models/Table');
const TableState = require('../src/models/TableState');
const WaiterSession = require('../src/models/WaiterSession');
const CustomerSession = require('../src/models/CustomerSession');
const Order = require('../src/models/Order');

async function setupTestData() {
  try {
    console.log('🧹 Setting up clean test data...\n');
    
    // Step 1: Clean up existing sessions
    console.log('1. Cleaning up existing sessions...');
    
    // End all waiter sessions
    await WaiterSession.updateMany(
      { isActive: true },
      { $set: { isActive: false, logoutTime: new Date() } }
    );
    
    // Close all customer sessions
    await CustomerSession.updateMany(
      { isActive: true },
      { $set: { isActive: false, status: 'closed', endTime: new Date() } }
    );
    
    // Reset all table states
    await TableState.updateMany(
      {},
      { 
        $set: { 
          status: 'available', 
          currentWaiter: null, 
          assistingWaiters: [], 
          activeCustomerSession: null 
        } 
      }
    );
    
    console.log('   ✅ All sessions cleaned');
    
    // Step 2: Create test users if they don't exist
    console.log('\n2. Setting up test users...');
    
    const testUsers = [
      {
        email: 'testwaiter1@restaurant.com',
        password: 'test123',
        name: 'Test Waiter 1',
        role: 'waiter',
        isActive: true
      },
      {
        email: 'testwaiter2@restaurant.com',
        password: 'test123',
        name: 'Test Waiter 2',
        role: 'waiter',
        isActive: true
      },
      {
        email: 'testadmin@restaurant.com',
        password: 'admin123',
        name: 'Test Admin',
        role: 'admin',
        isActive: true
      }
    ];
    
    for (const userData of testUsers) {
      const existingUser = await User.findOne({ email: userData.email });
      if (!existingUser) {
        const user = new User(userData);
        await user.save();
        console.log(`   ✅ Created user: ${userData.email}`);
      } else {
        console.log(`   ℹ️  User exists: ${userData.email}`);
      }
    }
    
    // Step 3: Ensure test tables exist
    console.log('\n3. Setting up test tables...');
    
    const testTables = ['1', '2', '3', '4', '5', 'VIP-1', 'VIP-2'];
    
    for (const tableNumber of testTables) {
      // Check if table exists
      let table = await Table.findOne({ number: tableNumber });
      if (!table) {
        table = new Table({
          number: tableNumber,
          capacity: tableNumber.includes('VIP') ? 8 : 4,
          section: tableNumber.includes('VIP') ? 'VIP' : 'main',
          status: 'available'
        });
        await table.save();
      }
      
      // Ensure TableState exists
      let tableState = await TableState.findOne({ tableNumber });
      if (!tableState) {
        tableState = new TableState({
          tableNumber,
          status: 'available',
          capacity: table.capacity,
          section: table.section
        });
        await tableState.save();
      }
      
      console.log(`   ✅ Table ${tableNumber} ready`);
    }
    
    // Step 4: Create some sample menu items if needed
    console.log('\n4. Verifying menu items...');
    const MenuItem = require('../src/models/MenuItem');
    const menuCount = await MenuItem.countDocuments();
    
    if (menuCount === 0) {
      console.log('   ⚠️  No menu items found. Run menu seeding script.');
    } else {
      console.log(`   ✅ ${menuCount} menu items available`);
    }
    
    // Step 5: Summary
    console.log('\n📊 Test Data Summary:');
    console.log('====================');
    
    const stats = {
      waiters: await User.countDocuments({ role: 'waiter', isActive: true }),
      admins: await User.countDocuments({ role: 'admin', isActive: true }),
      tables: await TableState.countDocuments(),
      activeSessions: await CustomerSession.countDocuments({ isActive: true }),
      activeOrders: await Order.countDocuments({ 
        status: { $in: ['pending', 'confirmed', 'preparing', 'ready', 'served'] } 
      })
    };
    
    console.log(`Waiters: ${stats.waiters}`);
    console.log(`Admins: ${stats.admins}`);
    console.log(`Tables: ${stats.tables}`);
    console.log(`Active Sessions: ${stats.activeSessions} (should be 0)`);
    console.log(`Active Orders: ${stats.activeOrders}`);
    
    console.log('\n✅ Test data setup complete!');
    console.log('\nTest Accounts:');
    console.log('- Waiter 1: testwaiter1@restaurant.com / test123');
    console.log('- Waiter 2: testwaiter2@restaurant.com / test123');
    console.log('- Admin: testadmin@restaurant.com / admin123');
    console.log('\nTest Tables: 1, 2, 3, 4, 5, VIP-1, VIP-2');
    
  } catch (error) {
    console.error('❌ Setup failed:', error);
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/restaurant';
  
  mongoose.connect(mongoUri)
    .then(() => {
      console.log('Connected to MongoDB');
      return setupTestData();
    })
    .then(() => {
      process.exit(0);
    })
    .catch(error => {
      console.error('Setup error:', error);
      process.exit(1);
    });
}

module.exports = setupTestData;