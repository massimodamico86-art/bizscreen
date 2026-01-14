-- Migration 062: Fix user_preferences table and playlist_items relationship
--
-- Issues fixed:
-- 1. user_preferences table doesn't exist (used by template instantiation functions)
-- 2. playlist_items has no direct FK to media_assets (PostgREST can't resolve relationship)

-- ============================================================================
-- 1. Create user_preferences table for key-value settings (like impersonation)
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_preferences (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  key text NOT NULL,
  value text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, key)
);

-- Create index for fast lookups
CREATE INDEX IF NOT EXISTS idx_user_preferences_user_key ON user_preferences(user_id, key);

-- RLS policies for user_preferences
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own preferences" ON user_preferences;
CREATE POLICY "Users can view their own preferences" ON user_preferences
  FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can insert their own preferences" ON user_preferences;
CREATE POLICY "Users can insert their own preferences" ON user_preferences
  FOR INSERT WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update their own preferences" ON user_preferences;
CREATE POLICY "Users can update their own preferences" ON user_preferences
  FOR UPDATE USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can delete their own preferences" ON user_preferences;
CREATE POLICY "Users can delete their own preferences" ON user_preferences
  FOR DELETE USING (user_id = auth.uid());

-- ============================================================================
-- 2. Add media_asset_id column to playlist_items with proper FK
-- ============================================================================

-- Add the column
ALTER TABLE playlist_items
ADD COLUMN IF NOT EXISTS media_asset_id uuid REFERENCES media_assets(id) ON DELETE CASCADE;

-- Create index for the new column
CREATE INDEX IF NOT EXISTS idx_playlist_items_media_asset_id
ON playlist_items(media_asset_id) WHERE media_asset_id IS NOT NULL;

-- Migrate existing data: populate media_asset_id from item_id where item_type = 'media'
UPDATE playlist_items
SET media_asset_id = item_id
WHERE item_type = 'media' AND media_asset_id IS NULL;

-- Add a trigger to keep media_asset_id in sync with item_id for media items
CREATE OR REPLACE FUNCTION sync_playlist_item_media_asset_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.item_type = 'media' THEN
    NEW.media_asset_id := NEW.item_id;
  ELSE
    NEW.media_asset_id := NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS sync_media_asset_id_trigger ON playlist_items;
CREATE TRIGGER sync_media_asset_id_trigger
  BEFORE INSERT OR UPDATE ON playlist_items
  FOR EACH ROW EXECUTE FUNCTION sync_playlist_item_media_asset_id();

-- ============================================================================
-- Comments
-- ============================================================================

COMMENT ON TABLE user_preferences IS 'Key-value store for user preferences like impersonation settings';
COMMENT ON COLUMN user_preferences.key IS 'Preference key (e.g., impersonating_tenant_id)';
COMMENT ON COLUMN user_preferences.value IS 'Preference value as text';

COMMENT ON COLUMN playlist_items.media_asset_id IS 'Direct FK to media_assets for PostgREST relationship resolution';

DO $$ BEGIN RAISE NOTICE 'Migration 062 completed: user_preferences table and playlist_items.media_asset_id added'; END $$;
