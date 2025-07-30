// src/migrations/migrateToNewSessionSystem.js
const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

// Import models
const User = require('../models/User');
const Table = require('../models/Table');
const TableState = require('../models/TableState');
const TableSession = require('../models/TableSession');
const WaiterSession = require('../models/WaiterSession');
const CustomerSession = require('../models/CustomerSession');
const Order = require('../models/Order');

async function migrateToNewSessionSystem() {
  try {
    console.log('Starting migration to new session system...');
    
    // Step 1: Ensure all tables have TableState records
    console.log('\n1. Checking TableState records...');
    const tables = await Table.find({});
    console.log(`Found ${tables.length} tables`);
    
    for (const table of tables) {
      let tableState = await TableState.findOne({ tableNumber: table.number });
      
      if (!tableState) {
        console.log(`Creating TableState for table ${table.number}`);
        tableState = new TableState({
          tableNumber: table.number,
          status: table.status || 'available',
          capacity: table.capacity || 4,
          section: table.section || 'main',
          notes: table.notes || ''
        });
        await tableState.save();
      }
    }
    
    // Step 2: Migrate active TableSessions to WaiterSessions and update TableStates
    console.log('\n2. Migrating active table sessions...');
    const activeSessions = await TableSession.find({ isActive: true }).populate('waiter');
    console.log(`Found ${activeSessions.length} active table sessions`);
    
    for (const session of activeSessions) {
      // Check if waiter already has an active session
      let waiterSession = await WaiterSession.findOne({ 
        waiter: session.waiter._id, 
        isActive: true 
      });
      
      if (!waiterSession) {
        console.log(`Creating WaiterSession for ${session.waiter.name}`);
        waiterSession = new WaiterSession({
          waiter: session.waiter._id,
          loginTime: session.loginTime,
          assignedTables: [session.tableNumber],
          lastActivity: session.lastActivity || new Date()
        });
        await waiterSession.save();
      } else {
        // Add table to existing session if not already there
        if (!waiterSession.assignedTables.includes(session.tableNumber)) {
          waiterSession.assignedTables.push(session.tableNumber);
          await waiterSession.save();
        }
      }
      
      // Update TableState
      const tableState = await TableState.findOne({ tableNumber: session.tableNumber });
      if (tableState && !tableState.currentWaiter) {
        tableState.currentWaiter = session.waiter._id;
        await tableState.save();
        console.log(`Assigned table ${session.tableNumber} to ${session.waiter.name}`);
      }
    }
    
    // Step 3: Update CustomerSession records
    console.log('\n3. Updating customer sessions...');
    const customerSessions = await CustomerSession.find({ isActive: true });
    console.log(`Found ${customerSessions.length} active customer sessions`);
    
    for (const session of customerSessions) {
      let updated = false;
      
      // Ensure sessionId exists
      if (!session.sessionId) {
        session.sessionId = `CS-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        updated = true;
      }
      
      // Set primaryWaiter if not set
      if (!session.primaryWaiter && session.waiter) {
        session.primaryWaiter = session.waiter;
        updated = true;
      }
      
      // Set status if not set
      if (!session.status) {
        session.status = 'active';
        updated = true;
      }
      
      if (updated) {
        await session.save();
        console.log(`Updated customer session for table ${session.tableNumber}`);
      }
      
      // Update corresponding TableState
      const tableState = await TableState.findOne({ tableNumber: session.tableNumber });
      if (tableState && !tableState.activeCustomerSession) {
        tableState.activeCustomerSession = session._id;
        tableState.status = 'occupied';
        await tableState.save();
      }
    }
    
    // Step 4: Link orphaned orders to customer sessions
    console.log('\n4. Checking for orphaned orders...');
    const orphanedOrders = await Order.find({ 
      customerSessionId: null,
      status: { $in: ['pending', 'confirmed', 'preparing', 'ready', 'served'] },
      paymentStatus: { $ne: 'paid' }
    });
    console.log(`Found ${orphanedOrders.length} orphaned orders`);
    
    for (const order of orphanedOrders) {
      // Try to find an active customer session for this table
      const customerSession = await CustomerSession.findOne({
        tableNumber: order.tableNumber,
        isActive: true
      });
      
      if (customerSession) {
        order.customerSessionId = customerSession._id;
        await order.save();
        
        // Add order to customer session
        if (!customerSession.orders.includes(order._id)) {
          customerSession.orders.push(order._id);
          customerSession.totalAmount += order.total || 0;
          await customerSession.save();
        }
        
        console.log(`Linked order ${order.orderNumber} to customer session on table ${order.tableNumber}`);
      }
    }
    
    // Step 5: Deactivate old table sessions
    console.log('\n5. Deactivating old table sessions...');
    const result = await TableSession.updateMany(
      { isActive: true },
      { 
        $set: { 
          isActive: false, 
          logoutTime: new Date(),
          migratedToNewSystem: true 
        } 
      }
    );
    console.log(`Deactivated ${result.modifiedCount} table sessions`);
    
    // Step 6: Generate summary report
    console.log('\n=== Migration Summary ===');
    const tableStateCount = await TableState.countDocuments();
    const waiterSessionCount = await WaiterSession.countDocuments({ isActive: true });
    const customerSessionCount = await CustomerSession.countDocuments({ isActive: true });
    const activeTableCount = await TableState.countDocuments({ status: { $ne: 'available' } });
    
    console.log(`Total tables: ${tableStateCount}`);
    console.log(`Active waiter sessions: ${waiterSessionCount}`);
    console.log(`Active customer sessions: ${customerSessionCount}`);
    console.log(`Occupied tables: ${activeTableCount}`);
    
    console.log('\nMigration completed successfully!');
    
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/restaurant';
  
  mongoose.connect(mongoUri)
    .then(() => {
      console.log('Connected to MongoDB');
      return migrateToNewSessionSystem();
    })
    .then(() => {
      console.log('Migration completed');
      process.exit(0);
    })
    .catch(error => {
      console.error('Migration error:', error);
      process.exit(1);
    });
}

module.exports = migrateToNewSessionSystem;