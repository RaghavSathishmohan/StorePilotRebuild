-- StorePilot Operating System Tables
-- For founder dashboard, agent tracking, testing, and analytics

-- ============================================
-- OS FEATURES / BACKLOG
-- ============================================
CREATE TABLE IF NOT EXISTS os_features (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'backlog' CHECK (status IN ('backlog', 'planned', 'in_progress', 'in_review', 'completed')),
    priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'critical')),
    category TEXT CHECK (category IN ('product', 'sales', 'inventory', 'analytics', 'infrastructure', 'testing')),
    acceptance_criteria TEXT[],
    prd_content TEXT,
    prd_status TEXT DEFAULT 'draft' CHECK (prd_status IN ('draft', 'pending_review', 'approved', 'rejected')),
    estimated_days INTEGER,
    actual_days INTEGER,
    agent_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ
);

-- ============================================
-- AGENT ACTIVITY LOG
-- ============================================
CREATE TABLE IF NOT EXISTS os_agent_activity (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_name TEXT NOT NULL,
    action_type TEXT NOT NULL CHECK (action_type IN ('test_run', 'prd_draft', 'review', 'release_prep', 'feature_build', 'bug_fix')),
    status TEXT NOT NULL CHECK (status IN ('running', 'completed', 'failed', 'waiting_approval')),
    related_feature_id UUID REFERENCES os_features(id) ON DELETE SET NULL,
    input_data JSONB,
    output_data JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    duration_ms INTEGER
);

-- ============================================
-- DECISION QUEUE (FOR FOUNDER APPROVAL)
-- ============================================
CREATE TABLE IF NOT EXISTS os_decision_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_type TEXT NOT NULL CHECK (item_type IN ('prd', 'release', 'test_plan', 'outreach', 'expense')),
    title TEXT NOT NULL,
    description TEXT,
    related_feature_id UUID REFERENCES os_features(id) ON DELETE SET NULL,
    draft_content JSONB,
    agent_name TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'edited')),
    priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    decided_at TIMESTAMPTZ,
    founder_notes TEXT
);

-- ============================================
-- TEST RESULTS
-- ============================================
CREATE TABLE IF NOT EXISTS os_test_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    run_id TEXT NOT NULL,
    test_type TEXT NOT NULL CHECK (test_type IN ('e2e', 'integration', 'unit', 'visual', 'rls', 'performance')),
    test_name TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('passed', 'failed', 'skipped', 'flaky')),
    related_feature TEXT,
    duration_ms INTEGER,
    error_message TEXT,
    screenshot_url TEXT,
    logs TEXT,
    run_at TIMESTAMPTZ DEFAULT NOW(),
    commit_sha TEXT
);

-- ============================================
-- RELEASES
-- ============================================
CREATE TABLE IF NOT EXISTS os_releases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    version TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('planning', 'ready', 'approved', 'deployed', 'rolled_back')),
    changelog TEXT,
    test_summary JSONB,
    features_included UUID[],
    deployed_at TIMESTAMPTZ,
    deployed_by TEXT,
    rollback_reason TEXT
);

-- ============================================
-- KNOWLEDGE BASE
-- ============================================
CREATE TABLE IF NOT EXISTS os_knowledge (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    topic TEXT NOT NULL,
    summary TEXT NOT NULL,
    content TEXT,
    owner_agent TEXT NOT NULL,
    tags TEXT[],
    related_feature_id UUID REFERENCES os_features(id) ON DELETE SET NULL,
    related_artifacts JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- ANALYTICS INSIGHTS (AUTO-GENERATED)
-- ============================================
CREATE TABLE IF NOT EXISTS os_analytics_insights (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    insight_type TEXT NOT NULL CHECK (insight_type IN ('high_revenue_product', 'low_stock_alert', 'trending_product', 'slow_mover', 'profit_opportunity', 'inventory_risk')),
    store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    product_id UUID REFERENCES products(id) ON DELETE SET NULL,
    product_name TEXT,
    metric_value NUMERIC,
    metric_unit TEXT,
    severity TEXT CHECK (severity IN ('info', 'warning', 'critical')),
    action_recommended TEXT,
    action_taken BOOLEAN DEFAULT FALSE,
    dismissed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_features_status ON os_features(status, priority, created_at);
CREATE INDEX IF NOT EXISTS idx_agent_activity_feature ON os_agent_activity(related_feature_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_decision_queue_status ON os_decision_queue(status, priority, created_at);
CREATE INDEX IF NOT EXISTS idx_test_results_feature ON os_test_results(related_feature, status);
CREATE INDEX IF NOT EXISTS idx_test_results_run ON os_test_results(run_id, status);
CREATE INDEX IF NOT EXISTS idx_analytics_insights_store ON os_analytics_insights(store_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_insights_type ON os_analytics_insights(insight_type, dismissed);

-- ============================================
-- RLS POLICIES
-- ============================================

-- Enable RLS
ALTER TABLE os_features ENABLE ROW LEVEL SECURITY;
ALTER TABLE os_agent_activity ENABLE ROW LEVEL SECURITY;
ALTER TABLE os_decision_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE os_test_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE os_releases ENABLE ROW LEVEL SECURITY;
ALTER TABLE os_knowledge ENABLE ROW LEVEL SECURITY;
ALTER TABLE os_analytics_insights ENABLE ROW LEVEL SECURITY;

-- Helper function to check if user is a store member
CREATE OR REPLACE FUNCTION is_store_member(store_uuid UUID, user_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM store_members
        WHERE store_id = store_uuid AND user_id = user_uuid AND status = 'active'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- os_features: Only owner/admin can manage
CREATE POLICY os_features_access ON os_features
    FOR ALL TO authenticated
    USING (true)
    WITH CHECK (true);

-- os_analytics_insights: Members can view their store insights
CREATE POLICY os_analytics_insights_access ON os_analytics_insights
    FOR ALL TO authenticated
    USING (is_store_member(store_id, auth.uid()))
    WITH CHECK (is_store_member(store_id, auth.uid()));

-- Other tables: Read access for authenticated
CREATE POLICY os_agent_activity_read ON os_agent_activity
    FOR SELECT TO authenticated USING (true);

CREATE POLICY os_decision_queue_read ON os_decision_queue
    FOR SELECT TO authenticated USING (true);

CREATE POLICY os_test_results_read ON os_test_results
    FOR SELECT TO authenticated USING (true);

CREATE POLICY os_releases_read ON os_releases
    FOR SELECT TO authenticated USING (true);

CREATE POLICY os_knowledge_read ON os_knowledge
    FOR SELECT TO authenticated USING (true);
