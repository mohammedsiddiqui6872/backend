// src/middleware/validation.js
const { body, param, query, validationResult } = require('express-validator');
const Category = require('../models/Category');

// Cache for categories (refresh every 5 minutes)
let categoryCache = {
  data: [],
  lastFetched: null,
  ttl: 5 * 60 * 1000 // 5 minutes
};

// Helper function to get valid categories
const getValidCategories = async () => {
  const now = Date.now();
  
  // Check if cache is still valid
  if (categoryCache.lastFetched && (now - categoryCache.lastFetched < categoryCache.ttl)) {
    return categoryCache.data;
  }
  
  // Fetch fresh data
  const categories = await Category.find({ isActive: true }).select('slug');
  categoryCache.data = categories.map(cat => cat.slug);
  categoryCache.lastFetched = now;
  
  return categoryCache.data;
};

// Validation middleware
exports.validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

// Alias for backward compatibility
exports.validateRequest = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

// Menu item validations
exports.menuItemValidation = [
  body('name').notEmpty().trim().withMessage('Name is required'),
  body('category')
    .notEmpty().withMessage('Category is required')
    .custom(async (value) => {
      const validCategories = await getValidCategories();
      if (!validCategories.includes(value)) {
        throw new Error(`Invalid category. Valid categories are: ${validCategories.join(', ')}`);
      }
      return true;
    }),
  body('price').isFloat({ min: 0 }).withMessage('Price must be a positive number'),
  body('description').notEmpty().trim().withMessage('Description is required'),
  body('prepTime').optional().isInt({ min: 1 }).withMessage('Prep time must be a positive integer'),
  body('discount').optional().isFloat({ min: 0, max: 100 }).withMessage('Discount must be between 0 and 100'),
  body('stockQuantity').optional().isInt({ min: -1 }).withMessage('Stock quantity must be -1 (unlimited) or a positive number'),
  body('cost').optional().isFloat({ min: 0 }).withMessage('Cost must be a positive number'),
  body('available').optional().isBoolean().withMessage('Available must be a boolean'),
  body('inStock').optional().isBoolean().withMessage('In stock must be a boolean'),
  body('calories').optional().isInt({ min: 0 }).withMessage('Calories must be a positive integer'),
  body('protein').optional().isFloat({ min: 0 }).withMessage('Protein must be a positive number'),
  body('carbs').optional().isFloat({ min: 0 }).withMessage('Carbs must be a positive number'),
  body('fat').optional().isFloat({ min: 0 }).withMessage('Fat must be a positive number'),
  body('featured').optional().isBoolean().withMessage('Featured must be a boolean'),
  body('isSpecial').optional().isBoolean().withMessage('Special must be a boolean'),
  body('recommended').optional().isBoolean().withMessage('Recommended must be a boolean')
];

// Order validations
exports.orderValidation = [
  body('tableNumber').notEmpty().withMessage('Table number is required'),
  body('items').isArray({ min: 1 }).withMessage('At least one item is required'),
  body('items.*.id').isInt().withMessage('Item ID must be a number'),
  body('items.*.quantity').isInt({ min: 1 }).withMessage('Quantity must be at least 1'),
  body('total').isFloat({ min: 0 }).withMessage('Total must be a positive number')
];

// Bulk update validation
exports.bulkUpdateValidation = [
  body('items').isArray({ min: 1 }).withMessage('Items array is required'),
  body('items.*.id').isInt().withMessage('Item ID must be a number'),
  body('updateFields').isObject().withMessage('Update fields must be an object')
];

// Export a function to clear the cache when categories are updated
exports.clearCategoryCache = () => {
  categoryCache.lastFetched = null;
};