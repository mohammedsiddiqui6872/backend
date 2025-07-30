// src/routes/admin/analytics.js
const express = require('express');
const router = express.Router();
const Order = require('../../models/Order');
const Payment = require('../../models/Payment');
const MenuItem = require('../../models/MenuItem');
const { authenticate, authorize } = require('../../middleware/auth');

router.use(authenticate);
router.use(authorize('admin', 'manager'));

// Get dashboard analytics
router.get('/dashboard', async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Today's stats
    const todayOrders = await Order.find({
      createdAt: { $gte: today }
    });

    const todayRevenue = todayOrders.reduce((sum, order) => 
      order.paymentStatus === 'paid' ? sum + order.total : sum, 0
    );

    // Best selling items
    const bestSellers = await MenuItem.find()
      .sort('-soldCount')
      .limit(5)
      .select('name soldCount revenue category');

    // Category performance
    const categoryStats = await Order.aggregate([
      { $match: { createdAt: { $gte: today } } },
      { $unwind: '$items' },
      { 
        $lookup: {
          from: 'menuitems',
          localField: 'items.id',
          foreignField: 'id',
          as: 'menuItem'
        }
      },
      { $unwind: '$menuItem' },
      {
        $group: {
          _id: '$menuItem.category',
          quantity: { $sum: '$items.quantity' },
          revenue: { $sum: { $multiply: ['$items.price', '$items.quantity'] } }
        }
      }
    ]);

    // Hourly breakdown
    const hourlyData = await Order.aggregate([
      { $match: { createdAt: { $gte: today } } },
      {
        $group: {
          _id: { $hour: '$createdAt' },
          orders: { $sum: 1 },
          revenue: { $sum: '$total' }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    res.json({
      today: {
        orders: todayOrders.length,
        revenue: todayRevenue,
        averageOrder: todayOrders.length ? todayRevenue / todayOrders.length : 0,
        completedOrders: todayOrders.filter(o => o.status === 'paid').length
      },
      bestSellers,
      categoryStats,
      hourlyData
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get detailed analytics for date range
router.get('/detailed', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    const orders = await Order.find({
      createdAt: { $gte: start, $lte: end }
    });

    const payments = await Payment.find({
      createdAt: { $gte: start, $lte: end }
    });

    // Calculate various metrics
    const metrics = {
      totalOrders: orders.length,
      completedOrders: orders.filter(o => o.status === 'paid').length,
      cancelledOrders: orders.filter(o => o.status === 'cancelled').length,
      totalRevenue: payments.reduce((sum, p) => sum + p.amount, 0),
      totalTips: payments.reduce((sum, p) => sum + (p.tip || 0), 0),
      averageOrderValue: orders.length ? 
        payments.reduce((sum, p) => sum + p.amount, 0) / orders.length : 0,
      paymentMethods: {},
      dailyBreakdown: {}
    };

    // Payment methods breakdown
    payments.forEach(payment => {
      metrics.paymentMethods[payment.method] = 
        (metrics.paymentMethods[payment.method] || 0) + payment.amount;
    });

    // Daily breakdown
    orders.forEach(order => {
      const date = order.createdAt.toISOString().split('T')[0];
      if (!metrics.dailyBreakdown[date]) {
        metrics.dailyBreakdown[date] = {
          orders: 0,
          revenue: 0
        };
      }
      metrics.dailyBreakdown[date].orders++;
      if (order.paymentStatus === 'paid') {
        metrics.dailyBreakdown[date].revenue += order.total;
      }
    });

    res.json(metrics);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Export analytics data
router.get('/export', async (req, res) => {
  try {
    const { startDate, endDate, format = 'json' } = req.query;
    
    // Fetch all relevant data
    const orders = await Order.find({
      createdAt: { 
        $gte: new Date(startDate), 
        $lte: new Date(endDate) 
      }
    }).populate('items.menuItem waiter chef');

    if (format === 'csv') {
      // Convert to CSV format
      const csv = require('csv-stringify/sync');
      const records = orders.map(order => ({
        orderNumber: order.orderNumber,
        date: order.createdAt,
        tableNumber: order.tableNumber,
        items: order.items.length,
        total: order.total,
        status: order.status,
        paymentMethod: order.paymentMethod,
        waiter: order.waiter?.name
      }));

      const output = csv.stringify(records, {
        header: true
      });

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="orders.csv"');
      res.send(output);
    } else {
      res.json(orders);
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;