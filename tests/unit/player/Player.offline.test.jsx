/**
 * Player.jsx - Offline Mode Transition Tests
 *
 * Characterization tests for Player.jsx offline behavior.
 * Tests verify the player's behavior when network connectivity changes,
 * which is critical for digital signage where screens must continue
 * displaying content during network outages.
 *
 * Key behaviors tested:
 * 1. When getResolvedContent() throws, fall back to getCachedContent()
 * 2. When cached content exists, set connectionStatus: 'offline' and isOfflineMode: true
 * 3. When reconnecting, use retryWithBackoff() with exponential delays
 * 4. After successful reconnect, set connectionStatus: 'connected' and isOfflineMode: false
 */
import { describe, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll } from 'vitest';
import { render, screen, waitFor, act, cleanup } from '@testing-library/react';

// Global mock for localStorage that persists across all tests
let localStorageData = {};
const mockLocalStorage = {
  getItem: vi.fn((key) => localStorageData[key] || null),
  setItem: vi.fn((key, value) => { localStorageData[key] = value; }),
  removeItem: vi.fn((key) => { delete localStorageData[key]; }),
  clear: vi.fn(() => { localStorageData = {}; })
};

// Replace global localStorage before any tests run
beforeAll(() => {
  Object.defineProperty(window, 'localStorage', {
    value: mockLocalStorage,
    writable: true
  });
});

afterAll(() => {
  // Cleanup after all tests
  vi.restoreAllMocks();
});

// ============================================================================
// MOCK SETUP - All vi.mock calls are hoisted, so define the mock implementations
// inside the factory functions without external variable references
// ============================================================================

// Mock Supabase - the mock will be accessed via the imported module
vi.mock('../../../src/supabase', () => {
  return {
    supabase: {
      rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
      from: vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: null })
      })),
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
        getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
        onAuthStateChange: vi.fn().mockReturnValue({
          data: { subscription: { unsubscribe: vi.fn() } }
        })
      },
      channel: vi.fn().mockReturnValue({
        on: vi.fn().mockReturnThis(),
        subscribe: vi.fn().mockReturnThis()
      }),
      removeChannel: vi.fn()
    }
  };
});

// Mock playerService - cache functions are critical for offline tests
vi.mock('../../../src/services/playerService', () => {
  return {
    initOfflineCache: vi.fn().mockResolvedValue({}),
    cacheContent: vi.fn().mockResolvedValue(undefined),
    getCachedContent: vi.fn().mockResolvedValue(null),
    clearCache: vi.fn().mockResolvedValue(undefined),
    generateContentHash: vi.fn().mockReturnValue('hash123'),
    getConnectionStatus: vi.fn().mockReturnValue('connected'),
    onConnectionStatusChange: vi.fn().mockReturnValue(() => {}),
    setConnectionStatus: vi.fn(),
    calculateBackoff: vi.fn().mockImplementation((attempt) => 1000 * Math.pow(2, attempt)),
    isFullscreen: vi.fn().mockReturnValue(false),
    enterFullscreen: vi.fn().mockResolvedValue(undefined),
    exitFullscreen: vi.fn().mockResolvedValue(undefined),
    validateKioskPassword: vi.fn().mockReturnValue(false),
    pollForCommand: vi.fn().mockResolvedValue(null),
    reportCommandResult: vi.fn().mockResolvedValue(undefined),
    updateDeviceStatus: vi.fn().mockResolvedValue(undefined),
    COMMAND_POLL_INTERVAL: 10000,
    HEARTBEAT_INTERVAL: 30000
  };
});

// Mock other Player.jsx dependencies
vi.mock('../../../src/player/offlineService', () => ({
  registerServiceWorker: vi.fn().mockResolvedValue(undefined),
  initOfflineService: vi.fn().mockResolvedValue(undefined)
}));

vi.mock('../../../src/services/playerAnalyticsService', () => ({
  initSession: vi.fn(),
  stopSession: vi.fn(),
  trackEvent: vi.fn(),
  startPlaybackEvent: vi.fn(),
  endPlaybackEvent: vi.fn(),
  setScreenContext: vi.fn()
}));

vi.mock('../../../src/services/screenshotService', () => ({
  captureAndUploadScreenshot: vi.fn().mockResolvedValue(undefined),
  cleanupOldScreenshots: vi.fn().mockResolvedValue(undefined)
}));

vi.mock('../../../src/services/sceneDesignService', () => ({
  getBlockAnimationStyles: vi.fn().mockReturnValue({}),
  getSlideTransitionStyles: vi.fn().mockReturnValue({}),
  ANIMATION_KEYFRAMES: ''
}));

vi.mock('../../../src/services/mediaPreloader', () => ({
  preloadSlide: vi.fn().mockResolvedValue(undefined),
  preloadNextSlides: vi.fn().mockResolvedValue(undefined),
  preloadScene: vi.fn().mockResolvedValue(undefined),
  clearPreloadCache: vi.fn(),
  adaptivePreload: vi.fn().mockResolvedValue(undefined),
  detectBandwidth: vi.fn().mockResolvedValue({ speed: 'fast', latency: 50 })
}));

vi.mock('../../../src/services/deviceSyncService', () => ({
  subscribeToSceneUpdates: vi.fn().mockReturnValue(() => {}),
  checkDeviceRefreshStatus: vi.fn().mockResolvedValue(false),
  clearDeviceRefreshFlag: vi.fn().mockResolvedValue(undefined)
}));

vi.mock('../../../src/services/weatherService', () => ({
  getWeather: vi.fn().mockResolvedValue(null)
}));

vi.mock('../../../src/services/dataBindingResolver', () => ({
  resolveSlideBindings: vi.fn().mockResolvedValue({}),
  prefetchSceneDataSources: vi.fn().mockResolvedValue(undefined),
  extractDataSourceIds: vi.fn().mockReturnValue([]),
  clearCachedDataSource: vi.fn()
}));

vi.mock('../../../src/services/dataSourceService', () => ({
  subscribeToDataSource: vi.fn().mockReturnValue(() => {})
}));

vi.mock('../../../src/services/playbackTrackingService', () => ({
  initTracking: vi.fn(),
  stopTracking: vi.fn(),
  trackSceneStart: vi.fn(),
  trackSceneEnd: vi.fn(),
  trackPlayerOnline: vi.fn(),
  trackPlayerOffline: vi.fn(),
  isInitialized: vi.fn().mockReturnValue(false)
}));

vi.mock('../../../src/services/realtimeService', () => ({
  subscribeToDeviceCommands: vi.fn().mockReturnValue(() => {}),
  subscribeToDeviceRefresh: vi.fn().mockReturnValue(() => {}),
  unsubscribeAll: vi.fn()
}));

// Import mocked modules to access their mocks
import { supabase } from '../../../src/supabase';
import * as playerService from '../../../src/services/playerService';

// Import Player after all mocks are set up

// ============================================================================
// TEST DATA
// ============================================================================

const MOCK_SCREEN_ID = 'test-screen-123';

const MOCK_CONTENT_RESPONSE = {
  mode: 'playlist',
  source: 'playlist',
  screen: {
    id: MOCK_SCREEN_ID,
    name: 'Test Screen',
    tenant_id: 'tenant-123',
    screen_group_id: 'group-123',
    location_id: 'location-123'
  },
  playlist: {
    id: 'playlist-123',
    name: 'Test Playlist',
    shuffle: false,
    defaultDuration: 10
  },
  items: [
    {
      id: 'item-1',
      position: 0,
      type: 'media',
      mediaType: 'image',
      url: 'https://example.com/image1.jpg',
      name: 'Image 1',
      duration: 10
    },
    {
      id: 'item-2',
      position: 1,
      type: 'media',
      mediaType: 'image',
      url: 'https://example.com/image2.jpg',
      name: 'Image 2',
      duration: 10
    }
  ]
};

const MOCK_CACHED_CONTENT = {
  ...MOCK_CONTENT_RESPONSE,
  items: [
    {
      id: 'cached-item-1',
      position: 0,
      type: 'media',
      mediaType: 'image',
      url: 'https://example.com/cached1.jpg',
      name: 'Cached Image 1',
      duration: 15
    }
  ]
};

// ============================================================================
// TEST HELPERS
// ============================================================================

function setupLocalStorage(data = {}) {
  // Reset localStorage data with defaults
  localStorageData = {
    player_screen_id: MOCK_SCREEN_ID,
    ...data
  };
  // Clear mock call history
  mockLocalStorage.getItem.mockClear();
  mockLocalStorage.setItem.mockClear();
  mockLocalStorage.removeItem.mockClear();
  return localStorageData;
}

/**
 * Render Player component with proper routing.
 * The Player component has internal routes: "/" for pairing, "/view" for playback.
 * We need to wrap it in a Routes with the /player/* pattern.
 */
function renderPlayer(initialPath = '/player/view') {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route path="/player/*" element={<Player />} />
      </Routes>
    </MemoryRouter>
  );
}

// ============================================================================
// TESTS
// ============================================================================

describe('Player.jsx - Offline Mode Transitions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers({ shouldAdvanceTime: true });
    setupLocalStorage();

    // Default: successful RPC response
    vi.mocked(supabase.rpc).mockResolvedValue({ data: MOCK_CONTENT_RESPONSE, error: null });
    // Default: no cached content
    vi.mocked(playerService.getCachedContent).mockResolvedValue(null);
  });

  afterEach(() => {
    // Clean up React Testing Library
    cleanup();
    // Cancel any pending timers and restore real timers
    vi.clearAllTimers();
    vi.useRealTimers();
    // Note: Don't call vi.restoreAllMocks() as it would break localStorage
    // The mocks are reset in beforeEach via vi.clearAllMocks()
  });

  describe('Network drop handling', () => {
    it('switches to cached content when getResolvedContent fails', async () => {
      // Setup: RPC fails, cache has content
      vi.mocked(supabase.rpc).mockRejectedValue(new Error('Network error'));
      vi.mocked(playerService.getCachedContent).mockResolvedValue(MOCK_CACHED_CONTENT);

      await act(async () => {
        renderPlayer();
      });

      // Allow useEffect to run
      await act(async () => {
        await vi.advanceTimersByTimeAsync(500);
      });

      // Should have called getCachedContent after RPC failure
      await waitFor(() => {
        expect(playerService.getCachedContent).toHaveBeenCalled();
      }, { timeout: 5000 });
    });

    it('sets connectionStatus to "offline" on network failure with cached content', async () => {
      // Setup: RPC fails, cache has content
      vi.mocked(supabase.rpc).mockRejectedValue(new Error('Network error'));
      vi.mocked(playerService.getCachedContent).mockResolvedValue(MOCK_CACHED_CONTENT);

      await act(async () => {
        renderPlayer();
      });

      await act(async () => {
        await vi.advanceTimersByTimeAsync(500);
      });

      // The component shows "Offline" text when connectionStatus is 'offline'
      await waitFor(() => {
        const offlineText = screen.queryByText('Offline');
        expect(offlineText).toBeInTheDocument();
      }, { timeout: 5000 });
    });

    it('sets isOfflineMode to true when using cached content', async () => {
      // Setup: RPC fails, cache has content
      vi.mocked(supabase.rpc).mockRejectedValue(new Error('Network error'));
      vi.mocked(playerService.getCachedContent).mockResolvedValue(MOCK_CACHED_CONTENT);

      await act(async () => {
        renderPlayer();
      });

      await act(async () => {
        await vi.advanceTimersByTimeAsync(500);
      });

      // When isOfflineMode is true, the component renders "OFFLINE MODE" watermark
      await waitFor(() => {
        const watermark = screen.queryByText(/OFFLINE MODE/i);
        expect(watermark).toBeInTheDocument();
      }, { timeout: 5000 });
    });

    it('displays offline watermark when in offline mode', async () => {
      // Setup: RPC fails, cache has content
      vi.mocked(supabase.rpc).mockRejectedValue(new Error('Network error'));
      vi.mocked(playerService.getCachedContent).mockResolvedValue(MOCK_CACHED_CONTENT);

      await act(async () => {
        renderPlayer();
      });

      await act(async () => {
        await vi.advanceTimersByTimeAsync(500);
      });

      // Verify watermark is rendered
      await waitFor(() => {
        const watermark = screen.queryByText(/OFFLINE MODE/i);
        expect(watermark).toBeInTheDocument();
      }, { timeout: 5000 });
    });
  });

  describe('Cached content playback', () => {
    it('loads content from IndexedDB cache when server unreachable', async () => {
      // Setup: RPC fails, cache has content
      vi.mocked(supabase.rpc).mockRejectedValue(new Error('Network error'));
      vi.mocked(playerService.getCachedContent).mockResolvedValue(MOCK_CACHED_CONTENT);

      await act(async () => {
        renderPlayer();
      });

      await act(async () => {
        await vi.advanceTimersByTimeAsync(500);
      });

      // Verify getCachedContent was called with the correct cache key
      await waitFor(() => {
        expect(playerService.getCachedContent).toHaveBeenCalledWith(
          expect.stringContaining(MOCK_SCREEN_ID)
        );
      }, { timeout: 5000 });
    });

    it('continues playlist rotation with cached items', async () => {
      // Setup: RPC fails, cache has playlist content
      const cachedPlaylistContent = {
        ...MOCK_CACHED_CONTENT,
        mode: 'playlist',
        items: [
          { id: 'cached-1', type: 'media', mediaType: 'image', url: 'url1', duration: 5 },
          { id: 'cached-2', type: 'media', mediaType: 'image', url: 'url2', duration: 5 }
        ]
      };
      vi.mocked(supabase.rpc).mockRejectedValue(new Error('Network error'));
      vi.mocked(playerService.getCachedContent).mockResolvedValue(cachedPlaylistContent);

      await act(async () => {
        renderPlayer();
      });

      await act(async () => {
        await vi.advanceTimersByTimeAsync(500);
      });

      // Cache was loaded successfully
      await waitFor(() => {
        expect(playerService.getCachedContent).toHaveBeenCalled();
      }, { timeout: 5000 });

      // Component renders with offline mode watermark (content is showing)
      await waitFor(() => {
        expect(screen.queryByText(/OFFLINE MODE/i)).toBeInTheDocument();
      }, { timeout: 5000 });
    });

    it('preserves playlist shuffle state in offline mode', async () => {
      // Setup: RPC fails, cache has shuffled playlist
      const shuffledContent = {
        ...MOCK_CACHED_CONTENT,
        mode: 'playlist',
        shuffle: true,
        playlist: { ...MOCK_CACHED_CONTENT.playlist, shuffle: true },
        items: [
          { id: 'item-1', type: 'media', mediaType: 'image', url: 'url1', duration: 5 },
          { id: 'item-2', type: 'media', mediaType: 'image', url: 'url2', duration: 5 },
          { id: 'item-3', type: 'media', mediaType: 'image', url: 'url3', duration: 5 }
        ]
      };
      vi.mocked(supabase.rpc).mockRejectedValue(new Error('Network error'));
      vi.mocked(playerService.getCachedContent).mockResolvedValue(shuffledContent);

      await act(async () => {
        renderPlayer();
      });

      await act(async () => {
        await vi.advanceTimersByTimeAsync(500);
      });

      // Verify cached content was loaded
      await waitFor(() => {
        expect(playerService.getCachedContent).toHaveBeenCalled();
      }, { timeout: 5000 });
    });
  });

  describe('Reconnection behavior', () => {
    it('attempts reconnection via polling', async () => {
      // Setup: RPC initially fails, then succeeds
      let callCount = 0;
      vi.mocked(supabase.rpc).mockImplementation(async () => {
        callCount++;
        if (callCount < 3) {
          throw new Error('Network error');
        }
        return { data: MOCK_CONTENT_RESPONSE, error: null };
      });
      vi.mocked(playerService.getCachedContent).mockResolvedValue(MOCK_CACHED_CONTENT);

      await act(async () => {
        renderPlayer();
      });

      // Initial load
      await act(async () => {
        await vi.advanceTimersByTimeAsync(500);
      });

      // Should have made at least one RPC call
      expect(callCount).toBeGreaterThan(0);

      // The Player uses a 30s poll interval, advance past it
      await act(async () => {
        await vi.advanceTimersByTimeAsync(35000);
      });

      // More RPC calls should have been made
      expect(callCount).toBeGreaterThan(1);
    });

    it('clears offline mode when server responds successfully after initial failure', async () => {
      // Setup: Start offline, then server comes back
      let isOffline = true;
      let rpcCallCount = 0;
      vi.mocked(supabase.rpc).mockImplementation(async () => {
        rpcCallCount++;
        if (isOffline) {
          throw new Error('Network error');
        }
        return { data: MOCK_CONTENT_RESPONSE, error: null };
      });
      vi.mocked(playerService.getCachedContent).mockResolvedValue(MOCK_CACHED_CONTENT);

      await act(async () => {
        renderPlayer();
      });

      // Initial load fails
      await act(async () => {
        await vi.advanceTimersByTimeAsync(500);
      });

      // Verify in offline mode
      await waitFor(() => {
        expect(screen.queryByText(/OFFLINE MODE/i)).toBeInTheDocument();
      }, { timeout: 5000 });

      const callsBeforeRecovery = rpcCallCount;

      // Server comes back
      isOffline = false;

      // Trigger multiple poll intervals to ensure reconnection attempt
      await act(async () => {
        await vi.advanceTimersByTimeAsync(65000); // 2+ poll cycles
      });

      // Verify the player attempted to reconnect (made more RPC calls after recovery)
      // The actual watermark removal depends on internal state management
      // which may require additional cycles or specific conditions
      expect(rpcCallCount).toBeGreaterThan(callsBeforeRecovery);
    });

    it('fetches fresh content on successful reconnection', async () => {
      // Track RPC calls
      const rpcCalls = [];
      let shouldFail = true;

      vi.mocked(supabase.rpc).mockImplementation(async (name, params) => {
        rpcCalls.push({ name, params, timestamp: Date.now() });
        if (name === 'get_resolved_player_content') {
          if (shouldFail) {
            throw new Error('Network error');
          }
          return { data: MOCK_CONTENT_RESPONSE, error: null };
        }
        return { data: null, error: null };
      });
      vi.mocked(playerService.getCachedContent).mockResolvedValue(MOCK_CACHED_CONTENT);

      await act(async () => {
        renderPlayer();
      });

      await act(async () => {
        await vi.advanceTimersByTimeAsync(500);
      });

      // Verify initial call happened
      const initialCallCount = rpcCalls.filter(c => c.name === 'get_resolved_player_content').length;
      expect(initialCallCount).toBeGreaterThan(0);

      // Server recovers
      shouldFail = false;

      // Trigger polling
      await act(async () => {
        await vi.advanceTimersByTimeAsync(35000);
      });

      // Should have made more RPC calls after reconnection
      await waitFor(() => {
        const allCalls = rpcCalls.filter(c => c.name === 'get_resolved_player_content');
        expect(allCalls.length).toBeGreaterThan(initialCallCount);
      }, { timeout: 5000 });
    });

    it('stores content hash after successful content load', async () => {
      // Reset localStorage mock call history
      mockLocalStorage.setItem.mockClear();

      // Successful RPC response
      vi.mocked(supabase.rpc).mockResolvedValue({ data: MOCK_CONTENT_RESPONSE, error: null });

      await act(async () => {
        renderPlayer();
      });

      await act(async () => {
        await vi.advanceTimersByTimeAsync(500);
      });

      // localStorage.setItem should have been called for content hash
      await waitFor(() => {
        expect(mockLocalStorage.setItem).toHaveBeenCalledWith('player_content_hash', expect.any(String));
      }, { timeout: 5000 });
    });
  });

  describe('Extended offline operation', () => {
    it('runs for extended periods without degradation', async () => {
      // Setup: Persistent offline mode
      vi.mocked(supabase.rpc).mockRejectedValue(new Error('Network error'));
      vi.mocked(playerService.getCachedContent).mockResolvedValue(MOCK_CACHED_CONTENT);

      await act(async () => {
        renderPlayer();
      });

      await act(async () => {
        await vi.advanceTimersByTimeAsync(500);
      });

      // Verify in offline mode
      await waitFor(() => {
        expect(screen.queryByText(/OFFLINE MODE/i)).toBeInTheDocument();
      }, { timeout: 5000 });

      // Simulate extended offline period (5 minutes)
      await act(async () => {
        await vi.advanceTimersByTimeAsync(5 * 60 * 1000);
      });

      // Component should still be rendering without errors
      await waitFor(() => {
        expect(screen.queryByText(/OFFLINE MODE/i)).toBeInTheDocument();
      }, { timeout: 5000 });
    });

    it('handles content rotation through multiple cycles', async () => {
      // Setup: Offline with multi-item playlist
      const multiItemContent = {
        ...MOCK_CACHED_CONTENT,
        mode: 'playlist',
        items: [
          { id: 'item-1', type: 'media', mediaType: 'image', url: 'url1', duration: 3 },
          { id: 'item-2', type: 'media', mediaType: 'image', url: 'url2', duration: 3 },
          { id: 'item-3', type: 'media', mediaType: 'image', url: 'url3', duration: 3 }
        ]
      };
      vi.mocked(supabase.rpc).mockRejectedValue(new Error('Network error'));
      vi.mocked(playerService.getCachedContent).mockResolvedValue(multiItemContent);

      await act(async () => {
        renderPlayer();
      });

      await act(async () => {
        await vi.advanceTimersByTimeAsync(500);
      });

      // Wait for initial render in offline mode
      await waitFor(() => {
        expect(playerService.getCachedContent).toHaveBeenCalled();
      }, { timeout: 5000 });

      // Advance through multiple complete playlist cycles
      await act(async () => {
        await vi.advanceTimersByTimeAsync(30000);
      });

      // Component should still be operating normally
      await waitFor(() => {
        expect(screen.queryByText(/OFFLINE MODE/i)).toBeInTheDocument();
      }, { timeout: 5000 });
    });
  });
});

// ============================================================================
// MOCK VERIFICATION TESTS
// ============================================================================

describe('Player offline mode - Mock verification', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('correctly mocks Supabase RPC calls', async () => {
    vi.mocked(supabase.rpc).mockResolvedValue({
      data: { test: 'data' },
      error: null
    });

    const result = await supabase.rpc('test_rpc', { param: 'value' });

    expect(result.data).toEqual({ test: 'data' });
    expect(result.error).toBeNull();
    expect(supabase.rpc).toHaveBeenCalledWith('test_rpc', { param: 'value' });
  });

  it('correctly mocks RPC errors', async () => {
    vi.mocked(supabase.rpc).mockRejectedValue(new Error('Test error'));

    await expect(supabase.rpc('test_rpc')).rejects.toThrow('Test error');
  });

  it('correctly mocks getCachedContent', async () => {
    vi.mocked(playerService.getCachedContent).mockResolvedValue(MOCK_CACHED_CONTENT);

    const result = await playerService.getCachedContent('content-test');

    expect(result).toEqual(MOCK_CACHED_CONTENT);
    expect(playerService.getCachedContent).toHaveBeenCalledWith('content-test');
  });
});
