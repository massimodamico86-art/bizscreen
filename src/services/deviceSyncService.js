/**
 * Device Sync Service
 *
 * Provides real-time synchronization between the editor and TV devices.
 * Uses Supabase real-time channels for instant updates when content changes.
 */

import { supabase } from '../supabase';
import { createScopedLogger } from './loggingService.js';

const logger = createScopedLogger('DeviceSync');

// Active subscriptions
const subscriptions = new Map();

// Callback registry for scene updates
const sceneUpdateCallbacks = new Map();

// Polling interval references
const pollingIntervals = new Map();

// Constants
const POLL_INTERVAL = 5000; // 5 seconds for device refresh polling
const REALTIME_CHANNEL_PREFIX = 'device-sync';

/**
 * Subscribe to scene updates via Supabase real-time
 * @param {string} sceneId - Scene ID to subscribe to
 * @param {Function} callback - Called when scene is updated
 * @returns {Function} Unsubscribe function
 */
export function subscribeToSceneUpdates(sceneId, callback) {
  if (!sceneId) return () => {};

  const channelName = `${REALTIME_CHANNEL_PREFIX}:scene:${sceneId}`;

  // Store callback
  if (!sceneUpdateCallbacks.has(sceneId)) {
    sceneUpdateCallbacks.set(sceneId, new Set());
  }
  sceneUpdateCallbacks.get(sceneId).add(callback);

  // Only create one subscription per scene
  if (subscriptions.has(channelName)) {
    return () => {
      const callbacks = sceneUpdateCallbacks.get(sceneId);
      if (callbacks) {
        callbacks.delete(callback);
      }
    };
  }

  // Create real-time subscription for scene_slides changes
  const channel = supabase
    .channel(channelName)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'scene_slides',
        filter: `scene_id=eq.${sceneId}`,
      },
      (payload) => {
        const callbacks = sceneUpdateCallbacks.get(sceneId);
        if (callbacks) {
          callbacks.forEach(cb => cb({ type: 'slide_change', payload }));
        }
      }
    )
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'scenes',
        filter: `id=eq.${sceneId}`,
      },
      (payload) => {
        const callbacks = sceneUpdateCallbacks.get(sceneId);
        if (callbacks) {
          callbacks.forEach(cb => cb({ type: 'scene_update', payload }));
        }
      }
    )
    .subscribe();

  subscriptions.set(channelName, channel);

  // Return unsubscribe function
  return () => {
    const callbacks = sceneUpdateCallbacks.get(sceneId);
    if (callbacks) {
      callbacks.delete(callback);
      if (callbacks.size === 0) {
        // No more callbacks, unsubscribe from channel
        const chan = subscriptions.get(channelName);
        if (chan) {
          supabase.removeChannel(chan);
          subscriptions.delete(channelName);
        }
        sceneUpdateCallbacks.delete(sceneId);
      }
    }
  };
}

/**
 * Broadcast a scene update to all connected devices
 * This triggers the needs_refresh flag on all devices with this scene
 * @param {string} sceneId - Scene ID that was updated
 * @returns {Promise<{success: boolean, affectedDevices: number}>}
 */
export async function broadcastSceneUpdate(sceneId) {
  if (!sceneId) {
    return { success: false, affectedDevices: 0, error: 'No scene ID provided' };
  }

  try {
    // Mark all devices with this scene as needing refresh
    const { data, error } = await supabase
      .from('tv_devices')
      .update({
        needs_refresh: true,
        updated_at: new Date().toISOString(),
      })
      .eq('active_scene_id', sceneId)
      .select('id');

    if (error) throw error;

    return {
      success: true,
      affectedDevices: data?.length || 0,
    };
  } catch (error) {
    logger.error('Failed to broadcast scene update', { error, sceneId });
    return { success: false, affectedDevices: 0, error: error.message };
  }
}

/**
 * Check if a device needs to refresh its content
 * @param {string} deviceId - Device UUID
 * @returns {Promise<{needsRefresh: boolean, lastRefresh: string | null}>}
 */
export async function checkDeviceRefreshStatus(deviceId) {
  if (!deviceId) {
    return { needsRefresh: false, lastRefresh: null };
  }

  try {
    const { data, error } = await supabase
      .from('tv_devices')
      .select('needs_refresh, last_refresh_at')
      .eq('id', deviceId)
      .single();

    if (error) throw error;

    return {
      needsRefresh: data?.needs_refresh || false,
      lastRefresh: data?.last_refresh_at,
    };
  } catch (error) {
    logger.error('Failed to check device refresh status', { error, deviceId });
    return { needsRefresh: false, lastRefresh: null };
  }
}

/**
 * Clear the refresh flag for a device after it has refreshed
 * @param {string} deviceId - Device UUID
 * @returns {Promise<boolean>}
 */
export async function clearDeviceRefreshFlag(deviceId) {
  if (!deviceId) return false;

  try {
    const { error } = await supabase
      .from('tv_devices')
      .update({
        needs_refresh: false,
        last_refresh_at: new Date().toISOString(),
      })
      .eq('id', deviceId);

    if (error) throw error;
    return true;
  } catch (error) {
    logger.error('Failed to clear device refresh flag', { error, deviceId });
    return false;
  }
}

/**
 * Start polling for device refresh status
 * @param {string} deviceId - Device UUID
 * @param {Function} onRefreshNeeded - Called when device needs refresh
 * @param {number} interval - Polling interval in ms (default 5s)
 * @returns {Function} Stop polling function
 */
export function startDeviceRefreshPolling(deviceId, onRefreshNeeded, interval = POLL_INTERVAL) {
  if (!deviceId) return () => {};

  // Clear any existing polling for this device
  stopDeviceRefreshPolling(deviceId);

  const poll = async () => {
    const { needsRefresh } = await checkDeviceRefreshStatus(deviceId);
    if (needsRefresh) {
      onRefreshNeeded();
    }
  };

  // Start polling
  const intervalId = setInterval(poll, interval);
  pollingIntervals.set(deviceId, intervalId);

  // Initial check
  poll();

  return () => stopDeviceRefreshPolling(deviceId);
}

/**
 * Stop polling for a specific device
 * @param {string} deviceId - Device UUID
 */
export function stopDeviceRefreshPolling(deviceId) {
  const intervalId = pollingIntervals.get(deviceId);
  if (intervalId) {
    clearInterval(intervalId);
    pollingIntervals.delete(deviceId);
  }
}

/**
 * Get all devices currently showing a specific scene
 * @param {string} sceneId - Scene ID
 * @returns {Promise<Object[]>}
 */
export async function getDevicesForScene(sceneId) {
  if (!sceneId) return [];

  try {
    const { data, error } = await supabase
      .from('tv_devices')
      .select('id, device_name, is_online, last_seen, needs_refresh')
      .eq('active_scene_id', sceneId)
      .order('device_name');

    if (error) throw error;
    return data || [];
  } catch (error) {
    logger.error('Failed to get devices for scene', { error, sceneId });
    return [];
  }
}

/**
 * Publish a scene to a specific device
 * @param {string} deviceId - Device UUID
 * @param {string} sceneId - Scene ID to publish
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function publishSceneToDevice(deviceId, sceneId) {
  if (!deviceId) {
    return { success: false, error: 'No device ID provided' };
  }

  try {
    const { error } = await supabase
      .from('tv_devices')
      .update({
        active_scene_id: sceneId,
        needs_refresh: true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', deviceId);

    if (error) throw error;
    return { success: true };
  } catch (error) {
    logger.error('Failed to publish scene to device', { error, sceneId, deviceId });
    return { success: false, error: error.message };
  }
}

/**
 * Publish a scene to multiple devices
 * @param {string[]} deviceIds - Array of device UUIDs
 * @param {string} sceneId - Scene ID to publish
 * @returns {Promise<{success: boolean, published: number, failed: number}>}
 */
export async function publishSceneToDevices(deviceIds, sceneId) {
  if (!deviceIds || deviceIds.length === 0) {
    return { success: false, published: 0, failed: 0 };
  }

  try {
    const { data, error } = await supabase
      .from('tv_devices')
      .update({
        active_scene_id: sceneId,
        needs_refresh: true,
        updated_at: new Date().toISOString(),
      })
      .in('id', deviceIds)
      .select('id');

    if (error) throw error;

    return {
      success: true,
      published: data?.length || 0,
      failed: deviceIds.length - (data?.length || 0),
    };
  } catch (error) {
    logger.error('Failed to publish scene to devices', { error, sceneId, deviceCount: deviceIds?.length });
    return { success: false, published: 0, failed: deviceIds.length };
  }
}

/**
 * Generate a content hash for change detection
 * @param {Object} design - Design JSON
 * @returns {string}
 */
export function generateContentHash(design) {
  if (!design) return '';
  try {
    const str = JSON.stringify(design);
    // Simple hash function
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return hash.toString(16);
  } catch {
    return '';
  }
}

/**
 * Subscribe to design changes in the editor (for live preview)
 * Creates a local event system for instant preview updates
 */
const designChangeListeners = new Set();

export function onDesignChange(callback) {
  designChangeListeners.add(callback);
  return () => designChangeListeners.delete(callback);
}

export function emitDesignChange(design, slideId) {
  const event = { design, slideId, timestamp: Date.now() };
  designChangeListeners.forEach(cb => cb(event));
}

/**
 * Cleanup all subscriptions and intervals
 */
export function cleanup() {
  // Clear all real-time subscriptions
  subscriptions.forEach((channel) => {
    supabase.removeChannel(channel);
  });
  subscriptions.clear();
  sceneUpdateCallbacks.clear();

  // Clear all polling intervals
  pollingIntervals.forEach((intervalId) => {
    clearInterval(intervalId);
  });
  pollingIntervals.clear();

  // Clear design change listeners
  designChangeListeners.clear();
}

export default {
  subscribeToSceneUpdates,
  broadcastSceneUpdate,
  checkDeviceRefreshStatus,
  clearDeviceRefreshFlag,
  startDeviceRefreshPolling,
  stopDeviceRefreshPolling,
  getDevicesForScene,
  publishSceneToDevice,
  publishSceneToDevices,
  generateContentHash,
  onDesignChange,
  emitDesignChange,
  cleanup,
};
