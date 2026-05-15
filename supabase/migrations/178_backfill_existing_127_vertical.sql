-- ============================================================================
-- Migration 178: Backfill existing svg_templates.vertical from category
-- Phase 178 — Vertical Content Seeding (v21.0 Templates at Scale)
--
-- Implements D-16 (CONTEXT.md): backfill the existing rows' vertical column
-- from category. Three UPDATEs:
--   category='Restaurant' → vertical='restaurants'
--   category='Retail'     → vertical='retail'
--   category='Healthcare' → vertical='healthcare'
-- All other categories (Corporate, Hospitality, Real Estate, Education,
-- Events, Fitness, Entertainment, Beauty, Automotive, Technology, Finance,
-- general) STAY NULL — D-16 explicit, ambiguous mappings out of scope.
--
-- Discovery probe (Plan 02 Task 1, 2026-05-10):
--   Restaurant=15, Retail=12, Healthcare=9 → 36 rows tagged by this migration
--   Active categories total = 128 (existing-127 + 1 added since plan authoring)
--   pre_vertical_count = 0 (no rows pre-tagged)
--
-- Addresses Phase 178 SC-5 (TCAT-04 + TVRT-04) and supports the per-vertical
-- count thresholds in SC-1, SC-2, SC-3 (TVRT-01..03) by lowering the net-new
-- bar to (80 minus existing-tagged) per vertical.
--
-- Pattern references:
--   migration 176 — vertical enum + DO-ASSERT idempotent atomic-migration shape
--   migration 175 — chk_svg_templates_category_enum 15-value floor (UNTOUCHED)
--   migration 177 — Phase 177 idempotent migration shape (no DOWN migration)
--
-- Idempotent: UPDATE ... WHERE vertical IS NULL guards against re-run drift.
-- No DOWN migration (matches Phase 175/176/177 convention).
-- ============================================================================

-- Pre-state assertion: log current state for audit; do NOT fail on re-apply.
DO $$
DECLARE
  v_pre_vertical_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_pre_vertical_count
    FROM svg_templates
    WHERE vertical IS NOT NULL;
  -- If migration is being re-applied, vertical column will already have values.
  -- The UPDATEs below short-circuit via `WHERE vertical IS NULL` so re-apply
  -- is a no-op. Pre-assert reports state for audit, does NOT fail the apply.
  RAISE NOTICE '178: pre-backfill vertical IS NOT NULL count = %', v_pre_vertical_count;
END $$;

-- D-16: Restaurant category → restaurants vertical
UPDATE svg_templates
  SET vertical = 'restaurants'
  WHERE category = 'Restaurant'
    AND vertical IS NULL;

-- D-16: Retail category → retail vertical
UPDATE svg_templates
  SET vertical = 'retail'
  WHERE category = 'Retail'
    AND vertical IS NULL;

-- D-16: Healthcare category → healthcare vertical
UPDATE svg_templates
  SET vertical = 'healthcare'
  WHERE category = 'Healthcare'
    AND vertical IS NULL;

-- Post-state assertion (Pitfall 4 mitigation — exact-count match catches case-mismatch traps).
DO $$
DECLARE
  v_rest_total  INTEGER;
  v_rest_tagged INTEGER;
  v_ret_total   INTEGER;
  v_ret_tagged  INTEGER;
  v_hc_total    INTEGER;
  v_hc_tagged   INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_rest_total  FROM svg_templates WHERE category = 'Restaurant';
  SELECT COUNT(*) INTO v_rest_tagged FROM svg_templates WHERE category = 'Restaurant' AND vertical = 'restaurants';
  SELECT COUNT(*) INTO v_ret_total   FROM svg_templates WHERE category = 'Retail';
  SELECT COUNT(*) INTO v_ret_tagged  FROM svg_templates WHERE category = 'Retail' AND vertical = 'retail';
  SELECT COUNT(*) INTO v_hc_total    FROM svg_templates WHERE category = 'Healthcare';
  SELECT COUNT(*) INTO v_hc_tagged   FROM svg_templates WHERE category = 'Healthcare' AND vertical = 'healthcare';

  ASSERT v_rest_tagged = v_rest_total,
    format('178 SC-TVRT-04: Restaurant rows not fully backfilled — %s/%s tagged restaurants', v_rest_tagged, v_rest_total);
  ASSERT v_ret_tagged = v_ret_total,
    format('178 SC-TVRT-04: Retail rows not fully backfilled — %s/%s tagged retail', v_ret_tagged, v_ret_total);
  ASSERT v_hc_tagged = v_hc_total,
    format('178 SC-TVRT-04: Healthcare rows not fully backfilled — %s/%s tagged healthcare', v_hc_tagged, v_hc_total);
  ASSERT v_rest_tagged > 0 AND v_ret_tagged > 0 AND v_hc_tagged > 0,
    format('178: backfill produced 0 vertical-tagged rows for at least one vertical — Pitfall 4 (case mismatch) suspected (rest=%s ret=%s hc=%s)', v_rest_tagged, v_ret_tagged, v_hc_tagged);

  RAISE NOTICE '178: backfill complete — restaurants=%, retail=%, healthcare=%', v_rest_tagged, v_ret_tagged, v_hc_tagged;
END $$;

-- TCAT-04 invariant: chk_svg_templates_category_enum CHECK constraint must remain.
DO $$
DECLARE
  v_check_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_check_count
    FROM information_schema.check_constraints
    WHERE constraint_name = 'chk_svg_templates_category_enum';
  ASSERT v_check_count = 1,
    format('178 SC-TCAT-04: chk_svg_templates_category_enum CHECK constraint missing or duplicated (got %s, expected 1)', v_check_count);
END $$;
