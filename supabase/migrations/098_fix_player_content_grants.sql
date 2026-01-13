-- Migration: 098_fix_player_content_grants.sql
-- Fix: Add missing GRANT statements for get_resolved_player_content
-- The function was updated in migration 074 but grants were not re-added

-- Grant execute permissions for player content functions
GRANT EXECUTE ON FUNCTION public.get_resolved_player_content(UUID) TO anon;
GRANT EXECUTE ON FUNCTION public.get_resolved_player_content(UUID) TO authenticated;

GRANT EXECUTE ON FUNCTION public.get_resolved_player_content_by_otp(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.get_resolved_player_content_by_otp(TEXT) TO authenticated;

-- Also ensure player_heartbeat has proper grants
GRANT EXECUTE ON FUNCTION public.player_heartbeat(UUID) TO anon;
GRANT EXECUTE ON FUNCTION public.player_heartbeat(UUID) TO authenticated;

COMMENT ON FUNCTION public.get_resolved_player_content(UUID) IS
'Main player content API - returns playlist/layout/scene content for a screen.
Priority: device_override > group_override > schedule > legacy_schedule > assigned_layout > assigned_playlist';

DO $$ BEGIN
  RAISE NOTICE 'Migration 098 completed: Fixed player content function grants';
END $$;
