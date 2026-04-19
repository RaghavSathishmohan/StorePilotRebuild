-- Create missing profile for existing user
-- This creates a profile record for a user who signed up before the INSERT policy was added

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

-- Also create user preferences if missing
INSERT INTO user_preferences (user_id, theme, sidebar_collapsed)
SELECT
    au.id,
    'system',
    false
FROM auth.users au
LEFT JOIN user_preferences up ON au.id = up.user_id
WHERE au.email = 'raghavsathishmohan@gmail.com'
  AND up.user_id IS NULL;

-- Verify the profile was created
SELECT p.id, p.email, p.full_name
FROM profiles p
JOIN auth.users au ON p.id = au.id
WHERE au.email = 'raghavsathishmohan@gmail.com';