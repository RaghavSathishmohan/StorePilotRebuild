-- StorePilot Analytics Tables Migration (Simple Version)
-- Run this first, then run the function separately

-- ============================================
-- ANALYTICS DAILY SUMMARY
-- ============================================
CREATE TABLE IF NOT EXISTS analytics_daily_summary (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    summary_date DATE NOT NULL,
    total_revenue DECIMAL(12,2) NOT NULL DEFAULT 0,
    total_cost DECIMAL(12,2) NOT NULL DEFAULT 0,
    gross_profit DECIMAL(12,2) NOT NULL DEFAULT 0,
    gross_margin DECIMAL(5,2) NOT NULL DEFAULT 0,
    total_transactions INTEGER NOT NULL DEFAULT 0,
    total_items_sold INTEGER NOT NULL DEFAULT 0,
    average_order_value DECIMAL(12,2) NOT NULL DEFAULT 0,
    average_items_per_transaction DECIMAL(5,2) NOT NULL DEFAULT 0,
    total_products INTEGER NOT NULL DEFAULT 0,
    active_products INTEGER NOT NULL DEFAULT 0,
    low_stock_products INTEGER NOT NULL DEFAULT 0,
    out_of_stock_products INTEGER NOT NULL DEFAULT 0,
    total_inventory_value DECIMAL(12,2) NOT NULL DEFAULT 0,
    total_inventory_cost DECIMAL(12,2) NOT NULL DEFAULT 0,
    computed_at TIMESTAMPTZ DEFAULT NOW(),
    computed_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(store_id, summary_date)
);

-- ============================================
-- ANALYTICS CATEGORY PERFORMANCE
-- ============================================
CREATE TABLE IF NOT EXISTS analytics_category_performance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    category_id UUID REFERENCES product_categories(id) ON DELETE CASCADE,
    category_name TEXT NOT NULL,
    product_count INTEGER NOT NULL DEFAULT 0,
    inventory_value DECIMAL(12,2) NOT NULL DEFAULT 0,
    inventory_cost DECIMAL(12,2) NOT NULL DEFAULT 0,
    summary_date DATE,
    items_sold INTEGER NOT NULL DEFAULT 0,
    sales_revenue DECIMAL(12,2) NOT NULL DEFAULT 0,
    sales_cost DECIMAL(12,2) NOT NULL DEFAULT 0,
    category_profit DECIMAL(12,2) NOT NULL DEFAULT 0,
    period_start DATE,
    period_end DATE,
    computed_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(store_id, category_id, summary_date)
);

-- ============================================
-- ANALYTICS PRODUCT PERFORMANCE
-- ============================================
CREATE TABLE IF NOT EXISTS analytics_product_performance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    summary_date DATE,
    period_start DATE,
    period_end DATE,
    total_quantity_sold INTEGER NOT NULL DEFAULT 0,
    total_revenue DECIMAL(12,2) NOT NULL DEFAULT 0,
    total_cost DECIMAL(12,2) NOT NULL DEFAULT 0,
    total_profit DECIMAL(12,2) NOT NULL DEFAULT 0,
    current_stock INTEGER NOT NULL DEFAULT 0,
    stock_value DECIMAL(12,2) NOT NULL DEFAULT 0,
    revenue_rank INTEGER,
    quantity_rank INTEGER,
    computed_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(store_id, product_id, summary_date)
);

-- ============================================
-- ANALYTICS USER PREFERENCES
-- ============================================
CREATE TABLE IF NOT EXISTS analytics_user_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    default_date_range INTEGER DEFAULT 30,
    pinned_metrics TEXT[] DEFAULT '{}',
    hidden_cards TEXT[] DEFAULT '{}',
    email_alerts_enabled BOOLEAN DEFAULT true,
    alert_threshold_low_stock INTEGER DEFAULT 10,
    alert_threshold_sales_drop DECIMAL(5,2) DEFAULT 20.0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, store_id)
);

-- ============================================
-- ANALYTICS COMPUTATION LOG
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
CREATE INDEX IF NOT EXISTS idx_analytics_daily_store_date ON analytics_daily_summary(store_id, summary_date DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_category_store ON analytics_category_performance(store_id, summary_date);
CREATE INDEX IF NOT EXISTS idx_analytics_category_revenue ON analytics_category_performance(store_id, sales_revenue DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_product_store ON analytics_product_performance(store_id, summary_date);
CREATE INDEX IF NOT EXISTS idx_analytics_prefs_user ON analytics_user_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_analytics_log_store ON analytics_computation_log(store_id, started_at DESC);

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

-- Daily Summary
CREATE POLICY "Store members can view daily summary"
    ON analytics_daily_summary FOR SELECT
    USING (is_store_member(store_id, auth.uid()));

CREATE POLICY "Store admins can manage daily summary"
    ON analytics_daily_summary FOR ALL
    USING (has_store_role(store_id, auth.uid(), 'admin'))
    WITH CHECK (has_store_role(store_id, auth.uid(), 'admin'));

-- Category Performance
CREATE POLICY "Store members can view category performance"
    ON analytics_category_performance FOR SELECT
    USING (is_store_member(store_id, auth.uid()));

CREATE POLICY "Store admins can manage category performance"
    ON analytics_category_performance FOR ALL
    USING (has_store_role(store_id, auth.uid(), 'admin'))
    WITH CHECK (has_store_role(store_id, auth.uid(), 'admin'));

-- Product Performance
CREATE POLICY "Store members can view product performance"
    ON analytics_product_performance FOR SELECT
    USING (is_store_member(store_id, auth.uid()));

CREATE POLICY "Store admins can manage product performance"
    ON analytics_product_performance FOR ALL
    USING (has_store_role(store_id, auth.uid(), 'admin'))
    WITH CHECK (has_store_role(store_id, auth.uid(), 'admin'));

-- User Preferences
CREATE POLICY "Users can view own preferences"
    ON analytics_user_preferences FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own preferences"
    ON analytics_user_preferences FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Computation Log
CREATE POLICY "Store members can view computation log"
    ON analytics_computation_log FOR SELECT
    USING (is_store_member(store_id, auth.uid()));

CREATE POLICY "Store admins can manage computation log"
    ON analytics_computation_log FOR ALL
    USING (has_store_role(store_id, auth.uid(), 'admin'))
    WITH CHECK (has_store_role(store_id, auth.uid(), 'admin'));

-- Success message
SELECT 'Analytics tables created successfully!' as result;
