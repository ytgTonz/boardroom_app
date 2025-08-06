import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AlertCircle, Home, RefreshCw, ArrowLeft } from 'lucide-react';

interface ErrorPageProps {
  title?: string;
  message?: string;
  errorCode?: string | number;
  showRefresh?: boolean;
  showGoBack?: boolean;
  canRetry?: boolean;
  onRetry?: () => void;
}

const ErrorPage: React.FC<ErrorPageProps> = ({
  title = "Something went wrong",
  message = "We're sorry, but something unexpected happened. Please try again or contact support if the problem persists.",
  errorCode,
  showRefresh = true,
  showGoBack = true,
  canRetry = false,
  onRetry
}) => {
  const navigate = useNavigate();

  const handleRefresh = () => {
    window.location.reload();
  };

  const handleGoBack = () => {
    navigate(-1);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        {/* Error Icon */}
        <div className="mb-8">
          <AlertCircle className="mx-auto h-24 w-24 text-red-400" />
        </div>

        {/* Error Content */}
        <div className="mb-8">
          {errorCode && (
            <div className="text-6xl font-bold text-gray-300 mb-4">
              {errorCode}
            </div>
          )}
          <h1 className="text-2xl font-semibold text-gray-700 mb-4">
            {title}
          </h1>
          <p className="text-gray-600 mb-8">
            {message}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            {canRetry && onRetry && (
              <button
                onClick={onRetry}
                className="inline-flex items-center justify-center px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
                aria-label="Retry the operation"
              >
                <RefreshCw className="w-5 h-5 mr-2" />
                Try Again
              </button>
            )}

            {showRefresh && (
              <button
                onClick={handleRefresh}
                className="inline-flex items-center justify-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                aria-label="Refresh the page"
              >
                <RefreshCw className="w-5 h-5 mr-2" />
                Refresh Page
              </button>
            )}

            <Link
              to="/"
              className="inline-flex items-center justify-center px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
              aria-label="Go to home page"
            >
              <Home className="w-5 h-5 mr-2" />
              Go Home
            </Link>

            {showGoBack && (
              <button
                onClick={handleGoBack}
                className="inline-flex items-center justify-center px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
                aria-label="Go back to previous page"
              >
                <ArrowLeft className="w-5 h-5 mr-2" />
                Go Back
              </button>
            )}
          </div>
        </div>

        {/* Additional Help */}
        <div className="mt-8 pt-8 border-t border-gray-200">
          <div className="text-sm text-gray-500">
            <p className="mb-2">
              Error details have been logged for our technical team.
            </p>
            <p>
              If this problem persists, please{' '}
              <Link
                to="/"
                className="text-primary-600 hover:text-primary-700 underline"
              >
                contact support
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ErrorPage;