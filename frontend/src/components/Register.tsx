import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useFormValidation, validationRules } from '../hooks/useFormValidation';
import FormField from './FormField';
import { errorHandlers } from '../utils/errorHandler';

const Register: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { register } = useAuth();

  const {
    values,
    errors,
    isValid,
    getFieldProps,
    getFieldError,
    validateForm
  } = useFormValidation({
    name: {
      ...validationRules.required('Full name is required'),
      ...validationRules.minLength(2, 'Name must be at least 2 characters')
    },
    email: {
      ...validationRules.required(),
      ...validationRules.email()
    },
    password: {
      ...validationRules.required('Password is required'),
      ...validationRules.password()
    },
    confirmPassword: {
      ...validationRules.required('Please confirm your password'),
      custom: (value: string) => {
        if (value !== values.password) {
          return 'Passwords do not match';
        }
        return null;
      }
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
      console.log('Attempting registration with:', { name: values.name, email: values.email, password: '***' });
      await register(values.name, values.email, values.password);
      console.log('Registration successful');
    } catch (error: any) {
      console.error('Registration error:', error);
      
      // Enhanced error handling
      const serverMessage = error.response?.data?.message || '';
      let contextualMessage;
      
      if (error.response?.status === 409) {
        contextualMessage = 'An account with this email address already exists. Please try logging in instead.';
      } else if (error.response?.status === 400) {
        if (serverMessage?.includes('email')) {
          contextualMessage = 'Please provide a valid email address.';
        } else if (serverMessage?.includes('password')) {
          contextualMessage = 'Password must be at least 6 characters and contain both letters and numbers.';
        } else if (serverMessage?.includes('name')) {
          contextualMessage = 'Please provide a valid name (at least 2 characters).';
        } else {
          contextualMessage = serverMessage || 'Please check your input and try again.';
        }
      } else {
        errorHandlers.auth(error, 'register');
        contextualMessage = 'Registration failed. Please try again.';
      }
      
      setError(contextualMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Create your account
          </h2>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <FormField
              label="Full Name"
              name="name"
              type="text"
              required
              disabled={loading}
              error={getFieldError('name')}
              placeholder="Enter your full name"
              autoComplete="name"
              helpText="Enter your first and last name"
              {...getFieldProps('name')}
            />

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
              placeholder="Create a password"
              autoComplete="new-password"
              helpText="Must contain at least one letter and one number, minimum 6 characters"
              {...getFieldProps('password')}
            />

            <FormField
              label="Confirm Password"
              name="confirmPassword"
              type="password"
              required
              disabled={loading}
              error={getFieldError('confirmPassword')}
              placeholder="Confirm your password"
              autoComplete="new-password"
              helpText="Re-enter your password to confirm"
              {...getFieldProps('confirmPassword')}
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
              {loading ? 'Creating account...' : 'Create account'}
            </button>
          </div>

          <div className="text-center">
            <p className="text-sm text-gray-600">
              Already have an account?{' '}
              <Link to="/login" className="font-medium text-primary-600 hover:text-primary-500">
                Sign in here
              </Link>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Register; 