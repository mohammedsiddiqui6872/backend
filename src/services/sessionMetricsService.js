const SessionMetrics = require('../models/SessionMetrics');
const CustomerSession = require('../models/CustomerSession');
const Table = require('../models/Table');
const Order = require('../models/Order');

class SessionMetricsService {
  constructor(io) {
    this.io = io;
  }

  /**
   * Start a new session metrics tracking
   */
  async startSession(tenantId, tableId, tableNumber, customerSession, waiter) {
    try {
      const metrics = new SessionMetrics({
        tenantId,
        tableId,
        tableNumber,
        sessionId: customerSession?._id,
        customerName: customerSession?.customerName,
        customerPhone: customerSession?.customerPhone,
        numberOfGuests: customerSession?.occupancy || 1,
        waiterId: waiter?._id,
        waiterName: waiter?.name,
        status: 'active'
      });

      await metrics.addEvent('session_started', {
        tableNumber,
        waiterName: waiter?.name
      }, waiter?._id, waiter?.name);

      await metrics.save();

      return metrics;
    } catch (error) {
      console.error('Error starting session metrics:', error);
      throw error;
    }
  }

  /**
   * Track order placement
   */
  async trackOrderPlaced(tenantId, tableNumber, order, userId) {
    try {
      const metrics = await SessionMetrics.findOne({
        tenantId,
        tableNumber,
        status: 'active'
      }).sort({ startTime: -1 });

      if (!metrics) {
        console.warn(`No active session found for table ${tableNumber}`);
        return;
      }

      // Add order to metrics
      metrics.orders.push({
        orderId: order._id,
        orderNumber: order.orderNumber,
        amount: order.totalAmount || order.total,
        itemCount: order.items?.length || 0,
        placedAt: new Date()
      });

      await metrics.addEvent('order_placed', {
        orderId: order._id,
        orderNumber: order.orderNumber,
        amount: order.totalAmount || order.total,
        items: order.items?.length || 0
      }, userId, order.waiterInfo?.name);

      await metrics.save();

      // Emit real-time update
      this.emitMetricsUpdate(tenantId, tableNumber, 'order_placed', metrics);

      return metrics;
    } catch (error) {
      console.error('Error tracking order placement:', error);
    }
  }

  /**
   * Track order modification
   */
  async trackOrderModified(tenantId, tableNumber, orderId, modification, userId) {
    try {
      const metrics = await SessionMetrics.findOne({
        tenantId,
        tableNumber,
        status: 'active'
      }).sort({ startTime: -1 });

      if (!metrics) return;

      await metrics.addEvent('order_modified', {
        orderId,
        modification
      }, userId);

      // Update order info if amount changed
      if (modification.newAmount) {
        const orderIndex = metrics.orders.findIndex(o => o.orderId.toString() === orderId);
        if (orderIndex !== -1) {
          metrics.orders[orderIndex].amount = modification.newAmount;
        }
      }

      await metrics.save();

      return metrics;
    } catch (error) {
      console.error('Error tracking order modification:', error);
    }
  }

  /**
   * Track payment completion
   */
  async trackPaymentCompleted(tenantId, tableNumber, payment, tipAmount = 0) {
    try {
      const metrics = await SessionMetrics.findOne({
        tenantId,
        tableNumber,
        status: 'active'
      }).sort({ startTime: -1 });

      if (!metrics) return;

      metrics.paymentMethod = payment.method;
      metrics.paymentTime = new Date();
      metrics.billAmount = payment.amount - tipAmount;
      metrics.tipAmount = tipAmount;

      await metrics.addEvent('payment_completed', {
        method: payment.method,
        amount: payment.amount,
        tip: tipAmount
      }, payment.processedBy);

      await metrics.save();

      // Emit real-time update
      this.emitMetricsUpdate(tenantId, tableNumber, 'payment_completed', metrics);

      return metrics;
    } catch (error) {
      console.error('Error tracking payment:', error);
    }
  }

  /**
   * Track waiter call
   */
  async trackWaiterCalled(tenantId, tableNumber, callTime) {
    try {
      const metrics = await SessionMetrics.findOne({
        tenantId,
        tableNumber,
        status: 'active'
      }).sort({ startTime: -1 });

      if (!metrics) return;

      // Add to response times array (will be completed when waiter responds)
      const callRecord = {
        callTime: callTime || new Date(),
        responseTime: null,
        responseDelay: null
      };

      metrics.waiterResponseTimes.push(callRecord);

      await metrics.addEvent('waiter_called', {
        callTime: callRecord.callTime
      });

      await metrics.save();

      return metrics;
    } catch (error) {
      console.error('Error tracking waiter call:', error);
    }
  }

  /**
   * Track waiter response
   */
  async trackWaiterResponded(tenantId, tableNumber, waiterId, waiterName) {
    try {
      const metrics = await SessionMetrics.findOne({
        tenantId,
        tableNumber,
        status: 'active'
      }).sort({ startTime: -1 });

      if (!metrics) return;

      // Find the last unanswered call
      const lastCall = metrics.waiterResponseTimes
        .filter(r => !r.responseTime)
        .sort((a, b) => b.callTime - a.callTime)[0];

      if (lastCall) {
        lastCall.responseTime = new Date();
        lastCall.responseDelay = Math.round((lastCall.responseTime - lastCall.callTime) / 1000); // seconds
      }

      await metrics.addEvent('waiter_responded', {
        responseDelay: lastCall?.responseDelay
      }, waiterId, waiterName);

      await metrics.save();

      return metrics;
    } catch (error) {
      console.error('Error tracking waiter response:', error);
    }
  }

  /**
   * End session
   */
  async endSession(tenantId, tableNumber, feedback = null) {
    try {
      const metrics = await SessionMetrics.findOne({
        tenantId,
        tableNumber,
        status: 'active'
      }).sort({ startTime: -1 });

      if (!metrics) return;

      metrics.endTime = new Date();
      metrics.status = 'completed';

      if (feedback) {
        metrics.customerRating = feedback.rating;
        metrics.customerFeedback = feedback.comment;
      }

      await metrics.addEvent('session_ended', {
        duration: metrics.duration,
        totalAmount: metrics.totalOrderAmount
      });

      await metrics.save();

      // Emit final metrics
      this.emitMetricsUpdate(tenantId, tableNumber, 'session_ended', metrics);

      return metrics;
    } catch (error) {
      console.error('Error ending session:', error);
    }
  }

  /**
   * Get real-time metrics for a table
   */
  async getTableMetrics(tenantId, tableNumber) {
    try {
      const currentSession = await SessionMetrics.findOne({
        tenantId,
        tableNumber,
        status: 'active'
      }).sort({ startTime: -1 });

      const historicalStats = await SessionMetrics.aggregate([
        {
          $match: {
            tenantId,
            tableNumber,
            status: 'completed'
          }
        },
        {
          $group: {
            _id: null,
            avgDuration: { $avg: '$tableOccupancyTime' },
            avgOrderValue: { $avg: '$totalOrderAmount' },
            avgTip: { $avg: '$tipPercentage' },
            totalSessions: { $sum: 1 },
            totalRevenue: { $sum: '$totalOrderAmount' }
          }
        }
      ]);

      return {
        current: currentSession,
        historical: historicalStats[0] || {
          avgDuration: 0,
          avgOrderValue: 0,
          avgTip: 0,
          totalSessions: 0,
          totalRevenue: 0
        }
      };
    } catch (error) {
      console.error('Error getting table metrics:', error);
      throw error;
    }
  }

  /**
   * Get analytics dashboard data
   */
  async getDashboardAnalytics(tenantId, dateRange = {}) {
    try {
      const today = new Date();
      const startOfDay = new Date(today.setHours(0, 0, 0, 0));
      const endOfDay = new Date(today.setHours(23, 59, 59, 999));

      const defaultRange = {
        start: dateRange.start || startOfDay,
        end: dateRange.end || endOfDay
      };

      // Get various analytics
      const [
        todayStats,
        peakHours,
        tablePerformance,
        waiterPerformance,
        anomalies
      ] = await Promise.all([
        this.getTodayStats(tenantId, defaultRange),
        SessionMetrics.getPeakHours(tenantId, defaultRange),
        this.getTablePerformance(tenantId, defaultRange),
        this.getWaiterPerformance(tenantId, defaultRange),
        this.getAnomalies(tenantId, defaultRange)
      ]);

      return {
        overview: todayStats,
        peakHours,
        tablePerformance,
        waiterPerformance,
        anomalies,
        dateRange: defaultRange
      };
    } catch (error) {
      console.error('Error getting dashboard analytics:', error);
      throw error;
    }
  }

  /**
   * Get today's statistics
   */
  async getTodayStats(tenantId, dateRange) {
    const stats = await SessionMetrics.aggregate([
      {
        $match: {
          tenantId,
          startTime: { $gte: dateRange.start, $lte: dateRange.end }
        }
      },
      {
        $group: {
          _id: null,
          totalSessions: { $sum: 1 },
          completedSessions: {
            $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
          },
          activeSessions: {
            $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] }
          },
          totalRevenue: { $sum: '$totalOrderAmount' },
          totalGuests: { $sum: '$numberOfGuests' },
          avgSessionDuration: { $avg: '$tableOccupancyTime' },
          avgOrderValue: { $avg: '$totalOrderAmount' },
          avgWaitTime: { $avg: '$customerWaitTime' },
          totalTips: { $sum: '$tipAmount' },
          avgTipPercentage: { $avg: '$tipPercentage' }
        }
      }
    ]);

    return stats[0] || {
      totalSessions: 0,
      completedSessions: 0,
      activeSessions: 0,
      totalRevenue: 0,
      totalGuests: 0,
      avgSessionDuration: 0,
      avgOrderValue: 0,
      avgWaitTime: 0,
      totalTips: 0,
      avgTipPercentage: 0
    };
  }

  /**
   * Get table performance metrics
   */
  async getTablePerformance(tenantId, dateRange) {
    return SessionMetrics.aggregate([
      {
        $match: {
          tenantId,
          status: 'completed',
          startTime: { $gte: dateRange.start, $lte: dateRange.end }
        }
      },
      {
        $group: {
          _id: '$tableNumber',
          sessions: { $sum: 1 },
          revenue: { $sum: '$totalOrderAmount' },
          avgDuration: { $avg: '$tableOccupancyTime' },
          avgOrderValue: { $avg: '$totalOrderAmount' },
          turnoverRate: {
            $sum: {
              $divide: [1, { $divide: ['$tableOccupancyTime', 60] }]
            }
          }
        }
      },
      { $sort: { revenue: -1 } },
      { $limit: 10 }
    ]);
  }

  /**
   * Get waiter performance metrics
   */
  async getWaiterPerformance(tenantId, dateRange) {
    return SessionMetrics.aggregate([
      {
        $match: {
          tenantId,
          waiterId: { $exists: true },
          status: 'completed',
          startTime: { $gte: dateRange.start, $lte: dateRange.end }
        }
      },
      {
        $group: {
          _id: {
            waiterId: '$waiterId',
            waiterName: '$waiterName'
          },
          sessions: { $sum: 1 },
          revenue: { $sum: '$totalOrderAmount' },
          tips: { $sum: '$tipAmount' },
          avgTipPercentage: { $avg: '$tipPercentage' },
          avgResponseTime: { $avg: '$averageWaiterResponseTime' },
          avgRating: { $avg: '$customerRating' }
        }
      },
      {
        $project: {
          waiterName: '$_id.waiterName',
          sessions: 1,
          revenue: 1,
          tips: 1,
          avgTipPercentage: 1,
          avgResponseTime: 1,
          avgRating: 1
        }
      },
      { $sort: { revenue: -1 } },
      { $limit: 10 }
    ]);
  }

  /**
   * Get detected anomalies
   */
  async getAnomalies(tenantId, dateRange) {
    const sessions = await SessionMetrics.find({
      tenantId,
      'anomalies.0': { $exists: true },
      startTime: { $gte: dateRange.start, $lte: dateRange.end }
    })
    .select('tableNumber anomalies startTime')
    .sort({ startTime: -1 })
    .limit(20);

    return sessions.map(s => ({
      tableNumber: s.tableNumber,
      time: s.startTime,
      anomalies: s.anomalies
    }));
  }

  /**
   * Emit real-time metrics update
   */
  emitMetricsUpdate(tenantId, tableNumber, event, metrics) {
    if (this.io) {
      this.io.to(`tenant:${tenantId}`).emit('table-metrics-update', {
        tableNumber,
        event,
        metrics: {
          duration: metrics.duration,
          orders: metrics.orders.length,
          totalAmount: metrics.totalOrderAmount,
          guests: metrics.numberOfGuests,
          waitTime: metrics.customerWaitTime
        }
      });
    }
  }
}

module.exports = SessionMetricsService;