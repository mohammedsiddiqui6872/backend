// Complete reset for multi-tenant setup
const mongoose = require('mongoose');
require('dotenv').config();

async function resetDatabase() {
  try {
    // Connect to MongoDB - using restaurant database
    const mongoUri = process.env.MONGODB_URI || 'mongodb+srv://admin:%21Jafar18022017@cluster0.mzlqfml.mongodb.net/restaurant?retryWrites=true&w=majority&appName=Cluster0';
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');

    const db = mongoose.connection.db;

    // Drop all indexes first
    console.log('\nDropping all indexes...');
    const collections = await db.listCollections().toArray();
    
    for (const collection of collections) {
      try {
        await db.collection(collection.name).dropIndexes();
        console.log(`✓ Dropped indexes for ${collection.name}`);
      } catch (e) {
        console.log(`- No indexes to drop for ${collection.name}`);
      }
    }

    // Clear all data
    console.log('\nClearing all data...');
    for (const collection of collections) {
      const result = await db.collection(collection.name).deleteMany({});
      console.log(`✓ Cleared ${collection.name}: ${result.deletedCount} documents`);
    }

    console.log('\n✅ Database reset complete!');
    console.log('Ready for multi-tenant setup with fresh indexes.');

  } catch (error) {
    console.error('Error resetting database:', error);
  } finally {
    await mongoose.connection.close();
  }
}

resetDatabase();