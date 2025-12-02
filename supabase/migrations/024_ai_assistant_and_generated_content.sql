-- ============================================================================
-- Migration: 024_ai_assistant_and_generated_content.sql
-- Description: AI Content Assistant - stores AI-generated content suggestions
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. AI Content Suggestions Table
-- ----------------------------------------------------------------------------
-- Stores AI-generated content plans, playlist suggestions, and slide content.
-- The payload field structure varies by type:
--
-- type='plan':
--   payload = {
--     "playlists": [
--       { "name": "...", "description": "...", "slideCount": 4, "suggestedMedia": [...] }
--     ],
--     "rationale": "Why this set was chosen"
--   }
--
-- type='playlist':
--   payload = {
--     "playlistId": "uuid or null if new",
--     "name": "...",
--     "description": "...",
--     "slides": [
--       { "headline": "...", "body": "...", "imagePrompt": "...", "duration": 8 }
--     ]
--   }
--
-- type='slide':
--   payload = {
--     "headline": "...",
--     "body": "...",
--     "imagePrompt": "...",
--     "duration": 8,
--     "style": { "backgroundColor": "#...", "textColor": "#..." }
--   }
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS ai_content_suggestions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

    -- Type of suggestion: plan (multiple playlists), playlist (slides for one), slide (single)
    type TEXT NOT NULL CHECK (type IN ('plan', 'playlist', 'slide')),

    -- Workflow status
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'accepted', 'rejected')),

    -- Source context for analytics and debugging
    source TEXT NOT NULL DEFAULT 'assistant',

    -- Snapshot of business context at generation time
    -- { businessName, businessType, brandColors, targetAudience, specialNotes }
    business_context JSONB NOT NULL DEFAULT '{}',

    -- The actual AI-generated content (structure depends on type)
    payload JSONB NOT NULL DEFAULT '{}',

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for efficient tenant-scoped queries
CREATE INDEX IF NOT EXISTS idx_ai_content_suggestions_tenant
    ON ai_content_suggestions(tenant_id);

-- Index for filtering by type and status
CREATE INDEX IF NOT EXISTS idx_ai_content_suggestions_type_status
    ON ai_content_suggestions(tenant_id, type, status);

-- Index for recent suggestions (for assistant page)
CREATE INDEX IF NOT EXISTS idx_ai_content_suggestions_created
    ON ai_content_suggestions(tenant_id, created_at DESC);

-- ----------------------------------------------------------------------------
-- 2. Row Level Security
-- ----------------------------------------------------------------------------

ALTER TABLE ai_content_suggestions ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own suggestions
CREATE POLICY "Users can view own AI suggestions"
    ON ai_content_suggestions
    FOR SELECT
    USING (tenant_id = auth.uid());

-- Policy: Users can create suggestions for themselves
CREATE POLICY "Users can create own AI suggestions"
    ON ai_content_suggestions
    FOR INSERT
    WITH CHECK (tenant_id = auth.uid());

-- Policy: Users can update their own suggestions
CREATE POLICY "Users can update own AI suggestions"
    ON ai_content_suggestions
    FOR UPDATE
    USING (tenant_id = auth.uid())
    WITH CHECK (tenant_id = auth.uid());

-- Policy: Users can delete their own suggestions
CREATE POLICY "Users can delete own AI suggestions"
    ON ai_content_suggestions
    FOR DELETE
    USING (tenant_id = auth.uid());

-- ----------------------------------------------------------------------------
-- 3. Update Trigger for updated_at
-- ----------------------------------------------------------------------------

CREATE TRIGGER update_ai_content_suggestions_updated_at
    BEFORE UPDATE ON ai_content_suggestions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ----------------------------------------------------------------------------
-- 4. Helper function to accept a suggestion and create real content
-- ----------------------------------------------------------------------------
-- Note: The actual materialization logic is handled in the API layer
-- This function just updates the status and returns the suggestion

CREATE OR REPLACE FUNCTION accept_ai_suggestion(p_suggestion_id UUID)
RETURNS ai_content_suggestions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_suggestion ai_content_suggestions;
BEGIN
    -- Get and verify ownership
    SELECT * INTO v_suggestion
    FROM ai_content_suggestions
    WHERE id = p_suggestion_id
      AND tenant_id = auth.uid();

    IF v_suggestion IS NULL THEN
        RAISE EXCEPTION 'Suggestion not found or access denied';
    END IF;

    IF v_suggestion.status != 'draft' THEN
        RAISE EXCEPTION 'Suggestion has already been processed';
    END IF;

    -- Update status to accepted
    UPDATE ai_content_suggestions
    SET status = 'accepted',
        updated_at = now()
    WHERE id = p_suggestion_id
    RETURNING * INTO v_suggestion;

    RETURN v_suggestion;
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION accept_ai_suggestion(UUID) TO authenticated;

-- ----------------------------------------------------------------------------
-- 5. Function to reject a suggestion
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION reject_ai_suggestion(p_suggestion_id UUID)
RETURNS ai_content_suggestions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_suggestion ai_content_suggestions;
BEGIN
    -- Get and verify ownership
    SELECT * INTO v_suggestion
    FROM ai_content_suggestions
    WHERE id = p_suggestion_id
      AND tenant_id = auth.uid();

    IF v_suggestion IS NULL THEN
        RAISE EXCEPTION 'Suggestion not found or access denied';
    END IF;

    IF v_suggestion.status != 'draft' THEN
        RAISE EXCEPTION 'Suggestion has already been processed';
    END IF;

    -- Update status to rejected
    UPDATE ai_content_suggestions
    SET status = 'rejected',
        updated_at = now()
    WHERE id = p_suggestion_id
    RETURNING * INTO v_suggestion;

    RETURN v_suggestion;
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION reject_ai_suggestion(UUID) TO authenticated;

-- ----------------------------------------------------------------------------
-- 6. Comments for documentation
-- ----------------------------------------------------------------------------

COMMENT ON TABLE ai_content_suggestions IS
'Stores AI-generated content suggestions for the Content Assistant feature';

COMMENT ON COLUMN ai_content_suggestions.type IS
'Type of suggestion: plan (content strategy), playlist (slides for a playlist), slide (single slide)';

COMMENT ON COLUMN ai_content_suggestions.status IS
'Workflow status: draft (pending review), accepted (converted to real content), rejected (discarded)';

COMMENT ON COLUMN ai_content_suggestions.source IS
'Where the suggestion originated: assistant, onboarding, manual-request, etc.';

COMMENT ON COLUMN ai_content_suggestions.business_context IS
'Snapshot of business info at generation time for context and reproducibility';

COMMENT ON COLUMN ai_content_suggestions.payload IS
'The actual AI-generated content. Structure varies by type - see migration comments';
