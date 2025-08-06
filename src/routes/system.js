const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const os = require('os');
const Settings = require('../models/Settings');
const ErrorLog = require('../models/ErrorLog');
const { authenticate } = require('../middleware/auth');
const { enterpriseTenantIsolation } = require('../middleware/enterpriseTenantIsolation');

// System health check
router.get('/health', authenticate, enterpriseTenantIsolation, async (req, res) => {
  try {
    const health = {
      status: 'healthy',
      timestamp: new Date(),
      uptime: process.uptime(),
      services: {},
      system: {},
      issues: []
    };

    // Check MongoDB connection
    try {
      const dbState = mongoose.connection.readyState;
      health.services.database = {
        status: dbState === 1 ? 'connected' : 'disconnected',
        type: 'MongoDB',
        state: ['disconnected', 'connected', 'connecting', 'disconnecting'][dbState]
      };
      
      if (dbState !== 1) {
        health.status = 'degraded';
        health.issues.push({
          service: 'database',
          message: 'Database connection is not stable',
          severity: 'high'
        });
      }
    } catch (error) {
      health.services.database = {
        status: 'error',
        error: error.message
      };
      health.status = 'unhealthy';
    }

    // Check Redis connection (if available)
    try {
      const { cacheManager } = require('../config/redis');
      if (cacheManager && cacheManager.client) {
        const redisPing = await new Promise((resolve) => {
          cacheManager.client.ping((err, result) => {
            resolve(err ? 'error' : 'connected');
          });
        });
        health.services.redis = {
          status: redisPing,
          type: 'Redis Cache'
        };
      } else {
        health.services.redis = {
          status: 'not configured',
          type: 'Redis Cache'
        };
      }
    } catch (error) {
      health.services.redis = {
        status: 'error',
        error: error.message
      };
    }

    // Check email service
    try {
      const settings = await Settings.findOne({ tenantId: req.tenant.tenantId });
      if (settings?.email?.provider && settings.email.provider !== 'disabled') {
        health.services.email = {
          status: 'configured',
          provider: settings.email.provider
        };
      } else {
        health.services.email = {
          status: 'not configured'
        };
        health.issues.push({
          service: 'email',
          message: 'Email service is not configured',
          severity: 'low'
        });
      }
    } catch (error) {
      health.services.email = {
        status: 'error',
        error: error.message
      };
    }

    // Check SMS service
    try {
      const settings = await Settings.findOne({ tenantId: req.tenant.tenantId });
      if (settings?.sms?.provider && settings.sms.provider !== 'disabled') {
        health.services.sms = {
          status: 'configured',
          provider: settings.sms.provider
        };
      } else {
        health.services.sms = {
          status: 'not configured'
        };
        health.issues.push({
          service: 'sms',
          message: 'SMS service is not configured',
          severity: 'low'
        });
      }
    } catch (error) {
      health.services.sms = {
        status: 'error',
        error: error.message
      };
    }

    // Check Socket.io
    const io = global.io;
    health.services.websocket = {
      status: io ? 'running' : 'not running',
      type: 'Socket.io'
    };
    
    if (!io) {
      health.issues.push({
        service: 'websocket',
        message: 'WebSocket service is not running',
        severity: 'medium'
      });
    }

    // System information
    health.system = {
      platform: process.platform,
      nodeVersion: process.version,
      memory: {
        total: Math.round(os.totalmem() / 1024 / 1024) + ' MB',
        free: Math.round(os.freemem() / 1024 / 1024) + ' MB',
        used: Math.round((os.totalmem() - os.freemem()) / 1024 / 1024) + ' MB',
        usagePercent: Math.round(((os.totalmem() - os.freemem()) / os.totalmem()) * 100)
      },
      cpu: {
        cores: os.cpus().length,
        model: os.cpus()[0]?.model,
        loadAverage: os.loadavg()
      },
      process: {
        pid: process.pid,
        memory: {
          rss: Math.round(process.memoryUsage().rss / 1024 / 1024) + ' MB',
          heapTotal: Math.round(process.memoryUsage().heapTotal / 1024 / 1024) + ' MB',
          heapUsed: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + ' MB'
        }
      }
    };

    // Check memory usage
    if (health.system.memory.usagePercent > 90) {
      health.status = 'degraded';
      health.issues.push({
        service: 'system',
        message: 'High memory usage detected',
        severity: 'high',
        value: health.system.memory.usagePercent + '%'
      });
    }

    res.json({
      success: true,
      data: health
    });
  } catch (error) {
    console.error('Health check error:', error);
    res.status(500).json({
      success: false,
      message: 'Health check failed',
      error: error.message
    });
  }
});

// Get error logs
router.get('/errors', authenticate, enterpriseTenantIsolation, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 50,
      type,
      severity,
      status = 'new',
      startDate,
      endDate
    } = req.query;

    const query = { tenantId: req.tenant.tenantId };
    
    if (type) query.type = type;
    if (severity) query.severity = severity;
    if (status) query.status = status;
    
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const errors = await ErrorLog.find(query)
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .populate('resolution.resolvedBy', 'name email');

    const total = await ErrorLog.countDocuments(query);

    res.json({
      success: true,
      data: errors,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / limit),
        total
      }
    });
  } catch (error) {
    console.error('Error fetching error logs:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch error logs',
      error: error.message
    });
  }
});

// Get error statistics
router.get('/errors/stats', authenticate, enterpriseTenantIsolation, async (req, res) => {
  try {
    const { days = 7 } = req.query;
    const stats = await ErrorLog.getStatistics(req.tenant.tenantId, parseInt(days));
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error fetching error statistics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch error statistics',
      error: error.message
    });
  }
});

// Update error status
router.put('/errors/:id/status', authenticate, enterpriseTenantIsolation, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;

    const errorLog = await ErrorLog.findByIdAndUpdate(
      id,
      {
        status,
        ...(status === 'resolved' && {
          'resolution.resolvedBy': req.user._id,
          'resolution.resolvedAt': new Date(),
          'resolution.notes': notes
        })
      },
      { new: true }
    );

    if (!errorLog) {
      return res.status(404).json({
        success: false,
        message: 'Error log not found'
      });
    }

    res.json({
      success: true,
      data: errorLog
    });
  } catch (error) {
    console.error('Error updating error status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update error status',
      error: error.message
    });
  }
});

// Check specific service
router.get('/check/:service', authenticate, enterpriseTenantIsolation, async (req, res) => {
  try {
    const { service } = req.params;
    let result = { service, status: 'unknown', details: {} };

    switch (service) {
      case 'database':
        const collections = await mongoose.connection.db.listCollections().toArray();
        result.status = 'healthy';
        result.details = {
          collections: collections.length,
          connection: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
        };
        break;

      case 'email':
        const emailSettings = await Settings.findOne({ tenantId: req.tenant.tenantId });
        if (emailSettings?.email?.provider && emailSettings.email.provider !== 'disabled') {
          const tenantEmailService = require('../services/tenantEmailService');
          try {
            // Try to get transporter (won't send anything, just checks config)
            await tenantEmailService.getTransporter(req.tenant.tenantId);
            result.status = 'healthy';
            result.details = {
              provider: emailSettings.email.provider,
              configured: true
            };
          } catch (error) {
            result.status = 'unhealthy';
            result.details = {
              provider: emailSettings.email.provider,
              error: error.message
            };
          }
        } else {
          result.status = 'not configured';
        }
        break;

      case 'sms':
        const smsSettings = await Settings.findOne({ tenantId: req.tenant.tenantId });
        if (smsSettings?.sms?.provider && smsSettings.sms.provider !== 'disabled') {
          const tenantSmsService = require('../services/tenantSmsService');
          try {
            await tenantSmsService.getClient(req.tenant.tenantId);
            result.status = 'healthy';
            result.details = {
              provider: smsSettings.sms.provider,
              configured: true
            };
          } catch (error) {
            result.status = 'unhealthy';
            result.details = {
              provider: smsSettings.sms.provider,
              error: error.message
            };
          }
        } else {
          result.status = 'not configured';
        }
        break;

      case 'storage':
        const fs = require('fs').promises;
        const path = require('path');
        const uploadDir = path.join(__dirname, '../../uploads');
        try {
          await fs.access(uploadDir);
          const stats = await fs.stat(uploadDir);
          result.status = 'healthy';
          result.details = {
            path: uploadDir,
            writable: true,
            size: stats.size
          };
        } catch (error) {
          result.status = 'unhealthy';
          result.details = {
            error: error.message
          };
        }
        break;

      default:
        result.status = 'unknown service';
    }

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error(`Error checking service ${req.params.service}:`, error);
    res.status(500).json({
      success: false,
      message: 'Service check failed',
      error: error.message
    });
  }
});

// Clear old error logs
router.delete('/errors/cleanup', authenticate, enterpriseTenantIsolation, async (req, res) => {
  try {
    // Only allow admins to cleanup
    if (req.user.role !== 'admin' && req.user.role !== 'super_admin') {
      return res.status(403).json({
        success: false,
        message: 'Only administrators can cleanup error logs'
      });
    }

    const { days = 30 } = req.query;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - parseInt(days));

    const result = await ErrorLog.deleteMany({
      tenantId: req.tenant.tenantId,
      createdAt: { $lt: cutoffDate },
      status: 'resolved'
    });

    res.json({
      success: true,
      message: `Deleted ${result.deletedCount} resolved error logs older than ${days} days`
    });
  } catch (error) {
    console.error('Error cleaning up error logs:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to cleanup error logs',
      error: error.message
    });
  }
});

// Test error logging
router.post('/test-error', authenticate, enterpriseTenantIsolation, async (req, res) => {
  try {
    // Only allow in development or for admins
    if (process.env.NODE_ENV === 'production' && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Test errors can only be created in development or by admins'
      });
    }

    const { type = 'api', severity = 'low', message = 'Test error' } = req.body;

    const errorLog = await ErrorLog.logError({
      tenantId: req.tenant.tenantId,
      type,
      severity,
      error: {
        message,
        code: 'TEST_ERROR',
        name: 'TestError'
      },
      context: {
        url: req.originalUrl,
        method: req.method,
        ip: req.ip,
        userAgent: req.get('user-agent'),
        userId: req.user._id,
        userName: req.user.name,
        userRole: req.user.role
      },
      metadata: {
        environment: process.env.NODE_ENV || 'development'
      }
    });

    res.json({
      success: true,
      message: 'Test error logged successfully',
      data: errorLog
    });
  } catch (error) {
    console.error('Error creating test error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create test error',
      error: error.message
    });
  }
});

module.exports = router;