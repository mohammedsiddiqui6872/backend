const mongoose = require('mongoose');
const Table = require('../src/models/Table');
const Tenant = require('../src/models/Tenant');
require('dotenv').config();

async function createDefaultTables() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB\n');

    // Get all active tenants
    const tenants = await Tenant.find({ isActive: true });
    
    for (const tenant of tenants) {
      console.log(`\nChecking tables for: ${tenant.name} (${tenant.subdomain})`);
      
      // Check if tenant already has tables
      const existingTables = await Table.find({ tenantId: tenant.tenantId });
      
      if (existingTables.length > 0) {
        console.log(`  Already has ${existingTables.length} tables`);
        continue;
      }
      
      console.log('  Creating default tables...');
      
      // Create default tables
      const defaultTables = [
        { tableNumber: 'T01', seats: 4, floor: 'Ground Floor', section: 'Main Hall' },
        { tableNumber: 'T02', seats: 4, floor: 'Ground Floor', section: 'Main Hall' },
        { tableNumber: 'T03', seats: 2, floor: 'Ground Floor', section: 'Main Hall' },
        { tableNumber: 'T04', seats: 2, floor: 'Ground Floor', section: 'Main Hall' },
        { tableNumber: 'T05', seats: 6, floor: 'Ground Floor', section: 'Main Hall' },
        { tableNumber: 'T06', seats: 6, floor: 'Ground Floor', section: 'Main Hall' },
        { tableNumber: 'T07', seats: 4, floor: 'Ground Floor', section: 'Window Side' },
        { tableNumber: 'T08', seats: 4, floor: 'Ground Floor', section: 'Window Side' },
        { tableNumber: 'T09', seats: 8, floor: 'Ground Floor', section: 'Private' },
        { tableNumber: 'T10', seats: 10, floor: 'Ground Floor', section: 'Private' }
      ];
      
      for (const tableData of defaultTables) {
        const table = new Table({
          ...tableData,
          tenantId: tenant.tenantId,
          status: 'available',
          position: {
            x: Math.floor(Math.random() * 800),
            y: Math.floor(Math.random() * 600)
          }
        });
        
        await table.save();
        console.log(`    Created table ${table.tableNumber}`);
      }
      
      console.log(`  ✓ Created ${defaultTables.length} tables`);
    }
    
    console.log('\nDone!');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\nDisconnected from MongoDB');
  }
}

createDefaultTables();