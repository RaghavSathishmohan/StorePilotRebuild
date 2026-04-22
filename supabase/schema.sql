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
-- IMPORT & DATA TABLES
-- ============================================

-- Imports table - tracks import jobs
CREATE TABLE IF NOT EXISTS imports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    import_type TEXT NOT NULL CHECK (import_type IN ('products', 'inventory', 'sales', 'unified')),
    file_name TEXT NOT NULL,
    file_size_bytes INTEGER,
    file_format TEXT NOT NULL DEFAULT 'csv',
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'partial')),
    total_rows INTEGER DEFAULT 0,
    processed_rows INTEGER DEFAULT 0,
    successful_rows INTEGER DEFAULT 0,
    failed_rows INTEGER DEFAULT 0,
    error_log JSONB DEFAULT '[]'::jsonb,
    mapping_config JSONB DEFAULT '[]'::jsonb,
    mapping_accuracy INTEGER,
    column_mapping_details JSONB DEFAULT '[]'::jsonb,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    processing_time_ms INTEGER,
    initiated_by UUID NOT NULL REFERENCES profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Import row details table - tracks individual row errors
CREATE TABLE IF NOT EXISTS import_row_details (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    import_id UUID NOT NULL REFERENCES imports(id) ON DELETE CASCADE,
    row_number INTEGER NOT NULL,
    row_data JSONB DEFAULT '{}'::jsonb,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'success', 'error')),
    error_message TEXT,
    error_field TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Product categories table
CREATE TABLE IF NOT EXISTS product_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    color TEXT DEFAULT '#3b82f6',
    icon TEXT DEFAULT 'tag',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(store_id, name)
);

-- Products table
CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    sku TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    category_id UUID REFERENCES product_categories(id) ON DELETE SET NULL,
    barcode TEXT,
    cost_price DECIMAL(12,2),
    selling_price DECIMAL(12,2) NOT NULL,
    tax_rate DECIMAL(5,2) DEFAULT 0,
    min_stock_level INTEGER DEFAULT 0,
    max_stock_level INTEGER,
    reorder_point INTEGER DEFAULT 0,
    reorder_quantity INTEGER,
    unit_of_measure TEXT DEFAULT 'unit',
    weight_kg DECIMAL(10,3),
    supplier_name TEXT,
    supplier_contact TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(store_id, sku)
);

-- Sales receipts table
CREATE TABLE IF NOT EXISTS sales_receipts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    location_id UUID REFERENCES store_locations(id) ON DELETE SET NULL,
    receipt_number TEXT NOT NULL,
    transaction_date TIMESTAMPTZ NOT NULL,
    subtotal DECIMAL(12,2) NOT NULL DEFAULT 0,
    tax_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
    discount_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
    total_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
    payment_method TEXT NOT NULL DEFAULT 'other',
    payment_status TEXT NOT NULL DEFAULT 'completed',
    customer_name TEXT,
    customer_email TEXT,
    customer_phone TEXT,
    cashier_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(store_id, receipt_number)
);

-- Sale line items table
CREATE TABLE IF NOT EXISTS sale_line_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    receipt_id UUID NOT NULL REFERENCES sales_receipts(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE SET NULL,
    product_name TEXT NOT NULL,
    product_sku TEXT,
    quantity INTEGER NOT NULL DEFAULT 1,
    unit_price DECIMAL(12,2) NOT NULL DEFAULT 0,
    discount_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
    tax_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
    total_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
    cost_price DECIMAL(12,2),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Inventory snapshots table
CREATE TABLE IF NOT EXISTS inventory_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    location_id UUID REFERENCES store_locations(id) ON DELETE SET NULL,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL DEFAULT 0,
    reserved_quantity INTEGER NOT NULL DEFAULT 0,
    unit_cost DECIMAL(12,2),
    total_value DECIMAL(12,2),
    snapshot_date DATE NOT NULL DEFAULT CURRENT_DATE,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
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

-- Imports indexes
CREATE INDEX IF NOT EXISTS idx_imports_store ON imports(store_id);
CREATE INDEX IF NOT EXISTS idx_imports_status ON imports(status);
CREATE INDEX IF NOT EXISTS idx_imports_type ON imports(import_type);
CREATE INDEX IF NOT EXISTS idx_imports_initiated_by ON imports(initiated_by);
CREATE INDEX IF NOT EXISTS idx_imports_created_at ON imports(created_at DESC);

-- Import row details indexes
CREATE INDEX IF NOT EXISTS idx_import_row_details_import ON import_row_details(import_id);
CREATE INDEX IF NOT EXISTS idx_import_row_details_status ON import_row_details(status);
CREATE INDEX IF NOT EXISTS idx_import_row_details_row_number ON import_row_details(import_id, row_number);

-- Product categories indexes
CREATE INDEX IF NOT EXISTS idx_categories_store ON product_categories(store_id);
CREATE INDEX IF NOT EXISTS idx_categories_active ON product_categories(is_active);

-- Products indexes
CREATE INDEX IF NOT EXISTS idx_products_store ON products(store_id);
CREATE INDEX IF NOT EXISTS idx_products_sku ON products(store_id, sku);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_active ON products(is_active);
CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode);

-- Sales receipts indexes
CREATE INDEX IF NOT EXISTS idx_receipts_store ON sales_receipts(store_id);
CREATE INDEX IF NOT EXISTS idx_receipts_number ON sales_receipts(store_id, receipt_number);
CREATE INDEX IF NOT EXISTS idx_receipts_date ON sales_receipts(transaction_date DESC);
CREATE INDEX IF NOT EXISTS idx_receipts_location ON sales_receipts(location_id);
CREATE INDEX IF NOT EXISTS idx_receipts_cashier ON sales_receipts(cashier_id);

-- Sale line items indexes
CREATE INDEX IF NOT EXISTS idx_line_items_receipt ON sale_line_items(receipt_id);
CREATE INDEX IF NOT EXISTS idx_line_items_product ON sale_line_items(product_id);

-- Inventory snapshots indexes
CREATE INDEX IF NOT EXISTS idx_inventory_store ON inventory_snapshots(store_id);
CREATE INDEX IF NOT EXISTS idx_inventory_product ON inventory_snapshots(product_id);
CREATE INDEX IF NOT EXISTS idx_inventory_location ON inventory_snapshots(location_id);
CREATE INDEX IF NOT EXISTS idx_inventory_date ON inventory_snapshots(snapshot_date DESC);
CREATE INDEX IF NOT EXISTS idx_inventory_store_product ON inventory_snapshots(store_id, product_id);

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

-- Triggers for new tables
CREATE TRIGGER update_product_categories_updated_at
    BEFORE UPDATE ON product_categories
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_products_updated_at
    BEFORE UPDATE ON products
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sales_receipts_updated_at
    BEFORE UPDATE ON sales_receipts
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
-- ENABLE ROW LEVEL SECURITY FOR NEW TABLES
-- ============================================

ALTER TABLE imports ENABLE ROW LEVEL SECURITY;
ALTER TABLE import_row_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE sale_line_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_snapshots ENABLE ROW LEVEL SECURITY;

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

-- Imports policies
CREATE POLICY "Store members can view imports"
    ON imports FOR SELECT
    USING (is_store_member(store_id, auth.uid()));

CREATE POLICY "Store admins can create imports"
    ON imports FOR INSERT
    WITH CHECK (has_store_role(store_id, auth.uid(), 'admin'));

-- Import row details policies
CREATE POLICY "Store members can view import row details"
    ON import_row_details FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM imports
            WHERE imports.id = import_row_details.import_id
            AND is_store_member(imports.store_id, auth.uid())
        )
    );

-- Product categories policies
CREATE POLICY "Store members can view categories"
    ON product_categories FOR SELECT
    USING (is_store_member(store_id, auth.uid()));

CREATE POLICY "Store admins can manage categories"
    ON product_categories FOR ALL
    USING (has_store_role(store_id, auth.uid(), 'admin'))
    WITH CHECK (has_store_role(store_id, auth.uid(), 'admin'));

-- Products policies
CREATE POLICY "Store members can view products"
    ON products FOR SELECT
    USING (is_store_member(store_id, auth.uid()));

CREATE POLICY "Store admins can manage products"
    ON products FOR ALL
    USING (has_store_role(store_id, auth.uid(), 'admin'))
    WITH CHECK (has_store_role(store_id, auth.uid(), 'admin'));

-- Sales receipts policies
CREATE POLICY "Store members can view receipts"
    ON sales_receipts FOR SELECT
    USING (is_store_member(store_id, auth.uid()));

CREATE POLICY "Store admins can manage receipts"
    ON sales_receipts FOR ALL
    USING (has_store_role(store_id, auth.uid(), 'admin'))
    WITH CHECK (has_store_role(store_id, auth.uid(), 'admin'));

-- Sale line items policies
CREATE POLICY "Store members can view line items"
    ON sale_line_items FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM sales_receipts
            WHERE sales_receipts.id = sale_line_items.receipt_id
            AND is_store_member(sales_receipts.store_id, auth.uid())
        )
    );

CREATE POLICY "Store admins can manage line items"
    ON sale_line_items FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM sales_receipts
            WHERE sales_receipts.id = sale_line_items.receipt_id
            AND has_store_role(sales_receipts.store_id, auth.uid(), 'admin')
        )
    );

-- Inventory snapshots policies
CREATE POLICY "Store members can view inventory"
    ON inventory_snapshots FOR SELECT
    USING (is_store_member(store_id, auth.uid()));

CREATE POLICY "Store admins can manage inventory"
    ON inventory_snapshots FOR ALL
    USING (has_store_role(store_id, auth.uid(), 'admin'))
    WITH CHECK (has_store_role(store_id, auth.uid(), 'admin'));
