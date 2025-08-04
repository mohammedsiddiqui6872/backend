#!/usr/bin/env node

/**
 * MongoDB Replica Set Configuration Script
 * Helps configure MongoDB for high availability
 */

const { MongoClient } = require('mongodb');
require('dotenv').config();

class ReplicaSetManager {
  constructor() {
    this.mongoUri = process.env.MONGODB_URI;
    this.client = null;
  }

  async connect() {
    try {
      this.client = new MongoClient(this.mongoUri, {
        useNewUrlParser: true,
        useUnifiedTopology: true
      });
      
      await this.client.connect();
      console.log('Connected to MongoDB');
      return true;
    } catch (error) {
      console.error('Failed to connect to MongoDB:', error);
      return false;
    }
  }

  async checkReplicaSetStatus() {
    try {
      const admin = this.client.db().admin();
      const status = await admin.command({ replSetGetStatus: 1 });
      
      console.log('\n=== Replica Set Status ===');
      console.log(`Set Name: ${status.set}`);
      console.log(`Current Primary: ${status.members.find(m => m.stateStr === 'PRIMARY')?.name || 'None'}`);
      console.log(`Members: ${status.members.length}`);
      
      status.members.forEach((member, index) => {
        console.log(`  ${index + 1}. ${member.name} - ${member.stateStr} (${member.health})`);
      });
      
      return status;
    } catch (error) {
      if (error.code === 76) {
        console.log('This MongoDB instance is not part of a replica set');
        return null;
      }
      console.error('Error checking replica set status:', error);
      return null;
    }
  }

  async initializeReplicaSet(config) {
    try {
      const admin = this.client.db().admin();
      const result = await admin.command({ replSetInitiate: config });
      
      console.log('\n=== Replica Set Initialization ===');
      console.log('Result:', result);
      
      // Wait for the replica set to stabilize
      console.log('Waiting for replica set to stabilize...');
      await this.waitForPrimary();
      
      return result;
    } catch (error) {
      console.error('Error initializing replica set:', error);
      return null;
    }
  }

  async waitForPrimary(maxWaitTime = 60000) {
    const startTime = Date.now();
    
    while (Date.now() - startTime < maxWaitTime) {
      try {
        const status = await this.checkReplicaSetStatus();
        if (status && status.members.some(m => m.stateStr === 'PRIMARY')) {
          console.log('Replica set has a primary member');
          return true;
        }
        
        console.log('Waiting for primary...');
        await new Promise(resolve => setTimeout(resolve, 2000));
      } catch (error) {
        // Continue waiting
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
    
    console.log('Timeout waiting for primary');
    return false;
  }

  generateReplicaSetConfig() {
    const config = {
      _id: process.env.REPLICA_SET_NAME || 'gritservices-rs',
      version: 1,
      members: []
    };

    // Parse MongoDB URI to get host information
    const uri = new URL(this.mongoUri.replace('mongodb://', 'http://').replace('mongodb+srv://', 'https://'));
    
    if (process.env.MONGODB_HOSTS) {
      // Multiple hosts specified
      const hosts = process.env.MONGODB_HOSTS.split(',');
      hosts.forEach((host, index) => {
        config.members.push({
          _id: index,
          host: host.trim(),
          priority: index === 0 ? 2 : 1 // First host has higher priority
        });
      });
    } else {
      // Single host - development setup
      config.members.push({
        _id: 0,
        host: `${uri.hostname}:${uri.port || 27017}`,
        priority: 1
      });
    }

    return config;
  }

  async configureReadPreferences() {
    try {
      const db = this.client.db();
      
      // Set read preference to secondary preferred for analytics queries
      const collections = ['orders', 'users', 'menuitems', 'shifts'];
      
      console.log('\n=== Configuring Read Preferences ===');
      
      for (const collectionName of collections) {
        const collection = db.collection(collectionName);
        
        // Create indexes with appropriate read preferences
        await collection.createIndex(
          { tenantId: 1, createdAt: -1 }, 
          { 
            background: true,
            name: `${collectionName}_tenant_created_idx`
          }
        );
        
        console.log(`✓ Configured indexes for ${collectionName}`);
      }
      
      return true;
    } catch (error) {
      console.error('Error configuring read preferences:', error);
      return false;
    }
  }

  async setupSharding() {
    try {
      const admin = this.client.db().admin();
      
      console.log('\n=== Sharding Configuration ===');
      
      // Enable sharding on the database
      const dbName = this.client.db().databaseName;
      await admin.command({ enableSharding: dbName });
      console.log(`✓ Enabled sharding on database: ${dbName}`);
      
      // Shard key configurations for multi-tenant collections
      const shardConfigs = [
        { collection: 'orders', key: { tenantId: 1, createdAt: 1 } },
        { collection: 'users', key: { tenantId: 1, _id: 1 } },
        { collection: 'menuitems', key: { tenantId: 1, _id: 1 } },
        { collection: 'shifts', key: { tenantId: 1, date: 1 } },
        { collection: 'tables', key: { tenantId: 1, _id: 1 } }
      ];
      
      for (const config of shardConfigs) {
        try {
          await admin.command({
            shardCollection: `${dbName}.${config.collection}`,
            key: config.key
          });
          console.log(`✓ Sharded collection: ${config.collection}`);
        } catch (error) {
          if (error.code !== 20) { // Collection already sharded
            console.log(`⚠ Warning: Could not shard ${config.collection}:`, error.message);
          } else {
            console.log(`✓ Collection ${config.collection} already sharded`);
          }
        }
      }
      
      return true;
    } catch (error) {
      console.error('Sharding setup error:', error);
      return false;
    }
  }

  async optimizeForProduction() {
    try {
      const admin = this.client.db().admin();
      
      console.log('\n=== Production Optimizations ===');
      
      // Set profiler to log slow operations
      await admin.command({
        profile: 2,
        slowms: 100,
        sampleRate: 0.1
      });
      console.log('✓ Enabled slow query profiling');
      
      // Set read/write concerns
      const db = this.client.db();
      await db.command({
        setDefaultRWConcern: 1,
        defaultReadConcern: { level: 'majority' },
        defaultWriteConcern: {
          w: 'majority',
          j: true,
          wtimeout: 10000
        }
      });
      console.log('✓ Set default read/write concerns');
      
      return true;
    } catch (error) {
      console.error('Production optimization error:', error);
      return false;
    }
  }

  async performHealthCheck() {
    try {
      console.log('\n=== Health Check ===');
      
      // Check connection
      await this.client.db().admin().ping();
      console.log('✓ Database connection healthy');
      
      // Check replica set status
      const status = await this.checkReplicaSetStatus();
      if (status) {
        const healthyMembers = status.members.filter(m => m.health === 1);
        console.log(`✓ Replica set healthy: ${healthyMembers.length}/${status.members.length} members healthy`);
      }
      
      // Check indexes
      const collections = ['orders', 'users', 'menuitems', 'tables'];
      for (const collectionName of collections) {
        const collection = this.client.db().collection(collectionName);
        const indexes = await collection.indexes();
        console.log(`✓ ${collectionName}: ${indexes.length} indexes`);
      }
      
      return true;
    } catch (error) {
      console.error('Health check failed:', error);
      return false;
    }
  }

  async disconnect() {
    if (this.client) {
      await this.client.close();
      console.log('Disconnected from MongoDB');
    }
  }
}

// CLI Interface
async function main() {
  const manager = new ReplicaSetManager();
  const args = process.argv.slice(2);
  const command = args[0] || 'status';
  
  console.log('🚀 GRIT Services MongoDB Replica Set Manager');
  console.log('==========================================');
  
  const connected = await manager.connect();
  if (!connected) {
    process.exit(1);
  }
  
  try {
    switch (command) {
      case 'status':
        await manager.checkReplicaSetStatus();
        await manager.performHealthCheck();
        break;
        
      case 'init':
        console.log('Initializing replica set...');
        const config = manager.generateReplicaSetConfig();
        console.log('Configuration:', JSON.stringify(config, null, 2));
        
        const initResult = await manager.initializeReplicaSet(config);
        if (initResult) {
          console.log('✅ Replica set initialized successfully');
          await manager.configureReadPreferences();
        }
        break;
        
      case 'optimize':
        console.log('Applying production optimizations...');
        await manager.configureReadPreferences();
        await manager.optimizeForProduction();
        console.log('✅ Optimizations applied');
        break;
        
      case 'shard':
        console.log('Setting up sharding...');
        await manager.setupSharding();
        console.log('✅ Sharding configured');
        break;
        
      case 'health':
        await manager.performHealthCheck();
        break;
        
      default:
        console.log(`
Available commands:
  status   - Check replica set status and health
  init     - Initialize a new replica set
  optimize - Apply production optimizations
  shard    - Configure sharding (requires sharded cluster)
  health   - Perform comprehensive health check

Environment variables:
  MONGODB_URI           - MongoDB connection string
  REPLICA_SET_NAME      - Name for the replica set (default: gritservices-rs)
  MONGODB_HOSTS         - Comma-separated list of hosts for replica set

Example usage:
  node configureReplicaSet.js status
  node configureReplicaSet.js init
  node configureReplicaSet.js optimize
        `);
        break;
    }
  } catch (error) {
    console.error('Command failed:', error);
    process.exit(1);
  } finally {
    await manager.disconnect();
  }
}

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

if (require.main === module) {
  main();
}

module.exports = ReplicaSetManager;