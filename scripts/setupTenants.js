// Script to set up initial tenants for GRIT Services
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// Import models
const Tenant = require('../src/models/Tenant');
const User = require('../src/models/User');
const Category = require('../src/models/Category');
const Table = require('../src/models/Table');
const MenuItem = require('../src/models/MenuItem');

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
    menuItems: [
      { name: 'Chicken Biryani', category: 'main-courses', price: 45, description: 'Aromatic basmati rice with tender chicken' },
      { name: 'Mutton Korma', category: 'main-courses', price: 55, description: 'Slow-cooked mutton in rich gravy' },
      { name: 'Paneer Tikka', category: 'appetizers', price: 35, description: 'Grilled cottage cheese with spices' },
      { name: 'Seekh Kebab', category: 'appetizers', price: 38, description: 'Grilled minced meat skewers' },
      { name: 'Gulab Jamun', category: 'desserts', price: 20, description: 'Sweet milk dumplings in syrup' }
    ]
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
    menuItems: [
      { name: 'Margherita Pizza', category: 'main-courses', price: 42, description: 'Classic tomato and mozzarella' },
      { name: 'Carbonara Pasta', category: 'main-courses', price: 48, description: 'Creamy pasta with bacon' },
      { name: 'Caesar Salad', category: 'appetizers', price: 35, description: 'Crisp romaine with parmesan' },
      { name: 'Bruschetta', category: 'appetizers', price: 28, description: 'Toasted bread with tomatoes' },
      { name: 'Tiramisu', category: 'desserts', price: 25, description: 'Classic Italian dessert' }
    ]
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
    menuItems: [
      { name: 'Legendary Burger', category: 'main-courses', price: 65, description: 'Signature beef burger with special sauce' },
      { name: 'BBQ Ribs', category: 'main-courses', price: 95, description: 'Fall-off-the-bone pork ribs' },
      { name: 'Nachos Supreme', category: 'appetizers', price: 45, description: 'Loaded nachos with all toppings' },
      { name: 'Wings Platter', category: 'appetizers', price: 55, description: 'Buffalo wings with blue cheese' },
      { name: 'Brownie Sundae', category: 'desserts', price: 35, description: 'Warm brownie with ice cream' }
    ]
  }
];

async function setupTenants() {
  try {
    // Connect to MongoDB
    if (!process.env.MONGODB_URI) {
      console.error('Error: MONGODB_URI environment variable is not set');
      console.error('Please run: export MONGODB_URI="your-mongodb-connection-string"');
      process.exit(1);
    }
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Clear existing data (optional - comment out if you want to keep existing data)
    console.log('Clearing existing tenant data...');
    await mongoose.connection.db.collection('tenants').deleteMany({});
    await mongoose.connection.db.collection('users').deleteMany({});
    await mongoose.connection.db.collection('categories').deleteMany({});
    await mongoose.connection.db.collection('tables').deleteMany({});
    await mongoose.connection.db.collection('menuitems').deleteMany({});
    
    for (const tenantData of tenants) {
      console.log(`\nSetting up ${tenantData.name}...`);
      
      // Create tenant
      const tenant = new Tenant({
        tenantId: tenantData.tenantId,
        name: tenantData.name,
        subdomain: tenantData.subdomain,
        plan: tenantData.plan,
        status: tenantData.status,
        owner: tenantData.owner,
        address: tenantData.address,
        settings: tenantData.settings,
        limits: {
          maxOrders: tenantData.plan === 'enterprise' ? -1 : (tenantData.plan === 'pro' ? 5000 : 500),
          maxUsers: tenantData.plan === 'enterprise' ? 100 : (tenantData.plan === 'pro' ? 25 : 10),
          maxTables: tenantData.plan === 'enterprise' ? 100 : (tenantData.plan === 'pro' ? 50 : 20),
          maxMenuItems: tenantData.plan === 'enterprise' ? 1000 : (tenantData.plan === 'pro' ? 500 : 200)
        }
      });
      
      await tenant.save();
      console.log(`✓ Created tenant: ${tenant.name}`);
      
      // Create admin user
      const hashedPassword = await bcrypt.hash('admin123', 10);
      const adminUser = new User({
        tenantId: tenant.tenantId,
        email: tenantData.owner.email,
        password: hashedPassword,
        name: tenantData.owner.name,
        role: 'admin',
        isActive: true
      });
      
      await adminUser.save();
      console.log(`✓ Created admin user: ${adminUser.email}`);
      
      // Create categories
      const categories = [
        { tenantId: tenant.tenantId, name: 'Appetizers', slug: 'appetizers', displayOrder: 1, isActive: true, isDeleted: false },
        { tenantId: tenant.tenantId, name: 'Main Courses', slug: 'main-courses', displayOrder: 2, isActive: true, isDeleted: false },
        { tenantId: tenant.tenantId, name: 'Desserts', slug: 'desserts', displayOrder: 3, isActive: true, isDeleted: false },
        { tenantId: tenant.tenantId, name: 'Beverages', slug: 'beverages', displayOrder: 4, isActive: true, isDeleted: false }
      ];
      
      try {
        await Category.insertMany(categories);
        console.log(`✓ Created ${categories.length} categories`);
      } catch (catError) {
        // If categories already exist, just log it
        console.log(`✓ Categories already exist for ${tenant.name}`);
      }
      
      // Create tables
      const tables = [];
      const tableCount = tenant.plan === 'enterprise' ? 50 : (tenant.plan === 'pro' ? 25 : 15);
      
      for (let i = 1; i <= tableCount; i++) {
        tables.push({
          tenantId: tenant.tenantId,
          number: String(i),
          capacity: i <= 5 ? 2 : (i <= 15 ? 4 : 6),
          status: 'available',
          isActive: true
        });
      }
      
      await Table.insertMany(tables);
      console.log(`✓ Created ${tables.length} tables`);
      
      // Create menu items
      const menuItems = [];
      let itemId = 1;
      for (const item of tenantData.menuItems) {
        menuItems.push({
          tenantId: tenant.tenantId,
          id: itemId++,
          name: item.name,
          category: item.category,
          price: item.price,
          description: item.description,
          available: true,
          isAvailable: true,
          isVegetarian: item.name.includes('Paneer') || item.name.includes('Salad'),
          prepTime: 15,
          preparationTime: 15,
          image: `https://via.placeholder.com/300x200?text=${encodeURIComponent(item.name)}`
        });
      }
      
      await MenuItem.insertMany(menuItems);
      console.log(`✓ Created ${menuItems.length} menu items`);
      
      // Create some staff users
      const staffUsers = [
        { email: `waiter1@${tenantData.subdomain}.ae`, name: 'Waiter One', role: 'waiter' },
        { email: `waiter2@${tenantData.subdomain}.ae`, name: 'Waiter Two', role: 'waiter' },
        { email: `chef@${tenantData.subdomain}.ae`, name: 'Head Chef', role: 'chef' }
      ];
      
      for (const staff of staffUsers) {
        const user = new User({
          tenantId: tenant.tenantId,
          email: staff.email,
          password: hashedPassword,
          name: staff.name,
          role: staff.role,
          isActive: true
        });
        await user.save();
      }
      console.log(`✓ Created ${staffUsers.length} staff users`);
      
      console.log(`\n✅ ${tenant.name} setup complete!`);
      console.log(`   URL: https://${tenant.subdomain}.gritservices.ae`);
      console.log(`   Admin: ${tenantData.owner.email} / admin123`);
    }
    
    console.log('\n🎉 All tenants set up successfully!');
    console.log('\nYou can now access:');
    console.log('- SaaS Portal: http://localhost:3000 (admin@gritservices.ae / admin123)');
    console.log('- Mughlai Magic: http://mughlaimagic.localhost:5000');
    console.log('- Bella Vista: http://bellavista.localhost:5000');
    console.log('- Hard Rock Cafe: http://hardrockcafe.localhost:5000');
    
  } catch (error) {
    console.error('Error setting up tenants:', error);
  } finally {
    await mongoose.connection.close();
  }
}

setupTenants();