require('dotenv').config();
const mongoose = require('mongoose');

async function migrateAndCleanupTables() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');
    
    // Get database connection
    const db = mongoose.connection.db;
    
    // Check if old 'tables' collection exists
    const collections = await db.listCollections().toArray();
    const oldTablesExists = collections.some(col => col.name === 'tables');
    const newTablesExists = collections.some(col => col.name === 'resttables');
    
    console.log('\nCollection status:');
    console.log('- Old "tables" collection exists:', oldTablesExists);
    console.log('- New "resttables" collection exists:', newTablesExists);
    
    if (!oldTablesExists) {
      console.log('\nNo old tables collection found. Migration not needed.');
      await mongoose.disconnect();
      return;
    }
    
    // Load models
    const Table = require('./src/models/Table'); // New model
    const TableState = require('./src/models/TableState');
    const Tenant = require('./src/models/Tenant');
    
    // Get old tables collection
    const oldTablesCollection = db.collection('tables');
    const oldTables = await oldTablesCollection.find({}).toArray();
    
    console.log(`\nFound ${oldTables.length} tables in old collection`);
    
    // Get all tenants
    const tenants = await Tenant.find({ status: 'active' });
    console.log(`Found ${tenants.length} active tenants`);
    
    // Group old tables by tenantId
    const tablesByTenant = {};
    oldTables.forEach(table => {
      const tenantId = table.tenantId || 'unknown';
      if (!tablesByTenant[tenantId]) {
        tablesByTenant[tenantId] = [];
      }
      tablesByTenant[tenantId].push(table);
    });
    
    // Migrate tables for each tenant
    for (const tenant of tenants) {
      console.log(`\nProcessing tenant: ${tenant.name} (${tenant.tenantId})`);
      
      const oldTablesForTenant = tablesByTenant[tenant.tenantId] || [];
      console.log(`- Found ${oldTablesForTenant.length} old tables`);
      
      // Check existing new tables
      const existingNewTables = await Table.find({ tenantId: tenant.tenantId });
      console.log(`- Already has ${existingNewTables.length} new tables`);
      
      if (existingNewTables.length > 0 && oldTablesForTenant.length > 0) {
        console.log('- Tenant already has new tables, skipping migration');
        continue;
      }
      
      // Migrate old tables to new format
      for (const oldTable of oldTablesForTenant) {
        try {
          // Check if already migrated
          const exists = await Table.findOne({ 
            tenantId: tenant.tenantId, 
            number: oldTable.number || oldTable.tableNumber 
          });
          
          if (exists) {
            console.log(`  - Table ${oldTable.number || oldTable.tableNumber} already migrated`);
            continue;
          }
          
          // Create new table
          const newTable = new Table({
            tenantId: tenant.tenantId,
            number: oldTable.number || oldTable.tableNumber,
            displayName: oldTable.displayName || `Table ${oldTable.number || oldTable.tableNumber}`,
            capacity: oldTable.capacity || 4,
            minCapacity: oldTable.minCapacity || Math.max(1, (oldTable.capacity || 4) - 2),
            maxCapacity: oldTable.maxCapacity || (oldTable.capacity || 4) + 2,
            type: oldTable.type || 'regular',
            shape: oldTable.shape || 'square',
            location: oldTable.location || {
              floor: 'main',
              section: oldTable.section || 'dining',
              x: 0,
              y: 0
            },
            features: oldTable.features || [],
            status: oldTable.status || 'available',
            isActive: oldTable.isActive !== false,
            isCombinable: oldTable.isCombinable || false,
            combinesWith: oldTable.combinesWith || [],
            metadata: {
              ...oldTable.metadata,
              migratedFrom: 'oldTables',
              migratedAt: new Date()
            }
          });
          
          await newTable.save();
          console.log(`  - Migrated table ${newTable.number}`);
          
          // Also migrate to TableState if it exists
          const tableStateExists = await TableState.findOne({
            tenantId: tenant.tenantId,
            tableNumber: newTable.number
          });
          
          if (!tableStateExists) {
            const tableState = new TableState({
              tenantId: tenant.tenantId,
              tableNumber: newTable.number,
              capacity: newTable.capacity,
              section: oldTable.section || 'main',
              notes: oldTable.notes || '',
              status: newTable.status
            });
            await tableState.save();
          }
        } catch (err) {
          console.error(`  - Error migrating table ${oldTable.number}:`, err.message);
        }
      }
    }
    
    // Ask for confirmation before deleting old collection
    console.log('\n==================================');
    console.log('Migration completed!');
    console.log('\nOld tables collection can now be safely removed.');
    console.log('To remove it, run: db.tables.drop() in MongoDB shell');
    console.log('Or uncomment the line below and run again:');
    console.log('// await oldTablesCollection.drop();');
    
    // Drop the old collection
    await oldTablesCollection.drop();
    console.log('Old tables collection dropped successfully');
    
    await mongoose.disconnect();
    console.log('\nDone!');
  } catch (error) {
    console.error('Migration error:', error);
    process.exit(1);
  }
}

migrateAndCleanupTables();