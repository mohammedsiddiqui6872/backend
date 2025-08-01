const express = require('express');
const router = express.Router();
const SessionMetrics = require('../../models/SessionMetrics');
const { authenticate, authorize } = require('../../middleware/auth');

// Apply middleware
router.use(authenticate);
router.use(authorize('admin', 'manager'));

// Get analytics dashboard data
router.get('/dashboard', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const sessionMetricsService = req.app.get('sessionMetricsService');
    
    const dateRange = {};
    if (startDate) dateRange.start = new Date(startDate);
    if (endDate) dateRange.end = new Date(endDate);
    
    const analytics = await sessionMetricsService.getDashboardAnalytics(
      req.tenantId,
      dateRange
    );
    
    res.json({
      success: true,
      data: analytics
    });
  } catch (error) {
    console.error('Error fetching dashboard analytics:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch analytics' 
    });
  }
});

// Get table-specific analytics
router.get('/tables/:tableNumber', async (req, res) => {
  try {
    const { tableNumber } = req.params;
    const { startDate, endDate, period = '30d' } = req.query;
    
    // Calculate date range
    const end = endDate ? new Date(endDate) : new Date();
    const start = startDate ? new Date(startDate) : new Date();
    
    if (!startDate) {
      // Default periods
      switch (period) {
        case '7d':
          start.setDate(end.getDate() - 7);
          break;
        case '30d':
          start.setDate(end.getDate() - 30);
          break;
        case '90d':
          start.setDate(end.getDate() - 90);
          break;
        case '1y':
          start.setFullYear(end.getFullYear() - 1);
          break;
      }
    }
    
    // Get table analytics
    const [sessions, analytics, peakTimes] = await Promise.all([
      // Recent sessions
      SessionMetrics.find({
        tenantId: req.tenantId,
        tableNumber,
        startTime: { $gte: start, $lte: end }
      })
      .sort({ startTime: -1 })
      .limit(20)
      .select('startTime endTime duration totalOrderAmount numberOfGuests customerRating status'),
      
      // Aggregated analytics
      SessionMetrics.aggregate([
        {
          $match: {
            tenantId: req.tenantId,
            tableNumber,
            status: 'completed',
            startTime: { $gte: start, $lte: end }
          }
        },
        {
          $group: {
            _id: null,
            totalSessions: { $sum: 1 },
            totalRevenue: { $sum: '$totalOrderAmount' },
            totalGuests: { $sum: '$numberOfGuests' },
            avgDuration: { $avg: '$tableOccupancyTime' },
            avgOrderValue: { $avg: '$totalOrderAmount' },
            avgWaitTime: { $avg: '$customerWaitTime' },
            avgTip: { $avg: '$tipPercentage' },
            avgRating: { $avg: '$customerRating' },
            maxRevenue: { $max: '$totalOrderAmount' },
            minRevenue: { $min: '$totalOrderAmount' }
          }
        }
      ]),
      
      // Peak times
      SessionMetrics.aggregate([
        {
          $match: {
            tenantId: req.tenantId,
            tableNumber,
            status: 'completed',
            startTime: { $gte: start, $lte: end }
          }
        },
        {
          $group: {
            _id: {
              dayOfWeek: '$dayOfWeek',
              hour: '$hourOfDay'
            },
            count: { $sum: 1 },
            avgRevenue: { $avg: '$totalOrderAmount' }
          }
        },
        { $sort: { count: -1 } },
        { $limit: 10 }
      ])
    ]);
    
    res.json({
      success: true,
      data: {
        tableNumber,
        period: { start, end },
        recentSessions: sessions,
        analytics: analytics[0] || {},
        peakTimes: peakTimes.map(pt => ({
          dayOfWeek: pt._id.dayOfWeek,
          hour: pt._id.hour,
          sessions: pt.count,
          avgRevenue: pt.avgRevenue
        }))
      }
    });
  } catch (error) {
    console.error('Error fetching table analytics:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch table analytics' 
    });
  }
});

// Get waiter performance analytics
router.get('/waiters/:waiterId', async (req, res) => {
  try {
    const { waiterId } = req.params;
    const { startDate, endDate, period = '30d' } = req.query;
    
    const dateRange = {};
    if (startDate) {
      dateRange.start = new Date(startDate);
      dateRange.end = endDate ? new Date(endDate) : new Date();
    } else {
      dateRange.end = new Date();
      dateRange.start = new Date();
      
      switch (period) {
        case '7d':
          dateRange.start.setDate(dateRange.end.getDate() - 7);
          break;
        case '30d':
          dateRange.start.setDate(dateRange.end.getDate() - 30);
          break;
        case '90d':
          dateRange.start.setDate(dateRange.end.getDate() - 90);
          break;
      }
    }
    
    const performance = await SessionMetrics.getWaiterPerformance(
      req.tenantId,
      waiterId,
      dateRange
    );
    
    // Get recent sessions
    const recentSessions = await SessionMetrics.find({
      tenantId: req.tenantId,
      waiterId,
      startTime: { $gte: dateRange.start, $lte: dateRange.end }
    })
    .sort({ startTime: -1 })
    .limit(20)
    .select('tableNumber startTime totalOrderAmount tipAmount tipPercentage customerRating averageWaiterResponseTime');
    
    res.json({
      success: true,
      data: {
        waiterId,
        period: dateRange,
        performance,
        recentSessions
      }
    });
  } catch (error) {
    console.error('Error fetching waiter analytics:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch waiter analytics' 
    });
  }
});

// Get real-time metrics for active sessions
router.get('/live', async (req, res) => {
  try {
    const activeSessions = await SessionMetrics.find({
      tenantId: req.tenantId,
      status: 'active'
    })
    .populate('tableId', 'number displayName type')
    .populate('waiterId', 'name')
    .select('tableNumber startTime numberOfGuests orders totalOrderAmount customerWaitTime events');
    
    const metrics = activeSessions.map(session => ({
      tableNumber: session.tableNumber,
      waiterName: session.waiterId?.name,
      startTime: session.startTime,
      duration: Math.round((Date.now() - session.startTime) / 60000), // minutes
      guests: session.numberOfGuests,
      orders: session.orders.length,
      revenue: session.totalOrderAmount,
      waitTime: session.customerWaitTime,
      lastEvent: session.events[session.events.length - 1]
    }));
    
    res.json({
      success: true,
      data: {
        activeSessions: metrics.length,
        sessions: metrics
      }
    });
  } catch (error) {
    console.error('Error fetching live metrics:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch live metrics' 
    });
  }
});

// Get anomalies
router.get('/anomalies', async (req, res) => {
  try {
    const { startDate, endDate, type } = req.query;
    
    const query = {
      tenantId: req.tenantId,
      'anomalies.0': { $exists: true }
    };
    
    if (startDate || endDate) {
      query.startTime = {};
      if (startDate) query.startTime.$gte = new Date(startDate);
      if (endDate) query.startTime.$lte = new Date(endDate);
    }
    
    if (type) {
      query['anomalies.type'] = type;
    }
    
    const sessionsWithAnomalies = await SessionMetrics.find(query)
      .sort({ startTime: -1 })
      .limit(50)
      .select('tableNumber startTime endTime anomalies totalOrderAmount numberOfGuests');
    
    res.json({
      success: true,
      data: sessionsWithAnomalies
    });
  } catch (error) {
    console.error('Error fetching anomalies:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch anomalies' 
    });
  }
});

// Export analytics data
router.get('/export', async (req, res) => {
  try {
    const { startDate, endDate, format = 'json' } = req.query;
    
    const query = { tenantId: req.tenantId };
    
    if (startDate || endDate) {
      query.startTime = {};
      if (startDate) query.startTime.$gte = new Date(startDate);
      if (endDate) query.startTime.$lte = new Date(endDate);
    }
    
    const sessions = await SessionMetrics.find(query)
      .sort({ startTime: -1 })
      .lean();
    
    if (format === 'csv') {
      // Convert to CSV
      const csv = convertToCSV(sessions);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=session-analytics.csv');
      res.send(csv);
    } else {
      res.json({
        success: true,
        count: sessions.length,
        data: sessions
      });
    }
  } catch (error) {
    console.error('Error exporting analytics:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to export analytics' 
    });
  }
});

// Helper function to convert to CSV
function convertToCSV(sessions) {
  const headers = [
    'Table Number',
    'Start Time',
    'End Time',
    'Duration (min)',
    'Guests',
    'Orders',
    'Revenue',
    'Tips',
    'Tip %',
    'Rating',
    'Waiter',
    'Payment Method',
    'Status'
  ];
  
  const rows = sessions.map(s => [
    s.tableNumber,
    new Date(s.startTime).toISOString(),
    s.endTime ? new Date(s.endTime).toISOString() : '',
    s.tableOccupancyTime || 0,
    s.numberOfGuests,
    s.orders.length,
    s.totalOrderAmount,
    s.tipAmount || 0,
    s.tipPercentage || 0,
    s.customerRating || '',
    s.waiterName || '',
    s.paymentMethod || '',
    s.status
  ]);
  
  return [headers, ...rows].map(row => row.join(',')).join('\n');
}

module.exports = router;