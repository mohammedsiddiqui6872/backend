const TableServiceHistory = require('../models/TableServiceHistory');
const TableMaintenanceLog = require('../models/TableMaintenanceLog');
const CustomerSession = require('../models/CustomerSession');
const SessionMetrics = require('../models/SessionMetrics');
const Table = require('../models/Table');

class TableServiceHistoryService {
  constructor(io) {
    this.io = io;
  }

  /**
   * Start tracking a new service
   */
  async startService(tenantId, tableId, tableNumber, sessionData) {
    try {
      const serviceHistory = new TableServiceHistory({
        tenantId,
        tableId,
        tableNumber,
        serviceStart: new Date(),
        sessionId: sessionData.sessionId,
        sessionMetricsId: sessionData.sessionMetricsId,
        customerName: sessionData.customerName,
        customerPhone: sessionData.customerPhone,
        numberOfGuests: sessionData.numberOfGuests || 1,
        waiterId: sessionData.waiterId,
        waiterName: sessionData.waiterName,
        notes: sessionData.notes
      });

      // Check if repeat customer
      if (sessionData.customerPhone) {
        const previousVisits = await TableServiceHistory.countDocuments({
          tenantId,
          customerPhone: sessionData.customerPhone,
          serviceEnd: { $exists: true }
        });
        serviceHistory.isRepeatCustomer = previousVisits > 0;
      }

      await serviceHistory.save();

      // Update table stats
      await Table.findByIdAndUpdate(tableId, {
        $inc: { 'stats.totalSessions': 1 }
      });

      return serviceHistory;
    } catch (error) {
      console.error('Error starting service history:', error);
      throw error;
    }
  }

  /**
   * Update service with order information
   */
  async updateServiceWithOrder(tenantId, tableNumber, order) {
    try {
      const service = await TableServiceHistory.findOne({
        tenantId,
        tableNumber,
        serviceEnd: { $exists: false }
      }).sort({ serviceStart: -1 });

      if (!service) return null;

      // Check if order already tracked
      const orderExists = service.orders.some(o => o.orderId.toString() === order._id.toString());
      if (!orderExists) {
        service.orders.push({
          orderId: order._id,
          orderNumber: order.orderNumber,
          amount: order.totalAmount || order.total,
          itemCount: order.items?.length || 0,
          placedAt: new Date()
        });

        service.totalOrders = service.orders.length;
        service.totalOrderAmount = service.orders.reduce((sum, o) => sum + o.amount, 0);

        // Update first order time metric
        if (service.orders.length === 1) {
          service.metrics.orderTime = Math.round((new Date() - service.serviceStart) / (1000 * 60));
        }

        await service.save();
      }

      return service;
    } catch (error) {
      console.error('Error updating service with order:', error);
    }
  }

  /**
   * Complete service and calculate final metrics
   */
  async completeService(tenantId, tableNumber, completionData = {}) {
    try {
      const service = await TableServiceHistory.findOne({
        tenantId,
        tableNumber,
        serviceEnd: { $exists: false }
      }).sort({ serviceStart: -1 });

      if (!service) return null;

      // Set end time and calculate duration
      service.serviceEnd = new Date();
      service.duration = Math.round((service.serviceEnd - service.serviceStart) / (1000 * 60));

      // Add payment information
      if (completionData.payment) {
        service.payment = {
          method: completionData.payment.method,
          amount: completionData.payment.amount,
          tipAmount: completionData.payment.tip || 0,
          tipPercentage: completionData.payment.tip ? 
            Math.round((completionData.payment.tip / completionData.payment.amount) * 10000) / 100 : 0,
          paidAt: new Date()
        };
      }

      // Add feedback if provided
      if (completionData.feedback) {
        service.feedback = completionData.feedback;
      }

      // Calculate service metrics
      service.metrics.totalServiceTime = service.duration;
      service.metrics.tableOccupancyTime = service.duration;

      // Get session metrics if available
      if (service.sessionMetricsId) {
        const sessionMetrics = await SessionMetrics.findById(service.sessionMetricsId);
        if (sessionMetrics) {
          service.metrics.seatingTime = sessionMetrics.seatingTime;
          service.metrics.firstFoodDelivery = sessionMetrics.firstFoodDeliveryTime;
          service.metrics.waitingPeriods = sessionMetrics.waitingPeriods;
          
          // Copy waiter response times
          if (sessionMetrics.waiterResponseTimes?.length > 0) {
            const avgResponseTime = sessionMetrics.waiterResponseTimes.reduce((sum, rt) => 
              sum + (rt.responseDelay || 0), 0) / sessionMetrics.waiterResponseTimes.length;
            service.serviceQuality.waiterResponseTime = Math.round(avgResponseTime);
          }
        }
      }

      // Table condition (can be updated by staff)
      if (completionData.tableCondition) {
        service.tableCondition = completionData.tableCondition;
      }

      await service.save();

      // Update table stats
      const table = await Table.findById(service.tableId);
      if (table) {
        const avgOccupancy = await TableServiceHistory.aggregate([
          { $match: { tableId: service.tableId, duration: { $exists: true } } },
          { $group: { _id: null, avgDuration: { $avg: '$duration' } } }
        ]);

        await Table.findByIdAndUpdate(service.tableId, {
          $inc: { 
            'stats.totalRevenue': service.totalOrderAmount 
          },
          $set: {
            'stats.averageOccupancyTime': avgOccupancy[0]?.avgDuration || service.duration,
            'stats.lastOccupied': service.serviceEnd
          }
        });
      }

      // Emit completion event
      if (this.io) {
        this.io.to(`tenant:${tenantId}`).emit('service-completed', {
          tableNumber,
          duration: service.duration,
          revenue: service.totalOrderAmount
        });
      }

      return service;
    } catch (error) {
      console.error('Error completing service:', error);
      throw error;
    }
  }

  /**
   * Add maintenance log
   */
  async logMaintenance(tenantId, tableId, maintenanceData) {
    try {
      const table = await Table.findById(tableId);
      if (!table) throw new Error('Table not found');

      const maintenanceLog = new TableMaintenanceLog({
        tenantId,
        tableId,
        tableNumber: table.number,
        ...maintenanceData
      });

      await maintenanceLog.save();

      // Update table metadata
      await Table.findByIdAndUpdate(tableId, {
        'metadata.lastCleaned': maintenanceData.type === 'cleaning' ? new Date() : table.metadata.lastCleaned,
        'metadata.maintenanceNotes': maintenanceData.notes
      });

      // Emit maintenance event
      if (this.io) {
        this.io.to(`tenant:${tenantId}`).emit('maintenance-logged', {
          tableNumber: table.number,
          type: maintenanceData.type,
          scheduledDate: maintenanceData.scheduledDate
        });
      }

      return maintenanceLog;
    } catch (error) {
      console.error('Error logging maintenance:', error);
      throw error;
    }
  }

  /**
   * Get comprehensive table history
   */
  async getTableHistory(tenantId, tableId, options = {}) {
    try {
      const { limit = 50, startDate, endDate, includeAnalytics = true } = options;

      const query = {
        tenantId,
        tableId,
        isArchived: false
      };

      if (startDate || endDate) {
        query.serviceStart = {};
        if (startDate) query.serviceStart.$gte = startDate;
        if (endDate) query.serviceStart.$lte = endDate;
      }

      // Get service history
      const serviceHistory = await TableServiceHistory.find(query)
        .sort({ serviceStart: -1 })
        .limit(limit)
        .populate('waiterId', 'name')
        .lean();

      // Get maintenance logs
      const maintenanceLogs = await TableMaintenanceLog.getMaintenanceHistory(tenantId, tableId, limit);

      // Get analytics if requested
      let analytics = null;
      if (includeAnalytics) {
        analytics = await TableServiceHistory.getTableAnalytics(tenantId, tableId, { startDate, endDate });
      }

      return {
        serviceHistory,
        maintenanceLogs,
        analytics
      };
    } catch (error) {
      console.error('Error getting table history:', error);
      throw error;
    }
  }

  /**
   * Get popular tables
   */
  async getPopularTables(tenantId, dateRange = {}, limit = 10) {
    try {
      const match = {
        tenantId,
        isArchived: false
      };

      if (dateRange.start) match.serviceStart = { $gte: dateRange.start };
      if (dateRange.end) {
        match.serviceStart = match.serviceStart || {};
        match.serviceStart.$lte = dateRange.end;
      }

      const popularTables = await TableServiceHistory.aggregate([
        { $match: match },
        {
          $group: {
            _id: {
              tableId: '$tableId',
              tableNumber: '$tableNumber'
            },
            totalServices: { $sum: 1 },
            totalRevenue: { $sum: '$totalOrderAmount' },
            totalGuests: { $sum: '$numberOfGuests' },
            avgRating: { $avg: '$feedback.rating' },
            avgDuration: { $avg: '$duration' }
          }
        },
        {
          $project: {
            tableId: '$_id.tableId',
            tableNumber: '$_id.tableNumber',
            totalServices: 1,
            totalRevenue: { $round: ['$totalRevenue', 2] },
            totalGuests: 1,
            avgRating: { $round: ['$avgRating', 1] },
            avgDuration: { $round: ['$avgDuration', 0] },
            revenuePerService: {
              $round: [{ $divide: ['$totalRevenue', '$totalServices'] }, 2]
            }
          }
        },
        { $sort: { totalRevenue: -1 } },
        { $limit: limit }
      ]);

      // Get table details
      const tableIds = popularTables.map(t => t.tableId);
      const tables = await Table.find({ _id: { $in: tableIds } })
        .select('number displayName type capacity location')
        .lean();

      const tableMap = tables.reduce((map, table) => {
        map[table._id.toString()] = table;
        return map;
      }, {});

      return popularTables.map(pt => ({
        ...pt,
        tableDetails: tableMap[pt.tableId.toString()]
      }));
    } catch (error) {
      console.error('Error getting popular tables:', error);
      throw error;
    }
  }

  /**
   * Get maintenance schedule
   */
  async getMaintenanceSchedule(tenantId, days = 30) {
    try {
      const schedule = await TableMaintenanceLog.getUpcomingMaintenance(tenantId, days);
      
      // Group by date
      const groupedSchedule = schedule.reduce((acc, task) => {
        const date = task.scheduledDate.toISOString().split('T')[0];
        if (!acc[date]) acc[date] = [];
        acc[date].push(task);
        return acc;
      }, {});

      return groupedSchedule;
    } catch (error) {
      console.error('Error getting maintenance schedule:', error);
      throw error;
    }
  }

  /**
   * Calculate average dining duration by various factors
   */
  async getAverageDiningDuration(tenantId, groupBy = 'all', dateRange = {}) {
    try {
      const match = {
        tenantId,
        duration: { $exists: true },
        isArchived: false
      };

      if (dateRange.start) match.serviceStart = { $gte: dateRange.start };
      if (dateRange.end) {
        match.serviceStart = match.serviceStart || {};
        match.serviceStart.$lte = dateRange.end;
      }

      let grouping = {};
      switch (groupBy) {
        case 'dayOfWeek':
          grouping = { dayOfWeek: '$dayOfWeek' };
          break;
        case 'guests':
          grouping = { guests: '$numberOfGuests' };
          break;
        case 'table':
          grouping = { 
            tableId: '$tableId',
            tableNumber: '$tableNumber'
          };
          break;
        case 'waiter':
          grouping = {
            waiterId: '$waiterId',
            waiterName: '$waiterName'
          };
          break;
        case 'timeOfDay':
          grouping = { hour: { $hour: '$serviceStart' } };
          break;
        default:
          grouping = { all: 'all' };
      }

      const durations = await TableServiceHistory.aggregate([
        { $match: match },
        {
          $group: {
            _id: grouping,
            avgDuration: { $avg: '$duration' },
            minDuration: { $min: '$duration' },
            maxDuration: { $max: '$duration' },
            count: { $sum: 1 }
          }
        },
        { $sort: { avgDuration: -1 } }
      ]);

      return durations.map(d => ({
        ...d._id,
        avgDuration: Math.round(d.avgDuration),
        minDuration: d.minDuration,
        maxDuration: d.maxDuration,
        sampleSize: d.count
      }));
    } catch (error) {
      console.error('Error calculating average dining duration:', error);
      throw error;
    }
  }
}

module.exports = TableServiceHistoryService;