const mongoose = require('mongoose');
const User = require('../src/models/User');
const { getCurrentTenantId } = require('../src/middleware/tenantContext');

async function testDirectQuery() {
  try {
    // Connect to MongoDB
    await mongoose.connect('mongodb+srv://admin:%21Jafar18022017@cluster0.mzlqfml.mongodb.net/gritservices?retryWrites=true&w=majority&appName=Cluster0');
    console.log('Connected to MongoDB\n');

    // Test 1: Direct query without tenant context
    console.log('1. Direct query for Hard Rock users:');
    const directUsers = await User.find({ tenantId: 'rest_hardrockcafe_003' }).select('-password');
    console.log(`Found ${directUsers.length} users`);
    directUsers.forEach(user => {
      console.log(`- ${user.name} (${user.email})`);
    });

    // Test 2: Check if getCurrentTenantId works
    console.log('\n2. Testing getCurrentTenantId:');
    const currentTenantId = getCurrentTenantId();
    console.log('Current tenant ID:', currentTenantId);

    // Test 3: Query with empty object
    console.log('\n3. Query with empty filter:');
    const allUsers = await User.find({}).limit(5);
    console.log(`Found ${allUsers.length} users (limited to 5)`);

    // Test 4: Check distinct tenantIds
    console.log('\n4. Distinct tenant IDs in User collection:');
    const distinctTenantIds = await User.distinct('tenantId');
    console.log('Tenant IDs:', distinctTenantIds);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
  }
}

testDirectQuery();