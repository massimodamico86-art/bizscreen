-- =====================================================
-- TEMPLATE FAVORITES AND USAGE HISTORY
-- =====================================================
-- User-scoped tables for template personalization:
-- - user_template_favorites: templates users have favorited
-- - user_template_history: templates users have applied
-- =====================================================

-- =====================================================
-- USER TEMPLATE FAVORITES TABLE (US-118)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.user_template_favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  template_id UUID REFERENCES public.content_templates(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Ensure a user can only favorite a template once
  CONSTRAINT user_template_favorites_unique UNIQUE (user_id, template_id)
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_user_template_favorites_user_id
  ON public.user_template_favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_user_template_favorites_template_id
  ON public.user_template_favorites(template_id);

-- Enable RLS
ALTER TABLE public.user_template_favorites ENABLE ROW LEVEL SECURITY;

-- Users can only view their own favorites
CREATE POLICY "Users can view own favorites" ON public.user_template_favorites
  FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own favorites
CREATE POLICY "Users can insert own favorites" ON public.user_template_favorites
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can delete their own favorites
CREATE POLICY "Users can delete own favorites" ON public.user_template_favorites
  FOR DELETE USING (auth.uid() = user_id);

COMMENT ON TABLE public.user_template_favorites IS 'Stores which templates a user has favorited for quick access';

-- =====================================================
-- USER TEMPLATE HISTORY TABLE (US-119)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.user_template_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  template_id UUID REFERENCES public.content_templates(id) ON DELETE CASCADE NOT NULL,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for efficient "recently used" queries (user_id + applied_at DESC)
CREATE INDEX IF NOT EXISTS idx_user_template_history_user_recent
  ON public.user_template_history(user_id, applied_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_template_history_template_id
  ON public.user_template_history(template_id);

-- Enable RLS
ALTER TABLE public.user_template_history ENABLE ROW LEVEL SECURITY;

-- Users can only view their own history
CREATE POLICY "Users can view own history" ON public.user_template_history
  FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own history records
CREATE POLICY "Users can insert own history" ON public.user_template_history
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can delete their own history (for cleanup)
CREATE POLICY "Users can delete own history" ON public.user_template_history
  FOR DELETE USING (auth.uid() = user_id);

COMMENT ON TABLE public.user_template_history IS 'Tracks which templates a user has applied for "recently used" feature';

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Function to get user's favorite template IDs (for efficient batch checking)
CREATE OR REPLACE FUNCTION get_user_favorite_template_ids()
RETURNS UUID[]
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN ARRAY(
    SELECT template_id
    FROM public.user_template_favorites
    WHERE user_id = auth.uid()
  );
END;
$$;

-- Function to get recently used templates (deduplicated, most recent first)
CREATE OR REPLACE FUNCTION get_recently_used_templates(p_limit INTEGER DEFAULT 6)
RETURNS TABLE(
  template_id UUID,
  last_applied_at TIMESTAMPTZ
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT deduped.template_id, deduped.last_applied_at FROM (
    SELECT DISTINCT ON (h.template_id)
      h.template_id,
      h.applied_at AS last_applied_at
    FROM public.user_template_history h
    WHERE h.user_id = auth.uid()
    ORDER BY h.template_id, h.applied_at DESC
  ) deduped
  ORDER BY deduped.last_applied_at DESC
  LIMIT p_limit;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_user_favorite_template_ids() TO authenticated;
GRANT EXECUTE ON FUNCTION get_recently_used_templates(INTEGER) TO authenticated;

-- =====================================================
-- END OF MIGRATION
-- =====================================================
