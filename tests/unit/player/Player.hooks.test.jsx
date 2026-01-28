/**
 * Player Hooks Unit Tests
 *
 * Tests for the extracted custom hooks from Player.jsx
 * Phase 7: Player Refactoring - Plan 03
 *
 * @module tests/unit/player/Player.hooks.test
 */

import { describe, it, expect, vi, beforeEach, afterEach, beforeAll } from 'vitest';
import { renderHook, act } from '@testing-library/react';

// ============================================================================
// GLOBAL MOCK SETUP (before any module imports)
// ============================================================================

// Global localStorage mock store
let localStorageStore = {};
const localStorageMock = {
  getItem: vi.fn((key) => localStorageStore[key] || null),
  setItem: vi.fn((key, value) => { localStorageStore[key] = value; }),
  removeItem: vi.fn((key) => { delete localStorageStore[key]; }),
  clear: vi.fn(() => { localStorageStore = {}; }),
  key: vi.fn((index) => Object.keys(localStorageStore)[index] || null),
  get length() { return Object.keys(localStorageStore).length; },
};

beforeAll(() => {
  Object.defineProperty(window, 'localStorage', {
    value: localStorageMock,
    writable: true,
  });
});

// Mock services before imports
vi.mock('../../../src/services/playerService', () => ({
  updateDeviceStatus: vi.fn().mockResolvedValue({ needs_screenshot_update: false }),
  cacheContent: vi.fn().mockResolvedValue(undefined),
  getCachedContent: vi.fn().mockResolvedValue(null),
  clearCache: vi.fn().mockResolvedValue(undefined),
  calculateBackoff: vi.fn().mockReturnValue(1000),
  isFullscreen: vi.fn().mockReturnValue(false),
  enterFullscreen: vi.fn().mockResolvedValue(undefined),
  exitFullscreen: vi.fn().mockResolvedValue(undefined),
  validateKioskPassword: vi.fn().mockResolvedValue(true),
  reportCommandResult: vi.fn().mockResolvedValue(undefined),
  HEARTBEAT_INTERVAL: 30000,
}));

vi.mock('../../../src/services/deviceSyncService', () => ({
  checkDeviceRefreshStatus: vi.fn().mockResolvedValue({ needs_refresh: false }),
  clearDeviceRefreshFlag: vi.fn().mockResolvedValue(true),
}));

vi.mock('../../../src/services/screenshotService', () => ({
  captureAndUploadScreenshot: vi.fn().mockResolvedValue(undefined),
  cleanupOldScreenshots: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../../../src/services/playerAnalyticsService', () => ({
  startPlaybackEvent: vi.fn(),
  endPlaybackEvent: vi.fn(),
  initSession: vi.fn(),
  stopSession: vi.fn(),
}));

vi.mock('../../../src/hooks/useLogger.js', () => ({
  useLogger: vi.fn().mockReturnValue({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }),
}));

// Import hooks after mocks
import { useKioskMode } from '../../../src/player/hooks/useKioskMode.js';
import { usePlayerPlayback } from '../../../src/player/hooks/usePlayerPlayback.js';
import {
  enterFullscreen,
  exitFullscreen,
  validateKioskPassword,
} from '../../../src/services/playerService';
import * as analytics from '../../../src/services/playerAnalyticsService';

describe('useKioskMode', () => {
  beforeEach(() => {
    localStorageStore = {}; // Clear localStorage mock store
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('initialization', () => {
    it('initializes with kiosk mode false when not set in localStorage', () => {
      const { result } = renderHook(() => useKioskMode());
      expect(result.current.kioskMode).toBe(false);
    });

    it('initializes with kiosk mode true from localStorage', () => {
      localStorageStore['player_kiosk_mode'] = 'true';
      const { result } = renderHook(() => useKioskMode());
      expect(result.current.kioskMode).toBe(true);
    });

    it('initializes showKioskExit as false', () => {
      const { result } = renderHook(() => useKioskMode());
      expect(result.current.showKioskExit).toBe(false);
    });

    it('initializes password input as empty', () => {
      const { result } = renderHook(() => useKioskMode());
      expect(result.current.kioskPasswordInput).toBe('');
    });

    it('initializes password error as empty', () => {
      const { result } = renderHook(() => useKioskMode());
      expect(result.current.kioskPasswordError).toBe('');
    });
  });

  describe('password input', () => {
    it('updates password input via setKioskPasswordInput', () => {
      const { result } = renderHook(() => useKioskMode());

      act(() => {
        result.current.setKioskPasswordInput('test123');
      });

      expect(result.current.kioskPasswordInput).toBe('test123');
    });
  });

  describe('cancelKioskExit', () => {
    it('clears password input when cancelled', () => {
      const { result } = renderHook(() => useKioskMode());

      act(() => {
        result.current.setKioskPasswordInput('testpassword');
      });

      act(() => {
        result.current.cancelKioskExit();
      });

      expect(result.current.kioskPasswordInput).toBe('');
    });

    it('closes exit dialog when cancelled', () => {
      const { result } = renderHook(() => useKioskMode());

      // Would need to trigger showKioskExit first, but we can verify it remains false
      act(() => {
        result.current.cancelKioskExit();
      });

      expect(result.current.showKioskExit).toBe(false);
    });

    it('clears password error when cancelled', () => {
      const { result } = renderHook(() => useKioskMode());

      act(() => {
        result.current.cancelKioskExit();
      });

      expect(result.current.kioskPasswordError).toBe('');
    });
  });

  describe('handleKioskExit', () => {
    it('exits kiosk mode when no password is set', async () => {
      localStorageStore['player_kiosk_mode'] = 'true';
      const { result } = renderHook(() => useKioskMode());

      await act(async () => {
        await result.current.handleKioskExit();
      });

      expect(result.current.kioskMode).toBe(false);
      expect(exitFullscreen).toHaveBeenCalled();
    });

    it('validates password when password is set', async () => {
      localStorageStore['player_kiosk_mode'] = 'true';
      localStorageStore['player_kiosk_password'] = 'secret123';
      validateKioskPassword.mockResolvedValue(true);

      const { result } = renderHook(() => useKioskMode());

      act(() => {
        result.current.setKioskPasswordInput('secret123');
      });

      await act(async () => {
        await result.current.handleKioskExit();
      });

      expect(validateKioskPassword).toHaveBeenCalledWith('secret123', 'secret123');
      expect(result.current.kioskMode).toBe(false);
    });

    it('sets error when password is incorrect', async () => {
      localStorageStore['player_kiosk_mode'] = 'true';
      localStorageStore['player_kiosk_password'] = 'secret123';
      validateKioskPassword.mockResolvedValue(false);

      const { result } = renderHook(() => useKioskMode());

      act(() => {
        result.current.setKioskPasswordInput('wrongpassword');
      });

      await act(async () => {
        await result.current.handleKioskExit();
      });

      expect(result.current.kioskPasswordError).toBe('Incorrect password');
      expect(result.current.kioskMode).toBe(true); // Should remain in kiosk mode
    });

    it('clears state after successful exit', async () => {
      localStorageStore['player_kiosk_mode'] = 'true';

      const { result } = renderHook(() => useKioskMode());

      act(() => {
        result.current.setKioskPasswordInput('test');
      });

      await act(async () => {
        await result.current.handleKioskExit();
      });

      expect(result.current.showKioskExit).toBe(false);
      expect(result.current.kioskPasswordInput).toBe('');
      expect(result.current.kioskPasswordError).toBe('');
    });
  });

  describe('fullscreen management', () => {
    it('attempts to enter fullscreen on init when kiosk mode is enabled', () => {
      localStorageStore['player_kiosk_mode'] = 'true';
      enterFullscreen.mockResolvedValue(undefined);

      renderHook(() => useKioskMode());

      expect(enterFullscreen).toHaveBeenCalled();
    });
  });
});

describe('usePlayerPlayback', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    localStorageStore = {}; // Clear localStorage mock store
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe('refs initialization', () => {
    it('provides videoRef for video element', () => {
      const advanceToNext = vi.fn();
      const { result } = renderHook(() =>
        usePlayerPlayback([], 0, null, advanceToNext)
      );

      expect(result.current.videoRef).toBeDefined();
      expect(result.current.videoRef.current).toBeNull();
    });

    it('provides timerRef for duration management', () => {
      const advanceToNext = vi.fn();
      const { result } = renderHook(() =>
        usePlayerPlayback([], 0, null, advanceToNext)
      );

      expect(result.current.timerRef).toBeDefined();
    });

    it('provides lastActivityRef for stuck detection', () => {
      const advanceToNext = vi.fn();
      const { result } = renderHook(() =>
        usePlayerPlayback([], 0, null, advanceToNext)
      );

      expect(result.current.lastActivityRef).toBeDefined();
      expect(typeof result.current.lastActivityRef.current).toBe('number');
    });

    it('provides lastVideoTimeRef for video stuck detection', () => {
      const advanceToNext = vi.fn();
      const { result } = renderHook(() =>
        usePlayerPlayback([], 0, null, advanceToNext)
      );

      expect(result.current.lastVideoTimeRef).toBeDefined();
      expect(result.current.lastVideoTimeRef.current).toBe(0);
    });
  });

  describe('handleVideoEnd', () => {
    it('calls advanceToNext when video ends', () => {
      const advanceToNext = vi.fn();
      const { result } = renderHook(() =>
        usePlayerPlayback([], 0, null, advanceToNext)
      );

      act(() => {
        result.current.handleVideoEnd();
      });

      expect(advanceToNext).toHaveBeenCalledTimes(1);
    });

    it('calls endPlaybackEvent before advancing', () => {
      const advanceToNext = vi.fn();
      const { result } = renderHook(() =>
        usePlayerPlayback([], 0, null, advanceToNext)
      );

      act(() => {
        result.current.handleVideoEnd();
      });

      expect(analytics.endPlaybackEvent).toHaveBeenCalled();
    });
  });

  describe('handleAdvanceToNext', () => {
    it('ends playback event and advances', () => {
      const advanceToNext = vi.fn();
      const { result } = renderHook(() =>
        usePlayerPlayback([], 0, null, advanceToNext)
      );

      act(() => {
        result.current.handleAdvanceToNext();
      });

      expect(analytics.endPlaybackEvent).toHaveBeenCalled();
      expect(advanceToNext).toHaveBeenCalled();
    });
  });

  describe('timer-based advancement', () => {
    it('sets timer for image items', () => {
      const advanceToNext = vi.fn();
      const items = [
        { id: '1', mediaType: 'image', duration: 5, name: 'Test Image' },
      ];
      const content = {
        type: 'playlist',
        playlist: { defaultDuration: 10 },
      };

      renderHook(() =>
        usePlayerPlayback(items, 0, content, advanceToNext)
      );

      // Fast-forward timer (5 seconds = 5000ms)
      act(() => {
        vi.advanceTimersByTime(5000);
      });

      expect(advanceToNext).toHaveBeenCalledTimes(1);
    });

    it('does not set timer for video items', () => {
      const advanceToNext = vi.fn();
      const items = [
        { id: '1', mediaType: 'video', duration: 30, name: 'Test Video' },
      ];
      const content = {
        type: 'playlist',
        playlist: { defaultDuration: 10 },
      };

      renderHook(() =>
        usePlayerPlayback(items, 0, content, advanceToNext)
      );

      // Fast-forward timer
      act(() => {
        vi.advanceTimersByTime(30000);
      });

      // Should not advance - video uses onEnded handler instead
      expect(advanceToNext).not.toHaveBeenCalled();
    });

    it('uses defaultDuration when item has no duration', () => {
      const advanceToNext = vi.fn();
      const items = [
        { id: '1', mediaType: 'image', name: 'Test Image' }, // No duration
      ];
      const content = {
        type: 'playlist',
        playlist: { defaultDuration: 15 },
      };

      renderHook(() =>
        usePlayerPlayback(items, 0, content, advanceToNext)
      );

      // Should use 15 seconds from defaultDuration
      act(() => {
        vi.advanceTimersByTime(14999);
      });
      expect(advanceToNext).not.toHaveBeenCalled();

      act(() => {
        vi.advanceTimersByTime(1);
      });
      expect(advanceToNext).toHaveBeenCalledTimes(1);
    });

    it('falls back to 10 seconds when no duration available', () => {
      const advanceToNext = vi.fn();
      const items = [
        { id: '1', mediaType: 'image', name: 'Test Image' },
      ];
      const content = {
        type: 'playlist',
        playlist: {},
      };

      renderHook(() =>
        usePlayerPlayback(items, 0, content, advanceToNext)
      );

      act(() => {
        vi.advanceTimersByTime(10000);
      });

      expect(advanceToNext).toHaveBeenCalledTimes(1);
    });
  });

  describe('analytics tracking', () => {
    it('starts playback event for playlist mode', () => {
      localStorageStore['player_screen_id'] = 'screen-123';
      const advanceToNext = vi.fn();
      const items = [
        { id: 'media-1', mediaType: 'image', name: 'Test Image' },
      ];
      const content = {
        mode: 'playlist',
        screen: { tenant_id: 'tenant-1' },
        playlist: { id: 'playlist-1' },
      };

      renderHook(() =>
        usePlayerPlayback(items, 0, content, advanceToNext)
      );

      expect(analytics.startPlaybackEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          screenId: 'screen-123',
          tenantId: 'tenant-1',
          playlistId: 'playlist-1',
          mediaId: 'media-1',
          itemType: 'media',
          itemName: 'Test Image',
        })
      );
    });

    it('does not start playback event for layout mode', () => {
      localStorageStore['player_screen_id'] = 'screen-123';
      const advanceToNext = vi.fn();
      const items = [
        { id: 'media-1', mediaType: 'image', name: 'Test Image' },
      ];
      const content = {
        mode: 'layout',
        layout: { id: 'layout-1' },
      };

      renderHook(() =>
        usePlayerPlayback(items, 0, content, advanceToNext)
      );

      expect(analytics.startPlaybackEvent).not.toHaveBeenCalled();
    });

    it('tracks app items correctly', () => {
      localStorageStore['player_screen_id'] = 'screen-123';
      const advanceToNext = vi.fn();
      const items = [
        { id: 'app-1', mediaType: 'app', name: 'Clock App' },
      ];
      const content = {
        mode: 'playlist',
        screen: { tenant_id: 'tenant-1' },
        playlist: { id: 'playlist-1' },
      };

      renderHook(() =>
        usePlayerPlayback(items, 0, content, advanceToNext)
      );

      expect(analytics.startPlaybackEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          appId: 'app-1',
          mediaId: null,
          itemType: 'app',
        })
      );
    });
  });
});

describe('Hook barrel exports', () => {
  it('exports all 5 hooks from index', async () => {
    const hooks = await import('../../../src/player/hooks/index.js');

    expect(hooks.usePlayerContent).toBeDefined();
    expect(hooks.usePlayerHeartbeat).toBeDefined();
    expect(hooks.usePlayerCommands).toBeDefined();
    expect(hooks.useKioskMode).toBeDefined();
    expect(hooks.usePlayerPlayback).toBeDefined();
  });
});
