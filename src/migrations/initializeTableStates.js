// src/migrations/initializeTableStates.js
const mongoose = require('mongoose');
const Table = require('../models/Table');
const TableState = require('../models/TableState');
const TableSession = require('../models/TableSession');
const CustomerSession = require('../models/CustomerSession');

async function initializeTableStates() {
  try {
    console.log('Starting table state initialization...');
    
    // Get all existing tables
    const tables = await Table.find({});
    console.log(`Found ${tables.length} tables to process`);
    
    for (const table of tables) {
      // Check if TableState already exists
      let tableState = await TableState.findOne({ tableNumber: table.number });
      
      if (!tableState) {
        // Create new TableState
        tableState = new TableState({
          tableNumber: table.number,
          status: table.status || 'available',
          capacity: table.capacity || 4,
          section: table.section || 'main',
          notes: table.notes || ''
        });
        
        // Check for active table session to find current waiter
        const activeTableSession = await TableSession.findOne({
          tableNumber: table.number,
          isActive: true
        });
        
        if (activeTableSession) {
          tableState.currentWaiter = activeTableSession.waiter;
        }
        
        // Check for active customer session
        const activeCustomerSession = await CustomerSession.findOne({
          tableNumber: table.number,
          isActive: true
        });
        
        if (activeCustomerSession) {
          tableState.activeCustomerSession = activeCustomerSession._id;
          tableState.status = 'occupied';
        }
        
        await tableState.save();
        console.log(`Created TableState for table ${table.number}`);
      } else {
        console.log(`TableState already exists for table ${table.number}`);
      }
    }
    
    console.log('Table state initialization completed');
  } catch (error) {
    console.error('Error initializing table states:', error);
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  const path = require('path');
  require('dotenv').config({ path: path.join(__dirname, '../../.env') });
  
  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/restaurant';
  
  mongoose.connect(mongoUri)
    .then(() => {
      console.log('Connected to MongoDB');
      return initializeTableStates();
    })
    .then(() => {
      console.log('Migration completed successfully');
      process.exit(0);
    })
    .catch(error => {
      console.error('Migration failed:', error);
      process.exit(1);
    });
}

module.exports = initializeTableStates;