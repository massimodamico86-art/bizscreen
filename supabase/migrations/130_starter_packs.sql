-- ============================================================================
-- Migration 130: Starter Packs
--
-- Creates infrastructure for curated template bundles:
-- - starter_packs: Collection metadata
-- - starter_pack_templates: Junction table linking packs to templates
-- - get_starter_packs RPC: Fetches packs with embedded template arrays
-- ============================================================================

-- ============================================================================
-- 1. STARTER PACKS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS starter_packs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  thumbnail_url text,
  industry text,
  sort_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  is_featured boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_starter_packs_active ON starter_packs(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_starter_packs_featured ON starter_packs(is_featured) WHERE is_featured = true;
CREATE INDEX IF NOT EXISTS idx_starter_packs_sort ON starter_packs(sort_order);

-- ============================================================================
-- 2. STARTER PACK TEMPLATES JUNCTION TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS starter_pack_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pack_id uuid NOT NULL REFERENCES starter_packs(id) ON DELETE CASCADE,
  template_id uuid NOT NULL REFERENCES template_library(id) ON DELETE CASCADE,
  position integer DEFAULT 0,
  UNIQUE(pack_id, template_id)
);

CREATE INDEX IF NOT EXISTS idx_starter_pack_templates_pack ON starter_pack_templates(pack_id);

-- ============================================================================
-- 3. ENABLE RLS
-- ============================================================================

ALTER TABLE starter_packs ENABLE ROW LEVEL SECURITY;
ALTER TABLE starter_pack_templates ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 4. RLS POLICIES - STARTER PACKS
-- ============================================================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "starter_packs_select" ON starter_packs;
DROP POLICY IF EXISTS "starter_packs_admin" ON starter_packs;

-- SELECT: Everyone can view active packs
CREATE POLICY "starter_packs_select" ON starter_packs
  FOR SELECT USING (is_active = true);

-- Admin policies for insert/update/delete (permissive for now)
CREATE POLICY "starter_packs_admin" ON starter_packs
  FOR ALL USING (true);

-- ============================================================================
-- 5. RLS POLICIES - STARTER PACK TEMPLATES
-- ============================================================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "starter_pack_templates_select" ON starter_pack_templates;
DROP POLICY IF EXISTS "starter_pack_templates_admin" ON starter_pack_templates;

-- SELECT: Everyone can view pack-template associations
CREATE POLICY "starter_pack_templates_select" ON starter_pack_templates
  FOR SELECT USING (true);

-- Admin policies for insert/update/delete (permissive for now)
CREATE POLICY "starter_pack_templates_admin" ON starter_pack_templates
  FOR ALL USING (true);

-- ============================================================================
-- 6. GET STARTER PACKS RPC
-- ============================================================================

CREATE OR REPLACE FUNCTION get_starter_packs()
RETURNS TABLE (
  id uuid,
  name text,
  description text,
  thumbnail_url text,
  industry text,
  template_count bigint,
  templates jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    sp.id,
    sp.name,
    sp.description,
    sp.thumbnail_url,
    sp.industry,
    (SELECT COUNT(*) FROM starter_pack_templates WHERE pack_id = sp.id) as template_count,
    (
      SELECT jsonb_agg(
        jsonb_build_object(
          'id', tl.id,
          'name', tl.name,
          'thumbnail_url', tl.thumbnail_url,
          'description', tl.description,
          'license', tl.license
        ) ORDER BY spt.position
      )
      FROM starter_pack_templates spt
      JOIN template_library tl ON tl.id = spt.template_id
      WHERE spt.pack_id = sp.id AND tl.is_active = true
    ) as templates
  FROM starter_packs sp
  WHERE sp.is_active = true
  ORDER BY sp.is_featured DESC, sp.sort_order, sp.name;
END;
$$;

GRANT EXECUTE ON FUNCTION get_starter_packs() TO authenticated;

-- ============================================================================
-- 7. SEED SAMPLE PACKS (for testing)
-- ============================================================================

-- Restaurant Starter Pack
INSERT INTO starter_packs (name, description, thumbnail_url, industry, sort_order, is_featured)
VALUES (
  'Restaurant Starter',
  'Everything you need for a restaurant display - menu boards, daily specials, and promotions.',
  NULL,
  'restaurant',
  1,
  true
) ON CONFLICT DO NOTHING;

-- Retail Starter Pack
INSERT INTO starter_packs (name, description, thumbnail_url, industry, sort_order, is_featured)
VALUES (
  'Retail Essentials',
  'Product showcases, sale announcements, and store information displays.',
  NULL,
  'retail',
  2,
  true
) ON CONFLICT DO NOTHING;

-- ============================================================================
-- 8. UPDATED_AT TRIGGER
-- ============================================================================

DROP TRIGGER IF EXISTS trigger_starter_packs_updated_at ON starter_packs;
CREATE TRIGGER trigger_starter_packs_updated_at
  BEFORE UPDATE ON starter_packs
  FOR EACH ROW
  EXECUTE FUNCTION update_template_library_updated_at();

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
