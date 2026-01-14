/**
 * Admin Service Unit Tests
 * Phase 17: Tests for admin panel operations
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  PLAN_OPTIONS,
  TENANT_STATUS_OPTIONS,
  QUOTA_FEATURE_NAMES,
} from '../../../src/services/adminService';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock supabase
vi.mock('../../../src/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({
        data: { session: { access_token: 'test-token' } },
      }),
    },
  },
}));

describe('adminService', () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('PLAN_OPTIONS', () => {
    it('contains all required plan types', () => {
      expect(PLAN_OPTIONS).toHaveLength(5);
      expect(PLAN_OPTIONS.map(p => p.value)).toEqual([
        'free', 'starter', 'pro', 'enterprise', 'reseller'
      ]);
    });

    it('has correct labels for each plan', () => {
      const planMap = Object.fromEntries(PLAN_OPTIONS.map(p => [p.value, p.label]));
      expect(planMap.free).toBe('Free');
      expect(planMap.starter).toBe('Starter');
      expect(planMap.pro).toBe('Pro');
      expect(planMap.enterprise).toBe('Enterprise');
      expect(planMap.reseller).toBe('Reseller');
    });
  });

  describe('TENANT_STATUS_OPTIONS', () => {
    it('contains all required status types', () => {
      expect(TENANT_STATUS_OPTIONS).toHaveLength(3);
      expect(TENANT_STATUS_OPTIONS.map(s => s.value)).toEqual([
        'active', 'suspended', 'pending'
      ]);
    });

    it('has correct colors for each status', () => {
      const statusMap = Object.fromEntries(TENANT_STATUS_OPTIONS.map(s => [s.value, s.color]));
      expect(statusMap.active).toBe('green');
      expect(statusMap.suspended).toBe('red');
      expect(statusMap.pending).toBe('yellow');
    });

    it('has correct labels for each status', () => {
      const statusMap = Object.fromEntries(TENANT_STATUS_OPTIONS.map(s => [s.value, s.label]));
      expect(statusMap.active).toBe('Active');
      expect(statusMap.suspended).toBe('Suspended');
      expect(statusMap.pending).toBe('Pending');
    });
  });

  describe('QUOTA_FEATURE_NAMES', () => {
    it('contains all required quota features', () => {
      const expectedFeatures = [
        'ai_assistant',
        'campaigns',
        'audit_logs',
        'api_calls',
        'screen_groups',
        'bulk_operations',
        'webhooks',
      ];

      expectedFeatures.forEach(feature => {
        expect(QUOTA_FEATURE_NAMES).toHaveProperty(feature);
      });
    });

    it('has human-readable names for all features', () => {
      expect(QUOTA_FEATURE_NAMES.ai_assistant).toBe('AI Assistant Requests');
      expect(QUOTA_FEATURE_NAMES.campaigns).toBe('Campaign Creations');
      expect(QUOTA_FEATURE_NAMES.audit_logs).toBe('Audit Log Entries');
      expect(QUOTA_FEATURE_NAMES.api_calls).toBe('API Calls');
      expect(QUOTA_FEATURE_NAMES.screen_groups).toBe('Screen Group Operations');
      expect(QUOTA_FEATURE_NAMES.bulk_operations).toBe('Bulk Operations');
      expect(QUOTA_FEATURE_NAMES.webhooks).toBe('Webhook Deliveries');
    });
  });

  describe('API call helper functions', () => {
    it('uses correct plan values', () => {
      // Verify plan values are lowercase
      PLAN_OPTIONS.forEach(plan => {
        expect(plan.value).toBe(plan.value.toLowerCase());
      });
    });

    it('uses correct status values', () => {
      // Verify status values are lowercase
      TENANT_STATUS_OPTIONS.forEach(status => {
        expect(status.value).toBe(status.value.toLowerCase());
      });
    });
  });

  describe('Plan ordering', () => {
    it('plans are ordered from lowest to highest tier', () => {
      const expectedOrder = ['free', 'starter', 'pro', 'enterprise', 'reseller'];
      const actualOrder = PLAN_OPTIONS.map(p => p.value);
      expect(actualOrder).toEqual(expectedOrder);
    });
  });

  describe('Status validation', () => {
    it('active status has green color', () => {
      const active = TENANT_STATUS_OPTIONS.find(s => s.value === 'active');
      expect(active?.color).toBe('green');
    });

    it('suspended status has red color', () => {
      const suspended = TENANT_STATUS_OPTIONS.find(s => s.value === 'suspended');
      expect(suspended?.color).toBe('red');
    });

    it('pending status has yellow color', () => {
      const pending = TENANT_STATUS_OPTIONS.find(s => s.value === 'pending');
      expect(pending?.color).toBe('yellow');
    });
  });

  describe('Feature quota keys', () => {
    it('all quota keys are snake_case', () => {
      Object.keys(QUOTA_FEATURE_NAMES).forEach(key => {
        expect(key).toMatch(/^[a-z_]+$/);
      });
    });

    it('all quota names are human-readable', () => {
      Object.values(QUOTA_FEATURE_NAMES).forEach(name => {
        expect(name.length).toBeGreaterThan(0);
        // Should start with capital letter
        expect(name[0]).toBe(name[0].toUpperCase());
      });
    });
  });
});

describe('adminService API functions', () => {
  // These tests verify the API functions exist and have correct signatures
  // Actual API calls are tested in integration tests

  it('exports all required admin functions', async () => {
    const adminService = await import('../../../src/services/adminService');

    // Tenant management
    expect(typeof adminService.listTenants).toBe('function');
    expect(typeof adminService.getTenantById).toBe('function');
    expect(typeof adminService.updateTenantPlan).toBe('function');
    expect(typeof adminService.suspendTenant).toBe('function');

    // Feature flag overrides
    expect(typeof adminService.overrideFeatureFlag).toBe('function');

    // Quota overrides
    expect(typeof adminService.overrideQuota).toBe('function');

    // User management
    expect(typeof adminService.resetUserPassword).toBe('function');
    expect(typeof adminService.disableUser).toBe('function');

    // Screen management
    expect(typeof adminService.rebootScreen).toBe('function');
  });

  it('exports pre-existing admin functions', async () => {
    const adminService = await import('../../../src/services/adminService');

    // Pre-existing functions should still exist
    expect(typeof adminService.getAllUsers).toBe('function');
    expect(typeof adminService.getAllAdmins).toBe('function');
    expect(typeof adminService.getAllClients).toBe('function');
    expect(typeof adminService.getMyClients).toBe('function');
    expect(typeof adminService.createAdminUser).toBe('function');
    expect(typeof adminService.createClientUser).toBe('function');
    expect(typeof adminService.assignClientToAdmin).toBe('function');
    expect(typeof adminService.updateUserRole).toBe('function');
    expect(typeof adminService.deleteUser).toBe('function');
    expect(typeof adminService.getUserStatistics).toBe('function');
    expect(typeof adminService.getAdminMetrics).toBe('function');
    expect(typeof adminService.getClientListings).toBe('function');
    expect(typeof adminService.getAllManagedListings).toBe('function');
  });
});
