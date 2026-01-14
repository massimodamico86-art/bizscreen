-- Migration 072: Device Heartbeat Upgrade for Real-Time Sync
--
-- This migration adds:
-- 1. Content hash tracking for change detection
-- 2. Refresh flag for triggering device updates
-- 3. Last refresh timestamp
-- 4. Trigger to auto-mark devices for refresh on content changes

-- ============================================================================
-- 1. Add new columns to tv_devices for refresh tracking
-- ============================================================================

ALTER TABLE public.tv_devices
ADD COLUMN IF NOT EXISTS last_config_hash text,
ADD COLUMN IF NOT EXISTS needs_refresh boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS last_refresh_at timestamptz;

-- Add index for efficient refresh polling
CREATE INDEX IF NOT EXISTS idx_tv_devices_needs_refresh
ON tv_devices(needs_refresh) WHERE needs_refresh = true;

-- Add composite index for scene + refresh lookups
CREATE INDEX IF NOT EXISTS idx_tv_devices_scene_refresh
ON tv_devices(active_scene_id, needs_refresh)
WHERE active_scene_id IS NOT NULL;

-- ============================================================================
-- 2. Function to mark devices for refresh when scene slides change
-- ============================================================================

CREATE OR REPLACE FUNCTION public.mark_devices_for_refresh_on_slide_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Mark all devices with this scene as needing refresh
  UPDATE public.tv_devices
  SET
    needs_refresh = true,
    updated_at = NOW()
  WHERE active_scene_id = COALESCE(NEW.scene_id, OLD.scene_id);

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 3. Trigger on scene_slides for INSERT, UPDATE, DELETE
-- ============================================================================

DROP TRIGGER IF EXISTS trigger_mark_devices_on_slide_change ON scene_slides;

CREATE TRIGGER trigger_mark_devices_on_slide_change
AFTER INSERT OR UPDATE OR DELETE ON scene_slides
FOR EACH ROW
EXECUTE FUNCTION public.mark_devices_for_refresh_on_slide_change();

-- ============================================================================
-- 4. Function to mark devices for refresh when scene is updated
-- ============================================================================

CREATE OR REPLACE FUNCTION public.mark_devices_for_refresh_on_scene_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Only trigger on meaningful changes (not just last_seen updates)
  IF TG_OP = 'UPDATE' AND (
    OLD.name IS DISTINCT FROM NEW.name OR
    OLD.is_active IS DISTINCT FROM NEW.is_active OR
    OLD.settings IS DISTINCT FROM NEW.settings OR
    OLD.layout_id IS DISTINCT FROM NEW.layout_id OR
    OLD.primary_playlist_id IS DISTINCT FROM NEW.primary_playlist_id
  ) THEN
    UPDATE public.tv_devices
    SET
      needs_refresh = true,
      updated_at = NOW()
    WHERE active_scene_id = NEW.id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 5. Trigger on scenes for UPDATE
-- ============================================================================

DROP TRIGGER IF EXISTS trigger_mark_devices_on_scene_change ON scenes;

CREATE TRIGGER trigger_mark_devices_on_scene_change
AFTER UPDATE ON scenes
FOR EACH ROW
EXECUTE FUNCTION public.mark_devices_for_refresh_on_scene_change();

-- ============================================================================
-- 6. Function to mark devices for refresh when brand theme changes
-- ============================================================================

CREATE OR REPLACE FUNCTION public.mark_devices_for_refresh_on_theme_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Mark all devices belonging to this tenant as needing refresh
  UPDATE public.tv_devices
  SET
    needs_refresh = true,
    updated_at = NOW()
  WHERE tenant_id = COALESCE(NEW.tenant_id, OLD.tenant_id)
    AND active_scene_id IS NOT NULL;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 7. Trigger on brand_themes for changes
-- ============================================================================

DROP TRIGGER IF EXISTS trigger_mark_devices_on_theme_change ON brand_themes;

CREATE TRIGGER trigger_mark_devices_on_theme_change
AFTER INSERT OR UPDATE OR DELETE ON brand_themes
FOR EACH ROW
EXECUTE FUNCTION public.mark_devices_for_refresh_on_theme_change();

-- ============================================================================
-- 8. RPC function for device to check if refresh is needed
-- ============================================================================

CREATE OR REPLACE FUNCTION public.check_device_refresh_status(p_screen_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_device RECORD;
BEGIN
  SELECT
    needs_refresh,
    last_refresh_at,
    last_config_hash,
    active_scene_id
  INTO v_device
  FROM public.tv_devices
  WHERE id = p_screen_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Device not found');
  END IF;

  RETURN jsonb_build_object(
    'needs_refresh', COALESCE(v_device.needs_refresh, false),
    'last_refresh_at', v_device.last_refresh_at,
    'last_config_hash', v_device.last_config_hash,
    'active_scene_id', v_device.active_scene_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.check_device_refresh_status(UUID) TO anon;
GRANT EXECUTE ON FUNCTION public.check_device_refresh_status(UUID) TO authenticated;

-- ============================================================================
-- 9. RPC function for device to clear refresh flag after updating
-- ============================================================================

CREATE OR REPLACE FUNCTION public.clear_device_refresh_flag(p_screen_id UUID, p_config_hash TEXT DEFAULT NULL)
RETURNS JSONB AS $$
BEGIN
  UPDATE public.tv_devices
  SET
    needs_refresh = false,
    last_refresh_at = NOW(),
    last_config_hash = COALESCE(p_config_hash, last_config_hash)
  WHERE id = p_screen_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Device not found');
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'cleared_at', NOW()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.clear_device_refresh_flag(UUID, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.clear_device_refresh_flag(UUID, TEXT) TO authenticated;

-- ============================================================================
-- 10. Enhanced heartbeat function with refresh status return
-- ============================================================================

CREATE OR REPLACE FUNCTION public.player_heartbeat_with_status(p_screen_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_device tv_devices%ROWTYPE;
BEGIN
  -- Update heartbeat
  UPDATE public.tv_devices
  SET
    last_seen = NOW(),
    is_online = true
  WHERE id = p_screen_id
  RETURNING * INTO v_device;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Device not found');
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'needs_refresh', COALESCE(v_device.needs_refresh, false),
    'active_scene_id', v_device.active_scene_id,
    'last_refresh_at', v_device.last_refresh_at
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.player_heartbeat_with_status(UUID) TO anon;
GRANT EXECUTE ON FUNCTION public.player_heartbeat_with_status(UUID) TO authenticated;

-- ============================================================================
-- 11. Function to get scene content for a device (with slides)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_scene_content_for_device(p_screen_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_device tv_devices%ROWTYPE;
  v_scene scenes%ROWTYPE;
  v_slides JSONB;
  v_theme JSONB;
BEGIN
  -- Get device
  SELECT * INTO v_device
  FROM public.tv_devices
  WHERE id = p_screen_id;

  IF NOT FOUND OR v_device.active_scene_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'No active scene'
    );
  END IF;

  -- Get scene
  SELECT * INTO v_scene
  FROM public.scenes
  WHERE id = v_device.active_scene_id AND is_active = true;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Scene not found or inactive'
    );
  END IF;

  -- Get slides
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'id', ss.id,
      'position', ss.position,
      'duration_seconds', COALESCE(ss.duration_seconds, 10),
      'design', ss.design_json
    )
    ORDER BY ss.position
  ), '[]'::jsonb)
  INTO v_slides
  FROM public.scene_slides ss
  WHERE ss.scene_id = v_scene.id;

  -- Get brand theme if exists
  SELECT jsonb_build_object(
    'id', bt.id,
    'primary_color', bt.primary_color,
    'secondary_color', bt.secondary_color,
    'accent_color', bt.accent_color,
    'background_color', bt.background_color,
    'text_primary_color', bt.text_primary_color,
    'text_secondary_color', bt.text_secondary_color,
    'logo_url', bt.logo_url
  )
  INTO v_theme
  FROM public.brand_themes bt
  WHERE bt.tenant_id = v_device.tenant_id AND bt.is_active = true
  LIMIT 1;

  RETURN jsonb_build_object(
    'success', true,
    'scene', jsonb_build_object(
      'id', v_scene.id,
      'name', v_scene.name,
      'business_type', v_scene.business_type,
      'settings', v_scene.settings
    ),
    'slides', v_slides,
    'brand_theme', COALESCE(v_theme, '{}'::jsonb),
    'device', jsonb_build_object(
      'id', v_device.id,
      'name', v_device.device_name,
      'timezone', COALESCE(v_device.timezone, 'UTC')
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.get_scene_content_for_device(UUID) TO anon;
GRANT EXECUTE ON FUNCTION public.get_scene_content_for_device(UUID) TO authenticated;

-- ============================================================================
-- 12. Comments
-- ============================================================================

COMMENT ON COLUMN tv_devices.last_config_hash IS 'Hash of last loaded config for change detection';
COMMENT ON COLUMN tv_devices.needs_refresh IS 'Flag indicating device should refresh content';
COMMENT ON COLUMN tv_devices.last_refresh_at IS 'Timestamp of last content refresh';

COMMENT ON FUNCTION check_device_refresh_status(UUID) IS 'Check if device needs to refresh content';
COMMENT ON FUNCTION clear_device_refresh_flag(UUID, TEXT) IS 'Clear refresh flag after device has updated';
COMMENT ON FUNCTION player_heartbeat_with_status(UUID) IS 'Enhanced heartbeat that returns refresh status';
COMMENT ON FUNCTION get_scene_content_for_device(UUID) IS 'Get full scene content including slides for a device';

DO $$ BEGIN RAISE NOTICE 'Migration 072 completed: Device heartbeat upgrade with refresh tracking and triggers'; END $$;
