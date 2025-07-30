// Simplified tenant setup script
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

async function setupTenants() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const db = mongoose.connection.db;

    // Step 1: Clear everything
    console.log('\nStep 1: Clearing all data...');
    await db.collection('tenants').deleteMany({});
    await db.collection('users').deleteMany({});
    await db.collection('categories').deleteMany({});
    await db.collection('tables').deleteMany({});
    await db.collection('menuitems').deleteMany({});
    console.log('✓ All data cleared');

    // Step 2: Create tenants
    console.log('\nStep 2: Creating tenants...');
    
    const tenants = [
      {
        tenantId: 'rest_mughlaimagic_001',
        name: 'Mughlai Magic',
        subdomain: 'mughlaimagic',
        plan: 'pro',
        status: 'active',
        owner: {
          name: 'Ahmed Khan',
          email: 'admin@mughlaimagic.ae',
          phone: '+971-50-123-4567'
        },
        address: 'Downtown Dubai, Sheikh Zayed Road, Dubai, UAE',
        settings: {
          primaryColor: '#8B4513',
          currency: 'AED',
          timezone: 'Asia/Dubai',
          language: 'en'
        },
        limits: {
          maxOrders: 5000,
          maxUsers: 25,
          maxTables: 50,
          maxMenuItems: 500
        },
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        tenantId: 'rest_bellavista_002',
        name: 'Bella Vista',
        subdomain: 'bellavista',
        plan: 'basic',
        status: 'active',
        owner: {
          name: 'Maria Romano',
          email: 'admin@bellavista.ae',
          phone: '+971-50-234-5678'
        },
        address: 'JBR Walk, Dubai Marina, Dubai, UAE',
        settings: {
          primaryColor: '#228B22',
          currency: 'AED',
          timezone: 'Asia/Dubai',
          language: 'en'
        },
        limits: {
          maxOrders: 500,
          maxUsers: 10,
          maxTables: 20,
          maxMenuItems: 200
        },
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        tenantId: 'rest_hardrockcafe_003',
        name: 'Hard Rock Cafe',
        subdomain: 'hardrockcafe',
        plan: 'enterprise',
        status: 'active',
        owner: {
          name: 'John Smith',
          email: 'admin@hardrockcafe.ae',
          phone: '+971-50-345-6789'
        },
        address: 'Festival City Mall, Dubai Festival City, Dubai, UAE',
        settings: {
          primaryColor: '#FF0000',
          currency: 'AED',
          timezone: 'Asia/Dubai',
          language: 'en'
        },
        limits: {
          maxOrders: -1,
          maxUsers: 100,
          maxTables: 100,
          maxMenuItems: 1000
        },
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    await db.collection('tenants').insertMany(tenants);
    console.log(`✓ Created ${tenants.length} tenants`);

    // Step 3: Create users for each tenant
    console.log('\nStep 3: Creating users...');
    const hashedPassword = await bcrypt.hash('admin123', 10);
    
    for (const tenant of tenants) {
      const users = [
        {
          tenantId: tenant.tenantId,
          email: tenant.owner.email,
          password: hashedPassword,
          name: tenant.owner.name,
          role: 'admin',
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          tenantId: tenant.tenantId,
          email: `waiter1@${tenant.subdomain}.ae`,
          password: hashedPassword,
          name: 'Waiter One',
          role: 'waiter',
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          tenantId: tenant.tenantId,
          email: `waiter2@${tenant.subdomain}.ae`,
          password: hashedPassword,
          name: 'Waiter Two',
          role: 'waiter',
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          tenantId: tenant.tenantId,
          email: `chef@${tenant.subdomain}.ae`,
          password: hashedPassword,
          name: 'Head Chef',
          role: 'chef',
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];
      
      await db.collection('users').insertMany(users);
      console.log(`✓ Created ${users.length} users for ${tenant.name}`);
    }

    // Step 4: Create categories for each tenant
    console.log('\nStep 4: Creating categories...');
    
    for (const tenant of tenants) {
      const categories = [
        {
          tenantId: tenant.tenantId,
          name: 'Appetizers',
          slug: 'appetizers',
          displayOrder: 1,
          isActive: true,
          isDeleted: false,
          createdAt: new Date()
        },
        {
          tenantId: tenant.tenantId,
          name: 'Main Courses',
          slug: 'main-courses',
          displayOrder: 2,
          isActive: true,
          isDeleted: false,
          createdAt: new Date()
        },
        {
          tenantId: tenant.tenantId,
          name: 'Desserts',
          slug: 'desserts',
          displayOrder: 3,
          isActive: true,
          isDeleted: false,
          createdAt: new Date()
        },
        {
          tenantId: tenant.tenantId,
          name: 'Beverages',
          slug: 'beverages',
          displayOrder: 4,
          isActive: true,
          isDeleted: false,
          createdAt: new Date()
        }
      ];
      
      await db.collection('categories').insertMany(categories);
      console.log(`✓ Created ${categories.length} categories for ${tenant.name}`);
    }

    // Step 5: Create tables for each tenant
    console.log('\nStep 5: Creating tables...');
    
    for (const tenant of tenants) {
      const tables = [];
      const tableCount = tenant.plan === 'enterprise' ? 50 : (tenant.plan === 'pro' ? 25 : 15);
      
      for (let i = 1; i <= tableCount; i++) {
        tables.push({
          tenantId: tenant.tenantId,
          number: String(i),
          capacity: i <= 5 ? 2 : (i <= 15 ? 4 : 6),
          status: 'available',
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date()
        });
      }
      
      await db.collection('tables').insertMany(tables);
      console.log(`✓ Created ${tables.length} tables for ${tenant.name}`);
    }

    // Step 6: Create sample menu items
    console.log('\nStep 6: Creating menu items...');
    
    const menuItemsByTenant = {
      'rest_mughlaimagic_001': [
        { name: 'Chicken Biryani', category: 'main-courses', price: 45, description: 'Aromatic basmati rice with tender chicken' },
        { name: 'Mutton Korma', category: 'main-courses', price: 55, description: 'Slow-cooked mutton in rich gravy' },
        { name: 'Paneer Tikka', category: 'appetizers', price: 35, description: 'Grilled cottage cheese with spices' },
        { name: 'Seekh Kebab', category: 'appetizers', price: 38, description: 'Grilled minced meat skewers' },
        { name: 'Gulab Jamun', category: 'desserts', price: 20, description: 'Sweet milk dumplings in syrup' }
      ],
      'rest_bellavista_002': [
        { name: 'Margherita Pizza', category: 'main-courses', price: 42, description: 'Classic tomato and mozzarella' },
        { name: 'Carbonara Pasta', category: 'main-courses', price: 48, description: 'Creamy pasta with bacon' },
        { name: 'Caesar Salad', category: 'appetizers', price: 35, description: 'Crisp romaine with parmesan' },
        { name: 'Bruschetta', category: 'appetizers', price: 28, description: 'Toasted bread with tomatoes' },
        { name: 'Tiramisu', category: 'desserts', price: 25, description: 'Classic Italian dessert' }
      ],
      'rest_hardrockcafe_003': [
        { name: 'Legendary Burger', category: 'main-courses', price: 65, description: 'Signature beef burger with special sauce' },
        { name: 'BBQ Ribs', category: 'main-courses', price: 95, description: 'Fall-off-the-bone pork ribs' },
        { name: 'Nachos Supreme', category: 'appetizers', price: 45, description: 'Loaded nachos with all toppings' },
        { name: 'Wings Platter', category: 'appetizers', price: 55, description: 'Buffalo wings with blue cheese' },
        { name: 'Brownie Sundae', category: 'desserts', price: 35, description: 'Warm brownie with ice cream' }
      ]
    };

    let itemId = 1;
    for (const [tenantId, items] of Object.entries(menuItemsByTenant)) {
      const menuItems = items.map(item => ({
        tenantId,
        id: itemId++,
        name: item.name,
        category: item.category,
        price: item.price,
        description: item.description,
        available: true,
        isAvailable: true,
        prepTime: 15,
        preparationTime: 15,
        isDeleted: false,
        createdAt: new Date(),
        updatedAt: new Date()
      }));
      
      await db.collection('menuitems').insertMany(menuItems);
      const tenantName = tenants.find(t => t.tenantId === tenantId).name;
      console.log(`✓ Created ${menuItems.length} menu items for ${tenantName}`);
    }

    console.log('\n🎉 All tenants set up successfully!');
    console.log('\nAccess URLs:');
    console.log('- SaaS Portal: http://localhost:3000 (admin@gritservices.ae / admin123)');
    console.log('- Mughlai Magic: https://mughlaimagic.gritservices.ae (admin@mughlaimagic.ae / admin123)');
    console.log('- Bella Vista: https://bellavista.gritservices.ae (admin@bellavista.ae / admin123)');
    console.log('- Hard Rock Cafe: https://hardrockcafe.gritservices.ae (admin@hardrockcafe.ae / admin123)');

  } catch (error) {
    console.error('Error setting up tenants:', error);
  } finally {
    await mongoose.connection.close();
  }
}

setupTenants();