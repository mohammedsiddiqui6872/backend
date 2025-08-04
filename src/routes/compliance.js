const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const { ensureTenantIsolation } = require('../middleware/tenantIsolation');
const LegalDocument = require('../models/LegalDocument');
const ConsentRecord = require('../models/ConsentRecord');
const DataRetentionPolicy = require('../models/DataRetentionPolicy');
const AuditLog = require('../models/AuditLog');
const GdprComplianceService = require('../services/gdprCompliance.service');

// Get legal documents (public)
router.get('/legal/:type/:language?', async (req, res) => {
  try {
    const { type, language = 'en' } = req.params;
    const tenantId = req.headers['x-tenant-id'] || req.query.tenantId;
    
    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID required' });
    }
    
    const document = await LegalDocument.getActiveDocument(tenantId, type, language);
    
    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }
    
    res.json({
      id: document._id,
      type: document.type,
      version: document.version,
      title: document.title,
      content: document.content,
      contentHtml: document.contentHtml,
      effectiveDate: document.effectiveDate,
      requiresAcceptance: document.requiresAcceptance
    });
  } catch (error) {
    console.error('Error fetching legal document:', error);
    res.status(500).json({ error: 'Failed to fetch document' });
  }
});

// Record consent (public - for customers)
router.post('/consent', async (req, res) => {
  try {
    const {
      tenantId,
      email,
      customerSessionId,
      consentType,
      status,
      version,
      legalDocumentId
    } = req.body;
    
    const consent = await ConsentRecord.recordConsent({
      tenantId,
      email,
      customerSessionId,
      consentType,
      status,
      version,
      legalDocumentId,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      consentMethod: 'button_click',
      consentContext: {
        page: req.headers.referer,
        action: 'explicit_consent'
      }
    });
    
    res.json({
      success: true,
      consentId: consent._id,
      timestamp: consent.createdAt
    });
  } catch (error) {
    console.error('Error recording consent:', error);
    res.status(500).json({ error: 'Failed to record consent' });
  }
});

// Get user consents
router.get('/consent/user/:identifier', async (req, res) => {
  try {
    const { identifier } = req.params;
    const tenantId = req.headers['x-tenant-id'];
    
    const consents = await ConsentRecord.find({
      tenantId,
      $or: [
        { email: identifier },
        { customerSessionId: identifier }
      ],
      status: 'granted',
      withdrawalDate: null
    }).select('-ipAddress -userAgent');
    
    res.json(consents);
  } catch (error) {
    console.error('Error fetching consents:', error);
    res.status(500).json({ error: 'Failed to fetch consents' });
  }
});

// Withdraw consent
router.post('/consent/withdraw', async (req, res) => {
  try {
    const { consentId, reason } = req.body;
    
    const consent = await ConsentRecord.findById(consentId);
    if (!consent) {
      return res.status(404).json({ error: 'Consent not found' });
    }
    
    await consent.withdraw(reason);
    
    res.json({
      success: true,
      message: 'Consent withdrawn successfully'
    });
  } catch (error) {
    console.error('Error withdrawing consent:', error);
    res.status(500).json({ error: 'Failed to withdraw consent' });
  }
});

// GDPR: Export user data
router.post('/gdpr/export', authenticate, ensureTenantIsolation, async (req, res) => {
  try {
    const { userId, format = 'json' } = req.body;
    const targetUserId = userId || req.user._id;
    
    // Check permissions
    if (userId && userId !== req.user._id.toString()) {
      if (!req.user.permissions.includes('users.manage')) {
        return res.status(403).json({ error: 'Permission denied' });
      }
    }
    
    const exportData = await GdprComplianceService.exportUserData(
      req.tenant.tenantId,
      targetUserId,
      format
    );
    
    // Set appropriate headers
    res.setHeader('Content-Type', format === 'json' ? 'application/json' : 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${exportData.filename}"`);
    
    res.send(exportData.data);
  } catch (error) {
    console.error('Error exporting user data:', error);
    res.status(500).json({ error: 'Failed to export data' });
  }
});

// GDPR: Delete user data (right to be forgotten)
router.delete('/gdpr/user/:userId', authenticate, authorize(['admin']), ensureTenantIsolation, async (req, res) => {
  try {
    const { userId } = req.params;
    const { reason } = req.body;
    
    if (!reason) {
      return res.status(400).json({ error: 'Deletion reason required' });
    }
    
    const result = await GdprComplianceService.deleteUserData(
      req.tenant.tenantId,
      userId,
      reason,
      req.user._id
    );
    
    res.json(result);
  } catch (error) {
    console.error('Error deleting user data:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get compliance report
router.get('/gdpr/report', authenticate, authorize(['admin']), ensureTenantIsolation, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    const report = await GdprComplianceService.generateComplianceReport(
      req.tenant.tenantId,
      new Date(startDate),
      new Date(endDate)
    );
    
    res.json(report);
  } catch (error) {
    console.error('Error generating compliance report:', error);
    res.status(500).json({ error: 'Failed to generate report' });
  }
});

// Admin: Manage legal documents
router.post('/admin/legal', authenticate, authorize(['admin']), ensureTenantIsolation, async (req, res) => {
  try {
    const document = new LegalDocument({
      ...req.body,
      tenantId: req.tenant.tenantId
    });
    
    await document.save();
    await document.archive(); // Archive old versions
    
    res.status(201).json(document);
  } catch (error) {
    console.error('Error creating legal document:', error);
    res.status(500).json({ error: 'Failed to create document' });
  }
});

// Admin: Get all legal documents
router.get('/admin/legal', authenticate, authorize(['admin']), ensureTenantIsolation, async (req, res) => {
  try {
    const documents = await LegalDocument.find({
      tenantId: req.tenant.tenantId
    }).sort({ type: 1, version: -1 });
    
    res.json(documents);
  } catch (error) {
    console.error('Error fetching legal documents:', error);
    res.status(500).json({ error: 'Failed to fetch documents' });
  }
});

// Admin: Manage retention policies
router.post('/admin/retention-policy', authenticate, authorize(['admin']), ensureTenantIsolation, async (req, res) => {
  try {
    const policy = new DataRetentionPolicy({
      ...req.body,
      tenantId: req.tenant.tenantId
    });
    
    await policy.save();
    res.status(201).json(policy);
  } catch (error) {
    console.error('Error creating retention policy:', error);
    res.status(500).json({ error: 'Failed to create policy' });
  }
});

// Admin: Get retention policies
router.get('/admin/retention-policy', authenticate, authorize(['admin']), ensureTenantIsolation, async (req, res) => {
  try {
    const policies = await DataRetentionPolicy.find({
      tenantId: req.tenant.tenantId,
      isActive: true
    });
    
    res.json(policies);
  } catch (error) {
    console.error('Error fetching retention policies:', error);
    res.status(500).json({ error: 'Failed to fetch policies' });
  }
});

// Admin: Apply retention policies manually
router.post('/admin/retention-policy/apply', authenticate, authorize(['admin']), ensureTenantIsolation, async (req, res) => {
  try {
    const results = await GdprComplianceService.checkDataRetention(req.tenant.tenantId);
    res.json({ success: true, results });
  } catch (error) {
    console.error('Error applying retention policies:', error);
    res.status(500).json({ error: 'Failed to apply policies' });
  }
});

// Get audit logs
router.get('/audit-logs', authenticate, authorize(['admin', 'manager']), ensureTenantIsolation, async (req, res) => {
  try {
    const {
      category,
      userId,
      startDate,
      endDate,
      page = 1,
      limit = 50
    } = req.query;
    
    const query = { tenantId: req.tenant.tenantId };
    
    if (category) query.category = category;
    if (userId) query.userId = userId;
    if (startDate || endDate) {
      query.timestamp = {};
      if (startDate) query.timestamp.$gte = new Date(startDate);
      if (endDate) query.timestamp.$lte = new Date(endDate);
    }
    
    const total = await AuditLog.countDocuments(query);
    const logs = await AuditLog.find(query)
      .sort({ timestamp: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .populate('userId', 'name email');
    
    res.json({
      logs,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    res.status(500).json({ error: 'Failed to fetch logs' });
  }
});

// Get GDPR-specific audit logs
router.get('/audit-logs/gdpr', authenticate, authorize(['admin']), ensureTenantIsolation, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    const logs = await AuditLog.getGdprLogs(
      req.tenant.tenantId,
      new Date(startDate),
      new Date(endDate)
    );
    
    res.json(logs);
  } catch (error) {
    console.error('Error fetching GDPR logs:', error);
    res.status(500).json({ error: 'Failed to fetch logs' });
  }
});

// Data Processing Agreements (DPA) Routes
const DataProcessingAgreement = require('../models/DataProcessingAgreement');

// Get all DPAs
router.get('/admin/dpa', authenticate, authorize(['admin']), ensureTenantIsolation, async (req, res) => {
  try {
    const { status, processorType } = req.query;
    const query = { tenantId: req.tenant.tenantId };
    
    if (status) query.status = status;
    if (processorType) query.processorType = processorType;
    
    const dpas = await DataProcessingAgreement.find(query).sort('-createdAt');
    res.json(dpas);
  } catch (error) {
    console.error('Error fetching DPAs:', error);
    res.status(500).json({ error: 'Failed to fetch DPAs' });
  }
});

// Create new DPA
router.post('/admin/dpa', authenticate, authorize(['admin']), ensureTenantIsolation, async (req, res) => {
  try {
    const dpa = new DataProcessingAgreement({
      ...req.body,
      tenantId: req.tenant.tenantId
    });
    
    await dpa.save();
    
    // Log DPA creation
    await AuditLog.logAction({
      tenantId: req.tenant.tenantId,
      userId: req.user.id,
      action: 'dpa_created',
      category: 'compliance',
      details: {
        dpaId: dpa._id,
        processorName: dpa.processorName,
        processorType: dpa.processorType
      },
      risk: { level: 'medium', factors: ['legal_agreement'] }
    });
    
    res.json(dpa);
  } catch (error) {
    console.error('Error creating DPA:', error);
    res.status(500).json({ error: 'Failed to create DPA' });
  }
});

// Update DPA
router.put('/admin/dpa/:id', authenticate, authorize(['admin']), ensureTenantIsolation, async (req, res) => {
  try {
    const dpa = await DataProcessingAgreement.findOneAndUpdate(
      { _id: req.params.id, tenantId: req.tenant.tenantId },
      req.body,
      { new: true }
    );
    
    if (!dpa) {
      return res.status(404).json({ error: 'DPA not found' });
    }
    
    // Log update
    await AuditLog.logAction({
      tenantId: req.tenant.tenantId,
      userId: req.user.id,
      action: 'dpa_updated',
      category: 'compliance',
      details: {
        dpaId: dpa._id,
        changes: req.body
      },
      risk: { level: 'low', factors: ['data_update'] }
    });
    
    res.json(dpa);
  } catch (error) {
    console.error('Error updating DPA:', error);
    res.status(500).json({ error: 'Failed to update DPA' });
  }
});

// Terminate DPA
router.post('/admin/dpa/:id/terminate', authenticate, authorize(['admin']), ensureTenantIsolation, async (req, res) => {
  try {
    const { reason } = req.body;
    
    const dpa = await DataProcessingAgreement.findOne({
      _id: req.params.id,
      tenantId: req.tenant.tenantId
    });
    
    if (!dpa) {
      return res.status(404).json({ error: 'DPA not found' });
    }
    
    await dpa.terminate(reason);
    
    // Log termination
    await AuditLog.logAction({
      tenantId: req.tenant.tenantId,
      userId: req.user.id,
      action: 'dpa_terminated',
      category: 'compliance',
      details: {
        dpaId: dpa._id,
        processorName: dpa.processorName,
        reason
      },
      risk: { level: 'high', factors: ['contract_termination', 'legal_impact'] }
    });
    
    res.json({ message: 'DPA terminated successfully', dpa });
  } catch (error) {
    console.error('Error terminating DPA:', error);
    res.status(500).json({ error: 'Failed to terminate DPA' });
  }
});

// Get DPAs needing review
router.get('/admin/dpa/review-needed', authenticate, authorize(['admin']), ensureTenantIsolation, async (req, res) => {
  try {
    const dpas = await DataProcessingAgreement.find({
      tenantId: req.tenant.tenantId,
      status: 'active'
    });
    
    const needingReview = dpas.filter(dpa => dpa.needsReview());
    res.json(needingReview);
  } catch (error) {
    console.error('Error fetching DPAs needing review:', error);
    res.status(500).json({ error: 'Failed to fetch DPAs' });
  }
});

// Get expiring DPAs
router.get('/admin/dpa/expiring', authenticate, authorize(['admin']), ensureTenantIsolation, async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const dpas = await DataProcessingAgreement.findExpiring(parseInt(days));
    
    const tenantDpas = dpas.filter(dpa => dpa.tenantId === req.tenant.tenantId);
    res.json(tenantDpas);
  } catch (error) {
    console.error('Error fetching expiring DPAs:', error);
    res.status(500).json({ error: 'Failed to fetch expiring DPAs' });
  }
});

module.exports = router;