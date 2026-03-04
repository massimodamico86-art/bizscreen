-- Migration: 161_api_gateway_rpcs.sql
-- Phase 110: Enterprise Platform - API Gateway
-- Tenant-scoped SECURITY DEFINER RPCs for the public REST API gateway.
-- Every RPC takes p_tenant_id as first parameter (from validated token, never from request body).
--
-- Requirements: API-02, API-04, API-07

-- ============================================
-- 1. api_list_screens
-- ============================================
-- Returns paginated list of screens for a tenant.

CREATE OR REPLACE FUNCTION public.api_list_screens(
  p_tenant_id UUID,
  p_limit INT DEFAULT 50,
  p_offset INT DEFAULT 0
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_items JSONB;
  v_total_count BIGINT;
BEGIN
  SELECT COUNT(*) INTO v_total_count
  FROM public.tv_devices
  WHERE owner_id = p_tenant_id;

  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'id', d.id,
      'name', d.device_name,
      'is_online', d.is_online,
      'orientation', d.orientation,
      'assigned_playlist_id', d.assigned_playlist_id,
      'timezone', d.timezone,
      'last_seen', d.last_seen,
      'created_at', d.created_at
    ) ORDER BY d.created_at DESC
  ), '[]'::jsonb) INTO v_items
  FROM public.tv_devices d
  WHERE d.owner_id = p_tenant_id
  ORDER BY d.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;

  RETURN jsonb_build_object(
    'items', v_items,
    'total_count', v_total_count
  );
END;
$$;

-- ============================================
-- 2. api_get_screen
-- ============================================
-- Returns a single screen by ID, scoped to tenant.

CREATE OR REPLACE FUNCTION public.api_get_screen(
  p_tenant_id UUID,
  p_screen_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_screen JSONB;
BEGIN
  SELECT jsonb_build_object(
    'id', d.id,
    'name', d.device_name,
    'is_online', d.is_online,
    'orientation', d.orientation,
    'assigned_playlist_id', d.assigned_playlist_id,
    'assigned_layout_id', d.assigned_layout_id,
    'assigned_schedule_id', d.assigned_schedule_id,
    'timezone', d.timezone,
    'last_seen', d.last_seen,
    'is_paired', d.is_paired,
    'created_at', d.created_at,
    'updated_at', d.updated_at
  ) INTO v_screen
  FROM public.tv_devices d
  WHERE d.id = p_screen_id
    AND d.owner_id = p_tenant_id;

  RETURN v_screen; -- NULL if not found
END;
$$;

-- ============================================
-- 3. api_list_playlists
-- ============================================
-- Returns paginated list of playlists for a tenant.

CREATE OR REPLACE FUNCTION public.api_list_playlists(
  p_tenant_id UUID,
  p_limit INT DEFAULT 50,
  p_offset INT DEFAULT 0
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_items JSONB;
  v_total_count BIGINT;
BEGIN
  SELECT COUNT(*) INTO v_total_count
  FROM public.playlists
  WHERE owner_id = p_tenant_id;

  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'id', p.id,
      'name', p.name,
      'description', p.description,
      'item_count', (
        SELECT COUNT(*) FROM public.playlist_items pi
        WHERE pi.playlist_id = p.id
      ),
      'created_at', p.created_at,
      'updated_at', p.updated_at
    ) ORDER BY p.created_at DESC
  ), '[]'::jsonb) INTO v_items
  FROM public.playlists p
  WHERE p.owner_id = p_tenant_id
  ORDER BY p.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;

  RETURN jsonb_build_object(
    'items', v_items,
    'total_count', v_total_count
  );
END;
$$;

-- ============================================
-- 4. api_get_playlist
-- ============================================
-- Returns a single playlist with its items, scoped to tenant.

CREATE OR REPLACE FUNCTION public.api_get_playlist(
  p_tenant_id UUID,
  p_playlist_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_playlist JSONB;
  v_items JSONB;
BEGIN
  SELECT jsonb_build_object(
    'id', p.id,
    'name', p.name,
    'description', p.description,
    'default_duration', p.default_duration,
    'transition_effect', p.transition_effect,
    'shuffle', p.shuffle,
    'created_at', p.created_at,
    'updated_at', p.updated_at
  ) INTO v_playlist
  FROM public.playlists p
  WHERE p.id = p_playlist_id
    AND p.owner_id = p_tenant_id;

  IF v_playlist IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'id', pi.id,
      'item_type', pi.item_type,
      'item_id', pi.item_id,
      'position', pi.position,
      'duration', pi.duration,
      'item_name', COALESCE(ma.name, ''),
      'item_url', COALESCE(ma.url, ''),
      'item_thumbnail', COALESCE(ma.thumbnail_url, '')
    ) ORDER BY pi.position ASC
  ), '[]'::jsonb) INTO v_items
  FROM public.playlist_items pi
  LEFT JOIN public.media_assets ma ON ma.id = pi.item_id
  WHERE pi.playlist_id = p_playlist_id;

  RETURN v_playlist || jsonb_build_object('items', v_items);
END;
$$;

-- ============================================
-- 5. api_update_playlist
-- ============================================
-- Updates playlist fields where non-null. Returns updated record.
-- Fails if playlist not owned by tenant.

CREATE OR REPLACE FUNCTION public.api_update_playlist(
  p_tenant_id UUID,
  p_playlist_id UUID,
  p_name TEXT DEFAULT NULL,
  p_description TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_playlist JSONB;
BEGIN
  -- Verify ownership
  IF NOT EXISTS (
    SELECT 1 FROM public.playlists
    WHERE id = p_playlist_id AND owner_id = p_tenant_id
  ) THEN
    RETURN NULL;
  END IF;

  UPDATE public.playlists
  SET
    name = COALESCE(p_name, name),
    description = COALESCE(p_description, description),
    updated_at = NOW()
  WHERE id = p_playlist_id
    AND owner_id = p_tenant_id;

  SELECT jsonb_build_object(
    'id', p.id,
    'name', p.name,
    'description', p.description,
    'default_duration', p.default_duration,
    'transition_effect', p.transition_effect,
    'shuffle', p.shuffle,
    'created_at', p.created_at,
    'updated_at', p.updated_at
  ) INTO v_playlist
  FROM public.playlists p
  WHERE p.id = p_playlist_id;

  RETURN v_playlist;
END;
$$;

-- ============================================
-- 6. api_list_media
-- ============================================
-- Returns paginated list of media assets for a tenant.

CREATE OR REPLACE FUNCTION public.api_list_media(
  p_tenant_id UUID,
  p_limit INT DEFAULT 50,
  p_offset INT DEFAULT 0
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_items JSONB;
  v_total_count BIGINT;
BEGIN
  SELECT COUNT(*) INTO v_total_count
  FROM public.media_assets
  WHERE owner_id = p_tenant_id;

  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'id', m.id,
      'name', m.name,
      'type', m.type,
      'url', m.url,
      'thumbnail_url', m.thumbnail_url,
      'file_size', m.file_size,
      'mime_type', m.mime_type,
      'duration', m.duration,
      'width', m.width,
      'height', m.height,
      'created_at', m.created_at
    ) ORDER BY m.created_at DESC
  ), '[]'::jsonb) INTO v_items
  FROM public.media_assets m
  WHERE m.owner_id = p_tenant_id
  ORDER BY m.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;

  RETURN jsonb_build_object(
    'items', v_items,
    'total_count', v_total_count
  );
END;
$$;

-- ============================================
-- 7. api_update_screen_assignment
-- ============================================
-- Updates a screen's assigned playlist. Validates both screen and playlist belong to tenant.

CREATE OR REPLACE FUNCTION public.api_update_screen_assignment(
  p_tenant_id UUID,
  p_screen_id UUID,
  p_playlist_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_screen JSONB;
BEGIN
  -- Verify screen ownership
  IF NOT EXISTS (
    SELECT 1 FROM public.tv_devices
    WHERE id = p_screen_id AND owner_id = p_tenant_id
  ) THEN
    RETURN jsonb_build_object('error', 'Screen not found or not owned by tenant');
  END IF;

  -- Verify playlist ownership (if not null)
  IF p_playlist_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.playlists
    WHERE id = p_playlist_id AND owner_id = p_tenant_id
  ) THEN
    RETURN jsonb_build_object('error', 'Playlist not found or not owned by tenant');
  END IF;

  UPDATE public.tv_devices
  SET
    assigned_playlist_id = p_playlist_id,
    updated_at = NOW()
  WHERE id = p_screen_id
    AND owner_id = p_tenant_id;

  SELECT jsonb_build_object(
    'id', d.id,
    'name', d.device_name,
    'assigned_playlist_id', d.assigned_playlist_id,
    'updated_at', d.updated_at
  ) INTO v_screen
  FROM public.tv_devices d
  WHERE d.id = p_screen_id;

  RETURN v_screen;
END;
$$;

-- ============================================
-- 8. api_create_media_record
-- ============================================
-- Inserts a media_assets record after S3 upload completes.
-- Returns the created record with id.

CREATE OR REPLACE FUNCTION public.api_create_media_record(
  p_tenant_id UUID,
  p_name TEXT,
  p_type TEXT,
  p_file_url TEXT,
  p_file_size BIGINT DEFAULT 0
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_media JSONB;
  v_new_id UUID;
BEGIN
  -- Validate type
  IF p_type NOT IN ('image', 'video', 'audio', 'document', 'web_page', 'app') THEN
    RETURN jsonb_build_object('error', 'Invalid media type. Must be one of: image, video, audio, document, web_page, app');
  END IF;

  INSERT INTO public.media_assets (
    owner_id,
    name,
    type,
    url,
    file_size,
    created_at,
    updated_at
  ) VALUES (
    p_tenant_id,
    p_name,
    p_type,
    p_file_url,
    p_file_size::INTEGER,
    NOW(),
    NOW()
  )
  RETURNING id INTO v_new_id;

  SELECT jsonb_build_object(
    'id', m.id,
    'name', m.name,
    'type', m.type,
    'url', m.url,
    'file_size', m.file_size,
    'created_at', m.created_at
  ) INTO v_media
  FROM public.media_assets m
  WHERE m.id = v_new_id;

  RETURN v_media;
END;
$$;

-- ============================================
-- 9. PERMISSIONS
-- ============================================
-- All RPCs are service_role only (Edge Function uses service_role_key)

GRANT EXECUTE ON FUNCTION api_list_screens(UUID, INT, INT) TO service_role;
GRANT EXECUTE ON FUNCTION api_get_screen(UUID, UUID) TO service_role;
GRANT EXECUTE ON FUNCTION api_list_playlists(UUID, INT, INT) TO service_role;
GRANT EXECUTE ON FUNCTION api_get_playlist(UUID, UUID) TO service_role;
GRANT EXECUTE ON FUNCTION api_update_playlist(UUID, UUID, TEXT, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION api_list_media(UUID, INT, INT) TO service_role;
GRANT EXECUTE ON FUNCTION api_update_screen_assignment(UUID, UUID, UUID) TO service_role;
GRANT EXECUTE ON FUNCTION api_create_media_record(UUID, TEXT, TEXT, TEXT, BIGINT) TO service_role;

-- ============================================
-- 10. COMMENTS
-- ============================================

COMMENT ON FUNCTION api_list_screens IS 'API Gateway: List screens for a tenant (paginated)';
COMMENT ON FUNCTION api_get_screen IS 'API Gateway: Get single screen by ID (tenant-scoped)';
COMMENT ON FUNCTION api_list_playlists IS 'API Gateway: List playlists for a tenant (paginated)';
COMMENT ON FUNCTION api_get_playlist IS 'API Gateway: Get playlist with items (tenant-scoped)';
COMMENT ON FUNCTION api_update_playlist IS 'API Gateway: Update playlist name/description (tenant-scoped)';
COMMENT ON FUNCTION api_list_media IS 'API Gateway: List media assets for a tenant (paginated)';
COMMENT ON FUNCTION api_update_screen_assignment IS 'API Gateway: Assign playlist to screen (tenant-scoped)';
COMMENT ON FUNCTION api_create_media_record IS 'API Gateway: Create media record after S3 upload (tenant-scoped)';
