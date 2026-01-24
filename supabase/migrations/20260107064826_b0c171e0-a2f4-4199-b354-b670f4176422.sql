-- Create admin user role entry (user must sign up first with email: admin@homeofsuperstars.com)
-- After admin signs up, run this to grant admin role:
-- This is a placeholder comment - the actual admin role will be assigned after signup

-- Insert a function to make a user admin by email
CREATE OR REPLACE FUNCTION public.make_user_admin(admin_email TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_user_id UUID;
BEGIN
  -- Get the user_id from profiles by email
  SELECT user_id INTO target_user_id FROM public.profiles WHERE email = admin_email LIMIT 1;
  
  IF target_user_id IS NULL THEN
    RAISE EXCEPTION 'User with email % not found', admin_email;
  END IF;
  
  -- Insert admin role if not exists
  INSERT INTO public.user_roles (user_id, role)
  VALUES (target_user_id, 'admin')
  ON CONFLICT (user_id, role) DO NOTHING;
END;
$$;