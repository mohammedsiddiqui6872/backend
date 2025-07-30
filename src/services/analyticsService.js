// src/services/analyticsService.js
const Order = require('../models/Order');
const MenuItem = require('../models/MenuItem');
const Payment = require('../models/Payment');
const Analytics = require('../models/Analytics');
const Table = require('../models/Table');
const { startOfDay, endOfDay, subDays, format } = require('date-fns');

class AnalyticsService {
  async generateDailyAnalytics(date = new Date()) {
    const start = startOfDay(date);
    const end = endOfDay(date);

    try {
      // Get all orders for the day
      const orders = await Order.find({
        createdAt: { $gte: start, $lte: end }
      }).populate('items.menuItem');

      // Get all payments for the day
      const payments = await Payment.find({
        createdAt: { $gte: start, $lte: end }
      });

      // Calculate revenue breakdown
      const revenue = this.calculateRevenue(payments);

      // Calculate order metrics
      const orderMetrics = this.calculateOrderMetrics(orders);

      // Calculate item statistics
      const itemStats = await this.calculateItemStats(orders);

      // Calculate hourly breakdown
      const hourlyBreakdown = this.calculateHourlyBreakdown(orders);

      // Calculate category performance
      const categoryBreakdown = await this.calculateCategoryBreakdown(orders);

      // Table turnover
      const tableTurnover = await this.calculateTableTurnover(start, end);

      // Save or update analytics record
      const analytics = await Analytics.findOneAndUpdate(
        { date: start },
        {
          date: start,
          revenue,
          orders: orderMetrics,
          items: itemStats,
          customers: await this.calculateCustomerMetrics(orders),
          tables: tableTurnover,
          hourlyBreakdown,
          categoryBreakdown
        },
        { upsert: true, new: true }
      );

      return analytics;
    } catch (error) {
      console.error('Analytics generation error:', error);
      throw error;
    }
  }

  calculateRevenue(payments) {
    const revenue = {
      total: 0,
      cash: 0,
      card: 0,
      online: 0
    };

    payments.forEach(payment => {
      if (payment.status === 'completed') {
        revenue.total += payment.amount;
        revenue[payment.method] = (revenue[payment.method] || 0) + payment.amount;
      }
    });

    return revenue;
  }

  calculateOrderMetrics(orders) {
    const completed = orders.filter(o => o.status === 'paid').length;
    const cancelled = orders.filter(o => o.status === 'cancelled').length;
    const totalRevenue = orders.reduce((sum, order) => 
      order.status === 'paid' ? sum + order.total : sum, 0
    );

    return {
      total: orders.length,
      completed,
      cancelled,
      average: completed > 0 ? totalRevenue / completed : 0
    };
  }

  async calculateItemStats(orders) {
    const itemSales = {};

    orders.forEach(order => {
      if (order.status !== 'cancelled') {
        order.items.forEach(item => {
          const menuItemId = item.menuItem?._id || item.id;
          if (!itemSales[menuItemId]) {
            itemSales[menuItemId] = {
              quantity: 0,
              revenue: 0,
              name: item.menuItem?.name || item.name
            };
          }
          itemSales[menuItemId].quantity += item.quantity;
          itemSales[menuItemId].revenue += item.price * item.quantity;
        });
      }
    });

    // Get top selling items
    const topSelling = Object.entries(itemSales)
      .map(([id, data]) => ({
        menuItem: id,
        quantity: data.quantity,
        revenue: data.revenue,
        name: data.name
      }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);

    const totalSold = Object.values(itemSales).reduce((sum, item) => sum + item.quantity, 0);

    return {
      sold: totalSold,
      topSelling
    };
  }

  calculateHourlyBreakdown(orders) {
    const hourly = Array(24).fill(null).map((_, hour) => ({
      hour,
      orders: 0,
      revenue: 0
    }));

    orders.forEach(order => {
      const hour = new Date(order.createdAt).getHours();
      hourly[hour].orders++;
      if (order.status === 'paid') {
        hourly[hour].revenue += order.total;
      }
    });

    return hourly.filter(h => h.orders > 0);
  }

  async calculateCategoryBreakdown(orders) {
    const categories = {};

    for (const order of orders) {
      if (order.status !== 'cancelled') {
        for (const item of order.items) {
          const category = item.menuItem?.category || 'uncategorized';
          if (!categories[category]) {
            categories[category] = {
              quantity: 0,
              revenue: 0
            };
          }
          categories[category].quantity += item.quantity;
          categories[category].revenue += item.price * item.quantity;
        }
      }
    }

    return Object.entries(categories).map(([category, data]) => ({
      category,
      quantity: data.quantity,
      revenue: data.revenue
    }));
  }

  async calculateCustomerMetrics(orders) {
    const uniqueCustomers = new Set();
    orders.forEach(order => {
      if (order.customerPhone) {
        uniqueCustomers.add(order.customerPhone);
      }
    });

    return {
      total: uniqueCustomers.size,
      new: Math.floor(uniqueCustomers.size * 0.3), // Estimate for now
      returning: Math.floor(uniqueCustomers.size * 0.7)
    };
  }

  async calculateTableTurnover(start, end) {
    const tableOrders = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: start, $lte: end },
          tableNumber: { $exists: true }
        }
      },
      {
        $group: {
          _id: '$tableNumber',
          count: { $sum: 1 },
          totalTime: { $sum: { $subtract: ['$completedAt', '$createdAt'] } }
        }
      }
    ]);

    const tables = await Table.countDocuments({ isActive: true });
    const turnover = tableOrders.reduce((sum, table) => sum + table.count, 0) / tables;

    return {
      turnover,
      averageOccupancy: 0.75 // Estimate for now
    };
  }

  async getPerformanceMetrics(startDate, endDate) {
    const start = startOfDay(new Date(startDate));
    const end = endOfDay(new Date(endDate));

    const analytics = await Analytics.find({
      date: { $gte: start, $lte: end }
    }).sort('date');

    return {
      period: {
        start: format(start, 'yyyy-MM-dd'),
        end: format(end, 'yyyy-MM-dd')
      },
      summary: this.calculatePeriodSummary(analytics),
      daily: analytics,
      trends: this.calculateTrends(analytics)
    };
  }

  calculatePeriodSummary(analytics) {
    return analytics.reduce((summary, day) => {
      summary.totalRevenue += day.revenue.total;
      summary.totalOrders += day.orders.total;
      summary.totalCustomers += day.customers.total;
      summary.completedOrders += day.orders.completed;
      summary.cancelledOrders += day.orders.cancelled;
      return summary;
    }, {
      totalRevenue: 0,
      totalOrders: 0,
      totalCustomers: 0,
      completedOrders: 0,
      cancelledOrders: 0
    });
  }

  calculateTrends(analytics) {
    if (analytics.length < 2) return null;

    const firstDay = analytics[0];
    const lastDay = analytics[analytics.length - 1];

    return {
      revenue: {
        change: lastDay.revenue.total - firstDay.revenue.total,
        percentage: ((lastDay.revenue.total - firstDay.revenue.total) / firstDay.revenue.total) * 100
      },
      orders: {
        change: lastDay.orders.total - firstDay.orders.total,
        percentage: ((lastDay.orders.total - firstDay.orders.total) / firstDay.orders.total) * 100
      }
    };
  }

  async getPredictiveAnalytics() {
    // Get last 30 days of data
    const thirtyDaysAgo = subDays(new Date(), 30);
    const analytics = await Analytics.find({
      date: { $gte: thirtyDaysAgo }
    }).sort('date');

    // Simple moving average for predictions
    const revenueAvg = analytics.reduce((sum, day) => sum + day.revenue.total, 0) / analytics.length;
    const ordersAvg = analytics.reduce((sum, day) => sum + day.orders.total, 0) / analytics.length;

    // Day of week patterns
    const dayPatterns = this.calculateDayOfWeekPatterns(analytics);

    return {
      predictions: {
        tomorrow: {
          revenue: revenueAvg * dayPatterns[new Date().getDay()].multiplier,
          orders: Math.round(ordersAvg * dayPatterns[new Date().getDay()].multiplier)
        }
      },
      patterns: dayPatterns,
      recommendations: this.generateRecommendations(analytics)
    };
  }

  calculateDayOfWeekPatterns(analytics) {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const patterns = {};

    days.forEach((day, index) => {
      const dayData = analytics.filter(a => new Date(a.date).getDay() === index);
      const avgRevenue = dayData.reduce((sum, d) => sum + d.revenue.total, 0) / dayData.length || 0;
      const overallAvg = analytics.reduce((sum, d) => sum + d.revenue.total, 0) / analytics.length;
      
      patterns[day] = {
        averageRevenue: avgRevenue,
        multiplier: avgRevenue / overallAvg || 1
      };
    });

    return patterns;
  }

  generateRecommendations(analytics) {
    const recommendations = [];

    // Check for low performing days
    const avgRevenue = analytics.reduce((sum, day) => sum + day.revenue.total, 0) / analytics.length;
    const lowDays = analytics.filter(day => day.revenue.total < avgRevenue * 0.8);
    
    if (lowDays.length > 0) {
      recommendations.push({
        type: 'promotion',
        priority: 'high',
        message: `Consider running promotions on slow days. ${lowDays.length} days had below-average revenue.`
      });
    }

    // Check category performance
    const categoryPerformance = {};
    analytics.forEach(day => {
      day.categoryBreakdown.forEach(cat => {
        if (!categoryPerformance[cat.category]) {
          categoryPerformance[cat.category] = { revenue: 0, days: 0 };
        }
        categoryPerformance[cat.category].revenue += cat.revenue;
        categoryPerformance[cat.category].days++;
      });
    });

    Object.entries(categoryPerformance).forEach(([category, data]) => {
      const avgCategoryRevenue = data.revenue / data.days;
      if (avgCategoryRevenue < avgRevenue * 0.15) {
        recommendations.push({
          type: 'menu',
          priority: 'medium',
          message: `${category} category underperforming. Consider menu updates or promotions.`
        });
      }
    });

    return recommendations;
  }
}

module.exports = new AnalyticsService();