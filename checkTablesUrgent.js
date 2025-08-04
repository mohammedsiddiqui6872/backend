require('dotenv').config();
const mongoose = require('mongoose');

(async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');
    
    const db = mongoose.connection.db;
    
    // Check what collections exist
    const collections = await db.listCollections().toArray();
    console.log('\nExisting collections:');
    collections.forEach(col => {
      if (col.name.includes('table')) {
        console.log(`- ${col.name}`);
      }
    });
    
    // Check resttables collection (new model)
    const Table = require('./src/models/Table');
    const tables = await Table.find({}).limit(5);
    console.log(`\nFound ${tables.length} tables in 'resttables' collection`);
    
    // Count by tenant
    const tenants = ['rest_mughlaimagic_001', 'rest_bellavista_002', 'rest_hardrockcafe_003'];
    for (const tenantId of tenants) {
      const count = await Table.countDocuments({ tenantId });
      console.log(`- ${tenantId}: ${count} tables`);
    }
    
    await mongoose.disconnect();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
})();