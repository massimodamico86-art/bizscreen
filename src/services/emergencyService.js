/**
 * Emergency Content Override Service
 *
 * Provides tenant-wide emergency content override functionality.
 * When an emergency is active, all screens in the tenant display
 * the emergency content, overriding all schedules and campaigns.
 */

import { supabase } from '../supabase';
import { createScopedLogger } from './loggingService';

const log = createScopedLogger('EmergencyService');

/**
 * Predefined duration options for emergency content
 */
export const EMERGENCY_DURATIONS = [
  { value: 15, label: '15 minutes' },
  { value: 60, label: '1 hour' },
  { value: 240, label: '4 hours' },
  { value: null, label: 'Until manually stopped' },
];

/**
 * Check if an emergency has expired based on start time and duration
 * @param {string|Date} startedAt - When the emergency started
 * @param {number|null} durationMinutes - Duration in minutes (null = indefinite)
 * @returns {boolean} True if expired
 */
export function isEmergencyExpired(startedAt, durationMinutes) {
  // Indefinite duration never expires
  if (durationMinutes === null || durationMinutes === undefined) {
    return false;
  }

  const startTime = new Date(startedAt).getTime();
  const expiryTime = startTime + durationMinutes * 60 * 1000;
  return Date.now() > expiryTime;
}

/**
 * Get the current emergency state for the authenticated user's tenant
 * @returns {Promise<{contentId: string|null, contentType: string|null, startedAt: Date|null, durationMinutes: number|null, isActive: boolean}>}
 */
export async function getTenantEmergencyState() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    log.warn('No authenticated user');
    return { contentId: null, contentType: null, startedAt: null, durationMinutes: null, isActive: false };
  }

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('emergency_content_id, emergency_content_type, emergency_started_at, emergency_duration_minutes')
    .eq('id', user.id)
    .single();

  if (error) {
    log.error('Failed to fetch emergency state', { error: error.message });
    throw error;
  }

  const contentId = profile?.emergency_content_id || null;
  const contentType = profile?.emergency_content_type || null;
  const startedAt = profile?.emergency_started_at ? new Date(profile.emergency_started_at) : null;
  const durationMinutes = profile?.emergency_duration_minutes ?? null;

  // Calculate if emergency is active (has content and not expired)
  const isActive = contentId !== null && !isEmergencyExpired(startedAt, durationMinutes);

  log.debug('Fetched emergency state', { contentId, contentType, isActive });

  return {
    contentId,
    contentType,
    startedAt,
    durationMinutes,
    isActive,
  };
}

/**
 * Push emergency content to all tenant devices
 * @param {string} contentType - Type of content: 'playlist', 'scene', or 'media'
 * @param {string} contentId - UUID of the content to display
 * @param {number|null} durationMinutes - Duration in minutes (null = until manually stopped)
 */
export async function pushEmergencyContent(contentType, contentId, durationMinutes = null) {
  log.info('Pushing emergency content', { contentType, contentId, durationMinutes });

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('No authenticated user');
  }

  // Update the tenant's emergency state
  const { error: profileError } = await supabase
    .from('profiles')
    .update({
      emergency_content_id: contentId,
      emergency_content_type: contentType,
      emergency_started_at: new Date().toISOString(),
      emergency_duration_minutes: durationMinutes,
    })
    .eq('id', user.id);

  if (profileError) {
    log.error('Failed to set emergency state', { error: profileError.message });
    throw profileError;
  }

  // Trigger refresh on all tenant devices
  const { error: deviceError } = await supabase
    .from('tv_devices')
    .update({ needs_refresh: true })
    .eq('tenant_id', user.id);

  if (deviceError) {
    log.error('Failed to refresh devices', { error: deviceError.message });
    throw deviceError;
  }

  log.info('Emergency content pushed successfully');
}

/**
 * Stop the current emergency and restore normal content
 */
export async function stopEmergency() {
  log.info('Stopping emergency');

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('No authenticated user');
  }

  // Clear the emergency state
  const { error: profileError } = await supabase
    .from('profiles')
    .update({
      emergency_content_id: null,
      emergency_content_type: null,
      emergency_started_at: null,
      emergency_duration_minutes: null,
    })
    .eq('id', user.id);

  if (profileError) {
    log.error('Failed to clear emergency state', { error: profileError.message });
    throw profileError;
  }

  // Trigger refresh on all tenant devices
  const { error: deviceError } = await supabase
    .from('tv_devices')
    .update({ needs_refresh: true })
    .eq('tenant_id', user.id);

  if (deviceError) {
    log.error('Failed to refresh devices after emergency stop', { error: deviceError.message });
    throw deviceError;
  }

  log.info('Emergency stopped successfully');
}

/**
 * Subscribe to real-time emergency state changes for a tenant
 * @param {string} tenantId - The tenant ID to monitor
 * @param {function} onStateChange - Callback when emergency state changes
 * @returns {function} Unsubscribe function
 */
export function subscribeToEmergencyState(tenantId, onStateChange) {
  const channelName = `emergency:${tenantId}`;
  log.debug('Subscribing to emergency state', { tenantId, channelName });

  const channel = supabase
    .channel(channelName)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'profiles',
        filter: `id=eq.${tenantId}`,
      },
      (payload) => {
        const { emergency_content_id, emergency_content_type, emergency_started_at, emergency_duration_minutes } = payload.new;

        const contentId = emergency_content_id || null;
        const contentType = emergency_content_type || null;
        const startedAt = emergency_started_at ? new Date(emergency_started_at) : null;
        const durationMinutes = emergency_duration_minutes ?? null;
        const isActive = contentId !== null && !isEmergencyExpired(startedAt, durationMinutes);

        log.debug('Emergency state changed', { contentId, contentType, isActive });

        onStateChange({
          contentId,
          contentType,
          startedAt,
          durationMinutes,
          isActive,
        });
      }
    )
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        log.debug('Emergency state subscription active', { tenantId });
      } else if (status === 'CHANNEL_ERROR') {
        log.error('Emergency state subscription error', { tenantId });
      }
    });

  // Return unsubscribe function
  return () => {
    log.debug('Unsubscribing from emergency state', { tenantId });
    supabase.removeChannel(channel);
  };
}

export default {
  EMERGENCY_DURATIONS,
  isEmergencyExpired,
  getTenantEmergencyState,
  pushEmergencyContent,
  stopEmergency,
  subscribeToEmergencyState,
};
