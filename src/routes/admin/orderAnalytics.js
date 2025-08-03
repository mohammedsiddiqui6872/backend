// src/routes/admin/orderAnalytics.js
const express = require('express');
const router = express.Router();
const Order = require('../../models/Order');
const User = require('../../models/User');
const { authenticate, authorize } = require('../../middleware/auth');

router.use(authenticate);
router.use(authorize('admin', 'manager'));

// Chef Performance Analytics
router.get('/chef-performance', async (req, res) => {
  try {
    const { period = 'week', chefId } = req.query;
    
    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    switch (period) {
      case 'day':
        startDate.setDate(endDate.getDate() - 1);
        break;
      case 'week':
        startDate.setDate(endDate.getDate() - 7);
        break;
      case 'month':
        startDate.setMonth(endDate.getMonth() - 1);
        break;
    }

    const matchFilter = {
      createdAt: { $gte: startDate, $lte: endDate },
      'items.status': { $in: ['ready', 'served'] }
    };
    
    if (req.tenantId) {
      matchFilter.tenantId = req.tenantId;
    }
    
    if (chefId) {
      matchFilter['items.preparedBy'] = chefId;
    }

    const chefPerformance = await Order.aggregate([
      { $match: matchFilter },
      { $unwind: '$items' },
      { $match: { 'items.status': { $in: ['ready', 'served'] } } },
      {
        $group: {
          _id: '$items.preparedBy',
          totalItems: { $sum: 1 },
          totalOrders: { $addToSet: '$_id' },
          avgPrepTime: { $avg: 15 }, // Placeholder - would calculate from actual prep times
          stations: { $addToSet: '$items.station' }
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'chefInfo'
        }
      },
      { $unwind: { path: '$chefInfo', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          chefId: '$_id',
          chefName: { $ifNull: ['$chefInfo.name', 'Unknown Chef'] },
          totalItems: 1,
          totalOrders: { $size: '$totalOrders' },
          avgPrepTime: 1,
          stations: 1,
          efficiency: { $multiply: [{ $divide: ['$totalItems', { $max: ['$avgPrepTime', 1] }] }, 10] }
        }
      },
      { $sort: { totalItems: -1 } }
    ]);

    // Get hourly breakdown
    const hourlyBreakdown = await Order.aggregate([
      { $match: matchFilter },
      { $unwind: '$items' },
      {
        $group: {
          _id: {
            chef: '$items.preparedBy',
            hour: { $hour: '$createdAt' }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.hour': 1 } }
    ]);

    res.json({
      chefPerformance,
      hourlyBreakdown,
      period,
      dateRange: { startDate, endDate }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Heat Map Data
router.get('/heat-map', async (req, res) => {
  try {
    const { period = 'week', type = 'orders' } = req.query;
    
    const endDate = new Date();
    const startDate = new Date();
    switch (period) {
      case 'day':
        startDate.setDate(endDate.getDate() - 1);
        break;
      case 'week':
        startDate.setDate(endDate.getDate() - 7);
        break;
      case 'month':
        startDate.setMonth(endDate.getMonth() - 1);
        break;
    }

    const matchFilter = {
      createdAt: { $gte: startDate, $lte: endDate }
    };
    
    if (req.tenantId) {
      matchFilter.tenantId = req.tenantId;
    }

    // Generate heat map data
    const heatMapData = await Order.aggregate([
      { $match: matchFilter },
      {
        $group: {
          _id: {
            dayOfWeek: { $dayOfWeek: '$createdAt' },
            hour: { $hour: '$createdAt' }
          },
          count: { $sum: 1 },
          revenue: { $sum: '$total' },
          avgOrderValue: { $avg: '$total' }
        }
      },
      { $sort: { '_id.dayOfWeek': 1, '_id.hour': 1 } }
    ]);

    // Get popular items by time
    const popularItemsByTime = await Order.aggregate([
      { $match: matchFilter },
      { $unwind: '$items' },
      {
        $group: {
          _id: {
            hour: { $hour: '$createdAt' },
            itemName: '$items.name'
          },
          count: { $sum: '$items.quantity' }
        }
      },
      { $sort: { count: -1 } },
      {
        $group: {
          _id: '$_id.hour',
          topItems: { $push: { name: '$_id.itemName', count: '$count' } }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // Format data for heat map visualization
    const formattedData = [];
    for (let day = 1; day <= 7; day++) {
      for (let hour = 0; hour < 24; hour++) {
        const dataPoint = heatMapData.find(d => 
          d._id.dayOfWeek === day && d._id.hour === hour
        );
        
        formattedData.push({
          day: day,
          hour: hour,
          value: dataPoint ? (type === 'orders' ? dataPoint.count : dataPoint.revenue) : 0,
          count: dataPoint?.count || 0,
          revenue: dataPoint?.revenue || 0,
          avgOrderValue: dataPoint?.avgOrderValue || 0
        });
      }
    }

    res.json({
      heatMapData: formattedData,
      popularItemsByTime,
      summary: {
        totalOrders: heatMapData.reduce((sum, d) => sum + d.count, 0),
        totalRevenue: heatMapData.reduce((sum, d) => sum + d.revenue, 0),
        peakHour: heatMapData.reduce((max, d) => d.count > max.count ? d : max, { count: 0 }),
        period,
        type
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Trend Analysis
router.get('/trends', async (req, res) => {
  try {
    const { period = 'month' } = req.query;
    
    const endDate = new Date();
    const startDate = new Date();
    switch (period) {
      case 'week':
        startDate.setDate(endDate.getDate() - 7);
        break;
      case 'month':
        startDate.setMonth(endDate.getMonth() - 1);
        break;
      case 'quarter':
        startDate.setMonth(endDate.getMonth() - 3);
        break;
      case 'year':
        startDate.setFullYear(endDate.getFullYear() - 1);
        break;
    }

    const matchFilter = {
      createdAt: { $gte: startDate, $lte: endDate }
    };
    
    if (req.tenantId) {
      matchFilter.tenantId = req.tenantId;
    }

    // Daily trends
    const dailyTrends = await Order.aggregate([
      { $match: matchFilter },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          orders: { $sum: 1 },
          revenue: { $sum: '$total' },
          avgOrderValue: { $avg: '$total' },
          items: { $sum: { $size: '$items' } }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // Category trends
    const categoryTrends = await Order.aggregate([
      { $match: matchFilter },
      { $unwind: '$items' },
      {
        $lookup: {
          from: 'menuitems',
          localField: 'items.menuItem',
          foreignField: '_id',
          as: 'menuItemInfo'
        }
      },
      { $unwind: { path: '$menuItemInfo', preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            category: { $ifNull: ['$menuItemInfo.category.name', 'Unknown'] }
          },
          quantity: { $sum: '$items.quantity' },
          revenue: { $sum: { $multiply: ['$items.price', '$items.quantity'] } }
        }
      },
      { $sort: { '_id.date': 1 } }
    ]);

    // Payment method trends
    const paymentTrends = await Order.aggregate([
      { $match: { ...matchFilter, paymentStatus: 'paid' } },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            method: '$paymentMethod'
          },
          count: { $sum: 1 },
          amount: { $sum: '$total' }
        }
      },
      { $sort: { '_id.date': 1 } }
    ]);

    // Calculate growth rates
    const growthRates = [];
    for (let i = 1; i < dailyTrends.length; i++) {
      const current = dailyTrends[i];
      const previous = dailyTrends[i - 1];
      
      growthRates.push({
        date: current._id,
        orderGrowth: ((current.orders - previous.orders) / previous.orders * 100).toFixed(2),
        revenueGrowth: ((current.revenue - previous.revenue) / previous.revenue * 100).toFixed(2)
      });
    }

    res.json({
      dailyTrends,
      categoryTrends,
      paymentTrends,
      growthRates,
      summary: {
        totalOrders: dailyTrends.reduce((sum, d) => sum + d.orders, 0),
        totalRevenue: dailyTrends.reduce((sum, d) => sum + d.revenue, 0),
        avgDailyOrders: dailyTrends.length ? 
          dailyTrends.reduce((sum, d) => sum + d.orders, 0) / dailyTrends.length : 0,
        period,
        dateRange: { startDate, endDate }
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Prep Time Predictions (Simulated ML)
router.post('/prep-time-predictions', async (req, res) => {
  try {
    const { items, timestamp } = req.body;
    
    // Get current kitchen load
    const now = new Date(timestamp || new Date());
    const thirtyMinutesAgo = new Date(now.getTime() - 30 * 60000);
    
    const matchFilter = {
      createdAt: { $gte: thirtyMinutesAgo, $lte: now },
      status: { $in: ['confirmed', 'preparing'] }
    };
    
    if (req.tenantId) {
      matchFilter.tenantId = req.tenantId;
    }

    const currentOrders = await Order.countDocuments(matchFilter);
    
    // Get active chefs (simplified - would be from shift data)
    const activeChefs = await User.countDocuments({
      tenantId: req.tenantId,
      role: 'chef',
      isActive: true
    });

    // Base prep times by station (in minutes)
    const basePrepTimes = {
      grill: 15,
      salad: 5,
      dessert: 10,
      beverage: 3,
      main: 20
    };

    // Simulate predictions
    const predictions = items.map(item => {
      const baseTime = basePrepTimes[item.station || 'main'] || 10;
      
      // Factors affecting prep time
      const loadFactor = 1 + (currentOrders / 20); // Every 20 orders adds delay
      const chefFactor = Math.max(1, 3 / (activeChefs || 1)); // Fewer chefs = more delay
      const quantityFactor = 1 + (item.quantity - 1) * 0.3; // Each extra item adds 30% time
      
      const predictedTime = Math.round(baseTime * loadFactor * chefFactor * quantityFactor);
      
      return {
        menuItemId: item.menuItemId,
        menuItemName: item.name || 'Unknown Item',
        baseTime: baseTime,
        predictedTime: predictedTime,
        confidenceLevel: activeChefs > 2 && currentOrders < 20 ? 'high' : 
                        activeChefs > 0 && currentOrders < 40 ? 'medium' : 'low',
        factors: [
          { factor: 'Kitchen Load', impact: Math.round((loadFactor - 1) * baseTime), description: `${currentOrders} active orders` },
          { factor: 'Chef Availability', impact: Math.round((chefFactor - 1) * baseTime), description: `${activeChefs} chefs available` },
          { factor: 'Quantity', impact: Math.round((quantityFactor - 1) * baseTime), description: `${item.quantity} items` }
        ]
      };
    });

    // Station status
    const stationStatus = ['grill', 'salad', 'dessert', 'beverage', 'main'].map(station => ({
      station,
      activeOrders: Math.floor(Math.random() * 10) + 1,
      availableChefs: Math.floor(Math.random() * 3) + 1,
      avgPrepTime: basePrepTimes[station] || 10,
      workloadLevel: currentOrders > 30 ? 'high' : currentOrders > 15 ? 'medium' : 'low',
      efficiency: Math.floor(Math.random() * 20) + 80
    }));

    res.json({
      predictions,
      factors: {
        currentOrders,
        kitchenLoad: Math.round((currentOrders / 50) * 100),
        availableChefs: activeChefs,
        dayOfWeek: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][now.getDay()],
        timeOfDay: now.getHours() < 12 ? 'morning' : now.getHours() < 17 ? 'afternoon' : 'evening',
        itemComplexity: 50,
        historicalAverage: 12,
        customizations: 0
      },
      stationStatus,
      modelAccuracy: 85,
      historicalData: Array.from({ length: 12 }, (_, i) => ({
        hour: i + 8,
        avgPrepTime: Math.floor(Math.random() * 5) + 10,
        orderVolume: Math.floor(Math.random() * 30) + 10,
        accuracy: Math.floor(Math.random() * 10) + 85
      }))
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;