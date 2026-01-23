/**
 * useDataCache Hook
 *
 * Frontend caching hook for React components.
 * Provides stale-while-revalidate (SWR) pattern for data fetching.
 * Caches data in memory with automatic expiration and background refresh.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { createScopedLogger } from '../services/loggingService.js';

const logger = createScopedLogger('useDataCache');

// In-memory cache store (persists across component renders)
const cache = new Map();

// Default cache TTL: 2 minutes
const DEFAULT_TTL_MS = 2 * 60 * 1000;

// Background refresh threshold: 75% of TTL elapsed
const REFRESH_THRESHOLD = 0.75;

/**
 * Cache entry structure
 * @typedef {Object} CacheEntry
 * @property {any} data - Cached data
 * @property {number} timestamp - When data was cached
 * @property {number} expiresAt - When cache expires
 * @property {boolean} isRefreshing - Whether background refresh is in progress
 */

/**
 * Check if cache entry is expired
 * @param {CacheEntry} entry
 * @returns {boolean}
 */
function isExpired(entry) {
  return Date.now() > entry.expiresAt;
}

/**
 * Check if cache entry should trigger background refresh
 * @param {CacheEntry} entry
 * @param {number} ttlMs
 * @returns {boolean}
 */
function shouldRefresh(entry, ttlMs) {
  const elapsed = Date.now() - entry.timestamp;
  return elapsed > ttlMs * REFRESH_THRESHOLD;
}

/**
 * useDataCache - React hook for cached data fetching
 *
 * @param {string} key - Unique cache key
 * @param {Function} fetcher - Async function that returns data
 * @param {Object} options - Cache options
 * @param {number} options.ttlMs - Cache TTL in milliseconds (default: 2 minutes)
 * @param {boolean} options.enabled - Whether to fetch (default: true)
 * @param {any} options.initialData - Initial data before first fetch
 * @param {boolean} options.refreshOnFocus - Refresh when window gains focus
 * @param {boolean} options.refreshOnReconnect - Refresh when network reconnects
 * @param {Function} options.onSuccess - Callback on successful fetch
 * @param {Function} options.onError - Callback on fetch error
 *
 * @returns {Object} { data, loading, error, refetch, invalidate, isStale }
 */
export function useDataCache(key, fetcher, options = {}) {
  const {
    ttlMs = DEFAULT_TTL_MS,
    enabled = true,
    initialData = null,
    refreshOnFocus = false,
    refreshOnReconnect = true,
    onSuccess = null,
    onError = null,
  } = options;

  // Get initial state from cache
  const cachedEntry = cache.get(key);
  const initialFromCache = cachedEntry && !isExpired(cachedEntry)
    ? cachedEntry.data
    : initialData;

  const [data, setData] = useState(initialFromCache);
  const [loading, setLoading] = useState(!cachedEntry || isExpired(cachedEntry));
  const [error, setError] = useState(null);
  const [isStale, setIsStale] = useState(cachedEntry ? shouldRefresh(cachedEntry, ttlMs) : false);

  // Track if component is mounted
  const mountedRef = useRef(true);
  // Track in-flight requests
  const requestRef = useRef(null);

  /**
   * Fetch data and update cache
   */
  const fetchData = useCallback(async (isBackground = false) => {
    // Skip if already fetching
    if (requestRef.current && !isBackground) return;

    // Mark cache entry as refreshing
    const entry = cache.get(key);
    if (entry) {
      entry.isRefreshing = true;
    }

    if (!isBackground) {
      setLoading(true);
    }

    requestRef.current = fetcher;

    try {
      const result = await fetcher();

      if (!mountedRef.current) return;
      if (requestRef.current !== fetcher) return; // Stale request

      // Update cache
      cache.set(key, {
        data: result,
        timestamp: Date.now(),
        expiresAt: Date.now() + ttlMs,
        isRefreshing: false,
      });

      setData(result);
      setError(null);
      setIsStale(false);

      if (onSuccess) {
        onSuccess(result);
      }
    } catch (err) {
      if (!mountedRef.current) return;

      // Keep stale data on error
      const entry = cache.get(key);
      if (entry) {
        entry.isRefreshing = false;
      }

      setError(err);
      setIsStale(true);

      if (onError) {
        onError(err);
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false);
        requestRef.current = null;
      }
    }
  }, [key, fetcher, ttlMs, onSuccess, onError]);

  /**
   * Force refetch
   */
  const refetch = useCallback(() => {
    return fetchData(false);
  }, [fetchData]);

  /**
   * Invalidate cache and refetch
   */
  const invalidate = useCallback(() => {
    cache.delete(key);
    return fetchData(false);
  }, [key, fetchData]);

  /**
   * Initial fetch and stale-while-revalidate
   */
  useEffect(() => {
    if (!enabled) return;

    const entry = cache.get(key);

    if (!entry) {
      // No cache - fetch immediately
      fetchData(false);
    } else if (isExpired(entry)) {
      // Cache expired - fetch immediately (show loading)
      fetchData(false);
    } else if (shouldRefresh(entry, ttlMs)) {
      // Cache stale but valid - background refresh
      setIsStale(true);
      fetchData(true);
    }
    // else: Cache is fresh, use cached data
  }, [key, enabled, fetchData, ttlMs]);

  /**
   * Refresh on window focus
   */
  useEffect(() => {
    if (!refreshOnFocus) return;

    const handleFocus = () => {
      const entry = cache.get(key);
      if (!entry || shouldRefresh(entry, ttlMs)) {
        fetchData(true);
      }
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [key, refreshOnFocus, fetchData, ttlMs]);

  /**
   * Refresh on network reconnect
   */
  useEffect(() => {
    if (!refreshOnReconnect) return;

    const handleOnline = () => {
      const entry = cache.get(key);
      if (!entry || shouldRefresh(entry, ttlMs)) {
        fetchData(true);
      }
    };

    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [key, refreshOnReconnect, fetchData, ttlMs]);

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  return {
    data,
    loading,
    error,
    refetch,
    invalidate,
    isStale,
  };
}

/**
 * Invalidate cache entries by prefix
 * @param {string} prefix - Cache key prefix
 */
export function invalidateCache(prefix) {
  for (const key of cache.keys()) {
    if (key.startsWith(prefix)) {
      cache.delete(key);
    }
  }
}

/**
 * Clear all cached data
 */
export function clearDataCache() {
  cache.clear();
}

/**
 * Get cache statistics
 */
export function getDataCacheStats() {
  let validCount = 0;
  let staleCount = 0;
  let expiredCount = 0;
  const now = Date.now();

  for (const [, entry] of cache) {
    if (now > entry.expiresAt) {
      expiredCount++;
    } else if (shouldRefresh(entry, DEFAULT_TTL_MS)) {
      staleCount++;
    } else {
      validCount++;
    }
  }

  return {
    totalEntries: cache.size,
    validEntries: validCount,
    staleEntries: staleCount,
    expiredEntries: expiredCount,
  };
}

/**
 * Prefetch data into cache
 * @param {string} key - Cache key
 * @param {Function} fetcher - Async function
 * @param {number} ttlMs - Cache TTL
 */
export async function prefetch(key, fetcher, ttlMs = DEFAULT_TTL_MS) {
  // Don't prefetch if already cached and valid
  const entry = cache.get(key);
  if (entry && !isExpired(entry)) return;

  try {
    const data = await fetcher();
    cache.set(key, {
      data,
      timestamp: Date.now(),
      expiresAt: Date.now() + ttlMs,
      isRefreshing: false,
    });
  } catch (err) {
    logger.warn(`Prefetch failed for ${key}:`, err.message);
  }
}

// Pre-defined cache key generators for common data types
export const cacheKeys = {
  dashboardStats: (tenantId) => `dashboard:stats:${tenantId}`,
  screensList: (tenantId) => `screens:list:${tenantId}`,
  playlistsList: (tenantId) => `playlists:list:${tenantId}`,
  mediaAssets: (tenantId) => `media:assets:${tenantId}`,
  campaigns: (tenantId) => `campaigns:list:${tenantId}`,
  templates: () => 'templates:all',
  helpTopics: () => 'help:topics',
  userProfile: (userId) => `user:profile:${userId}`,
};

export default useDataCache;
