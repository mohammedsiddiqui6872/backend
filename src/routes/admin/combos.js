const express = require('express');
const router = express.Router();
const Combo = require('../../models/Combo');
const MenuItem = require('../../models/MenuItem');
const { authenticate, authorize } = require('../../middleware/auth');
const { body, param, validationResult } = require('express-validator');
const { getCurrentTenantId } = require('../../middleware/tenantContext');
const cloudinary = require('cloudinary').v2;

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

// Get all combos
router.get('/', async (req, res) => {
  try {
    const tenantId = getCurrentTenantId();
    const { isActive, category } = req.query;
    
    const query = { tenantId };
    if (isActive !== undefined) query.isActive = isActive === 'true';
    if (category) query.category = category;
    
    const combos = await Combo.find(query)
      .populate('items.menuItem', 'name nameAr price image')
      .sort({ displayOrder: 1, createdAt: -1 });
    
    // Calculate savings for each combo
    const combosWithDetails = await Promise.all(
      combos.map(async (combo) => {
        const comboObj = combo.toObject();
        comboObj.originalPrice = await combo.calculateOriginalPrice();
        comboObj.savings = await combo.calculateSavings();
        comboObj.isCurrentlyAvailable = combo.isAvailable();
        return comboObj;
      })
    );
    
    res.json(combosWithDetails);
  } catch (error) {
    console.error('Error fetching combos:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get single combo
router.get('/:id', async (req, res) => {
  try {
    const tenantId = getCurrentTenantId();
    const combo = await Combo.findOne({
      _id: req.params.id,
      tenantId
    }).populate('items.menuItem');
    
    if (!combo) {
      return res.status(404).json({ error: 'Combo not found' });
    }
    
    const comboObj = combo.toObject();
    comboObj.originalPrice = await combo.calculateOriginalPrice();
    comboObj.savings = await combo.calculateSavings();
    comboObj.itemsAvailability = await combo.checkItemsAvailability();
    comboObj.isCurrentlyAvailable = combo.isAvailable();
    
    res.json(comboObj);
  } catch (error) {
    console.error('Error fetching combo:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create combo
router.post('/', [
  body('name').notEmpty().withMessage('Name is required'),
  body('price').isFloat({ min: 0 }).withMessage('Price must be positive'),
  body('items').isArray({ min: 1 }).withMessage('At least one item required'),
  body('items.*.menuItem').isMongoId().withMessage('Valid menu item ID required'),
  body('items.*.quantity').optional().isInt({ min: 1 })
], validate, async (req, res) => {
  try {
    const tenantId = getCurrentTenantId();
    const comboData = { ...req.body, tenantId };
    
    // Handle base64 image upload
    if (comboData.uploadImage) {
      try {
        let base64Data = comboData.uploadImage;
        
        // Remove data URI prefix if present
        if (base64Data.includes(',')) {
          base64Data = base64Data.split(',')[1];
        }
        
        // Add data URI prefix if not present
        if (!base64Data.startsWith('data:')) {
          base64Data = `data:image/png;base64,${base64Data}`;
        }
        
        const uploadResult = await cloudinary.uploader.upload(base64Data, {
          folder: `tenants/${tenantId}/combos`,
          resource_type: 'auto'
        });
        
        comboData.image = uploadResult.secure_url;
        delete comboData.uploadImage;
      } catch (uploadError) {
        console.error('Cloudinary upload error:', uploadError);
        return res.status(400).json({ error: 'Failed to upload image' });
      }
    }
    
    // Verify all menu items exist and belong to tenant
    for (const item of comboData.items) {
      const menuItem = await MenuItem.findOne({
        _id: item.menuItem,
        tenantId
      });
      
      if (!menuItem) {
        return res.status(400).json({ 
          error: `Menu item ${item.menuItem} not found` 
        });
      }
    }
    
    // Create combo
    const combo = new Combo(comboData);
    
    // Calculate and set savings
    combo.savings = await combo.calculateSavings();
    
    await combo.save();
    
    // Populate for response
    await combo.populate('items.menuItem', 'name nameAr price image');
    
    res.status(201).json({
      success: true,
      combo,
      message: 'Combo created successfully'
    });
  } catch (error) {
    console.error('Error creating combo:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update combo
router.put('/:id', [
  body('name').optional().notEmpty(),
  body('price').optional().isFloat({ min: 0 }),
  body('items').optional().isArray({ min: 1 })
], validate, async (req, res) => {
  try {
    const tenantId = getCurrentTenantId();
    const combo = await Combo.findOne({
      _id: req.params.id,
      tenantId
    });
    
    if (!combo) {
      return res.status(404).json({ error: 'Combo not found' });
    }
    
    const updateData = { ...req.body };
    
    // Handle image upload
    if (updateData.uploadImage) {
      try {
        let base64Data = updateData.uploadImage;
        
        if (base64Data.includes(',')) {
          base64Data = base64Data.split(',')[1];
        }
        
        if (!base64Data.startsWith('data:')) {
          base64Data = `data:image/png;base64,${base64Data}`;
        }
        
        const uploadResult = await cloudinary.uploader.upload(base64Data, {
          folder: `tenants/${tenantId}/combos`,
          resource_type: 'auto'
        });
        
        updateData.image = uploadResult.secure_url;
        delete updateData.uploadImage;
      } catch (uploadError) {
        console.error('Cloudinary upload error:', uploadError);
        return res.status(400).json({ error: 'Failed to upload image' });
      }
    }
    
    // Verify menu items if updating items
    if (updateData.items) {
      for (const item of updateData.items) {
        const menuItem = await MenuItem.findOne({
          _id: item.menuItem,
          tenantId
        });
        
        if (!menuItem) {
          return res.status(400).json({ 
            error: `Menu item ${item.menuItem} not found` 
          });
        }
      }
    }
    
    // Update combo
    Object.assign(combo, updateData);
    
    // Recalculate savings
    combo.savings = await combo.calculateSavings();
    
    await combo.save();
    
    // Populate for response
    await combo.populate('items.menuItem', 'name nameAr price image');
    
    res.json({
      success: true,
      combo,
      message: 'Combo updated successfully'
    });
  } catch (error) {
    console.error('Error updating combo:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete combo
router.delete('/:id', async (req, res) => {
  try {
    const tenantId = getCurrentTenantId();
    const combo = await Combo.findOneAndDelete({
      _id: req.params.id,
      tenantId
    });
    
    if (!combo) {
      return res.status(404).json({ error: 'Combo not found' });
    }
    
    res.json({
      success: true,
      message: 'Combo deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting combo:', error);
    res.status(500).json({ error: error.message });
  }
});

// Toggle combo active status
router.patch('/:id/toggle-active', async (req, res) => {
  try {
    const tenantId = getCurrentTenantId();
    const combo = await Combo.findOne({
      _id: req.params.id,
      tenantId
    });
    
    if (!combo) {
      return res.status(404).json({ error: 'Combo not found' });
    }
    
    combo.isActive = !combo.isActive;
    await combo.save();
    
    res.json({
      success: true,
      isActive: combo.isActive,
      message: `Combo ${combo.isActive ? 'activated' : 'deactivated'} successfully`
    });
  } catch (error) {
    console.error('Error toggling combo:', error);
    res.status(500).json({ error: error.message });
  }
});

// Check combo availability
router.get('/:id/availability', async (req, res) => {
  try {
    const tenantId = getCurrentTenantId();
    const combo = await Combo.findOne({
      _id: req.params.id,
      tenantId
    }).populate('items.menuItem');
    
    if (!combo) {
      return res.status(404).json({ error: 'Combo not found' });
    }
    
    const isAvailable = combo.isAvailable();
    const itemsAvailability = await combo.checkItemsAvailability();
    
    res.json({
      isAvailable: isAvailable && itemsAvailability.available,
      comboAvailable: isAvailable,
      itemsAvailability,
      remainingDailyQuantity: combo.maxDailyQuantity > 0 
        ? combo.maxDailyQuantity - combo.currentDailyQuantity 
        : 'unlimited'
    });
  } catch (error) {
    console.error('Error checking availability:', error);
    res.status(500).json({ error: error.message });
  }
});

// Bulk create combos
router.post('/bulk-create', [
  body('combos').isArray({ min: 1 }).withMessage('Combos array required'),
  body('combos.*.name').notEmpty(),
  body('combos.*.price').isFloat({ min: 0 }),
  body('combos.*.items').isArray({ min: 1 })
], validate, async (req, res) => {
  try {
    const tenantId = getCurrentTenantId();
    const { combos } = req.body;
    const results = [];
    const errors = [];
    
    for (const comboData of combos) {
      try {
        // Verify all menu items
        let allItemsValid = true;
        for (const item of comboData.items) {
          const menuItem = await MenuItem.findOne({
            _id: item.menuItem,
            tenantId
          });
          if (!menuItem) {
            allItemsValid = false;
            break;
          }
        }
        
        if (!allItemsValid) {
          errors.push({ name: comboData.name, error: 'Invalid menu items' });
          continue;
        }
        
        const combo = await Combo.create({
          ...comboData,
          tenantId
        });
        
        combo.savings = await combo.calculateSavings();
        await combo.save();
        
        results.push({ name: combo.name, _id: combo._id });
      } catch (error) {
        errors.push({ name: comboData.name, error: error.message });
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
    console.error('Error bulk creating combos:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;