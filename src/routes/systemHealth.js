const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { cacheManager } = require('../config/redis');
const { databaseManager } = require('../config/database');
const { optimizedAnalyticsService } = require('../services/optimizedAnalyticsService');

/**
 * System Health and Monitoring Endpoints
 * Provides comprehensive system status information
 */

// Basic health check - no authentication required
router.get('/health', async (req, res) => {
  try {
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '2.0.0',
      environment: process.env.NODE_ENV || 'development',
      uptime: Math.floor(process.uptime()),
      services: {
        database: 'unknown',
        cache: 'unknown'
      }
    };

    // Quick database check
    try {
      await mongoose.connection.db.admin().ping();
      health.services.database = 'healthy';
    } catch (error) {
      health.services.database = 'unhealthy';
      health.status = 'degraded';
    }

    // Quick cache check
    try {
      const cacheHealth = await cacheManager.healthCheck();
      health.services.cache = cacheHealth.redis ? 'healthy' : 'fallback';
    } catch (error) {
      health.services.cache = 'unhealthy';
    }

    const statusCode = health.status === 'healthy' ? 200 : 503;
    res.status(statusCode).json(health);
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: 'Health check failed',
      message: error.message
    });
  }
});

// Detailed health check - requires authentication
router.get('/health/detailed', async (req, res) => {
  try {
    const detailedHealth = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '2.0.0',
      environment: process.env.NODE_ENV || 'development',
      uptime: Math.floor(process.uptime()),
      system: {
        memory: process.memoryUsage(),
        cpu: process.cpuUsage(),
        platform: process.platform,
        nodeVersion: process.version
      },
      services: {},
      performance: {},
      errors: []
    };

    // Database health check
    try {
      const dbHealth = databaseManager.getHealthStatus();
      const dbStats = await databaseManager.getStats();
      
      detailedHealth.services.database = {
        status: dbHealth.isConnected ? 'healthy' : 'unhealthy',
        readyState: dbHealth.readyState,
        host: dbHealth.host,
        database: dbHealth.database,
        stats: dbStats,
        connectionRetries: dbHealth.connectionRetries
      };
    } catch (error) {
      detailedHealth.services.database = {
        status: 'unhealthy',
        error: error.message
      };
      detailedHealth.errors.push(`Database: ${error.message}`);
    }

    // Cache health check
    try {
      const cacheHealth = await cacheManager.healthCheck();
      const cacheStats = await cacheManager.getStats();
      
      detailedHealth.services.cache = {
        status: cacheHealth.redis ? 'healthy' : 'fallback',
        redis: cacheHealth.redis,
        memoryCache: cacheHealth.memoryCache,
        stats: cacheStats
      };
    } catch (error) {
      detailedHealth.services.cache = {
        status: 'unhealthy',
        error: error.message
      };
      detailedHealth.errors.push(`Cache: ${error.message}`);
    }

    // Performance metrics
    try {
      const startTime = Date.now();
      
      // Test database query performance
      await mongoose.connection.db.admin().ping();
      const dbResponseTime = Date.now() - startTime;
      
      // Test cache performance
      const cacheStartTime = Date.now();
      await cacheManager.get('health-check-test');
      const cacheResponseTime = Date.now() - cacheStartTime;
      
      detailedHealth.performance = {
        databaseResponseTime: `${dbResponseTime}ms`,
        cacheResponseTime: `${cacheResponseTime}ms`
      };
    } catch (error) {
      detailedHealth.errors.push(`Performance test: ${error.message}`);
    }

    // Set overall status
    if (detailedHealth.errors.length > 0) {
      detailedHealth.status = detailedHealth.errors.length > 2 ? 'unhealthy' : 'degraded';
    }

    const statusCode = detailedHealth.status === 'healthy' ? 200 : 503;
    res.status(statusCode).json(detailedHealth);
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: 'Detailed health check failed',
      message: error.message
    });
  }
});

// System metrics endpoint
router.get('/metrics', async (req, res) => {
  try {
    const metrics = {
      timestamp: new Date().toISOString(),
      system: {
        uptime: Math.floor(process.uptime()),
        memory: {
          ...process.memoryUsage(),
          free: require('os').freemem(),
          total: require('os').totalmem()
        },
        cpu: {
          usage: process.cpuUsage(),
          loadAverage: require('os').loadavg(),
          cores: require('os').cpus().length
        },
        platform: {
          type: require('os').type(),
          release: require('os').release(),
          arch: require('os').arch(),
          hostname: require('os').hostname()
        }
      },
      database: {
        connections: mongoose.connection.readyState,
        collections: 0,
        indexes: 0
      },
      cache: {
        memory: 0,
        redis: false
      },
      api: {
        version: process.env.npm_package_version || '2.0.0',
        environment: process.env.NODE_ENV || 'development'
      }
    };

    // Get database metrics
    try {
      const db = mongoose.connection.db;
      const stats = await db.stats();
      const collections = await db.listCollections().toArray();
      
      metrics.database = {
        ...metrics.database,
        collections: collections.length,
        dataSize: stats.dataSize,
        storageSize: stats.storageSize,
        indexes: stats.indexes,
        indexSize: stats.indexSize,
        objects: stats.objects
      };
    } catch (error) {
      metrics.database.error = error.message;
    }

    // Get cache metrics
    try {
      const cacheStats = await cacheManager.getStats();
      metrics.cache = cacheStats;
    } catch (error) {
      metrics.cache.error = error.message;
    }

    res.json(metrics);
  } catch (error) {
    res.status(500).json({
      error: 'Failed to collect metrics',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Database status endpoint
router.get('/database/status', async (req, res) => {
  try {
    const dbStatus = {
      timestamp: new Date().toISOString(),
      connection: databaseManager.getHealthStatus(),
      stats: await databaseManager.getStats(),
      collections: [],
      indexes: []
    };

    // Get collection information
    const db = mongoose.connection.db;
    const collections = await db.listCollections().toArray();
    
    for (const col of collections) {
      const collection = db.collection(col.name);
      const stats = await collection.stats().catch(() => ({}));
      const indexes = await collection.indexes().catch(() => []);
      
      dbStatus.collections.push({
        name: col.name,
        count: stats.count || 0,
        size: stats.size || 0,
        indexes: indexes.length
      });
    }

    res.json(dbStatus);
  } catch (error) {
    res.status(500).json({
      error: 'Failed to get database status',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Cache status endpoint
router.get('/cache/status', async (req, res) => {
  try {
    const cacheStatus = {
      timestamp: new Date().toISOString(),
      health: await cacheManager.healthCheck(),
      stats: await cacheManager.getStats()
    };

    res.json(cacheStatus);
  } catch (error) {
    res.status(500).json({
      error: 'Failed to get cache status',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Performance test endpoint
router.get('/performance/test', async (req, res) => {
  try {
    const results = {
      timestamp: new Date().toISOString(),
      tests: {}
    };

    // Database performance test
    const dbStartTime = Date.now();
    await mongoose.connection.db.admin().ping();
    results.tests.database = {
      responseTime: Date.now() - dbStartTime,
      status: 'success'
    };

    // Cache performance test
    const cacheStartTime = Date.now();
    const testKey = `perf-test-${Date.now()}`;
    const testValue = { test: true, timestamp: new Date() };
    
    await cacheManager.set(testKey, testValue, 60);
    await cacheManager.get(testKey);
    await cacheManager.del(testKey);
    
    results.tests.cache = {
      responseTime: Date.now() - cacheStartTime,
      status: 'success'
    };

    // Memory test
    const memBefore = process.memoryUsage();
    const testData = new Array(10000).fill(0).map((_, i) => ({ id: i, data: `test-${i}` }));
    const memAfter = process.memoryUsage();
    
    results.tests.memory = {
      before: memBefore,
      after: memAfter,
      difference: {
        heapUsed: memAfter.heapUsed - memBefore.heapUsed,
        heapTotal: memAfter.heapTotal - memBefore.heapTotal
      },
      testDataSize: testData.length
    };

    res.json(results);
  } catch (error) {
    res.status(500).json({
      error: 'Performance test failed',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Clear cache endpoint (useful for maintenance)
router.post('/cache/clear', async (req, res) => {
  try {
    const { pattern, tenantId } = req.body;
    
    if (pattern) {
      await cacheManager.clearByPattern(pattern, tenantId);
    } else if (tenantId) {
      await cacheManager.clearTenantCache(tenantId);
    } else {
      return res.status(400).json({
        error: 'Pattern or tenantId required'
      });
    }

    res.json({
      success: true,
      message: 'Cache cleared',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to clear cache',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// System configuration endpoint
router.get('/config', async (req, res) => {
  try {
    const config = {
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      version: process.env.npm_package_version || '2.0.0',
      features: {
        redis: !!process.env.REDIS_URL,
        mongodb: !!process.env.MONGODB_URI,
        cloudinary: !!(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY),
        email: !!(process.env.SMTP_HOST && process.env.SMTP_USER),
        sms: !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN),
        stripe: !!(process.env.STRIPE_SECRET_KEY),
        firebase: !!(process.env.FIREBASE_PROJECT_ID)
      },
      limits: {
        maxFileSize: {
          profile: process.env.MAX_FILE_SIZE_PROFILE || '2MB',
          menu: process.env.MAX_FILE_SIZE_MENU || '5MB',
          documents: process.env.MAX_FILE_SIZE_DOCUMENTS || '10MB'
        },
        rateLimits: {
          window: process.env.RATE_LIMIT_WINDOW_MS || '900000',
          maxRequests: process.env.RATE_LIMIT_MAX_REQUESTS || '500'
        }
      },
      database: {
        poolSize: process.env.DB_MAX_POOL_SIZE || '10',
        readPreference: process.env.DB_READ_PREFERENCE || 'primary',
        writeConcern: process.env.DB_WRITE_CONCERN || 'majority'
      }
    };

    res.json(config);
  } catch (error) {
    res.status(500).json({
      error: 'Failed to get configuration',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

module.exports = router;