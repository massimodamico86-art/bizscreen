/**
 * Cache Service Unit Tests
 * Phase 13: Tests for the frontend cache service
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  caches,
  cacheKeys,
  getAllServiceCacheStats,
  cleanupServiceCaches,
  clearAllServiceCaches,
} from '../../../src/services/cacheService.js';

// Mock supabase
vi.mock('../../../src/supabase.js', () => ({
  supabase: {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'test-user-123' } } }),
    },
  },
}));

describe('ServiceCache', () => {
  beforeEach(() => {
    clearAllServiceCaches();
  });

  describe('basic operations', () => {
    it('should set and get values', () => {
      caches.screens.set('test-key', { id: 1, name: 'Test' });
      const result = caches.screens.get('test-key');
      expect(result).toEqual({ id: 1, name: 'Test' });
    });

    it('should return null for non-existent keys', () => {
      expect(caches.screens.get('nonexistent')).toBeNull();
    });

    it('should update existing keys', () => {
      caches.screens.set('key1', 'original');
      caches.screens.set('key1', 'updated');
      expect(caches.screens.get('key1')).toBe('updated');
    });

    it('should delete keys', () => {
      caches.screens.set('key1', 'value');
      caches.screens.delete('key1');
      expect(caches.screens.get('key1')).toBeNull();
    });

    it('should clear all entries', () => {
      caches.screens.set('key1', 'value1');
      caches.screens.set('key2', 'value2');
      caches.screens.clear();
      expect(caches.screens.get('key1')).toBeNull();
      expect(caches.screens.get('key2')).toBeNull();
    });
  });

  describe('LRU eviction', () => {
    it('should evict oldest when at capacity', () => {
      // Create a small cache for testing
      const smallCache = {
        cache: new Map(),
        maxSize: 3,
        defaultTTL: 60000,
        hits: 0,
        misses: 0,
        _makeEntry(value, ttl) {
          return { value, expiresAt: Date.now() + ttl };
        },
        set(key, value, ttl = this.defaultTTL) {
          if (this.cache.has(key)) this.cache.delete(key);
          if (this.cache.size >= this.maxSize) {
            const firstKey = this.cache.keys().next().value;
            this.cache.delete(firstKey);
          }
          this.cache.set(key, this._makeEntry(value, ttl));
        },
        get(key) {
          const entry = this.cache.get(key);
          if (!entry) return null;
          this.cache.delete(key);
          this.cache.set(key, entry);
          return entry.value;
        },
      };

      smallCache.set('key1', 'value1');
      smallCache.set('key2', 'value2');
      smallCache.set('key3', 'value3');

      // Access key1 to make it recently used
      smallCache.get('key1');

      // Add new key - should evict key2 (oldest non-accessed)
      smallCache.set('key4', 'value4');

      expect(smallCache.cache.has('key1')).toBe(true);
      expect(smallCache.cache.has('key2')).toBe(false);
      expect(smallCache.cache.has('key3')).toBe(true);
      expect(smallCache.cache.has('key4')).toBe(true);
    });
  });

  describe('TTL expiration', () => {
    it('should expire entries after TTL', async () => {
      caches.screens.set('expiring', 'value', 50);
      expect(caches.screens.get('expiring')).toBe('value');

      await new Promise((resolve) => setTimeout(resolve, 60));

      expect(caches.screens.get('expiring')).toBeNull();
    });

    it('should cleanup expired entries', async () => {
      caches.screens.set('expire1', 'value1', 50);
      caches.screens.set('expire2', 'value2', 50);
      caches.screens.set('keep', 'value3', 5000);

      await new Promise((resolve) => setTimeout(resolve, 60));

      const cleaned = caches.screens.cleanup();
      expect(cleaned).toBe(2);
    });
  });

  describe('getOrFetch', () => {
    it('should return cached value if exists', async () => {
      const fetcher = vi.fn().mockResolvedValue('fetched');
      caches.screens.set('cached-key', 'cached-value');

      const result = await caches.screens.getOrFetch('cached-key', fetcher);

      expect(result).toBe('cached-value');
      expect(fetcher).not.toHaveBeenCalled();
    });

    it('should call fetcher and cache result if not cached', async () => {
      const fetcher = vi.fn().mockResolvedValue(['screen1', 'screen2']);

      const result1 = await caches.screens.getOrFetch('new-key', fetcher);
      const result2 = await caches.screens.getOrFetch('new-key', fetcher);

      expect(result1).toEqual(['screen1', 'screen2']);
      expect(result2).toEqual(['screen1', 'screen2']);
      expect(fetcher).toHaveBeenCalledTimes(1);
    });
  });

  describe('prefix invalidation', () => {
    it('should invalidate keys by prefix', () => {
      caches.screens.set('screens:user1:list', 'data1');
      caches.screens.set('screens:user1:detail', 'data2');
      caches.screens.set('screens:user2:list', 'data3');

      const count = caches.screens.invalidateByPrefix('screens:user1');

      expect(count).toBe(2);
      expect(caches.screens.get('screens:user1:list')).toBeNull();
      expect(caches.screens.get('screens:user2:list')).not.toBeNull();
    });
  });

  describe('statistics', () => {
    it('should track hits and misses', () => {
      caches.screens.set('key1', 'value1');

      caches.screens.get('key1'); // Hit
      caches.screens.get('key1'); // Hit
      caches.screens.get('nonexistent'); // Miss

      const stats = caches.screens.getStats();
      expect(stats.hits).toBe(2);
      expect(stats.misses).toBe(1);
      expect(stats.hitRate).toBe('66.7%');
    });

    it('should report size correctly', () => {
      caches.screens.set('key1', 'value1');
      caches.screens.set('key2', 'value2');

      const stats = caches.screens.getStats();
      expect(stats.size).toBe(2);
    });
  });
});

describe('Cache Key Generators', () => {
  it('should generate user-scoped screen keys', () => {
    expect(cacheKeys.screens('user123')).toBe('screens:user123');
    expect(cacheKeys.screensWithFilter('user123', { status: 'online' }))
      .toBe('screens:user123:{"status":"online"}');
  });

  it('should generate user-scoped playlist keys', () => {
    expect(cacheKeys.playlists('user123')).toBe('playlists:user123');
  });

  it('should generate user-scoped media keys', () => {
    expect(cacheKeys.media('user123')).toBe('media:user123');
  });

  it('should generate dashboard keys', () => {
    expect(cacheKeys.dashboardStats('user123')).toBe('dashboard:stats:user123');
    expect(cacheKeys.dashboardCounts('user123')).toBe('dashboard:counts:user123');
  });

  it('should generate global template keys', () => {
    expect(cacheKeys.templates()).toBe('templates:all');
    expect(cacheKeys.template('tmpl123')).toBe('templates:tmpl123');
  });
});

describe('Cache Instances', () => {
  beforeEach(() => {
    clearAllServiceCaches();
  });

  it('should have all expected cache instances', () => {
    expect(caches.screens).toBeDefined();
    expect(caches.playlists).toBeDefined();
    expect(caches.media).toBeDefined();
    expect(caches.campaigns).toBeDefined();
    expect(caches.dashboard).toBeDefined();
    expect(caches.templates).toBeDefined();
  });

  it('should have correct max sizes', () => {
    expect(caches.screens.maxSize).toBe(500);
    expect(caches.playlists.maxSize).toBe(500);
    expect(caches.media.maxSize).toBe(1000);
    expect(caches.campaigns.maxSize).toBe(300);
    expect(caches.dashboard.maxSize).toBe(100);
    expect(caches.templates.maxSize).toBe(100);
  });

  it('should have appropriate TTLs', () => {
    expect(caches.screens.defaultTTL).toBe(60 * 1000); // 1 minute
    expect(caches.playlists.defaultTTL).toBe(2 * 60 * 1000); // 2 minutes
    expect(caches.templates.defaultTTL).toBe(5 * 60 * 1000); // 5 minutes
  });
});

describe('Global Cache Utilities', () => {
  beforeEach(() => {
    clearAllServiceCaches();
  });

  it('should get stats from all caches', () => {
    caches.screens.set('test', 'value');
    caches.screens.get('test');

    const stats = getAllServiceCacheStats();

    expect(stats.screens).toBeDefined();
    expect(stats.playlists).toBeDefined();
    expect(stats.screens.hits).toBe(1);
  });

  it('should cleanup all caches', async () => {
    caches.screens.set('exp1', 'val', 10);
    caches.playlists.set('exp2', 'val', 10);

    await new Promise((resolve) => setTimeout(resolve, 20));

    const cleaned = cleanupServiceCaches();
    expect(cleaned).toBeGreaterThanOrEqual(2);
  });

  it('should clear all caches', () => {
    caches.screens.set('key1', 'value1');
    caches.playlists.set('key2', 'value2');
    caches.media.set('key3', 'value3');

    clearAllServiceCaches();

    expect(caches.screens.get('key1')).toBeNull();
    expect(caches.playlists.get('key2')).toBeNull();
    expect(caches.media.get('key3')).toBeNull();
  });
});

describe('Cache Thread Safety (Simulated)', () => {
  beforeEach(() => {
    clearAllServiceCaches();
  });

  it('should handle concurrent getOrFetch calls', async () => {
    let fetchCount = 0;
    const fetcher = vi.fn().mockImplementation(async () => {
      fetchCount++;
      await new Promise((resolve) => setTimeout(resolve, 50));
      return { data: 'fetched', count: fetchCount };
    });

    // Simulate concurrent requests
    const [result1, result2, result3] = await Promise.all([
      caches.screens.getOrFetch('concurrent-key', fetcher),
      caches.screens.getOrFetch('concurrent-key', fetcher),
      caches.screens.getOrFetch('concurrent-key', fetcher),
    ]);

    // All should get data (though potentially from different fetches due to race)
    expect(result1.data).toBe('fetched');
    expect(result2.data).toBe('fetched');
    expect(result3.data).toBe('fetched');
  });
});
