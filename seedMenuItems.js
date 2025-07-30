const mongoose = require('mongoose');

// Define the same schema as in server.js
// WARNING: This file contains mock/demo data. Do not use in production.
// To populate real menu items, use the admin panel.

const menuItemSchema = new mongoose.Schema({
  id: Number,
  name: String,
  category: String,
  price: Number,
  description: String,
  image: String,
  available: { type: Boolean, default: true },
  allergens: [String],
  dietary: [String],
  prepTime: Number,
  rating: { type: Number, default: 0 },
  reviews: { type: Number, default: 0 },
  calories: Number,
  protein: Number,
  carbs: Number,
  fat: Number,
  isSpecial: { type: Boolean, default: false },
  discount: { type: Number, default: 0 },
  recommended: { type: Boolean, default: false },
  customizations: {
    type: Map,
    of: [String]
  }
});

const MenuItem = mongoose.model('MenuItem', menuItemSchema);

// MongoDB connection - Update with your actual password
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://admin:%21Jafar18022017@cluster0.mzlqfml.mongodb.net/restaurant?retryWrites=true&w=majority&appName=Cluster0';

// Menu data
const menuData = [
  // APPETIZERS
  {
    id: 1,
    name: "Hummus",
    category: "appetizers",
    price: 8.99,
    description: "Traditional chickpea dip with tahini, olive oil, and warm pita",
    image: "https://images.unsplash.com/photo-1555126634-323283e090fa?w=400",
    available: true,  // Add this to every item
    allergens: ["sesame"],
    dietary: ["vegan", "gluten-free"],
    rating: 4.8,
    reviews: 234,
    prepTime: 5,
    calories: 280,
    protein: 8,
    carbs: 24,
    fat: 18,
    customizations: {
      "Toppings": ["Plain", "With Pine Nuts +AED 2", "With Meat +AED 4"],
      "Spice Level": ["Mild", "Medium", "Spicy"],
      "Bread": ["Regular Pita", "Whole Wheat", "Gluten-Free +AED 1"]
    }
  },
  {
    id: 41,
    name: "Pomegranate Juice",
    category: "appetizers",
    price: 7.99,
    description: "Fresh pomegranate juice with a hint of lemon",
    image: "https://images.unsplash.com/photo-1613581831408-c87e16c7c01e?w=400",
    allergens: [],
    dietary: ["vegan", "gluten-free"],
    rating: 4.8,
    reviews: 456,
    prepTime: 5,
    calories: 180,
    protein: 1,
    carbs: 42,
    fat: 0,
    customizations: {
      "Sweetness": ["Natural", "Extra Sweet +AED 0.5", "With Honey +AED 1"],
      "Mix": ["Pure", "With Apple", "With Orange"],
      "Size": ["Regular", "Large +AED 2"]
    }
  },
  {
    id: 42,
    name: "Moroccan Tea",
    category: "appetizers",
    price: 4.99,
    description: "Green tea with fresh mint and sugar",
    image: "https://images.unsplash.com/photo-1564890369478-c89ca6d9cde9?w=400",
    allergens: [],
    dietary: ["vegan", "gluten-free"],
    rating: 4.7,
    reviews: 389,
    prepTime: 5,
    calories: 40,
    protein: 0,
    carbs: 10,
    fat: 0,
    customizations: {
      "Mint": ["Regular", "Extra Mint", "Light Mint"],
      "Sugar": ["Regular", "Less Sugar", "No Sugar"],
      "Temperature": ["Hot", "Warm", "Iced +AED 1"]
    }
  },
  {
    id: 2,
    name: "Baba Ganoush",
    category: "appetizers",
    price: 9.99,
    description: "Smoky roasted eggplant dip with tahini and pomegranate",
    image: "https://images.unsplash.com/photo-1606817861084-0d9ca92c3c45?w=400",
    allergens: ["sesame"],
    dietary: ["vegan"],
    rating: 4.7,
    reviews: 189,
    prepTime: 5,
    calories: 250,
    protein: 6,
    carbs: 20,
    fat: 16,
    customizations: {
      "Garnish": ["Traditional", "Extra Pomegranate +AED 1", "With Walnuts +AED 2"],
      "Bread": ["Regular Pita", "Whole Wheat", "Gluten-Free +AED 1"]
    }
  },
  {
    id: 3,
    name: "Falafel Plate",
    category: "appetizers",
    price: 10.99,
    description: "Six crispy chickpea fritters with tahini sauce",
    image: "https://images.unsplash.com/photo-1593001874117-c5b3b8f803e1?w=400",
    allergens: [],
    dietary: ["vegan", "gluten-free"],
    rating: 4.6,
    reviews: 312,
    prepTime: 10,
    calories: 340,
    protein: 12,
    carbs: 36,
    fat: 18,
    customizations: {
      "Quantity": ["6 pieces", "8 pieces +AED 2", "12 pieces +AED 4"],
      "Sauce": ["Tahini", "Garlic Sauce", "Both +AED 1"]
    }
  },
  {
    id: 4,
    name: "Fattoush Salad",
    category: "appetizers",
    price: 11.99,
    description: "Fresh vegetables with crispy pita chips and pomegranate dressing",
    image: "https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=400",
    allergens: ["gluten"],
    dietary: ["vegan"],
    rating: 4.7,
    reviews: 267,
    prepTime: 8,
    calories: 290,
    protein: 8,
    carbs: 32,
    fat: 14,
    customizations: {
      "Size": ["Regular", "Large +AED 3"],
      "Add Protein": ["None", "Grilled Chicken +AED 4", "Falafel +AED 3"],
      "Dressing": ["On the side", "Mixed in"]
    }
  },
  {
    id: 5,
    name: "Kibbeh",
    category: "appetizers",
    price: 13.99,
    description: "Fried bulgur shells stuffed with spiced meat and pine nuts",
    image: "https://images.unsplash.com/photo-1529006557810-38f4a42e6e3d?w=400",
    allergens: ["gluten", "nuts"],
    dietary: [],
    rating: 4.8,
    reviews: 198,
    prepTime: 12,
    calories: 380,
    protein: 22,
    carbs: 28,
    fat: 20,
    customizations: {
      "Quantity": ["4 pieces", "6 pieces +AED 3", "8 pieces +AED 5"],
      "Spice Level": ["Mild", "Medium", "Spicy"]
    }
  },
  {
    id: 10,
    name: "Caesar Salad",
    category: "appetizers",
    price: 12.99,
    description: "Fresh romaine lettuce with parmesan and croutons",
    image: "https://images.unsplash.com/photo-1546793665-c74683f339c1?w=400",
    allergens: ["gluten", "dairy"],
    dietary: ["vegetarian"],
    rating: 4.5,
    reviews: 124,
    prepTime: 10,
    calories: 380,
    protein: 12,
    carbs: 28,
    fat: 26,
    isSpecial: true,
    discount: 15,
    customizations: {
      "Protein": ["None", "Grilled Chicken +AED 4", "Salmon +AED 6", "Shrimp +AED 5"],
      "Dressing": ["Caesar", "Light Caesar", "No Dressing"],
      "Extras": ["Extra Parmesan", "Extra Croutons", "No Croutons"]
    }
  },
  {
    id: 11,
    name: "Bruschetta",
    category: "appetizers",
    price: 9.99,
    description: "Grilled bread with tomatoes, basil, and garlic",
    image: "https://images.unsplash.com/photo-1572695157366-5e585ab2b69f?w=400",
    allergens: ["gluten"],
    dietary: ["vegan"],
    rating: 4.8,
    reviews: 89,
    prepTime: 12,
    calories: 220,
    protein: 8,
    carbs: 32,
    fat: 8,
    recommended: true,
    customizations: {
      "Bread": ["Regular", "Gluten-Free +AED 2"],
      "Toppings": ["Traditional", "Add Mozzarella +AED 2", "Extra Basil"]
    }
  },

  // MAIN COURSES
  {
    id: 12,
    name: "Mansaf",
    category: "mains",
    price: 32.99,
    description: "Jordan's national dish - lamb cooked in fermented yogurt sauce with rice",
    image: "https://images.unsplash.com/photo-1547592180-4ba0ac7f0903?w=400",
    allergens: ["dairy"],
    dietary: ["gluten-free"],
    rating: 4.9,
    reviews: 412,
    prepTime: 35,
    calories: 680,
    protein: 48,
    carbs: 56,
    fat: 28,
    customizations: {
      "Meat": ["Lamb", "Chicken", "Mixed +AED 5"],
      "Rice": ["Regular", "Extra Rice +AED 3"],
      "Sauce": ["Traditional", "Light", "Extra +AED 2"]
    }
  },
  {
    id: 13,
    name: "Mixed Grill Platter",
    category: "mains",
    price: 35.99,
    description: "Lamb kofta, chicken shish, beef kebab with rice and vegetables",
    image: "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=400",
    allergens: [],
    dietary: ["gluten-free"],
    rating: 4.8,
    reviews: 567,
    prepTime: 25,
    calories: 780,
    protein: 56,
    carbs: 48,
    fat: 36,
    recommended: true,
    customizations: {
      "Portion": ["Regular", "Large +AED 8"],
      "Side": ["Rice", "Bulgur", "French Fries"],
      "Sauce": ["Garlic", "Tahini", "Mixed"]
    }
  },
  {
    id: 14,
    name: "Shawarma Plate",
    category: "mains",
    price: 18.99,
    description: "Marinated meat with garlic sauce, pickles, and pita",
    image: "https://images.unsplash.com/photo-1530469912745-a215c6b256ea?w=400",
    allergens: ["gluten"],
    dietary: [],
    rating: 4.7,
    reviews: 892,
    prepTime: 15,
    calories: 620,
    protein: 42,
    carbs: 44,
    fat: 28,
    customizations: {
      "Meat": ["Chicken", "Beef +AED 2", "Mixed +AED 3"],
      "Sides": ["Rice", "Fries", "Salad"],
      "Extras": ["Extra Meat +AED 5", "Extra Sauce", "No Pickles"]
    }
  },
  {
    id: 15,
    name: "Maqluba",
    category: "mains",
    price: 26.99,
    description: "Upside-down rice with eggplant, cauliflower, and meat",
    image: "https://images.unsplash.com/photo-1567337710282-00832b415979?w=400",
    allergens: [],
    dietary: ["gluten-free"],
    rating: 4.8,
    reviews: 334,
    prepTime: 30,
    calories: 580,
    protein: 36,
    carbs: 62,
    fat: 22,
    customizations: {
      "Protein": ["Chicken", "Lamb +AED 4", "Vegetarian"],
      "Vegetables": ["Traditional", "Extra Eggplant", "No Cauliflower"],
      "Portion": ["Regular", "Large +AED 6"]
    }
  },
  {
    id: 18,
    name: "Grilled Salmon",
    category: "mains",
    price: 24.99,
    description: "Atlantic salmon with lemon butter sauce",
    image: "https://images.unsplash.com/photo-1485921325833-c519f76c4927?w=400",
    allergens: ["fish"],
    dietary: ["gluten-free"],
    rating: 4.9,
    reviews: 156,
    prepTime: 20,
    calories: 420,
    protein: 38,
    carbs: 12,
    fat: 24,
    customizations: {
      "Cooking Style": ["Grilled", "Pan-Seared", "Blackened"],
      "Side": ["Rice", "Vegetables", "Mashed Potatoes"],
      "Sauce": ["Lemon Butter", "Teriyaki", "No Sauce"]
    }
  },

  // DESSERTS
  {
    id: 24,
    name: "Kunafa",
    category: "desserts",
    price: 12.99,
    description: "Crispy shredded pastry with sweet cheese and syrup",
    image: "https://images.unsplash.com/photo-1581939393073-1b88060fe054?w=400",
    allergens: ["dairy", "gluten", "nuts"],
    dietary: ["vegetarian"],
    rating: 4.9,
    reviews: 456,
    prepTime: 8,
    calories: 520,
    protein: 12,
    carbs: 68,
    fat: 24,
    recommended: true,
    customizations: {
      "Size": ["Regular", "Large +AED 4"],
      "Cheese": ["Traditional", "Extra Cheese +AED 2"],
      "Syrup": ["Regular", "Light", "Extra +AED 1"]
    }
  },
  {
    id: 25,
    name: "Baklava",
    category: "desserts",
    price: 9.99,
    description: "Layers of filo pastry with nuts and honey syrup",
    image: "https://images.unsplash.com/photo-1598110750624-207050c4f28c?w=400",
    allergens: ["nuts", "gluten"],
    dietary: ["vegetarian"],
    rating: 4.8,
    reviews: 678,
    prepTime: 5,
    calories: 480,
    protein: 8,
    carbs: 56,
    fat: 26,
    customizations: {
      "Nuts": ["Mixed", "Pistachio Only +AED 2", "Walnut Only"],
      "Quantity": ["4 pieces", "6 pieces +AED 3", "8 pieces +AED 5"],
      "Syrup": ["Regular", "Extra Syrup", "Light"]
    }
  },
  {
    id: 26,
    name: "Um Ali",
    category: "desserts",
    price: 10.99,
    description: "Egyptian bread pudding with milk, nuts, and raisins",
    image: "https://images.unsplash.com/photo-1488477181946-6428a0291777?w=400",
    allergens: ["dairy", "nuts", "gluten"],
    dietary: ["vegetarian"],
    rating: 4.7,
    reviews: 334,
    prepTime: 10,
    calories: 440,
    protein: 14,
    carbs: 52,
    fat: 20,
    customizations: {
      "Temperature": ["Hot", "Warm", "Cold"],
      "Nuts": ["With Nuts", "Extra Nuts +AED 2", "No Nuts"],
      "Raisins": ["With Raisins", "No Raisins"]
    }
  },
  {
    id: 29,
    name: "Tiramisu",
    category: "desserts",
    price: 8.99,
    description: "Classic Italian dessert with coffee and mascarpone",
    image: "https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?w=400",
    allergens: ["dairy", "eggs", "gluten"],
    dietary: [],
    rating: 4.7,
    reviews: 203,
    prepTime: 5,
    calories: 450,
    protein: 8,
    carbs: 48,
    fat: 28,
    customizations: {
      "Portion": ["Regular", "Large +AED 3"],
      "Coffee": ["Regular", "Decaf", "Extra Strong"]
    }
  },

  // BEVERAGES
  {
    id: 31,
    name: "Arabic Coffee",
    category: "beverages",
    price: 4.99,
    description: "Traditional cardamom-spiced coffee served with dates",
    image: "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=400",
    allergens: [],
    dietary: ["vegan", "gluten-free"],
    rating: 4.8,
    reviews: 445,
    prepTime: 5,
    calories: 20,
    protein: 0,
    carbs: 4,
    fat: 0,
    customizations: {
      "Strength": ["Regular", "Strong", "Light"],
      "Cardamom": ["Regular", "Extra", "No Cardamom"],
      "Size": ["Small", "Medium +AED 1", "Large +AED 2"]
    }
  },
  {
    id: 32,
    name: "Mint Lemonade",
    category: "beverages",
    price: 5.99,
    description: "Fresh lemon juice with mint leaves and a touch of sweetness",
    image: "https://images.unsplash.com/photo-1556881238-24e22c7d9e8a?w=400",
    allergens: [],
    dietary: ["vegan", "gluten-free"],
    rating: 4.7,
    reviews: 678,
    prepTime: 3,
    calories: 120,
    protein: 0,
    carbs: 28,
    fat: 0,
    customizations: {
      "Sweetness": ["Regular", "Less Sweet", "Extra Sweet"],
      "Ice": ["Regular Ice", "Light Ice", "No Ice"],
      "Size": ["Regular", "Large +AED 2"]
    }
  },
  {
    id: 38,
    name: "Cappuccino",
    category: "beverages",
    price: 4.99,
    description: "Espresso with steamed milk foam",
    image: "https://images.unsplash.com/photo-1572442388796-11668a67e53d?w=400",
    allergens: ["dairy"],
    dietary: [],
    rating: 4.6,
    reviews: 178,
    prepTime: 5,
    calories: 120,
    protein: 6,
    carbs: 12,
    fat: 4,
    customizations: {
      "Size": ["Small", "Medium", "Large +AED 1"],
      "Milk": ["Whole", "Skim", "Almond +AED 0.5", "Oat +AED 0.5"],
      "Extras": ["Extra Shot +AED 1", "Decaf", "Sugar-Free Syrup"]
    }
  },
  {
    id: 39,
    name: "Fresh Orange Juice",
    category: "beverages",
    price: 6.99,
    description: "Freshly squeezed orange juice",
    image: "https://images.unsplash.com/photo-1621506289937-a8e4df240d0b?w=400",
    allergens: [],
    dietary: ["vegan", "gluten-free"],
    rating: 4.8,
    reviews: 892,
    prepTime: 3,
    calories: 160,
    protein: 2,
    carbs: 36,
    fat: 0,
    customizations: {
      "Pulp": ["With Pulp", "No Pulp", "Extra Pulp"],
      "Ice": ["Regular Ice", "No Ice", "Crushed Ice"],
      "Size": ["Regular", "Large +AED 2", "Extra Large +AED 4"]
    }
  }
];

async function seedDatabase() {
  try {
    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    // Clear existing menu items
    await MenuItem.deleteMany({});
    console.log('Cleared existing menu items');

    // Add available: true to all items
    const menuDataWithAvailable = menuData.map(item => ({
      ...item,
      available: true
    }));

    // Insert new menu items
    const result = await MenuItem.insertMany(menuDataWithAvailable);
    console.log(`Successfully seeded ${result.length} menu items`);

    // Close connection
    await mongoose.connection.close();
    console.log('Database connection closed');
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
}

// Run the seed function
// COMMENTED OUT: This file contains mock data and should not be run in production
// seedDatabase();