require('dotenv').config();
const mongoose = require('mongoose');

async function dropIndexes() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');
    
    const db = mongoose.connection.db;
    
    // Drop the number_1 index on tables collection
    try {
      await db.collection('tables').dropIndex('number_1');
      console.log('✓ Dropped number_1 index on tables collection');
    } catch (error) {
      console.log('Note:', error.message);
    }
    
    console.log('\nDone!');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
  }
}

dropIndexes();