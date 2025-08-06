import React from 'react';
import { AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { FieldError } from '../hooks/useFormValidation';

interface FormFieldProps {
  label: string;
  name: string;
  type?: 'text' | 'email' | 'password' | 'tel' | 'url' | 'textarea' | 'select';
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
  onBlur?: (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
  error?: FieldError | null;
  isValidating?: boolean;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  autoComplete?: string;
  className?: string;
  children?: React.ReactNode; // For select options
  rows?: number; // For textarea
  showValidIcon?: boolean;
  helpText?: string;
}

const FormField: React.FC<FormFieldProps> = ({
  label,
  name,
  type = 'text',
  value,
  onChange,
  onBlur,
  error,
  isValidating = false,
  placeholder,
  disabled = false,
  required = false,
  autoComplete,
  className = '',
  children,
  rows = 3,
  showValidIcon = true,
  helpText
}) => {
  const hasError = !!error;
  const isValid = !hasError && value.length > 0 && !isValidating;
  const fieldId = `field-${name}`;
  const errorId = `${fieldId}-error`;
  const helpId = `${fieldId}-help`;

  const getInputClasses = () => {
    const baseClasses = `
      w-full px-3 py-2 border rounded-lg transition-colors duration-200
      focus:outline-none focus:ring-2 focus:ring-offset-1
      disabled:opacity-50 disabled:cursor-not-allowed
      placeholder-gray-400
    `;
    
    if (hasError) {
      return `${baseClasses} border-red-300 bg-red-50 focus:border-red-500 focus:ring-red-200 text-red-900`;
    } else if (isValid && showValidIcon) {
      return `${baseClasses} border-green-300 bg-green-50 focus:border-green-500 focus:ring-green-200 text-green-900`;
    } else {
      return `${baseClasses} border-gray-300 bg-white focus:border-primary-500 focus:ring-primary-200`;
    }
  };

  const renderInput = () => {
    const inputProps = {
      id: fieldId,
      name,
      value,
      onChange,
      onBlur,
      placeholder,
      disabled,
      required,
      autoComplete,
      className: getInputClasses(),
      'aria-invalid': hasError ? 'true' : 'false',
      'aria-describedby': `${error ? errorId : ''} ${helpText ? helpId : ''}`.trim() || undefined,
    };

    switch (type) {
      case 'textarea':
        return (
          <textarea
            {...inputProps}
            rows={rows}
          />
        );
      case 'select':
        return (
          <select {...inputProps}>
            {children}
          </select>
        );
      default:
        return (
          <input
            {...inputProps}
            type={type}
          />
        );
    }
  };

  const renderValidationIcon = () => {
    if (isValidating) {
      return (
        <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
          <Loader2 className="h-4 w-4 text-gray-400 animate-spin" />
        </div>
      );
    }

    if (hasError) {
      return (
        <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
          <AlertCircle className="h-4 w-4 text-red-500" />
        </div>
      );
    }

    if (isValid && showValidIcon) {
      return (
        <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
          <CheckCircle className="h-4 w-4 text-green-500" />
        </div>
      );
    }

    return null;
  };

  return (
    <div className={`space-y-2 ${className}`}>
      <label 
        htmlFor={fieldId} 
        className="block text-sm font-medium text-gray-700"
      >
        {label}
        {required && <span className="text-red-500 ml-1" aria-label="required">*</span>}
      </label>

      <div className="relative">
        {renderInput()}
        {type !== 'textarea' && type !== 'select' && renderValidationIcon()}
      </div>

      {/* Help Text */}
      {helpText && !error && (
        <p id={helpId} className="text-xs text-gray-500">
          {helpText}
        </p>
      )}

      {/* Error Message */}
      {error && (
        <div
          id={errorId}
          role="alert"
          className="flex items-start space-x-2 text-sm text-red-600"
        >
          <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
          <span>{error.message}</span>
        </div>
      )}

      {/* Success Message for valid fields (optional) */}
      {isValid && showValidIcon && (
        <div className="flex items-center space-x-2 text-sm text-green-600">
          <CheckCircle className="h-4 w-4 text-green-500" />
          <span>Looks good!</span>
        </div>
      )}
    </div>
  );
};

export default FormField;