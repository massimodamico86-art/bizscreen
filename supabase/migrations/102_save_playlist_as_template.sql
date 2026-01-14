-- Migration: Save Playlist as Template
-- Purpose: Allow users to save their playlists as reusable templates

-- ============================================================================
-- Create RPC function to save a playlist as a template
-- ============================================================================

CREATE OR REPLACE FUNCTION public.save_playlist_as_template(
  p_playlist_id UUID,
  p_name TEXT,
  p_description TEXT DEFAULT NULL,
  p_category_id UUID DEFAULT NULL,
  p_thumbnail_url TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_playlist RECORD;
  v_template_id UUID;
  v_template_slug TEXT;
  v_blueprint JSONB;
  v_items JSONB;
  v_item RECORD;
BEGIN
  -- Get current user
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Fetch the playlist (ensure user owns it or is admin)
  SELECT p.* INTO v_playlist
  FROM playlists p
  WHERE p.id = p_playlist_id
    AND (
      p.owner_id = v_user_id
      OR is_super_admin()
      OR (is_admin() AND p.owner_id IN (SELECT client_id FROM get_my_client_ids()))
    );

  IF v_playlist IS NULL THEN
    RAISE EXCEPTION 'Playlist not found or access denied: %', p_playlist_id;
  END IF;

  -- Generate unique slug from name
  v_template_slug := regexp_replace(lower(p_name), '[^a-z0-9]+', '_', 'g') || '_' || substr(gen_random_uuid()::text, 1, 8);

  -- Build the items array for the blueprint
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'item_type', pi.item_type,
      'media_url', CASE WHEN pi.item_type = 'media' THEN ma.url ELSE NULL END,
      'media_name', CASE WHEN pi.item_type = 'media' THEN ma.name ELSE NULL END,
      'media_type', CASE WHEN pi.item_type = 'media' THEN ma.asset_type ELSE NULL END,
      'duration', pi.duration,
      'transition', pi.transition,
      'config', CASE WHEN pi.item_type = 'app' THEN ma.config_json ELSE NULL END,
      'app_type', CASE WHEN pi.item_type = 'app' THEN ma.asset_type ELSE NULL END
    ) ORDER BY pi.sort_order
  ), '[]'::jsonb) INTO v_items
  FROM playlist_items pi
  LEFT JOIN media_assets ma ON ma.id = pi.media_asset_id
  WHERE pi.playlist_id = p_playlist_id;

  -- Build the blueprint
  v_blueprint := jsonb_build_object(
    'name', v_playlist.name,
    'description', v_playlist.description,
    'default_duration', v_playlist.default_duration,
    'transition_effect', v_playlist.transition_effect,
    'shuffle', v_playlist.shuffle,
    'items', v_items
  );

  -- Create the template
  INSERT INTO content_templates (
    category_id,
    type,
    slug,
    name,
    description,
    thumbnail_url,
    is_active,
    sort_order,
    meta
  ) VALUES (
    p_category_id,
    'playlist',
    v_template_slug,
    p_name,
    COALESCE(p_description, v_playlist.description),
    p_thumbnail_url,
    true,
    0,
    jsonb_build_object(
      'created_from_playlist', p_playlist_id,
      'created_by', v_user_id,
      'item_count', jsonb_array_length(v_items)
    )
  ) RETURNING id INTO v_template_id;

  -- Create the blueprint record
  INSERT INTO content_template_blueprints (
    template_id,
    blueprint_type,
    blueprint
  ) VALUES (
    v_template_id,
    'playlist',
    v_blueprint
  );

  -- Return the created template info
  RETURN jsonb_build_object(
    'success', true,
    'template_id', v_template_id,
    'template_slug', v_template_slug,
    'template_name', p_name,
    'item_count', jsonb_array_length(v_items)
  );
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.save_playlist_as_template(UUID, TEXT, TEXT, UUID, TEXT) TO authenticated;

-- Add RLS policies for template management (admins only can INSERT)
DROP POLICY IF EXISTS "Admins can create templates" ON public.content_templates;
CREATE POLICY "Admins can create templates"
  ON public.content_templates FOR INSERT
  TO authenticated
  WITH CHECK (
    is_admin() OR is_super_admin()
  );

DROP POLICY IF EXISTS "Admins can update templates" ON public.content_templates;
CREATE POLICY "Admins can update templates"
  ON public.content_templates FOR UPDATE
  TO authenticated
  USING (
    is_admin() OR is_super_admin()
  );

DROP POLICY IF EXISTS "Admins can delete templates" ON public.content_templates;
CREATE POLICY "Admins can delete templates"
  ON public.content_templates FOR DELETE
  TO authenticated
  USING (
    is_admin() OR is_super_admin()
  );

-- Same for blueprints
DROP POLICY IF EXISTS "Admins can create blueprints" ON public.content_template_blueprints;
CREATE POLICY "Admins can create blueprints"
  ON public.content_template_blueprints FOR INSERT
  TO authenticated
  WITH CHECK (
    is_admin() OR is_super_admin()
  );

DROP POLICY IF EXISTS "Admins can update blueprints" ON public.content_template_blueprints;
CREATE POLICY "Admins can update blueprints"
  ON public.content_template_blueprints FOR UPDATE
  TO authenticated
  USING (
    is_admin() OR is_super_admin()
  );

DROP POLICY IF EXISTS "Admins can delete blueprints" ON public.content_template_blueprints;
CREATE POLICY "Admins can delete blueprints"
  ON public.content_template_blueprints FOR DELETE
  TO authenticated
  USING (
    is_admin() OR is_super_admin()
  );

-- Add comment
COMMENT ON FUNCTION save_playlist_as_template IS 'Save a playlist as a reusable template. Creates content_template and blueprint records.';

DO $$ BEGIN RAISE NOTICE 'Save Playlist as Template RPC created successfully'; END $$;
