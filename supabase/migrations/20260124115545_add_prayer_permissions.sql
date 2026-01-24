-- Add requires_permission column to prayer_sessions
ALTER TABLE public.prayer_sessions
ADD COLUMN requires_permission BOOLEAN DEFAULT false;

-- Create enum for join request status
CREATE TYPE public.join_request_status AS ENUM ('pending', 'approved', 'denied');

-- Create prayer_join_requests table
CREATE TABLE public.prayer_join_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES public.prayer_sessions(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  status join_request_status NOT NULL DEFAULT 'pending',
  requested_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  responded_at TIMESTAMP WITH TIME ZONE,
  responded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  UNIQUE (session_id, user_id)
);

-- Enable RLS
ALTER TABLE public.prayer_join_requests ENABLE ROW LEVEL SECURITY;

-- RLS Policies for prayer_join_requests
CREATE POLICY "Users can view their own join requests"
  ON public.prayer_join_requests FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = prayer_join_requests.user_id AND user_id = auth.uid()
    )
  );

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
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = prayer_join_requests.user_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Session creators can update join requests for their sessions"
  ON public.prayer_join_requests FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.prayer_sessions
      WHERE id = session_id AND created_by = auth.uid()
    )
  );

-- Add trigger for updated_at if needed, but since it's join requests, maybe not necessary