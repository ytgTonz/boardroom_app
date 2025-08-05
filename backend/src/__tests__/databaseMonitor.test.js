/**
 * Database Monitor Tests
 */

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

// Mock logger to prevent output during tests
jest.mock('../utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
}));

// We need to create a fresh instance for testing
let DatabaseMonitor;
let databaseMonitor;

describe('Database Monitor', () => {
  let mongoServer;

  beforeAll(async () => {
    // Start in-memory MongoDB instance
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    
    // Connect to the in-memory database
    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    // Import and initialize database monitor after connection
    DatabaseMonitor = require('../utils/databaseMonitor').constructor;
    databaseMonitor = new DatabaseMonitor();
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(() => {
    // Mock console methods to suppress output during tests
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Health Check', () => {
    it('should perform health check successfully', async () => {
      const result = await databaseMonitor.performHealthCheck();
      
      expect(result).toHaveProperty('status');
      expect(result).toHaveProperty('message');
      expect(['healthy', 'unhealthy']).toContain(result.status);
      
      if (result.status === 'healthy') {
        expect(result).toHaveProperty('responseTime');
        expect(result.responseTime).toMatch(/^\d+ms$/);
      }
    });

    it('should return healthy status when database is connected', async () => {
      // Ensure we're connected
      if (mongoose.connection.readyState !== 1) {
        await mongoose.connect(mongoServer.getUri());
      }
      
      const result = await databaseMonitor.performHealthCheck();
      expect(result.status).toBe('healthy');
      expect(result.message).toBe('Database is responding normally');
    });
  });

  describe('Metrics Collection', () => {
    it('should return comprehensive metrics', () => {
      const metrics = databaseMonitor.getMetrics();
      
      expect(metrics).toHaveProperty('connections');
      expect(metrics).toHaveProperty('queries');
      expect(metrics).toHaveProperty('performance');
      expect(metrics).toHaveProperty('timestamp');
      expect(metrics).toHaveProperty('uptime');
      expect(metrics).toHaveProperty('mongooseVersion');
      expect(metrics).toHaveProperty('connectionState');
      expect(metrics).toHaveProperty('queryHistory');
      
      // Check connections object
      expect(metrics.connections).toHaveProperty('active');
      expect(metrics.connections).toHaveProperty('available');
      expect(metrics.connections).toHaveProperty('total');
      
      // Check queries object
      expect(metrics.queries).toHaveProperty('total');
      expect(metrics.queries).toHaveProperty('slow');
      expect(metrics.queries).toHaveProperty('failed');
      expect(metrics.queries).toHaveProperty('avgResponseTime');
      
      // Check performance object
      expect(metrics.performance).toHaveProperty('lastCheck');
      expect(metrics.performance).toHaveProperty('responseTime');
      expect(metrics.performance).toHaveProperty('isHealthy');
    });

    it('should track query performance', () => {
      // Simulate recording queries
      databaseMonitor.recordQuery(50);   // Fast query
      databaseMonitor.recordQuery(1500); // Slow query
      databaseMonitor.recordQuery(200);  // Normal query
      
      const metrics = databaseMonitor.getMetrics();
      
      expect(metrics.queries.total).toBeGreaterThanOrEqual(3);
      expect(metrics.queries.slow).toBeGreaterThanOrEqual(1);
      expect(metrics.queries.avgResponseTime).toBeGreaterThan(0);
      expect(metrics.queryHistory.recent).toBeInstanceOf(Array);
    });

    it('should provide connection state text', () => {
      const stateText = databaseMonitor.getConnectionStateText();
      expect(['disconnected', 'connected', 'connecting', 'disconnecting', 'unknown']).toContain(stateText);
    });
  });

  describe('Database Statistics', () => {
    it('should retrieve database stats when connected', async () => {
      const stats = await databaseMonitor.getDatabaseStats();
      
      if (mongoose.connection.readyState === 1) {
        expect(stats).not.toBeNull();
        expect(stats).toHaveProperty('collections');
        expect(stats).toHaveProperty('dataSize');
        expect(stats).toHaveProperty('storageSize');
        expect(stats).toHaveProperty('indexSize');
        expect(stats).toHaveProperty('objects');
        expect(stats).toHaveProperty('indexes');
        
        expect(typeof stats.collections).toBe('number');
        expect(typeof stats.dataSize).toBe('number');
        expect(typeof stats.storageSize).toBe('number');
        expect(typeof stats.indexSize).toBe('number');
      }
    });
  });

  describe('Performance Recommendations', () => {
    it('should provide performance recommendations', () => {
      // Simulate some slow queries to trigger recommendations
      for (let i = 0; i < 10; i++) {
        databaseMonitor.recordQuery(1500); // Slow queries
      }
      
      const recommendations = databaseMonitor.getPoolingRecommendations();
      
      expect(Array.isArray(recommendations)).toBe(true);
      
      recommendations.forEach(rec => {
        expect(rec).toHaveProperty('type');
        expect(rec).toHaveProperty('severity');
        expect(rec).toHaveProperty('message');
        expect(rec).toHaveProperty('metric');
        expect(['low', 'medium', 'high']).toContain(rec.severity);
        expect(['performance', 'pooling', 'connectivity']).toContain(rec.type);
      });
    });

    it('should recommend performance improvements for slow queries', () => {
      // Clear previous metrics
      databaseMonitor.queryTimes = [];
      databaseMonitor.metrics.queries = { total: 0, slow: 0, failed: 0, avgResponseTime: 0 };
      
      // Add many slow queries
      for (let i = 0; i < 50; i++) {
        databaseMonitor.recordQuery(1500); // All slow queries
      }
      
      const recommendations = databaseMonitor.getPoolingRecommendations();
      const performanceRecs = recommendations.filter(r => r.type === 'performance');
      
      expect(performanceRecs.length).toBeGreaterThan(0);
      expect(performanceRecs.some(r => r.message.includes('query'))).toBe(true);
    });
  });

  describe('Connection Options', () => {
    it('should provide optimized connection options', () => {
      const options = DatabaseMonitor.getOptimizedConnectionOptions();
      
      expect(options).toHaveProperty('useNewUrlParser');
      expect(options).toHaveProperty('useUnifiedTopology');
      expect(options).toHaveProperty('maxPoolSize');
      expect(options).toHaveProperty('minPoolSize');
      expect(options).toHaveProperty('maxIdleTimeMS');
      expect(options).toHaveProperty('serverSelectionTimeoutMS');
      expect(options).toHaveProperty('socketTimeoutMS');
      expect(options).toHaveProperty('connectTimeoutMS');
      expect(options).toHaveProperty('heartbeatFrequencyMS');
      expect(options).toHaveProperty('bufferMaxEntries');
      expect(options).toHaveProperty('bufferCommands');
      
      expect(options.useNewUrlParser).toBe(true);
      expect(options.useUnifiedTopology).toBe(true);
      expect(typeof options.maxPoolSize).toBe('number');
      expect(typeof options.minPoolSize).toBe('number');
      expect(options.maxPoolSize).toBeGreaterThan(options.minPoolSize);
    });

    it('should provide different options for production vs development', () => {
      const originalEnv = process.env.NODE_ENV;
      
      // Test development settings
      process.env.NODE_ENV = 'development';
      const devOptions = DatabaseMonitor.getOptimizedConnectionOptions();
      
      // Test production settings
      process.env.NODE_ENV = 'production';
      const prodOptions = DatabaseMonitor.getOptimizedConnectionOptions();
      
      expect(prodOptions.maxPoolSize).toBeGreaterThan(devOptions.maxPoolSize);
      expect(prodOptions.minPoolSize).toBeGreaterThan(devOptions.minPoolSize);
      
      // Production should have additional settings
      expect(prodOptions).toHaveProperty('readPreference');
      expect(prodOptions).toHaveProperty('w');
      expect(prodOptions).toHaveProperty('retryWrites');
      expect(prodOptions).toHaveProperty('retryReads');
      
      // Restore original environment
      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('Query Time Tracking', () => {
    it('should maintain query time history', () => {
      // Clear existing history
      databaseMonitor.queryTimes = [];
      
      // Add query times
      for (let i = 0; i < 150; i++) {
        databaseMonitor.recordQuery(100 + i);
      }
      
      const metrics = databaseMonitor.getMetrics();
      
      // Should not exceed max history size
      expect(metrics.queryHistory.recent.length).toBeLessThanOrEqual(databaseMonitor.maxQueryHistorySize);
      expect(metrics.queryHistory.recent.length).toBeLessThanOrEqual(10); // Recent is last 10
    });

    it('should calculate average response time correctly', () => {
      // Clear and add specific query times
      databaseMonitor.queryTimes = [100, 200, 300];
      databaseMonitor.updateAverageResponseTime();
      
      const metrics = databaseMonitor.getMetrics();
      expect(metrics.queries.avgResponseTime).toBe(200); // (100+200+300)/3
    });
  });
});