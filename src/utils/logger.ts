// Production-safe logging utility
const isDevelopment = import.meta.env.DEV;
const isVerboseLogging = import.meta.env.VITE_VERBOSE_LOGGING === 'true';

// Log levels for production control
const LogLevel = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3
} as const;

const currentLogLevel = isDevelopment ? LogLevel.DEBUG : LogLevel.ERROR;

export const logger = {
  log: (...args: unknown[]) => {
    if (isDevelopment || isVerboseLogging) {
      console.log(...args);
    }
  },
  
  error: (...args: unknown[]) => {
    // Always log errors, but in production send to monitoring service
    if (isDevelopment) {
      console.error(...args);
    } else {
      console.error('[ERROR]', new Date().toISOString(), ...args);
      // TODO: Send to production error monitoring service
      // sendErrorToService(args);
    }
  },
  
  warn: (...args: unknown[]) => {
    if (currentLogLevel >= LogLevel.WARN) {
      if (isDevelopment) {
        console.warn(...args);
      } else {
        console.warn('[WARN]', new Date().toISOString(), ...args);
      }
    }
  },
  
  info: (...args: unknown[]) => {
    if (currentLogLevel >= LogLevel.INFO) {
      if (isDevelopment) {
        console.info(...args);
      } else {
        console.info('[INFO]', new Date().toISOString(), ...args);
      }
    }
  },
  
  debug: (...args: unknown[]) => {
    if (currentLogLevel >= LogLevel.DEBUG) {
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
  },

  // Performance-specific logging (development only)
  performance: (message: string, data?: Record<string, unknown>) => {
    if (isDevelopment) {
      console.log('[PERFORMANCE]', message, data);
    }
  }
};

// Security-focused error logging that doesn't expose sensitive information
export const secureLogger = {
  logSecurityEvent: (event: string, details?: Record<string, unknown>) => {
    if (isDevelopment) {
      logger.warn(`🔒 Security Event: ${event}`, details);
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
      logger.error('Error:', sanitizedError, error.stack);
    } else {
      // Send sanitized error to logging service
      // sendErrorToService(sanitizedError);
    }
  }
};