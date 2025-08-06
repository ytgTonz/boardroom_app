import { toast } from 'react-toastify';
import { errorTracker } from './sentryConfig';

export interface ErrorContext {
  component: string;
  operation: string;
  userId?: string;
  additionalData?: Record<string, any>;
}

export interface ErrorDetails {
  message: string;
  type: 'user' | 'system' | 'network' | 'validation';
  shouldRetry: boolean;
  statusCode?: number;
}

/**
 * Analyzes an error and returns user-friendly message and context
 */
export const analyzeError = (error: any): ErrorDetails => {
  if (!error) {
    return {
      message: 'An unexpected error occurred',
      type: 'system',
      shouldRetry: false
    };
  }

  // Network errors
  if (error.code === 'NETWORK_ERROR' || !error.response) {
    return {
      message: 'Network connection error. Please check your internet connection and try again.',
      type: 'network',
      shouldRetry: true
    };
  }

  const status = error.response?.status;
  const serverMessage = error.response?.data?.message || '';

  switch (status) {
    case 400:
      return {
        message: serverMessage || 'Invalid request. Please check your input and try again.',
        type: 'validation',
        shouldRetry: false,
        statusCode: 400
      };

    case 401:
      return {
        message: 'Your session has expired. Please log in again.',
        type: 'user',
        shouldRetry: false,
        statusCode: 401
      };

    case 403:
      return {
        message: 'You do not have permission to perform this action.',
        type: 'user',
        shouldRetry: false,
        statusCode: 403
      };

    case 404:
      return {
        message: serverMessage || 'The requested resource was not found.',
        type: 'user',
        shouldRetry: false,
        statusCode: 404
      };

    case 409:
      return {
        message: serverMessage || 'Conflict: The resource already exists or is being used.',
        type: 'user',
        shouldRetry: false,
        statusCode: 409
      };

    case 422:
      return {
        message: serverMessage || 'Validation failed. Please check your input.',
        type: 'validation',
        shouldRetry: false,
        statusCode: 422
      };

    case 429:
      return {
        message: 'Too many requests. Please wait a moment and try again.',
        type: 'system',
        shouldRetry: true,
        statusCode: 429
      };

    case 500:
    case 501:
    case 502:
    case 503:
    case 504:
      return {
        message: 'Server error occurred. Please try again or contact support if the problem persists.',
        type: 'system',
        shouldRetry: true,
        statusCode: status
      };

    default:
      return {
        message: serverMessage || error.message || 'An unexpected error occurred',
        type: 'system',
        shouldRetry: false,
        statusCode: status
      };
  }
};

/**
 * Handles errors consistently across the application
 */
export const handleError = (error: any, context: ErrorContext, options: {
  showToast?: boolean;
  logToSentry?: boolean;
  customMessage?: string;
} = {}) => {
  const {
    showToast = true,
    logToSentry = true,
    customMessage
  } = options;

  const errorDetails = analyzeError(error);
  const displayMessage = customMessage || errorDetails.message;

  // Show toast notification
  if (showToast) {
    switch (errorDetails.type) {
      case 'network':
        toast.error(displayMessage, {
          toastId: 'network-error', // Prevent duplicate network error toasts
          autoClose: 5000
        });
        break;
      case 'validation':
        toast.warn(displayMessage, {
          autoClose: 4000
        });
        break;
      case 'user':
        toast.info(displayMessage, {
          autoClose: 4000
        });
        break;
      case 'system':
      default:
        toast.error(displayMessage, {
          autoClose: 6000
        });
        break;
    }
  }

  // Log to Sentry for system errors or network issues
  if (logToSentry && (errorDetails.type === 'system' || errorDetails.statusCode! >= 500)) {
    errorTracker.captureException(error, {
      tags: {
        component: context.component,
        operation: context.operation,
        errorType: errorDetails.type,
        statusCode: errorDetails.statusCode?.toString()
      },
      user: context.userId ? { id: context.userId } : undefined,
      extra: {
        errorDetails,
        additionalData: context.additionalData,
        shouldRetry: errorDetails.shouldRetry
      }
    });
  }

  // Console log for development
  console.error(`[${context.component}:${context.operation}]`, {
    error,
    errorDetails,
    context
  });

  return errorDetails;
};

/**
 * Specific error handlers for common scenarios
 */
export const errorHandlers = {
  /**
   * Handle authentication errors
   */
  auth: (error: any, operation: string) => handleError(error, {
    component: 'Authentication',
    operation
  }),

  /**
   * Handle API call errors
   */
  api: (error: any, endpoint: string, method: string = 'GET') => handleError(error, {
    component: 'API',
    operation: `${method} ${endpoint}`
  }),

  /**
   * Handle booking-related errors
   */
  booking: (error: any, operation: string, bookingData?: any) => handleError(error, {
    component: 'Booking',
    operation,
    additionalData: bookingData ? { bookingData } : undefined
  }),

  /**
   * Handle form validation errors
   */
  form: (error: any, formName: string, formData?: any) => handleError(error, {
    component: 'Form',
    operation: formName,
    additionalData: formData ? { formData } : undefined
  }, {
    showToast: true,
    logToSentry: false // Form errors usually don't need Sentry logging
  }),

  /**
   * Handle user profile errors
   */
  profile: (error: any, operation: string, userId?: string) => handleError(error, {
    component: 'UserProfile',
    operation,
    userId
  })
};

/**
 * Enhanced error messages for specific contexts
 */
export const contextualErrorMessages = {
  booking: {
    conflict: 'This time slot is no longer available. Another booking was created while you were filling out the form.',
    workingHours: 'Bookings are only allowed during working hours (7:00 AM to 4:00 PM, Monday to Friday).',
    minimumDuration: 'Bookings must be at least 30 minutes long.',
    pastTime: 'Cannot book a room in the past. Please select a future date and time.',
    boardroomUnavailable: 'The selected boardroom is currently unavailable or under maintenance.',
    attendeeLimit: 'The number of attendees exceeds the boardroom capacity.',
    duplicateBooking: 'You already have a booking during this time period.'
  },
  auth: {
    sessionExpired: 'Your session has expired for security reasons. Please log in again.',
    invalidCredentials: 'Invalid email or password. Please check your credentials and try again.',
    accountLocked: 'Your account has been temporarily locked due to multiple failed login attempts.',
    emailNotVerified: 'Please verify your email address before logging in.',
    accountNotFound: 'No account found with this email address.'
  },
  network: {
    offline: 'You appear to be offline. Please check your internet connection.',
    timeout: 'The request timed out. Please try again.',
    serverUnavailable: 'Our servers are temporarily unavailable. Please try again in a few minutes.'
  }
};

export default handleError;