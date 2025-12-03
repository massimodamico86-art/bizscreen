/**
 * LRU Cache for Serverless APIs
 * Phase 13: Scalability, Global Caching & CDN Integration
 *
 * An in-memory LRU (Least Recently Used) cache optimized for serverless environments.
 * Supports TTL-based expiration, tenant-aware cache keys, and automatic eviction.
 *
 * Note: In serverless, each instance has its own cache. For distributed caching,
 * integrate with Redis/Upstash (mock interface included for future integration).
 */

/**
 * LRU Cache Node for doubly-linked list
 */
class LRUNode {
  constructor(key, value, ttl) {
    this.key = key;
    this.value = value;
    this.expiresAt = Date.now() + ttl;
    this.prev = null;
    this.next = null;
  }

  isExpired() {
    return Date.now() > this.expiresAt;
  }
}

/**
 * LRU Cache Implementation
 * Uses doubly-linked list + Map for O(1) operations
 */
class LRUCache {
  constructor(options = {}) {
    this.maxSize = options.maxSize || 1000;
    this.defaultTTL = options.defaultTTL || 60 * 1000; // 1 minute default
    this.cache = new Map();
    this.head = null; // Most recently used
    this.tail = null; // Least recently used
    this.hits = 0;
    this.misses = 0;
  }

  /**
   * Get value from cache
   * @param {string} key
   * @returns {any|null}
   */
  get(key) {
    const node = this.cache.get(key);

    if (!node) {
      this.misses++;
      return null;
    }

    // Check expiration
    if (node.isExpired()) {
      this.delete(key);
      this.misses++;
      return null;
    }

    // Move to head (most recently used)
    this._moveToHead(node);
    this.hits++;

    return node.value;
  }

  /**
   * Set value in cache
   * @param {string} key
   * @param {any} value
   * @param {number} ttl - TTL in milliseconds (optional)
   */
  set(key, value, ttl = this.defaultTTL) {
    // Update existing
    if (this.cache.has(key)) {
      const node = this.cache.get(key);
      node.value = value;
      node.expiresAt = Date.now() + ttl;
      this._moveToHead(node);
      return;
    }

    // Create new node
    const node = new LRUNode(key, value, ttl);
    this.cache.set(key, node);
    this._addToHead(node);

    // Evict if over capacity
    if (this.cache.size > this.maxSize) {
      this._evictLRU();
    }
  }

  /**
   * Delete from cache
   * @param {string} key
   */
  delete(key) {
    const node = this.cache.get(key);
    if (node) {
      this._removeNode(node);
      this.cache.delete(key);
    }
  }

  /**
   * Check if key exists and is not expired
   * @param {string} key
   * @returns {boolean}
   */
  has(key) {
    const node = this.cache.get(key);
    if (!node) return false;
    if (node.isExpired()) {
      this.delete(key);
      return false;
    }
    return true;
  }

  /**
   * Get or fetch with caching
   * @param {string} key
   * @param {Function} fetcher - Async function to fetch if not cached
   * @param {number} ttl - TTL in milliseconds (optional)
   * @returns {Promise<any>}
   */
  async getOrFetch(key, fetcher, ttl = this.defaultTTL) {
    const cached = this.get(key);
    if (cached !== null) {
      return cached;
    }

    const value = await fetcher();
    this.set(key, value, ttl);
    return value;
  }

  /**
   * Invalidate all keys matching a prefix
   * @param {string} prefix
   * @returns {number} Number of keys invalidated
   */
  invalidateByPrefix(prefix) {
    let count = 0;
    for (const key of this.cache.keys()) {
      if (key.startsWith(prefix)) {
        this.delete(key);
        count++;
      }
    }
    return count;
  }

  /**
   * Invalidate all keys for a tenant
   * @param {string} tenantId
   * @returns {number} Number of keys invalidated
   */
  invalidateTenant(tenantId) {
    return this.invalidateByPrefix(`tenant:${tenantId}:`);
  }

  /**
   * Clear all cache entries
   */
  clear() {
    this.cache.clear();
    this.head = null;
    this.tail = null;
  }

  /**
   * Get cache statistics
   */
  getStats() {
    const total = this.hits + this.misses;
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      hits: this.hits,
      misses: this.misses,
      hitRate: total > 0 ? (this.hits / total * 100).toFixed(2) + '%' : '0%',
    };
  }

  /**
   * Cleanup expired entries
   * Call periodically to free memory
   */
  cleanup() {
    let cleaned = 0;
    for (const [key, node] of this.cache) {
      if (node.isExpired()) {
        this.delete(key);
        cleaned++;
      }
    }
    return cleaned;
  }

  // Private methods for linked list operations

  _addToHead(node) {
    node.prev = null;
    node.next = this.head;

    if (this.head) {
      this.head.prev = node;
    }
    this.head = node;

    if (!this.tail) {
      this.tail = node;
    }
  }

  _removeNode(node) {
    if (node.prev) {
      node.prev.next = node.next;
    } else {
      this.head = node.next;
    }

    if (node.next) {
      node.next.prev = node.prev;
    } else {
      this.tail = node.prev;
    }
  }

  _moveToHead(node) {
    this._removeNode(node);
    this._addToHead(node);
  }

  _evictLRU() {
    if (this.tail) {
      this.cache.delete(this.tail.key);
      this._removeNode(this.tail);
    }
  }
}

// ============================================================================
// SINGLETON CACHE INSTANCES
// ============================================================================

// Global cache instances with appropriate TTLs
const caches = {
  // Short-lived cache for dynamic content (60 seconds)
  player: new LRUCache({ maxSize: 500, defaultTTL: 60 * 1000 }),

  // Medium-lived cache for lists (2 minutes)
  lists: new LRUCache({ maxSize: 1000, defaultTTL: 2 * 60 * 1000 }),

  // Longer-lived cache for relatively static content (5 minutes)
  templates: new LRUCache({ maxSize: 200, defaultTTL: 5 * 60 * 1000 }),

  // Dashboard stats cache (2 minutes)
  dashboard: new LRUCache({ maxSize: 500, defaultTTL: 2 * 60 * 1000 }),

  // User/profile cache (2 minutes)
  user: new LRUCache({ maxSize: 500, defaultTTL: 2 * 60 * 1000 }),
};

// ============================================================================
// TENANT-AWARE CACHE KEY GENERATORS
// ============================================================================

const cacheKeys = {
  // Screen-related
  screens: (tenantId) => `tenant:${tenantId}:screens:list`,
  screen: (tenantId, screenId) => `tenant:${tenantId}:screens:${screenId}`,
  screenContent: (tenantId, screenId) => `tenant:${tenantId}:content:${screenId}`,

  // Playlist-related
  playlists: (tenantId) => `tenant:${tenantId}:playlists:list`,
  playlist: (tenantId, playlistId) => `tenant:${tenantId}:playlists:${playlistId}`,

  // Media-related
  media: (tenantId) => `tenant:${tenantId}:media:list`,
  mediaAsset: (tenantId, mediaId) => `tenant:${tenantId}:media:${mediaId}`,

  // Campaign-related
  campaigns: (tenantId) => `tenant:${tenantId}:campaigns:list`,
  campaign: (tenantId, campaignId) => `tenant:${tenantId}:campaigns:${campaignId}`,

  // Dashboard
  dashboardCounts: (tenantId) => `tenant:${tenantId}:dashboard:counts`,
  dashboardStats: (tenantId) => `tenant:${tenantId}:dashboard:stats`,

  // User/profile
  profile: (userId) => `user:${userId}:profile`,
  permissions: (userId) => `user:${userId}:permissions`,

  // Content resolution (for player)
  contentResolution: (screenId) => `content:resolution:${screenId}`,

  // Templates (global, not tenant-specific)
  templates: () => 'global:templates:list',
  template: (templateId) => `global:templates:${templateId}`,
};

// ============================================================================
// CACHE WRAPPER FUNCTIONS
// ============================================================================

/**
 * Cache wrapper for screen list queries
 */
async function cachedGetScreens(tenantId, fetcher) {
  const key = cacheKeys.screens(tenantId);
  return caches.lists.getOrFetch(key, fetcher);
}

/**
 * Cache wrapper for playlist list queries
 */
async function cachedGetPlaylists(tenantId, fetcher) {
  const key = cacheKeys.playlists(tenantId);
  return caches.lists.getOrFetch(key, fetcher);
}

/**
 * Cache wrapper for media list queries
 */
async function cachedGetMedia(tenantId, fetcher) {
  const key = cacheKeys.media(tenantId);
  return caches.lists.getOrFetch(key, fetcher);
}

/**
 * Cache wrapper for campaign list queries
 */
async function cachedGetCampaigns(tenantId, fetcher) {
  const key = cacheKeys.campaigns(tenantId);
  return caches.lists.getOrFetch(key, fetcher);
}

/**
 * Cache wrapper for dashboard counts
 */
async function cachedGetDashboardCounts(tenantId, fetcher) {
  const key = cacheKeys.dashboardCounts(tenantId);
  return caches.dashboard.getOrFetch(key, fetcher);
}

/**
 * Cache wrapper for content resolution (player)
 */
async function cachedGetContentResolution(screenId, fetcher) {
  const key = cacheKeys.contentResolution(screenId);
  return caches.player.getOrFetch(key, fetcher, 30 * 1000); // 30 second TTL for player
}

/**
 * Cache wrapper for templates (global cache)
 */
async function cachedGetTemplates(fetcher) {
  const key = cacheKeys.templates();
  return caches.templates.getOrFetch(key, fetcher);
}

// ============================================================================
// CACHE INVALIDATION HELPERS
// ============================================================================

/**
 * Invalidate all caches for a tenant
 * Call this after any write operation
 */
function invalidateTenantCaches(tenantId) {
  const prefix = `tenant:${tenantId}:`;
  let total = 0;
  for (const cache of Object.values(caches)) {
    total += cache.invalidateByPrefix(prefix);
  }
  return total;
}

/**
 * Invalidate screen-related caches
 */
function invalidateScreenCaches(tenantId) {
  caches.lists.delete(cacheKeys.screens(tenantId));
  caches.dashboard.delete(cacheKeys.dashboardCounts(tenantId));
}

/**
 * Invalidate playlist-related caches
 */
function invalidatePlaylistCaches(tenantId) {
  caches.lists.delete(cacheKeys.playlists(tenantId));
  caches.dashboard.delete(cacheKeys.dashboardCounts(tenantId));
}

/**
 * Invalidate media-related caches
 */
function invalidateMediaCaches(tenantId) {
  caches.lists.delete(cacheKeys.media(tenantId));
  caches.dashboard.delete(cacheKeys.dashboardCounts(tenantId));
}

/**
 * Invalidate campaign-related caches
 */
function invalidateCampaignCaches(tenantId) {
  caches.lists.delete(cacheKeys.campaigns(tenantId));
}

/**
 * Invalidate content resolution cache for a screen
 */
function invalidateContentCache(screenId) {
  caches.player.delete(cacheKeys.contentResolution(screenId));
}

// ============================================================================
// GLOBAL STATS & CLEANUP
// ============================================================================

/**
 * Get aggregated stats from all caches
 */
function getAllCacheStats() {
  const stats = {};
  for (const [name, cache] of Object.entries(caches)) {
    stats[name] = cache.getStats();
  }
  return stats;
}

/**
 * Cleanup expired entries from all caches
 * Run this periodically (e.g., every 5 minutes)
 */
function cleanupAllCaches() {
  let total = 0;
  for (const cache of Object.values(caches)) {
    total += cache.cleanup();
  }
  return total;
}

/**
 * Clear all caches (use with caution)
 */
function clearAllCaches() {
  for (const cache of Object.values(caches)) {
    cache.clear();
  }
}

// ============================================================================
// DISTRIBUTED CACHE MOCK (Future Redis Integration)
// ============================================================================

/**
 * Mock distributed cache interface for future Redis/Upstash integration
 * Implements same interface as LRUCache for easy swapping
 */
class DistributedCacheMock {
  constructor() {
    this.localCache = new LRUCache({ maxSize: 100, defaultTTL: 60 * 1000 });
  }

  async get(key) {
    // In real implementation: await redis.get(key)
    return this.localCache.get(key);
  }

  async set(key, value, ttl) {
    // In real implementation: await redis.setex(key, ttl/1000, JSON.stringify(value))
    this.localCache.set(key, value, ttl);
  }

  async delete(key) {
    // In real implementation: await redis.del(key)
    this.localCache.delete(key);
  }

  async getOrFetch(key, fetcher, ttl) {
    const cached = await this.get(key);
    if (cached !== null) return cached;
    const value = await fetcher();
    await this.set(key, value, ttl);
    return value;
  }

  async invalidateByPrefix(prefix) {
    // In real implementation: use SCAN + DEL or Lua script
    return this.localCache.invalidateByPrefix(prefix);
  }
}

// Singleton distributed cache instance (uses local cache as fallback)
const distributedCache = new DistributedCacheMock();

// ============================================================================
// EXPORTS
// ============================================================================

export {
  // Core class
  LRUCache,

  // Singleton instances
  caches,

  // Key generators
  cacheKeys,

  // Cached fetch wrappers
  cachedGetScreens,
  cachedGetPlaylists,
  cachedGetMedia,
  cachedGetCampaigns,
  cachedGetDashboardCounts,
  cachedGetContentResolution,
  cachedGetTemplates,

  // Invalidation helpers
  invalidateTenantCaches,
  invalidateScreenCaches,
  invalidatePlaylistCaches,
  invalidateMediaCaches,
  invalidateCampaignCaches,
  invalidateContentCache,

  // Stats & cleanup
  getAllCacheStats,
  cleanupAllCaches,
  clearAllCaches,

  // Distributed cache (mock)
  distributedCache,
  DistributedCacheMock,
};

export default LRUCache;
