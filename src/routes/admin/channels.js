const express = require('express');
const router = express.Router();
const MenuChannel = require('../../models/MenuChannel');
const MenuItem = require('../../models/MenuItem');
const { authenticate, authorize } = require('../../middleware/auth');
const { enterpriseTenantIsolation } = require('../../middleware/enterpriseTenantIsolation');

// Get all channels for the tenant
router.get('/', authenticate, authorize(['menu.view']), enterpriseTenantIsolation, async (req, res) => {
  try {
    const channels = await MenuChannel.find({ 
      tenantId: req.tenant.tenantId 
    }).sort('displayOrder');
    
    res.json({
      success: true,
      data: channels
    });
  } catch (error) {
    console.error('Error fetching channels:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch channels' 
    });
  }
});

// Get single channel
router.get('/:id', authenticate, authorize(['menu.view']), enterpriseTenantIsolation, async (req, res) => {
  try {
    const channel = await MenuChannel.findOne({
      _id: req.params.id,
      tenantId: req.tenant.tenantId
    });
    
    if (!channel) {
      return res.status(404).json({ 
        success: false, 
        error: 'Channel not found' 
      });
    }
    
    res.json({
      success: true,
      data: channel
    });
  } catch (error) {
    console.error('Error fetching channel:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch channel' 
    });
  }
});

// Create new channel
router.post('/', authenticate, authorize(['menu.create']), enterpriseTenantIsolation, async (req, res) => {
  try {
    const channelData = {
      ...req.body,
      tenantId: req.tenant.tenantId
    };
    
    const channel = new MenuChannel(channelData);
    await channel.save();
    
    res.status(201).json({
      success: true,
      data: channel
    });
  } catch (error) {
    console.error('Error creating channel:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to create channel' 
    });
  }
});

// Update channel
router.put('/:id', authenticate, authorize(['menu.update']), enterpriseTenantIsolation, async (req, res) => {
  try {
    const channel = await MenuChannel.findOneAndUpdate(
      {
        _id: req.params.id,
        tenantId: req.tenant.tenantId
      },
      req.body,
      { new: true, runValidators: true }
    );
    
    if (!channel) {
      return res.status(404).json({ 
        success: false, 
        error: 'Channel not found' 
      });
    }
    
    res.json({
      success: true,
      data: channel
    });
  } catch (error) {
    console.error('Error updating channel:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to update channel' 
    });
  }
});

// Delete channel
router.delete('/:id', authenticate, authorize(['menu.delete']), enterpriseTenantIsolation, async (req, res) => {
  try {
    const channel = await MenuChannel.findOneAndDelete({
      _id: req.params.id,
      tenantId: req.tenant.tenantId
    });
    
    if (!channel) {
      return res.status(404).json({ 
        success: false, 
        error: 'Channel not found' 
      });
    }
    
    // Remove channel from all menu items
    await MenuItem.updateMany(
      { tenantId: req.tenant.tenantId },
      { 
        $pull: { 
          channelAvailability: { channel: req.params.id },
          'defaultChannelSettings.excludedChannels': req.params.id
        } 
      }
    );
    
    res.json({
      success: true,
      message: 'Channel deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting channel:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to delete channel' 
    });
  }
});

// Initialize default channels for a tenant
router.post('/initialize', authenticate, authorize(['menu.create']), enterpriseTenantIsolation, async (req, res) => {
  try {
    // Check if channels already exist
    const existingChannels = await MenuChannel.find({ 
      tenantId: req.tenant.tenantId 
    });
    
    if (existingChannels.length > 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'Channels already initialized' 
      });
    }
    
    const channels = await MenuChannel.initializeDefaultChannels(req.tenant.tenantId);
    
    res.json({
      success: true,
      data: channels
    });
  } catch (error) {
    console.error('Error initializing channels:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to initialize channels' 
    });
  }
});

// Update channel order
router.put('/reorder', authenticate, authorize(['menu.update']), enterpriseTenantIsolation, async (req, res) => {
  try {
    const { channelOrders } = req.body; // Array of { id, displayOrder }
    
    const updatePromises = channelOrders.map(({ id, displayOrder }) => 
      MenuChannel.findOneAndUpdate(
        {
          _id: id,
          tenantId: req.tenant.tenantId
        },
        { displayOrder },
        { new: true }
      )
    );
    
    await Promise.all(updatePromises);
    
    const channels = await MenuChannel.find({ 
      tenantId: req.tenant.tenantId 
    }).sort('displayOrder');
    
    res.json({
      success: true,
      data: channels
    });
  } catch (error) {
    console.error('Error reordering channels:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to reorder channels' 
    });
  }
});

// Get menu items for a specific channel
router.get('/:channelId/menu-items', authenticate, authorize(['menu.view']), enterpriseTenantIsolation, async (req, res) => {
  try {
    const { channelId } = req.params;
    const { category, search, available } = req.query;
    
    // Build base query
    const query = {
      tenantId: req.tenant.tenantId,
      isDeleted: false
    };
    
    if (category) query.category = category;
    if (available !== undefined) query.available = available === 'true';
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }
    
    // Get all menu items
    const menuItems = await MenuItem.find(query)
      .populate('channelAvailability.channel')
      .lean();
    
    // Filter items available in this channel
    const channelItems = menuItems.filter(item => {
      // Check default availability
      if (item.defaultChannelSettings.availableForAllChannels) {
        const isExcluded = item.defaultChannelSettings.excludedChannels
          .some(ch => ch.toString() === channelId);
        if (!isExcluded) return true;
      }
      
      // Check specific channel availability
      return item.channelAvailability.some(ca => 
        ca.channel.toString() === channelId && ca.isAvailable
      );
    });
    
    // Map items with channel-specific pricing
    const itemsWithChannelPricing = channelItems.map(item => {
      const channelConfig = item.channelAvailability
        .find(ca => ca.channel.toString() === channelId);
      
      return {
        ...item,
        channelPrice: channelConfig?.customPrice || item.price,
        channelPrepTime: channelConfig?.customPrepTime || item.prepTime,
        minQuantity: channelConfig?.minQuantity || 1,
        maxQuantity: channelConfig?.maxQuantity || null
      };
    });
    
    res.json({
      success: true,
      data: itemsWithChannelPricing
    });
  } catch (error) {
    console.error('Error fetching channel menu items:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch channel menu items' 
    });
  }
});

// Update menu item availability for a channel
router.put('/:channelId/menu-items/:itemId', authenticate, authorize(['menu.update']), enterpriseTenantIsolation, async (req, res) => {
  try {
    const { channelId, itemId } = req.params;
    const updateData = req.body;
    
    const menuItem = await MenuItem.findOne({
      _id: itemId,
      tenantId: req.tenant.tenantId,
      isDeleted: false
    });
    
    if (!menuItem) {
      return res.status(404).json({ 
        success: false, 
        error: 'Menu item not found' 
      });
    }
    
    // Find or create channel availability entry
    let channelIndex = menuItem.channelAvailability
      .findIndex(ca => ca.channel.toString() === channelId);
    
    if (channelIndex === -1) {
      // Add new channel availability
      menuItem.channelAvailability.push({
        channel: channelId,
        ...updateData
      });
    } else {
      // Update existing channel availability
      Object.assign(menuItem.channelAvailability[channelIndex], updateData);
    }
    
    await menuItem.save();
    
    res.json({
      success: true,
      data: menuItem
    });
  } catch (error) {
    console.error('Error updating channel item availability:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to update channel item availability' 
    });
  }
});

// Bulk update menu items for a channel
router.put('/:channelId/menu-items/bulk', authenticate, authorize(['menu.update']), enterpriseTenantIsolation, async (req, res) => {
  try {
    const { channelId } = req.params;
    const { action, itemIds, data } = req.body;
    
    if (action === 'enable') {
      // Enable items in channel
      await MenuItem.updateMany(
        {
          _id: { $in: itemIds },
          tenantId: req.tenant.tenantId
        },
        {
          $set: {
            'defaultChannelSettings.availableForAllChannels': true,
            $pull: { 'defaultChannelSettings.excludedChannels': channelId }
          }
        }
      );
    } else if (action === 'disable') {
      // Disable items in channel
      await MenuItem.updateMany(
        {
          _id: { $in: itemIds },
          tenantId: req.tenant.tenantId
        },
        {
          $addToSet: { 'defaultChannelSettings.excludedChannels': channelId }
        }
      );
    } else if (action === 'updatePricing') {
      // Update pricing for items in channel
      const updates = itemIds.map(itemId => 
        MenuItem.findOneAndUpdate(
          {
            _id: itemId,
            tenantId: req.tenant.tenantId,
            'channelAvailability.channel': channelId
          },
          {
            $set: {
              'channelAvailability.$.customPrice': data.customPrice,
              'channelAvailability.$.minQuantity': data.minQuantity,
              'channelAvailability.$.maxQuantity': data.maxQuantity
            }
          }
        )
      );
      
      await Promise.all(updates);
    }
    
    res.json({
      success: true,
      message: `Successfully ${action}d ${itemIds.length} items`
    });
  } catch (error) {
    console.error('Error bulk updating channel items:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to bulk update channel items' 
    });
  }
});

module.exports = router;