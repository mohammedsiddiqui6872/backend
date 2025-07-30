// Script to check and restore categories
const mongoose = require('mongoose');
const Category = require('../src/models/Category');
require('dotenv').config();

async function checkCategories() {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI || 'mongodb+srv://admin:%21Jafar18022017@cluster0.mzlqfml.mongodb.net/restaurant?retryWrites=true&w=majority&appName=Cluster0';
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');

    // First, check ALL categories bypassing soft delete filter
    const allCategories = await Category.find({}).where('isDeleted').exists();
    console.log(`\nTotal categories in database: ${allCategories.length}`);
    
    // Also check without any filters at all
    const rawCategories = await mongoose.connection.db.collection('categories').find({}).toArray();
    console.log(`Raw categories count: ${rawCategories.length}`);
    
    // Check how many are deleted
    const deletedCategories = rawCategories.filter(cat => cat.isDeleted === true);
    console.log(`Deleted categories: ${deletedCategories.length}`);
    
    // Check active categories
    const activeCategories = rawCategories.filter(cat => cat.isDeleted !== true);
    console.log(`Active categories: ${activeCategories.length}`);
    
    if (deletedCategories.length > 0) {
      console.log('\nDeleted categories:');
      deletedCategories.forEach(cat => {
        console.log(`- ${cat.name} (deleted at: ${cat.deletedAt})`);
      });
    }
    
    if (activeCategories.length === 0 && rawCategories.length > 0) {
      console.log('\nNo active categories found! Restoring all categories...');
      
      // Restore all categories using direct update
      const result = await mongoose.connection.db.collection('categories').updateMany(
        {},
        { 
          $set: { 
            isDeleted: false, 
            deletedAt: null, 
            deletedBy: null,
            isActive: true 
          } 
        }
      );
      
      console.log(`\n✓ Restored ${result.modifiedCount} categories!`);
    } else if (rawCategories.length === 0) {
      console.log('\nNo categories found in database! Creating default categories...');
      
      const defaultCategories = [
        { name: 'Appetizers', nameAr: 'المقبلات', slug: 'appetizers', icon: 'utensils', displayOrder: 1 },
        { name: 'Main Courses', nameAr: 'الأطباق الرئيسية', slug: 'main-courses', icon: 'concierge-bell', displayOrder: 2 },
        { name: 'Desserts', nameAr: 'الحلويات', slug: 'desserts', icon: 'ice-cream', displayOrder: 3 },
        { name: 'Beverages', nameAr: 'المشروبات', slug: 'beverages', icon: 'coffee', displayOrder: 4 },
        { name: 'Salads', nameAr: 'السلطات', slug: 'salads', icon: 'leaf', displayOrder: 5 },
        { name: 'Soups', nameAr: 'الحساء', slug: 'soups', icon: 'bowl-hot', displayOrder: 6 }
      ];
      
      for (const catData of defaultCategories) {
        const category = new Category(catData);
        await category.save();
        console.log(`✓ Created: ${category.name}`);
      }
      
      console.log('\nDefault categories created!');
    } else {
      console.log('\nCategories are working correctly!');
      console.log('\nActive categories:');
      activeCategories.forEach(cat => {
        console.log(`- ${cat.name} (order: ${cat.displayOrder})`);
      });
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.connection.close();
  }
}

checkCategories();