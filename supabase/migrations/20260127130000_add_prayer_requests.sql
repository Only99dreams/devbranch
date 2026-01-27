-- Create prayer_requests table for general prayer requests
CREATE TABLE public.prayer_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  request_text TEXT NOT NULL,
  doctors_report_url TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'prayed_for')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.prayer_requests ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Anyone can submit prayer requests"
  ON public.prayer_requests FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Admins can view all prayer requests"
  ON public.prayer_requests FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can update prayer requests"
  ON public.prayer_requests FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Create storage bucket for doctor's reports
INSERT INTO storage.buckets (id, name, public)
VALUES ('prayer-reports', 'prayer-reports', false);

-- Storage policies for prayer reports
CREATE POLICY "Anyone can upload prayer reports"
  ON storage.objects FOR INSERT
  TO public
  WITH CHECK (bucket_id = 'prayer-reports');

CREATE POLICY "Admins can view prayer reports"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'prayer-reports'
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc'::text, NOW());
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to automatically update updated_at
CREATE TRIGGER update_prayer_requests_updated_at
  BEFORE UPDATE ON public.prayer_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();