// Screenshot Service - Captures player screenshots for remote diagnostics
import html2canvas from 'html2canvas';
import { supabase } from '../supabase';
import {
  raiseScreenshotFailedAlert,
  autoResolveAlert,
  ALERT_TYPES,
} from './alertEngineService';

// Track consecutive failures per device for alert escalation
const deviceFailureCounts = new Map();

/**
 * Configuration for screenshot capture
 */
const SCREENSHOT_CONFIG = {
  quality: 0.8,
  scale: 0.5, // Reduce size for faster uploads
  format: 'image/jpeg',
  maxWidth: 1920,
  maxHeight: 1080
};

/**
 * Capture a screenshot of the player content
 * @param {HTMLElement} element - The DOM element to capture
 * @returns {Promise<Blob>} The screenshot as a JPEG blob
 */
export async function captureScreenshot(element) {
  if (!element) {
    throw new Error('No element provided for screenshot');
  }

  try {
    const canvas = await html2canvas(element, {
      scale: SCREENSHOT_CONFIG.scale,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#000000',
      logging: false,
      // Ignore certain elements that might cause issues
      ignoreElements: (el) => {
        return el.classList?.contains('screenshot-ignore');
      }
    });

    // Convert canvas to blob
    return new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Failed to create screenshot blob'));
          }
        },
        SCREENSHOT_CONFIG.format,
        SCREENSHOT_CONFIG.quality
      );
    });
  } catch (error) {
    console.error('[Screenshot] Capture failed:', error);
    throw error;
  }
}

/**
 * Upload a screenshot to Supabase Storage
 * @param {string} deviceId - The device ID
 * @param {Blob} blob - The screenshot blob
 * @returns {Promise<string>} The public URL of the uploaded screenshot
 */
export async function uploadScreenshot(deviceId, blob) {
  if (!deviceId || !blob) {
    throw new Error('Device ID and blob are required');
  }

  const timestamp = Date.now();
  const fileName = `${deviceId}/${timestamp}.jpg`;

  try {
    // Upload to Supabase Storage
    const { data, error: uploadError } = await supabase.storage
      .from('device-screenshots')
      .upload(fileName, blob, {
        contentType: SCREENSHOT_CONFIG.format,
        upsert: false // Create new file each time
      });

    if (uploadError) {
      // If bucket doesn't exist, try to create it (fallback)
      if (uploadError.message?.includes('not found')) {
        console.error('[Screenshot] Storage bucket not found. Please create "device-screenshots" bucket.');
      }
      throw uploadError;
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('device-screenshots')
      .getPublicUrl(fileName);

    return urlData.publicUrl;
  } catch (error) {
    console.error('[Screenshot] Upload failed:', error);
    throw error;
  }
}

/**
 * Store the screenshot URL in the database
 * @param {string} deviceId - The device ID
 * @param {string} url - The screenshot URL
 */
export async function storeScreenshotUrl(deviceId, url) {
  const { error } = await supabase.rpc('store_device_screenshot', {
    p_device_id: deviceId,
    p_screenshot_url: url
  });

  if (error) {
    console.error('[Screenshot] Failed to store URL:', error);
    throw error;
  }
}

/**
 * Capture, upload, and store a screenshot in one operation
 * @param {string} deviceId - The device ID
 * @param {HTMLElement} element - The DOM element to capture
 * @param {Object} [deviceInfo] - Optional device info for alerts (name, tenant_id)
 * @returns {Promise<string>} The public URL of the screenshot
 */
export async function captureAndUploadScreenshot(deviceId, element, deviceInfo = null) {
  console.log('[Screenshot] Starting capture for device:', deviceId);

  try {
    // Capture the screenshot
    const blob = await captureScreenshot(element);
    console.log('[Screenshot] Captured, size:', (blob.size / 1024).toFixed(1), 'KB');

    // Upload to storage
    const url = await uploadScreenshot(deviceId, blob);
    console.log('[Screenshot] Uploaded to:', url);

    // Store URL in database
    await storeScreenshotUrl(deviceId, url);
    console.log('[Screenshot] URL stored in database');

    // Success - reset failure count and auto-resolve any open alerts
    deviceFailureCounts.set(deviceId, 0);
    try {
      await autoResolveAlert({
        type: ALERT_TYPES.DEVICE_SCREENSHOT_FAILED,
        deviceId,
        notes: 'Screenshot capture succeeded',
      });
    } catch (alertError) {
      console.warn('[Screenshot] Error resolving screenshot alert:', alertError);
    }

    return url;
  } catch (error) {
    // Track consecutive failures
    const failureCount = (deviceFailureCounts.get(deviceId) || 0) + 1;
    deviceFailureCounts.set(deviceId, failureCount);

    console.error(`[Screenshot] Capture failed (failure #${failureCount}):`, error);

    // Raise alert after 2+ consecutive failures
    if (failureCount >= 2 && deviceInfo) {
      try {
        await raiseScreenshotFailedAlert(
          {
            id: deviceId,
            name: deviceInfo.name || deviceId,
            tenant_id: deviceInfo.tenant_id,
          },
          failureCount,
          error.message
        );
      } catch (alertError) {
        console.warn('[Screenshot] Error raising screenshot alert:', alertError);
      }
    }

    throw error;
  }
}

/**
 * Clean up old screenshots for a device (optional, for storage management)
 * Keeps only the last N screenshots
 * @param {string} deviceId - The device ID
 * @param {number} keepCount - Number of screenshots to keep (default: 5)
 */
export async function cleanupOldScreenshots(deviceId, keepCount = 5) {
  try {
    // List files in device folder
    const { data: files, error: listError } = await supabase.storage
      .from('device-screenshots')
      .list(deviceId, {
        sortBy: { column: 'created_at', order: 'desc' }
      });

    if (listError || !files) {
      console.warn('[Screenshot] Could not list files for cleanup:', listError);
      return;
    }

    // Delete old files beyond keepCount
    if (files.length > keepCount) {
      const filesToDelete = files.slice(keepCount).map(f => `${deviceId}/${f.name}`);

      const { error: deleteError } = await supabase.storage
        .from('device-screenshots')
        .remove(filesToDelete);

      if (deleteError) {
        console.warn('[Screenshot] Cleanup error:', deleteError);
      } else {
        console.log('[Screenshot] Cleaned up', filesToDelete.length, 'old screenshots');
      }
    }
  } catch (error) {
    // Cleanup is non-critical, just log the error
    console.warn('[Screenshot] Cleanup failed:', error);
  }
}
