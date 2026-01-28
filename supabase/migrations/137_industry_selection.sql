-- =====================================================
-- BIZSCREEN: INDUSTRY SELECTION & STARTER PACK TRACKING (Phase 23)
-- =====================================================
-- Extends onboarding_progress table with:
-- - Industry selection (10-12 business types)
-- - Starter pack application tracking
-- Plus RPCs for getting/setting industry and marking pack as applied
-- =====================================================

-- =====================================================
-- EXTEND ONBOARDING_PROGRESS TABLE
-- =====================================================

-- Add industry selection and starter pack tracking columns
ALTER TABLE public.onboarding_progress
  ADD COLUMN IF NOT EXISTS selected_industry TEXT,
  ADD COLUMN IF NOT EXISTS industry_selected_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS starter_pack_applied BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS starter_pack_applied_at TIMESTAMPTZ;

-- Add index for industry filtering
CREATE INDEX IF NOT EXISTS idx_onboarding_selected_industry
  ON public.onboarding_progress(selected_industry)
  WHERE selected_industry IS NOT NULL;

COMMENT ON COLUMN public.onboarding_progress.selected_industry IS 'User-selected business type for template suggestions';
COMMENT ON COLUMN public.onboarding_progress.industry_selected_at IS 'When user selected their industry';
COMMENT ON COLUMN public.onboarding_progress.starter_pack_applied IS 'Whether user has applied a starter pack during onboarding';
COMMENT ON COLUMN public.onboarding_progress.starter_pack_applied_at IS 'When starter pack was applied';

-- =====================================================
-- RPC: Set Selected Industry
-- =====================================================

CREATE OR REPLACE FUNCTION public.set_selected_industry(
  p_industry TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID := auth.uid();
BEGIN
  -- Ensure row exists for the user
  INSERT INTO public.onboarding_progress (owner_id, selected_industry, industry_selected_at)
  VALUES (v_user_id, p_industry, now())
  ON CONFLICT (owner_id)
  DO UPDATE SET
    selected_industry = p_industry,
    industry_selected_at = now(),
    updated_at = now();

  RETURN jsonb_build_object('success', true, 'industry', p_industry);
END;
$$;

COMMENT ON FUNCTION public.set_selected_industry(TEXT) IS 'Set user selected business industry for template filtering';

-- =====================================================
-- RPC: Get Selected Industry
-- =====================================================

CREATE OR REPLACE FUNCTION public.get_selected_industry()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_industry TEXT;
  v_user_id UUID := auth.uid();
BEGIN
  SELECT selected_industry INTO v_industry
  FROM public.onboarding_progress
  WHERE owner_id = v_user_id;

  RETURN v_industry;
END;
$$;

COMMENT ON FUNCTION public.get_selected_industry() IS 'Get user selected business industry';

-- =====================================================
-- RPC: Mark Starter Pack Applied
-- =====================================================

CREATE OR REPLACE FUNCTION public.mark_starter_pack_applied()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID := auth.uid();
BEGIN
  UPDATE public.onboarding_progress
  SET starter_pack_applied = true,
      starter_pack_applied_at = now(),
      updated_at = now()
  WHERE owner_id = v_user_id;

  -- If no row existed, create one
  IF NOT FOUND THEN
    INSERT INTO public.onboarding_progress (owner_id, starter_pack_applied, starter_pack_applied_at)
    VALUES (v_user_id, true, now());
  END IF;

  RETURN jsonb_build_object('success', true);
END;
$$;

COMMENT ON FUNCTION public.mark_starter_pack_applied() IS 'Mark that user has applied a starter pack during onboarding';

-- =====================================================
-- RPC: Reset Welcome Tour (for Settings restart)
-- =====================================================

CREATE OR REPLACE FUNCTION public.reset_welcome_tour()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID := auth.uid();
BEGIN
  UPDATE public.onboarding_progress
  SET completed_welcome_tour = false,
      current_tour_step = 0,
      tour_skipped_at = NULL,
      updated_at = now()
  WHERE owner_id = v_user_id;

  RETURN jsonb_build_object('success', true);
END;
$$;

COMMENT ON FUNCTION public.reset_welcome_tour() IS 'Reset welcome tour to allow restart from Settings';

-- =====================================================
-- GRANT PERMISSIONS
-- =====================================================

GRANT EXECUTE ON FUNCTION public.set_selected_industry(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_selected_industry() TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_starter_pack_applied() TO authenticated;
GRANT EXECUTE ON FUNCTION public.reset_welcome_tour() TO authenticated;

-- =====================================================
-- COMPLETION NOTICE
-- =====================================================

DO $$ BEGIN RAISE NOTICE 'Migration 137 completed: Industry selection and starter pack tracking added to onboarding_progress'; END $$;
