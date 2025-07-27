#!/usr/bin/env node

/**
 * Webhook Configuration Script
 * Sets up webhook endpoints for Google and Microsoft Calendar integrations
 */

const https = require('https');
const crypto = require('crypto');

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
  const fs = require('fs');
  const path = require('path');
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

function makeHttpsRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const request = https.request(url, options, (response) => {
      let data = '';
      
      response.on('data', (chunk) => {
        data += chunk;
      });
      
      response.on('end', () => {
        resolve({
          statusCode: response.statusCode,
          headers: response.headers,
          data: data
        });
      });
    });
    
    request.on('error', (error) => {
      reject(error);
    });
    
    request.setTimeout(10000, () => {
      request.destroy();
      reject(new Error('Request timeout'));
    });
    
    if (options.body) {
      request.write(options.body);
    }
    
    request.end();
  });
}

async function testWebhookEndpoint(url, method = 'POST') {
  logHeader(`Testing Webhook Endpoint: ${url}`);
  
  try {
    const testPayload = JSON.stringify({
      test: true,
      timestamp: new Date().toISOString(),
      source: 'webhook-setup-script'
    });
    
    const options = {
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Calendar-Webhook-Setup/1.0',
        'Content-Length': Buffer.byteLength(testPayload)
      },
      body: testPayload
    };
    
    const response = await makeHttpsRequest(url, options);
    
    if (response.statusCode >= 200 && response.statusCode < 300) {
      logSuccess(`Webhook endpoint is accessible (${response.statusCode})`);
      return true;
    } else if (response.statusCode === 404) {
      logError('Webhook endpoint not found (404)');
      logWarning('Make sure the webhook routes are properly configured in your application');
      return false;
    } else if (response.statusCode === 405) {
      logWarning(`Method ${method} not allowed (405) - endpoint exists but may not accept this method`);
      return true; // Endpoint exists, just method not allowed for test
    } else {
      logWarning(`Webhook endpoint returned status: ${response.statusCode}`);
      return false;
    }
  } catch (error) {
    if (error.message.includes('ENOTFOUND')) {
      logError('Webhook endpoint domain not found');
      logWarning('Check your VITE_APP_URL configuration and ensure the domain is accessible');
    } else if (error.message.includes('ECONNREFUSED')) {
      logError('Connection refused to webhook endpoint');
      logWarning('Make sure your application is running and accessible from the internet');
    } else {
      logError(`Failed to test webhook endpoint: ${error.message}`);
    }
    return false;
  }
}

function generateWebhookSecret() {
  return crypto.randomBytes(32).toString('hex');
}

function validateWebhookConfiguration() {
  logHeader('Validating Webhook Configuration');
  
  const appUrl = process.env.VITE_APP_URL;
  const jwtSecret = process.env.JWT_SECRET;
  const nodeEnv = process.env.NODE_ENV;
  
  let valid = true;
  
  if (!appUrl) {
    logError('VITE_APP_URL not configured');
    valid = false;
  } else {
    if (nodeEnv === 'production' && !appUrl.startsWith('https://')) {
      logError('Production webhook URLs must use HTTPS');
      valid = false;
    } else {
      logSuccess('App URL is configured');
    }
  }
  
  if (!jwtSecret) {
    logError('JWT_SECRET not configured (required for webhook validation)');
    valid = false;
  } else if (jwtSecret.length < 16) {
    logWarning('JWT_SECRET should be at least 16 characters long');
  } else {
    logSuccess('JWT secret is configured');
  }
  
  return valid;
}

async function testGoogleWebhooks() {
  logHeader('Testing Google Calendar Webhook Configuration');
  
  const appUrl = process.env.VITE_APP_URL;
  if (!appUrl) {
    logError('Cannot test webhooks without VITE_APP_URL');
    return false;
  }
  
  const googleWebhookUrl = `${appUrl}/api/webhooks/google-calendar`;
  const success = await testWebhookEndpoint(googleWebhookUrl);
  
  if (success) {
    logSuccess('Google Calendar webhook endpoint is ready');
    log('\\nGoogle Webhook Setup Instructions:', 'blue');
    log('1. Webhook URL: ' + googleWebhookUrl);
    log('2. Configure push notifications in Google Calendar API');
    log('3. Set up channel expiration handling');
    log('4. Verify webhook signature validation');
  } else {
    logError('Google Calendar webhook endpoint is not accessible');
    log('\\nTroubleshooting:', 'yellow');
    log('• Ensure your application is deployed and running');
    log('• Check that webhook routes are properly configured');
    log('• Verify SSL certificate if using HTTPS');
    log('• Test from a different network to confirm external access');
  }
  
  return success;
}

async function testMicrosoftWebhooks() {
  logHeader('Testing Microsoft Graph Webhook Configuration');
  
  const appUrl = process.env.VITE_APP_URL;
  if (!appUrl) {
    logError('Cannot test webhooks without VITE_APP_URL');
    return false;
  }
  
  const microsoftWebhookUrl = `${appUrl}/api/webhooks/microsoft`;
  const success = await testWebhookEndpoint(microsoftWebhookUrl);
  
  if (success) {
    logSuccess('Microsoft Calendar webhook endpoint is ready');
    log('\\nMicrosoft Webhook Setup Instructions:', 'blue');
    log('1. Webhook URL: ' + microsoftWebhookUrl);
    log('2. Configure Microsoft Graph subscriptions');
    log('3. Set up subscription renewal (max 4230 minutes)');
    log('4. Verify client state validation');
  } else {
    logError('Microsoft Calendar webhook endpoint is not accessible');
    log('\\nTroubleshooting:', 'yellow');
    log('• Ensure your application is deployed and running');
    log('• Check that webhook routes are properly configured');
    log('• Verify SSL certificate if using HTTPS');
    log('• Microsoft Graph requires HTTPS for webhooks');
  }
  
  return success;
}

function generateWebhookImplementation() {
  logHeader('Webhook Implementation Examples');
  
  const appUrl = process.env.VITE_APP_URL || 'https://your-domain.com';
  
  log('\\n📋 Required Webhook Endpoints:', 'blue');
  log(`• Google: ${appUrl}/api/webhooks/google-calendar`);
  log(`• Microsoft: ${appUrl}/api/webhooks/microsoft`);
  
  log('\\n🔧 Implementation checklist:', 'blue');
  log('□ Create webhook route handlers');
  log('□ Implement signature validation');
  log('□ Add request body parsing');
  log('□ Set up error handling and logging');
  log('□ Configure rate limiting');
  log('□ Test with sample payloads');
  
  log('\\n🔒 Security Requirements:', 'yellow');
  log('• Validate webhook signatures');
  log('• Verify request origins');
  log('• Implement replay attack protection');
  log('• Use secure token storage');
  log('• Log all webhook activity');
  
  // Generate sample implementation
  log('\\n📝 Sample Webhook Handler (Google):', 'blue');
  log(`
export async function POST(request: Request) {
  try {
    // Verify webhook signature
    const signature = request.headers.get('x-goog-channel-token');
    const body = await request.text();
    
    if (!verifyGoogleWebhookSignature(body, signature)) {
      return new Response('Unauthorized', { status: 401 });
    }
    
    // Parse webhook data
    const webhookData = JSON.parse(body);
    
    // Process calendar changes
    await handleGoogleCalendarWebhook(webhookData);
    
    return new Response('OK', { status: 200 });
  } catch (error) {
    console.error('Google webhook error:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}
  `);
  
  log('\\n📝 Sample Webhook Handler (Microsoft):', 'blue');
  log(`
export async function POST(request: Request) {
  try {
    // Verify client state
    const clientState = request.headers.get('x-client-state');
    
    if (!verifyMicrosoftClientState(clientState)) {
      return new Response('Unauthorized', { status: 401 });
    }
    
    // Parse webhook data
    const notifications = await request.json();
    
    // Process each notification
    for (const notification of notifications.value) {
      await handleMicrosoftCalendarWebhook(notification);
    }
    
    return new Response('OK', { status: 200 });
  } catch (error) {
    console.error('Microsoft webhook error:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}
  `);
}

function generateDeploymentInstructions() {
  logHeader('Webhook Deployment Instructions');
  
  const nodeEnv = process.env.NODE_ENV || 'development';
  const appUrl = process.env.VITE_APP_URL;
  
  log('\\n🚀 Deployment Steps:', 'blue');
  
  if (nodeEnv === 'production') {
    log('Production Deployment:');
    log('1. Ensure HTTPS is configured and working');
    log('2. Deploy application with webhook routes');
    log('3. Test webhook endpoints externally');
    log('4. Configure Google Calendar push notifications');
    log('5. Set up Microsoft Graph subscriptions');
    log('6. Monitor webhook delivery and errors');
  } else {
    log('Development/Staging Deployment:');
    log('1. Use ngrok or similar for local webhook testing');
    log('2. Update environment variables with public URL');
    log('3. Test webhook endpoints');
    log('4. Configure temporary webhook subscriptions');
  }
  
  log('\\n🔍 Testing Commands:', 'blue');
  log('• Test Google webhook: curl -X POST ' + (appUrl || 'https://your-domain.com') + '/api/webhooks/google-calendar');
  log('• Test Microsoft webhook: curl -X POST ' + (appUrl || 'https://your-domain.com') + '/api/webhooks/microsoft');
  log('• Validate configuration: npm run validate-config');
  log('• Check OAuth setup: npm run check-oauth');
  
  log('\\n📊 Monitoring Setup:', 'blue');
  log('• Set up webhook delivery monitoring');
  log('• Configure error alerting');
  log('• Track webhook response times');
  log('• Monitor subscription renewals');
  log('• Set up calendar sync health checks');
}

async function main() {
  log(`${colors.bold}${colors.blue}Calendar Webhook Configuration${colors.reset}`);
  log('This script helps configure and test webhook endpoints for calendar integrations.\\n');
  
  if (!loadEnvFile()) {
    process.exit(1);
  }
  
  // Validate webhook configuration
  const configValid = validateWebhookConfiguration();
  
  if (!configValid) {
    logError('Webhook configuration is invalid. Please fix the errors above.');
    process.exit(1);
  }
  
  // Test webhook endpoints
  const googleWebhookOk = await testGoogleWebhooks();
  const microsoftWebhookOk = await testMicrosoftWebhooks();
  
  // Generate implementation examples
  generateWebhookImplementation();
  
  // Generate deployment instructions
  generateDeploymentInstructions();
  
  logHeader('Webhook Configuration Summary');
  
  if (googleWebhookOk && microsoftWebhookOk) {
    logSuccess('✅ All webhook endpoints are accessible and ready!');
    log('\\nNext steps:', 'green');
    log('1. Implement webhook signature validation');
    log('2. Set up Google Calendar push notifications');
    log('3. Configure Microsoft Graph subscriptions');
    log('4. Test end-to-end calendar sync');
    log('5. Set up monitoring and error handling');
  } else {
    logWarning('⚠️  Some webhook endpoints are not accessible.');
    log('\\nRequired actions:', 'yellow');
    
    if (!googleWebhookOk) {
      log('• Fix Google Calendar webhook endpoint');
    }
    
    if (!microsoftWebhookOk) {
      log('• Fix Microsoft Calendar webhook endpoint');
    }
    
    log('• Review deployment configuration');
    log('• Ensure application is running and accessible');
    log('• Check SSL/TLS configuration for production');
  }
  
  process.exit(googleWebhookOk && microsoftWebhookOk ? 0 : 1);
}

if (require.main === module) {
  main();
}