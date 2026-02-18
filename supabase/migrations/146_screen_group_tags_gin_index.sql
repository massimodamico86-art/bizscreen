-- GIN index on screen_groups.tags for efficient array containment queries
-- Supports @> operator used by Supabase .contains() for tag filtering
CREATE INDEX IF NOT EXISTS idx_screen_groups_tags ON screen_groups USING GIN(tags);
