#!/usr/bin/env node

/**
 * Production Deployment Script
 * 
 * This script:
 * 1. Backs up the current production version
 * 2. Uploads the new /dist folder to production
 * 3. Clears CDN and browser caches
 * 4. Provides rollback functionality
 * 5. Validates deployment success
 * 
 * Usage:
 *   node scripts/deploy-to-production.js [options]
 * 
 * Options:
 *   --dry-run       Show what would be deployed without making changes
 *   --skip-backup   Skip creating backup (not recommended)
 *   --skip-cache    Skip cache clearing
 *   --rollback      Rollback to previous version
 *   --config PATH   Path to deployment config file
 */

import fs from 'fs/promises';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// Configuration (can be overridden with --config)
const DEFAULT_CONFIG = {
  // Server Configuration
  server: {
    host: process.env.DEPLOY_HOST || 'your-server.com',
    user: process.env.DEPLOY_USER || 'deploy',
    port: process.env.DEPLOY_PORT || 22,
    keyPath: process.env.DEPLOY_KEY_PATH || '~/.ssh/id_rsa'
  },
  
  // Paths
  paths: {
    localDist: './dist',
    remoteWebRoot: process.env.DEPLOY_WEB_ROOT || '/var/www/html',
    backupDir: process.env.DEPLOY_BACKUP_DIR || '/var/www/backups',
    tempDir: '/tmp/scola-deploy'
  },
  
  // CDN/Cache Configuration
  cache: {
    // Cloudflare configuration
    cloudflare: {
      enabled: process.env.CLOUDFLARE_ENABLED === 'true',
      apiToken: process.env.CLOUDFLARE_API_TOKEN,
      zoneId: process.env.CLOUDFLARE_ZONE_ID
    },
    
    // File extensions to purge from browser cache
    cacheBustExtensions: ['.js', '.css', '.html', '.json'],
    
    // Cache-Control headers to set
    cacheHeaders: {
      '.js': 'public, max-age=31536000, immutable',
      '.css': 'public, max-age=31536000, immutable',
      '.html': 'public, max-age=300',
      '.json': 'public, max-age=300'
    }
  },
  
  // Health check configuration
  healthCheck: {
    enabled: true,
    url: process.env.DEPLOY_HEALTH_CHECK_URL || 'https://www.scola.co.za',
    timeout: 10000,
    retries: 3
  }
};

class DeploymentScript {
  constructor(config = DEFAULT_CONFIG) {
    this.config = config;
    this.timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    this.backupPath = `${config.paths.backupDir}/backup-${this.timestamp}`;
    this.dryRun = false;
    this.skipBackup = false;
    this.skipCache = false;
  }

  async log(message, level = 'info') {
    const timestamp = new Date().toISOString();
    const prefix = {
      info: '📋',
      success: '✅',
      warning: '⚠️',
      error: '❌',
      deploy: '🚀'
    }[level] || '📋';
    
    console.log(`${prefix} [${timestamp}] ${message}`);
  }

  async executeCommand(command, options = {}) {
    if (this.dryRun) {
      await this.log(`[DRY RUN] Would execute: ${command}`, 'info');
      return { stdout: '', stderr: '' };
    }

    try {
      await this.log(`Executing: ${command}`, 'info');
      const result = await execAsync(command, options);
      return result;
    } catch (error) {
      await this.log(`Command failed: ${error.message}`, 'error');
      throw error;
    }
  }

  async checkPrerequisites() {
    await this.log('Checking deployment prerequisites...', 'info');

    // Check if dist folder exists
    try {
      await fs.access(this.config.paths.localDist);
      await this.log(`✓ Local dist folder found: ${this.config.paths.localDist}`, 'success');
    } catch (error) {
      throw new Error(`Local dist folder not found: ${this.config.paths.localDist}`);
    }

    // Check SSH connectivity
    try {
      const sshCommand = `ssh -o ConnectTimeout=10 -i ${this.config.server.keyPath} ${this.config.server.user}@${this.config.server.host} "echo 'SSH connection test successful'"`;
      await this.executeCommand(sshCommand);
      await this.log('✓ SSH connection successful', 'success');
    } catch (error) {
      throw new Error(`SSH connection failed: ${error.message}`);
    }

    // Check if rsync is available
    try {
      await this.executeCommand('rsync --version');
      await this.log('✓ rsync is available', 'success');
    } catch (error) {
      throw new Error('rsync is required but not available');
    }

    await this.log('All prerequisites satisfied', 'success');
  }

  async createBackup() {
    if (this.skipBackup) {
      await this.log('Skipping backup creation', 'warning');
      return;
    }

    await this.log('Creating backup of current production version...', 'deploy');

    const commands = [
      // Create backup directory
      `ssh -i ${this.config.server.keyPath} ${this.config.server.user}@${this.config.server.host} "mkdir -p ${this.config.paths.backupDir}"`,
      
      // Create timestamped backup
      `ssh -i ${this.config.server.keyPath} ${this.config.server.user}@${this.config.server.host} "cp -r ${this.config.paths.remoteWebRoot} ${this.backupPath}"`,
      
      // Clean up old backups (keep last 5)
      `ssh -i ${this.config.server.keyPath} ${this.config.server.user}@${this.config.server.host} "cd ${this.config.paths.backupDir} && ls -t | tail -n +6 | xargs rm -rf"`
    ];

    for (const command of commands) {
      await this.executeCommand(command);
    }

    await this.log(`Backup created: ${this.backupPath}`, 'success');
  }

  async uploadFiles() {
    await this.log('Uploading new files to production...', 'deploy');

    // Create temporary directory on server
    const createTempDirCommand = `ssh -i ${this.config.server.keyPath} ${this.config.server.user}@${this.config.server.host} "mkdir -p ${this.config.paths.tempDir}"`;
    await this.executeCommand(createTempDirCommand);

    // Upload files to temporary directory first
    const rsyncCommand = [
      'rsync',
      '-avz',
      '--delete',
      '--compress',
      `--rsh="ssh -i ${this.config.server.keyPath} -p ${this.config.server.port}"`,
      '--progress',
      `${this.config.paths.localDist}/`,
      `${this.config.server.user}@${this.config.server.host}:${this.config.paths.tempDir}/`
    ].join(' ');

    await this.executeCommand(rsyncCommand);

    // Atomically move files from temp to production
    const moveCommand = `ssh -i ${this.config.server.keyPath} ${this.config.server.user}@${this.config.server.host} "rm -rf ${this.config.paths.remoteWebRoot}.old && mv ${this.config.paths.remoteWebRoot} ${this.config.paths.remoteWebRoot}.old && mv ${this.config.paths.tempDir} ${this.config.paths.remoteWebRoot}"`;
    await this.executeCommand(moveCommand);

    await this.log('Files uploaded successfully', 'success');
  }

  async setCacheHeaders() {
    await this.log('Setting cache headers...', 'info');

    const commands = [];
    
    // Create .htaccess for Apache or nginx config for cache headers
    const htaccessContent = `
# Cache Control Headers - Generated by deployment script
<IfModule mod_expires.c>
    ExpiresActive on
    
    # JavaScript and CSS files (1 year)
    ExpiresByType text/javascript "access plus 1 year"
    ExpiresByType application/javascript "access plus 1 year"
    ExpiresByType text/css "access plus 1 year"
    
    # HTML files (5 minutes)
    ExpiresByType text/html "access plus 5 minutes"
    
    # JSON files (5 minutes)
    ExpiresByType application/json "access plus 5 minutes"
    
    # Images (1 month)
    ExpiresByType image/png "access plus 1 month"
    ExpiresByType image/jpg "access plus 1 month"
    ExpiresByType image/jpeg "access plus 1 month"
    ExpiresByType image/svg+xml "access plus 1 month"
</IfModule>

# Cache busting for updated files
<IfModule mod_headers.c>
    # Set ETags for cache validation
    FileETag MTime Size
    
    # Add cache-busting headers
    <FilesMatch "\\.(js|css)$">
        Header set Cache-Control "public, max-age=31536000, immutable"
    </FilesMatch>
    
    <FilesMatch "\\.(html|json)$">
        Header set Cache-Control "public, max-age=300"
    </FilesMatch>
</IfModule>
`;

    const htaccessCommand = `ssh -i ${this.config.server.keyPath} ${this.config.server.user}@${this.config.server.host} "echo '${htaccessContent.replace(/'/g, "'\\''")}' > ${this.config.paths.remoteWebRoot}/.htaccess"`;
    
    if (!this.skipCache) {
      await this.executeCommand(htaccessCommand);
      await this.log('Cache headers configured', 'success');
    }
  }

  async clearCloudflareCache() {
    if (!this.config.cache.cloudflare.enabled || this.skipCache) {
      await this.log('Skipping Cloudflare cache clear', 'info');
      return;
    }

    if (!this.config.cache.cloudflare.apiToken || !this.config.cache.cloudflare.zoneId) {
      await this.log('Cloudflare credentials not configured', 'warning');
      return;
    }

    await this.log('Clearing Cloudflare cache...', 'info');

    const curlCommand = `curl -X POST "https://api.cloudflare.com/client/v4/zones/${this.config.cache.cloudflare.zoneId}/purge_cache" \
     -H "Authorization: Bearer ${this.config.cache.cloudflare.apiToken}" \
     -H "Content-Type: application/json" \
     --data '{"purge_everything":true}'`;

    try {
      await this.executeCommand(curlCommand);
      await this.log('Cloudflare cache cleared', 'success');
    } catch (error) {
      await this.log(`Failed to clear Cloudflare cache: ${error.message}`, 'warning');
    }
  }

  async performHealthCheck() {
    if (!this.config.healthCheck.enabled) {
      await this.log('Health check disabled', 'info');
      return;
    }

    await this.log('Performing health check...', 'info');

    for (let i = 0; i < this.config.healthCheck.retries; i++) {
      try {
        const curlCommand = `curl -s -o /dev/null -w "%{http_code}" --max-time ${this.config.healthCheck.timeout / 1000} "${this.config.healthCheck.url}"`;
        const result = await this.executeCommand(curlCommand);
        
        const statusCode = result.stdout.trim();
        if (statusCode === '200') {
          await this.log(`Health check passed (HTTP ${statusCode})`, 'success');
          return;
        } else {
          throw new Error(`HTTP ${statusCode}`);
        }
      } catch (error) {
        if (i === this.config.healthCheck.retries - 1) {
          throw new Error(`Health check failed after ${this.config.healthCheck.retries} retries: ${error.message}`);
        }
        await this.log(`Health check attempt ${i + 1} failed, retrying...`, 'warning');
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
  }

  async rollback() {
    await this.log('Rolling back to previous version...', 'deploy');

    // Find the most recent backup
    const listBackupsCommand = `ssh -i ${this.config.server.keyPath} ${this.config.server.user}@${this.config.server.host} "ls -t ${this.config.paths.backupDir} | head -1"`;
    const result = await this.executeCommand(listBackupsCommand);
    const latestBackup = result.stdout.trim();

    if (!latestBackup) {
      throw new Error('No backup found for rollback');
    }

    const rollbackPath = `${this.config.paths.backupDir}/${latestBackup}`;
    
    // Rollback commands
    const commands = [
      `ssh -i ${this.config.server.keyPath} ${this.config.server.user}@${this.config.server.host} "rm -rf ${this.config.paths.remoteWebRoot}"`,
      `ssh -i ${this.config.server.keyPath} ${this.config.server.user}@${this.config.server.host} "cp -r ${rollbackPath} ${this.config.paths.remoteWebRoot}"`
    ];

    for (const command of commands) {
      await this.executeCommand(command);
    }

    await this.log(`Rollback completed from backup: ${latestBackup}`, 'success');

    // Clear cache after rollback
    if (!this.skipCache) {
      await this.clearCloudflareCache();
    }
  }

  async generateDeploymentReport() {
    const report = {
      timestamp: this.timestamp,
      dryRun: this.dryRun,
      backupPath: this.skipBackup ? null : this.backupPath,
      deploymentUrl: this.config.healthCheck.url,
      files: []
    };

    // Get list of deployed files
    try {
      const files = await fs.readdir(this.config.paths.localDist, { recursive: true });
      report.files = files;
    } catch (error) {
      await this.log(`Could not generate file list: ${error.message}`, 'warning');
    }

    const reportPath = `./deployment-report-${this.timestamp}.json`;
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
    await this.log(`Deployment report saved: ${reportPath}`, 'info');
  }

  async deploy() {
    try {
      await this.log('🚀 Starting production deployment...', 'deploy');
      await this.log(`Timestamp: ${this.timestamp}`, 'info');
      
      if (this.dryRun) {
        await this.log('DRY RUN MODE - No actual changes will be made', 'warning');
      }

      // Main deployment steps
      await this.checkPrerequisites();
      await this.createBackup();
      await this.uploadFiles();
      await this.setCacheHeaders();
      await this.clearCloudflareCache();
      await this.performHealthCheck();
      await this.generateDeploymentReport();

      await this.log('🎉 Deployment completed successfully!', 'success');
      await this.log(`Backup available at: ${this.backupPath}`, 'info');
      await this.log(`Site URL: ${this.config.healthCheck.url}`, 'info');

    } catch (error) {
      await this.log(`Deployment failed: ${error.message}`, 'error');
      await this.log('Consider running rollback if needed: node scripts/deploy-to-production.js --rollback', 'warning');
      process.exit(1);
    }
  }
}

// CLI argument parsing
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    dryRun: args.includes('--dry-run'),
    skipBackup: args.includes('--skip-backup'),
    skipCache: args.includes('--skip-cache'),
    rollback: args.includes('--rollback'),
    config: null
  };

  const configIndex = args.indexOf('--config');
  if (configIndex !== -1 && configIndex + 1 < args.length) {
    options.config = args[configIndex + 1];
  }

  return options;
}

// Load custom config if provided
async function loadConfig(configPath) {
  if (!configPath) return DEFAULT_CONFIG;

  try {
    const configContent = await fs.readFile(configPath, 'utf8');
    const customConfig = JSON.parse(configContent);
    return { ...DEFAULT_CONFIG, ...customConfig };
  } catch (error) {
    console.error(`Failed to load config from ${configPath}: ${error.message}`);
    process.exit(1);
  }
}

// Main execution
async function main() {
  const options = parseArgs();
  
  // Show help
  if (process.argv.includes('--help') || process.argv.includes('-h')) {
    console.log(`
Production Deployment Script

Usage: node scripts/deploy-to-production.js [options]

Options:
  --dry-run       Show what would be deployed without making changes
  --skip-backup   Skip creating backup (not recommended)
  --skip-cache    Skip cache clearing
  --rollback      Rollback to previous version
  --config PATH   Path to deployment config file
  --help, -h      Show this help message

Environment Variables:
  DEPLOY_HOST           Server hostname
  DEPLOY_USER           SSH username
  DEPLOY_KEY_PATH       Path to SSH private key
  DEPLOY_WEB_ROOT       Remote web root path
  DEPLOY_BACKUP_DIR     Remote backup directory
  CLOUDFLARE_API_TOKEN  Cloudflare API token
  CLOUDFLARE_ZONE_ID    Cloudflare zone ID

Examples:
  node scripts/deploy-to-production.js --dry-run
  node scripts/deploy-to-production.js --skip-backup
  node scripts/deploy-to-production.js --rollback
    `);
    process.exit(0);
  }

  const config = await loadConfig(options.config);
  const deployer = new DeploymentScript(config);

  // Set options
  deployer.dryRun = options.dryRun;
  deployer.skipBackup = options.skipBackup;
  deployer.skipCache = options.skipCache;

  if (options.rollback) {
    await deployer.rollback();
  } else {
    await deployer.deploy();
  }
}

// Run the script
main().catch(error => {
  console.error('❌ Script execution failed:', error.message);
  process.exit(1);
});