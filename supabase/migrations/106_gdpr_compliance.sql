-- Migration: GDPR Compliance Features
-- Created: 2026-01-21
-- Description: Tables for consent tracking, data export, and account deletion

-- ============================================
-- CONSENT RECORDS
-- ============================================

CREATE TABLE IF NOT EXISTS consent_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  consent_version TEXT NOT NULL,
  necessary BOOLEAN NOT NULL DEFAULT true,
  analytics BOOLEAN NOT NULL DEFAULT false,
  marketing BOOLEAN NOT NULL DEFAULT false,
  preferences BOOLEAN NOT NULL DEFAULT false,
  ip_address INET,
  user_agent TEXT,
  withdrawn BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_consent_records_user_id ON consent_records(user_id);
CREATE INDEX IF NOT EXISTS idx_consent_records_created_at ON consent_records(created_at DESC);

-- RLS
ALTER TABLE consent_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own consent history"
  ON consent_records FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own consent"
  ON consent_records FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Anonymous can insert consent"
  ON consent_records FOR INSERT
  TO anon
  WITH CHECK (user_id IS NULL);

-- ============================================
-- DATA EXPORT REQUESTS
-- ============================================

CREATE TABLE IF NOT EXISTS data_export_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'expired')),
  format TEXT NOT NULL DEFAULT 'json' CHECK (format IN ('json', 'csv')),
  file_url TEXT,
  file_size_bytes BIGINT,
  requested_at TIMESTAMPTZ DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_data_export_user_id ON data_export_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_data_export_status ON data_export_requests(status);
CREATE INDEX IF NOT EXISTS idx_data_export_expires ON data_export_requests(expires_at) WHERE status = 'completed';

-- RLS
ALTER TABLE data_export_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own export requests"
  ON data_export_requests FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can create own export requests"
  ON data_export_requests FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- ============================================
-- ACCOUNT DELETION REQUESTS
-- ============================================

CREATE TABLE IF NOT EXISTS account_deletion_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'scheduled', 'processing', 'completed', 'cancelled')),
  reason TEXT,
  feedback TEXT,
  scheduled_deletion_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_deletion_user_id ON account_deletion_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_deletion_status ON account_deletion_requests(status);
CREATE INDEX IF NOT EXISTS idx_deletion_scheduled ON account_deletion_requests(scheduled_deletion_at)
  WHERE status = 'scheduled';

-- RLS
ALTER TABLE account_deletion_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own deletion requests"
  ON account_deletion_requests FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can create own deletion requests"
  ON account_deletion_requests FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can cancel own deletion requests"
  ON account_deletion_requests FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ============================================
-- FUNCTIONS
-- ============================================

-- Request data export
CREATE OR REPLACE FUNCTION request_data_export(p_format TEXT DEFAULT 'json')
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_request_id UUID;
  v_pending_count INT;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Check for existing pending/processing requests
  SELECT COUNT(*) INTO v_pending_count
  FROM data_export_requests
  WHERE user_id = v_user_id
    AND status IN ('pending', 'processing');

  IF v_pending_count > 0 THEN
    RAISE EXCEPTION 'You already have a pending export request';
  END IF;

  -- Create export request
  INSERT INTO data_export_requests (user_id, format, status)
  VALUES (v_user_id, p_format, 'pending')
  RETURNING id INTO v_request_id;

  RETURN v_request_id;
END;
$$;

-- Request account deletion
CREATE OR REPLACE FUNCTION request_account_deletion(
  p_reason TEXT DEFAULT NULL,
  p_feedback TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_user_email TEXT;
  v_request_id UUID;
  v_existing_request UUID;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Get user email
  SELECT email INTO v_user_email
  FROM auth.users
  WHERE id = v_user_id;

  -- Check for existing pending/scheduled deletion
  SELECT id INTO v_existing_request
  FROM account_deletion_requests
  WHERE user_id = v_user_id
    AND status IN ('pending', 'scheduled');

  IF v_existing_request IS NOT NULL THEN
    RAISE EXCEPTION 'You already have a pending deletion request';
  END IF;

  -- Create deletion request with 30-day grace period
  INSERT INTO account_deletion_requests (
    user_id,
    email,
    status,
    reason,
    feedback,
    scheduled_deletion_at
  )
  VALUES (
    v_user_id,
    v_user_email,
    'scheduled',
    p_reason,
    p_feedback,
    NOW() + INTERVAL '30 days'
  )
  RETURNING id INTO v_request_id;

  RETURN v_request_id;
END;
$$;

-- Cancel account deletion
CREATE OR REPLACE FUNCTION cancel_account_deletion()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_updated INT;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  UPDATE account_deletion_requests
  SET status = 'cancelled',
      cancelled_at = NOW()
  WHERE user_id = v_user_id
    AND status IN ('pending', 'scheduled');

  GET DIAGNOSTICS v_updated = ROW_COUNT;

  RETURN v_updated > 0;
END;
$$;

-- Get deletion status
CREATE OR REPLACE FUNCTION get_deletion_status()
RETURNS TABLE (
  id UUID,
  status TEXT,
  scheduled_deletion_at TIMESTAMPTZ,
  days_remaining INT,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    adr.id,
    adr.status,
    adr.scheduled_deletion_at,
    EXTRACT(DAY FROM adr.scheduled_deletion_at - NOW())::INT as days_remaining,
    adr.created_at
  FROM account_deletion_requests adr
  WHERE adr.user_id = auth.uid()
    AND adr.status IN ('pending', 'scheduled')
  ORDER BY adr.created_at DESC
  LIMIT 1;
END;
$$;

-- Cleanup expired exports
CREATE OR REPLACE FUNCTION cleanup_expired_exports()
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count INT;
BEGIN
  UPDATE data_export_requests
  SET status = 'expired',
      file_url = NULL
  WHERE status = 'completed'
    AND expires_at < NOW();

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION request_data_export TO authenticated;
GRANT EXECUTE ON FUNCTION request_account_deletion TO authenticated;
GRANT EXECUTE ON FUNCTION cancel_account_deletion TO authenticated;
GRANT EXECUTE ON FUNCTION get_deletion_status TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_expired_exports TO service_role;

-- Comments
COMMENT ON TABLE consent_records IS 'GDPR cookie consent audit trail';
COMMENT ON TABLE data_export_requests IS 'User data export requests (GDPR Article 20)';
COMMENT ON TABLE account_deletion_requests IS 'Account deletion requests with 30-day grace period (GDPR Article 17)';
