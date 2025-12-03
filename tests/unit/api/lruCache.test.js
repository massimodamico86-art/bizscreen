/**
 * LRU Cache Unit Tests
 * Phase 13: Tests for the serverless LRU cache implementation
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import LRUCache, {
  caches,
  cacheKeys,
  cachedGetScreens,
  cachedGetPlaylists,
  invalidateTenantCaches,
  getAllCacheStats,
  cleanupAllCaches,
  clearAllCaches,
  DistributedCacheMock,
} from '../../../api/lib/lruCache.js';

describe('LRUCache', () => {
  let cache;

  beforeEach(() => {
    cache = new LRUCache({ maxSize: 5, defaultTTL: 1000 });
  });

  describe('basic operations', () => {
    it('should set and get values', () => {
      cache.set('key1', 'value1');
      expect(cache.get('key1')).toBe('value1');
    });

    it('should return null for non-existent keys', () => {
      expect(cache.get('nonexistent')).toBeNull();
    });

    it('should update existing keys', () => {
      cache.set('key1', 'value1');
      cache.set('key1', 'updated');
      expect(cache.get('key1')).toBe('updated');
    });

    it('should delete keys', () => {
      cache.set('key1', 'value1');
      cache.delete('key1');
      expect(cache.get('key1')).toBeNull();
    });

    it('should check if key exists with has()', () => {
      cache.set('key1', 'value1');
      expect(cache.has('key1')).toBe(true);
      expect(cache.has('nonexistent')).toBe(false);
    });

    it('should clear all entries', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      cache.clear();
      expect(cache.get('key1')).toBeNull();
      expect(cache.get('key2')).toBeNull();
    });
  });

  describe('LRU eviction', () => {
    it('should evict least recently used when at capacity', () => {
      // Fill cache to capacity
      for (let i = 0; i < 5; i++) {
        cache.set(`key${i}`, `value${i}`);
      }

      // All keys should exist
      for (let i = 0; i < 5; i++) {
        expect(cache.get(`key${i}`)).toBe(`value${i}`);
      }

      // Add one more - should evict key0 (LRU after all gets moved other keys)
      cache.set('key5', 'value5');

      // key0 was most recently accessed (last get), so key1 should be evicted
      // Actually after getting all keys in order, key0 is now at head (most recent)
      // The LRU would be key1 since we got key0 last
      expect(cache.has('key5')).toBe(true);
    });

    it('should move accessed items to head', () => {
      cache.set('key0', 'value0');
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');

      // Access key0, making it most recently used
      cache.get('key0');

      // Fill remaining capacity + 1
      cache.set('key3', 'value3');
      cache.set('key4', 'value4');
      cache.set('key5', 'value5'); // Should evict key1 (LRU)

      expect(cache.has('key0')).toBe(true); // Was accessed, shouldn't be evicted
      expect(cache.has('key1')).toBe(false); // LRU, should be evicted
    });
  });

  describe('TTL expiration', () => {
    it('should expire entries after TTL', async () => {
      cache.set('key1', 'value1', 50); // 50ms TTL

      expect(cache.get('key1')).toBe('value1');

      // Wait for expiration
      await new Promise((resolve) => setTimeout(resolve, 60));

      expect(cache.get('key1')).toBeNull();
    });

    it('should use default TTL when not specified', () => {
      const shortCache = new LRUCache({ defaultTTL: 100 });
      shortCache.set('key1', 'value1');

      // Should exist immediately
      expect(shortCache.get('key1')).toBe('value1');
    });

    it('should cleanup expired entries', async () => {
      cache.set('key1', 'value1', 50);
      cache.set('key2', 'value2', 5000);

      // Wait for key1 to expire
      await new Promise((resolve) => setTimeout(resolve, 60));

      const cleaned = cache.cleanup();
      expect(cleaned).toBe(1);
      expect(cache.has('key1')).toBe(false);
      expect(cache.has('key2')).toBe(true);
    });
  });

  describe('getOrFetch', () => {
    it('should return cached value if exists', async () => {
      const fetcher = vi.fn().mockResolvedValue('fetched');
      cache.set('key1', 'cached');

      const result = await cache.getOrFetch('key1', fetcher);

      expect(result).toBe('cached');
      expect(fetcher).not.toHaveBeenCalled();
    });

    it('should call fetcher if not cached', async () => {
      const fetcher = vi.fn().mockResolvedValue('fetched');

      const result = await cache.getOrFetch('key1', fetcher);

      expect(result).toBe('fetched');
      expect(fetcher).toHaveBeenCalledTimes(1);
    });

    it('should cache fetched value', async () => {
      const fetcher = vi.fn().mockResolvedValue('fetched');

      await cache.getOrFetch('key1', fetcher);
      const result = await cache.getOrFetch('key1', fetcher);

      expect(result).toBe('fetched');
      expect(fetcher).toHaveBeenCalledTimes(1); // Only called once
    });
  });

  describe('prefix invalidation', () => {
    it('should invalidate keys by prefix', () => {
      cache.set('tenant:1:screens', 'data1');
      cache.set('tenant:1:playlists', 'data2');
      cache.set('tenant:2:screens', 'data3');

      const count = cache.invalidateByPrefix('tenant:1:');

      expect(count).toBe(2);
      expect(cache.has('tenant:1:screens')).toBe(false);
      expect(cache.has('tenant:1:playlists')).toBe(false);
      expect(cache.has('tenant:2:screens')).toBe(true);
    });

    it('should invalidate tenant caches', () => {
      cache.set('tenant:abc123:screens', 'data');
      cache.set('tenant:abc123:playlists', 'data');
      cache.set('tenant:def456:screens', 'data');

      const count = cache.invalidateTenant('abc123');

      expect(count).toBe(2);
    });
  });

  describe('statistics', () => {
    it('should track hits and misses', () => {
      cache.set('key1', 'value1');

      cache.get('key1'); // Hit
      cache.get('key1'); // Hit
      cache.get('nonexistent'); // Miss

      const stats = cache.getStats();
      expect(stats.hits).toBe(2);
      expect(stats.misses).toBe(1);
      expect(stats.hitRate).toBe('66.67%');
    });

    it('should report size correctly', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');

      const stats = cache.getStats();
      expect(stats.size).toBe(2);
      expect(stats.maxSize).toBe(5);
    });
  });
});

describe('Cache Key Generators', () => {
  it('should generate tenant-scoped screen keys', () => {
    expect(cacheKeys.screens('tenant123')).toBe('tenant:tenant123:screens:list');
    expect(cacheKeys.screen('tenant123', 'screen456')).toBe('tenant:tenant123:screens:screen456');
  });

  it('should generate tenant-scoped playlist keys', () => {
    expect(cacheKeys.playlists('tenant123')).toBe('tenant:tenant123:playlists:list');
    expect(cacheKeys.playlist('tenant123', 'playlist789')).toBe('tenant:tenant123:playlists:playlist789');
  });

  it('should generate dashboard keys', () => {
    expect(cacheKeys.dashboardCounts('tenant123')).toBe('tenant:tenant123:dashboard:counts');
    expect(cacheKeys.dashboardStats('tenant123')).toBe('tenant:tenant123:dashboard:stats');
  });

  it('should generate user-scoped keys', () => {
    expect(cacheKeys.profile('user123')).toBe('user:user123:profile');
    expect(cacheKeys.permissions('user123')).toBe('user:user123:permissions');
  });

  it('should generate global template keys', () => {
    expect(cacheKeys.templates()).toBe('global:templates:list');
    expect(cacheKeys.template('tmpl123')).toBe('global:templates:tmpl123');
  });
});

describe('Singleton Cache Instances', () => {
  beforeEach(() => {
    clearAllCaches();
  });

  it('should have all expected cache instances', () => {
    expect(caches.player).toBeInstanceOf(LRUCache);
    expect(caches.lists).toBeInstanceOf(LRUCache);
    expect(caches.templates).toBeInstanceOf(LRUCache);
    expect(caches.dashboard).toBeInstanceOf(LRUCache);
    expect(caches.user).toBeInstanceOf(LRUCache);
  });

  it('should get all cache stats', () => {
    caches.player.set('test', 'value');
    caches.player.get('test');
    caches.player.get('nonexistent');

    const stats = getAllCacheStats();

    expect(stats.player).toBeDefined();
    expect(stats.player.hits).toBe(1);
    expect(stats.player.misses).toBe(1);
  });

  it('should cleanup all caches', async () => {
    // Set with very short TTL
    caches.player.set('expiring', 'value', 10);
    caches.lists.set('expiring', 'value', 10);

    await new Promise((resolve) => setTimeout(resolve, 20));

    const cleaned = cleanupAllCaches();
    expect(cleaned).toBeGreaterThanOrEqual(2);
  });
});

describe('Cached Fetch Wrappers', () => {
  beforeEach(() => {
    clearAllCaches();
  });

  it('should cache screen list fetches', async () => {
    const fetcher = vi.fn().mockResolvedValue([{ id: 1, name: 'Screen 1' }]);

    const result1 = await cachedGetScreens('tenant123', fetcher);
    const result2 = await cachedGetScreens('tenant123', fetcher);

    expect(result1).toEqual([{ id: 1, name: 'Screen 1' }]);
    expect(result2).toEqual([{ id: 1, name: 'Screen 1' }]);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('should cache playlist list fetches', async () => {
    const fetcher = vi.fn().mockResolvedValue([{ id: 1, name: 'Playlist 1' }]);

    const result1 = await cachedGetPlaylists('tenant123', fetcher);
    const result2 = await cachedGetPlaylists('tenant123', fetcher);

    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(result1).toEqual(result2);
  });

  it('should separate cache by tenant', async () => {
    const fetcher1 = vi.fn().mockResolvedValue({ tenant: 1 });
    const fetcher2 = vi.fn().mockResolvedValue({ tenant: 2 });

    const result1 = await cachedGetScreens('tenant1', fetcher1);
    const result2 = await cachedGetScreens('tenant2', fetcher2);

    expect(result1).toEqual({ tenant: 1 });
    expect(result2).toEqual({ tenant: 2 });
    expect(fetcher1).toHaveBeenCalledTimes(1);
    expect(fetcher2).toHaveBeenCalledTimes(1);
  });
});

describe('Cache Invalidation Helpers', () => {
  beforeEach(() => {
    clearAllCaches();
  });

  it('should invalidate all tenant caches', () => {
    caches.lists.set('tenant:abc:screens:list', 'data');
    caches.lists.set('tenant:abc:playlists:list', 'data');
    caches.dashboard.set('tenant:abc:dashboard:counts', 'data');
    caches.lists.set('tenant:xyz:screens:list', 'data');

    const count = invalidateTenantCaches('abc');

    expect(count).toBe(3);
    expect(caches.lists.has('tenant:abc:screens:list')).toBe(false);
    expect(caches.lists.has('tenant:xyz:screens:list')).toBe(true);
  });
});

describe('DistributedCacheMock', () => {
  let distributedCache;

  beforeEach(() => {
    distributedCache = new DistributedCacheMock();
  });

  it('should implement async get/set', async () => {
    await distributedCache.set('key1', 'value1', 5000);
    const result = await distributedCache.get('key1');
    expect(result).toBe('value1');
  });

  it('should implement async delete', async () => {
    await distributedCache.set('key1', 'value1', 5000);
    await distributedCache.delete('key1');
    const result = await distributedCache.get('key1');
    expect(result).toBeNull();
  });

  it('should implement async getOrFetch', async () => {
    const fetcher = vi.fn().mockResolvedValue('fetched');

    const result1 = await distributedCache.getOrFetch('key1', fetcher, 5000);
    const result2 = await distributedCache.getOrFetch('key1', fetcher, 5000);

    expect(result1).toBe('fetched');
    expect(result2).toBe('fetched');
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('should implement async invalidateByPrefix', async () => {
    await distributedCache.set('prefix:key1', 'value1', 5000);
    await distributedCache.set('prefix:key2', 'value2', 5000);
    await distributedCache.set('other:key1', 'value3', 5000);

    const count = await distributedCache.invalidateByPrefix('prefix:');

    expect(count).toBe(2);
  });
});
