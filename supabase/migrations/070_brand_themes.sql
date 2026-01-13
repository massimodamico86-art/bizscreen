-- Migration 070: Brand Themes for AI-Powered Brand Import System
--
-- This migration:
-- 1. Creates the brand_themes table to store brand identity themes
-- 2. Adds brand_theme_id to profiles for theme switching
-- 3. Creates RLS policies mirroring profile ownership
-- 4. Creates helper functions for theme application

-- ============================================================================
-- 1. Create brand_themes table
-- ============================================================================

CREATE TABLE IF NOT EXISTS brand_themes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Theme name for identification
  name text NOT NULL DEFAULT 'My Brand Theme',

  -- Logo and source image
  logo_url text,
  source_image_url text,

  -- Color palette
  primary_color text NOT NULL DEFAULT '#3B82F6',
  secondary_color text NOT NULL DEFAULT '#1D4ED8',
  accent_color text NOT NULL DEFAULT '#10B981',
  neutral_color text NOT NULL DEFAULT '#6B7280',

  -- Additional colors for comprehensive palette
  background_color text DEFAULT '#0F172A',
  text_primary_color text DEFAULT '#FFFFFF',
  text_secondary_color text DEFAULT '#94A3B8',

  -- Typography
  font_heading text NOT NULL DEFAULT 'Inter',
  font_body text NOT NULL DEFAULT 'Inter',

  -- Background styling options
  background_style jsonb NOT NULL DEFAULT '{
    "type": "solid",
    "color": "#0F172A",
    "gradient": null,
    "pattern": null
  }'::jsonb,

  -- Widget styling (for clock, date, weather)
  widget_style jsonb NOT NULL DEFAULT '{
    "textColor": "#FFFFFF",
    "backgroundColor": "transparent",
    "accentColor": "#3B82F6",
    "borderRadius": 8
  }'::jsonb,

  -- Block defaults (for new blocks in editor)
  block_defaults jsonb NOT NULL DEFAULT '{
    "text": {
      "color": "#FFFFFF",
      "fontFamily": "Inter"
    },
    "shape": {
      "fill": "#3B82F6",
      "borderRadius": 12
    }
  }'::jsonb,

  -- Is this the active theme for the profile?
  is_active boolean NOT NULL DEFAULT true,

  -- Timestamps
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Add indexes
CREATE INDEX IF NOT EXISTS brand_themes_profile_id_idx ON brand_themes(profile_id);
CREATE INDEX IF NOT EXISTS brand_themes_is_active_idx ON brand_themes(profile_id, is_active) WHERE is_active = true;

-- Add updated_at trigger
DROP TRIGGER IF EXISTS update_brand_themes_updated_at ON brand_themes;
CREATE TRIGGER update_brand_themes_updated_at
  BEFORE UPDATE ON brand_themes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 2. Add brand_theme_id to profiles
-- ============================================================================

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS active_brand_theme_id uuid REFERENCES brand_themes(id) ON DELETE SET NULL;

-- ============================================================================
-- 3. Enable RLS on brand_themes
-- ============================================================================

ALTER TABLE brand_themes ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (for idempotence)
DROP POLICY IF EXISTS "brand_themes_select_own" ON brand_themes;
DROP POLICY IF EXISTS "brand_themes_insert_own" ON brand_themes;
DROP POLICY IF EXISTS "brand_themes_update_own" ON brand_themes;
DROP POLICY IF EXISTS "brand_themes_delete_own" ON brand_themes;

-- Users can view their own themes
CREATE POLICY "brand_themes_select_own"
  ON brand_themes FOR SELECT
  USING (profile_id = auth.uid() OR is_super_admin());

-- Users can insert themes for themselves
CREATE POLICY "brand_themes_insert_own"
  ON brand_themes FOR INSERT
  WITH CHECK (profile_id = auth.uid() OR is_super_admin());

-- Users can update their own themes
CREATE POLICY "brand_themes_update_own"
  ON brand_themes FOR UPDATE
  USING (profile_id = auth.uid() OR is_super_admin())
  WITH CHECK (profile_id = auth.uid() OR is_super_admin());

-- Users can delete their own themes
CREATE POLICY "brand_themes_delete_own"
  ON brand_themes FOR DELETE
  USING (profile_id = auth.uid() OR is_super_admin());

-- ============================================================================
-- 4. Grant permissions
-- ============================================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON brand_themes TO authenticated;

-- ============================================================================
-- 5. Helper function to get active brand theme for a profile
-- ============================================================================

CREATE OR REPLACE FUNCTION get_active_brand_theme(p_profile_id uuid DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_profile_id uuid;
  v_result jsonb;
BEGIN
  -- Use provided profile_id or current user
  v_profile_id := COALESCE(p_profile_id, auth.uid());

  IF v_profile_id IS NULL THEN
    RETURN NULL;
  END IF;

  -- Get the active theme
  SELECT jsonb_build_object(
    'id', bt.id,
    'name', bt.name,
    'logo_url', bt.logo_url,
    'primary_color', bt.primary_color,
    'secondary_color', bt.secondary_color,
    'accent_color', bt.accent_color,
    'neutral_color', bt.neutral_color,
    'background_color', bt.background_color,
    'text_primary_color', bt.text_primary_color,
    'text_secondary_color', bt.text_secondary_color,
    'font_heading', bt.font_heading,
    'font_body', bt.font_body,
    'background_style', bt.background_style,
    'widget_style', bt.widget_style,
    'block_defaults', bt.block_defaults
  )
  INTO v_result
  FROM brand_themes bt
  WHERE bt.profile_id = v_profile_id
    AND bt.is_active = true
  ORDER BY bt.updated_at DESC
  LIMIT 1;

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION get_active_brand_theme(uuid) TO authenticated;

-- ============================================================================
-- 6. Function to apply brand theme to a scene
-- ============================================================================

CREATE OR REPLACE FUNCTION apply_brand_theme_to_scene(
  p_scene_id uuid,
  p_theme_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_theme brand_themes%ROWTYPE;
  v_scene scenes%ROWTYPE;
BEGIN
  -- Verify scene ownership
  SELECT * INTO v_scene
  FROM scenes
  WHERE id = p_scene_id
    AND (tenant_id = auth.uid() OR is_super_admin());

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  -- Get theme (verify ownership)
  SELECT * INTO v_theme
  FROM brand_themes
  WHERE id = p_theme_id
    AND (profile_id = auth.uid() OR is_super_admin());

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  -- Update all slides in the scene with theme colors
  UPDATE scene_slides ss
  SET
    design_json = jsonb_set(
      design_json,
      '{background}',
      jsonb_build_object(
        'type', 'solid',
        'color', v_theme.background_color
      )
    ),
    updated_at = now()
  WHERE ss.scene_id = p_scene_id;

  RETURN true;
END;
$$;

GRANT EXECUTE ON FUNCTION apply_brand_theme_to_scene(uuid, uuid) TO authenticated;

-- ============================================================================
-- 7. Trigger to ensure only one active theme per profile
-- ============================================================================

CREATE OR REPLACE FUNCTION ensure_single_active_theme()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- If setting this theme as active, deactivate others
  IF NEW.is_active = true THEN
    UPDATE brand_themes
    SET is_active = false
    WHERE profile_id = NEW.profile_id
      AND id != NEW.id
      AND is_active = true;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS ensure_single_active_theme_trigger ON brand_themes;
CREATE TRIGGER ensure_single_active_theme_trigger
  BEFORE INSERT OR UPDATE OF is_active ON brand_themes
  FOR EACH ROW
  WHEN (NEW.is_active = true)
  EXECUTE FUNCTION ensure_single_active_theme();

-- ============================================================================
-- Comments
-- ============================================================================

COMMENT ON TABLE brand_themes IS 'Stores brand identity themes with colors, fonts, and styling for consistent design across scenes';
COMMENT ON COLUMN brand_themes.primary_color IS 'Main brand color used for headers and primary elements';
COMMENT ON COLUMN brand_themes.secondary_color IS 'Secondary brand color for accents and supporting elements';
COMMENT ON COLUMN brand_themes.accent_color IS 'Accent color for highlights and call-to-action elements';
COMMENT ON COLUMN brand_themes.neutral_color IS 'Neutral color for backgrounds and subtle elements';
COMMENT ON COLUMN brand_themes.font_heading IS 'Google Font name for headings';
COMMENT ON COLUMN brand_themes.font_body IS 'Google Font name for body text';
COMMENT ON COLUMN brand_themes.background_style IS 'JSON config for background: type (solid/gradient), color, gradient stops';
COMMENT ON COLUMN brand_themes.widget_style IS 'JSON config for widget styling: colors, border radius';
COMMENT ON COLUMN brand_themes.block_defaults IS 'Default styling for new blocks in the editor';

DO $$ BEGIN RAISE NOTICE 'Migration 070 completed: brand_themes table and theme system added'; END $$;
