-- StorePilot Database Schema
-- Multi-tenant SaaS for convenience store management
-- Built for Supabase PostgreSQL with comprehensive RLS policies

-- ============================================
-- EXTENSIONS
-- ============================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================
-- ENUM TYPES (Using CHECK constraints instead for flexibility)
-- ============================================

-- ============================================
-- CORE TABLES
-- ============================================

-- Profiles table extending auth.users
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL UNIQUE,
    full_name TEXT,
    avatar_url TEXT,
    phone TEXT,
    timezone TEXT DEFAULT 'America/New_York',
    default_store_id UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Stores table - central tenant entity
CREATE TABLE IF NOT EXISTS stores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    owner_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Store locations table
CREATE TABLE IF NOT EXISTS store_locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    code TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    address_line_1 TEXT,
    address_line_2 TEXT,
    city TEXT,
    state TEXT,
    postal_code TEXT,
    country TEXT DEFAULT 'US',
    latitude DECIMAL(10,8) CHECK (latitude BETWEEN -90 AND 90),
    longitude DECIMAL(11,8) CHECK (longitude BETWEEN -180 AND 180),
    timezone TEXT DEFAULT 'America/New_York',
    hours_json JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(store_id, code)
);

-- Store members table - links users to stores with roles
CREATE TABLE IF NOT EXISTS store_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'staff' CHECK (role IN ('owner', 'admin', 'manager', 'staff')),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'pending')),
    invited_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(store_id, user_id)
);

-- Invitations table for pending invites
CREATE TABLE IF NOT EXISTS invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'staff' CHECK (role IN ('admin', 'manager', 'staff')),
    token TEXT NOT NULL UNIQUE,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired')),
    expires_at TIMESTAMPTZ NOT NULL,
    invited_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    accepted_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Store settings table
CREATE TABLE IF NOT EXISTS store_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL UNIQUE REFERENCES stores(id) ON DELETE CASCADE,
    currency TEXT NOT NULL DEFAULT 'USD',
    timezone TEXT NOT NULL DEFAULT 'America/New_York',
    date_format TEXT NOT NULL DEFAULT 'MM/DD/YYYY' CHECK (date_format IN ('MM/DD/YYYY', 'DD/MM/YYYY', 'YYYY-MM-DD')),
    low_stock_threshold INTEGER NOT NULL DEFAULT 10,
    receipt_footer TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Audit logs table
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    entity_type TEXT NOT NULL,
    entity_id UUID NOT NULL,
    action TEXT NOT NULL CHECK (action IN ('create', 'update', 'delete')),
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User preferences table
CREATE TABLE IF NOT EXISTS user_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
    theme TEXT NOT NULL DEFAULT 'system' CHECK (theme IN ('light', 'dark', 'system')),
    sidebar_collapsed BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================

-- Profiles indexes
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_default_store ON profiles(default_store_id);

-- Stores indexes
CREATE INDEX IF NOT EXISTS idx_stores_slug ON stores(slug);
CREATE INDEX IF NOT EXISTS idx_stores_owner ON stores(owner_id);
CREATE INDEX IF NOT EXISTS idx_stores_status ON stores(status);

-- Store locations indexes
CREATE INDEX IF NOT EXISTS idx_locations_store ON store_locations(store_id);
CREATE INDEX IF NOT EXISTS idx_locations_code ON store_locations(store_id, code);
CREATE INDEX IF NOT EXISTS idx_locations_status ON store_locations(status);

-- Store members indexes
CREATE INDEX IF NOT EXISTS idx_members_user ON store_members(user_id);
CREATE INDEX IF NOT EXISTS idx_members_store ON store_members(store_id);
CREATE INDEX IF NOT EXISTS idx_members_role ON store_members(role);
CREATE INDEX IF NOT EXISTS idx_members_status ON store_members(status);

-- Invitations indexes
CREATE INDEX IF NOT EXISTS idx_invitations_token ON invitations(token);
CREATE INDEX IF NOT EXISTS idx_invitations_store ON invitations(store_id);
CREATE INDEX IF NOT EXISTS idx_invitations_email ON invitations(email);
CREATE INDEX IF NOT EXISTS idx_invitations_status ON invitations(status);
CREATE INDEX IF NOT EXISTS idx_invitations_expires ON invitations(expires_at);

-- Audit logs indexes
CREATE INDEX IF NOT EXISTS idx_audit_store ON audit_logs(store_id);
CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_metadata ON audit_logs USING GIN(metadata);

-- User preferences indexes
CREATE INDEX IF NOT EXISTS idx_preferences_user ON user_preferences(user_id);

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Function to check if a user is a member of a store
CREATE OR REPLACE FUNCTION is_store_member(p_store_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM store_members
        WHERE store_id = p_store_id
        AND user_id = p_user_id
        AND status = 'active'
    );
END;
$$;

-- Function to check if a user has at least a specific role in a store
CREATE OR REPLACE FUNCTION has_store_role(p_store_id UUID, p_user_id UUID, p_required_role TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_role TEXT;
    v_role_level INTEGER;
    v_required_level INTEGER;
BEGIN
    -- Get user's role
    SELECT role INTO v_role
    FROM store_members
    WHERE store_id = p_store_id
    AND user_id = p_user_id
    AND status = 'active';

    IF v_role IS NULL THEN
        RETURN false;
    END IF;

    -- Role hierarchy levels
    v_role_level := CASE v_role
        WHEN 'owner' THEN 4
        WHEN 'admin' THEN 3
        WHEN 'manager' THEN 2
        WHEN 'staff' THEN 1
        ELSE 0
    END;

    v_required_level := CASE p_required_role
        WHEN 'owner' THEN 4
        WHEN 'admin' THEN 3
        WHEN 'manager' THEN 2
        WHEN 'staff' THEN 1
        ELSE 0
    END;

    RETURN v_role_level >= v_required_level;
END;
$$;

-- Function to check if user is store owner
CREATE OR REPLACE FUNCTION is_store_owner(p_store_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM stores
        WHERE id = p_store_id
        AND owner_id = p_user_id
    );
END;
$$;

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

-- ============================================
-- TRIGGERS
-- ============================================

-- Auto-update updated_at on all tables
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_stores_updated_at
    BEFORE UPDATE ON stores
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_store_locations_updated_at
    BEFORE UPDATE ON store_locations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_store_members_updated_at
    BEFORE UPDATE ON store_members
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_invitations_updated_at
    BEFORE UPDATE ON invitations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_store_settings_updated_at
    BEFORE UPDATE ON store_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_preferences_updated_at
    BEFORE UPDATE ON user_preferences
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger to auto-add owner as member when store is created
CREATE OR REPLACE FUNCTION add_owner_as_member()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    INSERT INTO store_members (store_id, user_id, role, status, invited_by)
    VALUES (NEW.id, NEW.owner_id, 'owner', 'active', NEW.owner_id)
    ON CONFLICT (store_id, user_id) DO NOTHING;
    RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_add_owner_as_member
    AFTER INSERT ON stores
    FOR EACH ROW
    EXECUTE FUNCTION add_owner_as_member();

-- Trigger to auto-create store settings when store is created
CREATE OR REPLACE FUNCTION create_store_settings()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    INSERT INTO store_settings (store_id)
    VALUES (NEW.id)
    ON CONFLICT (store_id) DO NOTHING;
    RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_create_store_settings
    AFTER INSERT ON stores
    FOR EACH ROW
    EXECUTE FUNCTION create_store_settings();

-- Trigger to handle new user creation
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    INSERT INTO profiles (id, email, full_name, avatar_url)
    VALUES (
        NEW.id,
        NEW.email,
        NEW.raw_user_meta_data->>'full_name',
        NEW.raw_user_meta_data->>'avatar_url'
    )
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$;

-- Trigger on auth.users to auto-create profile
-- Note: This needs to be created in Supabase dashboard or via migration
-- CREATE TRIGGER on_auth_user_created
--     AFTER INSERT ON auth.users
--     FOR EACH ROW
--     EXECUTE FUNCTION handle_new_user();

-- ============================================
-- ENABLE ROW LEVEL SECURITY
-- ============================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE store_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE store_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE store_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

-- ============================================
-- RLS POLICIES
-- ============================================

-- Profiles policies
CREATE POLICY "Users can view own profile"
    ON profiles FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
    ON profiles FOR INSERT
    WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile"
    ON profiles FOR UPDATE
    USING (auth.uid() = id);

-- Stores policies
CREATE POLICY "Store members can view stores"
    ON stores FOR SELECT
    USING (
        owner_id = auth.uid()  -- Direct ownership check avoids recursion
        OR is_store_member(id, auth.uid())
    );

CREATE POLICY "Store owners can update stores"
    ON stores FOR UPDATE
    USING (is_store_owner(id, auth.uid()));

CREATE POLICY "Store owners can delete stores"
    ON stores FOR DELETE
    USING (is_store_owner(id, auth.uid()));

CREATE POLICY "Authenticated users can create stores"
    ON stores FOR INSERT
    WITH CHECK (auth.uid() = owner_id);

-- Store locations policies
CREATE POLICY "Store members can view locations"
    ON store_locations FOR SELECT
    USING (is_store_member(store_id, auth.uid()));

CREATE POLICY "Store admins can create locations"
    ON store_locations FOR INSERT
    WITH CHECK (has_store_role(store_id, auth.uid(), 'admin'));

CREATE POLICY "Store admins can update locations"
    ON store_locations FOR UPDATE
    USING (has_store_role(store_id, auth.uid(), 'admin'));

CREATE POLICY "Store owners can delete locations"
    ON store_locations FOR DELETE
    USING (is_store_owner(store_id, auth.uid()));

-- Store members policies
CREATE POLICY "Store members can view members"
    ON store_members FOR SELECT
    USING (is_store_member(store_id, auth.uid()));

CREATE POLICY "Store admins can manage members"
    ON store_members FOR ALL
    USING (
        has_store_role(store_id, auth.uid(), 'admin')
        AND role != 'owner'  -- Cannot manage owners
    )
    WITH CHECK (
        has_store_role(store_id, auth.uid(), 'admin')
        AND role != 'owner'
    );

CREATE POLICY "Store owners can manage all members"
    ON store_members FOR ALL
    USING (is_store_owner(store_id, auth.uid()))
    WITH CHECK (is_store_owner(store_id, auth.uid()));

-- Invitations policies
CREATE POLICY "Store admins can view invitations"
    ON invitations FOR SELECT
    USING (has_store_role(store_id, auth.uid(), 'admin'));

CREATE POLICY "Store admins can create invitations"
    ON invitations FOR INSERT
    WITH CHECK (
        has_store_role(store_id, auth.uid(), 'admin')
        AND role != 'owner'  -- Cannot invite owners
    );

CREATE POLICY "Store admins can update invitations"
    ON invitations FOR UPDATE
    USING (has_store_role(store_id, auth.uid(), 'admin'));

CREATE POLICY "Store admins can delete invitations"
    ON invitations FOR DELETE
    USING (has_store_role(store_id, auth.uid(), 'admin'));

-- Store settings policies
CREATE POLICY "Store members can view settings"
    ON store_settings FOR SELECT
    USING (is_store_member(store_id, auth.uid()));

CREATE POLICY "Store admins can update settings"
    ON store_settings FOR UPDATE
    USING (has_store_role(store_id, auth.uid(), 'admin'));

-- Audit logs policies
CREATE POLICY "Store admins can view audit logs"
    ON audit_logs FOR SELECT
    USING (has_store_role(store_id, auth.uid(), 'admin'));

CREATE POLICY "System can create audit logs"
    ON audit_logs FOR INSERT
    WITH CHECK (true);  -- Allow inserts, validate in application layer

-- User preferences policies
CREATE POLICY "Users can view own preferences"
    ON user_preferences FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own preferences"
    ON user_preferences FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
