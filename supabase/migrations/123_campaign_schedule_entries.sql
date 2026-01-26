-- ============================================================================
-- Migration: 123_campaign_schedule_entries.sql
-- Description: Add campaign_id FK to schedule_entries for grouping entries
--              under campaigns for bulk management
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Add campaign_id column to schedule_entries
-- ----------------------------------------------------------------------------

-- Entry belongs to at most one campaign
-- Campaign deletion orphans entries (SET NULL), does not delete them
ALTER TABLE public.schedule_entries
    ADD COLUMN IF NOT EXISTS campaign_id UUID REFERENCES public.campaigns(id) ON DELETE SET NULL;

-- Index for efficient campaign lookups
CREATE INDEX IF NOT EXISTS idx_schedule_entries_campaign
    ON public.schedule_entries(campaign_id);

-- Comment explaining the relationship
COMMENT ON COLUMN public.schedule_entries.campaign_id IS
'Optional FK to campaigns table. Entry belongs to at most one campaign. NULL means entry is not part of any campaign. Campaign deletion sets this to NULL (orphans entry).';

-- ============================================================================
-- DONE
-- ============================================================================
