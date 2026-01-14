-- Migration 063: Fix template functions to match actual schema
--
-- Problems fixed:
-- 1. apply_template uses non-existent columns: playlists.loop, playlists.config_json
-- 2. apply_template uses non-existent columns: playlist_items.item_order, app_id, media_id, config_json
-- 3. apply_template uses non-existent columns: layouts.config_json
-- 4. apply_template uses non-existent columns: layout_zones.config_json
-- 5. apply_pack_template has same issues
-- 6. layout_zones.name should be aliased as zone_name for frontend compatibility

-- ============================================================================
-- 1. Add zone_name column to layout_zones (for frontend compatibility)
-- ============================================================================

-- The frontend uses zone_name, but the column is called name.
-- We'll rename name to zone_name for consistency.

-- First check if zone_name already exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'layout_zones' AND column_name = 'zone_name'
  ) THEN
    -- Add zone_name column
    ALTER TABLE layout_zones ADD COLUMN zone_name text;

    -- Copy data from name to zone_name
    UPDATE layout_zones SET zone_name = name WHERE zone_name IS NULL;

    -- Set default
    ALTER TABLE layout_zones ALTER COLUMN zone_name SET DEFAULT 'Zone';

    RAISE NOTICE 'Added zone_name column to layout_zones';
  ELSE
    RAISE NOTICE 'zone_name column already exists in layout_zones';
  END IF;
END $$;

-- Keep name and zone_name in sync via trigger
CREATE OR REPLACE FUNCTION sync_layout_zone_name()
RETURNS TRIGGER AS $$
BEGIN
  -- If zone_name is set, copy to name
  IF NEW.zone_name IS NOT NULL AND NEW.zone_name != '' THEN
    NEW.name := NEW.zone_name;
  -- If only name is set, copy to zone_name
  ELSIF NEW.name IS NOT NULL AND NEW.name != '' THEN
    NEW.zone_name := NEW.name;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS sync_zone_name_trigger ON layout_zones;
CREATE TRIGGER sync_zone_name_trigger
  BEFORE INSERT OR UPDATE ON layout_zones
  FOR EACH ROW EXECUTE FUNCTION sync_layout_zone_name();

-- ============================================================================
-- 2. Fix apply_template function
-- ============================================================================

CREATE OR REPLACE FUNCTION public.apply_template(p_template_slug TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_tenant_id UUID;
  v_template RECORD;
  v_blueprint RECORD;
  v_result JSONB := '{"playlists": [], "layouts": [], "schedules": []}';
  v_new_playlist_id UUID;
  v_new_layout_id UUID;
  v_new_schedule_id UUID;
  v_playlist_data JSONB;
  v_layout_data JSONB;
  v_item JSONB;
  v_zone JSONB;
  v_item_position INTEGER;
BEGIN
  -- Get current user
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Get tenant ID (owner_id) - check if impersonating
  SELECT COALESCE(
    (SELECT value FROM user_preferences WHERE user_id = v_user_id AND key = 'impersonating_tenant_id'),
    v_user_id::TEXT
  )::UUID INTO v_tenant_id;

  -- Fetch template
  SELECT * INTO v_template
  FROM content_templates
  WHERE slug = p_template_slug AND is_active = true AND type != 'pack';

  IF v_template IS NULL THEN
    RAISE EXCEPTION 'Template not found: %', p_template_slug;
  END IF;

  -- Process each blueprint for this template
  FOR v_blueprint IN
    SELECT * FROM content_template_blueprints WHERE template_id = v_template.id
  LOOP
    -- Handle playlist blueprints
    IF v_blueprint.blueprint_type = 'playlist' THEN
      v_playlist_data := v_blueprint.blueprint;

      -- Create the playlist (using actual columns that exist)
      INSERT INTO playlists (
        owner_id,
        name,
        description,
        default_duration,
        transition_effect,
        shuffle
      ) VALUES (
        v_tenant_id,
        COALESCE(v_playlist_data->>'name', v_template.name),
        COALESCE(v_playlist_data->>'description', v_template.description),
        COALESCE((v_playlist_data->>'default_duration')::INTEGER, 10),
        COALESCE(v_playlist_data->>'transition_effect', 'fade'),
        COALESCE((v_playlist_data->>'shuffle')::BOOLEAN, false)
      )
      RETURNING id INTO v_new_playlist_id;

      -- Insert playlist items from blueprint (using actual columns)
      v_item_position := 0;
      IF v_playlist_data->'items' IS NOT NULL THEN
        FOR v_item IN SELECT * FROM jsonb_array_elements(v_playlist_data->'items')
        LOOP
          v_item_position := v_item_position + 1;

          -- Insert placeholder item - will be configured by user later
          INSERT INTO playlist_items (
            playlist_id,
            item_type,
            item_id,
            position,
            duration
          ) VALUES (
            v_new_playlist_id,
            COALESCE(v_item->>'item_type', 'media'),
            COALESCE((v_item->>'item_id')::UUID, uuid_generate_v4()), -- Placeholder UUID
            v_item_position,
            COALESCE((v_item->>'duration')::INTEGER, 10)
          );
        END LOOP;
      END IF;

      -- Add to result
      v_result := jsonb_set(
        v_result,
        '{playlists}',
        v_result->'playlists' || jsonb_build_array(
          jsonb_build_object('id', v_new_playlist_id, 'name', COALESCE(v_playlist_data->>'name', v_template.name))
        )
      );

    -- Handle layout blueprints
    ELSIF v_blueprint.blueprint_type = 'layout' THEN
      v_layout_data := v_blueprint.blueprint;

      -- Create the layout (using actual columns that exist)
      INSERT INTO layouts (
        owner_id,
        name,
        description,
        width,
        height,
        background_color
      ) VALUES (
        v_tenant_id,
        COALESCE(v_layout_data->>'name', v_template.name),
        COALESCE(v_layout_data->>'description', v_template.description),
        COALESCE((v_layout_data->>'width')::INTEGER, 1920),
        COALESCE((v_layout_data->>'height')::INTEGER, 1080),
        COALESCE(v_layout_data->>'background_color', '#000000')
      )
      RETURNING id INTO v_new_layout_id;

      -- Insert layout zones from blueprint (using actual columns)
      IF v_layout_data->'zones' IS NOT NULL THEN
        FOR v_zone IN SELECT * FROM jsonb_array_elements(v_layout_data->'zones')
        LOOP
          INSERT INTO layout_zones (
            layout_id,
            name,
            zone_name,
            x_percent,
            y_percent,
            width_percent,
            height_percent,
            z_index,
            content_type
          ) VALUES (
            v_new_layout_id,
            COALESCE(v_zone->>'name', 'Zone'),
            COALESCE(v_zone->>'name', 'Zone'),
            COALESCE((v_zone->>'x_percent')::NUMERIC, 0),
            COALESCE((v_zone->>'y_percent')::NUMERIC, 0),
            COALESCE((v_zone->>'width_percent')::NUMERIC, 100),
            COALESCE((v_zone->>'height_percent')::NUMERIC, 100),
            COALESCE((v_zone->>'z_index')::INTEGER, 0),
            COALESCE(v_zone->>'content_type', 'playlist')
          );
        END LOOP;
      END IF;

      -- Add to result
      v_result := jsonb_set(
        v_result,
        '{layouts}',
        v_result->'layouts' || jsonb_build_array(
          jsonb_build_object('id', v_new_layout_id, 'name', COALESCE(v_layout_data->>'name', v_template.name))
        )
      );

    -- Handle schedule blueprints
    ELSIF v_blueprint.blueprint_type = 'schedule' THEN
      -- Create schedule (using actual columns)
      INSERT INTO schedules (
        owner_id,
        name,
        description,
        is_default
      ) VALUES (
        v_tenant_id,
        COALESCE(v_blueprint.blueprint->>'name', 'Template Schedule'),
        COALESCE(v_blueprint.blueprint->>'description', 'Created from template'),
        false
      )
      RETURNING id INTO v_new_schedule_id;

      -- Add to result
      v_result := jsonb_set(
        v_result,
        '{schedules}',
        v_result->'schedules' || jsonb_build_array(
          jsonb_build_object('id', v_new_schedule_id, 'name', COALESCE(v_blueprint.blueprint->>'name', 'Template Schedule'))
        )
      );
    END IF;
  END LOOP;

  RETURN v_result;
END;
$$;

-- ============================================================================
-- 3. Fix apply_pack_template function
-- ============================================================================

CREATE OR REPLACE FUNCTION public.apply_pack_template(p_pack_slug TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_tenant_id UUID;
  v_template RECORD;
  v_blueprint RECORD;
  v_result JSONB := '{"playlists": [], "layouts": [], "schedules": []}';
  v_pack_data JSONB;
  v_playlist JSONB;
  v_layout JSONB;
  v_schedule JSONB;
  v_new_playlist_id UUID;
  v_new_layout_id UUID;
  v_new_schedule_id UUID;
  v_item JSONB;
  v_zone JSONB;
  v_item_position INTEGER;
  v_created_playlists JSONB := '{}'; -- Map of placeholder_key -> playlist_id
BEGIN
  -- Get current user
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Get tenant ID (owner_id) - check if impersonating
  SELECT COALESCE(
    (SELECT value FROM user_preferences WHERE user_id = v_user_id AND key = 'impersonating_tenant_id'),
    v_user_id::TEXT
  )::UUID INTO v_tenant_id;

  -- Fetch pack template
  SELECT * INTO v_template
  FROM content_templates
  WHERE slug = p_pack_slug AND is_active = true AND type = 'pack';

  IF v_template IS NULL THEN
    RAISE EXCEPTION 'Pack template not found: %', p_pack_slug;
  END IF;

  -- Fetch pack blueprint
  SELECT * INTO v_blueprint
  FROM content_template_blueprints
  WHERE template_id = v_template.id AND blueprint_type = 'pack'
  LIMIT 1;

  IF v_blueprint IS NULL THEN
    RAISE EXCEPTION 'Pack blueprint not found for: %', p_pack_slug;
  END IF;

  v_pack_data := v_blueprint.blueprint;

  -- Create playlists first (so we can reference them in layouts)
  IF v_pack_data->'playlists' IS NOT NULL THEN
    FOR v_playlist IN SELECT * FROM jsonb_array_elements(v_pack_data->'playlists')
    LOOP
      -- Create playlist
      INSERT INTO playlists (
        owner_id,
        name,
        description,
        default_duration,
        transition_effect,
        shuffle
      ) VALUES (
        v_tenant_id,
        COALESCE(v_playlist->>'name', 'Pack Playlist'),
        COALESCE(v_playlist->>'description', ''),
        COALESCE((v_playlist->>'default_duration')::INTEGER, 10),
        COALESCE(v_playlist->>'transition_effect', 'fade'),
        COALESCE((v_playlist->>'shuffle')::BOOLEAN, false)
      )
      RETURNING id INTO v_new_playlist_id;

      -- Track created playlists by placeholder_key
      IF v_playlist->>'placeholder_key' IS NOT NULL THEN
        v_created_playlists := v_created_playlists || jsonb_build_object(v_playlist->>'placeholder_key', v_new_playlist_id);
      END IF;

      -- Insert playlist items
      v_item_position := 0;
      IF v_playlist->'items' IS NOT NULL THEN
        FOR v_item IN SELECT * FROM jsonb_array_elements(v_playlist->'items')
        LOOP
          v_item_position := v_item_position + 1;
          INSERT INTO playlist_items (
            playlist_id,
            item_type,
            item_id,
            position,
            duration
          ) VALUES (
            v_new_playlist_id,
            COALESCE(v_item->>'item_type', 'media'),
            COALESCE((v_item->>'item_id')::UUID, uuid_generate_v4()),
            v_item_position,
            COALESCE((v_item->>'duration')::INTEGER, 10)
          );
        END LOOP;
      END IF;

      -- Add to result
      v_result := jsonb_set(
        v_result,
        '{playlists}',
        v_result->'playlists' || jsonb_build_array(
          jsonb_build_object('id', v_new_playlist_id, 'name', COALESCE(v_playlist->>'name', 'Pack Playlist'))
        )
      );
    END LOOP;
  END IF;

  -- Create layouts (can reference created playlists)
  IF v_pack_data->'layouts' IS NOT NULL THEN
    FOR v_layout IN SELECT * FROM jsonb_array_elements(v_pack_data->'layouts')
    LOOP
      -- Create layout
      INSERT INTO layouts (
        owner_id,
        name,
        description,
        width,
        height,
        background_color
      ) VALUES (
        v_tenant_id,
        COALESCE(v_layout->>'name', 'Pack Layout'),
        COALESCE(v_layout->>'description', ''),
        COALESCE((v_layout->>'width')::INTEGER, 1920),
        COALESCE((v_layout->>'height')::INTEGER, 1080),
        COALESCE(v_layout->>'background_color', '#000000')
      )
      RETURNING id INTO v_new_layout_id;

      -- Insert layout zones
      IF v_layout->'zones' IS NOT NULL THEN
        FOR v_zone IN SELECT * FROM jsonb_array_elements(v_layout->'zones')
        LOOP
          INSERT INTO layout_zones (
            layout_id,
            name,
            zone_name,
            x_percent,
            y_percent,
            width_percent,
            height_percent,
            z_index,
            content_type,
            assigned_playlist_id
          ) VALUES (
            v_new_layout_id,
            COALESCE(v_zone->>'name', 'Zone'),
            COALESCE(v_zone->>'name', 'Zone'),
            COALESCE((v_zone->>'x_percent')::NUMERIC, 0),
            COALESCE((v_zone->>'y_percent')::NUMERIC, 0),
            COALESCE((v_zone->>'width_percent')::NUMERIC, 100),
            COALESCE((v_zone->>'height_percent')::NUMERIC, 100),
            COALESCE((v_zone->>'z_index')::INTEGER, 0),
            COALESCE(v_zone->>'content_type', 'playlist'),
            -- Link to created playlist if placeholder_key matches
            (v_created_playlists->>(v_zone->>'playlist_placeholder_key'))::UUID
          );
        END LOOP;
      END IF;

      -- Add to result
      v_result := jsonb_set(
        v_result,
        '{layouts}',
        v_result->'layouts' || jsonb_build_array(
          jsonb_build_object('id', v_new_layout_id, 'name', COALESCE(v_layout->>'name', 'Pack Layout'))
        )
      );
    END LOOP;
  END IF;

  -- Create schedules
  IF v_pack_data->'schedules' IS NOT NULL THEN
    FOR v_schedule IN SELECT * FROM jsonb_array_elements(v_pack_data->'schedules')
    LOOP
      INSERT INTO schedules (
        owner_id,
        name,
        description,
        is_default
      ) VALUES (
        v_tenant_id,
        COALESCE(v_schedule->>'name', 'Pack Schedule'),
        COALESCE(v_schedule->>'description', ''),
        false
      )
      RETURNING id INTO v_new_schedule_id;

      -- Add to result
      v_result := jsonb_set(
        v_result,
        '{schedules}',
        v_result->'schedules' || jsonb_build_array(
          jsonb_build_object('id', v_new_schedule_id, 'name', COALESCE(v_schedule->>'name', 'Pack Schedule'))
        )
      );
    END LOOP;
  END IF;

  RETURN v_result;
END;
$$;

-- ============================================================================
-- 4. Update existing layout_zones to have zone_name populated
-- ============================================================================

UPDATE layout_zones
SET zone_name = name
WHERE zone_name IS NULL OR zone_name = '';

-- ============================================================================
-- Comments
-- ============================================================================

COMMENT ON COLUMN layout_zones.zone_name IS 'Display name for the zone (synced with name column for frontend compatibility)';
COMMENT ON FUNCTION apply_template IS 'Instantiate a content template for the current user - FIXED to use actual schema';
COMMENT ON FUNCTION apply_pack_template IS 'Instantiate a vertical pack template for the current user - FIXED to use actual schema';

DO $$ BEGIN RAISE NOTICE 'Migration 063 completed: Template functions fixed for actual schema'; END $$;
