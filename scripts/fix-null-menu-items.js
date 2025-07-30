require('dotenv').config();
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

async function fixNullMenuItems() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/restaurant');
    console.log('Connected to MongoDB\n');
    
    const Order = require('../src/models/Order');
    const MenuItem = require('../src/models/MenuItem');
    
    // First, create a backup of affected orders
    console.log('=== BACKING UP AFFECTED ORDERS ===');
    const affectedOrders = await Order.find({
      'items.menuItem': null
    });
    
    const backupDir = path.join(__dirname, '../backups');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }
    
    const backupFile = path.join(backupDir, `orders-backup-${Date.now()}.json`);
    fs.writeFileSync(backupFile, JSON.stringify(affectedOrders, null, 2));
    console.log(`Backed up ${affectedOrders.length} orders to: ${backupFile}`);
    
    // Analyze the problem
    console.log('\n=== ANALYZING NULL MENU ITEMS ===');
    let totalNullItems = 0;
    let ordersFixed = 0;
    
    for (const order of affectedOrders) {
      console.log(`\nOrder #${order.orderNumber} (${order._id}):`);
      console.log(`  Table: ${order.tableNumber}, Date: ${order.createdAt}`);
      console.log(`  Status: ${order.status}, Payment: ${order.paymentStatus}`);
      
      let hasValidItems = false;
      
      for (let i = 0; i < order.items.length; i++) {
        const item = order.items[i];
        
        if (!item.menuItem) {
          totalNullItems++;
          console.log(`  - Item ${i}: NULL reference`);
          console.log(`    Name: ${item.name || 'Unknown'}`);
          console.log(`    Price: ₹${item.price || 0}`);
          console.log(`    Quantity: ${item.quantity || 1}`);
          
          // Strategy: Keep the item data but mark it as deleted menu item
          if (item.name && item.price) {
            // We have the essential data, just missing the reference
            item.menuItem = null; // Keep it null but ensure other data is intact
            item.name = item.name || 'Deleted Menu Item';
            item.notes = (item.notes || '') + ' [Menu item was deleted]';
            hasValidItems = true;
          }
        } else {
          hasValidItems = true;
        }
      }
      
      // Fix payment method if it's invalid
      if (order.paymentMethod === 'pending') {
        order.paymentMethod = undefined; // Remove invalid value
      }
      
      // Only save if we have at least some valid data
      if (hasValidItems) {
        try {
          await order.save({ validateBeforeSave: false }); // Skip validation for legacy data
          ordersFixed++;
          console.log(`  ✓ Order preserved with item details`);
        } catch (saveError) {
          console.log(`  ✗ Failed to save order: ${saveError.message}`);
        }
      } else {
        console.log(`  ⚠ Order has no recoverable items`);
      }
    }
    
    console.log('\n=== SUMMARY ===');
    console.log(`Total orders with null items: ${affectedOrders.length}`);
    console.log(`Total null item references: ${totalNullItems}`);
    console.log(`Orders fixed: ${ordersFixed}`);
    
    // Get some stats on what might have caused this
    console.log('\n=== INVESTIGATING ROOT CAUSE ===');
    
    // Check if menu items were deleted
    const allOrders = await Order.find().select('items.menuItem');
    const referencedItemIds = new Set();
    
    allOrders.forEach(order => {
      order.items.forEach(item => {
        if (item.menuItem) {
          referencedItemIds.add(item.menuItem.toString());
        }
      });
    });
    
    console.log(`Unique menu items referenced in orders: ${referencedItemIds.size}`);
    
    const existingItems = await MenuItem.find().select('_id');
    const existingItemIds = new Set(existingItems.map(item => item._id.toString()));
    
    const deletedItemIds = Array.from(referencedItemIds).filter(id => !existingItemIds.has(id));
    console.log(`Menu items that were deleted: ${deletedItemIds.length}`);
    
    console.log('\n✅ Fix completed! Check the backup file if needed.');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
  }
}

fixNullMenuItems();