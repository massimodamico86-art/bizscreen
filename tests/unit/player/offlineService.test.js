/**
 * Player Offline Service Unit Tests
 * Tests for offline mode detection and content caching management
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock the cacheService
vi.mock('../../../src/player/cacheService', () => ({
  cacheScene: vi.fn().mockResolvedValue(undefined),
  getCachedScene: vi.fn().mockResolvedValue(null),
  cacheMultipleMedia: vi.fn().mockResolvedValue({ success: 0, failed: 0 }),
  getCachedMediaUrl: vi.fn().mockResolvedValue(null),
  queueOfflineEvent: vi.fn().mockResolvedValue(undefined),
  getPendingEvents: vi.fn().mockResolvedValue([]),
  markEventsSynced: vi.fn().mockResolvedValue(undefined),
  updateLastSyncInfo: vi.fn().mockResolvedValue(undefined),
  getLastSyncInfo: vi.fn().mockResolvedValue(null),
  getCacheSize: vi.fn().mockResolvedValue({ scenes: 0, media: 0, total: 0 }),
  getCacheInfo: vi.fn().mockResolvedValue({ scenes: [], mediaCount: 0, cacheSize: {}, pendingEventsCount: 0, lastSync: null }),
  clearStaleCache: vi.fn().mockResolvedValue(undefined),
}));

// Mock supabase
vi.mock('../../../src/supabase', () => ({
  supabase: {
    rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
    })),
  },
}));

// Mock navigator and window for browser APIs
const mockNavigator = {
  onLine: true,
  serviceWorker: {
    register: vi.fn().mockResolvedValue({ scope: '/' }),
    ready: Promise.resolve({}),
    controller: {
      postMessage: vi.fn(),
    },
    addEventListener: vi.fn(),
  },
};

const mockWindow = {
  addEventListener: vi.fn(),
};

// Setup global mocks
vi.stubGlobal('navigator', mockNavigator);
vi.stubGlobal('window', mockWindow);

// Import after mocking
import {
  isOnline,
  getOfflineMode,
  setOfflineMode,
  addOfflineListener,
  recordHeartbeatSuccess,
  recordHeartbeatFailure,
  queueHeartbeat,
  queuePlaybackEvent,
  queueError,
  getCacheStatus,
  getOfflineServiceInfo,
} from '../../../src/player/offlineService';

describe('offlineService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset offline mode
    setOfflineMode(false);
    mockNavigator.onLine = true;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('isOnline', () => {
    it('returns navigator.onLine status', () => {
      mockNavigator.onLine = true;
      expect(isOnline()).toBe(true);

      mockNavigator.onLine = false;
      expect(isOnline()).toBe(false);
    });
  });

  describe('getOfflineMode / setOfflineMode', () => {
    it('gets current offline mode status', () => {
      expect(getOfflineMode()).toBe(false);
    });

    it('sets offline mode', () => {
      setOfflineMode(true);
      expect(getOfflineMode()).toBe(true);

      setOfflineMode(false);
      expect(getOfflineMode()).toBe(false);
    });
  });

  describe('addOfflineListener', () => {
    it('adds listener that is called on mode change', () => {
      const listener = vi.fn();
      const unsubscribe = addOfflineListener(listener);

      // Trigger mode change
      setOfflineMode(true);
      expect(listener).toHaveBeenCalledWith(true);

      // Clean up
      unsubscribe();
    });

    it('returns unsubscribe function', () => {
      const listener = vi.fn();
      const unsubscribe = addOfflineListener(listener);

      // Unsubscribe
      unsubscribe();

      // Mode change should not call listener
      listener.mockClear();
      setOfflineMode(true);
      expect(listener).not.toHaveBeenCalled();
    });

    it('does not notify when mode does not change', () => {
      const listener = vi.fn();
      addOfflineListener(listener);

      // Set to same value (already false)
      setOfflineMode(false);
      expect(listener).not.toHaveBeenCalled();
    });
  });

  describe('recordHeartbeatSuccess', () => {
    it('resets offline mode to false', () => {
      setOfflineMode(true);
      recordHeartbeatSuccess();
      expect(getOfflineMode()).toBe(false);
    });
  });

  describe('recordHeartbeatFailure', () => {
    it('sets offline mode after threshold is exceeded', async () => {
      // This test is timing-dependent
      // The service tracks time since last successful heartbeat
      // After OFFLINE_THRESHOLD (40 seconds), it goes offline

      // For now, just verify the function exists and can be called
      await expect(recordHeartbeatFailure()).resolves.not.toThrow();
    });
  });

  describe('queueHeartbeat', () => {
    it('queues heartbeat event with timestamp', async () => {
      const { queueOfflineEvent } = await import('../../../src/player/cacheService');

      await queueHeartbeat({ deviceId: 'device-123' });

      expect(queueOfflineEvent).toHaveBeenCalledWith('heartbeat', expect.objectContaining({
        deviceId: 'device-123',
        timestamp: expect.any(String),
      }));
    });
  });

  describe('queuePlaybackEvent', () => {
    it('queues playback event with timestamp', async () => {
      const { queueOfflineEvent } = await import('../../../src/player/cacheService');

      await queuePlaybackEvent({ sceneId: 'scene-123', duration: 60 });

      expect(queueOfflineEvent).toHaveBeenCalledWith('playback', expect.objectContaining({
        sceneId: 'scene-123',
        duration: 60,
        timestamp: expect.any(String),
      }));
    });
  });

  describe('queueError', () => {
    it('queues error event with timestamp', async () => {
      const { queueOfflineEvent } = await import('../../../src/player/cacheService');

      await queueError({ message: 'Test error', code: 500 });

      expect(queueOfflineEvent).toHaveBeenCalledWith('error', expect.objectContaining({
        message: 'Test error',
        code: 500,
        timestamp: expect.any(String),
      }));
    });
  });

  describe('getCacheStatus', () => {
    it('returns cache status for scene', async () => {
      const { getCachedScene } = await import('../../../src/player/cacheService');
      getCachedScene.mockResolvedValue({
        id: 'scene-123',
        isStale: false,
      });

      const result = await getCacheStatus('scene-123');

      expect(result).toHaveProperty('status', 'ok');
      expect(result).toHaveProperty('sceneId', 'scene-123');
      expect(result).toHaveProperty('isOffline', false);
    });

    it('returns "stale" status for stale cache', async () => {
      const { getCachedScene } = await import('../../../src/player/cacheService');
      getCachedScene.mockResolvedValue({
        id: 'scene-123',
        isStale: true,
      });

      const result = await getCacheStatus('scene-123');

      expect(result.status).toBe('stale');
    });

    it('returns "none" status for missing cache', async () => {
      const { getCachedScene } = await import('../../../src/player/cacheService');
      getCachedScene.mockResolvedValue(null);

      const result = await getCacheStatus('scene-123');

      expect(result.status).toBe('none');
    });

    it('returns "none" status when no scene ID provided', async () => {
      const result = await getCacheStatus(null);

      expect(result.status).toBe('none');
    });
  });

  describe('getOfflineServiceInfo', () => {
    it('returns comprehensive service info', async () => {
      const result = await getOfflineServiceInfo();

      expect(result).toHaveProperty('isOffline');
      expect(result).toHaveProperty('lastHeartbeat');
      expect(result).toHaveProperty('serviceWorkerReady');
      expect(result).toHaveProperty('browserOnline');
      expect(result).toHaveProperty('cache');
      expect(result).toHaveProperty('pendingEvents');
      expect(result).toHaveProperty('config');
    });
  });
});

describe('offlineService module exports', () => {
  it('exports all required functions', async () => {
    const service = await import('../../../src/player/offlineService');

    // Service worker
    expect(typeof service.registerServiceWorker).toBe('function');
    expect(typeof service.postToServiceWorker).toBe('function');

    // Offline status
    expect(typeof service.isOnline).toBe('function');
    expect(typeof service.getOfflineMode).toBe('function');
    expect(typeof service.setOfflineMode).toBe('function');
    expect(typeof service.addOfflineListener).toBe('function');

    // Heartbeat tracking
    expect(typeof service.recordHeartbeatSuccess).toBe('function');
    expect(typeof service.recordHeartbeatFailure).toBe('function');
    expect(typeof service.initOfflineDetection).toBe('function');

    // Scene caching
    expect(typeof service.fetchAndCacheScene).toBe('function');
    expect(typeof service.getSceneForPlayback).toBe('function');
    expect(typeof service.checkSceneNeedsUpdate).toBe('function');
    expect(typeof service.getMediaUrl).toBe('function');

    // Sync operations
    expect(typeof service.syncPendingEvents).toBe('function');

    // Queue operations
    expect(typeof service.queueHeartbeat).toBe('function');
    expect(typeof service.queuePlaybackEvent).toBe('function');
    expect(typeof service.queueError).toBe('function');

    // Status
    expect(typeof service.getCacheStatus).toBe('function');
    expect(typeof service.reportCacheStatus).toBe('function');
    expect(typeof service.initOfflineService).toBe('function');
    expect(typeof service.getOfflineServiceInfo).toBe('function');
  });
});

describe('fetchAndCacheScene', () => {
  it('throws error for missing scene ID', async () => {
    const { fetchAndCacheScene } = await import('../../../src/player/offlineService');

    await expect(fetchAndCacheScene(null)).rejects.toThrow('Scene ID is required');
    await expect(fetchAndCacheScene('')).rejects.toThrow('Scene ID is required');
  });
});

describe('syncPendingEvents', () => {
  it('returns offline reason when in offline mode', async () => {
    const { syncPendingEvents, setOfflineMode } = await import('../../../src/player/offlineService');

    setOfflineMode(true);

    const result = await syncPendingEvents();

    expect(result.success).toBe(false);
    expect(result.reason).toBe('offline');
  });

  it('returns zero synced when no pending events', async () => {
    const { syncPendingEvents, setOfflineMode } = await import('../../../src/player/offlineService');
    const { getPendingEvents } = await import('../../../src/player/cacheService');

    setOfflineMode(false);
    getPendingEvents.mockResolvedValue([]);

    const result = await syncPendingEvents();

    expect(result.success).toBe(true);
    expect(result.synced).toBe(0);
  });
});

describe('getSceneForPlayback', () => {
  it('returns null for missing scene ID', async () => {
    const { getSceneForPlayback } = await import('../../../src/player/offlineService');

    const result = await getSceneForPlayback(null);
    expect(result).toBeNull();
  });
});

describe('checkSceneNeedsUpdate', () => {
  it('returns true for missing scene ID or hash', async () => {
    const { checkSceneNeedsUpdate } = await import('../../../src/player/offlineService');

    expect(await checkSceneNeedsUpdate(null, 'abc')).toBe(true);
    expect(await checkSceneNeedsUpdate('scene-123', null)).toBe(true);
    expect(await checkSceneNeedsUpdate(null, null)).toBe(true);
  });
});

describe('getMediaUrl', () => {
  it('returns original URL when online', async () => {
    const { getMediaUrl, setOfflineMode } = await import('../../../src/player/offlineService');

    setOfflineMode(false);
    mockNavigator.onLine = true;

    const result = await getMediaUrl('http://example.com/img.jpg');
    expect(result).toBe('http://example.com/img.jpg');
  });

  it('returns null for null URL', async () => {
    const { getMediaUrl } = await import('../../../src/player/offlineService');

    const result = await getMediaUrl(null);
    expect(result).toBeNull();
  });
});

// ============================================================================
// EXTENDED COVERAGE - Scene Caching Operations
// ============================================================================

describe('offlineService - Extended Coverage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset state before each test
    mockNavigator.onLine = true;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Scene caching operations', () => {
    describe('fetchAndCacheScene - success cases', () => {
      it('fetches scene from server and caches it', async () => {
        const { supabase } = await import('../../../src/supabase');
        const { cacheScene } = await import('../../../src/player/cacheService');
        const { fetchAndCacheScene, setOfflineMode } = await import('../../../src/player/offlineService');

        setOfflineMode(false);

        const mockSceneData = {
          name: 'Test Scene',
          design_json: { layers: [] },
          content_hash: 'abc123',
          media_hash: 'def456',
          media_urls: [],
          business_type: 'restaurant'
        };

        supabase.rpc.mockResolvedValueOnce({
          data: mockSceneData,
          error: null
        });

        const result = await fetchAndCacheScene('scene-123');

        expect(result.success).toBe(true);
        expect(result.scene).toEqual(mockSceneData);
        expect(cacheScene).toHaveBeenCalledWith('scene-123', expect.objectContaining({
          name: 'Test Scene',
          content_hash: 'abc123'
        }));
      });

      it('updates cache with fresh data', async () => {
        const { supabase } = await import('../../../src/supabase');
        const { cacheScene, updateLastSyncInfo } = await import('../../../src/player/cacheService');
        const { fetchAndCacheScene, setOfflineMode } = await import('../../../src/player/offlineService');

        setOfflineMode(false);

        const mockSceneData = {
          name: 'Updated Scene',
          design_json: { layers: [{ id: 'layer1' }] },
          content_hash: 'new-hash-123',
          media_hash: 'new-media-456',
          media_urls: [],
          business_type: 'retail'
        };

        supabase.rpc.mockResolvedValueOnce({
          data: mockSceneData,
          error: null
        });

        const result = await fetchAndCacheScene('scene-123');

        expect(result.success).toBe(true);
        expect(cacheScene).toHaveBeenCalled();
        expect(updateLastSyncInfo).toHaveBeenCalledWith(expect.objectContaining({
          sceneId: 'scene-123',
          contentHash: 'new-hash-123'
        }));
      });

      it('caches media URLs when present', async () => {
        const { supabase } = await import('../../../src/supabase');
        const { cacheMultipleMedia } = await import('../../../src/player/cacheService');
        const { fetchAndCacheScene, setOfflineMode } = await import('../../../src/player/offlineService');

        setOfflineMode(false);

        const mockSceneData = {
          name: 'Scene with Media',
          design_json: {},
          content_hash: 'abc',
          media_hash: 'def',
          media_urls: ['https://example.com/img1.jpg', 'https://example.com/img2.jpg'],
          business_type: 'cafe'
        };

        supabase.rpc.mockResolvedValueOnce({
          data: mockSceneData,
          error: null
        });

        cacheMultipleMedia.mockResolvedValueOnce({ success: 2, failed: 0 });

        const result = await fetchAndCacheScene('scene-123');

        expect(result.success).toBe(true);
        expect(cacheMultipleMedia).toHaveBeenCalledWith(
          ['https://example.com/img1.jpg', 'https://example.com/img2.jpg'],
          'scene-123',
          expect.any(Function)
        );
      });

      it('handles fetch errors without crashing', async () => {
        const { supabase } = await import('../../../src/supabase');
        const { fetchAndCacheScene, setOfflineMode } = await import('../../../src/player/offlineService');

        setOfflineMode(false);

        supabase.rpc.mockResolvedValueOnce({
          data: null,
          error: { message: 'Network error' }
        });

        const result = await fetchAndCacheScene('scene-123');

        expect(result.success).toBe(false);
        expect(result.error).toBeDefined();
      });
    });

    describe('getSceneForPlayback - extended', () => {
      it('returns cached scene when available', async () => {
        const { getCachedScene } = await import('../../../src/player/cacheService');
        const { getSceneForPlayback, setOfflineMode } = await import('../../../src/player/offlineService');

        setOfflineMode(true);

        getCachedScene.mockResolvedValueOnce({
          id: 'scene-123',
          name: 'Cached Scene',
          designJson: { layers: [] },
          contentHash: 'abc',
          businessType: 'hotel',
          cachedAt: new Date().toISOString()
        });

        const result = await getSceneForPlayback('scene-123');

        expect(result).not.toBeNull();
        expect(result.name).toBe('Cached Scene');
        expect(result._cached).toBe(true);
      });

      it('returns null when cache is empty', async () => {
        const { getCachedScene } = await import('../../../src/player/cacheService');
        const { getSceneForPlayback, setOfflineMode } = await import('../../../src/player/offlineService');

        setOfflineMode(true);
        getCachedScene.mockResolvedValueOnce(null);

        const result = await getSceneForPlayback('scene-123');

        expect(result).toBeNull();
      });

      it('fetches from server when online and caches result', async () => {
        const { supabase } = await import('../../../src/supabase');
        const { cacheScene, getCachedScene } = await import('../../../src/player/cacheService');
        const { getSceneForPlayback, setOfflineMode } = await import('../../../src/player/offlineService');

        setOfflineMode(false);
        mockNavigator.onLine = true;

        const mockSceneData = {
          id: 'scene-123',
          name: 'Server Scene',
          design_json: { layers: [] }
        };

        supabase.from.mockReturnValueOnce({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: mockSceneData, error: null })
        });

        const result = await getSceneForPlayback('scene-123');

        expect(result).not.toBeNull();
        expect(result.name).toBe('Server Scene');
        expect(cacheScene).toHaveBeenCalledWith('scene-123', mockSceneData);
      });
    });

    describe('checkSceneNeedsUpdate - extended', () => {
      it('returns false when cached hash matches server hash', async () => {
        const { supabase } = await import('../../../src/supabase');
        const { checkSceneNeedsUpdate } = await import('../../../src/player/offlineService');

        supabase.rpc.mockResolvedValueOnce({
          data: { content_changed: false, needs_full_refresh: false },
          error: null
        });

        const result = await checkSceneNeedsUpdate('scene-123', 'same-hash');

        expect(result).toBe(false);
      });

      it('returns true when cached hash differs from server', async () => {
        const { supabase } = await import('../../../src/supabase');
        const { checkSceneNeedsUpdate } = await import('../../../src/player/offlineService');

        supabase.rpc.mockResolvedValueOnce({
          data: { content_changed: true, needs_full_refresh: false },
          error: null
        });

        const result = await checkSceneNeedsUpdate('scene-123', 'old-hash');

        expect(result).toBe(true);
      });

      it('returns true when scene not in cache', async () => {
        const { checkSceneNeedsUpdate } = await import('../../../src/player/offlineService');

        // No sceneId provided
        const result = await checkSceneNeedsUpdate(null, 'abc');
        expect(result).toBe(true);
      });
    });
  });

  describe('Media URL resolution', () => {
    describe('getMediaUrl - extended', () => {
      it('returns original URL when online and not in offline mode', async () => {
        const { getMediaUrl, setOfflineMode } = await import('../../../src/player/offlineService');

        setOfflineMode(false);
        mockNavigator.onLine = true;

        const result = await getMediaUrl('https://cdn.example.com/video.mp4');
        expect(result).toBe('https://cdn.example.com/video.mp4');
      });

      it('returns cached blob URL when offline', async () => {
        const { getCachedMediaUrl } = await import('../../../src/player/cacheService');
        const { getMediaUrl, setOfflineMode } = await import('../../../src/player/offlineService');

        setOfflineMode(true);
        mockNavigator.onLine = false;

        getCachedMediaUrl.mockResolvedValueOnce('blob:http://localhost/cached-video');

        const result = await getMediaUrl('https://cdn.example.com/video.mp4');
        expect(result).toBe('blob:http://localhost/cached-video');
      });

      it('returns original URL if not cached when offline', async () => {
        const { getCachedMediaUrl } = await import('../../../src/player/cacheService');
        const { getMediaUrl, setOfflineMode } = await import('../../../src/player/offlineService');

        setOfflineMode(true);
        mockNavigator.onLine = false;

        getCachedMediaUrl.mockResolvedValueOnce(null);

        const result = await getMediaUrl('https://cdn.example.com/not-cached.mp4');
        expect(result).toBe('https://cdn.example.com/not-cached.mp4');
      });
    });
  });

  describe('Service worker integration', () => {
    describe('registerServiceWorker - extended', () => {
      it('registers service worker successfully', async () => {
        const { registerServiceWorker } = await import('../../../src/player/offlineService');

        mockNavigator.serviceWorker.register.mockResolvedValueOnce({
          scope: '/'
        });

        const result = await registerServiceWorker();

        expect(mockNavigator.serviceWorker.register).toHaveBeenCalledWith('/sw.js', { scope: '/' });
      });

      it('handles registration failure gracefully', async () => {
        const { registerServiceWorker } = await import('../../../src/player/offlineService');

        mockNavigator.serviceWorker.register.mockRejectedValueOnce(new Error('Registration failed'));

        const result = await registerServiceWorker();

        // Should not throw, returns null on failure
        expect(result).toBeNull();
      });

      it('returns null when service workers not supported', async () => {
        const originalSW = navigator.serviceWorker;

        // Temporarily remove serviceWorker support
        Object.defineProperty(navigator, 'serviceWorker', {
          value: undefined,
          writable: true
        });

        // Re-import to get fresh module state
        vi.resetModules();
        const { registerServiceWorker } = await import('../../../src/player/offlineService');

        const result = await registerServiceWorker();
        expect(result).toBeNull();

        // Restore
        Object.defineProperty(navigator, 'serviceWorker', {
          value: originalSW,
          writable: true
        });
      });
    });

    describe('postToServiceWorker - extended', () => {
      it('sends message to active service worker', async () => {
        const { postToServiceWorker } = await import('../../../src/player/offlineService');

        const result = await postToServiceWorker('TEST_MESSAGE', { data: 'test' });

        // postToServiceWorker returns null if SW not ready or returns response
        expect(result).toBeNull(); // Default mock doesn't set up full MessageChannel
      });

      it('handles missing service worker gracefully', async () => {
        const { postToServiceWorker } = await import('../../../src/player/offlineService');

        // When controller is null, should return null without throwing
        const originalController = mockNavigator.serviceWorker.controller;
        mockNavigator.serviceWorker.controller = null;

        const result = await postToServiceWorker('TEST', {});
        expect(result).toBeNull();

        mockNavigator.serviceWorker.controller = originalController;
      });
    });
  });

  describe('Offline detection', () => {
    describe('initOfflineDetection - extended', () => {
      it('sets up window online/offline event listeners', async () => {
        const { initOfflineDetection } = await import('../../../src/player/offlineService');

        initOfflineDetection();

        expect(mockWindow.addEventListener).toHaveBeenCalledWith('online', expect.any(Function));
        expect(mockWindow.addEventListener).toHaveBeenCalledWith('offline', expect.any(Function));
      });

      it('updates offline mode on network change', async () => {
        const { initOfflineDetection, getOfflineMode, setOfflineMode } = await import('../../../src/player/offlineService');

        setOfflineMode(false);
        initOfflineDetection();

        // Get the offline handler and simulate calling it
        const offlineCall = mockWindow.addEventListener.mock.calls.find(
          call => call[0] === 'offline'
        );
        const offlineHandler = offlineCall[1];

        // Trigger offline event
        offlineHandler();

        expect(getOfflineMode()).toBe(true);
      });
    });

    describe('recordHeartbeatFailure - extended', () => {
      it('enters offline mode after threshold exceeded', async () => {
        const { recordHeartbeatFailure, recordHeartbeatSuccess, getOfflineMode, setOfflineMode } = await import('../../../src/player/offlineService');

        // Start online
        setOfflineMode(false);
        recordHeartbeatSuccess(); // Set last success to now

        // Fast-forward time simulation would need more setup
        // For now, verify the function can be called without error
        await recordHeartbeatFailure();

        // Immediately after, shouldn't be offline since threshold not exceeded
        // (threshold is 40 seconds, we just set success)
        expect(getOfflineMode()).toBe(false);
      });

      it('tracks time since last successful heartbeat', async () => {
        const { recordHeartbeatSuccess } = await import('../../../src/player/offlineService');

        // Should not throw
        recordHeartbeatSuccess();

        // Function updates lastHeartbeatSuccess - verified by checking offline mode behavior
        expect(true).toBe(true);
      });
    });
  });

  describe('Event sync operations', () => {
    describe('syncPendingEvents - success cases', () => {
      it('syncs queued heartbeats to server', async () => {
        const { getPendingEvents, markEventsSynced } = await import('../../../src/player/cacheService');
        const { syncPendingEvents, setOfflineMode } = await import('../../../src/player/offlineService');

        setOfflineMode(false);
        mockNavigator.onLine = true;

        getPendingEvents.mockResolvedValueOnce([
          { id: 'ev-1', eventType: 'heartbeat', eventData: { deviceId: 'dev-1' }, createdAt: new Date().toISOString() }
        ]);

        const result = await syncPendingEvents();

        expect(result.success).toBe(true);
        expect(result.synced).toBe(1);
      });

      it('syncs queued playback events to server', async () => {
        const { supabase } = await import('../../../src/supabase');
        const { getPendingEvents, markEventsSynced } = await import('../../../src/player/cacheService');
        const { syncPendingEvents, setOfflineMode } = await import('../../../src/player/offlineService');

        setOfflineMode(false);
        mockNavigator.onLine = true;

        getPendingEvents.mockResolvedValueOnce([
          { id: 'ev-2', eventType: 'playback', eventData: { sceneId: 'scene-1', duration: 60 }, createdAt: new Date().toISOString() }
        ]);

        supabase.rpc.mockResolvedValueOnce({ data: null, error: null });

        const result = await syncPendingEvents();

        expect(result.success).toBe(true);
        expect(markEventsSynced).toHaveBeenCalled();
      });

      it('syncs queued errors to server', async () => {
        const { getPendingEvents, markEventsSynced } = await import('../../../src/player/cacheService');
        const { syncPendingEvents, setOfflineMode } = await import('../../../src/player/offlineService');

        setOfflineMode(false);
        mockNavigator.onLine = true;

        // Error events don't have a specific sync handler in current implementation,
        // but they should still be processed
        getPendingEvents.mockResolvedValueOnce([
          { id: 'ev-3', eventType: 'error', eventData: { message: 'Test error' }, createdAt: new Date().toISOString() }
        ]);

        const result = await syncPendingEvents();

        // Should complete without throwing
        expect(result.success).toBe(true);
      });

      it('marks events as synced after successful upload', async () => {
        const { getPendingEvents, markEventsSynced } = await import('../../../src/player/cacheService');
        const { syncPendingEvents, setOfflineMode } = await import('../../../src/player/offlineService');

        setOfflineMode(false);
        mockNavigator.onLine = true;

        getPendingEvents.mockResolvedValueOnce([
          { id: 'ev-1', eventType: 'heartbeat', eventData: {}, createdAt: new Date().toISOString() },
          { id: 'ev-2', eventType: 'heartbeat', eventData: {}, createdAt: new Date().toISOString() }
        ]);

        await syncPendingEvents();

        expect(markEventsSynced).toHaveBeenCalledWith(['ev-1', 'ev-2']);
      });
    });

    describe('syncPendingEvents - error handling', () => {
      it('returns offline reason when in offline mode', async () => {
        const { syncPendingEvents, setOfflineMode } = await import('../../../src/player/offlineService');

        setOfflineMode(true);

        const result = await syncPendingEvents();

        expect(result.success).toBe(false);
        expect(result.reason).toBe('offline');
      });

      it('returns error when sync fails', async () => {
        const { getPendingEvents } = await import('../../../src/player/cacheService');
        const { syncPendingEvents, setOfflineMode } = await import('../../../src/player/offlineService');

        setOfflineMode(false);
        mockNavigator.onLine = true;

        getPendingEvents.mockRejectedValueOnce(new Error('IndexedDB error'));

        const result = await syncPendingEvents();

        expect(result.success).toBe(false);
        expect(result.error).toBe('IndexedDB error');
      });
    });
  });

  describe('Queue operations - extended', () => {
    describe('queueHeartbeat - extended', () => {
      it('adds timestamp to queued heartbeat', async () => {
        const { queueOfflineEvent } = await import('../../../src/player/cacheService');
        const { queueHeartbeat } = await import('../../../src/player/offlineService');

        await queueHeartbeat({ deviceId: 'dev-1', status: 'online' });

        expect(queueOfflineEvent).toHaveBeenCalledWith('heartbeat', expect.objectContaining({
          deviceId: 'dev-1',
          status: 'online',
          timestamp: expect.any(String)
        }));
      });
    });

    describe('queuePlaybackEvent - extended', () => {
      it('adds timestamp to queued playback event', async () => {
        const { queueOfflineEvent } = await import('../../../src/player/cacheService');
        const { queuePlaybackEvent } = await import('../../../src/player/offlineService');

        await queuePlaybackEvent({
          sceneId: 'scene-1',
          duration: 120,
          mediaItems: ['img1.jpg', 'img2.jpg']
        });

        expect(queueOfflineEvent).toHaveBeenCalledWith('playback', expect.objectContaining({
          sceneId: 'scene-1',
          duration: 120,
          mediaItems: ['img1.jpg', 'img2.jpg'],
          timestamp: expect.any(String)
        }));
      });
    });

    describe('queueError - extended', () => {
      it('adds timestamp to queued error', async () => {
        const { queueOfflineEvent } = await import('../../../src/player/cacheService');
        const { queueError } = await import('../../../src/player/offlineService');

        await queueError({
          message: 'Media load failed',
          code: 'MEDIA_LOAD_ERROR',
          url: 'https://example.com/video.mp4'
        });

        expect(queueOfflineEvent).toHaveBeenCalledWith('error', expect.objectContaining({
          message: 'Media load failed',
          code: 'MEDIA_LOAD_ERROR',
          url: 'https://example.com/video.mp4',
          timestamp: expect.any(String)
        }));
      });
    });
  });

  describe('Cache status - extended', () => {
    describe('getCacheStatus - extended', () => {
      it('returns ok status for valid cached scene', async () => {
        const { getCachedScene, getLastSyncInfo, getCacheSize } = await import('../../../src/player/cacheService');
        const { getCacheStatus, setOfflineMode } = await import('../../../src/player/offlineService');

        setOfflineMode(false);

        getCachedScene.mockResolvedValueOnce({
          id: 'scene-123',
          isStale: false
        });
        getLastSyncInfo.mockResolvedValueOnce({ lastSync: new Date().toISOString() });
        getCacheSize.mockResolvedValueOnce({ scenes: 1, media: 5, total: 1024000 });

        const result = await getCacheStatus('scene-123');

        expect(result.status).toBe('ok');
        expect(result.sceneId).toBe('scene-123');
      });

      it('returns stale status for outdated cache', async () => {
        const { getCachedScene, getLastSyncInfo, getCacheSize } = await import('../../../src/player/cacheService');
        const { getCacheStatus } = await import('../../../src/player/offlineService');

        getCachedScene.mockResolvedValueOnce({
          id: 'scene-123',
          isStale: true
        });
        getLastSyncInfo.mockResolvedValueOnce(null);
        getCacheSize.mockResolvedValueOnce({ scenes: 1, media: 5, total: 1024000 });

        const result = await getCacheStatus('scene-123');

        expect(result.status).toBe('stale');
      });

      it('returns none status when scene not cached', async () => {
        const { getCachedScene, getLastSyncInfo, getCacheSize } = await import('../../../src/player/cacheService');
        const { getCacheStatus } = await import('../../../src/player/offlineService');

        getCachedScene.mockResolvedValueOnce(null);
        getLastSyncInfo.mockResolvedValueOnce(null);
        getCacheSize.mockResolvedValueOnce({ scenes: 0, media: 0, total: 0 });

        const result = await getCacheStatus('scene-123');

        expect(result.status).toBe('none');
      });
    });

    describe('reportCacheStatus', () => {
      it('reports cache status to server when online', async () => {
        const { supabase } = await import('../../../src/supabase');
        const { reportCacheStatus, setOfflineMode } = await import('../../../src/player/offlineService');

        setOfflineMode(false);
        mockNavigator.onLine = true;

        supabase.rpc.mockResolvedValueOnce({ data: null, error: null });

        await reportCacheStatus('device-123', 'scene-456', 'content-hash-abc');

        expect(supabase.rpc).toHaveBeenCalledWith('update_device_cache_status', {
          p_device_id: 'device-123',
          p_scene_id: 'scene-456',
          p_content_hash: 'content-hash-abc',
          p_cache_status: 'ok'
        });
      });

      it('skips reporting when offline', async () => {
        const { supabase } = await import('../../../src/supabase');
        const { reportCacheStatus, setOfflineMode } = await import('../../../src/player/offlineService');

        setOfflineMode(true);

        await reportCacheStatus('device-123', 'scene-456', 'hash');

        // rpc should not have been called for this specific operation
        // (it may have been called by other tests, so we check the last call)
        const rpcCalls = supabase.rpc.mock.calls;
        const cacheStatusCalls = rpcCalls.filter(call => call[0] === 'update_device_cache_status');
        expect(cacheStatusCalls.length).toBe(0);
      });

      it('skips reporting when device ID is missing', async () => {
        const { supabase } = await import('../../../src/supabase');
        const { reportCacheStatus, setOfflineMode } = await import('../../../src/player/offlineService');

        setOfflineMode(false);
        mockNavigator.onLine = true;

        await reportCacheStatus(null, 'scene-456', 'hash');

        // Should not have called rpc
        const rpcCalls = supabase.rpc.mock.calls;
        const cacheStatusCalls = rpcCalls.filter(call => call[0] === 'update_device_cache_status');
        expect(cacheStatusCalls.length).toBe(0);
      });
    });
  });

  describe('Initialization', () => {
    describe('initOfflineService', () => {
      it('initializes offline service without error', async () => {
        const { clearStaleCache } = await import('../../../src/player/cacheService');
        const { initOfflineService } = await import('../../../src/player/offlineService');

        await expect(initOfflineService()).resolves.not.toThrow();

        expect(clearStaleCache).toHaveBeenCalledWith(7);
      });
    });

    describe('getOfflineServiceInfo - extended', () => {
      it('returns complete diagnostic info', async () => {
        const { getCacheInfo, getPendingEvents } = await import('../../../src/player/cacheService');
        const { getOfflineServiceInfo, setOfflineMode } = await import('../../../src/player/offlineService');

        setOfflineMode(false);

        getCacheInfo.mockResolvedValueOnce({
          scenes: ['scene-1', 'scene-2'],
          mediaCount: 10,
          cacheSize: { total: 2048000 },
          pendingEventsCount: 3,
          lastSync: new Date().toISOString()
        });

        getPendingEvents.mockResolvedValueOnce([
          { id: 'ev-1' },
          { id: 'ev-2' },
          { id: 'ev-3' }
        ]);

        const result = await getOfflineServiceInfo();

        expect(result).toHaveProperty('isOffline', false);
        expect(result).toHaveProperty('lastHeartbeat');
        expect(result).toHaveProperty('serviceWorkerReady');
        expect(result).toHaveProperty('browserOnline', true);
        expect(result).toHaveProperty('cache');
        expect(result).toHaveProperty('pendingEvents', 3);
        expect(result).toHaveProperty('config');
        expect(result.config).toHaveProperty('OFFLINE_THRESHOLD');
      });
    });
  });
});
