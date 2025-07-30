// scripts/migrateCategories.js
const mongoose = require('mongoose');
const path = require('path');
// Fix the path to point to src/models/Category
const Category = require('../src/models/Category');
require('dotenv').config();

const defaultCategories = [
  { name: 'Appetizers', nameAr: 'المقبلات', slug: 'appetizers', icon: 'utensils', displayOrder: 1, isActive: true },
  { name: 'Main Courses', nameAr: 'الأطباق الرئيسية', slug: 'mains', icon: 'pizza', displayOrder: 2, isActive: true },
  { name: 'Desserts', nameAr: 'الحلويات', slug: 'desserts', icon: 'cake', displayOrder: 3, isActive: true },
  { name: 'Beverages', nameAr: 'المشروبات', slug: 'beverages', icon: 'coffee', displayOrder: 4, isActive: true }
];

async function migrate() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/restaurant');
    console.log('Connected to MongoDB');
    
    for (const cat of defaultCategories) {
      const existing = await Category.findOne({ slug: cat.slug });
      if (!existing) {
        await Category.create(cat);
        console.log(`Created category: ${cat.name}`);
      } else {
        console.log(`Category already exists: ${cat.name}`);
      }
    }
    
    // List all categories
    const allCategories = await Category.find();
    console.log('\nAll categories in database:');
    allCategories.forEach(cat => {
      console.log(`- ${cat.name} (${cat.slug})`);
    });
    
    console.log('\nCategories migration completed');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

migrate();