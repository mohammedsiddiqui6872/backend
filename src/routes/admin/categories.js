// src/routes/admin/categories.js
const express = require('express');
const router = express.Router();
const Category = require('../../models/Category');
const MenuItem = require('../../models/MenuItem');
const { authenticate, authorize } = require('../../middleware/auth');
const { enterpriseTenantIsolation } = require('../../middleware/enterpriseTenantIsolation');
const { clearCategoryCache } = require('../../middleware/validation');
const { cloudinaryUpload, deleteImage, uploadBase64Image } = require('../../config/cloudinary');

// Apply authentication and tenant isolation
router.use(authenticate);
router.use(enterpriseTenantIsolation);
router.use(authorize('admin', 'manager'));

// Get all categories
router.get('/', async (req, res) => {
  try {
    const filter = req.tenantId ? { tenantId: req.tenantId } : {};
    const categories = await Category.find(filter)
      .sort({ displayOrder: 1, name: 1 });
    res.json(categories);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create new category with image upload
router.post('/', cloudinaryUpload.single('image'), async (req, res) => {
  try {
    const categoryData = req.body;
    
    // Add tenant ID
    if (req.tenantId) {
      categoryData.tenantId = req.tenantId;
    }
    
    // Auto-generate slug from name if not provided
    if (!categoryData.slug && categoryData.name) {
      categoryData.slug = categoryData.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    }
    
    // Handle image upload
    if (req.file) {
      categoryData.image = req.file.path; // Cloudinary URL
    } else if (categoryData.uploadImage) {
      // Handle base64 image
      try {
        const result = await uploadBase64Image(categoryData.uploadImage);
        categoryData.image = result.secure_url;
      } catch (uploadError) {
        console.error('Error uploading to Cloudinary:', uploadError);
      }
      delete categoryData.uploadImage;
    }
    
    const category = new Category(categoryData);
    await category.save();
    
    if (typeof clearCategoryCache === 'function') {
      clearCategoryCache();
    }
    
    res.status(201).json(category);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Update category with image upload
router.put('/:id', cloudinaryUpload.single('image'), async (req, res) => {
  try {
    const categoryData = req.body;
    
    // Auto-generate slug from name if name changed and slug not provided
    if (categoryData.name && !categoryData.slug) {
      categoryData.slug = categoryData.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    }
    
    // Find existing category with tenant filter
    const filter = { _id: req.params.id };
    if (req.tenantId) {
      filter.tenantId = req.tenantId;
    }
    const existingCategory = await Category.findOne(filter);
    if (!existingCategory) {
      return res.status(404).json({ error: 'Category not found' });
    }
    
    // Handle image upload
    if (req.file) {
      // Delete old image if exists
      if (existingCategory.image && existingCategory.image.includes('cloudinary.com')) {
        const publicId = existingCategory.image.split('/').pop().split('.')[0];
        await deleteImage(`restaurant/categories/${publicId}`).catch(console.error);
      }
      categoryData.image = req.file.path;
    } else if (categoryData.uploadImage) {
      // Handle base64 image
      try {
        // Delete old image if exists
        if (existingCategory.image && existingCategory.image.includes('cloudinary.com')) {
          const publicId = existingCategory.image.split('/').pop().split('.')[0];
          await deleteImage(`restaurant/categories/${publicId}`).catch(console.error);
        }
        
        const result = await uploadBase64Image(categoryData.uploadImage);
        categoryData.image = result.secure_url;
      } catch (uploadError) {
        console.error('Error uploading to Cloudinary:', uploadError);
      }
      delete categoryData.uploadImage;
    }
    
    const updateFilter = { _id: req.params.id };
    if (req.tenantId) {
      updateFilter.tenantId = req.tenantId;
    }
    const category = await Category.findOneAndUpdate(
      updateFilter,
      categoryData,
      { new: true, runValidators: true }
    );
    
    if (typeof clearCategoryCache === 'function') {
      clearCategoryCache();
    }
    
    res.json(category);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Delete category (with image cleanup)
router.delete('/:id', async (req, res) => {
  try {
    const filter = { _id: req.params.id };
    if (req.tenantId) {
      filter.tenantId = req.tenantId;
    }
    const category = await Category.findOne(filter);
    
    if (!category) {
      return res.status(404).json({ error: 'Category not found' });
    }
    
    // Check if category has menu items
    const itemFilter = { category: category.slug };
    if (req.tenantId) {
      itemFilter.tenantId = req.tenantId;
    }
    const itemCount = await MenuItem.countDocuments(itemFilter);
    
    if (itemCount > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete category with existing menu items' 
      });
    }
    
    // Delete image from Cloudinary if exists
    if (category.image && category.image.includes('cloudinary.com')) {
      const publicId = category.image.split('/').pop().split('.')[0];
      await deleteImage(`restaurant/categories/${publicId}`).catch(console.error);
    }
    
    const deleteFilter = { _id: req.params.id };
    if (req.tenantId) {
      deleteFilter.tenantId = req.tenantId;
    }
    await Category.deleteOne(deleteFilter);
    
    if (typeof clearCategoryCache === 'function') {
      clearCategoryCache();
    }
    
    res.json({ message: 'Category deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Reorder categories
router.post('/reorder', async (req, res) => {
  try {
    const { categoryOrder } = req.body;
    
    for (const item of categoryOrder) {
      await Category.findByIdAndUpdate(item.id, { 
        displayOrder: item.order 
      });
    }
    
    if (typeof clearCategoryCache === 'function') {
      clearCategoryCache();
    }
    
    res.json({ message: 'Categories reordered successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Export categories
router.get('/export', async (req, res) => {
  try {
    const { format = 'json' } = req.query;
    
    // Get all categories with tenant filter
    const filter = req.tenantId ? { tenantId: req.tenantId } : {};
    const categories = await Category.find(filter)
      .select('-__v -createdAt -updatedAt');
    
    if (format === 'csv') {
      // Convert to CSV format
      const fields = ['name', 'nameAr', 'slug', 'icon', 'displayOrder', 'isActive', 'description', 'descriptionAr', 'image'];
      
      let csv = fields.join(',') + '\n';
      
      categories.forEach(cat => {
        const row = fields.map(field => {
          let value = cat[field];
          if (typeof value === 'string' && value.includes(',')) {
            value = `"${value}"`; // Quote values containing commas
          }
          return value || '';
        });
        csv += row.join(',') + '\n';
      });
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="categories.csv"');
      res.send(csv);
    } else {
      // JSON format
      res.json(categories);
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Bulk import categories
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
    
    // Process each category
    for (const catData of data) {
      try {
        // Prepare category data
        const categoryData = {
          name: catData.name,
          nameAr: catData.nameAr,
          icon: catData.icon || 'utensils',
          displayOrder: catData.displayOrder ? parseInt(catData.displayOrder) : 0,
          isActive: catData.isActive === 'true' || catData.isActive === true || catData.isActive === undefined,
          description: catData.description,
          descriptionAr: catData.descriptionAr,
          tenantId: req.tenantId
        };
        
        // Handle image
        if (catData.imageUrl) {
          categoryData.image = catData.imageUrl;
        } else if (catData.imageBase64) {
          // Upload base64 image to Cloudinary
          const result = await uploadBase64Image(catData.imageBase64);
          categoryData.image = result.secure_url;
        }
        
        // Create category
        const newCategory = new Category(categoryData);
        await newCategory.save();
        
        results.success.push({
          name: newCategory.name,
          slug: newCategory.slug
        });
      } catch (error) {
        results.failed.push({
          name: catData.name || 'Unknown',
          error: error.message
        });
      }
    }
    
    if (typeof clearCategoryCache === 'function') {
      clearCategoryCache();
    }
    
    res.json({
      message: `Import completed. ${results.success.length} categories imported successfully.`,
      results
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;