import React, { Component, ErrorInfo, ReactNode } from 'react';

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  componentName?: string;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error details
    console.error('🚨 React Error Boundary caught an error:', {
      component: this.props.componentName || 'Unknown',
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString()
    });

    // Update state with error info
    this.setState({
      error,
      errorInfo
    });

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // In production, you might want to send this to an error reporting service
    if (import.meta.env.PROD) {
      this.reportErrorToService(error, errorInfo);
    }
  }

  private reportErrorToService = (error: Error, errorInfo: ErrorInfo) => {
    // TODO: Integrate with error reporting service (e.g., Sentry, LogRocket)
    // Example:
    // Sentry.captureException(error, {
    //   contexts: {
    //     react: {
    //       componentStack: errorInfo.componentStack,
    //       component: this.props.componentName
    //     }
    //   }
    // });
    
    console.log('📊 Error would be sent to monitoring service:', {
      error: error.message,
      component: this.props.componentName,
      timestamp: new Date().toISOString()
    });
  };

  private handleRetry = () => {
    this.setState({ 
      hasError: false, 
      error: undefined, 
      errorInfo: undefined 
    });
  };

  private handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      // If a custom fallback is provided, use it
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
          <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-6">
            <div className="text-center">
              <div className="text-red-500 mb-4">
                <svg className="mx-auto h-16 w-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.268 15.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                Oops! Something went wrong
              </h2>
              
              <p className="text-gray-600 mb-6">
                {this.props.componentName 
                  ? `An error occurred in the ${this.props.componentName} component. `
                  : 'An unexpected error occurred. '
                }
                We've been notified and are working to fix this issue.
              </p>

              {/* Show error details in development */}
              {import.meta.env.DEV && this.state.error && (
                <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6 text-left">
                  <h3 className="font-medium text-red-800 mb-2">Error Details (Development)</h3>
                  <p className="text-sm text-red-700 font-mono mb-2">
                    {this.state.error.message}
                  </p>
                  {this.state.error.stack && (
                    <details className="text-xs text-red-600">
                      <summary className="cursor-pointer">Stack Trace</summary>
                      <pre className="mt-2 whitespace-pre-wrap">{this.state.error.stack}</pre>
                    </details>
                  )}
                </div>
              )}

              <div className="space-y-3">
                <button
                  onClick={this.handleRetry}
                  className="w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors duration-200"
                >
                  Try Again
                </button>
                
                <button
                  onClick={this.handleReload}
                  className="w-full bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 transition-colors duration-200"
                >
                  Reload Page
                </button>
                
                <button
                  onClick={() => window.history.back()}
                  className="w-full bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400 transition-colors duration-200"
                >
                  Go Back
                </button>
              </div>

              <p className="text-xs text-gray-500 mt-6">
                Error ID: {Date.now().toString(36)}
              </p>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;