/**
 * Player Cache Service Unit Tests
 * Tests for IndexedDB-based caching for offline mode
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock idb library - the factory function must not reference external variables
vi.mock('idb', () => {
  const db = {
    put: vi.fn().mockResolvedValue(undefined),
    get: vi.fn().mockResolvedValue(null),
    getAll: vi.fn().mockResolvedValue([]),
    getAllFromIndex: vi.fn().mockResolvedValue([]),
    delete: vi.fn().mockResolvedValue(undefined),
    add: vi.fn().mockResolvedValue(1),
    clear: vi.fn().mockResolvedValue(undefined),
  };
  return {
    openDB: vi.fn().mockResolvedValue(db),
    __mockDB: db,
  };
});

// Import after mocking
import {
  cacheScene,
  getCachedScene,
  getAllCachedScenes,
  markSceneAsStale,
  deleteCachedScene,
  cacheMedia,
  getCachedMedia,
  saveDeviceState,
  getDeviceState,
  getLastSyncInfo,
  updateLastSyncInfo,
  queueOfflineEvent,
  getPendingEvents,
  markEventsSynced,
  getCacheSize,
  clearAllCache,
  clearStaleCache,
  isIndexedDBAvailable,
  getCacheInfo,
} from '../../../src/player/cacheService';

// Get the mock DB from the mock module
let mockDB;
beforeAll(async () => {
  const idb = await import('idb');
  mockDB = idb.__mockDB;
});

describe('cacheService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    if (mockDB) {
      // Reset mock implementations
      mockDB.put.mockResolvedValue(undefined);
      mockDB.get.mockResolvedValue(null);
      mockDB.getAll.mockResolvedValue([]);
      mockDB.getAllFromIndex.mockResolvedValue([]);
      mockDB.delete.mockResolvedValue(undefined);
      mockDB.add.mockResolvedValue(1);
      mockDB.clear.mockResolvedValue(undefined);
    }
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('cacheScene', () => {
    it('throws error for missing scene ID', async () => {
      await expect(cacheScene(null, {})).rejects.toThrow('Scene ID and data are required');
      await expect(cacheScene('', {})).rejects.toThrow('Scene ID and data are required');
    });

    it('throws error for missing scene data', async () => {
      await expect(cacheScene('scene-123', null)).rejects.toThrow('Scene ID and data are required');
    });

    it('caches scene with correct structure', async () => {
      const sceneId = 'scene-123';
      const sceneData = {
        name: 'Test Scene',
        design_json: { widgets: [] },
        content_hash: 'abc123',
        media_hash: 'def456',
        business_type: 'restaurant',
        media_urls: ['http://example.com/image.jpg'],
      };

      await cacheScene(sceneId, sceneData);

      expect(mockDB.put).toHaveBeenCalledWith(
        'scenes',
        expect.objectContaining({
          id: sceneId,
          name: 'Test Scene',
          designJson: { widgets: [] },
          contentHash: 'abc123',
          mediaHash: 'def456',
          businessType: 'restaurant',
          mediaUrls: ['http://example.com/image.jpg'],
          isStale: false,
        })
      );
    });

    it('handles both snake_case and camelCase properties', async () => {
      const sceneData = {
        name: 'Test',
        designJson: { widgets: [] },
        contentHash: 'abc',
      };

      await cacheScene('scene-123', sceneData);

      expect(mockDB.put).toHaveBeenCalledWith(
        'scenes',
        expect.objectContaining({
          designJson: { widgets: [] },
          contentHash: 'abc',
        })
      );
    });
  });

  describe('getCachedScene', () => {
    it('returns null for missing scene ID', async () => {
      const result = await getCachedScene(null);
      expect(result).toBeNull();
    });

    it('returns null for non-existent scene', async () => {
      mockDB.get.mockResolvedValue(undefined);
      const result = await getCachedScene('non-existent');
      expect(result).toBeNull();
    });

    it('returns cached scene if exists', async () => {
      const cachedScene = {
        id: 'scene-123',
        name: 'Test Scene',
        designJson: { widgets: [] },
      };
      mockDB.get.mockResolvedValue(cachedScene);

      const result = await getCachedScene('scene-123');
      expect(result).toEqual(cachedScene);
    });
  });

  describe('getAllCachedScenes', () => {
    it('returns all cached scenes', async () => {
      const scenes = [
        { id: 'scene-1', name: 'Scene 1' },
        { id: 'scene-2', name: 'Scene 2' },
      ];
      mockDB.getAll.mockResolvedValue(scenes);

      const result = await getAllCachedScenes();
      expect(result).toEqual(scenes);
    });
  });

  describe('markSceneAsStale', () => {
    it('does nothing for missing scene ID', async () => {
      await markSceneAsStale(null);
      expect(mockDB.get).not.toHaveBeenCalled();
    });

    it('marks existing scene as stale', async () => {
      const existingScene = {
        id: 'scene-123',
        name: 'Test',
        isStale: false,
      };
      mockDB.get.mockResolvedValue(existingScene);

      await markSceneAsStale('scene-123');

      expect(mockDB.put).toHaveBeenCalledWith(
        'scenes',
        expect.objectContaining({
          id: 'scene-123',
          isStale: true,
          markedStaleAt: expect.any(String),
        })
      );
    });
  });

  describe('deleteCachedScene', () => {
    it('does nothing for missing scene ID', async () => {
      await deleteCachedScene(null);
      expect(mockDB.delete).not.toHaveBeenCalled();
    });

    it('deletes scene and associated media', async () => {
      mockDB.getAllFromIndex.mockResolvedValue([
        { url: 'http://example.com/img1.jpg' },
        { url: 'http://example.com/img2.jpg' },
      ]);

      await deleteCachedScene('scene-123');

      expect(mockDB.delete).toHaveBeenCalledWith('scenes', 'scene-123');
      expect(mockDB.delete).toHaveBeenCalledWith('media', 'http://example.com/img1.jpg');
      expect(mockDB.delete).toHaveBeenCalledWith('media', 'http://example.com/img2.jpg');
    });
  });

  describe('cacheMedia', () => {
    it('throws error for missing URL', async () => {
      await expect(cacheMedia(null, new Blob())).rejects.toThrow('URL and blob are required');
    });

    it('throws error for missing blob', async () => {
      await expect(cacheMedia('http://example.com/img.jpg', null)).rejects.toThrow('URL and blob are required');
    });

    it('caches media with correct structure', async () => {
      const blob = new Blob(['test'], { type: 'image/jpeg' });
      await cacheMedia('http://example.com/img.jpg', blob, 'scene-123');

      expect(mockDB.put).toHaveBeenCalledWith(
        'media',
        expect.objectContaining({
          url: 'http://example.com/img.jpg',
          blob: blob,
          sceneId: 'scene-123',
          mimeType: 'image/jpeg',
        })
      );
    });
  });

  describe('getCachedMedia', () => {
    it('returns null for missing URL', async () => {
      const result = await getCachedMedia(null);
      expect(result).toBeNull();
    });

    it('returns blob if cached', async () => {
      const blob = new Blob(['test']);
      mockDB.get.mockResolvedValue({ url: 'http://example.com/img.jpg', blob });

      const result = await getCachedMedia('http://example.com/img.jpg');
      expect(result).toEqual(blob);
    });

    it('returns null if not cached', async () => {
      mockDB.get.mockResolvedValue(null);
      const result = await getCachedMedia('http://example.com/img.jpg');
      expect(result).toBeNull();
    });
  });

  describe('queueOfflineEvent', () => {
    it('adds event to offline queue', async () => {
      await queueOfflineEvent('heartbeat', { deviceId: 'device-123' });

      expect(mockDB.add).toHaveBeenCalledWith(
        'offlineQueue',
        expect.objectContaining({
          eventType: 'heartbeat',
          eventData: { deviceId: 'device-123' },
          synced: false,
        })
      );
    });
  });

  describe('getPendingEvents', () => {
    it('returns unsynced events sorted by createdAt', async () => {
      const events = [
        { id: 1, eventType: 'heartbeat', createdAt: '2025-01-01T10:00:00Z', synced: false },
        { id: 2, eventType: 'playback', createdAt: '2025-01-01T09:00:00Z', synced: false },
      ];
      mockDB.getAllFromIndex.mockResolvedValue(events);

      const result = await getPendingEvents();

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe(2); // Earlier event first
    });
  });

  describe('markEventsSynced', () => {
    it('marks specified events as synced', async () => {
      const event = { id: 1, eventType: 'heartbeat', synced: false };
      mockDB.get.mockResolvedValue(event);

      await markEventsSynced([1]);

      expect(mockDB.put).toHaveBeenCalledWith(
        'offlineQueue',
        expect.objectContaining({
          id: 1,
          synced: true,
          syncedAt: expect.any(String),
        })
      );
    });
  });

  describe('saveDeviceState / getDeviceState', () => {
    it('saves device state', async () => {
      await saveDeviceState('lastSync', { timestamp: '2025-01-01' });

      expect(mockDB.put).toHaveBeenCalledWith(
        'deviceState',
        expect.objectContaining({
          key: 'lastSync',
          value: { timestamp: '2025-01-01' },
        })
      );
    });

    it('retrieves device state', async () => {
      mockDB.get.mockResolvedValue({
        key: 'lastSync',
        value: { timestamp: '2025-01-01' },
      });

      const result = await getDeviceState('lastSync');
      expect(result).toEqual({ timestamp: '2025-01-01' });
    });
  });

  describe('getLastSyncInfo / updateLastSyncInfo', () => {
    it('gets last sync info', async () => {
      mockDB.get.mockResolvedValue({
        key: 'lastSync',
        value: { sceneId: 'scene-123' },
      });

      const result = await getLastSyncInfo();
      expect(result).toEqual({ sceneId: 'scene-123' });
    });

    it('updates last sync info', async () => {
      await updateLastSyncInfo({ sceneId: 'scene-123', contentHash: 'abc' });

      expect(mockDB.put).toHaveBeenCalledWith(
        'deviceState',
        expect.objectContaining({
          key: 'lastSync',
          value: expect.objectContaining({
            sceneId: 'scene-123',
            contentHash: 'abc',
            timestamp: expect.any(String),
          }),
        })
      );
    });
  });

  describe('getCacheSize', () => {
    it('calculates total cache size', async () => {
      mockDB.getAll.mockImplementation((store) => {
        if (store === 'scenes') {
          return [{ id: 'scene-1', name: 'Test' }];
        }
        if (store === 'media') {
          return [{ url: 'http://example.com/img.jpg', size: 1024 }];
        }
        return [];
      });

      const result = await getCacheSize();

      expect(result).toHaveProperty('scenes');
      expect(result).toHaveProperty('media');
      expect(result).toHaveProperty('total');
      expect(result).toHaveProperty('formatted');
    });
  });

  describe('clearAllCache', () => {
    it('clears scenes and media stores', async () => {
      await clearAllCache();

      expect(mockDB.clear).toHaveBeenCalledWith('scenes');
      expect(mockDB.clear).toHaveBeenCalledWith('media');
      // Should not clear deviceState or offlineQueue
      expect(mockDB.clear).toHaveBeenCalledTimes(2);
    });
  });

  describe('clearStaleCache', () => {
    it('removes cache entries older than specified days', async () => {
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 10);

      const newDate = new Date();
      newDate.setDate(newDate.getDate() - 1);

      mockDB.getAll.mockImplementation((store) => {
        if (store === 'scenes') {
          return [
            { id: 'old-scene', cachedAt: oldDate.toISOString() },
            { id: 'new-scene', cachedAt: newDate.toISOString() },
          ];
        }
        if (store === 'media') {
          return [
            { url: 'old-media.jpg', cachedAt: oldDate.toISOString() },
          ];
        }
        return [];
      });

      await clearStaleCache(7);

      expect(mockDB.delete).toHaveBeenCalledWith('scenes', 'old-scene');
      expect(mockDB.delete).toHaveBeenCalledWith('media', 'old-media.jpg');
      expect(mockDB.delete).not.toHaveBeenCalledWith('scenes', 'new-scene');
    });
  });

  describe('isIndexedDBAvailable', () => {
    it('returns a boolean indicating IndexedDB availability', () => {
      // In test environment, IndexedDB may not be available
      expect(typeof isIndexedDBAvailable()).toBe('boolean');
    });
  });

  describe('getCacheInfo', () => {
    it('returns comprehensive cache info', async () => {
      mockDB.getAll.mockImplementation((store) => {
        if (store === 'scenes') {
          return [{ id: 'scene-1', name: 'Test', contentHash: 'abc', isStale: false, cachedAt: new Date().toISOString() }];
        }
        if (store === 'media') {
          return [{ url: 'http://example.com/img.jpg', size: 1024 }];
        }
        return [];
      });
      mockDB.getAllFromIndex.mockResolvedValue([]);
      mockDB.get.mockResolvedValue({ key: 'lastSync', value: null });

      const result = await getCacheInfo();

      expect(result).toHaveProperty('scenes');
      expect(result).toHaveProperty('mediaCount');
      expect(result).toHaveProperty('cacheSize');
      expect(result).toHaveProperty('pendingEventsCount');
      expect(result).toHaveProperty('lastSync');
    });
  });
});

describe('cacheService module exports', () => {
  it('exports all required functions', async () => {
    const service = await import('../../../src/player/cacheService');

    // Scene functions
    expect(typeof service.cacheScene).toBe('function');
    expect(typeof service.getCachedScene).toBe('function');
    expect(typeof service.getAllCachedScenes).toBe('function');
    expect(typeof service.markSceneAsStale).toBe('function');
    expect(typeof service.deleteCachedScene).toBe('function');

    // Media functions
    expect(typeof service.cacheMedia).toBe('function');
    expect(typeof service.getCachedMedia).toBe('function');
    expect(typeof service.getCachedMediaUrl).toBe('function');
    expect(typeof service.cacheMultipleMedia).toBe('function');
    expect(typeof service.deleteMediaForScene).toBe('function');

    // Device state functions
    expect(typeof service.saveDeviceState).toBe('function');
    expect(typeof service.getDeviceState).toBe('function');
    expect(typeof service.getLastSyncInfo).toBe('function');
    expect(typeof service.updateLastSyncInfo).toBe('function');

    // Offline queue functions
    expect(typeof service.queueOfflineEvent).toBe('function');
    expect(typeof service.getPendingEvents).toBe('function');
    expect(typeof service.getPendingEventsByType).toBe('function');
    expect(typeof service.markEventsSynced).toBe('function');
    expect(typeof service.clearSyncedEvents).toBe('function');

    // Cache management
    expect(typeof service.getCacheSize).toBe('function');
    expect(typeof service.clearAllCache).toBe('function');
    expect(typeof service.clearStaleCache).toBe('function');
    expect(typeof service.isIndexedDBAvailable).toBe('function');
    expect(typeof service.getCacheInfo).toBe('function');
  });
});
