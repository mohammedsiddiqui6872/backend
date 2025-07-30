require('dotenv').config();
const mongoose = require('mongoose');

async function dropIndexes() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');
    
    const db = mongoose.connection.db;
    
    // Drop the email_1 index on users collection
    try {
      await db.collection('users').dropIndex('email_1');
      console.log('✓ Dropped email_1 index on users collection');
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