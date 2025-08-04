require('dotenv').config();
const mongoose = require('mongoose');

// Import models
const Table = require('./src/models/Table');
const TableLayout = require('./src/models/TableLayout');
const Tenant = require('./src/models/Tenant');

async function migrateTablesData() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/restaurant-pos');
    console.log('Connected to MongoDB');

    // Get all tenants
    const tenants = await Tenant.find({ isActive: true });
    console.log(`Found ${tenants.length} active tenants`);

    for (const tenant of tenants) {
      console.log(`\nProcessing tenant: ${tenant.name} (${tenant.subdomain})`);
      
      // Check if tables exist for this tenant
      const existingTables = await Table.find({ tenantId: tenant.tenantId });
      console.log(`Found ${existingTables.length} tables for ${tenant.subdomain}`);
      
      if (existingTables.length === 0) {
        console.log(`Creating default tables for ${tenant.subdomain}...`);
        
        // Create some default tables
        const defaultTables = [
          { number: 'T1', displayName: 'Table 1', capacity: 4, minCapacity: 2, maxCapacity: 6 },
          { number: 'T2', displayName: 'Table 2', capacity: 4, minCapacity: 2, maxCapacity: 6 },
          { number: 'T3', displayName: 'Table 3', capacity: 2, minCapacity: 1, maxCapacity: 3 },
          { number: 'T4', displayName: 'Table 4', capacity: 6, minCapacity: 4, maxCapacity: 8 },
          { number: 'T5', displayName: 'Table 5', capacity: 4, minCapacity: 2, maxCapacity: 6 },
          { number: 'B1', displayName: 'Booth 1', capacity: 4, minCapacity: 2, maxCapacity: 6, type: 'booth' },
          { number: 'B2', displayName: 'Booth 2', capacity: 6, minCapacity: 4, maxCapacity: 8, type: 'booth' },
          { number: 'BAR1', displayName: 'Bar Seat 1', capacity: 1, minCapacity: 1, maxCapacity: 1, type: 'bar' },
          { number: 'BAR2', displayName: 'Bar Seat 2', capacity: 1, minCapacity: 1, maxCapacity: 1, type: 'bar' },
          { number: 'P1', displayName: 'Patio 1', capacity: 8, minCapacity: 4, maxCapacity: 10, type: 'patio' }
        ];
        
        for (const tableData of defaultTables) {
          const table = new Table({
            tenantId: tenant.tenantId,
            ...tableData,
            shape: tableData.capacity <= 2 ? 'square' : tableData.capacity >= 6 ? 'rectangular' : 'round',
            location: {
              floor: 'main',
              section: tableData.type === 'bar' ? 'bar' : tableData.type === 'patio' ? 'outdoor' : 'dining',
              x: 0,
              y: 0
            },
            features: tableData.type === 'booth' ? ['booth_seating'] : 
                     tableData.type === 'patio' ? ['outdoor'] : 
                     tableData.type === 'bar' ? ['bar_seating'] : [],
            isCombinable: tableData.type === 'regular',
            metadata: {
              createdBy: 'migration',
              lastCleaned: new Date()
            }
          });
          
          await table.save();
          console.log(`Created table ${table.number}`);
        }
      } else {
        // Migrate existing tables to ensure they have all required fields
        for (const table of existingTables) {
          let updated = false;
          
          // Ensure displayName exists
          if (!table.displayName) {
            table.displayName = `Table ${table.number}`;
            updated = true;
          }
          
          // Ensure minCapacity and maxCapacity exist
          if (!table.minCapacity) {
            table.minCapacity = Math.max(1, table.capacity - 2);
            updated = true;
          }
          if (!table.maxCapacity) {
            table.maxCapacity = table.capacity + 2;
            updated = true;
          }
          
          // Ensure type exists
          if (!table.type) {
            table.type = 'regular';
            updated = true;
          }
          
          // Ensure shape exists
          if (!table.shape) {
            table.shape = table.capacity <= 2 ? 'square' : table.capacity >= 6 ? 'rectangular' : 'round';
            updated = true;
          }
          
          // Ensure location exists
          if (!table.location || !table.location.floor) {
            table.location = {
              floor: 'main',
              section: 'dining',
              x: 0,
              y: 0
            };
            updated = true;
          }
          
          // Ensure features array exists
          if (!table.features) {
            table.features = [];
            updated = true;
          }
          
          // Ensure isCombinable exists
          if (table.isCombinable === undefined) {
            table.isCombinable = false;
            updated = true;
          }
          
          // Ensure combinesWith array exists
          if (!table.combinesWith) {
            table.combinesWith = [];
            updated = true;
          }
          
          // Ensure metadata exists
          if (!table.metadata) {
            table.metadata = {};
            updated = true;
          }
          
          if (updated) {
            await table.save();
            console.log(`Updated table ${table.number}`);
          }
        }
      }
      
      // Ensure TableLayout exists for tenant
      let layout = await TableLayout.findOne({ tenantId: tenant.tenantId });
      if (!layout) {
        console.log(`Creating table layout for ${tenant.subdomain}...`);
        layout = await TableLayout.getOrCreate(tenant.tenantId);
        
        // Add default floors and sections
        if (layout.floors.length === 0) {
          await layout.addFloor({
            name: 'Main Floor',
            id: 'main',
            displayOrder: 1,
            sections: [
              { id: 'dining', name: 'Dining Area', capacity: 20 },
              { id: 'bar', name: 'Bar Area', capacity: 10 },
              { id: 'private', name: 'Private Dining', capacity: 8 }
            ]
          });
          
          await layout.addFloor({
            name: 'Outdoor',
            id: 'outdoor',
            displayOrder: 2,
            sections: [
              { id: 'patio', name: 'Patio', capacity: 15 },
              { id: 'terrace', name: 'Terrace', capacity: 12 }
            ]
          });
        }
        
        // Assign tables to sections
        const tables = await Table.find({ tenantId: tenant.tenantId });
        for (const table of tables) {
          try {
            await layout.assignTableToSection(
              table.location.floor || 'main',
              table.location.section || 'dining',
              table.number
            );
          } catch (err) {
            console.log(`Could not assign table ${table.number} to section: ${err.message}`);
          }
        }
      }
    }
    
    console.log('\nMigration completed successfully!');
  } catch (error) {
    console.error('Migration error:', error);
  } finally {
    await mongoose.disconnect();
  }
}

// Run migration
migrateTablesData();