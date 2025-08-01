const express = require('express');
const router = express.Router();
const TableServiceHistory = require('../../models/TableServiceHistory');
const TableMaintenanceLog = require('../../models/TableMaintenanceLog');
const { authenticate, authorize } = require('../../middleware/auth');

// Apply middleware
router.use(authenticate);
router.use(authorize('admin', 'manager'));

// Get table service history
router.get('/tables/:tableId/history', async (req, res) => {
  try {
    const { tableId } = req.params;
    const { 
      limit = 50, 
      startDate, 
      endDate, 
      includeAnalytics = true 
    } = req.query;

    const serviceHistoryService = req.app.get('tableServiceHistoryService');
    
    const history = await serviceHistoryService.getTableHistory(
      req.tenantId,
      tableId,
      {
        limit: parseInt(limit),
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
        includeAnalytics: includeAnalytics === 'true'
      }
    );

    res.json({
      success: true,
      data: history
    });
  } catch (error) {
    console.error('Error fetching table history:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch table history' 
    });
  }
});

// Get table analytics
router.get('/tables/:tableId/analytics', async (req, res) => {
  try {
    const { tableId } = req.params;
    const { startDate, endDate } = req.query;

    const dateRange = {};
    if (startDate) dateRange.start = new Date(startDate);
    if (endDate) dateRange.end = new Date(endDate);

    const analytics = await TableServiceHistory.getTableAnalytics(
      req.tenantId,
      tableId,
      dateRange
    );

    res.json({
      success: true,
      data: analytics
    });
  } catch (error) {
    console.error('Error fetching table analytics:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch table analytics' 
    });
  }
});

// Get service trends
router.get('/tables/:tableId/trends', async (req, res) => {
  try {
    const { tableId } = req.params;
    const { period = '30d' } = req.query;

    const trends = await TableServiceHistory.getServiceTrends(
      req.tenantId,
      tableId,
      period
    );

    res.json({
      success: true,
      data: trends
    });
  } catch (error) {
    console.error('Error fetching service trends:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch service trends' 
    });
  }
});

// Get popular tables
router.get('/popular-tables', async (req, res) => {
  try {
    const { startDate, endDate, limit = 10 } = req.query;
    
    const serviceHistoryService = req.app.get('tableServiceHistoryService');
    
    const dateRange = {};
    if (startDate) dateRange.start = new Date(startDate);
    if (endDate) dateRange.end = new Date(endDate);

    const popularTables = await serviceHistoryService.getPopularTables(
      req.tenantId,
      dateRange,
      parseInt(limit)
    );

    res.json({
      success: true,
      data: popularTables
    });
  } catch (error) {
    console.error('Error fetching popular tables:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch popular tables' 
    });
  }
});

// Get average dining duration
router.get('/dining-duration', async (req, res) => {
  try {
    const { groupBy = 'all', startDate, endDate } = req.query;
    
    const serviceHistoryService = req.app.get('tableServiceHistoryService');
    
    const dateRange = {};
    if (startDate) dateRange.start = new Date(startDate);
    if (endDate) dateRange.end = new Date(endDate);

    const durations = await serviceHistoryService.getAverageDiningDuration(
      req.tenantId,
      groupBy,
      dateRange
    );

    res.json({
      success: true,
      data: durations
    });
  } catch (error) {
    console.error('Error fetching dining durations:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch dining durations' 
    });
  }
});

// Get maintenance schedule
router.get('/maintenance/schedule', async (req, res) => {
  try {
    const { days = 30 } = req.query;
    
    const serviceHistoryService = req.app.get('tableServiceHistoryService');
    
    const schedule = await serviceHistoryService.getMaintenanceSchedule(
      req.tenantId,
      parseInt(days)
    );

    res.json({
      success: true,
      data: schedule
    });
  } catch (error) {
    console.error('Error fetching maintenance schedule:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch maintenance schedule' 
    });
  }
});

// Get upcoming maintenance
router.get('/maintenance/upcoming', async (req, res) => {
  try {
    const { days = 7 } = req.query;

    const upcomingMaintenance = await TableMaintenanceLog.getUpcomingMaintenance(
      req.tenantId,
      parseInt(days)
    );

    res.json({
      success: true,
      data: upcomingMaintenance
    });
  } catch (error) {
    console.error('Error fetching upcoming maintenance:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch upcoming maintenance' 
    });
  }
});

// Get maintenance statistics
router.get('/maintenance/stats', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const dateRange = {};
    if (startDate) dateRange.start = new Date(startDate);
    if (endDate) dateRange.end = new Date(endDate);

    const stats = await TableMaintenanceLog.getMaintenanceStats(
      req.tenantId,
      dateRange
    );

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error fetching maintenance stats:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch maintenance statistics' 
    });
  }
});

// Create maintenance log
router.post('/tables/:tableId/maintenance', async (req, res) => {
  try {
    const { tableId } = req.params;
    const maintenanceData = {
      ...req.body,
      createdBy: {
        userId: req.user._id,
        name: req.user.name,
        role: req.user.role
      }
    };

    const serviceHistoryService = req.app.get('tableServiceHistoryService');
    
    const maintenanceLog = await serviceHistoryService.logMaintenance(
      req.tenantId,
      tableId,
      maintenanceData
    );

    res.json({
      success: true,
      data: maintenanceLog,
      message: 'Maintenance log created successfully'
    });
  } catch (error) {
    console.error('Error creating maintenance log:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Failed to create maintenance log' 
    });
  }
});

// Update maintenance log
router.put('/maintenance/:logId', async (req, res) => {
  try {
    const { logId } = req.params;
    const updates = req.body;

    // Add last modified info
    updates.lastModifiedBy = {
      userId: req.user._id,
      name: req.user.name,
      role: req.user.role
    };

    const maintenanceLog = await TableMaintenanceLog.findOneAndUpdate(
      { _id: logId, tenantId: req.tenantId },
      updates,
      { new: true }
    );

    if (!maintenanceLog) {
      return res.status(404).json({ 
        success: false, 
        error: 'Maintenance log not found' 
      });
    }

    // Handle status change
    if (updates.status === 'completed' && !maintenanceLog.completedAt) {
      maintenanceLog.completedAt = new Date();
      maintenanceLog.actualEndTime = new Date();
      await maintenanceLog.save();
    }

    res.json({
      success: true,
      data: maintenanceLog,
      message: 'Maintenance log updated successfully'
    });
  } catch (error) {
    console.error('Error updating maintenance log:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to update maintenance log' 
    });
  }
});

// Complete maintenance task
router.post('/maintenance/:logId/complete', async (req, res) => {
  try {
    const { logId } = req.params;
    const { 
      conditionAfter, 
      completionNotes, 
      actualEndTime 
    } = req.body;

    const maintenanceLog = await TableMaintenanceLog.findOne({
      _id: logId,
      tenantId: req.tenantId,
      status: { $in: ['scheduled', 'in_progress'] }
    });

    if (!maintenanceLog) {
      return res.status(404).json({ 
        success: false, 
        error: 'Maintenance log not found or already completed' 
      });
    }

    // Update completion details
    maintenanceLog.status = 'completed';
    maintenanceLog.completedAt = new Date();
    maintenanceLog.actualEndTime = actualEndTime || new Date();
    maintenanceLog.completionNotes = completionNotes;
    maintenanceLog.conditionAfter = conditionAfter;
    maintenanceLog.signOffBy = {
      userId: req.user._id,
      name: req.user.name,
      role: req.user.role,
      signedAt: new Date()
    };

    await maintenanceLog.save();

    // Create next recurring task if applicable
    if (maintenanceLog.isRecurring && maintenanceLog.recurringSchedule.nextScheduled) {
      const nextTask = await TableMaintenanceLog.create({
        ...maintenanceLog.toObject(),
        _id: undefined,
        status: 'scheduled',
        scheduledDate: maintenanceLog.recurringSchedule.nextScheduled,
        actualStartTime: undefined,
        actualEndTime: undefined,
        completedAt: undefined,
        completionNotes: undefined,
        conditionAfter: undefined,
        signOffBy: undefined,
        createdAt: undefined,
        updatedAt: undefined
      });
    }

    res.json({
      success: true,
      data: maintenanceLog,
      message: 'Maintenance task completed successfully'
    });
  } catch (error) {
    console.error('Error completing maintenance task:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to complete maintenance task' 
    });
  }
});

// Create recurring maintenance task
router.post('/maintenance/recurring', async (req, res) => {
  try {
    const taskData = {
      ...req.body,
      tenantId: req.tenantId,
      createdBy: {
        userId: req.user._id,
        name: req.user.name,
        role: req.user.role
      }
    };

    const recurringTask = await TableMaintenanceLog.createRecurringTask(taskData);

    res.json({
      success: true,
      data: recurringTask,
      message: 'Recurring maintenance task created successfully'
    });
  } catch (error) {
    console.error('Error creating recurring task:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Failed to create recurring maintenance task' 
    });
  }
});

// Export service history
router.get('/export', async (req, res) => {
  try {
    const { 
      tableId, 
      startDate, 
      endDate, 
      format = 'json' 
    } = req.query;

    const query = {
      tenantId: req.tenantId,
      isArchived: false
    };

    if (tableId) query.tableId = tableId;
    if (startDate || endDate) {
      query.serviceStart = {};
      if (startDate) query.serviceStart.$gte = new Date(startDate);
      if (endDate) query.serviceStart.$lte = new Date(endDate);
    }

    const serviceHistory = await TableServiceHistory.find(query)
      .populate('tableId', 'number displayName')
      .populate('waiterId', 'name')
      .sort({ serviceStart: -1 });

    if (format === 'csv') {
      // Convert to CSV
      const csv = convertToCSV(serviceHistory);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=table-service-history.csv');
      res.send(csv);
    } else {
      res.json({
        success: true,
        count: serviceHistory.length,
        data: serviceHistory
      });
    }
  } catch (error) {
    console.error('Error exporting service history:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to export service history' 
    });
  }
});

// Helper function to convert to CSV
function convertToCSV(data) {
  const headers = [
    'Table Number',
    'Service Date',
    'Duration (min)',
    'Guests',
    'Orders',
    'Revenue',
    'Tips',
    'Rating',
    'Waiter',
    'Customer'
  ];
  
  const rows = data.map(s => [
    s.tableNumber,
    new Date(s.serviceStart).toISOString(),
    s.duration || 0,
    s.numberOfGuests,
    s.totalOrders,
    s.totalOrderAmount,
    s.payment?.tipAmount || 0,
    s.feedback?.rating || '',
    s.waiterName || '',
    s.customerName || ''
  ]);
  
  return [headers, ...rows].map(row => row.join(',')).join('\n');
}

module.exports = router;