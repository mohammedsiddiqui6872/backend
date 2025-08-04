const express = require('express');
const router = express.Router();
const RestaurantAuditLog = require('../../models/RestaurantAuditLog');
const { authenticate, authorize } = require('../../middleware/auth');
const { enterpriseTenantIsolation } = require('../../middleware/enterpriseTenantIsolation');
const { Parser } = require('json2csv');
const PDFDocument = require('pdfkit');
const ExcelJS = require('exceljs');

// Get audit logs with filters
router.get('/', authenticate, authorize(['audit_logs.view']), enterpriseTenantIsolation, async (req, res) => {
  try {
    const {
      startDate,
      endDate,
      action,
      category,
      userId,
      tableNumber,
      orderId,
      staffId,
      search,
      status,
      sortBy = 'timestamp',
      sortOrder = 'desc',
      page = 1,
      limit = 50
    } = req.query;

    // Build query
    const query = { tenantId: req.tenant.tenantId };

    // Date range filter
    if (startDate || endDate) {
      query.timestamp = {};
      if (startDate) query.timestamp.$gte = new Date(startDate);
      if (endDate) query.timestamp.$lte = new Date(endDate);
    }

    // Other filters
    if (action) query.action = Array.isArray(action) ? { $in: action } : action;
    if (category) query.category = Array.isArray(category) ? { $in: category } : category;
    if (userId) query['performedBy.userId'] = userId;
    if (tableNumber) query['location.tableNumber'] = tableNumber;
    if (staffId) query['resource.id'] = staffId;
    if (status) query.status = status;

    // Search filter
    if (search) {
      query.$or = [
        { 'performedBy.name': { $regex: search, $options: 'i' } },
        { 'resource.name': { $regex: search, $options: 'i' } },
        { 'changes.summary': { $regex: search, $options: 'i' } }
      ];
    }

    // Execute query with pagination
    const skip = (page - 1) * limit;
    const sort = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

    const [logs, total] = await Promise.all([
      RestaurantAuditLog.find(query)
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      RestaurantAuditLog.countDocuments(query)
    ]);

    res.json({
      success: true,
      logs,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    res.status(500).json({ success: false, message: 'Error fetching audit logs' });
  }
});

// Get statistics
router.get('/stats', authenticate, authorize(['audit_logs.view']), enterpriseTenantIsolation, async (req, res) => {
  try {
    const { period = 'today' } = req.query;
    
    let startDate, endDate;
    const now = new Date();
    
    switch (period) {
      case 'today':
        startDate = new Date(now);
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(now);
        endDate.setHours(23, 59, 59, 999);
        break;
      case 'week':
        startDate = new Date(now);
        startDate.setDate(now.getDate() - 7);
        endDate = now;
        break;
      case 'month':
        startDate = new Date(now);
        startDate.setMonth(now.getMonth() - 1);
        endDate = now;
        break;
    }

    const stats = await RestaurantAuditLog.aggregate([
      {
        $match: {
          tenantId: req.tenant.tenantId,
          timestamp: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $facet: {
          operations: [
            {
              $match: { category: 'orders' }
            },
            {
              $group: {
                _id: null,
                totalOrders: {
                  $sum: { $cond: [{ $eq: ['$action', 'order.created'] }, 1, 0] }
                },
                completedOrders: {
                  $sum: { $cond: [{ $eq: ['$action', 'order.completed'] }, 1, 0] }
                },
                cancelledOrders: {
                  $sum: { $cond: [{ $eq: ['$action', 'order.cancelled'] }, 1, 0] }
                },
                totalRevenue: {
                  $sum: { $ifNull: ['$impact.revenueImpact', 0] }
                }
              }
            }
          ],
          tables: [
            {
              $match: { category: 'tables' }
            },
            {
              $group: {
                _id: null,
                totalAssignments: {
                  $sum: { $cond: [{ $eq: ['$action', 'table.assigned'] }, 1, 0] }
                }
              }
            }
          ],
          staff: [
            {
              $match: { category: 'staff' }
            },
            {
              $group: {
                _id: null,
                totalShifts: {
                  $sum: { $cond: [{ $eq: ['$action', 'staff.clocked_in'] }, 1, 0] }
                }
              }
            }
          ],
          topActions: [
            {
              $group: {
                _id: '$action',
                count: { $sum: 1 }
              }
            },
            { $sort: { count: -1 } },
            { $limit: 10 }
          ],
          mostActiveStaff: [
            {
              $group: {
                _id: {
                  userId: '$performedBy.userId',
                  name: '$performedBy.name'
                },
                actions: { $sum: 1 }
              }
            },
            { $sort: { actions: -1 } },
            { $limit: 5 },
            {
              $project: {
                name: '$_id.name',
                actions: 1,
                _id: 0
              }
            }
          ],
          peakHours: [
            {
              $group: {
                _id: { $hour: '$timestamp' },
                count: { $sum: 1 }
              }
            },
            { $sort: { _id: 1 } },
            {
              $project: {
                hour: '$_id',
                count: 1,
                _id: 0
              }
            }
          ]
        }
      }
    ]);

    // Process results
    const result = stats[0];
    const operations = result.operations[0] || {
      totalOrders: 0,
      completedOrders: 0,
      cancelledOrders: 0,
      totalRevenue: 0
    };
    
    operations.averageOrderValue = operations.totalOrders > 0 
      ? operations.totalRevenue / operations.totalOrders 
      : 0;

    res.json({
      success: true,
      timeRange: { start: startDate, end: endDate },
      operations,
      tables: {
        totalAssignments: result.tables[0]?.totalAssignments || 0,
        averageTurnoverTime: 45, // This would be calculated from actual data
        peakHours: result.peakHours
      },
      staff: {
        totalShifts: result.staff[0]?.totalShifts || 0,
        totalHoursWorked: 0, // This would be calculated from shift data
        mostActiveStaff: result.mostActiveStaff
      },
      topActions: result.topActions
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ success: false, message: 'Error fetching statistics' });
  }
});

// Get daily summary
router.get('/daily-summary', authenticate, authorize(['audit_logs.view']), enterpriseTenantIsolation, async (req, res) => {
  try {
    const { date = new Date().toISOString().split('T')[0] } = req.query;
    
    const summary = await RestaurantAuditLog.getDailySummary(req.tenant.tenantId, date);
    
    res.json({
      success: true,
      date,
      summary
    });
  } catch (error) {
    console.error('Error fetching daily summary:', error);
    res.status(500).json({ success: false, message: 'Error fetching daily summary' });
  }
});

// Export audit logs
router.get('/export', authenticate, authorize(['audit_logs.export']), enterpriseTenantIsolation, async (req, res) => {
  try {
    const { format = 'csv', ...filters } = req.query;
    
    // Build query (same as listing)
    const query = { tenantId: req.tenant.tenantId };
    
    if (filters.startDate || filters.endDate) {
      query.timestamp = {};
      if (filters.startDate) query.timestamp.$gte = new Date(filters.startDate);
      if (filters.endDate) query.timestamp.$lte = new Date(filters.endDate);
    }
    
    if (filters.action) query.action = filters.action;
    if (filters.category) query.category = filters.category;
    if (filters.userId) query['performedBy.userId'] = filters.userId;
    
    const logs = await RestaurantAuditLog.find(query)
      .sort({ timestamp: -1 })
      .limit(10000) // Limit export size
      .lean();
    
    switch (format) {
      case 'csv':
        const fields = [
          'timestamp', 'action', 'category', 'performedBy.name', 
          'resource.name', 'changes.summary', 'status'
        ];
        const parser = new Parser({ fields });
        const csv = parser.parse(logs);
        
        res.header('Content-Type', 'text/csv');
        res.attachment(`restaurant-activities-${new Date().toISOString().split('T')[0]}.csv`);
        res.send(csv);
        break;
        
      case 'pdf':
        const doc = new PDFDocument();
        res.header('Content-Type', 'application/pdf');
        res.attachment(`restaurant-activities-${new Date().toISOString().split('T')[0]}.pdf`);
        
        doc.pipe(res);
        doc.fontSize(16).text('Restaurant Activity Log', 50, 50);
        doc.fontSize(10).text(`Generated: ${new Date().toLocaleString()}`, 50, 80);
        
        let y = 120;
        logs.slice(0, 100).forEach((log, index) => { // Limit PDF to 100 entries
          if (y > 700) {
            doc.addPage();
            y = 50;
          }
          
          doc.fontSize(8)
            .text(`${new Date(log.timestamp).toLocaleString()} - ${log.action}`, 50, y)
            .text(`By: ${log.performedBy.name} | ${log.changes?.summary || ''}`, 50, y + 10);
          
          y += 25;
        });
        
        doc.end();
        break;
        
      case 'excel':
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Restaurant Activities');
        
        worksheet.columns = [
          { header: 'Timestamp', key: 'timestamp', width: 20 },
          { header: 'Action', key: 'action', width: 25 },
          { header: 'Category', key: 'category', width: 15 },
          { header: 'Performed By', key: 'performedBy', width: 20 },
          { header: 'Resource', key: 'resource', width: 20 },
          { header: 'Details', key: 'details', width: 40 },
          { header: 'Status', key: 'status', width: 10 }
        ];
        
        logs.forEach(log => {
          worksheet.addRow({
            timestamp: new Date(log.timestamp).toLocaleString(),
            action: log.action,
            category: log.category,
            performedBy: log.performedBy.name,
            resource: log.resource.name,
            details: log.changes?.summary || '',
            status: log.status
          });
        });
        
        res.header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.attachment(`restaurant-activities-${new Date().toISOString().split('T')[0]}.xlsx`);
        
        await workbook.xlsx.write(res);
        break;
        
      default:
        res.status(400).json({ success: false, message: 'Invalid export format' });
    }
  } catch (error) {
    console.error('Error exporting audit logs:', error);
    res.status(500).json({ success: false, message: 'Error exporting audit logs' });
  }
});

module.exports = router;