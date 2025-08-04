const { RateLimiterRedis, RateLimiterMemory, RateLimiterCluster } = require('rate-limiter-flexible');
const slowDown = require('express-slow-down');
const rateLimit = require('express-rate-limit');

/**
 * Advanced Rate Limiting System
 * Provides comprehensive rate limiting with Redis support, tenant isolation, and adaptive limits
 */

class AdvancedRateLimiter {
  constructor() {
    this.limiters = new Map();
    this.redisClient = null;
    this.isRedisAvailable = false;
    
    this.initializeRedis();
  }

  /**
   * Initialize Redis connection for distributed rate limiting
   */
  async initializeRedis() {
    try {
      if (process.env.REDIS_URL) {
        const Redis = require('ioredis');
        this.redisClient = new Redis(process.env.REDIS_URL, {
          enableOfflineQueue: false,
          maxRetriesPerRequest: 1,
          lazyConnect: true
        });

        await this.redisClient.connect();
        this.isRedisAvailable = true;
        console.log('Rate limiter connected to Redis');
      }
    } catch (error) {
      console.warn('Redis not available for rate limiting, falling back to memory:', error.message);
      this.isRedisAvailable = false;
    }
  }

  /**
   * Create rate limiter instance
   */
  createLimiter(options) {
    const {
      keyPrefix = 'rl',
      points = 100,
      duration = 60,
      blockDuration = 60,
      execEvenly = false
    } = options;

    if (this.isRedisAvailable && this.redisClient) {
      return new RateLimiterRedis({
        storeClient: this.redisClient,
        keyPrefix,
        points,
        duration,
        blockDuration,
        execEvenly
      });
    } else {
      return new RateLimiterMemory({
        keyPrefix,
        points,
        duration,
        blockDuration,
        execEvenly
      });
    }
  }

  /**
   * Get or create rate limiter for specific configuration
   */
  getLimiter(key, options) {
    if (!this.limiters.has(key)) {
      this.limiters.set(key, this.createLimiter(options));
    }
    return this.limiters.get(key);
  }

  /**
   * Tenant-aware rate limiting
   */
  createTenantRateLimiter(options = {}) {
    const {
      keyPrefix = 'tenant',
      points = 1000,        // Requests per window
      duration = 3600,      // 1 hour
      blockDuration = 3600, // Block for 1 hour
      skipSuccessfulRequests = false,
      skipFailedRequests = false
    } = options;

    return async (req, res, next) => {
      try {
        const tenantId = req.tenant?.tenantId || req.tenantId || 'anonymous';
        const limiterKey = `${keyPrefix}_${tenantId}`;
        
        const limiter = this.getLimiter(limiterKey, {
          keyPrefix: limiterKey,
          points,
          duration,
          blockDuration
        });

        const key = `${tenantId}:${req.ip}`;
        const resRateLimiter = await limiter.consume(key);

        // Add rate limit headers
        res.set({
          'X-RateLimit-Limit': points,
          'X-RateLimit-Remaining': resRateLimiter.remainingPoints,
          'X-RateLimit-Reset': new Date(Date.now() + resRateLimiter.msBeforeNext).toISOString()
        });

        next();
      } catch (rateLimiterRes) {
        if (rateLimiterRes.remainingPoints !== undefined) {
          // Rate limited
          res.set({
            'X-RateLimit-Limit': points,
            'X-RateLimit-Remaining': rateLimiterRes.remainingPoints,
            'X-RateLimit-Reset': new Date(Date.now() + rateLimiterRes.msBeforeNext).toISOString(),
            'Retry-After': Math.round(rateLimiterRes.msBeforeNext / 1000)
          });

          return res.status(429).json({
            error: 'Too many requests',
            message: `Rate limit exceeded for tenant. Try again in ${Math.round(rateLimiterRes.msBeforeNext / 1000)} seconds`,
            retryAfter: Math.round(rateLimiterRes.msBeforeNext / 1000)
          });
        } else {
          // Error occurred
          console.error('Rate limiter error:', rateLimiterRes);
          next(); // Continue on error to not block legitimate requests
        }
      }
    };
  }

  /**
   * API endpoint specific rate limiting
   */
  createEndpointRateLimiter(endpoint, options = {}) {
    const defaultOptions = {
      login: { points: 5, duration: 900, blockDuration: 900 }, // 5 attempts per 15 minutes
      register: { points: 3, duration: 3600, blockDuration: 3600 }, // 3 attempts per hour
      order: { points: 100, duration: 3600, blockDuration: 300 }, // 100 orders per hour
      upload: { points: 20, duration: 3600, blockDuration: 1800 }, // 20 uploads per hour
      admin: { points: 200, duration: 3600, blockDuration: 600 }, // 200 admin actions per hour
      analytics: { points: 50, duration: 3600, blockDuration: 300 }, // 50 analytics requests per hour
      public: { points: 1000, duration: 3600, blockDuration: 60 } // 1000 public requests per hour
    };

    const config = { ...defaultOptions[endpoint], ...options };
    
    return this.createTenantRateLimiter({
      keyPrefix: `endpoint_${endpoint}`,
      ...config
    });
  }

  /**
   * Adaptive rate limiting based on system load
   */
  createAdaptiveRateLimiter(baseOptions = {}) {
    let currentMultiplier = 1;
    
    return async (req, res, next) => {
      try {
        // Simple load-based adaptation (can be enhanced with CPU/memory monitoring)
        const activeConnections = req.socket.server._connections || 0;
        const maxConnections = req.socket.server.maxConnections || 1000;
        const loadRatio = activeConnections / maxConnections;

        // Adjust rate limits based on load
        if (loadRatio > 0.8) {
          currentMultiplier = 0.5; // Reduce limits by 50% under high load
        } else if (loadRatio > 0.6) {
          currentMultiplier = 0.75; // Reduce limits by 25% under medium load
        } else {
          currentMultiplier = 1; // Normal limits
        }

        const adaptedOptions = {
          ...baseOptions,
          points: Math.floor((baseOptions.points || 100) * currentMultiplier)
        };

        const limiter = this.createTenantRateLimiter(adaptedOptions);
        return limiter(req, res, next);
      } catch (error) {
        console.error('Adaptive rate limiter error:', error);
        next(); // Continue on error
      }
    };
  }

  /**
   * Slowdown middleware for gradual response delay
   */
  createSlowDown(options = {}) {
    const {
      windowMs = 15 * 60 * 1000, // 15 minutes
      delayAfter = 100, // Start slowing down after 100 requests
      delayMs = 500, // Delay by 500ms
      maxDelayMs = 20000, // Maximum delay of 20 seconds
      skipFailedRequests = false,
      skipSuccessfulRequests = false
    } = options;

    return slowDown({
      windowMs,
      delayAfter,
      delayMs,
      maxDelayMs,
      skipFailedRequests,
      skipSuccessfulRequests,
      keyGenerator: (req) => {
        const tenantId = req.tenant?.tenantId || req.tenantId || 'anonymous';
        return `${tenantId}:${req.ip}`;
      },
      onLimitReached: (req, res, options) => {
        console.warn(`Slowdown limit reached for tenant ${req.tenant?.tenantId || 'anonymous'} from IP ${req.ip}`);
      }
    });
  }

  /**
   * Create comprehensive rate limiting stack
   */
  createSecurityStack(endpoint = 'default', options = {}) {
    const {
      enableSlowDown = true,
      enableAdaptive = false,
      customLimits = {}
    } = options;

    const middlewares = [];

    // Add slowdown if enabled
    if (enableSlowDown) {
      middlewares.push(this.createSlowDown());
    }

    // Add adaptive or standard rate limiting
    if (enableAdaptive) {
      middlewares.push(this.createAdaptiveRateLimiter(customLimits));
    } else {
      middlewares.push(this.createEndpointRateLimiter(endpoint, customLimits));
    }

    return middlewares;
  }

  /**
   * Create burst protection (short-term high-frequency request protection)
   */
  createBurstProtection(options = {}) {
    const {
      points = 20,          // 20 requests
      duration = 1,         // per 1 second
      blockDuration = 10    // block for 10 seconds
    } = options;

    return this.createTenantRateLimiter({
      keyPrefix: 'burst',
      points,
      duration,
      blockDuration
    });
  }

  /**
   * IP-based rate limiting (for additional protection)
   */
  createIPRateLimiter(options = {}) {
    const {
      points = 2000,        // Higher limit for IP-based limiting
      duration = 3600,      // 1 hour
      blockDuration = 1800  // Block for 30 minutes
    } = options;

    return async (req, res, next) => {
      try {
        const limiter = this.getLimiter('ip_limit', {
          keyPrefix: 'ip',
          points,
          duration,
          blockDuration
        });

        const key = req.ip;
        const resRateLimiter = await limiter.consume(key);

        res.set({
          'X-IP-RateLimit-Limit': points,
          'X-IP-RateLimit-Remaining': resRateLimiter.remainingPoints,
          'X-IP-RateLimit-Reset': new Date(Date.now() + resRateLimiter.msBeforeNext).toISOString()
        });

        next();
      } catch (rateLimiterRes) {
        if (rateLimiterRes.remainingPoints !== undefined) {
          res.set({
            'X-IP-RateLimit-Limit': points,
            'X-IP-RateLimit-Remaining': rateLimiterRes.remainingPoints,
            'X-IP-RateLimit-Reset': new Date(Date.now() + rateLimiterRes.msBeforeNext).toISOString(),
            'Retry-After': Math.round(rateLimiterRes.msBeforeNext / 1000)
          });

          return res.status(429).json({
            error: 'Too many requests from this IP',
            message: `IP rate limit exceeded. Try again in ${Math.round(rateLimiterRes.msBeforeNext / 1000)} seconds`,
            retryAfter: Math.round(rateLimiterRes.msBeforeNext / 1000)
          });
        } else {
          console.error('IP rate limiter error:', rateLimiterRes);
          next();
        }
      }
    };
  }

  /**
   * Cleanup resources
   */
  async cleanup() {
    if (this.redisClient) {
      await this.redisClient.quit();
    }
    this.limiters.clear();
  }
}

// Create singleton instance
const advancedRateLimiter = new AdvancedRateLimiter();

// Graceful shutdown cleanup
process.on('SIGTERM', async () => {
  await advancedRateLimiter.cleanup();
});

process.on('SIGINT', async () => {
  await advancedRateLimiter.cleanup();
});

module.exports = {
  AdvancedRateLimiter,
  advancedRateLimiter
};