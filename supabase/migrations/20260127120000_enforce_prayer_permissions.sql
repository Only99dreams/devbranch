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