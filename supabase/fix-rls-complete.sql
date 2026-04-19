-- ============================================================================
-- StorePilot Complete RLS Policy Setup
-- Run this in your Supabase SQL Editor to fix all RLS issues
-- ============================================================================

-- ============================================================================
-- STEP 1: ENABLE RLS ON ALL TABLES
-- ============================================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE store_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE store_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE store_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- STEP 2: CREATE HELPER FUNCTIONS (with SECURITY DEFINER to bypass RLS recursion)
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

-- Function to check if user owns a store by owner_id directly
CREATE OR REPLACE FUNCTION owns_store(p_owner_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p_owner_id = auth.uid();
$$;

-- ============================================================================
-- STEP 3: PROFILES POLICIES (CRITICAL - needed for user signup)
-- ============================================================================

DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;

-- Users can view their own profile
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (id = auth.uid());

-- Users can insert their own profile (needed for handle_new_user trigger)
CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT WITH CHECK (id = auth.uid());

-- Users can update their own profile
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (id = auth.uid());

-- ============================================================================
-- STEP 4: STORES POLICIES (CRITICAL - needed for store creation)
-- ============================================================================

DROP POLICY IF EXISTS "Store owners can manage their stores" ON stores;
DROP POLICY IF EXISTS "Store members can view stores" ON stores;
DROP POLICY IF EXISTS "Users can insert stores" ON stores;

-- Store owners can manage their stores
CREATE POLICY "Store owners can manage their stores" ON stores
  FOR ALL USING (owner_id = auth.uid());

-- Store members can view stores they belong to
CREATE POLICY "Store members can view stores" ON stores
  FOR SELECT USING (is_store_member(id, auth.uid()));

-- Any authenticated user can create a store (they become owner)
CREATE POLICY "Users can insert stores" ON stores
  FOR INSERT WITH CHECK (owner_id = auth.uid());

-- ============================================================================
-- STEP 5: STORE_LOCATIONS POLICIES
-- ============================================================================

DROP POLICY IF EXISTS "Store owners can manage locations" ON store_locations;
DROP POLICY IF EXISTS "Store members can view locations" ON store_locations;

-- Store owners can manage locations
CREATE POLICY "Store owners can manage locations" ON store_locations
  FOR ALL USING (is_store_owner(store_id, auth.uid()));

-- Store members can view locations
CREATE POLICY "Store members can view locations" ON store_locations
  FOR SELECT USING (
    is_store_member(store_id, auth.uid()) OR
    is_store_owner(store_id, auth.uid())
  );

-- ============================================================================
-- STEP 6: STORE_MEMBERS POLICIES
-- ============================================================================

DROP POLICY IF EXISTS "Store owners can manage members" ON store_members;
DROP POLICY IF EXISTS "Users can view own memberships" ON store_members;

-- Store owners can manage members
CREATE POLICY "Store owners can manage members" ON store_members
  FOR ALL USING (is_store_owner(store_id, auth.uid()));

-- Users can view their own memberships
CREATE POLICY "Users can view own memberships" ON store_members
  FOR SELECT USING (user_id = auth.uid());

-- ============================================================================
-- STEP 7: STORE_SETTINGS POLICIES
-- ============================================================================

DROP POLICY IF EXISTS "Store members can view settings" ON store_settings;
DROP POLICY IF EXISTS "Store owners can manage settings" ON store_settings;

-- Store members can view settings
CREATE POLICY "Store members can view settings" ON store_settings
  FOR SELECT USING (is_store_member(store_id, auth.uid()));

-- Store owners can manage settings
CREATE POLICY "Store owners can manage settings" ON store_settings
  FOR ALL USING (is_store_owner(store_id, auth.uid()));

-- ============================================================================
-- STEP 8: INVITATIONS POLICIES
-- ============================================================================

DROP POLICY IF EXISTS "Store owners can manage invitations" ON invitations;
DROP POLICY IF EXISTS "Users can view own invitations" ON invitations;

-- Store owners can manage invitations
CREATE POLICY "Store owners can manage invitations" ON invitations
  FOR ALL USING (is_store_owner(store_id, auth.uid()));

-- Users can view invitations sent to their email
CREATE POLICY "Users can view own invitations" ON invitations
  FOR SELECT USING (email = auth.email());

-- ============================================================================
-- STEP 9: USER_PREFERENCES POLICIES
-- ============================================================================

DROP POLICY IF EXISTS "Users can manage own preferences" ON user_preferences;

-- Users can manage their own preferences
CREATE POLICY "Users can manage own preferences" ON user_preferences
  FOR ALL USING (user_id = auth.uid());

-- ============================================================================
-- STEP 10: AUDIT_LOGS POLICIES
-- ============================================================================

DROP POLICY IF EXISTS "Store members can view audit logs" ON audit_logs;

-- Store members can view audit logs
CREATE POLICY "Store members can view audit logs" ON audit_logs
  FOR SELECT USING (is_store_member(store_id, auth.uid()));

-- ============================================================================
-- VERIFICATION QUERIES (Run these to verify the setup)
-- ============================================================================

-- Check RLS is enabled on all tables
-- SELECT relname, relrowsecurity FROM pg_class WHERE relname IN ('profiles', 'stores', 'store_locations', 'store_members', 'invitations', 'store_settings', 'audit_logs', 'user_preferences');

-- List all policies
-- SELECT schemaname, tablename, policyname, permissive, roles, cmd FROM pg_policies WHERE schemaname = 'public' ORDER BY tablename, policyname;

-- Verify helper functions
-- SELECT proname, prosecdef FROM pg_proc WHERE proname IN ('is_store_member', 'is_store_owner', 'owns_store');
