const express = require('express');
const router = express.Router();
const MenuItem = require('../../models/MenuItem');
const Order = require('../../models/Order');
const Recipe = require('../../models/Recipe');
const { authenticate, authorize } = require('../../middleware/auth');
const { enterpriseTenantIsolation } = require('../../middleware/enterpriseTenantIsolation');
const { startOfDay, endOfDay, subDays, startOfMonth, endOfMonth } = require('date-fns');

// Get profitability analysis for menu items
router.get('/profitability', authenticate, authorize(['analytics.view', 'menu.view']), enterpriseTenantIsolation, async (req, res) => {
  try {
    const { 
      startDate = subDays(new Date(), 30).toISOString(), 
      endDate = new Date().toISOString(),
      category,
      sortBy = 'profit',
      order = 'desc',
      limit = 20
    } = req.query;

    // Build query
    const menuQuery = { 
      tenantId: req.tenant.tenantId,
      isDeleted: false
    };
    
    if (category) {
      menuQuery.category = category;
    }

    // Get all menu items with their recipes
    const menuItems = await MenuItem.find(menuQuery)
      .populate('modifierGroups.group')
      .lean();

    // Get recipes for cost calculation
    const recipes = await Recipe.find({ 
      tenantId: req.tenant.tenantId,
      menuItem: { $in: menuItems.map(item => item._id) }
    }).lean();

    // Create recipe map
    const recipeMap = {};
    recipes.forEach(recipe => {
      recipeMap[recipe.menuItem.toString()] = recipe;
    });

    // Get orders in date range
    const orders = await Order.find({
      tenantId: req.tenant.tenantId,
      createdAt: {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      },
      status: { $in: ['completed', 'delivered'] }
    }).lean();

    // Calculate sales data for each item
    const itemAnalytics = menuItems.map(item => {
      const itemId = item._id.toString();
      const recipe = recipeMap[itemId];
      
      // Calculate cost
      let cost = item.cost || 0;
      if (recipe && recipe.totalCost) {
        cost = recipe.totalCost;
      }

      // Calculate revenue and quantity sold
      let revenue = 0;
      let quantitySold = 0;
      let modifierRevenue = 0;

      orders.forEach(order => {
        order.items.forEach(orderItem => {
          if (orderItem.menuItem && orderItem.menuItem.toString() === itemId) {
            quantitySold += orderItem.quantity;
            revenue += orderItem.price * orderItem.quantity;
            
            // Add modifier revenue
            if (orderItem.modifiers && orderItem.modifiers.length > 0) {
              orderItem.modifiers.forEach(mod => {
                modifierRevenue += (mod.price || 0) * orderItem.quantity;
              });
            }
          }
        });
      });

      const totalRevenue = revenue + modifierRevenue;
      const totalCost = cost * quantitySold;
      const profit = totalRevenue - totalCost;
      const profitMargin = totalRevenue > 0 ? (profit / totalRevenue) * 100 : 0;

      return {
        _id: item._id,
        name: item.name,
        nameAr: item.nameAr,
        category: item.category,
        image: item.image,
        price: item.price,
        cost: cost,
        quantitySold,
        revenue: totalRevenue,
        modifierRevenue,
        totalCost,
        profit,
        profitMargin,
        available: item.available,
        inStock: item.inStock,
        stockQuantity: item.stockQuantity,
        rating: item.rating || 0,
        // Categorize for menu engineering matrix
        popularity: quantitySold, // Will be normalized later
        profitability: profitMargin
      };
    });

    // Calculate average values for categorization
    const avgQuantitySold = itemAnalytics.reduce((sum, item) => sum + item.quantitySold, 0) / itemAnalytics.length || 0;
    const avgProfitMargin = itemAnalytics.reduce((sum, item) => sum + item.profitMargin, 0) / itemAnalytics.length || 0;

    // Categorize items (Menu Engineering Matrix)
    itemAnalytics.forEach(item => {
      const highPopularity = item.quantitySold >= avgQuantitySold;
      const highProfitability = item.profitMargin >= avgProfitMargin;

      if (highPopularity && highProfitability) {
        item.category_analysis = 'star'; // Keep promoting
      } else if (highPopularity && !highProfitability) {
        item.category_analysis = 'plowhorse'; // Increase price or reduce cost
      } else if (!highPopularity && highProfitability) {
        item.category_analysis = 'puzzle'; // Promote more
      } else {
        item.category_analysis = 'dog'; // Consider removing
      }
    });

    // Sort results
    const sortedItems = itemAnalytics.sort((a, b) => {
      const multiplier = order === 'desc' ? -1 : 1;
      
      switch (sortBy) {
        case 'profit':
          return multiplier * (a.profit - b.profit);
        case 'profitMargin':
          return multiplier * (a.profitMargin - b.profitMargin);
        case 'revenue':
          return multiplier * (a.revenue - b.revenue);
        case 'quantitySold':
          return multiplier * (a.quantitySold - b.quantitySold);
        case 'cost':
          return multiplier * (a.cost - b.cost);
        default:
          return 0;
      }
    });

    // Apply limit
    const limitedItems = limit > 0 ? sortedItems.slice(0, parseInt(limit)) : sortedItems;

    // Calculate summary statistics
    const summary = {
      totalItems: itemAnalytics.length,
      totalRevenue: itemAnalytics.reduce((sum, item) => sum + item.revenue, 0),
      totalCost: itemAnalytics.reduce((sum, item) => sum + item.totalCost, 0),
      totalProfit: itemAnalytics.reduce((sum, item) => sum + item.profit, 0),
      totalQuantitySold: itemAnalytics.reduce((sum, item) => sum + item.quantitySold, 0),
      averageProfitMargin: avgProfitMargin,
      categoryBreakdown: {
        stars: itemAnalytics.filter(item => item.category_analysis === 'star').length,
        plowhorses: itemAnalytics.filter(item => item.category_analysis === 'plowhorse').length,
        puzzles: itemAnalytics.filter(item => item.category_analysis === 'puzzle').length,
        dogs: itemAnalytics.filter(item => item.category_analysis === 'dog').length
      }
    };

    res.json({
      success: true,
      data: {
        items: limitedItems,
        summary,
        dateRange: {
          startDate,
          endDate
        }
      }
    });
  } catch (error) {
    console.error('Error fetching profitability analysis:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch profitability analysis' 
    });
  }
});

// Get sales velocity data
router.get('/sales-velocity', authenticate, authorize(['analytics.view', 'menu.view']), enterpriseTenantIsolation, async (req, res) => {
  try {
    const { 
      period = '30', // days
      category,
      limit = 20
    } = req.query;

    const daysAgo = parseInt(period);
    const startDate = subDays(new Date(), daysAgo);

    // Build query
    const menuQuery = { 
      tenantId: req.tenant.tenantId,
      isDeleted: false
    };
    
    if (category) {
      menuQuery.category = category;
    }

    const menuItems = await MenuItem.find(menuQuery).lean();

    // Get hourly sales data
    const hourlyOrders = await Order.aggregate([
      {
        $match: {
          tenantId: req.tenant.tenantId,
          createdAt: { $gte: startDate },
          status: { $in: ['completed', 'delivered'] }
        }
      },
      { $unwind: '$items' },
      {
        $group: {
          _id: {
            menuItem: '$items.menuItem',
            hour: { $hour: '$createdAt' },
            dayOfWeek: { $dayOfWeek: '$createdAt' }
          },
          quantity: { $sum: '$items.quantity' },
          revenue: { $sum: { $multiply: ['$items.price', '$items.quantity'] } }
        }
      }
    ]);

    // Process data for each menu item
    const velocityData = menuItems.map(item => {
      const itemId = item._id.toString();
      const itemHourlyData = hourlyOrders.filter(h => 
        h._id.menuItem && h._id.menuItem.toString() === itemId
      );

      // Calculate velocity metrics
      const totalQuantity = itemHourlyData.reduce((sum, h) => sum + h.quantity, 0);
      const totalRevenue = itemHourlyData.reduce((sum, h) => sum + h.revenue, 0);
      const salesPerDay = totalQuantity / daysAgo;
      const revenuePerDay = totalRevenue / daysAgo;

      // Find peak hours
      const hourlyQuantities = {};
      itemHourlyData.forEach(h => {
        const hour = h._id.hour;
        hourlyQuantities[hour] = (hourlyQuantities[hour] || 0) + h.quantity;
      });

      const peakHour = Object.entries(hourlyQuantities)
        .sort((a, b) => b[1] - a[1])[0];

      // Find best day of week
      const dayQuantities = {};
      itemHourlyData.forEach(h => {
        const day = h._id.dayOfWeek;
        dayQuantities[day] = (dayQuantities[day] || 0) + h.quantity;
      });

      const bestDay = Object.entries(dayQuantities)
        .sort((a, b) => b[1] - a[1])[0];

      // Calculate trend (simple linear regression)
      const dailyOrders = await Order.aggregate([
        {
          $match: {
            tenantId: req.tenant.tenantId,
            createdAt: { $gte: startDate },
            status: { $in: ['completed', 'delivered'] },
            'items.menuItem': item._id
          }
        },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            quantity: { $sum: '$items.quantity' }
          }
        },
        { $sort: { _id: 1 } }
      ]);

      // Simple trend calculation
      let trend = 'stable';
      if (dailyOrders.length > 7) {
        const firstWeek = dailyOrders.slice(0, 7).reduce((sum, d) => sum + d.quantity, 0) / 7;
        const lastWeek = dailyOrders.slice(-7).reduce((sum, d) => sum + d.quantity, 0) / 7;
        
        if (lastWeek > firstWeek * 1.1) trend = 'increasing';
        else if (lastWeek < firstWeek * 0.9) trend = 'decreasing';
      }

      return {
        _id: item._id,
        name: item.name,
        category: item.category,
        image: item.image,
        totalQuantitySold: totalQuantity,
        totalRevenue,
        salesPerDay,
        revenuePerDay,
        velocity: salesPerDay, // Items per day
        peakHour: peakHour ? parseInt(peakHour[0]) : null,
        peakHourSales: peakHour ? peakHour[1] : 0,
        bestDayOfWeek: bestDay ? parseInt(bestDay[0]) : null,
        bestDaySales: bestDay ? bestDay[1] : 0,
        trend,
        stockDaysRemaining: item.stockQuantity > 0 && salesPerDay > 0 
          ? Math.floor(item.stockQuantity / salesPerDay) 
          : null
      };
    });

    // Sort by velocity
    const sortedData = velocityData
      .sort((a, b) => b.velocity - a.velocity)
      .slice(0, parseInt(limit));

    // Calculate summary
    const summary = {
      totalItems: velocityData.length,
      avgSalesPerDay: velocityData.reduce((sum, item) => sum + item.salesPerDay, 0) / velocityData.length,
      totalRevenue: velocityData.reduce((sum, item) => sum + item.totalRevenue, 0),
      fastMovers: velocityData.filter(item => item.trend === 'increasing').length,
      slowMovers: velocityData.filter(item => item.trend === 'decreasing').length,
      criticalStock: velocityData.filter(item => 
        item.stockDaysRemaining !== null && item.stockDaysRemaining < 7
      ).length
    };

    res.json({
      success: true,
      data: {
        items: sortedData,
        summary,
        period: daysAgo
      }
    });
  } catch (error) {
    console.error('Error fetching sales velocity:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch sales velocity data' 
    });
  }
});

// Get menu engineering matrix data
router.get('/menu-engineering', authenticate, authorize(['analytics.view', 'menu.view']), enterpriseTenantIsolation, async (req, res) => {
  try {
    const { 
      startDate = subDays(new Date(), 30).toISOString(), 
      endDate = new Date().toISOString(),
      category
    } = req.query;

    // Get profitability data (reuse logic from profitability endpoint)
    const profitabilityData = await getProfitabilityData(
      req.tenant.tenantId, 
      startDate, 
      endDate, 
      category
    );

    // Format for matrix visualization
    const matrixData = {
      stars: [],
      plowhorses: [],
      puzzles: [],
      dogs: []
    };

    profitabilityData.forEach(item => {
      const matrixItem = {
        _id: item._id,
        name: item.name,
        popularity: item.quantitySold,
        profitability: item.profitMargin,
        revenue: item.revenue,
        profit: item.profit,
        recommendations: getRecommendations(item.category_analysis)
      };

      matrixData[item.category_analysis + 's'].push(matrixItem);
    });

    res.json({
      success: true,
      data: {
        matrix: matrixData,
        thresholds: {
          popularityThreshold: profitabilityData.avgQuantitySold,
          profitabilityThreshold: profitabilityData.avgProfitMargin
        },
        summary: {
          totalItems: profitabilityData.length,
          dateRange: { startDate, endDate }
        }
      }
    });
  } catch (error) {
    console.error('Error fetching menu engineering data:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch menu engineering data' 
    });
  }
});

// Helper function to get profitability data
async function getProfitabilityData(tenantId, startDate, endDate, category) {
  // Build query
  const menuQuery = { 
    tenantId: tenantId,
    isDeleted: false
  };
  
  if (category) {
    menuQuery.category = category;
  }

  // Get all menu items with their recipes
  const menuItems = await MenuItem.find(menuQuery)
    .populate('modifierGroups.group')
    .lean();

  // Get recipes for cost calculation
  const recipes = await Recipe.find({ 
    tenantId: tenantId,
    menuItem: { $in: menuItems.map(item => item._id) }
  }).lean();

  // Create recipe map
  const recipeMap = {};
  recipes.forEach(recipe => {
    recipeMap[recipe.menuItem.toString()] = recipe;
  });

  // Get orders in date range
  const orders = await Order.find({
    tenantId: tenantId,
    createdAt: {
      $gte: new Date(startDate),
      $lte: new Date(endDate)
    },
    status: { $in: ['completed', 'delivered'] }
  }).lean();

  // Calculate sales data for each item
  const itemAnalytics = menuItems.map(item => {
    const itemId = item._id.toString();
    const recipe = recipeMap[itemId];
    
    // Calculate cost
    let cost = item.cost || 0;
    if (recipe && recipe.totalCost) {
      cost = recipe.totalCost;
    }

    // Calculate revenue and quantity sold
    let revenue = 0;
    let quantitySold = 0;
    let modifierRevenue = 0;

    orders.forEach(order => {
      order.items.forEach(orderItem => {
        if (orderItem.menuItem && orderItem.menuItem.toString() === itemId) {
          quantitySold += orderItem.quantity;
          revenue += orderItem.price * orderItem.quantity;
          
          // Add modifier revenue
          if (orderItem.modifiers && orderItem.modifiers.length > 0) {
            orderItem.modifiers.forEach(mod => {
              modifierRevenue += (mod.price || 0) * orderItem.quantity;
            });
          }
        }
      });
    });

    const totalRevenue = revenue + modifierRevenue;
    const totalCost = cost * quantitySold;
    const profit = totalRevenue - totalCost;
    const profitMargin = totalRevenue > 0 ? (profit / totalRevenue) * 100 : 0;

    return {
      _id: item._id,
      name: item.name,
      nameAr: item.nameAr,
      category: item.category,
      image: item.image,
      price: item.price,
      cost: cost,
      quantitySold,
      revenue: totalRevenue,
      modifierRevenue,
      totalCost,
      profit,
      profitMargin,
      available: item.available,
      inStock: item.inStock,
      stockQuantity: item.stockQuantity,
      rating: item.rating || 0,
      // Categorize for menu engineering matrix
      popularity: quantitySold, // Will be normalized later
      profitability: profitMargin
    };
  });

  // Calculate average values for categorization
  const avgQuantitySold = itemAnalytics.reduce((sum, item) => sum + item.quantitySold, 0) / itemAnalytics.length || 0;
  const avgProfitMargin = itemAnalytics.reduce((sum, item) => sum + item.profitMargin, 0) / itemAnalytics.length || 0;

  // Categorize items (Menu Engineering Matrix)
  itemAnalytics.forEach(item => {
    const highPopularity = item.quantitySold >= avgQuantitySold;
    const highProfitability = item.profitMargin >= avgProfitMargin;

    if (highPopularity && highProfitability) {
      item.category_analysis = 'star'; // Keep promoting
    } else if (highPopularity && !highProfitability) {
      item.category_analysis = 'plowhorse'; // Increase price or reduce cost
    } else if (!highPopularity && highProfitability) {
      item.category_analysis = 'puzzle'; // Promote more
    } else {
      item.category_analysis = 'dog'; // Consider removing
    }
  });

  // Add the average values to the result
  itemAnalytics.avgQuantitySold = avgQuantitySold;
  itemAnalytics.avgProfitMargin = avgProfitMargin;

  return itemAnalytics;
}

// Helper function to get recommendations
function getRecommendations(category) {
  const recommendations = {
    star: [
      'Maintain quality and availability',
      'Feature prominently on menu',
      'Use in promotions to drive traffic',
      'Train staff to upsell these items'
    ],
    plowhorse: [
      'Consider slight price increase',
      'Reduce portion size slightly',
      'Find ways to reduce cost',
      'Bundle with high-margin items'
    ],
    puzzle: [
      'Increase visibility on menu',
      'Create special promotions',
      'Train staff to recommend',
      'Consider repositioning or renaming'
    ],
    dog: [
      'Consider removing from menu',
      'Reduce inventory levels',
      'Use as limited-time offers only',
      'Replace with more profitable items'
    ]
  };

  return recommendations[category] || [];
}

module.exports = router;