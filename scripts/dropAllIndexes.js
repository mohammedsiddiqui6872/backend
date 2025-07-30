// Drop ALL indexes to start fresh
const mongoose = require('mongoose');
require('dotenv').config();

async function dropAllIndexes() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const db = mongoose.connection.db;

    // Get all collections
    const collections = await db.listCollections().toArray();
    
    console.log('\nDropping ALL indexes from all collections...');
    
    for (const collection of collections) {
      try {
        // Get all indexes
        const indexes = await db.collection(collection.name).indexes();
        
        // Drop each index except _id
        for (const index of indexes) {
          if (index.name !== '_id_') {
            await db.collection(collection.name).dropIndex(index.name);
            console.log(`✓ Dropped ${collection.name}.${index.name}`);
          }
        }
      } catch (e) {
        console.log(`- Error with ${collection.name}: ${e.message}`);
      }
    }

    console.log('\n✅ All indexes dropped successfully!');

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.connection.close();
  }
}

dropAllIndexes();