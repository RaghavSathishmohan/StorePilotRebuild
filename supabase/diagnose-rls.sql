-- Diagnose RLS issues for store fetching

-- 1. Check if user exists and has profile
SELECT 'User Check' as check_type, id, email
FROM auth.users
WHERE email = 'raghavsathishmohan@gmail.com';

-- 2. Check profile exists
SELECT 'Profile Check' as check_type, id, email, default_store_id
FROM profiles
WHERE email = 'raghavsathishmohan@gmail.com';

-- 3. Check store memberships
SELECT 'Store Members' as check_type, sm.*, s.name as store_name, s.slug
FROM store_members sm
JOIN stores s ON sm.store_id = s.id
WHERE sm.user_id IN (
    SELECT id FROM auth.users WHERE email = 'raghavsathishmohan@gmail.com'
);

-- 4. Check stores owned
SELECT 'Stores Owned' as check_type, s.*
FROM stores s
WHERE s.owner_id IN (
    SELECT id FROM auth.users WHERE email = 'raghavsathishmohan@gmail.com'
);

-- 5. List all RLS policies on relevant tables
SELECT tablename, policyname, cmd, permissive
FROM pg_policies
WHERE tablename IN ('stores', 'store_members', 'store_locations', 'store_settings')
ORDER BY tablename, policyname;

-- 6. Check if RLS is enabled
SELECT relname, relrowsecurity
FROM pg_class
WHERE relname IN ('stores', 'store_members', 'store_locations', 'store_settings');

-- 7. Check helper functions
SELECT proname, prosecdef
FROM pg_proc
WHERE proname IN ('is_store_member', 'is_store_owner', 'has_store_role');
