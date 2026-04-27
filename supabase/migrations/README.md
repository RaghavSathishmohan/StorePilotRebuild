# Analytics Migration Instructions

## Prerequisites

Make sure you have already run the main schema migrations:
- `supabase/schema.sql` - Main database schema
- `supabase/migrations/20250621_os_tables.sql` - OS tables

## Step 1: Create Analytics Tables

1. Go to your Supabase project dashboard: https://supabase.com/dashboard
2. Navigate to **SQL Editor**
3. Click **New query**
4. Copy and paste the contents of: `20250622_analytics_tables_simple.sql`
5. Click **Run**

You should see: `Analytics tables created successfully!`

## Step 2: Create Analytics Function

1. In the SQL Editor, click **New query**
2. Copy and paste the contents of: `20250622_analytics_function.sql`
3. Click **Run**

You should see: `Analytics function created successfully!`

## Step 3: Test the Function

Run this test query (replace with your actual store ID and user ID):

```sql
-- Get your store ID
SELECT id, name FROM stores LIMIT 5;

-- Get your user ID  
SELECT id, email FROM profiles LIMIT 5;

-- Compute analytics for your store
SELECT * FROM compute_store_analytics('YOUR-STORE-ID', 'YOUR-USER-ID');
```

## Troubleshooting

### Error: "function is_store_member does not exist"

This means you haven't run the main schema.sql file. Run that first, which creates the helper functions.

### Error: "relation does not exist"

Make sure you created the tables in Step 1 before running the function in Step 2.

### Error: "permission denied"

Make sure you're running as the project owner or a user with admin privileges.

## Verification

After running both migrations, verify the tables exist:

```sql
-- Check tables were created
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name LIKE 'analytics%';

-- Check function was created
SELECT proname 
FROM pg_proc 
WHERE proname = 'compute_store_analytics';
```

## Files Created

1. `20250622_analytics_tables_simple.sql` - Creates 5 analytics tables
2. `20250622_analytics_function.sql` - Creates the compute function
3. `20250622_analytics_tables.sql` - Original combined file (alternative)

Use the simple version (Step 1 + Step 2) if the combined file has issues.
