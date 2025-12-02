-- Migration: 031_public_api_and_webhooks.sql
-- Phase 19: Public API and Webhooks
-- Enables external integrations via API tokens and webhook notifications

-- ============================================
-- 1. API TOKENS TABLE
-- ============================================
-- Stores hashed API tokens for programmatic access

CREATE TABLE IF NOT EXISTS public.api_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  token_prefix TEXT NOT NULL, -- First 8 chars for identification (e.g., "biz_xxxx")
  scopes TEXT[] NOT NULL DEFAULT '{}',
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  revoked_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ -- Optional expiration
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_api_tokens_owner_id ON public.api_tokens(owner_id);
CREATE INDEX IF NOT EXISTS idx_api_tokens_token_hash ON public.api_tokens(token_hash);
CREATE INDEX IF NOT EXISTS idx_api_tokens_active ON public.api_tokens(owner_id)
  WHERE revoked_at IS NULL;

-- ============================================
-- 2. WEBHOOK ENDPOINTS TABLE
-- ============================================
-- Stores webhook endpoint configurations

CREATE TABLE IF NOT EXISTS public.webhook_endpoints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  secret TEXT NOT NULL, -- For HMAC signing
  events TEXT[] NOT NULL DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Validate HTTPS URL
  CONSTRAINT webhook_url_https CHECK (url LIKE 'https://%')
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_webhook_endpoints_owner_id ON public.webhook_endpoints(owner_id);
CREATE INDEX IF NOT EXISTS idx_webhook_endpoints_active ON public.webhook_endpoints(owner_id, is_active)
  WHERE is_active = true;

-- ============================================
-- 3. WEBHOOK EVENTS TABLE
-- ============================================
-- Tracks webhook delivery attempts

CREATE TABLE IF NOT EXISTS public.webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  endpoint_id UUID NOT NULL REFERENCES public.webhook_endpoints(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'delivered', 'failed', 'exhausted')),
  attempt_count INT NOT NULL DEFAULT 0,
  max_attempts INT NOT NULL DEFAULT 5,
  last_attempt_at TIMESTAMPTZ,
  next_attempt_at TIMESTAMPTZ DEFAULT NOW(),
  last_error TEXT,
  response_status INT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_webhook_events_owner_id ON public.webhook_events(owner_id);
CREATE INDEX IF NOT EXISTS idx_webhook_events_endpoint_id ON public.webhook_events(endpoint_id);
CREATE INDEX IF NOT EXISTS idx_webhook_events_pending ON public.webhook_events(status, next_attempt_at)
  WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_webhook_events_created_at ON public.webhook_events(created_at DESC);

-- ============================================
-- 4. RLS POLICIES FOR API_TOKENS
-- ============================================

ALTER TABLE public.api_tokens ENABLE ROW LEVEL SECURITY;

-- Super admins can see all
CREATE POLICY "Super admins can manage all api tokens"
  ON public.api_tokens FOR ALL
  TO authenticated
  USING (is_super_admin());

-- Admins can manage tokens for their clients
CREATE POLICY "Admins can manage client api tokens"
  ON public.api_tokens FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles admin_profile
      JOIN public.profiles client_profile ON client_profile.managed_by = admin_profile.id
      WHERE admin_profile.id = auth.uid()
        AND admin_profile.role = 'admin'
        AND client_profile.id = api_tokens.owner_id
    )
  );

-- Tenant owners can manage their own tokens
CREATE POLICY "Tenant owners can manage own api tokens"
  ON public.api_tokens FOR ALL
  TO authenticated
  USING (owner_id = auth.uid());

-- Tenant managers can view tokens
CREATE POLICY "Tenant managers can view api tokens"
  ON public.api_tokens FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members
      WHERE organization_members.tenant_id = api_tokens.owner_id
        AND organization_members.user_id = auth.uid()
        AND organization_members.status = 'active'
        AND organization_members.role IN ('owner', 'manager')
    )
  );

-- ============================================
-- 5. RLS POLICIES FOR WEBHOOK_ENDPOINTS
-- ============================================

ALTER TABLE public.webhook_endpoints ENABLE ROW LEVEL SECURITY;

-- Super admins can see all
CREATE POLICY "Super admins can manage all webhook endpoints"
  ON public.webhook_endpoints FOR ALL
  TO authenticated
  USING (is_super_admin());

-- Admins can manage endpoints for their clients
CREATE POLICY "Admins can manage client webhook endpoints"
  ON public.webhook_endpoints FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles admin_profile
      JOIN public.profiles client_profile ON client_profile.managed_by = admin_profile.id
      WHERE admin_profile.id = auth.uid()
        AND admin_profile.role = 'admin'
        AND client_profile.id = webhook_endpoints.owner_id
    )
  );

-- Tenant owners can manage their own endpoints
CREATE POLICY "Tenant owners can manage own webhook endpoints"
  ON public.webhook_endpoints FOR ALL
  TO authenticated
  USING (owner_id = auth.uid());

-- Tenant managers can manage endpoints
CREATE POLICY "Tenant managers can manage webhook endpoints"
  ON public.webhook_endpoints FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members
      WHERE organization_members.tenant_id = webhook_endpoints.owner_id
        AND organization_members.user_id = auth.uid()
        AND organization_members.status = 'active'
        AND organization_members.role IN ('owner', 'manager')
    )
  );

-- ============================================
-- 6. RLS POLICIES FOR WEBHOOK_EVENTS
-- ============================================

ALTER TABLE public.webhook_events ENABLE ROW LEVEL SECURITY;

-- Super admins can see all
CREATE POLICY "Super admins can view all webhook events"
  ON public.webhook_events FOR SELECT
  TO authenticated
  USING (is_super_admin());

-- Admins can view events for their clients
CREATE POLICY "Admins can view client webhook events"
  ON public.webhook_events FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles admin_profile
      JOIN public.profiles client_profile ON client_profile.managed_by = admin_profile.id
      WHERE admin_profile.id = auth.uid()
        AND admin_profile.role = 'admin'
        AND client_profile.id = webhook_events.owner_id
    )
  );

-- Tenant owners can view their own events
CREATE POLICY "Tenant owners can view own webhook events"
  ON public.webhook_events FOR SELECT
  TO authenticated
  USING (owner_id = auth.uid());

-- Tenant managers can view events
CREATE POLICY "Tenant managers can view webhook events"
  ON public.webhook_events FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members
      WHERE organization_members.tenant_id = webhook_events.owner_id
        AND organization_members.user_id = auth.uid()
        AND organization_members.status = 'active'
        AND organization_members.role IN ('owner', 'manager')
    )
  );

-- Service role can insert/update webhook events (for dispatch)
CREATE POLICY "Service can manage webhook events"
  ON public.webhook_events FOR ALL
  TO service_role
  USING (true);

-- ============================================
-- 7. HELPER FUNCTIONS
-- ============================================

-- Validate API token and return context
CREATE OR REPLACE FUNCTION validate_api_token(p_token_hash TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_token RECORD;
BEGIN
  -- Find token by hash
  SELECT
    t.id,
    t.owner_id,
    t.name,
    t.scopes,
    t.revoked_at,
    t.expires_at,
    p.role as owner_role,
    p.stripe_subscription_status
  INTO v_token
  FROM public.api_tokens t
  JOIN public.profiles p ON p.id = t.owner_id
  WHERE t.token_hash = p_token_hash;

  -- Token not found
  IF v_token.id IS NULL THEN
    RETURN jsonb_build_object(
      'valid', false,
      'error', 'Invalid API token'
    );
  END IF;

  -- Token revoked
  IF v_token.revoked_at IS NOT NULL THEN
    RETURN jsonb_build_object(
      'valid', false,
      'error', 'API token has been revoked'
    );
  END IF;

  -- Token expired
  IF v_token.expires_at IS NOT NULL AND v_token.expires_at < NOW() THEN
    RETURN jsonb_build_object(
      'valid', false,
      'error', 'API token has expired'
    );
  END IF;

  -- Update last used timestamp
  UPDATE public.api_tokens
  SET last_used_at = NOW()
  WHERE id = v_token.id;

  -- Return valid context
  RETURN jsonb_build_object(
    'valid', true,
    'token_id', v_token.id,
    'owner_id', v_token.owner_id,
    'token_name', v_token.name,
    'scopes', v_token.scopes,
    'owner_role', v_token.owner_role
  );
END;
$$;

-- Enqueue a webhook event for all matching endpoints
CREATE OR REPLACE FUNCTION enqueue_webhook_event(
  p_owner_id UUID,
  p_event_type TEXT,
  p_payload JSONB
)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_endpoint RECORD;
  v_count INT := 0;
BEGIN
  -- Find all active endpoints subscribed to this event
  FOR v_endpoint IN
    SELECT id, url, events
    FROM public.webhook_endpoints
    WHERE owner_id = p_owner_id
      AND is_active = true
      AND p_event_type = ANY(events)
  LOOP
    -- Create webhook event
    INSERT INTO public.webhook_events (
      owner_id,
      endpoint_id,
      event_type,
      payload,
      status,
      next_attempt_at
    ) VALUES (
      p_owner_id,
      v_endpoint.id,
      p_event_type,
      p_payload,
      'pending',
      NOW()
    );

    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$;

-- Get pending webhook events for dispatch
CREATE OR REPLACE FUNCTION get_pending_webhook_events(p_limit INT DEFAULT 50)
RETURNS TABLE (
  event_id UUID,
  endpoint_url TEXT,
  endpoint_secret TEXT,
  event_type TEXT,
  payload JSONB,
  attempt_count INT,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    e.id as event_id,
    ep.url as endpoint_url,
    ep.secret as endpoint_secret,
    e.event_type,
    e.payload,
    e.attempt_count,
    e.created_at
  FROM public.webhook_events e
  JOIN public.webhook_endpoints ep ON ep.id = e.endpoint_id
  WHERE e.status = 'pending'
    AND e.next_attempt_at <= NOW()
    AND ep.is_active = true
  ORDER BY e.next_attempt_at ASC
  LIMIT p_limit
  FOR UPDATE OF e SKIP LOCKED;
END;
$$;

-- Update webhook event status after delivery attempt
CREATE OR REPLACE FUNCTION update_webhook_event_status(
  p_event_id UUID,
  p_success BOOLEAN,
  p_response_status INT DEFAULT NULL,
  p_error TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_event RECORD;
  v_backoff_seconds INT;
BEGIN
  -- Get current event state
  SELECT attempt_count, max_attempts
  INTO v_event
  FROM public.webhook_events
  WHERE id = p_event_id;

  IF v_event IS NULL THEN
    RETURN false;
  END IF;

  IF p_success THEN
    -- Mark as delivered
    UPDATE public.webhook_events
    SET
      status = 'delivered',
      attempt_count = attempt_count + 1,
      last_attempt_at = NOW(),
      response_status = p_response_status
    WHERE id = p_event_id;
  ELSE
    -- Calculate exponential backoff (30s, 1m, 2m, 4m, 8m)
    v_backoff_seconds := 30 * POWER(2, v_event.attempt_count);

    -- Check if exhausted
    IF v_event.attempt_count + 1 >= v_event.max_attempts THEN
      UPDATE public.webhook_events
      SET
        status = 'exhausted',
        attempt_count = attempt_count + 1,
        last_attempt_at = NOW(),
        last_error = p_error,
        response_status = p_response_status
      WHERE id = p_event_id;
    ELSE
      -- Schedule retry
      UPDATE public.webhook_events
      SET
        attempt_count = attempt_count + 1,
        last_attempt_at = NOW(),
        next_attempt_at = NOW() + (v_backoff_seconds || ' seconds')::INTERVAL,
        last_error = p_error,
        response_status = p_response_status
      WHERE id = p_event_id;
    END IF;
  END IF;

  RETURN true;
END;
$$;

-- Get webhook delivery history for an endpoint
CREATE OR REPLACE FUNCTION get_webhook_deliveries(
  p_endpoint_id UUID,
  p_limit INT DEFAULT 20
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_deliveries JSONB;
BEGIN
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'id', e.id,
      'event_type', e.event_type,
      'status', e.status,
      'attempt_count', e.attempt_count,
      'response_status', e.response_status,
      'last_error', e.last_error,
      'created_at', e.created_at,
      'last_attempt_at', e.last_attempt_at
    ) ORDER BY e.created_at DESC
  ), '[]'::jsonb) INTO v_deliveries
  FROM public.webhook_events e
  WHERE e.endpoint_id = p_endpoint_id
  LIMIT p_limit;

  RETURN v_deliveries;
END;
$$;

-- ============================================
-- 8. TRIGGER FOR UPDATED_AT
-- ============================================

CREATE TRIGGER update_webhook_endpoints_updated_at
  BEFORE UPDATE ON public.webhook_endpoints
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 9. GRANT PERMISSIONS
-- ============================================

GRANT EXECUTE ON FUNCTION validate_api_token(TEXT) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION enqueue_webhook_event(UUID, TEXT, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION get_pending_webhook_events(INT) TO authenticated;
GRANT EXECUTE ON FUNCTION update_webhook_event_status(UUID, BOOLEAN, INT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_webhook_deliveries(UUID, INT) TO authenticated;

-- ============================================
-- 10. AVAILABLE SCOPES AND EVENTS (comments)
-- ============================================

COMMENT ON TABLE public.api_tokens IS
'API tokens for programmatic access. Available scopes:
- apps:read, apps:write
- campaigns:read, campaigns:write
- playlists:read, playlists:write
- screens:read
- media:read, media:write';

COMMENT ON TABLE public.webhook_endpoints IS
'Webhook endpoint configurations. Available events:
- device.online, device.offline
- campaign.activated, campaign.deactivated, campaign.ended
- content.approved, content.rejected
- playlist.updated, layout.updated
- media.uploaded';

COMMENT ON TABLE public.webhook_events IS
'Tracks webhook delivery attempts with exponential backoff retry logic.';
