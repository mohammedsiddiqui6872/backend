#!/usr/bin/env node

/**
 * Performance Optimization Script
 * Analyzes and optimizes system performance
 */

const mongoose = require('mongoose');
const { cacheManager } = require('../src/config/redis');
require('dotenv').config();

class PerformanceOptimizer {
  constructor() {
    this.results = {
      timestamp: new Date().toISOString(),
      optimizations: [],
      recommendations: [],
      errors: []
    };
  }

  async connect() {
    try {
      await mongoose.connect(process.env.MONGODB_URI, {
        useNewUrlParser: true,
        useUnifiedTopology: true
      });
      console.log('Connected to MongoDB');
      return true;
    } catch (error) {
      console.error('Failed to connect to MongoDB:', error);
      this.results.errors.push(`Database connection: ${error.message}`);
      return false;
    }
  }

  async analyzeIndexes() {
    console.log('\n=== Analyzing Database Indexes ===');
    
    try {
      const db = mongoose.connection.db;
      const collections = await db.listCollections().toArray();
      
      for (const col of collections) {
        const collection = db.collection(col.name);
        const indexes = await collection.indexes();
        const stats = await collection.stats().catch(() => ({ count: 0 }));
        
        console.log(`\n${col.name}:`);
        console.log(`  Documents: ${stats.count}`);
        console.log(`  Indexes: ${indexes.length}`);
        
        // Check for missing tenant indexes
        const hasTenantIndex = indexes.some(idx => 
          idx.key && idx.key.tenantId
        );
        
        if (stats.count > 1000 && !hasTenantIndex && col.name !== 'tenants') {
          this.results.recommendations.push({
            type: 'index',
            collection: col.name,
            recommendation: 'Add tenantId index for better multi-tenant performance',
            impact: 'high',
            query: `db.${col.name}.createIndex({ tenantId: 1 }, { background: true })`
          });
        }
        
        // Check for compound indexes on frequently queried fields
        if (col.name === 'orders') {
          const hasOrderStatusIndex = indexes.some(idx => 
            idx.key && idx.key.tenantId && idx.key.status
          );
          
          if (!hasOrderStatusIndex) {
            this.results.recommendations.push({
              type: 'index',
              collection: col.name,
              recommendation: 'Add compound index on tenantId + status for order queries',
              impact: 'high',
              query: `db.${col.name}.createIndex({ tenantId: 1, status: 1 }, { background: true })`
            });
          }
        }
        
        if (col.name === 'users') {
          const hasUserEmailIndex = indexes.some(idx => 
            idx.key && idx.key.tenantId && idx.key.email
          );
          
          if (!hasUserEmailIndex) {
            this.results.recommendations.push({
              type: 'index',
              collection: col.name,
              recommendation: 'Add compound index on tenantId + email for user lookups',
              impact: 'medium',
              query: `db.${col.name}.createIndex({ tenantId: 1, email: 1 }, { background: true, unique: true })`
            });
          }
        }
        
        // List existing indexes
        indexes.forEach(idx => {
          const keyStr = Object.keys(idx.key).map(k => `${k}:${idx.key[k]}`).join(', ');
          console.log(`    ${idx.name}: { ${keyStr} }`);
        });
      }
      
      return true;
    } catch (error) {
      console.error('Index analysis error:', error);
      this.results.errors.push(`Index analysis: ${error.message}`);
      return false;
    }
  }

  async analyzeQueries() {
    console.log('\n=== Analyzing Query Performance ===');
    
    try {
      const db = mongoose.connection.db;
      
      // Get profiler data (slow queries)
      const profilerData = await db.collection('system.profile')
        .find({})
        .sort({ ts: -1 })
        .limit(50)
        .toArray()
        .catch(() => []);
      
      if (profilerData.length > 0) {
        console.log(`Found ${profilerData.length} profiled operations`);
        
        const slowQueries = profilerData.filter(op => op.millis > 100);
        if (slowQueries.length > 0) {
          console.log(`\nSlow queries (>100ms): ${slowQueries.length}`);
          
          slowQueries.slice(0, 5).forEach((query, index) => {
            console.log(`  ${index + 1}. ${query.ns} - ${query.millis}ms`);
            console.log(`     Command: ${JSON.stringify(query.command).slice(0, 100)}...`);
          });
          
          this.results.recommendations.push({
            type: 'query',
            recommendation: `Found ${slowQueries.length} slow queries that could benefit from optimization`,
            impact: 'high',
            details: `Average slow query time: ${Math.round(slowQueries.reduce((sum, q) => sum + q.millis, 0) / slowQueries.length)}ms`
          });
        }
      } else {
        console.log('No profiler data available. Enable profiling with:');
        console.log('  db.setProfilingLevel(2, { slowms: 100 })');
        
        this.results.recommendations.push({
          type: 'monitoring',
          recommendation: 'Enable MongoDB profiler to track slow queries',
          impact: 'medium',
          query: 'db.setProfilingLevel(2, { slowms: 100, sampleRate: 0.1 })'
        });
      }
      
      return true;
    } catch (error) {
      console.error('Query analysis error:', error);
      this.results.errors.push(`Query analysis: ${error.message}`);
      return false;
    }
  }

  async optimizeCollections() {
    console.log('\n=== Optimizing Collections ===');
    
    try {
      const db = mongoose.connection.db;
      const collections = ['orders', 'users', 'menuitems', 'shifts', 'tables'];
      
      for (const collectionName of collections) {
        const collection = db.collection(collectionName);
        
        try {
          // Ensure tenant-based indexes exist
          await collection.createIndex(
            { tenantId: 1 },
            { background: true, name: `${collectionName}_tenant_idx` }
          );
          
          // Collection-specific optimizations
          switch (collectionName) {
            case 'orders':
              await collection.createIndex(
                { tenantId: 1, status: 1 },
                { background: true, name: 'orders_tenant_status_idx' }
              );
              await collection.createIndex(
                { tenantId: 1, createdAt: -1 },
                { background: true, name: 'orders_tenant_created_idx' }
              );
              await collection.createIndex(
                { tenantId: 1, waiter: 1, createdAt: -1 },
                { background: true, name: 'orders_tenant_waiter_created_idx' }
              );
              break;
              
            case 'users':
              await collection.createIndex(
                { tenantId: 1, email: 1 },
                { background: true, unique: true, name: 'users_tenant_email_idx' }
              );
              await collection.createIndex(
                { tenantId: 1, role: 1, isActive: 1 },
                { background: true, name: 'users_tenant_role_active_idx' }
              );
              break;
              
            case 'menuitems':
              await collection.createIndex(
                { tenantId: 1, category: 1, isAvailable: 1 },
                { background: true, name: 'menuitems_tenant_category_available_idx' }
              );
              await collection.createIndex(
                { tenantId: 1, name: 'text', description: 'text' },
                { background: true, name: 'menuitems_search_idx' }
              );
              break;
              
            case 'shifts':
              await collection.createIndex(
                { tenantId: 1, employee: 1, date: -1 },
                { background: true, name: 'shifts_tenant_employee_date_idx' }
              );
              await collection.createIndex(
                { tenantId: 1, status: 1, date: -1 },
                { background: true, name: 'shifts_tenant_status_date_idx' }
              );
              break;
              
            case 'tables':
              await collection.createIndex(
                { tenantId: 1, number: 1 },
                { background: true, unique: true, name: 'tables_tenant_number_idx' }
              );
              await collection.createIndex(
                { tenantId: 1, status: 1 },
                { background: true, name: 'tables_tenant_status_idx' }
              );
              break;
          }
          
          console.log(`✓ Optimized ${collectionName} collection`);
          this.results.optimizations.push(`Ensured optimal indexes for ${collectionName}`);
          
        } catch (error) {
          if (error.code !== 85) { // Index already exists
            console.log(`⚠ Warning optimizing ${collectionName}:`, error.message);
          } else {
            console.log(`✓ ${collectionName} indexes already optimized`);
          }
        }
      }
      
      return true;
    } catch (error) {
      console.error('Collection optimization error:', error);
      this.results.errors.push(`Collection optimization: ${error.message}`);
      return false;
    }
  }

  async analyzeCachePerformance() {
    console.log('\n=== Analyzing Cache Performance ===');
    
    try {
      const cacheStats = await cacheManager.getStats();
      console.log('Cache Stats:', JSON.stringify(cacheStats, null, 2));
      
      // Test cache performance
      const testKey = `perf-test-${Date.now()}`;
      const testData = { test: true, timestamp: new Date(), data: new Array(1000).fill('test') };
      
      // Write performance test
      const writeStart = Date.now();
      await cacheManager.set(testKey, testData, 60);
      const writeTime = Date.now() - writeStart;
      
      // Read performance test
      const readStart = Date.now();
      const retrieved = await cacheManager.get(testKey);
      const readTime = Date.now() - readStart;
      
      // Cleanup
      await cacheManager.del(testKey);
      
      console.log(`Cache write time: ${writeTime}ms`);
      console.log(`Cache read time: ${readTime}ms`);
      
      if (writeTime > 50) {
        this.results.recommendations.push({
          type: 'cache',
          recommendation: 'Cache write performance is slow, consider Redis optimization',
          impact: 'medium',
          details: `Write time: ${writeTime}ms (should be <50ms)`
        });
      }
      
      if (readTime > 10) {
        this.results.recommendations.push({
          type: 'cache',
          recommendation: 'Cache read performance is slow, check Redis configuration',
          impact: 'medium',
          details: `Read time: ${readTime}ms (should be <10ms)`
        });
      }
      
      // Check if Redis is available
      if (!cacheStats.redisAvailable) {
        this.results.recommendations.push({
          type: 'cache',
          recommendation: 'Redis is not available, using memory cache fallback',
          impact: 'high',
          details: 'Configure Redis for better performance and horizontal scaling'
        });
      }
      
      return true;
    } catch (error) {
      console.error('Cache analysis error:', error);
      this.results.errors.push(`Cache analysis: ${error.message}`);
      return false;
    }
  }

  async generateReport() {
    console.log('\n=== Performance Optimization Report ===');
    console.log(JSON.stringify(this.results, null, 2));
    
    // Save report to file
    const fs = require('fs');
    const reportPath = `performance-report-${Date.now()}.json`;
    
    try {
      fs.writeFileSync(reportPath, JSON.stringify(this.results, null, 2));
      console.log(`\nReport saved to: ${reportPath}`);
    } catch (error) {
      console.error('Failed to save report:', error);
    }
    
    // Print summary
    console.log('\n=== Summary ===');
    console.log(`Optimizations applied: ${this.results.optimizations.length}`);
    console.log(`Recommendations: ${this.results.recommendations.length}`);
    console.log(`Errors: ${this.results.errors.length}`);
    
    if (this.results.recommendations.length > 0) {
      console.log('\nTop Recommendations:');
      this.results.recommendations
        .filter(r => r.impact === 'high')
        .slice(0, 5)
        .forEach((rec, index) => {
          console.log(`  ${index + 1}. ${rec.recommendation}`);
          if (rec.query) {
            console.log(`     Execute: ${rec.query}`);
          }
        });
    }
  }

  async cleanup() {
    if (mongoose.connection) {
      await mongoose.connection.close();
      console.log('\nDisconnected from MongoDB');
    }
  }
}

// CLI Interface
async function main() {
  const optimizer = new PerformanceOptimizer();
  
  console.log('🚀 GRIT Services Performance Optimizer');
  console.log('=====================================');
  
  const connected = await optimizer.connect();
  if (!connected) {
    process.exit(1);
  }
  
  try {
    await optimizer.analyzeIndexes();
    await optimizer.analyzeQueries();
    await optimizer.optimizeCollections();
    await optimizer.analyzeCachePerformance();
    await optimizer.generateReport();
    
    console.log('\n✅ Performance optimization completed');
  } catch (error) {
    console.error('Optimization failed:', error);
    process.exit(1);
  } finally {
    await optimizer.cleanup();
  }
}

if (require.main === module) {
  main();
}

module.exports = PerformanceOptimizer;