-- StorePilot Seed Data
-- Run this after applying schema.sql to populate demo data

-- ============================================
-- DEMO DATA FOR LOCAL DEVELOPMENT
-- ============================================

-- Note: This seed data assumes you're running in a local Supabase environment
-- with the auth.users table already having a demo user.
-- Replace the user IDs below with actual auth.users IDs from your environment.

-- Demo user (adjust email/UUID as needed for your environment)
-- This assumes a user exists in auth.users with this email
DO $$
DECLARE
    demo_user_id UUID := '00000000-0000-0000-0000-000000000001';
    demo_store_id UUID := '00000000-0000-0000-0000-000000000002';
    demo_location_1_id UUID := '00000000-0000-0000-0000-000000000003';
    demo_location_2_id UUID := '00000000-0000-0000-0000-000000000004';
BEGIN
    -- Insert demo user profile if not exists
    INSERT INTO profiles (id, email, full_name, phone, timezone, default_store_id)
    VALUES (
        demo_user_id,
        'demo@storepilot.app',
        'Demo Owner',
        '+1-555-123-4567',
        'America/New_York',
        demo_store_id
    )
    ON CONFLICT (id) DO UPDATE SET
        full_name = EXCLUDED.full_name,
        default_store_id = EXCLUDED.default_store_id;

    -- Insert demo store
    INSERT INTO stores (id, name, slug, owner_id, description, status)
    VALUES (
        demo_store_id,
        'Downtown Convenience',
        'downtown-convenience',
        demo_user_id,
        'A 24-hour convenience store serving the downtown area since 2015.',
        'active'
    )
    ON CONFLICT (id) DO NOTHING;

    -- Insert store locations
    INSERT INTO store_locations (id, store_id, name, code, phone, email, status, address_line_1, city, state, postal_code, hours_json)
    VALUES (
        demo_location_1_id,
        demo_store_id,
        'Main Street',
        'MAIN',
        '+1-555-123-4567',
        'main@downtownconvenience.com',
        'active',
        '123 Main Street',
        'Downtown',
        'CA',
        '90210',
        '{"monday": {"open": "00:00", "close": "23:59"}, "tuesday": {"open": "00:00", "close": "23:59"}, "wednesday": {"open": "00:00", "close": "23:59"}, "thursday": {"open": "00:00", "close": "23:59"}, "friday": {"open": "00:00", "close": "23:59"}, "saturday": {"open": "00:00", "close": "23:59"}, "sunday": {"open": "00:00", "close": "23:59"}}'::jsonb
    )
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO store_locations (id, store_id, name, code, phone, email, status, address_line_1, city, state, postal_code, hours_json)
    VALUES (
        demo_location_2_id,
        demo_store_id,
        'Capitol Hill',
        'CAPITOL',
        '+1-555-987-6543',
        'capitol@downtownconvenience.com',
        'active',
        '456 Capitol Ave',
        'Downtown',
        'CA',
        '90211',
        '{"monday": {"open": "06:00", "close": "22:00"}, "tuesday": {"open": "06:00", "close": "22:00"}, "wednesday": {"open": "06:00", "close": "22:00"}, "thursday": {"open": "06:00", "close": "22:00"}, "friday": {"open": "06:00", "close": "23:00"}, "saturday": {"open": "07:00", "close": "23:00"}, "sunday": {"open": "07:00", "close": "22:00"}}'::jsonb
    )
    ON CONFLICT (id) DO NOTHING;

    -- Note: store_members and store_settings are auto-created via triggers
    -- But we'll update the store settings with demo values
    UPDATE store_settings
    SET
        currency = 'USD',
        timezone = 'America/Los_Angeles',
        date_format = 'MM/DD/YYYY',
        low_stock_threshold = 15,
        receipt_footer = 'Thank you for shopping at Downtown Convenience!'
    WHERE store_id = demo_store_id;

    -- Insert user preferences
    INSERT INTO user_preferences (user_id, theme, sidebar_collapsed)
    VALUES (demo_user_id, 'system', false)
    ON CONFLICT (user_id) DO NOTHING;

    -- Insert some audit log entries
    INSERT INTO audit_logs (store_id, user_id, entity_type, entity_id, action, metadata)
    VALUES
        (demo_store_id, demo_user_id, 'stores', demo_store_id, 'create', '{"name": "Downtown Convenience", "slug": "downtown-convenience"}'::jsonb),
        (demo_store_id, demo_user_id, 'store_locations', demo_location_1_id, 'create', '{"name": "Main Street", "code": "MAIN"}'::jsonb),
        (demo_store_id, demo_user_id, 'store_locations', demo_location_2_id, 'create', '{"name": "Capitol Hill", "code": "CAPITOL"}'::jsonb);

END $$;

-- ============================================
-- SECOND DEMO STORE (for testing multi-store)
-- ============================================

DO $$
DECLARE
    demo_user_id UUID := '00000000-0000-0000-0000-000000000001';
    second_store_id UUID := '00000000-0000-0000-0000-000000000005';
    second_location_id UUID := '00000000-0000-0000-0000-000000000006';
BEGIN
    -- Insert second demo store
    INSERT INTO stores (id, name, slug, owner_id, description, status)
    VALUES (
        second_store_id,
        'Westside Market',
        'westside-market',
        demo_user_id,
        'Family-owned neighborhood market.',
        'active'
    )
    ON CONFLICT (id) DO NOTHING;

    -- Insert location for second store
    INSERT INTO store_locations (id, store_id, name, code, phone, email, status, address_line_1, city, state, postal_code)
    VALUES (
        second_location_id,
        second_store_id,
        'Westside Main',
        'MAIN',
        '+1-555-456-7890',
        'main@westsidemarket.com',
        'active',
        '789 Westside Blvd',
        'Westside',
        'CA',
        '90212'
    )
    ON CONFLICT (id) DO NOTHING;

    -- Update settings for second store
    UPDATE store_settings
    SET
        currency = 'USD',
        timezone = 'America/Los_Angeles',
        date_format = 'MM/DD/YYYY',
        low_stock_threshold = 20
    WHERE store_id = second_store_id;

    -- Audit log entry
    INSERT INTO audit_logs (store_id, user_id, entity_type, entity_id, action, metadata)
    VALUES
        (second_store_id, demo_user_id, 'stores', second_store_id, 'create', '{"name": "Westside Market", "slug": "westside-market"}'::jsonb);

END $$;

-- ============================================
-- ADDITIONAL DEMO MEMBERS (for testing team features)
-- ============================================

DO $$
DECLARE
    demo_store_id UUID := '00000000-0000-0000-0000-000000000002';
    admin_user_id UUID := '00000000-0000-0000-0000-000000000010';
    manager_user_id UUID := '00000000-0000-0000-0000-000000000011';
    staff_user_id UUID := '00000000-0000-0000-0000-000000000012';
BEGIN
    -- Admin profile
    INSERT INTO profiles (id, email, full_name, timezone)
    VALUES (admin_user_id, 'admin@storepilot.app', 'Demo Admin', 'America/New_York')
    ON CONFLICT (id) DO NOTHING;

    -- Admin membership (note: owner is already added via trigger)
    INSERT INTO store_members (store_id, user_id, role, status)
    VALUES (demo_store_id, admin_user_id, 'admin', 'active')
    ON CONFLICT (store_id, user_id) DO NOTHING;

    -- Manager profile
    INSERT INTO profiles (id, email, full_name, timezone)
    VALUES (manager_user_id, 'manager@storepilot.app', 'Demo Manager', 'America/New_York')
    ON CONFLICT (id) DO NOTHING;

    -- Manager membership
    INSERT INTO store_members (store_id, user_id, role, status)
    VALUES (demo_store_id, manager_user_id, 'manager', 'active')
    ON CONFLICT (store_id, user_id) DO NOTHING;

    -- Staff profile
    INSERT INTO profiles (id, email, full_name, timezone)
    VALUES (staff_user_id, 'staff@storepilot.app', 'Demo Staff', 'America/New_York')
    ON CONFLICT (id) DO NOTHING;

    -- Staff membership
    INSERT INTO store_members (store_id, user_id, role, status)
    VALUES (demo_store_id, staff_user_id, 'staff', 'active')
    ON CONFLICT (store_id, user_id) DO NOTHING;

END $$;
