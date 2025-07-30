const mongoose = require('mongoose');

const recipeIngredientSchema = new mongoose.Schema({
  menuItem: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'MenuItem',
    required: true
  },
  ingredient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'IngredientMaster',
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    min: 0
  },
  unit: {
    type: String,
    required: true
  },
  isOptional: {
    type: Boolean,
    default: false
  },
  notes: String
}, { timestamps: true });

// Compound index for unique ingredient per menu item
recipeIngredientSchema.index({ menuItem: 1, ingredient: 1 }, { unique: true });

// Calculate cost per serving
recipeIngredientSchema.methods.calculateCost = async function() {
  await this.populate('ingredient');
  return this.quantity * this.ingredient.costPerUnit;
};

// Static method to get all ingredients for a menu item
recipeIngredientSchema.statics.getIngredientsForMenuItem = function(menuItemId) {
  return this.find({ menuItem: menuItemId })
    .populate('ingredient')
    .sort('ingredient.name');
};

// Static method to check if ingredients are available
recipeIngredientSchema.statics.checkAvailability = async function(menuItemId) {
  const ingredients = await this.find({ menuItem: menuItemId })
    .populate('ingredient');
  
  const Inventory = mongoose.model('Inventory');
  const availability = await Promise.all(
    ingredients.map(async (ing) => {
      const stock = await Inventory.findOne({ ingredient: ing.ingredient._id });
      return {
        ingredient: ing.ingredient.name,
        required: ing.quantity,
        available: stock ? stock.currentStock : 0,
        sufficient: stock ? stock.currentStock >= ing.quantity : false
      };
    })
  );
  
  return {
    canMake: availability.every(a => a.sufficient),
    details: availability
  };
};

module.exports = mongoose.model('RecipeIngredient', recipeIngredientSchema);