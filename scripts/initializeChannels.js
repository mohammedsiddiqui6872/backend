require('dotenv').config();
const mongoose = require('mongoose');
const Tenant = require('../src/models/Tenant');
const MenuChannel = require('../src/models/MenuChannel');

async function initializeChannels() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('Connected to MongoDB');

    // Get all tenants (since isActive field might not be set)
    const tenants = await Tenant.find({});
    console.log(`Found ${tenants.length} tenants`);

    for (const tenant of tenants) {
      console.log(`\nProcessing tenant: ${tenant.name} (${tenant.subdomain})`);
      
      // Check if channels already exist
      const existingChannels = await MenuChannel.find({ 
        tenantId: tenant.tenantId 
      });
      
      if (existingChannels.length > 0) {
        console.log(`  - Channels already exist (${existingChannels.length} channels)`);
        continue;
      }
      
      // Initialize default channels
      const channels = await MenuChannel.initializeDefaultChannels(tenant.tenantId);
      console.log(`  - Created ${channels.length} default channels`);
      
      // Log channel names
      channels.forEach(channel => {
        console.log(`    • ${channel.displayName} (${channel.name})`);
      });
    }
    
    console.log('\nChannel initialization complete!');
    process.exit(0);
  } catch (error) {
    console.error('Error initializing channels:', error);
    process.exit(1);
  }
}

// Run the script
initializeChannels();