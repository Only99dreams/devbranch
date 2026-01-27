-- Fix foreign key reference in prayer_join_requests to reference auth.users instead of profiles
-- This ensures consistency with prayer_participants

-- First, drop the existing foreign key constraint
ALTER TABLE public.prayer_join_requests
DROP CONSTRAINT IF EXISTS prayer_join_requests_user_id_fkey;

-- Add the correct foreign key constraint
ALTER TABLE public.prayer_join_requests
ADD CONSTRAINT prayer_join_requests_user_id_fkey
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Update RLS policies for prayer_join_requests to use auth.uid() directly
DROP POLICY IF EXISTS "Users can view their own join requests" ON public.prayer_join_requests;
DROP POLICY IF EXISTS "Session creators can view join requests for their sessions" ON public.prayer_join_requests;
DROP POLICY IF EXISTS "Users can create join requests" ON public.prayer_join_requests;
DROP POLICY IF EXISTS "Session creators can update join requests for their sessions" ON public.prayer_join_requests;

CREATE POLICY "Users can view their own join requests"
  ON public.prayer_join_requests FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Session creators can view join requests for their sessions"
  ON public.prayer_join_requests FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.prayer_sessions
      WHERE id = session_id AND created_by = auth.uid()
    )
  );

CREATE POLICY "Users can create join requests"
  ON public.prayer_join_requests FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Session creators can update join requests for their sessions"
  ON public.prayer_join_requests FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.prayer_sessions
      WHERE id = session_id AND created_by = auth.uid()
    )
  );

-- Update prayer_participants RLS policy to enforce permission requirements
-- Drop the existing policy that allows anyone to join
DROP POLICY IF EXISTS "Users can join sessions" ON public.prayer_participants;

-- Create new policy that checks permissions
CREATE POLICY "Users can join sessions with proper permissions"
  ON public.prayer_participants FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id AND (
      -- Session doesn't require permission, or
      NOT EXISTS (
        SELECT 1 FROM public.prayer_sessions
        WHERE id = session_id AND requires_permission = true
      ) OR
      -- User has an approved join request
      EXISTS (
        SELECT 1 FROM public.prayer_join_requests
        WHERE session_id = prayer_participants.session_id
          AND user_id = auth.uid()
          AND status = 'approved'
      ) OR
      -- User is the session creator
      EXISTS (
        SELECT 1 FROM public.prayer_sessions
        WHERE id = session_id AND created_by = auth.uid()
      )
    )
  );