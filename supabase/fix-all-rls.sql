-- Complete RLS Fix - Run this in Supabase SQL Editor
-- This fixes all RLS policies to prevent recursion and ensure proper access

-- ============================================================================
-- STEP 1: Drop all existing policies
-- ============================================================================

-- Profiles
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;

-- Stores
DROP POLICY IF EXISTS "Store members can view stores" ON stores;
DROP POLICY IF EXISTS "Store owners can update stores" ON stores;
DROP POLICY IF EXISTS "Store owners can delete stores" ON stores;
DROP POLICY IF EXISTS "Authenticated users can create stores" ON stores;
DROP POLICY IF EXISTS "Store owners can manage their stores" ON stores;
DROP POLICY IF EXISTS "Users can insert stores" ON stores;

-- Store locations
DROP POLICY IF EXISTS "Store members can view locations" ON store_locations;
DROP POLICY IF EXISTS "Store admins can create locations" ON store_locations;
DROP POLICY IF EXISTS "Store admins can update locations" ON store_locations;
DROP POLICY IF EXISTS "Store owners can delete locations" ON store_locations;
DROP POLICY IF EXISTS "Store owners can manage locations" ON store_locations;

-- Store members
DROP POLICY IF EXISTS "Store members can view members" ON store_members;
DROP POLICY IF EXISTS "Store admins can manage members" ON store_members;
DROP POLICY IF EXISTS "Store owners can manage all members" ON store_members;
DROP POLICY IF EXISTS "Store owners can manage members" ON store_members;
DROP POLICY IF EXISTS "Users can view own memberships" ON store_members;

-- Invitations
DROP POLICY IF EXISTS "Store admins can view invitations" ON invitations;
DROP POLICY IF EXISTS "Store admins can create invitations" ON invitations;
DROP POLICY IF EXISTS "Store admins can update invitations" ON invitations;
DROP POLICY IF EXISTS "Store admins can delete invitations" ON invitations;
DROP POLICY IF EXISTS "Store owners can manage invitations" ON invitations;
DROP POLICY IF EXISTS "Users can view own invitations" ON invitations;

-- Store settings
DROP POLICY IF EXISTS "Store members can view settings" ON store_settings;
DROP POLICY IF EXISTS "Store admins can update settings" ON store_settings;
DROP POLICY IF EXISTS "Store owners can manage settings" ON store_settings;
DROP POLICY IF EXISTS "Users can manage own preferences" ON store_settings;
DROP POLICY IF EXISTS "Allow settings insert for store owners" ON store_settings;
DROP POLICY IF EXISTS "Settings viewable by store members" ON store_settings;
DROP POLICY IF EXISTS "Settings manageable by store owners" ON store_settings;

-- User preferences
DROP POLICY IF EXISTS "Users can view own preferences" ON user_preferences;
DROP POLICY IF EXISTS "Users can manage own preferences" ON user_preferences;

-- Audit logs
DROP POLICY IF EXISTS "Store admins can view audit logs" ON audit_logs;
DROP POLICY IF EXISTS "System can create audit logs" ON audit_logs;
DROP POLICY IF EXISTS "Store members can view audit logs" ON audit_logs;

-- ============================================================================
-- STEP 2: Enable RLS on all tables
-- ============================================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE store_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE store_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE store_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- STEP 3: Create helper functions with SECURITY DEFINER
-- ============================================================================

-- Function to check if user is a store member
CREATE OR REPLACE FUNCTION is_store_member(p_store_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM store_members
    WHERE store_id = p_store_id AND user_id = p_user_id AND status = 'active'
  );
$$;

-- Function to check if user is a store owner
CREATE OR REPLACE FUNCTION is_store_owner(p_store_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM stores
    WHERE id = p_store_id AND owner_id = p_user_id
  );
$$;

-- Function to check role hierarchy
CREATE OR REPLACE FUNCTION has_store_role(p_store_id UUID, p_user_id UUID, p_required_role TEXT)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  WITH role_hierarchy AS (
    SELECT CASE role
      WHEN 'owner' THEN 4
      WHEN 'admin' THEN 3
      WHEN 'manager' THEN 2
      WHEN 'staff' THEN 1
      ELSE 0
    END as level
    FROM store_members
    WHERE store_id = p_store_id AND user_id = p_user_id AND status = 'active'
  )
  SELECT EXISTS (
    SELECT 1 FROM role_hierarchy
    WHERE level >= CASE p_required_role
      WHEN 'owner' THEN 4
      WHEN 'admin' THEN 3
      WHEN 'manager' THEN 2
      WHEN 'staff' THEN 1
      ELSE 0
    END
  );
$$;

-- ============================================================================
-- STEP 4: Create new policies - PROFILES
-- ============================================================================

CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (id = auth.uid());

CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT WITH CHECK (id = auth.uid());

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (id = auth.uid());

-- ============================================================================
-- STEP 5: Create new policies - STORES
-- ============================================================================

-- Owners can do everything with their stores
CREATE POLICY "Store owners can manage their stores" ON stores
  FOR ALL USING (owner_id = auth.uid());

-- Members can view stores they belong to (using SECURITY DEFINER function)
CREATE POLICY "Store members can view stores" ON stores
  FOR SELECT USING (is_store_member(id, auth.uid()));

-- Authenticated users can create stores (they become owner)
CREATE POLICY "Users can insert stores" ON stores
  FOR INSERT WITH CHECK (owner_id = auth.uid());

-- ============================================================================
-- STEP 6: Create new policies - STORE_LOCATIONS
-- ============================================================================

-- Store owners can manage locations
CREATE POLICY "Store owners can manage locations" ON store_locations
  FOR ALL USING (is_store_owner(store_id, auth.uid()));

-- Members can view locations
CREATE POLICY "Store members can view locations" ON store_locations
  FOR SELECT USING (is_store_member(store_id, auth.uid()));

-- ============================================================================
-- STEP 7: Create new policies - STORE_MEMBERS
-- ============================================================================

-- Store owners can manage all members
CREATE POLICY "Store owners can manage members" ON store_members
  FOR ALL USING (is_store_owner(store_id, auth.uid()));

-- Users can view their own memberships
CREATE POLICY "Users can view own memberships" ON store_members
  FOR SELECT USING (user_id = auth.uid());

-- ============================================================================
-- STEP 8: Create new policies - STORE_SETTINGS
-- ============================================================================

-- Store owners can manage settings (with bypass for trigger)
CREATE POLICY "Store owners can manage settings" ON store_settings
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM stores
      WHERE stores.id = store_settings.store_id
      AND stores.owner_id = auth.uid()
    )
  );

-- Members can view settings
CREATE POLICY "Store members can view settings" ON store_settings
  FOR SELECT USING (is_store_member(store_id, auth.uid()));

-- ============================================================================
-- STEP 9: Create new policies - INVITATIONS
-- ============================================================================

-- Store owners can manage invitations
CREATE POLICY "Store owners can manage invitations" ON invitations
  FOR ALL USING (is_store_owner(store_id, auth.uid()));

-- Users can view invitations sent to their email
CREATE POLICY "Users can view own invitations" ON invitations
  FOR SELECT USING (email = auth.email());

-- ============================================================================
-- STEP 10: Create new policies - USER_PREFERENCES
-- ============================================================================

CREATE POLICY "Users can manage own preferences" ON user_preferences
  FOR ALL USING (user_id = auth.uid());

-- ============================================================================
-- STEP 11: Create new policies - AUDIT_LOGS
-- ============================================================================

-- Store members can view audit logs
CREATE POLICY "Store members can view audit logs" ON audit_logs
  FOR SELECT USING (is_store_member(store_id, auth.uid()));

-- System can create audit logs (bypass RLS)
CREATE POLICY "System can create audit logs" ON audit_logs
  FOR INSERT WITH CHECK (true);

-- ============================================================================
-- STEP 12: Verify setup
-- ============================================================================

SELECT 'RLS Policies Setup Complete' as status;

-- Show all policies
SELECT tablename, policyname, cmd
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
