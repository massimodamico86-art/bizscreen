-- ============================================================================
-- Migration 170: Atomic clone-svg-template-to-scene RPC (Phase 172.1)
--
-- Sibling RPC to migration 168's clone_template_with_customization, but
-- sources rows from svg_templates (not the legacy catalog table read by
-- 168). Fixes the "Template not found or inactive" regression surfaced by
-- Phase 172 live UAT (2026-04-21): migration 168's function reads only
-- from its own catalog source, so every editor_type='svg' Apply failed
-- (all 24 active svg_templates rows).
--
-- Signature mirrors migration 168 for dispatch symmetry (172.1 D-04):
--   clone_svg_template_to_scene(uuid, text, text) RETURNS uuid
--
-- Operation is a single PL/pgSQL function. PL/pgSQL runs in the caller's
-- transaction, so scene INSERT + scene_slides INSERT are atomic by
-- construction. Mirrors migration 168's TPRV-05 atomicity contract.
--
-- License gate: NONE (172.1 D-09). svg_templates has no `license` column.
-- Access is restricted to the same predicate as svg_templates SELECT RLS
-- (migration 167:39-45, which closed TDAT-03): is_active=TRUE AND
-- (tenant_id IS NULL OR created_by = auth.uid()). super_admin bypass
-- retained for parity with migration 168.
--
-- SVG content resolution priority (172.1 D-05):
--   1. p_customized_svg if non-null → written into design_json.svgContent
--   2. svg_templates.svg_content column value
--   3. RAISE EXCEPTION 'Template has no SVG body' (deterministic)
--
-- Migration 168 is immutable (172.1 D-03) — this adds a sibling, never
-- CREATE OR REPLACEs 168's body.
--
-- No DOWN migration (matches 080/110/167/168 convention).
-- ============================================================================

CREATE OR REPLACE FUNCTION public.clone_svg_template_to_scene(
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
  v_template svg_templates%ROWTYPE;
  v_has_access boolean := false;
  v_new_scene_id uuid;
  v_resolved_svg text;
BEGIN
  -- Get authenticated user
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Get template — mirrors svg_templates SELECT RLS (migration 167:39-45)
  SELECT * INTO v_template
  FROM svg_templates
  WHERE id = p_template_id
    AND is_active = TRUE
    AND (tenant_id IS NULL OR created_by = v_user_id);

  -- super_admin parity bypass (D-10): if the RLS-scoped SELECT missed,
  -- allow super_admins to fetch the row unrestricted (mirror 168:84-89).
  IF v_template IS NULL THEN
    SELECT role = 'super_admin' INTO v_has_access
    FROM profiles
    WHERE id = v_user_id;

    IF v_has_access THEN
      SELECT * INTO v_template
      FROM svg_templates
      WHERE id = p_template_id AND is_active = TRUE;
    END IF;
  END IF;

  IF v_template IS NULL THEN
    RAISE EXCEPTION 'Template not found or inactive';
  END IF;

  -- Resolve SVG body per 172.1 D-05:
  --   1. p_customized_svg if non-null  → client-sanitized customized SVG
  --   2. svg_templates.svg_content     → backfilled static-file content (migration 169)
  --   3. RAISE EXCEPTION               → deterministic surface of missing seed
  IF p_customized_svg IS NOT NULL THEN
    v_resolved_svg := p_customized_svg;
  ELSIF v_template.svg_content IS NOT NULL THEN
    v_resolved_svg := v_template.svg_content;
  ELSE
    RAISE EXCEPTION 'Template has no SVG body';
  END IF;

  -- Create new scene (field mapping per 172.1-CONTEXT.md §Claude's Discretion)
  INSERT INTO scenes (
    tenant_id,
    name,
    business_type,
    settings,
    is_active
  ) VALUES (
    v_user_id,
    COALESCE(p_scene_name, v_template.name || ' (Copy)'),
    v_template.category,
    jsonb_build_object(
      'width',       v_template.width,
      'height',      v_template.height,
      'orientation', v_template.orientation
    ),
    true
  )
  RETURNING id INTO v_new_scene_id;

  -- Single slide row (svg_templates has no companion slides table — unlike
  -- 168's source, which has a per-template slides child). Shape per 172.1 §Claude's Discretion.
  INSERT INTO scene_slides (
    scene_id,
    position,
    title,
    kind,
    design_json,
    duration_seconds
  ) VALUES (
    v_new_scene_id,
    0,
    v_template.name,
    'default',
    jsonb_build_object('svgContent', v_resolved_svg),
    10
  );

  -- NOTE: usage-count increment intentionally omitted.
  -- Mirrors migration 168:145-147 — deferred to Phase 175.

  RETURN v_new_scene_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.clone_svg_template_to_scene(uuid, text, text) TO authenticated;

COMMENT ON FUNCTION public.clone_svg_template_to_scene(uuid, text, text) IS
  'Phase 172.1: Atomic clone of an svg_templates row into scenes + scene_slides, writing the resolved SVG body (p_customized_svg > svg_templates.svg_content > RAISE) into scene_slides.design_json.svgContent. Mirrors clone_template_with_customization atomicity (single PL/pgSQL transaction). Access mirrors svg_templates SELECT RLS (migration 167) with super_admin bypass.';
