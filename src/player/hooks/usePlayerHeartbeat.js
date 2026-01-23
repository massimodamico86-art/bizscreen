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

/**
 * Custom hook for managing device heartbeat and screenshot capture
 *
 * @param {string} screenId - Screen UUID from localStorage
 * @param {React.RefObject} loadContentRef - Ref to loadContent function for refresh
 * @param {React.RefObject} contentContainerRef - Ref to content container for screenshots
 * @returns {Object} Heartbeat refs
 */
export function usePlayerHeartbeat(screenId, loadContentRef, contentContainerRef) {
  const logger = useLogger('usePlayerHeartbeat');
  const heartbeatRef = useRef(null);
  const screenshotInProgressRef = useRef(false);
  const lastActivityRef = useRef(Date.now());

  useEffect(() => {
    if (!screenId) return;

    const sendBeat = async () => {
      try {
        const contentHash = localStorage.getItem(STORAGE_KEYS.contentHash);
        const statusResult = await updateDeviceStatus(screenId, PLAYER_VERSION, contentHash);
        lastActivityRef.current = Date.now();

        // Check if screenshot is requested
        if (statusResult?.needs_screenshot_update && !screenshotInProgressRef.current) {
          logger.info('Screenshot requested, capturing...');
          screenshotInProgressRef.current = true;
          try {
            const container = contentContainerRef?.current || document.body;
            await captureAndUploadScreenshot(screenId, container);
            logger.info('Screenshot captured and uploaded');
            // Clean up old screenshots (keep last 5)
            await cleanupOldScreenshots(screenId, 5);
          } catch (screenshotErr) {
            logger.error('Screenshot capture failed', { error: screenshotErr });
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
  }, [screenId, logger, loadContentRef, contentContainerRef]);

  return {
    heartbeatRef,
    screenshotInProgressRef,
    lastActivityRef,
  };
}
