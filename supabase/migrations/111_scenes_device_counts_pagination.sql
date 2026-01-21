-- Migration: 111_scenes_device_counts_pagination.sql
-- Description: Add pagination support to get_scenes_with_device_counts function

-- Drop old function and create new one with pagination parameters
DROP FUNCTION IF EXISTS get_scenes_with_device_counts(UUID);

CREATE OR REPLACE FUNCTION get_scenes_with_device_counts(
  p_tenant_id UUID,
  p_page INT DEFAULT 1,
  p_page_size INT DEFAULT 50
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSON;
  v_total_count INT;
  v_total_pages INT;
  v_offset INT;
BEGIN
  -- Verify the caller has access to this tenant's data
  IF p_tenant_id != auth.uid() AND NOT is_super_admin() THEN
    RETURN json_build_object(
      'data', '[]'::JSON,
      'totalCount', 0,
      'page', p_page,
      'pageSize', p_page_size,
      'totalPages', 0
    );
  END IF;

  -- Calculate offset
  v_offset := (p_page - 1) * p_page_size;

  -- Get total count
  SELECT COUNT(*) INTO v_total_count
  FROM scenes
  WHERE tenant_id = p_tenant_id;

  -- Calculate total pages
  v_total_pages := CEIL(v_total_count::DECIMAL / p_page_size);

  -- Build the paginated scenes array with device counts
  SELECT json_build_object(
    'data', COALESCE((
      SELECT json_agg(scene_data ORDER BY scene_data.created_at ASC)
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
          CASE
            WHEN l.id IS NOT NULL THEN json_build_object('id', l.id, 'name', l.name)
            ELSE NULL
          END AS layout,
          CASE
            WHEN pp.id IS NOT NULL THEN json_build_object('id', pp.id, 'name', pp.name)
            ELSE NULL
          END AS primary_playlist,
          CASE
            WHEN sp.id IS NOT NULL THEN json_build_object('id', sp.id, 'name', sp.name)
            ELSE NULL
          END AS secondary_playlist,
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
        ORDER BY s.created_at ASC
        LIMIT p_page_size
        OFFSET v_offset
      ) scene_data
    ), '[]'::JSON),
    'totalCount', v_total_count,
    'page', p_page,
    'pageSize', p_page_size,
    'totalPages', v_total_pages
  ) INTO result;

  RETURN result;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_scenes_with_device_counts(UUID, INT, INT) TO authenticated;

COMMENT ON FUNCTION get_scenes_with_device_counts(UUID, INT, INT) IS
'Returns paginated scenes for a tenant with device counts. Supports server-side pagination with page/pageSize parameters.';

DO $$ BEGIN RAISE NOTICE 'Migration 111 completed: pagination added to get_scenes_with_device_counts'; END $$;
