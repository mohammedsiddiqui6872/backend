const Recipe = require('../models/Recipe');
const RecipeIngredient = require('../models/RecipeIngredient');
const InventoryItem = require('../models/InventoryItem');
const MenuItem = require('../models/MenuItem');
const StockMovement = require('../models/StockMovement');
const mongoose = require('mongoose');

class RecipeCostingService {
  /**
   * Calculate Recipe Cost - Complete cost breakdown
   */
  async calculateRecipeCost(tenantId, recipeId) {
    const recipe = await Recipe.findOne({ _id: recipeId, tenantId })
      .populate('ingredients.inventoryItem');
    
    if (!recipe) {
      throw new Error('Recipe not found');
    }
    
    let totalCost = 0;
    let totalFoodCost = 0;
    let totalLaborCost = 0;
    const ingredientCosts = [];
    
    // Calculate ingredient costs
    for (const ingredient of recipe.ingredients) {
      const inventoryItem = await InventoryItem.findOne({
        _id: ingredient.inventoryItem,
        tenantId
      });
      
      if (!inventoryItem) continue;
      
      // Get current cost based on costing method
      let unitCost = inventoryItem.currentCost;
      
      if (inventoryItem.costingMethod === 'WEIGHTED_AVG') {
        unitCost = inventoryItem.averageCost || inventoryItem.currentCost;
      } else if (inventoryItem.costingMethod === 'FIFO') {
        // Get oldest batch cost
        const oldestBatch = inventoryItem.batches
          .filter(b => !b.quarantined && b.quantity > 0)
          .sort((a, b) => a.receivedDate - b.receivedDate)[0];
        unitCost = oldestBatch ? oldestBatch.cost : inventoryItem.currentCost;
      }
      
      // Convert quantity to base unit
      const quantityInBaseUnit = this.convertToBaseUnit(
        ingredient.quantity,
        ingredient.unit,
        inventoryItem.baseUnit,
        inventoryItem.unitConversions
      );
      
      const ingredientCost = quantityInBaseUnit * unitCost;
      
      // Account for waste percentage
      const wasteMultiplier = 1 + (inventoryItem.wastePercentage || 0) / 100;
      const adjustedCost = ingredientCost * wasteMultiplier;
      
      ingredientCosts.push({
        item: inventoryItem.name,
        sku: inventoryItem.sku,
        quantity: ingredient.quantity,
        unit: ingredient.unit,
        unitCost,
        baseCost: ingredientCost,
        wastePercentage: inventoryItem.wastePercentage || 0,
        adjustedCost,
        percentageOfTotal: 0 // Will calculate after total
      });
      
      totalFoodCost += adjustedCost;
    }
    
    // Calculate labor cost
    if (recipe.prepTime || recipe.cookTime) {
      const totalMinutes = (recipe.prepTime || 0) + (recipe.cookTime || 0);
      const hourlyLaborCost = recipe.laborCostPerHour || 25; // Default $25/hour
      totalLaborCost = (totalMinutes / 60) * hourlyLaborCost;
    }
    
    // Calculate overhead
    const overheadPercentage = recipe.overheadPercentage || 15; // Default 15%
    const overheadCost = (totalFoodCost + totalLaborCost) * (overheadPercentage / 100);
    
    totalCost = totalFoodCost + totalLaborCost + overheadCost;
    
    // Calculate percentage of total for each ingredient
    ingredientCosts.forEach(ing => {
      ing.percentageOfTotal = totalCost > 0 ? (ing.adjustedCost / totalCost) * 100 : 0;
    });
    
    // Calculate portion cost
    const portionCost = totalCost / (recipe.yield || 1);
    
    // Calculate suggested pricing
    const targetFoodCostPercentage = recipe.targetFoodCostPercentage || 30;
    const suggestedPrice = portionCost / (targetFoodCostPercentage / 100);
    
    // Calculate margins
    const currentMenuItem = await MenuItem.findOne({
      tenantId,
      'recipe': recipeId
    });
    
    let currentPrice = currentMenuItem?.price || suggestedPrice;
    let profitMargin = ((currentPrice - portionCost) / currentPrice) * 100;
    let markup = ((currentPrice - portionCost) / portionCost) * 100;
    
    // Update recipe with calculated costs
    recipe.totalCost = totalCost;
    recipe.portionCost = portionCost;
    recipe.lastCostCalculation = new Date();
    await recipe.save();
    
    return {
      recipe: {
        id: recipe._id,
        name: recipe.name,
        yield: recipe.yield,
        unit: recipe.yieldUnit
      },
      costs: {
        foodCost: totalFoodCost,
        laborCost: totalLaborCost,
        overheadCost,
        totalCost,
        portionCost
      },
      ingredients: ingredientCosts,
      pricing: {
        currentPrice,
        suggestedPrice,
        targetFoodCostPercentage,
        actualFoodCostPercentage: (portionCost / currentPrice) * 100,
        profitMargin,
        markup
      },
      profitability: {
        costPerPortion: portionCost,
        revenuePerPortion: currentPrice,
        profitPerPortion: currentPrice - portionCost,
        classification: this.classifyProfitability(profitMargin, markup)
      }
    };
  }
  
  /**
   * Analyze Menu Profitability - Stars, Puzzles, Plowhorses, Dogs matrix
   */
  async analyzeMenuProfitability(tenantId, period = 30) {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - period);
    
    // Get all menu items with sales data
    const menuItems = await MenuItem.find({ tenantId, isActive: true })
      .populate('recipe');
    
    const analysis = [];
    
    for (const item of menuItems) {
      // Get sales data
      const salesData = await this.getItemSalesData(tenantId, item._id, startDate, endDate);
      
      // Calculate costs
      let portionCost = 0;
      if (item.recipe) {
        const recipeCost = await this.calculateRecipeCost(tenantId, item.recipe._id);
        portionCost = recipeCost.costs.portionCost;
      }
      
      const profitMargin = item.price > 0 ? ((item.price - portionCost) / item.price) * 100 : 0;
      const contribution = item.price - portionCost;
      const totalContribution = contribution * salesData.quantitySold;
      
      analysis.push({
        item: {
          id: item._id,
          name: item.name,
          category: item.category,
          price: item.price
        },
        sales: {
          quantity: salesData.quantitySold,
          revenue: salesData.revenue,
          frequency: salesData.orderCount
        },
        costs: {
          portionCost,
          foodCostPercentage: (portionCost / item.price) * 100
        },
        profitability: {
          contribution,
          totalContribution,
          profitMargin
        },
        popularity: salesData.quantitySold,
        classification: null // Will be set after analysis
      });
    }
    
    // Calculate medians for classification
    const sortedByPopularity = [...analysis].sort((a, b) => a.popularity - b.popularity);
    const sortedByProfitability = [...analysis].sort((a, b) => a.profitability.profitMargin - b.profitability.profitMargin);
    
    const medianPopularity = sortedByPopularity[Math.floor(sortedByPopularity.length / 2)].popularity;
    const medianProfitability = sortedByProfitability[Math.floor(sortedByProfitability.length / 2)].profitability.profitMargin;
    
    // Classify items
    analysis.forEach(item => {
      const highPopularity = item.popularity >= medianPopularity;
      const highProfitability = item.profitability.profitMargin >= medianProfitability;
      
      if (highPopularity && highProfitability) {
        item.classification = 'STAR';
        item.recommendation = 'Highlight and promote - These are your winners';
      } else if (!highPopularity && highProfitability) {
        item.classification = 'PUZZLE';
        item.recommendation = 'Increase marketing and visibility to boost sales';
      } else if (highPopularity && !highProfitability) {
        item.classification = 'PLOWHORSE';
        item.recommendation = 'Optimize costs or carefully increase prices';
      } else {
        item.classification = 'DOG';
        item.recommendation = 'Consider removing or reimagining these items';
      }
    });
    
    // Generate summary
    const summary = {
      stars: analysis.filter(i => i.classification === 'STAR'),
      puzzles: analysis.filter(i => i.classification === 'PUZZLE'),
      plowhorses: analysis.filter(i => i.classification === 'PLOWHORSE'),
      dogs: analysis.filter(i => i.classification === 'DOG')
    };
    
    return {
      period: {
        startDate,
        endDate,
        days: period
      },
      metrics: {
        totalItems: analysis.length,
        averageFoodCost: analysis.reduce((sum, i) => sum + i.costs.foodCostPercentage, 0) / analysis.length,
        totalRevenue: analysis.reduce((sum, i) => sum + i.sales.revenue, 0),
        totalContribution: analysis.reduce((sum, i) => sum + i.profitability.totalContribution, 0)
      },
      items: analysis,
      matrix: {
        stars: {
          count: summary.stars.length,
          items: summary.stars.map(i => ({
            name: i.item.name,
            contribution: i.profitability.totalContribution,
            quantity: i.sales.quantity
          })),
          totalContribution: summary.stars.reduce((sum, i) => sum + i.profitability.totalContribution, 0),
          recommendation: 'Premium placement, maintain quality, use for promotions'
        },
        puzzles: {
          count: summary.puzzles.length,
          items: summary.puzzles.map(i => ({
            name: i.item.name,
            contribution: i.profitability.totalContribution,
            quantity: i.sales.quantity
          })),
          totalContribution: summary.puzzles.reduce((sum, i) => sum + i.profitability.totalContribution, 0),
          recommendation: 'Increase visibility, sampling, bundle with popular items'
        },
        plowhorses: {
          count: summary.plowhorses.length,
          items: summary.plowhorses.map(i => ({
            name: i.item.name,
            contribution: i.profitability.totalContribution,
            quantity: i.sales.quantity
          })),
          totalContribution: summary.plowhorses.reduce((sum, i) => sum + i.profitability.totalContribution, 0),
          recommendation: 'Reduce portions slightly, find cost savings, bundle strategically'
        },
        dogs: {
          count: summary.dogs.length,
          items: summary.dogs.map(i => ({
            name: i.item.name,
            contribution: i.profitability.totalContribution,
            quantity: i.sales.quantity
          })),
          totalContribution: summary.dogs.reduce((sum, i) => sum + i.profitability.totalContribution, 0),
          recommendation: 'Remove from menu, reimagine completely, or move to specials'
        }
      }
    };
  }
  
  /**
   * Track Yield Variance - Monitor actual vs theoretical yields
   */
  async trackYieldVariance(tenantId, recipeId, actualYield, userId) {
    const recipe = await Recipe.findOne({ _id: recipeId, tenantId });
    
    if (!recipe) {
      throw new Error('Recipe not found');
    }
    
    const theoreticalYield = recipe.yield;
    const variance = actualYield - theoreticalYield;
    const variancePercentage = (variance / theoreticalYield) * 100;
    
    // Store yield history
    if (!recipe.yieldHistory) {
      recipe.yieldHistory = [];
    }
    
    recipe.yieldHistory.push({
      date: new Date(),
      theoreticalYield,
      actualYield,
      variance,
      variancePercentage,
      recordedBy: userId
    });
    
    // Update average yield
    const recentYields = recipe.yieldHistory.slice(-10); // Last 10 productions
    const averageActualYield = recentYields.reduce((sum, y) => sum + y.actualYield, 0) / recentYields.length;
    
    recipe.averageActualYield = averageActualYield;
    recipe.yieldVariance = ((averageActualYield - theoreticalYield) / theoreticalYield) * 100;
    
    await recipe.save();
    
    // Adjust recipe cost if variance is significant
    if (Math.abs(recipe.yieldVariance) > 5) {
      await this.adjustRecipeForYield(tenantId, recipeId, averageActualYield);
    }
    
    return {
      recipe: recipe.name,
      theoreticalYield,
      actualYield,
      variance,
      variancePercentage,
      averageActualYield,
      recommendation: this.getYieldRecommendation(variancePercentage)
    };
  }
  
  /**
   * Monitor Price Changes - Track supplier price volatility
   */
  async monitorPriceChanges(tenantId, period = 30) {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - period);
    
    // Get all inventory items with price history
    const items = await InventoryItem.find({ tenantId, isActive: true });
    const priceChanges = [];
    
    for (const item of items) {
      // Get purchase history
      const purchases = await StockMovement.find({
        tenantId,
        inventoryItem: item._id,
        type: 'PURCHASE',
        performedDate: { $gte: startDate, $lte: endDate }
      }).sort({ performedDate: 1 });
      
      if (purchases.length < 2) continue;
      
      const prices = purchases.map(p => p.unitCost);
      const firstPrice = prices[0];
      const lastPrice = prices[prices.length - 1];
      const priceChange = lastPrice - firstPrice;
      const priceChangePercentage = (priceChange / firstPrice) * 100;
      
      // Calculate volatility (standard deviation)
      const mean = prices.reduce((sum, p) => sum + p, 0) / prices.length;
      const variance = prices.reduce((sum, p) => sum + Math.pow(p - mean, 2), 0) / prices.length;
      const volatility = Math.sqrt(variance);
      const volatilityPercentage = (volatility / mean) * 100;
      
      priceChanges.push({
        item: {
          id: item._id,
          name: item.name,
          sku: item.sku,
          category: item.category
        },
        pricing: {
          startPrice: firstPrice,
          endPrice: lastPrice,
          change: priceChange,
          changePercentage: priceChangePercentage,
          currentCost: item.currentCost
        },
        volatility: {
          standardDeviation: volatility,
          percentage: volatilityPercentage,
          classification: 
            volatilityPercentage < 5 ? 'STABLE' :
            volatilityPercentage < 15 ? 'MODERATE' :
            'VOLATILE'
        },
        samples: purchases.length,
        recommendation: this.getPriceChangeRecommendation(priceChangePercentage, volatilityPercentage)
      });
    }
    
    // Sort by impact
    priceChanges.sort((a, b) => Math.abs(b.pricing.changePercentage) - Math.abs(a.pricing.changePercentage));
    
    // Find affected recipes
    const affectedRecipes = [];
    for (const change of priceChanges.filter(c => Math.abs(c.pricing.changePercentage) > 10)) {
      const recipes = await Recipe.find({
        tenantId,
        'ingredients.inventoryItem': change.item.id
      });
      
      for (const recipe of recipes) {
        const oldCost = await this.calculateRecipeCostWithPrice(recipe, change.item.id, change.pricing.startPrice);
        const newCost = await this.calculateRecipeCostWithPrice(recipe, change.item.id, change.pricing.endPrice);
        const costChange = newCost - oldCost;
        
        affectedRecipes.push({
          recipe: recipe.name,
          item: change.item.name,
          oldCost,
          newCost,
          costChange,
          costChangePercentage: (costChange / oldCost) * 100
        });
      }
    }
    
    return {
      period: { startDate, endDate, days: period },
      summary: {
        totalItems: priceChanges.length,
        increasedItems: priceChanges.filter(i => i.pricing.changePercentage > 0).length,
        decreasedItems: priceChanges.filter(i => i.pricing.changePercentage < 0).length,
        stableItems: priceChanges.filter(i => Math.abs(i.pricing.changePercentage) < 5).length,
        volatileItems: priceChanges.filter(i => i.volatility.classification === 'VOLATILE').length
      },
      priceChanges,
      affectedRecipes: affectedRecipes.sort((a, b) => Math.abs(b.costChangePercentage) - Math.abs(a.costChangePercentage)),
      recommendations: this.generatePriceChangeRecommendations(priceChanges, affectedRecipes)
    };
  }
  
  /**
   * Update Recipe Costs Automatically - Cascade price changes
   */
  async updateAllRecipeCosts(tenantId) {
    const recipes = await Recipe.find({ tenantId, isActive: true });
    const updates = [];
    
    for (const recipe of recipes) {
      const oldCost = recipe.portionCost || 0;
      const costData = await this.calculateRecipeCost(tenantId, recipe._id);
      const newCost = costData.costs.portionCost;
      
      if (Math.abs(newCost - oldCost) > 0.01) {
        updates.push({
          recipe: {
            id: recipe._id,
            name: recipe.name
          },
          oldCost,
          newCost,
          change: newCost - oldCost,
          changePercentage: oldCost > 0 ? ((newCost - oldCost) / oldCost) * 100 : 0,
          menuItems: await this.updateMenuPrices(tenantId, recipe._id, newCost)
        });
      }
    }
    
    return {
      timestamp: new Date(),
      recipesUpdated: updates.length,
      updates,
      summary: {
        totalCostIncrease: updates.filter(u => u.change > 0).reduce((sum, u) => sum + u.change, 0),
        totalCostDecrease: updates.filter(u => u.change < 0).reduce((sum, u) => sum + Math.abs(u.change), 0),
        averageChange: updates.reduce((sum, u) => sum + u.changePercentage, 0) / updates.length
      }
    };
  }
  
  // Helper methods
  convertToBaseUnit(quantity, fromUnit, toUnit, conversions) {
    if (fromUnit === toUnit) return quantity;
    
    const conversion = conversions.find(c => 
      (c.fromUnit === fromUnit && c.toUnit === toUnit) ||
      (c.fromUnit === toUnit && c.toUnit === fromUnit)
    );
    
    if (conversion) {
      if (conversion.fromUnit === fromUnit) {
        return quantity * conversion.factor;
      } else {
        return quantity / conversion.factor;
      }
    }
    
    // Default conversions
    const defaultConversions = {
      'kg-g': 1000,
      'l-ml': 1000,
      'dozen-piece': 12,
      'case-piece': 24
    };
    
    const key = `${fromUnit}-${toUnit}`;
    if (defaultConversions[key]) {
      return quantity * defaultConversions[key];
    }
    
    const reverseKey = `${toUnit}-${fromUnit}`;
    if (defaultConversions[reverseKey]) {
      return quantity / defaultConversions[reverseKey];
    }
    
    return quantity; // No conversion found
  }
  
  classifyProfitability(profitMargin, markup) {
    if (profitMargin >= 70 && markup >= 200) return 'EXCELLENT';
    if (profitMargin >= 60 && markup >= 150) return 'GOOD';
    if (profitMargin >= 50 && markup >= 100) return 'AVERAGE';
    if (profitMargin >= 40 && markup >= 60) return 'BELOW_AVERAGE';
    return 'POOR';
  }
  
  async getItemSalesData(tenantId, menuItemId, startDate, endDate) {
    const Order = require('../models/Order');
    
    const orders = await Order.aggregate([
      {
        $match: {
          tenantId,
          createdAt: { $gte: startDate, $lte: endDate },
          status: { $in: ['completed', 'delivered'] },
          'items.menuItem': mongoose.Types.ObjectId(menuItemId)
        }
      },
      {
        $unwind: '$items'
      },
      {
        $match: {
          'items.menuItem': mongoose.Types.ObjectId(menuItemId)
        }
      },
      {
        $group: {
          _id: null,
          quantitySold: { $sum: '$items.quantity' },
          revenue: { $sum: { $multiply: ['$items.price', '$items.quantity'] } },
          orderCount: { $sum: 1 }
        }
      }
    ]);
    
    return orders[0] || { quantitySold: 0, revenue: 0, orderCount: 0 };
  }
  
  getYieldRecommendation(variancePercentage) {
    if (variancePercentage > 10) {
      return 'Yield significantly higher than expected - Review portion sizes';
    } else if (variancePercentage > 5) {
      return 'Yield slightly higher - Monitor for consistency';
    } else if (variancePercentage < -10) {
      return 'Yield significantly lower - Check preparation methods and waste';
    } else if (variancePercentage < -5) {
      return 'Yield slightly lower - Review staff training';
    }
    return 'Yield within acceptable range';
  }
  
  getPriceChangeRecommendation(changePercentage, volatilityPercentage) {
    const recommendations = [];
    
    if (changePercentage > 20) {
      recommendations.push('Significant price increase - Consider finding alternative suppliers');
    } else if (changePercentage > 10) {
      recommendations.push('Notable price increase - Review menu prices');
    }
    
    if (volatilityPercentage > 15) {
      recommendations.push('High price volatility - Consider locking in prices with contracts');
    }
    
    if (changePercentage < -10) {
      recommendations.push('Price decrease - Opportunity to improve margins or run promotions');
    }
    
    return recommendations.length > 0 ? recommendations : ['Price stable - No action required'];
  }
  
  generatePriceChangeRecommendations(priceChanges, affectedRecipes) {
    const recommendations = [];
    
    // High impact items
    const highImpact = priceChanges.filter(i => Math.abs(i.pricing.changePercentage) > 15);
    if (highImpact.length > 0) {
      recommendations.push({
        type: 'HIGH_PRIORITY',
        message: `${highImpact.length} items with significant price changes require immediate attention`,
        items: highImpact.map(i => i.item.name)
      });
    }
    
    // Volatile items
    const volatile = priceChanges.filter(i => i.volatility.classification === 'VOLATILE');
    if (volatile.length > 0) {
      recommendations.push({
        type: 'RISK_MANAGEMENT',
        message: `${volatile.length} items show high price volatility - Consider price contracts`,
        items: volatile.map(i => i.item.name)
      });
    }
    
    // Menu price adjustments
    const significantRecipeImpact = affectedRecipes.filter(r => Math.abs(r.costChangePercentage) > 10);
    if (significantRecipeImpact.length > 0) {
      recommendations.push({
        type: 'MENU_PRICING',
        message: `${significantRecipeImpact.length} menu items need price review`,
        items: significantRecipeImpact.map(r => r.recipe)
      });
    }
    
    return recommendations;
  }
  
  async calculateRecipeCostWithPrice(recipe, inventoryItemId, price) {
    let totalCost = 0;
    
    for (const ingredient of recipe.ingredients) {
      let unitCost = price;
      if (ingredient.inventoryItem.toString() !== inventoryItemId.toString()) {
        const item = await InventoryItem.findById(ingredient.inventoryItem);
        unitCost = item.currentCost;
      }
      
      totalCost += ingredient.quantity * unitCost;
    }
    
    return totalCost / (recipe.yield || 1);
  }
  
  async updateMenuPrices(tenantId, recipeId, newCost) {
    const menuItems = await MenuItem.find({ tenantId, recipe: recipeId });
    const updates = [];
    
    for (const item of menuItems) {
      const targetMargin = item.targetProfitMargin || 70;
      const suggestedPrice = newCost / (1 - targetMargin / 100);
      
      if (Math.abs(suggestedPrice - item.price) > 0.5) {
        updates.push({
          item: item.name,
          currentPrice: item.price,
          suggestedPrice,
          costPercentage: (newCost / item.price) * 100
        });
      }
    }
    
    return updates;
  }
  
  async adjustRecipeForYield(tenantId, recipeId, actualYield) {
    const recipe = await Recipe.findOne({ _id: recipeId, tenantId });
    
    if (!recipe) return;
    
    // Adjust the recipe yield to match actual
    recipe.adjustedYield = actualYield;
    
    // Recalculate portion cost with actual yield
    const totalCost = recipe.totalCost || 0;
    recipe.portionCost = totalCost / actualYield;
    
    await recipe.save();
    
    return recipe;
  }
}

module.exports = new RecipeCostingService();