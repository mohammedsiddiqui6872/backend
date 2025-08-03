const express = require('express');
const router = express.Router();
const ShiftTemplate = require('../models/ShiftTemplate');
const Shift = require('../models/Shift');
const { authenticate, authorize } = require('../middleware/auth');
const { enterpriseTenantIsolation } = require('../middleware/enterpriseTenantIsolation');
const { startOfWeek, endOfWeek, addDays, format } = require('date-fns');

// Get all shift templates
router.get('/', authenticate, authorize(['shifts.view']), enterpriseTenantIsolation, async (req, res) => {
  try {
    const { isActive = true, pattern } = req.query;
    
    const query = { tenantId: req.tenant.tenantId };
    if (isActive !== undefined) query.isActive = isActive === 'true';
    if (pattern) query.pattern = pattern;
    
    const templates = await ShiftTemplate.find(query)
      .populate('createdBy', 'name email')
      .sort({ usageCount: -1, name: 1 })
      .lean();
    
    res.json({ success: true, data: templates });
  } catch (error) {
    console.error('Error fetching shift templates:', error);
    res.status(500).json({ success: false, message: 'Error fetching shift templates' });
  }
});

// Get template by ID
router.get('/:id', authenticate, authorize(['shifts.view']), enterpriseTenantIsolation, async (req, res) => {
  try {
    const template = await ShiftTemplate.findOne({ 
      _id: req.params.id,
      tenantId: req.tenant.tenantId 
    })
    .populate('createdBy', 'name email')
    .lean();
    
    if (!template) {
      return res.status(404).json({ success: false, message: 'Template not found' });
    }
    
    res.json({ success: true, data: template });
  } catch (error) {
    console.error('Error fetching template:', error);
    res.status(500).json({ success: false, message: 'Error fetching template' });
  }
});

// Create new template
router.post('/', authenticate, authorize(['shifts.manage']), enterpriseTenantIsolation, async (req, res) => {
  try {
    const { name, description, pattern, shifts } = req.body;
    
    // Validate shifts data
    if (!shifts || shifts.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Template must have at least one shift' 
      });
    }
    
    const template = new ShiftTemplate({
      tenantId: req.tenant.tenantId,
      name,
      description,
      pattern,
      shifts,
      createdBy: req.user.id
    });
    
    await template.save();
    await template.populate('createdBy', 'name email');
    
    res.status(201).json({ 
      success: true, 
      message: 'Template created successfully',
      data: template 
    });
  } catch (error) {
    console.error('Error creating template:', error);
    res.status(500).json({ success: false, message: 'Error creating template' });
  }
});

// Update template
router.put('/:id', authenticate, authorize(['shifts.manage']), enterpriseTenantIsolation, async (req, res) => {
  try {
    const updates = { ...req.body };
    delete updates.tenantId;
    delete updates.createdBy;
    delete updates.usageCount;
    delete updates.lastUsed;
    
    const template = await ShiftTemplate.findOneAndUpdate(
      { _id: req.params.id, tenantId: req.tenant.tenantId },
      updates,
      { new: true, runValidators: true }
    ).populate('createdBy', 'name email');
    
    if (!template) {
      return res.status(404).json({ success: false, message: 'Template not found' });
    }
    
    res.json({ 
      success: true, 
      message: 'Template updated successfully',
      data: template 
    });
  } catch (error) {
    console.error('Error updating template:', error);
    res.status(500).json({ success: false, message: 'Error updating template' });
  }
});

// Delete template
router.delete('/:id', authenticate, authorize(['shifts.manage']), enterpriseTenantIsolation, async (req, res) => {
  try {
    const template = await ShiftTemplate.findOneAndDelete({ 
      _id: req.params.id,
      tenantId: req.tenant.tenantId
    });
    
    if (!template) {
      return res.status(404).json({ success: false, message: 'Template not found' });
    }
    
    res.json({ 
      success: true, 
      message: 'Template deleted successfully' 
    });
  } catch (error) {
    console.error('Error deleting template:', error);
    res.status(500).json({ success: false, message: 'Error deleting template' });
  }
});

// Apply template to a specific week
router.post('/:id/apply', authenticate, authorize(['shifts.manage']), enterpriseTenantIsolation, async (req, res) => {
  try {
    const { startDate, employees } = req.body;
    
    if (!startDate) {
      return res.status(400).json({ 
        success: false, 
        message: 'Start date is required' 
      });
    }
    
    // Fetch the template
    const template = await ShiftTemplate.findOne({ 
      _id: req.params.id,
      tenantId: req.tenant.tenantId,
      isActive: true
    });
    
    if (!template) {
      return res.status(404).json({ success: false, message: 'Template not found or inactive' });
    }
    
    // Calculate week range
    const weekStart = startOfWeek(new Date(startDate), { weekStartsOn: 1 });
    const shiftsCreated = [];
    const errors = [];
    
    // Apply template shifts
    for (const templateShift of template.shifts) {
      const shiftDate = addDays(weekStart, templateShift.dayOfWeek === 0 ? 6 : templateShift.dayOfWeek - 1);
      
      // Determine which employees to assign
      const assignedEmployees = employees && employees.length > 0 
        ? employees.slice(0, templateShift.maxStaff || 1)
        : [null]; // Create unassigned shift
      
      for (const employeeId of assignedEmployees) {
        try {
          // Check for conflicts if employee is specified
          if (employeeId) {
            const conflict = await Shift.findOne({
              tenantId: req.tenant.tenantId,
              employee: employeeId,
              date: shiftDate,
              status: { $nin: ['cancelled'] }
            });
            
            if (conflict) {
              errors.push({
                date: format(shiftDate, 'yyyy-MM-dd'),
                employee: employeeId,
                reason: 'Employee already has a shift on this date'
              });
              continue;
            }
          }
          
          const shift = new Shift({
            tenantId: req.tenant.tenantId,
            employee: employeeId,
            date: shiftDate,
            shiftType: templateShift.shiftType,
            scheduledTimes: {
              start: templateShift.scheduledTimes.start,
              end: templateShift.scheduledTimes.end
            },
            department: templateShift.department,
            position: templateShift.position,
            notes: `Created from template: ${template.name}`
          });
          
          await shift.save();
          shiftsCreated.push(shift);
        } catch (error) {
          console.error('Error creating shift from template:', error);
          errors.push({
            date: format(shiftDate, 'yyyy-MM-dd'),
            employee: employeeId,
            reason: error.message
          });
        }
      }
    }
    
    // Record template usage
    await template.recordUsage();
    
    res.json({ 
      success: true, 
      message: `Template applied successfully. ${shiftsCreated.length} shifts created.`,
      data: {
        created: shiftsCreated.length,
        errors: errors.length,
        details: {
          shiftsCreated,
          errors
        }
      }
    });
  } catch (error) {
    console.error('Error applying template:', error);
    res.status(500).json({ success: false, message: 'Error applying template' });
  }
});

// Get popular templates (most used)
router.get('/stats/popular', authenticate, authorize(['shifts.view']), enterpriseTenantIsolation, async (req, res) => {
  try {
    const templates = await ShiftTemplate.find({ 
      tenantId: req.tenant.tenantId,
      isActive: true,
      usageCount: { $gt: 0 }
    })
    .sort({ usageCount: -1 })
    .limit(5)
    .select('name description pattern usageCount lastUsed')
    .lean();
    
    res.json({ success: true, data: templates });
  } catch (error) {
    console.error('Error fetching popular templates:', error);
    res.status(500).json({ success: false, message: 'Error fetching popular templates' });
  }
});

module.exports = router;