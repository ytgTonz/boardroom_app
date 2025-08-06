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
let isInitialized = false;

// Initialize Sentry asynchronously
const initializeSentry = async () => {
  if (isInitialized) return Sentry;
  
  try {
    // Check if Sentry packages are available
    const sentryDsn = import.meta.env.VITE_SENTRY_DSN;
    if (!sentryDsn) {
      console.warn('⚠️ Sentry DSN not configured, using mock implementation');
      return null;
    }

    // Try to dynamically import Sentry
    const SentryModule = await import('@sentry/react');
    Sentry = SentryModule;
    
    // Initialize Sentry
    Sentry.init({
      dsn: sentryDsn,
      environment: import.meta.env.VITE_ENVIRONMENT || 'development',
      
      // Performance monitoring
      tracesSampleRate: import.meta.env.VITE_ENVIRONMENT === 'production' ? 0.1 : 1.0,
      
      // React integration with error boundary
      integrations: [
        new Sentry.BrowserTracing(),
        new Sentry.Replay({
          maskAllText: false,
          blockAllMedia: false,
        }),
      ],
      
      // Filter out unnecessary events
      beforeSend(event: any) {
        // Don't send events in development unless explicitly enabled
        if (import.meta.env.VITE_ENVIRONMENT === 'development' && !import.meta.env.VITE_SENTRY_DEBUG) {
          return null;
        }
        
        // Filter out network errors and other noise
        if (event.exception?.values?.[0]?.type === 'NetworkError') {
          return null;
        }
        
        return event;
      },
      
      // Tag all events with app info
      initialScope: {
        tags: {
          app: 'boardroom-booking-frontend',
          version: import.meta.env.VITE_APP_VERSION || '1.0.0'
        }
      }
    });
    
    isInitialized = true;
    console.log('✅ Sentry initialized successfully');
    return Sentry;
  } catch (error) {
    console.warn('⚠️ Sentry not available, using mock implementation', {
      error: (error as Error).message,
      suggestion: 'Run: npm install @sentry/react @sentry/browser'
    });
    return null;
  }
};

// Mock Sentry implementation for when Sentry is not available
const mockSentry = {
  init: () => {},
  captureException: (error: Error, context?: ErrorContext) => {
    console.error('Sentry Mock - Exception captured', { 
      error: error.message, 
      stack: error.stack,
      context 
    });
  },
  captureMessage: (message: string, level: string = 'info', context?: ErrorContext) => {
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
  withScope: (callback: (scope: any) => void) => {
    const mockScope = {
      setTag: (key: string, value: string) => console.debug('Mock scope tag:', { key, value }),
      setUser: (user: User) => console.debug('Mock scope user:', user),
      setContext: (key: string, context: any) => console.debug('Mock scope context:', { key, context }),
      addBreadcrumb: (breadcrumb: any) => console.debug('Mock scope breadcrumb:', breadcrumb)
    };
    callback(mockScope);
  },
  ErrorBoundary: ({ children, fallback }: { children: React.ReactNode; fallback?: React.ComponentType }) => children,
  getCurrentHub: () => ({
    getScope: () => mockSentry
  })
};

/**
 * Enhanced error tracking utility
 */
class ErrorTracker {
  private sentryInstance: any = null;
  private isReady = false;

  constructor() {
    this.initializeAsync();
  }

  private async initializeAsync() {
    this.sentryInstance = await initializeSentry() || mockSentry;
    this.isReady = true;
  }

  private async ensureReady() {
    if (!this.isReady) {
      await this.initializeAsync();
    }
    return this.sentryInstance || mockSentry;
  }

  /**
   * Capture and log an exception
   */
  async captureException(error: Error, context: ErrorContext = {}) {
    const sentry = await this.ensureReady();
    
    // Always log to console for development
    console.error('Exception captured:', {
      error: error.message,
      stack: error.stack,
      context
    });

    sentry.captureException(error, context);
  }

  /**
   * Capture a message with context
   */
  async captureMessage(message: string, level: string = 'info', context: ErrorContext = {}) {
    const sentry = await this.ensureReady();
    
    console.log('Message captured:', { message, level, context });
    sentry.captureMessage(message, level, context);
  }

  /**
   * Add breadcrumb for debugging
   */
  async addBreadcrumb(breadcrumb: any) {
    const sentry = await this.ensureReady();
    sentry.addBreadcrumb(breadcrumb);
  }

  /**
   * Set user context
   */
  async setUser(user: User) {
    const sentry = await this.ensureReady();
    sentry.setUser(user);
  }

  /**
   * Add custom context
   */
  async setContext(key: string, context: any) {
    const sentry = await this.ensureReady();
    sentry.setContext(key, context);
  }

  /**
   * Track API errors
   */
  async trackApiError(endpoint: string, error: Error, details: any = {}) {
    await this.addBreadcrumb({
      category: 'api',
      message: `API Error: ${endpoint}`,
      level: 'error',
      data: {
        endpoint,
        error: error.message,
        ...details
      }
    });

    await this.captureException(error, {
      tags: {
        event_type: 'api_error',
        endpoint
      },
      extra: details
    });
  }

  /**
   * Track authentication events
   */
  async trackAuth(event: string, userId: string | null, success: boolean, details: any = {}) {
    await this.addBreadcrumb({
      category: 'auth',
      message: `Authentication ${event}: ${success ? 'success' : 'failure'}`,
      level: success ? 'info' : 'warning',
      data: {
        userId,
        event,
        success,
        ...details
      }
    });

    if (!success) {
      await this.captureMessage(`Authentication failure: ${event}`, 'warning', {
        tags: { event_type: 'auth_failure' },
        extra: { userId, event, ...details }
      });
    }
  }

  /**
   * Get status information
   */
  getStatus() {
    return {
      enabled: isInitialized && !!Sentry,
      dsn: import.meta.env.VITE_SENTRY_DSN ? 'configured' : 'not configured',
      environment: import.meta.env.VITE_ENVIRONMENT || 'development',
      ready: this.isReady
    };
  }

  /**
   * React Error Boundary component
   */
  get ErrorBoundary() {
    return this.sentryInstance?.ErrorBoundary || mockSentry.ErrorBoundary;
  }

  /**
   * Capture React error boundary errors
   */
  async captureReactError(error: Error, errorInfo: ErrorInfo, componentStack?: string) {
    await this.captureException(error, {
      tags: {
        event_type: 'react_error_boundary'
      },
      extra: {
        componentStack: errorInfo.componentStack || componentStack,
        errorBoundary: true
      }
    });
  }
}

// Export singleton instance
export const errorTracker = new ErrorTracker();

// Also export the class for advanced usage
export { ErrorTracker };

// Initialize Sentry and export for direct usage if needed
export const getSentryInstance = async () => {
  return await initializeSentry() || mockSentry;
};

export default errorTracker;