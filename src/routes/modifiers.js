const express = require('express');
const router = express.Router();
const ModifierGroup = require('../models/ModifierGroup');
const MenuItem = require('../models/MenuItem');
const { authenticate, authorize } = require('../middleware/auth');
const { enterpriseTenantIsolation } = require('../middleware/enterpriseTenantIsolation');
const { param, body, validationResult } = require('express-validator');

// Get all modifier groups
router.get('/', authenticate, enterpriseTenantIsolation, async (req, res) => {
  try {
    const { active, menuItem } = req.query;
    
    const query = { tenantId: req.tenant.tenantId };
    
    if (active !== undefined) {
      query.isActive = active === 'true';
    }
    
    if (menuItem) {
      query.menuItems = menuItem;
    }
    
    const modifierGroups = await ModifierGroup.find(query)
      .sort({ displayOrder: 1, name: 1 })
      .lean();
    
    res.json({
      success: true,
      data: modifierGroups
    });
  } catch (error) {
    console.error('Error fetching modifier groups:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch modifier groups' 
    });
  }
});

// Get single modifier group
router.get('/:id', authenticate, enterpriseTenantIsolation, [
  param('id').isMongoId().withMessage('Invalid modifier group ID')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }
  
  try {
    const modifierGroup = await ModifierGroup.findOne({
      _id: req.params.id,
      tenantId: req.tenant.tenantId
    }).populate('menuItems', 'name nameAr');
    
    if (!modifierGroup) {
      return res.status(404).json({ 
        success: false, 
        error: 'Modifier group not found' 
      });
    }
    
    res.json({
      success: true,
      data: modifierGroup
    });
  } catch (error) {
    console.error('Error fetching modifier group:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch modifier group' 
    });
  }
});

// Create modifier group
router.post('/', authenticate, authorize(['menu.manage']), enterpriseTenantIsolation, [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('type').isIn(['single', 'multiple']).withMessage('Invalid type'),
  body('required').isBoolean().withMessage('Required must be boolean'),
  body('minSelections').isInt({ min: 0 }).withMessage('Min selections must be non-negative'),
  body('maxSelections').isInt({ min: 1 }).withMessage('Max selections must be positive'),
  body('options').isArray({ min: 1 }).withMessage('At least one option is required'),
  body('options.*.name').trim().notEmpty().withMessage('Option name is required'),
  body('options.*.price').isFloat({ min: 0 }).withMessage('Option price must be non-negative')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }
  
  try {
    const modifierGroup = new ModifierGroup({
      ...req.body,
      tenantId: req.tenant.tenantId
    });
    
    await modifierGroup.save();
    
    res.status(201).json({
      success: true,
      message: 'Modifier group created successfully',
      data: modifierGroup
    });
  } catch (error) {
    console.error('Error creating modifier group:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to create modifier group' 
    });
  }
});

// Update modifier group
router.put('/:id', authenticate, authorize(['menu.manage']), enterpriseTenantIsolation, [
  param('id').isMongoId().withMessage('Invalid modifier group ID'),
  body('name').optional().trim().notEmpty().withMessage('Name cannot be empty'),
  body('type').optional().isIn(['single', 'multiple']).withMessage('Invalid type'),
  body('minSelections').optional().isInt({ min: 0 }).withMessage('Min selections must be non-negative'),
  body('maxSelections').optional().isInt({ min: 1 }).withMessage('Max selections must be positive'),
  body('options.*.name').optional().trim().notEmpty().withMessage('Option name cannot be empty'),
  body('options.*.price').optional().isFloat({ min: 0 }).withMessage('Option price must be non-negative')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }
  
  try {
    const updates = { ...req.body };
    delete updates.tenantId;
    delete updates.analytics; // Prevent direct analytics manipulation
    
    const modifierGroup = await ModifierGroup.findOneAndUpdate(
      { _id: req.params.id, tenantId: req.tenant.tenantId },
      updates,
      { new: true, runValidators: true }
    );
    
    if (!modifierGroup) {
      return res.status(404).json({ 
        success: false, 
        error: 'Modifier group not found' 
      });
    }
    
    res.json({
      success: true,
      message: 'Modifier group updated successfully',
      data: modifierGroup
    });
  } catch (error) {
    console.error('Error updating modifier group:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to update modifier group' 
    });
  }
});

// Delete modifier group
router.delete('/:id', authenticate, authorize(['menu.manage']), enterpriseTenantIsolation, [
  param('id').isMongoId().withMessage('Invalid modifier group ID')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }
  
  try {
    // Check if modifier group is in use
    const menuItemsUsingModifier = await MenuItem.find({
      tenantId: req.tenant.tenantId,
      'modifierGroups.group': req.params.id
    }).countDocuments();
    
    if (menuItemsUsingModifier > 0) {
      return res.status(400).json({ 
        success: false, 
        error: `Cannot delete modifier group. It is used by ${menuItemsUsingModifier} menu item(s)` 
      });
    }
    
    const modifierGroup = await ModifierGroup.findOneAndDelete({
      _id: req.params.id,
      tenantId: req.tenant.tenantId
    });
    
    if (!modifierGroup) {
      return res.status(404).json({ 
        success: false, 
        error: 'Modifier group not found' 
      });
    }
    
    res.json({
      success: true,
      message: 'Modifier group deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting modifier group:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to delete modifier group' 
    });
  }
});

// Add modifier group to menu item
router.post('/:id/menu-items/:menuItemId', 
  authenticate, 
  authorize(['menu.manage']), 
  enterpriseTenantIsolation, 
  [
    param('id').isMongoId().withMessage('Invalid modifier group ID'),
    param('menuItemId').isMongoId().withMessage('Invalid menu item ID'),
    body('displayOrder').optional().isInt({ min: 0 }).withMessage('Display order must be non-negative')
  ], 
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }
    
    try {
      // Verify both exist
      const [modifierGroup, menuItem] = await Promise.all([
        ModifierGroup.findOne({ _id: req.params.id, tenantId: req.tenant.tenantId }),
        MenuItem.findOne({ _id: req.params.menuItemId, tenantId: req.tenant.tenantId })
      ]);
      
      if (!modifierGroup) {
        return res.status(404).json({ 
          success: false, 
          error: 'Modifier group not found' 
        });
      }
      
      if (!menuItem) {
        return res.status(404).json({ 
          success: false, 
          error: 'Menu item not found' 
        });
      }
      
      // Check if already added
      const alreadyAdded = menuItem.modifierGroups.some(
        mg => mg.group.toString() === req.params.id
      );
      
      if (alreadyAdded) {
        return res.status(400).json({ 
          success: false, 
          error: 'Modifier group already added to this menu item' 
        });
      }
      
      // Add to menu item
      menuItem.modifierGroups.push({
        group: req.params.id,
        displayOrder: req.body.displayOrder || 0
      });
      
      await menuItem.save();
      
      // Update modifier group's menu items list
      if (!modifierGroup.menuItems.includes(req.params.menuItemId)) {
        modifierGroup.menuItems.push(req.params.menuItemId);
        await modifierGroup.save();
      }
      
      res.json({
        success: true,
        message: 'Modifier group added to menu item successfully'
      });
    } catch (error) {
      console.error('Error adding modifier group to menu item:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to add modifier group to menu item' 
      });
    }
});

// Remove modifier group from menu item
router.delete('/:id/menu-items/:menuItemId', 
  authenticate, 
  authorize(['menu.manage']), 
  enterpriseTenantIsolation,
  [
    param('id').isMongoId().withMessage('Invalid modifier group ID'),
    param('menuItemId').isMongoId().withMessage('Invalid menu item ID')
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }
    
    try {
      const [modifierGroup, menuItem] = await Promise.all([
        ModifierGroup.findOne({ _id: req.params.id, tenantId: req.tenant.tenantId }),
        MenuItem.findOne({ _id: req.params.menuItemId, tenantId: req.tenant.tenantId })
      ]);
      
      if (!modifierGroup || !menuItem) {
        return res.status(404).json({ 
          success: false, 
          error: 'Modifier group or menu item not found' 
        });
      }
      
      // Remove from menu item
      menuItem.modifierGroups = menuItem.modifierGroups.filter(
        mg => mg.group.toString() !== req.params.id
      );
      
      await menuItem.save();
      
      // Remove from modifier group's menu items list
      modifierGroup.menuItems = modifierGroup.menuItems.filter(
        mi => mi.toString() !== req.params.menuItemId
      );
      
      await modifierGroup.save();
      
      res.json({
        success: true,
        message: 'Modifier group removed from menu item successfully'
      });
    } catch (error) {
      console.error('Error removing modifier group from menu item:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to remove modifier group from menu item' 
      });
    }
});

// Get analytics for modifier group
router.get('/:id/analytics', 
  authenticate, 
  authorize(['menu.view', 'analytics.view']), 
  enterpriseTenantIsolation,
  [
    param('id').isMongoId().withMessage('Invalid modifier group ID')
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }
    
    try {
      const modifierGroup = await ModifierGroup.findOne({
        _id: req.params.id,
        tenantId: req.tenant.tenantId
      });
      
      if (!modifierGroup) {
        return res.status(404).json({ 
          success: false, 
          error: 'Modifier group not found' 
        });
      }
      
      res.json({
        success: true,
        data: {
          name: modifierGroup.name,
          totalUsage: modifierGroup.analytics.totalUsage,
          lastUsed: modifierGroup.analytics.lastUsed,
          popularOptions: modifierGroup.analytics.popularOptions,
          optionPerformance: modifierGroup.options.map(option => {
            const usage = modifierGroup.analytics.popularOptions.find(
              po => po.optionName === option.name
            );
            return {
              name: option.name,
              price: option.price,
              usage: usage ? usage.count : 0,
              usagePercentage: modifierGroup.analytics.totalUsage > 0 
                ? ((usage ? usage.count : 0) / modifierGroup.analytics.totalUsage * 100).toFixed(1)
                : 0
            };
          }).sort((a, b) => b.usage - a.usage)
        }
      });
    } catch (error) {
      console.error('Error fetching modifier group analytics:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to fetch modifier group analytics' 
      });
    }
});

module.exports = router;