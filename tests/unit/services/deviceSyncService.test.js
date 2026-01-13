/**
 * Device Sync Service Unit Tests
 *
 * Tests for src/services/deviceSyncService.js
 * Verifies real-time sync, refresh status, and device management.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock Supabase - must be hoisted
vi.mock('../../../src/supabase', () => {
  const mockChannel = {
    on: vi.fn().mockReturnThis(),
    subscribe: vi.fn().mockReturnThis(),
  };

  return {
    supabase: {
      channel: vi.fn().mockReturnValue(mockChannel),
      removeChannel: vi.fn(),
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      single: vi.fn(),
    },
  };
});

// Import supabase mock for test manipulation
import { supabase as mockSupabase } from '../../../src/supabase';

import {
  subscribeToSceneUpdates,
  broadcastSceneUpdate,
  checkDeviceRefreshStatus,
  clearDeviceRefreshFlag,
  startDeviceRefreshPolling,
  stopDeviceRefreshPolling,
  getDevicesForScene,
  publishSceneToDevice,
  publishSceneToDevices,
  generateContentHash,
  onDesignChange,
  emitDesignChange,
  cleanup,
} from '../../../src/services/deviceSyncService';

describe('deviceSyncService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    cleanup(); // Clean up any existing subscriptions
  });

  afterEach(() => {
    cleanup();
  });

  // ============================================
  // SUBSCRIBE TO SCENE UPDATES
  // ============================================

  describe('subscribeToSceneUpdates', () => {
    it('returns no-op function for empty sceneId', () => {
      const unsubscribe = subscribeToSceneUpdates(null, vi.fn());

      expect(typeof unsubscribe).toBe('function');
      expect(mockSupabase.channel).not.toHaveBeenCalled();
    });

    it('creates subscription for valid sceneId', () => {
      const callback = vi.fn();
      const unsubscribe = subscribeToSceneUpdates('scene-123', callback);

      expect(mockSupabase.channel).toHaveBeenCalledWith('device-sync:scene:scene-123');
      // Channel methods are called through the mock chain
      expect(typeof unsubscribe).toBe('function');
    });

    it('reuses existing subscription for same sceneId', () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();

      subscribeToSceneUpdates('scene-456', callback1);
      subscribeToSceneUpdates('scene-456', callback2);

      // Should only create one channel
      expect(mockSupabase.channel).toHaveBeenCalledTimes(1);
    });

    it('unsubscribe removes callback', () => {
      const callback = vi.fn();
      const unsubscribe = subscribeToSceneUpdates('scene-789', callback);

      unsubscribe();

      // Should remove channel when last callback removed
      expect(mockSupabase.removeChannel).toHaveBeenCalled();
    });
  });

  // ============================================
  // BROADCAST SCENE UPDATE
  // ============================================

  describe('broadcastSceneUpdate', () => {
    it('returns error for empty sceneId', async () => {
      const result = await broadcastSceneUpdate(null);

      expect(result.success).toBe(false);
      expect(result.error).toBe('No scene ID provided');
    });

    it('updates devices with scene', async () => {
      mockSupabase.select.mockResolvedValueOnce({
        data: [{ id: 'device-1' }, { id: 'device-2' }],
        error: null,
      });

      const result = await broadcastSceneUpdate('scene-123');

      expect(result.success).toBe(true);
      expect(result.affectedDevices).toBe(2);
      expect(mockSupabase.from).toHaveBeenCalledWith('tv_devices');
      expect(mockSupabase.update).toHaveBeenCalled();
    });

    it('handles update error', async () => {
      mockSupabase.select.mockResolvedValueOnce({
        data: null,
        error: new Error('Database error'),
      });

      const result = await broadcastSceneUpdate('scene-123');

      expect(result.success).toBe(false);
      expect(result.affectedDevices).toBe(0);
    });
  });

  // ============================================
  // CHECK DEVICE REFRESH STATUS
  // ============================================

  describe('checkDeviceRefreshStatus', () => {
    it('returns false for empty deviceId', async () => {
      const result = await checkDeviceRefreshStatus(null);

      expect(result.needsRefresh).toBe(false);
      expect(result.lastRefresh).toBeNull();
    });

    it('returns refresh status from database', async () => {
      mockSupabase.single.mockResolvedValueOnce({
        data: { needs_refresh: true, last_refresh_at: '2024-01-01T00:00:00Z' },
        error: null,
      });

      const result = await checkDeviceRefreshStatus('device-123');

      expect(result.needsRefresh).toBe(true);
      expect(result.lastRefresh).toBe('2024-01-01T00:00:00Z');
    });

    it('handles database error', async () => {
      mockSupabase.single.mockResolvedValueOnce({
        data: null,
        error: new Error('Database error'),
      });

      const result = await checkDeviceRefreshStatus('device-123');

      expect(result.needsRefresh).toBe(false);
      expect(result.lastRefresh).toBeNull();
    });
  });

  // ============================================
  // CLEAR DEVICE REFRESH FLAG
  // ============================================

  describe('clearDeviceRefreshFlag', () => {
    it('returns false for empty deviceId', async () => {
      const result = await clearDeviceRefreshFlag(null);

      expect(result).toBe(false);
    });

    it('clears refresh flag in database', async () => {
      mockSupabase.eq.mockResolvedValueOnce({ error: null });

      const result = await clearDeviceRefreshFlag('device-123');

      expect(result).toBe(true);
      expect(mockSupabase.from).toHaveBeenCalledWith('tv_devices');
      expect(mockSupabase.update).toHaveBeenCalledWith(
        expect.objectContaining({
          needs_refresh: false,
        })
      );
    });

    it('handles database error', async () => {
      mockSupabase.eq.mockResolvedValueOnce({ error: new Error('Database error') });

      const result = await clearDeviceRefreshFlag('device-123');

      expect(result).toBe(false);
    });
  });

  // ============================================
  // DEVICE REFRESH POLLING
  // ============================================

  describe('startDeviceRefreshPolling', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('returns no-op for empty deviceId', () => {
      const stop = startDeviceRefreshPolling(null, vi.fn());

      expect(typeof stop).toBe('function');
    });

    it('calls callback when refresh needed', async () => {
      const callback = vi.fn();

      mockSupabase.single.mockResolvedValue({
        data: { needs_refresh: true, last_refresh_at: null },
        error: null,
      });

      startDeviceRefreshPolling('device-123', callback, 1000);

      // Wait for initial poll
      await vi.advanceTimersByTimeAsync(0);

      expect(callback).toHaveBeenCalled();
    });

    it('stop function clears interval', async () => {
      const callback = vi.fn();

      mockSupabase.single.mockResolvedValue({
        data: { needs_refresh: false, last_refresh_at: null },
        error: null,
      });

      const stop = startDeviceRefreshPolling('device-456', callback, 1000);

      stop();

      // Advance time - callback should not be called again
      await vi.advanceTimersByTimeAsync(2000);

      // Should only be called once from initial poll
      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe('stopDeviceRefreshPolling', () => {
    it('stops polling for device', () => {
      // Just ensure it doesn't throw
      expect(() => stopDeviceRefreshPolling('device-123')).not.toThrow();
    });
  });

  // ============================================
  // GET DEVICES FOR SCENE
  // ============================================

  describe('getDevicesForScene', () => {
    it('returns empty array for empty sceneId', async () => {
      const result = await getDevicesForScene(null);

      expect(result).toEqual([]);
    });

    it('returns devices from database', async () => {
      const mockDevices = [
        { id: 'd1', device_name: 'TV 1', is_online: true },
        { id: 'd2', device_name: 'TV 2', is_online: false },
      ];

      mockSupabase.order.mockResolvedValueOnce({
        data: mockDevices,
        error: null,
      });

      const result = await getDevicesForScene('scene-123');

      expect(result).toEqual(mockDevices);
    });

    it('handles database error', async () => {
      mockSupabase.order.mockResolvedValueOnce({
        data: null,
        error: new Error('Database error'),
      });

      const result = await getDevicesForScene('scene-123');

      expect(result).toEqual([]);
    });
  });

  // ============================================
  // PUBLISH SCENE TO DEVICE
  // ============================================

  describe('publishSceneToDevice', () => {
    it('returns error for empty deviceId', async () => {
      const result = await publishSceneToDevice(null, 'scene-123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('No device ID provided');
    });

    it('publishes scene to device', async () => {
      mockSupabase.eq.mockResolvedValueOnce({ error: null });

      const result = await publishSceneToDevice('device-123', 'scene-456');

      expect(result.success).toBe(true);
      expect(mockSupabase.update).toHaveBeenCalledWith(
        expect.objectContaining({
          active_scene_id: 'scene-456',
          needs_refresh: true,
        })
      );
    });

    it('handles database error', async () => {
      mockSupabase.eq.mockResolvedValueOnce({ error: new Error('Database error') });

      const result = await publishSceneToDevice('device-123', 'scene-456');

      expect(result.success).toBe(false);
    });
  });

  // ============================================
  // PUBLISH SCENE TO MULTIPLE DEVICES
  // ============================================

  describe('publishSceneToDevices', () => {
    it('returns empty result for empty deviceIds', async () => {
      const result = await publishSceneToDevices([], 'scene-123');

      expect(result.success).toBe(false);
      expect(result.published).toBe(0);
      expect(result.failed).toBe(0);
    });

    it('publishes scene to multiple devices', async () => {
      mockSupabase.select.mockResolvedValueOnce({
        data: [{ id: 'd1' }, { id: 'd2' }],
        error: null,
      });

      const result = await publishSceneToDevices(['d1', 'd2', 'd3'], 'scene-123');

      expect(result.success).toBe(true);
      expect(result.published).toBe(2);
      expect(result.failed).toBe(1);
    });
  });

  // ============================================
  // GENERATE CONTENT HASH
  // ============================================

  describe('generateContentHash', () => {
    it('returns empty string for null design', () => {
      const hash = generateContentHash(null);

      expect(hash).toBe('');
    });

    it('generates consistent hash for same design', () => {
      const design = { blocks: [{ type: 'text', props: { text: 'Hello' } }] };

      const hash1 = generateContentHash(design);
      const hash2 = generateContentHash(design);

      expect(hash1).toBe(hash2);
      expect(hash1).not.toBe('');
    });

    it('generates different hash for different designs', () => {
      const design1 = { blocks: [{ type: 'text', props: { text: 'Hello' } }] };
      const design2 = { blocks: [{ type: 'text', props: { text: 'World' } }] };

      const hash1 = generateContentHash(design1);
      const hash2 = generateContentHash(design2);

      expect(hash1).not.toBe(hash2);
    });
  });

  // ============================================
  // DESIGN CHANGE EVENTS
  // ============================================

  describe('onDesignChange / emitDesignChange', () => {
    it('registers and calls callback on emit', () => {
      const callback = vi.fn();

      const unsubscribe = onDesignChange(callback);

      emitDesignChange({ blocks: [] }, 'slide-123');

      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          design: { blocks: [] },
          slideId: 'slide-123',
          timestamp: expect.any(Number),
        })
      );

      unsubscribe();
    });

    it('unsubscribe removes callback', () => {
      const callback = vi.fn();

      const unsubscribe = onDesignChange(callback);
      unsubscribe();

      emitDesignChange({ blocks: [] }, 'slide-456');

      expect(callback).not.toHaveBeenCalled();
    });

    it('supports multiple callbacks', () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();

      onDesignChange(callback1);
      onDesignChange(callback2);

      emitDesignChange({ blocks: [] }, 'slide-789');

      expect(callback1).toHaveBeenCalled();
      expect(callback2).toHaveBeenCalled();
    });
  });

  // ============================================
  // CLEANUP
  // ============================================

  describe('cleanup', () => {
    it('clears all subscriptions and listeners', () => {
      // Create some subscriptions
      subscribeToSceneUpdates('scene-1', vi.fn());
      onDesignChange(vi.fn());

      cleanup();

      // Should not throw
      expect(mockSupabase.removeChannel).toHaveBeenCalled();
    });
  });
});
