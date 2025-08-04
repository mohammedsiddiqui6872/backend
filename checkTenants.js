require('dotenv').config();
const mongoose = require('mongoose');
const Tenant = require('./src/models/Tenant');
const Table = require('./src/models/Table');

(async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');
    
    const tenants = await Tenant.find({});
    console.log(`\nFound ${tenants.length} total tenants:`);
    
    for (const tenant of tenants) {
      console.log(`\n- Subdomain: ${tenant.subdomain}`);
      console.log(`  Name: ${tenant.name}`);
      console.log(`  Status: ${tenant.status}`);
      console.log(`  IsActive (virtual): ${tenant.isActive}`);
      console.log(`  TenantId: ${tenant.tenantId}`);
      
      // Check tables for this tenant
      const tables = await Table.find({ tenantId: tenant.tenantId });
      console.log(`  Tables: ${tables.length}`);
    }
    
    await mongoose.disconnect();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
})();