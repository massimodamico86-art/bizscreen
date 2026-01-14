-- =====================================================
-- MEDIA DRAG AND DROP ORDERING
-- =====================================================
-- Adds sort_order columns to support drag and drop
-- reordering of media assets and folders
-- =====================================================

-- =====================================================
-- ADD SORT_ORDER TO MEDIA_ASSETS
-- =====================================================

-- Add sort_order column for custom ordering within folders
ALTER TABLE public.media_assets
ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;

-- Create composite index for efficient queries within folders
CREATE INDEX IF NOT EXISTS idx_media_assets_folder_sort
ON public.media_assets(owner_id, folder_id, sort_order);

COMMENT ON COLUMN public.media_assets.sort_order IS 'Custom sort order for drag-and-drop reordering. Lower values appear first.';

-- =====================================================
-- ADD SORT_ORDER TO MEDIA_FOLDERS
-- =====================================================

-- Add sort_order column for custom folder ordering
ALTER TABLE public.media_folders
ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;

-- Create composite index for efficient queries within parent folders
CREATE INDEX IF NOT EXISTS idx_media_folders_parent_sort
ON public.media_folders(owner_id, parent_id, sort_order);

COMMENT ON COLUMN public.media_folders.sort_order IS 'Custom sort order for drag-and-drop reordering. Lower values appear first.';

-- =====================================================
-- RPC FUNCTION: REORDER MEDIA ITEM
-- =====================================================
-- Moves a media item to a new position, shifting other items as needed

CREATE OR REPLACE FUNCTION reorder_media_item(
  p_media_id UUID,
  p_new_sort_order INTEGER,
  p_folder_id UUID DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_old_sort_order INTEGER;
  v_current_folder_id UUID;
BEGIN
  -- Get current user
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User must be authenticated';
  END IF;

  -- Get current position and folder of the media item
  SELECT sort_order, folder_id INTO v_old_sort_order, v_current_folder_id
  FROM public.media_assets
  WHERE id = p_media_id AND owner_id = v_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Media item not found or access denied';
  END IF;

  -- If moving to a different folder, update folder_id too
  IF p_folder_id IS DISTINCT FROM v_current_folder_id THEN
    -- Shift items down in the target folder to make room
    UPDATE public.media_assets
    SET sort_order = sort_order + 1, updated_at = NOW()
    WHERE owner_id = v_user_id
      AND folder_id IS NOT DISTINCT FROM p_folder_id
      AND sort_order >= p_new_sort_order;

    -- Update the media item with new folder and position
    UPDATE public.media_assets
    SET folder_id = p_folder_id,
        sort_order = p_new_sort_order,
        updated_at = NOW()
    WHERE id = p_media_id AND owner_id = v_user_id;

    -- Compact old folder positions (close the gap)
    UPDATE public.media_assets
    SET sort_order = sort_order - 1, updated_at = NOW()
    WHERE owner_id = v_user_id
      AND folder_id IS NOT DISTINCT FROM v_current_folder_id
      AND sort_order > v_old_sort_order;

  ELSE
    -- Same folder, just reorder
    IF p_new_sort_order < v_old_sort_order THEN
      -- Moving up: shift items down
      UPDATE public.media_assets
      SET sort_order = sort_order + 1, updated_at = NOW()
      WHERE owner_id = v_user_id
        AND folder_id IS NOT DISTINCT FROM v_current_folder_id
        AND sort_order >= p_new_sort_order
        AND sort_order < v_old_sort_order;
    ELSIF p_new_sort_order > v_old_sort_order THEN
      -- Moving down: shift items up
      UPDATE public.media_assets
      SET sort_order = sort_order - 1, updated_at = NOW()
      WHERE owner_id = v_user_id
        AND folder_id IS NOT DISTINCT FROM v_current_folder_id
        AND sort_order > v_old_sort_order
        AND sort_order <= p_new_sort_order;
    END IF;

    -- Update the media item position
    UPDATE public.media_assets
    SET sort_order = p_new_sort_order, updated_at = NOW()
    WHERE id = p_media_id AND owner_id = v_user_id;
  END IF;

  RETURN TRUE;
END;
$$;

-- =====================================================
-- RPC FUNCTION: MOVE MEDIA TO FOLDER (with sort order)
-- =====================================================
-- Moves media to a folder and places at the end

CREATE OR REPLACE FUNCTION move_media_to_folder_ordered(
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
  v_max_sort_order INTEGER;
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

  -- Get max sort_order in target folder
  SELECT COALESCE(MAX(sort_order), -1) + 1 INTO v_max_sort_order
  FROM public.media_assets
  WHERE owner_id = v_user_id
    AND folder_id IS NOT DISTINCT FROM p_folder_id;

  -- Update media folder_id and set sort_order to end
  UPDATE public.media_assets
  SET folder_id = p_folder_id,
      sort_order = v_max_sort_order,
      updated_at = NOW()
  WHERE id = p_media_id AND owner_id = v_user_id
  RETURNING * INTO v_media;

  IF v_media IS NULL THEN
    RAISE EXCEPTION 'Media not found or access denied';
  END IF;

  RETURN v_media;
END;
$$;

-- =====================================================
-- RPC FUNCTION: REORDER FOLDER
-- =====================================================

CREATE OR REPLACE FUNCTION reorder_folder(
  p_folder_id UUID,
  p_new_sort_order INTEGER
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_old_sort_order INTEGER;
  v_parent_id UUID;
BEGIN
  -- Get current user
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User must be authenticated';
  END IF;

  -- Get current position and parent of the folder
  SELECT sort_order, parent_id INTO v_old_sort_order, v_parent_id
  FROM public.media_folders
  WHERE id = p_folder_id AND owner_id = v_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Folder not found or access denied';
  END IF;

  IF p_new_sort_order < v_old_sort_order THEN
    -- Moving up: shift folders down
    UPDATE public.media_folders
    SET sort_order = sort_order + 1, updated_at = NOW()
    WHERE owner_id = v_user_id
      AND parent_id IS NOT DISTINCT FROM v_parent_id
      AND sort_order >= p_new_sort_order
      AND sort_order < v_old_sort_order;
  ELSIF p_new_sort_order > v_old_sort_order THEN
    -- Moving down: shift folders up
    UPDATE public.media_folders
    SET sort_order = sort_order - 1, updated_at = NOW()
    WHERE owner_id = v_user_id
      AND parent_id IS NOT DISTINCT FROM v_parent_id
      AND sort_order > v_old_sort_order
      AND sort_order <= p_new_sort_order;
  END IF;

  -- Update the folder position
  UPDATE public.media_folders
  SET sort_order = p_new_sort_order, updated_at = NOW()
  WHERE id = p_folder_id AND owner_id = v_user_id;

  RETURN TRUE;
END;
$$;

-- =====================================================
-- GRANT PERMISSIONS
-- =====================================================

GRANT EXECUTE ON FUNCTION reorder_media_item(UUID, INTEGER, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION move_media_to_folder_ordered(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION reorder_folder(UUID, INTEGER) TO authenticated;

-- =====================================================
-- INITIALIZE SORT ORDER FOR EXISTING DATA
-- =====================================================
-- Set initial sort_order based on created_at for existing items

-- Initialize media_assets sort_order per folder
WITH ranked_media AS (
  SELECT id,
         ROW_NUMBER() OVER (
           PARTITION BY owner_id, folder_id
           ORDER BY created_at DESC
         ) - 1 AS new_sort_order
  FROM public.media_assets
  WHERE sort_order = 0 OR sort_order IS NULL
)
UPDATE public.media_assets ma
SET sort_order = rm.new_sort_order
FROM ranked_media rm
WHERE ma.id = rm.id;

-- Initialize media_folders sort_order per parent
WITH ranked_folders AS (
  SELECT id,
         ROW_NUMBER() OVER (
           PARTITION BY owner_id, parent_id
           ORDER BY created_at DESC
         ) - 1 AS new_sort_order
  FROM public.media_folders
  WHERE sort_order = 0 OR sort_order IS NULL
)
UPDATE public.media_folders mf
SET sort_order = rf.new_sort_order
FROM ranked_folders rf
WHERE mf.id = rf.id;

-- =====================================================
-- END OF MIGRATION
-- =====================================================
