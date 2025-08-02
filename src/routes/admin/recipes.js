const express = require('express');
const router = express.Router();
const Recipe = require('../../models/Recipe');
const MenuItem = require('../../models/MenuItem');
const Ingredient = require('../../models/Ingredient');
const { authenticate, authorize } = require('../../middleware/auth');
const { body, param, validationResult } = require('express-validator');

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

// Get all recipes
router.get('/', async (req, res) => {
  try {
    const recipes = await Recipe.find({ tenantId: req.tenantId })
      .populate('menuItem', 'name nameAr image')
      .populate('ingredients.ingredient', 'name baseUnit costPerUnit');
    
    // Calculate costs for each recipe
    const recipesWithCosts = await Promise.all(
      recipes.map(async (recipe) => {
        const cost = await recipe.calculateCost();
        return {
          ...recipe.toObject(),
          calculatedCost: cost
        };
      })
    );
    
    res.json(recipesWithCosts);
  } catch (error) {
    console.error('Error fetching recipes:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get recipe by menu item
router.get('/menu-item/:menuItemId', async (req, res) => {
  try {
    const recipe = await Recipe.findOne({
      menuItem: req.params.menuItemId,
      tenantId: req.tenantId
    })
    .populate('menuItem', 'name nameAr image price cost')
    .populate('ingredients.ingredient', 'name baseUnit costPerUnit currentStock lowStockThreshold');
    
    if (!recipe) {
      return res.status(404).json({ error: 'Recipe not found for this menu item' });
    }
    
    // Check ingredient availability
    const availability = await recipe.checkIngredientsAvailability();
    const cost = await recipe.calculateCost();
    
    res.json({
      recipe,
      calculatedCost: cost,
      availability,
      profitMargin: recipe.menuItem.price - cost
    });
  } catch (error) {
    console.error('Error fetching recipe:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create or update recipe
router.post('/', [
  body('menuItem').isMongoId().withMessage('Valid menu item ID required'),
  body('ingredients').isArray({ min: 1 }).withMessage('At least one ingredient required'),
  body('ingredients.*.ingredient').isMongoId().withMessage('Valid ingredient ID required'),
  body('ingredients.*.quantity').isFloat({ min: 0 }).withMessage('Quantity must be positive'),
  body('ingredients.*.unit').notEmpty().withMessage('Unit is required'),
  body('yieldAmount').optional().isFloat({ min: 0 }),
  body('totalPrepTime').optional().isInt({ min: 0 }),
  body('totalCookTime').optional().isInt({ min: 0 })
], validate, async (req, res) => {
  try {
    const { menuItem, ingredients, instructions, yieldAmount, yieldUnit, totalPrepTime, totalCookTime, notes } = req.body;
    
    // Verify menu item exists and belongs to tenant
    const menuItemDoc = await MenuItem.findOne({
      _id: menuItem,
      tenantId: req.tenantId
    });
    
    if (!menuItemDoc) {
      return res.status(404).json({ error: 'Menu item not found' });
    }
    
    // Verify all ingredients exist and belong to tenant
    for (const ing of ingredients) {
      const ingredient = await Ingredient.findOne({
        _id: ing.ingredient,
        tenantId: req.tenantId
      });
      
      if (!ingredient) {
        return res.status(400).json({ error: `Ingredient ${ing.ingredient} not found` });
      }
    }
    
    // Check if recipe already exists
    let recipe = await Recipe.findOne({
      menuItem,
      tenantId: req.tenantId
    });
    
    if (recipe) {
      // Update existing recipe
      recipe.ingredients = ingredients;
      recipe.instructions = instructions || recipe.instructions;
      recipe.yieldAmount = yieldAmount || recipe.yieldAmount;
      recipe.yieldUnit = yieldUnit || recipe.yieldUnit;
      recipe.totalPrepTime = totalPrepTime || recipe.totalPrepTime;
      recipe.totalCookTime = totalCookTime || recipe.totalCookTime;
      recipe.notes = notes || recipe.notes;
    } else {
      // Create new recipe
      recipe = new Recipe({
        tenantId: req.tenantId,
        menuItem,
        ingredients,
        instructions: instructions || [],
        yieldAmount: yieldAmount || 1,
        yieldUnit: yieldUnit || 'serving',
        totalPrepTime: totalPrepTime || 0,
        totalCookTime: totalCookTime || 0,
        notes
      });
    }
    
    await recipe.save();
    
    // Calculate and update menu item cost
    const calculatedCost = await recipe.calculateCost();
    await MenuItem.findByIdAndUpdate(menuItem, { cost: calculatedCost });
    
    // Populate for response
    await recipe.populate('menuItem ingredients.ingredient');
    
    res.json({
      success: true,
      recipe,
      calculatedCost,
      message: recipe.isNew ? 'Recipe created successfully' : 'Recipe updated successfully'
    });
  } catch (error) {
    console.error('Error saving recipe:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete recipe
router.delete('/:id', async (req, res) => {
  try {
    const recipe = await Recipe.findOneAndDelete({
      _id: req.params.id,
      tenantId: req.tenantId
    });
    
    if (!recipe) {
      return res.status(404).json({ error: 'Recipe not found' });
    }
    
    // Reset menu item cost
    await MenuItem.findByIdAndUpdate(recipe.menuItem, { cost: 0 });
    
    res.json({
      success: true,
      message: 'Recipe deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting recipe:', error);
    res.status(500).json({ error: error.message });
  }
});

// Check recipe availability
router.get('/:id/availability', async (req, res) => {
  try {
    const recipe = await Recipe.findOne({
      _id: req.params.id,
      tenantId: req.tenantId
    }).populate('ingredients.ingredient', 'name currentStock lowStockThreshold baseUnit');
    
    if (!recipe) {
      return res.status(404).json({ error: 'Recipe not found' });
    }
    
    const availability = await recipe.checkIngredientsAvailability();
    
    res.json(availability);
  } catch (error) {
    console.error('Error checking availability:', error);
    res.status(500).json({ error: error.message });
  }
});

// Calculate recipe nutrition
router.get('/:id/nutrition', async (req, res) => {
  try {
    const recipe = await Recipe.findOne({
      _id: req.params.id,
      tenantId: req.tenantId
    }).populate('ingredients.ingredient');
    
    if (!recipe) {
      return res.status(404).json({ error: 'Recipe not found' });
    }
    
    let totalNutrition = {
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
      fiber: 0,
      sugar: 0,
      sodium: 0
    };
    
    // Calculate total nutrition from ingredients
    for (const item of recipe.ingredients) {
      const ingredient = item.ingredient;
      if (ingredient.nutritionPer100) {
        const multiplier = recipe.convertToBaseUnit(item.quantity, item.unit, ingredient.baseUnit) / 100;
        
        totalNutrition.calories += (ingredient.nutritionPer100.calories || 0) * multiplier;
        totalNutrition.protein += (ingredient.nutritionPer100.protein || 0) * multiplier;
        totalNutrition.carbs += (ingredient.nutritionPer100.carbs || 0) * multiplier;
        totalNutrition.fat += (ingredient.nutritionPer100.fat || 0) * multiplier;
        totalNutrition.fiber += (ingredient.nutritionPer100.fiber || 0) * multiplier;
        totalNutrition.sugar += (ingredient.nutritionPer100.sugar || 0) * multiplier;
        totalNutrition.sodium += (ingredient.nutritionPer100.sodium || 0) * multiplier;
      }
    }
    
    // Calculate per serving
    const perServing = {
      calories: totalNutrition.calories / recipe.yieldAmount,
      protein: totalNutrition.protein / recipe.yieldAmount,
      carbs: totalNutrition.carbs / recipe.yieldAmount,
      fat: totalNutrition.fat / recipe.yieldAmount,
      fiber: totalNutrition.fiber / recipe.yieldAmount,
      sugar: totalNutrition.sugar / recipe.yieldAmount,
      sodium: totalNutrition.sodium / recipe.yieldAmount
    };
    
    // Update menu item nutrition
    await MenuItem.findByIdAndUpdate(recipe.menuItem, {
      calories: Math.round(perServing.calories),
      protein: Math.round(perServing.protein * 10) / 10,
      carbs: Math.round(perServing.carbs * 10) / 10,
      fat: Math.round(perServing.fat * 10) / 10
    });
    
    res.json({
      totalNutrition,
      perServing,
      yieldAmount: recipe.yieldAmount,
      yieldUnit: recipe.yieldUnit
    });
  } catch (error) {
    console.error('Error calculating nutrition:', error);
    res.status(500).json({ error: error.message });
  }
});

// Bulk create recipes
router.post('/bulk-create', [
  body('recipes').isArray({ min: 1 }).withMessage('Recipes array required'),
  body('recipes.*.menuItem').isMongoId(),
  body('recipes.*.ingredients').isArray({ min: 1 })
], validate, async (req, res) => {
  try {
    const { recipes } = req.body;
    const results = [];
    const errors = [];
    
    for (const recipeData of recipes) {
      try {
        // Verify menu item
        const menuItem = await MenuItem.findOne({
          _id: recipeData.menuItem,
          tenantId: req.tenantId
        });
        
        if (!menuItem) {
          errors.push({ menuItem: recipeData.menuItem, error: 'Menu item not found' });
          continue;
        }
        
        // Check if recipe already exists
        const existing = await Recipe.findOne({
          menuItem: recipeData.menuItem,
          tenantId: req.tenantId
        });
        
        if (existing) {
          errors.push({ menuItem: menuItem.name, error: 'Recipe already exists' });
          continue;
        }
        
        // Create recipe
        const recipe = await Recipe.create({
          ...recipeData,
          tenantId: req.tenantId
        });
        
        // Calculate cost
        const cost = await recipe.calculateCost();
        await MenuItem.findByIdAndUpdate(recipeData.menuItem, { cost });
        
        results.push({ menuItem: menuItem.name, _id: recipe._id, cost });
      } catch (error) {
        errors.push({ menuItem: recipeData.menuItem, error: error.message });
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
    console.error('Error bulk creating recipes:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;