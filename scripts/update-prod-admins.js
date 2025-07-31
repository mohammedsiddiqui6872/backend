// Direct MongoDB update for production database
const { MongoClient } = require('mongodb');

async function updateProductionAdmins() {
  const uri = 'mongodb+srv://admin:%21Jafar18022017@cluster0.mzlqfml.mongodb.net/gritservices?retryWrites=true&w=majority&appName=Cluster0';
  
  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log('Connected to MongoDB Atlas');

    const db = client.db('gritservices');
    const usersCollection = db.collection('users');

    // Admin users data with proper bcrypt hash for 'password123'
    const adminUsers = [
      {
        tenantId: 'rest_mughlaimagic_001',
        name: 'Admin',
        email: 'admin@mughlaimagic.ae',
        password: '$2a$10$A8UkYMP9ultA8SShKe.Cfug6Y9RH8432ehC4Eje77HWPTnSW7EOwe',
        role: 'admin',
        permissions: ['menu.view', 'menu.edit', 'orders.view', 'orders.edit', 'analytics.view', 'users.manage'],
        phone: '+971501234567',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        tenantId: 'rest_bellavista_002',
        name: 'Admin',
        email: 'admin@bellavista.ae',
        password: '$2a$10$A8UkYMP9ultA8SShKe.Cfug6Y9RH8432ehC4Eje77HWPTnSW7EOwe',
        role: 'admin',
        permissions: ['menu.view', 'menu.edit', 'orders.view', 'orders.edit', 'analytics.view', 'users.manage'],
        phone: '+971501234568',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        tenantId: 'rest_hardrockcafe_003',
        name: 'Admin',
        email: 'admin@hardrockcafe.ae',
        password: '$2a$10$A8UkYMP9ultA8SShKe.Cfug6Y9RH8432ehC4Eje77HWPTnSW7EOwe',
        role: 'admin',
        permissions: ['menu.view', 'menu.edit', 'orders.view', 'orders.edit', 'analytics.view', 'users.manage'],
        phone: '+971501234569',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    // Update or create each admin user
    for (const user of adminUsers) {
      const result = await usersCollection.updateOne(
        { email: user.email, tenantId: user.tenantId },
        { $set: user },
        { upsert: true }
      );

      if (result.upsertedCount > 0) {
        console.log(`Created admin user: ${user.email}`);
      } else if (result.modifiedCount > 0) {
        console.log(`Updated admin user: ${user.email}`);
      } else {
        console.log(`No changes for: ${user.email}`);
      }
    }

    console.log('\nAdmin users update completed!');
    console.log('\nYou can now login with:');
    console.log('- admin@mughlaimagic.ae / password123');
    console.log('- admin@bellavista.ae / password123');
    console.log('- admin@hardrockcafe.ae / password123');
    console.log('\nSuper Admin (works for all restaurants):');
    console.log('- admin@gritservices.ae / gritadmin2024!');

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
  }
}

// Run the update
updateProductionAdmins();