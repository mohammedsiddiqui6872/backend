const Inventory = require('../models/Inventory');
const RecipeIngredient = require('../models/RecipeIngredient');
const IngredientMaster = require('../models/IngredientMaster');

class InventoryService {
  /**
   * Deduct inventory for an order
   */
  async deductForOrder(orderId, items, userId) {
    const deductions = [];
    const insufficientStock = [];
    
    try {
      // Check availability first
      for (const item of items) {
        if (!item.menuItem) continue;
        
        const recipe = await RecipeIngredient.find({ menuItem: item.menuItem })
          .populate('ingredient');
        
        for (const recipeItem of recipe) {
          const inventory = await Inventory.findOne({ 
            ingredient: recipeItem.ingredient._id 
          });
          
          const requiredQuantity = recipeItem.quantity * item.quantity;
          
          if (!inventory || inventory.currentStock < requiredQuantity) {
            insufficientStock.push({
              ingredient: recipeItem.ingredient.name,
              required: requiredQuantity,
              available: inventory ? inventory.currentStock : 0,
              unit: recipeItem.unit
            });
          }
        }
      }
      
      // If any ingredient is insufficient, throw error
      if (insufficientStock.length > 0) {
        const error = new Error('Insufficient inventory');
        error.details = insufficientStock;
        throw error;
      }
      
      // Deduct inventory
      for (const item of items) {
        if (!item.menuItem) continue;
        
        const recipe = await RecipeIngredient.find({ menuItem: item.menuItem });
        
        for (const recipeItem of recipe) {
          const inventory = await Inventory.findOne({ 
            ingredient: recipeItem.ingredient 
          });
          
          if (inventory) {
            const quantity = recipeItem.quantity * item.quantity;
            await inventory.removeStock(
              quantity, 
              `Order #${orderId}`, 
              userId, 
              orderId
            );
            
            deductions.push({
              ingredient: recipeItem.ingredient,
              quantity,
              newStock: inventory.currentStock
            });
          }
        }
      }
      
      return {
        success: true,
        deductions
      };
    } catch (error) {
      // Rollback if needed
      if (deductions.length > 0 && error.message !== 'Insufficient inventory') {
        // Revert deductions
        for (const deduction of deductions) {
          const inventory = await Inventory.findOne({ 
            ingredient: deduction.ingredient 
          });
          if (inventory) {
            await inventory.addStock(
              deduction.quantity,
              null,
              userId
            );
          }
        }
      }
      
      throw error;
    }
  }
  
  /**
   * Return inventory (for cancelled orders)
   */
  async returnForOrder(orderId, items, userId) {
    const returns = [];
    
    for (const item of items) {
      if (!item.menuItem) continue;
      
      const recipe = await RecipeIngredient.find({ menuItem: item.menuItem });
      
      for (const recipeItem of recipe) {
        const inventory = await Inventory.findOne({ 
          ingredient: recipeItem.ingredient 
        });
        
        if (inventory) {
          const quantity = recipeItem.quantity * item.quantity;
          
          inventory.currentStock += quantity;
          inventory.movements.push({
            type: 'return',
            quantity,
            reason: `Order #${orderId} cancelled`,
            performedBy: userId,
            relatedOrder: orderId
          });
          
          await inventory.save();
          
          returns.push({
            ingredient: recipeItem.ingredient,
            quantity,
            newStock: inventory.currentStock
          });
        }
      }
    }
    
    return {
      success: true,
      returns
    };
  }
  
  /**
   * Get inventory status for menu items
   */
  async getMenuItemAvailability(menuItemIds) {
    const availability = {};
    
    for (const menuItemId of menuItemIds) {
      const canMake = await RecipeIngredient.checkAvailability(menuItemId);
      availability[menuItemId] = canMake;
    }
    
    return availability;
  }
  
  /**
   * Get low stock alerts
   */
  async getLowStockAlerts() {
    const lowStock = await Inventory.getLowStockItems();
    const expiring = await Inventory.getExpiringItems();
    
    return {
      lowStock: lowStock.map(item => ({
        ingredient: item.ingredient.name,
        currentStock: item.currentStock,
        minStock: item.minStock,
        unit: item.unit,
        percentageRemaining: (item.currentStock / item.minStock * 100).toFixed(1)
      })),
      expiring: expiring.map(item => ({
        ingredient: item.ingredient.name,
        batches: item.batches
          .filter(b => b.isActive && b.expiryDate)
          .map(b => ({
            batchNumber: b.batchNumber,
            quantity: b.quantity,
            expiryDate: b.expiryDate,
            daysUntilExpiry: Math.ceil((b.expiryDate - new Date()) / (1000 * 60 * 60 * 24))
          }))
      }))
    };
  }
  
  /**
   * Calculate total inventory value
   */
  async getInventoryValue() {
    return Inventory.getStockValue();
  }
  
  /**
   * Get movement history
   */
  async getMovementHistory(days = 7, type = null) {
    const dateFrom = new Date();
    dateFrom.setDate(dateFrom.getDate() - days);
    
    const query = {
      'movements.date': { $gte: dateFrom }
    };
    
    if (type) {
      query['movements.type'] = type;
    }
    
    const items = await Inventory.find(query)
      .populate('ingredient')
      .populate('movements.performedBy', 'name')
      .populate('movements.relatedOrder', 'orderNumber');
    
    const movements = [];
    
    items.forEach(item => {
      item.movements
        .filter(m => m.date >= dateFrom && (!type || m.type === type))
        .forEach(movement => {
          movements.push({
            ingredient: item.ingredient.name,
            ...movement.toObject(),
            performedBy: movement.performedBy?.name || 'System'
          });
        });
    });
    
    return movements.sort((a, b) => b.date - a.date);
  }
}

module.exports = new InventoryService();