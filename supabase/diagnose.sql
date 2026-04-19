-- DIAGNOSTIC SCRIPT
-- Run this in Supabase SQL Editor to identify the store creation issue

-- 1. Check if user exists
SELECT 'USER EXISTS' as check_type, id, email, created_at
FROM auth.users
WHERE email = 'raghavsathishmohan@gmail.com';

-- 2. Check if profile exists
SELECT 'PROFILE EXISTS' as check_type, id, email, full_name, created_at
FROM profiles
WHERE email = 'raghavsathishmohan@gmail.com';

-- 3. Check if user has profile (should return empty if missing)
SELECT 'MISSING PROFILE' as check_type, au.id, au.email
FROM auth.users au
LEFT JOIN profiles p ON au.id = p.id
WHERE au.email = 'raghavsathishmohan@gmail.com'
  AND p.id IS NULL;

-- 4. Check RLS policies on profiles
SELECT 'RLS POLICIES' as check_type, policyname, cmd
FROM pg_policies
WHERE tablename = 'profiles';

-- 5. Check stores table policies
SELECT 'STORE POLICIES' as check_type, policyname, cmd
FROM pg_policies
WHERE tablename = 'stores';

-- 6. Try to create the profile if missing
INSERT INTO profiles (id, email, full_name, timezone)
SELECT
    au.id,
    au.email,
    COALESCE(au.raw_user_meta_data->>'full_name', split_part(au.email, '@', 1)),
    'America/New_York'
FROM auth.users au
LEFT JOIN profiles p ON au.id = p.id
WHERE au.email = 'raghavsathishmohan@gmail.com'
  AND p.id IS NULL;

-- 7. Create user_preferences if missing
INSERT INTO user_preferences (user_id, theme, sidebar_collapsed)
SELECT au.id, 'system', false
FROM auth.users au
LEFT JOIN user_preferences up ON au.id = up.user_id
WHERE au.email = 'raghavsathishmohan@gmail.com'
  AND up.user_id IS NULL;

-- 8. Verify profile now exists
SELECT 'PROFILE AFTER FIX' as check_type, *
FROM profiles
WHERE email = 'raghavsathishmohan@gmail.com';
