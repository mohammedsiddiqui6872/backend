// src/routes/categories.js
const express = require('express');
const router = express.Router();
const Category = require('../models/Category');

// Get active categories for frontend
router.get('/', async (req, res) => {
  try {
    const categories = await Category.find({ isActive: true })
      .select('name nameAr slug icon image displayOrder')
      .sort({ displayOrder: 1, name: 1 });
    res.json(categories);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;