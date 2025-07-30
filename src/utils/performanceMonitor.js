// src/utils/performanceMonitor.js
const logger = require('../config/logger');

class PerformanceMonitor {
  constructor() {
    this.metrics = {
      requests: new Map(),
      database: new Map(),
      memory: []
    };
    
    // Start monitoring
    this.startMemoryMonitoring();
  }

  startMemoryMonitoring() {
    setInterval(() => {
      const usage = process.memoryUsage();
      this.metrics.memory.push({
        timestamp: new Date(),
        heapUsed: usage.heapUsed,
        heapTotal: usage.heapTotal,
        rss: usage.rss,
        external: usage.external
      });

      // Keep only last hour of data
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      this.metrics.memory = this.metrics.memory.filter(m => m.timestamp > oneHourAgo);

      // Log if memory usage is high
      const heapPercentage = (usage.heapUsed / usage.heapTotal) * 100;
      if (heapPercentage > 90) {
        logger.warn(`High memory usage: ${heapPercentage.toFixed(2)}% of heap used`);
      }
    }, 60000); // Every minute
  }

  requestStart(requestId) {
    this.metrics.requests.set(requestId, {
      start: Date.now(),
      path: null,
      method: null
    });
  }

  requestEnd(requestId, req, res) {
    const request = this.metrics.requests.get(requestId);
    if (request) {
      const duration = Date.now() - request.start;
      
      // Log slow requests
      if (duration > 1000) {
        logger.warn(`Slow request: ${req.method} ${req.path} took ${duration}ms`);
      }

      // Update metrics
      const key = `${req.method} ${req.path}`;
      if (!this.metrics.requests.has(key)) {
        this.metrics.requests.set(key, {
          count: 0,
          totalDuration: 0,
          avgDuration: 0,
          maxDuration: 0
        });
      }

      const metric = this.metrics.requests.get(key);
      metric.count++;
      metric.totalDuration += duration;
      metric.avgDuration = metric.totalDuration / metric.count;
      metric.maxDuration = Math.max(metric.maxDuration, duration);

      this.metrics.requests.delete(requestId);
    }
  }

  dbQueryStart(queryId, operation) {
    this.metrics.database.set(queryId, {
      start: Date.now(),
      operation
    });
  }

  dbQueryEnd(queryId) {
    const query = this.metrics.database.get(queryId);
    if (query) {
      const duration = Date.now() - query.start;
      
      // Log slow queries
      if (duration > 100) {
        logger.warn(`Slow database query: ${query.operation} took ${duration}ms`);
      }

      this.metrics.database.delete(queryId);
    }
  }

  getMetrics() {
    const requestMetrics = {};
    this.metrics.requests.forEach((value, key) => {
      if (typeof key === 'string') {
        requestMetrics[key] = value;
      }
    });

    return {
      memory: this.metrics.memory[this.metrics.memory.length - 1] || {},
      requests: requestMetrics,
      uptime: process.uptime(),
      timestamp: new Date()
    };
  }

  middleware() {
    return (req, res, next) => {
      const requestId = `${Date.now()}-${Math.random()}`;
      this.requestStart(requestId);
      
      res.on('finish', () => {
        this.requestEnd(requestId, req, res);
      });

      next();
    };
  }
}

module.exports = new PerformanceMonitor();