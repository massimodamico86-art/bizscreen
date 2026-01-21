-- Migration: 108_dashboard_stats_function.sql
-- Description: Add optimized database function for dashboard statistics
-- This replaces multiple unbounded SELECT queries with a single efficient query

-- ============================================================================
-- DASHBOARD STATS FUNCTION
-- Returns all dashboard statistics in a single query
-- ============================================================================

CREATE OR REPLACE FUNCTION get_dashboard_stats()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSON;
  user_tenant_id UUID;
  online_threshold TIMESTAMP;
BEGIN
  -- Get the current user's tenant_id from their profile
  SELECT tenant_id INTO user_tenant_id
  FROM profiles
  WHERE id = auth.uid();

  -- If no tenant found, return empty stats
  IF user_tenant_id IS NULL THEN
    RETURN json_build_object(
      'screens', json_build_object('total', 0, 'online', 0, 'offline', 0),
      'playlists', json_build_object('total', 0),
      'media', json_build_object('total', 0, 'images', 0, 'videos', 0, 'audio', 0, 'documents', 0, 'apps', 0)
    );
  END IF;

  -- Online threshold: 2 minutes ago
  online_threshold := NOW() - INTERVAL '2 minutes';

  -- Build the complete stats object in a single query
  SELECT json_build_object(
    'screens', (
      SELECT json_build_object(
        'total', COUNT(*)::INT,
        'online', COUNT(*) FILTER (WHERE last_seen > online_threshold)::INT,
        'offline', COUNT(*) FILTER (WHERE last_seen <= online_threshold OR last_seen IS NULL)::INT
      )
      FROM tv_devices
      WHERE tenant_id = user_tenant_id
    ),
    'playlists', (
      SELECT json_build_object(
        'total', COUNT(*)::INT
      )
      FROM playlists
      WHERE tenant_id = user_tenant_id
    ),
    'media', (
      SELECT json_build_object(
        'total', COUNT(*)::INT,
        'images', COUNT(*) FILTER (WHERE type = 'image')::INT,
        'videos', COUNT(*) FILTER (WHERE type = 'video')::INT,
        'audio', COUNT(*) FILTER (WHERE type = 'audio')::INT,
        'documents', COUNT(*) FILTER (WHERE type = 'document')::INT,
        'apps', COUNT(*) FILTER (WHERE type = 'app')::INT
      )
      FROM media_assets
      WHERE tenant_id = user_tenant_id
    )
  ) INTO result;

  RETURN result;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_dashboard_stats() TO authenticated;

-- Add comment for documentation
COMMENT ON FUNCTION get_dashboard_stats() IS
'Returns dashboard statistics (screens, playlists, media counts) for the current user''s tenant in a single optimized query. Replaces multiple unbounded SELECT queries.';


-- ============================================================================
-- DEVICE HEALTH ISSUES FUNCTION
-- Returns only devices with health issues (limited, not all devices)
-- ============================================================================

CREATE OR REPLACE FUNCTION get_device_health_issues(issue_limit INT DEFAULT 50)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSON;
  user_tenant_id UUID;
  one_hour_ago TIMESTAMP;
  one_day_ago TIMESTAMP;
  one_week_ago TIMESTAMP;
BEGIN
  -- Get the current user's tenant_id
  SELECT tenant_id INTO user_tenant_id
  FROM profiles
  WHERE id = auth.uid();

  IF user_tenant_id IS NULL THEN
    RETURN '[]'::JSON;
  END IF;

  -- Calculate thresholds
  one_hour_ago := NOW() - INTERVAL '1 hour';
  one_day_ago := NOW() - INTERVAL '1 day';
  one_week_ago := NOW() - INTERVAL '7 days';

  -- Get devices with issues
  SELECT COALESCE(json_agg(issue ORDER BY severity_order, last_seen ASC NULLS FIRST), '[]'::JSON)
  INTO result
  FROM (
    SELECT
      id as "deviceId",
      COALESCE(device_name, 'Unnamed Device') as "deviceName",
      last_seen as "lastSeen",
      CASE
        WHEN last_seen IS NULL THEN 'never_connected'
        WHEN last_seen <= one_week_ago THEN 'offline_extended'
        WHEN last_seen <= one_day_ago THEN 'offline_extended'
        WHEN last_seen <= one_hour_ago THEN 'offline'
        ELSE NULL
      END as "issueType",
      CASE
        WHEN last_seen IS NULL THEN 'warning'
        WHEN last_seen <= one_week_ago THEN 'critical'
        WHEN last_seen <= one_day_ago THEN 'warning'
        WHEN last_seen <= one_hour_ago THEN 'info'
        ELSE NULL
      END as severity,
      CASE
        WHEN last_seen IS NULL THEN 1
        WHEN last_seen <= one_week_ago THEN 0
        WHEN last_seen <= one_day_ago THEN 1
        WHEN last_seen <= one_hour_ago THEN 2
        ELSE 3
      END as severity_order,
      CASE
        WHEN last_seen IS NULL THEN 'Device has never connected'
        WHEN last_seen <= one_week_ago THEN 'Offline for ' || EXTRACT(DAY FROM (NOW() - last_seen))::INT || ' days'
        WHEN last_seen <= one_day_ago THEN 'Offline for ' || EXTRACT(DAY FROM (NOW() - last_seen))::INT || ' days'
        WHEN last_seen <= one_hour_ago THEN 'Offline for ' || EXTRACT(HOUR FROM (NOW() - last_seen))::INT || ' hours'
        ELSE NULL
      END as message
    FROM tv_devices
    WHERE tenant_id = user_tenant_id
      AND (
        last_seen IS NULL
        OR last_seen <= one_hour_ago
      )
    ORDER BY severity_order, last_seen ASC NULLS FIRST
    LIMIT issue_limit
  ) issue
  WHERE issue."issueType" IS NOT NULL;

  RETURN result;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_device_health_issues(INT) TO authenticated;

COMMENT ON FUNCTION get_device_health_issues(INT) IS
'Returns devices with health issues (offline, never connected) for the current user''s tenant. Limited to prevent unbounded queries.';


-- ============================================================================
-- ALERT SUMMARY FUNCTION
-- Returns alert counts and top issues
-- ============================================================================

CREATE OR REPLACE FUNCTION get_alert_summary(top_issues_limit INT DEFAULT 3)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  issues JSON;
  result JSON;
BEGIN
  -- Get all issues first
  issues := get_device_health_issues(50);

  -- Build summary
  SELECT json_build_object(
    'total', COALESCE(json_array_length(issues), 0),
    'critical', (SELECT COUNT(*) FROM json_array_elements(issues) elem WHERE elem->>'severity' = 'critical')::INT,
    'warning', (SELECT COUNT(*) FROM json_array_elements(issues) elem WHERE elem->>'severity' = 'warning')::INT,
    'info', (SELECT COUNT(*) FROM json_array_elements(issues) elem WHERE elem->>'severity' = 'info')::INT,
    'topIssues', (
      SELECT COALESCE(json_agg(elem), '[]'::JSON)
      FROM (
        SELECT elem
        FROM json_array_elements(issues) elem
        LIMIT top_issues_limit
      ) sub
    )
  ) INTO result;

  RETURN result;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_alert_summary(INT) TO authenticated;

COMMENT ON FUNCTION get_alert_summary(INT) IS
'Returns alert summary with counts by severity and top issues for the dashboard.';
