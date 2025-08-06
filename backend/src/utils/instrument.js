// Import with `import * as Sentry from "@sentry/node"` if you are using ESM
const Sentry = require("@sentry/node");

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV || 'development',
  
  // Performance monitoring
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  
  // Setting this option to true will send default PII data to Sentry.
  // For example, automatic IP address collection on events
  sendDefaultPii: true,
  
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
    }
  }
});