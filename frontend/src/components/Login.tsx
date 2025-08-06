import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useFormValidation, validationRules } from '../hooks/useFormValidation';
import FormField from './FormField';
import { errorHandlers, contextualErrorMessages } from '../utils/errorHandler';

const Login: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAuth();

  const {
    values,
    errors,
    isValid,
    getFieldProps,
    getFieldError,
    validateForm
  } = useFormValidation({
    email: {
      ...validationRules.required(),
      ...validationRules.email()
    },
    password: {
      ...validationRules.required('Password is required'),
      ...validationRules.minLength(6, 'Password must be at least 6 characters')
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
    
    setLoading(true);
    setError('');
    
    try {
      await login(values.email, values.password);
    } catch (error: any) {
      console.error('Login error:', error);
      setError(error.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Sign in to your account
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Welcome back! Please sign in to continue.
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <FormField
              label="Email address"
              name="email"
              type="email"
              required
              disabled={loading}
              error={getFieldError('email')}
              placeholder="Enter your email address"
              autoComplete="email"
              {...getFieldProps('email')}
            />
            
            <FormField
              label="Password"
              name="password"
              type="password"
              required
              disabled={loading}
              error={getFieldError('password')}
              placeholder="Enter your password"
              autoComplete="current-password"
              helpText="Minimum 6 characters required"
              {...getFieldProps('password')}
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-4">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <div>
            <button
              type="submit"
              disabled={loading || !isValid}
              className="btn btn-primary w-full disabled:opacity-50"
            >
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </div>

          <div className="text-center space-y-2">
            <p className="text-sm">
              <Link 
                to="/forgot-password" 
                className="font-medium text-primary-600 hover:text-primary-500"
              >
                Forgot your password?
              </Link>
            </p>
            <p className="text-sm text-gray-600">
              Don't have an account?{' '}
              <Link to="/register" className="font-medium text-primary-600 hover:text-primary-500">
                Sign up here
              </Link>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Login; 