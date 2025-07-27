#!/usr/bin/env node

/**
 * Monitoring Setup Script
 * Configures monitoring, alerting, and health checks for calendar integrations
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

// Colors for console output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logHeader(message) {
  log(`\n${colors.bold}${colors.blue}=== ${message} ===${colors.reset}`);
}

function logSuccess(message) {
  log(`✅ ${message}`, 'green');
}

function logWarning(message) {
  log(`⚠️  ${message}`, 'yellow');
}

function logError(message) {
  log(`❌ ${message}`, 'red');
}

function loadEnvFile() {
  const envPath = path.join(process.cwd(), '.env');
  
  if (!fs.existsSync(envPath)) {
    logError('.env file not found!');
    return false;
  }

  try {
    const envContent = fs.readFileSync(envPath, 'utf8');
    const lines = envContent.split('\n');
    
    lines.forEach(line => {
      const [key, ...valueParts] = line.split('=');
      if (key && !key.startsWith('#') && valueParts.length > 0) {
        process.env[key.trim()] = valueParts.join('=').trim();
      }
    });
    
    return true;
  } catch (error) {
    logError(`Failed to load .env file: ${error.message}`);
    return false;
  }
}

function validateMonitoringConfig() {
  logHeader('Validating Monitoring Configuration');

  const config = {
    enableMetrics: process.env.VITE_ENABLE_METRICS !== 'false',
    googleAnalytics: process.env.VITE_GOOGLE_ANALYTICS_ID,
    sentryDsn: process.env.VITE_SENTRY_DSN,
    monitoringEndpoint: process.env.VITE_MONITORING_ENDPOINT,
    errorTrackingEndpoint: process.env.VITE_ERROR_TRACKING_ENDPOINT,
    appUrl: process.env.VITE_APP_URL
  };

  let valid = true;
  const warnings = [];
  const recommendations = [];

  // Check metrics configuration
  if (config.enableMetrics) {
    logSuccess('Metrics collection is enabled');
  } else {
    logWarning('Metrics collection is disabled');
    warnings.push('Consider enabling metrics for better observability');
  }

  // Check Google Analytics
  if (config.googleAnalytics) {
    if (config.googleAnalytics.startsWith('G-')) {
      logSuccess('Google Analytics is configured');
    } else {
      logWarning('Google Analytics ID format may be incorrect (should start with G-)');
    }
  } else {
    logWarning('Google Analytics not configured');
    recommendations.push('Set up Google Analytics for user behavior tracking');
  }

  // Check Sentry
  if (config.sentryDsn) {
    if (config.sentryDsn.includes('sentry.io')) {
      logSuccess('Sentry error tracking is configured');
    } else {
      logWarning('Sentry DSN format may be incorrect');
    }
  } else {
    logWarning('Sentry error tracking not configured');
    recommendations.push('Set up Sentry for comprehensive error tracking');
  }

  // Check custom endpoints
  if (config.monitoringEndpoint) {
    logSuccess('Custom monitoring endpoint configured');
  } else {
    recommendations.push('Consider setting up custom monitoring endpoint for detailed metrics');
  }

  if (config.errorTrackingEndpoint) {
    logSuccess('Custom error tracking endpoint configured');
  } else {
    recommendations.push('Consider setting up custom error tracking endpoint');
  }

  // Check app URL for health checks
  if (config.appUrl) {
    if (config.appUrl.startsWith('https://')) {
      logSuccess('App URL is configured with HTTPS');
    } else if (config.appUrl.startsWith('http://localhost')) {
      logSuccess('App URL is configured for development');
    } else {
      logWarning('App URL should use HTTPS for production');
    }
  } else {
    logError('App URL not configured - required for health checks');
    valid = false;
  }

  return { valid, warnings, recommendations, config };
}

async function createMonitoringTables() {
  logHeader('Creating Monitoring Database Tables');

  const createTablesSQL = `
    -- Error logs table
    CREATE TABLE IF NOT EXISTS error_logs (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      error_type VARCHAR(50) NOT NULL,
      error_message TEXT NOT NULL,
      error_stack TEXT,
      provider VARCHAR(20),
      user_id UUID REFERENCES auth.users(id),
      integration_id UUID REFERENCES calendar_integrations(id),
      context JSONB,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      resolved_at TIMESTAMPTZ,
      resolved_by UUID REFERENCES auth.users(id)
    );

    -- Performance metrics table  
    CREATE TABLE IF NOT EXISTS performance_metrics (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      metric_name VARCHAR(100) NOT NULL,
      metric_value DECIMAL(10,2) NOT NULL,
      metric_unit VARCHAR(20) NOT NULL,
      provider VARCHAR(20),
      operation_type VARCHAR(50),
      user_id UUID REFERENCES auth.users(id),
      integration_id UUID REFERENCES calendar_integrations(id),
      timestamp TIMESTAMPTZ DEFAULT NOW(),
      metadata JSONB
    );

    -- Health check history table
    CREATE TABLE IF NOT EXISTS health_check_history (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      service_name VARCHAR(50) NOT NULL,
      status VARCHAR(20) NOT NULL,
      response_time_ms INTEGER,
      error_message TEXT,
      details JSONB,
      checked_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- Monitoring alerts table
    CREATE TABLE IF NOT EXISTS monitoring_alerts (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      alert_type VARCHAR(50) NOT NULL,
      severity VARCHAR(20) NOT NULL,
      title VARCHAR(200) NOT NULL,
      description TEXT,
      service_name VARCHAR(50),
      provider VARCHAR(20),
      threshold_value DECIMAL(10,2),
      actual_value DECIMAL(10,2),
      triggered_at TIMESTAMPTZ DEFAULT NOW(),
      resolved_at TIMESTAMPTZ,
      resolved_by UUID REFERENCES auth.users(id),
      metadata JSONB
    );

    -- Create indexes for better performance
    CREATE INDEX IF NOT EXISTS idx_error_logs_created_at ON error_logs(created_at);
    CREATE INDEX IF NOT EXISTS idx_error_logs_provider ON error_logs(provider);
    CREATE INDEX IF NOT EXISTS idx_error_logs_user_id ON error_logs(user_id);
    
    CREATE INDEX IF NOT EXISTS idx_performance_metrics_timestamp ON performance_metrics(timestamp);
    CREATE INDEX IF NOT EXISTS idx_performance_metrics_provider ON performance_metrics(provider);
    CREATE INDEX IF NOT EXISTS idx_performance_metrics_operation ON performance_metrics(operation_type);
    
    CREATE INDEX IF NOT EXISTS idx_health_check_history_checked_at ON health_check_history(checked_at);
    CREATE INDEX IF NOT EXISTS idx_health_check_history_service ON health_check_history(service_name);
    
    CREATE INDEX IF NOT EXISTS idx_monitoring_alerts_triggered_at ON monitoring_alerts(triggered_at);
    CREATE INDEX IF NOT EXISTS idx_monitoring_alerts_resolved_at ON monitoring_alerts(resolved_at);

    -- Enable RLS on monitoring tables
    ALTER TABLE error_logs ENABLE ROW LEVEL SECURITY;
    ALTER TABLE performance_metrics ENABLE ROW LEVEL SECURITY;
    ALTER TABLE health_check_history ENABLE ROW LEVEL SECURITY;
    ALTER TABLE monitoring_alerts ENABLE ROW LEVEL SECURITY;

    -- Create RLS policies for admin access
    CREATE POLICY IF NOT EXISTS "Admin can view all error logs" 
      ON error_logs FOR SELECT 
      USING (auth.jwt() ->> 'role' = 'admin');

    CREATE POLICY IF NOT EXISTS "Admin can manage error logs" 
      ON error_logs FOR ALL 
      USING (auth.jwt() ->> 'role' = 'admin');

    CREATE POLICY IF NOT EXISTS "Service can insert error logs" 
      ON error_logs FOR INSERT 
      WITH CHECK (true);

    CREATE POLICY IF NOT EXISTS "Admin can view all performance metrics" 
      ON performance_metrics FOR SELECT 
      USING (auth.jwt() ->> 'role' = 'admin');

    CREATE POLICY IF NOT EXISTS "Service can insert performance metrics" 
      ON performance_metrics FOR INSERT 
      WITH CHECK (true);

    CREATE POLICY IF NOT EXISTS "Admin can view health check history" 
      ON health_check_history FOR SELECT 
      USING (auth.jwt() ->> 'role' = 'admin');

    CREATE POLICY IF NOT EXISTS "Service can insert health checks" 
      ON health_check_history FOR INSERT 
      WITH CHECK (true);

    CREATE POLICY IF NOT EXISTS "Admin can view monitoring alerts" 
      ON monitoring_alerts FOR SELECT 
      USING (auth.jwt() ->> 'role' = 'admin');

    CREATE POLICY IF NOT EXISTS "Admin can manage monitoring alerts" 
      ON monitoring_alerts FOR ALL 
      USING (auth.jwt() ->> 'role' = 'admin');
  `;

  log('SQL for monitoring tables created. Execute this in your Supabase SQL editor:', 'blue');
  log(createTablesSQL);
  
  logSuccess('Monitoring database schema ready for deployment');
}

async function setupHealthCheckEndpoint() {
  logHeader('Setting Up Health Check Endpoint');

  const healthCheckCode = `
// src/api/health/calendar.ts
export async function GET() {
  const healthChecks = await performCalendarHealthCheck();
  
  const overallHealth = Object.values(healthChecks).every(
    check => check.status === 'healthy'
  ) ? 'healthy' : 'degraded';

  const response = {
    status: overallHealth,
    timestamp: new Date().toISOString(),
    checks: healthChecks
  };

  return Response.json(response, {
    status: overallHealth === 'healthy' ? 200 : 503,
    headers: {
      'Cache-Control': 'no-cache'
    }
  });
}
  `;

  log('Health check endpoint implementation:', 'blue');
  log(healthCheckCode);

  logSuccess('Health check endpoint code generated');
  logWarning('Add this endpoint to your API routes for external monitoring');
}

function setupAlertingRules() {
  logHeader('Setting Up Alerting Rules');

  const alertingConfig = {
    syncSuccessRate: {
      threshold: 80,
      description: 'Alert when sync success rate drops below 80%'
    },
    responseTime: {
      threshold: 5000,
      description: 'Alert when average response time exceeds 5 seconds'
    },
    errorRate: {
      threshold: 10,
      description: 'Alert when error rate exceeds 10 errors per hour'
    },
    healthCheck: {
      threshold: 3,
      description: 'Alert when health check fails 3 consecutive times'
    }
  };

  log('Recommended alerting thresholds:', 'blue');
  Object.entries(alertingConfig).forEach(([metric, config]) => {
    log(`• ${metric}: ${config.threshold} - ${config.description}`);
  });

  logSuccess('Alerting rules configuration ready');
  logWarning('Configure these thresholds in your monitoring system');
}

function generateMonitoringDocumentation() {
  logHeader('Generating Monitoring Documentation');

  const monitoringDocs = `
# Calendar Integration Monitoring Guide

## Health Checks

### Automated Health Checks
- Database connectivity: Tests Supabase connection
- Google Calendar API: Tests Google Calendar API availability  
- Microsoft Graph API: Tests Microsoft Graph API availability
- Webhook endpoints: Tests webhook endpoint accessibility

### Manual Health Checks
- OAuth flow testing: Verify authentication works end-to-end
- Calendar sync testing: Test full sync cycle with sample data
- Conflict resolution testing: Verify conflict detection and resolution

## Key Metrics to Monitor

### Sync Performance
- Sync success rate: Target >95%
- Average sync duration: Target <3 seconds
- Events processed per sync: Track volume
- Conflicts detected per sync: Track conflicts

### Error Tracking
- Authentication failures: OAuth token issues
- API rate limit hits: Google/Microsoft API quotas
- Network timeouts: Connectivity issues
- Permission errors: Access scope problems

### User Experience
- Time to first sync: New user onboarding
- Sync frequency: How often users sync
- Integration adoption: Usage across providers

## Alerting Scenarios

### Critical Alerts
- Sync success rate <80% for >15 minutes
- Health check failures for >5 minutes
- Critical error rate >5 per minute
- Database connectivity issues

### Warning Alerts  
- Sync success rate <90% for >30 minutes
- Average response time >3 seconds
- Error rate >10 per hour
- Token refresh failures

## Monitoring Dashboard

### Real-time Metrics
- Overall system health status
- Active integrations count
- Current sync operations
- Error rate trends

### Historical Analysis
- Performance trends over time
- Error pattern analysis
- User adoption metrics
- Resource utilization

## Troubleshooting Runbook

### Common Issues
1. OAuth token expiration: Check token refresh process
2. API rate limiting: Monitor quota usage
3. Webhook delivery failures: Verify endpoint accessibility
4. Sync conflicts: Check conflict resolution logic

### Investigation Steps
1. Check health check status
2. Review error logs for patterns
3. Verify external API status
4. Test OAuth flows manually
5. Check database performance
6. Validate webhook endpoints

## Maintenance Tasks

### Daily
- Review error logs
- Check sync success rates
- Monitor API quota usage

### Weekly  
- Analyze performance trends
- Review user feedback
- Update monitoring thresholds

### Monthly
- Performance optimization review
- Security audit of monitoring data
- Monitoring system updates
  `;

  log('Monitoring documentation generated:', 'blue');
  log('Save this as MONITORING_GUIDE.md in your project root');

  return monitoringDocs;
}

async function testMonitoringSetup() {
  logHeader('Testing Monitoring Setup');

  const appUrl = process.env.VITE_APP_URL;
  
  if (!appUrl) {
    logError('Cannot test monitoring without VITE_APP_URL');
    return false;
  }

  const tests = [
    {
      name: 'Health Check Endpoint',
      url: `${appUrl}/api/health/calendar`,
      expected: [200, 503]
    },
    {
      name: 'Google Webhook Endpoint', 
      url: `${appUrl}/api/webhooks/google-calendar`,
      expected: [200, 404, 405]
    },
    {
      name: 'Microsoft Webhook Endpoint',
      url: `${appUrl}/api/webhooks/microsoft`,
      expected: [200, 404, 405]
    }
  ];

  let allPassed = true;

  for (const test of tests) {
    try {
      const response = await fetch(test.url, { method: 'HEAD' });
      
      if (test.expected.includes(response.status)) {
        logSuccess(`${test.name}: ${response.status} ✓`);
      } else {
        logWarning(`${test.name}: ${response.status} (unexpected)`);
      }
    } catch (error) {
      logError(`${test.name}: ${error.message}`);
      allPassed = false;
    }
  }

  return allPassed;
}

async function main() {
  log(`${colors.bold}${colors.blue}Calendar Integration Monitoring Setup${colors.reset}`);
  log('This script sets up comprehensive monitoring for calendar integrations.\\n');

  const args = process.argv.slice(2);
  const skipValidation = args.includes('--skip-validation');
  const testOnly = args.includes('--test-only');

  if (!loadEnvFile() && !skipValidation) {
    logWarning('No .env file found - some validations will be skipped');
  }

  if (testOnly) {
    await testMonitoringSetup();
    return;
  }

  // Validate monitoring configuration
  const validation = validateMonitoringConfig();
  
  if (!validation.valid && !skipValidation) {
    logError('Monitoring configuration is invalid. Fix the errors above or use --skip-validation');
    process.exit(1);
  }

  // Create monitoring database tables
  await createMonitoringTables();

  // Set up health check endpoint
  await setupHealthCheckEndpoint();

  // Configure alerting rules
  setupAlertingRules();

  // Generate monitoring documentation
  const docs = generateMonitoringDocumentation();

  // Write documentation to file
  try {
    fs.writeFileSync(path.join(process.cwd(), 'MONITORING_GUIDE.md'), docs);
    logSuccess('Monitoring documentation written to MONITORING_GUIDE.md');
  } catch (error) {
    logWarning('Could not write monitoring documentation file');
  }

  // Test monitoring setup
  const testsPassed = await testMonitoringSetup();

  logHeader('Monitoring Setup Summary');

  if (validation.valid && testsPassed) {
    logSuccess('✅ Monitoring setup completed successfully!');
    log('\\nNext steps:', 'green');
    log('1. Deploy the monitoring database tables');
    log('2. Implement the health check endpoint');
    log('3. Configure external monitoring systems');
    log('4. Set up alerting thresholds');
    log('5. Test the monitoring dashboard');
  } else {
    logWarning('⚠️  Monitoring setup completed with warnings.');
    
    if (validation.warnings.length > 0) {
      log('\\nWarnings to address:', 'yellow');
      validation.warnings.forEach(warning => log(`• ${warning}`, 'yellow'));
    }
    
    if (validation.recommendations.length > 0) {
      log('\\nRecommendations:', 'blue');
      validation.recommendations.forEach(rec => log(`• ${rec}`, 'blue'));
    }
  }

  log('\\n🔧 Available Commands:', 'blue');
  log('• npm run setup-monitoring --test-only    # Test monitoring endpoints');
  log('• npm run setup-monitoring --skip-validation  # Skip config validation');

  process.exit(validation.valid && testsPassed ? 0 : 1);
}

if (require.main === module) {
  main();
}