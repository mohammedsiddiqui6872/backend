// Script to clean database for fresh multi-tenant setup
const mongoose = require('mongoose');
require('dotenv').config();

async function cleanDatabase() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb+srv://admin:%21Jafar18022017@cluster0.mzlqfml.mongodb.net/gritservices?retryWrites=true&w=majority&appName=Cluster0');
    console.log('Connected to MongoDB');

    const db = mongoose.connection.db;

    console.log('\nCleaning database for multi-tenant setup...');

    // Delete all documents from tenant-specific collections
    const collections = [
      'tenants',
      'users',
      'categories',
      'tables',
      'menuitems',
      'orders',
      'customersessions',
      'tablesessions',
      'payments',
      'feedback'
    ];

    for (const collection of collections) {
      try {
        const result = await db.collection(collection).deleteMany({});
        console.log(`✓ Cleared ${collection}: ${result.deletedCount} documents`);
      } catch (e) {
        console.log(`- Collection ${collection} not found or empty`);
      }
    }

    console.log('\n✅ Database cleaned successfully!');
    console.log('Ready for multi-tenant setup.');

  } catch (error) {
    console.error('Error cleaning database:', error);
  } finally {
    await mongoose.connection.close();
  }
}

cleanDatabase();