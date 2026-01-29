-- =====================================================
-- BIZSCREEN: UNIFIED ONBOARDING STATE (Phase 30)
-- =====================================================
-- Extends onboarding_progress table with unified state tracking:
-- - current_unified_step: Position in unified flow
-- - onboarding_version: Schema version for migrations
-- - screen_pairing_completed_at: When screen pairing was done
-- Plus RPCs for getting state, advancing steps, and completing onboarding
-- =====================================================

-- =====================================================
-- EXTEND ONBOARDING_PROGRESS TABLE
-- =====================================================

-- Add unified state tracking columns
ALTER TABLE public.onboarding_progress
  ADD COLUMN IF NOT EXISTS current_unified_step TEXT DEFAULT 'welcome_tour',
  ADD COLUMN IF NOT EXISTS onboarding_version INTEGER DEFAULT 2,
  ADD COLUMN IF NOT EXISTS screen_pairing_completed_at TIMESTAMPTZ;

-- Add index for quick lookup of incomplete onboarding flows
CREATE INDEX IF NOT EXISTS idx_onboarding_unified_step
  ON public.onboarding_progress(current_unified_step)
  WHERE current_unified_step != 'complete';

COMMENT ON COLUMN public.onboarding_progress.current_unified_step IS 'Current position in unified onboarding flow (welcome_tour, industry_selection, starter_pack, screen_pairing, complete)';
COMMENT ON COLUMN public.onboarding_progress.onboarding_version IS 'Schema version for handling future migrations (2 = v2.2 unified flow)';
COMMENT ON COLUMN public.onboarding_progress.screen_pairing_completed_at IS 'Timestamp when screen pairing step was completed (for activation tracking)';

-- =====================================================
-- RPC: Get Unified Onboarding State
-- =====================================================

CREATE OR REPLACE FUNCTION public.get_unified_onboarding_state()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_result JSONB;
  v_current_step TEXT;
  v_is_complete BOOLEAN;
  v_skipped_at TIMESTAMPTZ;
  v_progress_percent INTEGER;
  v_can_resume BOOLEAN;
  v_completed_welcome_tour BOOLEAN;
  v_starter_pack_applied BOOLEAN;
  v_screen_pairing_completed_at TIMESTAMPTZ;
BEGIN
  -- Return default state if not authenticated
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'current_step', 'welcome_tour',
      'can_resume', false,
      'progress_percent', 0,
      'is_complete', false,
      'skipped_at', NULL
    );
  END IF;

  -- Ensure row exists for the user
  INSERT INTO public.onboarding_progress (owner_id)
  VALUES (v_user_id)
  ON CONFLICT (owner_id) DO NOTHING;

  -- Get current state
  SELECT
    COALESCE(current_unified_step, 'welcome_tour'),
    COALESCE(is_complete, false),
    skipped_at,
    COALESCE(completed_welcome_tour, false),
    COALESCE(starter_pack_applied, false),
    screen_pairing_completed_at
  INTO
    v_current_step,
    v_is_complete,
    v_skipped_at,
    v_completed_welcome_tour,
    v_starter_pack_applied,
    v_screen_pairing_completed_at
  FROM public.onboarding_progress
  WHERE owner_id = v_user_id;

  -- Calculate progress_percent based on completed steps
  -- Steps: welcome_tour (0-25%), industry_selection (25-50%), starter_pack (50-75%), screen_pairing (75-100%)
  v_progress_percent := 0;

  IF v_is_complete OR v_current_step = 'complete' THEN
    v_progress_percent := 100;
  ELSIF v_screen_pairing_completed_at IS NOT NULL OR v_current_step = 'screen_pairing' THEN
    v_progress_percent := 75;
  ELSIF v_starter_pack_applied OR v_current_step = 'starter_pack' THEN
    v_progress_percent := 50;
  ELSIF v_completed_welcome_tour OR v_current_step = 'industry_selection' THEN
    v_progress_percent := 25;
  END IF;

  -- can_resume is true if not complete and not skipped
  v_can_resume := NOT v_is_complete AND v_skipped_at IS NULL;

  v_result := jsonb_build_object(
    'current_step', v_current_step,
    'can_resume', v_can_resume,
    'progress_percent', v_progress_percent,
    'is_complete', v_is_complete,
    'skipped_at', v_skipped_at
  );

  RETURN v_result;
END;
$$;

COMMENT ON FUNCTION public.get_unified_onboarding_state() IS 'Get unified onboarding state including current step, progress, and can-resume flag';

-- =====================================================
-- RPC: Advance Onboarding Step
-- =====================================================

CREATE OR REPLACE FUNCTION public.advance_onboarding_step(
  p_completed_step TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_result JSONB;
  v_next_step TEXT;
  v_is_complete BOOLEAN := false;
  v_valid_steps TEXT[] := ARRAY['welcome_tour', 'industry_selection', 'starter_pack', 'screen_pairing', 'complete'];
BEGIN
  -- Validate step is in allowed list
  IF NOT (p_completed_step = ANY(v_valid_steps)) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Invalid step: ' || p_completed_step
    );
  END IF;

  -- Ensure row exists for the user
  INSERT INTO public.onboarding_progress (owner_id)
  VALUES (v_user_id)
  ON CONFLICT (owner_id) DO NOTHING;

  -- Determine next step in sequence
  CASE p_completed_step
    WHEN 'welcome_tour' THEN
      v_next_step := 'industry_selection';
    WHEN 'industry_selection' THEN
      v_next_step := 'starter_pack';
    WHEN 'starter_pack' THEN
      v_next_step := 'screen_pairing';
    WHEN 'screen_pairing' THEN
      v_next_step := 'complete';
      v_is_complete := true;
    WHEN 'complete' THEN
      v_next_step := 'complete';
      v_is_complete := true;
    ELSE
      v_next_step := p_completed_step;
  END CASE;

  -- Update the state based on completed step
  IF p_completed_step = 'screen_pairing' THEN
    -- Completing screen_pairing sets timestamp and marks complete
    UPDATE public.onboarding_progress
    SET current_unified_step = v_next_step,
        screen_pairing_completed_at = now(),
        is_complete = v_is_complete,
        completed_at = CASE WHEN v_is_complete THEN COALESCE(completed_at, now()) ELSE completed_at END,
        updated_at = now()
    WHERE owner_id = v_user_id;
  ELSIF v_is_complete THEN
    -- Advancing to complete
    UPDATE public.onboarding_progress
    SET current_unified_step = v_next_step,
        is_complete = true,
        completed_at = COALESCE(completed_at, now()),
        updated_at = now()
    WHERE owner_id = v_user_id;
  ELSE
    -- Normal step advancement
    UPDATE public.onboarding_progress
    SET current_unified_step = v_next_step,
        updated_at = now()
    WHERE owner_id = v_user_id;
  END IF;

  v_result := jsonb_build_object(
    'success', true,
    'current_step', p_completed_step,
    'next_step', v_next_step,
    'is_complete', v_is_complete
  );

  RETURN v_result;
END;
$$;

COMMENT ON FUNCTION public.advance_onboarding_step(TEXT) IS 'Advance to next onboarding step after completing current step';

-- =====================================================
-- RPC: Complete Unified Onboarding
-- =====================================================

CREATE OR REPLACE FUNCTION public.complete_unified_onboarding()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID := auth.uid();
BEGIN
  -- Ensure row exists for the user
  INSERT INTO public.onboarding_progress (owner_id)
  VALUES (v_user_id)
  ON CONFLICT (owner_id) DO NOTHING;

  -- Set complete state
  UPDATE public.onboarding_progress
  SET is_complete = true,
      current_unified_step = 'complete',
      completed_at = COALESCE(completed_at, now()),
      updated_at = now()
  WHERE owner_id = v_user_id;

  RETURN jsonb_build_object('success', true);
END;
$$;

COMMENT ON FUNCTION public.complete_unified_onboarding() IS 'Mark unified onboarding as complete';

-- =====================================================
-- GRANT PERMISSIONS
-- =====================================================

GRANT EXECUTE ON FUNCTION public.get_unified_onboarding_state() TO authenticated;
GRANT EXECUTE ON FUNCTION public.advance_onboarding_step(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.complete_unified_onboarding() TO authenticated;

-- =====================================================
-- COMPLETION NOTICE
-- =====================================================

DO $$ BEGIN RAISE NOTICE 'Migration 139 completed: Unified onboarding state tracking added to onboarding_progress'; END $$;
