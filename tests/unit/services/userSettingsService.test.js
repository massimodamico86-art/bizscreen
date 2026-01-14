/**
 * User Settings Service Unit Tests
 * Phase 7: Tests for user settings management
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

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
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: {}, error: null }),
    })),
    rpc: vi.fn().mockResolvedValue({ data: {}, error: null }),
  },
}));

// Mock activity log service
vi.mock('../../../src/services/activityLogService', () => ({
  logActivity: vi.fn(),
  ACTION_TYPES: {
    UPDATE: 'update',
  },
  ENTITY_TYPES: {
    SETTINGS: 'settings',
  },
}));

describe('userSettingsService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('updateNotificationPreferences', () => {
    it('transforms preference keys correctly', async () => {
      const { supabase } = await import('../../../src/supabase');
      const mockData = { id: 'settings-1', email_notifications: true };

      const mockUpdate = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockSelect = vi.fn().mockReturnThis();
      const mockSingle = vi.fn().mockResolvedValue({ data: mockData, error: null });

      supabase.from.mockReturnValue({
        update: mockUpdate,
        eq: mockEq,
        select: mockSelect,
        single: mockSingle,
      });

      const { updateNotificationPreferences } = await import('../../../src/services/userSettingsService');

      await updateNotificationPreferences({
        emailNotifications: true,
        guestCheckinNotifications: false,
        pmsSyncNotifications: true,
        tvOfflineNotifications: false,
      });

      expect(mockUpdate).toHaveBeenCalledWith({
        email_notifications: true,
        guest_checkin_notifications: false,
        pms_sync_notifications: true,
        tv_offline_notifications: false,
      });
    });
  });

  describe('updateDisplayPreferences', () => {
    it('only includes provided preferences', async () => {
      const { supabase } = await import('../../../src/supabase');
      const mockData = { id: 'settings-1', theme: 'dark' };

      const mockUpdate = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockSelect = vi.fn().mockReturnThis();
      const mockSingle = vi.fn().mockResolvedValue({ data: mockData, error: null });

      supabase.from.mockReturnValue({
        update: mockUpdate,
        eq: mockEq,
        select: mockSelect,
        single: mockSingle,
      });

      const { updateDisplayPreferences } = await import('../../../src/services/userSettingsService');

      await updateDisplayPreferences({
        theme: 'dark',
        // language not provided
      });

      // Should only include theme, not language
      const updateArg = mockUpdate.mock.calls[0][0];
      expect(updateArg.theme).toBe('dark');
      expect(updateArg.language).toBeUndefined();
    });

    it('transforms all display preferences when provided', async () => {
      const { supabase } = await import('../../../src/supabase');
      const mockData = { id: 'settings-1' };

      const mockUpdate = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockSelect = vi.fn().mockReturnThis();
      const mockSingle = vi.fn().mockResolvedValue({ data: mockData, error: null });

      supabase.from.mockReturnValue({
        update: mockUpdate,
        eq: mockEq,
        select: mockSelect,
        single: mockSingle,
      });

      const { updateDisplayPreferences } = await import('../../../src/services/userSettingsService');

      await updateDisplayPreferences({
        theme: 'dark',
        language: 'es',
        timezone: 'America/New_York',
        dateFormat: 'DD/MM/YYYY',
        timeFormat: '24h',
      });

      const updateArg = mockUpdate.mock.calls[0][0];
      expect(updateArg.theme).toBe('dark');
      expect(updateArg.language).toBe('es');
      expect(updateArg.timezone).toBe('America/New_York');
      expect(updateArg.date_format).toBe('DD/MM/YYYY');
      expect(updateArg.time_format).toBe('24h');
    });
  });

  describe('resetUserSettings default values', () => {
    it('has correct default notification settings', async () => {
      const { supabase } = await import('../../../src/supabase');
      const mockData = { id: 'settings-1' };

      const mockUpdate = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockSelect = vi.fn().mockReturnThis();
      const mockSingle = vi.fn().mockResolvedValue({ data: mockData, error: null });

      supabase.from.mockReturnValue({
        update: mockUpdate,
        eq: mockEq,
        select: mockSelect,
        single: mockSingle,
      });

      const { resetUserSettings } = await import('../../../src/services/userSettingsService');

      await resetUserSettings();

      const updateArg = mockUpdate.mock.calls[0][0];

      // Notification defaults
      expect(updateArg.email_notifications).toBe(true);
      expect(updateArg.guest_checkin_notifications).toBe(true);
      expect(updateArg.pms_sync_notifications).toBe(true);
      expect(updateArg.tv_offline_notifications).toBe(true);
    });

    it('has correct default display settings', async () => {
      const { supabase } = await import('../../../src/supabase');
      const mockData = { id: 'settings-1' };

      const mockUpdate = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockSelect = vi.fn().mockReturnThis();
      const mockSingle = vi.fn().mockResolvedValue({ data: mockData, error: null });

      supabase.from.mockReturnValue({
        update: mockUpdate,
        eq: mockEq,
        select: mockSelect,
        single: mockSingle,
      });

      const { resetUserSettings } = await import('../../../src/services/userSettingsService');

      await resetUserSettings();

      const updateArg = mockUpdate.mock.calls[0][0];

      // Display defaults
      expect(updateArg.theme).toBe('light');
      expect(updateArg.language).toBe('en');
      expect(updateArg.timezone).toBe('UTC');
      expect(updateArg.date_format).toBe('MM/DD/YYYY');
      expect(updateArg.time_format).toBe('12h');
    });

    it('has correct default behavior settings', async () => {
      const { supabase } = await import('../../../src/supabase');
      const mockData = { id: 'settings-1' };

      const mockUpdate = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockSelect = vi.fn().mockReturnThis();
      const mockSingle = vi.fn().mockResolvedValue({ data: mockData, error: null });

      supabase.from.mockReturnValue({
        update: mockUpdate,
        eq: mockEq,
        select: mockSelect,
        single: mockSingle,
      });

      const { resetUserSettings } = await import('../../../src/services/userSettingsService');

      await resetUserSettings();

      const updateArg = mockUpdate.mock.calls[0][0];

      // Behavior defaults
      expect(updateArg.default_page).toBe('dashboard');
      expect(updateArg.items_per_page).toBe(10);
      expect(updateArg.show_welcome_banner).toBe(true);
      expect(updateArg.activity_tracking).toBe(true);
      expect(updateArg.analytics_enabled).toBe(true);
      expect(updateArg.auto_sync_pms).toBe(false);
      expect(updateArg.sync_frequency_hours).toBe(24);
    });
  });

  describe('updateUserSettings', () => {
    it('requires authentication', async () => {
      const { supabase } = await import('../../../src/supabase');

      supabase.auth.getUser.mockResolvedValueOnce({
        data: { user: null },
      });

      const { updateUserSettings } = await import('../../../src/services/userSettingsService');

      await expect(updateUserSettings({ theme: 'dark' })).rejects.toThrow('Not authenticated');
    });
  });

  describe('API function exports', () => {
    it('exports all required settings functions', async () => {
      const settingsService = await import('../../../src/services/userSettingsService');

      expect(typeof settingsService.getUserSettings).toBe('function');
      expect(typeof settingsService.updateUserSettings).toBe('function');
      expect(typeof settingsService.resetUserSettings).toBe('function');
      expect(typeof settingsService.getNotificationPreferences).toBe('function');
      expect(typeof settingsService.updateNotificationPreferences).toBe('function');
      expect(typeof settingsService.getDisplayPreferences).toBe('function');
      expect(typeof settingsService.updateDisplayPreferences).toBe('function');
    });
  });
});
