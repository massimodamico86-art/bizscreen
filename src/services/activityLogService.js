/**
 * Activity Log Service - Track user actions and changes
 *
 * Provides functions for:
 * - Logging activities (screen, playlist, layout, schedule, branding changes)
 * - Fetching activity logs with filtering
 * - Formatting activities for display
 */

import { supabase } from '../supabase';
import { getEffectiveOwnerId } from './tenantService';

import { createScopedLogger } from './loggingService.js';

const logger = createScopedLogger('ActivityLogService');

/**
 * Action codes for activity log
 */
export const ACTIONS = {
  // Screen actions
  SCREEN_CREATED: 'screen.created',
  SCREEN_UPDATED: 'screen.updated',
  SCREEN_DELETED: 'screen.deleted',
  SCREEN_ASSIGNMENT_UPDATED: 'screen.assignment_updated',

  // Playlist actions
  PLAYLIST_CREATED: 'playlist.created',
  PLAYLIST_UPDATED: 'playlist.updated',
  PLAYLIST_DELETED: 'playlist.deleted',

  // Layout actions
  LAYOUT_CREATED: 'layout.created',
  LAYOUT_UPDATED: 'layout.updated',
  LAYOUT_DELETED: 'layout.deleted',

  // Schedule actions
  SCHEDULE_CREATED: 'schedule.created',
  SCHEDULE_UPDATED: 'schedule.updated',
  SCHEDULE_DELETED: 'schedule.deleted',

  // Media actions
  MEDIA_CREATED: 'media.created',
  MEDIA_UPDATED: 'media.updated',
  MEDIA_DELETED: 'media.deleted',

  // Branding actions
  BRANDING_UPDATED: 'branding.updated',

  // User actions
  USER_LOGIN: 'user.login',
  USER_LOGOUT: 'user.logout',

  // Alert rule actions
  ALERT_RULE_CREATED: 'alert_rule.created',
  ALERT_RULE_UPDATED: 'alert_rule.updated',
  ALERT_RULE_DELETED: 'alert_rule.deleted',
};

/**
 * Resource types for activity log
 */
export const RESOURCE_TYPES = {
  SCREEN: 'screen',
  PLAYLIST: 'playlist',
  LAYOUT: 'layout',
  SCHEDULE: 'schedule',
  MEDIA: 'media',
  BRANDING: 'branding',
  USER: 'user',
  ALERT_RULE: 'alert_rule',
};

/**
 * Action labels for display
 */
export const ACTION_LABELS = {
  'screen.created': 'Screen Created',
  'screen.updated': 'Screen Updated',
  'screen.deleted': 'Screen Deleted',
  'screen.assignment_updated': 'Screen Assignment Changed',
  'playlist.created': 'Playlist Created',
  'playlist.updated': 'Playlist Updated',
  'playlist.deleted': 'Playlist Deleted',
  'layout.created': 'Layout Created',
  'layout.updated': 'Layout Updated',
  'layout.deleted': 'Layout Deleted',
  'schedule.created': 'Schedule Created',
  'schedule.updated': 'Schedule Updated',
  'schedule.deleted': 'Schedule Deleted',
  'media.created': 'Media Uploaded',
  'media.updated': 'Media Updated',
  'media.deleted': 'Media Deleted',
  'branding.updated': 'Branding Updated',
  'user.login': 'User Login',
  'user.logout': 'User Logout',
  'alert_rule.created': 'Alert Rule Created',
  'alert_rule.updated': 'Alert Rule Updated',
  'alert_rule.deleted': 'Alert Rule Deleted',
};

/**
 * Action icons for display
 */
export const ACTION_ICONS = {
  'screen.created': '📺',
  'screen.updated': '📺',
  'screen.deleted': '📺',
  'screen.assignment_updated': '🔗',
  'playlist.created': '📋',
  'playlist.updated': '📋',
  'playlist.deleted': '📋',
  'layout.created': '📐',
  'layout.updated': '📐',
  'layout.deleted': '📐',
  'schedule.created': '📅',
  'schedule.updated': '📅',
  'schedule.deleted': '📅',
  'media.created': '🖼️',
  'media.updated': '🖼️',
  'media.deleted': '🖼️',
  'branding.updated': '🎨',
  'user.login': '🔓',
  'user.logout': '🔒',
  'alert_rule.created': '🔔',
  'alert_rule.updated': '🔔',
  'alert_rule.deleted': '🔔',
};

/**
 * Log an activity
 *
 * @param {string} action - Action code (e.g., 'screen.created')
 * @param {string} resourceType - Type of resource (e.g., 'screen')
 * @param {string} resourceId - UUID of the resource (optional)
 * @param {string} resourceName - Human-readable name (optional)
 * @param {object} metadata - Additional context (optional)
 * @returns {Promise<string|null>} - Log ID or null on error
 */
export async function logActivity(action, resourceType, resourceId = null, resourceName = null, metadata = null) {
  try {
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      logger.warn('Cannot log activity: No authenticated user');
      return null;
    }

    // Get effective owner ID (respects impersonation)
    const ownerId = await getEffectiveOwnerId();
    if (!ownerId) {
      logger.warn('Cannot log activity: No owner ID');
      return null;
    }

    // Call the RPC function
    const { data, error } = await supabase.rpc('log_activity', {
      p_actor_id: user.id,
      p_owner_id: ownerId,
      p_action: action,
      p_resource_type: resourceType,
      p_resource_id: resourceId,
      p_resource_name: resourceName,
      p_metadata: metadata || {},
    });

    if (error) {
      logger.error('Error logging activity:', { error: error });
      return null;
    }

    return data;
  } catch (error) {
    logger.error('Error logging activity:', { error: error });
    // Don't throw - logging failures shouldn't break the app
    return null;
  }
}

/**
 * Get activity log for current tenant
 *
 * @param {object} options - Query options
 * @param {string} options.resourceType - Filter by resource type
 * @param {string} options.resourceId - Filter by specific resource
 * @param {number} options.days - Number of days to look back (default: 30)
 * @param {number} options.limit - Max results (default: 100)
 * @param {number} options.offset - Offset for pagination (default: 0)
 * @returns {Promise<{data: Array, error: string|null}>}
 */
export async function getActivityLog(options = {}) {
  const {
    resourceType = null,
    resourceId = null,
    days = 30,
    limit = 100,
    offset = 0,
  } = options;

  try {
    // Get effective owner ID
    const ownerId = await getEffectiveOwnerId();
    if (!ownerId) {
      return { data: [], error: 'No owner ID' };
    }

    const { data, error } = await supabase.rpc('get_activity_log', {
      p_owner_id: ownerId,
      p_resource_type: resourceType,
      p_resource_id: resourceId,
      p_days: days,
      p_limit: limit,
      p_offset: offset,
    });

    if (error) {
      logger.error('Error fetching activity log:', { error: error });
      return { data: [], error: error.message };
    }

    return { data: data || [], error: null };
  } catch (error) {
    logger.error('Error fetching activity log:', { error: error });
    return { data: [], error: error.message };
  }
}

/**
 * Get activity log count for pagination
 *
 * @param {object} options - Query options
 * @returns {Promise<{count: number, error: string|null}>}
 */
export async function getActivityLogCount(options = {}) {
  const {
    resourceType = null,
    resourceId = null,
    days = 30,
  } = options;

  try {
    const ownerId = await getEffectiveOwnerId();
    if (!ownerId) {
      return { count: 0, error: 'No owner ID' };
    }

    const { data, error } = await supabase.rpc('get_activity_log_count', {
      p_owner_id: ownerId,
      p_resource_type: resourceType,
      p_resource_id: resourceId,
      p_days: days,
    });

    if (error) {
      logger.error('Error fetching activity count:', { error: error });
      return { count: 0, error: error.message };
    }

    return { count: data || 0, error: null };
  } catch (error) {
    logger.error('Error fetching activity count:', { error: error });
    return { count: 0, error: error.message };
  }
}

/**
 * Get activity log for a specific resource
 *
 * @param {string} resourceType - Type of resource
 * @param {string} resourceId - UUID of the resource
 * @param {number} limit - Max results (default: 20)
 * @returns {Promise<{data: Array, error: string|null}>}
 */
export async function getResourceActivityLog(resourceType, resourceId, limit = 20) {
  return getActivityLog({
    resourceType,
    resourceId,
    limit,
    days: 90, // Look back further for specific resources
  });
}

/**
 * Format an activity entry for display
 *
 * @param {object} activity - Activity log entry
 * @returns {object} - Formatted activity with display properties
 */
export function formatActivity(activity) {
  const label = ACTION_LABELS[activity.action] || activity.action;
  const icon = ACTION_ICONS[activity.action] || '📝';

  // Determine color based on action type
  let color = 'text-gray-600';
  if (activity.action.includes('.created')) {
    color = 'text-green-600';
  } else if (activity.action.includes('.updated')) {
    color = 'text-blue-600';
  } else if (activity.action.includes('.deleted')) {
    color = 'text-red-600';
  } else if (activity.action === 'user.login') {
    color = 'text-purple-600';
  }

  return {
    ...activity,
    label,
    icon,
    color,
    formattedTime: formatRelativeTime(activity.created_at),
    formattedDate: formatDateTime(activity.created_at),
  };
}

/**
 * Format timestamp as relative time
 */
function formatRelativeTime(timestamp) {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;

  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString();
}

/**
 * Format timestamp as full date/time
 */
function formatDateTime(timestamp) {
  const date = new Date(timestamp);
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

/**
 * Generate a human-readable description of an activity
 *
 * @param {object} activity - Formatted activity entry
 * @returns {string} - Description
 */
export function describeActivity(activity) {
  const actor = activity.actor_name || 'Someone';
  const resource = activity.resource_name || activity.resource_type;

  switch (activity.action) {
    case ACTIONS.SCREEN_CREATED:
      return `${actor} added a new screen "${resource}"`;
    case ACTIONS.SCREEN_UPDATED:
      return `${actor} updated screen "${resource}"`;
    case ACTIONS.SCREEN_DELETED:
      return `${actor} deleted screen "${resource}"`;
    case ACTIONS.SCREEN_ASSIGNMENT_UPDATED:
      return `${actor} changed content assignments for "${resource}"`;

    case ACTIONS.PLAYLIST_CREATED:
      return `${actor} created playlist "${resource}"`;
    case ACTIONS.PLAYLIST_UPDATED:
      return `${actor} updated playlist "${resource}"`;
    case ACTIONS.PLAYLIST_DELETED:
      return `${actor} deleted playlist "${resource}"`;

    case ACTIONS.LAYOUT_CREATED:
      return `${actor} created layout "${resource}"`;
    case ACTIONS.LAYOUT_UPDATED:
      return `${actor} updated layout "${resource}"`;
    case ACTIONS.LAYOUT_DELETED:
      return `${actor} deleted layout "${resource}"`;

    case ACTIONS.SCHEDULE_CREATED:
      return `${actor} created schedule "${resource}"`;
    case ACTIONS.SCHEDULE_UPDATED:
      return `${actor} updated schedule "${resource}"`;
    case ACTIONS.SCHEDULE_DELETED:
      return `${actor} deleted schedule "${resource}"`;

    case ACTIONS.MEDIA_CREATED:
      return `${actor} uploaded "${resource}"`;
    case ACTIONS.MEDIA_UPDATED:
      return `${actor} updated "${resource}"`;
    case ACTIONS.MEDIA_DELETED:
      return `${actor} deleted "${resource}"`;

    case ACTIONS.BRANDING_UPDATED:
      return `${actor} updated branding settings`;

    case ACTIONS.USER_LOGIN:
      return `${actor} logged in`;
    case ACTIONS.USER_LOGOUT:
      return `${actor} logged out`;

    default:
      return `${actor} performed ${activity.action} on ${resource}`;
  }
}

// Legacy exports for backward compatibility
export const ACTION_TYPES = {
  CREATE: 'create',
  UPDATE: 'update',
  DELETE: 'delete',
  LOGIN: 'login',
  LOGOUT: 'logout',
  SYNC: 'sync',
  EXPORT: 'export',
  IMPORT: 'import',
  CONNECT: 'connect',
  DISCONNECT: 'disconnect',
};

export const ENTITY_TYPES = {
  LISTING: 'listing',
  GUEST: 'guest',
  TV_DEVICE: 'tv_device',
  QR_CODE: 'qr_code',
  PMS_CONNECTION: 'pms_connection',
  USER: 'user',
  SETTINGS: 'settings',
};

export default {
  logActivity,
  getActivityLog,
  getActivityLogCount,
  getResourceActivityLog,
  formatActivity,
  describeActivity,
  ACTIONS,
  RESOURCE_TYPES,
  ACTION_LABELS,
  ACTION_ICONS,
};
