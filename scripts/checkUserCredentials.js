require('dotenv').config();
const mongoose = require('mongoose');

async function checkUsers() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');
    
    const db = mongoose.connection.db;
    
    // Get users for each restaurant
    const restaurants = [
      { tenantId: 'rest_mughlaimagic_001', name: 'Mughlai Magic' },
      { tenantId: 'rest_bellavista_002', name: 'Bella Vista' },
      { tenantId: 'rest_hardrockcafe_003', name: 'Hard Rock Cafe' }
    ];
    
    for (const restaurant of restaurants) {
      console.log(`\n========== ${restaurant.name} (${restaurant.tenantId}) ==========`);
      const users = await db.collection('users').find({ 
        tenantId: restaurant.tenantId,
        role: { $in: ['admin', 'manager', 'waiter'] }
      }).limit(5).toArray();
      
      if (users.length === 0) {
        console.log('No users found for this restaurant');
      } else {
        console.log('\nUsers (password for all is: password123):');
        users.forEach(user => {
          console.log(`\nEmail: ${user.email}`);
          console.log(`Role: ${user.role}`);
          console.log(`Name: ${user.name}`);
          console.log(`Active: ${user.isActive}`);
        });
      }
    }
    
    console.log('\n\n=== LOGIN INSTRUCTIONS ===');
    console.log('1. Go to http://localhost:3000');
    console.log('2. The frontend will detect the restaurant based on subdomain');
    console.log('3. For testing, you can use any of the above credentials');
    console.log('4. Default password for all users: password123');
    console.log('\nAdmin Panel URLs:');
    console.log('- Mughlai Magic: http://localhost:3000/admin');
    console.log('- Bella Vista: http://localhost:3000/admin');
    console.log('- Hard Rock Cafe: http://localhost:3000/admin');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
  }
}

checkUsers();