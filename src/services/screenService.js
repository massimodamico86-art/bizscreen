// Screen Service - CRUD operations for TV devices (screens)
import { supabase } from '../supabase';
import { logActivity, ACTIONS, RESOURCE_TYPES } from './activityLogService';

/**
 * Fetch all screens for the current user
 */
export async function fetchScreens({ search = '', limit = 100 } = {}) {
  let query = supabase
    .from('tv_devices')
    .select(`
      *,
      listing:listings(id, name, address),
      assigned_playlist:playlists(id, name),
      assigned_layout:layouts(id, name),
      assigned_schedule:schedules(id, name)
    `)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (search) {
    query = query.ilike('device_name', `%${search}%`);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

/**
 * Get a single screen by ID
 */
export async function getScreen(id) {
  const { data, error } = await supabase
    .from('tv_devices')
    .select(`
      *,
      listing:listings(id, name, address),
      assigned_playlist:playlists(id, name),
      assigned_layout:layouts(id, name),
      assigned_schedule:schedules(id, name)
    `)
    .eq('id', id)
    .single();

  if (error) throw error;
  return data;
}

/**
 * Update a screen
 */
export async function updateScreen(id, updates) {
  const allowedFields = [
    'device_name', 'assigned_playlist_id', 'assigned_layout_id',
    'assigned_schedule_id', 'screen_group_id', 'latitude', 'longitude', 'timezone'
  ];

  const filteredUpdates = {};
  for (const key of allowedFields) {
    if (key in updates) {
      filteredUpdates[key] = updates[key];
    }
  }

  // Check if this is an assignment update
  const isAssignmentUpdate = 'assigned_playlist_id' in updates ||
    'assigned_layout_id' in updates ||
    'assigned_schedule_id' in updates;

  const { data, error } = await supabase
    .from('tv_devices')
    .update(filteredUpdates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;

  // Log activity for assignment updates
  if (isAssignmentUpdate && data) {
    logActivity(
      ACTIONS.SCREEN_ASSIGNMENT_UPDATED,
      RESOURCE_TYPES.SCREEN,
      data.id,
      data.device_name,
      { updates: filteredUpdates }
    );
  }

  return data;
}

/**
 * Assign a playlist to a screen
 */
export async function assignPlaylistToScreen(screenId, playlistId) {
  return updateScreen(screenId, { assigned_playlist_id: playlistId });
}

/**
 * Assign a layout to a screen
 */
export async function assignLayoutToScreen(screenId, layoutId) {
  return updateScreen(screenId, { assigned_layout_id: layoutId });
}

/**
 * Assign a schedule to a screen
 */
export async function assignScheduleToScreen(screenId, scheduleId) {
  return updateScreen(screenId, { assigned_schedule_id: scheduleId });
}

/**
 * Clear all content assignments from a screen
 */
export async function clearScreenAssignments(screenId) {
  return updateScreen(screenId, {
    assigned_playlist_id: null,
    assigned_layout_id: null,
    assigned_schedule_id: null
  });
}

/**
 * Update screen location
 */
export async function updateScreenLocation(screenId, { latitude, longitude, timezone }) {
  return updateScreen(screenId, { latitude, longitude, timezone });
}

/**
 * Get screens with a specific playlist assigned
 */
export async function getScreensByPlaylist(playlistId) {
  const { data, error } = await supabase
    .from('tv_devices')
    .select('*')
    .eq('assigned_playlist_id', playlistId);

  if (error) throw error;
  return data || [];
}

/**
 * Get screens with a specific layout assigned
 */
export async function getScreensByLayout(layoutId) {
  const { data, error } = await supabase
    .from('tv_devices')
    .select('*')
    .eq('assigned_layout_id', layoutId);

  if (error) throw error;
  return data || [];
}

/**
 * Get online/offline counts
 */
export async function getScreenStats() {
  const { data, error } = await supabase
    .from('tv_devices')
    .select('is_online');

  if (error) throw error;

  const online = (data || []).filter(s => s.is_online).length;
  const offline = (data || []).length - online;

  return { total: (data || []).length, online, offline };
}

/**
 * Check if a screen is online (last seen within 2 minutes)
 */
export function isScreenOnline(screen) {
  if (!screen.last_seen) return false;
  const lastSeen = new Date(screen.last_seen);
  const now = new Date();
  const diffMs = now - lastSeen;
  return diffMs < 2 * 60 * 1000; // 2 minutes
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

/**
 * Generate a cryptographically secure random 6-character OTP code
 * Uses Web Crypto API for browser-safe secure randomness
 */
export function generateOtpCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Excluding confusing chars like 0, O, I, 1
  const randomValues = new Uint8Array(6);
  crypto.getRandomValues(randomValues);
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(randomValues[i] % chars.length);
  }
  return code;
}

/**
 * Create a new screen with auto-generated OTP code
 */
export async function createScreen({ name }) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User must be authenticated');

  const otpCode = generateOtpCode();

  const { data, error } = await supabase
    .from('tv_devices')
    .insert({
      owner_id: user.id,
      device_name: name,
      otp_code: otpCode
    })
    .select(`
      *,
      assigned_playlist:playlists(id, name),
      assigned_layout:layouts(id, name),
      assigned_schedule:schedules(id, name)
    `)
    .single();

  if (error) throw error;

  // Log activity
  if (data) {
    logActivity(
      ACTIONS.SCREEN_CREATED,
      RESOURCE_TYPES.SCREEN,
      data.id,
      data.device_name
    );
  }

  return data;
}

/**
 * Delete a screen
 */
export async function deleteScreen(id) {
  // Get screen info before deleting for logging
  const { data: screen } = await supabase
    .from('tv_devices')
    .select('id, device_name')
    .eq('id', id)
    .single();

  const { error } = await supabase
    .from('tv_devices')
    .delete()
    .eq('id', id);

  if (error) throw error;

  // Log activity
  if (screen) {
    logActivity(
      ACTIONS.SCREEN_DELETED,
      RESOURCE_TYPES.SCREEN,
      screen.id,
      screen.device_name
    );
  }

  return true;
}

/**
 * Get a screen by OTP code (for player pairing)
 */
export async function getScreenByOtp(otpCode) {
  const { data, error } = await supabase
    .from('tv_devices')
    .select(`
      *,
      assigned_playlist:playlists(id, name, default_duration, transition_effect, shuffle),
      assigned_layout:layouts(id, name),
      assigned_schedule:schedules(id, name)
    `)
    .eq('otp_code', otpCode.toUpperCase())
    .single();

  if (error) throw error;
  return data;
}

/**
 * Update last_seen timestamp for a screen
 */
export async function updateLastSeen(screenId) {
  const { data, error } = await supabase
    .from('tv_devices')
    .update({ last_seen: new Date().toISOString() })
    .eq('id', screenId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Get player content for a screen (playlist items with media)
 */
export async function getPlayerContent(screenId) {
  // First get the screen with its playlist
  const { data: screen, error: screenError } = await supabase
    .from('tv_devices')
    .select(`
      *,
      assigned_playlist:playlists(
        id, name, default_duration, transition_effect, shuffle
      )
    `)
    .eq('id', screenId)
    .single();

  if (screenError) throw screenError;
  if (!screen) throw new Error('Screen not found');

  // Update last_seen
  await updateLastSeen(screenId);

  // If no playlist assigned, return empty items
  if (!screen.assigned_playlist_id) {
    return {
      device: screen,
      playlist: null,
      items: []
    };
  }

  // Fetch playlist items with media assets
  const { data: items, error: itemsError } = await supabase
    .from('playlist_items')
    .select(`
      id,
      position,
      duration,
      item_type,
      item_id,
      media:media_assets(id, name, type, url, thumbnail_url, duration, width, height)
    `)
    .eq('playlist_id', screen.assigned_playlist_id)
    .order('position', { ascending: true });

  if (itemsError) throw itemsError;

  // Format items for player
  const formattedItems = (items || []).map(item => ({
    id: item.id,
    position: item.position,
    type: item.item_type,
    mediaType: item.media?.type || 'unknown',
    url: item.media?.url || '',
    thumbnailUrl: item.media?.thumbnail_url || '',
    name: item.media?.name || '',
    duration: item.duration || item.media?.duration || screen.assigned_playlist?.default_duration || 10,
    width: item.media?.width,
    height: item.media?.height
  }));

  return {
    device: {
      id: screen.id,
      name: screen.device_name,
      timezone: screen.timezone
    },
    playlist: screen.assigned_playlist ? {
      id: screen.assigned_playlist.id,
      name: screen.assigned_playlist.name,
      defaultDuration: screen.assigned_playlist.default_duration,
      transitionEffect: screen.assigned_playlist.transition_effect,
      shuffle: screen.assigned_playlist.shuffle
    } : null,
    items: formattedItems
  };
}

/**
 * Get player content by OTP code (convenience function)
 */
export async function getPlayerContentByOtp(otpCode) {
  const screen = await getScreenByOtp(otpCode);
  if (!screen) throw new Error('Screen not found');
  return getPlayerContent(screen.id);
}

// ============================================
// DEVICE COMMANDS (Phase 17)
// ============================================

/**
 * Send a command to a device
 * @param {string} deviceId - The device/screen UUID
 * @param {string} commandType - One of: 'reboot', 'reload', 'reset', 'clear_cache'
 * @param {object} payload - Optional command payload
 */
export async function sendDeviceCommand(deviceId, commandType, payload = {}) {
  const { data, error } = await supabase.rpc('send_device_command', {
    p_device_id: deviceId,
    p_command_type: commandType,
    p_payload: payload
  });

  if (error) throw error;

  if (!data?.success) {
    throw new Error(data?.error || 'Failed to send command');
  }

  // Log activity
  const screen = await getScreen(deviceId).catch(() => null);
  if (screen) {
    logActivity(
      ACTIONS.SCREEN_COMMAND_SENT || 'screen_command_sent',
      RESOURCE_TYPES.SCREEN,
      deviceId,
      screen.device_name,
      { commandType, payload }
    );
  }

  return data;
}

/**
 * Reboot a device (reloads the player page)
 */
export async function rebootDevice(deviceId) {
  return sendDeviceCommand(deviceId, 'reboot');
}

/**
 * Reload content on a device (fetches fresh content)
 */
export async function reloadDeviceContent(deviceId) {
  return sendDeviceCommand(deviceId, 'reload');
}

/**
 * Clear the device cache
 */
export async function clearDeviceCache(deviceId) {
  return sendDeviceCommand(deviceId, 'clear_cache');
}

/**
 * Reset device to factory state (clears all local data)
 */
export async function resetDevice(deviceId) {
  return sendDeviceCommand(deviceId, 'reset');
}

/**
 * Get command history for a device
 */
export async function getDeviceCommandHistory(deviceId, limit = 20) {
  const { data, error } = await supabase.rpc('get_device_command_history', {
    p_device_id: deviceId,
    p_limit: limit
  });

  if (error) throw error;
  return data?.commands || [];
}

/**
 * Set kiosk mode on a device
 */
export async function setDeviceKioskMode(deviceId, enabled, exitPassword = null) {
  const { data, error } = await supabase.rpc('set_kiosk_mode', {
    p_device_id: deviceId,
    p_enabled: enabled,
    p_exit_password: exitPassword
  });

  if (error) throw error;

  if (!data?.success) {
    throw new Error(data?.error || 'Failed to set kiosk mode');
  }

  return data;
}

/**
 * Get extended screen info including online status and command support
 */
export async function getScreenWithStatus(id) {
  const { data, error } = await supabase
    .from('tv_devices')
    .select(`
      *,
      listing:listings(id, name, address),
      assigned_playlist:playlists(id, name),
      assigned_layout:layouts(id, name),
      assigned_schedule:schedules(id, name)
    `)
    .eq('id', id)
    .single();

  if (error) throw error;

  // Calculate online status based on last_seen_at
  const lastSeenAt = data.last_seen_at ? new Date(data.last_seen_at) : null;
  const now = new Date();
  const isOnline = lastSeenAt && (now - lastSeenAt) < 5 * 60 * 1000; // 5 minutes

  return {
    ...data,
    is_online: data.is_online ?? isOnline,
    last_seen_formatted: formatLastSeen(data.last_seen_at || data.last_seen),
    supports_commands: true,
    supports_kiosk: true
  };
}

/**
 * Fetch all screens with enhanced status info
 */
export async function fetchScreensWithStatus({ search = '', limit = 100 } = {}) {
  let query = supabase
    .from('tv_devices')
    .select(`
      *,
      listing:listings(id, name, address),
      assigned_playlist:playlists(id, name),
      assigned_layout:layouts(id, name),
      assigned_schedule:schedules(id, name)
    `)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (search) {
    query = query.ilike('device_name', `%${search}%`);
  }

  const { data, error } = await query;
  if (error) throw error;

  // Enhance each screen with status
  const now = new Date();
  return (data || []).map(screen => {
    const lastSeenAt = screen.last_seen_at ? new Date(screen.last_seen_at) : null;
    const isOnline = lastSeenAt && (now - lastSeenAt) < 5 * 60 * 1000;

    return {
      ...screen,
      is_online: screen.is_online ?? isOnline,
      last_seen_formatted: formatLastSeen(screen.last_seen_at || screen.last_seen),
      supports_commands: true,
      supports_kiosk: true
    };
  });
}
