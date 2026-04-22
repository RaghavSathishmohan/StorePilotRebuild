const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

// Direct connection with project reference in the password
const connectionString = 'postgresql://postgres:S@t329411@db.uxqybdqvtujlckhljpph.supabase.co:5432/postgres?options=project%3Duxqybdqvtujlckhljpph';

const client = new Client({
  connectionString,
  ssl: {
    rejectUnauthorized: false
  }
});

async function runMigration() {
  console.log('Connecting to database...');
  await client.connect();
  console.log('Connected!');

  // Read and execute the OS tables migration
  const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', '20250621_os_tables.sql');
  const sql = fs.readFileSync(migrationPath, 'utf8');

  console.log('Running OS tables migration...');

  // Split SQL into statements
  const statements = sql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'));

  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i] + ';';
    process.stdout.write(`Executing ${i + 1}/${statements.length}... `);

    try {
      await client.query(stmt);
      console.log('OK');
    } catch (err) {
      if (err.message.includes('already exists')) {
        console.log('(already exists)');
      } else {
        console.log(`Error: ${err.message}`);
      }
    }
  }

  console.log('\nMigration complete!');
  await client.end();
}

runMigration().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
