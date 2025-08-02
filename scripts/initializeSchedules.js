require('dotenv').config();
const mongoose = require('mongoose');
const Tenant = require('../src/models/Tenant');
const MenuSchedule = require('../src/models/MenuSchedule');

async function initializeSchedules() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('Connected to MongoDB');

    // Get all tenants
    const tenants = await Tenant.find({});
    console.log(`Found ${tenants.length} tenants`);

    for (const tenant of tenants) {
      console.log(`\nProcessing tenant: ${tenant.name} (${tenant.subdomain})`);
      
      // Check if schedules already exist
      const existingSchedules = await MenuSchedule.find({ 
        tenantId: tenant.tenantId 
      });
      
      if (existingSchedules.length > 0) {
        console.log(`  - Schedules already exist (${existingSchedules.length} schedules)`);
        continue;
      }
      
      // Get default schedules
      const defaultSchedules = MenuSchedule.getDefaultSchedules();
      
      // Create schedules for tenant
      const createdSchedules = [];
      for (const scheduleData of defaultSchedules) {
        const schedule = new MenuSchedule({
          ...scheduleData,
          tenantId: tenant.tenantId
        });
        await schedule.save();
        createdSchedules.push(schedule);
      }
      
      console.log(`  - Created ${createdSchedules.length} default schedules`);
      createdSchedules.forEach(schedule => {
        console.log(`    • ${schedule.name} (${schedule.scheduleType})`);
      });
    }
    
    console.log('\nSchedule initialization complete!');
    process.exit(0);
  } catch (error) {
    console.error('Error initializing schedules:', error);
    process.exit(1);
  }
}

// Run the script
initializeSchedules();