const Order = require('../models/Order');
const User = require('../models/User');
const MenuItem = require('../models/MenuItem');
const Table = require('../models/Table');
const Shift = require('../models/Shift');
const { cacheManager } = require('../config/redis');

/**
 * Optimized Analytics Service
 * Fixes N+1 query problems with proper aggregation and caching
 */

class OptimizedAnalyticsService {
  constructor() {
    this.cachePrefix = 'analytics';
    this.defaultCacheTTL = 300; // 5 minutes
    this.realTimeCacheTTL = 60;  // 1 minute for real-time data
  }

  /**
   * Get dashboard analytics with optimized queries
   */
  async getDashboardAnalytics(tenantId, dateRange = {}) {
    const cacheKey = `${this.cachePrefix}:dashboard:${tenantId}:${JSON.stringify(dateRange)}`;
    
    try {
      // Try to get from cache first
      const cached = await cacheManager.get(cacheKey, tenantId);
      if (cached) {
        return { ...cached, fromCache: true };
      }

      const { startDate, endDate } = this.parseDateRange(dateRange);
      
      // Single aggregation pipeline for multiple metrics
      const dashboardPipeline = [
        {
          $match: {
            tenantId,
            createdAt: { $gte: startDate, $lte: endDate }
          }
        },
        {
          $facet: {
            // Total orders and revenue
            orderStats: [
              {
                $group: {
                  _id: null,
                  totalOrders: { $sum: 1 },
                  totalRevenue: { $sum: '$total' },
                  avgOrderValue: { $avg: '$total' }
                }
              }
            ],
            // Orders by status
            ordersByStatus: [
              {
                $group: {
                  _id: '$status',
                  count: { $sum: 1 },
                  revenue: { $sum: '$total' }
                }
              }
            ],
            // Orders by hour (for peak hours analysis)
            ordersByHour: [
              {
                $group: {
                  _id: { $hour: '$createdAt' },
                  count: { $sum: 1 },
                  revenue: { $sum: '$total' }
                }
              },
              { $sort: { '_id': 1 } }
            ],
            // Orders by day
            ordersByDay: [
              {
                $group: {
                  _id: {
                    year: { $year: '$createdAt' },
                    month: { $month: '$createdAt' },
                    day: { $dayOfMonth: '$createdAt' }
                  },
                  count: { $sum: 1 },
                  revenue: { $sum: '$total' }
                }
              },
              { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } }
            ],
            // Top menu items
            topMenuItems: [
              { $unwind: '$items' },
              {
                $group: {
                  _id: '$items.menuItem',
                  quantity: { $sum: '$items.quantity' },
                  revenue: { $sum: { $multiply: ['$items.quantity', '$items.price'] } }
                }
              },
              { $sort: { quantity: -1 } },
              { $limit: 10 }
            ],
            // Revenue by payment method
            revenueByPaymentMethod: [
              {
                $group: {
                  _id: '$paymentMethod',
                  count: { $sum: 1 },
                  revenue: { $sum: '$total' }
                }
              }
            ]
          }
        }
      ];

      const [dashboardData] = await Order.aggregate(dashboardPipeline);

      // Get additional data with optimized queries
      const [activeTablesCount, totalStaff, activeShifts] = await Promise.all([
        Table.countDocuments({ tenantId, status: { $in: ['occupied', 'reserved'] } }),
        User.countDocuments({ tenantId, isActive: true }),
        Shift.countDocuments({ 
          tenantId, 
          date: { $gte: startDate, $lte: endDate },
          status: 'active'
        })
      ]);

      // Populate menu item names for top items
      const menuItemIds = dashboardData.topMenuItems.map(item => item._id);
      const menuItems = await MenuItem.find(
        { _id: { $in: menuItemIds }, tenantId }
      ).select('name price').lean();

      const menuItemMap = menuItems.reduce((map, item) => {
        map[item._id.toString()] = item;
        return map;
      }, {});

      // Enhance top menu items with names
      dashboardData.topMenuItems = dashboardData.topMenuItems.map(item => ({
        ...item,
        name: menuItemMap[item._id.toString()]?.name || 'Unknown Item',
        price: menuItemMap[item._id.toString()]?.price || 0
      }));

      const result = {
        ...dashboardData,
        additionalStats: {
          activeTablesCount,
          totalStaff,
          activeShifts
        },
        generatedAt: new Date(),
        dateRange: { startDate, endDate }
      };

      // Cache the result
      await cacheManager.set(cacheKey, result, this.defaultCacheTTL, tenantId);

      return result;
    } catch (error) {
      console.error('Dashboard analytics error:', error);
      throw new Error('Failed to generate dashboard analytics');
    }
  }

  /**
   * Get real-time performance metrics
   */
  async getRealTimeMetrics(tenantId) {
    const cacheKey = `${this.cachePrefix}:realtime:${tenantId}`;
    
    try {
      const cached = await cacheManager.get(cacheKey, tenantId);
      if (cached) {
        return { ...cached, fromCache: true };
      }

      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const hourAgo = new Date(now.getTime() - 60 * 60 * 1000);

      // Single aggregation for real-time metrics
      const realTimePipeline = [
        {
          $facet: {
            // Today's metrics
            todayMetrics: [
              {
                $match: {
                  tenantId,
                  createdAt: { $gte: todayStart }
                }
              },
              {
                $group: {
                  _id: null,
                  ordersToday: { $sum: 1 },
                  revenueToday: { $sum: '$total' }
                }
              }
            ],
            // Last hour metrics
            lastHourMetrics: [
              {
                $match: {
                  tenantId,
                  createdAt: { $gte: hourAgo }
                }
              },
              {
                $group: {
                  _id: null,
                  ordersLastHour: { $sum: 1 },
                  revenueLastHour: { $sum: '$total' }
                }
              }
            ],
            // Active orders (pending, preparing, ready)
            activeOrders: [
              {
                $match: {
                  tenantId,
                  status: { $in: ['pending', 'preparing', 'ready'] }
                }
              },
              {
                $group: {
                  _id: '$status',
                  count: { $sum: 1 }
                }
              }
            ],
            // Average preparation time (last 50 orders)
            avgPrepTime: [
              {
                $match: {
                  tenantId,
                  status: 'completed',
                  'timestamps.completed': { $exists: true },
                  'timestamps.confirmed': { $exists: true }
                }
              },
              { $sort: { createdAt: -1 } },
              { $limit: 50 },
              {
                $project: {
                  prepTime: {
                    $divide: [
                      { $subtract: ['$timestamps.completed', '$timestamps.confirmed'] },
                      60000 // Convert to minutes
                    ]
                  }
                }
              },
              {
                $group: {
                  _id: null,
                  avgPrepTime: { $avg: '$prepTime' }
                }
              }
            ]
          }
        }
      ];

      const [realTimeData] = await Order.aggregate(realTimePipeline);

      // Get current table occupancy
      const tableStats = await Table.aggregate([
        { $match: { tenantId } },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 }
          }
        }
      ]);

      // Get active waiters
      const activeWaiters = await User.countDocuments({
        tenantId,
        role: 'waiter',
        isActive: true
      });

      const result = {
        ...realTimeData,
        tableStats,
        activeWaiters,
        generatedAt: new Date()
      };

      // Cache for shorter duration for real-time data
      await cacheManager.set(cacheKey, result, this.realTimeCacheTTL, tenantId);

      return result;
    } catch (error) {
      console.error('Real-time metrics error:', error);
      throw new Error('Failed to generate real-time metrics');
    }
  }

  /**
   * Get detailed revenue analytics
   */
  async getRevenueAnalytics(tenantId, dateRange = {}, groupBy = 'day') {
    const cacheKey = `${this.cachePrefix}:revenue:${tenantId}:${groupBy}:${JSON.stringify(dateRange)}`;
    
    try {
      const cached = await cacheManager.get(cacheKey, tenantId);
      if (cached) {
        return { ...cached, fromCache: true };
      }

      const { startDate, endDate } = this.parseDateRange(dateRange);
      
      // Group by configuration
      const groupByConfig = {
        hour: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
            day: { $dayOfMonth: '$createdAt' },
            hour: { $hour: '$createdAt' }
          }
        },
        day: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
            day: { $dayOfMonth: '$createdAt' }
          }
        },
        week: {
          _id: {
            year: { $year: '$createdAt' },
            week: { $week: '$createdAt' }
          }
        },
        month: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          }
        }
      };

      const pipeline = [
        {
          $match: {
            tenantId,
            createdAt: { $gte: startDate, $lte: endDate },
            status: { $in: ['completed', 'paid'] }
          }
        },
        {
          $group: {
            ...groupByConfig[groupBy],
            totalRevenue: { $sum: '$total' },
            orderCount: { $sum: 1 },
            avgOrderValue: { $avg: '$total' },
            minOrder: { $min: '$total' },
            maxOrder: { $max: '$total' }
          }
        },
        { $sort: { '_id': 1 } }
      ];

      const revenueData = await Order.aggregate(pipeline);

      // Calculate trends
      const trends = this.calculateTrends(revenueData);

      const result = {
        data: revenueData,
        trends,
        summary: {
          totalRevenue: revenueData.reduce((sum, item) => sum + item.totalRevenue, 0),
          totalOrders: revenueData.reduce((sum, item) => sum + item.orderCount, 0),
          avgOrderValue: revenueData.length > 0 
            ? revenueData.reduce((sum, item) => sum + item.avgOrderValue, 0) / revenueData.length 
            : 0
        },
        dateRange: { startDate, endDate },
        groupBy,
        generatedAt: new Date()
      };

      await cacheManager.set(cacheKey, result, this.defaultCacheTTL, tenantId);
      return result;
    } catch (error) {
      console.error('Revenue analytics error:', error);
      throw new Error('Failed to generate revenue analytics');
    }
  }

  /**
   * Get menu performance analytics
   */
  async getMenuPerformance(tenantId, dateRange = {}) {
    const cacheKey = `${this.cachePrefix}:menu:${tenantId}:${JSON.stringify(dateRange)}`;
    
    try {
      const cached = await cacheManager.get(cacheKey, tenantId);
      if (cached) {
        return { ...cached, fromCache: true };
      }

      const { startDate, endDate } = this.parseDateRange(dateRange);

      // Single aggregation for menu performance
      const menuPipeline = [
        {
          $match: {
            tenantId,
            createdAt: { $gte: startDate, $lte: endDate }
          }
        },
        { $unwind: '$items' },
        {
          $group: {
            _id: '$items.menuItem',
            totalQuantity: { $sum: '$items.quantity' },
            totalRevenue: { $sum: { $multiply: ['$items.quantity', '$items.price'] } },
            orderCount: { $sum: 1 },
            avgQuantityPerOrder: { $avg: '$items.quantity' }
          }
        },
        { $sort: { totalRevenue: -1 } }
      ];

      const menuPerformance = await Order.aggregate(menuPipeline);

      // Get menu item details in a single query
      const menuItemIds = menuPerformance.map(item => item._id);
      const menuItems = await MenuItem.find({
        _id: { $in: menuItemIds },
        tenantId
      }).select('name price category isAvailable').lean();

      // Create lookup map
      const menuItemMap = menuItems.reduce((map, item) => {
        map[item._id.toString()] = item;
        return map;
      }, {});

      // Enhance performance data
      const enhancedPerformance = menuPerformance.map(item => {
        const menuItem = menuItemMap[item._id.toString()];
        return {
          ...item,
          name: menuItem?.name || 'Unknown Item',
          price: menuItem?.price || 0,
          category: menuItem?.category || 'Unknown',
          isAvailable: menuItem?.isAvailable || false,
          profitMargin: this.calculateProfitMargin(item.totalRevenue, item.totalQuantity)
        };
      });

      // Performance categories
      const topPerformers = enhancedPerformance.slice(0, 10);
      const lowPerformers = enhancedPerformance.slice(-10);

      const result = {
        topPerformers,
        lowPerformers,
        allItems: enhancedPerformance,
        summary: {
          totalItemsSold: enhancedPerformance.reduce((sum, item) => sum + item.totalQuantity, 0),
          totalMenuRevenue: enhancedPerformance.reduce((sum, item) => sum + item.totalRevenue, 0),
          avgRevenuePerItem: enhancedPerformance.length > 0 
            ? enhancedPerformance.reduce((sum, item) => sum + item.totalRevenue, 0) / enhancedPerformance.length 
            : 0
        },
        dateRange: { startDate, endDate },
        generatedAt: new Date()
      };

      await cacheManager.set(cacheKey, result, this.defaultCacheTTL, tenantId);
      return result;
    } catch (error) {
      console.error('Menu performance error:', error);
      throw new Error('Failed to generate menu performance analytics');
    }
  }

  /**
   * Get staff performance analytics
   */
  async getStaffPerformance(tenantId, dateRange = {}) {
    const cacheKey = `${this.cachePrefix}:staff:${tenantId}:${JSON.stringify(dateRange)}`;
    
    try {
      const cached = await cacheManager.get(cacheKey, tenantId);
      if (cached) {
        return { ...cached, fromCache: true };
      }

      const { startDate, endDate } = this.parseDateRange(dateRange);

      // Orders by waiter
      const waiterPerformance = await Order.aggregate([
        {
          $match: {
            tenantId,
            createdAt: { $gte: startDate, $lte: endDate },
            waiter: { $exists: true }
          }
        },
        {
          $group: {
            _id: '$waiter',
            orderCount: { $sum: 1 },
            totalRevenue: { $sum: '$total' },
            avgOrderValue: { $avg: '$total' }
          }
        },
        { $sort: { totalRevenue: -1 } }
      ]);

      // Get waiter details
      const waiterIds = waiterPerformance.map(perf => perf._id);
      const waiters = await User.find({
        _id: { $in: waiterIds },
        tenantId
      }).select('name email role').lean();

      const waiterMap = waiters.reduce((map, waiter) => {
        map[waiter._id.toString()] = waiter;
        return map;
      }, {});

      // Enhanced waiter performance
      const enhancedWaiterPerformance = waiterPerformance.map(perf => ({
        ...perf,
        waiterName: waiterMap[perf._id.toString()]?.name || 'Unknown Waiter',
        waiterEmail: waiterMap[perf._id.toString()]?.email || 'Unknown'
      }));

      // Shift performance
      const shiftPerformance = await Shift.aggregate([
        {
          $match: {
            tenantId,
            date: { $gte: startDate, $lte: endDate }
          }
        },
        {
          $group: {
            _id: '$employee',
            totalHours: { $sum: '$actualHours' },
            shiftCount: { $sum: 1 },
            avgHoursPerShift: { $avg: '$actualHours' }
          }
        }
      ]);

      const result = {
        waiterPerformance: enhancedWaiterPerformance,
        shiftPerformance,
        dateRange: { startDate, endDate },
        generatedAt: new Date()
      };

      await cacheManager.set(cacheKey, result, this.defaultCacheTTL, tenantId);
      return result;
    } catch (error) {
      console.error('Staff performance error:', error);
      throw new Error('Failed to generate staff performance analytics');
    }
  }

  /**
   * Clear analytics cache for tenant
   */
  async clearCache(tenantId, pattern = '*') {
    try {
      const fullPattern = `${this.cachePrefix}:${pattern}`;
      await cacheManager.clearByPattern(fullPattern, tenantId);
      return true;
    } catch (error) {
      console.error('Clear analytics cache error:', error);
      return false;
    }
  }

  /**
   * Parse date range with defaults
   */
  parseDateRange(dateRange) {
    const now = new Date();
    const defaultStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); // 30 days ago
    
    return {
      startDate: dateRange.startDate ? new Date(dateRange.startDate) : defaultStart,
      endDate: dateRange.endDate ? new Date(dateRange.endDate) : now
    };
  }

  /**
   * Calculate trends from time series data
   */
  calculateTrends(data) {
    if (data.length < 2) return { trend: 'insufficient_data', change: 0 };

    const recent = data.slice(-Math.ceil(data.length / 2));
    const previous = data.slice(0, Math.floor(data.length / 2));

    const recentAvg = recent.reduce((sum, item) => sum + item.totalRevenue, 0) / recent.length;
    const previousAvg = previous.reduce((sum, item) => sum + item.totalRevenue, 0) / previous.length;

    const change = previousAvg > 0 ? ((recentAvg - previousAvg) / previousAvg) * 100 : 0;

    return {
      trend: change > 5 ? 'increasing' : change < -5 ? 'decreasing' : 'stable',
      change: Math.round(change * 100) / 100,
      recentAvg: Math.round(recentAvg * 100) / 100,
      previousAvg: Math.round(previousAvg * 100) / 100
    };
  }

  /**
   * Calculate profit margin (simplified)
   */
  calculateProfitMargin(revenue, quantity) {
    // This is a placeholder - in reality, you'd need cost data
    const estimatedCostRatio = 0.3; // 30% cost estimate
    const profit = revenue * (1 - estimatedCostRatio);
    return Math.round((profit / revenue) * 100 * 100) / 100; // Profit margin percentage
  }
}

// Export singleton instance
const optimizedAnalyticsService = new OptimizedAnalyticsService();

module.exports = {
  OptimizedAnalyticsService,
  optimizedAnalyticsService
};