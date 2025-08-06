import React, { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { Lock, Eye, EyeOff, CheckCircle, AlertCircle } from 'lucide-react';
import { api } from '../services/api';
import { errorTracker } from '../utils/sentryConfig';

const ResetPassword: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isValidating, setIsValidating] = useState(true);
  const [tokenValid, setTokenValid] = useState(false);
  const [errors, setErrors] = useState<{
    password?: string;
    confirmPassword?: string;
    token?: string;
  }>({});

  useEffect(() => {
    validateToken();
  }, [token]);

  const validateToken = async () => {
    if (!token) {
      setErrors({ token: 'Reset token is missing' });
      setIsValidating(false);
      return;
    }

    try {
      await api.post('/auth/validate-reset-token', { token });
      setTokenValid(true);
    } catch (error: any) {
      console.error('Token validation error:', error);
      
      const errorMessage = error.response?.data?.message || 'Invalid or expired reset token';
      setErrors({ token: errorMessage });
      
      errorTracker.captureException(error, {
        tags: { 
          component: 'ResetPassword',
          operation: 'validateToken'
        }
      });
    } finally {
      setIsValidating(false);
    }
  };

  const validatePassword = (password: string) => {
    if (!password) {
      return 'Password is required';
    }
    
    if (password.length < 6) {
      return 'Password must be at least 6 characters long';
    }
    
    // Check for at least one letter and one number
    if (!/(?=.*[a-zA-Z])(?=.*\d)/.test(password)) {
      return 'Password must contain at least one letter and one number';
    }
    
    return null;
  };

  const validateConfirmPassword = (password: string, confirmPassword: string) => {
    if (!confirmPassword) {
      return 'Please confirm your password';
    }
    
    if (password !== confirmPassword) {
      return 'Passwords do not match';
    }
    
    return null;
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newPassword = e.target.value;
    setPassword(newPassword);
    
    // Clear password error if user starts typing
    if (errors.password) {
      setErrors(prev => ({ ...prev, password: undefined }));
    }
    
    // Validate confirm password if it's already entered
    if (confirmPassword) {
      const confirmError = validateConfirmPassword(newPassword, confirmPassword);
      setErrors(prev => ({ ...prev, confirmPassword: confirmError || undefined }));
    }
  };

  const handleConfirmPasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newConfirmPassword = e.target.value;
    setConfirmPassword(newConfirmPassword);
    
    // Clear confirm password error if user starts typing
    if (errors.confirmPassword) {
      setErrors(prev => ({ ...prev, confirmPassword: undefined }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate inputs
    const passwordError = validatePassword(password);
    const confirmPasswordError = validateConfirmPassword(password, confirmPassword);
    
    if (passwordError || confirmPasswordError) {
      setErrors({
        password: passwordError || undefined,
        confirmPassword: confirmPasswordError || undefined
      });
      return;
    }

    setIsLoading(true);
    setErrors({});

    try {
      await api.post('/auth/reset-password', {
        token,
        password: password.trim()
      });

      toast.success('Password reset successful! Please sign in with your new password.');
      navigate('/login', { 
        state: { message: 'Password reset successful! You can now sign in with your new password.' }
      });
      
      errorTracker.addBreadcrumb({
        category: 'auth',
        message: 'Password reset completed',
        level: 'info'
      });

    } catch (error: any) {
      console.error('Reset password error:', error);
      
      const errorMessage = error.response?.data?.message || 'Failed to reset password';
      
      if (error.response?.status === 400 || error.response?.status === 404) {
        setErrors({ token: errorMessage });
      } else {
        toast.error(errorMessage);
      }

      errorTracker.captureException(error, {
        tags: { 
          component: 'ResetPassword',
          operation: 'resetPassword'
        },
        extra: {
          status: error.response?.status
        }
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Loading state during token validation
  if (isValidating) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Validating reset token...</p>
        </div>
      </div>
    );
  }

  // Invalid token state
  if (!tokenValid || errors.token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full text-center space-y-8">
          <div className="mx-auto h-16 w-16 bg-red-100 rounded-full flex items-center justify-center mb-6">
            <AlertCircle className="h-8 w-8 text-red-600" />
          </div>
          
          <h2 className="text-3xl font-extrabold text-gray-900">
            Invalid Reset Link
          </h2>
          
          <p className="text-gray-600 mb-8">
            {errors.token || 'This password reset link is invalid or has expired.'}
          </p>

          <div className="space-y-4">
            <Link
              to="/forgot-password"
              className="w-full inline-flex items-center justify-center px-4 py-2 bg-primary-600 border border-transparent rounded-md shadow-sm text-sm font-medium text-white hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            >
              Request new reset link
            </Link>
            
            <Link
              to="/login"
              className="w-full inline-flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            >
              Back to login
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="mx-auto h-16 w-16 bg-green-100 rounded-full flex items-center justify-center mb-6">
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
          
          <h2 className="text-3xl font-extrabold text-gray-900">
            Reset your password
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Enter your new password below
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {/* New Password Field */}
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
              New Password
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Lock className="h-5 w-5 text-gray-400" />
              </div>
              <input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={handlePasswordChange}
                required
                className={`block w-full pl-10 pr-10 py-3 border rounded-lg placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 sm:text-sm ${
                  errors.password 
                    ? 'border-red-300 bg-red-50' 
                    : 'border-gray-300'
                }`}
                placeholder="Enter new password"
                aria-invalid={errors.password ? 'true' : 'false'}
                aria-describedby={errors.password ? 'password-error' : 'password-help'}
              />
              <button
                type="button"
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? (
                  <EyeOff className="h-5 w-5 text-gray-400" />
                ) : (
                  <Eye className="h-5 w-5 text-gray-400" />
                )}
              </button>
            </div>
            
            {!errors.password && (
              <p id="password-help" className="mt-1 text-xs text-gray-500">
                Must be at least 6 characters with letters and numbers
              </p>
            )}
            
            {errors.password && (
              <div
                id="password-error"
                className="mt-2 flex items-center text-sm text-red-600"
                role="alert"
              >
                <AlertCircle className="w-4 h-4 mr-2 flex-shrink-0" />
                <span>{errors.password}</span>
              </div>
            )}
          </div>

          {/* Confirm Password Field */}
          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
              Confirm New Password
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Lock className="h-5 w-5 text-gray-400" />
              </div>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={handleConfirmPasswordChange}
                required
                className={`block w-full pl-10 pr-10 py-3 border rounded-lg placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 sm:text-sm ${
                  errors.confirmPassword 
                    ? 'border-red-300 bg-red-50' 
                    : 'border-gray-300'
                }`}
                placeholder="Confirm new password"
                aria-invalid={errors.confirmPassword ? 'true' : 'false'}
                aria-describedby={errors.confirmPassword ? 'confirm-password-error' : undefined}
              />
              <button
                type="button"
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
              >
                {showConfirmPassword ? (
                  <EyeOff className="h-5 w-5 text-gray-400" />
                ) : (
                  <Eye className="h-5 w-5 text-gray-400" />
                )}
              </button>
            </div>
            
            {errors.confirmPassword && (
              <div
                id="confirm-password-error"
                className="mt-2 flex items-center text-sm text-red-600"
                role="alert"
              >
                <AlertCircle className="w-4 h-4 mr-2 flex-shrink-0" />
                <span>{errors.confirmPassword}</span>
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
                  Resetting password...
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4 mr-2" />
                  Reset password
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

export default ResetPassword;