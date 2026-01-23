/**
 * Screen Telemetry Service
 *
 * Handles fetching and managing telemetry data from screens (TV devices).
 * This service retrieves telemetry events uploaded by native mobile players
 * and web players via the /api/screens/telemetry endpoint.
 */

import { supabase } from '../supabase';
import { createScopedLogger } from './loggingService.js';

const logger = createScopedLogger('ScreenTelemetry');

/**
 * Get telemetry events for a specific screen
 * @param {string} screenId - The screen/device ID
 * @param {object} options - Query options
 * @returns {Promise<Array>} - Array of telemetry events
 */
export async function getScreenTelemetry(screenId, options = {}) {
  const {
    limit = 100,
    offset = 0,
    eventType = null,
    startDate = null,
    endDate = null
  } = options;

  let query = supabase
    .from('screen_telemetry')
    .select('*')
    .eq('screen_id', screenId)
    .order('event_timestamp', { ascending: false })
    .range(offset, offset + limit - 1);

  if (eventType) {
    query = query.eq('event_type', eventType);
  }

  if (startDate) {
    query = query.gte('event_timestamp', startDate);
  }

  if (endDate) {
    query = query.lte('event_timestamp', endDate);
  }

  const { data, error } = await query;

  if (error) {
    logger.error('Failed to fetch screen telemetry', { error, screenId });
    throw error;
  }

  return data || [];
}

/**
 * Get aggregated telemetry stats for a screen
 * @param {string} screenId - The screen/device ID
 * @param {string} period - 'day' | 'week' | 'month'
 * @returns {Promise<object>} - Aggregated stats
 */
export async function getScreenTelemetryStats(screenId, period = 'day') {
  const now = new Date();
  let startDate;

  switch (period) {
    case 'week':
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case 'month':
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      break;
    default: // day
      startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  }

  const { data, error } = await supabase
    .from('screen_telemetry')
    .select('event_type, event_data')
    .eq('screen_id', screenId)
    .gte('event_timestamp', startDate.toISOString());

  if (error) {
    logger.error('Failed to fetch telemetry stats', { error, screenId });
    throw error;
  }

  // Aggregate by event type
  const stats = {
    totalEvents: data?.length || 0,
    eventTypes: {},
    errors: 0,
    contentPlays: 0,
    networkIssues: 0
  };

  (data || []).forEach(event => {
    // Count by event type
    stats.eventTypes[event.event_type] = (stats.eventTypes[event.event_type] || 0) + 1;

    // Count specific events
    if (event.event_type === 'error' || event.event_type === 'player_error') {
      stats.errors++;
    }
    if (event.event_type === 'content_play' || event.event_type === 'player_loaded') {
      stats.contentPlays++;
    }
    if (event.event_type === 'network_error' || event.event_type === 'offline') {
      stats.networkIssues++;
    }
  });

  return stats;
}

/**
 * Get telemetry for all screens owned by the current user
 * @param {object} options - Query options
 * @returns {Promise<Array>} - Array of screen telemetry summaries
 */
export async function getAllScreensTelemetry(options = {}) {
  const { period = 'day' } = options;

  const now = new Date();
  let startDate;

  switch (period) {
    case 'week':
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case 'month':
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      break;
    default:
      startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  }

  // Get screens with their recent telemetry counts
  const { data: screens, error: screensError } = await supabase
    .from('tv_devices')
    .select(`
      id,
      name,
      platform,
      is_online,
      last_seen_at,
      app_version,
      os_version,
      listing:listings(id, name)
    `);

  if (screensError) {
    logger.error('Failed to fetch screens', { error: screensError });
    throw screensError;
  }

  // Get telemetry counts per screen
  const { data: telemetryCounts, error: telemetryError } = await supabase
    .from('screen_telemetry')
    .select('screen_id, event_type')
    .gte('event_timestamp', startDate.toISOString());

  if (telemetryError) {
    logger.error('Failed to fetch telemetry counts', { error: telemetryError });
    throw telemetryError;
  }

  // Aggregate counts per screen
  const countsByScreen = {};
  (telemetryCounts || []).forEach(event => {
    if (!countsByScreen[event.screen_id]) {
      countsByScreen[event.screen_id] = {
        total: 0,
        errors: 0
      };
    }
    countsByScreen[event.screen_id].total++;
    if (event.event_type === 'error' || event.event_type === 'player_error') {
      countsByScreen[event.screen_id].errors++;
    }
  });

  // Merge data
  return (screens || []).map(screen => ({
    ...screen,
    telemetry: countsByScreen[screen.id] || { total: 0, errors: 0 }
  }));
}

/**
 * Get commands history for a screen
 * @param {string} screenId - The screen/device ID
 * @param {object} options - Query options
 * @returns {Promise<Array>} - Array of commands
 */
export async function getScreenCommands(screenId, options = {}) {
  const { limit = 50, status = null } = options;

  let query = supabase
    .from('screen_commands')
    .select('*')
    .eq('screen_id', screenId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (status) {
    query = query.eq('status', status);
  }

  const { data, error } = await query;

  if (error) {
    logger.error('Failed to fetch screen commands', { error, screenId });
    throw error;
  }

  return data || [];
}

/**
 * Send a command to a screen
 * @param {string} screenId - The screen/device ID
 * @param {string} commandType - The type of command
 * @param {object} payload - Command payload
 * @returns {Promise<object>} - Result with commandId
 */
export async function sendScreenCommand(screenId, commandType, payload = {}) {
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    throw new Error('Not authenticated');
  }

  const response = await fetch('/api/screens/commands/send', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`
    },
    body: JSON.stringify({
      screenId,
      commandType,
      payload
    })
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Failed to send command');
  }

  return data;
}

/**
 * Get health events for a screen
 * @param {string} screenId - The screen/device ID
 * @param {number} limit - Max events to return
 * @returns {Promise<Array>} - Array of health events
 */
export async function getScreenHealthEvents(screenId, limit = 20) {
  const { data, error } = await supabase
    .from('screen_health_events')
    .select('*')
    .eq('screen_id', screenId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    logger.error('Failed to fetch health events', { error, screenId });
    throw error;
  }

  return data || [];
}

/**
 * Get uptime statistics for a screen
 * @param {string} screenId - The screen/device ID
 * @param {string} period - 'day' | 'week' | 'month'
 * @returns {Promise<object>} - Uptime stats
 */
export async function getScreenUptimeStats(screenId, period = 'week') {
  const healthEvents = await getScreenHealthEvents(screenId, 500);

  if (healthEvents.length === 0) {
    return {
      uptimePercent: 100,
      downtimeMinutes: 0,
      incidents: 0
    };
  }

  const now = new Date();
  let startDate;

  switch (period) {
    case 'month':
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      break;
    case 'day':
      startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      break;
    default: // week
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  }

  const totalMinutes = (now - startDate) / (60 * 1000);

  // Calculate downtime from offline events
  let downtimeMinutes = 0;
  let incidents = 0;
  let lastOfflineTime = null;

  // Process events in chronological order
  const relevantEvents = healthEvents
    .filter(e => new Date(e.created_at) >= startDate)
    .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

  relevantEvents.forEach(event => {
    if (event.event_type === 'offline') {
      lastOfflineTime = new Date(event.created_at);
      incidents++;
    } else if (event.event_type === 'online' && lastOfflineTime) {
      const onlineTime = new Date(event.created_at);
      downtimeMinutes += (onlineTime - lastOfflineTime) / (60 * 1000);
      lastOfflineTime = null;
    }
  });

  // If still offline, count time until now
  if (lastOfflineTime) {
    downtimeMinutes += (now - lastOfflineTime) / (60 * 1000);
  }

  const uptimePercent = Math.max(0, Math.min(100,
    ((totalMinutes - downtimeMinutes) / totalMinutes) * 100
  ));

  return {
    uptimePercent: Math.round(uptimePercent * 100) / 100,
    downtimeMinutes: Math.round(downtimeMinutes),
    incidents
  };
}

export default {
  getScreenTelemetry,
  getScreenTelemetryStats,
  getAllScreensTelemetry,
  getScreenCommands,
  sendScreenCommand,
  getScreenHealthEvents,
  getScreenUptimeStats
};
