import winston from 'winston';
import { Request, Response, NextFunction } from 'express';
import path from 'path';

// Security event types
export enum SecurityEventType {
  LOGIN_SUCCESS = 'LOGIN_SUCCESS',
  LOGIN_FAILURE = 'LOGIN_FAILURE',
  LOGOUT = 'LOGOUT',
  PASSWORD_CHANGE = 'PASSWORD_CHANGE',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  MALWARE_DETECTED = 'MALWARE_DETECTED',
  SESSION_EXPIRED = 'SESSION_EXPIRED',
  SESSION_HIJACK_ATTEMPT = 'SESSION_HIJACK_ATTEMPT',
  UNAUTHORIZED_ACCESS = 'UNAUTHORIZED_ACCESS',
  FILE_UPLOAD = 'FILE_UPLOAD',
  FILE_DOWNLOAD = 'FILE_DOWNLOAD',
  DATA_ACCESS = 'DATA_ACCESS',
  SUSPICIOUS_ACTIVITY = 'SUSPICIOUS_ACTIVITY',
  CSRF_ATTEMPT = 'CSRF_ATTEMPT',
  XSS_ATTEMPT = 'XSS_ATTEMPT',
  SQL_INJECTION_ATTEMPT = 'SQL_INJECTION_ATTEMPT'
}

// Request body type for audit logging
export type RequestBodyData = 
  | Record<string, unknown>
  | string
  | number
  | boolean
  | null
  | undefined;

interface SecurityEvent {
  eventType: SecurityEventType;
  userId?: string;
  userName?: string;
  ip: string;
  userAgent?: string;
  resource?: string;
  method?: string;
  statusCode?: number;
  threat?: string;
  details?: Record<string, RequestBodyData>;
  timestamp: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

interface AuditEvent {
  action: string;
  userId?: string;
  userName?: string;
  resource: string;
  method: string;
  ip: string;
  userAgent?: string;
  requestBody?: RequestBodyData;
  responseStatus: number;
  responseTime: number;
  timestamp: string;
  success: boolean;
}

class AuditLogger {
  private securityLogger: winston.Logger;
  private auditLogger: winston.Logger;
  private performanceLogger: winston.Logger;

  constructor() {
    const logDir = path.join(process.cwd(), 'logs');
    
    // Security events logger
    this.securityLogger = winston.createLogger({
      level: 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json(),
        winston.format.colorize({ all: true })
      ),
      transports: [
        new winston.transports.File({
          filename: path.join(logDir, 'security.log'),
          level: 'info',
          maxsize: 10 * 1024 * 1024, // 10MB
          maxFiles: 5,
          tailable: true
        }),
        new winston.transports.File({
          filename: path.join(logDir, 'security-errors.log'),
          level: 'error',
          maxsize: 10 * 1024 * 1024,
          maxFiles: 5,
          tailable: true
        })
      ]
    });

    // Audit trail logger
    this.auditLogger = winston.createLogger({
      level: 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      ),
      transports: [
        new winston.transports.File({
          filename: path.join(logDir, 'audit.log'),
          maxsize: 50 * 1024 * 1024, // 50MB
          maxFiles: 10,
          tailable: true
        })
      ]
    });

    // Performance logger
    this.performanceLogger = winston.createLogger({
      level: 'info',
      format: winston.format.json(),
      transports: [
        new winston.transports.File({
          filename: path.join(logDir, 'performance.log'),
          maxsize: 25 * 1024 * 1024, // 25MB
          maxFiles: 5,
          tailable: true
        })
      ]
    });

    // Console logging in development
    if (process.env.NODE_ENV === 'development') {
      const consoleFormat = winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      );

      this.securityLogger.add(new winston.transports.Console({ format: consoleFormat }));
      this.auditLogger.add(new winston.transports.Console({ format: consoleFormat }));
    }
  }

  logSecurityEvent(event: SecurityEvent) {
    const logLevel = this.getLogLevel(event.severity);
    
    (this.securityLogger as any)[logLevel]('SECURITY_EVENT', {
      ...event,
      environment: process.env.NODE_ENV,
      serverTime: new Date().toISOString()
    });

    // Alert on critical events
    if (event.severity === 'critical') {
      console.error('🚨 CRITICAL SECURITY ALERT:', event);
      // Here you could integrate with alerting systems like Slack, email, etc.
    }
  }

  logAuditEvent(event: AuditEvent) {
    this.auditLogger.info('AUDIT_EVENT', {
      ...event,
      environment: process.env.NODE_ENV
    });
  }

  logPerformance(data: {
    endpoint: string;
    method: string;
    responseTime: number;
    statusCode: number;
    userId?: string;
    ip: string;
  }) {
    this.performanceLogger.info('PERFORMANCE_METRIC', {
      ...data,
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV
    });
  }

  private getLogLevel(severity: SecurityEvent['severity']): string {
    switch (severity) {
      case 'critical': return 'error';
      case 'high': return 'error';
      case 'medium': return 'warn';
      case 'low': return 'info';
      default: return 'info';
    }
  }
}

const auditLogger = new AuditLogger();

// Middleware for audit logging
export const auditMiddleware = () => {
  return (req: Request, res: Response, next: NextFunction) => {
    const startTime = Date.now();
    const originalSend = res.send;
    
    // Capture request details
    const requestDetails = {
      ip: req.ip || 'unknown',
      method: req.method,
      url: req.originalUrl,
      userAgent: req.get('User-Agent'),
      userId: (req as any).user?.id,
      userName: (req as any).user?.email,
      timestamp: new Date().toISOString()
    };

    // Override response send to capture audit data
    res.send = function(body) {
      const responseTime = Date.now() - startTime;
      const success = res.statusCode < 400;

      // Log audit event
      auditLogger.logAuditEvent({
        action: `${req.method} ${req.route?.path || req.path}`,
        userId: requestDetails.userId,
        userName: requestDetails.userName,
        resource: req.originalUrl,
        method: req.method,
        ip: requestDetails.ip,
        userAgent: requestDetails.userAgent,
        requestBody: req.method !== 'GET' ? req.body : undefined,
        responseStatus: res.statusCode,
        responseTime,
        timestamp: requestDetails.timestamp,
        success
      });

      // Log performance metrics
      auditLogger.logPerformance({
        endpoint: req.route?.path || req.path,
        method: req.method,
        responseTime,
        statusCode: res.statusCode,
        userId: requestDetails.userId,
        ip: requestDetails.ip
      });

      // Detect suspicious activities
      if (responseTime > 5000) {
        auditLogger.logSecurityEvent({
          eventType: SecurityEventType.SUSPICIOUS_ACTIVITY,
          userId: requestDetails.userId,
          userName: requestDetails.userName,
          ip: requestDetails.ip,
          userAgent: requestDetails.userAgent,
          resource: req.originalUrl,
          method: req.method,
          details: { responseTime, reason: 'slow_response' },
          timestamp: new Date().toISOString(),
          severity: 'medium'
        });
      }

      return originalSend.call(this, body);
    };

    next();
  };
};

// Helper functions for logging specific security events
export const logSecurityEvent = (eventType: SecurityEventType, details: Partial<SecurityEvent>) => {
  auditLogger.logSecurityEvent({
    eventType,
    timestamp: new Date().toISOString(),
    severity: 'medium',
    ...details
  } as SecurityEvent);
};

export const logLoginAttempt = (req: Request, success: boolean, userId?: string, userName?: string) => {
  auditLogger.logSecurityEvent({
    eventType: success ? SecurityEventType.LOGIN_SUCCESS : SecurityEventType.LOGIN_FAILURE,
    userId,
    userName,
    ip: req.ip || 'unknown',
    userAgent: req.get('User-Agent'),
    timestamp: new Date().toISOString(),
    severity: success ? 'low' : 'medium',
    details: { success }
  });
};

export const logLogout = (req: Request, userId: string, userName?: string) => {
  auditLogger.logSecurityEvent({
    eventType: SecurityEventType.LOGOUT,
    userId,
    userName,
    ip: req.ip || 'unknown',
    userAgent: req.get('User-Agent'),
    timestamp: new Date().toISOString(),
    severity: 'low'
  });
};

export const logRateLimitExceeded = (req: Request, userId?: string) => {
  auditLogger.logSecurityEvent({
    eventType: SecurityEventType.RATE_LIMIT_EXCEEDED,
    userId,
    ip: req.ip || 'unknown',
    userAgent: req.get('User-Agent'),
    resource: req.originalUrl,
    method: req.method,
    timestamp: new Date().toISOString(),
    severity: 'medium'
  });
};

export const logMalwareDetection = (req: Request, fileName: string, threats: string[], userId?: string) => {
  auditLogger.logSecurityEvent({
    eventType: SecurityEventType.MALWARE_DETECTED,
    userId,
    ip: req.ip || 'unknown',
    userAgent: req.get('User-Agent'),
    resource: req.originalUrl,
    threat: threats.join(', '),
    details: { fileName, threats },
    timestamp: new Date().toISOString(),
    severity: 'critical'
  });
};

export const logUnauthorizedAccess = (req: Request, resource: string, userId?: string) => {
  auditLogger.logSecurityEvent({
    eventType: SecurityEventType.UNAUTHORIZED_ACCESS,
    userId,
    ip: req.ip || 'unknown',
    userAgent: req.get('User-Agent'),
    resource,
    method: req.method,
    timestamp: new Date().toISOString(),
    severity: 'high'
  });
};

export { auditLogger };