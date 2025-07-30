// src/migrations/testNewSessionSystem.js
const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

// Import models
const User = require('../models/User');
const TableState = require('../models/TableState');
const WaiterSession = require('../models/WaiterSession');
const CustomerSession = require('../models/CustomerSession');
const Order = require('../models/Order');

async function testNewSessionSystem() {
  try {
    console.log('Testing new session system...\n');
    
    // Test 1: Check waiter sessions
    console.log('=== Test 1: Active Waiter Sessions ===');
    const waiterSessions = await WaiterSession.find({ isActive: true })
      .populate('waiter', 'name email role');
    
    console.log(`Found ${waiterSessions.length} active waiter sessions:`);
    for (const session of waiterSessions) {
      console.log(`- ${session.waiter.name} (${session.waiter.email})`);
      console.log(`  Logged in: ${session.loginTime.toLocaleString()}`);
      console.log(`  Assigned tables: ${session.assignedTables.join(', ') || 'None'}`);
      console.log(`  Last activity: ${session.lastActivity.toLocaleString()}`);
    }
    
    // Test 2: Check table states
    console.log('\n=== Test 2: Table States ===');
    const occupiedTables = await TableState.find({ status: { $ne: 'available' } })
      .populate('currentWaiter', 'name')
      .populate('activeCustomerSession');
    
    console.log(`Found ${occupiedTables.length} occupied tables:`);
    for (const table of occupiedTables) {
      console.log(`\nTable ${table.tableNumber}:`);
      console.log(`  Status: ${table.status}`);
      console.log(`  Current waiter: ${table.currentWaiter?.name || 'None'}`);
      if (table.activeCustomerSession) {
        console.log(`  Customer: ${table.activeCustomerSession.customerName}`);
        console.log(`  Guests: ${table.activeCustomerSession.occupancy}`);
        console.log(`  Started: ${table.activeCustomerSession.startTime.toLocaleString()}`);
      }
    }
    
    // Test 3: Check customer sessions
    console.log('\n=== Test 3: Active Customer Sessions ===');
    const customerSessions = await CustomerSession.find({ isActive: true })
      .populate('primaryWaiter', 'name')
      .populate('orders');
    
    console.log(`Found ${customerSessions.length} active customer sessions:`);
    for (const session of customerSessions) {
      console.log(`\nTable ${session.tableNumber}:`);
      console.log(`  Session ID: ${session.sessionId}`);
      console.log(`  Customer: ${session.customerName}`);
      console.log(`  Primary waiter: ${session.primaryWaiter?.name || 'Unknown'}`);
      console.log(`  Status: ${session.status}`);
      console.log(`  Orders: ${session.orders.length}`);
      console.log(`  Total amount: $${session.totalAmount.toFixed(2)}`);
    }
    
    // Test 4: Verify table-waiter assignments match
    console.log('\n=== Test 4: Consistency Check ===');
    let inconsistencies = 0;
    
    for (const waiterSession of waiterSessions) {
      for (const tableNumber of waiterSession.assignedTables) {
        const tableState = await TableState.findOne({ tableNumber });
        if (!tableState) {
          console.log(`❌ Table ${tableNumber} assigned to waiter but TableState not found`);
          inconsistencies++;
        } else if (!tableState.currentWaiter || 
                   tableState.currentWaiter.toString() !== waiterSession.waiter._id.toString()) {
          console.log(`❌ Table ${tableNumber} assignment mismatch`);
          inconsistencies++;
        }
      }
    }
    
    if (inconsistencies === 0) {
      console.log('✅ All table assignments are consistent');
    } else {
      console.log(`❌ Found ${inconsistencies} inconsistencies`);
    }
    
    // Test 5: Check for orphaned data
    console.log('\n=== Test 5: Orphaned Data Check ===');
    
    // Check for tables with waiters but no waiter session
    const tablesWithWaiters = await TableState.find({ currentWaiter: { $ne: null } });
    let orphanedTables = 0;
    
    for (const table of tablesWithWaiters) {
      const waiterHasSession = await WaiterSession.findOne({
        waiter: table.currentWaiter,
        isActive: true,
        assignedTables: table.tableNumber
      });
      
      if (!waiterHasSession) {
        console.log(`❌ Table ${table.tableNumber} has waiter assigned but no active waiter session`);
        orphanedTables++;
      }
    }
    
    if (orphanedTables === 0) {
      console.log('✅ No orphaned table assignments found');
    }
    
    console.log('\n=== Test Complete ===');
    
  } catch (error) {
    console.error('Test failed:', error);
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/restaurant';
  
  mongoose.connect(mongoUri)
    .then(() => {
      console.log('Connected to MongoDB');
      return testNewSessionSystem();
    })
    .then(() => {
      process.exit(0);
    })
    .catch(error => {
      console.error('Test error:', error);
      process.exit(1);
    });
}

module.exports = testNewSessionSystem;