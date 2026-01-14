-- Migration 067: Create scenes table and add onboarding tracking
--
-- This migration:
-- 1. Creates the scenes table for the new Scene concept
-- 2. Adds has_completed_onboarding to profiles for tracking AI onboarding

-- ============================================================================
-- 1. Create scenes table
-- ============================================================================

CREATE TABLE IF NOT EXISTS scenes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES profiles (id) ON DELETE CASCADE,
  name text NOT NULL,
  business_type text,  -- 'restaurant', 'salon', 'gym', 'retail', etc.
  layout_id uuid REFERENCES layouts (id) ON DELETE SET NULL,
  primary_playlist_id uuid REFERENCES playlists (id) ON DELETE SET NULL,
  secondary_playlist_id uuid REFERENCES playlists (id) ON DELETE SET NULL,
  settings jsonb DEFAULT '{}'::jsonb,  -- for future: widgets, theme, brand colors, etc.
  is_active boolean DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_scenes_tenant_id ON scenes(tenant_id);
CREATE INDEX IF NOT EXISTS idx_scenes_layout_id ON scenes(layout_id);
CREATE INDEX IF NOT EXISTS idx_scenes_business_type ON scenes(business_type);

-- Add updated_at trigger
DROP TRIGGER IF EXISTS update_scenes_updated_at ON scenes;
CREATE TRIGGER update_scenes_updated_at
  BEFORE UPDATE ON scenes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 2. Enable RLS on scenes
-- ============================================================================

ALTER TABLE scenes ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (for idempotence)
DROP POLICY IF EXISTS "scenes_select_own" ON scenes;
DROP POLICY IF EXISTS "scenes_insert_own" ON scenes;
DROP POLICY IF EXISTS "scenes_update_own" ON scenes;
DROP POLICY IF EXISTS "scenes_delete_own" ON scenes;
DROP POLICY IF EXISTS "scenes_super_admin_all" ON scenes;

-- Users can view their own scenes
CREATE POLICY "scenes_select_own"
  ON scenes FOR SELECT
  USING (tenant_id = auth.uid() OR is_super_admin());

-- Users can insert scenes for themselves
CREATE POLICY "scenes_insert_own"
  ON scenes FOR INSERT
  WITH CHECK (tenant_id = auth.uid() OR is_super_admin());

-- Users can update their own scenes
CREATE POLICY "scenes_update_own"
  ON scenes FOR UPDATE
  USING (tenant_id = auth.uid() OR is_super_admin())
  WITH CHECK (tenant_id = auth.uid() OR is_super_admin());

-- Users can delete their own scenes
CREATE POLICY "scenes_delete_own"
  ON scenes FOR DELETE
  USING (tenant_id = auth.uid() OR is_super_admin());

-- ============================================================================
-- 3. Add has_completed_onboarding to profiles
-- ============================================================================

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS has_completed_onboarding boolean NOT NULL DEFAULT false;

-- Add index for quick lookup
CREATE INDEX IF NOT EXISTS idx_profiles_onboarding ON profiles(has_completed_onboarding);

-- ============================================================================
-- 4. Grant permissions
-- ============================================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON scenes TO authenticated;

-- ============================================================================
-- Comments
-- ============================================================================

COMMENT ON TABLE scenes IS 'Stores TV scene configurations linking layouts, playlists, and business settings';
COMMENT ON COLUMN scenes.business_type IS 'Type of business: restaurant, salon, gym, retail, etc.';
COMMENT ON COLUMN scenes.settings IS 'JSON settings for widgets, theme, brand colors, etc.';
COMMENT ON COLUMN profiles.has_completed_onboarding IS 'Whether user has completed the AI autobuild onboarding';

DO $$ BEGIN RAISE NOTICE 'Migration 067 completed: scenes table and onboarding tracking added'; END $$;
