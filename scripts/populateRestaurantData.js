require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Import models
const Tenant = require('../src/models/Tenant');
const User = require('../src/models/User');
const Category = require('../src/models/Category');
const MenuItem = require('../src/models/MenuItem');
const Table = require('../src/models/Table');
const Order = require('../src/models/Order');
const RestaurantConfig = require('../src/models/RestaurantConfig');

// Restaurant data
const restaurantsData = [
  {
    tenantId: 'rest_mughlaimagic_001',
    subdomain: 'mughlaimagic',
    name: 'Mughlai Magic',
    cuisine: 'North Indian',
    theme: {
      primaryColor: '#DC143C',
      secondaryColor: '#FFD700'
    },
    categories: [
      'Starters & Appetizers',
      'Tandoori Specialties', 
      'Mughlai Curries',
      'Biryani & Rice',
      'Breads',
      'Desserts',
      'Beverages'
    ],
    menuItems: [
      // Starters
      { name: 'Chicken Tikka', category: 'Starters & Appetizers', price: 25, description: 'Tender chicken marinated in yogurt and spices, grilled to perfection', isVegetarian: false, spiceLevel: 2 },
      { name: 'Seekh Kebab', category: 'Starters & Appetizers', price: 28, description: 'Minced lamb kebabs with aromatic spices', isVegetarian: false, spiceLevel: 2 },
      { name: 'Paneer Tikka', category: 'Starters & Appetizers', price: 22, description: 'Cottage cheese cubes marinated and grilled', isVegetarian: true, spiceLevel: 1 },
      { name: 'Onion Bhaji', category: 'Starters & Appetizers', price: 18, description: 'Crispy onion fritters', isVegetarian: true, spiceLevel: 1 },
      // Tandoori
      { name: 'Tandoori Chicken', category: 'Tandoori Specialties', price: 45, description: 'Half chicken marinated overnight in spices', isVegetarian: false, spiceLevel: 2 },
      { name: 'Fish Tikka', category: 'Tandoori Specialties', price: 48, description: 'Fresh fish marinated in tandoori spices', isVegetarian: false, spiceLevel: 2 },
      // Curries
      { name: 'Butter Chicken', category: 'Mughlai Curries', price: 38, description: 'Tender chicken in creamy tomato sauce', isVegetarian: false, spiceLevel: 1 },
      { name: 'Rogan Josh', category: 'Mughlai Curries', price: 42, description: 'Aromatic lamb curry from Kashmir', isVegetarian: false, spiceLevel: 3 },
      { name: 'Palak Paneer', category: 'Mughlai Curries', price: 32, description: 'Cottage cheese in spinach gravy', isVegetarian: true, spiceLevel: 1 },
      { name: 'Dal Makhani', category: 'Mughlai Curries', price: 28, description: 'Black lentils slow-cooked overnight', isVegetarian: true, spiceLevel: 1 },
      // Rice
      { name: 'Chicken Biryani', category: 'Biryani & Rice', price: 48, description: 'Fragrant basmati rice with tender chicken', isVegetarian: false, spiceLevel: 2 },
      { name: 'Mutton Biryani', category: 'Biryani & Rice', price: 55, description: 'Aromatic rice with succulent mutton', isVegetarian: false, spiceLevel: 2 },
      { name: 'Vegetable Biryani', category: 'Biryani & Rice', price: 38, description: 'Mixed vegetables with fragrant rice', isVegetarian: true, spiceLevel: 1 },
      // Breads
      { name: 'Butter Naan', category: 'Breads', price: 8, description: 'Soft bread brushed with butter', isVegetarian: true },
      { name: 'Garlic Naan', category: 'Breads', price: 10, description: 'Naan topped with garlic', isVegetarian: true },
      { name: 'Tandoori Roti', category: 'Breads', price: 6, description: 'Whole wheat bread', isVegetarian: true },
      // Desserts
      { name: 'Gulab Jamun', category: 'Desserts', price: 18, description: 'Deep fried milk dumplings in sugar syrup', isVegetarian: true },
      { name: 'Ras Malai', category: 'Desserts', price: 20, description: 'Cottage cheese dumplings in sweetened milk', isVegetarian: true },
      // Beverages
      { name: 'Mango Lassi', category: 'Beverages', price: 15, description: 'Yogurt drink with mango', isVegetarian: true },
      { name: 'Masala Chai', category: 'Beverages', price: 10, description: 'Traditional spiced tea', isVegetarian: true }
    ],
    tables: 25
  },
  {
    tenantId: 'rest_bellavista_002',
    subdomain: 'bellavista',
    name: 'Bella Vista',
    cuisine: 'Italian',
    theme: {
      primaryColor: '#006400',
      secondaryColor: '#FF0000'
    },
    categories: [
      'Antipasti',
      'Pasta',
      'Pizza',
      'Main Courses',
      'Desserts',
      'Beverages'
    ],
    menuItems: [
      // Antipasti
      { name: 'Bruschetta', category: 'Antipasti', price: 22, description: 'Toasted bread with tomatoes, garlic, and basil', isVegetarian: true },
      { name: 'Caprese Salad', category: 'Antipasti', price: 28, description: 'Fresh mozzarella, tomatoes, and basil', isVegetarian: true },
      { name: 'Calamari Fritti', category: 'Antipasti', price: 32, description: 'Crispy fried squid rings', isVegetarian: false },
      { name: 'Antipasto Misto', category: 'Antipasti', price: 38, description: 'Selection of cured meats and cheeses', isVegetarian: false },
      // Pasta
      { name: 'Spaghetti Carbonara', category: 'Pasta', price: 35, description: 'Classic Roman pasta with eggs, cheese, and pancetta', isVegetarian: false },
      { name: 'Penne Arrabbiata', category: 'Pasta', price: 30, description: 'Spicy tomato sauce with garlic and chili', isVegetarian: true, spiceLevel: 2 },
      { name: 'Fettuccine Alfredo', category: 'Pasta', price: 32, description: 'Creamy parmesan sauce', isVegetarian: true },
      { name: 'Linguine Frutti di Mare', category: 'Pasta', price: 45, description: 'Seafood pasta with mixed shellfish', isVegetarian: false },
      // Pizza
      { name: 'Margherita', category: 'Pizza', price: 35, description: 'Tomato, mozzarella, and basil', isVegetarian: true },
      { name: 'Quattro Formaggi', category: 'Pizza', price: 40, description: 'Four cheese pizza', isVegetarian: true },
      { name: 'Prosciutto e Funghi', category: 'Pizza', price: 42, description: 'Ham and mushroom', isVegetarian: false },
      { name: 'Diavola', category: 'Pizza', price: 38, description: 'Spicy salami pizza', isVegetarian: false, spiceLevel: 2 },
      // Main Courses
      { name: 'Osso Buco', category: 'Main Courses', price: 65, description: 'Braised veal shanks in tomato sauce', isVegetarian: false },
      { name: 'Pollo Parmigiana', category: 'Main Courses', price: 48, description: 'Breaded chicken with tomato and mozzarella', isVegetarian: false },
      { name: 'Branzino al Sale', category: 'Main Courses', price: 58, description: 'Sea bass baked in salt crust', isVegetarian: false },
      // Desserts
      { name: 'Tiramisu', category: 'Desserts', price: 22, description: 'Classic coffee-flavored dessert', isVegetarian: true },
      { name: 'Panna Cotta', category: 'Desserts', price: 18, description: 'Vanilla custard with berry sauce', isVegetarian: true },
      { name: 'Gelato', category: 'Desserts', price: 15, description: 'Italian ice cream (various flavors)', isVegetarian: true },
      // Beverages
      { name: 'Espresso', category: 'Beverages', price: 8, description: 'Strong Italian coffee', isVegetarian: true },
      { name: 'Cappuccino', category: 'Beverages', price: 12, description: 'Espresso with steamed milk', isVegetarian: true }
    ],
    tables: 15
  },
  {
    tenantId: 'rest_hardrockcafe_003',
    subdomain: 'hardrockcafe',
    name: 'Hard Rock Cafe',
    cuisine: 'American',
    theme: {
      primaryColor: '#000000',
      secondaryColor: '#FFD700'
    },
    categories: [
      'Starters',
      'Burgers',
      'Steaks & Ribs',
      'Salads',
      'Desserts',
      'Beverages',
      'Cocktails'
    ],
    menuItems: [
      // Starters
      { name: 'Nachos Supreme', category: 'Starters', price: 35, description: 'Loaded nachos with cheese, jalapeños, and sour cream', isVegetarian: true, spiceLevel: 1 },
      { name: 'Buffalo Wings', category: 'Starters', price: 38, description: 'Spicy chicken wings with blue cheese dip', isVegetarian: false, spiceLevel: 3 },
      { name: 'Onion Rings', category: 'Starters', price: 28, description: 'Crispy battered onion rings', isVegetarian: true },
      { name: 'Loaded Potato Skins', category: 'Starters', price: 32, description: 'Crispy potato skins with bacon and cheese', isVegetarian: false },
      // Burgers
      { name: 'Classic Burger', category: 'Burgers', price: 45, description: '8oz beef patty with lettuce, tomato, onion', isVegetarian: false },
      { name: 'Bacon Cheeseburger', category: 'Burgers', price: 52, description: 'Classic burger with crispy bacon and cheddar', isVegetarian: false },
      { name: 'BBQ Bacon Burger', category: 'Burgers', price: 55, description: 'BBQ sauce, bacon, and onion rings', isVegetarian: false },
      { name: 'Veggie Burger', category: 'Burgers', price: 42, description: 'House-made vegetable patty', isVegetarian: true },
      { name: 'Double Trouble', category: 'Burgers', price: 65, description: 'Two 8oz patties with all the fixings', isVegetarian: false },
      // Steaks & Ribs
      { name: 'Ribeye Steak', category: 'Steaks & Ribs', price: 95, description: '12oz USDA choice ribeye', isVegetarian: false },
      { name: 'New York Strip', category: 'Steaks & Ribs', price: 85, description: '10oz strip steak', isVegetarian: false },
      { name: 'Baby Back Ribs', category: 'Steaks & Ribs', price: 75, description: 'Full rack with BBQ sauce', isVegetarian: false },
      { name: 'Surf & Turf', category: 'Steaks & Ribs', price: 120, description: 'Steak and lobster tail combo', isVegetarian: false },
      // Salads
      { name: 'Caesar Salad', category: 'Salads', price: 32, description: 'Classic caesar with parmesan and croutons', isVegetarian: true },
      { name: 'Cobb Salad', category: 'Salads', price: 38, description: 'Mixed greens with bacon, egg, and blue cheese', isVegetarian: false },
      { name: 'Grilled Chicken Salad', category: 'Salads', price: 42, description: 'Mixed greens topped with grilled chicken', isVegetarian: false },
      // Desserts
      { name: 'Hot Fudge Brownie', category: 'Desserts', price: 28, description: 'Warm brownie with ice cream and fudge', isVegetarian: true },
      { name: 'New York Cheesecake', category: 'Desserts', price: 25, description: 'Classic cheesecake with berry sauce', isVegetarian: true },
      { name: 'Apple Pie', category: 'Desserts', price: 22, description: 'Warm apple pie with vanilla ice cream', isVegetarian: true },
      // Beverages
      { name: 'Coke', category: 'Beverages', price: 12, description: 'Coca-Cola', isVegetarian: true },
      { name: 'Fresh Lemonade', category: 'Beverages', price: 15, description: 'House-made lemonade', isVegetarian: true },
      { name: 'Iced Tea', category: 'Beverages', price: 12, description: 'Freshly brewed iced tea', isVegetarian: true },
      // Cocktails
      { name: 'Margarita', category: 'Cocktails', price: 35, description: 'Classic tequila cocktail', isVegetarian: true },
      { name: 'Long Island Iced Tea', category: 'Cocktails', price: 40, description: 'Five spirit cocktail', isVegetarian: true },
      { name: 'Mojito', category: 'Cocktails', price: 32, description: 'Rum with mint and lime', isVegetarian: true }
    ],
    tables: 50
  }
];

// Generate sample orders
function generateSampleOrders(tenantId, tableCount, menuItemIds, startDate = new Date('2024-01-01')) {
  const orders = [];
  const statuses = ['paid', 'paid', 'paid', 'cancelled']; // 75% paid
  
  // Generate 30-50 orders per restaurant over the past month
  const orderCount = Math.floor(Math.random() * 20) + 30;
  
  for (let i = 0; i < orderCount; i++) {
    const orderDate = new Date(startDate);
    orderDate.setDate(orderDate.getDate() + Math.floor(Math.random() * 30));
    
    const tableNumber = `T${Math.floor(Math.random() * tableCount) + 1}`;
    const itemCount = Math.floor(Math.random() * 4) + 1;
    const items = [];
    let totalAmount = 0;
    
    // Add random items from actual menu
    for (let j = 0; j < itemCount; j++) {
      const menuItem = menuItemIds[Math.floor(Math.random() * menuItemIds.length)];
      const quantity = Math.floor(Math.random() * 3) + 1;
      const itemTotal = menuItem.price * quantity;
      totalAmount += itemTotal;
      
      items.push({
        menuItem: menuItem._id,
        name: menuItem.name,
        price: menuItem.price,
        quantity,
        specialRequests: Math.random() > 0.7 ? 'No spice' : ''
      });
    }
    
    orders.push({
      tenantId,
      orderNumber: `ORD-${Date.now()}-${i}`,
      tableNumber,
      customerName: `Customer ${i + 1}`,
      customerPhone: `+971-50-${Math.floor(Math.random() * 9000000) + 1000000}`,
      items,
      subtotal: totalAmount,
      tax: totalAmount * 0.05,
      total: totalAmount * 1.05,
      status: statuses[Math.floor(Math.random() * statuses.length)],
      paymentMethod: Math.random() > 0.5 ? 'cash' : 'card',
      paymentStatus: 'paid',
      createdAt: orderDate,
      updatedAt: orderDate
    });
  }
  
  return orders;
}

async function populateRestaurantData() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Clear existing data for these restaurants
    console.log('Clearing existing data...');
    const tenantIds = restaurantsData.map(r => r.tenantId);
    
    await Promise.all([
      Category.deleteMany({ tenantId: { $in: tenantIds } }),
      MenuItem.deleteMany({ tenantId: { $in: tenantIds } }),
      Table.deleteMany({ tenantId: { $in: tenantIds } }),
      Order.deleteMany({ tenantId: { $in: tenantIds } }),
      RestaurantConfig.deleteMany({ tenantId: { $in: tenantIds } }),
      User.deleteMany({ tenantId: { $in: tenantIds } })
    ]);

    // Process each restaurant
    for (const restaurant of restaurantsData) {
      console.log(`\nProcessing ${restaurant.name}...`);
      
      // Create restaurant configuration
      await RestaurantConfig.create({
        tenantId: restaurant.tenantId,
        name: restaurant.name,
        isOrderingEnabled: true,
        orderPrefix: 'ORD',
        taxRate: 5,
        currency: 'AED',
        timezone: 'Asia/Dubai',
        themes: restaurant.theme
      });
      console.log('✓ Restaurant config created');
      
      // Create categories
      const categoryMap = {};
      for (let i = 0; i < restaurant.categories.length; i++) {
        const categoryName = restaurant.categories[i];
        const slug = categoryName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
        const category = await Category.create({
          tenantId: restaurant.tenantId,
          name: categoryName,
          slug: slug,
          displayOrder: i + 1,
          isActive: true
        });
        categoryMap[categoryName] = category._id;
      }
      console.log(`✓ ${restaurant.categories.length} categories created`);
      
      // Create menu items
      const menuItemIds = [];
      let itemId = restaurant.tenantId === 'rest_mughlaimagic_001' ? 100 : 
                   restaurant.tenantId === 'rest_bellavista_002' ? 200 : 300;
      
      for (const item of restaurant.menuItems) {
        const menuItem = await MenuItem.create({
          tenantId: restaurant.tenantId,
          id: itemId++,
          name: item.name,
          description: item.description,
          price: item.price,
          category: item.category,
          available: true,
          dietary: item.isVegetarian ? ['vegetarian'] : [],
          prepTime: Math.floor(Math.random() * 20) + 10,
          image: `/images/${item.name.toLowerCase().replace(/ /g, '-')}.jpg`,
          rating: Math.random() * 2 + 3, // 3-5 rating
          reviews: Math.floor(Math.random() * 50)
        });
        menuItemIds.push({ _id: menuItem._id, name: menuItem.name, price: menuItem.price });
      }
      console.log(`✓ ${restaurant.menuItems.length} menu items created`);
      
      // Create tables
      for (let i = 1; i <= restaurant.tables; i++) {
        await Table.create({
          tenantId: restaurant.tenantId,
          number: `T${i}`,
          capacity: i <= 10 ? 2 : i <= 20 ? 4 : 6,
          status: 'available',
          isActive: true
        });
      }
      console.log(`✓ ${restaurant.tables} tables created`);
      
      // Create sample orders
      const orders = generateSampleOrders(restaurant.tenantId, restaurant.tables, menuItemIds);
      await Order.insertMany(orders);
      console.log(`✓ ${orders.length} sample orders created`);
      
      // Update tenant with additional users
      const users = [
        { 
          name: 'Manager', 
          email: `manager@${restaurant.subdomain}.ae`,
          role: 'manager',
          password: 'manager123'
        },
        { 
          name: 'Waiter 1', 
          email: `waiter1@${restaurant.subdomain}.ae`,
          role: 'waiter',
          password: 'waiter123'
        },
        { 
          name: 'Waiter 2', 
          email: `waiter2@${restaurant.subdomain}.ae`,
          role: 'waiter',
          password: 'waiter123'
        },
        { 
          name: 'Chef', 
          email: `chef@${restaurant.subdomain}.ae`,
          role: 'chef',
          password: 'chef123'
        }
      ];
      
      for (const userData of users) {
        const hashedPassword = await bcrypt.hash(userData.password, 10);
        await User.create({
          tenantId: restaurant.tenantId,
          name: userData.name,
          email: userData.email,
          password: hashedPassword,
          role: userData.role,
          isActive: true
        });
      }
      console.log(`✓ ${users.length} additional users created`);
    }
    
    // Summary
    console.log('\n=================================');
    console.log('✅ All restaurants populated successfully!');
    console.log('\nSummary:');
    
    for (const restaurant of restaurantsData) {
      const orderCount = await Order.countDocuments({ tenantId: restaurant.tenantId });
      const revenue = await Order.aggregate([
        { $match: { tenantId: restaurant.tenantId, status: 'paid' } },
        { $group: { _id: null, total: { $sum: '$total' } } }
      ]);
      
      console.log(`\n${restaurant.name}:`);
      console.log(`  - Categories: ${restaurant.categories.length}`);
      console.log(`  - Menu Items: ${restaurant.menuItems.length}`);
      console.log(`  - Tables: ${restaurant.tables}`);
      console.log(`  - Orders: ${orderCount}`);
      console.log(`  - Revenue: AED ${revenue[0]?.total?.toFixed(2) || 0}`);
    }
    
    console.log('\n=================================');
    
  } catch (error) {
    console.error('Error populating data:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  }
}

// Run the script
if (require.main === module) {
  populateRestaurantData();
}

module.exports = populateRestaurantData;