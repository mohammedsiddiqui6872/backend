// Quick fix script to add missing fields to existing tables
require('dotenv').config();
const mongoose = require('mongoose');

async function fixTables() {
  try {
    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/restaurant-system');
    console.log('✅ Connected to database\n');

    const db = mongoose.connection.db;
    const tablesCollection = db.collection('tables');

    // Add missing fields to all tables
    const result = await tablesCollection.updateMany(
      {}, // Update all tables
      {
        $set: {
          type: 'regular',
          shape: 'square',
          location: {
            floor: 'main',
            section: 'dining',
            x: 0,
            y: 0,
            rotation: 0
          },
          features: [],
          isCombinable: false,
          combinesWith: [],
          metadata: {}
        }
      }
    );

    console.log(`✅ Updated ${result.modifiedCount} tables`);

    // Verify by counting tables
    const totalTables = await tablesCollection.countDocuments({});
    console.log(`Total tables in database: ${totalTables}`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n👋 Database connection closed');
  }
}

// Run fix
console.log('🔧 Fixing existing tables...\n');
fixTables();