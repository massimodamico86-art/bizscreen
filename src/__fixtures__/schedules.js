export const mockScheduleSlot = {
  id: 'slot-1',
  schedule_id: 'schedule-123',
  playlist_id: 'playlist-123',
  start_time: '09:00',
  end_time: '17:00',
  days_of_week: [1, 2, 3, 4, 5], // Mon-Fri
  priority: 1,
};

export const mockSchedule = {
  id: 'schedule-123',
  name: 'Test Schedule',
  owner_id: 'user-123',
  tenant_id: 'tenant-123',
  timezone: 'America/New_York',
  slots: [mockScheduleSlot],
};

export function createMockSchedule(overrides = {}) {
  return { ...mockSchedule, ...overrides };
}

export function createMockSlot(overrides = {}) {
  return { ...mockScheduleSlot, ...overrides };
}
