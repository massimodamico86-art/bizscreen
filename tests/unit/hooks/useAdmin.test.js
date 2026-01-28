/**
 * useAdmin Hook Unit Tests
 * Phase 17: Tests for admin panel hooks
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useAdminAccess } from '../../../src/hooks/useAdmin';

// Mock the auth context
const mockUseAuth = vi.fn();
vi.mock('../../../src/contexts/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

// Mock the admin service
vi.mock('../../../src/services/adminService', () => ({
  listTenants: vi.fn(),
  getTenantById: vi.fn(),
  updateTenantPlan: vi.fn(),
  suspendTenant: vi.fn(),
  overrideFeatureFlag: vi.fn(),
  overrideQuota: vi.fn(),
  resetUserPassword: vi.fn(),
  disableUser: vi.fn(),
  rebootScreen: vi.fn(),
  PLAN_OPTIONS: [
    { value: 'free', label: 'Free' },
    { value: 'starter', label: 'Starter' },
    { value: 'pro', label: 'Pro' },
    { value: 'enterprise', label: 'Enterprise' },
    { value: 'reseller', label: 'Reseller' },
  ],
  TENANT_STATUS_OPTIONS: [
    { value: 'active', label: 'Active', color: 'green' },
    { value: 'suspended', label: 'Suspended', color: 'red' },
    { value: 'pending', label: 'Pending', color: 'yellow' },
  ],
  QUOTA_FEATURE_NAMES: {
    ai_assistant: 'AI Assistant Requests',
    campaigns: 'Campaign Creations',
    audit_logs: 'Audit Log Entries',
  },
}));

describe('useAdminAccess', () => {
  beforeEach(() => {
    mockUseAuth.mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('returns loading true when auth is loading', () => {
    mockUseAuth.mockReturnValue({
      userProfile: null,
      loading: true,
    });

    const { result } = renderHook(() => useAdminAccess());

    expect(result.current.loading).toBe(true);
    expect(result.current.isSuperAdmin).toBe(false);
    expect(result.current.isAdmin).toBe(false);
  });

  it('returns isSuperAdmin true for super_admin role', () => {
    mockUseAuth.mockReturnValue({
      userProfile: { role: 'super_admin' },
      loading: false,
    });

    const { result } = renderHook(() => useAdminAccess());

    expect(result.current.loading).toBe(false);
    expect(result.current.isSuperAdmin).toBe(true);
    // super_admin also has admin rights (isAdmin includes super_admin)
    expect(result.current.isAdmin).toBe(true);
    expect(result.current.role).toBe('super_admin');
  });

  it('returns isAdmin true for admin role', () => {
    mockUseAuth.mockReturnValue({
      userProfile: { role: 'admin' },
      loading: false,
    });

    const { result } = renderHook(() => useAdminAccess());

    expect(result.current.loading).toBe(false);
    expect(result.current.isSuperAdmin).toBe(false);
    expect(result.current.isAdmin).toBe(true);
    expect(result.current.role).toBe('admin');
  });

  it('returns false for both admin flags for client role', () => {
    mockUseAuth.mockReturnValue({
      userProfile: { role: 'client' },
      loading: false,
    });

    const { result } = renderHook(() => useAdminAccess());

    expect(result.current.loading).toBe(false);
    expect(result.current.isSuperAdmin).toBe(false);
    expect(result.current.isAdmin).toBe(false);
    expect(result.current.role).toBe('client');
  });

  it('handles null userProfile gracefully', () => {
    mockUseAuth.mockReturnValue({
      userProfile: null,
      loading: false,
    });

    const { result } = renderHook(() => useAdminAccess());

    expect(result.current.loading).toBe(false);
    expect(result.current.isSuperAdmin).toBe(false);
    expect(result.current.isAdmin).toBe(false);
    // Using optional chaining, null?.role returns undefined
    expect(result.current.role).toBeUndefined();
  });

  it('handles undefined role gracefully', () => {
    mockUseAuth.mockReturnValue({
      userProfile: { role: undefined },
      loading: false,
    });

    const { result } = renderHook(() => useAdminAccess());

    expect(result.current.loading).toBe(false);
    expect(result.current.isSuperAdmin).toBe(false);
    expect(result.current.isAdmin).toBe(false);
    expect(result.current.role).toBeUndefined();
  });
});

describe('Admin hook exports', () => {
  it('exports all required hooks', async () => {
    const adminHooks = await import('../../../src/hooks/useAdmin');

    expect(typeof adminHooks.useTenantList).toBe('function');
    expect(typeof adminHooks.useTenantDetail).toBe('function');
    expect(typeof adminHooks.useAdminAccess).toBe('function');
  });
});

describe('Admin hook integration', () => {
  it('useAdminAccess updates when auth context changes', async () => {
    mockUseAuth.mockReturnValue({
      userProfile: { role: 'client' },
      loading: false,
    });

    const { result, rerender } = renderHook(() => useAdminAccess());

    expect(result.current.isSuperAdmin).toBe(false);

    // Simulate auth context update
    mockUseAuth.mockReturnValue({
      userProfile: { role: 'super_admin' },
      loading: false,
    });

    rerender();

    expect(result.current.isSuperAdmin).toBe(true);
  });

  it('returns correct role for all valid roles', () => {
    const roles = ['super_admin', 'admin', 'client'];

    roles.forEach(role => {
      mockUseAuth.mockReturnValue({
        userProfile: { role },
        loading: false,
      });

      const { result } = renderHook(() => useAdminAccess());
      expect(result.current.role).toBe(role);
    });
  });
});
