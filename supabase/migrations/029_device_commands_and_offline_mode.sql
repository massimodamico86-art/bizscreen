-- Migration: Device Commands & Offline Mode Support
-- Phase 17: Device Lockdown, Offline Mode & Auto-Recovery
-- Provides device command system for remote control of player devices

-- ============================================
-- 1. DEVICE COMMANDS TABLE
-- ============================================
-- Stores commands sent to devices (reboot, reload, reset, clear_cache)

CREATE TABLE IF NOT EXISTS device_commands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id UUID NOT NULL REFERENCES tv_devices(id) ON DELETE CASCADE,
  command_type TEXT NOT NULL CHECK (command_type IN ('reboot', 'reload', 'reset', 'clear_cache')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'acknowledged', 'executed', 'failed')),
  payload JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  acknowledged_at TIMESTAMPTZ,
  executed_at TIMESTAMPTZ,
  error_message TEXT,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_device_commands_device_id ON device_commands(device_id);
CREATE INDEX IF NOT EXISTS idx_device_commands_status ON device_commands(status);
CREATE INDEX IF NOT EXISTS idx_device_commands_device_pending ON device_commands(device_id, status) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_device_commands_owner_id ON device_commands(owner_id);
CREATE INDEX IF NOT EXISTS idx_device_commands_created_at ON device_commands(created_at DESC);

-- ============================================
-- 2. ROW LEVEL SECURITY FOR DEVICE_COMMANDS
-- ============================================

ALTER TABLE device_commands ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own device commands
CREATE POLICY "Users can view own device commands"
  ON device_commands FOR SELECT
  USING (owner_id = auth.uid() OR is_admin() OR is_super_admin());

-- Policy: Users can insert commands for their own devices
CREATE POLICY "Users can insert own device commands"
  ON device_commands FOR INSERT
  WITH CHECK (owner_id = auth.uid() OR is_admin() OR is_super_admin());

-- Policy: Users can update their own device commands
CREATE POLICY "Users can update own device commands"
  ON device_commands FOR UPDATE
  USING (owner_id = auth.uid() OR is_admin() OR is_super_admin());

-- Policy: Users can delete their own device commands
CREATE POLICY "Users can delete own device commands"
  ON device_commands FOR DELETE
  USING (owner_id = auth.uid() OR is_admin() OR is_super_admin());

-- ============================================
-- 3. SEND DEVICE COMMAND RPC
-- ============================================
-- Sends a command to a specific device

CREATE OR REPLACE FUNCTION send_device_command(
  p_device_id UUID,
  p_command_type TEXT,
  p_payload JSONB DEFAULT '{}'::jsonb
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_device_owner_id UUID;
  v_command_id UUID;
  v_user_id UUID;
BEGIN
  v_user_id := auth.uid();

  -- Validate command type
  IF p_command_type NOT IN ('reboot', 'reload', 'reset', 'clear_cache') THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Invalid command type. Must be: reboot, reload, reset, or clear_cache'
    );
  END IF;

  -- Get device owner and verify access
  SELECT owner_id INTO v_device_owner_id
  FROM tv_devices
  WHERE id = p_device_id;

  IF v_device_owner_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Device not found'
    );
  END IF;

  -- Check tenant access
  IF NOT (
    v_device_owner_id = v_user_id OR
    is_super_admin() OR
    is_admin()
  ) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Access denied'
    );
  END IF;

  -- Insert the command
  INSERT INTO device_commands (device_id, command_type, payload, owner_id)
  VALUES (p_device_id, p_command_type, p_payload, v_device_owner_id)
  RETURNING id INTO v_command_id;

  RETURN jsonb_build_object(
    'success', true,
    'command_id', v_command_id,
    'device_id', p_device_id,
    'command_type', p_command_type
  );
END;
$$;

-- ============================================
-- 4. GET PENDING DEVICE COMMAND RPC
-- ============================================
-- Called by player to check for pending commands
-- Returns the oldest pending command and marks it as acknowledged

CREATE OR REPLACE FUNCTION get_pending_device_command(p_device_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_command RECORD;
BEGIN
  -- Get the oldest pending command for this device
  SELECT id, command_type, payload, created_at
  INTO v_command
  FROM device_commands
  WHERE device_id = p_device_id
    AND status = 'pending'
  ORDER BY created_at ASC
  LIMIT 1;

  -- No pending command
  IF v_command.id IS NULL THEN
    RETURN jsonb_build_object(
      'has_command', false
    );
  END IF;

  -- Mark as acknowledged
  UPDATE device_commands
  SET status = 'acknowledged',
      acknowledged_at = NOW()
  WHERE id = v_command.id;

  RETURN jsonb_build_object(
    'has_command', true,
    'command_id', v_command.id,
    'command_type', v_command.command_type,
    'payload', v_command.payload,
    'created_at', v_command.created_at
  );
END;
$$;

-- ============================================
-- 5. MARK COMMAND EXECUTED RPC
-- ============================================
-- Called by player to report command execution result

CREATE OR REPLACE FUNCTION mark_command_executed(
  p_command_id UUID,
  p_success BOOLEAN DEFAULT true,
  p_error_message TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE device_commands
  SET status = CASE WHEN p_success THEN 'executed' ELSE 'failed' END,
      executed_at = NOW(),
      error_message = p_error_message
  WHERE id = p_command_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Command not found'
    );
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'command_id', p_command_id
  );
END;
$$;

-- ============================================
-- 6. GET DEVICE COMMAND HISTORY RPC
-- ============================================
-- Returns command history for a device

CREATE OR REPLACE FUNCTION get_device_command_history(
  p_device_id UUID,
  p_limit INT DEFAULT 20
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_device_owner_id UUID;
  v_user_id UUID;
  v_commands JSONB;
BEGIN
  v_user_id := auth.uid();

  -- Get device owner and verify access
  SELECT owner_id INTO v_device_owner_id
  FROM tv_devices
  WHERE id = p_device_id;

  IF v_device_owner_id IS NULL THEN
    RETURN jsonb_build_object('error', 'Device not found');
  END IF;

  -- Check tenant access
  IF NOT (
    v_device_owner_id = v_user_id OR
    is_super_admin() OR
    is_admin()
  ) THEN
    RETURN jsonb_build_object('error', 'Access denied');
  END IF;

  -- Get command history
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'id', dc.id,
      'command_type', dc.command_type,
      'status', dc.status,
      'payload', dc.payload,
      'created_at', dc.created_at,
      'acknowledged_at', dc.acknowledged_at,
      'executed_at', dc.executed_at,
      'error_message', dc.error_message
    ) ORDER BY dc.created_at DESC
  ), '[]'::jsonb) INTO v_commands
  FROM device_commands dc
  WHERE dc.device_id = p_device_id
  LIMIT p_limit;

  RETURN jsonb_build_object(
    'device_id', p_device_id,
    'commands', v_commands
  );
END;
$$;

-- ============================================
-- 7. DEVICE OFFLINE STATUS TRACKING
-- ============================================
-- Add columns to tv_devices for offline mode tracking

ALTER TABLE tv_devices
ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS is_online BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS player_version TEXT,
ADD COLUMN IF NOT EXISTS cached_content_hash TEXT,
ADD COLUMN IF NOT EXISTS kiosk_mode_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS kiosk_exit_password TEXT;

-- Index for online status queries
CREATE INDEX IF NOT EXISTS idx_tv_devices_is_online ON tv_devices(is_online);
CREATE INDEX IF NOT EXISTS idx_tv_devices_last_seen ON tv_devices(last_seen_at);

-- ============================================
-- 8. UPDATE DEVICE STATUS RPC
-- ============================================
-- Called by player on heartbeat to update online status

CREATE OR REPLACE FUNCTION update_device_status(
  p_device_id UUID,
  p_player_version TEXT DEFAULT NULL,
  p_cached_content_hash TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE tv_devices
  SET last_seen_at = NOW(),
      is_online = true,
      player_version = COALESCE(p_player_version, player_version),
      cached_content_hash = COALESCE(p_cached_content_hash, cached_content_hash)
  WHERE id = p_device_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Device not found'
    );
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'device_id', p_device_id,
    'timestamp', NOW()
  );
END;
$$;

-- ============================================
-- 9. SET KIOSK MODE RPC
-- ============================================
-- Enable/disable kiosk mode on a device

CREATE OR REPLACE FUNCTION set_kiosk_mode(
  p_device_id UUID,
  p_enabled BOOLEAN,
  p_exit_password TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_device_owner_id UUID;
  v_user_id UUID;
BEGIN
  v_user_id := auth.uid();

  -- Get device owner and verify access
  SELECT owner_id INTO v_device_owner_id
  FROM tv_devices
  WHERE id = p_device_id;

  IF v_device_owner_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Device not found'
    );
  END IF;

  -- Check tenant access
  IF NOT (
    v_device_owner_id = v_user_id OR
    is_super_admin() OR
    is_admin()
  ) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Access denied'
    );
  END IF;

  -- Update kiosk mode settings
  UPDATE tv_devices
  SET kiosk_mode_enabled = p_enabled,
      kiosk_exit_password = CASE
        WHEN p_enabled AND p_exit_password IS NOT NULL THEN p_exit_password
        WHEN NOT p_enabled THEN NULL
        ELSE kiosk_exit_password
      END
  WHERE id = p_device_id;

  RETURN jsonb_build_object(
    'success', true,
    'device_id', p_device_id,
    'kiosk_mode_enabled', p_enabled
  );
END;
$$;

-- ============================================
-- 10. MARK OFFLINE DEVICES (scheduled function)
-- ============================================
-- Marks devices as offline if not seen for 5 minutes

CREATE OR REPLACE FUNCTION mark_offline_devices()
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INT;
BEGIN
  UPDATE tv_devices
  SET is_online = false
  WHERE is_online = true
    AND last_seen_at < NOW() - INTERVAL '5 minutes';

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

-- ============================================
-- 11. GRANT PERMISSIONS
-- ============================================

GRANT EXECUTE ON FUNCTION send_device_command(UUID, TEXT, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION get_pending_device_command(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION mark_command_executed(UUID, BOOLEAN, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_device_command_history(UUID, INT) TO authenticated;
GRANT EXECUTE ON FUNCTION update_device_status(UUID, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION set_kiosk_mode(UUID, BOOLEAN, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION mark_offline_devices() TO authenticated;

-- Allow anon access for player endpoints (devices may not have user auth)
GRANT EXECUTE ON FUNCTION get_pending_device_command(UUID) TO anon;
GRANT EXECUTE ON FUNCTION mark_command_executed(UUID, BOOLEAN, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION update_device_status(UUID, TEXT, TEXT) TO anon;

-- ============================================
-- 12. COMMENTS
-- ============================================

COMMENT ON TABLE device_commands IS
'Stores commands sent to player devices (reboot, reload, reset, clear_cache)';

COMMENT ON FUNCTION send_device_command(UUID, TEXT, JSONB) IS
'Sends a command to a device. Command types: reboot, reload, reset, clear_cache';

COMMENT ON FUNCTION get_pending_device_command(UUID) IS
'Called by player to poll for pending commands. Returns oldest pending command.';

COMMENT ON FUNCTION mark_command_executed(UUID, BOOLEAN, TEXT) IS
'Called by player to report command execution result';

COMMENT ON FUNCTION get_device_command_history(UUID, INT) IS
'Returns command history for a device';

COMMENT ON FUNCTION update_device_status(UUID, TEXT, TEXT) IS
'Called by player on heartbeat to update online status and cached content hash';

COMMENT ON FUNCTION set_kiosk_mode(UUID, BOOLEAN, TEXT) IS
'Enable/disable kiosk mode on a device with optional exit password';

COMMENT ON FUNCTION mark_offline_devices() IS
'Scheduled function to mark devices as offline if not seen for 5 minutes';
