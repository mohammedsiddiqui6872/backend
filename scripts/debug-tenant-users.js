const { MongoClient } = require('mongodb');

async function debugTenantUsers() {
  const uri = 'mongodb+srv://admin:%21Jafar18022017@cluster0.mzlqfml.mongodb.net/gritservices?retryWrites=true&w=majority&appName=Cluster0';
  
  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log('Connected to MongoDB Atlas\n');

    const db = client.db('gritservices');
    
    // Check tenants
    console.log('1. Checking tenants:');
    const tenants = await db.collection('tenants').find({}).toArray();
    tenants.forEach(tenant => {
      console.log(`- ${tenant.name}: tenantId="${tenant.tenantId}", subdomain="${tenant.subdomain}"`);
    });
    
    // Check all users
    console.log('\n2. Checking all users:');
    const users = await db.collection('users').find({}).toArray();
    console.log(`Total users in database: ${users.length}`);
    
    // Group by tenantId
    const usersByTenant = {};
    users.forEach(user => {
      const tid = user.tenantId || 'NO_TENANT_ID';
      if (!usersByTenant[tid]) usersByTenant[tid] = [];
      usersByTenant[tid].push(user);
    });
    
    console.log('\n3. Users grouped by tenantId:');
    Object.entries(usersByTenant).forEach(([tenantId, tenantUsers]) => {
      console.log(`\nTenant ID: "${tenantId}"`);
      tenantUsers.forEach(user => {
        console.log(`  - ${user.name} (${user.email}) - Role: ${user.role}`);
      });
    });
    
    // Specifically check Hard Rock Cafe
    console.log('\n4. Hard Rock Cafe specific check:');
    const hardRockTenant = await db.collection('tenants').findOne({ subdomain: 'hardrockcafe' });
    console.log('Hard Rock Tenant:', hardRockTenant);
    
    if (hardRockTenant) {
      const hardRockUsers = await db.collection('users').find({ 
        tenantId: hardRockTenant.tenantId 
      }).toArray();
      console.log(`\nUsers with tenantId="${hardRockTenant.tenantId}": ${hardRockUsers.length}`);
      hardRockUsers.forEach(user => {
        console.log(`- ${user.name} (${user.email})`);
      });
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
  }
}

debugTenantUsers();