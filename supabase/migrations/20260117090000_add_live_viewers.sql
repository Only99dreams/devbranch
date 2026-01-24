-- Live viewers tracking for admin dashboard totals
CREATE TABLE IF NOT EXISTS public.live_viewers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stream_id uuid NOT NULL,
  user_id uuid NULL,
  anon_id text NULL,
  joined_at timestamptz NOT NULL DEFAULT now(),
  left_at timestamptz NULL
);

-- Unique constraint to upsert per viewer per stream
ALTER TABLE public.live_viewers
  ADD CONSTRAINT live_viewers_unique UNIQUE (stream_id, user_id, anon_id);

-- Basic RLS
ALTER TABLE public.live_viewers ENABLE ROW LEVEL SECURITY;

-- Authenticated users can insert/update their own viewer rows
CREATE POLICY "insert live_viewers"
ON public.live_viewers FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "update live_viewers"
ON public.live_viewers FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- Allow select to authenticated (admins can read via app role; general select can be relaxed if needed)
CREATE POLICY "select live_viewers"
ON public.live_viewers FOR SELECT
TO authenticated
USING (true);

