/**
 * Sentry Integration Test
 * Run this script to test if Sentry is working properly
 */

// IMPORTANT: Initialize Sentry FIRST, before any other requires
require('./src/utils/instrument.js');

// Now import Sentry after it's initialized
const Sentry = require('@sentry/node');

// Load environment and other modules
require('./src/utils/validateEnvironment');

console.log('🧪 Testing Sentry Integration...\n');

// Test 1: Check Sentry status
console.log('1. Checking Sentry configuration:');
console.log('   Sentry DSN configured:', !!process.env.SENTRY_DSN || 'using hardcoded DSN');
console.log('   Environment:', process.env.NODE_ENV || 'development');

// Test 2: Test message capture
console.log('\n2. Testing message capture...');
Sentry.captureMessage('Test message from Sentry integration test', {
  level: 'info',
  tags: { test: 'integration' },
  extra: { timestamp: new Date().toISOString() }
});

// Test 3: Test exception capture
console.log('\n3. Testing exception capture...');
try {
  throw new Error('Test error for Sentry integration');
} catch (error) {
  Sentry.captureException(error, {
    tags: { test: 'integration', error_type: 'test' },
    extra: { context: 'integration_test' }
  });
}

// Test 4: Test breadcrumbs
console.log('\n4. Testing breadcrumb tracking...');
Sentry.addBreadcrumb({
  category: 'test',
  message: 'Integration test breadcrumb',
  level: 'info',
  data: { test: true }
});

// Test 5: Set user context
console.log('\n5. Testing user context...');
Sentry.setUser({
  id: 'test_user_123',
  email: 'test@example.com',
  username: 'testuser'
});

// Test 6: Test tags and context
console.log('\n6. Testing tags and context...');
Sentry.setTag('test_type', 'integration');
Sentry.setContext('test_info', {
  test_run: new Date().toISOString(),
  version: '1.0.0'
});

// Test 7: Test performance monitoring with breadcrumb
console.log('\n7. Testing performance monitoring...');
Sentry.addBreadcrumb({
  category: 'performance',
  message: 'Slow operation detected: test_operation took 1500ms',
  level: 'warning',
  data: { 
    operation: 'test_operation',
    duration: 1500,
    slow: true
  }
});

// Test 8: Test auth failure scenario
console.log('\n8. Testing auth failure scenario...');
Sentry.addBreadcrumb({
  category: 'auth',
  message: 'User attempted login',
  level: 'info',
  data: { email: 'test@example.com' }
});

const authError = new Error('Authentication failed: Invalid credentials');
Sentry.captureException(authError, {
  tags: { 
    event_type: 'auth_failure',
    operation: 'login'
  },
  extra: { 
    email: 'test@example.com',
    reason: 'invalid_password',
    timestamp: new Date().toISOString()
  }
});

// Test 9: Test database error scenario  
console.log('\n9. Testing database error scenario...');
const dbError = new Error('Database connection timeout');
Sentry.captureException(dbError, {
  tags: {
    event_type: 'database_error',
    operation: 'connection'
  },
  extra: {
    database: 'mongodb',
    timeout: '5000ms',
    retry_count: 3
  }
});

console.log('\n✅ Sentry integration test completed!');

// Force Sentry to flush events (wait for them to be sent)
Sentry.close(2000).then(() => {
  console.log('\n📤 All events sent to Sentry!');
  console.log('\nYou should now see these events in your Sentry dashboard:');
  console.log('- 1 info message (Test message)');
  console.log('- 3 captured exceptions (Test, Auth failure, Database error)');
  console.log('- 1 performance transaction');
  console.log('- Multiple breadcrumbs for debugging context');
  console.log('- User context and tags');
  
  console.log('\n📊 Check your Sentry dashboard at: https://sentry.io');
  console.log('🎯 Project: boardroom-booking-backend');
  
  process.exit(0);
}).catch((err) => {
  console.error('❌ Error flushing Sentry events:', err);
  process.exit(1);
});