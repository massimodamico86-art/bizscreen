/**
 * usePlayerHeartbeat - Custom hook for device heartbeat and screenshot capture
 *
 * Extracted from ViewPage to handle:
 * - Device status updates every 30 seconds
 * - Screenshot capture when requested by server
 * - Device refresh status checking for real-time sync
 *
 * @module player/hooks/usePlayerHeartbeat
 */

import { useEffect, useRef } from 'react';
import {
  updateDeviceStatus,
  HEARTBEAT_INTERVAL,
} from '../../services/playerService';
import {
  checkDeviceRefreshStatus,
  clearDeviceRefreshFlag,
} from '../../services/deviceSyncService';
import {
  captureAndUploadScreenshot,
  cleanupOldScreenshots,
} from '../../services/screenshotService';
import { useLogger } from '../../hooks/useLogger.js';

// Storage keys
const STORAGE_KEYS = {
  contentHash: 'player_content_hash',
};

// Player version for heartbeats
const PLAYER_VERSION = '1.2.0';

// Periodic screenshot capture interval (5 minutes)
const SCREENSHOT_INTERVAL = 5 * 60 * 1000; // 5 minutes

/**
 * Collect device telemetry metrics from browser APIs.
 * Each API call is individually try-catch wrapped so one failure
 * never prevents other metrics from being collected.
 * Returns whatever metrics the browser supports — partial results are fine.
 *
 * @returns {Promise<Object>} Metrics snapshot with collected_at timestamp
 */
async function collectDeviceMetrics() {
  const metrics = { collected_at: new Date().toISOString() };

  // Memory: navigator.deviceMemory (Chrome/Edge, approximate RAM in GB)
  try {
    if (navigator.deviceMemory) {
      metrics.memory_gb = navigator.deviceMemory;
    }
  } catch { /* API not available */ }

  // JS Heap: performance.memory (Chrome/Edge only, non-standard)
  try {
    if (performance.memory) {
      metrics.js_heap_used_mb = Math.round(performance.memory.usedJSHeapSize / (1024 * 1024));
      metrics.js_heap_total_mb = Math.round(performance.memory.totalJSHeapSize / (1024 * 1024));
      metrics.js_heap_limit_mb = Math.round(performance.memory.jsHeapSizeLimit / (1024 * 1024));
    }
  } catch { /* API not available */ }

  // Storage: navigator.storage.estimate() (Chrome/Edge/Firefox/Safari 17+)
  try {
    if (navigator.storage?.estimate) {
      const est = await navigator.storage.estimate();
      metrics.storage_used_mb = Math.round((est.usage || 0) / (1024 * 1024));
      metrics.storage_quota_mb = Math.round((est.quota || 0) / (1024 * 1024));
      metrics.storage_percent = est.quota ? Math.round((est.usage / est.quota) * 100) : null;
    }
  } catch { /* API not available */ }

  // Network: navigator.connection (Chrome/Edge/Opera)
  try {
    const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    if (conn) {
      metrics.network_type = conn.effectiveType;  // '4g', '3g', '2g', 'slow-2g'
      metrics.network_downlink = conn.downlink;    // Mbps estimate
      metrics.network_rtt = conn.rtt;              // Round-trip time in ms
    }
  } catch { /* API not available */ }

  // Recovery state (Phase 66): report crash counter if device is in recovery
  try {
    const crashCount = parseInt(localStorage.getItem('player_recovery_count') || '0', 10);
    if (crashCount > 0) {
      metrics.recovery_crash_count = crashCount;
      metrics.recovery_phase = localStorage.getItem('player_recovery_phase') || 'unknown';
      metrics.recovery_last_at = localStorage.getItem('player_last_recovery_at');
    }
  } catch { /* localStorage not available */ }

  // Always available
  metrics.online = navigator.onLine;

  return metrics;
}

/**
 * Custom hook for managing device heartbeat and screenshot capture
 *
 * @param {string} screenId - Screen UUID from localStorage
 * @param {React.RefObject} loadContentRef - Ref to loadContent function for refresh
 * @param {React.RefObject} contentContainerRef - Ref to content container for screenshots
 * @param {Object} [options] - Additional options
 * @param {React.RefObject} [options.contentVersionRef] - Ref to current content version string
 * @param {Function} [options.onMismatchDetected] - Callback when content mismatch is detected (expectedVersion, reportedVersion)
 * @returns {Object} Heartbeat refs
 */
export function usePlayerHeartbeat(screenId, loadContentRef, contentContainerRef, options = {}) {
  const { contentVersionRef, onMismatchDetected } = options;
  const logger = useLogger('usePlayerHeartbeat');
  const heartbeatRef = useRef(null);
  const screenshotInProgressRef = useRef(false);
  const lastActivityRef = useRef(Date.now());
  const lastScreenshotTimeRef = useRef(0);
  const wasOfflineRef = useRef(false);

  useEffect(() => {
    if (!screenId) return;

    const sendBeat = async () => {
      try {
        const metrics = await collectDeviceMetrics();
        const contentHash = localStorage.getItem(STORAGE_KEYS.contentHash);
        const contentVersion = contentVersionRef?.current || null;
        const statusResult = await updateDeviceStatus(screenId, PLAYER_VERSION, contentHash, metrics, contentVersion);
        lastActivityRef.current = Date.now();

        // Check for content mismatch signal from server
        // Only trigger callback when mismatch is true and needs_refresh is not also true
        // (to avoid double-triggering: needs_refresh already triggers a reload)
        if (statusResult?.content_mismatch && !statusResult?.needs_refresh) {
          onMismatchDetected?.(statusResult.expected_content_version, contentVersion);
        }

        // Recovery screenshot: device was offline, now heartbeat succeeded
        if (wasOfflineRef.current) {
          logger.info('Device recovered from offline, capturing recovery screenshot');
          wasOfflineRef.current = false;
          if (!screenshotInProgressRef.current && contentContainerRef?.current) {
            screenshotInProgressRef.current = true;
            try {
              const container = contentContainerRef.current;
              await captureAndUploadScreenshot(screenId, container);
              lastScreenshotTimeRef.current = Date.now();
              await cleanupOldScreenshots(screenId, 5);
            } catch (recoveryErr) {
              logger.error('Recovery screenshot capture failed', { error: recoveryErr });
            } finally {
              screenshotInProgressRef.current = false;
            }
          }
        }

        // Check if screenshot is requested (on-demand capture)
        if (statusResult?.needs_screenshot_update && !screenshotInProgressRef.current) {
          logger.info('Screenshot requested, capturing...');
          screenshotInProgressRef.current = true;
          try {
            const container = contentContainerRef?.current || document.body;
            await captureAndUploadScreenshot(screenId, container);
            logger.info('Screenshot captured and uploaded');
            // Clean up old screenshots (keep last 5)
            await cleanupOldScreenshots(screenId, 5);
            // Reset periodic timer so we don't capture again immediately
            lastScreenshotTimeRef.current = Date.now();
          } catch (screenshotErr) {
            logger.error('Screenshot capture failed', { error: screenshotErr });
          } finally {
            screenshotInProgressRef.current = false;
          }
        }

        // Periodic screenshot capture (every 5 minutes)
        const timeSinceLastScreenshot = Date.now() - lastScreenshotTimeRef.current;
        if (
          timeSinceLastScreenshot >= SCREENSHOT_INTERVAL &&
          !screenshotInProgressRef.current &&
          contentContainerRef?.current
        ) {
          logger.info('Periodic screenshot capture (5-min interval)');
          screenshotInProgressRef.current = true;
          try {
            const container = contentContainerRef.current;
            await captureAndUploadScreenshot(screenId, container);
            lastScreenshotTimeRef.current = Date.now();
            await cleanupOldScreenshots(screenId, 5);
          } catch (periodicErr) {
            logger.error('Periodic screenshot capture failed', { error: periodicErr });
          } finally {
            screenshotInProgressRef.current = false;
          }
        }

        // Check if device needs to refresh content (real-time sync)
        try {
          const refreshStatus = await checkDeviceRefreshStatus(screenId);
          if (refreshStatus?.needs_refresh) {
            logger.info('Refresh needed, reloading content...');
            // Reload content using ref to avoid dependency cycle
            loadContentRef?.current?.(screenId, false);
            // Clear the refresh flag
            await clearDeviceRefreshFlag(screenId, contentHash);
          }
        } catch (refreshErr) {
          // Silently ignore refresh check errors to not block heartbeat
          logger.warn('Refresh check failed', { message: refreshErr.message });
        }
      } catch (err) {
        logger.error('Heartbeat error', { error: err });
        // Mark device as offline so next successful heartbeat triggers recovery screenshot
        wasOfflineRef.current = true;
      }
    };

    // Send immediately then on interval
    sendBeat();
    heartbeatRef.current = setInterval(sendBeat, HEARTBEAT_INTERVAL);

    return () => {
      if (heartbeatRef.current) {
        clearInterval(heartbeatRef.current);
      }
    };
  }, [screenId, logger, loadContentRef, contentContainerRef, contentVersionRef, onMismatchDetected]);

  return {
    heartbeatRef,
    screenshotInProgressRef,
    lastActivityRef,
    lastScreenshotTimeRef,
  };
}
