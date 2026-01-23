/**
 * Offline Service for TV Player
 * Manages offline mode detection, content caching, and sync operations.
 *
 * Features:
 * - Detect online/offline status
 * - Cache scenes and media for offline playback
 * - Queue events for sync when online
 * - Validate content against server checksums
 */

import { supabase } from '../supabase';
import { createScopedLogger } from '../services/loggingService.js';
import {
  cacheScene,
  getCachedScene,
  cacheMultipleMedia,
  getCachedMediaUrl,
  queueOfflineEvent,
  getPendingEvents,
  markEventsSynced,
  updateLastSyncInfo,
  getLastSyncInfo,
  getCacheSize,
  getCacheInfo,
  clearStaleCache,
} from './cacheService';

const logger = createScopedLogger('OfflineService');

/**
 * Convert blob to base64 data URL for IndexedDB storage
 * @param {Blob} blob
 * @returns {Promise<string>}
 */
function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Convert base64 data URL back to blob
 * @param {string} base64
 * @param {string} mimeType
 * @returns {Promise<Blob>}
 */
function base64ToBlob(base64, mimeType) {
  return fetch(base64).then(res => res.blob());
}

// Offline mode configuration
const OFFLINE_CONFIG = {
  // Time before considering device offline (ms)
  OFFLINE_THRESHOLD: 40000, // 40 seconds
  // Heartbeat interval
  HEARTBEAT_INTERVAL: 30000, // 30 seconds
  // Retry interval for reconnection
  RETRY_INTERVAL: 10000, // 10 seconds
  // Maximum queued events before forced sync attempt
  MAX_QUEUE_SIZE: 100,
};

// Service state
let isOfflineMode = false;
let lastHeartbeatSuccess = Date.now();
let offlineListeners = [];
let serviceWorkerReady = false;

// ============================================================================
// SERVICE WORKER REGISTRATION
// ============================================================================

/**
 * Register the service worker
 */
export async function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) {
    logger.warn('[OfflineService] Service workers not supported');
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/',
    });

    logger.debug('[OfflineService] Service worker registered:', registration.scope);

    // Wait for the service worker to be ready
    await navigator.serviceWorker.ready;
    serviceWorkerReady = true;

    // Listen for messages from service worker
    navigator.serviceWorker.addEventListener('message', handleServiceWorkerMessage);

    return registration;
  } catch (error) {
    logger.error('[OfflineService] Service worker registration failed:', error);
    return null;
  }
}

/**
 * Handle messages from service worker
 */
function handleServiceWorkerMessage(event) {
  const { type, payload } = event.data || {};

  switch (type) {
    case 'SYNC_HEARTBEATS':
      syncPendingHeartbeats();
      break;

    case 'SYNC_SCREENSHOTS':
      syncPendingScreenshots();
      break;

    case 'CHECK_CONTENT_UPDATES':
      // This will be handled by the Player
      break;

    default:
      logger.debug('[OfflineService] Unknown message from SW:', type);
  }
}

/**
 * Send message to service worker
 */
export function postToServiceWorker(type, payload) {
  if (!serviceWorkerReady || !navigator.serviceWorker.controller) {
    return Promise.resolve(null);
  }

  return new Promise((resolve) => {
    const channel = new MessageChannel();
    channel.port1.onmessage = (event) => resolve(event.data);

    navigator.serviceWorker.controller.postMessage(
      { type, payload },
      [channel.port2]
    );

    // Timeout after 5 seconds
    setTimeout(() => resolve(null), 5000);
  });
}

// ============================================================================
// OFFLINE STATUS MANAGEMENT
// ============================================================================

/**
 * Check if device is online
 */
export function isOnline() {
  return navigator.onLine;
}

/**
 * Check if in offline mode
 */
export function getOfflineMode() {
  return isOfflineMode;
}

/**
 * Set offline mode
 */
export function setOfflineMode(offline) {
  const wasOffline = isOfflineMode;
  isOfflineMode = offline;

  if (wasOffline !== offline) {
    logger.debug('[OfflineService] Mode changed:', offline ? 'OFFLINE' : 'ONLINE');
    notifyOfflineListeners(offline);
  }
}

/**
 * Add offline mode listener
 */
export function addOfflineListener(callback) {
  offlineListeners.push(callback);
  return () => {
    offlineListeners = offlineListeners.filter((cb) => cb !== callback);
  };
}

/**
 * Notify listeners of offline mode change
 */
function notifyOfflineListeners(offline) {
  offlineListeners.forEach((callback) => {
    try {
      callback(offline);
    } catch (error) {
      logger.error('[OfflineService] Error in offline listener:', error);
    }
  });
}

/**
 * Record successful heartbeat
 */
export function recordHeartbeatSuccess() {
  lastHeartbeatSuccess = Date.now();

  // If we were offline, we're now back online
  if (isOfflineMode) {
    setOfflineMode(false);
    // Trigger sync of pending events
    syncPendingEvents();
  }
}

/**
 * Record failed heartbeat
 */
export async function recordHeartbeatFailure() {
  const timeSinceLastSuccess = Date.now() - lastHeartbeatSuccess;

  if (timeSinceLastSuccess >= OFFLINE_CONFIG.OFFLINE_THRESHOLD) {
    setOfflineMode(true);
  }
}

/**
 * Initialize online/offline detection
 */
export function initOfflineDetection() {
  // Browser online/offline events
  window.addEventListener('online', () => {
    logger.debug('[OfflineService] Browser reports online');
    // Don't immediately switch to online mode - wait for heartbeat success
  });

  window.addEventListener('offline', () => {
    logger.debug('[OfflineService] Browser reports offline');
    setOfflineMode(true);
  });
}

// ============================================================================
// SCENE CACHING
// ============================================================================

/**
 * Fetch and cache a scene for offline use
 * @param {string} sceneId - Scene UUID
 * @param {function} onProgress - Progress callback
 * @returns {Promise<{success: boolean, scene: object}>}
 */
export async function fetchAndCacheScene(sceneId, onProgress = null) {
  if (!sceneId) {
    throw new Error('Scene ID is required');
  }

  try {
    // Fetch scene with full data for caching
    const { data, error } = await supabase.rpc('get_scene_for_caching', {
      p_scene_id: sceneId,
    });

    if (error) throw error;
    if (!data || data.error) throw new Error(data?.error || 'Scene not found');

    // Cache the scene
    await cacheScene(sceneId, {
      name: data.name,
      design_json: data.design_json,
      content_hash: data.content_hash,
      media_hash: data.media_hash,
      media_urls: data.media_urls,
      business_type: data.business_type,
    });

    // Cache associated media
    const mediaUrls = data.media_urls || [];
    if (mediaUrls.length > 0) {
      onProgress?.(0, mediaUrls.length, 'Caching media...');

      const mediaResult = await cacheMultipleMedia(
        mediaUrls.map((url) => url.replace(/^"|"$/g, '')), // Remove quotes
        sceneId,
        (cached, total) => onProgress?.(cached, total, 'Caching media...')
      );

      logger.debug('[OfflineService] Cached media:', mediaResult);
    }

    // Update last sync info
    await updateLastSyncInfo({
      sceneId,
      contentHash: data.content_hash,
      mediaHash: data.media_hash,
      mediaCount: mediaUrls.length,
    });

    return {
      success: true,
      scene: data,
    };
  } catch (error) {
    logger.error('[OfflineService] Failed to cache scene:', error);
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Get scene for playback (remote or cached)
 * @param {string} sceneId - Scene UUID
 * @returns {Promise<object|null>}
 */
export async function getSceneForPlayback(sceneId) {
  if (!sceneId) return null;

  // If online, try to fetch from server
  if (!isOfflineMode && isOnline()) {
    try {
      const { data, error } = await supabase
        .from('scenes')
        .select('*')
        .eq('id', sceneId)
        .single();

      if (!error && data) {
        // Cache the scene for offline use
        await cacheScene(sceneId, data);
        return data;
      }
    } catch (error) {
      logger.warn('[OfflineService] Failed to fetch scene from server:', error);
    }
  }

  // Fall back to cache
  logger.debug('[OfflineService] Loading scene from cache:', sceneId);
  const cachedScene = await getCachedScene(sceneId);

  if (cachedScene) {
    return {
      id: cachedScene.id,
      name: cachedScene.name,
      design_json: cachedScene.designJson,
      content_hash: cachedScene.contentHash,
      business_type: cachedScene.businessType,
      _cached: true,
      _cachedAt: cachedScene.cachedAt,
    };
  }

  return null;
}

/**
 * Check if scene needs update
 * @param {string} sceneId - Scene UUID
 * @param {string} cachedHash - Currently cached content hash
 */
export async function checkSceneNeedsUpdate(sceneId, cachedHash) {
  if (!sceneId || !cachedHash) return true;

  try {
    const { data, error } = await supabase.rpc('check_if_scene_changed', {
      p_scene_id: sceneId,
      p_last_content_hash: cachedHash,
    });

    if (error) throw error;

    return data?.content_changed || data?.needs_full_refresh || false;
  } catch (error) {
    logger.warn('[OfflineService] Failed to check scene update:', error);
    return false; // Don't force update on error
  }
}

/**
 * Get media URL (cached or remote)
 * @param {string} url - Original media URL
 * @returns {Promise<string>}
 */
export async function getMediaUrl(url) {
  if (!url) return url;

  // If offline, try to get from cache
  if (isOfflineMode || !isOnline()) {
    const cachedUrl = await getCachedMediaUrl(url);
    if (cachedUrl) return cachedUrl;
  }

  // Return original URL
  return url;
}

// ============================================================================
// SYNC OPERATIONS
// ============================================================================

/**
 * Sync all pending events when back online
 */
export async function syncPendingEvents() {
  if (isOfflineMode || !isOnline()) {
    logger.debug('[OfflineService] Cannot sync - still offline');
    return { success: false, reason: 'offline' };
  }

  try {
    const pending = await getPendingEvents();

    if (pending.length === 0) {
      logger.debug('[OfflineService] No pending events to sync');
      return { success: true, synced: 0 };
    }

    logger.debug('[OfflineService] Syncing', pending.length, 'pending events');

    // Group events by type
    const heartbeats = pending.filter((e) => e.eventType === 'heartbeat');
    const screenshots = pending.filter((e) => e.eventType === 'screenshot');
    const playbacks = pending.filter((e) => e.eventType === 'playback');

    let syncedIds = [];

    // Sync heartbeats
    if (heartbeats.length > 0) {
      await syncHeartbeats(heartbeats);
      syncedIds.push(...heartbeats.map((e) => e.id));
    }

    // Sync playback events
    if (playbacks.length > 0) {
      await syncPlaybackEvents(playbacks);
      syncedIds.push(...playbacks.map((e) => e.id));
    }

    // Mark events as synced
    if (syncedIds.length > 0) {
      await markEventsSynced(syncedIds);
    }

    logger.debug('[OfflineService] Synced', syncedIds.length, 'events');

    return {
      success: true,
      synced: syncedIds.length,
    };
  } catch (error) {
    logger.error('[OfflineService] Sync failed:', error);
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Sync pending heartbeats
 */
async function syncHeartbeats(heartbeats) {
  // Heartbeats don't need to be synced individually
  // The server will see the device is back online
  logger.debug('[OfflineService] Device back online, heartbeats will resume');
}

/**
 * Sync pending screenshots
 */
async function syncPendingScreenshots() {
  const screenshots = await getPendingEvents().then((events) =>
    events.filter((e) => e.eventType === 'screenshot').sort((a, b) =>
      new Date(a.createdAt) - new Date(b.createdAt) // FIFO order
    )
  );

  if (screenshots.length === 0) return;

  logger.info('[OfflineService] Syncing pending screenshots', { count: screenshots.length });

  for (const event of screenshots) {
    try {
      const { deviceId, imageData, mimeType, capturedAt } = event.eventData;

      // Convert base64 back to blob
      const blob = await base64ToBlob(imageData, mimeType);

      // Upload using existing screenshot service
      const { uploadScreenshot } = await import('../services/screenshotService.js');
      await uploadScreenshot(deviceId, blob);

      // Mark as synced
      await markEventsSynced([event.id]);

      logger.info('[OfflineService] Synced queued screenshot', {
        deviceId,
        capturedAt,
        sizeKB: Math.round(blob.size / 1024)
      });
    } catch (error) {
      logger.error('[OfflineService] Failed to sync screenshot', {
        error: error.message,
        eventId: event.id
      });
      // Stop on first failure - will retry on next sync attempt
      break;
    }
  }
}

/**
 * Sync playback events
 */
async function syncPlaybackEvents(playbacks) {
  if (playbacks.length === 0) return;

  try {
    // Batch sync playback events
    const events = playbacks.map((e) => ({
      ...e.eventData,
      recorded_at: e.createdAt,
      synced_offline: true,
    }));

    // Call the batch playback API
    const { error } = await supabase.rpc('record_playback_events_batch', {
      p_events: events,
    });

    if (error) throw error;
  } catch (error) {
    logger.error('[OfflineService] Failed to sync playback events:', error);
  }
}

// ============================================================================
// QUEUE OPERATIONS
// ============================================================================

/**
 * Queue a heartbeat for later sync
 * @param {object} heartbeatData - Heartbeat data
 */
export async function queueHeartbeat(heartbeatData) {
  await queueOfflineEvent('heartbeat', {
    ...heartbeatData,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Queue a playback event for later sync
 * @param {object} playbackData - Playback event data
 */
export async function queuePlaybackEvent(playbackData) {
  await queueOfflineEvent('playback', {
    ...playbackData,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Queue an error for later sync
 * @param {object} errorData - Error data
 */
export async function queueError(errorData) {
  await queueOfflineEvent('error', {
    ...errorData,
    timestamp: new Date().toISOString(),
  });
}

// ============================================================================
// CACHE STATUS
// ============================================================================

/**
 * Get cache status for device
 * @param {string} sceneId - Currently assigned scene ID
 */
export async function getCacheStatus(sceneId) {
  const lastSync = await getLastSyncInfo();
  const cacheSize = await getCacheSize();

  let status = 'none';

  if (sceneId) {
    const cachedScene = await getCachedScene(sceneId);

    if (cachedScene) {
      if (cachedScene.isStale) {
        status = 'stale';
      } else {
        status = 'ok';
      }
    } else {
      status = 'none';
    }
  }

  return {
    status,
    sceneId,
    lastSync,
    cacheSize,
    isOffline: isOfflineMode,
  };
}

/**
 * Report cache status to server
 * @param {string} deviceId - Device UUID
 * @param {string} sceneId - Scene UUID
 * @param {string} contentHash - Cached content hash
 */
export async function reportCacheStatus(deviceId, sceneId, contentHash) {
  if (!deviceId || isOfflineMode || !isOnline()) return;

  try {
    const { error } = await supabase.rpc('update_device_cache_status', {
      p_device_id: deviceId,
      p_scene_id: sceneId,
      p_content_hash: contentHash,
      p_cache_status: 'ok',
    });

    if (error) throw error;
  } catch (error) {
    logger.warn('[OfflineService] Failed to report cache status:', error);
  }
}

// ============================================================================
// INITIALIZATION
// ============================================================================

/**
 * Initialize offline service
 */
export async function initOfflineService() {
  logger.debug('[OfflineService] Initializing...');

  // Register service worker
  await registerServiceWorker();

  // Set up online/offline detection
  initOfflineDetection();

  // Clear stale cache entries
  await clearStaleCache(7);

  logger.debug('[OfflineService] Initialized');
}

/**
 * Get full offline service info for diagnostics
 */
export async function getOfflineServiceInfo() {
  const cacheInfo = await getCacheInfo();
  const pendingEvents = await getPendingEvents();

  return {
    isOffline: isOfflineMode,
    lastHeartbeat: new Date(lastHeartbeatSuccess).toISOString(),
    serviceWorkerReady,
    browserOnline: navigator.onLine,
    cache: cacheInfo,
    pendingEvents: pendingEvents.length,
    config: OFFLINE_CONFIG,
  };
}
