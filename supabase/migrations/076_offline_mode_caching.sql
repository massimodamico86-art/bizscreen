-- ============================================================================
-- Migration: 076_offline_mode_caching.sql
-- Description: Add content checksums and offline caching support
-- ============================================================================

-- ============================================================================
-- 1. ADD CONTENT HASH COLUMNS TO SCENES
-- ============================================================================

ALTER TABLE public.scenes
ADD COLUMN IF NOT EXISTS content_hash TEXT,
ADD COLUMN IF NOT EXISTS media_hash TEXT,
ADD COLUMN IF NOT EXISTS last_hash_update TIMESTAMPTZ;

COMMENT ON COLUMN public.scenes.content_hash IS 'SHA256 hash of design_json for change detection';
COMMENT ON COLUMN public.scenes.media_hash IS 'SHA256 hash of all media URLs for cache invalidation';
COMMENT ON COLUMN public.scenes.last_hash_update IS 'Timestamp of last hash computation';

-- ============================================================================
-- 2. ADD CACHE STATUS TO TV_DEVICES
-- ============================================================================

ALTER TABLE public.tv_devices
ADD COLUMN IF NOT EXISTS cached_scene_id UUID REFERENCES scenes(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS cached_content_hash TEXT,
ADD COLUMN IF NOT EXISTS last_cache_sync TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS cache_status TEXT DEFAULT 'none' CHECK (cache_status IN ('none', 'ok', 'stale', 'error')),
ADD COLUMN IF NOT EXISTS offline_since TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS is_offline_mode BOOLEAN DEFAULT false;

COMMENT ON COLUMN public.tv_devices.cached_scene_id IS 'ID of the scene currently cached on device';
COMMENT ON COLUMN public.tv_devices.cached_content_hash IS 'Hash of cached content for validation';
COMMENT ON COLUMN public.tv_devices.last_cache_sync IS 'Last successful content sync timestamp';
COMMENT ON COLUMN public.tv_devices.cache_status IS 'Current cache status: none, ok, stale, error';
COMMENT ON COLUMN public.tv_devices.offline_since IS 'Timestamp when device went offline';
COMMENT ON COLUMN public.tv_devices.is_offline_mode IS 'Whether device is currently in offline mode';

-- ============================================================================
-- 3. CREATE FUNCTION TO COMPUTE SCENE HASH
-- ============================================================================

CREATE OR REPLACE FUNCTION public.compute_scene_hash(p_scene_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_scene RECORD;
  v_content_hash TEXT;
  v_media_hash TEXT;
  v_media_urls TEXT[];
  v_all_design_json JSONB;
BEGIN
  -- Get scene data
  SELECT * INTO v_scene FROM scenes WHERE id = p_scene_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Scene not found');
  END IF;

  -- Aggregate all design_json from scene_slides for this scene
  SELECT jsonb_agg(design_json ORDER BY position) INTO v_all_design_json
  FROM scene_slides WHERE scene_id = p_scene_id;

  -- Compute content hash from aggregated design_json
  v_content_hash := encode(
    sha256(COALESCE(v_all_design_json::TEXT, '')::BYTEA),
    'hex'
  );

  -- Extract media URLs from all slide design_json
  -- This extracts all 'url' and 'src' values from the JSON
  WITH RECURSIVE json_values AS (
    SELECT COALESCE(v_all_design_json, '[]'::JSONB) AS val
    UNION ALL
    SELECT
      CASE jsonb_typeof(v.val)
        WHEN 'object' THEN (SELECT jsonb_agg(value) FROM jsonb_each(v.val))
        WHEN 'array' THEN (SELECT jsonb_agg(elem) FROM jsonb_array_elements(v.val) elem)
      END
    FROM json_values v
    WHERE jsonb_typeof(v.val) IN ('object', 'array')
  ),
  media_urls AS (
    SELECT DISTINCT value::TEXT AS url
    FROM json_values, LATERAL jsonb_each(val)
    WHERE jsonb_typeof(val) = 'object'
    AND key IN ('url', 'src', 'backgroundImage', 'videoUrl', 'imageUrl')
    AND jsonb_typeof(value) = 'string'
    AND value::TEXT LIKE '%http%'
  )
  SELECT array_agg(url ORDER BY url) INTO v_media_urls FROM media_urls;

  -- Compute media hash
  v_media_hash := encode(
    sha256(COALESCE(array_to_string(v_media_urls, ','), '')::BYTEA),
    'hex'
  );

  -- Update scene with computed hashes
  UPDATE scenes
  SET
    content_hash = v_content_hash,
    media_hash = v_media_hash,
    last_hash_update = now()
  WHERE id = p_scene_id;

  RETURN jsonb_build_object(
    'scene_id', p_scene_id,
    'content_hash', v_content_hash,
    'media_hash', v_media_hash,
    'media_count', COALESCE(array_length(v_media_urls, 1), 0),
    'updated_at', now()
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.compute_scene_hash(UUID) TO authenticated;

-- ============================================================================
-- 4. CREATE TRIGGER TO AUTO-UPDATE HASH ON SCENE CHANGE
-- ============================================================================

CREATE OR REPLACE FUNCTION public.trigger_update_scene_hash()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Mark hash as needing update (will be computed on next fetch)
  NEW.content_hash := NULL;
  NEW.media_hash := NULL;
  NEW.last_hash_update := NULL;
  RETURN NEW;
END;
$$;

-- Function to update scene hash when a slide changes (must be before trigger)
CREATE OR REPLACE FUNCTION public.trigger_update_scene_hash_from_slide()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Clear hash on the parent scene when a slide changes
  UPDATE scenes
  SET content_hash = NULL,
      media_hash = NULL,
      last_hash_update = NULL
  WHERE id = NEW.scene_id;
  RETURN NEW;
END;
$$;

-- Note: Trigger on scene_slides.design_json instead of scenes.design_json
-- since design_json is on scene_slides table
DROP TRIGGER IF EXISTS update_scene_hash_trigger ON scene_slides;
CREATE TRIGGER update_scene_hash_trigger
AFTER UPDATE OF design_json ON scene_slides
FOR EACH ROW
EXECUTE FUNCTION trigger_update_scene_hash_from_slide();

-- ============================================================================
-- 5. GET SCENE CHECKSUMS FOR DEVICE
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_scene_checksums(p_device_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_device RECORD;
  v_scene RECORD;
  v_result JSONB;
BEGIN
  -- Get device info
  SELECT * INTO v_device FROM tv_devices WHERE id = p_device_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Device not found');
  END IF;

  -- Get scene info (either active or from schedule)
  SELECT s.* INTO v_scene
  FROM scenes s
  WHERE s.id = v_device.active_scene_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'device_id', p_device_id,
      'has_scene', false,
      'message', 'No scene assigned'
    );
  END IF;

  -- Ensure hash is computed
  IF v_scene.content_hash IS NULL THEN
    PERFORM compute_scene_hash(v_scene.id);
    SELECT * INTO v_scene FROM scenes WHERE id = v_device.active_scene_id;
  END IF;

  RETURN jsonb_build_object(
    'device_id', p_device_id,
    'has_scene', true,
    'scene_id', v_scene.id,
    'scene_name', v_scene.name,
    'content_hash', v_scene.content_hash,
    'media_hash', v_scene.media_hash,
    'last_hash_update', v_scene.last_hash_update,
    'cached_hash', v_device.cached_content_hash,
    'needs_update', (v_scene.content_hash IS DISTINCT FROM v_device.cached_content_hash)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_scene_checksums(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_scene_checksums(UUID) TO anon;

-- ============================================================================
-- 6. CHECK IF SCENE CHANGED
-- ============================================================================

CREATE OR REPLACE FUNCTION public.check_if_scene_changed(
  p_scene_id UUID,
  p_last_content_hash TEXT,
  p_last_media_hash TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_scene RECORD;
BEGIN
  -- Get scene
  SELECT * INTO v_scene FROM scenes WHERE id = p_scene_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Scene not found');
  END IF;

  -- Ensure hash is computed
  IF v_scene.content_hash IS NULL THEN
    PERFORM compute_scene_hash(p_scene_id);
    SELECT * INTO v_scene FROM scenes WHERE id = p_scene_id;
  END IF;

  RETURN jsonb_build_object(
    'scene_id', p_scene_id,
    'content_changed', (v_scene.content_hash IS DISTINCT FROM p_last_content_hash),
    'media_changed', (v_scene.media_hash IS DISTINCT FROM p_last_media_hash),
    'current_content_hash', v_scene.content_hash,
    'current_media_hash', v_scene.media_hash,
    'needs_full_refresh', (v_scene.content_hash IS DISTINCT FROM p_last_content_hash),
    'needs_media_refresh', (v_scene.media_hash IS DISTINCT FROM p_last_media_hash)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.check_if_scene_changed(UUID, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_if_scene_changed(UUID, TEXT, TEXT) TO anon;

-- ============================================================================
-- 7. UPDATE DEVICE CACHE STATUS
-- ============================================================================

CREATE OR REPLACE FUNCTION public.update_device_cache_status(
  p_device_id UUID,
  p_scene_id UUID,
  p_content_hash TEXT,
  p_cache_status TEXT DEFAULT 'ok'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSONB;
BEGIN
  UPDATE tv_devices
  SET
    cached_scene_id = p_scene_id,
    cached_content_hash = p_content_hash,
    last_cache_sync = now(),
    cache_status = p_cache_status,
    is_offline_mode = false,
    offline_since = NULL,
    updated_at = now()
  WHERE id = p_device_id
  RETURNING jsonb_build_object(
    'device_id', id,
    'cached_scene_id', cached_scene_id,
    'cached_content_hash', cached_content_hash,
    'last_cache_sync', last_cache_sync,
    'cache_status', cache_status
  ) INTO v_result;

  IF v_result IS NULL THEN
    RETURN jsonb_build_object('error', 'Device not found');
  END IF;

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_device_cache_status(UUID, UUID, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_device_cache_status(UUID, UUID, TEXT, TEXT) TO anon;

-- ============================================================================
-- 8. MARK DEVICE AS OFFLINE
-- ============================================================================

CREATE OR REPLACE FUNCTION public.mark_device_offline(p_device_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE tv_devices
  SET
    is_offline_mode = true,
    offline_since = COALESCE(offline_since, now()),
    cache_status = CASE
      WHEN cached_scene_id IS NOT NULL THEN 'stale'
      ELSE 'none'
    END,
    updated_at = now()
  WHERE id = p_device_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Device not found');
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'device_id', p_device_id,
    'is_offline_mode', true
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.mark_device_offline(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_device_offline(UUID) TO anon;

-- ============================================================================
-- 9. QUEUE OFFLINE EVENTS FOR SYNC
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.offline_event_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id UUID REFERENCES tv_devices(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('heartbeat', 'screenshot', 'playback', 'error')),
  event_data JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL,
  synced_at TIMESTAMPTZ,
  sync_attempts INTEGER DEFAULT 0,
  last_sync_error TEXT,
  tenant_id UUID -- No FK since tenants may be managed in profiles or elsewhere
);

CREATE INDEX IF NOT EXISTS idx_offline_queue_device ON offline_event_queue(device_id);
CREATE INDEX IF NOT EXISTS idx_offline_queue_unsynced ON offline_event_queue(synced_at) WHERE synced_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_offline_queue_tenant ON offline_event_queue(tenant_id);

-- Enable RLS
ALTER TABLE public.offline_event_queue ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Devices can insert their own events"
ON public.offline_event_queue
FOR INSERT
TO anon
WITH CHECK (true);

CREATE POLICY "Users can view their tenant events"
ON public.offline_event_queue
FOR SELECT
TO authenticated
USING (true); -- Simplified - real policy would check tenant ownership

-- ============================================================================
-- 10. SYNC OFFLINE EVENTS
-- ============================================================================

CREATE OR REPLACE FUNCTION public.sync_offline_events(
  p_device_id UUID,
  p_events JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_event JSONB;
  v_synced_count INTEGER := 0;
  v_failed_count INTEGER := 0;
  v_device RECORD;
BEGIN
  -- Get device
  SELECT * INTO v_device FROM tv_devices WHERE id = p_device_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Device not found');
  END IF;

  -- Process each event
  FOR v_event IN SELECT * FROM jsonb_array_elements(p_events)
  LOOP
    BEGIN
      INSERT INTO offline_event_queue (
        device_id,
        event_type,
        event_data,
        created_at,
        synced_at
      ) VALUES (
        p_device_id,
        v_event->>'event_type',
        v_event->'event_data',
        (v_event->>'created_at')::TIMESTAMPTZ,
        now()
      );
      v_synced_count := v_synced_count + 1;
    EXCEPTION WHEN OTHERS THEN
      v_failed_count := v_failed_count + 1;
    END;
  END LOOP;

  -- Update device status
  UPDATE tv_devices
  SET
    is_offline_mode = false,
    offline_since = NULL,
    cache_status = 'ok',
    updated_at = now()
  WHERE id = p_device_id;

  RETURN jsonb_build_object(
    'success', true,
    'synced_count', v_synced_count,
    'failed_count', v_failed_count,
    'device_id', p_device_id
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.sync_offline_events(UUID, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.sync_offline_events(UUID, JSONB) TO anon;

-- ============================================================================
-- 11. GET SCENE WITH MEDIA URLS FOR CACHING
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_scene_for_caching(p_scene_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_scene RECORD;
  v_media_urls JSONB;
  v_all_design_json JSONB;
  v_slides JSONB;
BEGIN
  -- Get scene
  SELECT * INTO v_scene FROM scenes WHERE id = p_scene_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Scene not found');
  END IF;

  -- Ensure hash is computed
  IF v_scene.content_hash IS NULL THEN
    PERFORM compute_scene_hash(p_scene_id);
    SELECT * INTO v_scene FROM scenes WHERE id = p_scene_id;
  END IF;

  -- Get slides with their design_json
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', ss.id,
      'position', ss.position,
      'title', ss.title,
      'kind', ss.kind,
      'design_json', ss.design_json,
      'duration_seconds', ss.duration_seconds
    ) ORDER BY ss.position
  ) INTO v_slides
  FROM scene_slides ss WHERE ss.scene_id = p_scene_id;

  -- Aggregate all design_json from scene_slides
  SELECT jsonb_agg(design_json ORDER BY position) INTO v_all_design_json
  FROM scene_slides WHERE scene_id = p_scene_id;

  -- Extract all media URLs from design_json
  WITH RECURSIVE json_values AS (
    SELECT COALESCE(v_all_design_json, '[]'::JSONB) AS val, 0 AS depth
    UNION ALL
    SELECT
      CASE jsonb_typeof(v.val)
        WHEN 'object' THEN (SELECT jsonb_agg(value) FROM jsonb_each(v.val))
        WHEN 'array' THEN (SELECT jsonb_agg(elem) FROM jsonb_array_elements(v.val) elem)
      END,
      v.depth + 1
    FROM json_values v
    WHERE jsonb_typeof(v.val) IN ('object', 'array')
    AND v.depth < 10
  ),
  media_urls AS (
    SELECT DISTINCT value::TEXT AS url
    FROM json_values, LATERAL jsonb_each(val)
    WHERE jsonb_typeof(val) = 'object'
    AND key IN ('url', 'src', 'backgroundImage', 'videoUrl', 'imageUrl', 'posterUrl')
    AND jsonb_typeof(value) = 'string'
    AND value::TEXT LIKE '%http%'
  )
  SELECT jsonb_agg(url) INTO v_media_urls FROM media_urls;

  RETURN jsonb_build_object(
    'scene_id', v_scene.id,
    'name', v_scene.name,
    'slides', COALESCE(v_slides, '[]'::JSONB),
    'content_hash', v_scene.content_hash,
    'media_hash', v_scene.media_hash,
    'media_urls', COALESCE(v_media_urls, '[]'::JSONB),
    'business_type', v_scene.business_type,
    'updated_at', v_scene.updated_at
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_scene_for_caching(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_scene_for_caching(UUID) TO anon;

-- ============================================================================
-- 12. UPDATE list_devices_with_screenshot_info TO INCLUDE CACHE STATUS
-- ============================================================================

DROP FUNCTION IF EXISTS public.list_devices_with_screenshot_info(UUID);

CREATE OR REPLACE FUNCTION public.list_devices_with_screenshot_info(p_listing_id UUID DEFAULT NULL)
RETURNS TABLE (
  device_id UUID,
  device_name TEXT,
  is_online BOOLEAN,
  last_seen TIMESTAMPTZ,
  minutes_since_heartbeat INTEGER,
  last_screenshot_url TEXT,
  last_screenshot_at TIMESTAMPTZ,
  screenshot_age_minutes INTEGER,
  needs_screenshot_update BOOLEAN,
  location_id UUID,
  location_name TEXT,
  screen_group_id UUID,
  screen_group_name TEXT,
  active_scene_id UUID,
  active_scene_name TEXT,
  assigned_schedule_id UUID,
  assigned_schedule_name TEXT,
  has_warning BOOLEAN,
  -- New cache status fields
  cached_scene_id UUID,
  cached_content_hash TEXT,
  last_cache_sync TIMESTAMPTZ,
  cache_status TEXT,
  is_offline_mode BOOLEAN,
  offline_since TIMESTAMPTZ,
  cache_age_minutes INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    d.id AS device_id,
    d.device_name,
    d.is_online,
    d.last_seen,
    EXTRACT(EPOCH FROM (now() - d.last_seen))::INTEGER / 60 AS minutes_since_heartbeat,
    d.last_screenshot_url,
    d.last_screenshot_at,
    EXTRACT(EPOCH FROM (now() - d.last_screenshot_at))::INTEGER / 60 AS screenshot_age_minutes,
    d.needs_screenshot_update,
    d.location_id,
    l.name AS location_name,
    d.screen_group_id,
    sg.name AS screen_group_name,
    d.active_scene_id,
    s.name AS active_scene_name,
    d.assigned_schedule_id,
    sch.name AS assigned_schedule_name,
    (
      NOT d.is_online OR
      EXTRACT(EPOCH FROM (now() - d.last_seen)) > 300 OR
      (d.last_screenshot_at IS NOT NULL AND EXTRACT(EPOCH FROM (now() - d.last_screenshot_at)) > 1800)
    ) AS has_warning,
    -- Cache status fields
    d.cached_scene_id,
    d.cached_content_hash,
    d.last_cache_sync,
    d.cache_status,
    d.is_offline_mode,
    d.offline_since,
    EXTRACT(EPOCH FROM (now() - d.last_cache_sync))::INTEGER / 60 AS cache_age_minutes
  FROM tv_devices d
  LEFT JOIN locations l ON d.location_id = l.id
  LEFT JOIN screen_groups sg ON d.screen_group_id = sg.id
  LEFT JOIN scenes s ON d.active_scene_id = s.id
  LEFT JOIN schedules sch ON d.assigned_schedule_id = sch.id
  WHERE (p_listing_id IS NULL OR d.listing_id = p_listing_id)
  ORDER BY
    d.is_online DESC,
    d.device_name;
END;
$$;

GRANT EXECUTE ON FUNCTION public.list_devices_with_screenshot_info(UUID) TO authenticated;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
