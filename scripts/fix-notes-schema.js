#!/usr/bin/env node

/**
 * Script to fix the notes table schema by adding the missing highlights column
 * This addresses the PGRST204 error: "Could not find the 'highlights' column of 'notes' in the schema cache"
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

async function fixNotesSchema() {
  // Load environment variables
  require('dotenv').config();
  
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing Supabase environment variables');
    console.error('Make sure VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set');
    process.exit(1);
  }
  
  console.log('🔍 Connecting to Supabase...');
  
  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
  
  try {
    // First, check current notes table structure
    console.log('🔍 Checking current notes table structure...');
    
    const { data: columns, error: columnsError } = await supabase
      .rpc('get_table_columns', { table_name: 'notes' })
      .single();
    
    if (columnsError) {
      console.log('⚠️ Could not check table structure, proceeding with migration...');
    } else {
      console.log('📋 Current columns:', columns);
    }
    
    // Read and execute the migration SQL
    console.log('🔄 Applying highlights column migration...');
    
    const migrationPath = path.join(__dirname, '../supabase/migrations/20250730000000_add_highlights_column_to_notes.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    const { data, error } = await supabase.rpc('exec_sql', { 
      sql: migrationSQL 
    });
    
    if (error) {
      console.error('❌ Migration failed:', error);
      process.exit(1);
    }
    
    console.log('✅ Migration completed successfully');
    
    // Verify the migration worked
    console.log('🔍 Verifying highlights column exists...');
    
    const { data: testData, error: testError } = await supabase
      .from('notes')
      .select('highlights')
      .limit(1);
    
    if (testError) {
      if (testError.code === 'PGRST204') {
        console.error('❌ Migration verification failed - highlights column still missing');
        console.error('You may need to run the migration manually in the Supabase dashboard');
      } else {
        console.error('❌ Verification error:', testError);
      }
      process.exit(1);
    }
    
    console.log('✅ Highlights column verified - schema is now correct');
    console.log('🎉 You can now create and save notes with highlights!');
    
  } catch (err) {
    console.error('❌ Unexpected error:', err);
    process.exit(1);
  }
}

fixNotesSchema();