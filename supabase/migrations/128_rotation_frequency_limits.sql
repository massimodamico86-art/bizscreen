-- Migration 128: Rotation and Frequency Limits
-- Add content rotation controls and frequency limits to campaigns
-- Phase 16 Plan 02: Rotation and Frequency Controls

-- =============================================================================
-- ROTATION COLUMNS
-- =============================================================================

-- Add rotation mode to campaign_contents
-- Determines how content rotation is calculated within a campaign
ALTER TABLE campaign_contents
ADD COLUMN IF NOT EXISTS rotation_mode TEXT DEFAULT 'weight'
  CHECK (rotation_mode IN ('weight', 'percentage', 'sequence', 'random'));

-- Add explicit rotation percentage to campaign_contents
-- Used when rotation_mode is 'percentage' for explicit % allocation
ALTER TABLE campaign_contents
ADD COLUMN IF NOT EXISTS rotation_percentage INT DEFAULT NULL
  CHECK (rotation_percentage IS NULL OR (rotation_percentage >= 0 AND rotation_percentage <= 100));

COMMENT ON COLUMN campaign_contents.rotation_mode IS
'Content rotation method: weight=proportional by weight, percentage=explicit %, sequence=play in order, random=random selection';

COMMENT ON COLUMN campaign_contents.rotation_percentage IS
'Explicit percentage (0-100). Used when rotation_mode is percentage. All percentages per campaign should sum to 100 (validated in application).';

-- =============================================================================
-- FREQUENCY LIMIT COLUMNS
-- =============================================================================

-- Add frequency limits to campaign_contents
-- These limit how often specific content can play per screen
ALTER TABLE campaign_contents
ADD COLUMN IF NOT EXISTS max_plays_per_hour INT DEFAULT NULL
  CHECK (max_plays_per_hour IS NULL OR max_plays_per_hour > 0),
ADD COLUMN IF NOT EXISTS max_plays_per_day INT DEFAULT NULL
  CHECK (max_plays_per_day IS NULL OR max_plays_per_day > 0);

COMMENT ON COLUMN campaign_contents.max_plays_per_hour IS
'Maximum times this content can play per hour per screen. NULL = unlimited.';

COMMENT ON COLUMN campaign_contents.max_plays_per_day IS
'Maximum times this content can play per day per screen. NULL = unlimited.';

-- =============================================================================
-- CAMPAIGN-LEVEL DEFAULTS
-- =============================================================================

-- Add campaign-level default frequency limits
-- These apply to all content items that don't have individual limits set
ALTER TABLE campaigns
ADD COLUMN IF NOT EXISTS default_max_plays_per_hour INT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS default_max_plays_per_day INT DEFAULT NULL;

COMMENT ON COLUMN campaigns.default_max_plays_per_hour IS
'Default max plays per hour for all content in this campaign. NULL = unlimited.';

COMMENT ON COLUMN campaigns.default_max_plays_per_day IS
'Default max plays per day for all content in this campaign. NULL = unlimited.';
