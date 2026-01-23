/**
 * Playback Tracking Service
 *
 * Handles tracking of scene playback events, player status, and offline queueing.
 * Events are queued locally and flushed periodically to reduce network overhead.
 * Integrates with offline mode for reliable delivery when connection is restored.
 */

import { supabase } from '../supabase';
import { createScopedLogger } from './loggingService.js';

const logger = createScopedLogger('PlaybackTracking');

// ============================================================================
// CONFIGURATION
// ============================================================================

const CONFIG = {
  FLUSH_INTERVAL_MS: 30000, // Flush every 30 seconds
  MAX_QUEUE_SIZE: 50, // Force flush if queue exceeds this
  OFFLINE_STORAGE_KEY: 'playback_events_offline_queue',
  MIN_EVENT_DURATION_SECONDS: 1, // Minimum duration to track
};

// Event types
export const EVENT_TYPES = {
  SCENE_START: 'scene_start',
  SCENE_END: 'scene_end',
  PLAYER_ONLINE: 'player_online',
  PLAYER_OFFLINE: 'player_offline',
  MEDIA_PLAY: 'media_play',
  // Enhanced metrics
  SEGMENT_PROGRESS: 'segment_progress',
  MEDIA_LOAD: 'media_load',
  MEDIA_ERROR: 'media_error',
  INTERACTION: 'interaction',
  NETWORK_CHANGE: 'network_change',
  FRAME_DROP: 'frame_drop',
};

// ============================================================================
// STATE
// ============================================================================

let eventQueue = [];
let flushTimer = null;
let sessionId = null;
let currentSceneEvent = null;
let isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
let deviceContext = null; // { deviceId, tenantId, groupId, locationId }

// ============================================================================
// INITIALIZATION
// ============================================================================

/**
 * Initialize the tracking service with device context
 * @param {Object} context - Device context
 * @param {string} context.deviceId - Device UUID
 * @param {string} context.tenantId - Tenant UUID
 * @param {string} [context.groupId] - Screen group UUID
 * @param {string} [context.locationId] - Location UUID
 */
export function initTracking(context) {
  deviceContext = {
    deviceId: context.deviceId,
    tenantId: context.tenantId,
    groupId: context.groupId || null,
    locationId: context.locationId || null,
  };

  sessionId = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

  // Load any queued events from offline storage
  loadOfflineQueue();

  // Start flush timer
  startFlushTimer();

  // Setup online/offline listeners
  if (typeof window !== 'undefined') {
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('beforeunload', handleUnload);
  }

  logger.info('Initialized', { sessionId, deviceId: context.deviceId });

  return sessionId;
}

/**
 * Stop the tracking service
 */
export function stopTracking() {
  // End any active scene
  if (currentSceneEvent) {
    trackSceneEnd();
  }

  // Stop flush timer
  if (flushTimer) {
    clearInterval(flushTimer);
    flushTimer = null;
  }

  // Final flush
  flushEvents(true);

  // Cleanup listeners
  if (typeof window !== 'undefined') {
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
    window.removeEventListener('beforeunload', handleUnload);
  }

  sessionId = null;
  deviceContext = null;
  logger.info('Stopped');
}

// ============================================================================
// SCENE TRACKING
// ============================================================================

/**
 * Track scene start
 * @param {Object} params - Scene parameters
 * @param {string} params.sceneId - Scene UUID
 * @param {string} [params.scheduleId] - Schedule UUID if from schedule
 * @param {string} [params.groupId] - Override group ID
 */
export function trackSceneStart({ sceneId, scheduleId, groupId }) {
  if (!deviceContext) {
    logger.warn('Not initialized');
    return null;
  }

  // End previous scene if any
  if (currentSceneEvent) {
    trackSceneEnd();
  }

  const startedAt = new Date().toISOString();

  currentSceneEvent = {
    eventType: EVENT_TYPES.SCENE_START,
    tenantId: deviceContext.tenantId,
    screenId: deviceContext.deviceId,
    sceneId,
    groupId: groupId || deviceContext.groupId,
    locationId: deviceContext.locationId,
    scheduleId: scheduleId || null,
    startedAt,
    playerSessionId: sessionId,
    itemType: 'scene',
  };

  logger.debug('Scene started', { sceneId, scheduleId, screenId: deviceContext.deviceId });

  return currentSceneEvent;
}

/**
 * Track scene end
 * @returns {number|null} Duration in seconds, or null if no active scene
 */
export function trackSceneEnd() {
  if (!currentSceneEvent) {
    return null;
  }

  const endedAt = new Date();
  const startedAt = new Date(currentSceneEvent.startedAt);
  const durationSeconds = Math.round((endedAt - startedAt) / 1000);

  // Only queue events that lasted at least minimum duration
  if (durationSeconds >= CONFIG.MIN_EVENT_DURATION_SECONDS) {
    const completedEvent = {
      ...currentSceneEvent,
      eventType: EVENT_TYPES.SCENE_END,
      endedAt: endedAt.toISOString(),
      durationSeconds,
    };

    queueEvent(completedEvent);
    logger.debug('Scene ended', { sceneId: currentSceneEvent.sceneId, durationSeconds });
  } else {
    logger.debug('Scene too short, skipped', { durationSeconds });
  }

  currentSceneEvent = null;
  return durationSeconds;
}

/**
 * Get the currently active scene event
 */
export function getCurrentSceneEvent() {
  return currentSceneEvent;
}

// ============================================================================
// PLAYER STATUS TRACKING
// ============================================================================

/**
 * Track player coming online
 * @param {Date} [at] - Timestamp, defaults to now
 */
export function trackPlayerOnline(at) {
  if (!deviceContext) {
    logger.warn('Not initialized');
    return;
  }

  const timestamp = at ? new Date(at).toISOString() : new Date().toISOString();

  const event = {
    eventType: EVENT_TYPES.PLAYER_ONLINE,
    tenantId: deviceContext.tenantId,
    screenId: deviceContext.deviceId,
    groupId: deviceContext.groupId,
    locationId: deviceContext.locationId,
    startedAt: timestamp,
    playerSessionId: sessionId,
    itemType: 'status',
  };

  queueEvent(event);
  logger.info('Player online', { deviceId: deviceContext?.deviceId });
}

/**
 * Track player going offline
 * @param {Date} [at] - Timestamp, defaults to now
 */
export function trackPlayerOffline(at) {
  if (!deviceContext) {
    logger.warn('Not initialized');
    return;
  }

  // End current scene first
  if (currentSceneEvent) {
    trackSceneEnd();
  }

  const timestamp = at ? new Date(at).toISOString() : new Date().toISOString();

  const event = {
    eventType: EVENT_TYPES.PLAYER_OFFLINE,
    tenantId: deviceContext.tenantId,
    screenId: deviceContext.deviceId,
    groupId: deviceContext.groupId,
    locationId: deviceContext.locationId,
    startedAt: timestamp,
    playerSessionId: sessionId,
    itemType: 'status',
  };

  queueEvent(event);
  logger.info('Player offline', { deviceId: deviceContext?.deviceId });
}

// ============================================================================
// MEDIA TRACKING (OPTIONAL)
// ============================================================================

/**
 * Track media playback within a scene
 * @param {Object} params - Media parameters
 * @param {string} params.mediaId - Media asset UUID
 * @param {string} [params.playlistId] - Playlist UUID
 * @param {number} params.durationSeconds - Duration played
 */
export function trackMediaPlay({ mediaId, playlistId, durationSeconds }) {
  if (!deviceContext) {
    logger.warn('Not initialized');
    return;
  }

  if (durationSeconds < CONFIG.MIN_EVENT_DURATION_SECONDS) {
    return;
  }

  const now = new Date();
  const startedAt = new Date(now.getTime() - durationSeconds * 1000);

  const event = {
    eventType: EVENT_TYPES.MEDIA_PLAY,
    tenantId: deviceContext.tenantId,
    screenId: deviceContext.deviceId,
    sceneId: currentSceneEvent?.sceneId || null,
    groupId: deviceContext.groupId,
    locationId: deviceContext.locationId,
    mediaId,
    playlistId: playlistId || null,
    startedAt: startedAt.toISOString(),
    endedAt: now.toISOString(),
    durationSeconds,
    playerSessionId: sessionId,
    itemType: 'media',
  };

  queueEvent(event);
}

// ============================================================================
// ENHANCED METRICS TRACKING
// ============================================================================

/**
 * Track segment progress (quartile completion)
 * Call this at 25%, 50%, 75%, 100% of slide duration
 * @param {Object} params - Progress parameters
 * @param {string} params.slideId - Slide UUID
 * @param {number} params.progress - Progress percentage (25, 50, 75, 100)
 * @param {number} params.totalDuration - Total slide duration in seconds
 */
export function trackSegmentProgress({ slideId, progress, totalDuration }) {
  if (!deviceContext) return;

  const event = {
    eventType: EVENT_TYPES.SEGMENT_PROGRESS,
    tenantId: deviceContext.tenantId,
    screenId: deviceContext.deviceId,
    sceneId: currentSceneEvent?.sceneId || null,
    groupId: deviceContext.groupId,
    locationId: deviceContext.locationId,
    startedAt: new Date().toISOString(),
    playerSessionId: sessionId,
    itemType: 'segment',
    segmentProgress: {
      slideId,
      progress,
      totalDuration,
      quartile: Math.floor(progress / 25),
    },
  };

  queueEvent(event);
}

/**
 * Track media load latency
 * @param {Object} params - Load parameters
 * @param {string} params.url - Media URL
 * @param {string} params.mediaType - 'image' | 'video'
 * @param {number} params.latencyMs - Load time in milliseconds
 * @param {number} [params.bytes] - File size in bytes
 * @param {boolean} [params.cached] - Whether loaded from cache
 */
export function trackMediaLoad({ url, mediaType, latencyMs, bytes, cached = false }) {
  if (!deviceContext) return;

  const event = {
    eventType: EVENT_TYPES.MEDIA_LOAD,
    tenantId: deviceContext.tenantId,
    screenId: deviceContext.deviceId,
    sceneId: currentSceneEvent?.sceneId || null,
    groupId: deviceContext.groupId,
    startedAt: new Date().toISOString(),
    playerSessionId: sessionId,
    itemType: 'media_load',
    loadLatencyMs: latencyMs,
    mediaLoadDetails: {
      url: url.substring(0, 500), // Truncate long URLs
      mediaType,
      bytes,
      cached,
    },
  };

  queueEvent(event);
}

/**
 * Track media load error
 * @param {Object} params - Error parameters
 * @param {string} params.url - Media URL that failed
 * @param {string} params.mediaType - 'image' | 'video'
 * @param {string} params.error - Error message
 * @param {number} [params.httpStatus] - HTTP status code
 */
export function trackMediaError({ url, mediaType, error, httpStatus }) {
  if (!deviceContext) return;

  const event = {
    eventType: EVENT_TYPES.MEDIA_ERROR,
    tenantId: deviceContext.tenantId,
    screenId: deviceContext.deviceId,
    sceneId: currentSceneEvent?.sceneId || null,
    groupId: deviceContext.groupId,
    startedAt: new Date().toISOString(),
    playerSessionId: sessionId,
    itemType: 'error',
    errorDetails: {
      url: url.substring(0, 500),
      mediaType,
      error: error.substring(0, 500),
      httpStatus,
    },
  };

  queueEvent(event);
  logger.warn('Media error', { mediaType, error: error.substring(0, 100), url: url.substring(0, 100), sceneId: currentSceneEvent?.sceneId });
}

/**
 * Track user interaction (pause, skip, etc.)
 * @param {Object} params - Interaction parameters
 * @param {string} params.action - 'pause' | 'resume' | 'skip' | 'replay'
 * @param {string} [params.slideId] - Current slide
 */
export function trackInteraction({ action, slideId }) {
  if (!deviceContext) return;

  const event = {
    eventType: EVENT_TYPES.INTERACTION,
    tenantId: deviceContext.tenantId,
    screenId: deviceContext.deviceId,
    sceneId: currentSceneEvent?.sceneId || null,
    groupId: deviceContext.groupId,
    startedAt: new Date().toISOString(),
    playerSessionId: sessionId,
    itemType: 'interaction',
    interactionDetails: {
      action,
      slideId,
    },
  };

  queueEvent(event);
}

/**
 * Track network quality change
 * @param {Object} params - Network parameters
 * @param {string} params.level - Bandwidth level (fast-4g, 4g, 3g, 2g, slow-2g)
 * @param {number} [params.downlink] - Downlink speed in Mbps
 * @param {number} [params.rtt] - Round trip time in ms
 */
export function trackNetworkChange({ level, downlink, rtt }) {
  if (!deviceContext) return;

  const event = {
    eventType: EVENT_TYPES.NETWORK_CHANGE,
    tenantId: deviceContext.tenantId,
    screenId: deviceContext.deviceId,
    groupId: deviceContext.groupId,
    startedAt: new Date().toISOString(),
    playerSessionId: sessionId,
    itemType: 'network',
    networkQuality: level,
    networkDetails: {
      level,
      downlink,
      rtt,
    },
  };

  queueEvent(event);
}

/**
 * Track frame drop event (detected via timing gaps)
 * @param {Object} params - Frame drop parameters
 * @param {number} params.expectedMs - Expected frame time
 * @param {number} params.actualMs - Actual frame time
 * @param {number} params.droppedFrames - Estimated dropped frames
 */
export function trackFrameDrop({ expectedMs, actualMs, droppedFrames }) {
  if (!deviceContext) return;

  // Only track significant drops (more than 2 frames)
  if (droppedFrames < 3) return;

  const event = {
    eventType: EVENT_TYPES.FRAME_DROP,
    tenantId: deviceContext.tenantId,
    screenId: deviceContext.deviceId,
    sceneId: currentSceneEvent?.sceneId || null,
    groupId: deviceContext.groupId,
    startedAt: new Date().toISOString(),
    playerSessionId: sessionId,
    itemType: 'performance',
    frameDropDetails: {
      expectedMs,
      actualMs,
      droppedFrames,
      severity: droppedFrames > 10 ? 'high' : droppedFrames > 5 ? 'medium' : 'low',
    },
  };

  queueEvent(event);
}

/**
 * Get tracking summary for current session
 * @returns {Object} Summary of tracked events
 */
export function getTrackingSummary() {
  const summary = {
    sessionId,
    queueSize: eventQueue.length,
    isOnline,
    currentScene: currentSceneEvent?.sceneId || null,
    eventCounts: {},
  };

  for (const event of eventQueue) {
    summary.eventCounts[event.eventType] = (summary.eventCounts[event.eventType] || 0) + 1;
  }

  return summary;
}

// ============================================================================
// QUEUE MANAGEMENT
// ============================================================================

/**
 * Add event to queue
 */
function queueEvent(event) {
  eventQueue.push(event);

  // Force flush if queue is getting large
  if (eventQueue.length >= CONFIG.MAX_QUEUE_SIZE) {
    logger.debug('Queue full, flushing', { queueSize: eventQueue.length });
    flushEvents();
  }
}

/**
 * Start the periodic flush timer
 */
function startFlushTimer() {
  if (flushTimer) {
    clearInterval(flushTimer);
  }
  flushTimer = setInterval(() => {
    flushEvents();
  }, CONFIG.FLUSH_INTERVAL_MS);
}

/**
 * Flush queued events to the server
 * @param {boolean} sync - If true, use synchronous request
 */
export async function flushEvents(sync = false) {
  if (eventQueue.length === 0) {
    return { inserted: 0, errors: 0 };
  }

  // Don't try to flush if offline
  if (!isOnline) {
    saveOfflineQueue();
    return { inserted: 0, errors: 0, offline: true };
  }

  // Take current queue and reset
  const eventsToSend = [...eventQueue];
  eventQueue = [];

  logger.debug('Flushing events', { count: eventsToSend.length });

  try {
    if (sync && typeof navigator !== 'undefined' && navigator.sendBeacon) {
      // Use sendBeacon for reliable delivery on page unload
      const blob = new Blob([JSON.stringify(eventsToSend)], {
        type: 'application/json',
      });
      navigator.sendBeacon('/api/analytics/playback-events', blob);
      return { inserted: eventsToSend.length, errors: 0 };
    }

    // Use Supabase RPC for normal flushes
    const { data, error } = await supabase.rpc('insert_playback_events', {
      events: eventsToSend,
    });

    if (error) {
      logger.error('Flush failed', { error });
      // Re-queue failed events
      eventQueue = [...eventsToSend, ...eventQueue];
      saveOfflineQueue();
      return { inserted: 0, errors: eventsToSend.length };
    }

    // Clear offline queue on success
    clearOfflineQueue();

    return data || { inserted: eventsToSend.length, errors: 0 };
  } catch (error) {
    logger.error('Flush exception', { error });
    // Re-queue events on error
    eventQueue = [...eventsToSend, ...eventQueue];
    saveOfflineQueue();
    return { inserted: 0, errors: eventsToSend.length };
  }
}

// ============================================================================
// OFFLINE STORAGE
// ============================================================================

/**
 * Save queue to localStorage for offline persistence
 */
function saveOfflineQueue() {
  if (typeof localStorage === 'undefined') return;

  try {
    localStorage.setItem(CONFIG.OFFLINE_STORAGE_KEY, JSON.stringify(eventQueue));
    logger.debug('Saved events to offline storage', { count: eventQueue.length });
  } catch (error) {
    logger.error('Failed to save offline queue', { error });
  }
}

/**
 * Load queue from localStorage
 */
function loadOfflineQueue() {
  if (typeof localStorage === 'undefined') return;

  try {
    const stored = localStorage.getItem(CONFIG.OFFLINE_STORAGE_KEY);
    if (stored) {
      const events = JSON.parse(stored);
      if (Array.isArray(events) && events.length > 0) {
        eventQueue = [...events, ...eventQueue];
        logger.debug('Loaded events from offline storage', { count: events.length });
      }
    }
  } catch (error) {
    logger.error('Failed to load offline queue', { error });
  }
}

/**
 * Clear offline queue from localStorage
 */
function clearOfflineQueue() {
  if (typeof localStorage === 'undefined') return;

  try {
    localStorage.removeItem(CONFIG.OFFLINE_STORAGE_KEY);
  } catch (error) {
    // Ignore
  }
}

// ============================================================================
// EVENT HANDLERS
// ============================================================================

function handleOnline() {
  logger.info('Connection restored');
  isOnline = true;
  trackPlayerOnline();
  // Try to flush queued events
  flushEvents();
}

function handleOffline() {
  logger.info('Connection lost');
  isOnline = false;
  trackPlayerOffline();
  saveOfflineQueue();
}

function handleUnload() {
  // End current scene and flush
  if (currentSceneEvent) {
    trackSceneEnd();
  }
  flushEvents(true);
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Get queue size (for debugging)
 */
export function getQueueSize() {
  return eventQueue.length;
}

/**
 * Get session ID
 */
export function getSessionId() {
  return sessionId;
}

/**
 * Check if tracking is initialized
 */
export function isInitialized() {
  return sessionId !== null;
}

/**
 * Update device context (e.g., when group changes)
 */
export function updateContext(updates) {
  if (deviceContext) {
    deviceContext = { ...deviceContext, ...updates };
  }
}

/**
 * Check if there's an active scene being tracked
 */
export function hasActiveScene() {
  return currentSceneEvent !== null;
}
