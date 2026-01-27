-- ============================================
-- Migration 134: Translation Workflow Schema
-- ============================================
-- Adds translation workflow tracking and group-level language support:
-- 1. translation_status column on scenes (draft/review/approved)
-- 2. display_language and location columns on screen_groups
-- 3. get_translation_dashboard RPC for translation management UI
-- 4. bulk_update_translation_status RPC for batch operations
-- ============================================

-- ============================================
-- 1. Add translation_status column to scenes
-- ============================================

-- Add translation_status for workflow tracking
ALTER TABLE scenes
ADD COLUMN IF NOT EXISTS translation_status text NOT NULL DEFAULT 'draft';

-- Add constraint for valid status values
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.check_constraints
    WHERE constraint_name = 'scenes_translation_status_valid'
  ) THEN
    ALTER TABLE scenes
    ADD CONSTRAINT scenes_translation_status_valid
    CHECK (translation_status IN ('draft', 'review', 'approved'));
  END IF;
END $$;

COMMENT ON COLUMN scenes.translation_status IS
'Translation workflow status: draft (needs work), review (pending approval), approved (ready for display)';

-- Index for dashboard filtering (only scenes with language groups)
CREATE INDEX IF NOT EXISTS idx_scenes_translation_status
ON scenes(tenant_id, translation_status)
WHERE language_group_id IS NOT NULL;

-- ============================================
-- 2. Add columns to screen_groups table
-- ============================================

-- Add display_language for group-level language override
ALTER TABLE screen_groups
ADD COLUMN IF NOT EXISTS display_language text DEFAULT NULL;

-- Add location for auto-assignment based on region
ALTER TABLE screen_groups
ADD COLUMN IF NOT EXISTS location text DEFAULT NULL;

COMMENT ON COLUMN screen_groups.display_language IS
'Group-level language override. Devices inherit this if not set individually.';

COMMENT ON COLUMN screen_groups.location IS
'Country/region code (e.g., US, ES, FR) for location-based language auto-assignment';

-- ============================================
-- 3. Create get_translation_dashboard RPC
-- ============================================

CREATE OR REPLACE FUNCTION get_translation_dashboard(
  p_status_filter text DEFAULT NULL,
  p_language_filter text DEFAULT NULL
)
RETURNS TABLE (
  scene_id uuid,
  scene_name text,
  language_group_id uuid,
  default_language text,
  variants jsonb,
  variant_count integer,
  has_incomplete boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH grouped_scenes AS (
    -- Scenes with language groups
    SELECT
      s.id AS scene_id,
      s.name AS scene_name,
      s.language_group_id,
      g.default_language,
      s.language_code,
      s.translation_status
    FROM scenes s
    JOIN scene_language_groups g ON s.language_group_id = g.id
    WHERE s.tenant_id = auth.uid()
      AND s.language_group_id IS NOT NULL
      -- Apply language filter (if provided, at least one variant must match)
      AND (p_language_filter IS NULL OR s.language_code = p_language_filter)
  ),
  aggregated AS (
    SELECT
      gs.language_group_id,
      MIN(gs.scene_name) AS scene_name,  -- Use first scene name (alphabetically)
      gs.default_language,
      jsonb_agg(
        jsonb_build_object(
          'id', gs.scene_id,
          'code', gs.language_code,
          'status', gs.translation_status,
          'name', gs.scene_name
        )
        ORDER BY gs.language_code
      ) AS variants,
      COUNT(*)::integer AS variant_count,
      bool_or(gs.translation_status != 'approved') AS has_incomplete
    FROM grouped_scenes gs
    GROUP BY gs.language_group_id, gs.default_language
  ),
  standalone AS (
    -- Standalone scenes (no language group) - only if no language filter
    SELECT
      s.id AS scene_id,
      s.name AS scene_name,
      NULL::uuid AS language_group_id,
      COALESCE(s.language_code, 'en') AS default_language,
      '[]'::jsonb AS variants,
      0 AS variant_count,
      s.translation_status != 'approved' AS has_incomplete
    FROM scenes s
    WHERE s.tenant_id = auth.uid()
      AND s.language_group_id IS NULL
      AND p_language_filter IS NULL  -- Exclude standalone when filtering by language
  )
  -- Combine grouped and standalone, apply status filter
  SELECT
    COALESCE(a.language_group_id, st.scene_id) AS scene_id,
    COALESCE(a.scene_name, st.scene_name) AS scene_name,
    COALESCE(a.language_group_id, st.language_group_id) AS language_group_id,
    COALESCE(a.default_language, st.default_language) AS default_language,
    COALESCE(a.variants, st.variants) AS variants,
    COALESCE(a.variant_count, st.variant_count) AS variant_count,
    COALESCE(a.has_incomplete, st.has_incomplete) AS has_incomplete
  FROM aggregated a
  FULL OUTER JOIN standalone st ON FALSE  -- Just union, no actual join
  WHERE
    -- Apply status filter
    p_status_filter IS NULL
    OR (
      -- For grouped: check if any variant matches status
      a.language_group_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM jsonb_array_elements(a.variants) v
        WHERE v->>'status' = p_status_filter
      )
    )
    OR (
      -- For standalone: direct status check
      st.scene_id IS NOT NULL
      AND (
        (p_status_filter = 'draft' AND st.has_incomplete)
        OR (p_status_filter = 'approved' AND NOT st.has_incomplete)
      )
    )
  ORDER BY scene_name;
END;
$$;

COMMENT ON FUNCTION get_translation_dashboard IS
'Returns scenes with their translation variants for the dashboard. Supports filtering by status and language. Groups scenes by language_group_id with aggregated variant info.';

-- ============================================
-- 4. Create bulk_update_translation_status RPC
-- ============================================

CREATE OR REPLACE FUNCTION bulk_update_translation_status(
  p_scene_ids uuid[],
  p_new_status text
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count integer;
BEGIN
  -- Validate status
  IF p_new_status NOT IN ('draft', 'review', 'approved') THEN
    RAISE EXCEPTION 'Invalid status: %. Must be draft, review, or approved', p_new_status;
  END IF;

  -- Update scenes owned by the current user
  UPDATE scenes
  SET
    translation_status = p_new_status,
    updated_at = now()
  WHERE id = ANY(p_scene_ids)
    AND tenant_id = auth.uid();

  GET DIAGNOSTICS v_count = ROW_COUNT;

  RETURN v_count;
END;
$$;

COMMENT ON FUNCTION bulk_update_translation_status IS
'Atomically updates translation_status for multiple scenes. Returns count of updated rows. Only updates scenes owned by the current user.';

-- ============================================
-- 5. Grant permissions
-- ============================================

GRANT EXECUTE ON FUNCTION get_translation_dashboard(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION bulk_update_translation_status(uuid[], text) TO authenticated;

-- ============================================
-- Done
-- ============================================

DO $$ BEGIN
  RAISE NOTICE 'Migration 134 completed: Translation workflow schema added';
END $$;
