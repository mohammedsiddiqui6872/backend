// src/routes/admin/categories.js
const express = require('express');
const router = express.Router();
const Category = require('../../models/Category');
const MenuItem = require('../../models/MenuItem');
const { authenticate, authorize } = require('../../middleware/auth');
const { clearCategoryCache } = require('../../middleware/validation');
const { cloudinaryUpload, deleteImage, uploadBase64Image } = require('../../config/cloudinary');

// Apply authentication
router.use(authenticate);
router.use(authorize('admin', 'manager'));

// Get all categories
router.get('/', async (req, res) => {
  try {
    const categories = await Category.find()
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
    
    clearCategoryCache();
    
    res.status(201).json(category);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Update category with image upload
router.put('/:id', cloudinaryUpload.single('image'), async (req, res) => {
  try {
    const categoryData = req.body;
    
    // Find existing category
    const existingCategory = await Category.findById(req.params.id);
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
    
    const category = await Category.findByIdAndUpdate(
      req.params.id,
      categoryData,
      { new: true, runValidators: true }
    );
    
    clearCategoryCache();
    
    res.json(category);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Delete category (with image cleanup)
router.delete('/:id', async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);
    
    if (!category) {
      return res.status(404).json({ error: 'Category not found' });
    }
    
    // Check if category has menu items
    const itemCount = await MenuItem.countDocuments({ category: category.slug });
    
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
    
    await Category.deleteOne({ _id: req.params.id });
    
    clearCategoryCache();
    
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
    
    clearCategoryCache();
    
    res.json({ message: 'Categories reordered successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;