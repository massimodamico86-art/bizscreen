/**
 * Playlist Service Unit Tests
 * Phase 6: Tests for playlist service operations
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock supabase before importing the service
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
    rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
  },
}));

// Mock activity log service
vi.mock('../../../src/services/activityLogService', () => ({
  logActivity: vi.fn(),
  ACTIONS: {
    PLAYLIST_CREATED: 'playlist_created',
    PLAYLIST_UPDATED: 'playlist_updated',
    PLAYLIST_DELETED: 'playlist_deleted',
  },
  RESOURCE_TYPES: {
    PLAYLIST: 'playlist',
  },
}));

describe('playlistService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('API function exports', () => {
    it('exports all required playlist CRUD functions', async () => {
      const playlistService = await import('../../../src/services/playlistService');

      // Core CRUD
      expect(typeof playlistService.fetchPlaylists).toBe('function');
      expect(typeof playlistService.getPlaylist).toBe('function');
      expect(typeof playlistService.createPlaylist).toBe('function');
      expect(typeof playlistService.updatePlaylist).toBe('function');
      expect(typeof playlistService.deletePlaylist).toBe('function');
      expect(typeof playlistService.duplicatePlaylist).toBe('function');
    });

    it('exports playlist item management functions', async () => {
      const playlistService = await import('../../../src/services/playlistService');

      expect(typeof playlistService.addPlaylistItem).toBe('function');
      expect(typeof playlistService.removePlaylistItem).toBe('function');
      expect(typeof playlistService.reorderPlaylistItems).toBe('function');
      expect(typeof playlistService.updatePlaylistItemDuration).toBe('function');
    });

    it('exports usage checking functions', async () => {
      const playlistService = await import('../../../src/services/playlistService');

      expect(typeof playlistService.getPlaylistUsage).toBe('function');
      expect(typeof playlistService.isPlaylistInUse).toBe('function');
      expect(typeof playlistService.deletePlaylistSafely).toBe('function');
    });
  });

  describe('deletePlaylistSafely', () => {
    it('returns success false with IN_USE code when playlist is in use and force is false', async () => {
      const { supabase } = await import('../../../src/supabase');

      // Mock RPC to return in use
      supabase.rpc.mockResolvedValueOnce({
        data: { is_in_use: true, screen_count: 2 },
        error: null
      });

      const { deletePlaylistSafely } = await import('../../../src/services/playlistService');

      const result = await deletePlaylistSafely('playlist-123', { force: false });

      expect(result.success).toBe(false);
      expect(result.code).toBe('IN_USE');
      expect(result.usage.is_in_use).toBe(true);
    });

    it('returns error when getPlaylistUsage fails', async () => {
      const { supabase } = await import('../../../src/supabase');

      // Mock RPC to return error
      supabase.rpc.mockResolvedValueOnce({
        data: { error: 'Database error' },
        error: null
      });

      const { deletePlaylistSafely } = await import('../../../src/services/playlistService');

      const result = await deletePlaylistSafely('playlist-123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Database error');
    });
  });

  describe('createPlaylist', () => {
    it('requires authentication', async () => {
      const { supabase } = await import('../../../src/supabase');

      // Mock no user
      supabase.auth.getUser.mockResolvedValueOnce({
        data: { user: null }
      });

      const { createPlaylist } = await import('../../../src/services/playlistService');

      await expect(createPlaylist({ name: 'Test' })).rejects.toThrow('User must be authenticated');
    });
  });

  describe('updatePlaylist', () => {
    it('only allows whitelisted fields', async () => {
      const { supabase } = await import('../../../src/supabase');

      const mockUpdate = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockSelect = vi.fn().mockReturnThis();
      const mockSingle = vi.fn().mockResolvedValue({
        data: { id: 'test-id', name: 'Updated' },
        error: null
      });

      supabase.from.mockReturnValue({
        update: mockUpdate,
        eq: mockEq,
        select: mockSelect,
        single: mockSingle
      });

      const { updatePlaylist } = await import('../../../src/services/playlistService');

      await updatePlaylist('test-id', {
        name: 'Updated',
        owner_id: 'should-be-filtered', // Should not be allowed
        malicious_field: 'ignored'
      });

      // Verify that the update was called
      expect(mockUpdate).toHaveBeenCalled();

      // Get the actual call arguments
      const updateArg = mockUpdate.mock.calls[0][0];

      // Should only contain allowed fields
      expect(updateArg).toHaveProperty('name', 'Updated');
      expect(updateArg).not.toHaveProperty('owner_id');
      expect(updateArg).not.toHaveProperty('malicious_field');
    });
  });
});

describe('playlistService defaults', () => {
  it('createPlaylist has sensible defaults', async () => {
    const { supabase } = await import('../../../src/supabase');

    const mockInsert = vi.fn().mockReturnThis();
    const mockSelect = vi.fn().mockReturnThis();
    const mockSingle = vi.fn().mockResolvedValue({
      data: {
        id: 'new-playlist-id',
        name: 'Test Playlist',
        description: null,
        default_duration: 10,
        transition_effect: 'fade',
        shuffle: false
      },
      error: null
    });

    supabase.from.mockReturnValue({
      insert: mockInsert,
      select: mockSelect,
      single: mockSingle
    });

    supabase.auth.getUser.mockResolvedValueOnce({
      data: { user: { id: 'test-user' } }
    });

    const { createPlaylist } = await import('../../../src/services/playlistService');

    const result = await createPlaylist({ name: 'Test Playlist' });

    // Verify insert was called with defaults
    expect(mockInsert).toHaveBeenCalled();
    const insertArg = mockInsert.mock.calls[0][0];

    expect(insertArg.name).toBe('Test Playlist');
    expect(insertArg.description).toBeNull();
    expect(insertArg.default_duration).toBe(10);
    expect(insertArg.transition_effect).toBe('fade');
    expect(insertArg.shuffle).toBe(false);
  });
});
