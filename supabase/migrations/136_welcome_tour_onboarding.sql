-- =====================================================
-- BIZSCREEN: WELCOME TOUR ONBOARDING (Phase 23)
-- =====================================================
-- Extends onboarding_progress table with welcome tour tracking:
-- - Tour completion status
-- - Current tour step
-- - Tour skip timestamp
-- Plus RPCs for getting/updating/skipping the welcome tour
-- =====================================================

-- =====================================================
-- EXTEND ONBOARDING_PROGRESS TABLE
-- =====================================================

-- Add tour-specific columns to existing onboarding_progress table
ALTER TABLE public.onboarding_progress
  ADD COLUMN IF NOT EXISTS completed_welcome_tour BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS current_tour_step INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tour_skipped_at TIMESTAMPTZ;

-- Add index for quick lookup of incomplete welcome tours
CREATE INDEX IF NOT EXISTS idx_onboarding_welcome_tour
  ON public.onboarding_progress(completed_welcome_tour)
  WHERE completed_welcome_tour = false;

COMMENT ON COLUMN public.onboarding_progress.completed_welcome_tour IS 'Whether user has completed the welcome feature tour';
COMMENT ON COLUMN public.onboarding_progress.current_tour_step IS 'Current step index in the welcome tour (0-based)';
COMMENT ON COLUMN public.onboarding_progress.tour_skipped_at IS 'When the welcome tour was skipped (NULL if not skipped)';

-- =====================================================
-- RPC: Get Welcome Tour Progress
-- =====================================================

CREATE OR REPLACE FUNCTION public.get_welcome_tour_progress()
RETURNS TABLE (
  completed_welcome_tour BOOLEAN,
  current_tour_step INTEGER,
  tour_skipped_at TIMESTAMPTZ,
  skipped_at TIMESTAMPTZ
)
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

  RETURN QUERY
  SELECT
    op.completed_welcome_tour,
    op.current_tour_step,
    op.tour_skipped_at,
    op.skipped_at
  FROM public.onboarding_progress op
  WHERE op.owner_id = v_user_id;
END;
$$;

COMMENT ON FUNCTION public.get_welcome_tour_progress() IS 'Get current welcome tour progress for authenticated user';

-- =====================================================
-- RPC: Update Welcome Tour Step
-- =====================================================

CREATE OR REPLACE FUNCTION public.update_welcome_tour_step(
  p_step INTEGER,
  p_completed BOOLEAN DEFAULT false
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_result JSONB;
BEGIN
  -- Ensure row exists for the user
  INSERT INTO public.onboarding_progress (owner_id)
  VALUES (v_user_id)
  ON CONFLICT (owner_id) DO NOTHING;

  IF p_completed THEN
    -- Mark tour as complete
    UPDATE public.onboarding_progress
    SET completed_welcome_tour = true,
        current_tour_step = p_step,
        updated_at = now()
    WHERE owner_id = v_user_id;
  ELSE
    -- Update current step only
    UPDATE public.onboarding_progress
    SET current_tour_step = p_step,
        updated_at = now()
    WHERE owner_id = v_user_id;
  END IF;

  v_result := jsonb_build_object(
    'success', true,
    'step', p_step,
    'completed', p_completed
  );

  RETURN v_result;
END;
$$;

COMMENT ON FUNCTION public.update_welcome_tour_step(INTEGER, BOOLEAN) IS 'Update welcome tour step progress';

-- =====================================================
-- RPC: Skip Welcome Tour
-- =====================================================

CREATE OR REPLACE FUNCTION public.skip_welcome_tour()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID := auth.uid();
BEGIN
  INSERT INTO public.onboarding_progress (owner_id, tour_skipped_at)
  VALUES (v_user_id, now())
  ON CONFLICT (owner_id)
  DO UPDATE SET
    tour_skipped_at = now(),
    updated_at = now();

  RETURN jsonb_build_object('success', true);
END;
$$;

COMMENT ON FUNCTION public.skip_welcome_tour() IS 'Skip the welcome tour for authenticated user';

-- =====================================================
-- GRANT PERMISSIONS
-- =====================================================

GRANT EXECUTE ON FUNCTION public.get_welcome_tour_progress() TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_welcome_tour_step(INTEGER, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION public.skip_welcome_tour() TO authenticated;

-- =====================================================
-- COMPLETION NOTICE
-- =====================================================

DO $$ BEGIN RAISE NOTICE 'Migration 136 completed: Welcome tour tracking added to onboarding_progress'; END $$;
