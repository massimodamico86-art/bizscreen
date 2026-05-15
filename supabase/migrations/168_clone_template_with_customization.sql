-- ============================================================================
-- Migration 168: Atomic clone-template-with-customization RPC (Phase 172, TPRV-04, TPRV-05)
--
-- Ships the atomic Apply RPC that closes the clone-then-patch race
-- (T-172-02 / TPRV-05). Mirrors `public.clone_template_to_scene(uuid, text)` as
-- redefined by migration 110 (Phase 166.2) — same auth check, same license
-- gate, same super_admin override, same scene INSERT, same slide loop —
-- but adds `p_customized_svg text DEFAULT NULL` as a third parameter and
-- patches each cloned slide's `design_json.svgContent` via `jsonb_set` when
-- a customized SVG is supplied.
--
-- Operation executes in a single PL/pgSQL function. PL/pgSQL functions run in
-- the caller's transaction, so the scene INSERT + all slide INSERTs are atomic
-- by construction. No separate client UPDATE path. This closes TPRV-05.
--
-- T-172-03 (license-tier bypass) is mitigated by inheriting the license gate
-- from migration 110. `free`/`pro` are accessible to any authenticated user
-- (per Phase 166.2 D-01 — the `plan_tier` column was removed). `enterprise`
-- requires a row in `template_enterprise_access`. `super_admin` bypass is
-- preserved.
--
-- T-172-01 (SVG XSS) disposition = accept at RPC layer per 172 threat model.
-- Client-side DOMPurify sanitization in Plan 03 (templateApplyService.applyTemplate)
-- is the sole mitigation. The RPC is a dumb persistor per 172-CONTEXT.md D-10:
-- it writes `p_customized_svg` verbatim to `scene_slides.design_json.svgContent`
-- using `to_jsonb(p_customized_svg)` (parameterized; no SQL injection vector
-- per T-172-07).
--
-- License gate deviation from migration 080 literal:
--   migration 080 referenced `profiles.plan_tier` — the column was dropped
--   before migration 110 shipped (Phase 166.2 fixed the 42703 error). The
--   gate this migration mirrors is therefore migration 110's, not 080's.
--   Pro is treated as free; enterprise still allow-list gated; super_admin
--   bypass retained. See 110_fix_can_access_template.sql and
--   166.2-CONTEXT.md D-01/D-02/D-04.
--
-- No DOWN migration (matches 080/110/167 convention).
-- ============================================================================

CREATE OR REPLACE FUNCTION public.clone_template_with_customization(
  p_template_id uuid,
  p_scene_name text DEFAULT NULL,
  p_customized_svg text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_template template_library%ROWTYPE;
  v_has_access boolean := false;
  v_new_scene_id uuid;
  v_slide record;
BEGIN
  -- Get authenticated user
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Get template
  SELECT * INTO v_template
  FROM template_library
  WHERE id = p_template_id AND is_active = true;

  IF v_template IS NULL THEN
    RAISE EXCEPTION 'Template not found or inactive';
  END IF;

  -- Check license access (Phase 166.2 D-01: pro treated as free;
  -- enterprise still requires allow-list; super_admin bypass below).
  IF v_template.license IN ('free', 'pro') THEN
    v_has_access := true;
  ELSIF v_template.license = 'enterprise' THEN
    SELECT EXISTS (
      SELECT 1 FROM template_enterprise_access
      WHERE template_id = p_template_id
      AND tenant_id = v_user_id
    ) INTO v_has_access;
  END IF;

  -- Super admins always have access
  IF NOT v_has_access THEN
    SELECT role = 'super_admin' INTO v_has_access
    FROM profiles
    WHERE id = v_user_id;
  END IF;

  IF NOT v_has_access THEN
    RAISE EXCEPTION 'Access denied: insufficient plan tier for this template';
  END IF;

  -- Create new scene
  INSERT INTO scenes (
    tenant_id,
    name,
    business_type,
    settings,
    is_active
  ) VALUES (
    v_user_id,
    COALESCE(p_scene_name, v_template.name || ' (Copy)'),
    v_template.industry,
    COALESCE(v_template.metadata, '{}'::jsonb),
    true
  )
  RETURNING id INTO v_new_scene_id;

  -- Clone slides from template, patching design_json.svgContent with the
  -- client-sanitized customized SVG when p_customized_svg is provided.
  -- jsonb_set is parameterized via to_jsonb(p_customized_svg) (T-172-07).
  FOR v_slide IN
    SELECT position, title, kind, design_json, duration_seconds
    FROM template_library_slides
    WHERE template_id = p_template_id
    ORDER BY position
  LOOP
    INSERT INTO scene_slides (
      scene_id,
      position,
      title,
      kind,
      design_json,
      duration_seconds
    ) VALUES (
      v_new_scene_id,
      v_slide.position,
      v_slide.title,
      v_slide.kind,
      CASE
        WHEN p_customized_svg IS NOT NULL
          THEN jsonb_set(
                 COALESCE(v_slide.design_json, '{}'::jsonb),
                 '{svgContent}',
                 to_jsonb(p_customized_svg)
               )
        ELSE v_slide.design_json
      END,
      v_slide.duration_seconds
    );
  END LOOP;

  -- NOTE: usage-count increment intentionally omitted.
  -- Deferred to Phase 175 per 172-CONTEXT.md Deferred Ideas and v20.0 research.
  -- Re-introduce via a later migration when Phase 175 ships.

  RETURN v_new_scene_id;
END;
$$;

-- Grant execute permission (mirrors migration 080:287 with the 3-arg signature).
GRANT EXECUTE ON FUNCTION public.clone_template_with_customization(uuid, text, text) TO authenticated;

COMMENT ON FUNCTION public.clone_template_with_customization(uuid, text, text) IS
  'Phase 172 TPRV-04/TPRV-05: Atomic clone of a template_library row into scenes + scene_slides, patching slide design_json.svgContent with the client-sanitized customized SVG when provided. Mirrors clone_template_to_scene security/license gate (as redefined by migration 110). Single PL/pgSQL transaction closes the clone-then-patch race.';
