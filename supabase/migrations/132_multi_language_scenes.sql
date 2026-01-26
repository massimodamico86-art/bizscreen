-- ============================================
-- Migration 132: Multi-Language Scene Support
-- ============================================
-- Adds language variant support for scenes:
-- 1. scene_language_groups table to link scene variants
-- 2. language_code and language_group_id columns on scenes
-- 3. display_language column on tv_devices
-- 4. RPC for language-aware content resolution
-- ============================================

-- ============================================
-- 1. Create scene_language_groups table
-- ============================================

CREATE TABLE IF NOT EXISTS scene_language_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  default_language text NOT NULL DEFAULT 'en',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Add updated_at trigger
DROP TRIGGER IF EXISTS update_scene_language_groups_updated_at ON scene_language_groups;
CREATE TRIGGER update_scene_language_groups_updated_at
  BEFORE UPDATE ON scene_language_groups
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add constraint for valid default language
ALTER TABLE scene_language_groups
ADD CONSTRAINT scene_language_groups_default_language_valid
CHECK (is_valid_locale(default_language));

-- Create index for tenant lookups
CREATE INDEX IF NOT EXISTS idx_scene_language_groups_tenant
ON scene_language_groups(tenant_id);

COMMENT ON TABLE scene_language_groups IS 'Links scene variants across languages. Each group represents one "conceptual" scene with translations.';
COMMENT ON COLUMN scene_language_groups.default_language IS 'Fallback language when device language variant is missing';

-- ============================================
-- 2. Add columns to scenes table
-- ============================================

ALTER TABLE scenes
ADD COLUMN IF NOT EXISTS language_group_id uuid REFERENCES scene_language_groups(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS language_code text DEFAULT NULL;

-- Add constraint for valid language code on scenes
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.check_constraints
    WHERE constraint_name = 'scenes_language_code_valid'
  ) THEN
    ALTER TABLE scenes
    ADD CONSTRAINT scenes_language_code_valid
    CHECK (language_code IS NULL OR is_valid_locale(language_code));
  END IF;
END $$;

-- Create indexes for language lookups
CREATE INDEX IF NOT EXISTS idx_scenes_language_group
ON scenes(language_group_id) WHERE language_group_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_scenes_language_code
ON scenes(language_code) WHERE language_code IS NOT NULL;

COMMENT ON COLUMN scenes.language_group_id IS 'Links this scene to other language variants in the same group';
COMMENT ON COLUMN scenes.language_code IS 'Language code for this scene variant (e.g., en, es, fr)';

-- ============================================
-- 3. Add display_language to tv_devices
-- ============================================

ALTER TABLE tv_devices
ADD COLUMN IF NOT EXISTS display_language text NOT NULL DEFAULT 'en';

-- Add constraint for valid display language
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.check_constraints
    WHERE constraint_name = 'tv_devices_display_language_valid'
  ) THEN
    ALTER TABLE tv_devices
    ADD CONSTRAINT tv_devices_display_language_valid
    CHECK (is_valid_locale(display_language));
  END IF;
END $$;

COMMENT ON COLUMN tv_devices.display_language IS 'Preferred display language for this device. Used to select scene language variant.';

-- ============================================
-- 4. Enable RLS on scene_language_groups
-- ============================================

ALTER TABLE scene_language_groups ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (for idempotence)
DROP POLICY IF EXISTS "scene_language_groups_select_own" ON scene_language_groups;
DROP POLICY IF EXISTS "scene_language_groups_insert_own" ON scene_language_groups;
DROP POLICY IF EXISTS "scene_language_groups_update_own" ON scene_language_groups;
DROP POLICY IF EXISTS "scene_language_groups_delete_own" ON scene_language_groups;

-- SELECT: Users can view their own language groups
CREATE POLICY "scene_language_groups_select_own"
  ON scene_language_groups FOR SELECT
  USING (tenant_id = auth.uid() OR is_super_admin());

-- INSERT: Users can create language groups for themselves
CREATE POLICY "scene_language_groups_insert_own"
  ON scene_language_groups FOR INSERT
  WITH CHECK (tenant_id = auth.uid() OR is_super_admin());

-- UPDATE: Users can update their own language groups
CREATE POLICY "scene_language_groups_update_own"
  ON scene_language_groups FOR UPDATE
  USING (tenant_id = auth.uid() OR is_super_admin())
  WITH CHECK (tenant_id = auth.uid() OR is_super_admin());

-- DELETE: Users can delete their own language groups
CREATE POLICY "scene_language_groups_delete_own"
  ON scene_language_groups FOR DELETE
  USING (tenant_id = auth.uid() OR is_super_admin());

-- ============================================
-- 5. RPC: Get scene for device language
-- ============================================

CREATE OR REPLACE FUNCTION get_scene_for_device_language(
  p_scene_id uuid,
  p_device_language text DEFAULT 'en'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_scene RECORD;
  v_variant_id uuid;
  v_default_variant_id uuid;
BEGIN
  -- Get the requested scene with its language group
  SELECT id, language_group_id, language_code
  INTO v_scene
  FROM scenes
  WHERE id = p_scene_id;

  -- If scene not found, return NULL (caller should handle)
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  -- If no language group, return the original scene as-is
  IF v_scene.language_group_id IS NULL THEN
    RETURN p_scene_id;
  END IF;

  -- Try to find variant matching device language
  SELECT id INTO v_variant_id
  FROM scenes
  WHERE language_group_id = v_scene.language_group_id
    AND language_code = p_device_language
  LIMIT 1;

  IF v_variant_id IS NOT NULL THEN
    RETURN v_variant_id;
  END IF;

  -- Fallback: get the default language variant from the group
  SELECT s.id INTO v_default_variant_id
  FROM scenes s
  JOIN scene_language_groups g ON s.language_group_id = g.id
  WHERE s.language_group_id = v_scene.language_group_id
    AND s.language_code = g.default_language
  LIMIT 1;

  -- Ultimate fallback: return original scene (never return NULL for valid input)
  RETURN COALESCE(v_default_variant_id, p_scene_id);
END;
$$;

COMMENT ON FUNCTION get_scene_for_device_language IS 'Resolves the correct scene variant based on device language preference. Falls back to default language, then original scene.';

-- ============================================
-- 6. Grant permissions
-- ============================================

GRANT SELECT, INSERT, UPDATE, DELETE ON scene_language_groups TO authenticated;
GRANT EXECUTE ON FUNCTION get_scene_for_device_language(uuid, text) TO authenticated;

-- ============================================
-- Done
-- ============================================

DO $$ BEGIN RAISE NOTICE 'Migration 132 completed: Multi-language scene support added'; END $$;
