-- StorePilot Analytics Tables Migration
-- Creates tables for user-specific, store-shared analytics data
-- with proper RLS policies for multi-tenant security

-- ============================================
-- ANALYTICS DAILY SUMMARY
-- Stores pre-computed daily metrics for fast dashboard loading
-- ============================================
CREATE TABLE IF NOT EXISTS analytics_daily_summary (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    summary_date DATE NOT NULL,

    -- Revenue metrics
    total_revenue DECIMAL(12,2) NOT NULL DEFAULT 0,
    total_cost DECIMAL(12,2) NOT NULL DEFAULT 0,
    gross_profit DECIMAL(12,2) NOT NULL DEFAULT 0,
    gross_margin DECIMAL(5,2) NOT NULL DEFAULT 0,

    -- Sales metrics
    total_transactions INTEGER NOT NULL DEFAULT 0,
    total_items_sold INTEGER NOT NULL DEFAULT 0,
    average_order_value DECIMAL(12,2) NOT NULL DEFAULT 0,
    average_items_per_transaction DECIMAL(5,2) NOT NULL DEFAULT 0,

    -- Product metrics
    total_products INTEGER NOT NULL DEFAULT 0,
    active_products INTEGER NOT NULL DEFAULT 0,
    low_stock_products INTEGER NOT NULL DEFAULT 0,
    out_of_stock_products INTEGER NOT NULL DEFAULT 0,

    -- Inventory metrics
    total_inventory_value DECIMAL(12,2) NOT NULL DEFAULT 0,
    total_inventory_cost DECIMAL(12,2) NOT NULL DEFAULT 0,

    -- Metadata
    computed_at TIMESTAMPTZ DEFAULT NOW(),
    computed_by UUID REFERENCES profiles(id) ON DELETE SET NULL,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(store_id, summary_date)
);

-- ============================================
-- ANALYTICS CATEGORY PERFORMANCE
-- Stores category-level metrics per store
-- ============================================
CREATE TABLE IF NOT EXISTS analytics_category_performance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    category_id UUID REFERENCES product_categories(id) ON DELETE CASCADE,
    category_name TEXT NOT NULL, -- Cached for performance

    -- Inventory metrics
    product_count INTEGER NOT NULL DEFAULT 0,
    inventory_value DECIMAL(12,2) NOT NULL DEFAULT 0,
    inventory_cost DECIMAL(12,2) NOT NULL DEFAULT 0,

    -- Sales metrics (can be daily or cumulative)
    summary_date DATE, -- NULL for current running totals
    items_sold INTEGER NOT NULL DEFAULT 0,
    sales_revenue DECIMAL(12,2) NOT NULL DEFAULT 0,
    sales_cost DECIMAL(12,2) NOT NULL DEFAULT 0,
    category_profit DECIMAL(12,2) NOT NULL DEFAULT 0,

    -- For time-based comparisons
    period_start DATE,
    period_end DATE,

    computed_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(store_id, category_id, summary_date)
);

-- ============================================
-- ANALYTICS PRODUCT PERFORMANCE
-- Stores top-level product performance metrics
-- ============================================
CREATE TABLE IF NOT EXISTS analytics_product_performance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,

    -- Time period
    summary_date DATE, -- NULL for current running totals
    period_start DATE,
    period_end DATE,

    -- Sales metrics
    total_quantity_sold INTEGER NOT NULL DEFAULT 0,
    total_revenue DECIMAL(12,2) NOT NULL DEFAULT 0,
    total_cost DECIMAL(12,2) NOT NULL DEFAULT 0,
    total_profit DECIMAL(12,2) NOT NULL DEFAULT 0,

    -- Inventory snapshot
    current_stock INTEGER NOT NULL DEFAULT 0,
    stock_value DECIMAL(12,2) NOT NULL DEFAULT 0,

    -- Rankings (computed periodically)
    revenue_rank INTEGER,
    quantity_rank INTEGER,

    computed_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(store_id, product_id, summary_date)
);

-- ============================================
-- ANALYTICS USER PREFERENCES
-- Per-user analytics dashboard preferences
-- ============================================
CREATE TABLE IF NOT EXISTS analytics_user_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,

    -- Dashboard customization
    default_date_range INTEGER DEFAULT 30, -- days
    pinned_metrics TEXT[] DEFAULT '{}', -- e.g., ['revenue', 'sales', 'top_products']
    hidden_cards TEXT[] DEFAULT '{}',

    -- Notification preferences
    email_alerts_enabled BOOLEAN DEFAULT true,
    alert_threshold_low_stock INTEGER DEFAULT 10,
    alert_threshold_sales_drop DECIMAL(5,2) DEFAULT 20.0, -- percentage

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(user_id, store_id)
);

-- ============================================
-- ANALYTICS SNAPSHOT LOG
-- Tracks when analytics were last computed
-- ============================================
CREATE TABLE IF NOT EXISTS analytics_computation_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    computed_by UUID NOT NULL REFERENCES profiles(id) ON DELETE SET NULL,

    computation_type TEXT NOT NULL CHECK (computation_type IN ('daily', 'category', 'product', 'full')),
    status TEXT NOT NULL CHECK (status IN ('started', 'completed', 'failed')),

    records_processed INTEGER DEFAULT 0,
    duration_ms INTEGER,
    error_message TEXT,

    started_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

-- ============================================
-- INDEXES
-- ============================================

-- Daily summary indexes
CREATE INDEX IF NOT EXISTS idx_analytics_daily_store_date ON analytics_daily_summary(store_id, summary_date DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_daily_computed ON analytics_daily_summary(computed_at DESC);

-- Category performance indexes
CREATE INDEX IF NOT EXISTS idx_analytics_category_store ON analytics_category_performance(store_id, summary_date);
CREATE INDEX IF NOT EXISTS idx_analytics_category_name ON analytics_category_performance(category_name);
CREATE INDEX IF NOT EXISTS idx_analytics_category_revenue ON analytics_category_performance(store_id, sales_revenue DESC);

-- Product performance indexes
CREATE INDEX IF NOT EXISTS idx_analytics_product_store ON analytics_product_performance(store_id, summary_date);
CREATE INDEX IF NOT EXISTS idx_analytics_product_revenue ON analytics_product_performance(store_id, revenue_rank);
CREATE INDEX IF NOT EXISTS idx_analytics_product_quantity ON analytics_product_performance(store_id, quantity_rank);

-- User preferences indexes
CREATE INDEX IF NOT EXISTS idx_analytics_prefs_user ON analytics_user_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_analytics_prefs_store ON analytics_user_preferences(store_id);

-- Computation log indexes
CREATE INDEX IF NOT EXISTS idx_analytics_log_store ON analytics_computation_log(store_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_log_status ON analytics_computation_log(status, computation_type);

-- ============================================
-- TRIGGERS
-- ============================================

-- Drop existing triggers first to handle re-runs
DROP TRIGGER IF EXISTS update_analytics_daily_summary_updated_at ON analytics_daily_summary;
DROP TRIGGER IF EXISTS update_analytics_category_updated_at ON analytics_category_performance;
DROP TRIGGER IF EXISTS update_analytics_product_updated_at ON analytics_product_performance;
DROP TRIGGER IF EXISTS update_analytics_user_prefs_updated_at ON analytics_user_preferences;

CREATE TRIGGER update_analytics_daily_summary_updated_at
    BEFORE UPDATE ON analytics_daily_summary
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_analytics_category_updated_at
    BEFORE UPDATE ON analytics_category_performance
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_analytics_product_updated_at
    BEFORE UPDATE ON analytics_product_performance
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_analytics_user_prefs_updated_at
    BEFORE UPDATE ON analytics_user_preferences
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- ENABLE RLS
-- ============================================

ALTER TABLE analytics_daily_summary ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_category_performance ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_product_performance ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_computation_log ENABLE ROW LEVEL SECURITY;

-- ============================================
-- RLS POLICIES
-- ============================================

-- Drop existing policies first to handle re-runs
DROP POLICY IF EXISTS "Store members can view daily summary" ON analytics_daily_summary;
DROP POLICY IF EXISTS "Store admins can manage daily summary" ON analytics_daily_summary;
DROP POLICY IF EXISTS "Store members can view category performance" ON analytics_category_performance;
DROP POLICY IF EXISTS "Store admins can manage category performance" ON analytics_category_performance;
DROP POLICY IF EXISTS "Store members can view product performance" ON analytics_product_performance;
DROP POLICY IF EXISTS "Store admins can manage product performance" ON analytics_product_performance;
DROP POLICY IF EXISTS "Users can view own preferences" ON analytics_user_preferences;
DROP POLICY IF EXISTS "Users can manage own preferences" ON analytics_user_preferences;
DROP POLICY IF EXISTS "Store members can view computation log" ON analytics_computation_log;
DROP POLICY IF EXISTS "Store admins can manage computation log" ON analytics_computation_log;

-- Daily Summary: Store members can view their store's data
CREATE POLICY "Store members can view daily summary"
    ON analytics_daily_summary FOR SELECT
    USING (is_store_member(store_id, auth.uid()));

CREATE POLICY "Store admins can manage daily summary"
    ON analytics_daily_summary FOR ALL
    USING (has_store_role(store_id, auth.uid(), 'admin'))
    WITH CHECK (has_store_role(store_id, auth.uid(), 'admin'));

-- Category Performance: Store members can view
CREATE POLICY "Store members can view category performance"
    ON analytics_category_performance FOR SELECT
    USING (is_store_member(store_id, auth.uid()));

CREATE POLICY "Store admins can manage category performance"
    ON analytics_category_performance FOR ALL
    USING (has_store_role(store_id, auth.uid(), 'admin'))
    WITH CHECK (has_store_role(store_id, auth.uid(), 'admin'));

-- Product Performance: Store members can view
CREATE POLICY "Store members can view product performance"
    ON analytics_product_performance FOR SELECT
    USING (is_store_member(store_id, auth.uid()));

CREATE POLICY "Store admins can manage product performance"
    ON analytics_product_performance FOR ALL
    USING (has_store_role(store_id, auth.uid(), 'admin'))
    WITH CHECK (has_store_role(store_id, auth.uid(), 'admin'));

-- User Preferences: Users manage their own preferences
CREATE POLICY "Users can view own preferences"
    ON analytics_user_preferences FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own preferences"
    ON analytics_user_preferences FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Computation Log: Store admins can view
CREATE POLICY "Store members can view computation log"
    ON analytics_computation_log FOR SELECT
    USING (is_store_member(store_id, auth.uid()));

CREATE POLICY "Store admins can manage computation log"
    ON analytics_computation_log FOR ALL
    USING (has_store_role(store_id, auth.uid(), 'admin'))
    WITH CHECK (has_store_role(store_id, auth.uid(), 'admin'));

-- ============================================
-- HELPER FUNCTION: Compute Store Analytics
-- ============================================

CREATE OR REPLACE FUNCTION compute_store_analytics(p_store_id UUID, p_computed_by UUID)
RETURNS TABLE(
    daily_records INTEGER,
    category_records INTEGER,
    product_records INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_daily_records INTEGER := 0;
    v_category_records INTEGER := 0;
    v_product_records INTEGER := 0;
    v_start_time TIMESTAMPTZ := NOW();
BEGIN
    -- Log start
    INSERT INTO analytics_computation_log (store_id, computed_by, computation_type, status, started_at)
    VALUES (p_store_id, p_computed_by, 'full', 'started', v_start_time);

    -- Compute daily summary for today
    INSERT INTO analytics_daily_summary (
        store_id, summary_date, total_revenue, total_cost, gross_profit, gross_margin,
        total_transactions, total_items_sold, average_order_value, average_items_per_transaction,
        total_products, active_products, low_stock_products, out_of_stock_products,
        total_inventory_value, total_inventory_cost, computed_by
    )
    SELECT
        p_store_id,
        CURRENT_DATE,
        COALESCE(SUM(sr.total_amount), 0),
        COALESCE(SUM(sli.cost_price * sli.quantity), 0),
        COALESCE(SUM(sr.total_amount) - SUM(sli.cost_price * sli.quantity), 0),
        CASE WHEN SUM(sr.total_amount) > 0
            THEN ((SUM(sr.total_amount) - SUM(sli.cost_price * sli.quantity)) / SUM(sr.total_amount)) * 100
            ELSE 0
        END,
        COUNT(DISTINCT sr.id),
        COALESCE(SUM(sli.quantity), 0),
        CASE WHEN COUNT(DISTINCT sr.id) > 0
            THEN SUM(sr.total_amount) / COUNT(DISTINCT sr.id)
            ELSE 0
        END,
        CASE WHEN COUNT(DISTINCT sr.id) > 0
            THEN SUM(sli.quantity)::DECIMAL / COUNT(DISTINCT sr.id)
            ELSE 0
        END,
        COUNT(DISTINCT p.id),
        COUNT(DISTINCT CASE WHEN p.is_active = true THEN p.id END),
        COUNT(DISTINCT CASE WHEN COALESCE(p.stock, 0) > 0 AND COALESCE(p.stock, 0) <= COALESCE(p.reorder_point, 10) THEN p.id END),
        COUNT(DISTINCT CASE WHEN COALESCE(p.stock, 0) = 0 THEN p.id END),
        COALESCE(SUM(COALESCE(p.stock, 0) * p.selling_price), 0),
        COALESCE(SUM(COALESCE(p.stock, 0) * COALESCE(p.cost_price, 0)), 0),
        p_computed_by
    FROM products p
    LEFT JOIN sales_receipts sr ON sr.store_id = p_store_id
        AND sr.transaction_date >= CURRENT_DATE
        AND sr.transaction_date < CURRENT_DATE + INTERVAL '1 day'
    LEFT JOIN sale_line_items sli ON sli.receipt_id = sr.id
    WHERE p.store_id = p_store_id
    ON CONFLICT (store_id, summary_date) DO UPDATE SET
        total_revenue = EXCLUDED.total_revenue,
        total_cost = EXCLUDED.total_cost,
        gross_profit = EXCLUDED.gross_profit,
        gross_margin = EXCLUDED.gross_margin,
        total_transactions = EXCLUDED.total_transactions,
        total_items_sold = EXCLUDED.total_items_sold,
        average_order_value = EXCLUDED.average_order_value,
        average_items_per_transaction = EXCLUDED.average_items_per_transaction,
        total_products = EXCLUDED.total_products,
        active_products = EXCLUDED.active_products,
        low_stock_products = EXCLUDED.low_stock_products,
        out_of_stock_products = EXCLUDED.out_of_stock_products,
        total_inventory_value = EXCLUDED.total_inventory_value,
        total_inventory_cost = EXCLUDED.total_inventory_cost,
        computed_by = EXCLUDED.computed_by,
        computed_at = NOW();

    GET DIAGNOSTICS v_daily_records = ROW_COUNT;

    -- Compute category performance
    DELETE FROM analytics_category_performance
    WHERE store_id = p_store_id AND summary_date IS NULL;

    INSERT INTO analytics_category_performance (
        store_id, category_id, category_name, product_count,
        inventory_value, inventory_cost, items_sold, sales_revenue,
        sales_cost, category_profit, computed_by
    )
    SELECT
        p_store_id,
        pc.id,
        pc.name,
        COUNT(DISTINCT p.id),
        COALESCE(SUM(COALESCE(p.stock, 0) * p.selling_price), 0),
        COALESCE(SUM(COALESCE(p.stock, 0) * COALESCE(p.cost_price, 0)), 0),
        COALESCE(SUM(sli.quantity), 0),
        COALESCE(SUM(sli.total_amount), 0),
        COALESCE(SUM(sli.cost_price * sli.quantity), 0),
        COALESCE(SUM(sli.total_amount) - SUM(sli.cost_price * sli.quantity), 0),
        p_computed_by
    FROM product_categories pc
    LEFT JOIN products p ON p.category_id = pc.id AND p.store_id = p_store_id
    LEFT JOIN sale_line_items sli ON sli.product_id = p.id
    LEFT JOIN sales_receipts sr ON sr.id = sli.receipt_id AND sr.store_id = p_store_id
    WHERE pc.store_id = p_store_id
    GROUP BY pc.id, pc.name
    HAVING COUNT(DISTINCT p.id) > 0;

    GET DIAGNOSTICS v_category_records = ROW_COUNT;

    -- Compute uncategorized products
    INSERT INTO analytics_category_performance (
        store_id, category_id, category_name, product_count,
        inventory_value, inventory_cost, items_sold, sales_revenue,
        sales_cost, category_profit, computed_by
    )
    SELECT
        p_store_id,
        NULL,
        'Uncategorized',
        COUNT(DISTINCT p.id),
        COALESCE(SUM(COALESCE(p.stock, 0) * p.selling_price), 0),
        COALESCE(SUM(COALESCE(p.stock, 0) * COALESCE(p.cost_price, 0)), 0),
        COALESCE(SUM(sli.quantity), 0),
        COALESCE(SUM(sli.total_amount), 0),
        COALESCE(SUM(sli.cost_price * sli.quantity), 0),
        COALESCE(SUM(sli.total_amount) - SUM(sli.cost_price * sli.quantity), 0),
        p_computed_by
    FROM products p
    LEFT JOIN sale_line_items sli ON sli.product_id = p.id
    LEFT JOIN sales_receipts sr ON sr.id = sli.receipt_id AND sr.store_id = p_store_id
    WHERE p.store_id = p_store_id AND p.category_id IS NULL
    HAVING COUNT(DISTINCT p.id) > 0;

    GET DIAGNOSTICS v_product_records = ROW_COUNT;

    -- Update log - use subquery to get the most recent started record
    UPDATE analytics_computation_log
    SET status = 'completed',
        records_processed = v_daily_records + v_category_records + v_product_records,
        duration_ms = EXTRACT(MILLISECOND FROM (NOW() - v_start_time)),
        completed_at = NOW()
    WHERE id = (
        SELECT id FROM analytics_computation_log
        WHERE store_id = p_store_id
        AND computation_type = 'full'
        AND status = 'started'
        ORDER BY started_at DESC
        LIMIT 1
    );

    RETURN QUERY SELECT v_daily_records, v_category_records, v_product_records;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION compute_store_analytics(UUID, UUID) TO authenticated;
