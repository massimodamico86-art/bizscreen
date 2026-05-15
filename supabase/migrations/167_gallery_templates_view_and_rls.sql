-- ============================================================================
-- Migration 167: Gallery Templates VIEW, RLS fix, and LOCAL_SVG_TEMPLATES seed
-- Phase 170 — Data Layer Foundation (v20.0 Templates Reimagined)
--
-- Addresses:
--   TDAT-01 — gallery_templates VIEW unifies svg_templates + template_library
--   TDAT-03 — cross-tenant RLS leak on svg_templates (CONTEXT D-12/D-13/D-14)
--   TDAT-04 — LOCAL_SVG_TEMPLATES array seeded into svg_templates
--
-- Decisions referenced: D-01 through D-23 (170-CONTEXT.md).
-- Idempotent (D-22). No DOWN migration (D-23).
-- ============================================================================

-- ============================================================================
-- 1. SCHEMA — add slug column to svg_templates
-- ============================================================================
-- Per D-18: `slug TEXT` with partial UNIQUE index (Pitfall 4 — full UNIQUE
-- constraint would block future NULL-slug rows).

ALTER TABLE svg_templates
  ADD COLUMN IF NOT EXISTS slug TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_svg_templates_slug
  ON svg_templates(slug)
  WHERE slug IS NOT NULL;

-- ============================================================================
-- 2. RLS SWAP on svg_templates — close cross-tenant read leak (TDAT-03)
-- ============================================================================
-- Per D-12/D-13/D-14: drop both existing SELECT policies (one broken — no
-- tenant filter; one redundant) and replace with a single scoped policy.
-- Per D-16: this must run BEFORE the seed (step 3) so seed rows arrive under
-- the corrected policy.

DROP POLICY IF EXISTS "Anyone can read active global svg templates" ON svg_templates;
DROP POLICY IF EXISTS "Authenticated users can read svg templates" ON svg_templates;
DROP POLICY IF EXISTS "svg_templates_select" ON svg_templates;

CREATE POLICY "svg_templates_select" ON svg_templates
  FOR SELECT
  TO authenticated
  USING (
    is_active = TRUE
    AND (tenant_id IS NULL OR created_by = auth.uid())
  );

-- ============================================================================
-- 3. SEED — insert 12 LOCAL_SVG_TEMPLATES entries (TDAT-04)
-- ============================================================================
-- Per D-17: tenant_id = NULL, created_by = NULL (system-global).
-- Per D-18: deterministic UUID via uuid_generate_v5 (uuid-ossp from migration 001).
-- DNS namespace UUID: 6ba7b810-9dad-11d1-80b4-00c04fd430c8 (RFC 4122).
-- Idempotent: ON CONFLICT (slug) WHERE slug IS NOT NULL DO NOTHING (partial index conflict target).

INSERT INTO svg_templates (
  id, slug, name, description, category, orientation,
  thumbnail, svg_url, width, height, tags, is_featured, is_active,
  tenant_id, created_by
) VALUES
  (
    uuid_generate_v5('6ba7b810-9dad-11d1-80b4-00c04fd430c8'::uuid, 'restaurant-menu-1'),
    'restaurant-menu-1',
    'Restaurant Menu',
    'Elegant restaurant menu template with sections for starters, mains, desserts and drinks',
    'Restaurant', 'landscape',
    '/templates/svg/restaurant-menu/menu-design.svg',
    '/templates/svg/restaurant-menu/menu-design.svg',
    1920, 1080,
    ARRAY['menu','restaurant','food','dining']::TEXT[],
    TRUE, TRUE, NULL, NULL
  ),
  (
    uuid_generate_v5('6ba7b810-9dad-11d1-80b4-00c04fd430c8'::uuid, 'cafe-special-1'),
    'cafe-special-1',
    'Cafe Daily Special',
    'Coffee shop daily special board with pricing',
    'Restaurant', 'portrait',
    '/templates/svg/cafe-special/design.svg',
    '/templates/svg/cafe-special/design.svg',
    1080, 1920,
    ARRAY['cafe','coffee','special','daily']::TEXT[],
    FALSE, TRUE, NULL, NULL
  ),
  (
    uuid_generate_v5('6ba7b810-9dad-11d1-80b4-00c04fd430c8'::uuid, 'retail-sale-1'),
    'retail-sale-1',
    'Retail Sale Banner',
    'Eye-catching sale promotion banner for retail displays',
    'Retail', 'landscape',
    '/templates/svg/retail-sale/design.svg',
    '/templates/svg/retail-sale/design.svg',
    1920, 1080,
    ARRAY['sale','retail','promotion','discount']::TEXT[],
    FALSE, TRUE, NULL, NULL
  ),
  (
    uuid_generate_v5('6ba7b810-9dad-11d1-80b4-00c04fd430c8'::uuid, 'welcome-sign-1'),
    'welcome-sign-1',
    'Welcome Display',
    'Professional welcome sign for lobbies and entrances',
    'Corporate', 'landscape',
    '/templates/svg/welcome-sign/design.svg',
    '/templates/svg/welcome-sign/design.svg',
    1920, 1080,
    ARRAY['welcome','corporate','lobby','entrance']::TEXT[],
    FALSE, TRUE, NULL, NULL
  ),
  (
    uuid_generate_v5('6ba7b810-9dad-11d1-80b4-00c04fd430c8'::uuid, 'holiday-sale-1'),
    'holiday-sale-1',
    'Holiday Sale',
    'Festive holiday sale promotion with discount badge and call-to-action',
    'Retail', 'landscape',
    '/templates/svg/holiday-sale/design.svg',
    '/templates/svg/holiday-sale/design.svg',
    1920, 1080,
    ARRAY['holiday','sale','christmas','promotion','seasonal']::TEXT[],
    TRUE, TRUE, NULL, NULL
  ),
  (
    uuid_generate_v5('6ba7b810-9dad-11d1-80b4-00c04fd430c8'::uuid, 'real-estate-1'),
    'real-estate-1',
    'Real Estate Listing',
    'Professional property listing display with features, price, and agent info',
    'Real Estate', 'landscape',
    '/templates/svg/real-estate/design.svg',
    '/templates/svg/real-estate/design.svg',
    1920, 1080,
    ARRAY['real estate','property','listing','home','sale']::TEXT[],
    TRUE, TRUE, NULL, NULL
  ),
  (
    uuid_generate_v5('6ba7b810-9dad-11d1-80b4-00c04fd430c8'::uuid, 'healthcare-info-1'),
    'healthcare-info-1',
    'Healthcare Services',
    'Medical center services display with departments, hours, and contact info',
    'Healthcare', 'landscape',
    '/templates/svg/healthcare-info/design.svg',
    '/templates/svg/healthcare-info/design.svg',
    1920, 1080,
    ARRAY['healthcare','medical','hospital','clinic','services']::TEXT[],
    FALSE, TRUE, NULL, NULL
  ),
  (
    uuid_generate_v5('6ba7b810-9dad-11d1-80b4-00c04fd430c8'::uuid, 'corporate-welcome-1'),
    'corporate-welcome-1',
    'Corporate Welcome',
    'Modern corporate welcome display for lobbies and meeting rooms',
    'Corporate', 'landscape',
    '/templates/svg/corporate-welcome/design.svg',
    '/templates/svg/corporate-welcome/design.svg',
    1920, 1080,
    ARRAY['corporate','welcome','meeting','lobby','business']::TEXT[],
    FALSE, TRUE, NULL, NULL
  ),
  (
    uuid_generate_v5('6ba7b810-9dad-11d1-80b4-00c04fd430c8'::uuid, 'happy-hour-1'),
    'happy-hour-1',
    'Happy Hour Specials',
    'Bar and restaurant happy hour promotion with drink specials',
    'Restaurant', 'portrait',
    '/templates/svg/happy-hour/design.svg',
    '/templates/svg/happy-hour/design.svg',
    1080, 1920,
    ARRAY['happy hour','bar','drinks','specials','restaurant']::TEXT[],
    TRUE, TRUE, NULL, NULL
  ),
  (
    uuid_generate_v5('6ba7b810-9dad-11d1-80b4-00c04fd430c8'::uuid, 'fitness-promo-1'),
    'fitness-promo-1',
    'Fitness Gym Promo',
    'Dynamic gym membership promotion with pricing and features',
    'Fitness', 'landscape',
    '/templates/svg/fitness-promo/design.svg',
    '/templates/svg/fitness-promo/design.svg',
    1920, 1080,
    ARRAY['fitness','gym','membership','promotion','health']::TEXT[],
    FALSE, TRUE, NULL, NULL
  ),
  (
    uuid_generate_v5('6ba7b810-9dad-11d1-80b4-00c04fd430c8'::uuid, 'hotel-amenities-1'),
    'hotel-amenities-1',
    'Hotel Amenities',
    'Hotel guest information display with amenities, dining hours, and services',
    'Hospitality', 'portrait',
    '/templates/svg/hotel-amenities/design.svg',
    '/templates/svg/hotel-amenities/design.svg',
    1080, 1920,
    ARRAY['hotel','amenities','hospitality','guest','services']::TEXT[],
    FALSE, TRUE, NULL, NULL
  ),
  (
    uuid_generate_v5('6ba7b810-9dad-11d1-80b4-00c04fd430c8'::uuid, 'event-promo-1'),
    'event-promo-1',
    'Event Promotion',
    'Vibrant event promotion display for concerts, festivals, and live events',
    'Events', 'landscape',
    '/templates/svg/event-promo/design.svg',
    '/templates/svg/event-promo/design.svg',
    1920, 1080,
    ARRAY['event','concert','festival','music','entertainment']::TEXT[],
    TRUE, TRUE, NULL, NULL
  )
ON CONFLICT (slug) WHERE slug IS NOT NULL DO NOTHING;

-- ============================================================================
-- 4. VIEW — gallery_templates (TDAT-01)
-- ============================================================================
-- Per D-01: regular VIEW (not materialized).
-- Per D-02: 21-column wide schema (including slug).
-- Per D-03: editor_type is the discriminator; source_table is debug-only.
-- Per D-04: VIEW enforces is_active = TRUE at definition time.
-- Per RESEARCH Pitfall 1: every NULL column needs explicit type cast.
-- Per RESEARCH Pitfall 6: design_json is NULL::jsonb for polotno rows
-- (lives in template_library_slides, not template_library itself).

CREATE OR REPLACE VIEW gallery_templates AS
-- SVG leg
SELECT
  id,
  'svg_templates'::text        AS source_table,
  'svg'::text                  AS editor_type,
  name,
  description,
  category,
  tags,
  orientation,
  thumbnail,
  svg_url,
  svg_content,
  NULL::jsonb                  AS design_json,
  width,
  height,
  tenant_id,
  created_by,
  created_at,
  updated_at,
  use_count,
  is_featured,
  is_active,
  slug
FROM svg_templates
WHERE is_active = TRUE

UNION ALL

-- Polotno leg
SELECT
  id,
  'template_library'::text     AS source_table,
  'polotno'::text              AS editor_type,
  name,
  description,
  industry                     AS category,
  tags,
  NULL::text                   AS orientation,
  thumbnail_url                AS thumbnail,
  NULL::text                   AS svg_url,
  NULL::text                   AS svg_content,
  NULL::jsonb                  AS design_json,
  NULL::integer                AS width,
  NULL::integer                AS height,
  NULL::uuid                   AS tenant_id,
  created_by,
  created_at,
  updated_at,
  install_count                AS use_count,
  is_featured,
  is_active,
  NULL::text                   AS slug
FROM template_library
WHERE is_active = TRUE;

COMMENT ON VIEW gallery_templates IS
  'Unified read model for v20.0 gallery. Union of svg_templates (editor_type=svg) and template_library (editor_type=polotno). Filtered to is_active=true. Inherits caller RLS (NOT SECURITY DEFINER). design_json is always NULL — polotno slides live in template_library_slides.';

-- ============================================================================
-- 5. INDEX — template_library.tags GIN (TDAT-01 perf)
-- ============================================================================
-- Per D-05: svg_templates.tags GIN already exists (migration 094:35).
-- template_library.tags GIN does NOT exist in any prior migration (verified).

CREATE INDEX IF NOT EXISTS idx_template_library_tags
  ON template_library USING GIN(tags);

-- ============================================================================
-- 6. SELF-ASSERTING VERIFICATION (TDAT-01, TDAT-04)
-- ============================================================================
-- Per VALIDATION.md: embedded DO blocks provide self-verifying behavior for
-- tasks 170-01-02 (VIEW rows from both tables) and 170-01-03 (12 seeds by slug).

DO $$
DECLARE
  v_svg_count   INTEGER;
  v_lib_count   INTEGER;
  v_seed_count  INTEGER;
BEGIN
  -- TDAT-01: VIEW returns rows from both source tables
  SELECT COUNT(*) INTO v_svg_count
    FROM gallery_templates WHERE source_table = 'svg_templates';
  SELECT COUNT(*) INTO v_lib_count
    FROM gallery_templates WHERE source_table = 'template_library';

  ASSERT v_svg_count >= 12,
    format('gallery_templates should have >=12 svg rows after seed, got %s', v_svg_count);
  -- template_library may be 0 on fresh DBs — that is acceptable; the VIEW is
  -- still correct. Assert only that the query path works (no error raised).

  -- TDAT-04: all 12 seed slugs present
  SELECT COUNT(*) INTO v_seed_count
    FROM svg_templates
    WHERE tenant_id IS NULL
      AND slug IN (
        'restaurant-menu-1','cafe-special-1','retail-sale-1','welcome-sign-1',
        'holiday-sale-1','real-estate-1','healthcare-info-1','corporate-welcome-1',
        'happy-hour-1','fitness-promo-1','hotel-amenities-1','event-promo-1'
      );
  ASSERT v_seed_count = 12,
    format('expected 12 seeded slugs with tenant_id IS NULL, got %s', v_seed_count);
END $$;
