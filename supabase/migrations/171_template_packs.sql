-- ============================================================================
-- Migration 171 — Template Packs + Pack Items
-- Phase 173 (Starter Packs + Favorites) — TPCK-01, TPCK-03, TPCK-04
--
-- - template_packs: pack metadata (slug, name, industry, thumbnail, ordering)
-- - template_pack_items: polymorphic junction (svg or polotno members)
--
-- Idempotent (Pattern A): CREATE TABLE IF NOT EXISTS, CREATE INDEX IF NOT EXISTS,
-- DROP POLICY IF EXISTS + CREATE POLICY.
--
-- RLS (CONTEXT D-03):
--   SELECT — public-active OR caller-owned (mirrors migration 167:39-45 svg_templates)
--   INSERT/UPDATE/DELETE — super_admin OR caller-owned (uses is_super_admin() helper
--   from migration 012:28; tightens template_library's loose policies per Pitfall 8)
--
-- Polymorphic junction (Pattern 2): template_id has NO SQL FK because Postgres
-- cannot enforce conditional FKs across two tables. Existence is validated at
-- apply time by the apply_starter_pack RPC (migration 173).
-- ============================================================================

-- =========================================================================
-- template_packs
-- =========================================================================

CREATE TABLE IF NOT EXISTS public.template_packs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug            TEXT,
  name            TEXT NOT NULL,
  description     TEXT,
  industry        TEXT,
  thumbnail_url   TEXT,
  display_order   INTEGER NOT NULL DEFAULT 0,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  tenant_id       UUID,  -- NULL = global; non-NULL = tenant-owned
  created_by      UUID REFERENCES auth.users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_template_packs_slug
  ON public.template_packs(slug)
  WHERE slug IS NOT NULL;  -- partial unique: only enforce uniqueness for non-NULL slugs

CREATE INDEX IF NOT EXISTS idx_template_packs_active_tenant
  ON public.template_packs(is_active, tenant_id)
  WHERE is_active = TRUE;

CREATE INDEX IF NOT EXISTS idx_template_packs_display_order
  ON public.template_packs(display_order) WHERE is_active = TRUE;

-- =========================================================================
-- template_pack_items (polymorphic junction)
-- =========================================================================

CREATE TABLE IF NOT EXISTS public.template_pack_items (
  pack_id      UUID NOT NULL REFERENCES public.template_packs(id) ON DELETE CASCADE,
  template_id  UUID NOT NULL,
  editor_type  TEXT NOT NULL CHECK (editor_type IN ('svg','polotno')),
  position     INTEGER NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (pack_id, template_id, editor_type)
);

CREATE INDEX IF NOT EXISTS idx_template_pack_items_pack_position
  ON public.template_pack_items(pack_id, position);

-- =========================================================================
-- RLS — template_packs
-- =========================================================================

ALTER TABLE public.template_packs       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.template_pack_items  ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "template_packs_select" ON public.template_packs;
CREATE POLICY "template_packs_select" ON public.template_packs
  FOR SELECT
  TO authenticated
  USING (
    is_active = TRUE
    AND (tenant_id IS NULL OR tenant_id = auth.uid())
  );

DROP POLICY IF EXISTS "template_packs_insert" ON public.template_packs;
CREATE POLICY "template_packs_insert" ON public.template_packs
  FOR INSERT
  TO authenticated
  WITH CHECK (
    is_super_admin()
    OR tenant_id = auth.uid()
  );

DROP POLICY IF EXISTS "template_packs_update" ON public.template_packs;
CREATE POLICY "template_packs_update" ON public.template_packs
  FOR UPDATE
  TO authenticated
  USING (
    is_super_admin()
    OR tenant_id = auth.uid()
  )
  WITH CHECK (
    is_super_admin()
    OR tenant_id = auth.uid()
  );

DROP POLICY IF EXISTS "template_packs_delete" ON public.template_packs;
CREATE POLICY "template_packs_delete" ON public.template_packs
  FOR DELETE
  TO authenticated
  USING (
    is_super_admin()
    OR tenant_id = auth.uid()
  );

-- =========================================================================
-- RLS — template_pack_items (delegates to parent-pack policy via EXISTS)
-- =========================================================================

DROP POLICY IF EXISTS "template_pack_items_select" ON public.template_pack_items;
CREATE POLICY "template_pack_items_select" ON public.template_pack_items
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.template_packs p
      WHERE p.id = template_pack_items.pack_id
        AND p.is_active = TRUE
        AND (p.tenant_id IS NULL OR p.tenant_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "template_pack_items_mutate" ON public.template_pack_items;
CREATE POLICY "template_pack_items_mutate" ON public.template_pack_items
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.template_packs p
      WHERE p.id = template_pack_items.pack_id
        AND (is_super_admin() OR p.tenant_id = auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.template_packs p
      WHERE p.id = template_pack_items.pack_id
        AND (is_super_admin() OR p.tenant_id = auth.uid())
    )
  );

-- =========================================================================
-- Self-assert (Pattern from migration 167:292-320)
-- =========================================================================

DO $$
DECLARE
  v_pack_count INTEGER;
  v_item_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_pack_count FROM public.template_packs;
  SELECT COUNT(*) INTO v_item_count FROM public.template_pack_items;
  -- Greenfield: assert tables are queryable. Should be 0 on first apply, idempotent on re-apply.
  ASSERT v_pack_count >= 0, 'template_packs not queryable';
  ASSERT v_item_count >= 0, 'template_pack_items not queryable';
END $$;

COMMENT ON TABLE  public.template_packs       IS 'Phase 173 — curated bundles of gallery templates (TPCK-01..04). Distinct from legacy content_templates (D-02 — left untouched).';
COMMENT ON TABLE  public.template_pack_items  IS 'Phase 173 — polymorphic junction; template_id refs svg_templates.id OR template_library.id keyed by editor_type. No SQL FK (Pattern 2). Existence validated by apply_starter_pack RPC.';
