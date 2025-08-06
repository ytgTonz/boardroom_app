/**
 * Sentry Configuration for Error Tracking
 * Centralized error tracking and performance monitoring
 */

const logger = require('./logger');

let Sentry = null;

// Try to import Sentry if available
try {
  Sentry = require('@sentry/node');
  
  // Check if profiling is available
  try {
    const { nodeProfilingIntegration } = require('@sentry/profiling-node');
    
    // Configure Sentry with profiling
    Sentry.init({
      dsn: process.env.SENTRY_DSN || 'https://f71d2481c104235ea6901bda44f6708d@o4509745689919488.ingest.us.sentry.io/4509791706742784',
      environment: process.env.NODE_ENV || 'development',
      
      // Performance monitoring
      tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
      profilesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
      
      // Enable profiling
      integrations: [
        nodeProfilingIntegration(),
        Sentry.httpIntegration({ tracing: true }),
        Sentry.expressIntegration({ app: null }), // Will be set later
        Sentry.mongoIntegration({ useMongoose: true })
      ],
      
      // Filter out health check endpoints and other noise
      beforeSend(event) {
        // Don't send health check errors
        if (event.request?.url?.includes('/health')) {
          return null;
        }
        
        // Don't send validation errors (they're expected)
        if (event.exception?.values?.[0]?.type === 'ValidationError') {
          return null;
        }
        
        return event;
      },
      
      // Tag all events with server info
      initialScope: {
        tags: {
          server: 'boardroom-booking-backend',
          version: process.env.npm_package_version || '1.0.0'
        },
        user: {
          id: 'server'
        }
      }
    });
    
    logger.info('✅ Sentry initialized with profiling');
  } catch (profilingError) {
    // Fallback to Sentry without profiling
    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      environment: process.env.NODE_ENV || 'development',
      tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
      
      integrations: [
        Sentry.httpIntegration({ tracing: true }),
        Sentry.expressIntegration({ app: null }), // Will be set later
        Sentry.mongoIntegration({ useMongoose: true })
      ],
      
      beforeSend(event) {
        if (event.request?.url?.includes('/health')) {
          return null;
        }
        if (event.exception?.values?.[0]?.type === 'ValidationError') {
          return null;
        }
        return event;
      },
      
      initialScope: {
        tags: {
          server: 'boardroom-booking-backend',
          version: process.env.npm_package_version || '1.0.0'
        }
      }
    });
    
    logger.info('✅ Sentry initialized without profiling');
  }
  
} catch (error) {
  // Sentry not available - create mock implementation
  logger.warn('⚠️ Sentry not available, using mock implementation', {
    error: error.message,
    suggestion: 'Run: npm install @sentry/node @sentry/profiling-node'
  });
  
  Sentry = {
    init: () => {},
    setupExpressErrorHandler: () => (req, res, next) => next(),
    setupExpressRequestHandler: () => (req, res, next) => next(),
    captureException: (error, context) => {
      logger.error('Sentry Mock - Exception captured', { error: error.message, context });
    },
    captureMessage: (message, level, context) => {
      logger.info('Sentry Mock - Message captured', { message, level, context });
    },
    addBreadcrumb: (breadcrumb) => {
      logger.debug('Sentry Mock - Breadcrumb added', breadcrumb);
    },
    setUser: (user) => {
      logger.debug('Sentry Mock - User set', user);
    },
    setTag: (key, value) => {
      logger.debug('Sentry Mock - Tag set', { key, value });
    },
    setContext: (key, context) => {
      logger.debug('Sentry Mock - Context set', { key, context });
    },
    startTransaction: (context) => ({
      setStatus: () => {},
      setTag: () => {},
      setData: () => {},
      finish: () => {},
      child: () => ({
        setStatus: () => {},
        setTag: () => {},
        setData: () => {},
        finish: () => {}
      })
    }),
    getCurrentHub: () => ({
      getScope: () => ({
        setUser: () => {},
        setTag: () => {},
        setContext: () => {},
        addBreadcrumb: () => {}
      })
    })
  };
}

/**
 * Enhanced error tracking utility
 */
class ErrorTracker {
  constructor() {
    this.isEnabled = !!process.env.SENTRY_DSN;
    this.sentryInstance = Sentry;
  }

  /**
   * Capture and log an exception
   */
  captureException(error, context = {}) {
    // Always log to our logger
    logger.error('Exception captured', {
      error: error.message,
      stack: error.stack,
      context
    });

    // Send to Sentry if configured
    if (this.isEnabled) {
      this.sentryInstance.captureException(error, {
        tags: context.tags,
        user: context.user,
        extra: context.extra,
        level: context.level || 'error'
      });
    }
  }

  /**
   * Capture a message with context
   */
  captureMessage(message, level = 'info', context = {}) {
    // Use appropriate logger method
    const logMethod = logger[level] || logger.info;
    logMethod('Message captured', { message, context });

    if (this.isEnabled) {
      this.sentryInstance.captureMessage(message, level, {
        tags: context.tags,
        user: context.user,
        extra: context.extra
      });
    }
  }

  /**
   * Add breadcrumb for debugging
   */
  addBreadcrumb(breadcrumb) {
    logger.debug('Breadcrumb added', breadcrumb);

    if (this.isEnabled) {
      this.sentryInstance.addBreadcrumb(breadcrumb);
    }
  }

  /**
   * Set user context
   */
  setUser(user) {
    if (this.isEnabled) {
      this.sentryInstance.setUser(user);
    }
  }

  /**
   * Add custom context
   */
  setContext(key, context) {
    if (this.isEnabled) {
      this.sentryInstance.setContext(key, context);
    }
  }

  /**
   * Track authentication events
   */
  trackAuth(event, userId, success, details = {}) {
    const breadcrumb = {
      category: 'auth',
      message: `Authentication ${event}: ${success ? 'success' : 'failure'}`,
      level: success ? 'info' : 'warning',
      data: {
        userId,
        event,
        success,
        ...details
      }
    };

    this.addBreadcrumb(breadcrumb);

    if (!success) {
      this.captureMessage(`Authentication failure: ${event}`, 'warning', {
        tags: { event_type: 'auth_failure' },
        extra: { userId, event, ...details }
      });
    }
  }

  /**
   * Track booking events
   */
  trackBooking(event, userId, bookingId, details = {}) {
    const breadcrumb = {
      category: 'booking',
      message: `Booking ${event}`,
      level: 'info',
      data: {
        userId,
        bookingId,
        event,
        ...details
      }
    };

    this.addBreadcrumb(breadcrumb);
  }

  /**
   * Track performance issues
   */
  trackPerformance(operation, duration, details = {}) {
    const isSlowOperation = duration > 1000; // 1 second threshold

    const breadcrumb = {
      category: 'performance',
      message: `${operation} took ${duration}ms`,
      level: isSlowOperation ? 'warning' : 'info',
      data: {
        operation,
        duration,
        slow: isSlowOperation,
        ...details
      }
    };

    this.addBreadcrumb(breadcrumb);

    if (isSlowOperation) {
      this.captureMessage(`Slow operation detected: ${operation}`, 'warning', {
        tags: { 
          event_type: 'performance_issue',
          operation 
        },
        extra: { duration, ...details }
      });
    }
  }

  /**
   * Track database errors
   */
  trackDatabaseError(operation, error, details = {}) {
    this.captureException(error, {
      tags: {
        event_type: 'database_error',
        operation
      },
      extra: details
    });
  }

  /**
   * Get status information
   */
  getStatus() {
    const isDsnConfigured = !process.env.SENTRY_DSN;
    return {
      enabled: isDsnConfigured,
      dsn: isDsnConfigured ? 'configured' : 'not configured', 
      environment: process.env.NODE_ENV || 'development',
      sentryInstance: !!this.sentryInstance
    };
  }

  /**
   * Create Express middleware for error handling
   */
  getExpressErrorHandler() {
    return this.sentryInstance.setupExpressErrorHandler();
  }

  /**
   * Create Express middleware for request handling
   */
  getExpressRequestHandler() {
    return this.sentryInstance.setupExpressRequestHandler();
  }

  /**
   * Start a performance transaction
   */
  startTransaction(name, op = 'http.server') {
    if (this.isEnabled) {
      return this.sentryInstance.startTransaction({ name, op });
    }
    
    // Mock transaction
    return {
      setStatus: () => {},
      setTag: () => {},
      setData: () => {},
      finish: () => {},
      child: () => this.startTransaction('child')
    };
  }
}

// Export singleton instance
module.exports = new ErrorTracker();