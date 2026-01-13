-- Migration: Add FK validation for layout_zones.content_id
-- Purpose: Validate that content_id references a valid record based on content_type
-- This implements polymorphic FK validation via trigger since PostgreSQL doesn't support native polymorphic FKs

-- Create validation function for layout_zones content references
CREATE OR REPLACE FUNCTION validate_layout_zone_content()
RETURNS TRIGGER AS $$
DECLARE
  v_exists boolean;
BEGIN
  -- Skip validation if content_type or content_id is NULL (empty zone)
  IF NEW.content_type IS NULL OR NEW.content_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Validate content_id exists in the appropriate table based on content_type
  CASE NEW.content_type
    WHEN 'playlist' THEN
      SELECT EXISTS(SELECT 1 FROM playlists WHERE id = NEW.content_id) INTO v_exists;
      IF NOT v_exists THEN
        RAISE EXCEPTION 'Invalid content_id: playlist % does not exist', NEW.content_id;
      END IF;

    WHEN 'media' THEN
      SELECT EXISTS(SELECT 1 FROM media_assets WHERE id = NEW.content_id) INTO v_exists;
      IF NOT v_exists THEN
        RAISE EXCEPTION 'Invalid content_id: media_asset % does not exist', NEW.content_id;
      END IF;

    WHEN 'layout' THEN
      SELECT EXISTS(SELECT 1 FROM layouts WHERE id = NEW.content_id) INTO v_exists;
      IF NOT v_exists THEN
        RAISE EXCEPTION 'Invalid content_id: layout % does not exist', NEW.content_id;
      END IF;

    WHEN 'scene' THEN
      SELECT EXISTS(SELECT 1 FROM scenes WHERE id = NEW.content_id) INTO v_exists;
      IF NOT v_exists THEN
        RAISE EXCEPTION 'Invalid content_id: scene % does not exist', NEW.content_id;
      END IF;

    WHEN 'app' THEN
      -- Apps are stored in media_assets with asset_type = 'app'
      SELECT EXISTS(SELECT 1 FROM media_assets WHERE id = NEW.content_id AND asset_type = 'app') INTO v_exists;
      IF NOT v_exists THEN
        RAISE EXCEPTION 'Invalid content_id: app % does not exist', NEW.content_id;
      END IF;

    WHEN 'takeover' THEN
      -- Takeover references a playlist used as emergency/takeover content
      SELECT EXISTS(SELECT 1 FROM playlists WHERE id = NEW.content_id) INTO v_exists;
      IF NOT v_exists THEN
        RAISE EXCEPTION 'Invalid content_id: takeover playlist % does not exist', NEW.content_id;
      END IF;

    ELSE
      RAISE EXCEPTION 'Unknown content_type: %. Valid types are: playlist, media, layout, scene, app, takeover', NEW.content_type;
  END CASE;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for INSERT operations
DROP TRIGGER IF EXISTS validate_layout_zone_content_insert ON layout_zones;
CREATE TRIGGER validate_layout_zone_content_insert
  BEFORE INSERT ON layout_zones
  FOR EACH ROW
  EXECUTE FUNCTION validate_layout_zone_content();

-- Create trigger for UPDATE operations
DROP TRIGGER IF EXISTS validate_layout_zone_content_update ON layout_zones;
CREATE TRIGGER validate_layout_zone_content_update
  BEFORE UPDATE ON layout_zones
  FOR EACH ROW
  WHEN (OLD.content_type IS DISTINCT FROM NEW.content_type OR OLD.content_id IS DISTINCT FROM NEW.content_id)
  EXECUTE FUNCTION validate_layout_zone_content();

-- Also add validation for schedule_entries which has similar polymorphic content references
CREATE OR REPLACE FUNCTION validate_schedule_entry_content()
RETURNS TRIGGER AS $$
DECLARE
  v_exists boolean;
BEGIN
  -- Skip validation if content_type or content_id is NULL
  IF NEW.content_type IS NULL OR NEW.content_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Validate content_id exists in the appropriate table
  CASE NEW.content_type
    WHEN 'playlist' THEN
      SELECT EXISTS(SELECT 1 FROM playlists WHERE id = NEW.content_id) INTO v_exists;
      IF NOT v_exists THEN
        RAISE EXCEPTION 'Invalid content_id: playlist % does not exist', NEW.content_id;
      END IF;

    WHEN 'media' THEN
      SELECT EXISTS(SELECT 1 FROM media_assets WHERE id = NEW.content_id) INTO v_exists;
      IF NOT v_exists THEN
        RAISE EXCEPTION 'Invalid content_id: media_asset % does not exist', NEW.content_id;
      END IF;

    WHEN 'layout' THEN
      SELECT EXISTS(SELECT 1 FROM layouts WHERE id = NEW.content_id) INTO v_exists;
      IF NOT v_exists THEN
        RAISE EXCEPTION 'Invalid content_id: layout % does not exist', NEW.content_id;
      END IF;

    WHEN 'scene' THEN
      SELECT EXISTS(SELECT 1 FROM scenes WHERE id = NEW.content_id) INTO v_exists;
      IF NOT v_exists THEN
        RAISE EXCEPTION 'Invalid content_id: scene % does not exist', NEW.content_id;
      END IF;

    WHEN 'takeover' THEN
      SELECT EXISTS(SELECT 1 FROM playlists WHERE id = NEW.content_id) INTO v_exists;
      IF NOT v_exists THEN
        RAISE EXCEPTION 'Invalid content_id: takeover playlist % does not exist', NEW.content_id;
      END IF;

    ELSE
      -- Allow other content types for schedule_entries (screenOff, etc.)
      NULL;
  END CASE;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for schedule_entries
DROP TRIGGER IF EXISTS validate_schedule_entry_content_insert ON schedule_entries;
CREATE TRIGGER validate_schedule_entry_content_insert
  BEFORE INSERT ON schedule_entries
  FOR EACH ROW
  EXECUTE FUNCTION validate_schedule_entry_content();

DROP TRIGGER IF EXISTS validate_schedule_entry_content_update ON schedule_entries;
CREATE TRIGGER validate_schedule_entry_content_update
  BEFORE UPDATE ON schedule_entries
  FOR EACH ROW
  WHEN (OLD.content_type IS DISTINCT FROM NEW.content_type OR OLD.content_id IS DISTINCT FROM NEW.content_id)
  EXECUTE FUNCTION validate_schedule_entry_content();

-- Add comments
COMMENT ON FUNCTION validate_layout_zone_content() IS 'Validates polymorphic content_id references in layout_zones table';
COMMENT ON FUNCTION validate_schedule_entry_content() IS 'Validates polymorphic content_id references in schedule_entries table';

DO $$ BEGIN RAISE NOTICE 'FK validation triggers for layout_zones and schedule_entries created successfully'; END $$;
