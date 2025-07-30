// Script to permanently delete the 9 recovered menu items
const mongoose = require('mongoose');
const MenuItem = require('../src/models/MenuItem');
require('dotenv').config();

const menuItemsToDelete = [
  'Hummus',
  'Caesar Salad',
  'Baba Ganoush',
  'Pomegranate Juice',
  'Mint Lemonade',
  'Moroccan Tea',
  'Fresh Orange Juice',
  'Fattoush Salad',
  'Arabic Coffee'
];

async function deleteRecoveredItems() {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI || 'mongodb+srv://admin:%21Jafar18022017@cluster0.mzlqfml.mongodb.net/restaurant?retryWrites=true&w=majority&appName=Cluster0';
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');

    console.log('\nDeleting recovered menu items permanently...');
    
    for (const itemName of menuItemsToDelete) {
      // Find and permanently delete the item
      const result = await MenuItem.findOneAndDelete({ 
        name: itemName,
        description: /recovered item from null references/ 
      });
      
      if (result) {
        console.log(`✓ Permanently deleted: ${itemName}`);
      } else {
        console.log(`✗ Not found: ${itemName} (may have been already deleted)`);
      }
    }
    
    // Also check for any other recovered items we might have missed
    const otherRecovered = await MenuItem.find({
      description: /recovered item from null references/
    });
    
    if (otherRecovered.length > 0) {
      console.log(`\nFound ${otherRecovered.length} additional recovered items:`);
      for (const item of otherRecovered) {
        await MenuItem.findByIdAndDelete(item._id);
        console.log(`✓ Deleted: ${item.name}`);
      }
    }
    
    console.log('\nDeletion complete!');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.connection.close();
  }
}

deleteRecoveredItems();