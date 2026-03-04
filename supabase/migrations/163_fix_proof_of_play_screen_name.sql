-- Fix: get_proof_of_play_report references td.name but migration 0041 renamed it to td.device_name
-- This causes null screen_name in all report rows

CREATE OR REPLACE FUNCTION public.get_proof_of_play_report(
  p_tenant_id UUID,
  p_start_date TIMESTAMPTZ,
  p_end_date TIMESTAMPTZ,
  p_screen_ids UUID[] DEFAULT NULL
)
RETURNS TABLE (
  screen_name TEXT,
  content_name TEXT,
  content_type TEXT,
  total_plays BIGINT,
  total_duration_seconds BIGINT,
  first_played TIMESTAMPTZ,
  last_played TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    td.device_name AS screen_name,
    COALESCE(ma.name, sc.name, pl.name, 'Unknown') AS content_name,
    pe.item_type AS content_type,
    COUNT(pe.id)::BIGINT AS total_plays,
    COALESCE(SUM(pe.duration_seconds), 0)::BIGINT AS total_duration_seconds,
    MIN(pe.started_at) AS first_played,
    MAX(pe.started_at) AS last_played
  FROM public.playback_events pe
  JOIN public.tv_devices td ON td.id = pe.screen_id
  LEFT JOIN public.media_assets ma ON ma.id = pe.media_id
  LEFT JOIN public.scenes sc ON sc.id = pe.scene_id
  LEFT JOIN public.playlists pl ON pl.id = pe.playlist_id
  WHERE pe.tenant_id = p_tenant_id
    AND pe.started_at >= p_start_date
    AND pe.started_at <= p_end_date
    AND pe.event_type IN ('media_play', 'scene_end')
    AND pe.duration_seconds IS NOT NULL
    AND (p_screen_ids IS NULL OR pe.screen_id = ANY(p_screen_ids))
  GROUP BY td.device_name, COALESCE(ma.name, sc.name, pl.name, 'Unknown'), pe.item_type
  ORDER BY total_plays DESC;
END;
$$;
