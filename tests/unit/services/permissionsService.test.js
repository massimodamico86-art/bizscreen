/**
 * Permissions Service Unit Tests
 * Phase 12: Tests for role-based approval permissions
 *
 * Tests requiresApproval and canApproveContent functions to verify:
 * - APR-01: Content submission (editors/viewers require approval)
 * - APR-03: Approve/reject (owners/managers can approve)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock supabase before importing the service
vi.mock('../../../src/supabase', () => ({
  supabase: {
    auth: {
      getUser: vi.fn(),
    },
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn(),
    })),
  },
}));

// Mock tenantService
vi.mock('../../../src/services/tenantService', () => ({
  getEffectiveOwnerId: vi.fn(),
  isImpersonating: vi.fn(() => false),
}));

// Mock loggingService to suppress logger errors in tests
vi.mock('../../../src/services/loggingService.js', () => ({
  createScopedLogger: vi.fn(() => ({
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  })),
}));

describe('permissionsService', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    // Reset module cache to clear permissions cache
    vi.resetModules();
  });

  describe('requiresApproval', () => {
    it('returns false for super_admin', async () => {
      const { supabase } = await import('../../../src/supabase');
      const { getEffectiveOwnerId } = await import('../../../src/services/tenantService');

      supabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });
      getEffectiveOwnerId.mockResolvedValue('tenant-1');

      // Profile role query returns super_admin
      supabase.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: { role: 'super_admin' }, error: null }),
      });

      const { requiresApproval } = await import('../../../src/services/permissionsService');
      const result = await requiresApproval();

      expect(result).toBe(false);
    });

    it('returns false for admin', async () => {
      const { supabase } = await import('../../../src/supabase');
      const { getEffectiveOwnerId } = await import('../../../src/services/tenantService');

      supabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });
      getEffectiveOwnerId.mockResolvedValue('tenant-1');

      // Profile role query returns admin
      supabase.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: { role: 'admin' }, error: null }),
      });

      const { requiresApproval } = await import('../../../src/services/permissionsService');
      const result = await requiresApproval();

      expect(result).toBe(false);
    });

    it('returns false for tenant owner (user is tenant)', async () => {
      const { supabase } = await import('../../../src/supabase');
      const { getEffectiveOwnerId } = await import('../../../src/services/tenantService');

      const userId = 'tenant-owner-1';
      supabase.auth.getUser.mockResolvedValue({ data: { user: { id: userId } } });
      getEffectiveOwnerId.mockResolvedValue(userId); // User is the tenant owner

      // Profile role query - client role but user is the tenant owner
      supabase.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: { role: 'client' }, error: null }),
      });

      const { requiresApproval } = await import('../../../src/services/permissionsService');
      const result = await requiresApproval();

      // Owner should not require approval
      expect(result).toBe(false);
    });

    it('returns false for manager', async () => {
      const { supabase } = await import('../../../src/supabase');
      const { getEffectiveOwnerId } = await import('../../../src/services/tenantService');

      supabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });
      getEffectiveOwnerId.mockResolvedValue('tenant-1');

      // First call for profile role, second for organization member role
      const profileCall = vi.fn().mockResolvedValue({ data: { role: 'client' }, error: null });
      const orgMemberCall = vi.fn().mockResolvedValue({ data: { role: 'manager' }, error: null });

      let callCount = 0;
      supabase.from.mockImplementation((table) => {
        callCount++;
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: callCount === 1 ? profileCall : orgMemberCall,
        };
      });

      const { requiresApproval } = await import('../../../src/services/permissionsService');
      const result = await requiresApproval();

      expect(result).toBe(false);
    });

    it('returns true for editor', async () => {
      const { supabase } = await import('../../../src/supabase');
      const { getEffectiveOwnerId } = await import('../../../src/services/tenantService');

      supabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });
      getEffectiveOwnerId.mockResolvedValue('tenant-1');

      // Mock profile query first, then org member query
      let callCount = 0;
      supabase.from.mockImplementation((table) => {
        callCount++;
        if (table === 'profiles') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: { role: 'client' }, error: null }),
          };
        }
        if (table === 'organization_members') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: { role: 'editor' }, error: null }),
          };
        }
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: null, error: null }),
        };
      });

      const { requiresApproval } = await import('../../../src/services/permissionsService');
      const result = await requiresApproval();

      expect(result).toBe(true);
    });

    it('returns true for viewer', async () => {
      const { supabase } = await import('../../../src/supabase');
      const { getEffectiveOwnerId } = await import('../../../src/services/tenantService');

      supabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });
      getEffectiveOwnerId.mockResolvedValue('tenant-1');

      supabase.from.mockImplementation((table) => {
        if (table === 'profiles') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: { role: 'client' }, error: null }),
          };
        }
        if (table === 'organization_members') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: { role: 'viewer' }, error: null }),
          };
        }
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: null, error: null }),
        };
      });

      const { requiresApproval } = await import('../../../src/services/permissionsService');
      const result = await requiresApproval();

      expect(result).toBe(true);
    });

    it('returns true when user has no organization membership', async () => {
      const { supabase } = await import('../../../src/supabase');
      const { getEffectiveOwnerId } = await import('../../../src/services/tenantService');

      supabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });
      getEffectiveOwnerId.mockResolvedValue('tenant-1');

      supabase.from.mockImplementation((table) => {
        if (table === 'profiles') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: { role: 'client' }, error: null }),
          };
        }
        if (table === 'organization_members') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } }),
          };
        }
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: null, error: null }),
        };
      });

      const { requiresApproval } = await import('../../../src/services/permissionsService');
      const result = await requiresApproval();

      // No membership means requires approval (default safe)
      expect(result).toBe(true);
    });
  });

  describe('canApproveContent', () => {
    it('returns true for super_admin', async () => {
      const { supabase } = await import('../../../src/supabase');
      const { getEffectiveOwnerId } = await import('../../../src/services/tenantService');

      supabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });
      getEffectiveOwnerId.mockResolvedValue('tenant-1');

      supabase.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: { role: 'super_admin' }, error: null }),
      });

      const { canApproveContent } = await import('../../../src/services/permissionsService');
      const result = await canApproveContent();

      expect(result).toBe(true);
    });

    it('returns true for admin', async () => {
      const { supabase } = await import('../../../src/supabase');
      const { getEffectiveOwnerId } = await import('../../../src/services/tenantService');

      supabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });
      getEffectiveOwnerId.mockResolvedValue('tenant-1');

      supabase.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: { role: 'admin' }, error: null }),
      });

      const { canApproveContent } = await import('../../../src/services/permissionsService');
      const result = await canApproveContent();

      expect(result).toBe(true);
    });

    it('returns true for owner', async () => {
      const { supabase } = await import('../../../src/supabase');
      const { getEffectiveOwnerId } = await import('../../../src/services/tenantService');

      const userId = 'tenant-owner-1';
      supabase.auth.getUser.mockResolvedValue({ data: { user: { id: userId } } });
      getEffectiveOwnerId.mockResolvedValue(userId); // User is the tenant owner

      supabase.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: { role: 'client' }, error: null }),
      });

      const { canApproveContent } = await import('../../../src/services/permissionsService');
      const result = await canApproveContent();

      expect(result).toBe(true);
    });

    it('returns true for manager', async () => {
      const { supabase } = await import('../../../src/supabase');
      const { getEffectiveOwnerId } = await import('../../../src/services/tenantService');

      supabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });
      getEffectiveOwnerId.mockResolvedValue('tenant-1');

      supabase.from.mockImplementation((table) => {
        if (table === 'profiles') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: { role: 'client' }, error: null }),
          };
        }
        if (table === 'organization_members') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: { role: 'manager' }, error: null }),
          };
        }
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: null, error: null }),
        };
      });

      const { canApproveContent } = await import('../../../src/services/permissionsService');
      const result = await canApproveContent();

      expect(result).toBe(true);
    });

    it('returns false for editor', async () => {
      const { supabase } = await import('../../../src/supabase');
      const { getEffectiveOwnerId } = await import('../../../src/services/tenantService');

      supabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });
      getEffectiveOwnerId.mockResolvedValue('tenant-1');

      supabase.from.mockImplementation((table) => {
        if (table === 'profiles') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: { role: 'client' }, error: null }),
          };
        }
        if (table === 'organization_members') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: { role: 'editor' }, error: null }),
          };
        }
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: null, error: null }),
        };
      });

      const { canApproveContent } = await import('../../../src/services/permissionsService');
      const result = await canApproveContent();

      expect(result).toBe(false);
    });

    it('returns false for viewer', async () => {
      const { supabase } = await import('../../../src/supabase');
      const { getEffectiveOwnerId } = await import('../../../src/services/tenantService');

      supabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });
      getEffectiveOwnerId.mockResolvedValue('tenant-1');

      supabase.from.mockImplementation((table) => {
        if (table === 'profiles') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: { role: 'client' }, error: null }),
          };
        }
        if (table === 'organization_members') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: { role: 'viewer' }, error: null }),
          };
        }
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: null, error: null }),
        };
      });

      const { canApproveContent } = await import('../../../src/services/permissionsService');
      const result = await canApproveContent();

      expect(result).toBe(false);
    });
  });

  describe('getCurrentMemberRole', () => {
    it('returns owner when user is tenant owner', async () => {
      const { supabase } = await import('../../../src/supabase');
      const { getEffectiveOwnerId } = await import('../../../src/services/tenantService');

      const userId = 'tenant-owner-1';
      supabase.auth.getUser.mockResolvedValue({ data: { user: { id: userId } } });
      getEffectiveOwnerId.mockResolvedValue(userId);

      const { getCurrentMemberRole } = await import('../../../src/services/permissionsService');
      const result = await getCurrentMemberRole();

      expect(result).toBe('owner');
    });

    it('returns null when user is not authenticated', async () => {
      const { supabase } = await import('../../../src/supabase');
      const { getEffectiveOwnerId } = await import('../../../src/services/tenantService');

      supabase.auth.getUser.mockResolvedValue({ data: { user: null } });
      getEffectiveOwnerId.mockResolvedValue('tenant-1');

      const { getCurrentMemberRole } = await import('../../../src/services/permissionsService');
      const result = await getCurrentMemberRole();

      expect(result).toBeNull();
    });

    it('returns null when no tenant context', async () => {
      const { supabase } = await import('../../../src/supabase');
      const { getEffectiveOwnerId } = await import('../../../src/services/tenantService');

      supabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });
      getEffectiveOwnerId.mockResolvedValue(null);

      const { getCurrentMemberRole } = await import('../../../src/services/permissionsService');
      const result = await getCurrentMemberRole();

      expect(result).toBeNull();
    });
  });

  describe('clearPermissionsCache', () => {
    it('exports clearPermissionsCache function', async () => {
      const permissionsService = await import('../../../src/services/permissionsService');
      expect(typeof permissionsService.clearPermissionsCache).toBe('function');
    });
  });

  describe('API function exports', () => {
    it('exports all required permission functions', async () => {
      const permissionsService = await import('../../../src/services/permissionsService');

      // Role checks
      expect(typeof permissionsService.getCurrentMemberRole).toBe('function');
      expect(typeof permissionsService.getProfileRole).toBe('function');
      expect(typeof permissionsService.isSuperAdmin).toBe('function');
      expect(typeof permissionsService.isAdmin).toBe('function');
      expect(typeof permissionsService.isOwner).toBe('function');
      expect(typeof permissionsService.isAtLeastManager).toBe('function');
      expect(typeof permissionsService.isAtLeastEditor).toBe('function');
      expect(typeof permissionsService.isViewerOnly).toBe('function');

      // Approval checks
      expect(typeof permissionsService.requiresApproval).toBe('function');
      expect(typeof permissionsService.canApproveContent).toBe('function');

      // Capability checks
      expect(typeof permissionsService.canManageBilling).toBe('function');
      expect(typeof permissionsService.canManageTeam).toBe('function');
      expect(typeof permissionsService.canManageLocations).toBe('function');
      expect(typeof permissionsService.canEditContent).toBe('function');
      expect(typeof permissionsService.canEditScreens).toBe('function');

      // Utility
      expect(typeof permissionsService.clearPermissionsCache).toBe('function');
      expect(typeof permissionsService.getAllPermissions).toBe('function');
      expect(typeof permissionsService.getPermissions).toBe('function');
      expect(typeof permissionsService.refreshPermissions).toBe('function');
    });
  });
});
