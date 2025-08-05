/**
 * Winston Logger Configuration
 * Provides structured logging for the application
 */

const winston = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');
const path = require('path');

// Create logs directory if it doesn't exist (skip in test environment)
const fs = require('fs');
const logsDir = path.join(__dirname, '../../logs');
if (!fs.existsSync(logsDir) && process.env.NODE_ENV !== 'test') {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Define log levels and colors
const logLevels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4
};

const logColors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'blue'
};

winston.addColors(logColors);

// Custom format for logging
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.printf(({ timestamp, level, message, stack, ...meta }) => {
    let logMessage = `${timestamp} [${level.toUpperCase()}]: ${message}`;
    
    // Add stack trace for errors
    if (stack) {
      logMessage += `\nStack: ${stack}`;
    }
    
    // Add additional metadata
    if (Object.keys(meta).length > 0) {
      logMessage += `\nMeta: ${JSON.stringify(meta, null, 2)}`;
    }
    
    return logMessage;
  })
);

// Console format for development
const consoleFormat = winston.format.combine(
  winston.format.colorize({ all: true }),
  winston.format.timestamp({ format: 'HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, stack, ...meta }) => {
    let logMessage = `${timestamp} [${level}]: ${message}`;
    
    if (stack) {
      logMessage += `\n${stack}`;
    }
    
    if (Object.keys(meta).length > 0) {
      logMessage += `\n${JSON.stringify(meta, null, 2)}`;
    }
    
    return logMessage;
  })
);

// Create transports
const transports = [];

// Console transport for development (but not test to reduce noise)
if (process.env.NODE_ENV !== 'production' && process.env.NODE_ENV !== 'test') {
  transports.push(
    new winston.transports.Console({
      level: 'debug',
      format: consoleFormat
    })
  );
}

// File transport for all logs (skip in test environment)
if (process.env.NODE_ENV !== 'test') {
  transports.push(
    new DailyRotateFile({
      filename: path.join(logsDir, 'application-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '14d',
      format: logFormat,
      level: process.env.LOG_LEVEL || 'info'
    })
  );

  // Error-only file transport
  transports.push(
    new DailyRotateFile({
      filename: path.join(logsDir, 'error-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '14d',
      format: logFormat,
      level: 'error'
    })
  );

  // HTTP requests log file
  transports.push(
    new DailyRotateFile({
      filename: path.join(logsDir, 'http-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '7d',
      format: logFormat,
      level: 'http'
    })
  );
}

// Create the logger
const logger = winston.createLogger({
  levels: logLevels,
  level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
  format: logFormat,
  transports,
  exitOnError: false, // Don't exit on handled exceptions
  handleExceptions: true,
  handleRejections: true
});

// Add request correlation ID support
logger.withCorrelationId = (correlationId) => {
  return logger.child({ correlationId });
};

// Add user context support
logger.withUser = (userId, userRole) => {
  return logger.child({ userId, userRole });
};

// Add request context support
logger.withRequest = (req) => {
  const correlationId = req.headers['x-correlation-id'] || 
                       req.headers['x-request-id'] || 
                       Math.random().toString(36).substring(2, 15);
  
  return logger.child({
    correlationId,
    method: req.method,
    url: req.url,
    userAgent: req.headers['user-agent'],
    ip: req.ip || req.connection.remoteAddress,
    userId: req.user?.id,
    userRole: req.user?.role
  });
};

// Helper methods for common log patterns
logger.logError = (error, context = {}) => {
  logger.error(error.message || error, {
    stack: error.stack,
    ...context
  });
};

logger.logAuth = (action, userId, success, details = {}) => {
  logger.info(`Authentication ${action}`, {
    action,
    userId,
    success,
    ...details
  });
};

logger.logBooking = (action, bookingId, userId, details = {}) => {
  logger.info(`Booking ${action}`, {
    action,
    bookingId,
    userId,
    ...details
  });
};

logger.logDatabase = (operation, collection, details = {}) => {
  logger.debug(`Database ${operation}`, {
    operation,
    collection,
    ...details
  });
};

logger.logEmail = (action, recipient, success, details = {}) => {
  logger.info(`Email ${action}`, {
    action,
    recipient,
    success,
    ...details
  });
};

logger.logSecurity = (event, details = {}) => {
  logger.warn(`Security event: ${event}`, {
    event,
    timestamp: new Date().toISOString(),
    ...details
  });
};

// Performance logging
logger.logPerformance = (operation, duration, details = {}) => {
  const level = duration > 1000 ? 'warn' : 'info';
  logger[level](`Performance: ${operation}`, {
    operation,
    duration: `${duration}ms`,
    ...details
  });
};

// Startup logging
logger.startup = (message, details = {}) => {
  logger.info(`🚀 ${message}`, details);
};

// Health check logging
logger.health = (component, status, details = {}) => {
  const level = status === 'healthy' ? 'info' : 'warn';
  logger[level](`Health check: ${component}`, {
    component,
    status,
    ...details
  });
};

module.exports = logger;