import { Request, Response, NextFunction } from 'express';
import { ApiResponse } from '@/types';

interface RateLimitOptions {
  windowMs: number; // Time window in milliseconds
  max: number; // Maximum number of requests per window
  message?: string;
  skipSuccessfulRequests?: boolean;
}

interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
  };
}

class MemoryRateLimitStore {
  public store: RateLimitStore = {};
  
  increment(key: string, windowMs: number): { count: number; resetTime: number } {
    const now = Date.now();
    const resetTime = now + windowMs;
    
    if (!this.store[key] || this.store[key].resetTime <= now) {
      this.store[key] = {
        count: 1,
        resetTime
      };
    } else {
      this.store[key].count++;
    }
    
    return this.store[key];
  }
  
  cleanup() {
    const now = Date.now();
    Object.keys(this.store).forEach(key => {
      if (this.store[key].resetTime <= now) {
        delete this.store[key];
      }
    });
  }
}

const store = new MemoryRateLimitStore();

// Cleanup expired entries every 5 minutes
setInterval(() => {
  store.cleanup();
}, 5 * 60 * 1000);

export const rateLimiter = (options: RateLimitOptions) => {
  const {
    windowMs,
    max,
    message = 'Too many requests, please try again later',
    skipSuccessfulRequests = false
  } = options;
  
  return (req: Request, res: Response, next: NextFunction) => {
    // Generate key based on IP address and user ID (if authenticated)
    const userKey = (req as any).user?.id || 'anonymous';
    const key = `${req.ip}:${userKey}`;
    
    const { count, resetTime } = store.increment(key, windowMs);
    
    // Set rate limit headers
    res.set({
      'X-RateLimit-Limit': max.toString(),
      'X-RateLimit-Remaining': Math.max(0, max - count).toString(),
      'X-RateLimit-Reset': new Date(resetTime).toISOString()
    });
    
    if (count > max) {
      return res.status(429).json({
        success: false,
        error: message,
        data: {
          limit: max,
          remaining: 0,
          resetTime: new Date(resetTime).toISOString()
        }
      } as ApiResponse);
    }
    
    // Skip counting successful requests if option is enabled
    if (skipSuccessfulRequests) {
      const originalSend = res.send;
      res.send = function(body) {
        if (res.statusCode >= 400) {
          // Only count failed requests
          return originalSend.call(this, body);
        }
        // Decrement count for successful requests
        if (store.store[key]) {
          store.store[key].count = Math.max(0, store.store[key].count - 1);
        }
        return originalSend.call(this, body);
      };
    }
    
    next();
  };
};

// Preset configurations
export const authLimiter = rateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 login attempts per 15 minutes
  message: 'Too many authentication attempts, please try again later',
  skipSuccessfulRequests: true
});

export const generalLimiter = rateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per 15 minutes
  message: 'Too many requests, please try again later'
});

export const strictLimiter = rateLimiter({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 10, // 10 requests per minute
  message: 'Rate limit exceeded, please slow down'
});