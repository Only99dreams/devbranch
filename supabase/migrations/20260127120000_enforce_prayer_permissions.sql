-- Fix foreign key reference in prayer_join_requests to reference auth.users instead of profiles
-- This ensures consistency with prayer_participants

-- First, drop the existing foreign key constraint
ALTER TABLE public.prayer_join_requests
DROP CONSTRAINT IF EXISTS prayer_join_requests_user_id_fkey;

-- Add the correct foreign key constraint
ALTER TABLE public.prayer_join_requests
ADD CONSTRAINT prayer_join_requests_user_id_fkey
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Update RLS policies for profiles to allow viewing in prayer contexts
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view basic profile info for other users" ON public.profiles;

CREATE POLICY "Users can view profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);