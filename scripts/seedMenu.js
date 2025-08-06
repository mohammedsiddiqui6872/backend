// scripts/seedMenu.js
// WARNING: This file contains mock/demo data. Do not use in production.
// To populate real menu items, use the admin panel.

const mongoose = require('mongoose');
const MenuItem = require('../src/models/MenuItem');
const Inventory = require('../src/models/Inventory');
require('dotenv').config();

const menuData = [
  {
    id: 1,
    name: "Hummus",
    nameAr: "حمص",
    category: "appetizers",
    price: 8.99,
    cost: 3.50,
    description: "Traditional chickpea dip with tahini, olive oil, and warm pita",
    descriptionAr: "غموس الحمص التقليدي مع الطحينة وزيت الزيتون والخبز العربي الدافئ",
    image: "https://images.unsplash.com/photo-1555126634-323283e090fa?w=400",
    available: true,
    inStock: true,
    stockQuantity: 100,
    allergens: ["sesame"],
    dietary: ["vegan", "gluten-free"],
    rating: 4.8,
    reviews: 234,
    prepTime: 5,
    calories: 280,
    protein: 8,
    carbs: 24,
    fat: 18,
    tags: ["healthy", "vegetarian", "starter"],
    customizations: {
      "Toppings": ["Plain", "With Pine Nuts +AED 2", "With Meat +AED 4"],
      "Spice Level": ["Mild", "Medium", "Spicy"],
      "Bread": ["Regular Pita", "Whole Wheat", "Gluten-Free +AED 1"]
    }
  }
  // Add more items as needed
];

async function seedDatabase() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Clear existing data
    await MenuItem.deleteMany({});
    await Inventory.deleteMany({});
    console.log('Cleared existing data');

    // Insert menu items
    const items = await MenuItem.insertMany(menuData);
    console.log(`Inserted ${items.length} menu items`);

    // Create inventory records
    for (const item of items) {
      await Inventory.create({
        menuItem: item._id,
        currentStock: item.stockQuantity || 100,
        minStock: 10,
        maxStock: 200,
        unit: 'pieces'
      });
    }
    console.log('Created inventory records');

    await mongoose.connection.close();
    console.log('Seeding completed successfully');
  } catch (error) {
    console.error('Seeding error:', error);
    process.exit(1);
  }
}

// COMMENTED OUT: This file contains mock data and should not be run in production
// seedDatabase();