-- ============================================================================
-- Migration 131: Template Ratings, Suggestions, and Usage Analytics
--
-- Creates infrastructure for:
-- 1. Template ratings (1-5 stars)
-- 2. Industry-based template suggestions
-- 3. Personal usage counts for templates
-- ============================================================================

-- ============================================================================
-- 1. MARKETPLACE TEMPLATE RATINGS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS marketplace_template_ratings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  template_id uuid NOT NULL REFERENCES template_library(id) ON DELETE CASCADE,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  -- Ensure a user can only rate a template once
  CONSTRAINT marketplace_template_ratings_unique UNIQUE (user_id, template_id)
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_marketplace_template_ratings_user_id
  ON marketplace_template_ratings(user_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_template_ratings_template_id
  ON marketplace_template_ratings(template_id);

-- Enable RLS
ALTER TABLE marketplace_template_ratings ENABLE ROW LEVEL SECURITY;

-- Everyone can view ratings (for aggregate display)
CREATE POLICY "marketplace_ratings_select" ON marketplace_template_ratings
  FOR SELECT USING (true);

-- Users can insert their own ratings
CREATE POLICY "marketplace_ratings_insert" ON marketplace_template_ratings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own ratings
CREATE POLICY "marketplace_ratings_update" ON marketplace_template_ratings
  FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete their own ratings
CREATE POLICY "marketplace_ratings_delete" ON marketplace_template_ratings
  FOR DELETE USING (auth.uid() = user_id);

COMMENT ON TABLE marketplace_template_ratings IS 'Stores 1-5 star ratings for marketplace templates';

-- ============================================================================
-- 2. RPC: UPSERT TEMPLATE RATING
-- ============================================================================

CREATE OR REPLACE FUNCTION upsert_template_rating(
  p_template_id uuid,
  p_rating integer
)
RETURNS TABLE (
  average_rating numeric,
  total_ratings bigint,
  user_rating integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
BEGIN
  -- Get authenticated user
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Validate rating
  IF p_rating < 1 OR p_rating > 5 THEN
    RAISE EXCEPTION 'Rating must be between 1 and 5';
  END IF;

  -- Upsert the rating
  INSERT INTO marketplace_template_ratings (user_id, template_id, rating)
  VALUES (v_user_id, p_template_id, p_rating)
  ON CONFLICT (user_id, template_id)
  DO UPDATE SET rating = p_rating, updated_at = now();

  -- Return aggregate stats
  RETURN QUERY
  SELECT
    COALESCE(AVG(r.rating), 0)::numeric AS average_rating,
    COUNT(*)::bigint AS total_ratings,
    p_rating AS user_rating
  FROM marketplace_template_ratings r
  WHERE r.template_id = p_template_id;
END;
$$;

GRANT EXECUTE ON FUNCTION upsert_template_rating(uuid, integer) TO authenticated;

COMMENT ON FUNCTION upsert_template_rating IS 'Submit or update a 1-5 star rating. Returns updated aggregate stats.';

-- ============================================================================
-- 3. RPC: GET TEMPLATE RATING STATS
-- ============================================================================

CREATE OR REPLACE FUNCTION get_template_rating_stats(p_template_id uuid)
RETURNS TABLE (
  average_rating numeric,
  total_ratings bigint,
  user_rating integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_user_rating integer;
BEGIN
  v_user_id := auth.uid();

  -- Get user's rating if authenticated
  IF v_user_id IS NOT NULL THEN
    SELECT r.rating INTO v_user_rating
    FROM marketplace_template_ratings r
    WHERE r.template_id = p_template_id AND r.user_id = v_user_id;
  END IF;

  -- Return aggregate stats with user's rating
  RETURN QUERY
  SELECT
    COALESCE(AVG(r.rating), 0)::numeric AS average_rating,
    COUNT(*)::bigint AS total_ratings,
    v_user_rating AS user_rating
  FROM marketplace_template_ratings r
  WHERE r.template_id = p_template_id;
END;
$$;

GRANT EXECUTE ON FUNCTION get_template_rating_stats(uuid) TO authenticated;

COMMENT ON FUNCTION get_template_rating_stats IS 'Get rating stats for a template including user own rating if authenticated';

-- ============================================================================
-- 4. RPC: GET SUGGESTED TEMPLATES
-- ============================================================================

CREATE OR REPLACE FUNCTION get_suggested_templates(p_limit integer DEFAULT 6)
RETURNS TABLE (
  id uuid,
  name text,
  thumbnail_url text,
  industry text,
  category_id uuid,
  suggestion_reason text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_tenant_id uuid;
  v_dominant_industry text;
BEGIN
  -- Get authenticated user
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Get tenant ID for querying scenes
  SELECT tenant_id INTO v_tenant_id
  FROM profiles
  WHERE id = v_user_id;

  -- Find dominant industry from user's scenes
  SELECT s.business_type INTO v_dominant_industry
  FROM scenes s
  WHERE s.tenant_id = v_tenant_id
    AND s.business_type IS NOT NULL
    AND s.business_type != ''
  GROUP BY s.business_type
  ORDER BY COUNT(*) DESC
  LIMIT 1;

  -- Return industry-matched templates if dominant industry found
  IF v_dominant_industry IS NOT NULL THEN
    RETURN QUERY
    SELECT
      tl.id,
      tl.name,
      tl.thumbnail_url,
      tl.industry,
      tl.category_id,
      ('Recommended for ' || v_dominant_industry)::text AS suggestion_reason
    FROM template_library tl
    WHERE tl.is_active = true
      AND tl.industry = v_dominant_industry
      AND tl.id NOT IN (
        SELECT mh.template_id
        FROM marketplace_template_history mh
        WHERE mh.user_id = v_user_id
      )
    ORDER BY tl.install_count DESC NULLS LAST
    LIMIT p_limit;

    -- If we got results, return them
    IF FOUND THEN
      RETURN;
    END IF;
  END IF;

  -- Fallback: return popular templates user hasn't used
  RETURN QUERY
  SELECT
    tl.id,
    tl.name,
    tl.thumbnail_url,
    tl.industry,
    tl.category_id,
    'Popular template'::text AS suggestion_reason
  FROM template_library tl
  WHERE tl.is_active = true
    AND tl.id NOT IN (
      SELECT mh.template_id
      FROM marketplace_template_history mh
      WHERE mh.user_id = v_user_id
    )
  ORDER BY tl.install_count DESC NULLS LAST
  LIMIT p_limit;
END;
$$;

GRANT EXECUTE ON FUNCTION get_suggested_templates(integer) TO authenticated;

COMMENT ON FUNCTION get_suggested_templates IS 'Get suggested templates based on user industry or popularity';

-- ============================================================================
-- 5. RPC: GET TEMPLATE USAGE COUNTS
-- ============================================================================

CREATE OR REPLACE FUNCTION get_template_usage_counts(p_template_ids uuid[])
RETURNS TABLE (
  template_id uuid,
  usage_count bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
BEGIN
  -- Get authenticated user
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Return usage counts for each template
  RETURN QUERY
  SELECT
    mh.template_id,
    COUNT(*)::bigint AS usage_count
  FROM marketplace_template_history mh
  WHERE mh.user_id = v_user_id
    AND mh.template_id = ANY(p_template_ids)
  GROUP BY mh.template_id;
END;
$$;

GRANT EXECUTE ON FUNCTION get_template_usage_counts(uuid[]) TO authenticated;

COMMENT ON FUNCTION get_template_usage_counts IS 'Batch get personal usage counts for templates';

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
