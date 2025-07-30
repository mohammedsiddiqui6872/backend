// scripts/resetDatabase.js
// Utility to reset database (use with caution!)

const mongoose = require('mongoose');
const readline = require('readline');
require('dotenv').config();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

async function resetDatabase() {
  console.log('⚠️  WARNING: This will delete ALL data from your database!');
  
  rl.question('Are you sure you want to continue? (yes/no): ', async (answer) => {
    if (answer.toLowerCase() !== 'yes') {
      console.log('Database reset cancelled.');
      process.exit(0);
    }

    rl.question('Type the database name to confirm: ', async (dbName) => {
      const expectedDbName = process.env.MONGODB_URI.split('/').pop().split('?')[0];
      
      if (dbName !== expectedDbName) {
        console.log('Database name does not match. Reset cancelled.');
        process.exit(0);
      }

      try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        // Drop all collections
        const collections = await mongoose.connection.db.collections();
        
        for (let collection of collections) {
          await collection.drop();
          console.log(`Dropped collection: ${collection.collectionName}`);
        }

        console.log('✅ Database reset complete!');
        await mongoose.connection.close();
        rl.close();
      } catch (error) {
        console.error('Error resetting database:', error);
        process.exit(1);
      }
    });
  });
}

resetDatabase();