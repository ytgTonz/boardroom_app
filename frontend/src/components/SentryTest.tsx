/**
 * Sentry Integration Test Component
 * Use this component to test frontend Sentry integration
 */

import React, { useState } from 'react';
import { errorTracker } from '../utils/sentryConfig';

const SentryTest: React.FC = () => {
  const [testResults, setTestResults] = useState<string[]>([]);

  const addResult = (message: string) => {
    setTestResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const runTests = async () => {
    setTestResults([]);
    addResult('🧪 Starting Sentry integration tests...');

    // Test 1: Check status
    const status = errorTracker.getStatus();
    addResult(`✅ Sentry status: ${status.enabled ? 'Enabled' : 'Disabled'} (${status.environment})`);

    // Test 2: Test message capture
    errorTracker.captureMessage('Test message from frontend', 'info', {
      tags: { test: 'frontend_integration' }
    });
    addResult('✅ Message captured');

    // Test 3: Test exception capture
    try {
      throw new Error('Test frontend error');
    } catch (error) {
      errorTracker.captureException(error as Error, {
        tags: { test: 'frontend_integration', component: 'SentryTest' }
      });
      addResult('✅ Exception captured');
    }

    // Test 4: Test breadcrumbs
    errorTracker.addBreadcrumb({
      category: 'test',
      message: 'Frontend test breadcrumb',
      level: 'info',
      data: { component: 'SentryTest' }
    });
    addResult('✅ Breadcrumb added');

    // Test 5: Test auth tracking
    errorTracker.trackAuth('test_login', 'frontend_user_123', true);
    addResult('✅ Auth success tracked');

    // Test 6: Test auth failure
    errorTracker.trackAuth('test_login', 'frontend_user_456', false, {
      reason: 'invalid_credentials'
    });
    addResult('✅ Auth failure tracked');

    // Test 7: Test API error
    const apiError = new Error('Test API error');
    errorTracker.trackApiError('/api/test', apiError, {
      status: 500,
      method: 'POST'
    });
    addResult('✅ API error tracked');

    // Test 8: Test navigation
    errorTracker.trackNavigation('/test', '/sentry-test');
    addResult('✅ Navigation tracked');

    // Test 9: Test validation error
    errorTracker.trackValidationError('test-form', 'email', 'Invalid email format');
    addResult('✅ Validation error tracked');

    // Test 10: Test performance transaction
    const transaction = errorTracker.startTransaction('test-operation', 'test');
    setTimeout(() => {
      transaction.setTag('test', 'frontend');
      transaction.setData('duration', '100ms');
      transaction.finish();
      addResult('✅ Performance transaction completed');
    }, 100);

    addResult('🎉 All tests completed! Check your Sentry dashboard.');
  };

  const triggerError = () => {
    // This will be caught by error boundary
    throw new Error('Intentional error to test error boundary');
  };

  const triggerAsyncError = async () => {
    try {
      // Simulate async operation that fails
      await new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Async operation failed')), 1000);
      });
    } catch (error) {
      errorTracker.captureException(error as Error, {
        tags: { test: 'async_error' },
        extra: { operation: 'simulated_async_operation' }
      });
      addResult('❌ Async error captured');
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">Sentry Integration Test</h2>
      
      <div className="mb-6">
        <p className="text-gray-600 mb-4">
          Use this component to test if Sentry error tracking is working properly.
          After running tests, check your Sentry dashboard for captured events.
        </p>
        
        <div className="flex gap-4 mb-4">
          <button
            onClick={runTests}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
          >
            Run Integration Tests
          </button>
          
          <button
            onClick={triggerError}
            className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
          >
            Trigger Error (Error Boundary)
          </button>
          
          <button
            onClick={triggerAsyncError}
            className="px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600 transition-colors"
          >
            Trigger Async Error
          </button>
        </div>
      </div>

      {testResults.length > 0 && (
        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="text-lg font-semibold mb-3 text-gray-800">Test Results:</h3>
          <div className="space-y-1">
            {testResults.map((result, index) => (
              <div key={index} className="text-sm font-mono text-gray-700">
                {result}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-6 p-4 bg-blue-50 rounded-lg">
        <h3 className="text-lg font-semibold mb-2 text-blue-800">How to Verify:</h3>
        <ol className="list-decimal list-inside space-y-1 text-blue-700">
          <li>Run the integration tests above</li>
          <li>Go to your Sentry dashboard: <code className="bg-blue-100 px-1 rounded">https://sentry.io</code></li>
          <li>Navigate to your project</li>
          <li>Check the "Issues" tab for captured errors</li>
          <li>Check the "Performance" tab for transactions</li>
          <li>Look for breadcrumbs in error details</li>
        </ol>
      </div>

      <div className="mt-4 p-4 bg-yellow-50 rounded-lg">
        <h3 className="text-lg font-semibold mb-2 text-yellow-800">Environment Configuration:</h3>
        <div className="text-sm space-y-1 text-yellow-700">
          <p><strong>Sentry Status:</strong> {errorTracker.getStatus().enabled ? '✅ Enabled' : '❌ Disabled'}</p>
          <p><strong>Environment:</strong> {import.meta.env.VITE_ENVIRONMENT || 'development'}</p>
          <p><strong>DSN Configured:</strong> {import.meta.env.VITE_SENTRY_DSN ? '✅ Yes' : '❌ No'}</p>
        </div>
      </div>
    </div>
  );
};

export default SentryTest;