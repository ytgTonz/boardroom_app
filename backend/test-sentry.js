/**
 * Sentry Integration Test
 * Run this script to test if Sentry is working properly
 */

require('./src/utils/validateEnvironment');
const errorTracker = require('./src/utils/sentryConfig');

console.log('🧪 Testing Sentry Integration...\n');

// Test 1: Check Sentry status
console.log('1. Checking Sentry configuration:');
const status = errorTracker.getStatus();
console.log('   Status:', status);

// Test 2: Test message capture
console.log('\n2. Testing message capture...');
errorTracker.captureMessage('Test message from Sentry integration test', 'info', {
  tags: { test: 'integration' },
  extra: { timestamp: new Date().toISOString() }
});

// Test 3: Test exception capture
console.log('\n3. Testing exception capture...');
try {
  throw new Error('Test error for Sentry integration');
} catch (error) {
  errorTracker.captureException(error, {
    tags: { test: 'integration', error_type: 'test' },
    extra: { context: 'integration_test' }
  });
}

// Test 4: Test breadcrumbs
console.log('\n4. Testing breadcrumb tracking...');
errorTracker.addBreadcrumb({
  category: 'test',
  message: 'Integration test breadcrumb',
  level: 'info',
  data: { test: true }
});

// Test 5: Test auth tracking
console.log('\n5. Testing auth event tracking...');
errorTracker.trackAuth('test_login', 'test_user_123', true, {
  method: 'integration_test'
});

// Test 6: Test auth failure tracking  
console.log('\n6. Testing auth failure tracking...');
errorTracker.trackAuth('test_login', 'test_user_456', false, {
  reason: 'integration_test_failure',
  method: 'test'
});

// Test 7: Test performance tracking
console.log('\n7. Testing performance tracking...');
errorTracker.trackPerformance('test_operation', 1500, {
  operation_type: 'integration_test'
});

// Test 8: Test database error tracking
console.log('\n8. Testing database error tracking...');
const testDbError = new Error('Test database connection error');
errorTracker.trackDatabaseError('test_connection', testDbError, {
  database: 'test_db',
  operation: 'integration_test'
});

console.log('\n✅ Sentry integration test completed!');
console.log('\nIf Sentry is properly configured, you should see these events in your Sentry dashboard:');
console.log('- 1 info message');
console.log('- 3 errors/exceptions');
console.log('- 4 breadcrumbs');
console.log('- 1 successful auth event');
console.log('- 1 failed auth event');
console.log('- 1 performance issue (slow operation)');

console.log('\n📊 Check your Sentry dashboard at: https://sentry.io');