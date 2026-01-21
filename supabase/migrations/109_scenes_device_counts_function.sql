-- Migration: 109_scenes_device_counts_function.sql
-- Description: Add optimized database function to fetch scenes with device counts
-- This replaces the N+1 query pattern in sceneService.fetchScenesWithDeviceCounts

-- ============================================================================
-- SCENES WITH DEVICE COUNTS FUNCTION
-- Returns all scenes for a tenant with device counts in a single query
-- ============================================================================

CREATE OR REPLACE FUNCTION get_scenes_with_device_counts(p_tenant_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSON;
BEGIN
  -- Verify the caller has access to this tenant's data
  -- Either they are the tenant owner or a super admin
  IF p_tenant_id != auth.uid() AND NOT is_super_admin() THEN
    RETURN '[]'::JSON;
  END IF;

  -- Build the complete scenes array with device counts in a single query
  SELECT COALESCE(json_agg(scene_data ORDER BY scene_data.created_at ASC), '[]'::JSON)
  INTO result
  FROM (
    SELECT
      s.id,
      s.tenant_id,
      s.name,
      s.business_type,
      s.layout_id,
      s.primary_playlist_id,
      s.secondary_playlist_id,
      s.settings,
      s.is_active,
      s.created_at,
      s.updated_at,
      -- Layout info as nested object (matching Supabase select format)
      CASE
        WHEN l.id IS NOT NULL THEN json_build_object('id', l.id, 'name', l.name)
        ELSE NULL
      END AS layout,
      -- Primary playlist info as nested object
      CASE
        WHEN pp.id IS NOT NULL THEN json_build_object('id', pp.id, 'name', pp.name)
        ELSE NULL
      END AS primary_playlist,
      -- Secondary playlist info as nested object
      CASE
        WHEN sp.id IS NOT NULL THEN json_build_object('id', sp.id, 'name', sp.name)
        ELSE NULL
      END AS secondary_playlist,
      -- Device count using subquery (more efficient than GROUP BY with all columns)
      (
        SELECT COUNT(*)::INT
        FROM tv_devices td
        WHERE td.active_scene_id = s.id
      ) AS "deviceCount"
    FROM scenes s
    LEFT JOIN layouts l ON s.layout_id = l.id
    LEFT JOIN playlists pp ON s.primary_playlist_id = pp.id
    LEFT JOIN playlists sp ON s.secondary_playlist_id = sp.id
    WHERE s.tenant_id = p_tenant_id
  ) scene_data;

  RETURN result;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_scenes_with_device_counts(UUID) TO authenticated;

-- Add comment for documentation
COMMENT ON FUNCTION get_scenes_with_device_counts(UUID) IS
'Returns all scenes for a tenant with device counts in a single optimized query. Replaces N+1 query pattern where each scene required a separate device count query.';

DO $$ BEGIN RAISE NOTICE 'Migration 109 completed: get_scenes_with_device_counts function created'; END $$;
