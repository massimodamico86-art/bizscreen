-- Migration 090: Fix schedule_entries schema for Yodeck-style scheduling
--
-- The schedule_entries table needs an is_active column and the service
-- needs to work with the existing schema properly.

-- ============================================================================
-- 1. Add is_active column to schedule_entries
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'schedule_entries' AND column_name = 'is_active'
  ) THEN
    ALTER TABLE schedule_entries ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT true;
  END IF;
END $$;

-- ============================================================================
-- 2. Add repeat_type and repeat_config for Yodeck-style repeat options
-- ============================================================================

DO $$
BEGIN
  -- repeat_type: 'none', 'daily', 'weekday', 'weekly', 'monthly', 'yearly', 'custom'
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'schedule_entries' AND column_name = 'repeat_type'
  ) THEN
    ALTER TABLE schedule_entries ADD COLUMN repeat_type TEXT DEFAULT 'none';
  END IF;

  -- repeat_config: JSONB for custom repeat settings (e.g., repeat_every, repeat_until)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'schedule_entries' AND column_name = 'repeat_config'
  ) THEN
    ALTER TABLE schedule_entries ADD COLUMN repeat_config JSONB DEFAULT '{}';
  END IF;

  -- event_type: 'content' or 'screen_off'
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'schedule_entries' AND column_name = 'event_type'
  ) THEN
    ALTER TABLE schedule_entries ADD COLUMN event_type TEXT DEFAULT 'content';
  END IF;
END $$;

-- ============================================================================
-- 3. Create index on is_active for faster queries
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_schedule_entries_is_active ON schedule_entries(is_active);

-- ============================================================================
-- 4. Update any null content_type or content_id to work with existing entries
-- ============================================================================

-- Allow null content_id for screen_off events
ALTER TABLE schedule_entries ALTER COLUMN content_id DROP NOT NULL;
ALTER TABLE schedule_entries ALTER COLUMN content_type DROP NOT NULL;

-- Set default content_type to 'playlist' if null
UPDATE schedule_entries SET content_type = 'playlist' WHERE content_type IS NULL;

-- ============================================================================
-- Comments
-- ============================================================================

COMMENT ON COLUMN schedule_entries.is_active IS 'Whether this schedule entry is currently active';
COMMENT ON COLUMN schedule_entries.repeat_type IS 'Repeat pattern: none, daily, weekday, weekly, monthly, yearly, custom';
COMMENT ON COLUMN schedule_entries.repeat_config IS 'Custom repeat configuration (repeat_every, repeat_until, etc.)';
COMMENT ON COLUMN schedule_entries.event_type IS 'Event type: content (play content) or screen_off (turn screen off)';

DO $$ BEGIN RAISE NOTICE 'Migration 090 completed: Fixed schedule_entries schema for Yodeck-style scheduling'; END $$;
