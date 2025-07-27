#!/usr/bin/env node

/**
 * Configuration Validation Script
 * Validates environment variables for calendar integrations
 */

const fs = require('fs');
const path = require('path');

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

// Required environment variables
const requiredVars = {
  database: [
    'VITE_SUPABASE_URL',
    'VITE_SUPABASE_ANON_KEY'
  ],
  google: [
    'VITE_GOOGLE_CLIENT_ID',
    'GOOGLE_CLIENT_SECRET',
    'VITE_GOOGLE_REDIRECT_URI'
  ],
  microsoft: [
    'VITE_MICROSOFT_CLIENT_ID',
    'MICROSOFT_CLIENT_SECRET',
    'VITE_MICROSOFT_REDIRECT_URI'
  ],
  security: [
    'CALENDAR_ENCRYPTION_KEY',
    'JWT_SECRET'
  ],
  app: [
    'NODE_ENV',
    'VITE_APP_URL'
  ]
};

// Optional but recommended variables
const optionalVars = [
  'VITE_GOOGLE_ANALYTICS_ID',
  'VITE_SENTRY_DSN',
  'SMTP_HOST',
  'SMTP_PORT',
  'SMTP_USER',
  'SMTP_PASS',
  'REDIS_URL'
];

function loadEnvFile() {
  const envPath = path.join(process.cwd(), '.env');
  
  if (!fs.existsSync(envPath)) {
    logError('.env file not found!');
    logWarning('Please copy .env.example to .env and configure your environment variables.');
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

function validateRequiredVars() {
  logHeader('Validating Required Environment Variables');
  
  let allValid = true;
  
  Object.entries(requiredVars).forEach(([category, vars]) => {
    log(`\n${category.toUpperCase()} Configuration:`, 'blue');
    
    vars.forEach(varName => {
      const value = process.env[varName];
      
      if (!value || value.includes('your-') || value.includes('placeholder')) {
        logError(`${varName} is not configured properly`);
        allValid = false;
      } else {
        logSuccess(`${varName} is configured`);
      }
    });
  });
  
  return allValid;
}

function validateOptionalVars() {
  logHeader('Checking Optional Environment Variables');
  
  optionalVars.forEach(varName => {
    const value = process.env[varName];
    
    if (!value || value.includes('your-') || value.includes('placeholder')) {
      logWarning(`${varName} is not configured (optional)`);
    } else {
      logSuccess(`${varName} is configured`);
    }
  });
}

function validateSpecificFormats() {
  logHeader('Validating Environment Variable Formats');
  
  const validations = [
    {
      name: 'VITE_SUPABASE_URL',
      test: (value) => value && value.startsWith('https://') && value.includes('.supabase.co'),
      message: 'Should be a valid Supabase URL (https://your-project.supabase.co)'
    },
    {
      name: 'VITE_GOOGLE_CLIENT_ID',
      test: (value) => value && value.includes('.apps.googleusercontent.com'),
      message: 'Should end with .apps.googleusercontent.com'
    },
    {
      name: 'VITE_MICROSOFT_CLIENT_ID',
      test: (value) => value && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value),
      message: 'Should be a valid UUID format'
    },
    {
      name: 'CALENDAR_ENCRYPTION_KEY',
      test: (value) => value && value.length >= 32,
      message: 'Should be at least 32 characters long'
    },
    {
      name: 'JWT_SECRET',
      test: (value) => value && value.length >= 16,
      message: 'Should be at least 16 characters long'
    },
    {
      name: 'VITE_GOOGLE_REDIRECT_URI',
      test: (value) => value && (value.startsWith('http://localhost:') || value.startsWith('https://')),
      message: 'Should be a valid URL (http://localhost for dev, https:// for production)'
    },
    {
      name: 'VITE_MICROSOFT_REDIRECT_URI',
      test: (value) => value && (value.startsWith('http://localhost:') || value.startsWith('https://')),
      message: 'Should be a valid URL (http://localhost for dev, https:// for production)'
    }
  ];
  
  let allValid = true;
  
  validations.forEach(({ name, test, message }) => {
    const value = process.env[name];
    
    if (value && !test(value)) {
      logError(`${name}: ${message}`);
      allValid = false;
    } else if (value) {
      logSuccess(`${name} format is valid`);
    }
  });
  
  return allValid;
}

function validateEnvironmentConsistency() {
  logHeader('Validating Environment Consistency');
  
  const nodeEnv = process.env.NODE_ENV;
  const appUrl = process.env.VITE_APP_URL;
  const googleRedirect = process.env.VITE_GOOGLE_REDIRECT_URI;
  const microsoftRedirect = process.env.VITE_MICROSOFT_REDIRECT_URI;
  
  let consistent = true;
  
  // Check if development environment has localhost URLs
  if (nodeEnv === 'development') {
    if (appUrl && !appUrl.includes('localhost')) {
      logWarning('Development environment should use localhost URL');
    }
    if (googleRedirect && !googleRedirect.includes('localhost')) {
      logWarning('Development Google redirect URI should use localhost');
    }
    if (microsoftRedirect && !microsoftRedirect.includes('localhost')) {
      logWarning('Development Microsoft redirect URI should use localhost');
    }
  }
  
  // Check if production environment uses HTTPS
  if (nodeEnv === 'production') {
    if (appUrl && !appUrl.startsWith('https://')) {
      logError('Production environment must use HTTPS URLs');
      consistent = false;
    }
    if (googleRedirect && !googleRedirect.startsWith('https://')) {
      logError('Production Google redirect URI must use HTTPS');
      consistent = false;
    }
    if (microsoftRedirect && !microsoftRedirect.startsWith('https://')) {
      logError('Production Microsoft redirect URI must use HTTPS');
      consistent = false;
    }
  }
  
  // Check if redirect URIs match app URL domain
  if (appUrl && googleRedirect) {
    try {
      const appDomain = new URL(appUrl).hostname;
      const googleDomain = new URL(googleRedirect).hostname;
      
      if (appDomain !== googleDomain && !googleDomain.includes('localhost')) {
        logWarning('Google redirect URI domain should match app URL domain');
      }
    } catch (error) {
      logError('Invalid URL format detected');
      consistent = false;
    }
  }
  
  if (consistent) {
    logSuccess('Environment configuration is consistent');
  }
  
  return consistent;
}

function generateReport() {
  logHeader('Configuration Report');
  
  const summary = {
    total: Object.values(requiredVars).flat().length,
    configured: 0,
    missing: 0
  };
  
  Object.values(requiredVars).flat().forEach(varName => {
    const value = process.env[varName];
    if (value && !value.includes('your-') && !value.includes('placeholder')) {
      summary.configured++;
    } else {
      summary.missing++;
    }
  });
  
  log(`\nConfiguration Summary:`);
  log(`• Total required variables: ${summary.total}`);
  log(`• Configured: ${summary.configured}`, summary.configured === summary.total ? 'green' : 'yellow');
  log(`• Missing/Invalid: ${summary.missing}`, summary.missing === 0 ? 'green' : 'red');
  
  const percentage = Math.round((summary.configured / summary.total) * 100);
  log(`• Completion: ${percentage}%`, percentage === 100 ? 'green' : percentage >= 80 ? 'yellow' : 'red');
  
  if (percentage === 100) {
    logSuccess('\n🎉 All required environment variables are configured!');
    log('You can proceed with the calendar integration setup.', 'green');
  } else {
    logWarning('\n⚠️  Some configuration is missing or invalid.');
    log('Please review the errors above and update your .env file.', 'yellow');
    log('Refer to the Calendar Deployment Guide for detailed setup instructions.', 'blue');
  }
}

function main() {
  log(`${colors.bold}${colors.blue}Calendar Integration Configuration Validator${colors.reset}`);
  log('This script validates your environment setup for Google and Microsoft Calendar integrations.\n');
  
  if (!loadEnvFile()) {
    process.exit(1);
  }
  
  const requiredValid = validateRequiredVars();
  validateOptionalVars();
  const formatValid = validateSpecificFormats();
  const consistentValid = validateEnvironmentConsistency();
  
  generateReport();
  
  if (!requiredValid || !formatValid || !consistentValid) {
    log('\n🔧 Next steps:', 'blue');
    log('1. Review the errors and warnings above');
    log('2. Update your .env file with correct values');
    log('3. Run this script again to verify the configuration');
    log('4. Refer to CALENDAR_DEPLOYMENT_GUIDE.md for detailed setup instructions');
    process.exit(1);
  } else {
    log('\n✅ Configuration validation completed successfully!', 'green');
    process.exit(0);
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  validateConfig: main
};