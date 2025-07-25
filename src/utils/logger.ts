// Production-safe logging utility
const isDevelopment = import.meta.env.DEV;

export const logger = {
  log: (...args: any[]) => {
    if (isDevelopment) {
      console.log(...args);
    }
  },
  
  error: (...args: any[]) => {
    if (isDevelopment) {
      console.error(...args);
    } else {
      // In production, you might want to send errors to a logging service
      // For now, we'll just store them locally or send to an error tracking service
      // Example: sendErrorToService(args);
    }
  },
  
  warn: (...args: any[]) => {
    if (isDevelopment) {
      console.warn(...args);
    }
  },
  
  info: (...args: any[]) => {
    if (isDevelopment) {
      console.info(...args);
    }
  },
  
  debug: (...args: any[]) => {
    if (isDevelopment) {
      console.debug(...args);
    }
  }
};

// Security-focused error logging that doesn't expose sensitive information
export const secureLogger = {
  logSecurityEvent: (event: string, details?: Record<string, any>) => {
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