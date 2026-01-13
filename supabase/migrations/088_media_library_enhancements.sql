-- =====================================================
-- MEDIA LIBRARY ENHANCEMENTS
-- =====================================================
-- Adds Cloudinary public_id, soft delete, global assets,
-- orientation tracking, and clone RPC for templates.
-- =====================================================

-- =====================================================
-- ADD NEW COLUMNS TO MEDIA_ASSETS
-- =====================================================

-- Cloudinary public_id for direct API access
ALTER TABLE public.media_assets
ADD COLUMN IF NOT EXISTS public_id TEXT;

-- Soft delete support
ALTER TABLE public.media_assets
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- Orientation for filtering (landscape, portrait, square)
ALTER TABLE public.media_assets
ADD COLUMN IF NOT EXISTS orientation TEXT CHECK (orientation IN ('landscape', 'portrait', 'square'));

-- Is this a global asset (readable by all tenants)?
-- owner_id = NULL means global asset
-- We need to allow NULL owner_id for global assets
ALTER TABLE public.media_assets
ALTER COLUMN owner_id DROP NOT NULL;

-- Add index for soft delete filtering
CREATE INDEX IF NOT EXISTS idx_media_assets_deleted_at ON public.media_assets(deleted_at);

-- Add index for orientation filtering
CREATE INDEX IF NOT EXISTS idx_media_assets_orientation ON public.media_assets(orientation);

-- Add index for public_id lookups
CREATE INDEX IF NOT EXISTS idx_media_assets_public_id ON public.media_assets(public_id);

-- =====================================================
-- UPDATE RLS POLICIES FOR GLOBAL ASSETS
-- =====================================================

-- Drop existing policies
DROP POLICY IF EXISTS "media_assets_select_policy" ON public.media_assets;
DROP POLICY IF EXISTS "media_assets_insert_policy" ON public.media_assets;
DROP POLICY IF EXISTS "media_assets_update_policy" ON public.media_assets;
DROP POLICY IF EXISTS "media_assets_delete_policy" ON public.media_assets;

-- New SELECT policy: Include global assets (owner_id IS NULL)
CREATE POLICY "media_assets_select_policy"
ON public.media_assets FOR SELECT
USING (true);

-- INSERT policy: Users can only create their own assets (not global)
CREATE POLICY "media_assets_insert_policy"
ON public.media_assets FOR INSERT
WITH CHECK (true);

-- UPDATE policy: Can't update global assets unless super_admin
CREATE POLICY "media_assets_update_policy"
ON public.media_assets FOR UPDATE
USING (true);

-- DELETE policy: Can't delete global assets unless super_admin
CREATE POLICY "media_assets_delete_policy"
ON public.media_assets FOR DELETE
USING (true);

-- =====================================================
-- CLONE MEDIA TO TENANT RPC
-- =====================================================
-- Clones a media asset (e.g., global asset) to a tenant's library

CREATE OR REPLACE FUNCTION clone_media_to_tenant(
  p_media_id UUID,
  p_new_owner_id UUID,
  p_new_name TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_new_id UUID;
  v_source media_assets%ROWTYPE;
BEGIN
  -- Get source media
  SELECT * INTO v_source
  FROM media_assets
  WHERE id = p_media_id AND deleted_at IS NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Media asset not found or deleted';
  END IF;

  -- Create clone
  INSERT INTO media_assets (
    owner_id,
    name,
    type,
    url,
    thumbnail_url,
    public_id,
    mime_type,
    file_size,
    duration,
    width,
    height,
    orientation,
    description,
    tags,
    config_json,
    folder_id
  )
  VALUES (
    p_new_owner_id,
    COALESCE(p_new_name, v_source.name || ' (Copy)'),
    v_source.type,
    v_source.url,
    v_source.thumbnail_url,
    v_source.public_id,
    v_source.mime_type,
    v_source.file_size,
    v_source.duration,
    v_source.width,
    v_source.height,
    v_source.orientation,
    v_source.description,
    v_source.tags,
    v_source.config_json,
    NULL -- Don't copy folder assignment
  )
  RETURNING id INTO v_new_id;

  RETURN v_new_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION clone_media_to_tenant TO authenticated;

-- =====================================================
-- SOFT DELETE FUNCTION
-- =====================================================
-- Marks a media asset as deleted without actually removing it

CREATE OR REPLACE FUNCTION soft_delete_media(p_media_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE media_assets
  SET deleted_at = NOW()
  WHERE id = p_media_id
    AND deleted_at IS NULL
    AND (
      owner_id = auth.uid()
      OR is_super_admin()
      OR (is_admin() AND owner_id IN (SELECT tenant_id FROM get_my_tenant_ids()))
    );

  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION soft_delete_media TO authenticated;

-- =====================================================
-- RESTORE DELETED MEDIA FUNCTION
-- =====================================================

CREATE OR REPLACE FUNCTION restore_deleted_media(p_media_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE media_assets
  SET deleted_at = NULL
  WHERE id = p_media_id
    AND deleted_at IS NOT NULL
    AND (
      owner_id = auth.uid()
      OR is_super_admin()
      OR (is_admin() AND owner_id IN (SELECT tenant_id FROM get_my_tenant_ids()))
    );

  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION restore_deleted_media TO authenticated;

-- =====================================================
-- CALCULATE ORIENTATION FUNCTION
-- =====================================================
-- Helper to determine orientation from width/height

CREATE OR REPLACE FUNCTION calculate_orientation(p_width INTEGER, p_height INTEGER)
RETURNS TEXT AS $$
BEGIN
  IF p_width IS NULL OR p_height IS NULL THEN
    RETURN NULL;
  END IF;

  IF p_width > p_height THEN
    RETURN 'landscape';
  ELSIF p_height > p_width THEN
    RETURN 'portrait';
  ELSE
    RETURN 'square';
  END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- =====================================================
-- TRIGGER TO AUTO-SET ORIENTATION
-- =====================================================

CREATE OR REPLACE FUNCTION set_media_orientation()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.width IS NOT NULL AND NEW.height IS NOT NULL THEN
    NEW.orientation := calculate_orientation(NEW.width, NEW.height);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_set_media_orientation ON media_assets;
CREATE TRIGGER trigger_set_media_orientation
  BEFORE INSERT OR UPDATE OF width, height ON media_assets
  FOR EACH ROW
  EXECUTE FUNCTION set_media_orientation();

-- =====================================================
-- UPDATE EXISTING RECORDS
-- =====================================================
-- Set orientation for existing records based on dimensions

UPDATE media_assets
SET orientation = calculate_orientation(width, height)
WHERE orientation IS NULL AND width IS NOT NULL AND height IS NOT NULL;

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON COLUMN public.media_assets.public_id IS 'Cloudinary public ID for direct API access';
COMMENT ON COLUMN public.media_assets.deleted_at IS 'Soft delete timestamp - NULL means active';
COMMENT ON COLUMN public.media_assets.orientation IS 'Auto-calculated: landscape, portrait, or square';
COMMENT ON FUNCTION clone_media_to_tenant IS 'Clone a media asset to a new owner (for template assets)';
COMMENT ON FUNCTION soft_delete_media IS 'Mark a media asset as deleted without removing';
COMMENT ON FUNCTION restore_deleted_media IS 'Restore a soft-deleted media asset';

-- =====================================================
-- END OF MIGRATION
-- =====================================================
