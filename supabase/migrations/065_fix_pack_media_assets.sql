-- Migration 065: Fix template/pack functions to create real media assets
--
-- Problem: apply_pack_template and apply_template were inserting random UUIDs
-- as item_id, which get synced to media_asset_id by a trigger. But those UUIDs
-- don't exist in media_assets, causing FK violation.
--
-- Solution: For each playlist item, first create a placeholder media asset,
-- then use that asset's ID as the item_id.

-- ============================================================================
-- 1. Fix apply_pack_template function
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
  v_new_media_id UUID;
  v_item JSONB;
  v_zone JSONB;
  v_item_position INTEGER;
  v_created_playlists JSONB := '{}'; -- Map of key -> playlist_id
  v_placeholder_url TEXT := 'https://placehold.co/1920x1080/1a1a2e/ffffff?text=';
BEGIN
  -- Get current user
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Get tenant ID (owner_id) - check if impersonating
  BEGIN
    SELECT COALESCE(
      (SELECT value FROM user_preferences WHERE user_id = v_user_id AND key = 'impersonating_tenant_id'),
      v_user_id::TEXT
    )::UUID INTO v_tenant_id;
  EXCEPTION WHEN OTHERS THEN
    v_tenant_id := v_user_id;
  END;

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
      -- Create playlist using actual columns
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

      -- Track created playlists by key
      IF v_playlist->>'key' IS NOT NULL THEN
        v_created_playlists := v_created_playlists || jsonb_build_object(v_playlist->>'key', v_new_playlist_id);
      END IF;

      -- Insert playlist items - CREATE REAL MEDIA ASSETS FIRST
      v_item_position := 0;
      IF v_playlist->'items' IS NOT NULL THEN
        FOR v_item IN SELECT * FROM jsonb_array_elements(v_playlist->'items')
        LOOP
          v_item_position := v_item_position + 1;

          -- Create a real placeholder media asset for this item
          INSERT INTO media_assets (
            owner_id,
            name,
            type,
            url,
            thumbnail_url,
            description,
            width,
            height
          ) VALUES (
            v_tenant_id,
            COALESCE(v_item->>'label', 'Slide ' || v_item_position),
            'image',
            v_placeholder_url || replace(COALESCE(v_item->>'label', 'Slide'), ' ', '+'),
            v_placeholder_url || replace(COALESCE(v_item->>'label', 'Slide'), ' ', '+'),
            COALESCE(v_item->>'hint', 'Placeholder - replace with your content'),
            1920,
            1080
          )
          RETURNING id INTO v_new_media_id;

          -- Now insert the playlist item with the real media asset ID
          INSERT INTO playlist_items (
            playlist_id,
            item_type,
            item_id,
            position,
            duration
          ) VALUES (
            v_new_playlist_id,
            'media',
            v_new_media_id,  -- Use the real media asset ID
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
      -- Create layout using actual columns
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

      -- Insert layout zones using actual columns
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
            -- Link to created playlist if key matches
            (v_created_playlists->>(v_zone->>'playlist_key'))::UUID
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
  v_new_media_id UUID;
  v_playlist_data JSONB;
  v_layout_data JSONB;
  v_item JSONB;
  v_zone JSONB;
  v_item_position INTEGER;
  v_placeholder_url TEXT := 'https://placehold.co/1920x1080/1a1a2e/ffffff?text=';
BEGIN
  -- Get current user
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Get tenant ID (owner_id) - check if impersonating
  BEGIN
    SELECT COALESCE(
      (SELECT value FROM user_preferences WHERE user_id = v_user_id AND key = 'impersonating_tenant_id'),
      v_user_id::TEXT
    )::UUID INTO v_tenant_id;
  EXCEPTION WHEN OTHERS THEN
    v_tenant_id := v_user_id;
  END;

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

      -- Insert playlist items - CREATE REAL MEDIA ASSETS FIRST
      v_item_position := 0;
      IF v_playlist_data->'items' IS NOT NULL THEN
        FOR v_item IN SELECT * FROM jsonb_array_elements(v_playlist_data->'items')
        LOOP
          v_item_position := v_item_position + 1;

          -- Create a real placeholder media asset for this item
          INSERT INTO media_assets (
            owner_id,
            name,
            type,
            url,
            thumbnail_url,
            description,
            width,
            height
          ) VALUES (
            v_tenant_id,
            COALESCE(v_item->>'label', 'Slide ' || v_item_position),
            'image',
            v_placeholder_url || replace(COALESCE(v_item->>'label', 'Slide'), ' ', '+'),
            v_placeholder_url || replace(COALESCE(v_item->>'label', 'Slide'), ' ', '+'),
            COALESCE(v_item->>'hint', 'Placeholder - replace with your content'),
            1920,
            1080
          )
          RETURNING id INTO v_new_media_id;

          -- Now insert the playlist item with the real media asset ID
          INSERT INTO playlist_items (
            playlist_id,
            item_type,
            item_id,
            position,
            duration
          ) VALUES (
            v_new_playlist_id,
            'media',
            v_new_media_id,  -- Use the real media asset ID
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
-- 3. Grant execute permissions
-- ============================================================================

GRANT EXECUTE ON FUNCTION public.apply_template(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.apply_pack_template(TEXT) TO authenticated;

-- ============================================================================
-- Comments
-- ============================================================================

COMMENT ON FUNCTION apply_template IS 'Instantiate a content template - creates real media assets for playlist items';
COMMENT ON FUNCTION apply_pack_template IS 'Instantiate a starter pack - creates real media assets for playlist items';

DO $$ BEGIN RAISE NOTICE 'Migration 065 completed: Template functions now create real media assets'; END $$;
