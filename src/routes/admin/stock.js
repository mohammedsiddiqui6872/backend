const express = require('express');
const router = express.Router();
const StockService = require('../../services/stockService');
const StockTransaction = require('../../models/StockTransaction');
const MenuItem = require('../../models/MenuItem');
const { authenticate, authorize } = require('../../middleware/auth');
const { body, param, validationResult } = require('express-validator');

// Apply authentication to all admin routes
router.use(authenticate);
router.use(authorize('admin', 'manager'));

// Validation middleware
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

// Get stock levels for all items
router.get('/levels', async (req, res) => {
  try {
    const { category, lowStock, outOfStock, search } = req.query;
    const filters = {};
    
    if (category) filters.category = category;
    if (outOfStock === 'true') filters.stockQuantity = 0;
    if (lowStock === 'true') filters.lowStock = true;
    if (search) {
      filters.$or = [
        { name: { $regex: search, $options: 'i' } },
        { nameAr: { $regex: search, $options: 'i' } }
      ];
    }
    
    const items = await StockService.getStockLevels(filters);
    res.json(items);
  } catch (error) {
    console.error('Error fetching stock levels:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get stock value report
router.get('/value-report', async (req, res) => {
  try {
    const report = await StockService.getStockValueReport();
    res.json(report);
  } catch (error) {
    console.error('Error generating stock value report:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get stock transaction history
router.get('/transactions', async (req, res) => {
  try {
    const { 
      menuItemId, 
      transactionType, 
      startDate, 
      endDate, 
      page = 1, 
      limit = 50 
    } = req.query;
    
    const filters = {};
    if (menuItemId) filters.menuItemId = menuItemId;
    if (transactionType) filters.transactionType = transactionType;
    if (startDate || endDate) {
      filters.createdAt = {};
      if (startDate) filters.createdAt.$gte = new Date(startDate);
      if (endDate) filters.createdAt.$lte = new Date(endDate);
    }
    
    const result = await StockTransaction.getStockHistory(filters, page, limit);
    res.json(result);
  } catch (error) {
    console.error('Error fetching stock transactions:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get transaction summary
router.get('/transactions/summary', async (req, res) => {
  try {
    const { menuItemId, startDate, endDate } = req.query;
    const summary = await StockTransaction.getStockSummary(menuItemId, startDate, endDate);
    res.json(summary);
  } catch (error) {
    console.error('Error fetching transaction summary:', error);
    res.status(500).json({ error: error.message });
  }
});

// Adjust stock for a menu item
router.post('/adjust', [
  body('menuItemId').isMongoId().withMessage('Invalid menu item ID'),
  body('quantity').isInt().withMessage('Quantity must be an integer'),
  body('reason').optional().isString().trim(),
  body('type').isIn(['adjustment', 'restock']).withMessage('Invalid adjustment type')
], validate, async (req, res) => {
  try {
    const { menuItemId, quantity, reason, type } = req.body;
    
    const transaction = await StockService.adjustStock(
      menuItemId,
      quantity,
      reason,
      req.user._id,
      type
    );
    
    // Get updated menu item
    const menuItem = await MenuItem.findById(menuItemId)
      .select('name stockQuantity inStock lowStockThreshold');
    
    res.json({
      success: true,
      transaction,
      menuItem,
      message: 'Stock adjusted successfully'
    });
  } catch (error) {
    console.error('Error adjusting stock:', error);
    res.status(500).json({ error: error.message });
  }
});

// Record waste
router.post('/waste', [
  body('menuItemId').isMongoId().withMessage('Invalid menu item ID'),
  body('quantity').isInt({ min: 1 }).withMessage('Quantity must be a positive integer'),
  body('reason').notEmpty().trim().withMessage('Reason is required')
], validate, async (req, res) => {
  try {
    const { menuItemId, quantity, reason } = req.body;
    
    const transaction = await StockService.recordWaste(
      menuItemId,
      quantity,
      reason,
      req.user._id
    );
    
    // Get updated menu item
    const menuItem = await MenuItem.findById(menuItemId)
      .select('name stockQuantity inStock lowStockThreshold');
    
    res.json({
      success: true,
      transaction,
      menuItem,
      message: 'Waste recorded successfully'
    });
  } catch (error) {
    console.error('Error recording waste:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update stock settings for a menu item
router.put('/settings/:menuItemId', [
  param('menuItemId').isMongoId().withMessage('Invalid menu item ID'),
  body('lowStockThreshold').optional().isInt({ min: 0 }).withMessage('Low stock threshold must be non-negative'),
  body('reorderPoint').optional().isInt({ min: 0 }).withMessage('Reorder point must be non-negative'),
  body('reorderQuantity').optional().isInt({ min: 1 }).withMessage('Reorder quantity must be positive')
], validate, async (req, res) => {
  try {
    const { menuItemId } = req.params;
    const updates = req.body;
    
    const menuItem = await MenuItem.findOneAndUpdate(
      { 
        _id: menuItemId,
        tenantId: req.tenantId
      },
      { $set: updates },
      { new: true }
    ).select('name stockQuantity lowStockThreshold reorderPoint reorderQuantity');
    
    if (!menuItem) {
      return res.status(404).json({ error: 'Menu item not found' });
    }
    
    res.json({
      success: true,
      menuItem,
      message: 'Stock settings updated successfully'
    });
  } catch (error) {
    console.error('Error updating stock settings:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get low stock items
router.get('/low-stock', async (req, res) => {
  try {
    const { threshold } = req.query;
    const items = await StockTransaction.getLowStockItems(threshold);
    res.json(items);
  } catch (error) {
    console.error('Error fetching low stock items:', error);
    res.status(500).json({ error: error.message });
  }
});

// Batch update stock
router.post('/batch-update', [
  body('updates').isArray({ min: 1 }).withMessage('Updates array is required'),
  body('updates.*.menuItemId').isMongoId().withMessage('Invalid menu item ID'),
  body('updates.*.quantity').isInt().withMessage('Quantity must be an integer'),
  body('updates.*.type').isIn(['adjustment', 'restock']).withMessage('Invalid update type'),
  body('reason').optional().isString().trim()
], validate, async (req, res) => {
  try {
    const { updates, reason } = req.body;
    const results = [];
    const errors = [];
    
    for (const update of updates) {
      try {
        const transaction = await StockService.adjustStock(
          update.menuItemId,
          update.quantity,
          reason || 'Batch update',
          req.user._id,
          update.type
        );
        results.push({
          menuItemId: update.menuItemId,
          success: true,
          transaction
        });
      } catch (error) {
        errors.push({
          menuItemId: update.menuItemId,
          error: error.message
        });
      }
    }
    
    res.json({
      success: errors.length === 0,
      results,
      errors,
      message: `Processed ${results.length} items successfully, ${errors.length} errors`
    });
  } catch (error) {
    console.error('Error in batch stock update:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;