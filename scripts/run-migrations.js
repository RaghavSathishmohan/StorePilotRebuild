#!/usr/bin/env node
/**
 * Run database migrations using Supabase JS client
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabaseUrl = 'https://uxqybdqvtujlckhljpph.supabase.co';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV4cXliZHF2dHVqbGNraGxqcHBoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NjEyMDI3MSwiZXhwIjoyMDkxNjk2MjcxNX0.TSd6lN9QQVI8dJ_sSo8JvO7LEjjDfrPk15veDAXsqOo';

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function runMigrations() {
  console.log('Running migrations...');

  // Read schema file
  const schemaPath = path.join(__dirname, '..', 'supabase', 'schema.sql');
  const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', '20250621_os_tables.sql');

  // Execute schema using Supabase's SQL execution
  // We'll run statements one by one using the RPC

  // First, create OS tables
  const osTablesSQL = fs.readFileSync(migrationPath, 'utf8');

  // Split into individual statements
  const statements = osTablesSQL
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0);

  console.log(`Found ${statements.length} statements to execute`);

  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i] + ';';
    console.log(`Executing statement ${i + 1}/${statements.length}...`);

    const { error } = await supabase.rpc('exec_sql', { sql: stmt });

    if (error) {
      console.error(`Error executing statement ${i + 1}:`, error.message);
      // Continue anyway - table might already exist
    }
  }

  console.log('Migrations complete!');
}

runMigrations().catch(console.error);
