// src/migrations/phase4-cleanup.js
// This migration should be run after confirming the new system is stable

const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

async function phase4Cleanup() {
  try {
    console.log('Phase 4 Cleanup - Removing deprecated fields and models\n');
    
    console.log('WARNING: This will remove deprecated fields and models.');
    console.log('Make sure the new session system has been running stable for at least a week.');
    console.log('This action is irreversible!\n');
    
    // Uncomment the following lines when ready to perform cleanup
    
    /*
    // Step 1: Remove deprecated 'waiter' field from CustomerSession
    console.log('Removing deprecated waiter field from CustomerSession...');
    await CustomerSession.updateMany(
      {},
      { $unset: { waiter: 1 } }
    );
    
    // Step 2: Remove deprecated fields from CustomerSession schema
    console.log('Note: Remember to update CustomerSession schema to remove:');
    console.log('- waiter field');
    console.log('- loginTime field (use startTime instead)');
    console.log('- checkoutTime field (use endTime instead)');
    
    // Step 3: Archive old TableSession data
    console.log('\nArchiving TableSession data...');
    const TableSessionArchive = mongoose.model('TableSessionArchive', 
      new mongoose.Schema({}, { strict: false })
    );
    
    const oldSessions = await TableSession.find({});
    if (oldSessions.length > 0) {
      await TableSessionArchive.insertMany(
        oldSessions.map(s => ({ ...s.toObject(), archivedAt: new Date() }))
      );
      console.log(`Archived ${oldSessions.length} table sessions`);
    }
    
    // Step 4: Drop TableSession collection
    console.log('Dropping TableSession collection...');
    await mongoose.connection.db.dropCollection('tablesessions');
    
    console.log('\nPhase 4 cleanup completed successfully!');
    console.log('Remember to:');
    console.log('1. Remove TableSession model file');
    console.log('2. Update CustomerSession schema');
    console.log('3. Remove any remaining references to TableSession in code');
    */
    
    console.log('\nTo execute cleanup, uncomment the code above and run again.');
    
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
      return phase4Cleanup();
    })
    .then(() => {
      process.exit(0);
    })
    .catch(error => {
      console.error('Cleanup error:', error);
      process.exit(1);
    });
}

module.exports = phase4Cleanup;