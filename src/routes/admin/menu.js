// src/routes/admin/menu.js
const express = require('express');
const router = express.Router();
const MenuItem = require('../../models/MenuItem');
const { authenticate, authorize } = require('../../middleware/auth');
const { cloudinaryUpload, deleteImage, uploadBase64Image } = require('../../config/cloudinary');
const { menuItemValidation, bulkUpdateValidation, validate } = require('../../middleware/validation');

// Apply authentication to all admin routes
router.use(authenticate);
router.use(authorize('admin', 'manager'));

// Get all menu items (admin view with more details)
router.get('/', async (req, res) => {
  try {
    const { 
      category, 
      available, 
      inStock,
      search,
      sortBy = 'createdAt',
      order = 'desc',
      page = 1,
      limit = 20,
      all = false  // Add this parameter to fetch all items
    } = req.query;

    // Build query with tenant filter
    const query = {};
    if (req.tenantId) {
      query.tenantId = req.tenantId;
    }
    if (category) query.category = category;
    if (available !== undefined) query.available = available === 'true';
    if (inStock !== undefined) query.inStock = inStock === 'true';
    if (search) {
      query.$text = { $search: search };
    }

    let items;
    let total;
    
    // If 'all' parameter is true or limit is very high, get all items without pagination
    if (all === 'true' || parseInt(limit) > 1000) {
      items = await MenuItem
        .find(query)
        .sort({ [sortBy]: order === 'desc' ? -1 : 1 });
      
      total = items.length;
      
      res.json({
        items,
        pagination: {
          page: 1,
          limit: total,
          total: total,
          pages: 1
        }
      });
    } else {
      // Use pagination for normal requests
      const skip = (page - 1) * limit;
      items = await MenuItem
        .find(query)
        .sort({ [sortBy]: order === 'desc' ? -1 : 1 })
        .skip(skip)
        .limit(parseInt(limit));

      total = await MenuItem.countDocuments(query);

      res.json({
        items,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get single menu item
router.get('/:id', async (req, res) => {
  try {
    const itemFilter = { _id: req.params.id };
    if (req.tenantId) {
      itemFilter.tenantId = req.tenantId;
    }
    const item = await MenuItem.findOne(itemFilter);
    if (!item) {
      return res.status(404).json({ error: 'Menu item not found' });
    }
    res.json(item);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create new menu item
router.post('/', cloudinaryUpload.single('image'), menuItemValidation, validate, async (req, res) => {
  try {
    const itemData = req.body;
    
    // Handle customizations (convert JSON string to object if needed)
    if (typeof itemData.customizations === 'string') {
      itemData.customizations = JSON.parse(itemData.customizations);
    }

    // Handle image upload - check for Cloudinary URL
    if (req.file) {
      itemData.image = req.file.path; // Cloudinary returns the URL in 'path'
    } else if (itemData.uploadImage) {
      // Handle base64 image from custom upload component
      try {
        const result = await uploadBase64Image(itemData.uploadImage);
        itemData.image = result.secure_url;
      } catch (uploadError) {
        console.error('Error uploading to Cloudinary:', uploadError);
      }
      delete itemData.uploadImage; // Remove base64 data from item data
    }

    // Generate unique ID - improved logic to prevent duplicates
    if (!itemData.id) {
      const lastItemFilter = {};
      if (req.tenantId) {
        lastItemFilter.tenantId = req.tenantId;
      }
      const lastItem = await MenuItem.findOne(lastItemFilter).sort({ id: -1 });
      itemData.id = lastItem ? lastItem.id + 1 : 1;
      
      // Double-check for duplicates
      const existingFilter = { id: itemData.id };
      if (req.tenantId) {
        existingFilter.tenantId = req.tenantId;
      }
      const existingWithId = await MenuItem.findOne(existingFilter);
      if (existingWithId) {
        // If duplicate found, find the actual highest ID
        const allItemsFilter = {};
        if (req.tenantId) {
          allItemsFilter.tenantId = req.tenantId;
        }
        const allItems = await MenuItem.find(allItemsFilter).select('id').sort({ id: -1 });
        const highestId = allItems[0]?.id || 0;
        itemData.id = highestId + 1;
      }
    }

    // Set tenant ID for new items
    if (req.tenantId) {
      itemData.tenantId = req.tenantId;
    }

    const newItem = new MenuItem(itemData);
    await newItem.save();

    res.status(201).json({ 
      success: true, 
      item: newItem,
      message: 'Menu item created successfully'
    });
  } catch (error) {
    console.error('Error creating menu item:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update menu item
router.put('/:id', cloudinaryUpload.single('image'), menuItemValidation, validate, async (req, res) => {
  try {
    const itemData = req.body;
    
    // Handle customizations
    if (typeof itemData.customizations === 'string') {
      itemData.customizations = JSON.parse(itemData.customizations);
    }

    // Find existing item with tenant filter
    const itemFilter = { _id: req.params.id };
    if (req.tenantId) {
      itemFilter.tenantId = req.tenantId;
    }
    const existingItem = await MenuItem.findOne(itemFilter);
    if (!existingItem) {
      return res.status(404).json({ error: 'Menu item not found' });
    }

    // Handle image upload
    if (req.file) {
      // Delete old image from Cloudinary if exists
      if (existingItem.image && existingItem.image.includes('cloudinary.com')) {
        const publicId = existingItem.image.split('/').pop().split('.')[0];
        await deleteImage(`restaurant/menu/${publicId}`).catch(console.error);
      }
      itemData.image = req.file.path; // Cloudinary URL
    } else if (itemData.uploadImage) {
      // Handle base64 image from custom upload component
      try {
        // Delete old image from Cloudinary if exists
        if (existingItem.image && existingItem.image.includes('cloudinary.com')) {
          const publicId = existingItem.image.split('/').pop().split('.')[0];
          await deleteImage(`restaurant/menu/${publicId}`).catch(console.error);
        }
        
        const result = await uploadBase64Image(itemData.uploadImage);
        itemData.image = result.secure_url;
      } catch (uploadError) {
        console.error('Error uploading to Cloudinary:', uploadError);
      }
      delete itemData.uploadImage; // Remove base64 data from item data
    }

    // Update item with tenant filter
    const updateFilter = { _id: req.params.id };
    if (req.tenantId) {
      updateFilter.tenantId = req.tenantId;
    }
    const updatedItem = await MenuItem.findOneAndUpdate(
      updateFilter,
      itemData,
      { new: true, runValidators: true }
    );

    res.json({ 
      success: true, 
      item: updatedItem,
      message: 'Menu item updated successfully'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Soft delete menu item
router.delete('/:id', async (req, res) => {
  try {
    const itemFilter = { _id: req.params.id };
    if (req.tenantId) {
      itemFilter.tenantId = req.tenantId;
    }
    const item = await MenuItem.findOne(itemFilter);
    if (!item) {
      return res.status(404).json({ error: 'Menu item not found' });
    }

    // Check if item is referenced in any active orders with tenant filter
    const Order = require('../../models/Order');
    const orderFilter = {
      'items.menuItem': req.params.id,
      status: { $in: ['pending', 'confirmed', 'preparing', 'ready', 'served'] }
    };
    if (req.tenantId) {
      orderFilter.tenantId = req.tenantId;
    }
    const activeOrderCount = await Order.countDocuments(orderFilter);

    if (activeOrderCount > 0) {
      return res.status(400).json({ 
        error: `Cannot delete menu item. It is referenced in ${activeOrderCount} active order(s).`,
        suggestion: 'Mark the item as unavailable instead or wait for orders to complete.'
      });
    }

    // Use soft delete instead of hard delete
    await item.softDelete(req.user?._id);

    res.json({ 
      success: true, 
      message: 'Menu item deleted successfully' 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Restore deleted menu item
router.post('/:id/restore', authenticate, authorize(['admin', 'manager']), async (req, res) => {
  try {
    const itemFilter = { _id: req.params.id, isDeleted: true };
    if (req.tenantId) {
      itemFilter.tenantId = req.tenantId;
    }
    const item = await MenuItem.findOne(itemFilter);
    if (!item) {
      return res.status(404).json({ error: 'Deleted menu item not found' });
    }

    await item.restore();

    res.json({ 
      success: true, 
      message: 'Menu item restored successfully',
      item 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get deleted menu items
router.get('/deleted/list', authenticate, authorize(['admin', 'manager']), async (req, res) => {
  try {
    const query = req.tenantId ? { tenantId: req.tenantId } : {};
    const deletedItems = await MenuItem.findDeleted(query)
      .populate('deletedBy', 'name email')
      .sort('-deletedAt');

    res.json({ 
      success: true, 
      items: deletedItems,
      count: deletedItems.length
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Toggle availability
router.patch('/:id/availability', async (req, res) => {
  try {
    const itemFilter = { _id: req.params.id };
    if (req.tenantId) {
      itemFilter.tenantId = req.tenantId;
    }
    const item = await MenuItem.findOne(itemFilter);
    if (!item) {
      return res.status(404).json({ error: 'Menu item not found' });
    }

    item.available = !item.available;
    await item.save();

    // Emit real-time update
    req.app.get('io').emit('menu-update', {
      action: 'availability',
      item: { id: item.id, available: item.available }
    });

    res.json({ 
      success: true, 
      item,
      message: `Item ${item.available ? 'enabled' : 'disabled'} successfully`
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Bulk update menu items
router.post('/bulk-update', bulkUpdateValidation, validate, async (req, res) => {
  try {
    const { items, updateFields } = req.body;
    
    const results = {
      success: [],
      failed: []
    };

    for (const itemId of items) {
      try {
        const updateFilter = { id: itemId };
        if (req.tenantId) {
          updateFilter.tenantId = req.tenantId;
        }
        await MenuItem.findOneAndUpdate(
          updateFilter,
          updateFields,
          { runValidators: true }
        );
        results.success.push(itemId);
      } catch (error) {
        results.failed.push({ id: itemId, error: error.message });
      }
    }

    res.json({
      success: true,
      message: `Updated ${results.success.length} items`,
      results
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Bulk import menu items
router.post('/bulk-import', async (req, res) => {
  try {
    const { data, format } = req.body;
    
    if (!data || !Array.isArray(data)) {
      return res.status(400).json({ error: 'Invalid data format' });
    }
    
    const results = {
      success: [],
      failed: [],
      total: data.length
    };
    
    // Get all categories for validation
    const Category = require('../../models/Category');
    const categoriesFilter = req.tenantId ? { tenantId: req.tenantId } : {};
    const validCategories = await Category.find(categoriesFilter).select('slug');
    const validCategorySlugs = validCategories.map(c => c.slug);
    
    // Process each item
    for (const itemData of data) {
      try {
        // Validate category
        if (!validCategorySlugs.includes(itemData.category)) {
          results.failed.push({
            name: itemData.name,
            error: `Invalid category: ${itemData.category}`
          });
          continue;
        }
        
        // Prepare item data
        const menuItem = {
          name: itemData.name,
          nameAr: itemData.nameAr,
          category: itemData.category,
          price: parseFloat(itemData.price) || 0,
          cost: itemData.cost ? parseFloat(itemData.cost) : undefined,
          description: itemData.description || '',
          descriptionAr: itemData.descriptionAr,
          available: itemData.available === 'true' || itemData.available === true,
          inStock: itemData.inStock === 'true' || itemData.inStock === true,
          stockQuantity: itemData.stockQuantity ? parseInt(itemData.stockQuantity) : -1,
          prepTime: itemData.prepTime ? parseInt(itemData.prepTime) : 15,
          calories: itemData.calories ? parseInt(itemData.calories) : undefined,
          protein: itemData.protein ? parseFloat(itemData.protein) : undefined,
          carbs: itemData.carbs ? parseFloat(itemData.carbs) : undefined,
          fat: itemData.fat ? parseFloat(itemData.fat) : undefined,
          isSpecial: itemData.isSpecial === 'true' || itemData.isSpecial === true,
          discount: itemData.discount ? parseInt(itemData.discount) : 0,
          recommended: itemData.recommended === 'true' || itemData.recommended === true,
          featured: itemData.featured === 'true' || itemData.featured === true,
          tenantId: req.tenantId
        };
        
        // Handle arrays
        if (itemData.allergens) {
          menuItem.allergens = typeof itemData.allergens === 'string' 
            ? itemData.allergens.split(';').map(a => a.trim()).filter(Boolean)
            : itemData.allergens;
        }
        
        if (itemData.dietary) {
          menuItem.dietary = typeof itemData.dietary === 'string'
            ? itemData.dietary.split(';').map(d => d.trim()).filter(Boolean)
            : itemData.dietary;
        }
        
        // Handle image
        if (itemData.imageUrl) {
          menuItem.image = itemData.imageUrl;
        } else if (itemData.imageBase64) {
          // Upload base64 image to Cloudinary
          const result = await uploadBase64Image(itemData.imageBase64);
          menuItem.image = result.secure_url;
        }
        
        // Generate ID
        const lastItem = await MenuItem.findOne({ tenantId: req.tenantId }).sort({ id: -1 });
        menuItem.id = lastItem ? lastItem.id + 1 : 1;
        
        // Create item
        const newItem = new MenuItem(menuItem);
        await newItem.save();
        
        results.success.push({
          id: newItem.id,
          name: newItem.name
        });
      } catch (error) {
        results.failed.push({
          name: itemData.name || 'Unknown',
          error: error.message
        });
      }
    }
    
    res.json({
      message: `Import completed. ${results.success.length} items imported successfully.`,
      results
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Upload multiple images for a menu item
router.post('/:id/images', cloudinaryUpload.array('images', 5), async (req, res) => {
  try {
    const itemFilter = { _id: req.params.id };
    if (req.tenantId) {
      itemFilter.tenantId = req.tenantId;
    }
    const item = await MenuItem.findOne(itemFilter);
    if (!item) {
      return res.status(404).json({ error: 'Menu item not found' });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No images uploaded' });
    }

    // Add new Cloudinary URLs
    const newImages = req.files.map(file => file.path);
    item.images = [...(item.images || []), ...newImages];
    
    await item.save();

    res.json({
      success: true,
      item,
      message: 'Images uploaded successfully'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete an image from menu item
router.delete('/:id/images/:imageIndex', async (req, res) => {
  try {
    const itemFilter = { _id: req.params.id };
    if (req.tenantId) {
      itemFilter.tenantId = req.tenantId;
    }
    const item = await MenuItem.findOne(itemFilter);
    if (!item) {
      return res.status(404).json({ error: 'Menu item not found' });
    }

    const imageIndex = parseInt(req.params.imageIndex);
    if (imageIndex < 0 || imageIndex >= item.images.length) {
      return res.status(400).json({ error: 'Invalid image index' });
    }

    // Delete from Cloudinary
    const imagePath = item.images[imageIndex];
    if (imagePath && imagePath.includes('cloudinary.com')) {
      const publicId = imagePath.split('/').pop().split('.')[0];
      await deleteImage(`restaurant/menu/${publicId}`).catch(console.error);
    }

    // Remove from array
    item.images.splice(imageIndex, 1);
    await item.save();

    res.json({
      success: true,
      item,
      message: 'Image deleted successfully'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Export menu items
router.get('/export', async (req, res) => {
  try {
    const { format = 'json' } = req.query;
    
    // Get all items with tenant filter
    const filter = req.tenantId ? { tenantId: req.tenantId } : {};
    const items = await MenuItem.find(filter)
      .select('-__v -createdAt -updatedAt');
    
    if (format === 'csv') {
      // Convert to CSV format
      const fields = [
        'id', 'name', 'nameAr', 'category', 'price', 'cost', 
        'description', 'descriptionAr', 'available', 'inStock',
        'stockQuantity', 'allergens', 'dietary', 'prepTime',
        'calories', 'protein', 'carbs', 'fat', 'isSpecial',
        'discount', 'recommended', 'featured', 'image'
      ];
      
      let csv = fields.join(',') + '\n';
      
      items.forEach(item => {
        const row = fields.map(field => {
          let value = item[field];
          if (Array.isArray(value)) {
            value = value.join(';'); // Use semicolon for array values
          }
          if (typeof value === 'string' && value.includes(',')) {
            value = `"${value}"`; // Quote values containing commas
          }
          return value || '';
        });
        csv += row.join(',') + '\n';
      });
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="menu_items.csv"');
      res.send(csv);
    } else {
      // JSON format
      res.json(items);
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get menu statistics
router.get('/stats/overview', async (req, res) => {
  try {
    // Build aggregate pipeline with tenant filter
    const matchStage = {};
    if (req.tenantId) {
      matchStage.tenantId = req.tenantId;
    }
    
    const pipeline = [];
    if (Object.keys(matchStage).length > 0) {
      pipeline.push({ $match: matchStage });
    }
    pipeline.push({
      $group: {
        _id: '$category',
        count: { $sum: 1 },
        available: { 
          $sum: { $cond: ['$available', 1, 0] } 
        },
        avgPrice: { $avg: '$price' },
        totalSold: { $sum: '$soldCount' }
      }
    });
    
    const stats = await MenuItem.aggregate(pipeline);

    // Count queries with tenant filter
    const baseFilter = {};
    if (req.tenantId) {
      baseFilter.tenantId = req.tenantId;
    }
    
    const total = await MenuItem.countDocuments(baseFilter);
    const available = await MenuItem.countDocuments({ ...baseFilter, available: true });
    const featured = await MenuItem.countDocuments({ ...baseFilter, featured: true });
    const outOfStock = await MenuItem.countDocuments({ ...baseFilter, inStock: false });

    res.json({
      total,
      available,
      featured,
      outOfStock,
      byCategory: stats
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;