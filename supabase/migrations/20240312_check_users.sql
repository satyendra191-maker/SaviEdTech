-- Check existing users
SELECT id, email, created_at FROM auth.users WHERE email LIKE '%@saviedutech.com';
