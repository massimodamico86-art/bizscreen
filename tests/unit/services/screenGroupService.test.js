/**
 * Screen Group Service Unit Tests
 * Tests for screen group CRUD and scene publishing operations
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
      in: vi.fn().mockReturnThis(),
      is: vi.fn().mockReturnThis(),
      or: vi.fn().mockReturnThis(),
      ilike: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: {}, error: null }),
    })),
    rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
  },
}));

describe('screenGroupService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('API function exports', () => {
    it('exports all required screen group CRUD functions', async () => {
      const service = await import('../../../src/services/screenGroupService');

      // Core CRUD
      expect(typeof service.fetchScreenGroups).toBe('function');
      expect(typeof service.getScreenGroup).toBe('function');
      expect(typeof service.createScreenGroup).toBe('function');
      expect(typeof service.updateScreenGroup).toBe('function');
      expect(typeof service.deleteScreenGroup).toBe('function');
    });

    it('exports screen assignment functions', async () => {
      const service = await import('../../../src/services/screenGroupService');

      expect(typeof service.getScreensInGroup).toBe('function');
      expect(typeof service.getUnassignedScreens).toBe('function');
      expect(typeof service.assignScreensToGroup).toBe('function');
      expect(typeof service.removeScreenFromGroup).toBe('function');
      expect(typeof service.removeScreensFromGroup).toBe('function');
    });

    it('exports scene publishing functions', async () => {
      const service = await import('../../../src/services/screenGroupService');

      expect(typeof service.publishSceneToGroup).toBe('function');
      expect(typeof service.unpublishSceneFromGroup).toBe('function');
      expect(typeof service.publishSceneToMultipleGroups).toBe('function');
      expect(typeof service.fetchScreenGroupsWithScenes).toBe('function');
      expect(typeof service.getGroupActiveScene).toBe('function');
    });

    it('exports utility functions', async () => {
      const service = await import('../../../src/services/screenGroupService');

      expect(typeof service.getScreenGroupOptions).toBe('function');
    });
  });

  describe('publishSceneToGroup', () => {
    it('throws error when group ID is missing', async () => {
      const { publishSceneToGroup } = await import('../../../src/services/screenGroupService');

      await expect(publishSceneToGroup(null, 'scene-123'))
        .rejects.toThrow('Group ID is required');
    });

    it('throws error when scene ID is missing', async () => {
      const { publishSceneToGroup } = await import('../../../src/services/screenGroupService');

      await expect(publishSceneToGroup('group-123', null))
        .rejects.toThrow('Scene ID is required');
    });

    it('calls RPC with correct parameters', async () => {
      const { supabase } = await import('../../../src/supabase');
      supabase.rpc.mockResolvedValueOnce({
        data: { success: true, devicesUpdated: 5 },
        error: null,
      });

      const { publishSceneToGroup } = await import('../../../src/services/screenGroupService');

      await publishSceneToGroup('group-123', 'scene-456', true);

      expect(supabase.rpc).toHaveBeenCalledWith('publish_scene_to_group', {
        p_group_id: 'group-123',
        p_scene_id: 'scene-456',
        p_update_devices: true,
      });
    });

    it('returns result from RPC', async () => {
      const { supabase } = await import('../../../src/supabase');
      const mockResult = { success: true, devicesUpdated: 5, groupName: 'Lobby TVs' };
      supabase.rpc.mockResolvedValueOnce({ data: mockResult, error: null });

      const { publishSceneToGroup } = await import('../../../src/services/screenGroupService');

      const result = await publishSceneToGroup('group-123', 'scene-456');

      expect(result).toEqual(mockResult);
    });

    it('throws error when RPC fails', async () => {
      const { supabase } = await import('../../../src/supabase');
      supabase.rpc.mockResolvedValueOnce({
        data: null,
        error: { message: 'RPC error' },
      });

      const { publishSceneToGroup } = await import('../../../src/services/screenGroupService');

      await expect(publishSceneToGroup('group-123', 'scene-456'))
        .rejects.toEqual({ message: 'RPC error' });
    });
  });

  describe('unpublishSceneFromGroup', () => {
    it('throws error when group ID is missing', async () => {
      const { unpublishSceneFromGroup } = await import('../../../src/services/screenGroupService');

      await expect(unpublishSceneFromGroup(null))
        .rejects.toThrow('Group ID is required');
    });

    it('calls RPC with correct parameters', async () => {
      const { supabase } = await import('../../../src/supabase');
      supabase.rpc.mockResolvedValueOnce({
        data: { success: true },
        error: null,
      });

      const { unpublishSceneFromGroup } = await import('../../../src/services/screenGroupService');

      await unpublishSceneFromGroup('group-123', false);

      expect(supabase.rpc).toHaveBeenCalledWith('unpublish_scene_from_group', {
        p_group_id: 'group-123',
        p_clear_devices: false,
      });
    });
  });

  describe('publishSceneToMultipleGroups', () => {
    it('throws error when group IDs array is empty', async () => {
      const { publishSceneToMultipleGroups } = await import('../../../src/services/screenGroupService');

      await expect(publishSceneToMultipleGroups([], 'scene-123'))
        .rejects.toThrow('At least one group ID is required');
    });

    it('throws error when scene ID is missing', async () => {
      const { publishSceneToMultipleGroups } = await import('../../../src/services/screenGroupService');

      await expect(publishSceneToMultipleGroups(['group-1'], null))
        .rejects.toThrow('Scene ID is required');
    });

    it('calls RPC with correct parameters', async () => {
      const { supabase } = await import('../../../src/supabase');
      supabase.rpc.mockResolvedValueOnce({
        data: { success: true, groupsUpdated: 2, totalDevicesUpdated: 10 },
        error: null,
      });

      const { publishSceneToMultipleGroups } = await import('../../../src/services/screenGroupService');

      await publishSceneToMultipleGroups(['group-1', 'group-2'], 'scene-456');

      expect(supabase.rpc).toHaveBeenCalledWith('publish_scene_to_multiple_groups', {
        p_group_ids: ['group-1', 'group-2'],
        p_scene_id: 'scene-456',
      });
    });
  });

  describe('fetchScreenGroupsWithScenes', () => {
    it('calls RPC with tenant ID parameter', async () => {
      const { supabase } = await import('../../../src/supabase');
      supabase.rpc.mockResolvedValueOnce({
        data: [{ id: 'group-1', name: 'Lobby', device_count: 5 }],
        error: null,
      });

      const { fetchScreenGroupsWithScenes } = await import('../../../src/services/screenGroupService');

      await fetchScreenGroupsWithScenes('tenant-123');

      expect(supabase.rpc).toHaveBeenCalledWith('get_screen_groups_with_scenes', {
        p_tenant_id: 'tenant-123',
      });
    });

    it('returns empty array when no groups found', async () => {
      const { supabase } = await import('../../../src/supabase');
      supabase.rpc.mockResolvedValueOnce({ data: null, error: null });

      const { fetchScreenGroupsWithScenes } = await import('../../../src/services/screenGroupService');

      const result = await fetchScreenGroupsWithScenes();

      expect(result).toEqual([]);
    });

    it('returns groups with scene info', async () => {
      const { supabase } = await import('../../../src/supabase');
      const mockGroups = [
        { id: 'group-1', name: 'Lobby', active_scene_name: 'Welcome Scene', device_count: 5 },
        { id: 'group-2', name: 'Bar Area', active_scene_name: null, device_count: 3 },
      ];
      supabase.rpc.mockResolvedValueOnce({ data: mockGroups, error: null });

      const { fetchScreenGroupsWithScenes } = await import('../../../src/services/screenGroupService');

      const result = await fetchScreenGroupsWithScenes();

      expect(result).toEqual(mockGroups);
      expect(result[0].active_scene_name).toBe('Welcome Scene');
      expect(result[1].active_scene_name).toBeNull();
    });
  });

  describe('getGroupActiveScene', () => {
    it('returns active scene when present', async () => {
      const { supabase } = await import('../../../src/supabase');
      const mockScene = { id: 'scene-1', name: 'Welcome', business_type: 'gym' };

      supabase.from.mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValueOnce({
          data: { active_scene_id: 'scene-1', active_scene: mockScene },
          error: null,
        }),
      });

      const { getGroupActiveScene } = await import('../../../src/services/screenGroupService');

      const result = await getGroupActiveScene('group-123');

      expect(result).toEqual(mockScene);
    });

    it('returns null when no active scene', async () => {
      const { supabase } = await import('../../../src/supabase');

      supabase.from.mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValueOnce({
          data: { active_scene_id: null, active_scene: null },
          error: null,
        }),
      });

      const { getGroupActiveScene } = await import('../../../src/services/screenGroupService');

      const result = await getGroupActiveScene('group-123');

      expect(result).toBeNull();
    });
  });

  describe('createScreenGroup', () => {
    it('throws error when name is empty', async () => {
      const { createScreenGroup } = await import('../../../src/services/screenGroupService');

      await expect(createScreenGroup({ name: '' }))
        .rejects.toThrow('Name is required');
    });

    it('throws error when name is whitespace only', async () => {
      const { createScreenGroup } = await import('../../../src/services/screenGroupService');

      await expect(createScreenGroup({ name: '   ' }))
        .rejects.toThrow('Name is required');
    });
  });

  describe('assignScreensToGroup', () => {
    it('returns 0 when no screen IDs provided', async () => {
      const { assignScreensToGroup } = await import('../../../src/services/screenGroupService');

      const result = await assignScreensToGroup('group-123', []);

      expect(result).toBe(0);
    });

    it('returns 0 when screen IDs is null', async () => {
      const { assignScreensToGroup } = await import('../../../src/services/screenGroupService');

      const result = await assignScreensToGroup('group-123', null);

      expect(result).toBe(0);
    });
  });

  describe('removeScreensFromGroup', () => {
    it('returns 0 when no screen IDs provided', async () => {
      const { removeScreensFromGroup } = await import('../../../src/services/screenGroupService');

      const result = await removeScreensFromGroup([]);

      expect(result).toBe(0);
    });
  });
});
