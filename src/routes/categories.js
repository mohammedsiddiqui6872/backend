// src/routes/categories.js
const express = require('express');
const router = express.Router();
const Category = require('../models/Category');

// Get active categories for frontend
router.get('/', async (req, res) => {
  try {
    // Filter by tenant
    const query = { isActive: true };
    if (req.tenantId) {
      query.tenantId = req.tenantId;
      console.log('[CATEGORIES] Filtering by tenant:', req.tenantId);
    } else {
      console.warn('[CATEGORIES] ⚠️ No tenant ID in request! This could lead to data leakage.');
    }
    
    const categories = await Category.find(query)
      .select('name nameAr slug icon image displayOrder')
      .sort({ displayOrder: 1, name: 1 });
    
    console.log('[CATEGORIES] Found', categories.length, 'categories for tenant:', req.tenantId);
    res.json(categories);
  } catch (error) {
    console.error('[CATEGORIES] Error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;