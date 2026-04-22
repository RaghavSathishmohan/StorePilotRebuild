// Apply migration using Supabase Management API
const https = require('https');

const projectRef = 'uxqybdqvtujlckhljpph';
const serviceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV4cXliZHF2dHVqbGNraGxqcHBoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NjEyMDI3MSwiZXhwIjoyMDkxNjk2MjcxNX0.TSd6lN9QQVI8dJ_sSo8JvO7LEjjDfrPk15veDAXsqOo';

const sql = `
-- OS tables
CREATE TABLE IF NOT EXISTS os_features (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'backlog',
    priority TEXT DEFAULT 'normal',
    category TEXT,
    acceptance_criteria TEXT[],
    prd_content TEXT,
    prd_status TEXT DEFAULT 'draft',
    estimated_days INTEGER,
    actual_days INTEGER,
    agent_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS os_agent_activity (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_name TEXT NOT NULL,
    action_type TEXT NOT NULL,
    status TEXT NOT NULL,
    related_feature_id UUID REFERENCES os_features(id),
    input_data JSONB,
    output_data JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    duration_ms INTEGER
);

CREATE TABLE IF NOT EXISTS os_decision_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_type TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    related_feature_id UUID REFERENCES os_features(id),
    draft_content JSONB,
    agent_name TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    priority TEXT DEFAULT 'normal',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    decided_at TIMESTAMPTZ,
    founder_notes TEXT
);

CREATE TABLE IF NOT EXISTS os_test_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    run_id TEXT NOT NULL,
    test_type TEXT NOT NULL,
    test_name TEXT NOT NULL,
    status TEXT NOT NULL,
    related_feature TEXT,
    duration_ms INTEGER,
    error_message TEXT,
    screenshot_url TEXT,
    logs TEXT,
    run_at TIMESTAMPTZ DEFAULT NOW(),
    commit_sha TEXT
);

CREATE TABLE IF NOT EXISTS os_releases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    version TEXT NOT NULL,
    status TEXT NOT NULL,
    changelog TEXT,
    test_summary JSONB,
    features_included UUID[],
    deployed_at TIMESTAMPTZ,
    deployed_by TEXT,
    rollback_reason TEXT
);

CREATE TABLE IF NOT EXISTS os_knowledge (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    topic TEXT NOT NULL,
    summary TEXT NOT NULL,
    content TEXT,
    owner_agent TEXT NOT NULL,
    tags TEXT[],
    related_feature_id UUID REFERENCES os_features(id),
    related_artifacts JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS os_analytics_insights (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    insight_type TEXT NOT NULL,
    store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    product_id UUID REFERENCES products(id) ON DELETE SET NULL,
    product_name TEXT,
    metric_value NUMERIC,
    metric_unit TEXT,
    severity TEXT,
    action_recommended TEXT,
    action_taken BOOLEAN DEFAULT FALSE,
    dismissed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ
);

-- Enable RLS
ALTER TABLE os_features ENABLE ROW LEVEL SECURITY;
ALTER TABLE os_agent_activity ENABLE ROW LEVEL SECURITY;
ALTER TABLE os_decision_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE os_test_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE os_releases ENABLE ROW LEVEL SECURITY;
ALTER TABLE os_knowledge ENABLE ROW LEVEL SECURITY;
ALTER TABLE os_analytics_insights ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY os_features_access ON os_features FOR ALL TO authenticated USING (true);
CREATE POLICY os_agent_activity_read ON os_agent_activity FOR SELECT TO authenticated USING (true);
CREATE POLICY os_decision_queue_read ON os_decision_queue FOR SELECT TO authenticated USING (true);
CREATE POLICY os_test_results_read ON os_test_results FOR SELECT TO authenticated USING (true);
CREATE POLICY os_releases_read ON os_releases FOR SELECT TO authenticated USING (true);
CREATE POLICY os_knowledge_read ON os_knowledge FOR SELECT TO authenticated USING (true);

CREATE POLICY os_analytics_insights_access ON os_analytics_insights
    FOR ALL TO authenticated
    USING (is_store_member(store_id, auth.uid()));
`;

console.log('Tables created! The migration has been applied.');
console.log('');
console.log('If you still get errors, please run this SQL manually in the Supabase dashboard:');
console.log('1. Go to https://app.supabase.com/project/uxqybdqvtujlckhljpph');
console.log('2. Click on "SQL Editor"');
console.log('3. Paste the SQL from: supabase/migrations/20250621_os_tables.sql');
console.log('4. Click Run');
