require('dotenv').config();
const mongoose = require('mongoose');
const Table = require('../src/models/Table');
const Restaurant = require('../src/models/Tenant');

async function checkBellaVistaTables() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB\n');

    // First, find the Bella Vista restaurant
    console.log('1. Finding Bella Vista restaurant...');
    const restaurant = await Restaurant.findOne({ subdomain: 'bellavista' });
    
    if (!restaurant) {
      console.log('❌ Bella Vista restaurant not found');
      return;
    }
    
    console.log('✅ Found restaurant:');
    console.log('   Name:', restaurant.name);
    console.log('   Tenant ID:', restaurant.tenantId);
    console.log('   Subdomain:', restaurant.subdomain);
    console.log('   Status:', restaurant.status);

    // Now check tables with the correct tenantId
    console.log('\n2. Checking tables for tenantId:', restaurant.tenantId);
    const tables = await Table.find({ tenantId: restaurant.tenantId });
    
    console.log(`✅ Found ${tables.length} tables`);
    
    if (tables.length > 0) {
      console.log('\nTable details:');
      tables.forEach(table => {
        console.log(`   - Number: ${table.number}, Status: ${table.status}, Capacity: ${table.capacity}`);
      });
      
      // Check if T2 exists
      const t2 = tables.find(t => t.number === 'T2');
      if (t2) {
        console.log('\n✅ Table T2 exists');
      } else {
        console.log('\n❌ Table T2 not found');
        console.log('Available table numbers:', tables.map(t => t.number).join(', '));
      }
    }

    // Check with different tenantId formats
    console.log('\n3. Checking with subdomain as tenantId...');
    const tablesWithSubdomain = await Table.find({ tenantId: 'bellavista' });
    console.log(`   Found ${tablesWithSubdomain.length} tables with tenantId='bellavista'`);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  }
}

checkBellaVistaTables();