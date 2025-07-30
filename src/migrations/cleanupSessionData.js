// src/migrations/cleanupSessionData.js
const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

// Import models
const TableState = require('../models/TableState');
const WaiterSession = require('../models/WaiterSession');
const CustomerSession = require('../models/CustomerSession');

async function cleanupSessionData() {
  try {
    console.log('Starting session data cleanup...\n');
    
    // Step 1: Fix table assignments
    console.log('=== Step 1: Fixing table assignments ===');
    const waiterSessions = await WaiterSession.find({ isActive: true });
    
    for (const session of waiterSessions) {
      const validTables = [];
      
      for (const tableNumber of session.assignedTables) {
        // Normalize table numbers (remove leading zeros)
        const normalizedTableNumber = tableNumber.replace(/^0+/, '') || '0';
        
        // Check if TableState exists
        let tableState = await TableState.findOne({ tableNumber: normalizedTableNumber });
        
        if (!tableState) {
          // Try to find with original number
          tableState = await TableState.findOne({ tableNumber });
          
          if (!tableState) {
            console.log(`Creating TableState for table ${normalizedTableNumber}`);
            tableState = new TableState({
              tableNumber: normalizedTableNumber,
              status: 'available',
              capacity: 4
            });
            await tableState.save();
          }
        }
        
        // Update table assignment
        if (!tableState.currentWaiter || tableState.currentWaiter.toString() !== session.waiter.toString()) {
          tableState.currentWaiter = session.waiter;
          await tableState.save();
          console.log(`Assigned table ${tableState.tableNumber} to waiter ${session.waiter}`);
        }
        
        validTables.push(tableState.tableNumber);
      }
      
      // Update waiter session with normalized table numbers
      if (JSON.stringify(validTables.sort()) !== JSON.stringify(session.assignedTables.sort())) {
        session.assignedTables = validTables;
        await session.save();
        console.log(`Updated table assignments for waiter session ${session._id}`);
      }
    }
    
    // Step 2: Fix duplicate table assignments
    console.log('\n=== Step 2: Resolving duplicate assignments ===');
    const allTableStates = await TableState.find({ currentWaiter: { $ne: null } });
    
    for (const tableState of allTableStates) {
      // Count how many waiter sessions claim this table
      const claimingSessions = await WaiterSession.find({
        isActive: true,
        assignedTables: tableState.tableNumber
      });
      
      if (claimingSessions.length > 1) {
        console.log(`Table ${tableState.tableNumber} claimed by ${claimingSessions.length} waiters`);
        
        // Keep the most recent assignment
        const mostRecent = claimingSessions.sort((a, b) => 
          b.lastActivity.getTime() - a.lastActivity.getTime()
        )[0];
        
        // Remove from other sessions
        for (const session of claimingSessions) {
          if (session._id.toString() !== mostRecent._id.toString()) {
            session.assignedTables = session.assignedTables.filter(t => t !== tableState.tableNumber);
            await session.save();
            console.log(`Removed table ${tableState.tableNumber} from waiter session ${session._id}`);
          }
        }
      }
    }
    
    // Step 3: Clean up empty waiter sessions
    console.log('\n=== Step 3: Cleaning up empty sessions ===');
    const emptySessions = await WaiterSession.find({
      isActive: true,
      assignedTables: { $size: 0 }
    });
    
    for (const session of emptySessions) {
      session.isActive = false;
      session.logoutTime = new Date();
      await session.save();
      console.log(`Deactivated empty waiter session ${session._id}`);
    }
    
    // Step 4: Verify customer sessions
    console.log('\n=== Step 4: Verifying customer sessions ===');
    const customerSessions = await CustomerSession.find({ isActive: true });
    
    for (const session of customerSessions) {
      // Normalize table number
      const normalizedTableNumber = session.tableNumber.replace(/^0+/, '') || '0';
      
      if (normalizedTableNumber !== session.tableNumber) {
        session.tableNumber = normalizedTableNumber;
        await session.save();
        console.log(`Normalized table number for customer session ${session._id}`);
      }
      
      // Ensure table state has this customer session
      const tableState = await TableState.findOne({ tableNumber: normalizedTableNumber });
      if (tableState && !tableState.activeCustomerSession) {
        tableState.activeCustomerSession = session._id;
        tableState.status = 'occupied';
        await tableState.save();
        console.log(`Linked customer session to table ${normalizedTableNumber}`);
      }
    }
    
    console.log('\n=== Cleanup Complete ===');
    
    // Generate summary
    const activeTables = await TableState.countDocuments({ status: { $ne: 'available' } });
    const activeWaiters = await WaiterSession.countDocuments({ isActive: true });
    const activeCustomers = await CustomerSession.countDocuments({ isActive: true });
    
    console.log(`\nSummary:`);
    console.log(`- Active tables: ${activeTables}`);
    console.log(`- Active waiter sessions: ${activeWaiters}`);
    console.log(`- Active customer sessions: ${activeCustomers}`);
    
  } catch (error) {
    console.error('Cleanup failed:', error);
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/restaurant';
  
  mongoose.connect(mongoUri)
    .then(() => {
      console.log('Connected to MongoDB');
      return cleanupSessionData();
    })
    .then(() => {
      process.exit(0);
    })
    .catch(error => {
      console.error('Cleanup error:', error);
      process.exit(1);
    });
}

module.exports = cleanupSessionData;