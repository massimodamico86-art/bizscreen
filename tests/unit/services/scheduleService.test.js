/**
 * Schedule Service Unit Tests
 * Phase 6: Tests for schedule service utilities and formatters
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  DAYS_OF_WEEK,
  TARGET_TYPES,
  formatDaysOfWeek,
  formatTime,
  formatTimeRange
} from '../../../src/services/scheduleService';

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
      in: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: {}, error: null }),
    })),
  },
}));

// Mock activity log service
vi.mock('../../../src/services/activityLogService', () => ({
  logActivity: vi.fn(),
  ACTIONS: {
    SCHEDULE_CREATED: 'schedule_created',
    SCHEDULE_UPDATED: 'schedule_updated',
    SCHEDULE_DELETED: 'schedule_deleted',
  },
  RESOURCE_TYPES: {
    SCHEDULE: 'schedule',
  },
}));

describe('scheduleService', () => {
  describe('DAYS_OF_WEEK constant', () => {
    it('contains all 7 days', () => {
      expect(DAYS_OF_WEEK).toHaveLength(7);
    });

    it('has correct values starting with Sunday at 0', () => {
      expect(DAYS_OF_WEEK[0]).toEqual({ value: 0, label: 'Sunday', short: 'Sun' });
      expect(DAYS_OF_WEEK[6]).toEqual({ value: 6, label: 'Saturday', short: 'Sat' });
    });

    it('has all required properties for each day', () => {
      DAYS_OF_WEEK.forEach(day => {
        expect(day).toHaveProperty('value');
        expect(day).toHaveProperty('label');
        expect(day).toHaveProperty('short');
        expect(typeof day.value).toBe('number');
        expect(typeof day.label).toBe('string');
        expect(typeof day.short).toBe('string');
      });
    });
  });

  describe('TARGET_TYPES constant', () => {
    it('contains expected target types', () => {
      expect(TARGET_TYPES.PLAYLIST).toBe('playlist');
      expect(TARGET_TYPES.LAYOUT).toBe('layout');
      expect(TARGET_TYPES.MEDIA).toBe('media');
      expect(TARGET_TYPES.SCENE).toBe('scene');
    });

    it('has exactly 4 target types (including scene)', () => {
      expect(Object.keys(TARGET_TYPES)).toHaveLength(4);
    });

    it('has SCENE as a valid target type for scheduling scenes', () => {
      expect(TARGET_TYPES.SCENE).toBeDefined();
      expect(TARGET_TYPES.SCENE).toBe('scene');
    });
  });

  describe('formatDaysOfWeek', () => {
    it('returns "No days" for empty array', () => {
      expect(formatDaysOfWeek([])).toBe('No days');
    });

    it('returns "No days" for null/undefined', () => {
      expect(formatDaysOfWeek(null)).toBe('No days');
      expect(formatDaysOfWeek(undefined)).toBe('No days');
    });

    it('returns "Every day" for all 7 days', () => {
      expect(formatDaysOfWeek([0, 1, 2, 3, 4, 5, 6])).toBe('Every day');
    });

    it('returns "Weekdays" for Mon-Fri', () => {
      expect(formatDaysOfWeek([1, 2, 3, 4, 5])).toBe('Weekdays');
    });

    it('returns "Weekdays" regardless of order', () => {
      expect(formatDaysOfWeek([5, 3, 1, 4, 2])).toBe('Weekdays');
    });

    it('returns "Weekends" for Sat-Sun', () => {
      expect(formatDaysOfWeek([0, 6])).toBe('Weekends');
      expect(formatDaysOfWeek([6, 0])).toBe('Weekends');
    });

    it('returns abbreviated day names for custom selections', () => {
      expect(formatDaysOfWeek([1, 3, 5])).toBe('Mon, Wed, Fri');
    });

    it('sorts days in correct order', () => {
      expect(formatDaysOfWeek([5, 1, 3])).toBe('Mon, Wed, Fri');
      expect(formatDaysOfWeek([6, 0])).toBe('Weekends'); // Special case
    });

    it('handles single day', () => {
      expect(formatDaysOfWeek([1])).toBe('Mon');
      expect(formatDaysOfWeek([0])).toBe('Sun');
    });
  });

  describe('formatTime', () => {
    it('returns empty string for null/undefined', () => {
      expect(formatTime(null)).toBe('');
      expect(formatTime(undefined)).toBe('');
      expect(formatTime('')).toBe('');
    });

    it('converts 24-hour to 12-hour format (AM)', () => {
      expect(formatTime('09:00')).toBe('9:00 AM');
      expect(formatTime('00:00')).toBe('12:00 AM');
      expect(formatTime('01:30')).toBe('1:30 AM');
      expect(formatTime('11:59')).toBe('11:59 AM');
    });

    it('converts 24-hour to 12-hour format (PM)', () => {
      expect(formatTime('12:00')).toBe('12:00 PM');
      expect(formatTime('13:00')).toBe('1:00 PM');
      expect(formatTime('17:30')).toBe('5:30 PM');
      expect(formatTime('23:59')).toBe('11:59 PM');
    });

    it('preserves minutes correctly', () => {
      expect(formatTime('09:05')).toBe('9:05 AM');
      expect(formatTime('14:45')).toBe('2:45 PM');
    });
  });

  describe('formatTimeRange', () => {
    it('returns "All day" when both times are missing', () => {
      expect(formatTimeRange(null, null)).toBe('All day');
      expect(formatTimeRange(undefined, undefined)).toBe('All day');
      expect(formatTimeRange('', '')).toBe('All day');
    });

    it('returns "Until [time]" when only end time provided', () => {
      expect(formatTimeRange(null, '17:00')).toBe('Until 5:00 PM');
      expect(formatTimeRange('', '09:00')).toBe('Until 9:00 AM');
    });

    it('returns "From [time]" when only start time provided', () => {
      expect(formatTimeRange('09:00', null)).toBe('From 9:00 AM');
      expect(formatTimeRange('14:00', '')).toBe('From 2:00 PM');
    });

    it('returns range when both times provided', () => {
      expect(formatTimeRange('09:00', '17:00')).toBe('9:00 AM - 5:00 PM');
      expect(formatTimeRange('08:30', '12:30')).toBe('8:30 AM - 12:30 PM');
      expect(formatTimeRange('12:00', '23:00')).toBe('12:00 PM - 11:00 PM');
    });
  });
});

describe('scheduleService API functions', () => {
  it('exports all required schedule functions', async () => {
    const scheduleService = await import('../../../src/services/scheduleService');

    // CRUD operations
    expect(typeof scheduleService.fetchSchedules).toBe('function');
    expect(typeof scheduleService.createSchedule).toBe('function');
    expect(typeof scheduleService.deleteSchedule).toBe('function');
    expect(typeof scheduleService.updateSchedule).toBe('function');
    expect(typeof scheduleService.duplicateSchedule).toBe('function');

    // Entry operations
    expect(typeof scheduleService.fetchScheduleWithEntries).toBe('function');
    expect(typeof scheduleService.fetchScheduleWithEntriesResolved).toBe('function');
    expect(typeof scheduleService.createScheduleEntry).toBe('function');
    expect(typeof scheduleService.updateScheduleEntry).toBe('function');
    expect(typeof scheduleService.deleteScheduleEntry).toBe('function');

    // Formatters
    expect(typeof scheduleService.formatDaysOfWeek).toBe('function');
    expect(typeof scheduleService.formatTime).toBe('function');
    expect(typeof scheduleService.formatTimeRange).toBe('function');
  });

  it('exports new scene scheduling functions', async () => {
    const scheduleService = await import('../../../src/services/scheduleService');

    // Scene scheduling functions
    expect(typeof scheduleService.fetchSchedulesWithUsage).toBe('function');
    expect(typeof scheduleService.assignScheduleToDevice).toBe('function');
    expect(typeof scheduleService.assignScheduleToGroup).toBe('function');
    expect(typeof scheduleService.getSchedulePreview).toBe('function');
    expect(typeof scheduleService.getDevicesWithSchedule).toBe('function');
    expect(typeof scheduleService.getGroupsWithSchedule).toBe('function');
    expect(typeof scheduleService.getScenesForSchedule).toBe('function');
    expect(typeof scheduleService.createScheduleWithEntries).toBe('function');
  });
});

describe('Scene scheduling validation', () => {
  it('assignScheduleToDevice validates device ID', async () => {
    const { assignScheduleToDevice } = await import('../../../src/services/scheduleService');

    await expect(assignScheduleToDevice(null, 'schedule-id'))
      .rejects.toThrow('Device ID is required');

    await expect(assignScheduleToDevice('', 'schedule-id'))
      .rejects.toThrow('Device ID is required');
  });

  it('assignScheduleToGroup validates group ID', async () => {
    const { assignScheduleToGroup } = await import('../../../src/services/scheduleService');

    await expect(assignScheduleToGroup(null, 'schedule-id'))
      .rejects.toThrow('Group ID is required');

    await expect(assignScheduleToGroup('', 'schedule-id'))
      .rejects.toThrow('Group ID is required');
  });

  it('getSchedulePreview validates schedule ID', async () => {
    const { getSchedulePreview } = await import('../../../src/services/scheduleService');

    await expect(getSchedulePreview(null))
      .rejects.toThrow('Schedule ID is required');

    await expect(getSchedulePreview(''))
      .rejects.toThrow('Schedule ID is required');
  });
});
