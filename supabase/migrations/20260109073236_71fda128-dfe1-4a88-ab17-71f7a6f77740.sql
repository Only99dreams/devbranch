-- Add external stream URL and scheduled_at for live streams
ALTER TABLE public.live_streams ADD COLUMN IF NOT EXISTS external_stream_url TEXT;
ALTER TABLE public.live_streams ADD COLUMN IF NOT EXISTS scheduled_at TIMESTAMPTZ;