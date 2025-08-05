/**
 * Monitoring Routes
 * Endpoints for monitoring error tracking and system status
 */

const express = require('express');
const router = express.Router();
const errorTracker = require('../utils/sentryConfig');
const logger = require('../utils/logger');

// Sentry status endpoint
router.get('/sentry', async (req, res) => {
  try {
    const status = errorTracker.getStatus();
    
    res.status(200).json({
      ...status,
      timestamp: new Date().toISOString(),
      features: {
        errorTracking: status.enabled,
        performanceMonitoring: status.enabled,
        breadcrumbs: status.enabled,
        userContext: status.enabled
      }
    });
  } catch (error) {
    logger.error('Sentry status endpoint failed', { error: error.message });
    res.status(500).json({
      error: 'Failed to retrieve Sentry status',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Test Sentry error tracking
router.post('/test-error', async (req, res) => {
  try {
    const { type = 'exception', message = 'Test error from monitoring endpoint' } = req.body;
    
    if (type === 'exception') {
      const testError = new Error(message);
      errorTracker.captureException(testError, {
        tags: {
          test: true,
          endpoint: 'monitoring_test'
        },
        extra: {
          requestBody: req.body,
          userAgent: req.get('User-Agent')
        }
      });
    } else if (type === 'message') {
      errorTracker.captureMessage(message, 'info', {
        tags: {
          test: true,
          endpoint: 'monitoring_test'
        }
      });
    }
    
    res.status(200).json({
      success: true,
      message: `Test ${type} captured successfully`,
      timestamp: new Date().toISOString(),
      sentryEnabled: errorTracker.getStatus().enabled
    });
  } catch (error) {
    logger.error('Sentry test endpoint failed', { error: error.message });
    res.status(500).json({
      error: 'Failed to test Sentry',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Add breadcrumb test
router.post('/test-breadcrumb', async (req, res) => {
  try {
    const { category = 'test', message = 'Test breadcrumb', level = 'info' } = req.body;
    
    errorTracker.addBreadcrumb({
      category,
      message,
      level,
      data: {
        test: true,
        timestamp: new Date().toISOString(),
        requestId: req.id || 'unknown'
      }
    });
    
    res.status(200).json({
      success: true,
      message: 'Breadcrumb added successfully',
      breadcrumb: { category, message, level },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Breadcrumb test endpoint failed', { error: error.message });
    res.status(500).json({
      error: 'Failed to add breadcrumb',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Performance tracking test
router.post('/test-performance', async (req, res) => {
  try {
    const { operation = 'test_operation', duration = 1500 } = req.body;
    
    // Simulate a performance event
    errorTracker.trackPerformance(operation, duration, {
      test: true,
      endpoint: 'monitoring_test'
    });
    
    res.status(200).json({
      success: true,
      message: 'Performance event tracked successfully',
      operation,
      duration: `${duration}ms`,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Performance test endpoint failed', { error: error.message });
    res.status(500).json({
      error: 'Failed to track performance',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Set user context test
router.post('/test-user-context', async (req, res) => {
  try {
    const { userId = 'test-user-123', email = 'test@example.com', name = 'Test User' } = req.body;
    
    errorTracker.setUser({
      id: userId,
      email,
      name
    });
    
    res.status(200).json({
      success: true,
      message: 'User context set successfully',
      user: { userId, email, name },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('User context test endpoint failed', { error: error.message });
    res.status(500).json({
      error: 'Failed to set user context',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Transaction performance test
router.post('/test-transaction', async (req, res) => {
  try {
    const { name = 'test_transaction', op = 'test' } = req.body;
    
    const transaction = errorTracker.startTransaction(name, op);
    
    // Simulate some work
    await new Promise(resolve => setTimeout(resolve, 100));
    
    transaction.setTag('test', 'true');
    transaction.setData('endpoint', 'monitoring_test');
    transaction.finish();
    
    res.status(200).json({
      success: true,
      message: 'Transaction completed successfully',
      transaction: { name, op },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Transaction test endpoint failed', { error: error.message });
    res.status(500).json({
      error: 'Failed to test transaction',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Overall monitoring status
router.get('/status', async (req, res) => {
  try {
    const sentryStatus = errorTracker.getStatus();
    
    const overallStatus = {
      timestamp: new Date().toISOString(),
      services: {
        sentry: {
          enabled: sentryStatus.enabled,
          dsn: sentryStatus.dsn,
          environment: sentryStatus.environment
        },
        logging: {
          enabled: true,
          winston: true,
          structured: true
        },
        healthChecks: {
          enabled: true,
          endpoints: ['/api/health', '/api/health/detailed']
        },
        databaseMonitoring: {
          enabled: true,
          endpoints: ['/api/database/health', '/api/database/metrics']
        }
      },
      features: {
        errorTracking: sentryStatus.enabled,
        performanceMonitoring: sentryStatus.enabled,
        breadcrumbs: sentryStatus.enabled,
        userContext: sentryStatus.enabled,
        transactions: sentryStatus.enabled
      }
    };
    
    res.status(200).json(overallStatus);
  } catch (error) {
    logger.error('Monitoring status endpoint failed', { error: error.message });
    res.status(500).json({
      error: 'Failed to retrieve monitoring status',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

module.exports = router;