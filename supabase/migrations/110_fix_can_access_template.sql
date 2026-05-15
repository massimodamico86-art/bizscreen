-- ============================================================================
-- Migration 110: Fix can_access_template and clone_template_to_scene RPCs
-- Phase 166.2 — fix-can-access-template-rpc
--
-- Removes the invalid `profiles` column reference that caused 42703 errors
-- from both `public.can_access_template(uuid)` and
-- `public.clone_template_to_scene(uuid, text)`.
--
-- Per D-01: `license = 'pro'` templates are treated identically to `free`
-- (accessible to any authenticated user) because no subscription column has ever
-- existed, no subscription UI exists to gate against, and all 9 seeded rows
-- have license = 'free'. Re-gating pro templates when billing/entitlements land
-- is tracked in the deferred block of 166.2-CONTEXT.md.
--
-- Per D-02: Enterprise allow-list gating is preserved unchanged. Access to
-- `license = 'enterprise'` templates still requires an entry in
-- `template_enterprise_access` keyed on (template_id, tenant_id), with the
-- existing `profiles.role = 'super_admin'` bypass retained.
--
-- Per D-04: Additive `CREATE OR REPLACE` approach — migration 080 is NOT
-- edited in place (edits to already-applied migrations do not re-run on remote
-- Supabase environments).
--
-- This migration contains exactly two CREATE OR REPLACE FUNCTION blocks plus
-- their GRANT EXECUTE re-issues. No schema changes, no data changes.
-- ============================================================================

-- ============================================================================
-- 1. can_access_template(uuid)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.can_access_template(p_template_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_template_license text;
  v_user_role text;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN false;
  END IF;

  -- Get template license
  SELECT license INTO v_template_license
  FROM template_library
  WHERE id = p_template_id AND is_active = true;

  IF v_template_license IS NULL THEN
    RETURN false;
  END IF;

  -- Super admins always have access
  SELECT role INTO v_user_role
  FROM profiles
  WHERE id = v_user_id;

  IF v_user_role = 'super_admin' THEN
    RETURN true;
  END IF;

  -- Check by license type
  -- NOTE: Phase 166.2 D-01 — plan-tier gate removed. `free` and `pro`
  -- templates are both accessible to any authenticated user. If paid
  -- entitlements are reintroduced, re-gate `pro` here by joining
  -- subscriptions + plans (tables exist in migration 017).
  IF v_template_license IN ('free', 'pro') THEN
    RETURN true;
  ELSIF v_template_license = 'enterprise' THEN
    RETURN EXISTS (
      SELECT 1 FROM template_enterprise_access
      WHERE template_id = p_template_id
      AND tenant_id = v_user_id
    );
  END IF;

  RETURN false;
END;
$$;

GRANT EXECUTE ON FUNCTION public.can_access_template(uuid) TO authenticated;

-- ============================================================================
-- 2. clone_template_to_scene(uuid, text)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.clone_template_to_scene(
  p_template_id uuid,
  p_scene_name text DEFAULT NULL
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

  -- Clone slides from template
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
      v_slide.design_json,
      v_slide.duration_seconds
    );
  END LOOP;

  -- Increment install count
  UPDATE template_library
  SET install_count = install_count + 1,
      updated_at = now()
  WHERE id = p_template_id;

  RETURN v_new_scene_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.clone_template_to_scene(uuid, text) TO authenticated;
