# Logging Guidelines

## Overview
This project uses a structured logging system to maintain clean, professional logs in both development and production environments.

## Frontend Logging

### Logger Utility
Located at: `frontend/src/utils/logger.ts`

**Environment Behavior:**
- **Development**: All log levels visible (DEBUG, INFO, WARN, ERROR)
- **Production**: Only WARN and ERROR levels visible

**Usage Examples:**
```typescript
import { logger } from '../utils/logger';

// Component-specific logging
logger.booking.info('Booking created', { action: 'create', bookingId: '123' });
logger.auth.error('Login failed', { email: 'user@example.com', error });
logger.api.debug('API call', { endpoint: '/bookings', method: 'GET' });

// Performance logging
const timer = logger.timer('fetchBookings');
// ... do work
timer.end(); // Automatically logs duration

// Configuration logging (dev only)
logger.config('App Configuration', { apiUrl, version });
```

**Log Categories:**
- `logger.booking.*` - Booking operations
- `logger.auth.*` - Authentication operations  
- `logger.api.*` - API calls
- `logger.navigation.*` - Navigation events
- `logger.ui.*` - UI interactions

## Backend Logging

### Winston Logger
Located at: `backend/src/utils/logger.js`

**Pre-configured Methods:**
```javascript
const logger = require('../utils/logger');

// Specialized logging methods
logger.logBooking('create', bookingId, userId, details);
logger.logAuth('login', userId, success, details);
logger.logError(error, context);
logger.logEmail('sent', recipient, success, details);
logger.logSecurity('unauthorized_access', details);
logger.logPerformance('database_query', duration, details);

// Standard logging
logger.info('Server started');
logger.error('Database connection failed');
logger.debug('Processing request');
```

**Log Files:**
- `logs/application-YYYY-MM-DD.log` - All logs
- `logs/error-YYYY-MM-DD.log` - Error logs only
- `logs/http-YYYY-MM-DD.log` - HTTP requests

## Development vs Production

### Development Environment
- Full console output with colors
- All log levels visible
- Debug information included
- Configuration details logged

### Production Environment
- File-based logging only
- ERROR and WARN levels only
- Structured JSON format
- No sensitive information

## Test Files

Files marked as development/testing files (e.g., `test-sentry.js`, `test-nodemailer.js`) contain console.log statements for debugging purposes and should not be used in production environments.

## Environment Variables

```bash
# Frontend
VITE_LOG_LEVEL=debug|info|warn|error

# Backend  
LOG_LEVEL=debug|info|warn|error
NODE_ENV=development|production
```

## Migration Notes

All previous `console.log`, `console.error`, `console.warn` statements have been replaced with the structured logging system for:

- ✅ Better production debugging
- ✅ Consistent log format
- ✅ Environment-appropriate verbosity
- ✅ Integration with monitoring systems
- ✅ Performance tracking capabilities

Legacy console statements remain only in development/testing files with appropriate documentation.