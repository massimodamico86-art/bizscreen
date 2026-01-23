-- Migration: Device Experience - PIN-based Kiosk Exit
-- Purpose: Enable offline PIN validation by storing hashed PINs in database
-- PINs are hashed with SHA-256 on the client side before storage

-- =============================================
-- 1. Add PIN columns to tv_devices table
-- Stores device-specific kiosk exit PIN
-- =============================================
ALTER TABLE public.tv_devices
ADD COLUMN IF NOT EXISTS kiosk_pin_hash TEXT,
ADD COLUMN IF NOT EXISTS kiosk_pin_set_at TIMESTAMPTZ;

COMMENT ON COLUMN public.tv_devices.kiosk_pin_hash IS 'SHA-256 hash of device-specific kiosk exit PIN';
COMMENT ON COLUMN public.tv_devices.kiosk_pin_set_at IS 'Timestamp when device PIN was last set';

-- =============================================
-- 2. Add master PIN columns to profiles table
-- Master PIN works across all devices for a tenant
-- =============================================
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS master_kiosk_pin_hash TEXT,
ADD COLUMN IF NOT EXISTS master_kiosk_pin_set_at TIMESTAMPTZ;

COMMENT ON COLUMN public.profiles.master_kiosk_pin_hash IS 'SHA-256 hash of tenant master kiosk exit PIN';
COMMENT ON COLUMN public.profiles.master_kiosk_pin_set_at IS 'Timestamp when master PIN was last set';

-- =============================================
-- 3. RPC: Get device and master PIN hashes
-- Returns both hashes for offline caching on device
-- =============================================
CREATE OR REPLACE FUNCTION get_device_kiosk_pins(p_device_id UUID)
RETURNS JSONB
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT jsonb_build_object(
    'device_pin_hash', td.kiosk_pin_hash,
    'master_pin_hash', p.master_kiosk_pin_hash
  )
  FROM tv_devices td
  LEFT JOIN profiles p ON p.id = td.owner_id
  WHERE td.id = p_device_id;
$$;

COMMENT ON FUNCTION get_device_kiosk_pins(UUID) IS
  'Get device-specific and master PIN hashes for a device. Used during pairing/sync for offline validation.';

-- =============================================
-- 4. RPC: Set device-specific PIN
-- Called during device configuration
-- =============================================
CREATE OR REPLACE FUNCTION set_device_kiosk_pin(p_device_id UUID, p_pin_hash TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE tv_devices
  SET kiosk_pin_hash = p_pin_hash,
      kiosk_pin_set_at = NOW()
  WHERE id = p_device_id
    AND owner_id = auth.uid();
END;
$$;

COMMENT ON FUNCTION set_device_kiosk_pin(UUID, TEXT) IS
  'Set the kiosk exit PIN for a specific device. Only the device owner can set the PIN.';

-- =============================================
-- 5. RPC: Set master PIN for tenant
-- Called from admin settings
-- =============================================
CREATE OR REPLACE FUNCTION set_master_kiosk_pin(p_pin_hash TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE profiles
  SET master_kiosk_pin_hash = p_pin_hash,
      master_kiosk_pin_set_at = NOW()
  WHERE id = auth.uid();
END;
$$;

COMMENT ON FUNCTION set_master_kiosk_pin(TEXT) IS
  'Set the master kiosk exit PIN for the authenticated tenant. Works across all tenant devices.';

-- =============================================
-- 6. Grant execute permissions
-- =============================================
GRANT EXECUTE ON FUNCTION get_device_kiosk_pins(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION set_device_kiosk_pin(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION set_master_kiosk_pin(TEXT) TO authenticated;
