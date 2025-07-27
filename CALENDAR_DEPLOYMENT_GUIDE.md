# Calendar Integrations Deployment Guide

This guide covers the complete deployment process for Google Calendar and Microsoft Calendar integrations in the Curious Dashboard application.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Environment Configuration](#environment-configuration)
3. [OAuth Setup](#oauth-setup)
4. [Database Deployment](#database-deployment)
5. [Security Configuration](#security-configuration)
6. [Webhook Configuration](#webhook-configuration)
7. [Production Deployment](#production-deployment)
8. [Monitoring and Logging](#monitoring-and-logging)
9. [Testing](#testing)
10. [Troubleshooting](#troubleshooting)

## Prerequisites

### Required Services
- **Supabase Project** (production instance)
- **Google Cloud Console** access
- **Microsoft Azure** portal access
- **Domain with SSL certificate** for production
- **Environment variable management** (e.g., Vercel, Netlify, or custom hosting)

### Required Permissions
- Admin access to Google Cloud Console
- Admin access to Microsoft Azure portal
- Database admin access to Supabase
- Domain and DNS configuration access

## Environment Configuration

### Core Environment Variables

Create the following environment variables in your production environment:

```bash
# Database Configuration
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Google Calendar Integration
VITE_GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret
VITE_GOOGLE_REDIRECT_URI=https://your-domain.com/auth/google/callback

# Microsoft Calendar Integration
VITE_MICROSOFT_CLIENT_ID=your-microsoft-client-id
MICROSOFT_CLIENT_SECRET=your-microsoft-client-secret
VITE_MICROSOFT_TENANT_ID=common
VITE_MICROSOFT_REDIRECT_URI=https://your-domain.com/auth/microsoft/callback

# Security
CALENDAR_ENCRYPTION_KEY=your-32-character-encryption-key
JWT_SECRET=your-jwt-secret-for-webhook-validation

# Production Settings
NODE_ENV=production
VITE_APP_URL=https://your-domain.com
```

### Environment-Specific Configuration

#### Development
```bash
VITE_GOOGLE_REDIRECT_URI=http://localhost:5173/auth/google/callback
VITE_MICROSOFT_REDIRECT_URI=http://localhost:5173/auth/microsoft/callback
VITE_APP_URL=http://localhost:5173
```

#### Staging
```bash
VITE_GOOGLE_REDIRECT_URI=https://staging.your-domain.com/auth/google/callback
VITE_MICROSOFT_REDIRECT_URI=https://staging.your-domain.com/auth/microsoft/callback
VITE_APP_URL=https://staging.your-domain.com
```

#### Production
```bash
VITE_GOOGLE_REDIRECT_URI=https://your-domain.com/auth/google/callback
VITE_MICROSOFT_REDIRECT_URI=https://your-domain.com/auth/microsoft/callback
VITE_APP_URL=https://your-domain.com
```

## OAuth Setup

### Google Calendar Setup

#### 1. Create Google Cloud Project
1. Visit [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable the Google Calendar API:
   - Go to "APIs & Services" > "Library"
   - Search for "Google Calendar API"
   - Click "Enable"

#### 2. Configure OAuth Consent Screen
1. Go to "APIs & Services" > "OAuth consent screen"
2. Choose "External" user type
3. Fill in required information:
   - **App name**: Curious Dashboard
   - **User support email**: your-support@domain.com
   - **Developer contact**: your-dev@domain.com
4. Add scopes:
   - `https://www.googleapis.com/auth/calendar`
   - `https://www.googleapis.com/auth/calendar.events`
   - `https://www.googleapis.com/auth/userinfo.profile`
   - `https://www.googleapis.com/auth/userinfo.email`

#### 3. Create OAuth 2.0 Credentials
1. Go to "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "OAuth 2.0 Client IDs"
3. Choose "Web application"
4. Add authorized redirect URIs:
   - `https://your-domain.com/auth/google/callback`
   - `https://staging.your-domain.com/auth/google/callback` (if applicable)
   - `http://localhost:5173/auth/google/callback` (for development)
5. Save the Client ID and Client Secret

#### 4. Verify Domain (if needed)
1. Go to "APIs & Services" > "OAuth consent screen"
2. Add your domain to "Authorized domains"
3. Verify domain ownership if required

### Microsoft Calendar Setup

#### 1. Register Application in Azure
1. Visit [Azure Portal](https://portal.azure.com/)
2. Go to "Azure Active Directory" > "App registrations"
3. Click "New registration"
4. Configure:
   - **Name**: Curious Dashboard Calendar Integration
   - **Supported account types**: Accounts in any organizational directory and personal Microsoft accounts
   - **Redirect URI**: Web - `https://your-domain.com/auth/microsoft/callback`

#### 2. Configure API Permissions
1. Go to "API permissions"
2. Add permissions:
   - **Microsoft Graph** > **Delegated permissions**:
     - `Calendars.ReadWrite`
     - `User.Read`
     - `OnlineMeetings.ReadWrite` (for Teams integration)
     - `Presence.Read.All` (optional, for user availability)
3. Grant admin consent if required

#### 3. Create Client Secret
1. Go to "Certificates & secrets"
2. Click "New client secret"
3. Set expiration (recommended: 24 months)
4. Copy the secret value immediately

#### 4. Configure Additional Settings
1. **Authentication**:
   - Add redirect URIs for all environments
   - Enable "Access tokens" and "ID tokens"
2. **Branding**:
   - Add logo and terms of service URL
   - Set privacy statement URL

## Database Deployment

### 1. Apply Migrations

Run the calendar integration migrations in order:

```sql
-- Apply in Supabase SQL editor or via migration tool
-- 1. Google Calendar Integration
\i supabase/migrations/20250726000002_add_google_calendar_integration.sql

-- 2. Microsoft Calendar Integration  
\i supabase/migrations/20250726000003_add_microsoft_outlook_integration.sql
```

### 2. Verify Database Schema

Ensure all tables are created:
- `calendar_integrations`
- `event_sync_mappings`
- `sync_conflicts`
- `sync_history`
- `microsoft_calendar_metadata`
- `microsoft_sync_tokens`
- `microsoft_event_attendees`

### 3. Set Up Row Level Security

Verify RLS policies are active:

```sql
-- Check RLS is enabled
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename LIKE '%calendar%' OR tablename LIKE '%sync%';

-- Verify policies exist
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename LIKE '%calendar%' OR tablename LIKE '%sync%';
```

### 4. Create Database Functions

Add utility functions for calendar operations:

```sql
-- Function to clean up expired tokens
CREATE OR REPLACE FUNCTION cleanup_expired_calendar_tokens()
RETURNS void AS $$
BEGIN
  UPDATE calendar_integrations 
  SET token_expires_at = NULL, 
      refresh_token = NULL 
  WHERE token_expires_at < NOW() - INTERVAL '7 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user's active integrations
CREATE OR REPLACE FUNCTION get_user_active_integrations(user_uuid UUID)
RETURNS TABLE(
  id UUID,
  provider TEXT,
  calendar_name TEXT,
  sync_enabled BOOLEAN,
  last_sync_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ci.id,
    ci.provider,
    ci.calendar_name,
    ci.sync_enabled,
    ci.last_sync_at
  FROM calendar_integrations ci
  WHERE ci.user_id = user_uuid
    AND ci.sync_enabled = true
    AND ci.token_expires_at > NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

## Security Configuration

### 1. Token Encryption

Implement token encryption for production:

```typescript
// src/utils/encryption.ts
import CryptoJS from 'crypto-js';

const ENCRYPTION_KEY = process.env.CALENDAR_ENCRYPTION_KEY!;

export function encryptToken(token: string): string {
  return CryptoJS.AES.encrypt(token, ENCRYPTION_KEY).toString();
}

export function decryptToken(encryptedToken: string): string {
  const bytes = CryptoJS.AES.decrypt(encryptedToken, ENCRYPTION_KEY);
  return bytes.toString(CryptoJS.enc.Utf8);
}
```

### 2. Secure Headers

Configure security headers:

```typescript
// next.config.js or similar
const securityHeaders = [
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff'
  },
  {
    key: 'X-Frame-Options',
    value: 'DENY'
  },
  {
    key: 'X-XSS-Protection',
    value: '1; mode=block'
  },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=31536000; includeSubDomains'
  }
];
```

### 3. Rate Limiting

Implement rate limiting for API endpoints:

```typescript
// src/middleware/rateLimit.ts
import rateLimit from 'express-rate-limit';

export const calendarApiLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many calendar API requests from this IP'
});
```

### 4. Input Validation

Add comprehensive input validation:

```typescript
// src/validation/calendar.ts
import { z } from 'zod';

export const calendarEventSchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().max(1000).optional(),
  start_time: z.string().datetime(),
  end_time: z.string().datetime(),
  timezone: z.string().optional()
});
```

## Webhook Configuration

### 1. Google Calendar Webhooks

Set up webhook endpoints:

```typescript
// src/api/webhooks/google-calendar.ts
import { verifyWebhookSignature } from '@/utils/webhook-security';

export async function POST(request: Request) {
  const signature = request.headers.get('x-goog-channel-token');
  const body = await request.text();
  
  if (!verifyWebhookSignature(body, signature)) {
    return new Response('Unauthorized', { status: 401 });
  }
  
  // Process webhook...
}
```

### 2. Microsoft Graph Webhooks

Configure Microsoft Graph subscriptions:

```typescript
// src/services/microsoft/webhook-setup.ts
import { GraphServiceClient } from '@microsoft/microsoft-graph-client';

export async function createCalendarSubscription(
  graphClient: GraphServiceClient,
  userId: string
) {
  const subscription = {
    changeType: 'created,updated,deleted',
    notificationUrl: `${process.env.VITE_APP_URL}/api/webhooks/microsoft`,
    resource: `/users/${userId}/events`,
    expirationDateTime: new Date(Date.now() + 3600000).toISOString(), // 1 hour
    clientState: generateClientState()
  };
  
  return await graphClient.subscriptions.post(subscription);
}
```

### 3. Webhook Security

Implement webhook validation:

```typescript
// src/utils/webhook-security.ts
import crypto from 'crypto';

export function verifyWebhookSignature(
  payload: string, 
  signature: string | null
): boolean {
  if (!signature) return false;
  
  const expectedSignature = crypto
    .createHmac('sha256', process.env.JWT_SECRET!)
    .update(payload)
    .digest('hex');
    
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}
```

## Production Deployment

### 1. Build Application

```bash
# Install dependencies
npm ci

# Build for production
npm run build

# Run type checking
npm run typecheck

# Run linting
npm run lint
```

### 2. Deploy to Hosting Platform

#### Vercel Deployment
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod

# Set environment variables
vercel env add VITE_GOOGLE_CLIENT_ID
vercel env add GOOGLE_CLIENT_SECRET
# ... add all environment variables
```

#### Netlify Deployment
```bash
# Install Netlify CLI
npm i -g netlify-cli

# Deploy
netlify deploy --prod --dir=dist

# Set environment variables in Netlify dashboard
```

### 3. Configure Domain and SSL

1. Point your domain to the hosting platform
2. Ensure SSL certificate is configured
3. Set up CNAME records if needed
4. Configure redirects for auth callbacks

### 4. Update OAuth Configurations

Update OAuth redirect URIs in both Google and Microsoft consoles to use production domain.

## Monitoring and Logging

### 1. Set Up Error Tracking

```typescript
// src/utils/error-tracking.ts
import * as Sentry from '@sentry/react';

Sentry.init({
  dsn: process.env.VITE_SENTRY_DSN,
  environment: process.env.NODE_ENV,
  integrations: [
    new Sentry.BrowserTracing()
  ],
  tracesSampleRate: 0.1
});

export function logCalendarError(error: Error, context: any) {
  Sentry.withScope((scope) => {
    scope.setTag('component', 'calendar-integration');
    scope.setContext('calendar', context);
    Sentry.captureException(error);
  });
}
```

### 2. Application Monitoring

```typescript
// src/utils/monitoring.ts
export function trackCalendarSync(
  provider: 'google' | 'microsoft',
  success: boolean,
  duration: number
) {
  // Send to analytics service
  if (window.gtag) {
    window.gtag('event', 'calendar_sync', {
      provider,
      success,
      duration,
      custom_parameter: 'calendar_integration'
    });
  }
}
```

### 3. Health Checks

```typescript
// src/api/health/calendar.ts
export async function GET() {
  const checks = await Promise.allSettled([
    checkGoogleCalendarAPI(),
    checkMicrosoftGraphAPI(),
    checkDatabaseConnection()
  ]);
  
  const status = checks.every(check => check.status === 'fulfilled') 
    ? 'healthy' : 'unhealthy';
    
  return Response.json({ status, checks });
}
```

## Testing

### 1. Integration Testing

```bash
# Run integration tests
npm run test:integration

# Test specific calendar features
npm run test -- --grep "calendar"
```

### 2. OAuth Flow Testing

Test OAuth flows in different environments:
- Development (localhost)
- Staging
- Production

### 3. Load Testing

Test calendar sync performance:
- Multiple concurrent users
- Large calendar datasets
- Peak usage scenarios

## Troubleshooting

### Common Issues

#### 1. OAuth Redirect URI Mismatch
**Problem**: "redirect_uri_mismatch" error
**Solution**: Ensure all redirect URIs are exactly configured in OAuth console

#### 2. Token Refresh Failures
**Problem**: Users getting logged out frequently
**Solution**: Check token refresh logic and expiration times

#### 3. Webhook Delivery Failures
**Problem**: Events not syncing in real-time
**Solution**: Verify webhook endpoints are accessible and validate signatures

#### 4. Database Connection Issues
**Problem**: Calendar operations failing
**Solution**: Check Supabase connection and RLS policies

### Debugging Commands

```bash
# Check environment variables
env | grep -E "(GOOGLE|MICROSOFT|SUPABASE)"

# Test database connection
npx supabase db ping

# Validate OAuth configuration
curl -I "https://accounts.google.com/o/oauth2/auth?client_id=$VITE_GOOGLE_CLIENT_ID"
```

### Logging Calendar Operations

```typescript
// Enhanced logging for debugging
export function logCalendarOperation(
  operation: string,
  provider: string,
  details: any
) {
  console.log(`[Calendar ${provider.toUpperCase()}] ${operation}:`, {
    timestamp: new Date().toISOString(),
    provider,
    operation,
    details,
    environment: process.env.NODE_ENV
  });
}
```

## Security Checklist

- [ ] All environment variables are properly set
- [ ] OAuth redirect URIs are configured correctly
- [ ] Database RLS policies are enabled
- [ ] Token encryption is implemented
- [ ] Webhook signatures are validated
- [ ] Rate limiting is configured
- [ ] Security headers are set
- [ ] Error tracking is configured
- [ ] SSL certificates are valid
- [ ] Input validation is comprehensive

## Post-Deployment Verification

1. **Test OAuth flows** for both Google and Microsoft
2. **Verify calendar sync** functionality
3. **Test conflict resolution** system
4. **Check webhook delivery**
5. **Monitor error rates**
6. **Validate security headers**
7. **Test rate limiting**
8. **Verify database performance**

## Maintenance

### Regular Tasks
- Monitor OAuth token refresh rates
- Check webhook subscription renewals
- Review error logs and sync failures
- Update API client libraries
- Rotate encryption keys annually
- Review and update OAuth scopes as needed

### Performance Optimization
- Monitor database query performance
- Optimize calendar sync frequency
- Implement caching for frequently accessed data
- Review and optimize API rate limits

---

**Next Steps**: After completing this deployment guide, proceed with Phase 5B to set up the production environment variables and OAuth configurations.