/**
 * Cache Service for TV Player
 * Uses IndexedDB (via idb) for local storage of scenes, media, and device state.
 *
 * Stores:
 * - scenes: Cached scene design JSON
 * - media: Cached media blobs
 * - deviceState: Device sync state and offline queue
 * - offlineQueue: Queued events for sync when online
 */

import { openDB } from 'idb';
import { createScopedLogger } from '../services/loggingService.js';

const logger = createScopedLogger('CacheService');

const DB_NAME = 'bizscreen-player-cache';
const DB_VERSION = 1;

// Store names
const STORES = {
  SCENES: 'scenes',
  MEDIA: 'media',
  DEVICE_STATE: 'deviceState',
  OFFLINE_QUEUE: 'offlineQueue',
};

// Cache limits for LRU eviction
export const CACHE_LIMITS = {
  media: {
    maxBytes: 500_000_000, // 500 MB
    maxEntries: 1000,
  },
  scenes: {
    maxBytes: 100_000_000, // 100 MB
    maxEntries: 500,
  },
};

// Database instance
let dbInstance = null;

/**
 * Initialize the IndexedDB database
 */
async function initDB() {
  if (dbInstance) return dbInstance;

  dbInstance = await openDB(DB_NAME, DB_VERSION, {
    upgrade(db, oldVersion, newVersion, transaction) {
      logger.debug('[CacheService] Upgrading database from', oldVersion, 'to', newVersion);

      // Scenes store
      if (!db.objectStoreNames.contains(STORES.SCENES)) {
        const scenesStore = db.createObjectStore(STORES.SCENES, { keyPath: 'id' });
        scenesStore.createIndex('contentHash', 'contentHash');
        scenesStore.createIndex('cachedAt', 'cachedAt');
      }

      // Media store
      if (!db.objectStoreNames.contains(STORES.MEDIA)) {
        const mediaStore = db.createObjectStore(STORES.MEDIA, { keyPath: 'url' });
        mediaStore.createIndex('sceneId', 'sceneId');
        mediaStore.createIndex('cachedAt', 'cachedAt');
        mediaStore.createIndex('size', 'size');
      }

      // Device state store
      if (!db.objectStoreNames.contains(STORES.DEVICE_STATE)) {
        db.createObjectStore(STORES.DEVICE_STATE, { keyPath: 'key' });
      }

      // Offline queue store
      if (!db.objectStoreNames.contains(STORES.OFFLINE_QUEUE)) {
        const queueStore = db.createObjectStore(STORES.OFFLINE_QUEUE, {
          keyPath: 'id',
          autoIncrement: true
        });
        queueStore.createIndex('eventType', 'eventType');
        queueStore.createIndex('createdAt', 'createdAt');
        queueStore.createIndex('synced', 'synced');
      }
    },
  });

  return dbInstance;
}

/**
 * Get the database instance
 */
async function getDB() {
  if (!dbInstance) {
    await initDB();
  }
  return dbInstance;
}

// ============================================================================
// LRU EVICTION
// ============================================================================

/**
 * Evict least recently used entries to stay within limits
 * @param {string} storeName - Store name (STORES.SCENES or STORES.MEDIA)
 * @param {number} maxBytes - Maximum bytes allowed
 * @param {number} maxEntries - Maximum entries allowed
 * @returns {Promise<{evictedCount: number, freedBytes: number}>}
 */
async function evictLRUEntries(storeName, maxBytes, maxEntries) {
  const db = await getDB();
  const all = await db.getAll(storeName);

  if (all.length === 0) {
    return { evictedCount: 0, freedBytes: 0 };
  }

  // Calculate current size
  let currentSize = 0;
  const entriesWithSize = all.map(entry => {
    const size = entry.size || new Blob([JSON.stringify(entry)]).size;
    currentSize += size;
    return { ...entry, _calculatedSize: size };
  });

  // Check if eviction needed
  if (currentSize <= maxBytes && all.length <= maxEntries) {
    return { evictedCount: 0, freedBytes: 0 };
  }

  // Sort by lastAccessedAt (oldest first) - fallback to cachedAt
  const sorted = entriesWithSize.sort((a, b) => {
    const aTime = new Date(a.lastAccessedAt || a.cachedAt || 0).getTime();
    const bTime = new Date(b.lastAccessedAt || b.cachedAt || 0).getTime();
    return aTime - bTime;
  });

  let evictedCount = 0;
  let freedBytes = 0;

  // Evict until we're under limits (with 10% buffer)
  const targetBytes = maxBytes * 0.9;
  const targetEntries = maxEntries * 0.9;

  for (const entry of sorted) {
    if (currentSize <= targetBytes && (all.length - evictedCount) <= targetEntries) {
      break;
    }

    const key = storeName === STORES.SCENES ? entry.id : entry.url;
    await db.delete(storeName, key);

    currentSize -= entry._calculatedSize;
    freedBytes += entry._calculatedSize;
    evictedCount++;
  }

  if (evictedCount > 0) {
    logger.debug(
      `[CacheService] LRU eviction: removed ${evictedCount} entries, freed ${formatBytes(freedBytes)}`
    );
  }

  return { evictedCount, freedBytes };
}

/**
 * Run eviction for all stores
 * @returns {Promise<{scenes: object, media: object}>}
 */
export async function runEviction() {
  const scenesResult = await evictLRUEntries(
    STORES.SCENES,
    CACHE_LIMITS.scenes.maxBytes,
    CACHE_LIMITS.scenes.maxEntries
  );
  const mediaResult = await evictLRUEntries(
    STORES.MEDIA,
    CACHE_LIMITS.media.maxBytes,
    CACHE_LIMITS.media.maxEntries
  );

  return { scenes: scenesResult, media: mediaResult };
}

/**
 * Update lastAccessedAt for an entry
 * @param {string} storeName - Store name
 * @param {string} key - Entry key
 */
async function touchEntry(storeName, key) {
  const db = await getDB();
  const entry = await db.get(storeName, key);

  if (entry) {
    entry.lastAccessedAt = new Date().toISOString();
    await db.put(storeName, entry);
  }
}

// ============================================================================
// SCENE CACHING
// ============================================================================

/**
 * Cache a scene with its design JSON
 * @param {string} sceneId - Scene UUID
 * @param {object} sceneData - Scene data including design_json
 * @returns {Promise<void>}
 */
export async function cacheScene(sceneId, sceneData) {
  if (!sceneId || !sceneData) {
    throw new Error('Scene ID and data are required');
  }

  // Run eviction before adding new entry
  await evictLRUEntries(
    STORES.SCENES,
    CACHE_LIMITS.scenes.maxBytes,
    CACHE_LIMITS.scenes.maxEntries
  );

  const db = await getDB();
  const now = new Date().toISOString();

  const cacheEntry = {
    id: sceneId,
    name: sceneData.name || 'Unknown',
    designJson: sceneData.design_json || sceneData.designJson,
    contentHash: sceneData.content_hash || sceneData.contentHash,
    mediaHash: sceneData.media_hash || sceneData.mediaHash,
    businessType: sceneData.business_type || sceneData.businessType,
    mediaUrls: sceneData.media_urls || sceneData.mediaUrls || [],
    cachedAt: now,
    lastAccessedAt: now,
    isStale: false,
  };

  await db.put(STORES.SCENES, cacheEntry);
  logger.debug('[CacheService] Cached scene:', sceneId);
}

/**
 * Get a cached scene by ID
 * @param {string} sceneId - Scene UUID
 * @returns {Promise<object|null>}
 */
export async function getCachedScene(sceneId) {
  if (!sceneId) return null;

  const db = await getDB();
  const scene = await db.get(STORES.SCENES, sceneId);

  if (scene) {
    // Update lastAccessedAt for LRU tracking
    touchEntry(STORES.SCENES, sceneId);
    logger.debug('[CacheService] Retrieved cached scene:', sceneId);
  }

  return scene || null;
}

/**
 * Get all cached scenes
 * @returns {Promise<Array>}
 */
export async function getAllCachedScenes() {
  const db = await getDB();
  return db.getAll(STORES.SCENES);
}

/**
 * Mark a scene as stale (needs update)
 * @param {string} sceneId - Scene UUID
 */
export async function markSceneAsStale(sceneId) {
  if (!sceneId) return;

  const db = await getDB();
  const scene = await db.get(STORES.SCENES, sceneId);

  if (scene) {
    scene.isStale = true;
    scene.markedStaleAt = new Date().toISOString();
    await db.put(STORES.SCENES, scene);
    logger.debug('[CacheService] Marked scene as stale:', sceneId);
  }
}

/**
 * Delete a cached scene
 * @param {string} sceneId - Scene UUID
 */
export async function deleteCachedScene(sceneId) {
  if (!sceneId) return;

  const db = await getDB();
  await db.delete(STORES.SCENES, sceneId);

  // Also delete associated media
  const allMedia = await db.getAllFromIndex(STORES.MEDIA, 'sceneId', sceneId);
  for (const media of allMedia) {
    await db.delete(STORES.MEDIA, media.url);
  }

  logger.debug('[CacheService] Deleted cached scene and media:', sceneId);
}

// ============================================================================
// MEDIA CACHING
// ============================================================================

/**
 * Cache a media file as a blob
 * @param {string} url - Media URL
 * @param {Blob} blob - Media blob data
 * @param {string} sceneId - Associated scene ID (optional)
 */
export async function cacheMedia(url, blob, sceneId = null) {
  if (!url || !blob) {
    throw new Error('URL and blob are required');
  }

  // Run eviction before adding new entry
  await evictLRUEntries(
    STORES.MEDIA,
    CACHE_LIMITS.media.maxBytes,
    CACHE_LIMITS.media.maxEntries
  );

  const db = await getDB();
  const now = new Date().toISOString();

  const cacheEntry = {
    url,
    blob,
    sceneId,
    mimeType: blob.type,
    size: blob.size,
    cachedAt: now,
    lastAccessedAt: now,
  };

  await db.put(STORES.MEDIA, cacheEntry);
  logger.debug('[CacheService] Cached media:', url, `(${formatBytes(blob.size)})`);
}

/**
 * Get cached media by URL
 * @param {string} url - Media URL
 * @returns {Promise<Blob|null>}
 */
export async function getCachedMedia(url) {
  if (!url) return null;

  const db = await getDB();
  const entry = await db.get(STORES.MEDIA, url);

  if (entry?.blob) {
    // Update lastAccessedAt for LRU tracking
    touchEntry(STORES.MEDIA, url);
    logger.debug('[CacheService] Retrieved cached media:', url);
    return entry.blob;
  }

  return null;
}

/**
 * Get cached media as object URL
 * @param {string} url - Original media URL
 * @returns {Promise<string|null>} Object URL or null
 */
export async function getCachedMediaUrl(url) {
  const blob = await getCachedMedia(url);
  if (blob) {
    return URL.createObjectURL(blob);
  }
  return null;
}

/**
 * Cache multiple media files
 * @param {Array<string>} urls - Array of media URLs
 * @param {string} sceneId - Associated scene ID
 * @param {function} onProgress - Progress callback (cached, total)
 * @returns {Promise<{success: number, failed: number}>}
 */
export async function cacheMultipleMedia(urls, sceneId = null, onProgress = null) {
  if (!urls || urls.length === 0) {
    return { success: 0, failed: 0 };
  }

  let success = 0;
  let failed = 0;

  for (let i = 0; i < urls.length; i++) {
    const url = urls[i];

    try {
      // Check if already cached
      const existing = await getCachedMedia(url);
      if (existing) {
        success++;
        onProgress?.(success + failed, urls.length);
        continue;
      }

      // Fetch and cache
      const response = await fetch(url);
      if (response.ok) {
        const blob = await response.blob();
        await cacheMedia(url, blob, sceneId);
        success++;
      } else {
        failed++;
        logger.warn('[CacheService] Failed to fetch media:', url, response.status);
      }
    } catch (error) {
      failed++;
      logger.warn('[CacheService] Error caching media:', url, error);
    }

    onProgress?.(success + failed, urls.length);
  }

  return { success, failed };
}

/**
 * Delete cached media for a scene
 * @param {string} sceneId - Scene UUID
 */
export async function deleteMediaForScene(sceneId) {
  if (!sceneId) return;

  const db = await getDB();
  const allMedia = await db.getAllFromIndex(STORES.MEDIA, 'sceneId', sceneId);

  for (const media of allMedia) {
    await db.delete(STORES.MEDIA, media.url);
  }

  logger.debug('[CacheService] Deleted', allMedia.length, 'media files for scene:', sceneId);
}

// ============================================================================
// DEVICE STATE
// ============================================================================

/**
 * Save device state
 * @param {string} key - State key
 * @param {any} value - State value
 */
export async function saveDeviceState(key, value) {
  const db = await getDB();
  await db.put(STORES.DEVICE_STATE, { key, value, updatedAt: new Date().toISOString() });
}

/**
 * Get device state
 * @param {string} key - State key
 * @returns {Promise<any>}
 */
export async function getDeviceState(key) {
  const db = await getDB();
  const entry = await db.get(STORES.DEVICE_STATE, key);
  return entry?.value;
}

/**
 * Get last successful sync info
 */
export async function getLastSyncInfo() {
  return getDeviceState('lastSync');
}

/**
 * Update last sync info
 */
export async function updateLastSyncInfo(info) {
  await saveDeviceState('lastSync', {
    ...info,
    timestamp: new Date().toISOString(),
  });
}

// ============================================================================
// OFFLINE QUEUE
// ============================================================================

/**
 * Queue an event for sync when online
 * @param {string} eventType - Type of event (heartbeat, screenshot, playback, error)
 * @param {object} eventData - Event data
 */
export async function queueOfflineEvent(eventType, eventData) {
  const db = await getDB();

  const entry = {
    eventType,
    eventData,
    createdAt: new Date().toISOString(),
    synced: false,
  };

  await db.add(STORES.OFFLINE_QUEUE, entry);
  logger.debug('[CacheService] Queued offline event:', eventType);
}

/**
 * Get all pending events in offline queue
 * @returns {Promise<Array>}
 */
export async function getPendingEvents() {
  const db = await getDB();
  const all = await db.getAllFromIndex(STORES.OFFLINE_QUEUE, 'synced', false);
  return all.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
}

/**
 * Get pending events by type
 * @param {string} eventType - Event type
 * @returns {Promise<Array>}
 */
export async function getPendingEventsByType(eventType) {
  const db = await getDB();
  const all = await db.getAllFromIndex(STORES.OFFLINE_QUEUE, 'eventType', eventType);
  return all.filter(e => !e.synced).sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
}

/**
 * Mark events as synced
 * @param {Array<number>} eventIds - Event IDs to mark as synced
 */
export async function markEventsSynced(eventIds) {
  const db = await getDB();

  for (const id of eventIds) {
    const event = await db.get(STORES.OFFLINE_QUEUE, id);
    if (event) {
      event.synced = true;
      event.syncedAt = new Date().toISOString();
      await db.put(STORES.OFFLINE_QUEUE, event);
    }
  }

  logger.debug('[CacheService] Marked', eventIds.length, 'events as synced');
}

/**
 * Clear synced events (cleanup)
 */
export async function clearSyncedEvents() {
  const db = await getDB();
  const synced = await db.getAllFromIndex(STORES.OFFLINE_QUEUE, 'synced', true);

  for (const event of synced) {
    await db.delete(STORES.OFFLINE_QUEUE, event.id);
  }

  logger.debug('[CacheService] Cleared', synced.length, 'synced events');
}

// ============================================================================
// CACHE MANAGEMENT
// ============================================================================

/**
 * Get total cache size
 * @returns {Promise<{scenes: number, media: number, total: number}>}
 */
export async function getCacheSize() {
  const db = await getDB();

  let scenesSize = 0;
  let mediaSize = 0;

  // Calculate scenes size
  const scenes = await db.getAll(STORES.SCENES);
  for (const scene of scenes) {
    scenesSize += new Blob([JSON.stringify(scene)]).size;
  }

  // Calculate media size
  const media = await db.getAll(STORES.MEDIA);
  for (const item of media) {
    mediaSize += item.size || 0;
  }

  return {
    scenes: scenesSize,
    media: mediaSize,
    total: scenesSize + mediaSize,
    formatted: {
      scenes: formatBytes(scenesSize),
      media: formatBytes(mediaSize),
      total: formatBytes(scenesSize + mediaSize),
    },
  };
}

/**
 * Get detailed cache statistics with limits
 * @returns {Promise<object>} Cache stats with usage percentages
 */
export async function getCacheStats() {
  const db = await getDB();

  const scenes = await db.getAll(STORES.SCENES);
  const media = await db.getAll(STORES.MEDIA);

  // Calculate sizes
  let scenesSize = 0;
  for (const scene of scenes) {
    scenesSize += new Blob([JSON.stringify(scene)]).size;
  }

  let mediaSize = 0;
  for (const item of media) {
    mediaSize += item.size || 0;
  }

  return {
    scenes: {
      count: scenes.length,
      maxCount: CACHE_LIMITS.scenes.maxEntries,
      countUsage: (scenes.length / CACHE_LIMITS.scenes.maxEntries) * 100,
      bytes: scenesSize,
      maxBytes: CACHE_LIMITS.scenes.maxBytes,
      bytesUsage: (scenesSize / CACHE_LIMITS.scenes.maxBytes) * 100,
      formatted: formatBytes(scenesSize),
      formattedMax: formatBytes(CACHE_LIMITS.scenes.maxBytes),
    },
    media: {
      count: media.length,
      maxCount: CACHE_LIMITS.media.maxEntries,
      countUsage: (media.length / CACHE_LIMITS.media.maxEntries) * 100,
      bytes: mediaSize,
      maxBytes: CACHE_LIMITS.media.maxBytes,
      bytesUsage: (mediaSize / CACHE_LIMITS.media.maxBytes) * 100,
      formatted: formatBytes(mediaSize),
      formattedMax: formatBytes(CACHE_LIMITS.media.maxBytes),
    },
    total: {
      bytes: scenesSize + mediaSize,
      formatted: formatBytes(scenesSize + mediaSize),
    },
  };
}

/**
 * Clear all cached data
 */
export async function clearAllCache() {
  const db = await getDB();

  await db.clear(STORES.SCENES);
  await db.clear(STORES.MEDIA);
  // Don't clear device state or offline queue

  logger.debug('[CacheService] Cleared all cache');
}

/**
 * Clear stale cache entries
 * @param {number} maxAgeDays - Maximum age in days
 */
export async function clearStaleCache(maxAgeDays = 7) {
  const db = await getDB();
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - maxAgeDays);

  // Clear old scenes
  const scenes = await db.getAll(STORES.SCENES);
  for (const scene of scenes) {
    if (new Date(scene.cachedAt) < cutoff) {
      await db.delete(STORES.SCENES, scene.id);
    }
  }

  // Clear old media
  const media = await db.getAll(STORES.MEDIA);
  for (const item of media) {
    if (new Date(item.cachedAt) < cutoff) {
      await db.delete(STORES.MEDIA, item.url);
    }
  }

  logger.debug('[CacheService] Cleared stale cache older than', maxAgeDays, 'days');
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Format bytes to human-readable string
 */
function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Check if IndexedDB is available
 */
export function isIndexedDBAvailable() {
  try {
    return typeof indexedDB !== 'undefined';
  } catch {
    return false;
  }
}

/**
 * Export cache info for diagnostics
 */
export async function getCacheInfo() {
  const db = await getDB();

  const scenes = await db.getAll(STORES.SCENES);
  const media = await db.getAll(STORES.MEDIA);
  const pendingEvents = await getPendingEvents();
  const cacheSize = await getCacheSize();
  const lastSync = await getLastSyncInfo();

  return {
    scenes: scenes.map(s => ({
      id: s.id,
      name: s.name,
      contentHash: s.contentHash,
      isStale: s.isStale,
      cachedAt: s.cachedAt,
    })),
    mediaCount: media.length,
    cacheSize,
    pendingEventsCount: pendingEvents.length,
    lastSync,
  };
}
