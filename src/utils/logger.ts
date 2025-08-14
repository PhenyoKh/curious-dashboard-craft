// Production-safe logging utility
const isDevelopment = import.meta.env.DEV;

export const logger = {
  log: (...args: unknown[]) => {
    if (isDevelopment) {
      console.log(...args);
    }
  },
  
  error: (...args: unknown[]) => {
    if (isDevelopment) {
      console.error(...args);
    } else {
      // In production, you might want to send errors to a logging service
      // For now, we'll just store them locally or send to an error tracking service
      // Example: sendErrorToService(args);
    }
  },
  
  warn: (...args: unknown[]) => {
    if (isDevelopment) {
      console.warn(...args);
    }
  },
  
  info: (...args: unknown[]) => {
    if (isDevelopment) {
      console.info(...args);
    }
  },
  
  debug: (...args: unknown[]) => {
    if (isDevelopment) {
      console.debug(...args);
    }
  },

  // Auth-specific logging (development only)
  auth: (...args: unknown[]) => {
    if (isDevelopment) {
      console.log('[AUTH]', ...args);
    }
  },

  // Subscription-specific logging (development only)
  subscription: (...args: unknown[]) => {
    if (isDevelopment) {
      console.log('[SUBSCRIPTION]', ...args);
    }
  }
};

// Security-focused error logging that doesn't expose sensitive information
export const secureLogger = {
  logSecurityEvent: (event: string, details?: Record<string, unknown>) => {
    if (isDevelopment) {
      console.warn(`🔒 Security Event: ${event}`, details);
    } else {
      // In production, send to security monitoring service
      // sendSecurityAlert(event, sanitizeDetails(details));
    }
  },
  
  logError: (error: Error, context?: string) => {
    const sanitizedError = {
      message: error.message,
      name: error.name,
      context,
      timestamp: new Date().toISOString()
    };
    
    if (isDevelopment) {
      console.error('Error:', sanitizedError, error.stack);
    } else {
      // Send sanitized error to logging service
      // sendErrorToService(sanitizedError);
    }
  }
};