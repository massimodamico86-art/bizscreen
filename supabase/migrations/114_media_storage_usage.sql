-- Migration: Media Storage Usage Function (US-150)
-- Calculate storage usage for a user's media library

-- Function to get storage usage statistics
CREATE OR REPLACE FUNCTION get_media_storage_usage()
RETURNS TABLE (
  total_bytes BIGINT,
  total_count INTEGER,
  image_bytes BIGINT,
  image_count INTEGER,
  video_bytes BIGINT,
  video_count INTEGER,
  audio_bytes BIGINT,
  audio_count INTEGER,
  document_bytes BIGINT,
  document_count INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(SUM(file_size), 0)::BIGINT AS total_bytes,
    COUNT(*)::INTEGER AS total_count,
    COALESCE(SUM(CASE WHEN type = 'image' THEN file_size ELSE 0 END), 0)::BIGINT AS image_bytes,
    COUNT(CASE WHEN type = 'image' THEN 1 END)::INTEGER AS image_count,
    COALESCE(SUM(CASE WHEN type = 'video' THEN file_size ELSE 0 END), 0)::BIGINT AS video_bytes,
    COUNT(CASE WHEN type = 'video' THEN 1 END)::INTEGER AS video_count,
    COALESCE(SUM(CASE WHEN type = 'audio' THEN file_size ELSE 0 END), 0)::BIGINT AS audio_bytes,
    COUNT(CASE WHEN type = 'audio' THEN 1 END)::INTEGER AS audio_count,
    COALESCE(SUM(CASE WHEN type = 'document' THEN file_size ELSE 0 END), 0)::BIGINT AS document_bytes,
    COUNT(CASE WHEN type = 'document' THEN 1 END)::INTEGER AS document_count
  FROM media_assets
  WHERE owner_id = auth.uid()
    OR owner_id IS NULL; -- Include global assets in count
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_media_storage_usage() TO authenticated;

-- Add comment
COMMENT ON FUNCTION get_media_storage_usage() IS 'Calculate storage usage statistics for the current user''s media library';
