-- ============================================================================
-- Migration 176: template_drafts + svg_templates.vertical + gallery_templates VIEW
-- Phase 176 — Schema Foundation (v21.0 Templates at Scale)
--
-- Addresses (3 ROADMAP success criteria for Phase 176):
--   SC-1 — `template_drafts` table exists with the 8 required columns and
--          admin-only RLS that rejects non-admin INSERTs
--   SC-2 — `svg_templates.vertical` column exists with a CHECK constraint
--          allowing exactly 'restaurants' | 'retail' | 'healthcare' (or NULL)
--   SC-3 — `gallery_templates` VIEW exposes a `vertical` column on both legs
--          (svg_templates.vertical for SVG leg; NULL::text for polotno leg)
--
-- Pattern references:
--   migration 094 — svg_templates base table + RLS + UUID PK + JSONB metadata
--   migration 102 — admin-only RLS pattern via `is_admin() OR is_super_admin()`
--   migration 167 — gallery_templates VIEW base shape (22 cols → 23 cols here)
--   migration 175 — DROP-then-ADD CONSTRAINT idempotency + DO $$ ASSERT $$
--
-- Idempotent. No DOWN migration. Unblocks Phases 177, 178, 179.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. template_drafts table (SC-1: 8 required columns)
-- ----------------------------------------------------------------------------
-- Staging table for AI-generated and admin-uploaded SVG drafts before they
-- reach gallery_templates. Admin-only — never readable or writable by end users.
--   id            — UUID PK
--   svg_content   — raw SVG string (NOT NULL — empty drafts make no sense)
--   prompt        — original LLM prompt or upload metadata (NULL allowed for
--                   non-AI uploads where there is no prompt)
--   source        — provenance label, e.g. 'ai_generation' | 'admin_upload'
--   status        — workflow state: 'pending' | 'needs_human_review'
--                   | 'approved' | 'rejected' (text, not enum, for cheap evolution)
--   vertical      — restaurants | retail | healthcare (NULL allowed pre-tagging)
--   metadata      — JSONB grab-bag for validator results, model id, retries, etc.
--   created_at    — insertion timestamp

CREATE TABLE IF NOT EXISTS template_drafts (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  svg_content  TEXT NOT NULL,
  prompt       TEXT,
  source       TEXT NOT NULL,
  status       TEXT NOT NULL DEFAULT 'pending',
  vertical     TEXT,
  metadata     JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Vertical CHECK on template_drafts (NULL allowed; 3 enum values when set).
-- DROP-then-ADD pattern keeps the migration idempotent.
ALTER TABLE template_drafts
  DROP CONSTRAINT IF EXISTS chk_template_drafts_vertical_enum;
ALTER TABLE template_drafts
  ADD CONSTRAINT chk_template_drafts_vertical_enum
  CHECK (vertical IS NULL OR vertical IN ('restaurants', 'retail', 'healthcare'));

-- Status CHECK on template_drafts — defense in depth. Same DROP-then-ADD.
ALTER TABLE template_drafts
  DROP CONSTRAINT IF EXISTS chk_template_drafts_status_enum;
ALTER TABLE template_drafts
  ADD CONSTRAINT chk_template_drafts_status_enum
  CHECK (status IN ('pending', 'needs_human_review', 'approved', 'rejected'));

COMMENT ON TABLE template_drafts IS
  'Phase 176 — Admin-only staging table for AI-generated / admin-uploaded SVG drafts before publishing to gallery_templates. RLS: is_admin() OR is_super_admin() only.';

-- ----------------------------------------------------------------------------
-- 2. template_drafts RLS — admin-only via is_admin() OR is_super_admin()
-- ----------------------------------------------------------------------------
-- Single combined policy FOR ALL (SELECT/INSERT/UPDATE/DELETE) — non-admin
-- authenticated users hit a 401/403/RLS-violation at every action. This is
-- the tightest possible posture for an admin-only staging table and is
-- explicitly verified by Plan 03 task 176-03-02 (negative-path INSERT test).

ALTER TABLE template_drafts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "template_drafts_admin_only" ON template_drafts;
CREATE POLICY "template_drafts_admin_only" ON template_drafts
  FOR ALL
  TO authenticated
  USING (is_admin() OR is_super_admin())
  WITH CHECK (is_admin() OR is_super_admin());

-- ----------------------------------------------------------------------------
-- 3. svg_templates.vertical column + CHECK (SC-2)
-- ----------------------------------------------------------------------------
-- NULL allowed: existing 100+ rows from Phase 175 have no vertical assigned.
-- Phase 178 backfills net-new rows; existing rows can stay NULL until a
-- future curation pass.

ALTER TABLE svg_templates
  ADD COLUMN IF NOT EXISTS vertical TEXT;

ALTER TABLE svg_templates
  DROP CONSTRAINT IF EXISTS chk_svg_templates_vertical_enum;
ALTER TABLE svg_templates
  ADD CONSTRAINT chk_svg_templates_vertical_enum
  CHECK (vertical IS NULL OR vertical IN ('restaurants', 'retail', 'healthcare'));

COMMENT ON CONSTRAINT chk_svg_templates_vertical_enum ON svg_templates
  IS 'Phase 176 — vertical taxonomy floor (3 enum values + NULL). Aligns with template_drafts.vertical CHECK.';

CREATE INDEX IF NOT EXISTS idx_svg_templates_vertical
  ON svg_templates(vertical)
  WHERE vertical IS NOT NULL;

-- ----------------------------------------------------------------------------
-- 4. gallery_templates VIEW — replace to include `vertical` (SC-3)
-- ----------------------------------------------------------------------------
-- Starting shape: 22 columns from migration 167. Adds `vertical` as the 23rd
-- column on both legs. SVG leg surfaces svg_templates.vertical (selected
-- naturally). Polotno leg uses NULL::text AS vertical (no vertical column
-- on template_library; v21.0 never tags polotno templates with a vertical).
-- Both legs still filtered to is_active = TRUE (no change from migration 167).
-- VIEW is NOT SECURITY DEFINER — inherits caller RLS (intentional).

CREATE OR REPLACE VIEW gallery_templates AS
-- SVG leg (23 columns)
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
  slug,
  vertical
FROM svg_templates
WHERE is_active = TRUE

UNION ALL

-- Polotno leg (23 columns)
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
  NULL::text                   AS slug,
  NULL::text                   AS vertical
FROM template_library
WHERE is_active = TRUE;

COMMENT ON VIEW gallery_templates IS
  'Unified read model for v20.0 + v21.0 gallery. Union of svg_templates (editor_type=svg) and template_library (editor_type=polotno). Filtered to is_active=true. Inherits caller RLS (NOT SECURITY DEFINER). 23 columns (added `vertical` in Phase 176).';

-- ----------------------------------------------------------------------------
-- 5. Indexes (perf hygiene; no functional impact)
-- ----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_template_drafts_status
  ON template_drafts(status);
CREATE INDEX IF NOT EXISTS idx_template_drafts_created_at
  ON template_drafts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_template_drafts_vertical
  ON template_drafts(vertical)
  WHERE vertical IS NOT NULL;

-- ----------------------------------------------------------------------------
-- 6. Self-asserting verification (Pattern B from migration 175 / 167)
-- Three asserts — one per ROADMAP success criterion.
-- ----------------------------------------------------------------------------
DO $$
DECLARE
  v_drafts_cols      INTEGER;
  v_drafts_rls       BOOLEAN;
  v_drafts_policy    INTEGER;
  v_svg_vertical     INTEGER;
  v_view_vertical    INTEGER;
  v_view_columns     INTEGER;
BEGIN
  -- SC-1.a: template_drafts has all 8 required columns
  SELECT COUNT(*) INTO v_drafts_cols
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'template_drafts'
      AND column_name IN (
        'id','svg_content','prompt','source','status','vertical','metadata','created_at'
      );
  ASSERT v_drafts_cols = 8,
    format('SC-1: expected 8 columns on template_drafts, got %s', v_drafts_cols);

  -- SC-1.b: RLS enabled on template_drafts
  SELECT relrowsecurity INTO v_drafts_rls
    FROM pg_class WHERE relname = 'template_drafts' AND relnamespace = 'public'::regnamespace;
  ASSERT v_drafts_rls = TRUE, 'SC-1: RLS not enabled on template_drafts';

  -- SC-1.c: exactly one admin-only policy named template_drafts_admin_only
  -- pg_policies (system view) exposes the policy name as `policyname`, not
  -- `polname`. The underlying pg_policy catalog uses `polname`; the view
  -- renames it. Caught at apply time on first run — fixed in-place.
  SELECT COUNT(*) INTO v_drafts_policy
    FROM pg_policies
    WHERE tablename = 'template_drafts'
      AND policyname = 'template_drafts_admin_only';
  ASSERT v_drafts_policy = 1,
    format('SC-1: expected policy template_drafts_admin_only, got count=%s', v_drafts_policy);

  -- SC-2.a: svg_templates.vertical column exists
  SELECT COUNT(*) INTO v_svg_vertical
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'svg_templates'
      AND column_name = 'vertical';
  ASSERT v_svg_vertical = 1,
    format('SC-2: svg_templates.vertical column missing, got count=%s', v_svg_vertical);

  -- SC-3.a: gallery_templates VIEW exposes a `vertical` column
  SELECT COUNT(*) INTO v_view_vertical
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'gallery_templates'
      AND column_name = 'vertical';
  ASSERT v_view_vertical = 1,
    format('SC-3: gallery_templates VIEW missing vertical column, got count=%s', v_view_vertical);

  -- SC-3.b: gallery_templates VIEW has 23 columns total (22 from migration 167 + vertical)
  SELECT COUNT(*) INTO v_view_columns
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'gallery_templates';
  ASSERT v_view_columns = 23,
    format('SC-3: gallery_templates expected 23 columns, got %s', v_view_columns);
END $$;
