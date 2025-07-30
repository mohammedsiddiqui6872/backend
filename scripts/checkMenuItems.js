const mongoose = require('mongoose');
require('dotenv').config();

mongoose.connect(process.env.MONGODB_URI)
  .then(async () => {
    const MenuItem = require('../src/models/MenuItem');
    
    const total = await MenuItem.countDocuments();
    const withTenant = await MenuItem.countDocuments({ tenantId: { $exists: true } });
    
    console.log(`Total menu items: ${total}`);
    console.log(`Items with tenantId: ${withTenant}`);
    
    // Get sample items
    const samples = await MenuItem.find({ tenantId: { $exists: true } }).limit(3);
    console.log('\nSample items with tenantId:');
    samples.forEach(item => {
      console.log(`- ${item.name} (${item.tenantId})`);
    });
    
    // Check items without tenantId
    const withoutTenant = await MenuItem.find({ tenantId: { $exists: false } }).limit(3);
    if (withoutTenant.length > 0) {
      console.log('\nItems WITHOUT tenantId:');
      withoutTenant.forEach(item => {
        console.log(`- ${item.name}`);
      });
    }
    
    process.exit(0);
  })
  .catch(err => {
    console.error('Error:', err);
    process.exit(1);
  });