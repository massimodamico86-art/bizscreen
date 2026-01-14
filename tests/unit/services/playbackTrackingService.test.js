/**
 * Playback Tracking Service Unit Tests
 * Tests for playback event tracking and queue management
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock supabase before importing the service
vi.mock('../../../src/supabase', () => ({
  supabase: {
    rpc: vi.fn().mockResolvedValue({ data: { inserted: 1, errors: 0 }, error: null }),
  },
}));

// Import after mocking
import {
  EVENT_TYPES,
  initTracking,
  stopTracking,
  trackSceneStart,
  trackSceneEnd,
  trackPlayerOnline,
  trackPlayerOffline,
  trackMediaPlay,
  flushEvents,
  getQueueSize,
  getSessionId,
  isInitialized,
  updateContext,
  hasActiveScene,
  getCurrentSceneEvent,
} from '../../../src/services/playbackTrackingService';

// ============================================================================
// EVENT TYPES TESTS
// ============================================================================

describe('playbackTrackingService EVENT_TYPES', () => {
  it('exports SCENE_START event type', () => {
    expect(EVENT_TYPES.SCENE_START).toBe('scene_start');
  });

  it('exports SCENE_END event type', () => {
    expect(EVENT_TYPES.SCENE_END).toBe('scene_end');
  });

  it('exports PLAYER_ONLINE event type', () => {
    expect(EVENT_TYPES.PLAYER_ONLINE).toBe('player_online');
  });

  it('exports PLAYER_OFFLINE event type', () => {
    expect(EVENT_TYPES.PLAYER_OFFLINE).toBe('player_offline');
  });

  it('exports MEDIA_PLAY event type', () => {
    expect(EVENT_TYPES.MEDIA_PLAY).toBe('media_play');
  });
});

// ============================================================================
// INITIALIZATION TESTS
// ============================================================================

describe('playbackTrackingService initialization', () => {
  beforeEach(() => {
    // Reset service state before each test
    if (isInitialized()) {
      stopTracking();
    }
  });

  afterEach(() => {
    // Cleanup after each test
    if (isInitialized()) {
      stopTracking();
    }
  });

  it('isInitialized returns false before initialization', () => {
    expect(isInitialized()).toBe(false);
  });

  it('initTracking returns a session ID', () => {
    const sessionId = initTracking({
      deviceId: 'test-device-123',
      tenantId: 'test-tenant-456',
    });

    expect(sessionId).toBeTruthy();
    expect(typeof sessionId).toBe('string');
  });

  it('isInitialized returns true after initialization', () => {
    initTracking({
      deviceId: 'test-device-123',
      tenantId: 'test-tenant-456',
    });

    expect(isInitialized()).toBe(true);
  });

  it('getSessionId returns the session ID after initialization', () => {
    const sessionId = initTracking({
      deviceId: 'test-device-123',
      tenantId: 'test-tenant-456',
    });

    expect(getSessionId()).toBe(sessionId);
  });

  it('stopTracking resets initialization state', () => {
    initTracking({
      deviceId: 'test-device-123',
      tenantId: 'test-tenant-456',
    });

    expect(isInitialized()).toBe(true);

    stopTracking();

    expect(isInitialized()).toBe(false);
    expect(getSessionId()).toBeNull();
  });

  it('initTracking accepts optional groupId and locationId', () => {
    const sessionId = initTracking({
      deviceId: 'test-device-123',
      tenantId: 'test-tenant-456',
      groupId: 'group-789',
      locationId: 'location-abc',
    });

    expect(sessionId).toBeTruthy();
    expect(isInitialized()).toBe(true);
  });
});

// ============================================================================
// SCENE TRACKING TESTS
// ============================================================================

describe('playbackTrackingService scene tracking', () => {
  beforeEach(() => {
    if (isInitialized()) {
      stopTracking();
    }
    initTracking({
      deviceId: 'test-device-123',
      tenantId: 'test-tenant-456',
      groupId: 'group-789',
    });
  });

  afterEach(() => {
    if (isInitialized()) {
      stopTracking();
    }
  });

  it('trackSceneStart returns null when not initialized', () => {
    stopTracking();
    const result = trackSceneStart({ sceneId: 'scene-123' });
    expect(result).toBeNull();
  });

  it('trackSceneStart creates a scene event', () => {
    const event = trackSceneStart({ sceneId: 'scene-123' });

    expect(event).toBeTruthy();
    expect(event.sceneId).toBe('scene-123');
    expect(event.eventType).toBe(EVENT_TYPES.SCENE_START);
    expect(event.startedAt).toBeTruthy();
  });

  it('trackSceneStart includes device context', () => {
    const event = trackSceneStart({ sceneId: 'scene-123' });

    expect(event.tenantId).toBe('test-tenant-456');
    expect(event.screenId).toBe('test-device-123');
    expect(event.groupId).toBe('group-789');
  });

  it('trackSceneStart includes optional scheduleId', () => {
    const event = trackSceneStart({
      sceneId: 'scene-123',
      scheduleId: 'schedule-456',
    });

    expect(event.scheduleId).toBe('schedule-456');
  });

  it('hasActiveScene returns true after trackSceneStart', () => {
    expect(hasActiveScene()).toBe(false);

    trackSceneStart({ sceneId: 'scene-123' });

    expect(hasActiveScene()).toBe(true);
  });

  it('getCurrentSceneEvent returns the active scene', () => {
    trackSceneStart({ sceneId: 'scene-123' });

    const current = getCurrentSceneEvent();
    expect(current).toBeTruthy();
    expect(current.sceneId).toBe('scene-123');
  });

  it('trackSceneEnd returns null when no active scene', () => {
    const result = trackSceneEnd();
    expect(result).toBeNull();
  });

  it('trackSceneEnd clears the active scene', () => {
    trackSceneStart({ sceneId: 'scene-123' });
    expect(hasActiveScene()).toBe(true);

    // Wait a bit to ensure minimum duration
    vi.useFakeTimers();
    vi.advanceTimersByTime(2000);

    trackSceneEnd();
    vi.useRealTimers();

    expect(hasActiveScene()).toBe(false);
    expect(getCurrentSceneEvent()).toBeNull();
  });

  it('trackSceneStart ends previous scene automatically', () => {
    trackSceneStart({ sceneId: 'scene-1' });

    vi.useFakeTimers();
    vi.advanceTimersByTime(2000);

    // Starting a new scene should end the previous one
    trackSceneStart({ sceneId: 'scene-2' });

    vi.useRealTimers();

    const current = getCurrentSceneEvent();
    expect(current.sceneId).toBe('scene-2');
  });
});

// ============================================================================
// PLAYER STATUS TRACKING TESTS
// ============================================================================

describe('playbackTrackingService player status', () => {
  beforeEach(() => {
    if (isInitialized()) {
      stopTracking();
    }
    initTracking({
      deviceId: 'test-device-123',
      tenantId: 'test-tenant-456',
    });
  });

  afterEach(() => {
    if (isInitialized()) {
      stopTracking();
    }
  });

  it('trackPlayerOnline does nothing when not initialized', () => {
    stopTracking();
    // Should not throw
    trackPlayerOnline();
    expect(getQueueSize()).toBe(0);
  });

  it('trackPlayerOnline queues an event', () => {
    const initialSize = getQueueSize();
    trackPlayerOnline();
    expect(getQueueSize()).toBe(initialSize + 1);
  });

  it('trackPlayerOffline queues an event', () => {
    const initialSize = getQueueSize();
    trackPlayerOffline();
    expect(getQueueSize()).toBe(initialSize + 1);
  });

  it('trackPlayerOffline ends active scene first', () => {
    trackSceneStart({ sceneId: 'scene-123' });
    expect(hasActiveScene()).toBe(true);

    vi.useFakeTimers();
    vi.advanceTimersByTime(2000);

    trackPlayerOffline();

    vi.useRealTimers();

    expect(hasActiveScene()).toBe(false);
  });

  it('trackPlayerOnline accepts custom timestamp', () => {
    const customTime = new Date('2024-01-15T10:00:00Z');
    trackPlayerOnline(customTime);
    // Event is queued with custom timestamp
    expect(getQueueSize()).toBeGreaterThan(0);
  });
});

// ============================================================================
// MEDIA TRACKING TESTS
// ============================================================================

describe('playbackTrackingService media tracking', () => {
  beforeEach(() => {
    if (isInitialized()) {
      stopTracking();
    }
    initTracking({
      deviceId: 'test-device-123',
      tenantId: 'test-tenant-456',
    });
  });

  afterEach(() => {
    if (isInitialized()) {
      stopTracking();
    }
  });

  it('trackMediaPlay does nothing when not initialized', () => {
    stopTracking();
    trackMediaPlay({ mediaId: 'media-123', durationSeconds: 30 });
    expect(getQueueSize()).toBe(0);
  });

  it('trackMediaPlay queues an event for valid duration', () => {
    const initialSize = getQueueSize();
    trackMediaPlay({ mediaId: 'media-123', durationSeconds: 30 });
    expect(getQueueSize()).toBe(initialSize + 1);
  });

  it('trackMediaPlay skips events under minimum duration', () => {
    const initialSize = getQueueSize();
    trackMediaPlay({ mediaId: 'media-123', durationSeconds: 0 });
    expect(getQueueSize()).toBe(initialSize);
  });

  it('trackMediaPlay includes current scene if active', () => {
    trackSceneStart({ sceneId: 'scene-123' });
    trackMediaPlay({ mediaId: 'media-123', durationSeconds: 30 });
    // Event is queued with scene context
    expect(getQueueSize()).toBeGreaterThan(0);
  });
});

// ============================================================================
// QUEUE MANAGEMENT TESTS
// ============================================================================

describe('playbackTrackingService queue management', () => {
  beforeEach(() => {
    if (isInitialized()) {
      stopTracking();
    }
    initTracking({
      deviceId: 'test-device-123',
      tenantId: 'test-tenant-456',
    });
  });

  afterEach(() => {
    if (isInitialized()) {
      stopTracking();
    }
  });

  it('getQueueSize returns current queue length', () => {
    const initialSize = getQueueSize();
    trackPlayerOnline();
    expect(getQueueSize()).toBe(initialSize + 1);
  });

  it('flushEvents clears the queue', async () => {
    trackPlayerOnline();
    trackPlayerOnline();
    expect(getQueueSize()).toBeGreaterThan(0);

    await flushEvents();

    expect(getQueueSize()).toBe(0);
  });

  it('flushEvents returns count when queue is empty', async () => {
    // Flush any existing events
    await flushEvents();

    const result = await flushEvents();
    expect(result.inserted).toBe(0);
    expect(result.errors).toBe(0);
  });
});

// ============================================================================
// CONTEXT UPDATES TESTS
// ============================================================================

describe('playbackTrackingService context updates', () => {
  beforeEach(() => {
    if (isInitialized()) {
      stopTracking();
    }
    initTracking({
      deviceId: 'test-device-123',
      tenantId: 'test-tenant-456',
    });
  });

  afterEach(() => {
    if (isInitialized()) {
      stopTracking();
    }
  });

  it('updateContext updates device context', () => {
    updateContext({ groupId: 'new-group-123' });

    // New scenes should use updated context
    const event = trackSceneStart({ sceneId: 'scene-123' });
    expect(event.groupId).toBe('new-group-123');
  });

  it('updateContext does nothing when not initialized', () => {
    stopTracking();
    // Should not throw
    updateContext({ groupId: 'new-group' });
  });
});
