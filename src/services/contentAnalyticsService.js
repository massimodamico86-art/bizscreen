/**
 * Content Analytics Service
 *
 * Frontend service for fetching scene playback analytics and content performance data.
 * Uses database RPCs defined in migration 079_playback_analytics.sql.
 */

import { supabase } from '../supabase';
import { getEffectiveOwnerId } from './tenantService';

// ============================================================================
// DATE RANGE HELPERS
// ============================================================================

/**
 * Date range presets for analytics
 */
export const DATE_RANGES = {
  '24h': { label: 'Last 24 Hours', hours: 24 },
  '7d': { label: 'Last 7 Days', hours: 24 * 7 },
  '30d': { label: 'Last 30 Days', hours: 24 * 30 },
  '90d': { label: 'Last 90 Days', hours: 24 * 90 },
};

/**
 * Calculate date range from preset
 * @param {string} preset - Date range preset (e.g., '7d')
 * @returns {{ fromTs: string, toTs: string, label: string }}
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
 * Get custom date range
 * @param {Date} from - Start date
 * @param {Date} to - End date
 * @returns {{ fromTs: string, toTs: string }}
 */
export function getCustomDateRange(from, to) {
  return {
    fromTs: from.toISOString(),
    toTs: to.toISOString(),
  };
}

// ============================================================================
// SUMMARY & OVERVIEW
// ============================================================================

/**
 * Get content analytics summary (key metrics)
 * @param {string} dateRange - Date range preset
 * @param {Object} [filters] - Optional filters
 * @param {string} [filters.groupId] - Filter by screen group
 * @param {string} [filters.deviceId] - Filter by device
 */
export async function getContentAnalyticsSummary(dateRange = '7d', filters = {}) {
  const tenantId = await getEffectiveOwnerId();
  if (!tenantId) throw new Error('No tenant context');

  const { fromTs, toTs } = getDateRange(dateRange);

  const { data, error } = await supabase.rpc('get_content_analytics_summary', {
    p_tenant_id: tenantId,
    p_from_ts: fromTs,
    p_to_ts: toTs,
    p_group_id: filters.groupId || null,
    p_device_id: filters.deviceId || null,
  });

  if (error) throw error;

  return data?.[0] || {
    total_devices: 0,
    active_devices: 0,
    total_scenes: 0,
    active_scenes: 0,
    total_playback_hours: 0,
    avg_uptime_percent: 0,
    scenes_live_now: 0,
  };
}

// ============================================================================
// SCENE ANALYTICS
// ============================================================================

/**
 * Get scene playback summary
 * @param {string} dateRange - Date range preset
 * @param {Object} [filters] - Optional filters
 * @param {string} [filters.groupId] - Filter by screen group
 * @param {string} [filters.deviceId] - Filter by device
 */
export async function getScenePlaybackSummary(dateRange = '7d', filters = {}) {
  const tenantId = await getEffectiveOwnerId();
  if (!tenantId) throw new Error('No tenant context');

  const { fromTs, toTs } = getDateRange(dateRange);

  const { data, error } = await supabase.rpc('get_scene_playback_summary', {
    p_tenant_id: tenantId,
    p_from_ts: fromTs,
    p_to_ts: toTs,
    p_group_id: filters.groupId || null,
    p_device_id: filters.deviceId || null,
  });

  if (error) throw error;
  return data || [];
}

/**
 * Get top scenes by playback duration
 * @param {string} dateRange - Date range preset
 * @param {number} [limit] - Maximum number of scenes to return
 */
export async function getTopScenes(dateRange = '7d', limit = 10) {
  const tenantId = await getEffectiveOwnerId();
  if (!tenantId) throw new Error('No tenant context');

  const { fromTs, toTs } = getDateRange(dateRange);

  const { data, error } = await supabase.rpc('get_top_scenes', {
    p_tenant_id: tenantId,
    p_from_ts: fromTs,
    p_to_ts: toTs,
    p_limit: limit,
  });

  if (error) throw error;
  return data || [];
}

/**
 * Get timeline data for a specific scene
 * @param {string} sceneId - Scene UUID
 * @param {string} dateRange - Date range preset
 * @param {string} [bucket] - Time bucket ('hour' or 'day')
 */
export async function getSceneTimeline(sceneId, dateRange = '7d', bucket = 'hour') {
  const tenantId = await getEffectiveOwnerId();
  if (!tenantId) throw new Error('No tenant context');

  const { fromTs, toTs } = getDateRange(dateRange);

  const { data, error } = await supabase.rpc('get_scene_timeline', {
    p_tenant_id: tenantId,
    p_scene_id: sceneId,
    p_from_ts: fromTs,
    p_to_ts: toTs,
    p_bucket_interval: bucket,
  });

  if (error) throw error;
  return data || [];
}

/**
 * Get detailed analytics for a specific scene
 * @param {string} sceneId - Scene UUID
 * @param {string} dateRange - Date range preset
 */
export async function getSceneAnalyticsDetail(sceneId, dateRange = '7d') {
  const tenantId = await getEffectiveOwnerId();
  if (!tenantId) throw new Error('No tenant context');

  const { fromTs, toTs } = getDateRange(dateRange);

  const { data, error } = await supabase.rpc('get_scene_analytics_detail', {
    p_tenant_id: tenantId,
    p_scene_id: sceneId,
    p_from_ts: fromTs,
    p_to_ts: toTs,
  });

  if (error) throw error;
  return data?.[0] || null;
}

// ============================================================================
// DEVICE ANALYTICS
// ============================================================================

/**
 * Get device uptime summary
 * @param {string} dateRange - Date range preset
 * @param {string} [groupId] - Filter by screen group
 */
export async function getDeviceUptimeSummary(dateRange = '7d', groupId = null) {
  const tenantId = await getEffectiveOwnerId();
  if (!tenantId) throw new Error('No tenant context');

  const { fromTs, toTs } = getDateRange(dateRange);

  const { data, error } = await supabase.rpc('get_device_uptime_summary', {
    p_tenant_id: tenantId,
    p_from_ts: fromTs,
    p_to_ts: toTs,
    p_group_id: groupId,
  });

  if (error) throw error;
  return data || [];
}

// ============================================================================
// COMBINED ANALYTICS FOR DASHBOARD
// ============================================================================

/**
 * Fetch all analytics data for the content performance dashboard
 * @param {string} dateRange - Date range preset
 * @param {Object} [filters] - Optional filters
 * @returns {Promise<Object>} All analytics data
 */
export async function fetchDashboardAnalytics(dateRange = '7d', filters = {}) {
  const [summary, topScenes, deviceUptime] = await Promise.all([
    getContentAnalyticsSummary(dateRange, filters),
    getTopScenes(dateRange, 10),
    getDeviceUptimeSummary(dateRange, filters.groupId),
  ]);

  return {
    summary,
    topScenes,
    deviceUptime,
  };
}

/**
 * Fetch scene detail with timeline for modal/detail view
 * @param {string} sceneId - Scene UUID
 * @param {string} dateRange - Date range preset
 */
export async function fetchSceneDetailAnalytics(sceneId, dateRange = '7d') {
  const bucket = dateRange === '24h' ? 'hour' : dateRange === '7d' ? 'hour' : 'day';

  const [detail, timeline] = await Promise.all([
    getSceneAnalyticsDetail(sceneId, dateRange),
    getSceneTimeline(sceneId, dateRange, bucket),
  ]);

  return {
    detail,
    timeline,
  };
}

// ============================================================================
// FORMATTING HELPERS
// ============================================================================

/**
 * Format seconds to human-readable duration
 * @param {number} seconds - Duration in seconds
 * @returns {string} Formatted duration
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
 * @param {number} hours - Duration in hours
 * @returns {string} Formatted hours
 */
export function formatHours(hours) {
  if (!hours || hours < 0) return '0h';

  if (hours < 1) {
    return `${Math.round(hours * 60)}m`;
  }
  if (hours < 24) {
    return `${hours.toFixed(1)}h`;
  }
  const days = Math.floor(hours / 24);
  const remainingHours = Math.round(hours % 24);
  return `${days}d ${remainingHours}h`;
}

/**
 * Get color class for uptime percentage
 * @param {number} percent - Uptime percentage
 * @returns {string} Tailwind color class
 */
export function getUptimeColor(percent) {
  if (percent >= 95) return 'text-green-600';
  if (percent >= 80) return 'text-yellow-600';
  if (percent >= 50) return 'text-orange-600';
  return 'text-red-600';
}

/**
 * Get background color class for uptime percentage
 * @param {number} percent - Uptime percentage
 * @returns {string} Tailwind background color class
 */
export function getUptimeBgColor(percent) {
  if (percent >= 95) return 'bg-green-100';
  if (percent >= 80) return 'bg-yellow-100';
  if (percent >= 50) return 'bg-orange-100';
  return 'bg-red-100';
}

/**
 * Format relative time
 * @param {string} timestamp - ISO timestamp
 * @returns {string} Relative time string
 */
export function formatRelativeTime(timestamp) {
  if (!timestamp) return 'Never';

  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now - date;
  const diffMinutes = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMinutes < 1) return 'Just now';
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString();
}

// ============================================================================
// CHART DATA HELPERS
// ============================================================================

/**
 * Convert top scenes data to chart format
 * @param {Array} scenes - Top scenes data
 * @returns {Object} Chart.js compatible data
 */
export function formatTopScenesForChart(scenes) {
  const labels = scenes.map(s => s.scene_name || 'Unnamed');
  const data = scenes.map(s => Math.round((s.total_duration_seconds || 0) / 3600 * 10) / 10); // Hours with 1 decimal

  return {
    labels,
    datasets: [
      {
        label: 'Playback (hours)',
        data,
        backgroundColor: [
          '#3B82F6', // blue
          '#8B5CF6', // violet
          '#EC4899', // pink
          '#F59E0B', // amber
          '#10B981', // emerald
          '#6366F1', // indigo
          '#F97316', // orange
          '#14B8A6', // teal
          '#EF4444', // red
          '#84CC16', // lime
        ],
      },
    ],
  };
}

/**
 * Convert timeline data to chart format
 * @param {Array} timeline - Timeline data
 * @returns {Object} Chart.js compatible data
 */
export function formatTimelineForChart(timeline) {
  const labels = timeline.map(t => {
    const date = new Date(t.bucket_start);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
    });
  });

  const data = timeline.map(t => Math.round((t.total_duration_seconds || 0) / 60)); // Minutes

  return {
    labels,
    datasets: [
      {
        label: 'Playback (minutes)',
        data,
        borderColor: '#3B82F6',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        fill: true,
        tension: 0.3,
      },
    ],
  };
}

/**
 * Convert device uptime to chart format
 * @param {Array} devices - Device uptime data
 * @returns {Object} Chart.js compatible data
 */
export function formatDeviceUptimeForChart(devices) {
  const labels = devices.map(d => d.device_name || 'Unknown');
  const data = devices.map(d => d.uptime_percent || 0);

  return {
    labels,
    datasets: [
      {
        label: 'Uptime %',
        data,
        backgroundColor: devices.map(d => {
          const percent = d.uptime_percent || 0;
          if (percent >= 95) return '#10B981';
          if (percent >= 80) return '#F59E0B';
          return '#EF4444';
        }),
      },
    ],
  };
}
