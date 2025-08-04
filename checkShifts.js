require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./src/models/User'); // Load User model first
const Shift = require('./src/models/Shift');

(async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');
    
    // Check shifts for mughlaimagic
    const shifts = await Shift.find({ tenantId: 'rest_mughlaimagic_001' })
      .populate('employee', 'name email')
      .limit(5)
      .sort('-date');
      
    console.log(`\nFound ${shifts.length} recent shifts for mughlaimagic:`);
    
    shifts.forEach((shift, i) => {
      console.log(`\nShift ${i + 1}:`);
      console.log(`  Date: ${shift.date}`);
      console.log(`  Employee: ${shift.employee?.name || 'Unknown'}`);
      console.log(`  Start: ${shift.startTime}`);
      console.log(`  End: ${shift.endTime}`);
      console.log(`  Status: ${shift.status}`);
      console.log(`  Department: ${shift.department}`);
    });
    
    await mongoose.disconnect();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
})();