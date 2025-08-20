#!/usr/bin/env node

/**
 * Security Validation Script
 * Validates that all security recommendations have been implemented
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

// Load environment variables
function loadEnvFile(envPath) {
  if (!fs.existsSync(envPath)) {
    return {};
  }

  try {
    const envContent = fs.readFileSync(envPath, 'utf8');
    const env = {};
    const lines = envContent.split('\n');
    
    lines.forEach(line => {
      const [key, ...valueParts] = line.split('=');
      if (key && !key.startsWith('#') && valueParts.length > 0) {
        env[key.trim()] = valueParts.join('=').trim();
      }
    });
    
    return env;
  } catch (error) {
    logError(`Failed to load ${envPath}: ${error.message}`);
    return {};
  }
}

// Check for development test files
function checkDevelopmentFiles() {
  logHeader('Checking for Development Test Files');
  
  const testFiles = [
    'test-signup-fix.html',
    'apply-signup-fix.js',
    'apply-signup-fix.html'
  ];
  
  let foundFiles = [];
  
  testFiles.forEach(file => {
    const filePath = path.join(process.cwd(), file);
    if (fs.existsSync(filePath)) {
      foundFiles.push(file);
    }
  });
  
  if (foundFiles.length === 0) {
    logSuccess('No development test files found in production directory');
    return true;
  } else {
    foundFiles.forEach(file => {
      logError(`Development test file found: ${file}`);
    });
    logWarning('Remove these files before deploying to production');
    return false;
  }
}

// Check JWT secrets
function checkJWTSecrets() {
  logHeader('Validating JWT Secrets');
  
  const backendEnv = loadEnvFile(path.join(process.cwd(), 'backend', '.env'));
  let allValid = true;
  
  // Check JWT_SECRET
  const jwtSecret = backendEnv.JWT_SECRET;
  if (!jwtSecret) {
    logError('JWT_SECRET is not configured');
    allValid = false;
  } else if (jwtSecret.includes('your-super-secret') || jwtSecret.includes('change-this')) {
    logError('JWT_SECRET uses default placeholder values');
    allValid = false;
  } else if (jwtSecret.length < 32) {
    logError('JWT_SECRET should be at least 32 characters long');
    allValid = false;
  } else {
    logSuccess('JWT_SECRET is properly configured');
  }
  
  // Check SESSION_SECRET
  const sessionSecret = backendEnv.SESSION_SECRET;
  if (!sessionSecret) {
    logError('SESSION_SECRET is not configured');
    allValid = false;
  } else if (sessionSecret.includes('your-super-secret') || sessionSecret.includes('change-this')) {
    logError('SESSION_SECRET uses default placeholder values');
    allValid = false;
  } else if (sessionSecret.length < 32) {
    logError('SESSION_SECRET should be at least 32 characters long');
    allValid = false;
  } else {
    logSuccess('SESSION_SECRET is properly configured');
  }
  
  return allValid;
}

// Check console logging patterns
function checkConsoleLogging() {
  logHeader('Checking Console Logging Patterns');
  
  const srcDir = path.join(process.cwd(), 'src');
  let issuesFound = [];
  
  function searchFiles(dir) {
    const files = fs.readdirSync(dir);
    
    files.forEach(file => {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);
      
      if (stat.isDirectory()) {
        searchFiles(filePath);
      } else if (file.endsWith('.ts') || file.endsWith('.tsx')) {
        const content = fs.readFileSync(filePath, 'utf8');
        const relativePath = path.relative(process.cwd(), filePath);
        
        // Skip the logger utility itself - it's allowed to use console
        if (relativePath === 'src/utils/logger.ts') {
          return;
        }
        
        // Check for direct console.log usage (excluding logger imports and conditional patterns)
        const consoleLogMatches = content.match(/(?<!logger\.)console\.(log|warn|error|info|debug)\s*\(/g);
        if (consoleLogMatches) {
          // Check if file imports logger utility
          const hasLoggerImport = content.includes("from '@/utils/logger'") || content.includes("import { logger }");
          
          if (!hasLoggerImport) {
            issuesFound.push({
              file: relativePath,
              issue: 'Direct console logging without logger utility',
              matches: consoleLogMatches.length
            });
          }
        }
        
        // Check for sensitive information in logging
        const sensitivePatterns = [
          /console\.(log|warn|error|info|debug)\s*\([^)]*user\.id[^)]*\)/g,
          /console\.(log|warn|error|info|debug)\s*\([^)]*password[^)]*\)/g,
          /console\.(log|warn|error|info|debug)\s*\([^)]*token[^)]*\)/g,
          /console\.(log|warn|error|info|debug)\s*\([^)]*secret[^)]*\)/g
        ];
        
        // Check for insecure token encryption (btoa/atob)
        const insecureEncryption = [
          /btoa\s*\([^)]*token[^)]*\)/gi,
          /atob\s*\([^)]*token[^)]*\)/gi,
          /btoa\s*\([^)]*\btoken\b/gi,
          /atob\s*\([^)]*\btoken\b/gi
        ];
        
        insecureEncryption.forEach(pattern => {
          const matches = content.match(pattern);
          if (matches) {
            issuesFound.push({
              file: path.relative(process.cwd(), filePath),
              issue: 'Insecure token encryption using btoa/atob instead of AES',
              matches: matches.length
            });
          }
        });
        
        sensitivePatterns.forEach(pattern => {
          const matches = content.match(pattern);
          if (matches) {
            issuesFound.push({
              file: path.relative(process.cwd(), filePath),
              issue: 'Potential sensitive information in console logging',
              matches: matches.length
            });
          }
        });
      }
    });
  }
  
  try {
    searchFiles(srcDir);
    
    if (issuesFound.length === 0) {
      logSuccess('Console logging patterns are properly sanitized');
      return true;
    } else {
      issuesFound.forEach(issue => {
        logWarning(`${issue.file}: ${issue.issue} (${issue.matches} occurrences)`);
      });
      return false;
    }
  } catch (error) {
    logError(`Failed to scan source files: ${error.message}`);
    return false;
  }
}

// Check production configuration
function checkProductionConfig() {
  logHeader('Checking Production Configuration');
  
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  let allValid = true;
  
  // Check if validation script exists
  if (packageJson.scripts && packageJson.scripts['validate-config']) {
    logSuccess('Configuration validation script is available');
  } else {
    logWarning('Consider adding npm run validate-config script');
  }
  
  // Check if there's a build script
  if (packageJson.scripts && packageJson.scripts['build']) {
    logSuccess('Build script is configured');
  } else {
    logError('Build script is missing');
    allValid = false;
  }
  
  // Check if logger utility exists
  const loggerPath = path.join(process.cwd(), 'src', 'utils', 'logger.ts');
  if (fs.existsSync(loggerPath)) {
    logSuccess('Production-safe logger utility is available');
  } else {
    logError('Logger utility is missing');
    allValid = false;
  }
  
  return allValid;
}

// Generate security report
function generateSecurityReport() {
  logHeader('Security Validation Summary');
  
  const checks = [
    { name: 'Development Files Removed', check: checkDevelopmentFiles },
    { name: 'JWT Secrets Configured', check: checkJWTSecrets },
    { name: 'Console Logging Sanitized', check: checkConsoleLogging },
    { name: 'Production Configuration', check: checkProductionConfig }
  ];
  
  let passedChecks = 0;
  const results = checks.map(({ name, check }) => {
    const passed = check();
    if (passed) passedChecks++;
    return { name, passed };
  });
  
  log(`\n${colors.bold}Security Validation Results:${colors.reset}`);
  results.forEach(({ name, passed }) => {
    if (passed) {
      logSuccess(`${name}: PASSED`);
    } else {
      logError(`${name}: FAILED`);
    }
  });
  
  const percentage = Math.round((passedChecks / checks.length) * 100);
  log(`\nOverall Security Score: ${percentage}%`, percentage === 100 ? 'green' : percentage >= 80 ? 'yellow' : 'red');
  
  if (percentage === 100) {
    logSuccess('\n🎉 All security validations passed!');
    log('Your application is ready for production deployment.', 'green');
  } else {
    logWarning('\n⚠️  Some security issues need attention.');
    log('Please address the failed checks before deploying to production.', 'yellow');
  }
  
  return percentage === 100;
}

function main() {
  log(`${colors.bold}${colors.blue}Security Validation Tool${colors.reset}`);
  log('Validating security improvements and production readiness.\n');
  
  const allPassed = generateSecurityReport();
  
  if (allPassed) {
    log('\n✅ Security validation completed successfully!', 'green');
    process.exit(0);
  } else {
    log('\n❌ Security validation failed. Please fix the issues above.', 'red');
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  validateSecurity: main
};