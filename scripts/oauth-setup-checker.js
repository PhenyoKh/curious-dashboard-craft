#!/usr/bin/env node

/**
 * OAuth Setup Checker
 * Helps verify OAuth configuration in Google Cloud Console and Microsoft Azure Portal
 */

const https = require('https');
const { URL } = require('url');

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
    
    request.setTimeout(5000, () => {
      request.destroy();
      reject(new Error('Request timeout'));
    });
    
    request.end();
  });
}

async function checkGoogleOAuthConfig() {
  logHeader('Checking Google OAuth Configuration');
  
  const clientId = process.env.VITE_GOOGLE_CLIENT_ID;
  const redirectUri = process.env.VITE_GOOGLE_REDIRECT_URI;
  
  if (!clientId || !redirectUri) {
    logError('Google OAuth environment variables not configured');
    return false;
  }
  
  // Check if client ID format is valid
  if (!clientId.includes('.apps.googleusercontent.com')) {
    logError('Invalid Google Client ID format');
    return false;
  }
  
  logSuccess('Google Client ID format is valid');
  
  // Test OAuth authorization URL
  try {
    const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    authUrl.searchParams.set('client_id', clientId);
    authUrl.searchParams.set('redirect_uri', redirectUri);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('scope', 'https://www.googleapis.com/auth/calendar');
    authUrl.searchParams.set('access_type', 'offline');
    
    const response = await makeHttpsRequest(authUrl.toString(), { method: 'HEAD' });
    
    if (response.statusCode === 200 || response.statusCode === 302) {
      logSuccess('Google OAuth authorization endpoint is accessible');
    } else if (response.statusCode === 400) {
      logError('Google OAuth configuration error - check your Client ID and redirect URI in Google Cloud Console');
      logWarning('Make sure your redirect URI is added to the authorized redirect URIs list');
      return false;
    } else {
      logWarning(`Google OAuth endpoint returned status: ${response.statusCode}`);
    }
  } catch (error) {
    logError(`Failed to check Google OAuth endpoint: ${error.message}`);
    return false;
  }
  
  return true;
}

async function checkMicrosoftOAuthConfig() {
  logHeader('Checking Microsoft OAuth Configuration');
  
  const clientId = process.env.VITE_MICROSOFT_CLIENT_ID;
  const tenantId = process.env.VITE_MICROSOFT_TENANT_ID || 'common';
  const redirectUri = process.env.VITE_MICROSOFT_REDIRECT_URI;
  
  if (!clientId || !redirectUri) {
    logError('Microsoft OAuth environment variables not configured');
    return false;
  }
  
  // Check if client ID format is valid (UUID)
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(clientId)) {
    logError('Invalid Microsoft Client ID format (should be UUID)');
    return false;
  }
  
  logSuccess('Microsoft Client ID format is valid');
  
  // Test OAuth authorization URL
  try {
    const authUrl = new URL(`https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/authorize`);
    authUrl.searchParams.set('client_id', clientId);
    authUrl.searchParams.set('redirect_uri', redirectUri);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('scope', 'https://graph.microsoft.com/Calendars.ReadWrite');
    
    const response = await makeHttpsRequest(authUrl.toString(), { method: 'HEAD' });
    
    if (response.statusCode === 200 || response.statusCode === 302) {
      logSuccess('Microsoft OAuth authorization endpoint is accessible');
    } else if (response.statusCode === 400) {
      logError('Microsoft OAuth configuration error - check your Client ID and redirect URI in Azure Portal');
      logWarning('Make sure your redirect URI is added to the app registration');
      return false;
    } else {
      logWarning(`Microsoft OAuth endpoint returned status: ${response.statusCode}`);
    }
  } catch (error) {
    logError(`Failed to check Microsoft OAuth endpoint: ${error.message}`);
    return false;
  }
  
  return true;
}

function checkRedirectUriSecurity() {
  logHeader('Checking Redirect URI Security');
  
  const googleRedirect = process.env.VITE_GOOGLE_REDIRECT_URI;
  const microsoftRedirect = process.env.VITE_MICROSOFT_REDIRECT_URI;
  const nodeEnv = process.env.NODE_ENV;
  
  let secure = true;
  
  // Check if production environment uses HTTPS
  if (nodeEnv === 'production') {
    if (googleRedirect && !googleRedirect.startsWith('https://')) {
      logError('Google redirect URI must use HTTPS in production');
      secure = false;
    }
    
    if (microsoftRedirect && !microsoftRedirect.startsWith('https://')) {
      logError('Microsoft redirect URI must use HTTPS in production');
      secure = false;
    }
    
    if (secure) {
      logSuccess('All redirect URIs use HTTPS (production requirement)');
    }
  } else {
    logSuccess('Development environment - HTTP allowed for localhost');
  }
  
  // Check for common security issues
  if (googleRedirect && googleRedirect.includes('127.0.0.1') && nodeEnv === 'production') {
    logWarning('Using 127.0.0.1 in production is not recommended, use your domain instead');
  }
  
  if (microsoftRedirect && microsoftRedirect.includes('127.0.0.1') && nodeEnv === 'production') {
    logWarning('Using 127.0.0.1 in production is not recommended, use your domain instead');
  }
  
  return secure;
}

function generateSetupInstructions() {
  logHeader('OAuth Setup Instructions');
  
  const nodeEnv = process.env.NODE_ENV || 'development';
  const appUrl = process.env.VITE_APP_URL || 'http://localhost:5173';
  const googleRedirect = process.env.VITE_GOOGLE_REDIRECT_URI || `${appUrl}/auth/google/callback`;
  const microsoftRedirect = process.env.VITE_MICROSOFT_REDIRECT_URI || `${appUrl}/auth/microsoft/callback`;
  
  log('\\n📋 Google Cloud Console Setup:', 'blue');
  log('1. Go to https://console.cloud.google.com/');
  log('2. Enable Google Calendar API');
  log('3. Create OAuth 2.0 credentials');
  log(`4. Add redirect URI: ${googleRedirect}`);
  log('5. Add required scopes:');
  log('   - https://www.googleapis.com/auth/calendar');
  log('   - https://www.googleapis.com/auth/calendar.events');
  log('   - https://www.googleapis.com/auth/userinfo.profile');
  log('   - https://www.googleapis.com/auth/userinfo.email');
  
  log('\\n📋 Microsoft Azure Portal Setup:', 'blue');
  log('1. Go to https://portal.azure.com/');
  log('2. Go to Azure Active Directory > App registrations');
  log('3. Create new registration or select existing');
  log(`4. Add redirect URI: ${microsoftRedirect}`);
  log('5. Add API permissions:');
  log('   - Microsoft Graph > Delegated permissions:');
  log('     • Calendars.ReadWrite');
  log('     • User.Read');
  log('     • OnlineMeetings.ReadWrite (for Teams)');
  log('6. Create client secret in "Certificates & secrets"');
  
  if (nodeEnv === 'production') {
    log('\\n🔒 Production Security Checklist:', 'yellow');
    log('• Verify domain ownership in OAuth consent screens');
    log('• Use HTTPS for all redirect URIs');
    log('• Store client secrets securely');
    log('• Enable audit logging');
    log('• Review API quotas and limits');
  }
}

async function main() {
  log(`${colors.bold}${colors.blue}OAuth Configuration Checker${colors.reset}`);
  log('This script verifies your OAuth setup for Google and Microsoft Calendar integrations.\\n');
  
  if (!loadEnvFile()) {
    process.exit(1);
  }
  
  const googleValid = await checkGoogleOAuthConfig();
  const microsoftValid = await checkMicrosoftOAuthConfig();
  const redirectSecure = checkRedirectUriSecurity();
  
  generateSetupInstructions();
  
  logHeader('OAuth Configuration Summary');
  
  if (googleValid && microsoftValid && redirectSecure) {
    logSuccess('✅ OAuth configuration appears to be correct!');
    log('You should be able to test the OAuth flows now.', 'green');
    log('\\nNext steps:', 'blue');
    log('1. Test Google Calendar OAuth flow');
    log('2. Test Microsoft Calendar OAuth flow');
    log('3. Verify calendar sync functionality');
  } else {
    logWarning('⚠️  Some OAuth configuration issues detected.');
    log('Please review the errors above and update your OAuth settings.', 'yellow');
    log('Refer to the setup instructions and deployment guide for details.', 'blue');
  }
  
  process.exit(googleValid && microsoftValid && redirectSecure ? 0 : 1);
}

if (require.main === module) {
  main();
}