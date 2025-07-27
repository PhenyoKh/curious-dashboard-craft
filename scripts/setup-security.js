#!/usr/bin/env node

/**
 * Security Configuration Script
 * Sets up production security settings and validates security configuration
 */

const crypto = require('crypto');
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

function generateSecureKey(length = 32) {
  return crypto.randomBytes(length).toString('hex');
}

function generateJWTSecret(length = 64) {
  return crypto.randomBytes(length).toString('base64');
}

function validateEncryptionKey(key) {
  const issues = [];
  const warnings = [];

  if (!key) {
    issues.push('No encryption key provided');
    return { valid: false, issues, warnings };
  }

  if (key.length < 32) {
    issues.push('Encryption key must be at least 32 characters long');
  }

  if (key.includes('your-') || key.includes('placeholder')) {
    issues.push('Encryption key contains placeholder text');
  }

  // Check for common weak keys
  const weakKeys = [
    '12345678901234567890123456789012',
    'abcdefghijklmnopqrstuvwxyz123456',
    'password123456789012345678901234',
    'secretkey123456789012345678901234'
  ];

  if (weakKeys.includes(key)) {
    issues.push('Using a weak/common encryption key');
  }

  // Check entropy (simple check for repeated characters)
  const uniqueChars = new Set(key).size;
  if (uniqueChars < key.length * 0.5) {
    warnings.push('Encryption key may have low entropy (many repeated characters)');
  }

  return {
    valid: issues.length === 0,
    issues,
    warnings
  };
}

function validateJWTSecret(secret) {
  const issues = [];
  const warnings = [];

  if (!secret) {
    issues.push('No JWT secret provided');
    return { valid: false, issues, warnings };
  }

  if (secret.length < 16) {
    issues.push('JWT secret should be at least 16 characters long');
  }

  if (secret.includes('your-') || secret.includes('placeholder')) {
    issues.push('JWT secret contains placeholder text');
  }

  // Recommend longer keys for production
  if (secret.length < 32 && process.env.NODE_ENV === 'production') {
    warnings.push('JWT secret should be at least 32 characters for production');
  }

  return {
    valid: issues.length === 0,
    issues,
    warnings
  };
}

function validateSecurityConfiguration() {
  logHeader('Validating Security Configuration');

  const nodeEnv = process.env.NODE_ENV;
  const encryptionKey = process.env.CALENDAR_ENCRYPTION_KEY;
  const jwtSecret = process.env.JWT_SECRET;
  const encryptionEnabled = process.env.VITE_ENCRYPTION_ENABLED;
  const appUrl = process.env.VITE_APP_URL;

  let allValid = true;
  const issues = [];
  const warnings = [];

  // Validate environment
  if (nodeEnv === 'production') {
    logSuccess('Running in production mode');
    
    if (!appUrl || !appUrl.startsWith('https://')) {
      issues.push('Production environment must use HTTPS URLs');
      allValid = false;
    }
    
    if (encryptionEnabled !== 'true') {
      issues.push('Token encryption must be enabled in production');
      allValid = false;
    }
  } else {
    log(`Running in ${nodeEnv || 'development'} mode`, 'blue');
  }

  // Validate encryption key
  const encryptionValidation = validateEncryptionKey(encryptionKey);
  if (!encryptionValidation.valid) {
    encryptionValidation.issues.forEach(issue => {
      logError(`Encryption Key: ${issue}`);
      issues.push(issue);
    });
    allValid = false;
  } else {
    logSuccess('Encryption key is valid');
  }

  encryptionValidation.warnings.forEach(warning => {
    logWarning(`Encryption Key: ${warning}`);
    warnings.push(warning);
  });

  // Validate JWT secret
  const jwtValidation = validateJWTSecret(jwtSecret);
  if (!jwtValidation.valid) {
    jwtValidation.issues.forEach(issue => {
      logError(`JWT Secret: ${issue}`);
      issues.push(issue);
    });
    allValid = false;
  } else {
    logSuccess('JWT secret is valid');
  }

  jwtValidation.warnings.forEach(warning => {
    logWarning(`JWT Secret: ${warning}`);
    warnings.push(warning);
  });

  // Check debug settings in production
  if (nodeEnv === 'production') {
    const debugSettings = [
      'VITE_DEBUG_CALENDAR_SYNC',
      'VITE_DEBUG_OAUTH_FLOW',
      'VITE_VERBOSE_LOGGING'
    ];

    debugSettings.forEach(setting => {
      if (process.env[setting] === 'true') {
        warnings.push(`${setting} is enabled in production`);
        logWarning(`${setting} should be disabled in production`);
      }
    });
  }

  return { valid: allValid, issues, warnings };
}

function generateSecurityConfig() {
  logHeader('Generating Security Configuration');

  const encryptionKey = generateSecureKey(32);
  const jwtSecret = generateJWTSecret(64);

  log('Generated secure configuration:', 'blue');
  log(`CALENDAR_ENCRYPTION_KEY=${encryptionKey}`);
  log(`JWT_SECRET=${jwtSecret}`);
  log('VITE_ENCRYPTION_ENABLED=true');

  log('\n⚠️  Security Notes:', 'yellow');
  log('• Store these keys securely and never commit them to version control');
  log('• Use different keys for different environments (dev, staging, production)');
  log('• Rotate keys regularly (recommended: every 90 days)');
  log('• Keep backups of keys in a secure location');
  log('• Use environment-specific secret management (AWS Secrets Manager, Azure Key Vault, etc.)');

  return { encryptionKey, jwtSecret };
}

function checkFilePermissions() {
  logHeader('Checking File Permissions');

  const sensitiveFiles = [
    '.env',
    '.env.local',
    '.env.production'
  ];

  sensitiveFiles.forEach(file => {
    const filePath = path.join(process.cwd(), file);
    
    if (fs.existsSync(filePath)) {
      try {
        const stats = fs.statSync(filePath);
        const mode = stats.mode;
        
        // Check if file is readable by others (non-owner/group)
        if (mode & 0o004) {
          logWarning(`${file} is readable by others - consider restricting permissions`);
          log(`  Recommended: chmod 600 ${file}`, 'blue');
        } else {
          logSuccess(`${file} has appropriate permissions`);
        }
      } catch (error) {
        logWarning(`Could not check permissions for ${file}: ${error.message}`);
      }
    }
  });
}

function performSecurityAudit() {
  logHeader('Security Audit');

  const auditResults = {
    passed: [],
    failed: [],
    warnings: []
  };

  // Check HTTPS configuration
  const appUrl = process.env.VITE_APP_URL;
  if (process.env.NODE_ENV === 'production') {
    if (appUrl && appUrl.startsWith('https://')) {
      auditResults.passed.push('HTTPS enabled for production');
    } else {
      auditResults.failed.push('HTTPS not configured for production');
    }
  }

  // Check encryption settings
  if (process.env.VITE_ENCRYPTION_ENABLED === 'true') {
    auditResults.passed.push('Token encryption enabled');
  } else {
    if (process.env.NODE_ENV === 'production') {
      auditResults.failed.push('Token encryption disabled in production');
    } else {
      auditResults.warnings.push('Token encryption disabled (development mode)');
    }
  }

  // Check secret strength
  const encryptionKey = process.env.CALENDAR_ENCRYPTION_KEY;
  const jwtSecret = process.env.JWT_SECRET;

  if (encryptionKey && encryptionKey.length >= 32) {
    auditResults.passed.push('Encryption key meets minimum length requirements');
  } else {
    auditResults.failed.push('Encryption key does not meet security requirements');
  }

  if (jwtSecret && jwtSecret.length >= 16) {
    auditResults.passed.push('JWT secret meets minimum length requirements');
  } else {
    auditResults.failed.push('JWT secret does not meet security requirements');
  }

  // Check for debug settings in production
  if (process.env.NODE_ENV === 'production') {
    const debugVars = ['VITE_DEBUG_CALENDAR_SYNC', 'VITE_DEBUG_OAUTH_FLOW', 'VITE_VERBOSE_LOGGING'];
    const enabledDebug = debugVars.filter(v => process.env[v] === 'true');
    
    if (enabledDebug.length === 0) {
      auditResults.passed.push('Debug settings disabled in production');
    } else {
      auditResults.warnings.push(`Debug settings enabled in production: ${enabledDebug.join(', ')}`);
    }
  }

  // Display results
  log('\\n📊 Security Audit Results:', 'blue');
  
  if (auditResults.passed.length > 0) {
    log('\\n✅ Passed Checks:', 'green');
    auditResults.passed.forEach(check => log(`  • ${check}`, 'green'));
  }

  if (auditResults.warnings.length > 0) {
    log('\\n⚠️  Warnings:', 'yellow');
    auditResults.warnings.forEach(warning => log(`  • ${warning}`, 'yellow'));
  }

  if (auditResults.failed.length > 0) {
    log('\\n❌ Failed Checks:', 'red');
    auditResults.failed.forEach(failure => log(`  • ${failure}`, 'red'));
  }

  const score = Math.round(
    (auditResults.passed.length / (auditResults.passed.length + auditResults.failed.length)) * 100
  );
  
  log(`\\n🎯 Security Score: ${score}%`, score >= 80 ? 'green' : score >= 60 ? 'yellow' : 'red');

  return {
    score,
    passed: auditResults.failed.length === 0,
    results: auditResults
  };
}

function generateSecurityRecommendations() {
  logHeader('Security Recommendations');

  const nodeEnv = process.env.NODE_ENV;

  log('🔒 Production Security Checklist:', 'blue');
  log('□ Enable HTTPS with valid SSL certificate');
  log('□ Use strong encryption keys (32+ characters)');
  log('□ Enable token encryption in production');
  log('□ Disable debug logging in production');
  log('□ Implement rate limiting for API endpoints');
  log('□ Set up security headers (CSP, HSTS, etc.)');
  log('□ Use environment-specific secret management');
  log('□ Implement audit logging for security events');
  log('□ Set up monitoring for failed authentication attempts');
  log('□ Regular security key rotation (every 90 days)');

  log('\\n🛡️  OAuth Security:', 'blue');
  log('• Use state parameters to prevent CSRF attacks');
  log('• Validate redirect URIs strictly');
  log('• Implement PKCE for public clients');
  log('• Store tokens securely with encryption');
  log('• Implement proper token refresh flows');
  log('• Set appropriate token expiration times');

  log('\\n🔐 Database Security:', 'blue');
  log('• Enable Row Level Security (RLS) policies');
  log('• Use service role keys only for server-side operations');
  log('• Implement proper access controls');
  log('• Encrypt sensitive data at rest');
  log('• Regular security audits and updates');

  if (nodeEnv !== 'production') {
    log('\\n🚧 Development Environment Notes:', 'yellow');
    log('• Use different keys for each environment');
    log('• Never use production keys in development');
    log('• Test security configurations before deployment');
    log('• Use tools like ngrok for webhook testing');
  }
}

async function main() {
  log(`${colors.bold}${colors.blue}Calendar Integration Security Setup${colors.reset}`);
  log('This script configures and validates security settings for calendar integrations.\\n');

  const args = process.argv.slice(2);
  const generateKeys = args.includes('--generate-keys');
  const auditOnly = args.includes('--audit-only');

  if (!loadEnvFile()) {
    logWarning('No .env file found - you may need to create one first');
  }

  if (generateKeys) {
    generateSecurityConfig();
    log('\\n💡 Next steps:', 'blue');
    log('1. Add the generated keys to your .env file');
    log('2. Restart your application');
    log('3. Run this script again to validate the configuration');
    return;
  }

  // Validate current configuration
  const validation = validateSecurityConfiguration();
  
  // Check file permissions
  checkFilePermissions();
  
  // Perform security audit
  const audit = performSecurityAudit();
  
  // Generate recommendations
  generateSecurityRecommendations();

  logHeader('Security Setup Summary');

  if (validation.valid && audit.passed) {
    logSuccess('✅ Security configuration is valid and secure!');
    log('Your calendar integration security is properly configured.', 'green');
  } else {
    if (!validation.valid) {
      logError('❌ Security configuration has issues that need to be addressed.');
      log('Please fix the configuration errors above.', 'red');
    }
    
    if (!audit.passed) {
      logWarning('⚠️  Security audit found areas for improvement.');
      log('Review the failed checks and warnings above.', 'yellow');
    }
  }

  log('\\n🔧 Available Commands:', 'blue');
  log('• npm run setup-security -- --generate-keys  # Generate new security keys');
  log('• npm run setup-security -- --audit-only     # Perform security audit only');
  log('• npm run validate-config                    # Validate all configuration');

  process.exit(validation.valid && audit.passed ? 0 : 1);
}

if (require.main === module) {
  main();
}