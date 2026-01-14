-- Migration 069: Scene Slides and Design JSON for Drag-and-Drop Editor
--
-- This migration:
-- 1. Creates the scene_slides table to store slide designs
-- 2. Adds RLS policies mirroring scenes ownership
-- 3. Creates a default slide for each existing scene
-- 4. Updates get_resolved_player_content to include scene slides

-- ============================================================================
-- 1. Create scene_slides table
-- ============================================================================

CREATE TABLE IF NOT EXISTS scene_slides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scene_id uuid NOT NULL REFERENCES scenes(id) ON DELETE CASCADE,
  position integer NOT NULL DEFAULT 0,
  title text,
  -- "kind" allows us to specialize later (menu, promo, welcome, etc.)
  kind text DEFAULT 'default',
  -- Full design for this slide; array of blocks + metadata
  -- Structure: { background: {...}, blocks: [...] }
  design_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  -- Duration in seconds for this slide (optional, defaults to scene setting)
  duration_seconds integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Add indexes
CREATE INDEX IF NOT EXISTS scene_slides_scene_id_idx ON scene_slides(scene_id);
CREATE INDEX IF NOT EXISTS scene_slides_position_idx ON scene_slides(scene_id, position);

-- Add updated_at trigger
DROP TRIGGER IF EXISTS update_scene_slides_updated_at ON scene_slides;
CREATE TRIGGER update_scene_slides_updated_at
  BEFORE UPDATE ON scene_slides
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 2. Enable RLS on scene_slides
-- ============================================================================

ALTER TABLE scene_slides ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (for idempotence)
DROP POLICY IF EXISTS "scene_slides_select_own" ON scene_slides;
DROP POLICY IF EXISTS "scene_slides_insert_own" ON scene_slides;
DROP POLICY IF EXISTS "scene_slides_update_own" ON scene_slides;
DROP POLICY IF EXISTS "scene_slides_delete_own" ON scene_slides;

-- Users can view slides for their own scenes
CREATE POLICY "scene_slides_select_own"
  ON scene_slides FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM scenes
      WHERE scenes.id = scene_slides.scene_id
        AND (scenes.tenant_id = auth.uid() OR is_super_admin())
    )
  );

-- Users can insert slides for their own scenes
CREATE POLICY "scene_slides_insert_own"
  ON scene_slides FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM scenes
      WHERE scenes.id = scene_slides.scene_id
        AND (scenes.tenant_id = auth.uid() OR is_super_admin())
    )
  );

-- Users can update slides for their own scenes
CREATE POLICY "scene_slides_update_own"
  ON scene_slides FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM scenes
      WHERE scenes.id = scene_slides.scene_id
        AND (scenes.tenant_id = auth.uid() OR is_super_admin())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM scenes
      WHERE scenes.id = scene_slides.scene_id
        AND (scenes.tenant_id = auth.uid() OR is_super_admin())
    )
  );

-- Users can delete slides for their own scenes
CREATE POLICY "scene_slides_delete_own"
  ON scene_slides FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM scenes
      WHERE scenes.id = scene_slides.scene_id
        AND (scenes.tenant_id = auth.uid() OR is_super_admin())
    )
  );

-- ============================================================================
-- 3. Create default slide for existing scenes
-- ============================================================================

INSERT INTO scene_slides (scene_id, position, title, kind, design_json)
SELECT
  s.id,
  0,
  'Main Slide',
  'default',
  jsonb_build_object(
    'background', jsonb_build_object('type', 'solid', 'color', '#111827'),
    'blocks', jsonb_build_array(
      jsonb_build_object(
        'id', 'blk_welcome_' || gen_random_uuid()::text,
        'type', 'text',
        'x', 0.08,
        'y', 0.4,
        'width', 0.84,
        'height', 0.2,
        'layer', 1,
        'props', jsonb_build_object(
          'text', s.name,
          'fontSize', 48,
          'fontWeight', '700',
          'align', 'center',
          'color', '#ffffff'
        )
      )
    )
  )
FROM scenes s
WHERE NOT EXISTS (
  SELECT 1 FROM scene_slides ss WHERE ss.scene_id = s.id
);

-- ============================================================================
-- 4. Grant permissions
-- ============================================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON scene_slides TO authenticated;

-- ============================================================================
-- 5. Helper function to get scene with slides for player
-- ============================================================================

CREATE OR REPLACE FUNCTION get_scene_with_slides(p_scene_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'id', s.id,
    'name', s.name,
    'business_type', s.business_type,
    'settings', s.settings,
    'slides', COALESCE(
      (
        SELECT jsonb_agg(
          jsonb_build_object(
            'id', ss.id,
            'position', ss.position,
            'title', ss.title,
            'kind', ss.kind,
            'design', ss.design_json,
            'duration_seconds', COALESCE(ss.duration_seconds, 10)
          )
          ORDER BY ss.position
        )
        FROM scene_slides ss
        WHERE ss.scene_id = s.id
      ),
      '[]'::jsonb
    )
  )
  INTO v_result
  FROM scenes s
  WHERE s.id = p_scene_id;

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION get_scene_with_slides(uuid) TO authenticated;

-- ============================================================================
-- 6. Update get_resolved_player_content to include scene slides
-- ============================================================================

-- Drop and recreate the function to include scene design data
CREATE OR REPLACE FUNCTION get_resolved_player_content(p_screen_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_device record;
  v_result jsonb := '{}'::jsonb;
  v_schedule_layout_id uuid;
  v_schedule_playlist_id uuid;
  v_scene_data jsonb;
BEGIN
  -- Fetch device info with all assignments
  SELECT
    d.id,
    d.device_name,
    d.owner_id,
    d.active_scene_id,
    d.assigned_layout_id,
    d.assigned_playlist_id
  INTO v_device
  FROM tv_devices d
  WHERE d.id = p_screen_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Device not found');
  END IF;

  -- Start building result
  v_result := jsonb_build_object(
    'screen_id', v_device.id,
    'device_name', v_device.device_name
  );

  -- PRIORITY 1: Check if device has an active scene
  IF v_device.active_scene_id IS NOT NULL THEN
    -- Fetch full scene data with slides
    v_scene_data := get_scene_with_slides(v_device.active_scene_id);

    IF v_scene_data IS NOT NULL AND v_scene_data->>'id' IS NOT NULL THEN
      v_result := v_result || jsonb_build_object(
        'content_source', 'scene',
        'scene', v_scene_data
      );

      -- Also include the linked layout and playlist from the scene for fallback
      SELECT
        s.layout_id,
        s.primary_playlist_id
      INTO v_schedule_layout_id, v_schedule_playlist_id
      FROM scenes s
      WHERE s.id = v_device.active_scene_id;

      -- Include layout details if present
      IF v_schedule_layout_id IS NOT NULL THEN
        v_result := v_result || jsonb_build_object(
          'layout', (
            SELECT jsonb_build_object(
              'id', l.id,
              'name', l.name,
              'width', l.width,
              'height', l.height,
              'background_color', l.background_color,
              'zones', COALESCE(
                (
                  SELECT jsonb_agg(
                    jsonb_build_object(
                      'id', z.id,
                      'zone_name', z.zone_name,
                      'x_percent', z.x_percent,
                      'y_percent', z.y_percent,
                      'width_percent', z.width_percent,
                      'height_percent', z.height_percent,
                      'z_index', z.z_index,
                      'assigned_playlist_id', z.assigned_playlist_id,
                      'assigned_media_id', z.assigned_media_id
                    )
                  )
                  FROM layout_zones z WHERE z.layout_id = l.id
                ),
                '[]'::jsonb
              )
            )
            FROM layouts l WHERE l.id = v_schedule_layout_id
          )
        );
      END IF;

      RETURN v_result;
    END IF;
  END IF;

  -- PRIORITY 2: Check schedule (existing logic)
  SELECT
    se.layout_id,
    se.playlist_id
  INTO v_schedule_layout_id, v_schedule_playlist_id
  FROM schedule_entries se
  JOIN schedules s ON se.schedule_id = s.id
  WHERE s.owner_id = v_device.owner_id
    AND se.is_active = true
    AND (
      (se.start_time IS NULL AND se.end_time IS NULL) OR
      (CURRENT_TIME >= se.start_time AND CURRENT_TIME <= se.end_time)
    )
  ORDER BY se.priority DESC NULLS LAST
  LIMIT 1;

  IF v_schedule_layout_id IS NOT NULL OR v_schedule_playlist_id IS NOT NULL THEN
    v_result := v_result || jsonb_build_object('content_source', 'schedule');
  ELSE
    -- PRIORITY 3: Device direct assignments
    v_schedule_layout_id := v_device.assigned_layout_id;
    v_schedule_playlist_id := v_device.assigned_playlist_id;
    v_result := v_result || jsonb_build_object('content_source', 'device');
  END IF;

  -- Add layout if present
  IF v_schedule_layout_id IS NOT NULL THEN
    v_result := v_result || jsonb_build_object(
      'layout', (
        SELECT jsonb_build_object(
          'id', l.id,
          'name', l.name,
          'width', l.width,
          'height', l.height,
          'background_color', l.background_color,
          'zones', COALESCE(
            (
              SELECT jsonb_agg(
                jsonb_build_object(
                  'id', z.id,
                  'zone_name', z.zone_name,
                  'x_percent', z.x_percent,
                  'y_percent', z.y_percent,
                  'width_percent', z.width_percent,
                  'height_percent', z.height_percent,
                  'z_index', z.z_index,
                  'assigned_playlist_id', z.assigned_playlist_id,
                  'assigned_media_id', z.assigned_media_id
                )
              )
              FROM layout_zones z WHERE z.layout_id = l.id
            ),
            '[]'::jsonb
          )
        )
        FROM layouts l WHERE l.id = v_schedule_layout_id
      )
    );
  END IF;

  -- Add playlist if present
  IF v_schedule_playlist_id IS NOT NULL THEN
    v_result := v_result || jsonb_build_object(
      'playlist', (
        SELECT jsonb_build_object(
          'id', p.id,
          'name', p.name,
          'default_duration', p.default_duration,
          'transition_effect', p.transition_effect,
          'shuffle', p.shuffle,
          'items', COALESCE(
            (
              SELECT jsonb_agg(
                jsonb_build_object(
                  'id', pi.id,
                  'item_type', pi.item_type,
                  'item_id', pi.item_id,
                  'position', pi.position,
                  'duration', pi.duration,
                  'media', CASE
                    WHEN pi.item_type = 'media' THEN (
                      SELECT jsonb_build_object(
                        'id', m.id,
                        'name', m.name,
                        'type', m.type,
                        'url', m.url,
                        'thumbnail_url', m.thumbnail_url,
                        'duration', m.duration,
                        'config_json', m.config_json
                      )
                      FROM media_assets m WHERE m.id = pi.item_id
                    )
                    ELSE NULL
                  END
                )
                ORDER BY pi.position
              )
              FROM playlist_items pi WHERE pi.playlist_id = p.id
            ),
            '[]'::jsonb
          )
        )
        FROM playlists p WHERE p.id = v_schedule_playlist_id
      )
    );
  END IF;

  RETURN v_result;
END;
$$;

-- ============================================================================
-- Comments
-- ============================================================================

COMMENT ON TABLE scene_slides IS 'Stores individual slides for scene designs with drag-and-drop block layouts';
COMMENT ON COLUMN scene_slides.design_json IS 'JSON design containing background settings and blocks array with positions and properties';
COMMENT ON COLUMN scene_slides.kind IS 'Slide type: default, menu, promo, welcome, etc.';
COMMENT ON COLUMN scene_slides.duration_seconds IS 'How long to show this slide (defaults to 10s if null)';

DO $$ BEGIN RAISE NOTICE 'Migration 069 completed: scene_slides table and design JSON support added'; END $$;
