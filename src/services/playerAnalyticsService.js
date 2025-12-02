/**
 * Player Analytics Service
 *
 * Handles batching and sending playback events from the TV player to the backend.
 * Events are queued locally and flushed periodically to reduce network overhead.
 */

// Configuration
const FLUSH_INTERVAL_MS = 30000; // Flush every 30 seconds
const MAX_QUEUE_SIZE = 100; // Force flush if queue exceeds this
const API_ENDPOINT = '/api/analytics/playback-batch';

// Local state
let eventQueue = [];
let flushTimer = null;
let sessionId = null;
let currentEvent = null;

/**
 * Generate a unique session ID for this player session
 */
export function initSession() {
  sessionId = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  startFlushTimer();

  // Flush on page unload
  if (typeof window !== 'undefined') {
    window.addEventListener('beforeunload', () => {
      flushEvents(true); // Sync flush on unload
    });
  }

  return sessionId;
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
  }, FLUSH_INTERVAL_MS);
}

/**
 * Stop the flush timer
 */
export function stopSession() {
  if (flushTimer) {
    clearInterval(flushTimer);
    flushTimer = null;
  }
  // Flush any remaining events
  flushEvents(true);
  sessionId = null;
}

/**
 * Start tracking a new playback event
 * Call this when content starts playing
 */
export function startPlaybackEvent({
  screenId,
  tenantId,
  locationId,
  playlistId,
  layoutId,
  zoneId,
  mediaId,
  appId,
  campaignId, // Campaign ID if content is from an active campaign
  itemType, // 'media' | 'app' | 'layout' | 'playlist'
  itemName, // For debugging
}) {
  // If there's an ongoing event, end it first
  if (currentEvent) {
    endPlaybackEvent();
  }

  currentEvent = {
    screenId,
    tenantId,
    locationId: locationId || null,
    playlistId: playlistId || null,
    layoutId: layoutId || null,
    zoneId: zoneId || null,
    mediaId: mediaId || null,
    appId: appId || null,
    campaignId: campaignId || null,
    itemType,
    itemName, // Not sent to server, just for debugging
    startedAt: new Date().toISOString(),
    playerSessionId: sessionId,
  };

  console.log('[Analytics] Started tracking:', itemType, itemName || mediaId, campaignId ? `(campaign: ${campaignId})` : '');

  return currentEvent;
}

/**
 * End the current playback event
 * Call this when content finishes playing
 */
export function endPlaybackEvent() {
  if (!currentEvent) {
    return null;
  }

  const endedAt = new Date();
  const startedAt = new Date(currentEvent.startedAt);
  const durationSeconds = Math.round((endedAt - startedAt) / 1000);

  // Only queue events that lasted at least 1 second
  if (durationSeconds >= 1) {
    const completedEvent = {
      ...currentEvent,
      endedAt: endedAt.toISOString(),
      durationSeconds,
    };

    // Remove debug fields before queueing
    delete completedEvent.itemName;

    queuePlaybackEvent(completedEvent);
    console.log('[Analytics] Ended tracking:', currentEvent.itemType, 'duration:', durationSeconds, 's');
  } else {
    console.log('[Analytics] Skipped short event:', durationSeconds, 's');
  }

  currentEvent = null;
  return durationSeconds;
}

/**
 * Queue a completed playback event for batch sending
 */
function queuePlaybackEvent(event) {
  eventQueue.push(event);

  // Force flush if queue is getting large
  if (eventQueue.length >= MAX_QUEUE_SIZE) {
    console.log('[Analytics] Queue full, flushing...');
    flushEvents();
  }
}

/**
 * Flush queued events to the server
 * @param {boolean} sync - If true, use synchronous request (for beforeunload)
 */
export async function flushEvents(sync = false) {
  if (eventQueue.length === 0) {
    return;
  }

  // Take current queue and reset
  const eventsToSend = [...eventQueue];
  eventQueue = [];

  console.log('[Analytics] Flushing', eventsToSend.length, 'events');

  try {
    if (sync && typeof navigator !== 'undefined' && navigator.sendBeacon) {
      // Use sendBeacon for reliable delivery on page unload
      const blob = new Blob([JSON.stringify({ events: eventsToSend })], {
        type: 'application/json',
      });
      navigator.sendBeacon(API_ENDPOINT, blob);
    } else {
      // Regular fetch for normal flushes
      const response = await fetch(API_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ events: eventsToSend }),
      });

      if (!response.ok) {
        // Put events back in queue on failure
        console.error('[Analytics] Flush failed, re-queuing events');
        eventQueue = [...eventsToSend, ...eventQueue];
      }
    }
  } catch (error) {
    console.error('[Analytics] Flush error:', error);
    // Put events back in queue on error
    eventQueue = [...eventsToSend, ...eventQueue];
  }
}

/**
 * Get current queue size (for debugging)
 */
export function getQueueSize() {
  return eventQueue.length;
}

/**
 * Get current session ID
 */
export function getSessionId() {
  return sessionId;
}

/**
 * Check if there's an active event being tracked
 */
export function hasActiveEvent() {
  return currentEvent !== null;
}

/**
 * Get current event details (for debugging)
 */
export function getCurrentEvent() {
  return currentEvent;
}
