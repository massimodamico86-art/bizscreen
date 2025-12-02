-- ============================================================================
-- Phase 32: Feature Flags, Experiments, and In-App Feedback/Announcements
-- ============================================================================

-- ============================================================================
-- 1. FEATURE FLAGS
-- ============================================================================

-- Main feature flags table
CREATE TABLE IF NOT EXISTS feature_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  default_enabled BOOLEAN NOT NULL DEFAULT false,
  rollout_strategy TEXT NOT NULL DEFAULT 'global' CHECK (rollout_strategy IN ('global', 'by_plan', 'by_tenant', 'percentage')),
  rollout_percentage INTEGER CHECK (rollout_percentage >= 0 AND rollout_percentage <= 100),
  allowed_plans TEXT[] DEFAULT ARRAY[]::TEXT[],
  category TEXT DEFAULT 'feature',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Feature flag overrides (per-tenant or per-user)
CREATE TABLE IF NOT EXISTS feature_flag_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  feature_flag_id UUID NOT NULL REFERENCES feature_flags(id) ON DELETE CASCADE,
  tenant_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  enabled BOOLEAN NOT NULL,
  reason TEXT,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT override_target_check CHECK (tenant_id IS NOT NULL OR user_id IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_feature_flag_overrides_tenant ON feature_flag_overrides(tenant_id);
CREATE INDEX IF NOT EXISTS idx_feature_flag_overrides_user ON feature_flag_overrides(user_id);
CREATE INDEX IF NOT EXISTS idx_feature_flag_overrides_flag ON feature_flag_overrides(feature_flag_id);

-- ============================================================================
-- 2. EXPERIMENTS (A/B Testing)
-- ============================================================================

-- Experiments table
CREATE TABLE IF NOT EXISTS experiments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'running', 'paused', 'completed')),
  target_audience TEXT NOT NULL DEFAULT 'all' CHECK (target_audience IN ('all', 'by_plan', 'by_tenant', 'percentage')),
  target_plans TEXT[] DEFAULT ARRAY[]::TEXT[],
  target_percentage INTEGER CHECK (target_percentage >= 0 AND target_percentage <= 100),
  primary_metric TEXT,
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Experiment variants
CREATE TABLE IF NOT EXISTS experiment_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  experiment_id UUID NOT NULL REFERENCES experiments(id) ON DELETE CASCADE,
  key TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  allocation_percent INTEGER NOT NULL CHECK (allocation_percent >= 0 AND allocation_percent <= 100),
  is_control BOOLEAN NOT NULL DEFAULT false,
  config JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(experiment_id, key)
);

CREATE INDEX IF NOT EXISTS idx_experiment_variants_experiment ON experiment_variants(experiment_id);

-- Experiment assignments (tracks which tenant/user gets which variant)
CREATE TABLE IF NOT EXISTS experiment_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  experiment_id UUID NOT NULL REFERENCES experiments(id) ON DELETE CASCADE,
  tenant_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  variant_key TEXT NOT NULL,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT assignment_target_check CHECK (tenant_id IS NOT NULL OR user_id IS NOT NULL),
  UNIQUE(experiment_id, tenant_id),
  UNIQUE(experiment_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_experiment_assignments_tenant ON experiment_assignments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_experiment_assignments_experiment ON experiment_assignments(experiment_id);

-- Experiment events (for tracking outcomes)
CREATE TABLE IF NOT EXISTS experiment_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  experiment_id UUID NOT NULL REFERENCES experiments(id) ON DELETE CASCADE,
  variant_key TEXT NOT NULL,
  tenant_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL, -- 'exposure', 'conversion', 'custom'
  event_name TEXT,
  event_value NUMERIC,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_experiment_events_experiment ON experiment_events(experiment_id);
CREATE INDEX IF NOT EXISTS idx_experiment_events_created ON experiment_events(created_at);

-- ============================================================================
-- 3. IN-APP FEEDBACK
-- ============================================================================

CREATE TABLE IF NOT EXISTS in_app_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  context TEXT NOT NULL, -- e.g., 'dashboard', 'screens', 'playlist-editor'
  feature_key TEXT, -- specific feature being rated
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  is_helpful BOOLEAN, -- simple yes/no alternative
  feedback_text TEXT,
  sentiment TEXT CHECK (sentiment IN ('positive', 'neutral', 'negative')),
  user_agent TEXT,
  page_url TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_in_app_feedback_tenant ON in_app_feedback(tenant_id);
CREATE INDEX IF NOT EXISTS idx_in_app_feedback_context ON in_app_feedback(context);
CREATE INDEX IF NOT EXISTS idx_in_app_feedback_created ON in_app_feedback(created_at);
CREATE INDEX IF NOT EXISTS idx_in_app_feedback_rating ON in_app_feedback(rating);

-- ============================================================================
-- 4. IN-APP ANNOUNCEMENTS
-- ============================================================================

CREATE TABLE IF NOT EXISTS in_app_announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'release' CHECK (category IN ('release', 'maintenance', 'tip', 'promotion', 'alert')),
  audience TEXT NOT NULL DEFAULT 'all' CHECK (audience IN ('all', 'by_plan', 'by_tenant')),
  target_plans TEXT[] DEFAULT ARRAY[]::TEXT[],
  target_tenant_ids UUID[] DEFAULT ARRAY[]::UUID[],
  priority INTEGER NOT NULL DEFAULT 0, -- higher = more important
  display_type TEXT NOT NULL DEFAULT 'banner' CHECK (display_type IN ('banner', 'modal', 'notification')),
  action_url TEXT,
  action_label TEXT,
  icon TEXT,
  is_dismissible BOOLEAN NOT NULL DEFAULT true,
  starts_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ends_at TIMESTAMPTZ,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_announcements_dates ON in_app_announcements(starts_at, ends_at);
CREATE INDEX IF NOT EXISTS idx_announcements_priority ON in_app_announcements(priority DESC);
CREATE INDEX IF NOT EXISTS idx_announcements_category ON in_app_announcements(category);

-- Announcement dismissals (tracks which users dismissed which announcements)
CREATE TABLE IF NOT EXISTS announcement_dismissals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  announcement_id UUID NOT NULL REFERENCES in_app_announcements(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  dismissed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(announcement_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_announcement_dismissals_user ON announcement_dismissals(user_id);

-- ============================================================================
-- 5. RLS POLICIES
-- ============================================================================

-- Enable RLS
ALTER TABLE feature_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE feature_flag_overrides ENABLE ROW LEVEL SECURITY;
ALTER TABLE experiments ENABLE ROW LEVEL SECURITY;
ALTER TABLE experiment_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE experiment_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE experiment_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE in_app_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE in_app_announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcement_dismissals ENABLE ROW LEVEL SECURITY;

-- Feature flags: readable by all authenticated users
CREATE POLICY "feature_flags_read_all" ON feature_flags
  FOR SELECT TO authenticated
  USING (true);

-- Feature flags: only super_admin can modify
CREATE POLICY "feature_flags_admin_all" ON feature_flags
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin')
  );

-- Feature flag overrides: readable by target tenant/user or super_admin
CREATE POLICY "feature_flag_overrides_read" ON feature_flag_overrides
  FOR SELECT TO authenticated
  USING (
    tenant_id = auth.uid() OR
    user_id = auth.uid() OR
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin')
  );

-- Feature flag overrides: modifiable by super_admin
CREATE POLICY "feature_flag_overrides_admin" ON feature_flag_overrides
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin')
  );

-- Experiments: readable by all authenticated
CREATE POLICY "experiments_read_all" ON experiments
  FOR SELECT TO authenticated
  USING (true);

-- Experiments: modifiable by super_admin
CREATE POLICY "experiments_admin_all" ON experiments
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin')
  );

-- Experiment variants: readable by all
CREATE POLICY "experiment_variants_read_all" ON experiment_variants
  FOR SELECT TO authenticated
  USING (true);

-- Experiment variants: modifiable by super_admin
CREATE POLICY "experiment_variants_admin_all" ON experiment_variants
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin')
  );

-- Experiment assignments: readable by assigned user/tenant
CREATE POLICY "experiment_assignments_read" ON experiment_assignments
  FOR SELECT TO authenticated
  USING (
    tenant_id = auth.uid() OR
    user_id = auth.uid() OR
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin')
  );

-- Experiment assignments: insertable via RPC
CREATE POLICY "experiment_assignments_insert" ON experiment_assignments
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- Experiment events: insertable by anyone, readable by super_admin
CREATE POLICY "experiment_events_insert" ON experiment_events
  FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "experiment_events_read_admin" ON experiment_events
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin')
  );

-- In-app feedback: users can create their own, super_admin can read all
CREATE POLICY "feedback_insert_own" ON in_app_feedback
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id = auth.uid() OR user_id = auth.uid());

CREATE POLICY "feedback_read_own" ON in_app_feedback
  FOR SELECT TO authenticated
  USING (
    tenant_id = auth.uid() OR
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin')
  );

-- Announcements: readable by all authenticated
CREATE POLICY "announcements_read_all" ON in_app_announcements
  FOR SELECT TO authenticated
  USING (true);

-- Announcements: modifiable by super_admin
CREATE POLICY "announcements_admin_all" ON in_app_announcements
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin')
  );

-- Announcement dismissals: users can manage their own
CREATE POLICY "dismissals_own" ON announcement_dismissals
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ============================================================================
-- 6. HELPER FUNCTIONS (RPCs)
-- ============================================================================

-- Get active feature flags for a tenant
CREATE OR REPLACE FUNCTION get_active_feature_flags_for_tenant(p_tenant_id UUID, p_plan TEXT DEFAULT 'free')
RETURNS TABLE (
  flag_key TEXT,
  flag_name TEXT,
  enabled BOOLEAN,
  source TEXT
) LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY
  SELECT
    ff.key AS flag_key,
    ff.name AS flag_name,
    COALESCE(
      -- First check tenant-specific override
      (SELECT ffo.enabled FROM feature_flag_overrides ffo WHERE ffo.feature_flag_id = ff.id AND ffo.tenant_id = p_tenant_id LIMIT 1),
      -- Then check plan-based rollout
      CASE
        WHEN ff.rollout_strategy = 'by_plan' THEN p_plan = ANY(ff.allowed_plans)
        WHEN ff.rollout_strategy = 'percentage' THEN
          (hashtext(p_tenant_id::text || ff.key) % 100) < ff.rollout_percentage
        ELSE ff.default_enabled
      END
    ) AS enabled,
    CASE
      WHEN EXISTS (SELECT 1 FROM feature_flag_overrides ffo WHERE ffo.feature_flag_id = ff.id AND ffo.tenant_id = p_tenant_id) THEN 'override'
      WHEN ff.rollout_strategy = 'by_plan' THEN 'plan'
      WHEN ff.rollout_strategy = 'percentage' THEN 'percentage'
      ELSE 'default'
    END AS source
  FROM feature_flags ff;
END;
$$;

-- Get or assign experiment variant for a tenant
CREATE OR REPLACE FUNCTION get_experiment_variant(p_tenant_id UUID, p_experiment_key TEXT)
RETURNS TABLE (
  experiment_key TEXT,
  variant_key TEXT,
  variant_name TEXT,
  variant_config JSONB,
  is_new_assignment BOOLEAN
) LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_experiment_id UUID;
  v_existing_variant TEXT;
  v_assigned_variant TEXT;
  v_variant_name TEXT;
  v_variant_config JSONB;
  v_is_new BOOLEAN := false;
BEGIN
  -- Get the experiment
  SELECT id INTO v_experiment_id
  FROM experiments
  WHERE key = p_experiment_key AND status = 'running';

  IF v_experiment_id IS NULL THEN
    RETURN;
  END IF;

  -- Check for existing assignment
  SELECT ea.variant_key INTO v_existing_variant
  FROM experiment_assignments ea
  WHERE ea.experiment_id = v_experiment_id AND ea.tenant_id = p_tenant_id;

  IF v_existing_variant IS NOT NULL THEN
    v_assigned_variant := v_existing_variant;
  ELSE
    -- Assign a variant based on weighted random selection
    WITH cumulative AS (
      SELECT
        ev.key,
        ev.name,
        ev.config,
        SUM(ev.allocation_percent) OVER (ORDER BY ev.key) AS cumulative_percent
      FROM experiment_variants ev
      WHERE ev.experiment_id = v_experiment_id
    )
    SELECT key, name, config INTO v_assigned_variant, v_variant_name, v_variant_config
    FROM cumulative
    WHERE cumulative_percent > (hashtext(p_tenant_id::text || p_experiment_key) % 100)
    ORDER BY cumulative_percent
    LIMIT 1;

    -- Insert the assignment
    IF v_assigned_variant IS NOT NULL THEN
      INSERT INTO experiment_assignments (experiment_id, tenant_id, variant_key)
      VALUES (v_experiment_id, p_tenant_id, v_assigned_variant)
      ON CONFLICT (experiment_id, tenant_id) DO NOTHING;
      v_is_new := true;
    END IF;
  END IF;

  -- Get variant details if not already fetched
  IF v_variant_name IS NULL THEN
    SELECT ev.name, ev.config INTO v_variant_name, v_variant_config
    FROM experiment_variants ev
    WHERE ev.experiment_id = v_experiment_id AND ev.key = v_assigned_variant;
  END IF;

  RETURN QUERY SELECT
    p_experiment_key,
    v_assigned_variant,
    v_variant_name,
    v_variant_config,
    v_is_new;
END;
$$;

-- Record experiment event
CREATE OR REPLACE FUNCTION record_experiment_event(
  p_experiment_key TEXT,
  p_event_type TEXT,
  p_tenant_id UUID DEFAULT NULL,
  p_user_id UUID DEFAULT NULL,
  p_event_name TEXT DEFAULT NULL,
  p_event_value NUMERIC DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'
) RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_experiment_id UUID;
  v_variant_key TEXT;
  v_event_id UUID;
BEGIN
  -- Get experiment
  SELECT id INTO v_experiment_id FROM experiments WHERE key = p_experiment_key;
  IF v_experiment_id IS NULL THEN
    RETURN NULL;
  END IF;

  -- Get variant assignment
  SELECT ea.variant_key INTO v_variant_key
  FROM experiment_assignments ea
  WHERE ea.experiment_id = v_experiment_id
    AND (ea.tenant_id = p_tenant_id OR ea.user_id = p_user_id)
  LIMIT 1;

  IF v_variant_key IS NULL THEN
    v_variant_key := 'unassigned';
  END IF;

  -- Insert event
  INSERT INTO experiment_events (experiment_id, variant_key, tenant_id, user_id, event_type, event_name, event_value, metadata)
  VALUES (v_experiment_id, v_variant_key, p_tenant_id, p_user_id, p_event_type, p_event_name, p_event_value, p_metadata)
  RETURNING id INTO v_event_id;

  RETURN v_event_id;
END;
$$;

-- Get active announcements for user
CREATE OR REPLACE FUNCTION get_active_announcements(p_tenant_id UUID, p_user_id UUID, p_plan TEXT DEFAULT 'free')
RETURNS TABLE (
  id UUID,
  title TEXT,
  body TEXT,
  category TEXT,
  priority INTEGER,
  display_type TEXT,
  action_url TEXT,
  action_label TEXT,
  icon TEXT,
  is_dismissible BOOLEAN,
  starts_at TIMESTAMPTZ
) LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY
  SELECT
    a.id,
    a.title,
    a.body,
    a.category,
    a.priority,
    a.display_type,
    a.action_url,
    a.action_label,
    a.icon,
    a.is_dismissible,
    a.starts_at
  FROM in_app_announcements a
  WHERE
    a.starts_at <= now()
    AND (a.ends_at IS NULL OR a.ends_at > now())
    AND (
      a.audience = 'all'
      OR (a.audience = 'by_plan' AND p_plan = ANY(a.target_plans))
      OR (a.audience = 'by_tenant' AND p_tenant_id = ANY(a.target_tenant_ids))
    )
    AND NOT EXISTS (
      SELECT 1 FROM announcement_dismissals ad
      WHERE ad.announcement_id = a.id AND ad.user_id = p_user_id
    )
  ORDER BY a.priority DESC, a.starts_at DESC;
END;
$$;

-- Record in-app feedback
CREATE OR REPLACE FUNCTION record_in_app_feedback(
  p_context TEXT,
  p_tenant_id UUID DEFAULT NULL,
  p_user_id UUID DEFAULT NULL,
  p_rating INTEGER DEFAULT NULL,
  p_is_helpful BOOLEAN DEFAULT NULL,
  p_feedback_text TEXT DEFAULT NULL,
  p_feature_key TEXT DEFAULT NULL,
  p_page_url TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'
) RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_feedback_id UUID;
  v_sentiment TEXT;
BEGIN
  -- Auto-detect sentiment
  IF p_rating IS NOT NULL THEN
    v_sentiment := CASE
      WHEN p_rating >= 4 THEN 'positive'
      WHEN p_rating = 3 THEN 'neutral'
      ELSE 'negative'
    END;
  ELSIF p_is_helpful IS NOT NULL THEN
    v_sentiment := CASE WHEN p_is_helpful THEN 'positive' ELSE 'negative' END;
  END IF;

  INSERT INTO in_app_feedback (
    tenant_id, user_id, context, feature_key, rating, is_helpful,
    feedback_text, sentiment, page_url, metadata
  )
  VALUES (
    COALESCE(p_tenant_id, auth.uid()),
    p_user_id,
    p_context,
    p_feature_key,
    p_rating,
    p_is_helpful,
    p_feedback_text,
    v_sentiment,
    p_page_url,
    p_metadata
  )
  RETURNING id INTO v_feedback_id;

  RETURN v_feedback_id;
END;
$$;

-- Dismiss announcement
CREATE OR REPLACE FUNCTION dismiss_announcement(p_announcement_id UUID)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO announcement_dismissals (announcement_id, user_id)
  VALUES (p_announcement_id, auth.uid())
  ON CONFLICT (announcement_id, user_id) DO NOTHING;

  RETURN true;
END;
$$;

-- ============================================================================
-- 7. SEED INITIAL FEATURE FLAGS
-- ============================================================================

INSERT INTO feature_flags (key, name, description, default_enabled, rollout_strategy, allowed_plans, category)
VALUES
  ('feature.ai_assistant', 'AI Content Assistant', 'AI-powered content generation and suggestions', true, 'by_plan', ARRAY['pro', 'enterprise'], 'feature'),
  ('feature.templates_gallery', 'Templates Gallery', 'Pre-built templates and vertical packs', true, 'global', ARRAY[]::TEXT[], 'feature'),
  ('feature.reseller_portal', 'Reseller Portal', 'Reseller management and billing portal', true, 'by_plan', ARRAY['enterprise'], 'feature'),
  ('feature.enterprise_security', 'Enterprise Security', 'SSO, audit logs, and advanced security features', true, 'by_plan', ARRAY['pro', 'enterprise'], 'feature'),
  ('feature.advanced_analytics', 'Advanced Analytics', 'Detailed analytics and reporting', true, 'by_plan', ARRAY['pro', 'enterprise'], 'feature'),
  ('feature.white_label', 'White-Label', 'Custom branding and white-label options', true, 'by_plan', ARRAY['pro', 'enterprise'], 'feature'),
  ('feature.api_access', 'API Access', 'Developer API access', true, 'by_plan', ARRAY['pro', 'enterprise'], 'feature'),
  ('feature.webhooks', 'Webhooks', 'Webhook integrations', true, 'by_plan', ARRAY['pro', 'enterprise'], 'feature'),
  ('ui.new_dashboard', 'New Dashboard Design', 'New redesigned dashboard experience', true, 'global', ARRAY[]::TEXT[], 'ui'),
  ('ui.feedback_widget', 'Feedback Widget', 'Show in-app feedback collection widget', true, 'global', ARRAY[]::TEXT[], 'ui')
ON CONFLICT (key) DO NOTHING;

-- ============================================================================
-- 8. TRIGGERS FOR UPDATED_AT
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_feature_flags_updated_at
  BEFORE UPDATE ON feature_flags
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_feature_flag_overrides_updated_at
  BEFORE UPDATE ON feature_flag_overrides
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_experiments_updated_at
  BEFORE UPDATE ON experiments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_experiment_variants_updated_at
  BEFORE UPDATE ON experiment_variants
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_announcements_updated_at
  BEFORE UPDATE ON in_app_announcements
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
