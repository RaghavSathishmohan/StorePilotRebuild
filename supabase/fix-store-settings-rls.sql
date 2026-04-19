-- Fix store_settings RLS to allow owner during trigger execution
-- Run this in Supabase SQL Editor

-- First, drop existing policies on store_settings
DROP POLICY IF EXISTS "Store members can view settings" ON store_settings;
DROP POLICY IF EXISTS "Store admins can update settings" ON store_settings;
DROP POLICY IF EXISTS "Store owners can manage settings" ON store_settings;
DROP POLICY IF EXISTS "Users can manage own preferences" ON store_settings;

-- Ensure RLS is enabled
ALTER TABLE store_settings ENABLE ROW LEVEL SECURITY;

-- Policy: Store members can view settings
CREATE POLICY "Store members can view settings"
  ON store_settings FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM stores
      WHERE stores.id = store_settings.store_id
      AND (
        stores.owner_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM store_members
          WHERE store_members.store_id = store_settings.store_id
          AND store_members.user_id = auth.uid()
          AND store_members.status = 'active'
        )
      )
    )
  );

-- Policy: Store owners can manage settings (INSERT/UPDATE/DELETE)
CREATE POLICY "Store owners can manage settings"
  ON store_settings FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM stores
      WHERE stores.id = store_settings.store_id
      AND stores.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM stores
      WHERE stores.id = store_settings.store_id
      AND stores.owner_id = auth.uid()
    )
  );

-- Alternative: Allow INSERT via trigger by checking store ownership directly
-- This allows the trigger to insert settings even in SECURITY DEFINER context
DROP POLICY IF EXISTS "Allow settings insert for store owners" ON store_settings;
CREATE POLICY "Allow settings insert for store owners"
  ON store_settings FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM stores
      WHERE stores.id = store_settings.store_id
      AND stores.owner_id = auth.uid()
    )
  );

-- Verify policies
SELECT tablename, policyname, cmd, permissive
FROM pg_policies
WHERE tablename = 'store_settings'
ORDER BY policyname;
