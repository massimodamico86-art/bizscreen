-- ============================================================================
-- Migration 173 — apply_starter_pack RPC (atomic bulk clone)
-- Phase 173 (Starter Packs + Favorites) — TPCK-02
--
-- Single PL/pgSQL transaction. Iterates pack members in (position ASC, template_id ASC)
-- order; for each, inlines the body of:
--   - migration 170 clone_svg_template_to_scene (svg branch)
--   - migration 168 clone_template_with_customization (polotno branch)
--
-- All-or-nothing: any RAISE EXCEPTION rolls back ALL prior member inserts
-- (CONTEXT D-07; Pattern 1 — does NOT call the single-template RPCs).
--
-- p_customized_svg is NULL for every member (CONTEXT D-08 — bulk apply
-- skips customization; users customize per-scene afterward).
--
-- Returns uuid[] of new scene IDs in pack-member order. Empty pack returns [].
-- ============================================================================

CREATE OR REPLACE FUNCTION public.apply_starter_pack(p_pack_id uuid)
RETURNS uuid[]
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id        uuid;
  v_pack           template_packs%ROWTYPE;
  v_member         template_pack_items%ROWTYPE;
  v_svg_template   svg_templates%ROWTYPE;
  v_lib_template   template_library%ROWTYPE;
  v_slide          record;
  v_new_scene_id   uuid;
  v_result         uuid[] := '{}';
  v_is_super_admin boolean := false;
BEGIN
  -- Auth preamble (Pattern C — matches 170:52-56, 168:57-61)
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Pack access — mirror template_packs SELECT RLS predicate explicitly so
  -- SECURITY DEFINER cannot grant broader access than a plain SELECT would.
  SELECT * INTO v_pack
  FROM template_packs
  WHERE id = p_pack_id
    AND is_active = TRUE
    AND (tenant_id IS NULL OR tenant_id = v_user_id);

  -- super_admin parity bypass (Pattern D — 170:67-77, 168:84-89)
  IF v_pack IS NULL THEN
    SELECT role = 'super_admin' INTO v_is_super_admin
    FROM profiles
    WHERE id = v_user_id;
    IF v_is_super_admin THEN
      SELECT * INTO v_pack FROM template_packs
      WHERE id = p_pack_id AND is_active = TRUE;
    END IF;
  END IF;

  IF v_pack IS NULL THEN
    RAISE EXCEPTION 'Pack not found or inactive';
  END IF;

  -- Iterate members in pack order
  FOR v_member IN
    SELECT * FROM template_pack_items
    WHERE pack_id = p_pack_id
    ORDER BY position ASC, template_id ASC
  LOOP
    IF v_member.editor_type = 'svg' THEN
      -- ============ SVG BRANCH (inlined from migration 170) ============

      SELECT * INTO v_svg_template
      FROM svg_templates
      WHERE id = v_member.template_id
        AND is_active = TRUE
        AND (tenant_id IS NULL OR created_by = v_user_id);

      IF v_svg_template IS NULL AND v_is_super_admin THEN
        SELECT * INTO v_svg_template
        FROM svg_templates
        WHERE id = v_member.template_id AND is_active = TRUE;
      END IF;

      IF v_svg_template IS NULL THEN
        RAISE EXCEPTION 'SVG member template not found or inactive: %', v_member.template_id;
      END IF;

      IF v_svg_template.svg_content IS NULL THEN
        RAISE EXCEPTION 'SVG member template has no SVG body: %', v_member.template_id;
      END IF;

      INSERT INTO scenes (tenant_id, name, business_type, settings, is_active)
      VALUES (
        v_user_id,
        v_svg_template.name,  -- D-08 + Claude's Discretion: no '(Copy)' suffix, no pack lineage
        v_svg_template.category,
        jsonb_build_object(
          'width',       v_svg_template.width,
          'height',      v_svg_template.height,
          'orientation', v_svg_template.orientation
        ),
        true
      )
      RETURNING id INTO v_new_scene_id;

      -- W-1 / D-08: svg_content is written verbatim — NO regexp_replace on data-customize-* attributes.
      -- Per CONTEXT D-08 the RPC writes raw SVG; users customize per-scene afterward via QuickCustomize
      -- in the editor (data-customize-* attributes are preserved so the existing per-scene customization
      -- pipeline behaves identically to the single-template Apply path).
      INSERT INTO scene_slides (scene_id, position, title, kind, design_json, duration_seconds)
      VALUES (
        v_new_scene_id,
        0,
        v_svg_template.name,
        'default',
        jsonb_build_object('svgContent', v_svg_template.svg_content),
        10
      );

    ELSIF v_member.editor_type = 'polotno' THEN
      -- ============ POLOTNO BRANCH (inlined from migration 168) ============

      SELECT * INTO v_lib_template
      FROM template_library
      WHERE id = v_member.template_id AND is_active = TRUE;

      IF v_lib_template IS NULL THEN
        RAISE EXCEPTION 'Polotno member template not found or inactive: %', v_member.template_id;
      END IF;

      -- License check (mirrors 168:74-93; pro treated as free per Phase 166.2 D-01)
      IF v_lib_template.license NOT IN ('free','pro') THEN
        IF v_lib_template.license = 'enterprise' THEN
          IF NOT EXISTS (
            SELECT 1 FROM template_enterprise_access
            WHERE template_id = v_member.template_id AND tenant_id = v_user_id
          ) AND NOT v_is_super_admin THEN
            RAISE EXCEPTION 'Access denied: insufficient plan tier for pack member';
          END IF;
        END IF;
      END IF;

      INSERT INTO scenes (tenant_id, name, business_type, settings, is_active)
      VALUES (
        v_user_id,
        v_lib_template.name,
        v_lib_template.industry,
        COALESCE(v_lib_template.metadata, '{}'::jsonb),
        true
      )
      RETURNING id INTO v_new_scene_id;

      -- Clone all slides (p_customized_svg is NULL per D-08 → no jsonb_set patch)
      FOR v_slide IN
        SELECT position, title, kind, design_json, duration_seconds
        FROM template_library_slides
        WHERE template_id = v_member.template_id
        ORDER BY position
      LOOP
        INSERT INTO scene_slides (scene_id, position, title, kind, design_json, duration_seconds)
        VALUES (
          v_new_scene_id,
          v_slide.position,
          v_slide.title,
          v_slide.kind,
          v_slide.design_json,
          v_slide.duration_seconds
        );
      END LOOP;

    ELSE
      RAISE EXCEPTION 'Unknown editor_type in pack member: %', v_member.editor_type;
    END IF;

    v_result := array_append(v_result, v_new_scene_id);
  END LOOP;

  -- Empty packs return empty array (not an error) — matches "no-op if empty" UX intent.
  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.apply_starter_pack(uuid) TO authenticated;

COMMENT ON FUNCTION public.apply_starter_pack(uuid) IS
  'Phase 173 TPCK-02: atomic bulk clone of a starter pack. Inlines bodies of clone_svg_template_to_scene (170) and clone_template_with_customization (168) per member. Returns new scene UUIDs in pack-member order. Single PL/pgSQL transaction — all-or-nothing rollback on any member failure.';
