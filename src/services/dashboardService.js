// Dashboard Service - Stats and summary data for the dashboard
import { supabase } from '../supabase';

/**
 * Get dashboard statistics for screens, playlists, and media
 * @returns {Promise<Object>} Dashboard stats
 */
export async function getDashboardStats() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User must be authenticated');

  // Fetch all counts in parallel
  const [screensResult, playlistsResult, mediaResult] = await Promise.all([
    // Screens count with online/offline breakdown
    supabase
      .from('tv_devices')
      .select('id, is_online, last_seen'),

    // Playlists count
    supabase
      .from('playlists')
      .select('id'),

    // Media assets count with type breakdown
    supabase
      .from('media_assets')
      .select('id, type')
  ]);

  if (screensResult.error) throw screensResult.error;
  if (playlistsResult.error) throw playlistsResult.error;
  if (mediaResult.error) throw mediaResult.error;

  const screens = screensResult.data || [];
  const playlists = playlistsResult.data || [];
  const media = mediaResult.data || [];

  // Calculate screen stats with 2-minute threshold
  const now = new Date();
  const onlineThresholdMs = 2 * 60 * 1000; // 2 minutes

  const onlineScreens = screens.filter(s => {
    if (!s.last_seen) return false;
    const lastSeen = new Date(s.last_seen);
    return (now - lastSeen) < onlineThresholdMs;
  }).length;

  // Calculate media type breakdown
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
 * @returns {Promise<Array>} Top screens with playlist info
 */
export async function getTopScreens(limit = 5) {
  const { data, error } = await supabase
    .from('tv_devices')
    .select(`
      id,
      device_name,
      last_seen,
      is_online,
      assigned_playlist:playlists(id, name)
    `)
    .order('last_seen', { ascending: false, nullsFirst: false })
    .limit(limit);

  if (error) throw error;

  // Calculate online status based on 2-minute threshold
  const now = new Date();
  const onlineThresholdMs = 2 * 60 * 1000;

  return (data || []).map(screen => ({
    ...screen,
    isOnline: screen.last_seen
      ? (now - new Date(screen.last_seen)) < onlineThresholdMs
      : false
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
 */
export function formatLastSeen(lastSeen) {
  if (!lastSeen) return 'Never';

  const date = new Date(lastSeen);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;

  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;

  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}
