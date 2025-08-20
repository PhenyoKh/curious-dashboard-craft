# Production Deployment Guide

This document explains how to deploy the Scola Dashboard application to production using the automated deployment script.

## Quick Start

1. **Configure deployment settings** (first time only):
   ```bash
   cp deploy-config.example.json deploy-config.json
   # Edit deploy-config.json with your server details
   ```

2. **Set environment variables**:
   ```bash
   export DEPLOY_HOST="your-server.com"
   export DEPLOY_USER="deploy"
   export DEPLOY_KEY_PATH="~/.ssh/id_rsa"
   export DEPLOY_WEB_ROOT="/var/www/html"
   ```

3. **Deploy to production**:
   ```bash
   npm run build
   npm run deploy
   ```

## Available Commands

| Command | Description |
|---------|-------------|
| `npm run deploy` | Deploy to production with backup |
| `npm run deploy:dry-run` | Preview what would be deployed |
| `npm run deploy:rollback` | Rollback to previous version |

## Manual Script Usage

```bash
# Basic deployment
node scripts/deploy-to-production.js

# Dry run (preview only)
node scripts/deploy-to-production.js --dry-run

# Skip backup creation (not recommended)
node scripts/deploy-to-production.js --skip-backup

# Skip cache clearing
node scripts/deploy-to-production.js --skip-cache

# Rollback to previous version
node scripts/deploy-to-production.js --rollback

# Use custom config file
node scripts/deploy-to-production.js --config ./my-deploy-config.json

# Show help
node scripts/deploy-to-production.js --help
```

## Configuration

### Environment Variables

Set these in your shell or CI/CD environment:

```bash
# Required
DEPLOY_HOST="your-server.com"
DEPLOY_USER="deploy" 
DEPLOY_KEY_PATH="~/.ssh/id_rsa"
DEPLOY_WEB_ROOT="/var/www/html"

# Optional
DEPLOY_BACKUP_DIR="/var/www/backups"
DEPLOY_PORT="22"
CLOUDFLARE_API_TOKEN="your-token"
CLOUDFLARE_ZONE_ID="your-zone-id"
DEPLOY_HEALTH_CHECK_URL="https://www.scola.co.za"
```

### Configuration File

Create `deploy-config.json` based on `deploy-config.example.json`:

```json
{
  "server": {
    "host": "your-server.com",
    "user": "deploy",
    "port": 22,
    "keyPath": "~/.ssh/id_rsa"
  },
  "paths": {
    "localDist": "./dist",
    "remoteWebRoot": "/var/www/html",
    "backupDir": "/var/www/backups"
  },
  "cache": {
    "cloudflare": {
      "enabled": true,
      "apiToken": "your-api-token",
      "zoneId": "your-zone-id"
    }
  },
  "healthCheck": {
    "enabled": true,
    "url": "https://www.scola.co.za",
    "timeout": 10000,
    "retries": 3
  }
}
```

## Deployment Process

The deployment script follows these steps:

### 1. Prerequisites Check
- ✅ Verifies local `./dist` folder exists
- ✅ Tests SSH connection to server
- ✅ Confirms `rsync` is available

### 2. Backup Creation
- 📦 Creates timestamped backup of current production
- 🗂️ Stores backup in `/var/www/backups/backup-YYYY-MM-DD-HH-MM-SS`
- 🧹 Automatically cleans up old backups (keeps last 5)

### 3. File Upload
- 📤 Uploads files to temporary directory first
- ⚡ Uses `rsync` for efficient transfer with compression
- 🔄 Atomically moves files to production (zero-downtime)

### 4. Cache Management
- 🏷️ Sets appropriate cache headers via `.htaccess`
- 🌐 Clears Cloudflare cache if configured
- 🔄 Ensures browsers get latest files

### 5. Health Check
- 🏥 Tests production URL after deployment
- 🔄 Retries up to 3 times on failure
- ✅ Confirms deployment was successful

### 6. Reporting
- 📋 Generates deployment report with timestamp
- 📂 Lists all deployed files
- 💾 Saves report as `deployment-report-TIMESTAMP.json`

## Rollback

If something goes wrong, quickly rollback:

```bash
npm run deploy:rollback
```

This will:
- 🔄 Restore the most recent backup
- 🌐 Clear caches to ensure rollback takes effect
- ✅ Perform health check on restored version

## Server Setup Requirements

Your production server needs:

### 1. SSH Access
```bash
# Add your public key to server
ssh-copy-id deploy@your-server.com

# Test connection
ssh deploy@your-server.com "echo 'Connection successful'"
```

### 2. Required Tools
```bash
# On your server, install:
sudo apt update
sudo apt install rsync curl

# Ensure web server is running (nginx/apache)
sudo systemctl status nginx
```

### 3. Directory Structure
```bash
# Create required directories
sudo mkdir -p /var/www/html
sudo mkdir -p /var/www/backups
sudo chown -R deploy:www-data /var/www/
sudo chmod -R 755 /var/www/
```

### 4. Web Server Configuration

#### For Nginx:
```nginx
server {
    listen 80;
    server_name www.scola.co.za;
    root /var/www/html;
    index index.html;

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # HTML files
    location ~* \.(html)$ {
        expires 5m;
        add_header Cache-Control "public";
    }

    # Fallback to index.html for SPA
    try_files $uri $uri/ /index.html;
}
```

#### For Apache:
The script automatically creates `.htaccess` with appropriate cache headers.

## Cloudflare Setup

If using Cloudflare CDN:

1. **Get API Token**:
   - Go to Cloudflare dashboard → My Profile → API Tokens
   - Create token with `Zone:Zone:Read` and `Zone:Cache Purge` permissions

2. **Get Zone ID**:
   - Go to your domain in Cloudflare dashboard
   - Copy Zone ID from the right sidebar

3. **Set Environment Variables**:
   ```bash
   export CLOUDFLARE_API_TOKEN="your-token"
   export CLOUDFLARE_ZONE_ID="your-zone-id"
   ```

## Fixing the PaymentCallback Loop

This deployment script is specifically designed to deploy the fixed PaymentCallback component that eliminates the render loop for `/payment/success?subscription_id=...` URLs.

**After deployment, the loop issue will be resolved because:**
- ✅ New code handles `subscription_id` parameter
- ✅ Mount-only effect with empty dependency array
- ✅ Direct subscription refetch without reactive dependencies
- ✅ Early return prevents setTimeout loop

## Security Considerations

- 🔐 Never commit SSH keys to version control
- 🔒 Use SSH key authentication, not passwords
- 🛡️ Limit deploy user permissions to web directories only
- 🔍 Review deployment logs for any suspicious activity
- 📝 Keep deployment logs for audit purposes

## Troubleshooting

### Common Issues

#### SSH Connection Failed
```bash
# Test SSH connection manually
ssh -i ~/.ssh/id_rsa deploy@your-server.com

# Check SSH key permissions
chmod 600 ~/.ssh/id_rsa
```

#### Permission Denied
```bash
# On server, ensure deploy user owns web directories
sudo chown -R deploy:www-data /var/www/
```

#### Health Check Failed
```bash
# Test health check URL manually
curl -I https://www.scola.co.za

# Check web server logs
sudo tail -f /var/log/nginx/error.log
```

#### Rollback Not Working
```bash
# Manually restore from backup
ssh deploy@your-server.com
cd /var/www/backups
ls -la  # Find latest backup
sudo cp -r backup-YYYY-MM-DD-HH-MM-SS /var/www/html
```

### Getting Help

If deployment fails:

1. **Check the error message** - the script provides detailed error information
2. **Try dry run first** - `npm run deploy:dry-run` to preview changes
3. **Verify server access** - test SSH connection manually
4. **Check server logs** - look at web server and system logs
5. **Use rollback** - if deployment partially succeeded but site is broken

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          
      - name: Install dependencies
        run: npm ci
        
      - name: Build application
        run: npm run build
        
      - name: Deploy to production
        env:
          DEPLOY_HOST: ${{ secrets.DEPLOY_HOST }}
          DEPLOY_USER: ${{ secrets.DEPLOY_USER }}
          DEPLOY_KEY_PATH: ${{ secrets.DEPLOY_KEY_PATH }}
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          CLOUDFLARE_ZONE_ID: ${{ secrets.CLOUDFLARE_ZONE_ID }}
        run: npm run deploy
```

This ensures every push to main automatically deploys to production with the render loop fix.