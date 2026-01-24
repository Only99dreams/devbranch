-- Add hand_raised column to prayer_participants table
ALTER TABLE public.prayer_participants
ADD COLUMN IF NOT EXISTS hand_raised boolean DEFAULT false;

-- Comment for column
COMMENT ON COLUMN public.prayer_participants.hand_raised IS 'Indicates if the participant has raised their hand';
