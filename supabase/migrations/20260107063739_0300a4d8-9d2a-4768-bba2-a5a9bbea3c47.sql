-- Create storage bucket for media uploads
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'media',
  'media',
  true,
  52428800, -- 50MB limit
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/webm', 'audio/mpeg', 'audio/wav', 'audio/ogg', 'application/pdf']
);

-- Allow authenticated users to upload files to their own folder
CREATE POLICY "Users can upload media files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'media' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow authenticated users to update their own files
CREATE POLICY "Users can update their own media files"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'media' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow authenticated users to delete their own files
CREATE POLICY "Users can delete their own media files"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'media' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow public read access to all media files (since bucket is public)
CREATE POLICY "Public read access for media files"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'media');

-- Admins can manage all media files
CREATE POLICY "Admins can manage all media files"
ON storage.objects FOR ALL
TO authenticated
USING (
  bucket_id = 'media' AND
  public.has_role(auth.uid(), 'admin')
)
WITH CHECK (
  bucket_id = 'media' AND
  public.has_role(auth.uid(), 'admin')
);