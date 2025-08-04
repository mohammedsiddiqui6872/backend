require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./src/models/User');
const Tenant = require('./src/models/Tenant');

async function fixAdminTenant(subdomain) {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');
    
    // Find the tenant
    const tenant = await Tenant.findOne({ subdomain });
    if (!tenant) {
      console.error(`Tenant with subdomain '${subdomain}' not found`);
      return;
    }
    
    console.log(`\nFound tenant: ${tenant.name} (${tenant.tenantId})`);
    
    // Find admin user for this tenant
    const adminEmail = `admin@${subdomain}.ae`;
    const adminUser = await User.findOne({ 
      email: adminEmail 
    }).setOptions({ skipTenantFilter: true });
    
    if (!adminUser) {
      console.error(`Admin user ${adminEmail} not found`);
      return;
    }
    
    console.log(`Found admin user: ${adminUser.email}`);
    console.log(`Current tenantId: ${adminUser.tenantId}`);
    
    // Update tenant ID if needed
    if (adminUser.tenantId !== tenant.tenantId) {
      adminUser.tenantId = tenant.tenantId;
      await adminUser.save();
      console.log(`Updated admin user tenantId to: ${tenant.tenantId}`);
    } else {
      console.log('Admin user already has correct tenantId');
    }
    
    // Verify tables exist
    const Table = require('./src/models/Table');
    const tables = await Table.find({ tenantId: tenant.tenantId });
    console.log(`\nTenant has ${tables.length} tables`);
    
    await mongoose.disconnect();
    console.log('\nDone!');
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

// Get subdomain from command line
const subdomain = process.argv[2];
if (!subdomain) {
  console.error('Usage: node fixAdminTenant.js <subdomain>');
  console.error('Example: node fixAdminTenant.js mughlaimagic');
  process.exit(1);
}

fixAdminTenant(subdomain);