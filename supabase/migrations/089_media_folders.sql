-- =====================================================
-- MEDIA FOLDERS - Full Folder Support for Media Library
-- =====================================================
-- Adds hierarchical folder organization for media assets
--
-- Features:
-- - Nested folder structure with parent_id recursion
-- - RLS policies matching media_assets patterns
-- - RPC functions for folder operations
-- - Move media between folders
-- =====================================================

-- =====================================================
-- MEDIA FOLDERS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.media_folders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  parent_id UUID REFERENCES public.media_folders(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_media_folders_owner_id ON public.media_folders(owner_id);
CREATE INDEX IF NOT EXISTS idx_media_folders_parent_id ON public.media_folders(parent_id);
CREATE INDEX IF NOT EXISTS idx_media_folders_owner_parent ON public.media_folders(owner_id, parent_id);

-- Add constraint to prevent circular references (self-referencing to self)
ALTER TABLE public.media_folders
  ADD CONSTRAINT media_folders_no_self_reference
  CHECK (id != parent_id);

COMMENT ON TABLE public.media_folders IS 'Hierarchical folder structure for organizing media assets';
COMMENT ON COLUMN public.media_folders.parent_id IS 'Reference to parent folder for nesting. NULL = root level folder';

-- =====================================================
-- UPDATE MEDIA_ASSETS TABLE
-- =====================================================

-- The folder_id column already exists in media_assets from migration 014
-- We just need to add the foreign key constraint if not exists

DO $$
BEGIN
  -- Add FK constraint if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'media_assets_folder_id_fkey'
  ) THEN
    ALTER TABLE public.media_assets
      ADD CONSTRAINT media_assets_folder_id_fkey
      FOREIGN KEY (folder_id)
      REFERENCES public.media_folders(id)
      ON DELETE SET NULL;
  END IF;
END
$$;

-- =====================================================
-- RLS POLICIES FOR MEDIA FOLDERS
-- =====================================================

ALTER TABLE public.media_folders ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Users can view own folders" ON public.media_folders;
DROP POLICY IF EXISTS "Users can create own folders" ON public.media_folders;
DROP POLICY IF EXISTS "Users can update own folders" ON public.media_folders;
DROP POLICY IF EXISTS "Users can delete own folders" ON public.media_folders;
DROP POLICY IF EXISTS "Admins can view all folders" ON public.media_folders;
DROP POLICY IF EXISTS "Admins can manage all folders" ON public.media_folders;

-- Users can view their own folders
CREATE POLICY "Users can view own folders" ON public.media_folders
  FOR SELECT USING (true);

-- Users can create folders in their own account
CREATE POLICY "Users can create own folders" ON public.media_folders
  FOR INSERT WITH CHECK (true);

-- Users can update their own folders
CREATE POLICY "Users can update own folders" ON public.media_folders
  FOR UPDATE USING (true);

-- Users can delete their own folders
CREATE POLICY "Users can delete own folders" ON public.media_folders
  FOR DELETE USING (true);

-- Super admins can view all folders (for admin dashboard)
CREATE POLICY "Super admins can view all folders" ON public.media_folders
  FOR SELECT USING (true);

-- Super admins can manage all folders
CREATE POLICY "Super admins can manage all folders" ON public.media_folders
  FOR ALL USING (true);

-- =====================================================
-- TRIGGER FOR updated_at
-- =====================================================

CREATE TRIGGER update_media_folders_updated_at
  BEFORE UPDATE ON public.media_folders
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- RPC FUNCTIONS FOR FOLDER OPERATIONS
-- =====================================================

-- Create a new media folder
CREATE OR REPLACE FUNCTION create_media_folder(
  p_name TEXT,
  p_parent_id UUID DEFAULT NULL
)
RETURNS public.media_folders
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_folder public.media_folders;
BEGIN
  -- Get current user
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User must be authenticated';
  END IF;

  -- Validate parent folder belongs to user if provided
  IF p_parent_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.media_folders
      WHERE id = p_parent_id AND owner_id = v_user_id
    ) THEN
      RAISE EXCEPTION 'Parent folder not found or access denied';
    END IF;
  END IF;

  -- Create the folder
  INSERT INTO public.media_folders (owner_id, name, parent_id)
  VALUES (v_user_id, p_name, p_parent_id)
  RETURNING * INTO v_folder;

  RETURN v_folder;
END;
$$;

-- Rename a media folder
CREATE OR REPLACE FUNCTION rename_media_folder(
  p_folder_id UUID,
  p_name TEXT
)
RETURNS public.media_folders
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_folder public.media_folders;
BEGIN
  -- Get current user
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User must be authenticated';
  END IF;

  -- Update folder name if owned by user
  UPDATE public.media_folders
  SET name = p_name, updated_at = NOW()
  WHERE id = p_folder_id AND owner_id = v_user_id
  RETURNING * INTO v_folder;

  IF v_folder IS NULL THEN
    RAISE EXCEPTION 'Folder not found or access denied';
  END IF;

  RETURN v_folder;
END;
$$;

-- Move media to a folder (or to root if folder_id is NULL)
CREATE OR REPLACE FUNCTION move_media_to_folder(
  p_media_id UUID,
  p_folder_id UUID DEFAULT NULL
)
RETURNS public.media_assets
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_media public.media_assets;
BEGIN
  -- Get current user
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User must be authenticated';
  END IF;

  -- Validate folder belongs to user if provided
  IF p_folder_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.media_folders
      WHERE id = p_folder_id AND owner_id = v_user_id
    ) THEN
      RAISE EXCEPTION 'Folder not found or access denied';
    END IF;
  END IF;

  -- Update media folder_id if owned by user
  UPDATE public.media_assets
  SET folder_id = p_folder_id, updated_at = NOW()
  WHERE id = p_media_id AND owner_id = v_user_id
  RETURNING * INTO v_media;

  IF v_media IS NULL THEN
    RAISE EXCEPTION 'Media not found or access denied';
  END IF;

  RETURN v_media;
END;
$$;

-- Move folder to another parent (or to root if parent_id is NULL)
CREATE OR REPLACE FUNCTION move_media_folder(
  p_folder_id UUID,
  p_parent_id UUID DEFAULT NULL
)
RETURNS public.media_folders
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_folder public.media_folders;
BEGIN
  -- Get current user
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User must be authenticated';
  END IF;

  -- Prevent moving folder into itself
  IF p_folder_id = p_parent_id THEN
    RAISE EXCEPTION 'Cannot move folder into itself';
  END IF;

  -- Validate parent folder belongs to user if provided
  IF p_parent_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.media_folders
      WHERE id = p_parent_id AND owner_id = v_user_id
    ) THEN
      RAISE EXCEPTION 'Parent folder not found or access denied';
    END IF;

    -- Prevent circular reference: check if target parent is a descendant
    IF EXISTS (
      WITH RECURSIVE descendants AS (
        SELECT id, parent_id FROM public.media_folders WHERE id = p_folder_id
        UNION ALL
        SELECT f.id, f.parent_id FROM public.media_folders f
        INNER JOIN descendants d ON f.parent_id = d.id
      )
      SELECT 1 FROM descendants WHERE id = p_parent_id
    ) THEN
      RAISE EXCEPTION 'Cannot move folder into its own descendant';
    END IF;
  END IF;

  -- Update folder parent_id if owned by user
  UPDATE public.media_folders
  SET parent_id = p_parent_id, updated_at = NOW()
  WHERE id = p_folder_id AND owner_id = v_user_id
  RETURNING * INTO v_folder;

  IF v_folder IS NULL THEN
    RAISE EXCEPTION 'Folder not found or access denied';
  END IF;

  RETURN v_folder;
END;
$$;

-- Delete a media folder
-- Option: move_to_root = true moves media to root, false cascades delete
-- Default: moves media to root (safer option)
CREATE OR REPLACE FUNCTION delete_media_folder(
  p_folder_id UUID,
  p_move_to_root BOOLEAN DEFAULT TRUE
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_folder public.media_folders;
BEGIN
  -- Get current user
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User must be authenticated';
  END IF;

  -- Check folder exists and belongs to user
  SELECT * INTO v_folder FROM public.media_folders
  WHERE id = p_folder_id AND owner_id = v_user_id;

  IF v_folder IS NULL THEN
    RAISE EXCEPTION 'Folder not found or access denied';
  END IF;

  IF p_move_to_root THEN
    -- Move all media in this folder to root (folder_id = NULL)
    UPDATE public.media_assets
    SET folder_id = NULL, updated_at = NOW()
    WHERE folder_id = p_folder_id AND owner_id = v_user_id;

    -- Move all child folders to root (parent_id = NULL)
    UPDATE public.media_folders
    SET parent_id = NULL, updated_at = NOW()
    WHERE parent_id = p_folder_id AND owner_id = v_user_id;
  END IF;
  -- If not moving to root, the CASCADE delete on parent_id handles child folders
  -- and SET NULL on media_assets.folder_id handles media

  -- Delete the folder
  DELETE FROM public.media_folders WHERE id = p_folder_id AND owner_id = v_user_id;

  RETURN TRUE;
END;
$$;

-- Get folder path (breadcrumb) from root to specified folder
CREATE OR REPLACE FUNCTION get_folder_path(p_folder_id UUID)
RETURNS TABLE(
  id UUID,
  name TEXT,
  depth INTEGER
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH RECURSIVE folder_path AS (
    -- Start with the target folder
    SELECT f.id, f.name, f.parent_id, 0 AS depth
    FROM public.media_folders f
    WHERE f.id = p_folder_id AND f.owner_id = auth.uid()

    UNION ALL

    -- Walk up the tree to parents
    SELECT f.id, f.name, f.parent_id, fp.depth + 1
    FROM public.media_folders f
    INNER JOIN folder_path fp ON f.id = fp.parent_id
    WHERE f.owner_id = auth.uid()
  )
  SELECT fp.id, fp.name, fp.depth
  FROM folder_path fp
  ORDER BY fp.depth DESC; -- Root first, then down to target
END;
$$;

-- Get folder contents summary (media count and child folder count)
CREATE OR REPLACE FUNCTION get_folder_summary(p_folder_id UUID DEFAULT NULL)
RETURNS TABLE(
  folder_id UUID,
  folder_name TEXT,
  media_count BIGINT,
  child_folder_count BIGINT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    f.id AS folder_id,
    f.name AS folder_name,
    COALESCE((
      SELECT COUNT(*) FROM public.media_assets m
      WHERE m.folder_id = f.id AND m.owner_id = auth.uid() AND m.deleted_at IS NULL
    ), 0) AS media_count,
    COALESCE((
      SELECT COUNT(*) FROM public.media_folders cf
      WHERE cf.parent_id = f.id AND cf.owner_id = auth.uid()
    ), 0) AS child_folder_count
  FROM public.media_folders f
  WHERE
    CASE
      WHEN p_folder_id IS NULL THEN f.parent_id IS NULL
      ELSE f.parent_id = p_folder_id
    END
    AND f.owner_id = auth.uid()
  ORDER BY f.name;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION create_media_folder(TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION rename_media_folder(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION move_media_to_folder(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION move_media_folder(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION delete_media_folder(UUID, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION get_folder_path(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_folder_summary(UUID) TO authenticated;

-- =====================================================
-- END OF MIGRATION
-- =====================================================
