require('dotenv').config();
const mongoose = require('mongoose');
const Table = require('./src/models/Table');

(async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');
    
    // Check tables for mughlaimagic
    const tables = await Table.find({ tenantId: 'rest_mughlaimagic_001' }).limit(3);
    console.log(`\nSample tables for mughlaimagic:`);
    
    tables.forEach((table, i) => {
      console.log(`\nTable ${i + 1}:`);
      console.log(`  Number: ${table.number}`);
      console.log(`  DisplayName: ${table.displayName}`);
      console.log(`  Capacity: ${table.capacity}`);
      console.log(`  MinCapacity: ${table.minCapacity}`);
      console.log(`  MaxCapacity: ${table.maxCapacity}`);
      console.log(`  Type: ${table.type}`);
      console.log(`  Shape: ${table.shape}`);
      console.log(`  Location: ${JSON.stringify(table.location)}`);
      console.log(`  Features: ${JSON.stringify(table.features)}`);
      console.log(`  Status: ${table.status}`);
    });
    
    await mongoose.disconnect();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
})();