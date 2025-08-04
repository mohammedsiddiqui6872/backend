const mongoose = require('mongoose');
const aggregatePaginate = require('mongoose-aggregate-paginate-v2');

/**
 * Enhanced Database Configuration
 * Provides optimized MongoDB connection with performance settings
 */

class DatabaseManager {
  constructor() {
    this.isConnected = false;
    this.connectionRetries = 0;
    this.maxRetries = 5;
    this.retryDelay = 5000; // 5 seconds
  }

  /**
   * Get optimized connection options
   */
  getConnectionOptions() {
    return {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      
      // Connection Pool Settings
      maxPoolSize: parseInt(process.env.DB_MAX_POOL_SIZE) || 10, // Maintain up to 10 socket connections
      minPoolSize: parseInt(process.env.DB_MIN_POOL_SIZE) || 2,  // Maintain at least 2 socket connections
      maxIdleTimeMS: parseInt(process.env.DB_MAX_IDLE_TIME) || 30000, // Close connections after 30 seconds of inactivity
      serverSelectionTimeoutMS: parseInt(process.env.DB_SERVER_SELECTION_TIMEOUT) || 5000, // Keep trying to send operations for 5 seconds
      socketTimeoutMS: parseInt(process.env.DB_SOCKET_TIMEOUT) || 45000, // Close sockets after 45 seconds of inactivity
      
      // Buffering Settings
      bufferMaxEntries: 0, // Disable mongoose buffering
      bufferCommands: false, // Disable mongoose buffering
      
      // Heartbeat Settings
      heartbeatFrequencyMS: parseInt(process.env.DB_HEARTBEAT_FREQUENCY) || 10000, // Send heartbeat every 10 seconds
      
      // Replica Set Settings (if using replica set)
      readPreference: process.env.DB_READ_PREFERENCE || 'primary',
      readConcern: { level: process.env.DB_READ_CONCERN || 'majority' },
      writeConcern: { 
        w: process.env.DB_WRITE_CONCERN || 'majority',
        j: true, // Wait for journal acknowledgment
        wtimeout: parseInt(process.env.DB_WRITE_TIMEOUT) || 10000
      },

      // Compression (if supported by MongoDB version)
      compressors: ['zlib'],
      
      // Authentication (if needed)
      authSource: process.env.DB_AUTH_SOURCE || 'admin',
      
      // SSL/TLS Settings (for production)
      ssl: process.env.NODE_ENV === 'production',
      sslValidate: process.env.NODE_ENV === 'production',
      
      // Additional Performance Settings
      maxStalenessSeconds: parseInt(process.env.DB_MAX_STALENESS) || 120, // Allow reads from secondaries up to 2 minutes behind
      retryWrites: true, // Retry write operations once
      retryReads: true   // Retry read operations once
    };
  }

  /**
   * Set up mongoose optimizations
   */
  setupMongooseOptimizations() {
    // Disable strict mode for flexibility with dynamic schemas
    mongoose.set('strictQuery', false);
    mongoose.set('strictPopulate', false);
    
    // Enable query optimization
    mongoose.set('debug', process.env.NODE_ENV === 'development');
    
    // Set default schema options
    mongoose.Schema.Types.String.checkRequired(v => typeof v === 'string');
    
    // Add aggregate pagination plugin globally
    mongoose.plugin(aggregatePaginate);
    
    // Optimize for faster updates
    mongoose.set('runValidators', true);
    mongoose.set('useCreateIndex', true);
    mongoose.set('useFindAndModify', false);
  }

  /**
   * Create database indexes for optimal performance
   */
  async createIndexes() {
    try {
      const db = mongoose.connection.db;
      
      // Create compound indexes for common queries
      const indexPromises = [
        // Tenant-based indexes
        db.collection('users').createIndex({ 'tenantId': 1, 'email': 1 }, { background: true }),
        db.collection('users').createIndex({ 'tenantId': 1, 'role': 1 }, { background: true }),
        db.collection('users').createIndex({ 'tenantId': 1, 'isActive': 1 }, { background: true }),
        
        db.collection('orders').createIndex({ 'tenantId': 1, 'status': 1 }, { background: true }),
        db.collection('orders').createIndex({ 'tenantId': 1, 'createdAt': -1 }, { background: true }),
        db.collection('orders').createIndex({ 'tenantId': 1, 'tableNumber': 1, 'status': 1 }, { background: true }),
        db.collection('orders').createIndex({ 'tenantId': 1, 'waiter': 1, 'createdAt': -1 }, { background: true }),
        
        db.collection('menuitems').createIndex({ 'tenantId': 1, 'category': 1 }, { background: true }),
        db.collection('menuitems').createIndex({ 'tenantId': 1, 'isAvailable': 1 }, { background: true }),
        db.collection('menuitems').createIndex({ 'tenantId': 1, 'price': 1 }, { background: true }),
        
        db.collection('tables').createIndex({ 'tenantId': 1, 'status': 1 }, { background: true }),
        db.collection('tables').createIndex({ 'tenantId': 1, 'number': 1 }, { unique: true, background: true }),
        
        db.collection('shifts').createIndex({ 'tenantId': 1, 'employee': 1, 'date': -1 }, { background: true }),
        db.collection('shifts').createIndex({ 'tenantId': 1, 'status': 1, 'date': -1 }, { background: true }),
        
        db.collection('categories').createIndex({ 'tenantId': 1, 'displayOrder': 1 }, { background: true }),
        
        // Performance indexes for analytics
        db.collection('orders').createIndex({ 'tenantId': 1, 'createdAt': -1, 'total': 1 }, { background: true }),
        db.collection('orders').createIndex({ 'tenantId': 1, 'paymentStatus': 1, 'createdAt': -1 }, { background: true }),
        
        // Session tracking indexes
        db.collection('waitersessions').createIndex({ 'tenantId': 1, 'waiter': 1, 'isActive': 1 }, { background: true }),
        db.collection('customersessions').createIndex({ 'tenantId': 1, 'tableNumber': 1, 'isActive': 1 }, { background: true }),
        
        // TTL indexes for cleanup
        db.collection('customersessions').createIndex({ 'endTime': 1 }, { 
          expireAfterSeconds: 86400, // 24 hours
          background: true,
          partialFilterExpression: { isActive: false }
        }),
        
        // Text search indexes
        db.collection('menuitems').createIndex({ 
          'tenantId': 1,
          'name': 'text', 
          'description': 'text' 
        }, { background: true }),
        
        db.collection('users').createIndex({ 
          'tenantId': 1,
          'name': 'text', 
          'email': 'text' 
        }, { background: true })
      ];

      await Promise.all(indexPromises);
      console.log('Database indexes created successfully');
    } catch (error) {
      console.error('Error creating database indexes:', error);
    }
  }

  /**
   * Connect to MongoDB with retry logic
   */
  async connect() {
    try {
      this.setupMongooseOptimizations();
      
      const options = this.getConnectionOptions();
      const conn = await mongoose.connect(process.env.MONGODB_URI, options);

      this.isConnected = true;
      this.connectionRetries = 0;

      console.log(`MongoDB Connected: ${conn.connection.host}`);
      console.log(`Connection Pool Size: ${options.maxPoolSize}`);
      console.log(`Read Preference: ${options.readPreference}`);

      // Create indexes after connection
      await this.createIndexes();

      // Set up event handlers
      this.setupEventHandlers();

      return conn;
    } catch (error) {
      console.error('MongoDB connection error:', error);
      
      if (this.connectionRetries < this.maxRetries) {
        this.connectionRetries++;
        console.log(`Retrying connection (${this.connectionRetries}/${this.maxRetries}) in ${this.retryDelay}ms...`);
        
        await new Promise(resolve => setTimeout(resolve, this.retryDelay));
        return this.connect();
      } else {
        console.error('Max connection retries reached. Exiting...');
        process.exit(1);
      }
    }
  }

  /**
   * Set up connection event handlers
   */
  setupEventHandlers() {
    mongoose.connection.on('error', (err) => {
      console.error('MongoDB connection error:', err);
      this.isConnected = false;
    });

    mongoose.connection.on('disconnected', () => {
      console.log('MongoDB disconnected');
      this.isConnected = false;
      
      // Attempt to reconnect
      if (this.connectionRetries < this.maxRetries) {
        setTimeout(() => this.connect(), this.retryDelay);
      }
    });

    mongoose.connection.on('reconnected', () => {
      console.log('MongoDB reconnected');
      this.isConnected = true;
      this.connectionRetries = 0;
    });

    mongoose.connection.on('connected', () => {
      console.log('MongoDB connected');
      this.isConnected = true;
    });

    // Graceful shutdown handlers
    const gracefulShutdown = async (signal) => {
      console.log(`${signal} received: closing MongoDB connection`);
      
      try {
        await mongoose.connection.close();
        console.log('MongoDB connection closed through app termination');
        process.exit(0);
      } catch (error) {
        console.error('Error during MongoDB shutdown:', error);
        process.exit(1);
      }
    };

    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  }

  /**
   * Get connection health status
   */
  getHealthStatus() {
    return {
      isConnected: this.isConnected,
      readyState: mongoose.connection.readyState,
      host: mongoose.connection.host,
      port: mongoose.connection.port,
      database: mongoose.connection.name,
      connectionRetries: this.connectionRetries
    };
  }

  /**
   * Get database statistics
   */
  async getStats() {
    if (!this.isConnected) {
      return { error: 'Database not connected' };
    }

    try {
      const db = mongoose.connection.db;
      const stats = await db.stats();
      
      return {
        collections: stats.collections,
        dataSize: stats.dataSize,
        storageSize: stats.storageSize,
        indexes: stats.indexes,
        indexSize: stats.indexSize,
        objects: stats.objects
      };
    } catch (error) {
      return { error: error.message };
    }
  }
}

// Create singleton instance
const databaseManager = new DatabaseManager();

// Export both the manager and a simple connect function for backward compatibility
module.exports = {
  DatabaseManager,
  databaseManager,
  connectDB: () => databaseManager.connect()
};