-- Create imports table for tracking import jobs
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

-- Create import row details table for tracking individual row errors
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

-- Indexes
CREATE INDEX IF NOT EXISTS idx_imports_store ON imports(store_id);
CREATE INDEX IF NOT EXISTS idx_imports_status ON imports(status);
CREATE INDEX IF NOT EXISTS idx_imports_type ON imports(import_type);
CREATE INDEX IF NOT EXISTS idx_imports_initiated_by ON imports(initiated_by);
CREATE INDEX IF NOT EXISTS idx_imports_created_at ON imports(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_import_row_details_import ON import_row_details(import_id);
CREATE INDEX IF NOT EXISTS idx_import_row_details_status ON import_row_details(status);
CREATE INDEX IF NOT EXISTS idx_import_row_details_row_number ON import_row_details(import_id, row_number);

-- Enable RLS
ALTER TABLE imports ENABLE ROW LEVEL SECURITY;
ALTER TABLE import_row_details ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Store members can view imports"
    ON imports FOR SELECT
    USING (is_store_member(store_id, auth.uid()));

CREATE POLICY "Store admins can create imports"
    ON imports FOR INSERT
    WITH CHECK (has_store_role(store_id, auth.uid(), 'admin'));

CREATE POLICY "Store members can view import row details"
    ON import_row_details FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM imports
            WHERE imports.id = import_row_details.import_id
            AND is_store_member(imports.store_id, auth.uid())
        )
    );
