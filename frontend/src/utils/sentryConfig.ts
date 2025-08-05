/**
 * Frontend Sentry Configuration
 * Error tracking and performance monitoring for React application
 */

import { ErrorInfo } from 'react';

// Sentry interfaces for type safety
interface SentryConfig {
  dsn?: string;
  environment?: string;
  tracesSampleRate?: number;
  beforeSend?: (event: any) => any | null;
  integrations?: any[];
  initialScope?: any;
}

interface User {
  id: string;
  email?: string;
  name?: string;
}

interface ErrorContext {
  tags?: Record<string, string>;
  user?: User;
  extra?: Record<string, any>;
  level?: 'error' | 'warning' | 'info' | 'debug';
}

let Sentry: any = null;

// Try to import Sentry if available
try {
  const SentryReact = require('@sentry/react');
  const SentryBrowser = require('@sentry/browser');
  
  Sentry = { ...SentryReact, ...SentryBrowser };
  
  // Initialize Sentry
  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN,
    environment: import.meta.env.VITE_ENVIRONMENT || 'development',
    
    // Performance monitoring
    tracesSampleRate: import.meta.env.VITE_NODE_ENV === 'production' ? 0.1 : 1.0,
    
    // React integration
    integrations: [
      new Sentry.BrowserTracing({
        // Capture interactions like clicks, navigation
        routingInstrumentation: Sentry.reactRouterV6Instrumentation(
          // We'll need to pass React Router history here if using React Router
        ),
      }),
      new Sentry.Replay({
        // Capture 10% of sessions for replay in production
        sessionSampleRate: import.meta.env.VITE_NODE_ENV === 'production' ? 0.1 : 1.0,
        // Capture 100% of sessions with errors for replay
        errorSampleRate: 1.0,
      }),
    ],
    
    // Filter out noise
    beforeSend(event) {
      // Don't send cancelled requests
      if (event.exception?.values?.[0]?.type === 'AbortError') {
        return null;
      }
      
      // Don't send network errors in development
      if (import.meta.env.VITE_NODE_ENV === 'development' && 
          event.exception?.values?.[0]?.type === 'TypeError' &&
          event.exception?.values?.[0]?.value?.includes('fetch')) {
        return null;
      }
      
      return event;
    },
    
    // Initial scope
    initialScope: {
      tags: {
        component: 'boardroom-booking-frontend',
        version: import.meta.env.VITE_APP_VERSION || '1.0.0'
      }
    }
  });
  
  console.log('✅ Sentry initialized for frontend');
} catch (error) {
  // Sentry not available - create mock implementation
  console.warn('⚠️ Sentry not available, using mock implementation', {
    error: (error as Error).message,
    suggestion: 'Run: npm install @sentry/react @sentry/browser'
  });
  
  Sentry = {
    captureException: (error: Error, context?: ErrorContext) => {
      console.error('Sentry Mock - Exception captured', { error: error.message, context });
    },
    captureMessage: (message: string, level?: string, context?: ErrorContext) => {
      console.log('Sentry Mock - Message captured', { message, level, context });
    },
    addBreadcrumb: (breadcrumb: any) => {
      console.debug('Sentry Mock - Breadcrumb added', breadcrumb);
    },
    setUser: (user: User) => {
      console.debug('Sentry Mock - User set', user);
    },
    setTag: (key: string, value: string) => {
      console.debug('Sentry Mock - Tag set', { key, value });
    },
    setContext: (key: string, context: any) => {
      console.debug('Sentry Mock - Context set', { key, context });
    },
    ErrorBoundary: ({ children, fallback }: { children: React.ReactNode; fallback?: React.ComponentType<any> }) => children,
    withErrorBoundary: (component: React.ComponentType, options?: any) => component,
    startTransaction: (context: any) => ({
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
    })
  };
}

/**
 * Enhanced error tracking utility for React
 */
class FrontendErrorTracker {
  private isEnabled: boolean;
  private sentryInstance: any;

  constructor() {
    this.isEnabled = !!import.meta.env.VITE_SENTRY_DSN;
    this.sentryInstance = Sentry;
  }

  /**
   * Capture and log an exception
   */
  captureException(error: Error, context: ErrorContext = {}) {
    // Always log to console in development
    if (import.meta.env.VITE_NODE_ENV === 'development') {
      console.error('Exception captured', {
        error: error.message,
        stack: error.stack,
        context
      });
    }

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
  captureMessage(message: string, level: 'error' | 'warning' | 'info' | 'debug' = 'info', context: ErrorContext = {}) {
    if (import.meta.env.VITE_NODE_ENV === 'development') {
      console[level]('Message captured', { message, context });
    }

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
  addBreadcrumb(breadcrumb: {
    category?: string;
    message: string;
    level?: 'error' | 'warning' | 'info' | 'debug';
    data?: Record<string, any>;
  }) {
    if (import.meta.env.VITE_NODE_ENV === 'development') {
      console.debug('Breadcrumb added', breadcrumb);
    }

    if (this.isEnabled) {
      this.sentryInstance.addBreadcrumb(breadcrumb);
    }
  }

  /**
   * Set user context
   */
  setUser(user: User) {
    if (this.isEnabled) {
      this.sentryInstance.setUser(user);
    }
  }

  /**
   * Add custom context
   */
  setContext(key: string, context: any) {
    if (this.isEnabled) {
      this.sentryInstance.setContext(key, context);
    }
  }

  /**
   * Track authentication events
   */
  trackAuth(event: string, userId?: string, success: boolean = true, details: Record<string, any> = {}) {
    const breadcrumb = {
      category: 'auth',
      message: `Authentication ${event}: ${success ? 'success' : 'failure'}`,
      level: success ? 'info' as const : 'warning' as const,
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
  trackBooking(event: string, userId?: string, bookingId?: string, details: Record<string, any> = {}) {
    const breadcrumb = {
      category: 'booking',
      message: `Booking ${event}`,
      level: 'info' as const,
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
   * Track API errors
   */
  trackApiError(endpoint: string, error: Error, details: Record<string, any> = {}) {
    this.captureException(error, {
      tags: {
        event_type: 'api_error',
        endpoint
      },
      extra: details
    });
  }

  /**
   * Track navigation events
   */
  trackNavigation(from: string, to: string) {
    this.addBreadcrumb({
      category: 'navigation',
      message: `Navigated from ${from} to ${to}`,
      level: 'info',
      data: { from, to }
    });
  }

  /**
   * Track form validation errors
   */
  trackValidationError(formName: string, field: string, error: string) {
    this.addBreadcrumb({
      category: 'validation',
      message: `Validation error in ${formName}: ${field}`,
      level: 'warning',
      data: { formName, field, error }
    });
  }

  /**
   * Track React component errors
   */
  trackReactError(error: Error, errorInfo: ErrorInfo, componentName?: string) {
    this.captureException(error, {
      tags: {
        event_type: 'react_error',
        component: componentName || 'unknown'
      },
      extra: {
        componentStack: errorInfo.componentStack,
        errorBoundary: true
      }
    });
  }

  /**
   * Get Sentry Error Boundary component
   */
  getErrorBoundary() {
    return this.sentryInstance.ErrorBoundary;
  }

  /**
   * Wrap component with error boundary
   */
  withErrorBoundary<P>(
    component: React.ComponentType<P>, 
    options?: {
      fallback?: React.ComponentType<any>;
      beforeCapture?: (error: Error, errorInfo: ErrorInfo) => void;
    }
  ) {
    if (this.isEnabled) {
      return this.sentryInstance.withErrorBoundary(component, {
        fallback: options?.fallback,
        beforeCapture: options?.beforeCapture
      });
    }
    return component;
  }

  /**
   * Get status information
   */
  getStatus() {
    return {
      enabled: this.isEnabled,
      dsn: this.isEnabled ? 'configured' : 'not configured',
      environment: import.meta.env.VITE_NODE_ENV || 'development'
    };
  }

  /**
   * Start a performance transaction
   */
  startTransaction(name: string, op: string = 'navigation') {
    if (this.isEnabled) {
      return this.sentryInstance.startTransaction({ name, op });
    }
    
    // Mock transaction
    return {
      setStatus: () => {},
      setTag: () => {},
      setData: () => {},
      finish: () => {},
      child: (childName: string) => this.startTransaction(childName, 'child')
    };
  }
}

// Export singleton instance
export const errorTracker = new FrontendErrorTracker();

// Export Sentry components for direct use
export const SentryErrorBoundary = Sentry.ErrorBoundary;
export const withSentryErrorBoundary = Sentry.withErrorBoundary;

export default errorTracker;