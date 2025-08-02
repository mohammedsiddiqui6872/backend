const StockTransaction = require('../models/StockTransaction');
const MenuItem = require('../models/MenuItem');
const { getCurrentTenantId } = require('../middleware/tenantContext');

class StockService {
  /**
   * Deduct stock when an order is placed
   */
  static async deductStockForOrder(orderId, items, userId, tenantId) {
    const transactions = [];
    const Recipe = require('../models/Recipe');
    
    for (const item of items) {
      const menuItem = await MenuItem.findOne({ 
        _id: item.menuItem || item.id,
        tenantId 
      });
      
      if (!menuItem) continue;
      
      // Check if this menu item has a recipe
      const recipe = await Recipe.findOne({
        menuItem: menuItem._id,
        tenantId
      }).populate('ingredients.ingredient');
      
      if (recipe) {
        // Deduct ingredients based on recipe
        try {
          const deductions = await recipe.deductIngredients(item.quantity || 1);
          console.log(`Deducted ingredients for ${menuItem.name}:`, deductions);
        } catch (error) {
          console.error(`Failed to deduct ingredients for ${menuItem.name}:`, error.message);
          // Continue with menu item stock deduction as fallback
        }
      }
      
      // Also handle menu item level stock if set
      if (menuItem.stockQuantity !== -1) {
        const quantity = -(item.quantity || 1); // Negative for deduction
        const previousStock = menuItem.stockQuantity;
        const newStock = previousStock + quantity;
        
        if (newStock < 0) {
          throw new Error(`Insufficient stock for ${menuItem.name}. Available: ${previousStock}, Requested: ${Math.abs(quantity)}`);
        }
        
        // Update menu item stock
        menuItem.stockQuantity = newStock;
        menuItem.inStock = newStock > 0;
        await menuItem.save();
        
        // Create transaction record
        const transaction = await StockTransaction.create({
          tenantId,
          menuItemId: menuItem._id,
          transactionType: 'sale',
          quantity,
          previousStock,
          newStock,
          orderId,
          performedBy: userId
        });
        
        transactions.push(transaction);
        
        // Check for low stock alert
        if (newStock <= menuItem.lowStockThreshold && newStock > 0) {
          this.emitLowStockAlert(menuItem, newStock, tenantId);
        } else if (newStock === 0) {
          this.emitOutOfStockAlert(menuItem, tenantId);
        }
      }
    }
    
    return transactions;
  }
  
  /**
   * Return stock when an order is cancelled or refunded
   */
  static async returnStockForOrder(orderId, items, userId, tenantId) {
    const transactions = [];
    
    for (const item of items) {
      const menuItem = await MenuItem.findOne({ 
        _id: item.menuItem || item.id,
        tenantId 
      });
      
      if (!menuItem || menuItem.stockQuantity === -1) {
        continue;
      }
      
      const quantity = item.quantity || 1; // Positive for return
      const previousStock = menuItem.stockQuantity;
      const newStock = previousStock + quantity;
      
      // Update menu item stock
      menuItem.stockQuantity = newStock;
      menuItem.inStock = true;
      await menuItem.save();
      
      // Create transaction record
      const transaction = await StockTransaction.create({
        tenantId,
        menuItemId: menuItem._id,
        transactionType: 'return',
        quantity,
        previousStock,
        newStock,
        orderId,
        performedBy: userId
      });
      
      transactions.push(transaction);
    }
    
    return transactions;
  }
  
  /**
   * Adjust stock manually
   */
  static async adjustStock(menuItemId, quantity, reason, userId, transactionType = 'adjustment') {
    const tenantId = getCurrentTenantId();
    const menuItem = await MenuItem.findOne({ _id: menuItemId, tenantId });
    
    if (!menuItem) {
      throw new Error('Menu item not found');
    }
    
    if (menuItem.stockQuantity === -1) {
      throw new Error('Cannot adjust stock for items with unlimited stock');
    }
    
    const previousStock = menuItem.stockQuantity;
    const newStock = transactionType === 'restock' ? previousStock + quantity : quantity;
    
    if (newStock < 0) {
      throw new Error('Stock cannot be negative');
    }
    
    // Update menu item stock
    menuItem.stockQuantity = newStock;
    menuItem.inStock = newStock > 0;
    await menuItem.save();
    
    // Create transaction record
    const transaction = await StockTransaction.create({
      tenantId,
      menuItemId: menuItem._id,
      transactionType,
      quantity: transactionType === 'restock' ? quantity : quantity - previousStock,
      previousStock,
      newStock,
      reason,
      performedBy: userId
    });
    
    // Check stock levels and emit alerts
    if (newStock <= menuItem.lowStockThreshold && newStock > 0) {
      this.emitLowStockAlert(menuItem, newStock, tenantId);
    } else if (newStock === 0) {
      this.emitOutOfStockAlert(menuItem, tenantId);
    }
    
    return transaction;
  }
  
  /**
   * Record waste
   */
  static async recordWaste(menuItemId, quantity, reason, userId) {
    const tenantId = getCurrentTenantId();
    const menuItem = await MenuItem.findOne({ _id: menuItemId, tenantId });
    
    if (!menuItem) {
      throw new Error('Menu item not found');
    }
    
    if (menuItem.stockQuantity === -1) {
      throw new Error('Cannot record waste for items with unlimited stock');
    }
    
    const previousStock = menuItem.stockQuantity;
    const newStock = previousStock - quantity;
    
    if (newStock < 0) {
      throw new Error(`Cannot waste more than available stock. Available: ${previousStock}`);
    }
    
    // Update menu item stock
    menuItem.stockQuantity = newStock;
    menuItem.inStock = newStock > 0;
    await menuItem.save();
    
    // Create transaction record
    const transaction = await StockTransaction.create({
      tenantId,
      menuItemId: menuItem._id,
      transactionType: 'waste',
      quantity: -quantity, // Negative for waste
      previousStock,
      newStock,
      reason,
      performedBy: userId
    });
    
    // Check stock levels
    if (newStock <= menuItem.lowStockThreshold && newStock > 0) {
      this.emitLowStockAlert(menuItem, newStock, tenantId);
    } else if (newStock === 0) {
      this.emitOutOfStockAlert(menuItem, tenantId);
    }
    
    return transaction;
  }
  
  /**
   * Get stock levels for all items
   */
  static async getStockLevels(filters = {}) {
    const tenantId = getCurrentTenantId();
    const query = { tenantId, ...filters };
    
    if (filters.lowStock) {
      query.$expr = {
        $and: [
          { $ne: ['$stockQuantity', -1] },
          { $lte: ['$stockQuantity', '$lowStockThreshold'] }
        ]
      };
      delete query.lowStock;
    }
    
    const items = await MenuItem.find(query)
      .select('name nameAr category stockQuantity lowStockThreshold inStock price cost image')
      .sort({ stockQuantity: 1 });
    
    return items;
  }
  
  /**
   * Get stock value report
   */
  static async getStockValueReport() {
    const tenantId = getCurrentTenantId();
    
    const items = await MenuItem.find({ 
      tenantId, 
      stockQuantity: { $gt: 0 },
      cost: { $gt: 0 }
    });
    
    const report = {
      totalItems: 0,
      totalQuantity: 0,
      totalValue: 0,
      categories: {}
    };
    
    items.forEach(item => {
      const value = item.stockQuantity * (item.cost || 0);
      report.totalItems++;
      report.totalQuantity += item.stockQuantity;
      report.totalValue += value;
      
      if (!report.categories[item.category]) {
        report.categories[item.category] = {
          items: 0,
          quantity: 0,
          value: 0
        };
      }
      
      report.categories[item.category].items++;
      report.categories[item.category].quantity += item.stockQuantity;
      report.categories[item.category].value += value;
    });
    
    return report;
  }
  
  /**
   * Emit low stock alert via Socket.io
   */
  static emitLowStockAlert(menuItem, currentStock, tenantId) {
    const io = global.io;
    if (io) {
      io.to(`tenant-${tenantId}`).emit('stock-alert', {
        type: 'low-stock',
        item: {
          id: menuItem._id,
          name: menuItem.name,
          currentStock,
          threshold: menuItem.lowStockThreshold
        },
        timestamp: new Date()
      });
    }
  }
  
  /**
   * Emit out of stock alert via Socket.io
   */
  static emitOutOfStockAlert(menuItem, tenantId) {
    const io = global.io;
    if (io) {
      io.to(`tenant-${tenantId}`).emit('stock-alert', {
        type: 'out-of-stock',
        item: {
          id: menuItem._id,
          name: menuItem.name
        },
        timestamp: new Date()
      });
    }
  }
}

module.exports = StockService;