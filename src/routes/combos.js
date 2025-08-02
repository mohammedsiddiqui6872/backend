const express = require('express');
const router = express.Router();
const Combo = require('../models/Combo');
const PricingRule = require('../models/PricingRule');

// Get all active combos for customers
router.get('/', async (req, res) => {
  try {
    const tenantId = req.tenantId;
    
    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant identification required' });
    }
    
    // Get active combos
    const combos = await Combo.getActiveCombos(tenantId);
    
    // Apply pricing rules to combos if needed
    const context = {
      channel: req.query.channel || 'dine-in',
      tableNumber: req.query.table,
      customerType: req.query.customerType || 'regular'
    };
    
    // Check if there are any combo-specific pricing rules
    const combosWithPricing = await Promise.all(
      combos.map(async (combo) => {
        // Check for pricing rules on the combo itself
        const pricing = await PricingRule.getBestPrice(
          tenantId,
          combo._id,
          combo.price,
          1,
          context
        );
        
        return {
          ...combo,
          originalPrice: combo.price,
          price: pricing.finalPrice,
          hasDiscount: pricing.appliedRule !== null,
          priceDiscount: pricing.discount,
          appliedPriceRule: pricing.appliedRule
        };
      })
    );
    
    res.json({
      success: true,
      combos: combosWithPricing
    });
  } catch (error) {
    console.error('Error fetching combos:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get single combo details
router.get('/:id', async (req, res) => {
  try {
    const tenantId = req.tenantId;
    
    const combo = await Combo.findOne({
      _id: req.params.id,
      tenantId,
      isActive: true
    }).populate('items.menuItem', 'name nameAr price image description available stockQuantity');
    
    if (!combo) {
      return res.status(404).json({ error: 'Combo not found' });
    }
    
    // Check availability
    if (!combo.isAvailable()) {
      return res.status(400).json({ error: 'Combo is not currently available' });
    }
    
    const itemsAvailability = await combo.checkItemsAvailability();
    if (!itemsAvailability.available) {
      return res.status(400).json({ 
        error: 'Some combo items are not available',
        details: itemsAvailability
      });
    }
    
    const comboObj = combo.toObject();
    comboObj.savings = await combo.calculateSavings();
    comboObj.originalPrice = await combo.calculateOriginalPrice();
    comboObj.itemsAvailability = itemsAvailability;
    
    // Apply pricing rules
    const context = {
      channel: req.query.channel || 'dine-in',
      tableNumber: req.query.table,
      customerType: req.query.customerType || 'regular'
    };
    
    const pricing = await PricingRule.getBestPrice(
      tenantId,
      combo._id,
      combo.price,
      1,
      context
    );
    
    comboObj.price = pricing.finalPrice;
    comboObj.hasDiscount = pricing.appliedRule !== null;
    comboObj.priceDiscount = pricing.discount;
    comboObj.appliedPriceRule = pricing.appliedRule;
    
    res.json({
      success: true,
      combo: comboObj
    });
  } catch (error) {
    console.error('Error fetching combo:', error);
    res.status(500).json({ error: error.message });
  }
});

// Validate combo selection (for order processing)
router.post('/:id/validate', async (req, res) => {
  try {
    const tenantId = req.tenantId;
    const { selectedItems, quantity = 1 } = req.body;
    
    const combo = await Combo.findOne({
      _id: req.params.id,
      tenantId,
      isActive: true
    }).populate('items.menuItem');
    
    if (!combo) {
      return res.status(404).json({ error: 'Combo not found' });
    }
    
    // Check availability
    if (!combo.isAvailable()) {
      return res.status(400).json({ error: 'Combo is not currently available' });
    }
    
    // Check daily limit
    if (combo.maxDailyQuantity > 0) {
      const remaining = combo.maxDailyQuantity - combo.currentDailyQuantity;
      if (quantity > remaining) {
        return res.status(400).json({ 
          error: `Only ${remaining} combos available today` 
        });
      }
    }
    
    // Validate selected items if choice-based combo
    if (selectedItems && selectedItems.length > 0) {
      try {
        combo.validateChoices(selectedItems);
      } catch (error) {
        return res.status(400).json({ error: error.message });
      }
    }
    
    // Check items availability
    const itemsAvailability = await combo.checkItemsAvailability();
    if (!itemsAvailability.available) {
      return res.status(400).json({ 
        error: 'Some combo items are not available',
        details: itemsAvailability
      });
    }
    
    // Calculate final price with pricing rules
    const context = {
      channel: req.body.channel || 'dine-in',
      tableNumber: req.body.tableNumber,
      customerType: req.body.customerType || 'regular'
    };
    
    const pricing = await PricingRule.getBestPrice(
      tenantId,
      combo._id,
      combo.price,
      quantity,
      context
    );
    
    res.json({
      success: true,
      valid: true,
      combo: {
        id: combo._id,
        name: combo.name,
        basePrice: combo.price,
        quantity,
        totalPrice: pricing.finalPrice,
        discount: pricing.discount,
        appliedRule: pricing.appliedRule
      }
    });
  } catch (error) {
    console.error('Error validating combo:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;