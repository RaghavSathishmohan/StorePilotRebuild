-- StorePilot Analytics Function
-- Run this AFTER the analytics tables have been created

-- ============================================
-- HELPER FUNCTION: Compute Store Analytics
-- ============================================

-- Drop existing function first to handle re-runs
DROP FUNCTION IF EXISTS compute_store_analytics(UUID, UUID);

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

-- Success message
SELECT 'Analytics function created successfully!' as result;
