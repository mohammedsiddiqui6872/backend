require('dotenv').config();
const mongoose = require('mongoose');
const GuestSession = require('../src/models/GuestSession');
const Table = require('../src/models/Table');

async function testGuestSessionModel() {
  try {
    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const tenantId = 'bellavista';
    const tableNumber = 'T2';

    // Check if table exists
    console.log('\n1. Checking if table exists...');
    const table = await Table.findOne({ 
      number: String(tableNumber),
      tenantId: tenantId
    });
    
    if (table) {
      console.log('✅ Table found:', { number: table.number, status: table.status });
    } else {
      console.log('❌ Table not found');
      
      // List available tables
      const tables = await Table.find({ tenantId }).limit(5);
      console.log('Available tables:', tables.map(t => t.number));
    }

    // Test creating guest session
    console.log('\n2. Testing guest session creation...');
    try {
      const guestSession = new GuestSession({
        tenantId: tenantId,
        tableNumber: tableNumber,
        customerName: 'Test Guest',
        customerPhone: '+971501234567',
        customerEmail: 'test@example.com',
        occupancy: 2,
        deviceType: 'tablet'
      });

      await guestSession.save();
      console.log('✅ Guest session created successfully');
      console.log('Session token:', guestSession.sessionToken);
      console.log('Session ID:', guestSession._id);

      // Clean up
      await GuestSession.deleteOne({ _id: guestSession._id });
      console.log('✅ Test session cleaned up');
    } catch (error) {
      console.log('❌ Failed to create guest session');
      console.log('Error:', error.message);
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  }
}

testGuestSessionModel();