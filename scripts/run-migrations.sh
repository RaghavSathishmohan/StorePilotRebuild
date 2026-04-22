#!/bin/bash
# Run database migrations

echo "Running StorePilot migrations..."

# Check if psql is available
if command -v psql &> /dev/null; then
    echo "Using psql directly..."
    psql "$SUPABASE_DATABASE_URL" -f supabase/schema.sql
    psql "$SUPABASE_DATABASE_URL" -f supabase/migrations/20250621_os_tables.sql
elif command -v npx &> /dev/null; then
    echo "Using npx supabase..."
    npx supabase db push
else
    echo "Error: Neither psql nor supabase CLI found"
    echo "Please install PostgreSQL client or Supabase CLI"
    exit 1
fi

echo "Migrations complete!"
