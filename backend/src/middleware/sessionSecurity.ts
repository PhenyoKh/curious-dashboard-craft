import { Request, Response, NextFunction } from 'express';
import session from 'express-session';

interface SessionWithSecurity extends session.Session {
  lastActivity?: number;
  loginTime?: number;
  ipAddress?: string;
  userAgent?: string;
}

interface SecureSessionOptions {
  maxAge?: number;           // Session max age in milliseconds
  idleTimeout?: number;      // Idle timeout in milliseconds
  absoluteTimeout?: number;  // Absolute timeout in milliseconds
  renewOnActivity?: boolean; // Renew session on activity
  checkIpAddress?: boolean;  // Validate IP address
  checkUserAgent?: boolean;  // Validate user agent
}

const defaultOptions: Required<SecureSessionOptions> = {
  maxAge: 24 * 60 * 60 * 1000,        // 24 hours
  idleTimeout: 30 * 60 * 1000,        // 30 minutes
  absoluteTimeout: 8 * 60 * 60 * 1000, // 8 hours
  renewOnActivity: true,
  checkIpAddress: true,
  checkUserAgent: true
};

export const createSecureSession = (options: SecureSessionOptions = {}) => {
  const config = { ...defaultOptions, ...options };

  // Validate that SESSION_SECRET is set - fail fast if missing
  if (!process.env.SESSION_SECRET) {
    throw new Error('SESSION_SECRET environment variable is required for secure session management. Generate with: openssl rand -base64 32');
  }

  if (process.env.SESSION_SECRET.length < 32) {
    throw new Error('SESSION_SECRET must be at least 32 characters long for security. Generate with: openssl rand -base64 32');
  }

  return session({
    name: 'curious-session',
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    rolling: config.renewOnActivity,
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      maxAge: config.maxAge,
      sameSite: 'strict'
    },
    genid: () => {
      // Generate cryptographically secure session ID
      const crypto = require('crypto');
      return crypto.randomBytes(32).toString('hex');
    }
  });
};

export const sessionTimeoutMiddleware = (options: SecureSessionOptions = {}) => {
  const config = { ...defaultOptions, ...options };

  return (req: Request, res: Response, next: NextFunction) => {
    const session = req.session as SessionWithSecurity;
    const now = Date.now();

    if (!session || !session.loginTime) {
      return next();
    }

    // Check absolute timeout
    if (session.loginTime && (now - session.loginTime) > config.absoluteTimeout) {
      session.destroy((err) => {
        if (err) console.error('Session destruction error:', err);
      });

      console.warn('Session expired (absolute timeout):', {
        timestamp: new Date().toISOString(),
        sessionAge: now - session.loginTime,
        ip: req.ip,
        userId: (req as any).user?.id
      });

      return res.status(401).json({
        success: false,
        error: 'Session expired',
        data: {
          reason: 'absolute_timeout',
          message: 'Please log in again'
        }
      });
    }

    // Check idle timeout
    if (session.lastActivity && (now - session.lastActivity) > config.idleTimeout) {
      session.destroy((err) => {
        if (err) console.error('Session destruction error:', err);
      });

      console.warn('Session expired (idle timeout):', {
        timestamp: new Date().toISOString(),
        idleTime: now - session.lastActivity,
        ip: req.ip,
        userId: (req as any).user?.id
      });

      return res.status(401).json({
        success: false,
        error: 'Session expired due to inactivity',
        data: {
          reason: 'idle_timeout',
          message: 'Please log in again'
        }
      });
    }

    // Validate IP address consistency
    if (config.checkIpAddress && session.ipAddress && session.ipAddress !== req.ip) {
      session.destroy((err) => {
        if (err) console.error('Session destruction error:', err);
      });

      console.error('🚨 SECURITY ALERT - Session hijacking attempt (IP mismatch):', {
        timestamp: new Date().toISOString(),
        originalIp: session.ipAddress,
        currentIp: req.ip,
        userAgent: req.get('User-Agent'),
        userId: (req as any).user?.id
      });

      return res.status(401).json({
        success: false,
        error: 'Security validation failed',
        data: {
          reason: 'ip_mismatch',
          message: 'Please log in again'
        }
      });
    }

    // Validate User-Agent consistency
    if (config.checkUserAgent && session.userAgent && session.userAgent !== req.get('User-Agent')) {
      session.destroy((err) => {
        if (err) console.error('Session destruction error:', err);
      });

      console.error('🚨 SECURITY ALERT - Session hijacking attempt (User-Agent mismatch):', {
        timestamp: new Date().toISOString(),
        originalUserAgent: session.userAgent,
        currentUserAgent: req.get('User-Agent'),
        ip: req.ip,
        userId: (req as any).user?.id
      });

      return res.status(401).json({
        success: false,
        error: 'Security validation failed',
        data: {
          reason: 'user_agent_mismatch',
          message: 'Please log in again'
        }
      });
    }

    // Update last activity timestamp
    session.lastActivity = now;

    // Initialize session security data on first use
    if (!session.ipAddress) {
      session.ipAddress = req.ip;
      session.userAgent = req.get('User-Agent');
      session.loginTime = now;
    }

    next();
  };
};

export const initializeSessionSecurity = (req: Request, userId: string) => {
  const session = req.session as SessionWithSecurity;
  const now = Date.now();

  session.loginTime = now;
  session.lastActivity = now;
  session.ipAddress = req.ip;
  session.userAgent = req.get('User-Agent');

  console.log('Session security initialized:', {
    timestamp: new Date().toISOString(),
    userId,
    ip: req.ip,
    userAgent: req.get('User-Agent')?.substring(0, 100)
  });
};

export const destroySession = (req: Request): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (!req.session) {
      return resolve();
    }

    req.session.destroy((err) => {
      if (err) {
        console.error('Session destruction error:', err);
        return reject(err);
      }
      resolve();
    });
  });
};