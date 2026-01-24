-- Add admin role to existing admin user
INSERT INTO public.user_roles (user_id, role)
SELECT '104f58f8-f9c8-47f1-a454-9fdfe23e85eb', 'admin'
WHERE NOT EXISTS (
  SELECT 1 FROM public.user_roles 
  WHERE user_id = '104f58f8-f9c8-47f1-a454-9fdfe23e85eb' 
  AND role = 'admin'
);