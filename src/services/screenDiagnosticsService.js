/**
 * Screen Diagnostics Service
 *
 * Frontend service for fetching comprehensive screen diagnostics
 * including content resolution, source information, and playback analytics.
 */

import { supabase } from '../supabase';

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
