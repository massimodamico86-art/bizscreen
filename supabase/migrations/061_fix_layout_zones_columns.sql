-- Add missing columns to layout_zones table for playlist/media assignments
-- The service expects these columns for direct FK relationships

-- Add assigned_playlist_id column with FK to playlists
ALTER TABLE layout_zones
ADD COLUMN IF NOT EXISTS assigned_playlist_id uuid REFERENCES playlists(id) ON DELETE SET NULL;

-- Add assigned_media_id column with FK to media_assets
ALTER TABLE layout_zones
ADD COLUMN IF NOT EXISTS assigned_media_id uuid REFERENCES media_assets(id) ON DELETE SET NULL;

-- Create indexes for the new columns
CREATE INDEX IF NOT EXISTS idx_layout_zones_playlist_id ON layout_zones(assigned_playlist_id) WHERE assigned_playlist_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_layout_zones_media_id ON layout_zones(assigned_media_id) WHERE assigned_media_id IS NOT NULL;

-- Update RLS policies remain the same since they're based on layout_id

COMMENT ON COLUMN layout_zones.assigned_playlist_id IS 'Direct FK to playlists table for zone content';
COMMENT ON COLUMN layout_zones.assigned_media_id IS 'Direct FK to media_assets table for zone content';

DO $$ BEGIN RAISE NOTICE 'Layout zones columns added successfully'; END $$;
