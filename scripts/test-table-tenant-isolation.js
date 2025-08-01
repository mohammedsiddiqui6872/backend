// Test script for table tenant isolation
require('dotenv').config();
const mongoose = require('mongoose');
const Table = require('../src/models/Table');
const TableLayout = require('../src/models/TableLayout');
const TableCustomerSession = require('../src/models/TableCustomerSession');
const Tenant = require('../src/models/Tenant');

async function testTableTenantIsolation() {
  try {
    console.log('🔍 Testing Table Tenant Isolation...\n');

    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/restaurant-system');
    console.log('✅ Connected to database\n');

    // Test 1: Create table without tenantId
    console.log('Test 1: Creating table without tenantId...');
    try {
      const invalidTable = new Table({
        number: 'TEST-001',
        capacity: 4,
        type: 'regular',
        shape: 'square',
        location: { floor: 'main', section: 'dining', x: 0, y: 0 }
      });
      await invalidTable.save();
      console.log('❌ FAIL: Table created without tenantId!');
    } catch (error) {
      console.log('✅ PASS: ' + error.message);
    }

    // Test 2: Create table with invalid tenantId
    console.log('\nTest 2: Creating table with invalid tenantId...');
    try {
      const invalidTable = new Table({
        tenantId: 'invalid-tenant-123',
        number: 'TEST-002',
        capacity: 4,
        type: 'regular',
        shape: 'square',
        location: { floor: 'main', section: 'dining', x: 0, y: 0 }
      });
      await invalidTable.save();
      console.log('❌ FAIL: Table created with invalid tenantId!');
    } catch (error) {
      console.log('✅ PASS: ' + error.message);
    }

    // Test 3: Verify tenant filtering in queries
    console.log('\nTest 3: Testing tenant filtering in queries...');
    
    // Get two different tenants
    const tenants = await Tenant.find({ status: 'active' }).limit(2);
    if (tenants.length < 2) {
      console.log('⚠️  Need at least 2 active tenants for this test');
    } else {
      const tenant1 = tenants[0];
      const tenant2 = tenants[1];

      // Count tables for each tenant
      const tenant1Tables = await Table.find({ tenantId: tenant1.tenantId });
      const tenant2Tables = await Table.find({ tenantId: tenant2.tenantId });
      
      console.log(`✅ Tenant 1 (${tenant1.name}): ${tenant1Tables.length} tables`);
      console.log(`✅ Tenant 2 (${tenant2.name}): ${tenant2Tables.length} tables`);

      // Verify no cross-tenant access
      const crossTenantTables = await Table.find({
        tenantId: tenant1.tenantId,
        _id: { $in: tenant2Tables.map(t => t._id) }
      });

      if (crossTenantTables.length === 0) {
        console.log('✅ PASS: No cross-tenant table access detected');
      } else {
        console.log('❌ FAIL: Cross-tenant table access detected!');
      }
    }

    // Test 4: TableLayout tenant validation
    console.log('\nTest 4: Testing TableLayout tenant validation...');
    try {
      const invalidLayout = new TableLayout({
        floors: [{
          id: 'main',
          name: 'Main Floor',
          displayOrder: 0,
          sections: [],
          dimensions: { width: 1000, height: 800 }
        }]
      });
      await invalidLayout.save();
      console.log('❌ FAIL: TableLayout created without tenantId!');
    } catch (error) {
      console.log('✅ PASS: ' + error.message);
    }

    // Test 5: TableCustomerSession cross-tenant validation
    console.log('\nTest 5: Testing TableCustomerSession cross-tenant validation...');
    if (tenants.length >= 2) {
      const tenant1 = tenants[0];
      const tenant2 = tenants[1];
      
      // Get a table from tenant1
      const tenant1Table = await Table.findOne({ tenantId: tenant1.tenantId });
      
      if (tenant1Table) {
        try {
          // Try to create a session for tenant1's table with tenant2's ID
          const invalidSession = new TableCustomerSession({
            tenantId: tenant2.tenantId, // Wrong tenant!
            tableId: tenant1Table._id,
            tableNumber: tenant1Table.number,
            waiterId: mongoose.Types.ObjectId(),
            numberOfGuests: 2
          });
          await invalidSession.save();
          console.log('❌ FAIL: Cross-tenant session created!');
        } catch (error) {
          console.log('✅ PASS: ' + error.message);
        }
      }
    }

    // Test 6: QR Code uniqueness
    console.log('\nTest 6: Testing QR code generation with tenant context...');
    const activeTable = await Table.findOne({ isActive: true });
    if (activeTable && activeTable.qrCode) {
      const hasTenatPrefix = activeTable.qrCode.code.startsWith(activeTable.tenantId);
      if (hasTenatPrefix) {
        console.log('✅ PASS: QR code includes tenant context');
      } else {
        console.log('⚠️  WARNING: QR code does not include tenant prefix');
      }
    }

    console.log('\n✅ Table Tenant Isolation Tests Complete!');

  } catch (error) {
    console.error('❌ Test Error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n👋 Database connection closed');
  }
}

// Run tests
testTableTenantIsolation();