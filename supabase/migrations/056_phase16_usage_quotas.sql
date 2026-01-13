-- ============================================================================
-- Phase 16: Usage Tracking & Quota System
-- ============================================================================
-- This migration creates the infrastructure for tracking feature usage,
-- enforcing quotas, and preparing for metered billing.
--
-- TENANT MODEL: profiles-as-tenant
-- tenant_id references profiles(id) - the profile IS the tenant/owner.
-- This aligns with organization_members and locations from migration 021.
-- ============================================================================

-- ============================================================================
-- 1. USAGE EVENTS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.usage_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    -- tenant_id = profile ID of the business owner (profiles-as-tenant pattern)
    tenant_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    feature_key TEXT NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    -- Constraints
    CONSTRAINT usage_events_quantity_positive CHECK (quantity > 0),
    CONSTRAINT usage_events_feature_key_valid CHECK (feature_key ~ '^[a-z][a-z0-9_]*$')
);

-- Add comments for documentation
COMMENT ON TABLE public.usage_events IS 'Tracks feature usage events for quota enforcement and billing';
COMMENT ON COLUMN public.usage_events.feature_key IS 'Feature identifier (e.g., ai_assistant, campaigns)';
COMMENT ON COLUMN public.usage_events.quantity IS 'Amount of usage (e.g., 1 for single action, N for batch)';
COMMENT ON COLUMN public.usage_events.metadata IS 'Additional context about the usage event';

-- ============================================================================
-- 2. INDEXES FOR PERFORMANCE
-- ============================================================================

-- Primary lookup: tenant + feature within a time range
CREATE INDEX IF NOT EXISTS idx_usage_events_tenant_feature_time
    ON public.usage_events (tenant_id, feature_key, created_at DESC);

-- Time-based queries (for aggregations)
CREATE INDEX IF NOT EXISTS idx_usage_events_created_at
    ON public.usage_events (created_at DESC);

-- Tenant-only queries
CREATE INDEX IF NOT EXISTS idx_usage_events_tenant_id
    ON public.usage_events (tenant_id);

-- Monthly aggregation: The idx_usage_events_tenant_feature_time composite index
-- already efficiently covers monthly aggregation queries.
-- A date_trunc expression index would require an IMMUTABLE wrapper function.

-- ============================================================================
-- 3. QUOTA OVERRIDES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.quota_overrides (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    -- tenant_id = profile ID of the business owner (profiles-as-tenant pattern)
    tenant_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    feature_key TEXT NOT NULL,
    monthly_limit INTEGER, -- NULL = unlimited
    is_unlimited BOOLEAN DEFAULT false,
    reason TEXT,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at TIMESTAMPTZ, -- Optional expiration for temporary overrides

    -- Unique constraint per tenant/feature
    CONSTRAINT quota_overrides_unique UNIQUE (tenant_id, feature_key)
);

COMMENT ON TABLE public.quota_overrides IS 'Per-tenant quota overrides for billing flexibility';
COMMENT ON COLUMN public.quota_overrides.is_unlimited IS 'If true, no quota limit applies';
COMMENT ON COLUMN public.quota_overrides.expires_at IS 'Optional expiration for promotional overrides';

-- ============================================================================
-- 4. RPC FUNCTIONS
-- ============================================================================

-- Function: Record a usage event
CREATE OR REPLACE FUNCTION public.record_usage_event(
    p_tenant_id UUID,
    p_feature_key TEXT,
    p_quantity INTEGER DEFAULT 1,
    p_metadata JSONB DEFAULT '{}'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_event_id UUID;
BEGIN
    -- Validate inputs
    IF p_quantity <= 0 THEN
        RAISE EXCEPTION 'Quantity must be positive';
    END IF;

    IF p_feature_key !~ '^[a-z][a-z0-9_]*$' THEN
        RAISE EXCEPTION 'Invalid feature key format';
    END IF;

    -- Insert the event
    INSERT INTO public.usage_events (tenant_id, feature_key, quantity, metadata)
    VALUES (p_tenant_id, p_feature_key, p_quantity, p_metadata)
    RETURNING id INTO v_event_id;

    RETURN v_event_id;
END;
$$;

COMMENT ON FUNCTION public.record_usage_event IS 'Records a feature usage event for quota tracking';

-- Function: Get usage summary for a tenant (current month)
CREATE OR REPLACE FUNCTION public.get_usage_summary(
    p_tenant_id UUID,
    p_start_date TIMESTAMPTZ DEFAULT date_trunc('month', now()),
    p_end_date TIMESTAMPTZ DEFAULT now()
)
RETURNS TABLE (
    feature_key TEXT,
    total_usage BIGINT,
    event_count BIGINT,
    first_event TIMESTAMPTZ,
    last_event TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT
        ue.feature_key,
        COALESCE(SUM(ue.quantity), 0)::BIGINT AS total_usage,
        COUNT(*)::BIGINT AS event_count,
        MIN(ue.created_at) AS first_event,
        MAX(ue.created_at) AS last_event
    FROM public.usage_events ue
    WHERE ue.tenant_id = p_tenant_id
      AND ue.created_at >= p_start_date
      AND ue.created_at <= p_end_date
    GROUP BY ue.feature_key
    ORDER BY total_usage DESC;
END;
$$;

COMMENT ON FUNCTION public.get_usage_summary IS 'Returns aggregated usage per feature for a tenant within a date range';

-- Function: Get monthly usage for a specific feature
CREATE OR REPLACE FUNCTION public.get_feature_monthly_usage(
    p_tenant_id UUID,
    p_feature_key TEXT
)
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_total BIGINT;
BEGIN
    SELECT COALESCE(SUM(quantity), 0)::BIGINT INTO v_total
    FROM public.usage_events
    WHERE tenant_id = p_tenant_id
      AND feature_key = p_feature_key
      AND created_at >= date_trunc('month', now())
      AND created_at <= now();

    RETURN v_total;
END;
$$;

COMMENT ON FUNCTION public.get_feature_monthly_usage IS 'Returns current month usage for a specific feature';

-- Function: Check if tenant has quota override
CREATE OR REPLACE FUNCTION public.get_quota_override(
    p_tenant_id UUID,
    p_feature_key TEXT
)
RETURNS TABLE (
    monthly_limit INTEGER,
    is_unlimited BOOLEAN,
    expires_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT
        qo.monthly_limit,
        qo.is_unlimited,
        qo.expires_at
    FROM public.quota_overrides qo
    WHERE qo.tenant_id = p_tenant_id
      AND qo.feature_key = p_feature_key
      AND (qo.expires_at IS NULL OR qo.expires_at > now());
END;
$$;

COMMENT ON FUNCTION public.get_quota_override IS 'Returns active quota override for a tenant/feature pair';

-- Function: Check quota and return status
CREATE OR REPLACE FUNCTION public.check_quota_status(
    p_tenant_id UUID,
    p_feature_key TEXT,
    p_plan_quota INTEGER -- Default plan quota passed from application
)
RETURNS TABLE (
    current_usage BIGINT,
    quota_limit INTEGER,
    is_unlimited BOOLEAN,
    remaining INTEGER,
    usage_percentage NUMERIC,
    is_exceeded BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_current_usage BIGINT;
    v_quota_limit INTEGER;
    v_is_unlimited BOOLEAN;
    v_override RECORD;
BEGIN
    -- Get current month usage
    v_current_usage := public.get_feature_monthly_usage(p_tenant_id, p_feature_key);

    -- Check for override
    SELECT * INTO v_override
    FROM public.quota_overrides qo
    WHERE qo.tenant_id = p_tenant_id
      AND qo.feature_key = p_feature_key
      AND (qo.expires_at IS NULL OR qo.expires_at > now())
    LIMIT 1;

    -- Determine effective quota
    IF v_override.is_unlimited = true THEN
        v_is_unlimited := true;
        v_quota_limit := NULL;
    ELSIF v_override.monthly_limit IS NOT NULL THEN
        v_is_unlimited := false;
        v_quota_limit := v_override.monthly_limit;
    ELSIF p_plan_quota IS NULL THEN
        v_is_unlimited := true;
        v_quota_limit := NULL;
    ELSE
        v_is_unlimited := false;
        v_quota_limit := p_plan_quota;
    END IF;

    -- Return status
    RETURN QUERY
    SELECT
        v_current_usage,
        v_quota_limit,
        v_is_unlimited,
        CASE
            WHEN v_is_unlimited THEN NULL
            ELSE GREATEST(0, v_quota_limit - v_current_usage::INTEGER)
        END,
        CASE
            WHEN v_is_unlimited OR v_quota_limit = 0 THEN 0
            ELSE ROUND((v_current_usage::NUMERIC / v_quota_limit::NUMERIC) * 100, 2)
        END,
        CASE
            WHEN v_is_unlimited THEN false
            ELSE v_current_usage >= v_quota_limit
        END;
END;
$$;

COMMENT ON FUNCTION public.check_quota_status IS 'Returns comprehensive quota status for a tenant/feature';

-- ============================================================================
-- 5. USAGE HISTORY VIEW (for reporting)
-- ============================================================================

CREATE OR REPLACE VIEW public.usage_monthly_summary AS
SELECT
    tenant_id,
    feature_key,
    date_trunc('month', created_at) AS month,
    SUM(quantity) AS total_usage,
    COUNT(*) AS event_count,
    MIN(created_at) AS first_event,
    MAX(created_at) AS last_event
FROM public.usage_events
GROUP BY tenant_id, feature_key, date_trunc('month', created_at);

COMMENT ON VIEW public.usage_monthly_summary IS 'Aggregated monthly usage per tenant/feature';

-- ============================================================================
-- 6. ROW LEVEL SECURITY
-- ============================================================================
-- Uses profiles-as-tenant pattern:
-- - tenant_id = profile ID of the business owner
-- - User can access if: they ARE the tenant, OR are a team member, OR are super_admin
-- - Leverages helper functions from migration 021: is_tenant_member(), is_super_admin()
-- ============================================================================

-- Enable RLS on usage_events
ALTER TABLE public.usage_events ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own tenant's usage events
-- Covers: tenant owner, team members, and super_admins
CREATE POLICY "Users can view own tenant usage"
    ON public.usage_events
    FOR SELECT
    USING (
        -- User IS the tenant owner
        tenant_id = auth.uid()
        -- OR user is a team member of this tenant
        OR is_tenant_member(tenant_id)
        -- OR user is super_admin (can see all)
        OR is_super_admin()
    );

-- Policy: Authenticated users can insert events for their tenant
CREATE POLICY "Authenticated users can insert usage events"
    ON public.usage_events
    FOR INSERT
    WITH CHECK (
        -- User IS the tenant owner
        tenant_id = auth.uid()
        -- OR user is a team member of this tenant
        OR is_tenant_member(tenant_id)
        -- OR user is super_admin
        OR is_super_admin()
    );

-- Enable RLS on quota_overrides
ALTER TABLE public.quota_overrides ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own tenant's quota overrides
CREATE POLICY "Users can view own tenant quota overrides"
    ON public.quota_overrides
    FOR SELECT
    USING (
        -- User IS the tenant owner
        tenant_id = auth.uid()
        -- OR user is a team member of this tenant
        OR is_tenant_member(tenant_id)
        -- OR user is super_admin
        OR is_super_admin()
    );

-- Policy: Only super admins can manage (insert/update/delete) quota overrides
CREATE POLICY "Super admins can manage quota overrides"
    ON public.quota_overrides
    FOR ALL
    USING (is_super_admin())
    WITH CHECK (is_super_admin());

-- ============================================================================
-- 7. TRIGGERS
-- ============================================================================

-- Auto-update updated_at on quota_overrides
CREATE OR REPLACE FUNCTION public.update_quota_override_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER quota_overrides_updated_at
    BEFORE UPDATE ON public.quota_overrides
    FOR EACH ROW
    EXECUTE FUNCTION public.update_quota_override_timestamp();

-- ============================================================================
-- 8. ADD USAGE_DASHBOARD FEATURE FLAG
-- ============================================================================

-- Add the usage_dashboard feature flag if feature_flags table exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'feature_flags') THEN
        INSERT INTO public.feature_flags (key, name, description, category, default_enabled, created_at)
        VALUES (
            'feature.usage_dashboard',
            'Usage Dashboard',
            'Access to the usage analytics and quota dashboard',
            'analytics',
            true,
            now()
        )
        ON CONFLICT (key) DO NOTHING;
    END IF;
END $$;

-- ============================================================================
-- 9. GRANT PERMISSIONS
-- ============================================================================

-- Grant execute permissions on RPC functions
GRANT EXECUTE ON FUNCTION public.record_usage_event TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_usage_summary TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_feature_monthly_usage TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_quota_override TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_quota_status TO authenticated;

-- Grant access to tables
GRANT SELECT ON public.usage_events TO authenticated;
GRANT INSERT ON public.usage_events TO authenticated;
GRANT SELECT ON public.quota_overrides TO authenticated;
GRANT SELECT ON public.usage_monthly_summary TO authenticated;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

DO $$
BEGIN
    -- Verify tables exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'usage_events') THEN
        RAISE EXCEPTION 'usage_events table was not created';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'quota_overrides') THEN
        RAISE EXCEPTION 'quota_overrides table was not created';
    END IF;

    RAISE NOTICE 'Phase 16 migration completed successfully';
END $$;
