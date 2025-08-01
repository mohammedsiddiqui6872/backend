// Script to check indexes on the tables collection
require('dotenv').config();
const mongoose = require('mongoose');

async function checkIndexes() {
  try {
    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/restaurant-system');
    console.log('✅ Connected to database\n');

    const db = mongoose.connection.db;
    const tablesCollection = db.collection('tables');

    // Get all indexes
    const indexes = await tablesCollection.indexes();
    
    console.log('📊 Indexes on tables collection:\n');
    indexes.forEach((index, i) => {
      console.log(`Index ${i + 1}:`);
      console.log('  Key:', JSON.stringify(index.key));
      if (index.unique) console.log('  Unique: true');
      if (index.sparse) console.log('  Sparse: true');
      if (index.name !== '_id_') console.log('  Name:', index.name);
      console.log('');
    });

    // Check for duplicate indexes
    const indexKeys = indexes.map(idx => JSON.stringify(idx.key));
    const duplicates = indexKeys.filter((key, index) => indexKeys.indexOf(key) !== index);
    
    if (duplicates.length > 0) {
      console.log('⚠️  Duplicate indexes found:', duplicates);
    } else {
      console.log('✅ No duplicate indexes found');
    }

    // Check specifically for qrCode.code index
    const qrCodeIndexes = indexes.filter(idx => idx.key['qrCode.code'] !== undefined);
    console.log(`\n🔍 QR Code indexes found: ${qrCodeIndexes.length}`);
    qrCodeIndexes.forEach(idx => {
      console.log('  -', JSON.stringify(idx.key), idx.unique ? '(unique)' : '');
    });

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n👋 Database connection closed');
  }
}

// Run check
console.log('🔍 Checking table indexes...\n');
checkIndexes();