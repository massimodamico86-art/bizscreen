/**
 * Cache Service
 * Phase 13: Application-level caching for high-frequency service calls
 *
 * This service wraps existing service calls with frontend caching support.
 * Uses in-memory LRU cache with automatic TTL-based expiration.
 */

import { supabase } from '../supabase';
import { createScopedLogger } from './loggingService';

const logger = createScopedLogger('CacheService');

// ============================================================================
// CACHE IMPLEMENTATION
// ============================================================================

/**
 * Simple LRU Cache for frontend services
 */
class ServiceCache {
  constructor(maxSize = 500, defaultTTL = 2 * 60 * 1000) {
    this.cache = new Map();
    this.maxSize = maxSize;
    this.defaultTTL = defaultTTL;
    this.hits = 0;
    this.misses = 0;
  }

  _makeEntry(value, ttl) {
    return {
      value,
      expiresAt: Date.now() + ttl,
    };
  }

  _isExpired(entry) {
    return Date.now() > entry.expiresAt;
  }

  get(key) {
    const entry = this.cache.get(key);
    if (!entry) {
      this.misses++;
      return null;
    }
    if (this._isExpired(entry)) {
      this.cache.delete(key);
      this.misses++;
      return null;
    }
    this.hits++;
    // Move to end (most recently used)
    this.cache.delete(key);
    this.cache.set(key, entry);
    return entry.value;
  }

  set(key, value, ttl = this.defaultTTL) {
    // Delete if exists to refresh position
    if (this.cache.has(key)) {
      this.cache.delete(key);
    }
    // Evict oldest if at capacity
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    this.cache.set(key, this._makeEntry(value, ttl));
  }

  delete(key) {
    this.cache.delete(key);
  }

  invalidateByPrefix(prefix) {
    let count = 0;
    for (const key of this.cache.keys()) {
      if (key.startsWith(prefix)) {
        this.cache.delete(key);
        count++;
      }
    }
    return count;
  }

  async getOrFetch(key, fetcher, ttl = this.defaultTTL) {
    const cached = this.get(key);
    if (cached !== null) {
      return cached;
    }
    const value = await fetcher();
    this.set(key, value, ttl);
    return value;
  }

  getStats() {
    const total = this.hits + this.misses;
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      hits: this.hits,
      misses: this.misses,
      hitRate: total > 0 ? `${(this.hits / total * 100).toFixed(1)}%` : '0%',
    };
  }

  clear() {
    this.cache.clear();
    this.hits = 0;
    this.misses = 0;
  }

  cleanup() {
    let cleaned = 0;
    const now = Date.now();
    for (const [key, entry] of this.cache) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
        cleaned++;
      }
    }
    return cleaned;
  }
}

// ============================================================================
// CACHE INSTANCES
// ============================================================================

// Service-specific caches with appropriate TTLs
export const caches = {
  screens: new ServiceCache(500, 60 * 1000),      // 1 minute
  playlists: new ServiceCache(500, 2 * 60 * 1000), // 2 minutes
  media: new ServiceCache(1000, 2 * 60 * 1000),    // 2 minutes
  campaigns: new ServiceCache(300, 2 * 60 * 1000), // 2 minutes
  dashboard: new ServiceCache(100, 2 * 60 * 1000), // 2 minutes
  templates: new ServiceCache(100, 5 * 60 * 1000), // 5 minutes
};

// ============================================================================
// CACHE KEY GENERATORS
// ============================================================================

export const cacheKeys = {
  // User-scoped keys
  screens: (userId) => `screens:${userId}`,
  screensWithFilter: (userId, filter) => `screens:${userId}:${JSON.stringify(filter)}`,
  playlists: (userId) => `playlists:${userId}`,
  playlistsWithFilter: (userId, filter) => `playlists:${userId}:${JSON.stringify(filter)}`,
  media: (userId) => `media:${userId}`,
  mediaWithFilter: (userId, filter) => `media:${userId}:${JSON.stringify(filter)}`,
  campaigns: (userId) => `campaigns:${userId}`,
  dashboardStats: (userId) => `dashboard:stats:${userId}`,
  dashboardCounts: (userId) => `dashboard:counts:${userId}`,

  // Global keys
  templates: () => 'templates:all',
  template: (id) => `templates:${id}`,
};

// ============================================================================
// CACHED SERVICE FUNCTIONS
// ============================================================================

/**
 * Get current user ID (for cache keys)
 */
async function getCurrentUserId() {
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id || 'anonymous';
}

/**
 * Cached screens fetch
 */
export async function cachedFetchScreens(fetcher) {
  const userId = await getCurrentUserId();
  const key = cacheKeys.screens(userId);
  return caches.screens.getOrFetch(key, fetcher);
}

/**
 * Cached playlists fetch
 */
export async function cachedFetchPlaylists(fetcher) {
  const userId = await getCurrentUserId();
  const key = cacheKeys.playlists(userId);
  return caches.playlists.getOrFetch(key, fetcher);
}

/**
 * Cached media fetch
 */
export async function cachedFetchMedia(fetcher) {
  const userId = await getCurrentUserId();
  const key = cacheKeys.media(userId);
  return caches.media.getOrFetch(key, fetcher);
}

/**
 * Cached campaigns fetch
 */
export async function cachedFetchCampaigns(fetcher) {
  const userId = await getCurrentUserId();
  const key = cacheKeys.campaigns(userId);
  return caches.campaigns.getOrFetch(key, fetcher);
}

/**
 * Cached dashboard stats fetch
 */
export async function cachedFetchDashboardStats(fetcher) {
  const userId = await getCurrentUserId();
  const key = cacheKeys.dashboardStats(userId);
  return caches.dashboard.getOrFetch(key, fetcher);
}

/**
 * Cached dashboard counts fetch (using RPC)
 */
export async function cachedFetchDashboardCounts(fetcher) {
  const userId = await getCurrentUserId();
  const key = cacheKeys.dashboardCounts(userId);
  return caches.dashboard.getOrFetch(key, fetcher);
}

/**
 * Cached templates fetch (global)
 */
export async function cachedFetchTemplates(fetcher) {
  const key = cacheKeys.templates();
  return caches.templates.getOrFetch(key, fetcher);
}

// ============================================================================
// CACHE INVALIDATION
// ============================================================================

/**
 * Invalidate all caches for current user
 */
export async function invalidateUserCaches() {
  const userId = await getCurrentUserId();
  const prefix = userId;
  let total = 0;
  for (const cache of Object.values(caches)) {
    total += cache.invalidateByPrefix(prefix);
  }
  return total;
}

/**
 * Invalidate screens cache
 */
export async function invalidateScreensCache() {
  const userId = await getCurrentUserId();
  caches.screens.invalidateByPrefix(`screens:${userId}`);
  caches.dashboard.invalidateByPrefix(`dashboard:${userId}`);
}

/**
 * Invalidate playlists cache
 */
export async function invalidatePlaylistsCache() {
  const userId = await getCurrentUserId();
  caches.playlists.invalidateByPrefix(`playlists:${userId}`);
  caches.dashboard.invalidateByPrefix(`dashboard:${userId}`);
}

/**
 * Invalidate media cache
 */
export async function invalidateMediaCache() {
  const userId = await getCurrentUserId();
  caches.media.invalidateByPrefix(`media:${userId}`);
  caches.dashboard.invalidateByPrefix(`dashboard:${userId}`);
}

/**
 * Invalidate campaigns cache
 */
export async function invalidateCampaignsCache() {
  const userId = await getCurrentUserId();
  caches.campaigns.invalidateByPrefix(`campaigns:${userId}`);
}

/**
 * Invalidate dashboard cache
 */
export async function invalidateDashboardCache() {
  const userId = await getCurrentUserId();
  caches.dashboard.invalidateByPrefix(`dashboard:${userId}`);
}

/**
 * Invalidate templates cache
 */
export function invalidateTemplatesCache() {
  caches.templates.invalidateByPrefix('templates:');
}

// ============================================================================
// UTILITIES
// ============================================================================

/**
 * Get aggregated stats from all service caches
 */
export function getAllServiceCacheStats() {
  const stats = {};
  for (const [name, cache] of Object.entries(caches)) {
    stats[name] = cache.getStats();
  }
  return stats;
}

/**
 * Cleanup expired entries from all caches
 */
export function cleanupServiceCaches() {
  let total = 0;
  for (const cache of Object.values(caches)) {
    total += cache.cleanup();
  }
  return total;
}

/**
 * Clear all service caches
 */
export function clearAllServiceCaches() {
  for (const cache of Object.values(caches)) {
    cache.clear();
  }
}

// Run cleanup every 5 minutes if in browser
if (typeof window !== 'undefined') {
  setInterval(() => {
    cleanupServiceCaches();
  }, 5 * 60 * 1000);
}

export default {
  caches,
  cacheKeys,
  cachedFetchScreens,
  cachedFetchPlaylists,
  cachedFetchMedia,
  cachedFetchCampaigns,
  cachedFetchDashboardStats,
  cachedFetchDashboardCounts,
  cachedFetchTemplates,
  invalidateUserCaches,
  invalidateScreensCache,
  invalidatePlaylistsCache,
  invalidateMediaCache,
  invalidateCampaignsCache,
  invalidateDashboardCache,
  invalidateTemplatesCache,
  getAllServiceCacheStats,
  cleanupServiceCaches,
  clearAllServiceCaches,
};
