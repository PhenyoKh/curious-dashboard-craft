import { useForm, UseFormReturn, FieldValues, DeepPartial } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { sanitizeText, sanitizeHtml } from '../utils/security';

// Return type for secure form hook that extends UseFormReturn with security features
interface SecureFormReturn<T extends FieldValues> extends UseFormReturn<T> {
  submitSecurely: (onSubmit: (data: T) => void | Promise<void>) => (data: T) => Promise<void>;
}

// Generic secure form hook
export function useSecureForm<T extends FieldValues>(
  schema: z.ZodSchema<T>,
  defaultValues?: DeepPartial<T>
): SecureFormReturn<T> {
  const form = useForm<T>({
    resolver: zodResolver(schema),
    defaultValues,
    mode: 'onChange', // Validate on every change
  });

  // Secure submit handler that sanitizes data before submission
  const submitSecurely = (onSubmit: (data: T) => void | Promise<void>) => {
    return async (data: T) => {
      try {
        // Sanitize all string fields in the data
        const sanitizedData = sanitizeFormData(data);
        
        // Call the original submit handler with sanitized data
        await onSubmit(sanitizedData);
      } catch (error) {
        console.error('Form submission error:', error);
        // You can add error handling here (e.g., show toast notification)
        throw error;
      }
    };
  };

  return {
    ...form,
    submitSecurely,
  };
}

// Sanitize form data recursively
function sanitizeFormData<T>(data: T): T {
  if (typeof data === 'string') {
    // For rich text content, use HTML sanitization
    if (data.includes('<') && data.includes('>')) {
      return sanitizeHtml(data) as T;
    }
    // For plain text, use text sanitization
    return sanitizeText(data) as T;
  }
  
  if (Array.isArray(data)) {
    return data.map(item => sanitizeFormData(item)) as T;
  }
  
  if (data && typeof data === 'object') {
    const sanitized = {} as T;
    for (const key in data) {
      if (data.hasOwnProperty(key)) {
        sanitized[key] = sanitizeFormData(data[key]);
      }
    }
    return sanitized;
  }
  
  // Return primitive values as-is (numbers, booleans, null, undefined)
  return data;
}

// Error handler for form validation
export function handleFormError(error: unknown): string {
  if (error instanceof z.ZodError) {
    // Return the first validation error message
    return error.errors[0]?.message || 'Validation error';
  }
  
  if (error instanceof Error) {
    // Sanitize error messages to prevent XSS
    return sanitizeText(error.message);
  }
  
  return 'An unexpected error occurred';
}

// Secure field validation helpers
export const fieldValidators = {
  // Check if field contains potentially dangerous content
  isDangerous: (value: string): boolean => {
    const dangerousPatterns = [
      /<script/i,
      /javascript:/i,
      /on\w+=/i,
      /<iframe/i,
      /<object/i,
      /<embed/i,
      /data:text\/html/i,
    ];
    
    return dangerousPatterns.some(pattern => pattern.test(value));
  },
  
  // Validate file input security
  validateFileField: (files: FileList | null): string | null => {
    if (!files || files.length === 0) return null;
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      // Check file size (10MB limit)
      if (file.size > 10 * 1024 * 1024) {
        return 'File size must be less than 10MB';
      }
      
      // Check file type
      const allowedTypes = [
        'image/jpeg', 'image/png', 'image/gif', 'image/webp',
        'application/pdf', 'text/plain',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      ];
      
      if (!allowedTypes.includes(file.type)) {
        return 'File type not allowed';
      }
      
      // Check for suspicious file extensions
      const suspiciousExtensions = [
        '.exe', '.bat', '.cmd', '.scr', '.pif', '.vbs', '.js', '.jar', '.com', '.php'
      ];
      
      if (suspiciousExtensions.some(ext => file.name.toLowerCase().endsWith(ext))) {
        return 'Suspicious file extension detected';
      }
    }
    
    return null;
  },
  
  // Validate URL fields
  validateUrlField: (url: string): string | null => {
    if (!url) return null;
    
    try {
      const urlObj = new URL(url);
      
      // Only allow http and https protocols
      if (!['http:', 'https:'].includes(urlObj.protocol)) {
        return 'Only HTTP and HTTPS URLs are allowed';
      }
      
      // Block dangerous protocols that might be disguised
      if (url.toLowerCase().includes('javascript:') || 
          url.toLowerCase().includes('data:') ||
          url.toLowerCase().includes('vbscript:')) {
        return 'Invalid URL protocol';
      }
      
      return null;
    } catch {
      return 'Invalid URL format';
    }
  },
};