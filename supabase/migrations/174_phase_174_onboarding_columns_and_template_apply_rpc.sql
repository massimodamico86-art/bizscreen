-- ============================================================================
-- Migration 174 — Phase 174: Scene Editor + Onboarding Integration
-- ============================================================================
-- Purpose:
--   1. Add completed_starter_pack + completed_gallery_tour columns to
--      onboarding_progress (D-12, D-16)
--   2. Create apply_template_to_active_slide RPC for editor-return mode (D-05)
--   3. Extend get_onboarding_progress return shape to include both new
--      columns (D-14, D-17)
--   4. Extend update_onboarding_step:
--      - Add explicit p_step allowlist (anti-SQL-injection guard for the
--        dynamic SQL `'completed_' || p_step` column reference)
--      - Extend is_complete AND chain to include completed_starter_pack
--        ONLY (gallery_tour is NOT a wizard step — Pitfall 3)
--      - Extend next_step CASE to insert 'starter_pack' between 'logo' and
--        'media' (per ONBOARDING_STEPS array order, D-07)
--   5. skip_onboarding() — unchanged (D-14 explicit note)
--
-- Properties:
--   - Additive: no DROP, no destructive changes
--   - Idempotent: ADD COLUMN IF NOT EXISTS + CREATE OR REPLACE FUNCTION
--   - No DOWN migration (project convention; matches 167/168/170/171/172/173)
--   - SECURITY DEFINER on new RPC; GRANT EXECUTE TO authenticated
--
-- Author authority: 174-CONTEXT.md (D-01..D-19), 174-RESEARCH.md (Pattern 2),
-- 174-PATTERNS.md (Section "supabase/migrations/174_*.sql")
-- ============================================================================


-- ============================================================================
-- SECTION 1 — Schema additions: onboarding_progress columns (D-12, D-16)
-- ============================================================================

-- D-12: completed_starter_pack — onboarding wizard step tracking
-- D-16: completed_gallery_tour — first-visit driver.js tour persistence
ALTER TABLE public.onboarding_progress
  ADD COLUMN IF NOT EXISTS completed_starter_pack BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS completed_gallery_tour  BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN public.onboarding_progress.completed_starter_pack
  IS 'Phase 174 D-12: TRUE when user has chosen or skipped the starter_pack onboarding step. Combined with skipped_at to derive tri-state per D-13 (chosen vs skipped vs not-reached).';

COMMENT ON COLUMN public.onboarding_progress.completed_gallery_tour
  IS 'Phase 174 D-16: TRUE when user has dismissed the first-visit driver.js gallery tour (any exit path per D-19). Single-shot — never re-appears once TRUE.';


-- ============================================================================
-- SECTION 2 — apply_template_to_active_slide RPC (D-05)
-- ============================================================================
-- First non-cloning apply RPC: mutates an EXISTING scene_slide.design_json
-- in-place rather than creating a new scene (cf. clone_svg_template_to_scene
-- in migration 170 and clone_template_with_customization in 168).
--
-- NOTE on scenes ownership column: scenes table uses `tenant_id` (verified
-- via supabase/migrations/067_create_scenes_and_onboarding.sql line 13 +
-- 069_scene_slides_and_design_json.sql RLS predicate). super_admin bypass
-- mirrors migrations 170/173 pattern.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.apply_template_to_active_slide(
  p_scene_id    uuid,
  p_slide_id    uuid,
  p_template_id uuid,
  p_editor_type text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id      uuid;
  v_has_access   boolean := false;
  v_svg_template svg_templates%ROWTYPE;
BEGIN
  -- Auth preamble (mirrors 170:52-56, 173:37-40)
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Polotno rejection (D-02 enforcement at RPC layer — server-side, not just client-side)
  IF p_editor_type != 'svg' THEN
    RAISE EXCEPTION 'Only SVG templates supported in editor-return mode';
  END IF;

  -- Scene ownership check (new for this RPC — scenes uses tenant_id; see NOTE above)
  IF NOT EXISTS (
    SELECT 1 FROM scenes
    WHERE id = p_scene_id
      AND (tenant_id = v_user_id OR EXISTS (
        SELECT 1 FROM profiles WHERE id = v_user_id AND role = 'super_admin'
      ))
  ) THEN
    RAISE EXCEPTION 'Scene not found or access denied';
  END IF;

  -- Slide-belongs-to-scene check (defense-in-depth; would also fail the UPDATE 0-row
  -- match below, but explicit RAISE gives a clean error message to the client).
  IF NOT EXISTS (
    SELECT 1 FROM scene_slides
    WHERE id = p_slide_id AND scene_id = p_scene_id
  ) THEN
    RAISE EXCEPTION 'Slide not found in scene';
  END IF;

  -- Read template — mirrors svg_templates SELECT RLS predicate (migration 167:39-45)
  SELECT * INTO v_svg_template
  FROM svg_templates
  WHERE id = p_template_id
    AND is_active = TRUE
    AND (tenant_id IS NULL OR created_by = v_user_id);

  -- super_admin parity bypass (mirrors 170:67-77, 173:50-60)
  IF v_svg_template IS NULL THEN
    SELECT role = 'super_admin' INTO v_has_access
    FROM profiles
    WHERE id = v_user_id;

    IF v_has_access THEN
      SELECT * INTO v_svg_template
      FROM svg_templates
      WHERE id = p_template_id AND is_active = TRUE;
    END IF;
  END IF;

  IF v_svg_template IS NULL THEN
    RAISE EXCEPTION 'Template not found or inactive';
  END IF;

  IF v_svg_template.svg_content IS NULL THEN
    RAISE EXCEPTION 'Template has no SVG body';
  END IF;

  -- Overwrite active slide's design_json.svgContent (jsonb_set creates the
  -- key if absent thanks to the create_missing=true flag).
  UPDATE scene_slides
  SET
    design_json = jsonb_set(
      COALESCE(design_json, '{}'::jsonb),
      '{svgContent}',
      to_jsonb(v_svg_template.svg_content),
      true
    ),
    updated_at = NOW()
  WHERE id = p_slide_id
    AND scene_id = p_scene_id;

  RETURN p_slide_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.apply_template_to_active_slide(uuid, uuid, uuid, text) TO authenticated;

COMMENT ON FUNCTION public.apply_template_to_active_slide(uuid, uuid, uuid, text)
  IS 'Phase 174 D-05: Atomically overwrite the svgContent of one scene_slide with the chosen SVG template. Polotno rejection enforced (D-02). Returns the updated slide UUID.';


-- ============================================================================
-- SECTION 3 — get_onboarding_progress() — extend return shape (D-14, D-17)
-- ============================================================================
-- Adds completed_starter_pack + completed_gallery_tour to the returned TABLE
-- shape, the SELECT projection, and the NOT FOUND defaults block. Preserves
-- all 10 existing columns and their order.
--
-- IDEMPOTENCY NOTE: PostgreSQL forbids `CREATE OR REPLACE FUNCTION` from
-- changing the row type defined by OUT parameters / RETURNS TABLE. Because
-- this migration extends the TABLE shape from 10 columns to 12, we MUST
-- drop the function first. The DROP IF EXISTS + CREATE pair is still
-- idempotent (re-running the migration drops then re-creates the function
-- with identical signature each time). No dependencies on this function
-- exist (verified pre-authoring via pg_depend probe).
-- ============================================================================

DROP FUNCTION IF EXISTS public.get_onboarding_progress();

CREATE OR REPLACE FUNCTION public.get_onboarding_progress()
RETURNS TABLE (
  completed_welcome BOOLEAN,
  completed_logo BOOLEAN,
  completed_first_screen BOOLEAN,
  completed_first_playlist BOOLEAN,
  completed_first_media BOOLEAN,
  completed_screen_pairing BOOLEAN,
  completed_starter_pack BOOLEAN,            -- Phase 174 addition (D-12)
  completed_gallery_tour BOOLEAN,            -- Phase 174 addition (D-16)
  is_complete BOOLEAN,
  current_step TEXT,
  completed_at TIMESTAMPTZ,
  skipped_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID := auth.uid();
BEGIN
  RETURN QUERY
  SELECT
    op.completed_welcome,
    op.completed_logo,
    op.completed_first_screen,
    op.completed_first_playlist,
    op.completed_first_media,
    op.completed_screen_pairing,
    op.completed_starter_pack,               -- Phase 174 addition
    op.completed_gallery_tour,               -- Phase 174 addition
    op.is_complete,
    op.current_step,
    op.completed_at,
    op.skipped_at
  FROM public.onboarding_progress op
  WHERE op.owner_id = v_user_id;

  -- If no record, return defaults
  IF NOT FOUND THEN
    RETURN QUERY
    SELECT
      false AS completed_welcome,
      false AS completed_logo,
      false AS completed_first_screen,
      false AS completed_first_playlist,
      false AS completed_first_media,
      false AS completed_screen_pairing,
      false AS completed_starter_pack,       -- Phase 174 addition
      false AS completed_gallery_tour,       -- Phase 174 addition
      false AS is_complete,
      'welcome'::TEXT AS current_step,
      NULL::TIMESTAMPTZ AS completed_at,
      NULL::TIMESTAMPTZ AS skipped_at;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_onboarding_progress() TO authenticated;

COMMENT ON FUNCTION public.get_onboarding_progress()
  IS 'Get current onboarding wizard progress (Phase 174: extended with completed_starter_pack + completed_gallery_tour).';


-- ============================================================================
-- SECTION 4 — update_onboarding_step() — allowlist + extended is_complete + next_step (D-14)
-- ============================================================================
-- Three changes from migration 034 body:
--   (a) Insert explicit allowlist guard at the TOP of the body (security V5 —
--       defends the dynamic '%I' format against arbitrary column writes).
--   (b) Extend is_complete AND chain to include completed_starter_pack ONLY
--       (Pitfall 3: completed_gallery_tour MUST stay OUT — the tour is a
--       gallery affordance, not a wizard step, and including it would block
--       wizard completion for users who haven't visited the gallery yet).
--   (c) Extend next_step CASE to insert 'starter_pack' between 'logo' and
--       'media' — matches ONBOARDING_STEPS array order from CONTEXT D-07.
-- The dynamic SQL itself (EXECUTE format with %I quoting) is preserved
-- VERBATIM — %I + the new allowlist together close the SQL injection surface.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.update_onboarding_step(
  p_step TEXT,
  p_completed BOOLEAN DEFAULT true
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_is_complete BOOLEAN;
  v_next_step TEXT;
BEGIN
  -- Phase 174: explicit allowlist guard (security V5 — prevents arbitrary
  -- column writes via the dynamic '%I' format expansion below).
  IF p_step NOT IN (
    'welcome','logo','first_media','first_playlist','first_screen',
    'screen_pairing','starter_pack','gallery_tour'
  ) THEN
    RAISE EXCEPTION 'Invalid onboarding step: %', p_step;
  END IF;

  -- Upsert onboarding progress
  INSERT INTO public.onboarding_progress (owner_id)
  VALUES (v_user_id)
  ON CONFLICT (owner_id) DO NOTHING;

  -- Update the specific step (PRESERVED VERBATIM from migration 034 — %I quoting
  -- + the allowlist above together close the SQL-injection surface).
  EXECUTE format(
    'UPDATE public.onboarding_progress SET %I = $1, last_step_at = NOW(), updated_at = NOW() WHERE owner_id = $2',
    'completed_' || p_step
  ) USING p_completed, v_user_id;

  -- Check if all wizard steps complete (Phase 174: + completed_starter_pack;
  -- Pitfall 3: completed_gallery_tour intentionally NOT in this AND chain —
  -- tour is a separate affordance, not a wizard step).
  SELECT
    completed_welcome AND completed_logo AND completed_first_screen AND
    completed_first_playlist AND completed_first_media AND completed_screen_pairing
    AND completed_starter_pack
  INTO v_is_complete
  FROM public.onboarding_progress
  WHERE owner_id = v_user_id;

  -- Update completion status
  IF v_is_complete THEN
    UPDATE public.onboarding_progress
    SET is_complete = true, completed_at = NOW()
    WHERE owner_id = v_user_id;
  END IF;

  -- Determine next step (Phase 174: insert 'starter_pack' between 'logo' and
  -- 'media' to match ONBOARDING_STEPS array order from CONTEXT D-07).
  SELECT
    CASE
      WHEN NOT completed_welcome        THEN 'welcome'
      WHEN NOT completed_logo           THEN 'logo'
      WHEN NOT completed_starter_pack   THEN 'starter_pack'
      WHEN NOT completed_first_media    THEN 'media'
      WHEN NOT completed_first_playlist THEN 'playlist'
      WHEN NOT completed_first_screen   THEN 'screen'
      WHEN NOT completed_screen_pairing THEN 'pairing'
      ELSE 'complete'
    END INTO v_next_step
  FROM public.onboarding_progress
  WHERE owner_id = v_user_id;

  -- Update current step
  UPDATE public.onboarding_progress
  SET current_step = v_next_step
  WHERE owner_id = v_user_id;

  RETURN jsonb_build_object(
    'success', true,
    'step', p_step,
    'completed', p_completed,
    'is_complete', COALESCE(v_is_complete, false),
    'next_step', v_next_step
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_onboarding_step(TEXT, BOOLEAN) TO authenticated;

COMMENT ON FUNCTION public.update_onboarding_step(TEXT, BOOLEAN)
  IS 'Update a specific onboarding step (Phase 174: extended with starter_pack/gallery_tour allowlist + is_complete chain + next_step CASE).';


-- ============================================================================
-- SECTION 5 — skip_onboarding() — UNCHANGED (D-14 explicit note)
-- ============================================================================
-- D-14 note: NO BODY CHANGE REQUIRED. The wizard-level skip writes
-- is_complete=TRUE + skipped_at in one shot. The new completed_starter_pack
-- column inherits its default (FALSE), which correctly represents
-- "skipped at wizard level, never reached the starter_pack step" per the
-- D-13 tri-state encoding (chosen vs skipped vs not-reached).
--
-- The new completed_gallery_tour column likewise inherits its default
-- (FALSE) — wizard-skipped users still see the gallery tour on first visit,
-- per D-17's "first visit, ever" trigger.
-- ============================================================================
