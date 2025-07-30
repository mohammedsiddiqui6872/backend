require('dotenv').config();
const mongoose = require('mongoose');

async function dropIndexes() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');
    
    const db = mongoose.connection.db;
    
    // Drop all indexes on categories collection except _id
    try {
      await db.collection('categories').dropIndexes();
      console.log('✓ Dropped all indexes on categories collection');
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