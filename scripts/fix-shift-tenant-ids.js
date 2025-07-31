const mongoose = require('mongoose');
const Shift = require('../src/models/Shift');
const User = require('../src/models/User');
require('dotenv').config();

async function fixShiftTenantIds() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Find all shifts
    const shifts = await Shift.find({}).populate('employee');
    console.log(`Found ${shifts.length} shifts to check`);

    let fixed = 0;
    let errors = 0;

    for (const shift of shifts) {
      try {
        if (shift.employee && shift.employee.tenantId) {
          // Check if shift tenantId matches employee tenantId
          if (shift.tenantId !== shift.employee.tenantId) {
            console.log(`Fixing shift ${shift._id}: changing tenantId from ${shift.tenantId} to ${shift.employee.tenantId}`);
            shift.tenantId = shift.employee.tenantId;
            await shift.save();
            fixed++;
          }
        } else {
          console.error(`Shift ${shift._id} has no employee or employee has no tenantId`);
          errors++;
        }
      } catch (error) {
        console.error(`Error processing shift ${shift._id}:`, error);
        errors++;
      }
    }

    console.log(`\nFixed ${fixed} shifts`);
    console.log(`Encountered ${errors} errors`);

    // Verify tenant isolation
    const tenantCounts = await Shift.aggregate([
      { $group: { _id: '$tenantId', count: { $sum: 1 } } }
    ]);

    console.log('\nShifts per tenant:');
    for (const tc of tenantCounts) {
      console.log(`  Tenant ${tc._id}: ${tc.count} shifts`);
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
  }
}

// Run the script
fixShiftTenantIds();