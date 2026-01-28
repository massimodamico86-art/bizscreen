/**
 * Device Screenshot Service Unit Tests
 * Phase: Device Diagnostics - tests for screenshot service utilities
 */
import { describe, it, expect, vi } from 'vitest';
import {
  formatScreenshotAge,
  formatHeartbeatAge,
  getDeviceWarningLevel,
} from '../../../src/services/deviceScreenshotService';

// Mock supabase
vi.mock('../../../src/supabase', () => ({
  supabase: {
    rpc: vi.fn().mockResolvedValue({ data: [], error: null }),
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: {}, error: null }),
    })),
  },
}));

describe('deviceScreenshotService', () => {
  describe('formatScreenshotAge', () => {
    it('returns "Never" for null/undefined', () => {
      expect(formatScreenshotAge(null)).toBe('Never');
      expect(formatScreenshotAge(undefined)).toBe('Never');
    });

    it('returns "Just now" for < 1 minute', () => {
      expect(formatScreenshotAge(0)).toBe('Just now');
      expect(formatScreenshotAge(0.5)).toBe('Just now');
    });

    it('returns minutes for < 60 minutes', () => {
      expect(formatScreenshotAge(5)).toBe('5 min ago');
      expect(formatScreenshotAge(30)).toBe('30 min ago');
      expect(formatScreenshotAge(59)).toBe('59 min ago');
    });

    it('returns hours for < 24 hours', () => {
      expect(formatScreenshotAge(60)).toBe('1 hr ago');
      expect(formatScreenshotAge(120)).toBe('2 hr ago');
      expect(formatScreenshotAge(1380)).toBe('23 hr ago');
    });

    it('returns days for >= 24 hours', () => {
      expect(formatScreenshotAge(1440)).toBe('1 day ago');
      expect(formatScreenshotAge(2880)).toBe('2 days ago');
      expect(formatScreenshotAge(7200)).toBe('5 days ago');
    });
  });

  describe('formatHeartbeatAge', () => {
    it('returns "Unknown" for null/undefined', () => {
      expect(formatHeartbeatAge(null)).toBe('Unknown');
      expect(formatHeartbeatAge(undefined)).toBe('Unknown');
    });

    it('returns "Active" for < 1 minute', () => {
      expect(formatHeartbeatAge(0)).toBe('Active');
      expect(formatHeartbeatAge(0.5)).toBe('Active');
    });

    it('returns minutes without stale warning for < 5 minutes', () => {
      expect(formatHeartbeatAge(1)).toBe('1 min ago');
      expect(formatHeartbeatAge(4)).toBe('4 min ago');
    });

    it('returns minutes with stale warning for 5-59 minutes', () => {
      expect(formatHeartbeatAge(5)).toBe('5 min ago (stale)');
      expect(formatHeartbeatAge(30)).toBe('30 min ago (stale)');
      expect(formatHeartbeatAge(59)).toBe('59 min ago (stale)');
    });

    it('returns hours for >= 60 minutes', () => {
      expect(formatHeartbeatAge(60)).toBe('1 hr ago');
      expect(formatHeartbeatAge(120)).toBe('2 hr ago');
    });

    it('returns days for >= 24 hours', () => {
      expect(formatHeartbeatAge(1440)).toBe('1 day ago');
      expect(formatHeartbeatAge(2880)).toBe('2 days ago');
    });
  });

  describe('getDeviceWarningLevel', () => {
    it('returns "none" for null device', () => {
      expect(getDeviceWarningLevel(null)).toBe('none');
      expect(getDeviceWarningLevel(undefined)).toBe('none');
    });

    it('returns "critical" for offline devices', () => {
      expect(getDeviceWarningLevel({
        is_online: false,
        minutes_since_heartbeat: 0,
      })).toBe('critical');
    });

    it('returns "critical" for devices with heartbeat > 5 minutes', () => {
      expect(getDeviceWarningLevel({
        is_online: true,
        minutes_since_heartbeat: 6,
      })).toBe('critical');

      expect(getDeviceWarningLevel({
        is_online: true,
        minutes_since_heartbeat: 10,
      })).toBe('critical');
    });

    it('returns "warning" for stale screenshots (> 30 min)', () => {
      expect(getDeviceWarningLevel({
        is_online: true,
        minutes_since_heartbeat: 1,
        screenshot_age_minutes: 31,
      })).toBe('warning');

      expect(getDeviceWarningLevel({
        is_online: true,
        minutes_since_heartbeat: 1,
        screenshot_age_minutes: 60,
      })).toBe('warning');
    });

    it('returns "warning" for pending screenshot update', () => {
      expect(getDeviceWarningLevel({
        is_online: true,
        minutes_since_heartbeat: 1,
        screenshot_age_minutes: 5,
        needs_screenshot_update: true,
      })).toBe('warning');
    });

    it('returns "none" for healthy devices', () => {
      expect(getDeviceWarningLevel({
        is_online: true,
        minutes_since_heartbeat: 1,
        screenshot_age_minutes: 5,
        needs_screenshot_update: false,
      })).toBe('none');

      expect(getDeviceWarningLevel({
        is_online: true,
        minutes_since_heartbeat: 5,
        screenshot_age_minutes: 30,
        needs_screenshot_update: false,
      })).toBe('none');
    });
  });
});

describe('deviceScreenshotService API functions', () => {
  it('exports all required functions', async () => {
    const service = await import('../../../src/services/deviceScreenshotService');

    // Core functions
    expect(typeof service.fetchDevicesWithScreenshots).toBe('function');
    expect(typeof service.requestDeviceScreenshot).toBe('function');
    expect(typeof service.requestMultipleScreenshots).toBe('function');
    expect(typeof service.getDeviceScreenshotInfo).toBe('function');
    expect(typeof service.getDevicesWithWarnings).toBe('function');
    expect(typeof service.getDeviceStatusSummary).toBe('function');

    // Formatters
    expect(typeof service.formatScreenshotAge).toBe('function');
    expect(typeof service.formatHeartbeatAge).toBe('function');
    expect(typeof service.getDeviceWarningLevel).toBe('function');
  });
});

describe('requestDeviceScreenshot validation', () => {
  it('throws error for missing device ID', async () => {
    const { requestDeviceScreenshot } = await import('../../../src/services/deviceScreenshotService');

    await expect(requestDeviceScreenshot(null))
      .rejects.toThrow('Device ID is required');

    await expect(requestDeviceScreenshot(''))
      .rejects.toThrow('Device ID is required');

    await expect(requestDeviceScreenshot(undefined))
      .rejects.toThrow('Device ID is required');
  });
});

describe('getDeviceScreenshotInfo validation', () => {
  it('throws error for missing device ID', async () => {
    const { getDeviceScreenshotInfo } = await import('../../../src/services/deviceScreenshotService');

    await expect(getDeviceScreenshotInfo(null))
      .rejects.toThrow('Device ID is required');

    await expect(getDeviceScreenshotInfo(''))
      .rejects.toThrow('Device ID is required');
  });
});

describe('requestMultipleScreenshots', () => {
  it('returns zero counts for empty array', async () => {
    const { requestMultipleScreenshots } = await import('../../../src/services/deviceScreenshotService');

    const result = await requestMultipleScreenshots([]);
    expect(result).toEqual({ success: 0, failed: 0 });
  });

  it('returns zero counts for null/undefined', async () => {
    const { requestMultipleScreenshots } = await import('../../../src/services/deviceScreenshotService');

    const result1 = await requestMultipleScreenshots(null);
    expect(result1).toEqual({ success: 0, failed: 0 });

    const result2 = await requestMultipleScreenshots(undefined);
    expect(result2).toEqual({ success: 0, failed: 0 });
  });
});
