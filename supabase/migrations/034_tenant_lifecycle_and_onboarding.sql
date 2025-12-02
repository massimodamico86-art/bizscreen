-- =====================================================
-- BIZSCREEN: TENANT LIFECYCLE & ONBOARDING (Phase 24)
-- =====================================================
-- Adds tenant lifecycle management:
-- - Trial expiration tracking
-- - Suspension/reactivation
-- - Overdue payment flags
-- - Read-only frozen mode
-- - Onboarding progress tracking
-- =====================================================

-- =====================================================
-- EXTEND SUBSCRIPTIONS TABLE
-- =====================================================

-- Add new lifecycle fields to subscriptions
ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS suspended_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS suspension_reason TEXT,
  ADD COLUMN IF NOT EXISTS overdue_since TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS overdue_reminder_sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS frozen_readonly BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS grace_period_ends_at TIMESTAMPTZ;

-- Add index for finding suspended/overdue accounts
CREATE INDEX IF NOT EXISTS idx_subscriptions_suspended ON public.subscriptions(suspended_at) WHERE suspended_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_subscriptions_overdue ON public.subscriptions(overdue_since) WHERE overdue_since IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_subscriptions_trial_ends ON public.subscriptions(trial_ends_at) WHERE trial_ends_at IS NOT NULL;

COMMENT ON COLUMN public.subscriptions.suspended_at IS 'When the account was suspended (NULL if active)';
COMMENT ON COLUMN public.subscriptions.suspension_reason IS 'Reason for suspension: overdue_payment, tos_violation, manual';
COMMENT ON COLUMN public.subscriptions.overdue_since IS 'When payment became overdue';
COMMENT ON COLUMN public.subscriptions.frozen_readonly IS 'If true, tenant can view but not create/edit';
COMMENT ON COLUMN public.subscriptions.grace_period_ends_at IS 'End of grace period before full suspension';

-- =====================================================
-- ONBOARDING PROGRESS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.onboarding_progress (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL UNIQUE,

  -- Onboarding steps (boolean flags)
  completed_welcome BOOLEAN DEFAULT false,
  completed_logo BOOLEAN DEFAULT false,
  completed_first_screen BOOLEAN DEFAULT false,
  completed_first_playlist BOOLEAN DEFAULT false,
  completed_first_media BOOLEAN DEFAULT false,
  completed_screen_pairing BOOLEAN DEFAULT false,

  -- Overall status
  is_complete BOOLEAN DEFAULT false,
  completed_at TIMESTAMPTZ,
  skipped_at TIMESTAMPTZ,

  -- Metadata
  started_at TIMESTAMPTZ DEFAULT NOW(),
  last_step_at TIMESTAMPTZ DEFAULT NOW(),
  current_step TEXT DEFAULT 'welcome',

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_onboarding_owner ON public.onboarding_progress(owner_id);
CREATE INDEX IF NOT EXISTS idx_onboarding_incomplete ON public.onboarding_progress(is_complete) WHERE is_complete = false;

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_onboarding_progress_updated_at ON public.onboarding_progress;
CREATE TRIGGER update_onboarding_progress_updated_at BEFORE UPDATE ON public.onboarding_progress
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS for onboarding_progress
ALTER TABLE public.onboarding_progress ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "onboarding_select_own" ON public.onboarding_progress;
CREATE POLICY "onboarding_select_own" ON public.onboarding_progress
  FOR SELECT USING (owner_id = auth.uid() OR is_super_admin());

DROP POLICY IF EXISTS "onboarding_insert_own" ON public.onboarding_progress;
CREATE POLICY "onboarding_insert_own" ON public.onboarding_progress
  FOR INSERT WITH CHECK (owner_id = auth.uid());

DROP POLICY IF EXISTS "onboarding_update_own" ON public.onboarding_progress;
CREATE POLICY "onboarding_update_own" ON public.onboarding_progress
  FOR UPDATE USING (owner_id = auth.uid() OR is_super_admin());

COMMENT ON TABLE public.onboarding_progress IS 'Tracks user onboarding wizard progress';

-- =====================================================
-- BILLING EVENTS LOG (for audit trail)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.billing_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,

  event_type TEXT NOT NULL,
  -- Event types: trial_started, trial_expired, subscription_created, subscription_canceled,
  -- payment_succeeded, payment_failed, account_suspended, account_reactivated,
  -- plan_upgraded, plan_downgraded, reminder_sent

  old_status TEXT,
  new_status TEXT,
  old_plan_slug TEXT,
  new_plan_slug TEXT,

  stripe_event_id TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_billing_events_owner ON public.billing_events(owner_id);
CREATE INDEX IF NOT EXISTS idx_billing_events_type ON public.billing_events(event_type);
CREATE INDEX IF NOT EXISTS idx_billing_events_created ON public.billing_events(created_at DESC);

-- RLS for billing_events
ALTER TABLE public.billing_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "billing_events_select" ON public.billing_events;
CREATE POLICY "billing_events_select" ON public.billing_events
  FOR SELECT USING (owner_id = auth.uid() OR is_super_admin());

DROP POLICY IF EXISTS "billing_events_insert" ON public.billing_events;
CREATE POLICY "billing_events_insert" ON public.billing_events
  FOR INSERT WITH CHECK (is_super_admin() OR owner_id = auth.uid());

COMMENT ON TABLE public.billing_events IS 'Audit log of billing-related events';

-- =====================================================
-- RPC: Get Tenant Lifecycle Status
-- =====================================================

CREATE OR REPLACE FUNCTION public.get_tenant_lifecycle_status()
RETURNS TABLE (
  owner_id UUID,
  email TEXT,
  plan_slug TEXT,
  plan_name TEXT,
  status TEXT,
  trial_ends_at TIMESTAMPTZ,
  trial_days_left INTEGER,
  is_trial_expired BOOLEAN,
  suspended_at TIMESTAMPTZ,
  suspension_reason TEXT,
  overdue_since TIMESTAMPTZ,
  overdue_days INTEGER,
  frozen_readonly BOOLEAN,
  grace_period_ends_at TIMESTAMPTZ,
  can_create_content BOOLEAN,
  billing_warning TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID := auth.uid();
BEGIN
  RETURN QUERY
  SELECT
    s.owner_id,
    pr.email,
    p.slug AS plan_slug,
    p.name AS plan_name,
    s.status,
    s.trial_ends_at,
    CASE
      WHEN s.trial_ends_at IS NOT NULL THEN
        GREATEST(0, EXTRACT(DAY FROM s.trial_ends_at - NOW())::INTEGER)
      ELSE NULL
    END AS trial_days_left,
    CASE
      WHEN s.trial_ends_at IS NOT NULL AND s.trial_ends_at < NOW() THEN true
      ELSE false
    END AS is_trial_expired,
    s.suspended_at,
    s.suspension_reason,
    s.overdue_since,
    CASE
      WHEN s.overdue_since IS NOT NULL THEN
        EXTRACT(DAY FROM NOW() - s.overdue_since)::INTEGER
      ELSE NULL
    END AS overdue_days,
    COALESCE(s.frozen_readonly, false) AS frozen_readonly,
    s.grace_period_ends_at,
    -- Can create content if: not suspended, not frozen, and (active or trialing with valid trial)
    CASE
      WHEN s.suspended_at IS NOT NULL THEN false
      WHEN COALESCE(s.frozen_readonly, false) THEN false
      WHEN s.status = 'active' THEN true
      WHEN s.status = 'trialing' AND (s.trial_ends_at IS NULL OR s.trial_ends_at > NOW()) THEN true
      ELSE false
    END AS can_create_content,
    -- Generate billing warning message
    CASE
      WHEN s.suspended_at IS NOT NULL THEN 'Account suspended: ' || COALESCE(s.suspension_reason, 'Contact support')
      WHEN s.overdue_since IS NOT NULL THEN 'Payment overdue since ' || TO_CHAR(s.overdue_since, 'Mon DD, YYYY')
      WHEN s.trial_ends_at IS NOT NULL AND s.trial_ends_at < NOW() THEN 'Trial expired'
      WHEN s.trial_ends_at IS NOT NULL AND s.trial_ends_at < NOW() + INTERVAL '3 days' THEN
        'Trial expires in ' || GREATEST(1, EXTRACT(DAY FROM s.trial_ends_at - NOW())::INTEGER) || ' day(s)'
      WHEN s.cancel_at_period_end THEN 'Subscription cancels at end of period'
      ELSE NULL
    END AS billing_warning
  FROM public.subscriptions s
  JOIN public.profiles pr ON s.owner_id = pr.id
  JOIN public.plans p ON s.plan_id = p.id
  WHERE s.owner_id = v_user_id;

  -- If no subscription found, return defaults
  IF NOT FOUND THEN
    RETURN QUERY
    SELECT
      v_user_id AS owner_id,
      pr.email,
      'free'::TEXT AS plan_slug,
      'Free'::TEXT AS plan_name,
      'none'::TEXT AS status,
      NULL::TIMESTAMPTZ AS trial_ends_at,
      NULL::INTEGER AS trial_days_left,
      false AS is_trial_expired,
      NULL::TIMESTAMPTZ AS suspended_at,
      NULL::TEXT AS suspension_reason,
      NULL::TIMESTAMPTZ AS overdue_since,
      NULL::INTEGER AS overdue_days,
      false AS frozen_readonly,
      NULL::TIMESTAMPTZ AS grace_period_ends_at,
      true AS can_create_content,
      NULL::TEXT AS billing_warning
    FROM public.profiles pr
    WHERE pr.id = v_user_id;
  END IF;
END;
$$;

-- =====================================================
-- RPC: Suspend Tenant (super_admin only)
-- =====================================================

CREATE OR REPLACE FUNCTION public.suspend_tenant(
  p_owner_id UUID,
  p_reason TEXT DEFAULT 'manual'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result JSONB;
BEGIN
  -- Check permissions
  IF NOT is_super_admin() THEN
    RAISE EXCEPTION 'Only super_admin can suspend tenants';
  END IF;

  -- Update subscription
  UPDATE public.subscriptions
  SET
    suspended_at = NOW(),
    suspension_reason = p_reason,
    frozen_readonly = true,
    updated_at = NOW()
  WHERE owner_id = p_owner_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Subscription not found');
  END IF;

  -- Log event
  INSERT INTO public.billing_events (owner_id, event_type, new_status, metadata)
  VALUES (p_owner_id, 'account_suspended', 'suspended', jsonb_build_object('reason', p_reason));

  RETURN jsonb_build_object('success', true);
END;
$$;

-- =====================================================
-- RPC: Reactivate Tenant (super_admin only)
-- =====================================================

CREATE OR REPLACE FUNCTION public.reactivate_tenant(p_owner_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check permissions
  IF NOT is_super_admin() THEN
    RAISE EXCEPTION 'Only super_admin can reactivate tenants';
  END IF;

  -- Update subscription
  UPDATE public.subscriptions
  SET
    suspended_at = NULL,
    suspension_reason = NULL,
    frozen_readonly = false,
    overdue_since = NULL,
    status = 'active',
    updated_at = NOW()
  WHERE owner_id = p_owner_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Subscription not found');
  END IF;

  -- Log event
  INSERT INTO public.billing_events (owner_id, event_type, new_status)
  VALUES (p_owner_id, 'account_reactivated', 'active');

  RETURN jsonb_build_object('success', true);
END;
$$;

-- =====================================================
-- RPC: Set Trial Expired
-- =====================================================

CREATE OR REPLACE FUNCTION public.set_trial_expired(p_owner_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check permissions
  IF NOT is_super_admin() THEN
    RAISE EXCEPTION 'Only super_admin can expire trials';
  END IF;

  -- Update subscription
  UPDATE public.subscriptions
  SET
    status = 'expired',
    trial_ends_at = NOW(),
    frozen_readonly = true,
    updated_at = NOW()
  WHERE owner_id = p_owner_id AND status = 'trialing';

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'No active trial found');
  END IF;

  -- Log event
  INSERT INTO public.billing_events (owner_id, event_type, old_status, new_status)
  VALUES (p_owner_id, 'trial_expired', 'trialing', 'expired');

  RETURN jsonb_build_object('success', true);
END;
$$;

-- =====================================================
-- RPC: Set Overdue Flag
-- =====================================================

CREATE OR REPLACE FUNCTION public.set_overdue_flag(
  p_owner_id UUID,
  p_is_overdue BOOLEAN
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check permissions
  IF NOT is_super_admin() THEN
    RAISE EXCEPTION 'Only super_admin can set overdue flags';
  END IF;

  IF p_is_overdue THEN
    UPDATE public.subscriptions
    SET
      status = 'past_due',
      overdue_since = COALESCE(overdue_since, NOW()),
      grace_period_ends_at = NOW() + INTERVAL '14 days',
      updated_at = NOW()
    WHERE owner_id = p_owner_id;

    -- Log event
    INSERT INTO public.billing_events (owner_id, event_type, new_status)
    VALUES (p_owner_id, 'payment_failed', 'past_due');
  ELSE
    UPDATE public.subscriptions
    SET
      status = 'active',
      overdue_since = NULL,
      grace_period_ends_at = NULL,
      updated_at = NOW()
    WHERE owner_id = p_owner_id;

    -- Log event
    INSERT INTO public.billing_events (owner_id, event_type, new_status)
    VALUES (p_owner_id, 'payment_succeeded', 'active');
  END IF;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Subscription not found');
  END IF;

  RETURN jsonb_build_object('success', true);
END;
$$;

-- =====================================================
-- RPC: Start Trial
-- =====================================================

CREATE OR REPLACE FUNCTION public.start_trial(
  p_plan_slug TEXT DEFAULT 'starter',
  p_trial_days INTEGER DEFAULT 14
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_plan_id UUID;
  v_trial_ends TIMESTAMPTZ;
BEGIN
  -- Get plan ID
  SELECT id INTO v_plan_id FROM public.plans WHERE slug = p_plan_slug AND is_active = true;

  IF v_plan_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Plan not found');
  END IF;

  v_trial_ends := NOW() + (p_trial_days || ' days')::INTERVAL;

  -- Upsert subscription
  INSERT INTO public.subscriptions (
    owner_id,
    plan_id,
    status,
    trial_ends_at,
    current_period_start,
    current_period_end
  ) VALUES (
    v_user_id,
    v_plan_id,
    'trialing',
    v_trial_ends,
    NOW(),
    v_trial_ends
  )
  ON CONFLICT (owner_id) DO UPDATE SET
    plan_id = v_plan_id,
    status = 'trialing',
    trial_ends_at = v_trial_ends,
    current_period_start = NOW(),
    current_period_end = v_trial_ends,
    suspended_at = NULL,
    frozen_readonly = false,
    updated_at = NOW();

  -- Log event
  INSERT INTO public.billing_events (owner_id, event_type, new_status, new_plan_slug, metadata)
  VALUES (v_user_id, 'trial_started', 'trialing', p_plan_slug, jsonb_build_object('trial_days', p_trial_days));

  RETURN jsonb_build_object(
    'success', true,
    'trial_ends_at', v_trial_ends,
    'plan_slug', p_plan_slug
  );
END;
$$;

-- =====================================================
-- RPC: Reset Trial (super_admin only)
-- =====================================================

CREATE OR REPLACE FUNCTION public.reset_trial(
  p_owner_id UUID,
  p_trial_days INTEGER DEFAULT 14
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_trial_ends TIMESTAMPTZ;
BEGIN
  -- Check permissions
  IF NOT is_super_admin() THEN
    RAISE EXCEPTION 'Only super_admin can reset trials';
  END IF;

  v_trial_ends := NOW() + (p_trial_days || ' days')::INTERVAL;

  UPDATE public.subscriptions
  SET
    status = 'trialing',
    trial_ends_at = v_trial_ends,
    suspended_at = NULL,
    frozen_readonly = false,
    overdue_since = NULL,
    updated_at = NOW()
  WHERE owner_id = p_owner_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Subscription not found');
  END IF;

  -- Log event
  INSERT INTO public.billing_events (owner_id, event_type, new_status, metadata)
  VALUES (p_owner_id, 'trial_started', 'trialing', jsonb_build_object('trial_days', p_trial_days, 'is_reset', true));

  RETURN jsonb_build_object('success', true, 'trial_ends_at', v_trial_ends);
END;
$$;

-- =====================================================
-- RPC: Get Onboarding Progress
-- =====================================================

CREATE OR REPLACE FUNCTION public.get_onboarding_progress()
RETURNS TABLE (
  completed_welcome BOOLEAN,
  completed_logo BOOLEAN,
  completed_first_screen BOOLEAN,
  completed_first_playlist BOOLEAN,
  completed_first_media BOOLEAN,
  completed_screen_pairing BOOLEAN,
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
      false AS is_complete,
      'welcome'::TEXT AS current_step,
      NULL::TIMESTAMPTZ AS completed_at,
      NULL::TIMESTAMPTZ AS skipped_at;
  END IF;
END;
$$;

-- =====================================================
-- RPC: Update Onboarding Step
-- =====================================================

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
  -- Upsert onboarding progress
  INSERT INTO public.onboarding_progress (owner_id)
  VALUES (v_user_id)
  ON CONFLICT (owner_id) DO NOTHING;

  -- Update the specific step
  EXECUTE format(
    'UPDATE public.onboarding_progress SET %I = $1, last_step_at = NOW(), updated_at = NOW() WHERE owner_id = $2',
    'completed_' || p_step
  ) USING p_completed, v_user_id;

  -- Check if all steps complete
  SELECT
    completed_welcome AND completed_logo AND completed_first_screen AND
    completed_first_playlist AND completed_first_media AND completed_screen_pairing
  INTO v_is_complete
  FROM public.onboarding_progress
  WHERE owner_id = v_user_id;

  -- Update completion status
  IF v_is_complete THEN
    UPDATE public.onboarding_progress
    SET is_complete = true, completed_at = NOW()
    WHERE owner_id = v_user_id;
  END IF;

  -- Determine next step
  SELECT
    CASE
      WHEN NOT completed_welcome THEN 'welcome'
      WHEN NOT completed_logo THEN 'logo'
      WHEN NOT completed_first_media THEN 'media'
      WHEN NOT completed_first_playlist THEN 'playlist'
      WHEN NOT completed_first_screen THEN 'screen'
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

-- =====================================================
-- RPC: Skip Onboarding
-- =====================================================

CREATE OR REPLACE FUNCTION public.skip_onboarding()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID := auth.uid();
BEGIN
  INSERT INTO public.onboarding_progress (owner_id, skipped_at, is_complete, current_step)
  VALUES (v_user_id, NOW(), true, 'skipped')
  ON CONFLICT (owner_id) DO UPDATE SET
    skipped_at = NOW(),
    is_complete = true,
    current_step = 'skipped',
    updated_at = NOW();

  RETURN jsonb_build_object('success', true);
END;
$$;

-- =====================================================
-- RPC: Get All Tenants Status (super_admin only)
-- =====================================================

CREATE OR REPLACE FUNCTION public.get_all_tenants_status()
RETURNS TABLE (
  owner_id UUID,
  email TEXT,
  display_name TEXT,
  plan_slug TEXT,
  plan_name TEXT,
  status TEXT,
  trial_ends_at TIMESTAMPTZ,
  trial_days_left INTEGER,
  suspended_at TIMESTAMPTZ,
  suspension_reason TEXT,
  overdue_days INTEGER,
  frozen_readonly BOOLEAN,
  screens_count BIGINT,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check permissions
  IF NOT is_super_admin() THEN
    RAISE EXCEPTION 'Only super_admin can view all tenants';
  END IF;

  RETURN QUERY
  SELECT
    pr.id AS owner_id,
    pr.email,
    pr.display_name,
    COALESCE(p.slug, 'free') AS plan_slug,
    COALESCE(p.name, 'Free') AS plan_name,
    COALESCE(s.status, 'none') AS status,
    s.trial_ends_at,
    CASE
      WHEN s.trial_ends_at IS NOT NULL AND s.trial_ends_at > NOW() THEN
        EXTRACT(DAY FROM s.trial_ends_at - NOW())::INTEGER
      ELSE NULL
    END AS trial_days_left,
    s.suspended_at,
    s.suspension_reason,
    CASE
      WHEN s.overdue_since IS NOT NULL THEN
        EXTRACT(DAY FROM NOW() - s.overdue_since)::INTEGER
      ELSE NULL
    END AS overdue_days,
    COALESCE(s.frozen_readonly, false) AS frozen_readonly,
    (SELECT COUNT(*) FROM public.tv_devices td WHERE td.owner_id = pr.id) AS screens_count,
    pr.created_at
  FROM public.profiles pr
  LEFT JOIN public.subscriptions s ON s.owner_id = pr.id
  LEFT JOIN public.plans p ON s.plan_id = p.id
  WHERE pr.role IN ('admin', 'super_admin')
  ORDER BY pr.created_at DESC;
END;
$$;

-- =====================================================
-- GRANT PERMISSIONS
-- =====================================================

GRANT SELECT, INSERT, UPDATE ON public.onboarding_progress TO authenticated;
GRANT SELECT, INSERT ON public.billing_events TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_tenant_lifecycle_status() TO authenticated;
GRANT EXECUTE ON FUNCTION public.suspend_tenant(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reactivate_tenant(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_trial_expired(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_overdue_flag(UUID, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION public.start_trial(TEXT, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reset_trial(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_onboarding_progress() TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_onboarding_step(TEXT, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION public.skip_onboarding() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_all_tenants_status() TO authenticated;

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON FUNCTION public.get_tenant_lifecycle_status() IS 'Get current tenant lifecycle status with warnings';
COMMENT ON FUNCTION public.suspend_tenant(UUID, TEXT) IS 'Suspend a tenant account (super_admin only)';
COMMENT ON FUNCTION public.reactivate_tenant(UUID) IS 'Reactivate a suspended tenant (super_admin only)';
COMMENT ON FUNCTION public.set_trial_expired(UUID) IS 'Force expire a trial (super_admin only)';
COMMENT ON FUNCTION public.set_overdue_flag(UUID, BOOLEAN) IS 'Set/clear overdue payment flag (super_admin only)';
COMMENT ON FUNCTION public.start_trial(TEXT, INTEGER) IS 'Start a trial for the current user';
COMMENT ON FUNCTION public.reset_trial(UUID, INTEGER) IS 'Reset a trial for a user (super_admin only)';
COMMENT ON FUNCTION public.get_onboarding_progress() IS 'Get current onboarding wizard progress';
COMMENT ON FUNCTION public.update_onboarding_step(TEXT, BOOLEAN) IS 'Update a specific onboarding step';
COMMENT ON FUNCTION public.skip_onboarding() IS 'Skip the onboarding wizard';
COMMENT ON FUNCTION public.get_all_tenants_status() IS 'Get all tenants with billing status (super_admin only)';
