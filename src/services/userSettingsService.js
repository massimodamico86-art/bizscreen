// User Settings Service - Manage user preferences
import { supabase } from '../supabase';
import { logActivity, ACTION_TYPES, ENTITY_TYPES } from './activityLogService';

import { createScopedLogger } from './loggingService.js';

const logger = createScopedLogger('UserSettingsService');

/**
 * Get user settings (creates default if doesn't exist)
 * @returns {Promise<object>} - User settings
 */
export async function getUserSettings() {
  try {
    const { data, error } = await supabase.rpc('get_or_create_user_settings');

    if (error) throw error;
    return data;
  } catch (error) {
    logger.error('Error getting user settings:', { error: error });
    throw error;
  }
}

/**
 * Update user settings
 * @param {object} settings - Settings to update
 * @returns {Promise<object>} - Updated settings
 */
export async function updateUserSettings(settings) {
  try {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('user_settings')
      .update(settings)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) throw error;

    // Log the settings change
    await logActivity(
      ACTION_TYPES.UPDATE,
      ENTITY_TYPES.SETTINGS,
      data.id,
      'User Settings',
      { changes: settings }
    );

    return data;
  } catch (error) {
    logger.error('Error updating user settings:', { error: error });
    throw error;
  }
}

/**
 * Reset user settings to defaults
 * @returns {Promise<object>} - Default settings
 */
export async function resetUserSettings() {
  try {
    const defaultSettings = {
      email_notifications: true,
      guest_checkin_notifications: true,
      pms_sync_notifications: true,
      tv_offline_notifications: true,
      theme: 'light',
      language: 'en',
      timezone: 'UTC',
      date_format: 'MM/DD/YYYY',
      time_format: '12h',
      default_page: 'dashboard',
      items_per_page: 10,
      show_welcome_banner: true,
      activity_tracking: true,
      analytics_enabled: true,
      auto_sync_pms: false,
      sync_frequency_hours: 24
    };

    return await updateUserSettings(defaultSettings);
  } catch (error) {
    logger.error('Error resetting user settings:', { error: error });
    throw error;
  }
}

/**
 * Get notification preferences
 * @returns {Promise<object>} - Notification settings
 */
export async function getNotificationPreferences() {
  try {
    const settings = await getUserSettings();

    return {
      emailNotifications: settings.email_notifications,
      guestCheckinNotifications: settings.guest_checkin_notifications,
      pmsSyncNotifications: settings.pms_sync_notifications,
      tvOfflineNotifications: settings.tv_offline_notifications
    };
  } catch (error) {
    logger.error('Error getting notification preferences:', { error: error });
    throw error;
  }
}

/**
 * Update notification preferences
 * @param {object} preferences - Notification preferences
 * @returns {Promise<object>} - Updated settings
 */
export async function updateNotificationPreferences(preferences) {
  const settings = {
    email_notifications: preferences.emailNotifications,
    guest_checkin_notifications: preferences.guestCheckinNotifications,
    pms_sync_notifications: preferences.pmsSyncNotifications,
    tv_offline_notifications: preferences.tvOfflineNotifications
  };

  return await updateUserSettings(settings);
}

/**
 * Get display preferences
 * @returns {Promise<object>} - Display settings
 */
export async function getDisplayPreferences() {
  try {
    const settings = await getUserSettings();

    return {
      theme: settings.theme,
      language: settings.language,
      timezone: settings.timezone,
      dateFormat: settings.date_format,
      timeFormat: settings.time_format
    };
  } catch (error) {
    logger.error('Error getting display preferences:', { error: error });
    throw error;
  }
}

/**
 * Update display preferences
 * @param {object} preferences - Display preferences
 * @returns {Promise<object>} - Updated settings
 */
export async function updateDisplayPreferences(preferences) {
  const settings = {};

  if (preferences.theme !== undefined) settings.theme = preferences.theme;
  if (preferences.language !== undefined) settings.language = preferences.language;
  if (preferences.timezone !== undefined) settings.timezone = preferences.timezone;
  if (preferences.dateFormat !== undefined) settings.date_format = preferences.dateFormat;
  if (preferences.timeFormat !== undefined) settings.time_format = preferences.timeFormat;

  return await updateUserSettings(settings);
}
