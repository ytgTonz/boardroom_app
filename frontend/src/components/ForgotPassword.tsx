import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import { Mail, ArrowLeft, Check, AlertCircle } from 'lucide-react';
import { api } from '../services/api';
import { errorTracker } from '../utils/sentryConfig';
import { useFormValidation, validationRules } from '../hooks/useFormValidation';
import FormField from './FormField';

const ForgotPassword: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const {
    values,
    errors,
    isValid,
    getFieldProps,
    getFieldError,
    validateForm
  } = useFormValidation({
    email: {
      ...validationRules.required('Email address is required'),
      ...validationRules.email('Please enter a valid email address')
    }
  }, {
    validateOnChange: true,
    validateOnBlur: true,
    debounceMs: 300
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);

    try {
      await api.post('/auth/forgot-password', { 
        email: email.toLowerCase().trim() 
      });

      setIsSubmitted(true);
      toast.success('Password reset instructions have been sent to your email');
      
      errorTracker.addBreadcrumb({
        category: 'auth',
        message: 'Password reset requested',
        level: 'info',
        data: { email: '[REDACTED]' }
      });

    } catch (error: any) {
      console.error('Forgot password error:', error);
      
      const errorMessage = error.response?.data?.message || 'Failed to send reset email';
      
      if (error.response?.status === 404) {
        setErrors({ email: 'No account found with this email address' });
      } else {
        toast.error(errorMessage);
      }

      errorTracker.captureException(error, {
        tags: { 
          component: 'ForgotPassword',
          operation: 'requestReset'
        },
        extra: {
          email: '[REDACTED]',
          status: error.response?.status
        }
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isSubmitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <div className="mx-auto h-16 w-16 bg-green-100 rounded-full flex items-center justify-center mb-6">
              <Check className="h-8 w-8 text-green-600" />
            </div>
            
            <h2 className="text-3xl font-extrabold text-gray-900 mb-2">
              Check your email
            </h2>
            
            <p className="text-gray-600 mb-8">
              We've sent password reset instructions to{' '}
              <span className="font-medium text-gray-900">{email}</span>
            </p>

            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-left">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <Mail className="h-5 w-5 text-blue-400" />
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-blue-800">
                      What's next?
                    </h3>
                    <div className="mt-2 text-sm text-blue-700">
                      <ul className="list-disc pl-5 space-y-1">
                        <li>Check your email inbox (and spam folder)</li>
                        <li>Click the reset link in the email</li>
                        <li>Create a new password</li>
                        <li>Sign in with your new password</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={() => {
                    setIsSubmitted(false);
                    setEmail('');
                  }}
                  className="flex-1 inline-flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                >
                  Send another email
                </button>
                
                <Link
                  to="/login"
                  className="flex-1 inline-flex items-center justify-center px-4 py-2 bg-primary-600 border border-transparent rounded-md shadow-sm text-sm font-medium text-white hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                >
                  Back to login
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <Link
            to="/login"
            className="inline-flex items-center text-sm text-primary-600 hover:text-primary-700 mb-6"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to login
          </Link>
          
          <div className="text-center">
            <h2 className="text-3xl font-extrabold text-gray-900">
              Forgot your password?
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              Don't worry! Enter your email address and we'll send you instructions to reset your password.
            </p>
          </div>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="email" className="sr-only">
              Email address
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Mail className="h-5 w-5 text-gray-400" />
              </div>
              <input
                id="email"
                name="email"
                type="email"
                value={email}
                onChange={handleEmailChange}
                required
                className={`block w-full pl-10 pr-3 py-3 border rounded-lg placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 sm:text-sm ${
                  errors.email 
                    ? 'border-red-300 bg-red-50' 
                    : 'border-gray-300'
                }`}
                placeholder="Enter your email address"
                aria-invalid={errors.email ? 'true' : 'false'}
                aria-describedby={errors.email ? 'email-error' : undefined}
              />
            </div>
            
            {errors.email && (
              <div
                id="email-error"
                className="mt-2 flex items-center text-sm text-red-600"
                role="alert"
              >
                <AlertCircle className="w-4 h-4 mr-2 flex-shrink-0" />
                <span>{errors.email}</span>
              </div>
            )}
          </div>

          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Sending reset email...
                </>
              ) : (
                <>
                  <Mail className="w-4 h-4 mr-2" />
                  Send reset instructions
                </>
              )}
            </button>
          </div>

          <div className="text-center text-sm">
            <p className="text-gray-600">
              Remember your password?{' '}
              <Link
                to="/login"
                className="font-medium text-primary-600 hover:text-primary-500"
              >
                Sign in
              </Link>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ForgotPassword;