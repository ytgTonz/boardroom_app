/**
 * Database Monitoring Routes
 * Endpoints for monitoring database performance and connection health
 */

const express = require('express');
const router = express.Router();
const databaseMonitor = require('../utils/databaseMonitor');
const logger = require('../utils/logger');

// Database health check
router.get('/health', async (req, res) => {
  try {
    const healthCheck = await databaseMonitor.performHealthCheck();
    const statusCode = healthCheck.status === 'healthy' ? 200 : 503;
    
    res.status(statusCode).json({
      ...healthCheck,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Database health check endpoint failed', { error: error.message });
    res.status(503).json({
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Database performance metrics
router.get('/metrics', async (req, res) => {
  try {
    const metrics = databaseMonitor.getMetrics();
    const stats = await databaseMonitor.getDatabaseStats();
    
    const response = {
      ...metrics,
      databaseStats: stats,
      recommendations: databaseMonitor.getPoolingRecommendations()
    };
    
    res.status(200).json(response);
  } catch (error) {
    logger.error('Database metrics endpoint failed', { error: error.message });
    res.status(500).json({
      error: 'Failed to retrieve database metrics',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Database statistics (detailed)
router.get('/stats', async (req, res) => {
  try {
    const stats = await databaseMonitor.getDatabaseStats();
    
    if (!stats) {
      return res.status(503).json({
        error: 'Database not available',
        message: 'Unable to retrieve database statistics',
        timestamp: new Date().toISOString()
      });
    }
    
    res.status(200).json({
      ...stats,
      timestamp: new Date().toISOString(),
      connectionState: databaseMonitor.getConnectionStateText()
    });
  } catch (error) {
    logger.error('Database stats endpoint failed', { error: error.message });
    res.status(500).json({
      error: 'Failed to retrieve database statistics',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Connection pool information
router.get('/pool', async (req, res) => {
  try {
    const metrics = databaseMonitor.getMetrics();
    
    const poolInfo = {
      connections: metrics.connections,
      performance: metrics.performance,
      connectionState: metrics.connectionState,
      recommendations: databaseMonitor.getPoolingRecommendations(),
      optimizedSettings: require('../utils/databaseMonitor').getOptimizedConnectionOptions(),
      timestamp: new Date().toISOString()
    };
    
    res.status(200).json(poolInfo);
  } catch (error) {
    logger.error('Database pool endpoint failed', { error: error.message });
    res.status(500).json({
      error: 'Failed to retrieve connection pool information',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Query performance analysis
router.get('/queries', async (req, res) => {
  try {
    const metrics = databaseMonitor.getMetrics();
    
    const queryAnalysis = {
      totalQueries: metrics.queries.total,
      slowQueries: metrics.queries.slow,
      failedQueries: metrics.queries.failed,
      averageResponseTime: `${metrics.queries.avgResponseTime}ms`,
      slowQueryThreshold: `${metrics.queryHistory.slowQueryThreshold}ms`,
      recentQueryTimes: metrics.queryHistory.recent,
      slowQueryPercentage: metrics.queries.total > 0 
        ? Math.round((metrics.queries.slow / metrics.queries.total) * 100) 
        : 0,
      recommendations: databaseMonitor.getPoolingRecommendations().filter(r => r.type === 'performance'),
      timestamp: new Date().toISOString()
    };
    
    res.status(200).json(queryAnalysis);
  } catch (error) {
    logger.error('Database queries endpoint failed', { error: error.message });
    res.status(500).json({
      error: 'Failed to retrieve query performance data',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Database collections information
router.get('/collections', async (req, res) => {
  try {
    const mongoose = require('mongoose');
    
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({
        error: 'Database not connected',
        message: 'Unable to retrieve collections information',
        timestamp: new Date().toISOString()
      });
    }
    
    const db = mongoose.connection.db;
    const collections = await db.listCollections().toArray();
    
    const collectionStats = [];
    for (const collection of collections) {
      try {
        const stats = await db.collection(collection.name).stats();
        collectionStats.push({
          name: collection.name,
          count: stats.count || 0,
          size: Math.round((stats.size || 0) / 1024), // KB
          avgObjSize: Math.round(stats.avgObjSize || 0),
          indexCount: stats.nindexes || 0,
          totalIndexSize: Math.round((stats.totalIndexSize || 0) / 1024) // KB
        });
      } catch (error) {
        // Some collections might not support stats
        collectionStats.push({
          name: collection.name,
          error: 'Stats not available'
        });
      }
    }
    
    res.status(200).json({
      collections: collectionStats,
      totalCollections: collections.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Database collections endpoint failed', { error: error.message });
    res.status(500).json({
      error: 'Failed to retrieve collections information',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Database indexes information
router.get('/indexes', async (req, res) => {
  try {
    const mongoose = require('mongoose');
    
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({
        error: 'Database not connected',
        message: 'Unable to retrieve indexes information',
        timestamp: new Date().toISOString()
      });
    }
    
    const db = mongoose.connection.db;
    const collections = await db.listCollections().toArray();
    
    const indexInfo = [];
    for (const collection of collections) {
      try {
        const indexes = await db.collection(collection.name).indexes();
        indexInfo.push({
          collection: collection.name,
          indexes: indexes.map(index => ({
            name: index.name,
            keys: index.key,
            unique: index.unique || false,
            sparse: index.sparse || false,
            size: index.size || 'unknown'
          }))
        });
      } catch (error) {
        indexInfo.push({
          collection: collection.name,
          error: 'Indexes not available'
        });
      }
    }
    
    res.status(200).json({
      indexes: indexInfo,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Database indexes endpoint failed', { error: error.message });
    res.status(500).json({
      error: 'Failed to retrieve indexes information',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Performance recommendations
router.get('/recommendations', async (req, res) => {
  try {
    const recommendations = databaseMonitor.getPoolingRecommendations();
    const metrics = databaseMonitor.getMetrics();
    
    // Add general recommendations based on current state
    const generalRecommendations = [];
    
    if (metrics.performance.responseTime > 100) {
      generalRecommendations.push({
        type: 'latency',
        severity: 'medium',
        message: 'Database response time is elevated. Consider checking network connectivity and query optimization.',
        metric: `Response time: ${metrics.performance.responseTime}ms`
      });
    }
    
    if (!metrics.performance.isHealthy) {
      generalRecommendations.push({
        type: 'connectivity',
        severity: 'high',
        message: 'Database health check is failing. Immediate attention required.',
        metric: `Connection state: ${metrics.connectionState}`
      });
    }
    
    const allRecommendations = [...recommendations, ...generalRecommendations];
    
    res.status(200).json({
      recommendations: allRecommendations,
      summary: {
        total: allRecommendations.length,
        high: allRecommendations.filter(r => r.severity === 'high').length,
        medium: allRecommendations.filter(r => r.severity === 'medium').length,
        low: allRecommendations.filter(r => r.severity === 'low').length
      },
      metrics: {
        averageResponseTime: `${metrics.queries.avgResponseTime}ms`,
        slowQueryPercentage: metrics.queries.total > 0 
          ? Math.round((metrics.queries.slow / metrics.queries.total) * 100) 
          : 0,
        connectionHealth: metrics.performance.isHealthy,
        lastCheck: metrics.performance.lastCheck
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Database recommendations endpoint failed', { error: error.message });
    res.status(500).json({
      error: 'Failed to retrieve recommendations',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

module.exports = router;