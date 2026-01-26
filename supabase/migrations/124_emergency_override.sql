-- Migration: 124_emergency_override.sql
-- Purpose: Add emergency content override columns to profiles table
-- Emergency content overrides all schedules/campaigns until manually stopped or duration expires

-- Add emergency columns to profiles table
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS emergency_content_id UUID,
ADD COLUMN IF NOT EXISTS emergency_content_type TEXT,
ADD COLUMN IF NOT EXISTS emergency_started_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS emergency_duration_minutes INTEGER;

-- Add constraint for valid content types
-- NULL is valid (no emergency active)
-- When set, must be one of: playlist, scene, media
ALTER TABLE profiles
ADD CONSTRAINT chk_emergency_content_type
CHECK (emergency_content_type IS NULL OR emergency_content_type IN ('playlist', 'scene', 'media'));

-- Add partial index for emergency lookups (only index rows with active emergencies)
CREATE INDEX IF NOT EXISTS idx_profiles_emergency
ON profiles (id)
WHERE emergency_content_id IS NOT NULL;

-- Comments for documentation
COMMENT ON COLUMN profiles.emergency_content_id IS 'UUID of content being shown during emergency (playlist, scene, or media)';
COMMENT ON COLUMN profiles.emergency_content_type IS 'Type of emergency content: playlist, scene, or media';
COMMENT ON COLUMN profiles.emergency_started_at IS 'When the emergency was activated';
COMMENT ON COLUMN profiles.emergency_duration_minutes IS 'Duration in minutes (NULL = until manually stopped)';
