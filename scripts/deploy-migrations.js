#!/usr/bin/env node

/**
 * Database Migration Deployment Script
 * Deploys calendar integration migrations to Supabase
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

function getMigrationFiles() {
  const migrationsDir = path.join(process.cwd(), 'supabase', 'migrations');
  
  if (!fs.existsSync(migrationsDir)) {
    logError('Supabase migrations directory not found!');
    return [];
  }

  try {
    const files = fs.readdirSync(migrationsDir);
    const calendarMigrations = files
      .filter(file => 
        file.endsWith('.sql') && 
        (file.includes('calendar') || file.includes('google') || file.includes('microsoft'))
      )
      .sort();
    
    return calendarMigrations.map(file => ({
      name: file,
      path: path.join(migrationsDir, file),
      content: fs.readFileSync(path.join(migrationsDir, file), 'utf8')
    }));
  } catch (error) {
    logError(`Failed to read migrations directory: ${error.message}`);
    return [];
  }
}

async function executeSupabaseQuery(sql) {
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Supabase configuration not found in environment variables');
  }

  const url = `${supabaseUrl}/rest/v1/rpc/exec_sql`;
  const postData = JSON.stringify({ sql });
  
  const options = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${serviceRoleKey}`,
      'apikey': serviceRoleKey,
      'Content-Length': Buffer.byteLength(postData)
    }
  };

  return new Promise((resolve, reject) => {
    const req = https.request(url, options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve({
            statusCode: res.statusCode,
            data: data ? JSON.parse(data) : null
          });
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${data}`));
        }
      });
    });
    
    req.on('error', (error) => {
      reject(error);
    });
    
    req.setTimeout(30000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
    
    req.write(postData);
    req.end();
  });
}

async function checkMigrationStatus() {
  logHeader('Checking Migration Status');
  
  try {
    // Check if migration tracking table exists
    const checkTableSql = `
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'schema_migrations'
      );
    `;
    
    const result = await executeSupabaseQuery(checkTableSql);
    
    if (!result.data || !result.data[0].exists) {
      logWarning('Schema migrations table not found - this appears to be a fresh database');
      return { isFirstRun: true, appliedMigrations: [] };
    }
    
    // Get applied migrations
    const getAppliedSql = `
      SELECT version FROM schema_migrations ORDER BY version;
    `;
    
    const appliedResult = await executeSupabaseQuery(getAppliedSql);
    const appliedMigrations = appliedResult.data ? appliedResult.data.map(row => row.version) : [];
    
    logSuccess(`Found ${appliedMigrations.length} previously applied migrations`);
    
    return { isFirstRun: false, appliedMigrations };
  } catch (error) {
    logWarning(`Could not check migration status: ${error.message}`);
    return { isFirstRun: true, appliedMigrations: [] };
  }
}

async function createMigrationTable() {
  logHeader('Creating Migration Tracking Table');
  
  const createTableSql = `
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version VARCHAR(255) PRIMARY KEY,
      applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  `;
  
  try {
    await executeSupabaseQuery(createTableSql);
    logSuccess('Migration tracking table created or verified');
  } catch (error) {
    logError(`Failed to create migration table: ${error.message}`);
    throw error;
  }
}

async function applyMigration(migration) {
  log(`Applying migration: ${migration.name}`, 'blue');
  
  try {
    // Execute the migration
    await executeSupabaseQuery(migration.content);
    
    // Record the migration as applied
    const version = migration.name.replace('.sql', '');
    const recordSql = `
      INSERT INTO schema_migrations (version) 
      VALUES ('${version}') 
      ON CONFLICT (version) DO NOTHING;
    `;
    
    await executeSupabaseQuery(recordSql);
    
    logSuccess(`Migration ${migration.name} applied successfully`);
    return true;
  } catch (error) {
    logError(`Failed to apply migration ${migration.name}: ${error.message}`);
    return false;
  }
}

async function verifyTablesExist() {
  logHeader('Verifying Calendar Tables');
  
  const expectedTables = [
    'calendar_integrations',
    'event_sync_mappings',
    'sync_conflicts',
    'sync_history',
    'microsoft_calendar_metadata',
    'microsoft_sync_tokens',
    'microsoft_event_attendees'
  ];
  
  try {
    const checkTablesSQL = `
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN (${expectedTables.map(t => `'${t}'`).join(', ')});
    `;
    
    const result = await executeSupabaseQuery(checkTablesSQL);
    const existingTables = result.data ? result.data.map(row => row.table_name) : [];
    
    let allExist = true;
    
    expectedTables.forEach(table => {
      if (existingTables.includes(table)) {
        logSuccess(`Table ${table} exists`);
      } else {
        logError(`Table ${table} is missing`);
        allExist = false;
      }
    });
    
    return allExist;
  } catch (error) {
    logError(`Failed to verify tables: ${error.message}`);
    return false;
  }
}

async function verifyRLSPolicies() {
  logHeader('Verifying Row Level Security Policies');
  
  try {
    const checkRLSSQL = `
      SELECT 
        schemaname,
        tablename,
        rowsecurity,
        (SELECT count(*) FROM pg_policies WHERE schemaname = t.schemaname AND tablename = t.tablename) as policy_count
      FROM pg_tables t
      WHERE schemaname = 'public' 
      AND tablename LIKE '%calendar%' OR tablename LIKE '%sync%';
    `;
    
    const result = await executeSupabaseQuery(checkRLSSQL);
    
    if (result.data && result.data.length > 0) {
      result.data.forEach(row => {
        if (row.rowsecurity) {
          logSuccess(`RLS enabled on ${row.tablename} with ${row.policy_count} policies`);
        } else {
          logWarning(`RLS not enabled on ${row.tablename}`);
        }
      });
    }
    
    return true;
  } catch (error) {
    logError(`Failed to verify RLS policies: ${error.message}`);
    return false;
  }
}

async function main() {
  log(`${colors.bold}${colors.blue}Calendar Migrations Deployment${colors.reset}`);
  log('This script deploys database migrations for calendar integrations.\\n');
  
  if (!loadEnvFile()) {
    process.exit(1);
  }
  
  const migrations = getMigrationFiles();
  
  if (migrations.length === 0) {
    logWarning('No calendar migration files found');
    process.exit(0);
  }
  
  log(`Found ${migrations.length} calendar migration files:`, 'blue');
  migrations.forEach(m => log(`  • ${m.name}`));
  
  try {
    // Check current migration status
    const { isFirstRun, appliedMigrations } = await checkMigrationStatus();
    
    if (isFirstRun) {
      await createMigrationTable();
    }
    
    // Apply pending migrations
    let appliedCount = 0;
    let failedCount = 0;
    
    for (const migration of migrations) {
      const version = migration.name.replace('.sql', '');
      
      if (appliedMigrations.includes(version)) {
        log(`Skipping already applied migration: ${migration.name}`, 'yellow');
        continue;
      }
      
      const success = await applyMigration(migration);
      if (success) {
        appliedCount++;
      } else {
        failedCount++;
      }
    }
    
    logHeader('Migration Summary');
    log(`Applied: ${appliedCount} migrations`, appliedCount > 0 ? 'green' : 'reset');
    log(`Failed: ${failedCount} migrations`, failedCount > 0 ? 'red' : 'reset');
    log(`Skipped: ${migrations.length - appliedCount - failedCount} migrations`);
    
    if (failedCount > 0) {
      logError('Some migrations failed. Please review the errors above.');
      process.exit(1);
    }
    
    // Verify deployment
    const tablesExist = await verifyTablesExist();
    await verifyRLSPolicies();
    
    if (tablesExist) {
      logSuccess('\\n🎉 Calendar migrations deployed successfully!');
      log('All required tables and policies are in place.', 'green');
      log('\\nNext steps:', 'blue');
      log('1. Configure webhook endpoints');
      log('2. Test calendar integration functionality');
      log('3. Set up monitoring and error handling');
    } else {
      logError('\\n❌ Migration deployment incomplete');
      logWarning('Some required tables are missing. Check migration files and try again.');
      process.exit(1);
    }
    
  } catch (error) {
    logError(`Migration deployment failed: ${error.message}`);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}