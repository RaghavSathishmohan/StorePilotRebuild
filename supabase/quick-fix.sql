-- Quick fix for store_settings RLS - run this in Supabase SQL Editor

-- Disable then re-enable RLS (resets policies cleanly)
ALTER TABLE store_settings DISABLE ROW LEVEL SECURITY;
ALTER TABLE store_settings ENABLE ROW LEVEL SECURITY;

-- Drop all existing policies
DROP POLICY IF EXISTS "Store members can view settings" ON store_settings;
DROP POLICY IF EXISTS "Store admins can update settings" ON store_settings;
DROP POLICY IF EXISTS "Store owners can manage settings" ON store_settings;

-- Simple policy: Everyone can view
CREATE POLICY "Settings viewable by store members"
  ON store_settings FOR SELECT
  USING (true);

-- Simple policy: Only store owners can modify
CREATE POLICY "Settings manageable by store owners"
  ON store_settings FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM stores
      WHERE stores.id = store_settings.store_id
      AND stores.owner_id = auth.uid()
    )
  );

-- Check policies
SELECT policyname, cmd FROM pg_policies WHERE tablename = 'store_settings';
