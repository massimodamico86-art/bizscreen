-- ============================================================================
-- Migration 129: Marketplace Template Favorites and History
--
-- Creates infrastructure for user favorites and usage history for
-- template_library (marketplace templates), separate from content_templates.
-- ============================================================================

-- ============================================================================
-- 1. MARKETPLACE TEMPLATE FAVORITES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS marketplace_template_favorites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  template_id uuid NOT NULL REFERENCES template_library(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),

  -- Ensure a user can only favorite a template once
  CONSTRAINT marketplace_template_favorites_unique UNIQUE (user_id, template_id)
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_marketplace_template_favorites_user_id
  ON marketplace_template_favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_template_favorites_template_id
  ON marketplace_template_favorites(template_id);

-- Enable RLS
ALTER TABLE marketplace_template_favorites ENABLE ROW LEVEL SECURITY;

-- Users can only view their own favorites
CREATE POLICY "marketplace_favorites_select" ON marketplace_template_favorites
  FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own favorites
CREATE POLICY "marketplace_favorites_insert" ON marketplace_template_favorites
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can delete their own favorites
CREATE POLICY "marketplace_favorites_delete" ON marketplace_template_favorites
  FOR DELETE USING (auth.uid() = user_id);

COMMENT ON TABLE marketplace_template_favorites IS 'Stores which marketplace templates a user has favorited for quick access';

-- ============================================================================
-- 2. MARKETPLACE TEMPLATE HISTORY TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS marketplace_template_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  template_id uuid NOT NULL REFERENCES template_library(id) ON DELETE CASCADE,
  applied_at timestamptz NOT NULL DEFAULT now()
);

-- Index for efficient "recently used" queries (user_id + applied_at DESC)
CREATE INDEX IF NOT EXISTS idx_marketplace_template_history_user_recent
  ON marketplace_template_history(user_id, applied_at DESC);
CREATE INDEX IF NOT EXISTS idx_marketplace_template_history_template_id
  ON marketplace_template_history(template_id);

-- Enable RLS
ALTER TABLE marketplace_template_history ENABLE ROW LEVEL SECURITY;

-- Users can only view their own history
CREATE POLICY "marketplace_history_select" ON marketplace_template_history
  FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own history records
CREATE POLICY "marketplace_history_insert" ON marketplace_template_history
  FOR INSERT WITH CHECK (auth.uid() = user_id);

COMMENT ON TABLE marketplace_template_history IS 'Tracks which marketplace templates a user has applied for "recently used" feature';

-- ============================================================================
-- 3. RPC: TOGGLE MARKETPLACE FAVORITE
-- ============================================================================

CREATE OR REPLACE FUNCTION toggle_marketplace_favorite(p_template_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_exists boolean;
BEGIN
  -- Get authenticated user
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Check if favorite exists
  SELECT EXISTS (
    SELECT 1 FROM marketplace_template_favorites
    WHERE user_id = v_user_id AND template_id = p_template_id
  ) INTO v_exists;

  IF v_exists THEN
    -- Remove favorite
    DELETE FROM marketplace_template_favorites
    WHERE user_id = v_user_id AND template_id = p_template_id;
    RETURN false; -- Now unfavorited
  ELSE
    -- Add favorite
    INSERT INTO marketplace_template_favorites (user_id, template_id)
    VALUES (v_user_id, p_template_id)
    ON CONFLICT (user_id, template_id) DO NOTHING;
    RETURN true; -- Now favorited
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION toggle_marketplace_favorite(uuid) TO authenticated;

COMMENT ON FUNCTION toggle_marketplace_favorite IS 'Toggle favorite status for a marketplace template. Returns new favorite status (true=favorited, false=unfavorited)';

-- ============================================================================
-- 4. RPC: GET MARKETPLACE FAVORITES
-- ============================================================================

CREATE OR REPLACE FUNCTION get_marketplace_favorites(p_limit integer DEFAULT 10)
RETURNS TABLE (
  id uuid,
  name text,
  description text,
  thumbnail_url text,
  preview_url text,
  template_type text,
  license text,
  industry text,
  tags text[],
  is_featured boolean,
  install_count integer,
  metadata jsonb,
  category_id uuid,
  category_name text,
  favorited_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    tl.id,
    tl.name,
    tl.description,
    tl.thumbnail_url,
    tl.preview_url,
    tl.template_type,
    tl.license,
    tl.industry,
    tl.tags,
    tl.is_featured,
    tl.install_count,
    tl.metadata,
    tl.category_id,
    tc.name as category_name,
    mf.created_at as favorited_at
  FROM marketplace_template_favorites mf
  JOIN template_library tl ON tl.id = mf.template_id AND tl.is_active = true
  LEFT JOIN template_categories tc ON tc.id = tl.category_id
  WHERE mf.user_id = auth.uid()
  ORDER BY mf.created_at DESC
  LIMIT p_limit;
END;
$$;

GRANT EXECUTE ON FUNCTION get_marketplace_favorites(integer) TO authenticated;

COMMENT ON FUNCTION get_marketplace_favorites IS 'Get user favorite marketplace templates with full template data';

-- ============================================================================
-- 5. RPC: GET RECENT MARKETPLACE TEMPLATES
-- ============================================================================

CREATE OR REPLACE FUNCTION get_recent_marketplace_templates(p_limit integer DEFAULT 5)
RETURNS TABLE (
  id uuid,
  name text,
  description text,
  thumbnail_url text,
  preview_url text,
  template_type text,
  license text,
  industry text,
  tags text[],
  is_featured boolean,
  install_count integer,
  metadata jsonb,
  category_id uuid,
  category_name text,
  last_used_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    tl.id,
    tl.name,
    tl.description,
    tl.thumbnail_url,
    tl.preview_url,
    tl.template_type,
    tl.license,
    tl.industry,
    tl.tags,
    tl.is_featured,
    tl.install_count,
    tl.metadata,
    tl.category_id,
    tc.name as category_name,
    deduped.last_used_at
  FROM (
    -- Deduplicate by template_id, taking most recent applied_at
    SELECT DISTINCT ON (h.template_id)
      h.template_id,
      h.applied_at as last_used_at
    FROM marketplace_template_history h
    WHERE h.user_id = auth.uid()
    ORDER BY h.template_id, h.applied_at DESC
  ) deduped
  JOIN template_library tl ON tl.id = deduped.template_id AND tl.is_active = true
  LEFT JOIN template_categories tc ON tc.id = tl.category_id
  ORDER BY deduped.last_used_at DESC
  LIMIT p_limit;
END;
$$;

GRANT EXECUTE ON FUNCTION get_recent_marketplace_templates(integer) TO authenticated;

COMMENT ON FUNCTION get_recent_marketplace_templates IS 'Get recently used marketplace templates (deduplicated, most recent first)';

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
