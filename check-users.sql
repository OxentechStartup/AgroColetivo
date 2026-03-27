-- Query para verificar usuários existentes
SELECT 
  id,
  email,
  name,
  role,
  active,
  email_verified,
  created_at
FROM public.users
ORDER BY created_at DESC
LIMIT 20;