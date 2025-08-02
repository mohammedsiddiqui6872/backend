const express = require('express');
const router = express.Router();
const PricingRule = require('../../models/PricingRule');
const MenuItem = require('../../models/MenuItem');
const { authenticate, authorize } = require('../../middleware/auth');
const { body, param, query, validationResult } = require('express-validator');
const { getCurrentTenantId } = require('../../middleware/tenantContext');

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

// Get all pricing rules
router.get('/', async (req, res) => {
  try {
    const tenantId = getCurrentTenantId();
    const { type, menuItem, isActive } = req.query;
    
    const query = { tenantId };
    if (type) query.type = type;
    if (menuItem) query.menuItem = menuItem;
    if (isActive !== undefined) query.isActive = isActive === 'true';
    
    const rules = await PricingRule.find(query)
      .populate('menuItem', 'name price')
      .sort({ priority: -1, createdAt: -1 });
    
    res.json(rules);
  } catch (error) {
    console.error('Error fetching pricing rules:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get pricing rules for a specific menu item
router.get('/menu-item/:menuItemId', async (req, res) => {
  try {
    const tenantId = getCurrentTenantId();
    const rules = await PricingRule.find({
      tenantId,
      menuItem: req.params.menuItemId,
      isActive: true
    }).sort({ priority: -1 });
    
    res.json(rules);
  } catch (error) {
    console.error('Error fetching menu item pricing rules:', error);
    res.status(500).json({ error: error.message });
  }
});

// Calculate price for a menu item with rules applied
router.post('/calculate-price', [
  body('menuItemId').isMongoId().withMessage('Valid menu item ID required'),
  body('quantity').optional().isInt({ min: 1 }).withMessage('Quantity must be positive'),
  body('context').optional().isObject()
], validate, async (req, res) => {
  try {
    const tenantId = getCurrentTenantId();
    const { menuItemId, quantity = 1, context = {} } = req.body;
    
    // Get menu item base price
    const menuItem = await MenuItem.findOne({ _id: menuItemId, tenantId });
    if (!menuItem) {
      return res.status(404).json({ error: 'Menu item not found' });
    }
    
    // Calculate best price with rules
    const pricing = await PricingRule.getBestPrice(
      tenantId,
      menuItemId,
      menuItem.price,
      quantity,
      context
    );
    
    res.json({
      menuItem: {
        id: menuItem._id,
        name: menuItem.name,
        basePrice: menuItem.price
      },
      quantity,
      pricing
    });
  } catch (error) {
    console.error('Error calculating price:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create pricing rule
router.post('/', [
  body('menuItem').isMongoId().withMessage('Valid menu item ID required'),
  body('name').notEmpty().withMessage('Name is required'),
  body('type').isIn(['time_based', 'day_of_week', 'quantity_based', 'combo', 'bogo', 'percentage_discount', 'fixed_discount']).withMessage('Invalid rule type'),
  body('priority').optional().isInt({ min: 0 }),
  body('timeRules').optional().isArray(),
  body('dayOfWeekRules').optional().isArray(),
  body('quantityRules').optional().isArray(),
  body('validFrom').optional().isISO8601(),
  body('validUntil').optional().isISO8601()
], validate, async (req, res) => {
  try {
    const tenantId = getCurrentTenantId();
    const ruleData = { ...req.body, tenantId };
    
    // Verify menu item exists and belongs to tenant
    const menuItem = await MenuItem.findOne({
      _id: ruleData.menuItem,
      tenantId
    });
    
    if (!menuItem) {
      return res.status(404).json({ error: 'Menu item not found' });
    }
    
    // Validate time rules format
    if (ruleData.type === 'time_based' && ruleData.timeRules) {
      for (const rule of ruleData.timeRules) {
        if (!isValidTimeFormat(rule.startTime) || !isValidTimeFormat(rule.endTime)) {
          return res.status(400).json({ error: 'Invalid time format. Use HH:MM' });
        }
      }
    }
    
    const rule = new PricingRule(ruleData);
    await rule.save();
    
    await rule.populate('menuItem', 'name price');
    
    res.status(201).json({
      success: true,
      rule,
      message: 'Pricing rule created successfully'
    });
  } catch (error) {
    console.error('Error creating pricing rule:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update pricing rule
router.put('/:id', [
  body('name').optional().notEmpty(),
  body('priority').optional().isInt({ min: 0 }),
  body('isActive').optional().isBoolean(),
  body('timeRules').optional().isArray(),
  body('dayOfWeekRules').optional().isArray(),
  body('quantityRules').optional().isArray(),
  body('validFrom').optional().isISO8601(),
  body('validUntil').optional().isISO8601()
], validate, async (req, res) => {
  try {
    const tenantId = getCurrentTenantId();
    const rule = await PricingRule.findOne({
      _id: req.params.id,
      tenantId
    });
    
    if (!rule) {
      return res.status(404).json({ error: 'Pricing rule not found' });
    }
    
    // Validate time rules format if updating
    if (req.body.timeRules) {
      for (const timeRule of req.body.timeRules) {
        if (!isValidTimeFormat(timeRule.startTime) || !isValidTimeFormat(timeRule.endTime)) {
          return res.status(400).json({ error: 'Invalid time format. Use HH:MM' });
        }
      }
    }
    
    // Update fields
    Object.assign(rule, req.body);
    await rule.save();
    
    await rule.populate('menuItem', 'name price');
    
    res.json({
      success: true,
      rule,
      message: 'Pricing rule updated successfully'
    });
  } catch (error) {
    console.error('Error updating pricing rule:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete pricing rule
router.delete('/:id', async (req, res) => {
  try {
    const tenantId = getCurrentTenantId();
    const rule = await PricingRule.findOneAndDelete({
      _id: req.params.id,
      tenantId
    });
    
    if (!rule) {
      return res.status(404).json({ error: 'Pricing rule not found' });
    }
    
    res.json({
      success: true,
      message: 'Pricing rule deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting pricing rule:', error);
    res.status(500).json({ error: error.message });
  }
});

// Bulk create pricing rules
router.post('/bulk-create', [
  body('rules').isArray({ min: 1 }).withMessage('Rules array required'),
  body('rules.*.menuItem').isMongoId(),
  body('rules.*.name').notEmpty(),
  body('rules.*.type').isIn(['time_based', 'day_of_week', 'quantity_based', 'combo', 'bogo'])
], validate, async (req, res) => {
  try {
    const tenantId = getCurrentTenantId();
    const { rules } = req.body;
    const results = [];
    const errors = [];
    
    for (const ruleData of rules) {
      try {
        // Verify menu item
        const menuItem = await MenuItem.findOne({
          _id: ruleData.menuItem,
          tenantId
        });
        
        if (!menuItem) {
          errors.push({ menuItem: ruleData.menuItem, error: 'Menu item not found' });
          continue;
        }
        
        const rule = await PricingRule.create({
          ...ruleData,
          tenantId
        });
        
        results.push({ menuItem: menuItem.name, _id: rule._id, name: rule.name });
      } catch (error) {
        errors.push({ menuItem: ruleData.menuItem, error: error.message });
      }
    }
    
    res.json({
      success: errors.length === 0,
      created: results.length,
      failed: errors.length,
      results,
      errors
    });
  } catch (error) {
    console.error('Error bulk creating pricing rules:', error);
    res.status(500).json({ error: error.message });
  }
});

// Toggle rule active status
router.patch('/:id/toggle-active', async (req, res) => {
  try {
    const tenantId = getCurrentTenantId();
    const rule = await PricingRule.findOne({
      _id: req.params.id,
      tenantId
    });
    
    if (!rule) {
      return res.status(404).json({ error: 'Pricing rule not found' });
    }
    
    rule.isActive = !rule.isActive;
    await rule.save();
    
    res.json({
      success: true,
      isActive: rule.isActive,
      message: `Pricing rule ${rule.isActive ? 'activated' : 'deactivated'} successfully`
    });
  } catch (error) {
    console.error('Error toggling pricing rule:', error);
    res.status(500).json({ error: error.message });
  }
});

// Helper function to validate time format
function isValidTimeFormat(time) {
  if (!time) return false;
  const regex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
  return regex.test(time);
}

module.exports = router;