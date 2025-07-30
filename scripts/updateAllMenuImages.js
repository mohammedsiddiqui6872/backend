// scripts/updateAllMenuImages.js
// This script updates all menu items with high-quality professional images

const mongoose = require('mongoose');
const MenuItem = require('../src/models/MenuItem');
require('dotenv').config();

// Professional food images from Unsplash (800x800, optimized)
const menuImages = {
  // Appetizers
  1: "https://images.unsplash.com/photo-1555126634-323283e090fa?w=375&h=375&fit=crop&q=80", // Hummus
  2: "https://images.unsplash.com/photo-1606817861084-0d9ca92c3c45?w=375&h=375&fit=crop&q=80", // Baba Ganoush
  3: "https://images.unsplash.com/photo-1593001874117-c5b3b8f803e1?w=375&h=375&fit=crop&q=80", // Falafel
  4: "https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=375&h=375&fit=crop&q=80", // Fattoush Salad
  5: "https://images.unsplash.com/photo-1529006557810-38f4a42e6e3d?w=375&h=375&fit=crop&q=80", // Kibbeh
  10: "https://images.unsplash.com/photo-1546793665-c74683f339c1?w=375&h=375&fit=crop&q=80", // Caesar Salad
  11: "https://images.unsplash.com/photo-1572695157366-5e585ab2b69f?w=375&h=375&fit=crop&q=80", // Bruschetta
  41: "https://images.unsplash.com/photo-1613581831408-c87e16c7c01e?w=375&h=375&fit=crop&q=80", // Pomegranate Juice
  42: "https://images.unsplash.com/photo-1564890369478-c89ca6d9cde9?w=375&h=375&fit=crop&q=80", // Moroccan Tea

  // Main Courses
  12: "https://images.unsplash.com/photo-1547592180-4ba0ac7f0903?w=375&h=375&fit=crop&q=80", // Mansaf
  13: "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=375&h=375&fit=crop&q=80", // Mixed Grill Platter
  14: "https://images.unsplash.com/photo-1530469912745-a215c6b256ea?w=375&h=375&fit=crop&q=80", // Shawarma Plate
  15: "https://images.unsplash.com/photo-1567337710282-00832b415979?w=375&h=375&fit=crop&q=80", // Maqluba
  18: "https://images.unsplash.com/photo-1485921325833-c519f76c4927?w=375&h=375&fit=crop&q=80", // Grilled Salmon

  // Desserts
  24: "https://images.unsplash.com/photo-1581939393073-1b88060fe054?w=375&h=375&fit=crop&q=80", // Kunafa
  25: "https://images.unsplash.com/photo-1598110750624-207050c4f28c?w=375&h=375&fit=crop&q=80", // Baklava
  26: "https://images.unsplash.com/photo-1488477181946-6428a0291777?w=375&h=375&fit=crop&q=80", // Um Ali
  29: "https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?w=375&h=375&fit=crop&q=80", // Tiramisu

  // Beverages
  31: "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=375&h=375&fit=crop&q=80", // Arabic Coffee
  32: "https://images.unsplash.com/photo-1556881238-24e22c7d9e8a?w=375&h=375&fit=crop&q=80", // Mint Lemonade
  38: "https://images.unsplash.com/photo-1572442388796-11668a67e53d?w=375&h=375&fit=crop&q=80", // Cappuccino
  39: "https://images.unsplash.com/photo-1621506289937-a8e4df240d0b?w=375&h=375&fit=crop&q=80", // Fresh Orange Juice
};

async function updateAllImages() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('🔗 Connected to MongoDB');

    // Get all menu items
    const allItems = await MenuItem.find({});
    console.log(`📋 Found ${allItems.length} menu items`);

    let updatedCount = 0;
    let notFoundCount = 0;

    // Update each item
    for (const [id, imageUrl] of Object.entries(menuImages)) {
      const result = await MenuItem.findOneAndUpdate(
        { id: parseInt(id) },
        { image: imageUrl },
        { new: true }
      );
      
      if (result) {
        console.log(`✅ Updated: ${result.name}`);
        updatedCount++;
      } else {
        console.log(`❌ Not found: Item with ID ${id}`);
        notFoundCount++;
      }
    }

    // Update any items without images using a generic image
    const itemsWithoutImages = await MenuItem.find({ 
      $or: [
        { image: null },
        { image: '' },
        { image: { $exists: false } }
      ]
    });

    if (itemsWithoutImages.length > 0) {
      console.log(`\n🔍 Found ${itemsWithoutImages.length} items without images`);
      
      // Generic food images by category
      const genericImages = {
        appetizers: "https://images.unsplash.com/photo-1541014741259-de529411b96a?w=375&h=375&fit=crop&q=80",
        mains: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=375&h=375&fit=crop&q=80",
        desserts: "https://images.unsplash.com/photo-1551024601-bec78aea704b?w=375&h=375&fit=crop&q=80",
        beverages: "https://images.unsplash.com/photo-1544145945-f90425340c7e?w=375&h=375&fit=crop&q=80",
        specials: "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=375&h=375&fit=crop&q=80"
      };

      for (const item of itemsWithoutImages) {
        const genericImage = genericImages[item.category] || genericImages.mains;
        await MenuItem.findByIdAndUpdate(item._id, { image: genericImage });
        console.log(`🖼️  Added generic image for: ${item.name}`);
        updatedCount++;
      }
    }

    console.log('\n✨ Update Summary:');
    console.log(`   - Total items: ${allItems.length}`);
    console.log(`   - Updated: ${updatedCount}`);
    console.log(`   - Not found: ${notFoundCount}`);
    
    // Show sample of updated items
    console.log('\n📸 Sample updated items:');
    const samples = await MenuItem.find({ image: { $ne: null } }).limit(5);
    samples.forEach(item => {
      console.log(`   - ${item.name}: ${item.image}`);
    });

    await mongoose.connection.close();
    console.log('\n✅ All images updated successfully!');
    console.log('🌐 Your admin panel should now show all images');
    
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

// Run the update
console.log('🚀 Starting bulk image update...\n');
updateAllImages();