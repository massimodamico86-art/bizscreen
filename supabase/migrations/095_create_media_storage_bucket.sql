-- Create the media storage bucket for thumbnails and uploads
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'media',
  'media',
  true,
  52428800, -- 50MB limit
  ARRAY['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'image/svg+xml', 'video/mp4', 'video/webm', 'audio/mpeg', 'audio/wav']::text[]
)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for the media bucket

-- Allow authenticated users to upload files
CREATE POLICY "Authenticated users can upload media"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'media');

-- Allow authenticated users to update their own files
CREATE POLICY "Users can update own media"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'media' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Allow authenticated users to delete their own files
CREATE POLICY "Users can delete own media"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'media' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Allow public read access to all media files
CREATE POLICY "Public read access to media"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'media');
