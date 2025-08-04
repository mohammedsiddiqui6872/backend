const express = require('express');
const router = express.Router();
const AuditLog = require('../../models/AuditLog');
const { authenticate, authorize } = require('../../middleware/auth');
const { enterpriseTenantIsolation } = require('../../middleware/enterpriseTenantIsolation');
const { Parser } = require('json2csv');
const PDFDocument = require('pdfkit');
const ExcelJS = require('exceljs');

// Apply authentication and tenant isolation
router.use(authenticate);
router.use(enterpriseTenantIsolation);

// Get audit logs with advanced filtering
router.get('/', authorize('admin', 'manager'), async (req, res) => {
  try {
    const {
      startDate,
      endDate,
      action,
      category,
      actorId,
      actorEmail,
      resourceType,
      resourceId,
      severity,
      minRiskScore,
      suspicious,
      requiresReview,
      reviewed,
      gdprOnly,
      complianceRegulation,
      tags,
      search,
      sortBy = 'timestamp',
      sortOrder = 'desc',
      page = 1,
      limit = 50,
      includeRedacted = false
    } = req.query;

    // Build filters
    const filters = {
      startDate,
      endDate,
      action,
      category: category ? category.split(',') : undefined,
      actorId,
      actorEmail,
      resourceType,
      resourceId,
      severity: severity ? severity.split(',') : undefined,
      minRiskScore: minRiskScore ? parseInt(minRiskScore) : undefined,
      suspicious: suspicious === 'true' ? true : suspicious === 'false' ? false : undefined,
      requiresReview: requiresReview === 'true' ? true : requiresReview === 'false' ? false : undefined,
      reviewed: reviewed === 'true' ? true : reviewed === 'false' ? false : undefined,
      gdprOnly: gdprOnly === 'true',
      complianceRegulation,
      tags: tags ? tags.split(',') : undefined,
      search,
      sortBy,
      sortOrder,
      limit: parseInt(limit),
      skip: (parseInt(page) - 1) * parseInt(limit),
      populate: ['actor', 'reviewer']
    };

    // Get logs
    const logs = await AuditLog.search(req.tenantId, filters);
    
    // Get total count for pagination
    const totalFilters = { ...filters };
    delete totalFilters.limit;
    delete totalFilters.skip;
    delete totalFilters.populate;
    const total = await AuditLog.countDocuments(
      await AuditLog.search(req.tenantId, totalFilters)
    );

    // Redact sensitive data unless explicitly requested
    const processedLogs = logs.map(log => {
      const logObj = log.toObject();
      if (!includeRedacted || req.user.role !== 'admin') {
        log.redactSensitiveData();
      }
      return logObj;
    });

    res.json({
      logs: processedLogs,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    res.status(500).json({ error: 'Failed to fetch audit logs' });
  }
});

// Get audit log statistics
router.get('/stats', authorize('admin', 'manager'), async (req, res) => {
  try {
    const { startDate, endDate, period = '24h' } = req.query;
    
    let timeRange = {
      start: new Date(),
      end: new Date()
    };

    if (startDate && endDate) {
      timeRange.start = new Date(startDate);
      timeRange.end = new Date(endDate);
    } else {
      // Default time ranges
      switch (period) {
        case '1h':
          timeRange.start.setHours(timeRange.start.getHours() - 1);
          break;
        case '24h':
          timeRange.start.setHours(timeRange.start.getHours() - 24);
          break;
        case '7d':
          timeRange.start.setDate(timeRange.start.getDate() - 7);
          break;
        case '30d':
          timeRange.start.setDate(timeRange.start.getDate() - 30);
          break;
        case '90d':
          timeRange.start.setDate(timeRange.start.getDate() - 90);
          break;
      }
    }

    const stats = await AuditLog.getStats(req.tenantId, timeRange);
    
    res.json({
      timeRange,
      stats
    });
  } catch (error) {
    console.error('Error fetching audit stats:', error);
    res.status(500).json({ error: 'Failed to fetch audit statistics' });
  }
});

// Get specific audit log entry
router.get('/:eventId', authorize('admin', 'manager'), async (req, res) => {
  try {
    const log = await AuditLog.findOne({
      tenantId: req.tenantId,
      eventId: req.params.eventId
    })
    .populate('actor.userId', 'name email role')
    .populate('review.reviewedBy', 'name email')
    .populate('review.escalatedTo', 'name email');

    if (!log) {
      return res.status(404).json({ error: 'Audit log not found' });
    }

    // Check permissions for sensitive logs
    if (log.security.severity === 'critical' && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Insufficient permissions to view this log' });
    }

    res.json(log);
  } catch (error) {
    console.error('Error fetching audit log:', error);
    res.status(500).json({ error: 'Failed to fetch audit log' });
  }
});

// Get user activity summary
router.get('/users/:userId/activity', authorize('admin', 'manager'), async (req, res) => {
  try {
    const { days = 30 } = req.query;
    
    const activity = await AuditLog.getUserActivitySummary(
      req.tenantId,
      req.params.userId,
      parseInt(days)
    );
    
    res.json({
      userId: req.params.userId,
      days: parseInt(days),
      activity
    });
  } catch (error) {
    console.error('Error fetching user activity:', error);
    res.status(500).json({ error: 'Failed to fetch user activity' });
  }
});

// Get compliance report
router.get('/compliance/:regulation', authorize('admin'), async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    if (!startDate || !endDate) {
      return res.status(400).json({ error: 'Start date and end date are required' });
    }

    const timeRange = {
      start: new Date(startDate),
      end: new Date(endDate)
    };

    const report = await AuditLog.getComplianceReport(
      req.tenantId,
      req.params.regulation.toUpperCase(),
      timeRange
    );

    res.json({
      regulation: req.params.regulation.toUpperCase(),
      timeRange,
      report
    });
  } catch (error) {
    console.error('Error generating compliance report:', error);
    res.status(500).json({ error: 'Failed to generate compliance report' });
  }
});

// Review audit log entry
router.post('/:eventId/review', authorize('admin'), async (req, res) => {
  try {
    const { decision, notes, escalateTo } = req.body;
    
    const log = await AuditLog.findOne({
      tenantId: req.tenantId,
      eventId: req.params.eventId
    });

    if (!log) {
      return res.status(404).json({ error: 'Audit log not found' });
    }

    // Update review information
    log.review = {
      reviewedBy: req.user._id,
      reviewedAt: new Date(),
      reviewNotes: notes,
      reviewDecision: decision,
      escalatedTo: escalateTo || undefined,
      escalatedAt: escalateTo ? new Date() : undefined
    };

    log.flags.reviewed = true;
    log.flags.requiresReview = false;

    await log.save();

    // Emit real-time update
    const io = req.app.get('io');
    if (io) {
      io.to(`tenant:${req.tenantId}`).emit('audit:reviewed', {
        eventId: log.eventId,
        reviewer: req.user.name,
        decision
      });
    }

    res.json({
      success: true,
      log
    });
  } catch (error) {
    console.error('Error reviewing audit log:', error);
    res.status(500).json({ error: 'Failed to review audit log' });
  }
});

// Mark as false positive
router.post('/:eventId/false-positive', authorize('admin'), async (req, res) => {
  try {
    const log = await AuditLog.findOne({
      tenantId: req.tenantId,
      eventId: req.params.eventId
    });

    if (!log) {
      return res.status(404).json({ error: 'Audit log not found' });
    }

    log.flags.falsePositive = true;
    log.flags.suspicious = false;
    log.flags.requiresReview = false;
    
    // Add review note
    if (!log.review) log.review = {};
    log.review.reviewedBy = req.user._id;
    log.review.reviewedAt = new Date();
    log.review.reviewNotes = `Marked as false positive by ${req.user.name}`;
    log.review.reviewDecision = 'no_action_needed';

    await log.save();

    res.json({
      success: true,
      log
    });
  } catch (error) {
    console.error('Error marking false positive:', error);
    res.status(500).json({ error: 'Failed to mark as false positive' });
  }
});

// Add tags to audit log
router.post('/:eventId/tags', authorize('admin'), async (req, res) => {
  try {
    const { tags } = req.body;
    
    if (!Array.isArray(tags)) {
      return res.status(400).json({ error: 'Tags must be an array' });
    }

    const log = await AuditLog.findOne({
      tenantId: req.tenantId,
      eventId: req.params.eventId
    });

    if (!log) {
      return res.status(404).json({ error: 'Audit log not found' });
    }

    // Add new tags
    const existingTags = new Set(log.tags);
    tags.forEach(tag => existingTags.add(tag));
    log.tags = Array.from(existingTags);

    await log.save();

    res.json({
      success: true,
      tags: log.tags
    });
  } catch (error) {
    console.error('Error adding tags:', error);
    res.status(500).json({ error: 'Failed to add tags' });
  }
});

// Export audit logs
router.post('/export', authorize('admin'), async (req, res) => {
  try {
    const { format = 'csv', filters = {} } = req.body;
    
    // Add tenant filter
    filters.limit = 10000; // Max export limit
    
    const logs = await AuditLog.search(req.tenantId, filters);
    
    // Log the export action
    await AuditLog.logEvent({
      tenantId: req.tenantId,
      action: 'data.export',
      category: 'compliance',
      resource: {
        type: 'audit_log',
        name: 'Audit Logs Export'
      },
      actor: {
        type: 'user',
        userId: req.user._id,
        name: req.user.name,
        email: req.user.email,
        role: req.user.role,
        ip: req.ip
      },
      metadata: {
        exportFormat: format,
        recordCount: logs.length,
        filters
      }
    });

    switch (format) {
      case 'csv':
        exportToCSV(logs, res);
        break;
      case 'json':
        exportToJSON(logs, res);
        break;
      case 'pdf':
        await exportToPDF(logs, res);
        break;
      case 'excel':
        await exportToExcel(logs, res);
        break;
      default:
        res.status(400).json({ error: 'Invalid export format' });
    }
  } catch (error) {
    console.error('Error exporting audit logs:', error);
    res.status(500).json({ error: 'Failed to export audit logs' });
  }
});

// Export helper functions
function exportToCSV(logs, res) {
  const fields = [
    'eventId', 'timestamp', 'action', 'category', 
    'actor.name', 'actor.email', 'actor.ip',
    'resource.type', 'resource.name',
    'result.success', 'security.severity', 'security.riskScore'
  ];
  
  const parser = new Parser({ fields });
  const csv = parser.parse(logs);
  
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename=audit_logs.csv');
  res.send(csv);
}

function exportToJSON(logs, res) {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', 'attachment; filename=audit_logs.json');
  res.json(logs);
}

async function exportToPDF(logs, res) {
  const doc = new PDFDocument();
  
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', 'attachment; filename=audit_logs.pdf');
  
  doc.pipe(res);
  
  // Add title
  doc.fontSize(20).text('Audit Log Report', { align: 'center' });
  doc.moveDown();
  doc.fontSize(12).text(`Generated: ${new Date().toISOString()}`, { align: 'center' });
  doc.moveDown(2);
  
  // Add logs
  logs.forEach((log, index) => {
    if (index > 0) doc.addPage();
    
    doc.fontSize(14).text(`Event: ${log.eventId}`, { underline: true });
    doc.fontSize(10);
    doc.text(`Time: ${log.timestamp}`);
    doc.text(`Action: ${log.action}`);
    doc.text(`Actor: ${log.actor.name} (${log.actor.email})`);
    doc.text(`Resource: ${log.resource.type} - ${log.resource.name || log.resource.id}`);
    doc.text(`Success: ${log.result.success ? 'Yes' : 'No'}`);
    doc.text(`Severity: ${log.security.severity}`);
    doc.text(`Risk Score: ${log.security.riskScore}`);
    
    if (log.result.errorMessage) {
      doc.text(`Error: ${log.result.errorMessage}`);
    }
  });
  
  doc.end();
}

async function exportToExcel(logs, res) {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Audit Logs');
  
  // Add headers
  worksheet.columns = [
    { header: 'Event ID', key: 'eventId', width: 20 },
    { header: 'Timestamp', key: 'timestamp', width: 20 },
    { header: 'Action', key: 'action', width: 25 },
    { header: 'Category', key: 'category', width: 20 },
    { header: 'Actor Name', key: 'actorName', width: 20 },
    { header: 'Actor Email', key: 'actorEmail', width: 25 },
    { header: 'Actor IP', key: 'actorIP', width: 15 },
    { header: 'Resource Type', key: 'resourceType', width: 15 },
    { header: 'Resource Name', key: 'resourceName', width: 20 },
    { header: 'Success', key: 'success', width: 10 },
    { header: 'Severity', key: 'severity', width: 10 },
    { header: 'Risk Score', key: 'riskScore', width: 12 },
    { header: 'Error', key: 'error', width: 30 }
  ];
  
  // Add rows
  logs.forEach(log => {
    worksheet.addRow({
      eventId: log.eventId,
      timestamp: log.timestamp,
      action: log.action,
      category: log.category,
      actorName: log.actor.name,
      actorEmail: log.actor.email,
      actorIP: log.actor.ip,
      resourceType: log.resource.type,
      resourceName: log.resource.name || log.resource.id,
      success: log.result.success ? 'Yes' : 'No',
      severity: log.security.severity,
      riskScore: log.security.riskScore,
      error: log.result.errorMessage || ''
    });
  });
  
  // Style the header row
  worksheet.getRow(1).font = { bold: true };
  worksheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFD3D3D3' }
  };
  
  // Auto-filter
  worksheet.autoFilter = {
    from: 'A1',
    to: 'M1'
  };
  
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename=audit_logs.xlsx');
  
  await workbook.xlsx.write(res);
}

module.exports = router;