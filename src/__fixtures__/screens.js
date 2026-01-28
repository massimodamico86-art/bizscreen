// Mock screen data for tests
export const mockScreen = {
  id: 'screen-123',
  name: 'Test Screen',
  owner_id: 'user-123',
  tenant_id: 'tenant-123',
  status: 'online',
  device_id: 'device-abc',
  api_key: 'api-key-xyz',
  last_seen_at: '2026-01-28T10:00:00Z',
  paired_at: '2026-01-01T00:00:00Z',
  playlist_id: 'playlist-123',
  schedule_id: null,
  screen_group_id: 'group-123',
  language_code: 'en',
};

export const mockScreenList = [
  mockScreen,
  { ...mockScreen, id: 'screen-456', name: 'Screen 2' },
  { ...mockScreen, id: 'screen-789', name: 'Screen 3' },
];

// Factory for custom screens
export function createMockScreen(overrides = {}) {
  return { ...mockScreen, ...overrides };
}
