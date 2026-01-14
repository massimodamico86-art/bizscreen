// Device Screenshot Service - Dashboard functions for remote device diagnostics
import { supabase } from '../supabase';
import {
  raiseDeviceOfflineAlert,
  raiseCacheStaleAlert,
  autoResolveAlert,
  ALERT_TYPES,
} from './alertEngineService';

/**
 * Fetch all devices with screenshot and diagnostic info
 * @param {string|null} clientId - Optional client ID to filter by
 * @returns {Promise<Array>} Array of devices with diagnostic info
 */
export async function fetchDevicesWithScreenshots(clientId = null) {
  const { data, error } = await supabase.rpc('list_devices_with_screenshot_info', {
    p_client_id: clientId
  });

  if (error) {
    console.error('[DeviceScreenshot] Failed to fetch devices:', error);
    throw error;
  }

  return data || [];
}

/**
 * Request a screenshot from a specific device
 * Sets the needs_screenshot_update flag which the player checks on heartbeat
 * @param {string} deviceId - The device UUID
 * @returns {Promise<boolean>} True if request was successful
 */
export async function requestDeviceScreenshot(deviceId) {
  if (!deviceId) {
    throw new Error('Device ID is required');
  }

  const { data, error } = await supabase.rpc('request_device_screenshot', {
    p_device_id: deviceId
  });

  if (error) {
    console.error('[DeviceScreenshot] Failed to request screenshot:', error);
    throw error;
  }

  return data === true;
}

/**
 * Request a cache sync from a specific device
 * Updates the device's cache_status to trigger a re-sync on next heartbeat
 * @param {string} deviceId - The device UUID
 * @returns {Promise<boolean>} True if request was successful
 */
export async function requestDeviceCacheSync(deviceId) {
  if (!deviceId) {
    throw new Error('Device ID is required');
  }

  // Mark the device's cache as stale to trigger a re-sync
  const { error } = await supabase
    .from('tv_devices')
    .update({
      cache_status: 'stale',
      updated_at: new Date().toISOString()
    })
    .eq('id', deviceId);

  if (error) {
    console.error('[DeviceScreenshot] Failed to request cache sync:', error);
    throw error;
  }

  return true;
}

/**
 * Request screenshots from multiple devices
 * @param {Array<string>} deviceIds - Array of device UUIDs
 * @returns {Promise<{success: number, failed: number}>} Count of successful and failed requests
 */
export async function requestMultipleScreenshots(deviceIds) {
  if (!deviceIds || deviceIds.length === 0) {
    return { success: 0, failed: 0 };
  }

  let success = 0;
  let failed = 0;

  await Promise.all(deviceIds.map(async (deviceId) => {
    try {
      await requestDeviceScreenshot(deviceId);
      success++;
    } catch (err) {
      console.warn(`[DeviceScreenshot] Failed to request for ${deviceId}:`, err);
      failed++;
    }
  }));

  return { success, failed };
}

/**
 * Get a single device's screenshot info
 * @param {string} deviceId - The device UUID
 * @returns {Promise<Object|null>} Device info or null if not found
 */
export async function getDeviceScreenshotInfo(deviceId) {
  if (!deviceId) {
    throw new Error('Device ID is required');
  }

  const { data, error } = await supabase
    .from('tv_devices')
    .select(`
      id,
      device_name,
      is_online,
      last_seen,
      last_screenshot_url,
      last_screenshot_at,
      needs_screenshot_update,
      active_scene_id,
      assigned_schedule_id,
      location:locations(id, name),
      screen_group:screen_groups(id, name),
      active_scene:scenes(id, name),
      assigned_schedule:schedules(id, name)
    `)
    .eq('id', deviceId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null; // Not found
    }
    throw error;
  }

  return data;
}

/**
 * Get devices that have warnings (offline, stale screenshot, etc.)
 * @param {string|null} clientId - Optional client ID to filter by
 * @returns {Promise<Array>} Array of devices with warnings
 */
export async function getDevicesWithWarnings(clientId = null) {
  const devices = await fetchDevicesWithScreenshots(clientId);
  return devices.filter(d => d.has_warning);
}

/**
 * Get devices count by status
 * @param {string|null} clientId - Optional client ID to filter by
 * @returns {Promise<{total: number, online: number, offline: number, withWarnings: number}>}
 */
export async function getDeviceStatusSummary(clientId = null) {
  const devices = await fetchDevicesWithScreenshots(clientId);

  return {
    total: devices.length,
    online: devices.filter(d => d.is_online).length,
    offline: devices.filter(d => !d.is_online).length,
    withWarnings: devices.filter(d => d.has_warning).length
  };
}

/**
 * Format screenshot age for display
 * @param {number|null} ageMinutes - Age in minutes
 * @returns {string} Human-readable age string
 */
export function formatScreenshotAge(ageMinutes) {
  if (ageMinutes === null || ageMinutes === undefined) {
    return 'Never';
  }

  if (ageMinutes < 1) {
    return 'Just now';
  }

  if (ageMinutes < 60) {
    return `${ageMinutes} min ago`;
  }

  const hours = Math.floor(ageMinutes / 60);
  if (hours < 24) {
    return `${hours} hr ago`;
  }

  const days = Math.floor(hours / 24);
  return `${days} day${days > 1 ? 's' : ''} ago`;
}

/**
 * Format heartbeat age for display
 * @param {number|null} ageMinutes - Age in minutes
 * @returns {string} Human-readable age string
 */
export function formatHeartbeatAge(ageMinutes) {
  if (ageMinutes === null || ageMinutes === undefined) {
    return 'Unknown';
  }

  if (ageMinutes < 1) {
    return 'Active';
  }

  if (ageMinutes < 5) {
    return `${ageMinutes} min ago`;
  }

  if (ageMinutes < 60) {
    return `${ageMinutes} min ago (stale)`;
  }

  const hours = Math.floor(ageMinutes / 60);
  if (hours < 24) {
    return `${hours} hr ago`;
  }

  const days = Math.floor(hours / 24);
  return `${days} day${days > 1 ? 's' : ''} ago`;
}

/**
 * Get warning level for a device
 * @param {Object} device - Device object from fetchDevicesWithScreenshots
 * @returns {'none'|'warning'|'critical'} Warning level
 */
export function getDeviceWarningLevel(device) {
  if (!device) return 'none';

  // Critical: offline for more than 5 minutes
  if (!device.is_online || device.minutes_since_heartbeat > 5) {
    return 'critical';
  }

  // Warning: screenshot stale (> 30 min) or pending update
  if (device.screenshot_age_minutes > 30 || device.needs_screenshot_update) {
    return 'warning';
  }

  return 'none';
}

// ============================================================================
// ALERT INTEGRATION
// ============================================================================

/**
 * Check device status and raise/resolve alerts accordingly
 * Call this periodically or after fetching device status
 * @param {Object} device - Device object from fetchDevicesWithScreenshots
 * @returns {Promise<void>}
 */
export async function checkDeviceStatusAndAlert(device) {
  if (!device) return;

  try {
    const minutesOffline = device.minutes_since_heartbeat || 0;

    // Check for offline status (offline for more than 5 minutes)
    if (!device.is_online || minutesOffline > 5) {
      // Raise offline alert
      await raiseDeviceOfflineAlert(
        {
          id: device.id,
          name: device.device_name || device.name,
          tenant_id: device.tenant_id,
          last_heartbeat: device.last_seen,
        },
        minutesOffline
      );
    } else {
      // Device is online - auto-resolve any open offline alerts
      await autoResolveAlert({
        type: ALERT_TYPES.DEVICE_OFFLINE,
        deviceId: device.id,
        notes: 'Device is back online',
      });
    }

    // Check for stale cache (more than 1 hour old)
    const cacheAgeHours = device.cache_age_hours || 0;
    if (device.cache_status === 'stale' || cacheAgeHours > 1) {
      await raiseCacheStaleAlert(
        {
          id: device.id,
          name: device.device_name || device.name,
          tenant_id: device.tenant_id,
        },
        cacheAgeHours
      );
    } else if (device.cache_status === 'valid' || device.cache_status === 'fresh') {
      // Cache is valid - auto-resolve any open cache stale alerts
      await autoResolveAlert({
        type: ALERT_TYPES.DEVICE_CACHE_STALE,
        deviceId: device.id,
        notes: 'Device cache is now valid',
      });
    }
  } catch (error) {
    console.error('[DeviceScreenshot] Error checking device alerts:', error);
  }
}

/**
 * Check all devices and raise/resolve alerts as needed
 * Useful for background monitoring or periodic checks
 * @param {string|null} clientId - Optional client ID to filter by
 * @returns {Promise<{checked: number, alerts: number}>}
 */
export async function checkAllDevicesForAlerts(clientId = null) {
  try {
    const devices = await fetchDevicesWithScreenshots(clientId);

    let alertsRaised = 0;
    for (const device of devices) {
      const warningLevel = getDeviceWarningLevel(device);
      if (warningLevel !== 'none') {
        await checkDeviceStatusAndAlert(device);
        alertsRaised++;
      } else {
        // Check if we need to resolve any alerts for this device
        await checkDeviceStatusAndAlert(device);
      }
    }

    return { checked: devices.length, alerts: alertsRaised };
  } catch (error) {
    console.error('[DeviceScreenshot] Error checking all devices for alerts:', error);
    return { checked: 0, alerts: 0 };
  }
}
