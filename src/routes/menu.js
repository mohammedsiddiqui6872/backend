// src/routes/menu.js
const express = require('express');
const router = express.Router();
const MenuItem = require('../models/MenuItem');
const Category = require('../models/Category');

// Get all menu items grouped by category
router.get('/', async (req, res) => {
  try {
    // Add tenant filter
    const filter = { available: true };
    if (req.tenantId) {
      filter.tenantId = req.tenantId;
    }
    
    const menuItems = await MenuItem.find(filter);
    
    // Group items by category and ensure consistent data structure
    const groupedItems = {};
    menuItems.forEach(item => {
      const category = item.category || 'uncategorized';
      if (!groupedItems[category]) {
        groupedItems[category] = [];
      }
      
      // Transform item to ensure consistent structure
      const menuItem = item.toObject();
      
      // Ensure _id is included as a string for frontend
      const transformedItem = {
        ...menuItem,
        _id: menuItem._id.toString(), // Convert ObjectId to string
        mongoId: menuItem._id.toString(), // Backup field
        numericId: menuItem.id // Keep numeric ID for backward compatibility
      };
      
      groupedItems[category].push(transformedItem);
    });
    
    res.json(groupedItems);
  } catch (error) {
    console.error('Menu route error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get all menu items with category details
router.get('/with-categories', async (req, res) => {
  try {
    // Get all active categories with tenant filter
    const categoryFilter = { isActive: true };
    if (req.tenantId) {
      categoryFilter.tenantId = req.tenantId;
    }
    const categories = await Category.find(categoryFilter)
      .select('name nameAr slug icon image displayOrder')
      .sort({ displayOrder: 1, name: 1 });
    
    // Get all available menu items with tenant filter
    const menuItemFilter = { available: true };
    if (req.tenantId) {
      menuItemFilter.tenantId = req.tenantId;
    }
    const menuItems = await MenuItem.find(menuItemFilter);
    
    // Create a map of categories with their items
    const categoriesWithItems = categories.map(category => {
      const categoryObj = category.toObject();
      const items = menuItems
        .filter(item => item.category === category.slug)
        .map(item => {
          const menuItem = item.toObject();
          return {
            ...menuItem,
            _id: menuItem._id.toString(),
            mongoId: menuItem._id.toString(),
            numericId: menuItem.id
          };
        });
      
      return {
        ...categoryObj,
        items: items
      };
    });
    
    res.json(categoriesWithItems);
  } catch (error) {
    console.error('Menu with categories error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get menu items by category
router.get('/:category', async (req, res) => {
  try {
    const filter = { 
      category: req.params.category,
      available: true 
    };
    if (req.tenantId) {
      filter.tenantId = req.tenantId;
    }
    const items = await MenuItem.find(filter);
    res.json(items);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;