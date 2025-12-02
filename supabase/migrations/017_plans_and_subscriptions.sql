-- =====================================================
-- BIZSCREEN: PLANS & SUBSCRIPTIONS (SaaS Billing Model)
-- =====================================================
-- Adds subscription plans with usage limits
-- Enables billing/upgrade flows without changing core RLS
--
-- Plan Limits (defaults):
-- - Free:    1 screen, 50 media, 3 playlists, 2 layouts, 1 schedule
-- - Starter: 5 screens, 500 media, 20 playlists, 10 layouts, 10 schedules
-- - Pro:     25 screens, 2000 media, 100 playlists, 50 layouts, 50 schedules
-- =====================================================

-- =====================================================
-- PLANS TABLE (Static Catalog)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Plan identification
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,

  -- Pricing (in cents for precision)
  price_monthly_cents INTEGER NOT NULL DEFAULT 0,
  price_yearly_cents INTEGER,

  -- Resource limits (NULL = unlimited)
  max_screens INTEGER,
  max_media_assets INTEGER,
  max_playlists INTEGER,
  max_layouts INTEGER,
  max_schedules INTEGER,

  -- Additional limits (future use)
  max_storage_mb INTEGER,
  max_bandwidth_gb INTEGER,

  -- Plan status
  is_default BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,

  -- Feature flags (for plan comparison)
  features JSONB DEFAULT '[]'::jsonb,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Ensure only one default plan
CREATE UNIQUE INDEX IF NOT EXISTS idx_plans_single_default
  ON public.plans (is_default) WHERE is_default = true;

CREATE INDEX IF NOT EXISTS idx_plans_slug ON public.plans(slug);
CREATE INDEX IF NOT EXISTS idx_plans_active ON public.plans(is_active);

COMMENT ON TABLE public.plans IS 'SaaS pricing plans with resource limits';

-- =====================================================
-- SUBSCRIPTIONS TABLE (Per User/Owner)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- User/owner reference
  owner_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL UNIQUE,

  -- Plan reference
  plan_id UUID REFERENCES public.plans(id) ON DELETE RESTRICT NOT NULL,

  -- Subscription status
  status TEXT NOT NULL DEFAULT 'trialing'
    CHECK (status IN ('trialing', 'active', 'past_due', 'canceled', 'expired')),

  -- Billing period
  trial_ends_at TIMESTAMPTZ,
  current_period_start TIMESTAMPTZ DEFAULT NOW(),
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN DEFAULT false,

  -- Stripe integration (optional, for future use)
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  stripe_price_id TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_owner_id ON public.subscriptions(owner_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_plan_id ON public.subscriptions(plan_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON public.subscriptions(status);

COMMENT ON TABLE public.subscriptions IS 'User subscription linking to a plan';

-- =====================================================
-- TRIGGERS FOR updated_at
-- =====================================================

DROP TRIGGER IF EXISTS update_plans_updated_at ON public.plans;
CREATE TRIGGER update_plans_updated_at BEFORE UPDATE ON public.plans
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_subscriptions_updated_at ON public.subscriptions;
CREATE TRIGGER update_subscriptions_updated_at BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- Plans: Readable by all authenticated users (it's a catalog)
DROP POLICY IF EXISTS "plans_select_all_authenticated" ON public.plans;
CREATE POLICY "plans_select_all_authenticated" ON public.plans
  FOR SELECT TO authenticated USING (true);

-- Plans: Only super_admin can modify plans
DROP POLICY IF EXISTS "plans_all_super_admin" ON public.plans;
CREATE POLICY "plans_all_super_admin" ON public.plans
  FOR ALL USING (is_super_admin());

-- Subscriptions: Users can view their own subscription
DROP POLICY IF EXISTS "subscriptions_select_own" ON public.subscriptions;
CREATE POLICY "subscriptions_select_own" ON public.subscriptions
  FOR SELECT USING (
    owner_id = auth.uid() OR
    is_super_admin() OR
    (is_admin() AND owner_id IN (SELECT client_id FROM get_my_client_ids()))
  );

-- Subscriptions: Users can update their own (for plan changes)
DROP POLICY IF EXISTS "subscriptions_update_own" ON public.subscriptions;
CREATE POLICY "subscriptions_update_own" ON public.subscriptions
  FOR UPDATE USING (
    owner_id = auth.uid() OR
    is_super_admin()
  );

-- Subscriptions: Insert (typically by system or super_admin)
DROP POLICY IF EXISTS "subscriptions_insert" ON public.subscriptions;
CREATE POLICY "subscriptions_insert" ON public.subscriptions
  FOR INSERT WITH CHECK (
    owner_id = auth.uid() OR
    is_super_admin()
  );

-- Subscriptions: Delete only by super_admin
DROP POLICY IF EXISTS "subscriptions_delete" ON public.subscriptions;
CREATE POLICY "subscriptions_delete" ON public.subscriptions
  FOR DELETE USING (is_super_admin());

-- =====================================================
-- SEED DATA: Plans
-- =====================================================

-- Insert plans (idempotent with ON CONFLICT)
INSERT INTO public.plans (slug, name, description, price_monthly_cents, max_screens, max_media_assets, max_playlists, max_layouts, max_schedules, is_default, display_order, features)
VALUES
  (
    'free',
    'Free',
    'Get started with basic digital signage',
    0,
    1,        -- max_screens
    50,       -- max_media_assets
    3,        -- max_playlists
    2,        -- max_layouts
    1,        -- max_schedules
    true,     -- is_default
    1,
    '["1 screen", "50 media files", "3 playlists", "2 layouts", "1 schedule", "Community support"]'::jsonb
  ),
  (
    'starter',
    'Starter',
    'Perfect for small businesses',
    2900,     -- $29/month
    5,        -- max_screens
    500,      -- max_media_assets
    20,       -- max_playlists
    10,       -- max_layouts
    10,       -- max_schedules
    false,
    2,
    '["5 screens", "500 media files", "20 playlists", "10 layouts", "10 schedules", "Email support", "Priority updates"]'::jsonb
  ),
  (
    'pro',
    'Pro',
    'For growing businesses with multiple locations',
    9900,     -- $99/month
    25,       -- max_screens
    2000,     -- max_media_assets
    100,      -- max_playlists
    50,       -- max_layouts
    50,       -- max_schedules
    false,
    3,
    '["25 screens", "2000 media files", "100 playlists", "50 layouts", "50 schedules", "Priority support", "Advanced analytics", "Custom branding"]'::jsonb
  )
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  price_monthly_cents = EXCLUDED.price_monthly_cents,
  max_screens = EXCLUDED.max_screens,
  max_media_assets = EXCLUDED.max_media_assets,
  max_playlists = EXCLUDED.max_playlists,
  max_layouts = EXCLUDED.max_layouts,
  max_schedules = EXCLUDED.max_schedules,
  is_default = EXCLUDED.is_default,
  display_order = EXCLUDED.display_order,
  features = EXCLUDED.features,
  updated_at = NOW();

-- =====================================================
-- HELPER FUNCTION: Get Default Plan ID
-- =====================================================

CREATE OR REPLACE FUNCTION public.get_default_plan_id()
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT id FROM public.plans WHERE is_default = true AND is_active = true LIMIT 1;
$$;

-- =====================================================
-- RPC: Get Current Subscription (with plan details)
-- =====================================================

CREATE OR REPLACE FUNCTION public.get_current_subscription()
RETURNS TABLE (
  subscription_id UUID,
  plan_id UUID,
  plan_slug TEXT,
  plan_name TEXT,
  status TEXT,
  trial_ends_at TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN,
  max_screens INTEGER,
  max_media_assets INTEGER,
  max_playlists INTEGER,
  max_layouts INTEGER,
  max_schedules INTEGER,
  price_monthly_cents INTEGER,
  features JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_default_plan_id UUID;
BEGIN
  -- Check if user has an active subscription
  RETURN QUERY
  SELECT
    s.id AS subscription_id,
    p.id AS plan_id,
    p.slug AS plan_slug,
    p.name AS plan_name,
    s.status,
    s.trial_ends_at,
    s.current_period_end,
    s.cancel_at_period_end,
    p.max_screens,
    p.max_media_assets,
    p.max_playlists,
    p.max_layouts,
    p.max_schedules,
    p.price_monthly_cents,
    p.features
  FROM public.subscriptions s
  JOIN public.plans p ON s.plan_id = p.id
  WHERE s.owner_id = v_user_id
    AND s.status IN ('trialing', 'active', 'past_due')
  LIMIT 1;

  -- If no rows returned, return the default (free) plan info
  IF NOT FOUND THEN
    v_default_plan_id := get_default_plan_id();

    RETURN QUERY
    SELECT
      NULL::UUID AS subscription_id,
      p.id AS plan_id,
      p.slug AS plan_slug,
      p.name AS plan_name,
      'none'::TEXT AS status,
      NULL::TIMESTAMPTZ AS trial_ends_at,
      NULL::TIMESTAMPTZ AS current_period_end,
      false AS cancel_at_period_end,
      p.max_screens,
      p.max_media_assets,
      p.max_playlists,
      p.max_layouts,
      p.max_schedules,
      p.price_monthly_cents,
      p.features
    FROM public.plans p
    WHERE p.id = v_default_plan_id;
  END IF;
END;
$$;

-- =====================================================
-- RPC: Get Effective Limits (simplified for frontend)
-- =====================================================

CREATE OR REPLACE FUNCTION public.get_effective_limits()
RETURNS TABLE (
  plan_slug TEXT,
  plan_name TEXT,
  status TEXT,
  max_screens INTEGER,
  max_media_assets INTEGER,
  max_playlists INTEGER,
  max_layouts INTEGER,
  max_schedules INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    cs.plan_slug,
    cs.plan_name,
    cs.status,
    cs.max_screens,
    cs.max_media_assets,
    cs.max_playlists,
    cs.max_layouts,
    cs.max_schedules
  FROM get_current_subscription() cs;
END;
$$;

-- =====================================================
-- RPC: Get Current Usage Counts
-- =====================================================

CREATE OR REPLACE FUNCTION public.get_usage_counts()
RETURNS TABLE (
  screens_count INTEGER,
  media_count INTEGER,
  playlists_count INTEGER,
  layouts_count INTEGER,
  schedules_count INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID := auth.uid();
BEGIN
  RETURN QUERY
  SELECT
    (SELECT COUNT(*)::INTEGER FROM public.tv_devices WHERE owner_id = v_user_id),
    (SELECT COUNT(*)::INTEGER FROM public.media_assets WHERE owner_id = v_user_id),
    (SELECT COUNT(*)::INTEGER FROM public.playlists WHERE owner_id = v_user_id),
    (SELECT COUNT(*)::INTEGER FROM public.layouts WHERE owner_id = v_user_id),
    (SELECT COUNT(*)::INTEGER FROM public.schedules WHERE owner_id = v_user_id);
END;
$$;

-- =====================================================
-- RPC: Check Resource Limit (Backend Enforcement)
-- =====================================================

CREATE OR REPLACE FUNCTION public.check_resource_limit(resource_type TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_current_count INTEGER;
  v_max_limit INTEGER;
  v_limits RECORD;
BEGIN
  -- Get effective limits
  SELECT * INTO v_limits FROM get_effective_limits();

  -- Get current count and max limit based on resource type
  CASE resource_type
    WHEN 'screen' THEN
      SELECT COUNT(*) INTO v_current_count FROM public.tv_devices WHERE owner_id = v_user_id;
      v_max_limit := v_limits.max_screens;
    WHEN 'media' THEN
      SELECT COUNT(*) INTO v_current_count FROM public.media_assets WHERE owner_id = v_user_id;
      v_max_limit := v_limits.max_media_assets;
    WHEN 'playlist' THEN
      SELECT COUNT(*) INTO v_current_count FROM public.playlists WHERE owner_id = v_user_id;
      v_max_limit := v_limits.max_playlists;
    WHEN 'layout' THEN
      SELECT COUNT(*) INTO v_current_count FROM public.layouts WHERE owner_id = v_user_id;
      v_max_limit := v_limits.max_layouts;
    WHEN 'schedule' THEN
      SELECT COUNT(*) INTO v_current_count FROM public.schedules WHERE owner_id = v_user_id;
      v_max_limit := v_limits.max_schedules;
    ELSE
      RAISE EXCEPTION 'Unknown resource type: %', resource_type;
  END CASE;

  -- NULL limit means unlimited
  IF v_max_limit IS NULL THEN
    RETURN true;
  END IF;

  -- Check if limit exceeded
  IF v_current_count >= v_max_limit THEN
    RAISE EXCEPTION 'limit_exceeded:% limit reached (% of %)', resource_type, v_current_count, v_max_limit;
  END IF;

  RETURN true;
END;
$$;

-- =====================================================
-- RPC: Change Plan (for fake billing / testing)
-- =====================================================

CREATE OR REPLACE FUNCTION public.change_subscription_plan(new_plan_slug TEXT)
RETURNS TABLE (
  success BOOLEAN,
  subscription_id UUID,
  plan_slug TEXT,
  plan_name TEXT,
  status TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_new_plan_id UUID;
  v_subscription_id UUID;
  v_period_end TIMESTAMPTZ;
BEGIN
  -- Get the new plan
  SELECT id INTO v_new_plan_id
  FROM public.plans
  WHERE slug = new_plan_slug AND is_active = true;

  IF v_new_plan_id IS NULL THEN
    RAISE EXCEPTION 'Plan not found: %', new_plan_slug;
  END IF;

  -- Calculate period end (30 days for paid, NULL for free)
  IF new_plan_slug = 'free' THEN
    v_period_end := NULL;
  ELSE
    v_period_end := NOW() + INTERVAL '30 days';
  END IF;

  -- Upsert subscription
  INSERT INTO public.subscriptions (
    owner_id,
    plan_id,
    status,
    current_period_start,
    current_period_end,
    cancel_at_period_end
  ) VALUES (
    v_user_id,
    v_new_plan_id,
    CASE WHEN new_plan_slug = 'free' THEN 'active' ELSE 'active' END,
    NOW(),
    v_period_end,
    false
  )
  ON CONFLICT (owner_id) DO UPDATE SET
    plan_id = v_new_plan_id,
    status = 'active',
    current_period_start = NOW(),
    current_period_end = v_period_end,
    cancel_at_period_end = false,
    updated_at = NOW()
  RETURNING id INTO v_subscription_id;

  -- Return result
  RETURN QUERY
  SELECT
    true AS success,
    v_subscription_id AS subscription_id,
    p.slug AS plan_slug,
    p.name AS plan_name,
    'active'::TEXT AS status
  FROM public.plans p
  WHERE p.id = v_new_plan_id;
END;
$$;

-- =====================================================
-- GRANT PERMISSIONS
-- =====================================================

GRANT SELECT ON public.plans TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.subscriptions TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_default_plan_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_current_subscription() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_effective_limits() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_usage_counts() TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_resource_limit(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.change_subscription_plan(TEXT) TO authenticated;

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON FUNCTION public.get_current_subscription() IS 'Get current user subscription with plan details';
COMMENT ON FUNCTION public.get_effective_limits() IS 'Get simplified limits for the current user';
COMMENT ON FUNCTION public.get_usage_counts() IS 'Get current resource usage counts';
COMMENT ON FUNCTION public.check_resource_limit(TEXT) IS 'Check if user can create resource, raises exception if limit exceeded';
COMMENT ON FUNCTION public.change_subscription_plan(TEXT) IS 'Change user subscription to a new plan (for testing/fake billing)';
