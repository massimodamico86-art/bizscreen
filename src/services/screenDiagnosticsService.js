/**
 * Screen Diagnostics Service
 *
 * Frontend service for fetching comprehensive screen diagnostics
 * including content resolution, source information, and playback analytics.
 */

import { supabase } from '../supabase';
import { createScopedLogger } from './loggingService';

const _logger = createScopedLogger('ScreenDiagnosticsService');

/**
 * Resolution path labels for display
 */
export const RESOLUTION_PATH_LABELS = {
  campaign: 'Active Campaign',
  schedule: 'Scheduled Content',
  layout: 'Assigned Layout',
  playlist: 'Assigned Playlist',
  none: 'No Content Configured',
};

/**
 * Resolution path descriptions
 */
export const RESOLUTION_PATH_DESCRIPTIONS = {
  campaign: 'Content is being served by an active campaign targeting this screen.',
  schedule: 'Content is determined by a scheduled time slot.',
  layout: 'Displaying the layout directly assigned to this screen.',
  playlist: 'Playing the playlist directly assigned to this screen.',
  none: 'No content source is configured for this screen.',
};

/**
 * Get comprehensive diagnostics for a screen
 * @param {string} screenId - UUID of the screen
 * @returns {Promise<Object>} Diagnostics data
 */
export async function getScreenDiagnostics(screenId) {
  if (!screenId) {
    throw new Error('Screen ID is required');
  }

  const { data, error } = await supabase.rpc('get_screen_diagnostics', {
    p_screen_id: screenId,
  });

  if (error) {
    throw error;
  }

  if (data?.error) {
    throw new Error(data.error);
  }

  return data;
}

/**
 * Format the resolution path for display
 * @param {string} path - Resolution path (campaign, schedule, layout, playlist, none)
 * @returns {Object} Label and description
 */
export function getResolutionPathInfo(path) {
  return {
    label: RESOLUTION_PATH_LABELS[path] || 'Unknown',
    description: RESOLUTION_PATH_DESCRIPTIONS[path] || '',
  };
}

/**
 * Get online status info
 * @param {Object} screen - Screen info from diagnostics
 * @returns {Object} Status info with label and color
 */
export function getOnlineStatusInfo(screen) {
  if (!screen) {
    return { label: 'Unknown', color: 'text-gray-500', bgColor: 'bg-gray-100' };
  }

  if (screen.is_online) {
    return { label: 'Online', color: 'text-green-600', bgColor: 'bg-green-100' };
  }

  // Check if recently seen (within last hour)
  if (screen.last_seen_at) {
    const lastSeen = new Date(screen.last_seen_at);
    const hourAgo = new Date(Date.now() - 60 * 60 * 1000);
    if (lastSeen > hourAgo) {
      return { label: 'Recently Online', color: 'text-yellow-600', bgColor: 'bg-yellow-100' };
    }
  }

  return { label: 'Offline', color: 'text-red-600', bgColor: 'bg-red-100' };
}

/**
 * Format last seen timestamp
 * @param {string} lastSeenAt - ISO timestamp
 * @returns {string} Human-readable relative time
 */
export function formatLastSeen(lastSeenAt) {
  if (!lastSeenAt) return 'Never';

  const lastSeen = new Date(lastSeenAt);
  const now = new Date();
  const diffMs = now - lastSeen;
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;

  return lastSeen.toLocaleDateString();
}

/**
 * Get uptime color class based on percentage
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
 * Format uptime percentage for display
 * @param {number} percent - Uptime percentage
 * @returns {string} Formatted percentage
 */
export function formatUptime(percent) {
  if (percent === null || percent === undefined) return 'N/A';
  return `${percent.toFixed(1)}%`;
}

/**
 * Get content type label
 * @param {string} type - Content type (layout, playlist)
 * @returns {string} Human-readable label
 */
export function getContentTypeLabel(type) {
  const labels = {
    layout: 'Layout',
    playlist: 'Playlist',
    media: 'Media',
    app: 'App',
  };
  return labels[type] || type || 'Unknown';
}

/**
 * Extract preview info from resolved content
 * @param {Object} resolvedContent - Resolved content from diagnostics
 * @returns {Object} Preview info with type, name, thumbnail
 */
export function getPreviewInfo(resolvedContent) {
  if (!resolvedContent || resolvedContent.source === 'none') {
    return {
      type: 'none',
      name: 'No content',
      thumbnail: null,
      items: [],
    };
  }

  const { type, layout, playlist, items } = resolvedContent;

  if (type === 'layout' && layout) {
    return {
      type: 'layout',
      name: layout.name,
      thumbnail: layout.thumbnail_url || null,
      orientation: layout.orientation,
      templateType: layout.template_type,
      items: items || [],
    };
  }

  if (type === 'playlist' && playlist) {
    return {
      type: 'playlist',
      name: playlist.name,
      thumbnail: items?.[0]?.thumbnail_url || null,
      orientation: playlist.orientation,
      itemCount: items?.length || 0,
      items: items || [],
    };
  }

  return {
    type: type || 'unknown',
    name: 'Unknown content',
    thumbnail: null,
    items: items || [],
  };
}

// ============================================
// Content Verification Helpers (Phase 67 Plan 02)
// ============================================

/**
 * Force a content sync on a specific device by setting needs_refresh flag.
 * The player will reload content on its next heartbeat cycle.
 * Also transitions content_version_status to 'pending' so the mismatch
 * warning clears immediately in the operator dashboard.
 *
 * @param {string} deviceId - The device UUID
 * @returns {Promise<void>}
 */
export async function forceDeviceSync(deviceId) {
  const { error } = await supabase
    .from('tv_devices')
    .update({
      needs_refresh: true,
      content_version_status: 'pending',
    })
    .eq('id', deviceId);
  if (error) throw error;
}

// ============================================
// Device Metric Helpers (Phase 64 Plan 03)
// ============================================

/**
 * Get status colors for a given status level
 * @param {string} status - healthy, warning, critical, unknown
 * @param {string} tooltip - Tooltip text
 * @returns {Object} Status info with color classes
 */
function getStatusColors(status, tooltip) {
  const map = {
    healthy: { status: 'healthy', color: 'text-green-600', borderColor: 'border-green-400', tooltip },
    warning: { status: 'warning', color: 'text-yellow-600', borderColor: 'border-yellow-400', tooltip },
    critical: { status: 'critical', color: 'text-red-600', borderColor: 'border-red-400', tooltip },
    unknown: { status: 'unknown', color: 'text-gray-400', borderColor: 'border-gray-300', tooltip: 'Data not available' },
  };
  return map[status] || map.unknown;
}

/**
 * Evaluate a device metric against thresholds and return status + colors
 * @param {string} metric - Metric key (js_heap_percent, storage_percent, network_downlink, network_type)
 * @param {*} value - Metric value
 * @returns {Object} { status, color, borderColor, tooltip }
 */
export function getMetricStatus(metric, value) {
  if (value === null || value === undefined) {
    return { status: 'unknown', color: 'text-gray-400', borderColor: 'border-gray-300', tooltip: 'Data not available' };
  }

  const thresholds = {
    js_heap_percent: { warning: 70, critical: 85, unit: '%', warnMsg: 'JS Heap usage is above 70%', critMsg: 'JS Heap usage is above 85% — risk of out-of-memory' },
    storage_percent: { warning: 70, critical: 90, unit: '%', warnMsg: 'Storage usage is above 70%', critMsg: 'Storage usage is above 90% — may prevent caching' },
    network_downlink: { warning: 5, critical: 1, unit: 'Mbps', inverted: true, warnMsg: 'Network speed below 5 Mbps', critMsg: 'Network speed below 1 Mbps — may struggle with media' },
    network_type: { values: { '4g': 'healthy', '3g': 'warning', '2g': 'critical', 'slow-2g': 'critical' } },
  };

  const config = thresholds[metric];
  if (!config) {
    return { status: 'healthy', color: 'text-green-600', borderColor: 'border-green-400', tooltip: '' };
  }

  // Enum-based threshold (network_type)
  if (config.values) {
    const status = config.values[value] || 'healthy';
    return getStatusColors(status, '');
  }

  // Numeric threshold (inverted = lower is worse, e.g., downlink)
  if (config.inverted) {
    if (value < config.critical) return getStatusColors('critical', config.critMsg);
    if (value < config.warning) return getStatusColors('warning', config.warnMsg);
    return getStatusColors('healthy', '');
  }

  // Numeric threshold (higher is worse, e.g., heap %)
  if (value > config.critical) return getStatusColors('critical', config.critMsg);
  if (value > config.warning) return getStatusColors('warning', config.warnMsg);
  return getStatusColors('healthy', '');
}

/**
 * Format a device metric value for display
 * @param {string} metric - Metric category (memory, js_heap, storage, network)
 * @param {Object} metrics - Raw device_metrics object
 * @returns {string} Formatted display value
 */
export function formatMetricValue(metric, metrics) {
  if (!metrics) return 'N/A';

  switch (metric) {
    case 'memory':
      if (metrics.memory_gb) return `${metrics.memory_gb} GB`;
      return 'N/A';
    case 'js_heap':
      if (metrics.js_heap_used_mb != null && metrics.js_heap_limit_mb) {
        const pct = Math.round((metrics.js_heap_used_mb / metrics.js_heap_limit_mb) * 100);
        return `${metrics.js_heap_used_mb} / ${metrics.js_heap_limit_mb} MB (${pct}%)`;
      }
      return 'N/A';
    case 'storage':
      if (metrics.storage_percent != null) return `${metrics.storage_percent}% used`;
      if (metrics.storage_used_mb != null) return `${metrics.storage_used_mb} MB`;
      return 'N/A';
    case 'network': {
      const parts = [];
      if (metrics.network_type) parts.push(metrics.network_type.toUpperCase());
      if (metrics.network_downlink != null) parts.push(`${metrics.network_downlink} Mbps`);
      return parts.length > 0 ? parts.join(' / ') : 'N/A';
    }
    default:
      return 'N/A';
  }
}

/**
 * Compute JS heap usage percentage for threshold evaluation
 * @param {Object} metrics - Raw device_metrics object
 * @returns {number|null} Percentage (0-100) or null if unavailable
 */
export function getJsHeapPercent(metrics) {
  if (!metrics?.js_heap_used_mb || !metrics?.js_heap_limit_mb) return null;
  return Math.round((metrics.js_heap_used_mb / metrics.js_heap_limit_mb) * 100);
}
