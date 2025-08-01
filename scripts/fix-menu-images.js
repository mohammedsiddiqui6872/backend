require('dotenv').config();
const mongoose = require('mongoose');
const MenuItem = require('../src/models/MenuItem');

async function fixMenuImages() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Find all menu items with /images/ paths
    const itemsWithImages = await MenuItem.find({
      image: { $regex: '^/images/' }
    });

    console.log(`Found ${itemsWithImages.length} items with /images/ paths`);

    for (const item of itemsWithImages) {
      console.log(`Updating ${item.name}: ${item.image}`);
      
      // Option 1: Remove the image path (will show placeholder)
      // item.image = null;
      
      // Option 2: Replace with a placeholder image based on item name
      const itemName = item.name.toLowerCase().replace(/\s+/g, '-');
      item.image = `https://source.unsplash.com/400x300/?${encodeURIComponent(item.name)},food`;
      
      await item.save();
      console.log(`  -> Updated to: ${item.image}`);
    }

    console.log('\nAll menu images updated!');
    console.log('Now when you upload new images, they will use Cloudinary.');
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

fixMenuImages();