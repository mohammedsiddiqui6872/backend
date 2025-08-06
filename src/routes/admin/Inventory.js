const express = require('express');
const router = express.Router();
const InventoryItem = require('../../models/InventoryItem');
const StockMovement = require('../../models/StockMovement');
const inventoryService = require('../../services/inventoryService');
const recipeCostingService = require('../../services/recipeCostingService');
const { authenticate, authorize } = require('../../middleware/auth');
const { validateRequest } = require('../../middleware/validation');
const { body, query, param } = require('express-validator');

// Middleware to ensure tenant context
const ensureTenant = (req, res, next) => {
  if (!req.user.tenantId) {
    return res.status(400).json({ error: 'Tenant context required' });
  }
  req.tenantId = req.user.tenantId;
  next();
};

// Get all inventory items with filters
router.get('/', 
  authenticate, 
  authorize(['inventory.view']), 
  ensureTenant,
  async (req, res) => {
    try {
      const { 
        category, 
        location, 
        lowStock, 
        expiring, 
        search,
        sortBy = 'name',
        sortOrder = 'asc',
        page = 1,
        limit = 50
      } = req.query;
      
      const query = { tenantId: req.tenantId, isActive: true };
      
      if (category) query.category = category;
      if (search) {
        query.$or = [
          { name: { $regex: search, $options: 'i' } },
          { sku: { $regex: search, $options: 'i' } },
          { barcode: search }
        ];
      }
      
      if (lowStock === 'true') {
        query.$expr = { $lte: ['$totalAvailable', '$reorderPoint'] };
      }
      
      const skip = (page - 1) * limit;
      
      let itemsQuery = InventoryItem.find(query)
        .populate('suppliers.supplier', 'name code')
        .populate('preferredSupplierId', 'name code')
        .sort({ [sortBy]: sortOrder === 'asc' ? 1 : -1 })
        .skip(skip)
        .limit(parseInt(limit));
      
      const [items, total] = await Promise.all([
        itemsQuery,
        InventoryItem.countDocuments(query)
      ]);
      
      // Get expiring items if requested
      let expiringItems = [];
      if (expiring === 'true') {
        expiringItems = await inventoryService.getExpiringItems(req.tenantId, 7);
      }
      
      res.json({
        success: true,
        data: {
          items,
          expiringItems,
          pagination: {
            total,
            pages: Math.ceil(total / limit),
            current: parseInt(page),
            limit: parseInt(limit)
          }
        }
      });
    } catch (error) {
      console.error('Error fetching inventory:', error);
      res.status(500).json({ error: 'Failed to fetch inventory' });
    }
  }
);

// Get single inventory item
router.get('/:id',
  authenticate,
  authorize(['inventory.view']),
  ensureTenant,
  async (req, res) => {
    try {
      const item = await InventoryItem.findOne({
        _id: req.params.id,
        tenantId: req.tenantId
      })
      .populate('suppliers.supplier')
      .populate('preferredSupplierId')
      .populate('createdBy', 'name')
      .populate('updatedBy', 'name');
      
      if (!item) {
        return res.status(404).json({ error: 'Inventory item not found' });
      }
      
      // Get recent movements
      const movements = await StockMovement.find({
        tenantId: req.tenantId,
        inventoryItem: item._id
      })
      .sort({ performedDate: -1 })
      .limit(20)
      .populate('performedBy', 'name');
      
      res.json({
        success: true,
        data: {
          item,
          movements,
          valuation: item.totalQuantity * item.currentCost
        }
      });
    } catch (error) {
      console.error('Error fetching inventory item:', error);
      res.status(500).json({ error: 'Failed to fetch inventory item' });
    }
  }
);

// Create inventory item
router.post('/',
  authenticate,
  authorize(['inventory.manage']),
  ensureTenant,
  [
    body('name').notEmpty().withMessage('Name is required'),
    body('sku').notEmpty().withMessage('SKU is required'),
    body('category').isIn(['produce', 'meat', 'seafood', 'dairy', 'dry-goods', 'beverages', 'supplies', 'packaging']),
    body('baseUnit').notEmpty().withMessage('Base unit is required'),
    body('currentCost').isNumeric().withMessage('Current cost must be a number'),
    body('reorderPoint').isNumeric().withMessage('Reorder point must be a number')
  ],
  validateRequest,
  async (req, res) => {
    try {
      const itemData = {
        ...req.body,
        tenantId: req.tenantId,
        createdBy: req.user._id
      };
      
      // Check for duplicate SKU
      const existing = await InventoryItem.findOne({
        tenantId: req.tenantId,
        sku: itemData.sku
      });
      
      if (existing) {
        return res.status(400).json({ error: 'SKU already exists' });
      }
      
      const item = new InventoryItem(itemData);
      await item.save();
      
      res.status(201).json({
        success: true,
        data: item
      });
    } catch (error) {
      console.error('Error creating inventory item:', error);
      res.status(500).json({ error: 'Failed to create inventory item' });
    }
  }
);

// Update inventory item
router.put('/:id',
  authenticate,
  authorize(['inventory.manage']),
  ensureTenant,
  async (req, res) => {
    try {
      const item = await InventoryItem.findOne({
        _id: req.params.id,
        tenantId: req.tenantId
      });
      
      if (!item) {
        return res.status(404).json({ error: 'Inventory item not found' });
      }
      
      // Don't allow changing critical fields
      delete req.body.tenantId;
      delete req.body.sku;
      delete req.body.totalQuantity;
      delete req.body.totalAvailable;
      
      Object.assign(item, req.body);
      item.updatedBy = req.user._id;
      
      await item.save();
      
      res.json({
        success: true,
        data: item
      });
    } catch (error) {
      console.error('Error updating inventory item:', error);
      res.status(500).json({ error: 'Failed to update inventory item' });
    }
  }
);

// Stock receiving
router.post('/receive',
  authenticate,
  authorize(['inventory.receive']),
  ensureTenant,
  [
    body('purchaseOrderId').notEmpty().withMessage('Purchase order ID required'),
    body('items').isArray().withMessage('Items must be an array'),
    body('items.*.inventoryItemId').notEmpty(),
    body('items.*.quantity').isNumeric().isInt({ gt: 0 })
  ],
  validateRequest,
  async (req, res) => {
    try {
      const result = await inventoryService.receiveStock(
        req.tenantId,
        req.body.purchaseOrderId,
        req.body,
        req.user._id
      );
      
      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      console.error('Error receiving stock:', error);
      res.status(500).json({ error: error.message || 'Failed to receive stock' });
    }
  }
);

// Record waste
router.post('/waste',
  authenticate,
  authorize(['inventory.manage']),
  ensureTenant,
  [
    body('items').isArray().withMessage('Items must be an array'),
    body('items.*.inventoryItemId').notEmpty(),
    body('items.*.quantity').isNumeric().isInt({ gt: 0 }),
    body('type').isIn(['WASTE', 'DAMAGE', 'EXPIRED', 'THEFT']),
    body('reason').notEmpty()
  ],
  validateRequest,
  async (req, res) => {
    try {
      const movements = await inventoryService.recordWaste(
        req.tenantId,
        req.body,
        req.user._id
      );
      
      res.json({
        success: true,
        data: movements
      });
    } catch (error) {
      console.error('Error recording waste:', error);
      res.status(500).json({ error: 'Failed to record waste' });
    }
  }
);

// Stock transfer
router.post('/transfer',
  authenticate,
  authorize(['inventory.manage']),
  ensureTenant,
  [
    body('inventoryItemId').notEmpty(),
    body('quantity').isNumeric().isInt({ gt: 0 }),
    body('fromLocation').notEmpty(),
    body('toLocation').notEmpty()
  ],
  validateRequest,
  async (req, res) => {
    try {
      const movement = await inventoryService.transferStock(
        req.tenantId,
        req.body,
        req.user._id
      );
      
      res.json({
        success: true,
        data: movement
      });
    } catch (error) {
      console.error('Error transferring stock:', error);
      res.status(500).json({ error: error.message || 'Failed to transfer stock' });
    }
  }
);

// Cycle count
router.post('/cycle-count',
  authenticate,
  authorize(['inventory.count']),
  ensureTenant,
  [
    body('inventoryItemId').notEmpty(),
    body('countedQuantity').isNumeric().isInt({ min: 0 })
  ],
  validateRequest,
  async (req, res) => {
    try {
      const result = await inventoryService.performCycleCount(
        req.tenantId,
        req.body,
        req.user._id
      );
      
      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      console.error('Error performing cycle count:', error);
      res.status(500).json({ error: 'Failed to perform cycle count' });
    }
  }
);

// Get inventory valuation
router.get('/reports/valuation',
  authenticate,
  authorize(['inventory.reports']),
  ensureTenant,
  async (req, res) => {
    try {
      const { category, location } = req.query;
      
      const valuation = await inventoryService.getInventoryValuation(
        req.tenantId,
        { category, location }
      );
      
      res.json({
        success: true,
        data: valuation
      });
    } catch (error) {
      console.error('Error getting inventory valuation:', error);
      res.status(500).json({ error: 'Failed to get inventory valuation' });
    }
  }
);

// Check and create reorders
router.post('/reorder/check',
  authenticate,
  authorize(['inventory.order']),
  ensureTenant,
  async (req, res) => {
    try {
      const purchaseOrders = await inventoryService.checkAndCreateReorders(req.tenantId);
      
      res.json({
        success: true,
        data: {
          ordersCreated: purchaseOrders.length,
          orders: purchaseOrders
        }
      });
    } catch (error) {
      console.error('Error checking reorders:', error);
      res.status(500).json({ error: 'Failed to check reorders' });
    }
  }
);

// Get expiring items
router.get('/reports/expiring',
  authenticate,
  authorize(['inventory.view']),
  ensureTenant,
  async (req, res) => {
    try {
      const daysAhead = parseInt(req.query.days) || 7;
      const expiringItems = await inventoryService.getExpiringItems(req.tenantId, daysAhead);
      
      res.json({
        success: true,
        data: expiringItems
      });
    } catch (error) {
      console.error('Error getting expiring items:', error);
      res.status(500).json({ error: 'Failed to get expiring items' });
    }
  }
);

// Calculate EOQ
router.post('/:id/calculate-eoq',
  authenticate,
  authorize(['inventory.manage']),
  ensureTenant,
  async (req, res) => {
    try {
      const result = await inventoryService.calculateEOQ(
        req.tenantId,
        req.params.id,
        req.body.period || 365
      );
      
      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      console.error('Error calculating EOQ:', error);
      res.status(500).json({ error: 'Failed to calculate EOQ' });
    }
  }
);

// ABC Analysis
router.get('/reports/abc-analysis',
  authenticate,
  authorize(['inventory.reports']),
  ensureTenant,
  async (req, res) => {
    try {
      const analysis = await inventoryService.performABCAnalysis(req.tenantId);
      
      res.json({
        success: true,
        data: analysis
      });
    } catch (error) {
      console.error('Error performing ABC analysis:', error);
      res.status(500).json({ error: 'Failed to perform ABC analysis' });
    }
  }
);

// Stock turnover analysis
router.get('/reports/turnover',
  authenticate,
  authorize(['inventory.reports']),
  ensureTenant,
  async (req, res) => {
    try {
      const period = parseInt(req.query.period) || 30;
      const analysis = await inventoryService.analyzeStockTurnover(req.tenantId, period);
      
      res.json({
        success: true,
        data: analysis
      });
    } catch (error) {
      console.error('Error analyzing stock turnover:', error);
      res.status(500).json({ error: 'Failed to analyze stock turnover' });
    }
  }
);

// Recipe costing
router.get('/recipe/:recipeId/cost',
  authenticate,
  authorize(['inventory.view']),
  ensureTenant,
  async (req, res) => {
    try {
      const cost = await recipeCostingService.calculateRecipeCost(
        req.tenantId,
        req.params.recipeId
      );
      
      res.json({
        success: true,
        data: cost
      });
    } catch (error) {
      console.error('Error calculating recipe cost:', error);
      res.status(500).json({ error: 'Failed to calculate recipe cost' });
    }
  }
);

// Menu profitability analysis
router.get('/reports/menu-profitability',
  authenticate,
  authorize(['inventory.reports']),
  ensureTenant,
  async (req, res) => {
    try {
      const period = parseInt(req.query.period) || 30;
      const analysis = await recipeCostingService.analyzeMenuProfitability(req.tenantId, period);
      
      res.json({
        success: true,
        data: analysis
      });
    } catch (error) {
      console.error('Error analyzing menu profitability:', error);
      res.status(500).json({ error: 'Failed to analyze menu profitability' });
    }
  }
);

// Track yield variance
router.post('/recipe/:recipeId/yield',
  authenticate,
  authorize(['inventory.manage']),
  ensureTenant,
  [
    body('actualYield').isNumeric().isInt({ gt: 0 })
  ],
  validateRequest,
  async (req, res) => {
    try {
      const result = await recipeCostingService.trackYieldVariance(
        req.tenantId,
        req.params.recipeId,
        req.body.actualYield,
        req.user._id
      );
      
      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      console.error('Error tracking yield variance:', error);
      res.status(500).json({ error: 'Failed to track yield variance' });
    }
  }
);

// Monitor price changes
router.get('/reports/price-changes',
  authenticate,
  authorize(['inventory.reports']),
  ensureTenant,
  async (req, res) => {
    try {
      const period = parseInt(req.query.period) || 30;
      const analysis = await recipeCostingService.monitorPriceChanges(req.tenantId, period);
      
      res.json({
        success: true,
        data: analysis
      });
    } catch (error) {
      console.error('Error monitoring price changes:', error);
      res.status(500).json({ error: 'Failed to monitor price changes' });
    }
  }
);

// Update all recipe costs
router.post('/recipes/update-costs',
  authenticate,
  authorize(['inventory.manage']),
  ensureTenant,
  async (req, res) => {
    try {
      const result = await recipeCostingService.updateAllRecipeCosts(req.tenantId);
      
      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      console.error('Error updating recipe costs:', error);
      res.status(500).json({ error: 'Failed to update recipe costs' });
    }
  }
);

// Get movement history
router.get('/movements',
  authenticate,
  authorize(['inventory.view']),
  ensureTenant,
  async (req, res) => {
    try {
      const {
        inventoryItemId,
        type,
        startDate,
        endDate,
        page = 1,
        limit = 50
      } = req.query;
      
      const query = { tenantId: req.tenantId };
      
      if (inventoryItemId) query.inventoryItem = inventoryItemId;
      if (type) query.type = type;
      if (startDate || endDate) {
        query.performedDate = {};
        if (startDate) query.performedDate.$gte = new Date(startDate);
        if (endDate) query.performedDate.$lte = new Date(endDate);
      }
      
      const skip = (page - 1) * limit;
      
      const [movements, total] = await Promise.all([
        StockMovement.find(query)
          .populate('inventoryItem', 'name sku')
          .populate('performedBy', 'name')
          .populate('approvedBy', 'name')
          .sort({ performedDate: -1 })
          .skip(skip)
          .limit(parseInt(limit)),
        StockMovement.countDocuments(query)
      ]);
      
      res.json({
        success: true,
        data: {
          movements,
          pagination: {
            total,
            pages: Math.ceil(total / limit),
            current: parseInt(page),
            limit: parseInt(limit)
          }
        }
      });
    } catch (error) {
      console.error('Error fetching movements:', error);
      res.status(500).json({ error: 'Failed to fetch movements' });
    }
  }
);

// Approve cycle count adjustment
router.post('/movements/:id/approve',
  authenticate,
  authorize(['inventory.approve']),
  ensureTenant,
  async (req, res) => {
    try {
      const movement = await StockMovement.findOne({
        _id: req.params.id,
        tenantId: req.tenantId,
        requiresApproval: true,
        approvalStatus: 'PENDING'
      });
      
      if (!movement) {
        return res.status(404).json({ error: 'Movement not found or already approved' });
      }
      
      movement.approvalStatus = 'APPROVED';
      movement.approvedBy = req.user._id;
      movement.approvedDate = new Date();
      
      await movement.save();
      
      // Apply the adjustment
      const inventoryItem = await InventoryItem.findById(movement.inventoryItem);
      if (inventoryItem) {
        inventoryItem.totalQuantity = movement.stockAfter;
        inventoryItem.totalAvailable = movement.stockAfter - inventoryItem.totalReserved;
        inventoryItem.lastCountDate = new Date();
        inventoryItem.lastCountVariance = movement.quantity;
        await inventoryItem.save();
      }
      
      res.json({
        success: true,
        data: movement
      });
    } catch (error) {
      console.error('Error approving movement:', error);
      res.status(500).json({ error: 'Failed to approve movement' });
    }
  }
);

// Backward compatibility - Get low stock items
router.get('/low-stock', async (req, res) => {
  try {
    const lowStock = await InventoryItem.find({
      tenantId: req.tenantId || req.user.tenantId,
      $expr: { $lte: ['$totalAvailable', '$reorderPoint'] }
    }).populate('suppliers.supplier', 'name');

    res.json(lowStock);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;