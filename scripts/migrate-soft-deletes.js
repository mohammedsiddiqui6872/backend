require('dotenv').config();
const mongoose = require('mongoose');

async function migrateSoftDeletes() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/restaurant');
    console.log('Connected to MongoDB\n');
    
    const MenuItem = require('../src/models/MenuItem');
    
    console.log('=== MIGRATING EXISTING MENU ITEMS ===');
    
    // Update all existing items to have isDeleted=false
    const result = await MenuItem.updateMany(
      { isDeleted: { $exists: false } },
      { 
        $set: { 
          isDeleted: false,
          deletedAt: null,
          deletedBy: null
        } 
      }
    );
    
    console.log(`Updated ${result.modifiedCount} menu items with soft delete fields`);
    
    // Check if any items need to be recovered
    const deletedCategories = ['Hummus', 'Caesar Salad', 'Baba Ganoush', 'Pomegranate Juice', 
                              'Mint Lemonade', 'Moroccan Tea', 'Fresh Orange Juice', 
                              'Fattoush Salad', 'Arabic Coffee'];
    
    console.log('\n=== CHECKING FOR DELETED ITEMS TO RECOVER ===');
    
    // Since we found these items in orders but not in menu, let's recreate them
    const itemsToRecover = [
      { name: 'Hummus', price: 8.99, category: 'Appetizers', description: 'Traditional Middle Eastern chickpea dip' },
      { name: 'Caesar Salad', price: 12.99, category: 'Salads', description: 'Classic Caesar salad with romaine lettuce' },
      { name: 'Baba Ganoush', price: 9.99, category: 'Appetizers', description: 'Roasted eggplant dip' },
      { name: 'Pomegranate Juice', price: 7.99, category: 'Beverages', description: 'Fresh pomegranate juice' },
      { name: 'Mint Lemonade', price: 5.99, category: 'Beverages', description: 'Refreshing mint lemonade' },
      { name: 'Moroccan Tea', price: 4.99, category: 'Beverages', description: 'Traditional Moroccan mint tea' },
      { name: 'Fresh Orange Juice', price: 6.99, category: 'Beverages', description: 'Freshly squeezed orange juice' },
      { name: 'Fattoush Salad', price: 11.99, category: 'Salads', description: 'Lebanese salad with toasted pita' },
      { name: 'Arabic Coffee', price: 4.99, category: 'Beverages', description: 'Traditional Arabic coffee' }
    ];
    
    // Get the highest ID
    const highestItem = await MenuItem.findOne().sort('-id');
    let nextId = (highestItem?.id || 0) + 1;
    
    for (const itemData of itemsToRecover) {
      const existing = await MenuItem.findOne({ name: itemData.name });
      if (!existing) {
        const newItem = new MenuItem({
          ...itemData,
          id: nextId++,
          available: true,
          isDeleted: false
        });
        await newItem.save();
        console.log(`Recovered menu item: ${itemData.name}`);
      }
    }
    
    console.log('\n✅ Migration completed successfully!');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
  }
}

migrateSoftDeletes();