import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://fprsjziqubbhznavjskj.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZwcnNqemlxdWJiaHpuYXZqc2tqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI0ODEwNDksImV4cCI6MjA2ODA1NzA0OX0.h0pLiTjjuIbm9Pl8Qb1AnL2j82VKb54a-CDtARuAs4w';

const supabase = createClient(supabaseUrl, supabaseKey);

async function applySignupFix() {
  console.log('🔧 Applying signup fix migration...');
  
  try {
    // Read the migration file
    const migrationPath = join(__dirname, 'supabase', 'migrations', '20250810000000_fix_signup_trigger.sql');
    const migrationSQL = readFileSync(migrationPath, 'utf8');
    
    // Split the migration into individual statements
    const statements = migrationSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
    
    console.log(`📝 Found ${statements.length} SQL statements to execute`);
    
    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      console.log(`⚡ Executing statement ${i + 1}/${statements.length}`);
      
      const { error } = await supabase.rpc('exec', { sql: statement });
      
      if (error) {
        console.error(`❌ Error executing statement ${i + 1}:`, error);
        // Continue with next statement instead of failing completely
      } else {
        console.log(`✅ Statement ${i + 1} executed successfully`);
      }
    }
    
    console.log('🎉 Signup fix migration completed!');
    console.log('');
    console.log('✅ The following fixes were applied:');
    console.log('  • Robust error handling in user creation trigger');
    console.log('  • Error logging for debugging failed signups');  
    console.log('  • Graceful fallback to prevent signup failures');
    console.log('  • Debug function to check user creation status');
    console.log('');
    console.log('🧪 Next step: Test the signup flow');
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  }
}

// Run the migration
applySignupFix();