/**
 * Notification Dispatcher Service
 *
 * Handles dispatching notifications to users based on their preferences.
 * Supports in-app notifications and email notifications.
 */

import { supabase } from '../supabase';
import { createScopedLogger } from './loggingService.js';

const logger = createScopedLogger('NotificationDispatcher');

// ============================================================================
// NOTIFICATION CHANNELS
// ============================================================================

export const NOTIFICATION_CHANNELS = {
  IN_APP: 'in_app',
  EMAIL: 'email',
};

// Severity levels for comparison
const SEVERITY_LEVELS = {
  info: 1,
  warning: 2,
  critical: 3,
};

// ============================================================================
// DISPATCH NOTIFICATIONS
// ============================================================================

/**
 * Dispatch notifications for an alert to all eligible users
 *
 * @param {Object} alert The alert object
 * @param {boolean} isNewAlert Whether this is a new alert (vs. coalesced)
 * @returns {Promise<{inApp: number, email: number}>} Count of notifications sent
 */
export async function dispatchAlertNotifications(alert, isNewAlert = true) {
  try {
    // Get users who should be notified
    const users = await getUsersToNotify(alert);

    let inAppCount = 0;
    let emailCount = 0;

    for (const user of users) {
      // Create in-app notification
      if (user.channel_in_app) {
        const created = await createInAppNotification(user.user_id, alert);
        if (created) inAppCount++;
      }

      // Queue email notification (only for new alerts to avoid spam)
      if (user.channel_email && isNewAlert) {
        const queued = await queueEmailNotification(user, alert);
        if (queued) emailCount++;
      }
    }

    logger.info('Dispatched alert notifications', { alertId: alert.id, inAppCount, emailCount });
    return { inApp: inAppCount, email: emailCount };
  } catch (error) {
    logger.error('Error dispatching notifications', { error });
    return { inApp: 0, email: 0 };
  }
}

/**
 * Get users who should receive notifications for an alert
 */
async function getUsersToNotify(alert) {
  try {
    // Get all users in the tenant with their notification preferences
    const { data: profiles, error: profileError } = await supabase
      .from('profiles')
      .select('id, role, full_name, tenant_id')
      .eq('tenant_id', alert.tenant_id)
      .in('role', ['owner', 'admin', 'editor']);

    if (profileError || !profiles) {
      logger.error('Error fetching profiles', { error: profileError });
      return [];
    }

    // Get notification preferences for these users
    const userIds = profiles.map((p) => p.id);
    const { data: preferences } = await supabase
      .from('notification_preferences')
      .select('*')
      .eq('tenant_id', alert.tenant_id)
      .in('user_id', userIds);

    const prefsMap = new Map((preferences || []).map((p) => [p.user_id, p]));

    // Get user emails
    const { data: authUsers } = await supabase.auth.admin
      ? await supabase.rpc('get_users_by_ids', { user_ids: userIds })
      : { data: [] };

    // For non-admin context, we'll use profiles
    const eligibleUsers = [];

    for (const profile of profiles) {
      const prefs = prefsMap.get(profile.id);

      // Check if user wants this type of notification
      if (!shouldNotifyUser(prefs, alert)) {
        continue;
      }

      eligibleUsers.push({
        user_id: profile.id,
        email: authUsers?.find((u) => u.id === profile.id)?.email,
        full_name: profile.full_name,
        channel_in_app: prefs?.channel_in_app ?? true,
        channel_email: prefs?.channel_email ?? true,
      });
    }

    return eligibleUsers;
  } catch (error) {
    logger.error('Error getting users to notify', { error });
    return [];
  }
}

/**
 * Check if a user should receive notifications based on their preferences
 */
function shouldNotifyUser(prefs, alert) {
  // Default preferences if none set
  if (!prefs) {
    return true; // Notify by default
  }

  // Check severity threshold
  const minSeverity = prefs.min_severity || 'warning';
  if (SEVERITY_LEVELS[alert.severity] < SEVERITY_LEVELS[minSeverity]) {
    return false;
  }

  // Check whitelist (if set, only these types)
  if (prefs.types_whitelist && prefs.types_whitelist.length > 0) {
    if (!prefs.types_whitelist.includes(alert.type)) {
      return false;
    }
  }

  // Check blacklist (if set, exclude these types)
  if (prefs.types_blacklist && prefs.types_blacklist.length > 0) {
    if (prefs.types_blacklist.includes(alert.type)) {
      return false;
    }
  }

  // Check quiet hours
  if (prefs.quiet_hours_start && prefs.quiet_hours_end) {
    if (isInQuietHours(prefs)) {
      return false;
    }
  }

  return true;
}

/**
 * Check if current time is within user's quiet hours
 */
function isInQuietHours(prefs) {
  try {
    const now = new Date();
    const tz = prefs.quiet_hours_timezone || 'UTC';

    // Get current time in user's timezone
    const timeString = now.toLocaleTimeString('en-US', {
      hour12: false,
      timeZone: tz,
    });

    const [hours, minutes] = timeString.split(':').map(Number);
    const currentMinutes = hours * 60 + minutes;

    const [startHours, startMinutes] = prefs.quiet_hours_start.split(':').map(Number);
    const [endHours, endMinutes] = prefs.quiet_hours_end.split(':').map(Number);

    const startTotalMinutes = startHours * 60 + startMinutes;
    const endTotalMinutes = endHours * 60 + endMinutes;

    // Handle overnight quiet hours (e.g., 22:00 - 07:00)
    if (startTotalMinutes > endTotalMinutes) {
      return currentMinutes >= startTotalMinutes || currentMinutes <= endTotalMinutes;
    }

    return currentMinutes >= startTotalMinutes && currentMinutes <= endTotalMinutes;
  } catch (error) {
    logger.error('Error checking quiet hours', { error });
    return false;
  }
}

// ============================================================================
// IN-APP NOTIFICATIONS
// ============================================================================

/**
 * Create an in-app notification for a user
 */
async function createInAppNotification(userId, alert) {
  try {
    const actionUrl = getAlertActionUrl(alert);

    const { error } = await supabase.from('notifications').insert({
      user_id: userId,
      tenant_id: alert.tenant_id,
      alert_id: alert.id,
      channel: NOTIFICATION_CHANNELS.IN_APP,
      title: alert.title,
      message: alert.message,
      severity: alert.severity,
      alert_type: alert.type,
      action_url: actionUrl,
    });

    if (error) {
      logger.error('Error creating in-app notification', { error });
      return false;
    }

    return true;
  } catch (error) {
    logger.error('Error creating in-app notification', { error });
    return false;
  }
}

/**
 * Dispatch "resolved" notifications for an alert
 * Sends a follow-up notification to let users know the issue is fixed
 *
 * @param {Object} alert The resolved alert object
 * @param {string} notes Resolution notes
 * @returns {Promise<{inApp: number}>} Count of notifications sent
 */
export async function dispatchResolvedNotification(alert, notes = 'Issue resolved') {
  try {
    // Only send resolved notifications for critical/warning alerts
    if (alert.severity === 'info') {
      return { inApp: 0 };
    }

    const users = await getUsersToNotify(alert);
    let inAppCount = 0;

    for (const user of users) {
      if (user.channel_in_app) {
        const created = await createResolvedNotification(user.user_id, alert, notes);
        if (created) inAppCount++;
      }
    }

    logger.info('Dispatched resolved notification', { alertId: alert.id, inAppCount });
    return { inApp: inAppCount };
  } catch (error) {
    logger.error('Error dispatching resolved notification', { error });
    return { inApp: 0 };
  }
}

/**
 * Create a "resolved" in-app notification
 */
async function createResolvedNotification(userId, alert, notes) {
  try {
    const { error } = await supabase.from('notifications').insert({
      user_id: userId,
      tenant_id: alert.tenant_id,
      alert_id: alert.id,
      channel: NOTIFICATION_CHANNELS.IN_APP,
      title: `✓ Resolved: ${alert.title}`,
      message: notes,
      severity: 'info', // Resolved notifications are info level
      alert_type: alert.type,
      action_url: '/alerts',
    });

    if (error) {
      logger.error('Error creating resolved notification', { error });
      return false;
    }

    return true;
  } catch (error) {
    logger.error('Error creating resolved notification', { error });
    return false;
  }
}

/**
 * Get the action URL for an alert (where to navigate when clicked)
 */
function getAlertActionUrl(alert) {
  if (alert.device_id) {
    return `/screens?highlight=${alert.device_id}`;
  }
  if (alert.scene_id) {
    return `/scenes/${alert.scene_id}`;
  }
  if (alert.schedule_id) {
    return `/schedules/${alert.schedule_id}`;
  }
  if (alert.data_source_id) {
    return `/data-sources?highlight=${alert.data_source_id}`;
  }
  return '/alerts';
}

// ============================================================================
// EMAIL NOTIFICATIONS
// ============================================================================

/**
 * Queue an email notification for a user
 */
async function queueEmailNotification(user, alert) {
  try {
    // Store email notification record (actual sending would be handled by a worker)
    const { error } = await supabase.from('notifications').insert({
      user_id: user.user_id,
      tenant_id: alert.tenant_id,
      alert_id: alert.id,
      channel: NOTIFICATION_CHANNELS.EMAIL,
      title: alert.title,
      message: alert.message,
      severity: alert.severity,
      alert_type: alert.type,
    });

    if (error) {
      logger.error('Error queueing email notification', { error });
      return false;
    }

    // In production, this would trigger an email worker
    // For now, we just log that an email should be sent
    logger.info('Email queued', { recipient: user.email || user.user_id, alertTitle: alert.title });

    return true;
  } catch (error) {
    logger.error('Error queueing email notification', { error });
    return false;
  }
}

/**
 * Send email notification (stub - would use email service in production)
 */
export async function sendEmailNotification(notification) {
  try {
    // In production, this would call an email service (SendGrid, Postmark, etc.)
    // For now, we just mark it as sent

    const { error } = await supabase
      .from('notifications')
      .update({ email_sent_at: new Date().toISOString() })
      .eq('id', notification.id);

    if (error) {
      logger.error('Error marking email as sent', { error });
      return false;
    }

    logger.info('Email sent', { notificationId: notification.id });
    return true;
  } catch (error) {
    logger.error('Error sending email', { error });
    return false;
  }
}

// ============================================================================
// FETCH NOTIFICATIONS
// ============================================================================

/**
 * Get notifications for the current user
 *
 * @param {Object} [options] Filter options
 * @param {boolean} [options.unreadOnly] Only return unread notifications
 * @param {string} [options.channel] Filter by channel
 * @param {number} [options.limit] Max results
 * @returns {Promise<Array>}
 */
export async function getNotifications({
  unreadOnly = false,
  channel = NOTIFICATION_CHANNELS.IN_APP,
  limit = 50,
} = {}) {
  try {
    const { data: user } = await supabase.auth.getUser();
    if (!user?.user?.id) {
      return [];
    }

    let query = supabase
      .from('notifications')
      .select(
        `
        *,
        alert:alerts(id, type, severity, status, device_id, scene_id)
      `
      )
      .eq('user_id', user.user.id)
      .eq('channel', channel)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (unreadOnly) {
      query = query.is('read_at', null);
    }

    const { data, error } = await query;

    if (error) {
      logger.error('Error fetching notifications', { error });
      return [];
    }

    return data || [];
  } catch (error) {
    logger.error('Error fetching notifications', { error });
    return [];
  }
}

/**
 * Get unread notification count for the current user
 *
 * @returns {Promise<number>}
 */
export async function getUnreadCount() {
  try {
    const { data: user } = await supabase.auth.getUser();
    if (!user?.user?.id) {
      return 0;
    }

    const { count, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.user.id)
      .eq('channel', NOTIFICATION_CHANNELS.IN_APP)
      .is('read_at', null);

    if (error) {
      logger.error('Error fetching unread count', { error });
      return 0;
    }

    return count || 0;
  } catch (error) {
    logger.error('Error fetching unread count', { error });
    return 0;
  }
}

/**
 * Mark notifications as read
 *
 * @param {string[]} [notificationIds] Specific notification IDs (or null for all)
 * @returns {Promise<number>} Number of notifications marked read
 */
export async function markAsRead(notificationIds = null) {
  try {
    const { data: user } = await supabase.auth.getUser();
    if (!user?.user?.id) {
      return 0;
    }

    let query = supabase
      .from('notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('user_id', user.user.id)
      .eq('channel', NOTIFICATION_CHANNELS.IN_APP)
      .is('read_at', null);

    if (notificationIds && notificationIds.length > 0) {
      query = query.in('id', notificationIds);
    }

    const { data, error } = await query.select();

    if (error) {
      logger.error('Error marking notifications as read', { error });
      return 0;
    }

    return data?.length || 0;
  } catch (error) {
    logger.error('Error marking notifications as read', { error });
    return 0;
  }
}

/**
 * Mark a notification as clicked (viewed details)
 *
 * @param {string} notificationId Notification ID
 * @returns {Promise<boolean>}
 */
export async function markAsClicked(notificationId) {
  try {
    const { error } = await supabase
      .from('notifications')
      .update({
        clicked_at: new Date().toISOString(),
        read_at: new Date().toISOString(),
      })
      .eq('id', notificationId);

    if (error) {
      logger.error('Error marking notification as clicked', { error });
      return false;
    }

    return true;
  } catch (error) {
    logger.error('Error marking notification as clicked', { error });
    return false;
  }
}

// ============================================================================
// NOTIFICATION PREFERENCES
// ============================================================================

/**
 * Get notification preferences for the current user
 *
 * @returns {Promise<Object|null>}
 */
export async function getNotificationPreferences() {
  try {
    const { data: user } = await supabase.auth.getUser();
    if (!user?.user?.id) {
      return null;
    }

    const { data, error } = await supabase
      .from('notification_preferences')
      .select('*')
      .eq('user_id', user.user.id)
      .single();

    if (error && error.code !== 'PGRST116') {
      logger.error('Error fetching preferences', { error });
    }

    return data;
  } catch (error) {
    logger.error('Error fetching preferences', { error });
    return null;
  }
}

/**
 * Save notification preferences for the current user
 *
 * @param {Object} preferences Preference settings
 * @returns {Promise<Object|null>}
 */
export async function saveNotificationPreferences(preferences) {
  try {
    const { data: user } = await supabase.auth.getUser();
    if (!user?.user?.id) {
      throw new Error('Not authenticated');
    }

    // Get user's tenant
    const { data: profile } = await supabase
      .from('profiles')
      .select('tenant_id')
      .eq('id', user.user.id)
      .single();

    if (!profile?.tenant_id) {
      throw new Error('No tenant found');
    }

    const { data, error } = await supabase
      .from('notification_preferences')
      .upsert(
        {
          user_id: user.user.id,
          tenant_id: profile.tenant_id,
          ...preferences,
        },
        { onConflict: 'user_id,tenant_id' }
      )
      .select()
      .single();

    if (error) {
      logger.error('Error saving preferences', { error });
      throw error;
    }

    return data;
  } catch (error) {
    logger.error('Error saving preferences', { error });
    throw error;
  }
}
