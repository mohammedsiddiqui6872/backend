// src/routes/menu.js
const express = require('express');
const router = express.Router();
const MenuItem = require('../models/MenuItem');
const Category = require('../models/Category');
const PricingRule = require('../models/PricingRule');

// Get all menu items grouped by category
router.get('/', async (req, res) => {
  try {
    // Add tenant filter
    const filter = { available: true };
    if (req.tenantId) {
      filter.tenantId = req.tenantId;
    }
    
    const menuItems = await MenuItem.find(filter);
    
    // Apply pricing rules to each item
    const itemsWithPricing = await Promise.all(
      menuItems.map(async (item) => {
        const basePrice = item.price;
        
        // Get pricing context from request
        const context = {
          channel: req.query.channel || 'dine-in',
          tableNumber: req.query.table,
          customerType: req.query.customerType || 'regular'
        };
        
        // Calculate best price with rules
        const pricing = await PricingRule.getBestPrice(
          req.tenantId,
          item._id,
          basePrice,
          1,
          context
        );
        
        const menuItem = item.toObject();
        
        return {
          ...menuItem,
          _id: menuItem._id.toString(),
          mongoId: menuItem._id.toString(),
          numericId: menuItem.id,
          originalPrice: basePrice,
          price: pricing.finalPrice,
          hasDiscount: pricing.appliedRule !== null,
          discount: pricing.discount,
          appliedRule: pricing.appliedRule
        };
      })
    );
    
    // Group items by category
    const groupedItems = {};
    itemsWithPricing.forEach(item => {
      const category = item.category || 'uncategorized';
      if (!groupedItems[category]) {
        groupedItems[category] = [];
      }
      groupedItems[category].push(item);
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