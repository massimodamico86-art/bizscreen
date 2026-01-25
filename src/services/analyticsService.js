/**
 * Analytics Service
 *
 * Frontend service for fetching analytics data from the database RPCs.
 */

import { supabase } from '../supabase';
import { getEffectiveOwnerId } from './tenantService';
import { createScopedLogger } from './loggingService';

const logger = createScopedLogger('AnalyticsService');

/**
 * Date range presets
 */
export const DATE_RANGES = {
  '24h': { label: 'Last 24 Hours', hours: 24 },
  '7d': { label: 'Last 7 Days', hours: 24 * 7 },
  '30d': { label: 'Last 30 Days', hours: 24 * 30 },
  '90d': { label: 'Last 90 Days', hours: 24 * 90 },
};

/**
 * Calculate date range from preset
 */
export function getDateRange(preset) {
  const config = DATE_RANGES[preset] || DATE_RANGES['7d'];
  const toTs = new Date();
  const fromTs = new Date(toTs.getTime() - config.hours * 60 * 60 * 1000);
  return {
    fromTs: fromTs.toISOString(),
    toTs: toTs.toISOString(),
    label: config.label,
  };
}

/**
 * Get overall analytics summary
 */
export async function getAnalyticsSummary(dateRange = '7d', locationId = null) {
  const tenantId = await getEffectiveOwnerId();
  if (!tenantId) throw new Error('No tenant context');

  const { fromTs, toTs } = getDateRange(dateRange);

  const { data, error } = await supabase.rpc('get_analytics_summary', {
    p_tenant_id: tenantId,
    p_from_ts: fromTs,
    p_to_ts: toTs,
    p_location_id: locationId,
  });

  if (error) throw error;
  return data?.[0] || {
    total_screens: 0,
    active_screens: 0,
    total_playback_hours: 0,
    total_events: 0,
    avg_uptime_percent: 0,
    distinct_playlists: 0,
    distinct_media: 0,
  };
}

/**
 * Get screen uptime data
 */
export async function getScreenUptime(dateRange = '7d', locationId = null) {
  const tenantId = await getEffectiveOwnerId();
  if (!tenantId) throw new Error('No tenant context');

  const { fromTs, toTs } = getDateRange(dateRange);

  const { data, error } = await supabase.rpc('get_screen_uptime', {
    p_tenant_id: tenantId,
    p_from_ts: fromTs,
    p_to_ts: toTs,
    p_location_id: locationId,
  });

  if (error) throw error;
  return data || [];
}

/**
 * Get playback summary by screen
 */
export async function getPlaybackByScreen(dateRange = '7d', locationId = null, screenId = null) {
  const tenantId = await getEffectiveOwnerId();
  if (!tenantId) throw new Error('No tenant context');

  const { fromTs, toTs } = getDateRange(dateRange);

  const { data, error } = await supabase.rpc('get_playback_summary_by_screen', {
    p_tenant_id: tenantId,
    p_from_ts: fromTs,
    p_to_ts: toTs,
    p_location_id: locationId,
    p_screen_id: screenId,
  });

  if (error) throw error;
  return data || [];
}

/**
 * Get playback summary by playlist
 */
export async function getPlaybackByPlaylist(dateRange = '7d', locationId = null) {
  const tenantId = await getEffectiveOwnerId();
  if (!tenantId) throw new Error('No tenant context');

  const { fromTs, toTs } = getDateRange(dateRange);

  const { data, error } = await supabase.rpc('get_playback_summary_by_playlist', {
    p_tenant_id: tenantId,
    p_from_ts: fromTs,
    p_to_ts: toTs,
    p_location_id: locationId,
  });

  if (error) throw error;
  return data || [];
}

/**
 * Get playback summary by media
 */
export async function getPlaybackByMedia(dateRange = '7d', locationId = null, screenId = null) {
  const tenantId = await getEffectiveOwnerId();
  if (!tenantId) throw new Error('No tenant context');

  const { fromTs, toTs } = getDateRange(dateRange);

  const { data, error } = await supabase.rpc('get_playback_summary_by_media', {
    p_tenant_id: tenantId,
    p_from_ts: fromTs,
    p_to_ts: toTs,
    p_location_id: locationId,
    p_screen_id: screenId,
  });

  if (error) throw error;
  return data || [];
}

/**
 * Get daily activity for a screen (for sparklines)
 */
export async function getScreenDailyActivity(screenId, dateRange = '7d') {
  const tenantId = await getEffectiveOwnerId();
  if (!tenantId) throw new Error('No tenant context');

  const { fromTs, toTs } = getDateRange(dateRange);

  const { data, error } = await supabase.rpc('get_screen_daily_activity', {
    p_tenant_id: tenantId,
    p_screen_id: screenId,
    p_from_ts: fromTs,
    p_to_ts: toTs,
  });

  if (error) throw error;
  return data || [];
}

/**
 * Format seconds to human-readable duration
 */
export function formatDuration(seconds) {
  if (!seconds || seconds < 0) return '0s';

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  if (minutes > 0) {
    return `${minutes}m ${secs}s`;
  }
  return `${secs}s`;
}

/**
 * Format hours to human-readable
 */
export function formatHours(hours) {
  if (!hours || hours < 0) return '0h';

  if (hours < 1) {
    return `${Math.round(hours * 60)}m`;
  }
  if (hours < 24) {
    return `${hours.toFixed(1)}h`;
  }
  return `${Math.round(hours)}h`;
}

/**
 * Format uptime percentage with color
 */
export function getUptimeColor(percent) {
  if (percent >= 95) return 'text-green-600';
  if (percent >= 80) return 'text-yellow-600';
  return 'text-red-600';
}

/**
 * Get screen analytics (for screen detail view)
 */
export async function getScreenAnalytics(screenId, dateRange = '7d') {
  const [uptime, playback, media, dailyActivity] = await Promise.all([
    getScreenUptime(dateRange, null).then(data =>
      data.find(s => s.screen_id === screenId) || null
    ),
    getPlaybackByScreen(dateRange, null, screenId).then(data => data[0] || null),
    getPlaybackByMedia(dateRange, null, screenId),
    getScreenDailyActivity(screenId, dateRange),
  ]);

  return {
    uptime,
    playback,
    topMedia: media.slice(0, 5),
    dailyActivity,
  };
}
