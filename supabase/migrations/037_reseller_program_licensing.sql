-- ============================================================================
-- Migration 037: Reseller Program, Licensing, and Multi-Brand Distribution
-- ============================================================================
-- This migration adds:
-- 1. Reseller accounts and tenant management
-- 2. License key generation and redemption
-- 3. Commission tracking and billing
-- 4. Multi-brand distribution support
-- ============================================================================

-- ============================================================================
-- 1. RESELLER ACCOUNTS
-- ============================================================================

CREATE TABLE IF NOT EXISTS reseller_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Company info
  company_name TEXT NOT NULL,
  company_email TEXT NOT NULL,
  company_phone TEXT,
  company_website TEXT,
  company_address TEXT,

  -- Status
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'suspended', 'terminated')),
  approved_at TIMESTAMPTZ,
  approved_by UUID REFERENCES auth.users(id),

  -- Commission settings
  commission_percent DECIMAL(5,2) DEFAULT 20.00,
  billing_method TEXT DEFAULT 'monthly' CHECK (billing_method IN ('monthly', 'annual', 'invoice')),
  payment_terms_days INTEGER DEFAULT 30,

  -- Limits
  max_tenants INTEGER DEFAULT 100,
  max_licenses_per_month INTEGER DEFAULT 500,

  -- Contact
  primary_contact_name TEXT,
  primary_contact_email TEXT,
  primary_contact_phone TEXT,

  -- Stripe for payouts
  stripe_connect_id TEXT,
  payout_enabled BOOLEAN DEFAULT false,

  -- Notes
  notes TEXT,

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_reseller_accounts_user ON reseller_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_reseller_accounts_status ON reseller_accounts(status);

ALTER TABLE reseller_accounts ENABLE ROW LEVEL SECURITY;

-- Resellers can see their own account
CREATE POLICY "Resellers can view own account"
  ON reseller_accounts FOR SELECT
  USING (user_id = auth.uid() OR EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin'
  ));

-- Only super_admin can modify reseller accounts
CREATE POLICY "Super admin can manage reseller accounts"
  ON reseller_accounts FOR ALL
  USING (EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin'
  ));

-- ============================================================================
-- 2. RESELLER-TENANT RELATIONSHIP
-- ============================================================================

CREATE TABLE IF NOT EXISTS reseller_tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reseller_id UUID NOT NULL REFERENCES reseller_accounts(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Relationship status
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'transferred')),

  -- Custom terms for this tenant
  custom_commission_percent DECIMAL(5,2), -- Override default if set
  custom_pricing JSONB, -- Custom pricing for this tenant

  -- License info
  license_id UUID, -- Will reference licenses table

  -- Dates
  created_at TIMESTAMPTZ DEFAULT now(),
  transferred_at TIMESTAMPTZ,
  transferred_from UUID REFERENCES reseller_accounts(id),

  UNIQUE(tenant_id) -- Each tenant can only have one reseller
);

CREATE INDEX IF NOT EXISTS idx_reseller_tenants_reseller ON reseller_tenants(reseller_id);
CREATE INDEX IF NOT EXISTS idx_reseller_tenants_tenant ON reseller_tenants(tenant_id);

ALTER TABLE reseller_tenants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Resellers can view their tenants"
  ON reseller_tenants FOR SELECT
  USING (
    reseller_id IN (SELECT id FROM reseller_accounts WHERE user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin')
  );

CREATE POLICY "Resellers can manage their tenants"
  ON reseller_tenants FOR ALL
  USING (
    reseller_id IN (SELECT id FROM reseller_accounts WHERE user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin')
  );

-- ============================================================================
-- 3. LICENSE KEYS
-- ============================================================================

CREATE TABLE IF NOT EXISTS licenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- License code (unique, formatted like XXXX-XXXX-XXXX-XXXX)
  code TEXT NOT NULL UNIQUE,

  -- Creator
  reseller_id UUID REFERENCES reseller_accounts(id) ON DELETE SET NULL,
  created_by UUID NOT NULL REFERENCES auth.users(id),

  -- License configuration
  license_type TEXT DEFAULT 'standard' CHECK (license_type IN ('trial', 'standard', 'pro', 'enterprise')),
  plan_level TEXT DEFAULT 'starter' CHECK (plan_level IN ('starter', 'pro', 'enterprise')),
  max_screens INTEGER DEFAULT 5,
  duration_days INTEGER DEFAULT 365, -- License validity

  -- Status
  status TEXT DEFAULT 'available' CHECK (status IN ('available', 'reserved', 'activated', 'expired', 'revoked')),

  -- Redemption info
  redeemed_by UUID REFERENCES profiles(id),
  redeemed_at TIMESTAMPTZ,
  tenant_id UUID REFERENCES profiles(id),

  -- Validity
  expires_at TIMESTAMPTZ,
  activated_at TIMESTAMPTZ,

  -- Metadata
  notes TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_licenses_code ON licenses(code);
CREATE INDEX IF NOT EXISTS idx_licenses_reseller ON licenses(reseller_id);
CREATE INDEX IF NOT EXISTS idx_licenses_status ON licenses(status);
CREATE INDEX IF NOT EXISTS idx_licenses_tenant ON licenses(tenant_id) WHERE tenant_id IS NOT NULL;

ALTER TABLE licenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Resellers can view their licenses"
  ON licenses FOR SELECT
  USING (
    reseller_id IN (SELECT id FROM reseller_accounts WHERE user_id = auth.uid())
    OR created_by = auth.uid()
    OR redeemed_by = auth.uid()
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin')
  );

CREATE POLICY "Resellers can create licenses"
  ON licenses FOR INSERT
  WITH CHECK (
    reseller_id IN (SELECT id FROM reseller_accounts WHERE user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin')
  );

-- ============================================================================
-- 4. COMMISSION EVENTS
-- ============================================================================

CREATE TABLE IF NOT EXISTS commission_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reseller_id UUID NOT NULL REFERENCES reseller_accounts(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Event type
  event_type TEXT NOT NULL CHECK (event_type IN (
    'subscription_created',
    'subscription_upgraded',
    'subscription_renewed',
    'screens_added',
    'addon_purchased',
    'refund'
  )),

  -- Amounts
  transaction_amount DECIMAL(10,2) NOT NULL,
  commission_percent DECIMAL(5,2) NOT NULL,
  commission_amount DECIMAL(10,2) NOT NULL,
  currency TEXT DEFAULT 'USD',

  -- Status
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'paid', 'cancelled')),

  -- Payment info
  payout_id TEXT, -- Stripe payout ID when paid
  paid_at TIMESTAMPTZ,

  -- Reference
  stripe_invoice_id TEXT,
  stripe_payment_intent_id TEXT,
  notes TEXT,

  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_commission_events_reseller ON commission_events(reseller_id);
CREATE INDEX IF NOT EXISTS idx_commission_events_status ON commission_events(status);
CREATE INDEX IF NOT EXISTS idx_commission_events_created ON commission_events(created_at);

ALTER TABLE commission_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Resellers can view their commissions"
  ON commission_events FOR SELECT
  USING (
    reseller_id IN (SELECT id FROM reseller_accounts WHERE user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin')
  );

-- ============================================================================
-- 5. BRAND VARIANTS (Multi-Brand Distribution)
-- ============================================================================

CREATE TABLE IF NOT EXISTS brand_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reseller_id UUID NOT NULL REFERENCES reseller_accounts(id) ON DELETE CASCADE,

  -- Brand identity
  name TEXT NOT NULL,
  slug TEXT NOT NULL,

  -- Branding
  logo_url TEXT,
  favicon_url TEXT,
  primary_color TEXT DEFAULT '#3B82F6',
  secondary_color TEXT DEFAULT '#1E40AF',

  -- Custom domain
  custom_domain TEXT,
  domain_verified BOOLEAN DEFAULT false,

  -- Content overrides
  app_name TEXT,
  tagline TEXT,
  support_email TEXT,
  support_url TEXT,
  terms_url TEXT,
  privacy_url TEXT,

  -- Feature flags
  show_powered_by BOOLEAN DEFAULT true,
  custom_templates JSONB DEFAULT '[]'::jsonb,
  custom_help_topics JSONB DEFAULT '[]'::jsonb,

  -- Pricing configuration
  pricing_config JSONB DEFAULT '{
    "show_pricing": true,
    "custom_prices": null,
    "discount_percent": 0
  }'::jsonb,

  -- Status
  is_active BOOLEAN DEFAULT true,

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  UNIQUE(reseller_id, slug)
);

CREATE INDEX IF NOT EXISTS idx_brand_variants_reseller ON brand_variants(reseller_id);
CREATE INDEX IF NOT EXISTS idx_brand_variants_domain ON brand_variants(custom_domain) WHERE custom_domain IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_brand_variants_slug ON brand_variants(slug);

ALTER TABLE brand_variants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Resellers can manage their brand variants"
  ON brand_variants FOR ALL
  USING (
    reseller_id IN (SELECT id FROM reseller_accounts WHERE user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin')
  );

-- ============================================================================
-- 6. ADD RESELLER ROLE TO PROFILES
-- ============================================================================

-- Add reseller flag to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_reseller BOOLEAN DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS reseller_account_id UUID REFERENCES reseller_accounts(id);

-- ============================================================================
-- 7. LICENSE KEY GENERATION FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION generate_license_code()
RETURNS TEXT AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; -- Exclude confusing chars
  result TEXT := '';
  i INTEGER;
BEGIN
  FOR i IN 1..16 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
    IF i IN (4, 8, 12) THEN
      result := result || '-';
    END IF;
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 8. GENERATE LICENSE RPC
-- ============================================================================

CREATE OR REPLACE FUNCTION generate_license(
  p_reseller_id UUID,
  p_license_type TEXT DEFAULT 'standard',
  p_plan_level TEXT DEFAULT 'starter',
  p_max_screens INTEGER DEFAULT 5,
  p_duration_days INTEGER DEFAULT 365,
  p_quantity INTEGER DEFAULT 1,
  p_notes TEXT DEFAULT NULL
)
RETURNS TABLE (
  license_id UUID,
  license_code TEXT
) AS $$
DECLARE
  v_code TEXT;
  v_id UUID;
  i INTEGER;
BEGIN
  -- Verify caller is reseller owner or super_admin
  IF NOT EXISTS (
    SELECT 1 FROM reseller_accounts ra
    WHERE ra.id = p_reseller_id AND ra.user_id = auth.uid()
  ) AND NOT EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin'
  ) THEN
    RAISE EXCEPTION 'Unauthorized: Not reseller owner or super_admin';
  END IF;

  -- Check reseller is active
  IF NOT EXISTS (
    SELECT 1 FROM reseller_accounts WHERE id = p_reseller_id AND status = 'active'
  ) THEN
    RAISE EXCEPTION 'Reseller account is not active';
  END IF;

  FOR i IN 1..p_quantity LOOP
    -- Generate unique code
    LOOP
      v_code := generate_license_code();
      EXIT WHEN NOT EXISTS (SELECT 1 FROM licenses WHERE code = v_code);
    END LOOP;

    -- Insert license
    INSERT INTO licenses (
      code,
      reseller_id,
      created_by,
      license_type,
      plan_level,
      max_screens,
      duration_days,
      notes,
      status
    ) VALUES (
      v_code,
      p_reseller_id,
      auth.uid(),
      p_license_type,
      p_plan_level,
      p_max_screens,
      p_duration_days,
      p_notes,
      'available'
    )
    RETURNING id INTO v_id;

    license_id := v_id;
    license_code := v_code;
    RETURN NEXT;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 9. REDEEM LICENSE RPC
-- ============================================================================

CREATE OR REPLACE FUNCTION redeem_license(
  p_code TEXT,
  p_tenant_id UUID DEFAULT NULL -- If null, uses current user
)
RETURNS JSONB AS $$
DECLARE
  v_license RECORD;
  v_tenant_id UUID;
  v_expires_at TIMESTAMPTZ;
BEGIN
  -- Get license
  SELECT * INTO v_license
  FROM licenses
  WHERE code = upper(replace(p_code, '-', ''));

  -- Also try with dashes
  IF v_license IS NULL THEN
    SELECT * INTO v_license
    FROM licenses
    WHERE code = upper(p_code);
  END IF;

  IF v_license IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid license code');
  END IF;

  IF v_license.status != 'available' THEN
    RETURN jsonb_build_object('success', false, 'error', 'License already used or expired');
  END IF;

  -- Determine tenant
  v_tenant_id := COALESCE(p_tenant_id, auth.uid());

  -- Calculate expiry
  v_expires_at := now() + (v_license.duration_days || ' days')::interval;

  -- Update license
  UPDATE licenses SET
    status = 'activated',
    redeemed_by = auth.uid(),
    redeemed_at = now(),
    tenant_id = v_tenant_id,
    activated_at = now(),
    expires_at = v_expires_at,
    updated_at = now()
  WHERE id = v_license.id;

  -- Update tenant subscription
  UPDATE profiles SET
    subscription_tier = v_license.plan_level,
    subscription_status = 'active',
    updated_at = now()
  WHERE id = v_tenant_id;

  -- Link tenant to reseller if not already
  IF v_license.reseller_id IS NOT NULL THEN
    INSERT INTO reseller_tenants (reseller_id, tenant_id, license_id, status)
    VALUES (v_license.reseller_id, v_tenant_id, v_license.id, 'active')
    ON CONFLICT (tenant_id) DO UPDATE SET
      license_id = v_license.id,
      status = 'active';
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'license_id', v_license.id,
    'plan_level', v_license.plan_level,
    'max_screens', v_license.max_screens,
    'expires_at', v_expires_at
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 10. RESELLER STATS RPC
-- ============================================================================

CREATE OR REPLACE FUNCTION get_reseller_portfolio_stats(p_reseller_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_stats JSONB;
BEGIN
  -- Verify access
  IF NOT EXISTS (
    SELECT 1 FROM reseller_accounts ra
    WHERE ra.id = p_reseller_id AND ra.user_id = auth.uid()
  ) AND NOT EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin'
  ) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  SELECT jsonb_build_object(
    'total_tenants', (
      SELECT COUNT(*) FROM reseller_tenants
      WHERE reseller_id = p_reseller_id AND status = 'active'
    ),
    'total_screens', (
      SELECT COUNT(*) FROM tv_devices td
      JOIN reseller_tenants rt ON rt.tenant_id = td.owner_id
      WHERE rt.reseller_id = p_reseller_id AND rt.status = 'active'
    ),
    'licenses_available', (
      SELECT COUNT(*) FROM licenses
      WHERE reseller_id = p_reseller_id AND status = 'available'
    ),
    'licenses_activated', (
      SELECT COUNT(*) FROM licenses
      WHERE reseller_id = p_reseller_id AND status = 'activated'
    ),
    'revenue_this_month', (
      SELECT COALESCE(SUM(transaction_amount), 0)
      FROM commission_events
      WHERE reseller_id = p_reseller_id
        AND created_at >= date_trunc('month', now())
    ),
    'commission_this_month', (
      SELECT COALESCE(SUM(commission_amount), 0)
      FROM commission_events
      WHERE reseller_id = p_reseller_id
        AND created_at >= date_trunc('month', now())
    ),
    'pending_commission', (
      SELECT COALESCE(SUM(commission_amount), 0)
      FROM commission_events
      WHERE reseller_id = p_reseller_id AND status = 'pending'
    ),
    'tenants_by_plan', (
      SELECT jsonb_object_agg(
        COALESCE(p.subscription_tier, 'free'),
        cnt
      )
      FROM (
        SELECT subscription_tier, COUNT(*) as cnt
        FROM profiles p
        JOIN reseller_tenants rt ON rt.tenant_id = p.id
        WHERE rt.reseller_id = p_reseller_id AND rt.status = 'active'
        GROUP BY subscription_tier
      ) sub
    )
  ) INTO v_stats;

  RETURN v_stats;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 11. RESELLER EARNINGS RPC
-- ============================================================================

CREATE OR REPLACE FUNCTION get_reseller_earnings(
  p_reseller_id UUID,
  p_start_date DATE DEFAULT NULL,
  p_end_date DATE DEFAULT NULL
)
RETURNS TABLE (
  month TEXT,
  revenue DECIMAL,
  commission DECIMAL,
  events_count BIGINT
) AS $$
BEGIN
  -- Verify access
  IF NOT EXISTS (
    SELECT 1 FROM reseller_accounts ra
    WHERE ra.id = p_reseller_id AND ra.user_id = auth.uid()
  ) AND NOT EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin'
  ) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  RETURN QUERY
  SELECT
    to_char(ce.created_at, 'YYYY-MM') as month,
    SUM(ce.transaction_amount) as revenue,
    SUM(ce.commission_amount) as commission,
    COUNT(*) as events_count
  FROM commission_events ce
  WHERE ce.reseller_id = p_reseller_id
    AND (p_start_date IS NULL OR ce.created_at >= p_start_date)
    AND (p_end_date IS NULL OR ce.created_at <= p_end_date)
  GROUP BY to_char(ce.created_at, 'YYYY-MM')
  ORDER BY month DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 12. CREATE TENANT FOR RESELLER RPC
-- ============================================================================

CREATE OR REPLACE FUNCTION create_reseller_tenant(
  p_reseller_id UUID,
  p_email TEXT,
  p_business_name TEXT,
  p_plan_level TEXT DEFAULT 'starter',
  p_license_code TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_tenant_id UUID;
  v_license RECORD;
BEGIN
  -- Verify reseller access
  IF NOT EXISTS (
    SELECT 1 FROM reseller_accounts ra
    WHERE ra.id = p_reseller_id AND ra.user_id = auth.uid() AND ra.status = 'active'
  ) AND NOT EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin'
  ) THEN
    RAISE EXCEPTION 'Unauthorized or reseller not active';
  END IF;

  -- Check tenant limit
  IF (
    SELECT COUNT(*) FROM reseller_tenants WHERE reseller_id = p_reseller_id AND status = 'active'
  ) >= (
    SELECT max_tenants FROM reseller_accounts WHERE id = p_reseller_id
  ) THEN
    RAISE EXCEPTION 'Tenant limit reached';
  END IF;

  -- If license code provided, validate it
  IF p_license_code IS NOT NULL THEN
    SELECT * INTO v_license FROM licenses
    WHERE code = upper(p_license_code) AND reseller_id = p_reseller_id AND status = 'available';

    IF v_license IS NULL THEN
      RAISE EXCEPTION 'Invalid or unavailable license code';
    END IF;
  END IF;

  -- Note: Actual user creation must be done via Supabase Auth Admin API
  -- This function returns instructions for the caller

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Tenant invitation ready. Create user via Auth API then call link_reseller_tenant.',
    'email', p_email,
    'business_name', p_business_name,
    'plan_level', COALESCE(v_license.plan_level, p_plan_level),
    'license_id', v_license.id,
    'reseller_id', p_reseller_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 13. LINK TENANT TO RESELLER RPC
-- ============================================================================

CREATE OR REPLACE FUNCTION link_reseller_tenant(
  p_reseller_id UUID,
  p_tenant_id UUID,
  p_license_id UUID DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
  -- Verify reseller access
  IF NOT EXISTS (
    SELECT 1 FROM reseller_accounts ra
    WHERE ra.id = p_reseller_id AND ra.user_id = auth.uid()
  ) AND NOT EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin'
  ) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  -- Create or update relationship
  INSERT INTO reseller_tenants (reseller_id, tenant_id, license_id, status)
  VALUES (p_reseller_id, p_tenant_id, p_license_id, 'active')
  ON CONFLICT (tenant_id) DO UPDATE SET
    reseller_id = p_reseller_id,
    license_id = COALESCE(p_license_id, reseller_tenants.license_id),
    status = 'active',
    transferred_at = CASE
      WHEN reseller_tenants.reseller_id != p_reseller_id
      THEN now()
      ELSE reseller_tenants.transferred_at
    END,
    transferred_from = CASE
      WHEN reseller_tenants.reseller_id != p_reseller_id
      THEN reseller_tenants.reseller_id
      ELSE reseller_tenants.transferred_from
    END;

  -- If license provided, mark as activated
  IF p_license_id IS NOT NULL THEN
    UPDATE licenses SET
      status = 'activated',
      tenant_id = p_tenant_id,
      redeemed_by = auth.uid(),
      redeemed_at = now(),
      activated_at = now(),
      expires_at = now() + (duration_days || ' days')::interval
    WHERE id = p_license_id;
  END IF;

  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 14. LIST RESELLER TENANTS RPC
-- ============================================================================

CREATE OR REPLACE FUNCTION list_reseller_tenants(
  p_reseller_id UUID,
  p_status TEXT DEFAULT NULL,
  p_limit INTEGER DEFAULT 50,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  tenant_id UUID,
  email TEXT,
  business_name TEXT,
  full_name TEXT,
  subscription_tier TEXT,
  subscription_status TEXT,
  screens_count BIGINT,
  license_code TEXT,
  status TEXT,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  -- Verify access
  IF NOT EXISTS (
    SELECT 1 FROM reseller_accounts ra
    WHERE ra.id = p_reseller_id AND ra.user_id = auth.uid()
  ) AND NOT EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin'
  ) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  RETURN QUERY
  SELECT
    p.id as tenant_id,
    au.email,
    p.business_name,
    p.full_name,
    p.subscription_tier,
    p.subscription_status,
    (SELECT COUNT(*) FROM tv_devices WHERE owner_id = p.id) as screens_count,
    l.code as license_code,
    rt.status,
    rt.created_at
  FROM reseller_tenants rt
  JOIN profiles p ON p.id = rt.tenant_id
  JOIN auth.users au ON au.id = p.id
  LEFT JOIN licenses l ON l.id = rt.license_id
  WHERE rt.reseller_id = p_reseller_id
    AND (p_status IS NULL OR rt.status = p_status)
  ORDER BY rt.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 15. UPDATED_AT TRIGGERS
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS reseller_accounts_updated_at ON reseller_accounts;
CREATE TRIGGER reseller_accounts_updated_at
  BEFORE UPDATE ON reseller_accounts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS brand_variants_updated_at ON brand_variants;
CREATE TRIGGER brand_variants_updated_at
  BEFORE UPDATE ON brand_variants
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS licenses_updated_at ON licenses;
CREATE TRIGGER licenses_updated_at
  BEFORE UPDATE ON licenses
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();
