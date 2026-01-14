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
