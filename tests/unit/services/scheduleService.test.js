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
    rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
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

// Mock permissions service - return false so canAssignContent bypasses DB check
vi.mock('../../../src/services/permissionsService.js', () => ({
  requiresApproval: vi.fn().mockResolvedValue(false),
}));

// Mock approval service
vi.mock('../../../src/services/approvalService.js', () => ({
  APPROVAL_STATUS: {
    PENDING: 'pending',
    APPROVED: 'approved',
    REJECTED: 'rejected',
    DRAFT: 'draft',
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

// ============================================================================
// EXTENDED COVERAGE - Schedule CRUD Operations
// ============================================================================

describe('scheduleService - Extended Coverage', () => {
  let mockSupabase;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Schedule CRUD operations', () => {
    describe('fetchSchedules', () => {
      it('returns schedules for current user', async () => {
        const { supabase } = await import('../../../src/supabase');
        const mockData = [
          { id: 'sched-1', name: 'Morning Schedule', schedule_entries: [{ count: 3 }] },
          { id: 'sched-2', name: 'Evening Schedule', schedule_entries: [{ count: 1 }] }
        ];

        supabase.from.mockImplementationOnce(() => ({
          select: vi.fn().mockReturnThis(),
          order: vi.fn().mockResolvedValue({ data: mockData, error: null })
        }));

        const { fetchSchedules } = await import('../../../src/services/scheduleService');
        const result = await fetchSchedules();

        expect(result).toHaveLength(2);
        expect(result[0].name).toBe('Morning Schedule');
        expect(result[0].entry_count).toBe(3);
      });

      it('handles empty schedule list', async () => {
        const { supabase } = await import('../../../src/supabase');

        supabase.from.mockImplementationOnce(() => ({
          select: vi.fn().mockReturnThis(),
          order: vi.fn().mockResolvedValue({ data: [], error: null })
        }));

        const { fetchSchedules } = await import('../../../src/services/scheduleService');
        const result = await fetchSchedules();

        expect(result).toEqual([]);
      });

      it('handles database errors gracefully', async () => {
        const { supabase } = await import('../../../src/supabase');

        supabase.from.mockImplementationOnce(() => ({
          select: vi.fn().mockReturnThis(),
          order: vi.fn().mockResolvedValue({ data: null, error: { message: 'Database error' } })
        }));

        const { fetchSchedules } = await import('../../../src/services/scheduleService');

        await expect(fetchSchedules()).rejects.toThrow();
      });
    });

    describe('createSchedule', () => {
      it('creates schedule with required fields', async () => {
        const { supabase } = await import('../../../src/supabase');
        const mockSchedule = { id: 'new-sched', name: 'Test Schedule', description: 'Test desc' };

        supabase.auth.getUser.mockResolvedValueOnce({
          data: { user: { id: 'user-123' } }
        });

        supabase.from.mockImplementationOnce(() => ({
          insert: vi.fn().mockReturnThis(),
          select: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: mockSchedule, error: null })
        }));

        const { createSchedule } = await import('../../../src/services/scheduleService');
        const result = await createSchedule({ name: 'Test Schedule', description: 'Test desc' });

        expect(result).toEqual(mockSchedule);
      });

      it('throws error when user not authenticated', async () => {
        const { supabase } = await import('../../../src/supabase');

        supabase.auth.getUser.mockResolvedValueOnce({
          data: { user: null }
        });

        const { createSchedule } = await import('../../../src/services/scheduleService');

        await expect(createSchedule({ name: 'Test' }))
          .rejects.toThrow('User must be authenticated');
      });

      it('logs activity on successful creation', async () => {
        const { supabase } = await import('../../../src/supabase');
        const { logActivity } = await import('../../../src/services/activityLogService');
        const mockSchedule = { id: 'new-sched', name: 'Logged Schedule' };

        supabase.auth.getUser.mockResolvedValueOnce({
          data: { user: { id: 'user-123' } }
        });

        supabase.from.mockImplementationOnce(() => ({
          insert: vi.fn().mockReturnThis(),
          select: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: mockSchedule, error: null })
        }));

        const { createSchedule } = await import('../../../src/services/scheduleService');
        await createSchedule({ name: 'Logged Schedule' });

        expect(logActivity).toHaveBeenCalled();
      });
    });

    describe('updateSchedule', () => {
      it('updates schedule properties', async () => {
        const { supabase } = await import('../../../src/supabase');
        const mockUpdated = { id: 'sched-1', name: 'Updated Name', description: 'Updated desc' };

        supabase.from.mockImplementationOnce(() => ({
          update: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          select: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: mockUpdated, error: null })
        }));

        const { updateSchedule } = await import('../../../src/services/scheduleService');
        const result = await updateSchedule('sched-1', { name: 'Updated Name' });

        expect(result.name).toBe('Updated Name');
      });

      it('filters out non-allowed fields', async () => {
        const { supabase } = await import('../../../src/supabase');
        let capturedUpdate = null;

        supabase.from.mockImplementationOnce(() => ({
          update: vi.fn((data) => {
            capturedUpdate = data;
            return {
              eq: vi.fn().mockReturnThis(),
              select: vi.fn().mockReturnThis(),
              single: vi.fn().mockResolvedValue({ data: { id: 'sched-1', name: 'Test' }, error: null })
            };
          })
        }));

        const { updateSchedule } = await import('../../../src/services/scheduleService');
        await updateSchedule('sched-1', {
          name: 'Allowed',
          description: 'Also allowed',
          owner_id: 'not-allowed', // Should be filtered
          created_at: 'not-allowed' // Should be filtered
        });

        expect(capturedUpdate).toEqual({ name: 'Allowed', description: 'Also allowed' });
      });

      it('logs activity on successful update', async () => {
        const { supabase } = await import('../../../src/supabase');
        const { logActivity } = await import('../../../src/services/activityLogService');

        supabase.from.mockImplementationOnce(() => ({
          update: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          select: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: { id: 'sched-1', name: 'Updated' }, error: null })
        }));

        const { updateSchedule } = await import('../../../src/services/scheduleService');
        await updateSchedule('sched-1', { name: 'Updated' });

        expect(logActivity).toHaveBeenCalled();
      });
    });

    describe('deleteSchedule', () => {
      it('deletes schedule by ID', async () => {
        const { supabase } = await import('../../../src/supabase');

        // Mock the select for getting schedule info before delete
        supabase.from.mockImplementationOnce(() => ({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: { id: 'sched-1', name: 'To Delete' }, error: null })
        }));

        // Mock the delete operation
        supabase.from.mockImplementationOnce(() => ({
          delete: vi.fn().mockReturnThis(),
          eq: vi.fn().mockResolvedValue({ error: null })
        }));

        const { deleteSchedule } = await import('../../../src/services/scheduleService');
        const result = await deleteSchedule('sched-1');

        expect(result).toBe(true);
      });

      it('logs activity on successful deletion', async () => {
        const { supabase } = await import('../../../src/supabase');
        const { logActivity } = await import('../../../src/services/activityLogService');

        supabase.from.mockImplementationOnce(() => ({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: { id: 'sched-1', name: 'To Delete' }, error: null })
        }));

        supabase.from.mockImplementationOnce(() => ({
          delete: vi.fn().mockReturnThis(),
          eq: vi.fn().mockResolvedValue({ error: null })
        }));

        const { deleteSchedule } = await import('../../../src/services/scheduleService');
        await deleteSchedule('sched-1');

        expect(logActivity).toHaveBeenCalled();
      });

      it('handles non-existent schedule gracefully', async () => {
        const { supabase } = await import('../../../src/supabase');

        supabase.from.mockImplementationOnce(() => ({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: null, error: null })
        }));

        supabase.from.mockImplementationOnce(() => ({
          delete: vi.fn().mockReturnThis(),
          eq: vi.fn().mockResolvedValue({ error: null })
        }));

        const { deleteSchedule } = await import('../../../src/services/scheduleService');
        // Should not throw even if schedule wasn't found
        const result = await deleteSchedule('non-existent');
        expect(result).toBe(true);
      });
    });
  });

  describe('Schedule entry operations', () => {
    describe('createScheduleEntry', () => {
      it('creates entry with time range', async () => {
        const { supabase } = await import('../../../src/supabase');
        const mockEntry = {
          id: 'entry-1',
          schedule_id: 'sched-1',
          start_time: '08:00',
          end_time: '12:00'
        };

        supabase.from.mockImplementationOnce(() => ({
          insert: vi.fn().mockReturnThis(),
          select: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: mockEntry, error: null })
        }));

        const { createScheduleEntry } = await import('../../../src/services/scheduleService');
        const result = await createScheduleEntry('sched-1', {
          start_time: '08:00',
          end_time: '12:00'
        });

        expect(result.start_time).toBe('08:00');
        expect(result.end_time).toBe('12:00');
      });

      it('creates entry with days of week', async () => {
        const { supabase } = await import('../../../src/supabase');
        const mockEntry = {
          id: 'entry-1',
          schedule_id: 'sched-1',
          days_of_week: [1, 2, 3, 4, 5]
        };

        supabase.from.mockImplementationOnce(() => ({
          insert: vi.fn().mockReturnThis(),
          select: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: mockEntry, error: null })
        }));

        const { createScheduleEntry } = await import('../../../src/services/scheduleService');
        const result = await createScheduleEntry('sched-1', {
          days_of_week: [1, 2, 3, 4, 5]
        });

        expect(result.days_of_week).toEqual([1, 2, 3, 4, 5]);
      });

      it('uses default values when not provided', async () => {
        const { supabase } = await import('../../../src/supabase');
        let capturedInsert = null;

        supabase.from.mockImplementationOnce(() => ({
          insert: vi.fn((data) => {
            capturedInsert = data;
            return {
              select: vi.fn().mockReturnThis(),
              single: vi.fn().mockResolvedValue({ data: { id: 'entry-1', ...data }, error: null })
            };
          })
        }));

        const { createScheduleEntry } = await import('../../../src/services/scheduleService');
        await createScheduleEntry('sched-1', {});

        expect(capturedInsert.start_time).toBe('09:00');
        expect(capturedInsert.end_time).toBe('17:00');
        expect(capturedInsert.days_of_week).toEqual([1, 2, 3, 4, 5]); // Default weekdays
      });
    });

    describe('updateScheduleEntry', () => {
      it('updates entry time range', async () => {
        const { supabase } = await import('../../../src/supabase');

        supabase.from.mockImplementationOnce(() => ({
          update: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          select: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: { id: 'entry-1', start_time: '10:00', end_time: '14:00' },
            error: null
          })
        }));

        const { updateScheduleEntry } = await import('../../../src/services/scheduleService');
        const result = await updateScheduleEntry('entry-1', {
          start_time: '10:00',
          end_time: '14:00'
        });

        expect(result.start_time).toBe('10:00');
        expect(result.end_time).toBe('14:00');
      });

      it('updates entry days of week', async () => {
        const { supabase } = await import('../../../src/supabase');

        supabase.from.mockImplementationOnce(() => ({
          update: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          select: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: { id: 'entry-1', days_of_week: [0, 6] },
            error: null
          })
        }));

        const { updateScheduleEntry } = await import('../../../src/services/scheduleService');
        const result = await updateScheduleEntry('entry-1', {
          days_of_week: [0, 6]
        });

        expect(result.days_of_week).toEqual([0, 6]);
      });
    });

    describe('deleteScheduleEntry', () => {
      it('removes entry from schedule', async () => {
        const { supabase } = await import('../../../src/supabase');

        supabase.from.mockImplementationOnce(() => ({
          delete: vi.fn().mockReturnThis(),
          eq: vi.fn().mockResolvedValue({ error: null })
        }));

        const { deleteScheduleEntry } = await import('../../../src/services/scheduleService');
        const result = await deleteScheduleEntry('entry-1');

        expect(result).toBe(true);
      });
    });
  });

  describe('Schedule conflict detection', () => {
    it('checkEntryConflicts validates schedule ID', async () => {
      const { checkEntryConflicts } = await import('../../../src/services/scheduleService');

      await expect(checkEntryConflicts(null, {}))
        .rejects.toThrow('Schedule ID is required');

      await expect(checkEntryConflicts('', {}))
        .rejects.toThrow('Schedule ID is required');
    });

    it('detects overlapping time ranges on same day', async () => {
      const { supabase } = await import('../../../src/supabase');

      supabase.rpc.mockResolvedValueOnce({
        data: [{
          conflicting_entry_id: 'entry-2',
          conflicting_start_time: '09:00',
          conflicting_end_time: '12:00',
          conflicting_days_of_week: [1, 2, 3],
          content_type: 'playlist',
          content_name: 'Morning Playlist'
        }],
        error: null
      });

      const { checkEntryConflicts } = await import('../../../src/services/scheduleService');
      const result = await checkEntryConflicts('sched-1', {
        start_time: '10:00',
        end_time: '14:00',
        days_of_week: [1, 2, 3]
      });

      expect(result.hasConflicts).toBe(true);
      expect(result.conflicts).toHaveLength(1);
      expect(result.conflicts[0].content_name).toBe('Morning Playlist');
    });

    it('allows non-overlapping entries', async () => {
      const { supabase } = await import('../../../src/supabase');

      supabase.rpc.mockResolvedValueOnce({
        data: [],
        error: null
      });

      const { checkEntryConflicts } = await import('../../../src/services/scheduleService');
      const result = await checkEntryConflicts('sched-1', {
        start_time: '14:00',
        end_time: '17:00',
        days_of_week: [1, 2, 3]
      });

      expect(result.hasConflicts).toBe(false);
      expect(result.conflicts).toHaveLength(0);
    });
  });

  describe('Device/group assignment', () => {
    describe('assignScheduleToDevice', () => {
      it('assigns schedule to device', async () => {
        const { supabase } = await import('../../../src/supabase');

        supabase.rpc.mockResolvedValueOnce({
          data: { success: true },
          error: null
        });

        const { assignScheduleToDevice } = await import('../../../src/services/scheduleService');
        const result = await assignScheduleToDevice('device-1', 'sched-1');

        expect(supabase.rpc).toHaveBeenCalledWith('assign_schedule_to_device', {
          p_device_id: 'device-1',
          p_schedule_id: 'sched-1'
        });
      });

      it('validates device ID is provided', async () => {
        const { assignScheduleToDevice } = await import('../../../src/services/scheduleService');

        await expect(assignScheduleToDevice(null, 'sched-1'))
          .rejects.toThrow('Device ID is required');

        await expect(assignScheduleToDevice('', 'sched-1'))
          .rejects.toThrow('Device ID is required');
      });

      it('allows clearing schedule assignment with null', async () => {
        const { supabase } = await import('../../../src/supabase');

        supabase.rpc.mockResolvedValueOnce({
          data: { success: true },
          error: null
        });

        const { assignScheduleToDevice } = await import('../../../src/services/scheduleService');
        await assignScheduleToDevice('device-1', null);

        expect(supabase.rpc).toHaveBeenCalledWith('assign_schedule_to_device', {
          p_device_id: 'device-1',
          p_schedule_id: null
        });
      });
    });

    describe('assignScheduleToGroup', () => {
      it('assigns schedule to screen group', async () => {
        const { supabase } = await import('../../../src/supabase');

        supabase.rpc.mockResolvedValueOnce({
          data: { success: true },
          error: null
        });

        const { assignScheduleToGroup } = await import('../../../src/services/scheduleService');
        const result = await assignScheduleToGroup('group-1', 'sched-1');

        expect(supabase.rpc).toHaveBeenCalledWith('assign_schedule_to_group', {
          p_group_id: 'group-1',
          p_schedule_id: 'sched-1'
        });
      });

      it('validates group ID is provided', async () => {
        const { assignScheduleToGroup } = await import('../../../src/services/scheduleService');

        await expect(assignScheduleToGroup(null, 'sched-1'))
          .rejects.toThrow('Group ID is required');

        await expect(assignScheduleToGroup('', 'sched-1'))
          .rejects.toThrow('Group ID is required');
      });
    });

    describe('getDevicesWithSchedule', () => {
      it('returns devices using schedule', async () => {
        const { supabase } = await import('../../../src/supabase');
        const mockDevices = [
          { id: 'dev-1', device_name: 'Lobby TV', is_online: true, location: { id: 'loc-1', name: 'Main' } },
          { id: 'dev-2', device_name: 'Cafe TV', is_online: false, location: null }
        ];

        supabase.from.mockImplementationOnce(() => ({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          order: vi.fn().mockResolvedValue({ data: mockDevices, error: null })
        }));

        const { getDevicesWithSchedule } = await import('../../../src/services/scheduleService');
        const result = await getDevicesWithSchedule('sched-1');

        expect(result).toHaveLength(2);
        expect(result[0].device_name).toBe('Lobby TV');
      });
    });

    describe('getGroupsWithSchedule', () => {
      it('returns groups using schedule', async () => {
        const { supabase } = await import('../../../src/supabase');
        const mockGroups = [
          { id: 'grp-1', name: 'Lobby Screens', location: { id: 'loc-1', name: 'Main' } },
          { id: 'grp-2', name: 'Conference Rooms', location: null }
        ];

        supabase.from.mockImplementationOnce(() => ({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          order: vi.fn().mockResolvedValue({ data: mockGroups, error: null })
        }));

        const { getGroupsWithSchedule } = await import('../../../src/services/scheduleService');
        const result = await getGroupsWithSchedule('sched-1');

        expect(result).toHaveLength(2);
        expect(result[0].name).toBe('Lobby Screens');
      });
    });

    describe('bulkAssignScheduleToDevices', () => {
      it('assigns schedule to multiple devices', async () => {
        const { supabase } = await import('../../../src/supabase');

        supabase.from.mockImplementationOnce(() => ({
          update: vi.fn().mockReturnThis(),
          in: vi.fn().mockReturnThis(),
          select: vi.fn().mockResolvedValue({
            data: [{ id: 'dev-1' }, { id: 'dev-2' }],
            error: null
          })
        }));

        const { bulkAssignScheduleToDevices } = await import('../../../src/services/scheduleService');
        const result = await bulkAssignScheduleToDevices('sched-1', ['dev-1', 'dev-2']);

        expect(result.updated).toBe(2);
      });

      it('validates schedule ID is provided', async () => {
        const { bulkAssignScheduleToDevices } = await import('../../../src/services/scheduleService');

        await expect(bulkAssignScheduleToDevices(null, ['dev-1']))
          .rejects.toThrow('Schedule ID is required');
      });

      it('returns zero when no device IDs provided', async () => {
        const { bulkAssignScheduleToDevices } = await import('../../../src/services/scheduleService');
        const result = await bulkAssignScheduleToDevices('sched-1', []);

        expect(result.updated).toBe(0);
      });
    });

    describe('bulkAssignScheduleToGroups', () => {
      it('assigns schedule to multiple groups', async () => {
        const { supabase } = await import('../../../src/supabase');

        supabase.from.mockImplementationOnce(() => ({
          update: vi.fn().mockReturnThis(),
          in: vi.fn().mockReturnThis(),
          select: vi.fn().mockResolvedValue({
            data: [{ id: 'grp-1' }, { id: 'grp-2' }],
            error: null
          })
        }));

        const { bulkAssignScheduleToGroups } = await import('../../../src/services/scheduleService');
        const result = await bulkAssignScheduleToGroups('sched-1', ['grp-1', 'grp-2']);

        expect(result.updated).toBe(2);
      });
    });
  });

  describe('Filler content operations', () => {
    describe('updateScheduleFillerContent', () => {
      it('updates filler content for schedule', async () => {
        const { supabase } = await import('../../../src/supabase');

        supabase.from.mockImplementationOnce(() => ({
          update: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          select: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: { id: 'sched-1', filler_content_type: 'playlist', filler_content_id: 'pl-1' },
            error: null
          })
        }));

        const { updateScheduleFillerContent } = await import('../../../src/services/scheduleService');
        const result = await updateScheduleFillerContent('sched-1', 'playlist', 'pl-1');

        expect(result.filler_content_type).toBe('playlist');
        expect(result.filler_content_id).toBe('pl-1');
      });

      it('validates schedule ID is required', async () => {
        const { updateScheduleFillerContent } = await import('../../../src/services/scheduleService');

        await expect(updateScheduleFillerContent(null, 'playlist', 'pl-1'))
          .rejects.toThrow('Schedule ID is required');
      });

      it('validates content type and ID are required', async () => {
        const { updateScheduleFillerContent } = await import('../../../src/services/scheduleService');

        await expect(updateScheduleFillerContent('sched-1', null, 'pl-1'))
          .rejects.toThrow('Content type and ID are required');

        await expect(updateScheduleFillerContent('sched-1', 'playlist', null))
          .rejects.toThrow('Content type and ID are required');
      });

      it('validates content type is valid', async () => {
        const { updateScheduleFillerContent } = await import('../../../src/services/scheduleService');

        await expect(updateScheduleFillerContent('sched-1', 'invalid', 'pl-1'))
          .rejects.toThrow('Invalid content type');
      });
    });

    describe('clearScheduleFillerContent', () => {
      it('clears filler content', async () => {
        const { supabase } = await import('../../../src/supabase');

        supabase.from.mockImplementationOnce(() => ({
          update: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          select: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: { id: 'sched-1', filler_content_type: null, filler_content_id: null },
            error: null
          })
        }));

        const { clearScheduleFillerContent } = await import('../../../src/services/scheduleService');
        const result = await clearScheduleFillerContent('sched-1');

        expect(result.filler_content_type).toBeNull();
        expect(result.filler_content_id).toBeNull();
      });

      it('validates schedule ID is required', async () => {
        const { clearScheduleFillerContent } = await import('../../../src/services/scheduleService');

        await expect(clearScheduleFillerContent(null))
          .rejects.toThrow('Schedule ID is required');
      });
    });
  });

  describe('Week preview', () => {
    describe('getWeekPreview', () => {
      it('validates schedule ID is required', async () => {
        const { getWeekPreview } = await import('../../../src/services/scheduleService');

        await expect(getWeekPreview(null, '2026-01-20'))
          .rejects.toThrow('Schedule ID is required');
      });

      it('returns 7 days of schedule preview', async () => {
        const { supabase } = await import('../../../src/supabase');

        supabase.from.mockImplementationOnce(() => ({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: {
              id: 'sched-1',
              filler_content_type: null,
              filler_content_id: null,
              schedule_entries: [
                {
                  id: 'entry-1',
                  start_time: '09:00',
                  end_time: '17:00',
                  days_of_week: [1, 2, 3, 4, 5],
                  start_date: null,
                  end_date: null,
                  content_type: 'playlist',
                  content_id: 'pl-1',
                  event_type: 'content',
                  is_active: true,
                  priority: 0
                }
              ]
            },
            error: null
          })
        }));

        // Mock playlist lookup - need to chain .order() after .in()
        supabase.from.mockImplementation(() => ({
          select: vi.fn().mockReturnThis(),
          in: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({
              data: [{ id: 'pl-1', name: 'Morning Playlist' }],
              error: null
            })
          })
        }));

        const { getWeekPreview } = await import('../../../src/services/scheduleService');
        const result = await getWeekPreview('sched-1', '2026-01-20');

        expect(result).toHaveLength(7);
        expect(result[0]).toHaveProperty('date');
        expect(result[0]).toHaveProperty('dayOfWeek');
        expect(result[0]).toHaveProperty('dayName');
        expect(result[0]).toHaveProperty('entries');
      });
    });
  });
});
