// src/routes/admin/inventory.js
const express = require('express');
const router = express.Router();
const Inventory = require('../../models/Inventory');
const MenuItem = require('../../models/MenuItem');
const { authenticate, authorize } = require('../../middleware/auth');

router.use(authenticate);
router.use(authorize('admin', 'manager'));

// Get inventory list
router.get('/', async (req, res) => {
  try {
    const inventory = await Inventory.find()
      .populate('menuItem', 'name category')
      .sort('menuItem.name');

    res.json(inventory);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update stock
router.patch('/:itemId/stock', async (req, res) => {
  try {
    const { quantity, type, reason } = req.body;

    const inventory = await Inventory.findOne({ menuItem: req.params.itemId });
    if (!inventory) {
      return res.status(404).json({ error: 'Inventory item not found' });
    }

    // Update stock based on type
    if (type === 'in') {
      inventory.currentStock += quantity;
    } else {
      inventory.currentStock -= quantity;
    }

    // Add movement record
    inventory.movements.push({
      type,
      quantity,
      reason,
      performedBy: req.user._id
    });

    if (type === 'in') {
      inventory.lastRestocked = new Date();
    }

    await inventory.save();

    res.json({
      success: true,
      inventory,
      message: 'Stock updated successfully'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get low stock items
router.get('/low-stock', async (req, res) => {
  try {
    const lowStock = await Inventory.find({
      $expr: { $lte: ['$currentStock', '$minStock'] }
    }).populate('menuItem', 'name category');

    res.json(lowStock);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Set reorder levels
router.patch('/:itemId/reorder-levels', async (req, res) => {
  try {
    const { minStock, maxStock } = req.body;

    const inventory = await Inventory.findOneAndUpdate(
      { menuItem: req.params.itemId },
      { minStock, maxStock },
      { new: true }
    );

    if (!inventory) {
      return res.status(404).json({ error: 'Inventory item not found' });
    }

    res.json({
      success: true,
      inventory,
      message: 'Reorder levels updated'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;