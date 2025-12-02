-- ============================================
-- Migration: 033_mobile_player_pairing.sql
-- Description: Enhanced mobile player pairing, commands, and telemetry
-- ============================================

-- ============================================
-- 1. Extend tv_devices table for mobile players
-- ============================================

-- Add api_key for authenticated player requests
ALTER TABLE public.tv_devices
ADD COLUMN IF NOT EXISTS api_key TEXT UNIQUE;

-- Add otp_expires_at for expiring pairing codes
ALTER TABLE public.tv_devices
ADD COLUMN IF NOT EXISTS otp_expires_at TIMESTAMPTZ;

-- Add extended device info
ALTER TABLE public.tv_devices
ADD COLUMN IF NOT EXISTS platform TEXT; -- 'android', 'ios', 'web', 'webos', 'tizen'

ALTER TABLE public.tv_devices
ADD COLUMN IF NOT EXISTS device_brand TEXT;

ALTER TABLE public.tv_devices
ADD COLUMN IF NOT EXISTS screen_width INTEGER;

ALTER TABLE public.tv_devices
ADD COLUMN IF NOT EXISTS screen_height INTEGER;

ALTER TABLE public.tv_devices
ADD COLUMN IF NOT EXISTS timezone TEXT;

ALTER TABLE public.tv_devices
ADD COLUMN IF NOT EXISTS locale TEXT;

-- Index for api_key lookups
CREATE INDEX IF NOT EXISTS idx_tv_devices_api_key ON public.tv_devices(api_key);

-- Index for otp lookups (with expiration filtering)
CREATE INDEX IF NOT EXISTS idx_tv_devices_otp_expires ON public.tv_devices(otp_code, otp_expires_at) WHERE otp_code IS NOT NULL;

-- ============================================
-- 2. Screen Commands Table
-- For queueing commands to be sent to screens
-- ============================================

CREATE TABLE IF NOT EXISTS public.screen_commands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  screen_id UUID NOT NULL REFERENCES public.tv_devices(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,

  -- Command details
  command_type TEXT NOT NULL CHECK (command_type IN (
    'reload', 'refresh', 'clear_cache', 'unpair', 'screenshot',
    'play_content', 'stop_content', 'set_volume', 'reboot', 'custom'
  )),
  payload JSONB DEFAULT '{}'::jsonb,

  -- Status tracking
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'delivered', 'acknowledged', 'failed', 'expired')),
  delivered_at TIMESTAMPTZ,
  acknowledged_at TIMESTAMPTZ,
  result TEXT,
  error TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '1 hour')
);

-- Indexes for efficient command polling
CREATE INDEX IF NOT EXISTS idx_screen_commands_screen_pending ON public.screen_commands(screen_id, status) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_screen_commands_created_at ON public.screen_commands(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_screen_commands_owner_id ON public.screen_commands(owner_id);

-- Enable RLS
ALTER TABLE public.screen_commands ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "screen_commands_select_policy"
ON public.screen_commands FOR SELECT
USING (
  owner_id = auth.uid()
  OR is_super_admin()
  OR (is_admin() AND owner_id IN (SELECT client_id FROM get_my_client_ids()))
);

CREATE POLICY "screen_commands_insert_policy"
ON public.screen_commands FOR INSERT
WITH CHECK (
  owner_id = auth.uid()
  OR is_super_admin()
  OR (is_admin() AND owner_id IN (SELECT client_id FROM get_my_client_ids()))
);

CREATE POLICY "screen_commands_update_policy"
ON public.screen_commands FOR UPDATE
USING (
  owner_id = auth.uid()
  OR is_super_admin()
  OR (is_admin() AND owner_id IN (SELECT client_id FROM get_my_client_ids()))
);

CREATE POLICY "screen_commands_delete_policy"
ON public.screen_commands FOR DELETE
USING (
  owner_id = auth.uid()
  OR is_super_admin()
  OR (is_admin() AND owner_id IN (SELECT client_id FROM get_my_client_ids()))
);

COMMENT ON TABLE public.screen_commands IS 'Commands queued for delivery to screens';

-- ============================================
-- 3. Screen Telemetry Table
-- For storing telemetry events from screens
-- ============================================

CREATE TABLE IF NOT EXISTS public.screen_telemetry (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  screen_id UUID NOT NULL REFERENCES public.tv_devices(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,

  -- Event details
  event_type TEXT NOT NULL,
  event_data JSONB DEFAULT '{}'::jsonb,

  -- Device state at time of event
  app_version TEXT,
  os_version TEXT,
  network_type TEXT,

  -- Timestamp (from device)
  event_timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for telemetry queries
CREATE INDEX IF NOT EXISTS idx_screen_telemetry_screen_id ON public.screen_telemetry(screen_id);
CREATE INDEX IF NOT EXISTS idx_screen_telemetry_event_type ON public.screen_telemetry(event_type);
CREATE INDEX IF NOT EXISTS idx_screen_telemetry_timestamp ON public.screen_telemetry(event_timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_screen_telemetry_owner_id ON public.screen_telemetry(owner_id);

-- Enable RLS
ALTER TABLE public.screen_telemetry ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "screen_telemetry_select_policy"
ON public.screen_telemetry FOR SELECT
USING (
  owner_id = auth.uid()
  OR is_super_admin()
  OR (is_admin() AND owner_id IN (SELECT client_id FROM get_my_client_ids()))
);

CREATE POLICY "screen_telemetry_insert_policy"
ON public.screen_telemetry FOR INSERT
WITH CHECK (true); -- Allow inserts from API (validated by API key)

COMMENT ON TABLE public.screen_telemetry IS 'Telemetry events from screens for analytics';

-- ============================================
-- 4. Generate Pairing Code Function
-- Creates a unique 6-character pairing code
-- ============================================

CREATE OR REPLACE FUNCTION public.generate_pairing_code(p_screen_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_code TEXT;
  v_chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; -- No I, O, 0, 1 to avoid confusion
  v_owner_id UUID;
  v_existing UUID;
BEGIN
  -- Verify screen exists and get owner
  SELECT owner_id INTO v_owner_id
  FROM tv_devices
  WHERE id = p_screen_id;

  IF v_owner_id IS NULL THEN
    RAISE EXCEPTION 'Screen not found';
  END IF;

  -- Check permissions
  IF v_owner_id != auth.uid() AND NOT is_super_admin() AND NOT is_admin() THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  -- Generate unique code (try up to 10 times)
  FOR i IN 1..10 LOOP
    v_code := '';
    FOR j IN 1..6 LOOP
      v_code := v_code || substr(v_chars, floor(random() * length(v_chars) + 1)::int, 1);
    END LOOP;

    -- Check if code already exists
    SELECT id INTO v_existing
    FROM tv_devices
    WHERE otp_code = v_code AND otp_expires_at > NOW();

    IF v_existing IS NULL THEN
      EXIT;
    END IF;
  END LOOP;

  -- Update screen with new code (expires in 15 minutes)
  UPDATE tv_devices
  SET
    otp_code = v_code,
    otp_expires_at = NOW() + INTERVAL '15 minutes',
    updated_at = NOW()
  WHERE id = p_screen_id;

  RETURN v_code;
END;
$$;

GRANT EXECUTE ON FUNCTION public.generate_pairing_code(UUID) TO authenticated;

COMMENT ON FUNCTION public.generate_pairing_code IS 'Generates a 6-character pairing code for a screen';

-- ============================================
-- 5. Claim Pairing Code Function
-- Claims a pairing code and returns credentials
-- ============================================

CREATE OR REPLACE FUNCTION public.claim_pairing_code(
  p_code TEXT,
  p_device_info JSONB DEFAULT '{}'::jsonb
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_screen RECORD;
  v_api_key TEXT;
  v_listing RECORD;
BEGIN
  -- Find screen with valid code
  SELECT td.*, l.owner_id AS listing_owner_id
  INTO v_screen
  FROM tv_devices td
  JOIN listings l ON l.id = td.listing_id
  WHERE td.otp_code = upper(p_code)
    AND td.otp_expires_at > NOW();

  IF v_screen.id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Invalid or expired pairing code'
    );
  END IF;

  -- Generate API key
  v_api_key := encode(gen_random_bytes(32), 'hex');

  -- Update screen with pairing info
  UPDATE tv_devices
  SET
    otp_code = NULL,
    otp_expires_at = NULL,
    api_key = v_api_key,
    is_paired = true,
    paired_at = NOW(),
    platform = p_device_info->>'platform',
    model = p_device_info->>'model',
    device_brand = p_device_info->>'brand',
    os_version = p_device_info->>'osVersion',
    app_version = p_device_info->>'appVersion',
    screen_width = (p_device_info->>'screenWidth')::INTEGER,
    screen_height = (p_device_info->>'screenHeight')::INTEGER,
    timezone = p_device_info->>'timezone',
    locale = p_device_info->>'locale',
    is_online = true,
    last_seen_at = NOW(),
    updated_at = NOW()
  WHERE id = v_screen.id;

  -- Return credentials
  RETURN jsonb_build_object(
    'success', true,
    'screenId', v_screen.id,
    'apiKey', v_api_key,
    'tenantId', v_screen.listing_owner_id,
    'screenName', v_screen.name,
    'listingId', v_screen.listing_id
  );
END;
$$;

-- This function is public (no auth required) as it's called by unregistered devices
GRANT EXECUTE ON FUNCTION public.claim_pairing_code(TEXT, JSONB) TO anon;
GRANT EXECUTE ON FUNCTION public.claim_pairing_code(TEXT, JSONB) TO authenticated;

COMMENT ON FUNCTION public.claim_pairing_code IS 'Claims a pairing code and returns API credentials for the screen';

-- ============================================
-- 6. Validate Screen API Key Function
-- Validates an API key and returns screen info
-- ============================================

CREATE OR REPLACE FUNCTION public.validate_screen_api_key(
  p_screen_id UUID,
  p_api_key TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_screen RECORD;
BEGIN
  SELECT td.*, l.owner_id AS listing_owner_id
  INTO v_screen
  FROM tv_devices td
  JOIN listings l ON l.id = td.listing_id
  WHERE td.id = p_screen_id
    AND td.api_key = p_api_key
    AND td.is_paired = true;

  IF v_screen.id IS NULL THEN
    RETURN jsonb_build_object('valid', false);
  END IF;

  RETURN jsonb_build_object(
    'valid', true,
    'screenId', v_screen.id,
    'ownerId', v_screen.listing_owner_id,
    'listingId', v_screen.listing_id
  );
END;
$$;

-- Allow anon for API validation
GRANT EXECUTE ON FUNCTION public.validate_screen_api_key(UUID, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.validate_screen_api_key(UUID, TEXT) TO authenticated;

COMMENT ON FUNCTION public.validate_screen_api_key IS 'Validates screen API key and returns screen info';

-- ============================================
-- 7. Screen Heartbeat with Commands Function
-- Processes heartbeat and returns pending commands
-- ============================================

CREATE OR REPLACE FUNCTION public.screen_heartbeat(
  p_screen_id UUID,
  p_api_key TEXT,
  p_device_info JSONB DEFAULT '{}'::jsonb
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_screen RECORD;
  v_commands JSONB;
BEGIN
  -- Validate API key
  SELECT td.*, l.owner_id AS listing_owner_id
  INTO v_screen
  FROM tv_devices td
  JOIN listings l ON l.id = td.listing_id
  WHERE td.id = p_screen_id
    AND td.api_key = p_api_key
    AND td.is_paired = true;

  IF v_screen.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid credentials');
  END IF;

  -- Update device info and last seen
  UPDATE tv_devices
  SET
    is_online = true,
    last_seen_at = NOW(),
    app_version = COALESCE(p_device_info->>'appVersion', app_version),
    os_version = COALESCE(p_device_info->>'osVersion', os_version),
    updated_at = NOW()
  WHERE id = p_screen_id;

  -- Get pending commands (mark as delivered)
  WITH pending AS (
    SELECT id, command_type, payload
    FROM screen_commands
    WHERE screen_id = p_screen_id
      AND status = 'pending'
      AND (expires_at IS NULL OR expires_at > NOW())
    ORDER BY created_at ASC
    LIMIT 10
  ),
  marked AS (
    UPDATE screen_commands
    SET status = 'delivered', delivered_at = NOW()
    WHERE id IN (SELECT id FROM pending)
    RETURNING id, command_type, payload
  )
  SELECT jsonb_agg(jsonb_build_object(
    'id', m.id,
    'type', m.command_type,
    'payload', m.payload
  ))
  INTO v_commands
  FROM marked m;

  RETURN jsonb_build_object(
    'success', true,
    'commands', COALESCE(v_commands, '[]'::jsonb)
  );
END;
$$;

-- Allow anon for heartbeat (validated by API key)
GRANT EXECUTE ON FUNCTION public.screen_heartbeat(UUID, TEXT, JSONB) TO anon;
GRANT EXECUTE ON FUNCTION public.screen_heartbeat(UUID, TEXT, JSONB) TO authenticated;

COMMENT ON FUNCTION public.screen_heartbeat IS 'Screen heartbeat that updates status and returns pending commands';

-- ============================================
-- 8. Acknowledge Command Function
-- ============================================

CREATE OR REPLACE FUNCTION public.acknowledge_command(
  p_screen_id UUID,
  p_api_key TEXT,
  p_command_id UUID,
  p_success BOOLEAN,
  p_result TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_valid JSONB;
BEGIN
  -- Validate API key
  v_valid := validate_screen_api_key(p_screen_id, p_api_key);

  IF NOT (v_valid->>'valid')::BOOLEAN THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid credentials');
  END IF;

  -- Update command
  UPDATE screen_commands
  SET
    status = CASE WHEN p_success THEN 'acknowledged' ELSE 'failed' END,
    acknowledged_at = NOW(),
    result = p_result,
    error = CASE WHEN NOT p_success THEN p_result ELSE NULL END
  WHERE id = p_command_id
    AND screen_id = p_screen_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Command not found');
  END IF;

  RETURN jsonb_build_object('success', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.acknowledge_command(UUID, TEXT, UUID, BOOLEAN, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.acknowledge_command(UUID, TEXT, UUID, BOOLEAN, TEXT) TO authenticated;

COMMENT ON FUNCTION public.acknowledge_command IS 'Acknowledges a command execution result';

-- ============================================
-- 9. Upload Telemetry Function
-- ============================================

CREATE OR REPLACE FUNCTION public.upload_screen_telemetry(
  p_screen_id UUID,
  p_api_key TEXT,
  p_events JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_valid JSONB;
  v_owner_id UUID;
  v_event JSONB;
  v_count INTEGER := 0;
BEGIN
  -- Validate API key
  v_valid := validate_screen_api_key(p_screen_id, p_api_key);

  IF NOT (v_valid->>'valid')::BOOLEAN THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid credentials');
  END IF;

  v_owner_id := (v_valid->>'ownerId')::UUID;

  -- Insert telemetry events
  FOR v_event IN SELECT * FROM jsonb_array_elements(p_events)
  LOOP
    INSERT INTO screen_telemetry (
      screen_id, owner_id, event_type, event_data,
      app_version, os_version, network_type, event_timestamp
    ) VALUES (
      p_screen_id,
      v_owner_id,
      v_event->>'event',
      v_event - 'event' - 'timestamp',
      v_event->>'appVersion',
      v_event->>'osVersion',
      v_event->>'networkType',
      COALESCE((v_event->>'timestamp')::TIMESTAMPTZ, NOW())
    );
    v_count := v_count + 1;
  END LOOP;

  RETURN jsonb_build_object('success', true, 'count', v_count);
END;
$$;

GRANT EXECUTE ON FUNCTION public.upload_screen_telemetry(UUID, TEXT, JSONB) TO anon;
GRANT EXECUTE ON FUNCTION public.upload_screen_telemetry(UUID, TEXT, JSONB) TO authenticated;

COMMENT ON FUNCTION public.upload_screen_telemetry IS 'Uploads telemetry events from a screen';

-- ============================================
-- 10. Send Command to Screen Function
-- ============================================

CREATE OR REPLACE FUNCTION public.send_screen_command(
  p_screen_id UUID,
  p_command_type TEXT,
  p_payload JSONB DEFAULT '{}'::jsonb
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_screen RECORD;
  v_command_id UUID;
BEGIN
  -- Get screen and verify ownership
  SELECT td.*, l.owner_id AS listing_owner_id
  INTO v_screen
  FROM tv_devices td
  JOIN listings l ON l.id = td.listing_id
  WHERE td.id = p_screen_id;

  IF v_screen.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Screen not found');
  END IF;

  -- Check permissions
  IF v_screen.listing_owner_id != auth.uid() AND NOT is_super_admin() AND NOT is_admin() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Permission denied');
  END IF;

  -- Insert command
  INSERT INTO screen_commands (screen_id, owner_id, command_type, payload)
  VALUES (p_screen_id, v_screen.listing_owner_id, p_command_type, p_payload)
  RETURNING id INTO v_command_id;

  RETURN jsonb_build_object('success', true, 'commandId', v_command_id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.send_screen_command(UUID, TEXT, JSONB) TO authenticated;

COMMENT ON FUNCTION public.send_screen_command IS 'Sends a command to a screen';
