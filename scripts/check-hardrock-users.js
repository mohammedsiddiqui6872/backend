const { MongoClient } = require('mongodb');

async function checkHardRockUsers() {
  const uri = 'mongodb+srv://admin:%21Jafar18022017@cluster0.mzlqfml.mongodb.net/gritservices?retryWrites=true&w=majority&appName=Cluster0';
  
  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log('Connected to MongoDB Atlas');

    const db = client.db('gritservices');
    const usersCollection = db.collection('users');

    // Find all users for Hard Rock Cafe
    const hardRockUsers = await usersCollection.find({ 
      tenantId: 'rest_hardrockcafe_003' 
    }).toArray();

    console.log(`\nFound ${hardRockUsers.length} users for Hard Rock Cafe:`);
    
    hardRockUsers.forEach(user => {
      console.log(`- ${user.name} (${user.email}) - Role: ${user.role} - Active: ${user.isActive}`);
    });

    // Also check if there's an admin user
    const adminUser = hardRockUsers.find(u => u.role === 'admin');
    if (adminUser) {
      console.log('\nAdmin user found:', adminUser.email);
    } else {
      console.log('\nNo admin user found for Hard Rock Cafe');
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
  }
}

checkHardRockUsers();