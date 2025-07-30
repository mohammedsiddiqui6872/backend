// Script to fix categories soft delete fields
const mongoose = require('mongoose');
require('dotenv').config();

async function fixCategories() {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI || 'mongodb+srv://admin:%21Jafar18022017@cluster0.mzlqfml.mongodb.net/restaurant?retryWrites=true&w=majority&appName=Cluster0';
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');

    // Get all categories directly from DB
    const categories = await mongoose.connection.db.collection('categories').find({}).toArray();
    console.log(`\nFound ${categories.length} categories`);
    
    // Check which ones don't have isDeleted field
    const needsUpdate = categories.filter(cat => !cat.hasOwnProperty('isDeleted'));
    console.log(`Categories missing isDeleted field: ${needsUpdate.length}`);
    
    if (needsUpdate.length > 0) {
      console.log('\nUpdating categories to add soft delete fields...');
      
      // Update all categories to ensure they have soft delete fields
      const result = await mongoose.connection.db.collection('categories').updateMany(
        { isDeleted: { $exists: false } },
        { 
          $set: { 
            isDeleted: false,
            deletedAt: null,
            deletedBy: null
          } 
        }
      );
      
      console.log(`✓ Updated ${result.modifiedCount} categories`);
    }
    
    // Also ensure all have isActive field
    const missingActive = categories.filter(cat => !cat.hasOwnProperty('isActive'));
    if (missingActive.length > 0) {
      console.log(`\nCategories missing isActive field: ${missingActive.length}`);
      
      const result = await mongoose.connection.db.collection('categories').updateMany(
        { isActive: { $exists: false } },
        { $set: { isActive: true } }
      );
      
      console.log(`✓ Updated ${result.modifiedCount} categories with isActive field`);
    }
    
    // Now test the query through Mongoose
    console.log('\nTesting Mongoose queries:');
    const Category = require('../src/models/Category');
    
    const mongooseCategories = await Category.find({});
    console.log(`Categories found through Mongoose: ${mongooseCategories.length}`);
    
    if (mongooseCategories.length > 0) {
      console.log('\nCategories are now accessible:');
      mongooseCategories.forEach(cat => {
        console.log(`- ${cat.name} (active: ${cat.isActive}, deleted: ${cat.isDeleted})`);
      });
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.connection.close();
  }
}

fixCategories();