/**
 * Frontend Logger Utility
 * Provides structured, environment-aware logging for the frontend application
 */

export enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3
}

export interface LogContext {
  component?: string;
  action?: string;
  userId?: string;
  correlationId?: string;
  duration?: number;
  error?: Error;
  [key: string]: any;
}

class Logger {
  private level: LogLevel;
  private isProduction: boolean;
  private isDevelopment: boolean;

  constructor() {
    this.isProduction = import.meta.env.PROD;
    this.isDevelopment = import.meta.env.DEV;
    
    // Set log level based on environment
    if (this.isProduction) {
      this.level = LogLevel.WARN; // Only warnings and errors in production
    } else {
      this.level = LogLevel.DEBUG; // All logs in development
    }

    // Override with environment variable if provided
    const envLogLevel = import.meta.env.VITE_LOG_LEVEL;
    if (envLogLevel) {
      this.level = this.parseLogLevel(envLogLevel);
    }
  }

  private parseLogLevel(level: string): LogLevel {
    switch (level.toLowerCase()) {
      case 'error': return LogLevel.ERROR;
      case 'warn': return LogLevel.WARN;
      case 'info': return LogLevel.INFO;
      case 'debug': return LogLevel.DEBUG;
      default: return LogLevel.INFO;
    }
  }

  private shouldLog(level: LogLevel): boolean {
    return level <= this.level;
  }

  private formatMessage(level: string, message: string, context?: LogContext): string {
    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [${level.toUpperCase()}]`;
    
    if (context?.component) {
      return `${prefix} [${context.component}]: ${message}`;
    }
    
    return `${prefix}: ${message}`;
  }

  private log(level: LogLevel, levelName: string, message: string, context?: LogContext): void {
    if (!this.shouldLog(level)) {
      return;
    }

    const formattedMessage = this.formatMessage(levelName, message, context);
    const logMethod = level === LogLevel.ERROR ? 'error' : 
                     level === LogLevel.WARN ? 'warn' : 'log';

    if (context && Object.keys(context).length > 0) {
      console[logMethod](formattedMessage, context);
    } else {
      console[logMethod](formattedMessage);
    }

    // Send errors to Sentry in production
    if (level === LogLevel.ERROR && this.isProduction && context?.error) {
      // Integrate with existing Sentry setup
      if (window.Sentry) {
        window.Sentry.captureException(context.error, {
          extra: context,
          tags: {
            component: context.component,
            action: context.action
          }
        });
      }
    }
  }

  error(message: string, context?: LogContext): void {
    this.log(LogLevel.ERROR, 'ERROR', message, context);
  }

  warn(message: string, context?: LogContext): void {
    this.log(LogLevel.WARN, 'WARN', message, context);
  }

  info(message: string, context?: LogContext): void {
    this.log(LogLevel.INFO, 'INFO', message, context);
  }

  debug(message: string, context?: LogContext): void {
    this.log(LogLevel.DEBUG, 'DEBUG', message, context);
  }

  // Specialized logging methods for different categories
  booking = {
    debug: (message: string, context?: Omit<LogContext, 'component'>) => 
      this.debug(message, { ...context, component: 'Booking' }),
    info: (message: string, context?: Omit<LogContext, 'component'>) => 
      this.info(message, { ...context, component: 'Booking' }),
    warn: (message: string, context?: Omit<LogContext, 'component'>) => 
      this.warn(message, { ...context, component: 'Booking' }),
    error: (message: string, context?: Omit<LogContext, 'component'>) => 
      this.error(message, { ...context, component: 'Booking' })
  };

  auth = {
    debug: (message: string, context?: Omit<LogContext, 'component'>) => 
      this.debug(message, { ...context, component: 'Auth' }),
    info: (message: string, context?: Omit<LogContext, 'component'>) => 
      this.info(message, { ...context, component: 'Auth' }),
    warn: (message: string, context?: Omit<LogContext, 'component'>) => 
      this.warn(message, { ...context, component: 'Auth' }),
    error: (message: string, context?: Omit<LogContext, 'component'>) => 
      this.error(message, { ...context, component: 'Auth' })
  };

  api = {
    debug: (message: string, context?: Omit<LogContext, 'component'>) => 
      this.debug(message, { ...context, component: 'API' }),
    info: (message: string, context?: Omit<LogContext, 'component'>) => 
      this.info(message, { ...context, component: 'API' }),
    warn: (message: string, context?: Omit<LogContext, 'component'>) => 
      this.warn(message, { ...context, component: 'API' }),
    error: (message: string, context?: Omit<LogContext, 'component'>) => 
      this.error(message, { ...context, component: 'API' })
  };

  navigation = {
    debug: (message: string, context?: Omit<LogContext, 'component'>) => 
      this.debug(message, { ...context, component: 'Navigation' }),
    info: (message: string, context?: Omit<LogContext, 'component'>) => 
      this.info(message, { ...context, component: 'Navigation' }),
    warn: (message: string, context?: Omit<LogContext, 'component'>) => 
      this.warn(message, { ...context, component: 'Navigation' }),
    error: (message: string, context?: Omit<LogContext, 'component'>) => 
      this.error(message, { ...context, component: 'Navigation' })
  };

  ui = {
    debug: (message: string, context?: Omit<LogContext, 'component'>) => 
      this.debug(message, { ...context, component: 'UI' }),
    info: (message: string, context?: Omit<LogContext, 'component'>) => 
      this.info(message, { ...context, component: 'UI' }),
    warn: (message: string, context?: Omit<LogContext, 'component'>) => 
      this.warn(message, { ...context, component: 'UI' }),
    error: (message: string, context?: Omit<LogContext, 'component'>) => 
      this.error(message, { ...context, component: 'UI' })
  };

  // Performance logging
  performance(operation: string, duration: number, context?: LogContext): void {
    const level = duration > 1000 ? LogLevel.WARN : LogLevel.INFO;
    const message = `Performance: ${operation}`;
    const performanceContext = {
      ...context,
      component: context?.component || 'Performance',
      duration: `${duration}ms`,
      action: 'performance_measurement'
    };

    if (level === LogLevel.WARN) {
      this.warn(message, performanceContext);
    } else {
      this.info(message, performanceContext);
    }
  }

  // Timer utility for performance logging
  timer(operation: string, context?: LogContext) {
    const startTime = performance.now();
    return {
      end: () => {
        const duration = performance.now() - startTime;
        this.performance(operation, duration, context);
        return duration;
      }
    };
  }

  // Configuration info logging (for startup/debugging)
  config(message: string, config: Record<string, any>): void {
    if (this.isDevelopment) {
      this.info(message, { 
        component: 'Config',
        action: 'configuration',
        ...config 
      });
    }
  }

  // Health check logging
  health(component: string, status: 'healthy' | 'degraded' | 'unhealthy', details?: Record<string, any>): void {
    const message = `Health check: ${component}`;
    const healthContext = {
      component: 'Health',
      action: 'health_check',
      healthComponent: component,
      status,
      ...details
    };

    if (status === 'healthy') {
      this.info(message, healthContext);
    } else {
      this.warn(message, healthContext);
    }
  }

  // Get current log level for debugging
  getLogLevel(): string {
    return LogLevel[this.level];
  }

  // Check if logger would log at a specific level
  isLoggingLevel(level: LogLevel): boolean {
    return this.shouldLog(level);
  }
}

// Create and export singleton instance
export const logger = new Logger();

// Export logger instance as default
export default logger;

// Type declarations for global Sentry (if available)
declare global {
  interface Window {
    Sentry?: {
      captureException: (error: Error, context?: any) => void;
    };
  }
}