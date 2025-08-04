const mongoose = require('mongoose');
const MenuItem = require('./src/models/MenuItem');
const Tenant = require('./src/models/Tenant');
require('dotenv').config();

async function debugMenuItems() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');
    
    // Find all tenants
    const tenants = await Tenant.find({ status: 'active' });
    console.log(`\nFound ${tenants.length} active tenants:`);
    
    for (const tenant of tenants) {
      console.log(`\n=== ${tenant.name} (${tenant.subdomain}) ===`);
      console.log(`Tenant ID: ${tenant.tenantId}`);
      
      // Count menu items for this tenant
      const totalItems = await MenuItem.countDocuments({ tenantId: tenant.tenantId });
      const availableItems = await MenuItem.countDocuments({ 
        tenantId: tenant.tenantId, 
        available: true 
      });
      
      console.log(`Total menu items: ${totalItems}`);
      console.log(`Available items: ${availableItems}`);
      
      // Show first 3 available items
      if (availableItems > 0) {
        const items = await MenuItem.find({ 
          tenantId: tenant.tenantId, 
          available: true 
        }).limit(3);
        
        console.log('\nSample items:');
        items.forEach(item => {
          console.log(`  - ${item.name} (${item.category}) - $${item.price}`);
        });
      } else {
        console.log('⚠️  No available menu items found!');
      }
    }
    
    // Check for items without tenantId (legacy)
    const noTenantItems = await MenuItem.countDocuments({ 
      $or: [
        { tenantId: null },
        { tenantId: { $exists: false } }
      ]
    });
    
    if (noTenantItems > 0) {
      console.log(`\n⚠️  Found ${noTenantItems} menu items without tenant ID`);
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.connection.close();
  }
}

debugMenuItems();