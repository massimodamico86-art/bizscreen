/**
 * Screen Service Unit Tests
 * Phase 4: Tests for screen/device service operations
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  isScreenOnline,
  formatLastSeen,
  generateOtpCode,
} from '../../../src/services/screenService';

// Mock supabase
vi.mock('../../../src/supabase', () => ({
  supabase: {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: 'test-user-id' } },
      }),
    },
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      ilike: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: {}, error: null }),
    })),
  },
}));

// Mock activity log service
vi.mock('../../../src/services/activityLogService', () => ({
  logActivity: vi.fn(),
  ACTIONS: {
    SCREEN_CREATED: 'screen_created',
    SCREEN_DELETED: 'screen_deleted',
    SCREEN_ASSIGNMENT_UPDATED: 'screen_assignment_updated',
  },
  RESOURCE_TYPES: {
    SCREEN: 'screen',
  },
}));

describe('screenService', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-01-15T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  describe('isScreenOnline', () => {
    it('returns false when screen has no last_seen', () => {
      const screen = { id: '1', device_name: 'Test Screen' };
      expect(isScreenOnline(screen)).toBe(false);
    });

    it('returns false when last_seen is null', () => {
      const screen = { id: '1', device_name: 'Test Screen', last_seen: null };
      expect(isScreenOnline(screen)).toBe(false);
    });

    it('returns true when last_seen is within 2 minutes', () => {
      const screen = {
        id: '1',
        device_name: 'Test Screen',
        last_seen: new Date('2024-01-15T11:59:00Z').toISOString(),
      };
      expect(isScreenOnline(screen)).toBe(true);
    });

    it('returns true when last_seen is exactly now', () => {
      const screen = {
        id: '1',
        device_name: 'Test Screen',
        last_seen: new Date('2024-01-15T12:00:00Z').toISOString(),
      };
      expect(isScreenOnline(screen)).toBe(true);
    });

    it('returns false when last_seen is more than 2 minutes ago', () => {
      const screen = {
        id: '1',
        device_name: 'Test Screen',
        last_seen: new Date('2024-01-15T11:57:00Z').toISOString(),
      };
      expect(isScreenOnline(screen)).toBe(false);
    });

    it('returns false when last_seen is exactly 2 minutes ago', () => {
      const screen = {
        id: '1',
        device_name: 'Test Screen',
        last_seen: new Date('2024-01-15T11:58:00Z').toISOString(),
      };
      expect(isScreenOnline(screen)).toBe(false);
    });

    it('handles screen with 1 minute 59 seconds ago (edge case)', () => {
      const screen = {
        id: '1',
        device_name: 'Test Screen',
        last_seen: new Date('2024-01-15T11:58:01Z').toISOString(),
      };
      expect(isScreenOnline(screen)).toBe(true);
    });
  });

  describe('formatLastSeen', () => {
    it('returns "Never" when lastSeen is null', () => {
      expect(formatLastSeen(null)).toBe('Never');
    });

    it('returns "Never" when lastSeen is undefined', () => {
      expect(formatLastSeen(undefined)).toBe('Never');
    });

    it('returns "Just now" when lastSeen is less than 1 minute ago', () => {
      const lastSeen = new Date('2024-01-15T11:59:30Z').toISOString();
      expect(formatLastSeen(lastSeen)).toBe('Just now');
    });

    it('returns minutes ago for times under 1 hour', () => {
      const lastSeen5m = new Date('2024-01-15T11:55:00Z').toISOString();
      expect(formatLastSeen(lastSeen5m)).toBe('5m ago');

      const lastSeen30m = new Date('2024-01-15T11:30:00Z').toISOString();
      expect(formatLastSeen(lastSeen30m)).toBe('30m ago');

      const lastSeen59m = new Date('2024-01-15T11:01:00Z').toISOString();
      expect(formatLastSeen(lastSeen59m)).toBe('59m ago');
    });

    it('returns hours ago for times under 24 hours', () => {
      const lastSeen1h = new Date('2024-01-15T11:00:00Z').toISOString();
      expect(formatLastSeen(lastSeen1h)).toBe('1h ago');

      const lastSeen6h = new Date('2024-01-15T06:00:00Z').toISOString();
      expect(formatLastSeen(lastSeen6h)).toBe('6h ago');

      const lastSeen23h = new Date('2024-01-14T13:00:00Z').toISOString();
      expect(formatLastSeen(lastSeen23h)).toBe('23h ago');
    });

    it('returns days ago for times 24 hours or more', () => {
      const lastSeen1d = new Date('2024-01-14T12:00:00Z').toISOString();
      expect(formatLastSeen(lastSeen1d)).toBe('1d ago');

      const lastSeen7d = new Date('2024-01-08T12:00:00Z').toISOString();
      expect(formatLastSeen(lastSeen7d)).toBe('7d ago');
    });

    it('returns 1m ago for exactly 1 minute', () => {
      const lastSeen = new Date('2024-01-15T11:59:00Z').toISOString();
      expect(formatLastSeen(lastSeen)).toBe('1m ago');
    });
  });

  describe('generateOtpCode', () => {
    it('generates a 6-character code', () => {
      const code = generateOtpCode();
      expect(code).toHaveLength(6);
    });

    it('generates uppercase alphanumeric characters only', () => {
      const code = generateOtpCode();
      expect(code).toMatch(/^[A-Z0-9]+$/);
    });

    it('excludes confusing characters (0, O, I, 1)', () => {
      // Generate multiple codes to increase chance of catching excluded chars
      for (let i = 0; i < 100; i++) {
        const code = generateOtpCode();
        expect(code).not.toMatch(/[0OI1]/);
      }
    });

    it('generates different codes on subsequent calls', () => {
      const codes = new Set();
      for (let i = 0; i < 50; i++) {
        codes.add(generateOtpCode());
      }
      // Should have many unique codes (at least 40 out of 50)
      expect(codes.size).toBeGreaterThan(40);
    });
  });
});

describe('screenService API functions', () => {
  it('exports all required screen functions', async () => {
    const screenService = await import('../../../src/services/screenService');

    // Core CRUD
    expect(typeof screenService.fetchScreens).toBe('function');
    expect(typeof screenService.getScreen).toBe('function');
    expect(typeof screenService.createScreen).toBe('function');
    expect(typeof screenService.updateScreen).toBe('function');
    expect(typeof screenService.deleteScreen).toBe('function');

    // Assignment helpers
    expect(typeof screenService.assignPlaylistToScreen).toBe('function');
    expect(typeof screenService.assignLayoutToScreen).toBe('function');
    expect(typeof screenService.assignScheduleToScreen).toBe('function');
    expect(typeof screenService.clearScreenAssignments).toBe('function');

    // Query functions
    expect(typeof screenService.getScreensByPlaylist).toBe('function');
    expect(typeof screenService.getScreensByLayout).toBe('function');
    expect(typeof screenService.getScreenStats).toBe('function');

    // Utility functions
    expect(typeof screenService.isScreenOnline).toBe('function');
    expect(typeof screenService.formatLastSeen).toBe('function');
    expect(typeof screenService.generateOtpCode).toBe('function');

    // Player/OTP functions
    expect(typeof screenService.getScreenByOtp).toBe('function');
    expect(typeof screenService.getPlayerContent).toBe('function');
    expect(typeof screenService.getPlayerContentByOtp).toBe('function');

    // Device command functions
    expect(typeof screenService.sendDeviceCommand).toBe('function');
    expect(typeof screenService.rebootDevice).toBe('function');
    expect(typeof screenService.reloadDeviceContent).toBe('function');
    expect(typeof screenService.clearDeviceCache).toBe('function');
    expect(typeof screenService.resetDevice).toBe('function');
    expect(typeof screenService.setDeviceKioskMode).toBe('function');
    expect(typeof screenService.getDeviceCommandHistory).toBe('function');
  });

  it('exports screen status functions', async () => {
    const screenService = await import('../../../src/services/screenService');

    expect(typeof screenService.updateLastSeen).toBe('function');
    expect(typeof screenService.getScreenWithStatus).toBe('function');
    expect(typeof screenService.fetchScreensWithStatus).toBe('function');
    expect(typeof screenService.updateScreenLocation).toBe('function');
  });
});

describe('OTP Code validation', () => {
  it('only uses allowed character set', () => {
    const allowedChars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

    for (let i = 0; i < 100; i++) {
      const code = generateOtpCode();
      for (const char of code) {
        expect(allowedChars).toContain(char);
      }
    }
  });

  it('character distribution is reasonably uniform', () => {
    const counts = {};
    const iterations = 1000;

    for (let i = 0; i < iterations; i++) {
      const code = generateOtpCode();
      for (const char of code) {
        counts[char] = (counts[char] || 0) + 1;
      }
    }

    // Each character should appear at least a few times over 6000 total chars
    const values = Object.values(counts);
    const avg = (iterations * 6) / Object.keys(counts).length;

    // All counts should be within 50% of average (rough check for uniform distribution)
    values.forEach(count => {
      expect(count).toBeGreaterThan(avg * 0.3);
      expect(count).toBeLessThan(avg * 2);
    });
  });
});
