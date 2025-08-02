const express = require('express');
const router = express.Router();
const MenuSchedule = require('../../models/MenuSchedule');
const MenuItem = require('../../models/MenuItem');
const ModifierGroup = require('../../models/ModifierGroup');
const { authenticate, authorize } = require('../../middleware/auth');
const { enterpriseTenantIsolation } = require('../../middleware/enterpriseTenantIsolation');

// Helper to make authorize work with both patterns
const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    // Admin always has access
    if (req.user.role === 'admin') {
      return next();
    }
    
    // Check if user's role is in allowed roles
    if (roles.includes(req.user.role)) {
      return next();
    }
    
    return res.status(403).json({ error: 'Access denied' });
  };
};

// Apply authentication and tenant isolation to all routes
router.use(authenticate);
router.use(authorizeRoles('admin', 'manager'));
router.use(enterpriseTenantIsolation);

// Get all menu schedules
router.get('/', async (req, res) => {
  try {
    const { isActive, channelId } = req.query;
    
    const query = { tenantId: req.tenant.tenantId };
    
    if (isActive !== undefined) {
      query.isActive = isActive === 'true';
    }
    
    const schedules = await MenuSchedule.find(query)
      .populate('timeSlots.menuItems', 'name nameAr price image')
      .populate('timeSlots.modifierGroups', 'name')
      .populate('dateSlots.menuItems', 'name nameAr price image')
      .populate('dateSlots.modifierGroups', 'name')
      .populate('applicableChannels', 'name displayName')
      .sort('-priority createdAt');
    
    // Filter by channel if specified
    let filteredSchedules = schedules;
    if (channelId) {
      filteredSchedules = schedules.filter(schedule => 
        schedule.applicableChannels.length === 0 || 
        schedule.applicableChannels.some(channel => channel._id.toString() === channelId)
      );
    }
    
    res.json({
      success: true,
      data: filteredSchedules
    });
  } catch (error) {
    console.error('Error fetching menu schedules:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch menu schedules'
    });
  }
});

// Get active menu for current time
router.get('/active', async (req, res) => {
  try {
    const { channelId } = req.query;
    
    const schedules = await MenuSchedule.getActiveSchedules(req.tenant.tenantId, channelId);
    
    const activeSlots = [];
    const upcomingSlots = [];
    
    for (const schedule of schedules) {
      const currentSlot = schedule.getCurrentSlot();
      if (currentSlot) {
        activeSlots.push({
          schedule: {
            _id: schedule._id,
            name: schedule.name,
            priority: schedule.priority
          },
          slot: currentSlot,
          type: 'current'
        });
      }
      
      if (schedule.settings.showUpcomingItems) {
        const upcomingSlot = schedule.getUpcomingSlot(schedule.settings.upcomingItemsMinutes);
        if (upcomingSlot) {
          upcomingSlots.push({
            schedule: {
              _id: schedule._id,
              name: schedule.name,
              priority: schedule.priority
            },
            slot: upcomingSlot,
            type: 'upcoming'
          });
        }
      }
    }
    
    // Get all available menu items based on active schedules
    const availableItemIds = new Set();
    const availableCategories = new Set();
    const availableModifierGroupIds = new Set();
    
    activeSlots.forEach(({ slot }) => {
      slot.menuItems.forEach(id => availableItemIds.add(id.toString()));
      slot.categories.forEach(cat => availableCategories.add(cat));
      slot.modifierGroups.forEach(id => availableModifierGroupIds.add(id.toString()));
    });
    
    upcomingSlots.forEach(({ slot }) => {
      slot.menuItems.forEach(id => availableItemIds.add(id.toString()));
      slot.categories.forEach(cat => availableCategories.add(cat));
      slot.modifierGroups.forEach(id => availableModifierGroupIds.add(id.toString()));
    });
    
    res.json({
      success: true,
      data: {
        activeSlots,
        upcomingSlots,
        availableItems: Array.from(availableItemIds),
        availableCategories: Array.from(availableCategories),
        availableModifierGroups: Array.from(availableModifierGroupIds)
      }
    });
  } catch (error) {
    console.error('Error fetching active menu:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch active menu'
    });
  }
});

// Get single schedule
router.get('/:id', async (req, res) => {
  try {
    const schedule = await MenuSchedule.findOne({
      _id: req.params.id,
      tenantId: req.tenant.tenantId
    })
      .populate('timeSlots.menuItems')
      .populate('timeSlots.modifierGroups')
      .populate('dateSlots.menuItems')
      .populate('dateSlots.modifierGroups')
      .populate('applicableChannels');
    
    if (!schedule) {
      return res.status(404).json({
        success: false,
        error: 'Schedule not found'
      });
    }
    
    res.json({
      success: true,
      data: schedule
    });
  } catch (error) {
    console.error('Error fetching menu schedule:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch menu schedule'
    });
  }
});

// Create new schedule
router.post('/', async (req, res) => {
  try {
    const scheduleData = {
      ...req.body,
      tenantId: req.tenant.tenantId
    };
    
    const schedule = new MenuSchedule(scheduleData);
    await schedule.save();
    
    const populatedSchedule = await MenuSchedule.findById(schedule._id)
      .populate('timeSlots.menuItems', 'name nameAr price image')
      .populate('timeSlots.modifierGroups', 'name')
      .populate('dateSlots.menuItems', 'name nameAr price image')
      .populate('dateSlots.modifierGroups', 'name')
      .populate('applicableChannels', 'name displayName');
    
    res.status(201).json({
      success: true,
      data: populatedSchedule
    });
  } catch (error) {
    console.error('Error creating menu schedule:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create menu schedule'
    });
  }
});

// Update schedule
router.put('/:id', async (req, res) => {
  try {
    const schedule = await MenuSchedule.findOneAndUpdate(
      {
        _id: req.params.id,
        tenantId: req.tenant.tenantId
      },
      {
        ...req.body,
        updatedAt: new Date()
      },
      { new: true }
    )
      .populate('timeSlots.menuItems', 'name nameAr price image')
      .populate('timeSlots.modifierGroups', 'name')
      .populate('dateSlots.menuItems', 'name nameAr price image')
      .populate('dateSlots.modifierGroups', 'name')
      .populate('applicableChannels', 'name displayName');
    
    if (!schedule) {
      return res.status(404).json({
        success: false,
        error: 'Schedule not found'
      });
    }
    
    res.json({
      success: true,
      data: schedule
    });
  } catch (error) {
    console.error('Error updating menu schedule:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update menu schedule'
    });
  }
});

// Delete schedule
router.delete('/:id', async (req, res) => {
  try {
    const schedule = await MenuSchedule.findOneAndDelete({
      _id: req.params.id,
      tenantId: req.tenant.tenantId
    });
    
    if (!schedule) {
      return res.status(404).json({
        success: false,
        error: 'Schedule not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Schedule deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting menu schedule:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete menu schedule'
    });
  }
});

// Initialize default schedules
router.post('/initialize', async (req, res) => {
  try {
    // Check if schedules already exist
    const existingSchedules = await MenuSchedule.find({ 
      tenantId: req.tenant.tenantId 
    });
    
    if (existingSchedules.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Schedules already exist for this tenant'
      });
    }
    
    // Get default schedules
    const defaultSchedules = MenuSchedule.getDefaultSchedules();
    
    // Create schedules
    const schedules = await Promise.all(
      defaultSchedules.map(scheduleData => 
        MenuSchedule.create({
          ...scheduleData,
          tenantId: req.tenant.tenantId
        })
      )
    );
    
    res.status(201).json({
      success: true,
      data: schedules,
      message: 'Default schedules created successfully'
    });
  } catch (error) {
    console.error('Error initializing default schedules:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to initialize default schedules'
    });
  }
});

// Check item availability
router.get('/check-availability/:itemId', async (req, res) => {
  try {
    const { channelId } = req.query;
    const { itemId } = req.params;
    
    const schedules = await MenuSchedule.getActiveSchedules(req.tenant.tenantId, channelId);
    
    let isAvailable = false;
    let availableIn = null;
    let reason = 'No active schedule';
    
    for (const schedule of schedules) {
      const available = schedule.isItemAvailable(itemId);
      if (available) {
        isAvailable = true;
        reason = 'Available in current schedule';
        break;
      }
      
      // Check if item will be available soon
      if (schedule.settings.showUpcomingItems) {
        const upcomingSlot = schedule.getUpcomingSlot(schedule.settings.upcomingItemsMinutes);
        if (upcomingSlot && upcomingSlot.menuItems.some(id => id.toString() === itemId)) {
          availableIn = {
            slot: upcomingSlot.name,
            startTime: upcomingSlot.startTime
          };
          reason = 'Available in upcoming schedule';
        }
      }
    }
    
    // If no schedules or item not in any schedule, check hideUnavailableItems setting
    if (!isAvailable && schedules.length > 0) {
      const allowUnscheduled = schedules.some(s => !s.settings.hideUnavailableItems);
      if (allowUnscheduled) {
        isAvailable = true;
        reason = 'Available (not scheduled)';
      }
    }
    
    res.json({
      success: true,
      data: {
        itemId,
        isAvailable,
        availableIn,
        reason
      }
    });
  } catch (error) {
    console.error('Error checking item availability:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check item availability'
    });
  }
});

module.exports = router;