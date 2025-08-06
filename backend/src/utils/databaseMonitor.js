/**
 * Database Connection Monitoring and Pooling
 * Monitors database performance and manages connection pooling
 */

const mongoose = require('mongoose');
const logger = require('./logger');

class DatabaseMonitor {
  constructor() {
    this.metrics = {
      connections: {
        active: 0,
        available: 0,
        total: 0
      },
      queries: {
        total: 0,
        slow: 0,
        failed: 0,
        avgResponseTime: 0
      },
      performance: {
        lastCheck: new Date(),
        responseTime: 0,
        isHealthy: true
      }
    };
    
    this.slowQueryThreshold = 1000; // 1 second
    this.queryTimes = [];
    this.maxQueryHistorySize = 100;
    
    this.setupMonitoring();
  }

  setupMonitoring() {
    // Monitor connection events
    mongoose.connection.on('connected', () => {
      logger.info('📊 Database connected', {
        readyState: mongoose.connection.readyState,
        host: mongoose.connection.host,
        port: mongoose.connection.port,
        name: mongoose.connection.name
      });
      this.updateConnectionMetrics();
    });

    mongoose.connection.on('disconnected', () => {
      logger.warn('📊 Database disconnected');
      this.metrics.performance.isHealthy = false;
      this.updateConnectionMetrics();
    });

    mongoose.connection.on('error', (error) => {
      logger.error('📊 Database connection error', { error: error.message });
      this.metrics.performance.isHealthy = false;
      this.metrics.queries.failed++;
    });

    mongoose.connection.on('reconnected', () => {
      logger.info('📊 Database reconnected');
      this.metrics.performance.isHealthy = true;
      this.updateConnectionMetrics();
    });

    // Set up query monitoring
    this.setupQueryMonitoring();
    
    // Start periodic health checks
    this.startPeriodicChecks();
  }

  recordQuery(duration) {
    this.metrics.queries.total++;
    
    if (duration > this.slowQueryThreshold) {
      this.metrics.queries.slow++;
      logger.warn('🐌 Slow query detected', { 
        duration: `${duration}ms`,
        threshold: `${this.slowQueryThreshold}ms`
      });
    }
  }
  
  setupQueryMonitoring() {
    // Monitor slow queries using Mongoose middleware
    mongoose.plugin((schema) => {
      schema.pre(/^find/, function() {
        this.startTime = Date.now();
      });

      schema.post(/^find/, function(result) {
        const duration = Date.now() - this.startTime;
        this.recordQuery(duration);
      });

      schema.pre('save', function() {
        this.startTime = Date.now();
      });

      schema.post('save', function() {
        const duration = Date.now() - this.startTime;
        this.recordQuery(duration);
      });

      schema.pre('updateOne', function() {
        this.startTime = Date.now();
      });

      schema.post('updateOne', function() {
        const duration = Date.now() - this.startTime;
        this.recordQuery(duration);
      });

      schema.pre('deleteOne', function() {
        this.startTime = Date.now();
      });

      schema.post('deleteOne', function() {
        const duration = Date.now() - this.startTime;
        this.recordQuery(duration);
      });
    });
  }

 

  updateAverageResponseTime() {
    if (this.queryTimes.length > 0) {
      const sum = this.queryTimes.reduce((a, b) => a + b, 0);
      this.metrics.queries.avgResponseTime = Math.round(sum / this.queryTimes.length);
    }
  }

  updateConnectionMetrics() {
    try {
      const db = mongoose.connection.db;
      if (db && mongoose.connection.readyState === 1) {
        // Get connection pool statistics
        const stats = db.serverConfig || db.topology;
        
        this.metrics.connections.active = mongoose.connections.length;
        this.metrics.connections.total = mongoose.connections.length;
        this.metrics.connections.available = this.metrics.connections.total - this.metrics.connections.active;
        
        // Update health status
        this.metrics.performance.isHealthy = mongoose.connection.readyState === 1;
        this.metrics.performance.lastCheck = new Date();
      }
    } catch (error) {
      logger.error('Failed to update connection metrics', { error: error.message });
    }
  }

  async performHealthCheck() {
    try {
      const startTime = Date.now();
      
      // Ping the database
      await mongoose.connection.db.admin().ping();
      
      const responseTime = Date.now() - startTime;
      this.metrics.performance.responseTime = responseTime;
      this.metrics.performance.lastCheck = new Date();
      this.metrics.performance.isHealthy = true;

      return {
        status: 'healthy',
        responseTime: `${responseTime}ms`,
        message: 'Database is responding normally'
      };
    } catch (error) {
      this.metrics.performance.isHealthy = false;
      this.metrics.queries.failed++;
      
      logger.error('Database health check failed', { error: error.message });
      
      return {
        status: 'unhealthy',
        error: error.message,
        message: 'Database health check failed'
      };
    }
  }

  async getDatabaseStats() {
    try {
      if (mongoose.connection.readyState !== 1) {
        return null;
      }

      const db = mongoose.connection.db;
      const stats = await db.stats();
      
      return {
        collections: stats.collections || 0,
        dataSize: Math.round((stats.dataSize || 0) / 1024 / 1024), // MB
        storageSize: Math.round((stats.storageSize || 0) / 1024 / 1024), // MB
        indexSize: Math.round((stats.indexSize || 0) / 1024 / 1024), // MB
        objects: stats.objects || 0,
        avgObjSize: Math.round(stats.avgObjSize || 0),
        indexes: stats.indexes || 0
      };
    } catch (error) {
      logger.error('Failed to get database stats', { error: error.message });
      return null;
    }
  }

  getMetrics() {
    return {
      ...this.metrics,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      mongooseVersion: mongoose.version,
      connectionState: this.getConnectionStateText(),
      queryHistory: {
        recent: this.queryTimes.slice(-10), // Last 10 query times
        slowQueries: this.metrics.queries.slow,
        slowQueryThreshold: this.slowQueryThreshold
      }
    };
  }

  getConnectionStateText() {
    const states = {
      0: 'disconnected',
      1: 'connected',
      2: 'connecting',
      3: 'disconnecting'
    };
    return states[mongoose.connection.readyState] || 'unknown';
  }

  startPeriodicChecks() {
    // Perform health checks every 30 seconds
    setInterval(async () => {
      await this.performHealthCheck();
      this.updateConnectionMetrics();
      
      // Log metrics every 5 minutes
      if (Math.floor(Date.now() / 1000) % 300 === 0) {
        this.logPerformanceMetrics();
      }
    }, 30000);
  }

  logPerformanceMetrics() {
    const metrics = this.getMetrics();
    
    logger.info('📊 Database performance metrics', {
      connections: metrics.connections,
      queries: {
        total: metrics.queries.total,
        slow: metrics.queries.slow,
        failed: metrics.queries.failed,
        avgResponseTime: `${metrics.queries.avgResponseTime}ms`
      },
      performance: {
        isHealthy: metrics.performance.isHealthy,
        responseTime: `${metrics.performance.responseTime}ms`,
        connectionState: metrics.connectionState
      }
    });
  }

  // Optimize connection settings for production
  static getOptimizedConnectionOptions() {
    const isProduction = process.env.NODE_ENV === 'production';
    
    return {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      
      // Connection pool settings
      maxPoolSize: isProduction ? 20 : 10, // Maintain up to 20 socket connections
      minPoolSize: isProduction ? 5 : 2,   // Maintain a minimum of 5 socket connections
      maxIdleTimeMS: 30000,                 // Close connections after 30 seconds of inactivity
      
      // Timeout settings
      serverSelectionTimeoutMS: 5000,      // Keep trying to send operations for 5 seconds
      socketTimeoutMS: 45000,              // Close sockets after 45 seconds of inactivity
      connectTimeoutMS: 10000,             // Give up initial connection after 10 seconds
      
      // Monitoring settings
      heartbeatFrequencyMS: 10000,         // Heartbeat every 10 seconds
      
      // Buffer settings
      bufferMaxEntries: 0,                 // Disable mongoose buffering
      bufferCommands: false,               // Disable mongoose buffering
      
      // Additional settings for production
      ...(isProduction && {
        readPreference: 'secondaryPreferred', // Read from secondary if available
        w: 'majority',                        // Write concern
        retryWrites: true,                    // Retry writes on failure
        retryReads: true                      // Retry reads on failure
      })
    };
  }

  // Get connection pool recommendations based on current metrics
  getPoolingRecommendations() {
    const metrics = this.getMetrics();
    const recommendations = [];

    if (metrics.queries.avgResponseTime > 500) {
      recommendations.push({
        type: 'performance',
        severity: 'high',
        message: 'Average query response time is high. Consider adding database indexes or optimizing queries.',
        metric: `Avg response time: ${metrics.queries.avgResponseTime}ms`
      });
    }

    if (metrics.queries.slow > metrics.queries.total * 0.1) {
      recommendations.push({
        type: 'performance',
        severity: 'medium',
        message: 'High percentage of slow queries detected. Review query patterns and indexing strategy.',
        metric: `Slow queries: ${metrics.queries.slow}/${metrics.queries.total} (${Math.round(metrics.queries.slow / metrics.queries.total * 100)}%)`
      });
    }

    if (metrics.connections.active > 15) {
      recommendations.push({
        type: 'pooling',
        severity: 'medium',
        message: 'High number of active connections. Consider implementing connection pooling optimization.',
        metric: `Active connections: ${metrics.connections.active}`
      });
    }

    return recommendations;
  }
}

module.exports = new DatabaseMonitor();