const Redis = require('ioredis');
const NodeCache = require('node-cache');

/**
 * Redis Configuration and Caching Manager
 * Provides distributed caching with fallback to in-memory cache
 */

class CacheManager {
  constructor() {
    this.redisClient = null;
    this.redisSubscriber = null;
    this.redisPublisher = null;
    this.isRedisAvailable = false;
    this.memoryCache = new NodeCache({
      stdTTL: 600, // 10 minutes default TTL
      checkperiod: 120, // Check for expired keys every 2 minutes
      useClones: false, // For better performance
      deleteOnExpire: true,
      maxKeys: 1000 // Limit memory cache size
    });
    
    this.initializeRedis();
  }

  /**
   * Initialize Redis connections
   */
  async initializeRedis() {
    try {
      if (!process.env.REDIS_URL) {
        console.log('Redis URL not configured, using memory cache only');
        return;
      }

      const redisConfig = {
        enableOfflineQueue: false,
        maxRetriesPerRequest: 3,
        retryDelayOnFailover: 100,
        lazyConnect: true,
        keepAlive: 30000,
        connectTimeout: 10000,
        commandTimeout: 5000,
        db: parseInt(process.env.REDIS_DB) || 0,
        keyPrefix: process.env.REDIS_KEY_PREFIX || 'grit:',
        family: 4 // Force IPv4
      };

      // Main Redis client for general operations
      this.redisClient = new Redis(process.env.REDIS_URL, {
        ...redisConfig,
        enableReadyCheck: true,
        maxRetriesPerRequest: 3
      });

      // Publisher for pub/sub operations
      this.redisPublisher = new Redis(process.env.REDIS_URL, {
        ...redisConfig,
        enableReadyCheck: true
      });

      // Subscriber for pub/sub operations
      this.redisSubscriber = new Redis(process.env.REDIS_URL, {
        ...redisConfig,
        enableReadyCheck: true
      });

      // Set up event handlers
      this.setupRedisEventHandlers();

      // Test connection
      await this.redisClient.ping();
      this.isRedisAvailable = true;
      
      console.log('Redis connected successfully');
      console.log(`Redis DB: ${redisConfig.db}`);
      console.log(`Redis Key Prefix: ${redisConfig.keyPrefix}`);

    } catch (error) {
      console.warn('Redis connection failed, falling back to memory cache:', error.message);
      this.isRedisAvailable = false;
      this.redisClient = null;
      this.redisPublisher = null;
      this.redisSubscriber = null;
    }
  }

  /**
   * Set up Redis event handlers
   */
  setupRedisEventHandlers() {
    if (!this.redisClient) return;

    this.redisClient.on('connect', () => {
      console.log('Redis client connected');
      this.isRedisAvailable = true;
    });

    this.redisClient.on('ready', () => {
      console.log('Redis client ready');
      this.isRedisAvailable = true;
    });

    this.redisClient.on('error', (error) => {
      console.error('Redis client error:', error);
      this.isRedisAvailable = false;
    });

    this.redisClient.on('close', () => {
      console.log('Redis client connection closed');
      this.isRedisAvailable = false;
    });

    this.redisClient.on('reconnecting', () => {
      console.log('Redis client reconnecting...');
    });
  }

  /**
   * Get cache key with tenant isolation
   */
  getCacheKey(key, tenantId = null) {
    if (tenantId) {
      return `tenant:${tenantId}:${key}`;
    }
    return key;
  }

  /**
   * Set cache value with TTL
   */
  async set(key, value, ttl = 600, tenantId = null) {
    const cacheKey = this.getCacheKey(key, tenantId);
    
    try {
      if (this.isRedisAvailable && this.redisClient) {
        const serializedValue = JSON.stringify(value);
        if (ttl > 0) {
          await this.redisClient.setex(cacheKey, ttl, serializedValue);
        } else {
          await this.redisClient.set(cacheKey, serializedValue);
        }
        return true;
      } else {
        // Fallback to memory cache
        this.memoryCache.set(cacheKey, value, ttl);
        return true;
      }
    } catch (error) {
      console.error('Cache set error:', error);
      // Fallback to memory cache on Redis error
      this.memoryCache.set(cacheKey, value, ttl);
      return false;
    }
  }

  /**
   * Get cache value
   */
  async get(key, tenantId = null) {
    const cacheKey = this.getCacheKey(key, tenantId);
    
    try {
      if (this.isRedisAvailable && this.redisClient) {
        const value = await this.redisClient.get(cacheKey);
        return value ? JSON.parse(value) : null;
      } else {
        // Fallback to memory cache
        return this.memoryCache.get(cacheKey) || null;
      }
    } catch (error) {
      console.error('Cache get error:', error);
      // Fallback to memory cache on Redis error
      return this.memoryCache.get(cacheKey) || null;
    }
  }

  /**
   * Delete cache value
   */
  async del(key, tenantId = null) {
    const cacheKey = this.getCacheKey(key, tenantId);
    
    try {
      if (this.isRedisAvailable && this.redisClient) {
        await this.redisClient.del(cacheKey);
      }
      this.memoryCache.del(cacheKey);
      return true;
    } catch (error) {
      console.error('Cache delete error:', error);
      this.memoryCache.del(cacheKey);
      return false;
    }
  }

  /**
   * Check if key exists
   */
  async exists(key, tenantId = null) {
    const cacheKey = this.getCacheKey(key, tenantId);
    
    try {
      if (this.isRedisAvailable && this.redisClient) {
        return await this.redisClient.exists(cacheKey) === 1;
      } else {
        return this.memoryCache.has(cacheKey);
      }
    } catch (error) {
      console.error('Cache exists error:', error);
      return this.memoryCache.has(cacheKey);
    }
  }

  /**
   * Increment counter with TTL
   */
  async incr(key, ttl = 3600, tenantId = null) {
    const cacheKey = this.getCacheKey(key, tenantId);
    
    try {
      if (this.isRedisAvailable && this.redisClient) {
        const pipeline = this.redisClient.pipeline();
        pipeline.incr(cacheKey);
        pipeline.expire(cacheKey, ttl);
        const results = await pipeline.exec();
        return results[0][1]; // Return the incremented value
      } else {
        // Memory cache fallback
        const current = this.memoryCache.get(cacheKey) || 0;
        const newValue = current + 1;
        this.memoryCache.set(cacheKey, newValue, ttl);
        return newValue;
      }
    } catch (error) {
      console.error('Cache increment error:', error);
      return 1;
    }
  }

  /**
   * Set multiple values at once
   */
  async mset(keyValuePairs, ttl = 600, tenantId = null) {
    try {
      if (this.isRedisAvailable && this.redisClient) {
        const pipeline = this.redisClient.pipeline();
        
        for (const [key, value] of Object.entries(keyValuePairs)) {
          const cacheKey = this.getCacheKey(key, tenantId);
          const serializedValue = JSON.stringify(value);
          
          if (ttl > 0) {
            pipeline.setex(cacheKey, ttl, serializedValue);
          } else {
            pipeline.set(cacheKey, serializedValue);
          }
        }
        
        await pipeline.exec();
      } else {
        // Memory cache fallback
        for (const [key, value] of Object.entries(keyValuePairs)) {
          const cacheKey = this.getCacheKey(key, tenantId);
          this.memoryCache.set(cacheKey, value, ttl);
        }
      }
      return true;
    } catch (error) {
      console.error('Cache mset error:', error);
      return false;
    }
  }

  /**
   * Get multiple values at once
   */
  async mget(keys, tenantId = null) {
    try {
      if (this.isRedisAvailable && this.redisClient) {
        const cacheKeys = keys.map(key => this.getCacheKey(key, tenantId));
        const values = await this.redisClient.mget(...cacheKeys);
        
        const result = {};
        keys.forEach((key, index) => {
          result[key] = values[index] ? JSON.parse(values[index]) : null;
        });
        
        return result;
      } else {
        // Memory cache fallback
        const result = {};
        keys.forEach(key => {
          const cacheKey = this.getCacheKey(key, tenantId);
          result[key] = this.memoryCache.get(cacheKey) || null;
        });
        return result;
      }
    } catch (error) {
      console.error('Cache mget error:', error);
      return {};
    }
  }

  /**
   * Clear cache by pattern
   */
  async clearByPattern(pattern, tenantId = null) {
    try {
      const fullPattern = this.getCacheKey(pattern, tenantId);
      
      if (this.isRedisAvailable && this.redisClient) {
        const keys = await this.redisClient.keys(fullPattern);
        if (keys.length > 0) {
          await this.redisClient.del(...keys);
        }
      }
      
      // Clear from memory cache (basic pattern matching)
      const memKeys = this.memoryCache.keys();
      const matchingKeys = memKeys.filter(key => key.includes(pattern));
      matchingKeys.forEach(key => this.memoryCache.del(key));
      
      return true;
    } catch (error) {
      console.error('Cache clear by pattern error:', error);
      return false;
    }
  }

  /**
   * Clear all tenant cache
   */
  async clearTenantCache(tenantId) {
    return this.clearByPattern('*', tenantId);
  }

  /**
   * Publish message to Redis channel
   */
  async publish(channel, message) {
    try {
      if (this.isRedisAvailable && this.redisPublisher) {
        await this.redisPublisher.publish(channel, JSON.stringify(message));
        return true;
      }
      return false;
    } catch (error) {
      console.error('Redis publish error:', error);
      return false;
    }
  }

  /**
   * Subscribe to Redis channel
   */
  async subscribe(channel, callback) {
    try {
      if (this.isRedisAvailable && this.redisSubscriber) {
        await this.redisSubscriber.subscribe(channel);
        this.redisSubscriber.on('message', (receivedChannel, message) => {
          if (receivedChannel === channel) {
            try {
              const parsedMessage = JSON.parse(message);
              callback(parsedMessage);
            } catch (error) {
              console.error('Error parsing Redis message:', error);
            }
          }
        });
        return true;
      }
      return false;
    } catch (error) {
      console.error('Redis subscribe error:', error);
      return false;
    }
  }

  /**
   * Get cache statistics
   */
  async getStats() {
    const stats = {
      redisAvailable: this.isRedisAvailable,
      memoryCache: {
        keys: this.memoryCache.keys().length,
        stats: this.memoryCache.getStats()
      }
    };

    if (this.isRedisAvailable && this.redisClient) {
      try {
        const info = await this.redisClient.info('memory');
        stats.redis = {
          connected: true,
          memory: info
        };
      } catch (error) {
        stats.redis = { connected: false, error: error.message };
      }
    }

    return stats;
  }

  /**
   * Health check
   */
  async healthCheck() {
    const health = {
      redis: false,
      memoryCache: true
    };

    if (this.isRedisAvailable && this.redisClient) {
      try {
        await this.redisClient.ping();
        health.redis = true;
      } catch (error) {
        health.redis = false;
      }
    }

    return health;
  }

  /**
   * Cleanup resources
   */
  async cleanup() {
    try {
      if (this.redisClient) {
        await this.redisClient.quit();
      }
      if (this.redisPublisher) {
        await this.redisPublisher.quit();
      }
      if (this.redisSubscriber) {
        await this.redisSubscriber.quit();
      }
      
      this.memoryCache.flushAll();
      this.memoryCache.close();
      
      console.log('Cache manager cleanup completed');
    } catch (error) {
      console.error('Cache cleanup error:', error);
    }
  }
}

// Create singleton instance
const cacheManager = new CacheManager();

// Graceful shutdown
process.on('SIGTERM', async () => {
  await cacheManager.cleanup();
});

process.on('SIGINT', async () => {
  await cacheManager.cleanup();
});

module.exports = {
  CacheManager,
  cacheManager
};