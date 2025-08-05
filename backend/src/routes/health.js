/**
 * Health Check Routes
 * Comprehensive monitoring endpoints for application health
 */

const express = require('express');
const router = express.Router();
const healthCheck = require('../utils/healthCheck');
const logger = require('../utils/logger');

// Basic health check - fast response for load balancers
router.get('/', async (req, res) => {
  try {
    const result = await healthCheck.quickCheck();
    
    // Return appropriate HTTP status code
    const statusCode = result.status === 'healthy' ? 200 : 503;
    
    res.status(statusCode).json(result);
  } catch (error) {
    logger.error('Quick health check failed', { error: error.message });
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: 'Health check service unavailable'
    });
  }
});

// Comprehensive health check - detailed status of all components
router.get('/detailed', async (req, res) => {
  try {
    const result = await healthCheck.runAllChecks();
    
    // Return appropriate HTTP status code based on overall health
    let statusCode = 200;
    if (result.status === 'unhealthy') {
      statusCode = 503;
    } else if (result.status === 'degraded') {
      statusCode = 200; // Still serving requests but with warnings
    }
    
    res.status(statusCode).json(result);
  } catch (error) {
    logger.error('Detailed health check failed', { error: error.message });
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: 'Health check service unavailable',
      message: error.message
    });
  }
});

// Individual component health checks
router.get('/database', async (req, res) => {
  try {
    const result = await healthCheck.runCheck('database');
    const statusCode = result.status === 'healthy' ? 200 : 503;
    res.status(statusCode).json(result);
  } catch (error) {
    logger.error('Database health check failed', { error: error.message });
    res.status(503).json({
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

router.get('/memory', async (req, res) => {
  try {
    const result = await healthCheck.runCheck('memory');
    const statusCode = result.status === 'unhealthy' ? 503 : 200;
    res.status(statusCode).json(result);
  } catch (error) {
    logger.error('Memory health check failed', { error: error.message });
    res.status(503).json({
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

router.get('/environment', async (req, res) => {
  try {
    const result = await healthCheck.runCheck('environment');
    const statusCode = result.status === 'healthy' ? 200 : 503;
    res.status(statusCode).json(result);
  } catch (error) {
    logger.error('Environment health check failed', { error: error.message });
    res.status(503).json({
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Ready check - for Kubernetes readiness probes
router.get('/ready', async (req, res) => {
  try {
    // Check only critical components for readiness
    const dbCheck = await healthCheck.runCheck('database');
    const envCheck = await healthCheck.runCheck('environment');
    
    const isReady = dbCheck.status === 'healthy' && envCheck.status === 'healthy';
    
    const result = {
      ready: isReady,
      timestamp: new Date().toISOString(),
      checks: {
        database: dbCheck.status,
        environment: envCheck.status
      }
    };
    
    const statusCode = isReady ? 200 : 503;
    res.status(statusCode).json(result);
  } catch (error) {
    logger.error('Readiness check failed', { error: error.message });
    res.status(503).json({
      ready: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Live check - for Kubernetes liveness probes
router.get('/live', async (req, res) => {
  try {
    // Simple liveness check - just verify the process is running
    const result = {
      alive: true,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      pid: process.pid
    };
    
    res.status(200).json(result);
  } catch (error) {
    logger.error('Liveness check failed', { error: error.message });
    res.status(503).json({
      alive: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Startup check - for Kubernetes startup probes
router.get('/startup', async (req, res) => {
  try {
    // Check if application has started successfully
    const dbCheck = await healthCheck.runCheck('database');
    const envCheck = await healthCheck.runCheck('environment');
    
    const hasStarted = dbCheck.status === 'healthy' && envCheck.status === 'healthy';
    
    const result = {
      started: hasStarted,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      checks: {
        database: dbCheck.status,
        environment: envCheck.status
      }
    };
    
    const statusCode = hasStarted ? 200 : 503;
    res.status(statusCode).json(result);
  } catch (error) {
    logger.error('Startup check failed', { error: error.message });
    res.status(503).json({
      started: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// System metrics endpoint
router.get('/metrics', async (req, res) => {
  try {
    const memUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();
    
    const metrics = {
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: {
        rss: Math.round(memUsage.rss / 1024 / 1024), // MB
        heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024), // MB
        heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024), // MB
        external: Math.round(memUsage.external / 1024 / 1024) // MB
      },
      cpu: {
        user: cpuUsage.user,
        system: cpuUsage.system
      },
      process: {
        pid: process.pid,
        version: process.version,
        platform: process.platform,
        arch: process.arch
      },
      environment: process.env.NODE_ENV || 'development'
    };
    
    res.status(200).json(metrics);
  } catch (error) {
    logger.error('Metrics collection failed', { error: error.message });
    res.status(500).json({
      error: 'Failed to collect metrics',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

module.exports = router;