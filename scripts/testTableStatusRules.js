const mongoose = require('mongoose');
const Table = require('../src/models/Table');
const TableStatusRule = require('../src/models/TableStatusRule');
const TableStatusRuleEngine = require('../src/services/tableStatusRuleEngine');
require('dotenv').config();

async function testRules() {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log('Connected to MongoDB');

    // Initialize rule engine
    const ruleEngine = new TableStatusRuleEngine();
    
    // Get a test tenant and table
    const tenantId = 'rest_mughlaimagic_001';
    const table = await Table.findOne({ tenantId, status: 'available' });
    
    if (!table) {
      console.log('No available table found for testing');
      return;
    }

    console.log(`\nTesting with table ${table.number} (status: ${table.status})`);

    // Test 1: Order placed event
    console.log('\n--- Test 1: Order Placed Event ---');
    await ruleEngine.processEvent(
      tenantId,
      'order_placed',
      table.number,
      {
        order_id: new mongoose.Types.ObjectId(),
        order_amount: 150,
        customer_name: 'Test Customer'
      }
    );

    // Check table status after event
    const updatedTable = await Table.findById(table._id);
    console.log(`Table status after order placed: ${updatedTable.status}`);
    console.log(`Status change reason: ${updatedTable.statusChangeReason}`);

    // Test 2: Payment completed event
    console.log('\n--- Test 2: Payment Completed Event ---');
    await ruleEngine.processEvent(
      tenantId,
      'payment_completed',
      table.number,
      {
        order_id: new mongoose.Types.ObjectId(),
        payment_amount: 150,
        payment_method: 'card',
        customer_name: 'Test Customer'
      }
    );

    const finalTable = await Table.findById(table._id);
    console.log(`Table status after payment: ${finalTable.status}`);
    console.log(`Status change reason: ${finalTable.statusChangeReason}`);

    // Test 3: Check active rules
    console.log('\n--- Active Rules for Tenant ---');
    const rules = await TableStatusRule.find({ 
      tenantId, 
      isActive: true 
    }).sort({ priority: -1 });

    rules.forEach(rule => {
      console.log(`- ${rule.name} (Priority: ${rule.priority}, Trigger: ${rule.triggerEvent})`);
    });

    console.log('\nTest completed!');
    
    // Reset table to available
    await Table.findByIdAndUpdate(table._id, { 
      status: 'available',
      statusChangeReason: 'Test cleanup'
    });

    process.exit(0);

  } catch (error) {
    console.error('Error testing rules:', error);
    process.exit(1);
  }
}

// Run the test
testRules();