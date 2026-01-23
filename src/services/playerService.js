// Player Service - API for TV player devices to fetch and display content
// Uses SECURITY DEFINER RPC functions for anonymous access
// Includes offline mode support, command polling, and auto-recovery
import { supabase } from '../supabase';
import { createScopedLogger } from './loggingService.js';

const logger = createScopedLogger('PlayerService');

// ============================================
// CONSTANTS
// ============================================

const COMMAND_POLL_INTERVAL = 10000; // 10 seconds
const HEARTBEAT_INTERVAL = 30000; // 30 seconds
const OFFLINE_THRESHOLD = 5 * 60 * 1000; // 5 minutes
const INDEXEDDB_NAME = 'bizscreen-player-cache';
const INDEXEDDB_VERSION = 1;
const CACHE_STORE_NAME = 'content-cache';

/**
 * Update device last_seen timestamp (call this on every content fetch)
 * @param {string} screenId - The screen UUID
 */
export async function heartbeat(screenId) {
  const { error } = await supabase.rpc('player_heartbeat', {
    p_screen_id: screenId
  });

  if (error) {
    logger.error('Failed to update heartbeat', { error, screenId });
  }
}

/**
 * Get player content for a screen
 * This is the main API endpoint for TV players to fetch what to display
 *
 * @param {string} screenId - Screen UUID (obtained after OTP pairing)
 * @returns {Promise<Object>} Player content payload
 *
 * Response format:
 * {
 *   device: { id, name, timezone },
 *   playlist: { id, name, defaultDuration, transitionEffect, shuffle } | null,
 *   items: [
 *     {
 *       id,
 *       position,
 *       type,        // 'media' | 'app'
 *       mediaType,   // 'image' | 'video' | 'audio' | 'document' | 'web_page'
 *       url,
 *       thumbnailUrl,
 *       name,
 *       duration,    // seconds
 *       width,
 *       height
 *     }
 *   ]
 * }
 */
export async function getPlayerContent(screenId) {
  if (!screenId) throw new Error('Screen ID is required');

  const { data, error } = await supabase.rpc('get_player_content', {
    p_screen_id: screenId
  });

  if (error) {
    if (error.message?.includes('not found')) {
      throw new Error('Screen not found');
    }
    throw error;
  }

  return data;
}

/**
 * Get player content by OTP code (for initial pairing)
 * @param {string} otpCode - The 6-character OTP pairing code
 * @returns {Promise<Object>} Player content with screenId for future requests
 */
export async function getPlayerContentByOtp(otpCode) {
  if (!otpCode) throw new Error('OTP code is required');

  const { data, error } = await supabase.rpc('get_player_content_by_otp', {
    p_otp: otpCode
  });

  if (error) {
    if (error.message?.includes('Invalid pairing code')) {
      throw new Error('Invalid pairing code');
    }
    throw error;
  }

  return data;
}

/**
 * Poll for content updates
 * TV players should call this periodically to check for changes
 *
 * @param {string} screenId - Screen UUID
 * @param {string} lastPlaylistId - Last known playlist ID (for change detection)
 * @returns {Promise<Object>} { hasChanges: boolean, content?: Object }
 */
export async function checkForUpdates(screenId, lastPlaylistId = null) {
  const { data, error } = await supabase.rpc('check_player_updates', {
    p_screen_id: screenId,
    p_last_playlist_id: lastPlaylistId
  });

  if (error) throw error;

  return data;
}

/**
 * Example usage for TV Player app:
 *
 * // 1. Initial pairing with OTP code
 * const { screenId, ...content } = await getPlayerContentByOtp('ABC123');
 * localStorage.setItem('screenId', screenId);
 *
 * // 2. Subsequent content fetches
 * const screenId = localStorage.getItem('screenId');
 * const content = await getPlayerContent(screenId);
 *
 * // 3. Polling for updates (every 30 seconds)
 * setInterval(async () => {
 *   const { hasChanges, content } = await checkForUpdates(screenId, currentPlaylistId);
 *   if (hasChanges) {
 *     updateDisplay(content);
 *   }
 * }, 30000);
 */

// ============================================
// DEVICE COMMAND FUNCTIONS
// ============================================

/**
 * Poll for pending device commands
 * @param {string} screenId - The screen UUID
 * @returns {Promise<Object|null>} Command object or null if no pending commands
 */
export async function pollForCommand(screenId) {
  if (!screenId) return null;

  try {
    const { data, error } = await supabase.rpc('get_pending_device_command', {
      p_device_id: screenId
    });

    if (error) {
      logger.error('Failed to poll for commands', { error, screenId });
      return null;
    }

    if (data?.has_command) {
      return {
        commandId: data.command_id,
        commandType: data.command_type,
        payload: data.payload,
        createdAt: data.created_at
      };
    }

    return null;
  } catch (err) {
    logger.error('Command poll exception', { error: err, screenId });
    return null;
  }
}

/**
 * Report command execution result
 * @param {string} commandId - The command UUID
 * @param {boolean} success - Whether execution succeeded
 * @param {string} errorMessage - Error message if failed
 */
export async function reportCommandResult(commandId, success = true, errorMessage = null) {
  try {
    const { error } = await supabase.rpc('mark_command_executed', {
      p_command_id: commandId,
      p_success: success,
      p_error_message: errorMessage
    });

    if (error) {
      logger.error('Failed to report command result', { error, commandId });
    }
  } catch (err) {
    logger.error('Command result report exception', { error: err, commandId });
  }
}

/**
 * Update device status (extended heartbeat with version info)
 * @param {string} screenId - The screen UUID
 * @param {string} playerVersion - Current player version
 * @param {string} cachedContentHash - Hash of cached content
 * @returns {Promise<{needs_screenshot_update: boolean}|null>} Status response or null on error
 */
export async function updateDeviceStatus(screenId, playerVersion = null, cachedContentHash = null) {
  if (!screenId) return null;

  try {
    const { data, error } = await supabase.rpc('update_device_status', {
      p_device_id: screenId,
      p_player_version: playerVersion,
      p_cached_content_hash: cachedContentHash
    });

    if (error) {
      logger.error('Failed to update device status', { error, screenId });
      return null;
    }

    return data;
  } catch (err) {
    logger.error('Device status update exception', { error: err, screenId });
    return null;
  }
}

// ============================================
// OFFLINE MODE & INDEXEDDB CACHE
// ============================================

let db = null;

/**
 * Initialize IndexedDB for offline content caching
 * @returns {Promise<IDBDatabase>}
 */
export async function initOfflineCache() {
  if (db) return db;

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(INDEXEDDB_NAME, INDEXEDDB_VERSION);

    request.onerror = () => {
      logger.error('Failed to open IndexedDB', { error: request.error });
      reject(request.error);
    };

    request.onsuccess = () => {
      db = request.result;
      resolve(db);
    };

    request.onupgradeneeded = (event) => {
      const database = event.target.result;

      // Content cache store
      if (!database.objectStoreNames.contains(CACHE_STORE_NAME)) {
        const store = database.createObjectStore(CACHE_STORE_NAME, { keyPath: 'key' });
        store.createIndex('timestamp', 'timestamp', { unique: false });
        store.createIndex('type', 'type', { unique: false });
      }
    };
  });
}

/**
 * Cache content to IndexedDB
 * @param {string} key - Cache key (e.g., 'playlist-content', 'media-{id}')
 * @param {any} data - Data to cache
 * @param {string} type - Type of content ('playlist', 'media', 'metadata')
 */
export async function cacheContent(key, data, type = 'metadata') {
  try {
    const database = await initOfflineCache();
    const transaction = database.transaction([CACHE_STORE_NAME], 'readwrite');
    const store = transaction.objectStore(CACHE_STORE_NAME);

    await new Promise((resolve, reject) => {
      const request = store.put({
        key,
        data,
        type,
        timestamp: Date.now()
      });
      request.onsuccess = resolve;
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    logger.error('Failed to cache content', { error: err, key, type });
  }
}

/**
 * Get cached content from IndexedDB
 * @param {string} key - Cache key
 * @returns {Promise<any|null>}
 */
export async function getCachedContent(key) {
  try {
    const database = await initOfflineCache();
    const transaction = database.transaction([CACHE_STORE_NAME], 'readonly');
    const store = transaction.objectStore(CACHE_STORE_NAME);

    return new Promise((resolve) => {
      const request = store.get(key);
      request.onsuccess = () => {
        const result = request.result;
        resolve(result ? result.data : null);
      };
      request.onerror = () => {
        logger.error('Failed to get cached content', { error: request.error, key });
        resolve(null);
      };
    });
  } catch (err) {
    logger.error('Failed to read from cache', { error: err, key });
    return null;
  }
}

/**
 * Clear all cached content
 */
export async function clearCache() {
  try {
    const database = await initOfflineCache();
    const transaction = database.transaction([CACHE_STORE_NAME], 'readwrite');
    const store = transaction.objectStore(CACHE_STORE_NAME);

    await new Promise((resolve, reject) => {
      const request = store.clear();
      request.onsuccess = resolve;
      request.onerror = () => reject(request.error);
    });

    logger.info('Cache cleared successfully');
  } catch (err) {
    logger.error('Failed to clear cache', { error: err });
  }
}

/**
 * Generate a hash of content for change detection
 * @param {Object} content - Content object
 * @returns {string} Hash string
 */
export function generateContentHash(content) {
  const str = JSON.stringify(content);
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return hash.toString(16);
}

/**
 * Get player content with offline fallback
 * @param {string} screenId - Screen UUID
 * @returns {Promise<Object>} Content (from server or cache)
 */
export async function getPlayerContentWithOffline(screenId) {
  try {
    // Try to get from server
    const content = await getPlayerContent(screenId);

    // Cache for offline use
    await cacheContent(`content-${screenId}`, content, 'playlist');

    return { content, offline: false };
  } catch (err) {
    logger.warn('Failed to fetch content from server, trying cache', { error: err, screenId });

    // Try to get from cache
    const cached = await getCachedContent(`content-${screenId}`);
    if (cached) {
      return { content: cached, offline: true };
    }

    throw new Error('No content available (offline and no cache)');
  }
}

// ============================================
// CONNECTION STATUS
// ============================================

let connectionStatus = 'online';
let connectionListeners = [];

/**
 * Get current connection status
 * @returns {'online'|'offline'|'reconnecting'}
 */
export function getConnectionStatus() {
  return connectionStatus;
}

/**
 * Subscribe to connection status changes
 * @param {Function} callback - Called with new status
 * @returns {Function} Unsubscribe function
 */
export function onConnectionStatusChange(callback) {
  connectionListeners.push(callback);
  return () => {
    connectionListeners = connectionListeners.filter(cb => cb !== callback);
  };
}

/**
 * Update connection status and notify listeners
 * @param {'online'|'offline'|'reconnecting'} status
 */
export function setConnectionStatus(status) {
  if (status !== connectionStatus) {
    connectionStatus = status;
    connectionListeners.forEach(cb => cb(status));
  }
}

// ============================================
// AUTO-RECOVERY & RETRY LOGIC
// ============================================

/**
 * Calculate exponential backoff delay
 * @param {number} attempt - Retry attempt number (0-based)
 * @param {number} baseDelay - Base delay in ms (default 1000)
 * @param {number} maxDelay - Maximum delay in ms (default 60000)
 * @returns {number} Delay in milliseconds
 */
export function calculateBackoff(attempt, baseDelay = 1000, maxDelay = 60000) {
  const delay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay);
  // Add jitter (±20%)
  const jitter = delay * 0.2 * (Math.random() - 0.5);
  return Math.round(delay + jitter);
}

/**
 * Retry a function with exponential backoff
 * @param {Function} fn - Async function to retry
 * @param {Object} options - Retry options
 * @returns {Promise<any>}
 */
export async function retryWithBackoff(fn, options = {}) {
  const {
    maxAttempts = 5,
    baseDelay = 1000,
    maxDelay = 60000,
    onRetry = null
  } = options;

  let lastError;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;

      if (attempt < maxAttempts - 1) {
        const delay = calculateBackoff(attempt, baseDelay, maxDelay);
        logger.warn('Retry attempt failed', { attempt: attempt + 1, delayMs: delay, error: err });

        if (onRetry) {
          onRetry(attempt + 1, delay, err);
        }

        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError;
}

// ============================================
// KIOSK MODE HELPERS
// ============================================

/**
 * Check if running in fullscreen
 * @returns {boolean}
 */
export function isFullscreen() {
  return !!(
    document.fullscreenElement ||
    document.webkitFullscreenElement ||
    document.mozFullScreenElement ||
    document.msFullscreenElement
  );
}

/**
 * Request fullscreen mode
 * @param {HTMLElement} element - Element to make fullscreen (default: document.documentElement)
 */
export async function enterFullscreen(element = document.documentElement) {
  try {
    if (element.requestFullscreen) {
      await element.requestFullscreen();
    } else if (element.webkitRequestFullscreen) {
      await element.webkitRequestFullscreen();
    } else if (element.mozRequestFullScreen) {
      await element.mozRequestFullScreen();
    } else if (element.msRequestFullscreen) {
      await element.msRequestFullscreen();
    }
  } catch (err) {
    logger.error('Failed to enter fullscreen', { error: err });
  }
}

/**
 * Exit fullscreen mode
 */
export async function exitFullscreen() {
  try {
    if (document.exitFullscreen) {
      await document.exitFullscreen();
    } else if (document.webkitExitFullscreen) {
      await document.webkitExitFullscreen();
    } else if (document.mozCancelFullScreen) {
      await document.mozCancelFullScreen();
    } else if (document.msExitFullscreen) {
      await document.msExitFullscreen();
    }
  } catch (err) {
    logger.error('Failed to exit fullscreen', { error: err });
  }
}

/**
 * Validate kiosk exit password
 * @param {string} input - User input
 * @param {string} password - Correct password
 * @returns {boolean}
 */
export function validateKioskPassword(input, password) {
  return input === password;
}

// ============================================
// PLAYER MANAGER CLASS
// ============================================

/**
 * PlayerManager - Manages player lifecycle with offline support and auto-recovery
 */
export class PlayerManager {
  constructor(screenId, options = {}) {
    this.screenId = screenId;
    this.options = {
      commandPollInterval: COMMAND_POLL_INTERVAL,
      heartbeatInterval: HEARTBEAT_INTERVAL,
      playerVersion: '1.0.0',
      onCommand: null,
      onContentUpdate: null,
      onConnectionChange: null,
      onError: null,
      kioskMode: false,
      kioskPassword: null,
      ...options
    };

    this.commandPollTimer = null;
    this.heartbeatTimer = null;
    this.contentCheckTimer = null;
    this.lastContentHash = null;
    this.retryAttempt = 0;
    this.isRunning = false;
  }

  /**
   * Start the player manager
   */
  async start() {
    if (this.isRunning) return;
    this.isRunning = true;

    // Initialize offline cache
    await initOfflineCache();

    // Start command polling
    this.startCommandPolling();

    // Start heartbeat
    this.startHeartbeat();

    // Enter kiosk mode if enabled
    if (this.options.kioskMode) {
      await enterFullscreen();
    }

    logger.info('PlayerManager started', { screenId: this.screenId });
  }

  /**
   * Stop the player manager
   */
  stop() {
    this.isRunning = false;

    if (this.commandPollTimer) {
      clearInterval(this.commandPollTimer);
      this.commandPollTimer = null;
    }

    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }

    if (this.contentCheckTimer) {
      clearInterval(this.contentCheckTimer);
      this.contentCheckTimer = null;
    }

    logger.info('PlayerManager stopped', { screenId: this.screenId });
  }

  /**
   * Start polling for device commands
   */
  startCommandPolling() {
    const poll = async () => {
      const command = await pollForCommand(this.screenId);

      if (command) {
        logger.info('Received command', { command, screenId: this.screenId });
        await this.handleCommand(command);
      }
    };

    // Poll immediately, then on interval
    poll();
    this.commandPollTimer = setInterval(poll, this.options.commandPollInterval);
  }

  /**
   * Start heartbeat
   */
  startHeartbeat() {
    const beat = async () => {
      await updateDeviceStatus(
        this.screenId,
        this.options.playerVersion,
        this.lastContentHash
      );
    };

    beat();
    this.heartbeatTimer = setInterval(beat, this.options.heartbeatInterval);
  }

  /**
   * Handle a device command
   * @param {Object} command
   */
  async handleCommand(command) {
    const { commandId, commandType, payload } = command;

    try {
      switch (commandType) {
        case 'reboot':
          await reportCommandResult(commandId, true);
          // Allow time for the report to send
          setTimeout(() => window.location.reload(), 500);
          break;

        case 'reload':
          await reportCommandResult(commandId, true);
          if (this.options.onContentUpdate) {
            const { content } = await getPlayerContentWithOffline(this.screenId);
            this.options.onContentUpdate(content);
          }
          break;

        case 'clear_cache':
          await clearCache();
          await reportCommandResult(commandId, true);
          break;

        case 'reset':
          await clearCache();
          localStorage.clear();
          sessionStorage.clear();
          await reportCommandResult(commandId, true);
          setTimeout(() => window.location.reload(), 500);
          break;

        default:
          logger.warn('Unknown command type', { commandType, commandId });
          await reportCommandResult(commandId, false, 'Unknown command type');
      }

      if (this.options.onCommand) {
        this.options.onCommand(command);
      }
    } catch (err) {
      logger.error('Command execution failed', { error: err, commandId, commandType });
      await reportCommandResult(commandId, false, err.message);
    }
  }

  /**
   * Fetch content with retry and offline fallback
   * @returns {Promise<Object>}
   */
  async fetchContent() {
    try {
      setConnectionStatus('reconnecting');

      const { content, offline } = await retryWithBackoff(
        () => getPlayerContentWithOffline(this.screenId),
        {
          maxAttempts: 3,
          onRetry: (attempt, delay) => {
            this.retryAttempt = attempt;
          }
        }
      );

      setConnectionStatus(offline ? 'offline' : 'online');
      this.retryAttempt = 0;

      // Update content hash
      this.lastContentHash = generateContentHash(content);

      return content;
    } catch (err) {
      setConnectionStatus('offline');

      if (this.options.onError) {
        this.options.onError(err);
      }

      throw err;
    }
  }
}

// Export constants for external use
export { COMMAND_POLL_INTERVAL, HEARTBEAT_INTERVAL, OFFLINE_THRESHOLD };
