/**
 * usePlayerContent - Custom hook for managing player content state
 *
 * Extracted from ViewPage to handle:
 * - Content loading with retry support
 * - Offline cache fallback
 * - Polling for updates with error recovery
 * - Playlist item management (shuffle, advance)
 * - Connection status tracking
 *
 * @module player/hooks/usePlayerContent
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { supabase } from '../../supabase';
import {
  cacheContent,
  getCachedContent,
  calculateBackoff,
} from '../../services/playerService';
import { createScopedLogger } from '../../services/loggingService.js';

// Storage keys
const STORAGE_KEYS = {
  screenId: 'player_screen_id',
  playlistId: 'player_playlist_id',
  contentHash: 'player_content_hash',
};

// Retry configuration
const RETRY_CONFIG = {
  maxRetries: 5,
  baseDelayMs: 2000,
  maxDelayMs: 60000,
};

// Module-level logger
const contentLogger = createScopedLogger('usePlayerContent');

/**
 * Get resolved content from database RPC
 * @param {string} screenId - Screen UUID
 * @returns {Promise<Object>} Resolved content data
 */
async function getResolvedContent(screenId) {
  const { data, error } = await supabase.rpc('get_resolved_player_content', { p_screen_id: screenId });
  if (error) throw error;
  return data;
}

/**
 * Retry a function with exponential backoff
 * Uses calculateBackoff from playerService for full jitter (0-100%)
 * @param {Function} fn - Async function to retry
 * @param {number} maxRetries - Maximum retry attempts
 * @returns {Promise<any>} Result from successful fn call
 */
async function retryWithBackoff(fn, maxRetries = RETRY_CONFIG.maxRetries) {
  let lastError;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (attempt < maxRetries - 1) {
        const delay = calculateBackoff(attempt, RETRY_CONFIG.baseDelayMs, RETRY_CONFIG.maxDelayMs);
        contentLogger.debug('Retry attempt', { attempt: attempt + 1, maxRetries, delayMs: Math.round(delay) });
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  throw lastError;
}

/**
 * Shuffle array using Fisher-Yates algorithm
 * @param {Array} array - Array to shuffle
 * @returns {Array} New shuffled array
 */
function shuffleArray(array) {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * Send heartbeat to server
 * @param {string} screenId - Screen UUID
 */
async function sendHeartbeat(screenId) {
  await supabase.rpc('player_heartbeat', { p_screen_id: screenId });
}

/**
 * Custom hook for managing player content state and loading
 *
 * @param {string} screenId - Screen UUID from localStorage
 * @param {Function} navigate - React Router navigate function
 * @returns {Object} Content state and control functions
 */
export function usePlayerContent(screenId, navigate) {
  // Content state
  const [content, setContent] = useState(null);
  const [items, setItems] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Connection state
  const [connectionStatus, setConnectionStatus] = useState('connecting');
  const [isOfflineMode, setIsOfflineMode] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  // Refs
  const pollRef = useRef(null);
  const lastActivityRef = useRef(Date.now());
  const loadContentRef = useRef(null);

  /**
   * Load content with retry support and offline fallback
   * @param {string} sid - Screen ID
   * @param {boolean} useRetry - Whether to use exponential backoff retry
   * @returns {Promise<Object>} Loaded content data
   */
  const loadContent = useCallback(async (sid, useRetry = false) => {
    const fetchContent = async () => {
      const data = await getResolvedContent(sid);
      return data;
    };

    try {
      setConnectionStatus(useRetry ? 'reconnecting' : 'connecting');

      const data = useRetry
        ? await retryWithBackoff(fetchContent)
        : await fetchContent();

      setContent(data);
      setConnectionStatus('connected');
      setIsOfflineMode(false);
      setRetryCount(0);
      lastActivityRef.current = Date.now();

      // For playlist type, process items (shuffle if needed)
      // RPC returns 'mode' field, items are at data.items directly
      const contentMode = data.mode || data.type;
      if (contentMode === 'playlist') {
        let processedItems = data.items || data.playlist?.items || [];
        if ((data.playlist?.shuffle || data.shuffle) && processedItems.length > 1) {
          processedItems = shuffleArray(processedItems);
        }
        setItems(processedItems);
      } else {
        setItems([]);
      }

      // Store content hash for change detection
      const contentHashObj = {
        mode: contentMode,
        source: data.source,
        playlistId: data.playlist?.id,
        layoutId: data.layout?.id,
        campaignId: data.campaign?.id,
      };
      localStorage.setItem(STORAGE_KEYS.contentHash, JSON.stringify(contentHashObj));

      // Cache content for offline use
      try {
        await cacheContent(`content-${sid}`, data, 'playlist');
        contentLogger.debug('Content cached for offline use');
      } catch (cacheErr) {
        contentLogger.warn('Failed to cache content', { error: cacheErr });
      }

      setError('');
      return data;
    } catch (err) {
      contentLogger.error('Failed to load content from server', { error: err });

      // Try to load from offline cache
      try {
        const cachedData = await getCachedContent(`content-${sid}`);
        if (cachedData) {
          contentLogger.info('Using cached content (offline mode)');
          setContent(cachedData);
          setConnectionStatus('offline');
          setIsOfflineMode(true);
          lastActivityRef.current = Date.now();

          // RPC returns 'mode' field, items are at data.items directly
          const cachedMode = cachedData.mode || cachedData.type;
          if (cachedMode === 'playlist') {
            let processedItems = cachedData.items || cachedData.playlist?.items || [];
            if ((cachedData.playlist?.shuffle || cachedData.shuffle) && processedItems.length > 1) {
              processedItems = shuffleArray(processedItems);
            }
            setItems(processedItems);
          } else {
            setItems([]);
          }

          setError('');
          return cachedData;
        }
      } catch (cacheErr) {
        contentLogger.warn('Failed to load from cache', { error: cacheErr });
      }

      setConnectionStatus('offline');
      throw err;
    }
  }, []);

  // Store loadContent in ref for use in effects that can't have it as dependency
  useEffect(() => {
    loadContentRef.current = loadContent;
  }, [loadContent]);

  // Initial load
  useEffect(() => {
    if (!screenId) {
      navigate('/player', { replace: true });
      return;
    }

    loadContent(screenId)
      .then(() => setLoading(false))
      .catch((err) => {
        setError(err.message || 'Failed to load content');
        setLoading(false);
        // If screen not found, clear storage and redirect
        if (err.message?.includes('not found')) {
          localStorage.removeItem(STORAGE_KEYS.screenId);
          localStorage.removeItem(STORAGE_KEYS.playlistId);
          navigate('/player', { replace: true });
        }
      });
  }, [screenId, navigate, loadContent]);

  // Polling for updates every 30s with error recovery
  useEffect(() => {
    if (!screenId) return;

    let consecutiveErrors = 0;
    const MAX_CONSECUTIVE_ERRORS = 3;

    pollRef.current = setInterval(async () => {
      try {
        // Fetch fresh content
        const newContent = await getResolvedContent(screenId);

        // Reset error count on success
        consecutiveErrors = 0;
        setConnectionStatus('connected');

        // Check if content has changed (RPC returns 'mode' not 'type')
        const lastHash = localStorage.getItem(STORAGE_KEYS.contentHash);
        const contentMode = newContent.mode || newContent.type;
        const newHash = JSON.stringify({
          mode: contentMode,
          source: newContent.source,
          playlistId: newContent.playlist?.id,
          layoutId: newContent.layout?.id,
          campaignId: newContent.campaign?.id,
        });

        if (lastHash !== newHash) {
          contentLogger.info('Content updated, refreshing...');
          setContent(newContent);

          // RPC returns 'mode' field, items at data.items directly
          if (contentMode === 'playlist') {
            let processedItems = newContent.items || newContent.playlist?.items || [];
            if ((newContent.shuffle || newContent.playlist?.shuffle) && processedItems.length > 1) {
              processedItems = shuffleArray(processedItems);
            }
            setItems(processedItems);
            setCurrentIndex(0);
          } else {
            setItems([]);
          }

          localStorage.setItem(STORAGE_KEYS.contentHash, newHash);
        }

        // Also send heartbeat
        await sendHeartbeat(screenId);
      } catch (err) {
        consecutiveErrors++;
        contentLogger.error('Polling error', { consecutiveErrors, maxErrors: MAX_CONSECUTIVE_ERRORS, error: err });

        if (consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) {
          setConnectionStatus('reconnecting');
          // Try to reconnect with exponential backoff
          try {
            await loadContentRef.current?.(screenId, true);
            consecutiveErrors = 0;
          } catch (reconnectError) {
            contentLogger.error('Reconnection failed', { error: reconnectError });
            setConnectionStatus('offline');
          }
        }
      }
    }, 30000);

    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
      }
    };
  }, [screenId]);

  /**
   * Advance to next item in playlist
   * Re-shuffles when completing a cycle if shuffle is enabled
   */
  const advanceToNext = useCallback(() => {
    setCurrentIndex((prev) => {
      const next = (prev + 1) % items.length;
      // Re-shuffle when we complete a cycle
      if (next === 0 && content?.playlist?.shuffle) {
        setItems(shuffleArray(items));
      }
      return next;
    });
  }, [items, content?.playlist?.shuffle]);

  return {
    // State
    content,
    items,
    currentIndex,
    loading,
    error,
    connectionStatus,
    isOfflineMode,
    retryCount,

    // Actions
    loadContent,
    advanceToNext,
    setContent,
    setItems,
    setCurrentIndex,
    setLoading,
    setError,
    setConnectionStatus,

    // Refs (for use by other hooks)
    loadContentRef,
    lastActivityRef,
  };
}
