// Dashboard Service - Stats and summary data for the dashboard
import { supabase } from '../supabase';

// Constants for online status detection
export const ONLINE_THRESHOLD_MS = 2 * 60 * 1000; // 2 minutes
export const ONLINE_THRESHOLD_MINUTES = 2;

/**
 * Check if a device is considered online based on last_seen timestamp
 * @param {string|Date} lastSeen - Last seen timestamp
 * @returns {boolean} Whether the device is online
 */
export function isDeviceOnline(lastSeen) {
  if (!lastSeen) return false;
  const lastSeenDate = new Date(lastSeen);
  return (Date.now() - lastSeenDate.getTime()) < ONLINE_THRESHOLD_MS;
}

/**
 * Get dashboard statistics for screens, playlists, and media
 * Uses optimized database function to avoid fetching all records
 * @returns {Promise<Object>} Dashboard stats
 */
export async function getDashboardStats() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User must be authenticated');

  // Use optimized database function - single query instead of fetching all rows
  const { data, error } = await supabase.rpc('get_dashboard_stats');

  if (error) {
    console.error('Error fetching dashboard stats:', error);
    // Fallback to legacy method if function doesn't exist
    if (error.code === 'PGRST202') {
      return getDashboardStatsLegacy();
    }
    throw error;
  }

  // Normalize the response to match expected format
  return {
    screens: {
      total: data?.screens?.total || 0,
      online: data?.screens?.online || 0,
      offline: data?.screens?.offline || 0
    },
    playlists: {
      total: data?.playlists?.total || 0
    },
    media: {
      total: data?.media?.total || 0,
      images: data?.media?.images || 0,
      videos: data?.media?.videos || 0,
      audio: data?.media?.audio || 0,
      documents: data?.media?.documents || 0,
      webPages: data?.media?.web_pages || 0,
      apps: data?.media?.apps || 0
    }
  };
}

/**
 * Legacy fallback for getDashboardStats (unbounded queries)
 * Used only if the optimized database function is not available
 * @deprecated Use get_dashboard_stats() database function instead
 * @returns {Promise<Object>} Dashboard stats
 */
async function getDashboardStatsLegacy() {
  console.warn('Using legacy getDashboardStats - consider running migration 108');

  const [screensResult, playlistsResult, mediaResult] = await Promise.all([
    supabase.from('tv_devices').select('id, is_online, last_seen'),
    supabase.from('playlists').select('id'),
    supabase.from('media_assets').select('id, type')
  ]);

  if (screensResult.error) throw screensResult.error;
  if (playlistsResult.error) throw playlistsResult.error;
  if (mediaResult.error) throw mediaResult.error;

  const screens = screensResult.data || [];
  const playlists = playlistsResult.data || [];
  const media = mediaResult.data || [];

  const onlineScreens = screens.filter(s => isDeviceOnline(s.last_seen)).length;

  const mediaByType = media.reduce((acc, item) => {
    const type = item.type || 'other';
    acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, {});

  return {
    screens: {
      total: screens.length,
      online: onlineScreens,
      offline: screens.length - onlineScreens
    },
    playlists: {
      total: playlists.length
    },
    media: {
      total: media.length,
      images: mediaByType.image || 0,
      videos: mediaByType.video || 0,
      audio: mediaByType.audio || 0,
      documents: mediaByType.document || 0,
      webPages: mediaByType.web_page || 0,
      apps: mediaByType.app || 0
    }
  };
}

/**
 * Get top screens for dashboard display
 * @param {number} limit - Number of screens to return (default 5)
 * @returns {Promise<Array>} Top screens with playlist and layout info
 */
export async function getTopScreens(limit = 5) {
  const { data, error } = await supabase
    .from('tv_devices')
    .select(`
      id,
      device_name,
      last_seen,
      is_online,
      assigned_playlist:playlists(id, name),
      assigned_layout:layouts(id, name)
    `)
    .order('last_seen', { ascending: false, nullsFirst: false })
    .limit(limit);

  if (error) throw error;

  // Calculate online status using shared threshold
  return (data || []).map(screen => ({
    ...screen,
    isOnline: isDeviceOnline(screen.last_seen)
  }));
}

/**
 * Get recent playlists
 * @param {number} limit - Number of playlists to return (default 5)
 * @returns {Promise<Array>} Recent playlists
 */
export async function getRecentPlaylists(limit = 5) {
  const { data, error } = await supabase
    .from('playlists')
    .select(`
      id,
      name,
      created_at,
      updated_at
    `)
    .order('updated_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data || [];
}

/**
 * Get recent media uploads
 * @param {number} limit - Number of media items to return (default 5)
 * @returns {Promise<Array>} Recent media assets
 */
export async function getRecentMedia(limit = 5) {
  const { data, error } = await supabase
    .from('media_assets')
    .select(`
      id,
      name,
      type,
      thumbnail_url,
      created_at
    `)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data || [];
}

/**
 * Format last seen time as relative string
 * @param {string|Date} lastSeen - Timestamp to format
 * @param {boolean} includeExact - Whether to include exact time in output
 * @returns {string|{relative: string, exact: string}} Formatted time
 */
export function formatLastSeen(lastSeen, includeExact = false) {
  if (!lastSeen) return includeExact ? { relative: 'Never', exact: null } : 'Never';

  const date = new Date(lastSeen);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);

  let relative;
  if (diffMins < 1) relative = 'Just now';
  else if (diffMins < 60) relative = `${diffMins}m ago`;
  else {
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) relative = `${diffHours}h ago`;
    else {
      const diffDays = Math.floor(diffHours / 24);
      relative = `${diffDays}d ago`;
    }
  }

  if (includeExact) {
    return {
      relative,
      exact: date.toLocaleString()
    };
  }
  return relative;
}

/**
 * Get devices with health issues (offline for extended periods, never connected, etc.)
 * Uses optimized database function that only returns devices with issues
 * @param {number} limit - Maximum number of issues to return (default 50)
 * @returns {Promise<Array>} Devices with issues
 */
export async function getDeviceHealthIssues(limit = 50) {
  // Try optimized database function first
  const { data, error } = await supabase.rpc('get_device_health_issues', {
    issue_limit: limit
  });

  if (error) {
    console.error('Error fetching device health issues:', error);
    // Fallback to legacy method if function doesn't exist
    if (error.code === 'PGRST202') {
      return getDeviceHealthIssuesLegacy();
    }
    throw error;
  }

  return data || [];
}

/**
 * Legacy fallback for getDeviceHealthIssues (unbounded query)
 * @deprecated Use get_device_health_issues() database function instead
 * @returns {Promise<Array>} Devices with issues
 */
async function getDeviceHealthIssuesLegacy() {
  console.warn('Using legacy getDeviceHealthIssues - consider running migration 108');

  const { data, error } = await supabase
    .from('tv_devices')
    .select('id, device_name, last_seen, is_online, created_at')
    .order('last_seen', { ascending: true, nullsFirst: true });

  if (error) throw error;

  const devices = data || [];
  const issues = [];
  const now = Date.now();
  const HOUR_MS = 60 * 60 * 1000;
  const DAY_MS = 24 * HOUR_MS;

  for (const device of devices) {
    const lastSeenDate = device.last_seen ? new Date(device.last_seen) : null;
    const timeSinceLastSeen = lastSeenDate ? now - lastSeenDate.getTime() : null;

    if (!device.last_seen) {
      issues.push({
        deviceId: device.id,
        deviceName: device.device_name || 'Unnamed Device',
        issueType: 'never_connected',
        severity: 'warning',
        message: 'Device has never connected'
      });
    } else if (timeSinceLastSeen > DAY_MS) {
      const daysOffline = Math.floor(timeSinceLastSeen / DAY_MS);
      issues.push({
        deviceId: device.id,
        deviceName: device.device_name || 'Unnamed Device',
        issueType: 'offline_extended',
        severity: daysOffline > 7 ? 'critical' : 'warning',
        message: `Offline for ${daysOffline} day${daysOffline > 1 ? 's' : ''}`,
        lastSeen: device.last_seen
      });
    } else if (timeSinceLastSeen > HOUR_MS) {
      const hoursOffline = Math.floor(timeSinceLastSeen / HOUR_MS);
      issues.push({
        deviceId: device.id,
        deviceName: device.device_name || 'Unnamed Device',
        issueType: 'offline',
        severity: 'info',
        message: `Offline for ${hoursOffline} hour${hoursOffline > 1 ? 's' : ''}`,
        lastSeen: device.last_seen
      });
    }
  }

  return issues;
}

/**
 * Get a quick summary of alerts for the dashboard
 * Uses optimized database function
 * @returns {Promise<Object>} Alert summary
 */
export async function getAlertSummary() {
  // Try optimized database function first
  const { data, error } = await supabase.rpc('get_alert_summary', {
    top_issues_limit: 3
  });

  if (error) {
    console.error('Error fetching alert summary:', error);
    // Fallback to legacy method if function doesn't exist
    if (error.code === 'PGRST202') {
      return getAlertSummaryLegacy();
    }
    throw error;
  }

  return {
    total: data?.total || 0,
    critical: data?.critical || 0,
    warning: data?.warning || 0,
    info: data?.info || 0,
    topIssues: data?.topIssues || []
  };
}

/**
 * Legacy fallback for getAlertSummary
 * @deprecated Use get_alert_summary() database function instead
 * @returns {Promise<Object>} Alert summary
 */
async function getAlertSummaryLegacy() {
  const issues = await getDeviceHealthIssuesLegacy();

  return {
    total: issues.length,
    critical: issues.filter(i => i.severity === 'critical').length,
    warning: issues.filter(i => i.severity === 'warning').length,
    info: issues.filter(i => i.severity === 'info').length,
    topIssues: issues.slice(0, 3)
  };
}

/**
 * Get recent activity for the dashboard (combined playlists and media)
 * @param {number} limit - Number of items to return
 * @returns {Promise<Array>} Recent activity items
 */
export async function getRecentActivity(limit = 5) {
  const [playlists, media] = await Promise.all([
    getRecentPlaylists(limit),
    getRecentMedia(limit)
  ]);

  // Combine and sort by most recent
  const activities = [
    ...playlists.map(p => ({
      id: p.id,
      type: 'playlist',
      name: p.name,
      timestamp: p.updated_at || p.created_at,
      action: p.updated_at > p.created_at ? 'updated' : 'created'
    })),
    ...media.map(m => ({
      id: m.id,
      type: 'media',
      name: m.name,
      thumbnail: m.thumbnail_url,
      mediaType: m.type,
      timestamp: m.created_at,
      action: 'uploaded'
    }))
  ];

  // Sort by timestamp descending
  activities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  return activities.slice(0, limit);
}
