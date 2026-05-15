-- ============================================================================
-- Migration 172 — Template Favorites + gallery VIEW extension
-- Phase 173 (Starter Packs + Favorites) — TFAV-01, TFAV-02, TFAV-03
--
-- - template_favorites: per-user bookmarks (user_id, template_id, editor_type)
-- - gallery_templates_with_favorites: VIEW that LEFT JOINs favorites onto
--   gallery_templates filtered by auth.uid() (Pattern 4 — single-query read
--   preserves Phase 170 D-07 invariant)
--
-- RLS (Pattern 3): user_id = auth.uid() on SELECT/INSERT/DELETE.
-- No UPDATE policy — toggle = insert/delete (no mutable columns).
--
-- VIEW auth context (Pitfall 9): the LEFT JOIN predicate filters on auth.uid()
-- so each caller sees their own favorites only; non-matching rows surface
-- is_favorited = FALSE rather than missing rows.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.template_favorites (
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  template_id  UUID NOT NULL,
  editor_type  TEXT NOT NULL CHECK (editor_type IN ('svg','polotno')),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, template_id, editor_type)
);

CREATE INDEX IF NOT EXISTS idx_template_favorites_user
  ON public.template_favorites(user_id, created_at DESC);

ALTER TABLE public.template_favorites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "template_favorites_select" ON public.template_favorites;
CREATE POLICY "template_favorites_select" ON public.template_favorites
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "template_favorites_insert" ON public.template_favorites;
CREATE POLICY "template_favorites_insert" ON public.template_favorites
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "template_favorites_delete" ON public.template_favorites;
CREATE POLICY "template_favorites_delete" ON public.template_favorites
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());
-- Note: NO UPDATE policy — toggle = insert/delete (Pattern 3).

-- =========================================================================
-- gallery_templates_with_favorites VIEW (Pattern 4)
-- =========================================================================

CREATE OR REPLACE VIEW public.gallery_templates_with_favorites AS
SELECT
  gt.*,
  (tf.user_id IS NOT NULL) AS is_favorited
FROM public.gallery_templates gt
LEFT JOIN public.template_favorites tf
  ON  tf.template_id = gt.id
 AND  tf.editor_type = gt.editor_type
 AND  tf.user_id     = auth.uid();

COMMENT ON VIEW public.gallery_templates_with_favorites IS
  'Phase 173 — gallery_templates extended with per-user is_favorited. Caller-auth VIEW; auth.uid() filters the LEFT JOIN so each caller sees only their own favorites mapped to TRUE; all other rows surface is_favorited = FALSE. (TFAV-02, TFAV-03)';

-- =========================================================================
-- Self-assert (Pattern from migration 167:292-320)
-- =========================================================================

DO $$
DECLARE
  v_fav_count    INTEGER;
  v_view_count   INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_fav_count FROM public.template_favorites;
  SELECT COUNT(*) INTO v_view_count FROM public.gallery_templates_with_favorites;
  ASSERT v_fav_count >= 0, 'template_favorites not queryable';
  ASSERT v_view_count >= 0, 'gallery_templates_with_favorites VIEW not callable';
END $$;

COMMENT ON TABLE public.template_favorites IS 'Phase 173 — per-user template bookmarks (TFAV-01, TFAV-03). Per-user RLS via user_id = auth.uid(); no UPDATE policy (toggle = insert/delete).';
