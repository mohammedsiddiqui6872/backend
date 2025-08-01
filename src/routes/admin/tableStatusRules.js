const express = require('express');
const router = express.Router();
const TableStatusRule = require('../../models/TableStatusRule');
const { authenticate, authorize } = require('../../middleware/auth');

// Apply middleware
router.use(authenticate);
router.use(authorize('admin', 'manager'));

// Get all status rules
router.get('/', async (req, res) => {
  try {
    const rules = await TableStatusRule.find({ 
      tenantId: req.tenantId 
    })
    .sort({ priority: -1, name: 1 })
    .populate('createdBy', 'name email')
    .populate('updatedBy', 'name email');

    res.json({
      success: true,
      data: rules
    });
  } catch (error) {
    console.error('Error fetching status rules:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch status rules' 
    });
  }
});

// Get single rule
router.get('/:id', async (req, res) => {
  try {
    const rule = await TableStatusRule.findOne({
      _id: req.params.id,
      tenantId: req.tenantId
    })
    .populate('createdBy', 'name email')
    .populate('updatedBy', 'name email');

    if (!rule) {
      return res.status(404).json({ 
        success: false, 
        error: 'Rule not found' 
      });
    }

    res.json({
      success: true,
      data: rule
    });
  } catch (error) {
    console.error('Error fetching status rule:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch status rule' 
    });
  }
});

// Create new rule
router.post('/', async (req, res) => {
  try {
    const ruleData = {
      ...req.body,
      tenantId: req.tenantId,
      createdBy: req.user._id,
      updatedBy: req.user._id
    };

    const rule = new TableStatusRule(ruleData);
    await rule.save();

    const populatedRule = await TableStatusRule.findById(rule._id)
      .populate('createdBy', 'name email')
      .populate('updatedBy', 'name email');

    res.status(201).json({
      success: true,
      data: populatedRule,
      message: 'Status rule created successfully'
    });
  } catch (error) {
    console.error('Error creating status rule:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Failed to create status rule' 
    });
  }
});

// Update rule
router.put('/:id', async (req, res) => {
  try {
    const updates = {
      ...req.body,
      updatedBy: req.user._id,
      updatedAt: new Date()
    };

    // Remove fields that shouldn't be updated
    delete updates._id;
    delete updates.tenantId;
    delete updates.createdBy;
    delete updates.createdAt;

    const rule = await TableStatusRule.findOneAndUpdate(
      {
        _id: req.params.id,
        tenantId: req.tenantId
      },
      { $set: updates },
      { new: true, runValidators: true }
    )
    .populate('createdBy', 'name email')
    .populate('updatedBy', 'name email');

    if (!rule) {
      return res.status(404).json({ 
        success: false, 
        error: 'Rule not found' 
      });
    }

    res.json({
      success: true,
      data: rule,
      message: 'Status rule updated successfully'
    });
  } catch (error) {
    console.error('Error updating status rule:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Failed to update status rule' 
    });
  }
});

// Toggle rule active status
router.patch('/:id/toggle', async (req, res) => {
  try {
    const rule = await TableStatusRule.findOne({
      _id: req.params.id,
      tenantId: req.tenantId
    });

    if (!rule) {
      return res.status(404).json({ 
        success: false, 
        error: 'Rule not found' 
      });
    }

    rule.isActive = !rule.isActive;
    rule.updatedBy = req.user._id;
    await rule.save();

    res.json({
      success: true,
      data: rule,
      message: `Rule ${rule.isActive ? 'activated' : 'deactivated'} successfully`
    });
  } catch (error) {
    console.error('Error toggling status rule:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to toggle status rule' 
    });
  }
});

// Delete rule
router.delete('/:id', async (req, res) => {
  try {
    const rule = await TableStatusRule.findOneAndDelete({
      _id: req.params.id,
      tenantId: req.tenantId
    });

    if (!rule) {
      return res.status(404).json({ 
        success: false, 
        error: 'Rule not found' 
      });
    }

    res.json({
      success: true,
      message: 'Status rule deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting status rule:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to delete status rule' 
    });
  }
});

// Test rule conditions
router.post('/:id/test', async (req, res) => {
  try {
    const { context } = req.body;

    const rule = await TableStatusRule.findOne({
      _id: req.params.id,
      tenantId: req.tenantId
    });

    if (!rule) {
      return res.status(404).json({ 
        success: false, 
        error: 'Rule not found' 
      });
    }

    const result = rule.evaluateConditions(context);

    res.json({
      success: true,
      data: {
        ruleName: rule.name,
        conditionsPass: result,
        conditions: rule.conditions,
        evaluatedContext: context
      }
    });
  } catch (error) {
    console.error('Error testing status rule:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to test status rule' 
    });
  }
});

// Reorder rules (update priorities)
router.post('/reorder', async (req, res) => {
  try {
    const { ruleIds } = req.body; // Array of rule IDs in new order

    if (!Array.isArray(ruleIds)) {
      return res.status(400).json({
        success: false,
        error: 'ruleIds must be an array'
      });
    }

    // Update priorities based on order
    const updates = ruleIds.map((ruleId, index) => ({
      updateOne: {
        filter: { 
          _id: ruleId, 
          tenantId: req.tenantId 
        },
        update: { 
          priority: ruleIds.length - index,
          updatedBy: req.user._id,
          updatedAt: new Date()
        }
      }
    }));

    await TableStatusRule.bulkWrite(updates);

    res.json({
      success: true,
      message: 'Rule priorities updated successfully'
    });
  } catch (error) {
    console.error('Error reordering status rules:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to reorder status rules' 
    });
  }
});

module.exports = router;