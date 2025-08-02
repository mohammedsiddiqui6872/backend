const express = require('express');
const router = express.Router();
const Ingredient = require('../../models/Ingredient');
const IngredientTransaction = require('../../models/IngredientTransaction');
const IngredientBatch = require('../../models/IngredientBatch');
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

// Get all ingredients
router.get('/', async (req, res) => {
  try {
    const { category, search, stockStatus, sortBy = 'name', order = 'asc' } = req.query;
    const filter = { tenantId: req.tenantId };
    
    if (category) filter.category = category;
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { nameAr: { $regex: search, $options: 'i' } },
        { barcode: search },
        { sku: search }
      ];
    }
    
    let ingredients = await Ingredient.find(filter)
      .populate('supplier', 'name')
      .sort({ [sortBy]: order === 'desc' ? -1 : 1 });
    
    // Filter by stock status after fetching (since it's a virtual)
    if (stockStatus) {
      ingredients = ingredients.filter(ing => ing.stockStatus === stockStatus);
    }
    
    res.json(ingredients);
  } catch (error) {
    console.error('Error fetching ingredients:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get single ingredient
router.get('/:id', async (req, res) => {
  try {
    const ingredient = await Ingredient.findOne({
      _id: req.params.id,
      tenantId: req.tenantId
    }).populate('supplier alternativeSuppliers');
    
    if (!ingredient) {
      return res.status(404).json({ error: 'Ingredient not found' });
    }
    
    // Get additional analytics
    const runoutPrediction = await ingredient.predictStockRunout();
    const expiringBatches = await ingredient.getExpiringBatches(14);
    
    res.json({
      ingredient,
      analytics: {
        runoutPrediction,
        expiringBatches
      }
    });
  } catch (error) {
    console.error('Error fetching ingredient:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create new ingredient
router.post('/', [
  body('name').notEmpty().trim().withMessage('Name is required'),
  body('category').isIn(['vegetables', 'fruits', 'meat', 'poultry', 'seafood', 'dairy', 'grains', 'spices', 'oils', 'sauces', 'beverages', 'other']),
  body('baseUnit').isIn(['g', 'kg', 'ml', 'l', 'piece']),
  body('costPerUnit').isFloat({ min: 0 }).optional()
], validate, async (req, res) => {
  try {
    const ingredientData = {
      ...req.body,
      tenantId: req.tenantId
    };
    
    const ingredient = new Ingredient(ingredientData);
    await ingredient.save();
    
    res.status(201).json({
      success: true,
      ingredient,
      message: 'Ingredient created successfully'
    });
  } catch (error) {
    console.error('Error creating ingredient:', error);
    if (error.code === 11000) {
      return res.status(400).json({ error: 'Ingredient with this name already exists' });
    }
    res.status(500).json({ error: error.message });
  }
});

// Update ingredient
router.put('/:id', [
  param('id').isMongoId(),
  body('name').optional().trim().notEmpty(),
  body('category').optional().isIn(['vegetables', 'fruits', 'meat', 'poultry', 'seafood', 'dairy', 'grains', 'spices', 'oils', 'sauces', 'beverages', 'other']),
  body('costPerUnit').optional().isFloat({ min: 0 })
], validate, async (req, res) => {
  try {
    const ingredient = await Ingredient.findOneAndUpdate(
      { _id: req.params.id, tenantId: req.tenantId },
      req.body,
      { new: true, runValidators: true }
    );
    
    if (!ingredient) {
      return res.status(404).json({ error: 'Ingredient not found' });
    }
    
    res.json({
      success: true,
      ingredient,
      message: 'Ingredient updated successfully'
    });
  } catch (error) {
    console.error('Error updating ingredient:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete ingredient
router.delete('/:id', async (req, res) => {
  try {
    // Check if ingredient is used in any recipes
    const Recipe = require('../../models/Recipe');
    const recipesCount = await Recipe.countDocuments({
      'ingredients.ingredient': req.params.id,
      tenantId: req.tenantId
    });
    
    if (recipesCount > 0) {
      return res.status(400).json({
        error: `Cannot delete ingredient. It is used in ${recipesCount} recipe(s).`
      });
    }
    
    const ingredient = await Ingredient.findOneAndUpdate(
      { _id: req.params.id, tenantId: req.tenantId },
      { isActive: false },
      { new: true }
    );
    
    if (!ingredient) {
      return res.status(404).json({ error: 'Ingredient not found' });
    }
    
    res.json({
      success: true,
      message: 'Ingredient deactivated successfully'
    });
  } catch (error) {
    console.error('Error deleting ingredient:', error);
    res.status(500).json({ error: error.message });
  }
});

// Purchase ingredient (create batch)
router.post('/:id/purchase', [
  param('id').isMongoId(),
  body('quantity').isFloat({ min: 0 }).withMessage('Quantity must be positive'),
  body('costPerUnit').isFloat({ min: 0 }).withMessage('Cost must be positive'),
  body('expiryDate').isISO8601().withMessage('Valid expiry date required'),
  body('batchNumber').notEmpty().withMessage('Batch number required'),
  body('supplier').optional().isMongoId()
], validate, async (req, res) => {
  try {
    const ingredient = await Ingredient.findOne({
      _id: req.params.id,
      tenantId: req.tenantId
    });
    
    if (!ingredient) {
      return res.status(404).json({ error: 'Ingredient not found' });
    }
    
    const { quantity, costPerUnit, expiryDate, batchNumber, supplier, manufacturingDate } = req.body;
    
    // Create batch
    const batch = await IngredientBatch.create({
      tenantId: req.tenantId,
      ingredient: ingredient._id,
      batchNumber,
      supplier,
      expiryDate,
      manufacturingDate,
      initialQuantity: quantity,
      remainingQuantity: quantity,
      unit: ingredient.baseUnit,
      costPerUnit,
      totalCost: quantity * costPerUnit
    });
    
    // Update ingredient stock
    const previousStock = ingredient.currentStock;
    ingredient.currentStock += quantity;
    ingredient.lastReceivedDate = new Date();
    ingredient.costPerUnit = costPerUnit; // Update to latest cost
    await ingredient.save();
    
    // Create transaction
    const transaction = await IngredientTransaction.create({
      tenantId: req.tenantId,
      ingredient: ingredient._id,
      transactionType: 'purchase',
      quantity,
      unit: ingredient.baseUnit,
      previousStock,
      newStock: ingredient.currentStock,
      costPerUnit,
      totalCost: quantity * costPerUnit,
      relatedBatch: batch._id,
      supplier,
      performedBy: req.user._id,
      batchNumber,
      expiryDate
    });
    
    res.json({
      success: true,
      batch,
      transaction,
      ingredient: {
        _id: ingredient._id,
        name: ingredient.name,
        currentStock: ingredient.currentStock
      },
      message: 'Purchase recorded successfully'
    });
  } catch (error) {
    console.error('Error recording purchase:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get ingredient transactions
router.get('/:id/transactions', async (req, res) => {
  try {
    const { startDate, endDate, page = 1, limit = 50 } = req.query;
    const filter = {
      ingredient: req.params.id,
      tenantId: req.tenantId
    };
    
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }
    
    const skip = (page - 1) * limit;
    const [transactions, total] = await Promise.all([
      IngredientTransaction.find(filter)
        .populate('performedBy', 'name')
        .populate('supplier', 'name')
        .sort('-createdAt')
        .skip(skip)
        .limit(parseInt(limit)),
      IngredientTransaction.countDocuments(filter)
    ]);
    
    res.json({
      transactions,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching transactions:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get ingredient batches
router.get('/:id/batches', async (req, res) => {
  try {
    const { status } = req.query;
    const filter = {
      ingredient: req.params.id,
      tenantId: req.tenantId
    };
    
    if (status) filter.status = status;
    
    const batches = await IngredientBatch.find(filter)
      .populate('supplier', 'name')
      .sort('-purchaseDate');
    
    res.json(batches);
  } catch (error) {
    console.error('Error fetching batches:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get expiring ingredients
router.get('/expiring/list', async (req, res) => {
  try {
    const { days = 7 } = req.query;
    const expiringBatches = await IngredientBatch.getExpiringBatches(req.tenantId, parseInt(days));
    
    res.json({
      batches: expiringBatches,
      count: expiringBatches.length
    });
  } catch (error) {
    console.error('Error fetching expiring ingredients:', error);
    res.status(500).json({ error: error.message });
  }
});

// Bulk import ingredients
router.post('/bulk-import', [
  body('ingredients').isArray({ min: 1 }).withMessage('Ingredients array required'),
  body('ingredients.*.name').notEmpty(),
  body('ingredients.*.category').isIn(['vegetables', 'fruits', 'meat', 'poultry', 'seafood', 'dairy', 'grains', 'spices', 'oils', 'sauces', 'beverages', 'other']),
  body('ingredients.*.baseUnit').isIn(['g', 'kg', 'ml', 'l', 'piece'])
], validate, async (req, res) => {
  try {
    const { ingredients } = req.body;
    const results = [];
    const errors = [];
    
    for (const ingredientData of ingredients) {
      try {
        const ingredient = await Ingredient.create({
          ...ingredientData,
          tenantId: req.tenantId
        });
        results.push({ name: ingredient.name, _id: ingredient._id, success: true });
      } catch (error) {
        errors.push({ name: ingredientData.name, error: error.message });
      }
    }
    
    res.json({
      success: errors.length === 0,
      imported: results.length,
      failed: errors.length,
      results,
      errors
    });
  } catch (error) {
    console.error('Error bulk importing ingredients:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;