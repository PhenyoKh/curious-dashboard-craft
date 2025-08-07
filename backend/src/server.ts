
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import routes from '@/routes';
import { errorHandler, notFoundHandler } from '@/middleware/errorHandler';
import { generalLimiter, authLimiter, uploadLimiter } from '@/middleware/rateLimiter';
import { initializeMalwareScanner } from '@/middleware/malwareScanner';
import { createSecureSession, sessionTimeoutMiddleware } from '@/middleware/sessionSecurity';
import { auditMiddleware } from '@/middleware/auditLogger';
import { runPenetrationTests, scheduledSecurityScan } from '@/security/penetrationTesting';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Security middleware with enhanced configuration
const isProduction = process.env.NODE_ENV === 'production';

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      // Stricter in production: remove 'unsafe-inline' and add trusted sources
      styleSrc: isProduction 
        ? ["'self'", "https://fonts.googleapis.com", "https://cdn.jsdelivr.net"]
        : ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://cdn.jsdelivr.net"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:", "blob:"],
      connectSrc: ["'self'", "https://fprsjziqubbhznavjskj.supabase.co", "wss://fprsjziqubbhznavjskj.supabase.co"],
      fontSrc: ["'self'", "https://fonts.gstatic.com", "data:"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
    },
  },
  crossOriginEmbedderPolicy: false,
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));

// CORS configuration with stricter settings
const allowedOrigins = process.env.FRONTEND_URL 
  ? [process.env.FRONTEND_URL] 
  : ['http://localhost:5173'];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, etc.)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    } else {
      return callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  maxAge: 86400 // 24 hours
}));

// Session management with security features
app.use(createSecureSession({
  maxAge: 24 * 60 * 60 * 1000,        // 24 hours
  idleTimeout: 30 * 60 * 1000,        // 30 minutes idle timeout
  absoluteTimeout: 8 * 60 * 60 * 1000, // 8 hours absolute timeout
  renewOnActivity: true,
  checkIpAddress: true,
  checkUserAgent: true
}));

// Session timeout middleware
app.use(sessionTimeoutMiddleware());

// Body parsing middleware with size limits
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Audit logging middleware
app.use(auditMiddleware());

// Security headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  next();
});

// Rate limiting
app.use('/api/auth', authLimiter);
app.use('/api/upload', uploadLimiter);
app.use('/api', generalLimiter);

// Request logging middleware (development only)
if (process.env.NODE_ENV === 'development') {
  app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
  });
}

// Security testing endpoint (development only)
if (process.env.NODE_ENV === 'development') {
  app.post('/security/pentest', runPenetrationTests);
}

// API routes
app.use('/api', routes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    success: true,
    data: {
      name: 'Curious Dashboard API',
      version: '1.0.0',
      status: 'running',
      timestamp: new Date().toISOString()
    },
    message: 'Welcome to the Curious Dashboard API'
  });
});

// Error handling middleware
app.use(notFoundHandler);
app.use(errorHandler);

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  process.exit(0);
});

// Initialize security systems
const initializeSecurity = async () => {
  try {
    await initializeMalwareScanner();
    console.log('🛡️ Security systems initialized');
    
    // Schedule daily security scans in production
    if (process.env.NODE_ENV === 'production') {
      setInterval(scheduledSecurityScan, 24 * 60 * 60 * 1000); // Daily
      console.log('🔍 Scheduled security scans enabled');
    }
  } catch (error) {
    console.warn('⚠️ Security initialization warnings:', (error as any).message);
  }
};

// Start server
app.listen(PORT, async () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📝 API Documentation: http://localhost:${PORT}/api/health`);
  console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
  
  if (process.env.NODE_ENV === 'development') {
    console.log(`🔗 Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:5173'}`);
    console.log(`🔍 Security Testing: POST http://localhost:${PORT}/security/pentest`);
  }
  
  await initializeSecurity();
});

export default app;
