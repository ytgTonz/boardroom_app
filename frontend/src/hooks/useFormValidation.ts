import { useState, useCallback, useEffect } from 'react';

export interface ValidationRule {
  required?: boolean | string;
  minLength?: number | [number, string];
  maxLength?: number | [number, string];
  pattern?: RegExp | [RegExp, string];
  email?: boolean | string;
  phone?: boolean | string;
  custom?: (value: any) => string | null;
  dependencies?: string[]; // Fields that this validation depends on
}

export interface ValidationSchema {
  [fieldName: string]: ValidationRule;
}

export interface FieldError {
  message: string;
  type: string;
}

export interface ValidationErrors {
  [fieldName: string]: FieldError | null;
}

export interface UseFormValidationOptions {
  validateOnChange?: boolean;
  validateOnBlur?: boolean;
  debounceMs?: number;
}

export const useFormValidation = (
  schema: ValidationSchema,
  options: UseFormValidationOptions = {}
) => {
  const {
    validateOnChange = true,
    validateOnBlur = true,
    debounceMs = 300
  } = options;

  const [values, setValues] = useState<Record<string, any>>({});
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [isValid, setIsValid] = useState(false);
  const [isValidating, setIsValidating] = useState(false);

  // Debounced validation timeout
  const [validationTimeout, setValidationTimeout] = useState<NodeJS.Timeout | null>(null);

  const validateField = useCallback((fieldName: string, value: any, allValues: Record<string, any> = values): FieldError | null => {
    const rule = schema[fieldName];
    if (!rule) return null;

    // Required validation
    if (rule.required) {
      const isEmpty = value === null || value === undefined || value === '' || 
                     (Array.isArray(value) && value.length === 0);
      
      if (isEmpty) {
        const message = typeof rule.required === 'string' ? rule.required : `${fieldName} is required`;
        return { message, type: 'required' };
      }
    }

    // Skip other validations if field is empty and not required
    if (!value && !rule.required) {
      return null;
    }

    // Email validation
    if (rule.email && value) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(value)) {
        const message = typeof rule.email === 'string' ? rule.email : 'Please enter a valid email address';
        return { message, type: 'email' };
      }
    }

    // Phone validation
    if (rule.phone && value) {
      const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
      if (!phoneRegex.test(value.replace(/[\s\-\(\)]/g, ''))) {
        const message = typeof rule.phone === 'string' ? rule.phone : 'Please enter a valid phone number';
        return { message, type: 'phone' };
      }
    }

    // MinLength validation
    if (rule.minLength && value) {
      const [minLen, message] = Array.isArray(rule.minLength) 
        ? rule.minLength 
        : [rule.minLength, `${fieldName} must be at least ${rule.minLength} characters`];
      
      if (value.length < minLen) {
        return { message, type: 'minLength' };
      }
    }

    // MaxLength validation
    if (rule.maxLength && value) {
      const [maxLen, message] = Array.isArray(rule.maxLength) 
        ? rule.maxLength 
        : [rule.maxLength, `${fieldName} must be no more than ${rule.maxLength} characters`];
      
      if (value.length > maxLen) {
        return { message, type: 'maxLength' };
      }
    }

    // Pattern validation
    if (rule.pattern && value) {
      const [pattern, message] = Array.isArray(rule.pattern) 
        ? rule.pattern 
        : [rule.pattern, `${fieldName} format is invalid`];
      
      if (!pattern.test(value)) {
        return { message, type: 'pattern' };
      }
    }

    // Custom validation
    if (rule.custom && typeof rule.custom === 'function') {
      const customError = rule.custom(value);
      if (customError) {
        return { message: customError, type: 'custom' };
      }
    }

    return null;
  }, [schema, values]);

  const validateAllFields = useCallback((valuesToValidate: Record<string, any> = values): ValidationErrors => {
    const newErrors: ValidationErrors = {};
    
    Object.keys(schema).forEach(fieldName => {
      const error = validateField(fieldName, valuesToValidate[fieldName], valuesToValidate);
      newErrors[fieldName] = error;
    });

    return newErrors;
  }, [schema, validateField, values]);

  const debouncedValidation = useCallback((fieldName: string, value: any) => {
    setIsValidating(true);
    
    if (validationTimeout) {
      clearTimeout(validationTimeout);
    }

    const timeout = setTimeout(() => {
      const error = validateField(fieldName, value);
      setErrors(prev => ({ ...prev, [fieldName]: error }));
      setIsValidating(false);
    }, debounceMs);

    setValidationTimeout(timeout);
  }, [validateField, debounceMs, validationTimeout]);

  const setValue = useCallback((fieldName: string, value: any, shouldValidate = validateOnChange) => {
    setValues(prev => ({ ...prev, [fieldName]: value }));
    
    if (shouldValidate) {
      if (debounceMs > 0) {
        debouncedValidation(fieldName, value);
      } else {
        const error = validateField(fieldName, value);
        setErrors(prev => ({ ...prev, [fieldName]: error }));
      }
    }
  }, [validateField, validateOnChange, debounceMs, debouncedValidation]);

  const setFieldTouched = useCallback((fieldName: string, isTouched = true) => {
    setTouched(prev => ({ ...prev, [fieldName]: isTouched }));
  }, []);

  const handleFieldChange = useCallback((fieldName: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setValue(fieldName, e.target.value);
  }, [setValue]);

  const handleFieldBlur = useCallback((fieldName: string) => () => {
    setFieldTouched(fieldName, true);
    
    if (validateOnBlur) {
      const error = validateField(fieldName, values[fieldName]);
      setErrors(prev => ({ ...prev, [fieldName]: error }));
    }
  }, [validateField, validateOnBlur, values, setFieldTouched]);

  const validateForm = useCallback(() => {
    const newErrors = validateAllFields();
    setErrors(newErrors);
    
    const hasErrors = Object.values(newErrors).some(error => error !== null);
    setIsValid(!hasErrors);
    
    return !hasErrors;
  }, [validateAllFields]);

  const resetForm = useCallback((newValues: Record<string, any> = {}) => {
    setValues(newValues);
    setErrors({});
    setTouched({});
    setIsValid(false);
    setIsValidating(false);
    
    if (validationTimeout) {
      clearTimeout(validationTimeout);
      setValidationTimeout(null);
    }
  }, [validationTimeout]);

  const getFieldProps = useCallback((fieldName: string) => ({
    name: fieldName,
    value: values[fieldName] || '',
    onChange: handleFieldChange(fieldName),
    onBlur: handleFieldBlur(fieldName),
    'aria-invalid': errors[fieldName] ? 'true' : 'false',
    'aria-describedby': errors[fieldName] ? `${fieldName}-error` : undefined,
  }), [values, errors, handleFieldChange, handleFieldBlur]);

  const getFieldError = useCallback((fieldName: string) => {
    return (touched[fieldName] || values[fieldName]) ? errors[fieldName] : null;
  }, [errors, touched, values]);

  const hasFieldError = useCallback((fieldName: string) => {
    return !!getFieldError(fieldName);
  }, [getFieldError]);

  // Update form validity when errors change
  useEffect(() => {
    const hasErrors = Object.values(errors).some(error => error !== null);
    setIsValid(!hasErrors && Object.keys(values).length > 0);
  }, [errors, values]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (validationTimeout) {
        clearTimeout(validationTimeout);
      }
    };
  }, [validationTimeout]);

  return {
    values,
    errors,
    touched,
    isValid,
    isValidating,
    setValue,
    setFieldTouched,
    validateField,
    validateForm,
    validateAllFields,
    resetForm,
    getFieldProps,
    getFieldError,
    hasFieldError,
    handleFieldChange,
    handleFieldBlur
  };
};

// Predefined validation rules for common use cases
export const validationRules = {
  required: (message?: string) => ({
    required: message || 'This field is required'
  }),
  
  email: (message?: string) => ({
    email: message || 'Please enter a valid email address'
  }),
  
  phone: (message?: string) => ({
    phone: message || 'Please enter a valid phone number'
  }),
  
  minLength: (length: number, message?: string) => ({
    minLength: [length, message || `Must be at least ${length} characters`] as [number, string]
  }),
  
  maxLength: (length: number, message?: string) => ({
    maxLength: [length, message || `Must be no more than ${length} characters`] as [number, string]
  }),
  
  password: (message?: string) => ({
    minLength: [6, 'Password must be at least 6 characters'] as [number, string],
    pattern: [/(?=.*[a-zA-Z])(?=.*\d)/, message || 'Password must contain at least one letter and one number'] as [RegExp, string]
  }),
  
  confirmPassword: (passwordField: string, message?: string) => ({
    custom: (value: any) => {
      // This needs to be used within a form context where you have access to other field values
      return null; // Placeholder - implement in component
    }
  }),
  
  url: (message?: string) => ({
    pattern: [/^https?:\/\/.+/, message || 'Please enter a valid URL'] as [RegExp, string]
  })
};

export default useFormValidation;