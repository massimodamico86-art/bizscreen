-- ============================================================================
-- Migration 042: Fix OTP Column References
-- ============================================================================
-- This migration fixes column references to use otp_code (renamed from otp in 0041)
-- ============================================================================

-- Fix the get_resolved_player_content_by_otp function to use correct column names
CREATE OR REPLACE FUNCTION public.get_resolved_player_content_by_otp(p_otp TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_screen_id UUID;
BEGIN
    -- Look up screen by OTP (using correct column names: otp_code, otp_expires_at)
    SELECT id INTO v_screen_id
    FROM public.tv_devices
    WHERE otp_code = p_otp
      AND otp_expires_at > now();

    IF v_screen_id IS NULL THEN
        RETURN jsonb_build_object(
            'error', 'Invalid or expired pairing code'
        );
    END IF;

    -- Return the screen ID along with resolved content so frontend can store it
    RETURN jsonb_build_object(
        'screenId', v_screen_id
    ) || public.get_resolved_player_content(v_screen_id);
END;
$$;

-- Add comment for documentation
COMMENT ON FUNCTION public.get_resolved_player_content_by_otp IS
  'Resolves player content by OTP code for screen pairing. Returns screenId along with resolved content.';
