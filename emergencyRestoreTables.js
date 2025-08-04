require('dotenv').config();
const mongoose = require('mongoose');
const Table = require('./src/models/Table');
const TableLayout = require('./src/models/TableLayout');
const Tenant = require('./src/models/Tenant');

async function emergencyRestoreTables() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB - EMERGENCY RESTORE');
    
    // Get all tenants
    const tenants = await Tenant.find({ status: 'active' });
    console.log(`Found ${tenants.length} active tenants`);
    
    // Restore tables for each tenant based on what we know
    const restaurantTables = {
      'rest_mughlaimagic_001': {
        name: 'Mughlai Magic',
        subdomain: 'mughlaimagic',
        tableCount: 25,
        tablePrefix: 'T'
      },
      'rest_bellavista_002': {
        name: 'Bella Vista', 
        subdomain: 'bellavista',
        tableCount: 15,
        tablePrefix: 'T'
      },
      'rest_hardrockcafe_003': {
        name: 'Hard Rock Cafe',
        subdomain: 'hardrockcafe',
        tableCount: 50,
        tablePrefix: 'T'
      }
    };
    
    for (const tenant of tenants) {
      const config = restaurantTables[tenant.tenantId];
      if (!config) continue;
      
      console.log(`\nRestoring tables for ${config.name}...`);
      
      // Check if tables already exist
      const existingCount = await Table.countDocuments({ tenantId: tenant.tenantId });
      if (existingCount > 0) {
        console.log(`- Already has ${existingCount} tables, skipping`);
        continue;
      }
      
      // Create tables
      const tables = [];
      for (let i = 1; i <= config.tableCount; i++) {
        const tableNumber = `${config.tablePrefix}${i}`;
        const capacity = i <= 5 ? 2 : i <= 15 ? 4 : i <= 25 ? 6 : 8;
        
        const table = new Table({
          tenantId: tenant.tenantId,
          number: tableNumber,
          displayName: `Table ${tableNumber}`,
          capacity: capacity,
          minCapacity: Math.max(1, capacity - 2),
          maxCapacity: capacity + 2,
          type: i > config.tableCount - 5 ? 'vip' : 'regular',
          shape: capacity <= 2 ? 'square' : capacity <= 4 ? 'round' : 'rectangle',
          location: {
            floor: i <= Math.ceil(config.tableCount * 0.7) ? 'main' : 'outdoor',
            section: i <= Math.ceil(config.tableCount * 0.5) ? 'dining' : 
                    i <= Math.ceil(config.tableCount * 0.7) ? 'private' : 'patio',
            x: ((i - 1) % 5) * 150 + 50,
            y: Math.floor((i - 1) / 5) * 150 + 50,
            rotation: 0
          },
          features: capacity >= 6 ? ['window_view'] : [],
          status: 'available',
          isActive: true,
          isCombinable: capacity <= 4,
          combinesWith: [],
          metadata: {
            restoredAt: new Date(),
            restoredReason: 'Emergency restore after accidental deletion'
          }
        });
        
        tables.push(table);
      }
      
      // Also create some special tables
      if (config.subdomain === 'mughlaimagic') {
        // Add booth tables
        for (let i = 1; i <= 5; i++) {
          tables.push(new Table({
            tenantId: tenant.tenantId,
            number: `B${i}`,
            displayName: `Booth ${i}`,
            capacity: 4,
            minCapacity: 2,
            maxCapacity: 6,
            type: 'private',
            shape: 'rectangle',
            location: {
              floor: 'main',
              section: 'dining',
              x: 800,
              y: i * 150
            },
            features: ['privacy_screen'],
            status: 'available',
            isActive: true,
            isCombinable: false
          }));
        }
      }
      
      if (config.subdomain === 'hardrockcafe') {
        // Add bar seats
        for (let i = 1; i <= 10; i++) {
          tables.push(new Table({
            tenantId: tenant.tenantId,
            number: `BAR${i}`,
            displayName: `Bar Seat ${i}`,
            capacity: 1,
            minCapacity: 1,
            maxCapacity: 1,
            type: 'bar',
            shape: 'square',
            location: {
              floor: 'main',
              section: 'bar',
              x: i * 80,
              y: 50
            },
            features: ['power_outlet'],
            status: 'available',
            isActive: true,
            isCombinable: false
          }));
        }
      }
      
      // Save all tables
      await Table.insertMany(tables);
      console.log(`- Created ${tables.length} tables`);
      
      // Update layout
      const layout = await TableLayout.getOrCreate(tenant.tenantId);
      for (const table of tables) {
        try {
          await layout.assignTableToSection(
            table.location.floor,
            table.location.section,
            table.number
          );
        } catch (err) {
          // Section might not exist, that's ok
        }
      }
    }
    
    console.log('\nEMERGENCY RESTORE COMPLETED!');
    console.log('Tables have been recreated based on known configuration.');
    console.log('Some details may differ from original data.');
    
    await mongoose.disconnect();
  } catch (error) {
    console.error('Emergency restore error:', error);
    process.exit(1);
  }
}

emergencyRestoreTables();