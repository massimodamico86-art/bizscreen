/**
 * Alert Engine Service Unit Tests
 *
 * Tests for alert raising, coalescing, acknowledging, and resolving.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock supabase before importing the service
// Create a flexible chainable mock that supports all Supabase query methods
const createChainableMock = (finalValue = { data: null, error: null }) => {
  const chain = {};
  const methods = ['select', 'insert', 'update', 'eq', 'is', 'in', 'order', 'limit', 'range'];
  methods.forEach((method) => {
    chain[method] = vi.fn(() => chain);
  });
  chain.single = vi.fn().mockResolvedValue(finalValue);
  return chain;
};

vi.mock('../../../src/supabase', () => ({
  supabase: {
    from: vi.fn(() => createChainableMock({ data: null, error: null })),
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-123' } } }),
    },
  },
}));

vi.mock('../../../src/services/tenantService', () => ({
  getEffectiveOwnerId: vi.fn().mockResolvedValue('test-tenant-123'),
}));

// Import after mocking
import {
  ALERT_TYPES,
  ALERT_SEVERITIES,
  ALERT_STATUSES,
  raiseAlert,
  acknowledgeAlert,
  resolveAlert,
  autoResolveAlert,
  getAlerts,
  getAlertSummary,
  bulkAcknowledge,
  bulkResolve,
  raiseDeviceOfflineAlert,
  raiseScreenshotFailedAlert,
  raiseDataSourceSyncFailedAlert,
  // Rate limiting exports
  configureRateLimit,
  getRateLimitConfig,
  resetRateLimits,
  // Performance metrics exports
  getPerformanceMetrics,
  resetPerformanceMetrics,
  setSlowOperationThreshold,
  // Escalation rules export
  getEscalationRules,
} from '../../../src/services/alertEngineService';

import { supabase } from '../../../src/supabase';
import { getEffectiveOwnerId } from '../../../src/services/tenantService';

// ============================================================================
// CONSTANTS TESTS
// ============================================================================

describe('alertEngineService constants', () => {
  describe('ALERT_TYPES', () => {
    it('exports device offline type', () => {
      expect(ALERT_TYPES.DEVICE_OFFLINE).toBe('device_offline');
    });

    it('exports device screenshot failed type', () => {
      expect(ALERT_TYPES.DEVICE_SCREENSHOT_FAILED).toBe('device_screenshot_failed');
    });

    it('exports device cache stale type', () => {
      expect(ALERT_TYPES.DEVICE_CACHE_STALE).toBe('device_cache_stale');
    });

    it('exports schedule missing scene type', () => {
      expect(ALERT_TYPES.SCHEDULE_MISSING_SCENE).toBe('schedule_missing_scene');
    });

    it('exports data source sync failed type', () => {
      expect(ALERT_TYPES.DATA_SOURCE_SYNC_FAILED).toBe('data_source_sync_failed');
    });

    it('exports social feed sync failed type', () => {
      expect(ALERT_TYPES.SOCIAL_FEED_SYNC_FAILED).toBe('social_feed_sync_failed');
    });
  });

  describe('ALERT_SEVERITIES', () => {
    it('exports info severity', () => {
      expect(ALERT_SEVERITIES.INFO).toBe('info');
    });

    it('exports warning severity', () => {
      expect(ALERT_SEVERITIES.WARNING).toBe('warning');
    });

    it('exports critical severity', () => {
      expect(ALERT_SEVERITIES.CRITICAL).toBe('critical');
    });
  });

  describe('ALERT_STATUSES', () => {
    it('exports open status', () => {
      expect(ALERT_STATUSES.OPEN).toBe('open');
    });

    it('exports acknowledged status', () => {
      expect(ALERT_STATUSES.ACKNOWLEDGED).toBe('acknowledged');
    });

    it('exports resolved status', () => {
      expect(ALERT_STATUSES.RESOLVED).toBe('resolved');
    });
  });
});

// ============================================================================
// RAISE ALERT TESTS
// ============================================================================

describe('alertEngineService raiseAlert', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates new alert when no existing alert matches', async () => {
    // Create fully chainable mock
    const createSelectChain = () => {
      const chain = {
        eq: vi.fn(() => chain),
        is: vi.fn(() => chain),
        limit: vi.fn(() => chain),
        single: vi.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } }),
      };
      return chain;
    };

    const mockFrom = vi.fn(() => ({
      select: vi.fn(() => createSelectChain()),
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({ data: { id: 'new-alert-123' }, error: null }),
        })),
      })),
    }));
    supabase.from = mockFrom;

    const result = await raiseAlert({
      type: ALERT_TYPES.DEVICE_OFFLINE,
      severity: ALERT_SEVERITIES.WARNING,
      title: 'Test Alert',
      message: 'Test message',
    });

    expect(result.alertId).toBe('new-alert-123');
    expect(result.isNew).toBe(true);
  });

  it('returns null alertId when no tenant ID available', async () => {
    getEffectiveOwnerId.mockResolvedValueOnce(null);

    const result = await raiseAlert({
      type: ALERT_TYPES.DEVICE_OFFLINE,
      severity: ALERT_SEVERITIES.WARNING,
      title: 'Test Alert',
      tenantId: null,
    });

    expect(result.alertId).toBeNull();
    expect(result.isNew).toBe(false);
  });

  it('uses provided tenantId when available', async () => {
    // Create fully chainable mock
    const createSelectChain = () => {
      const chain = {
        eq: vi.fn(() => chain),
        is: vi.fn(() => chain),
        limit: vi.fn(() => chain),
        single: vi.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } }),
      };
      return chain;
    };

    const mockFrom = vi.fn(() => ({
      select: vi.fn(() => createSelectChain()),
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({ data: { id: 'new-alert-456' }, error: null }),
        })),
      })),
    }));
    supabase.from = mockFrom;

    const result = await raiseAlert({
      type: ALERT_TYPES.DEVICE_OFFLINE,
      severity: ALERT_SEVERITIES.CRITICAL,
      title: 'Device Offline',
      tenantId: 'provided-tenant-id',
    });

    expect(result.alertId).toBe('new-alert-456');
  });
});

// ============================================================================
// ACKNOWLEDGE ALERT TESTS
// ============================================================================

describe('alertEngineService acknowledgeAlert', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('updates alert status to acknowledged', async () => {
    const mockUpdate = vi.fn(() => ({
      eq: vi.fn(() => ({
        eq: vi.fn().mockResolvedValue({ error: null }),
      })),
    }));
    supabase.from = vi.fn(() => ({ update: mockUpdate }));

    const result = await acknowledgeAlert('alert-123');

    expect(result).toBe(true);
  });

  it('returns false on error', async () => {
    const mockUpdate = vi.fn(() => ({
      eq: vi.fn(() => ({
        eq: vi.fn().mockResolvedValue({ error: new Error('Update failed') }),
      })),
    }));
    supabase.from = vi.fn(() => ({ update: mockUpdate }));

    const result = await acknowledgeAlert('alert-123');

    expect(result).toBe(false);
  });
});

// ============================================================================
// RESOLVE ALERT TESTS
// ============================================================================

describe('alertEngineService resolveAlert', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('updates alert status to resolved', async () => {
    const mockUpdate = vi.fn(() => ({
      eq: vi.fn(() => ({
        in: vi.fn().mockResolvedValue({ error: null }),
      })),
    }));
    supabase.from = vi.fn(() => ({ update: mockUpdate }));

    const result = await resolveAlert('alert-123');

    expect(result).toBe(true);
  });

  it('includes resolution notes when provided', async () => {
    const mockUpdate = vi.fn(() => ({
      eq: vi.fn(() => ({
        in: vi.fn().mockResolvedValue({ error: null }),
      })),
    }));
    supabase.from = vi.fn(() => ({ update: mockUpdate }));

    const result = await resolveAlert('alert-123', 'Fixed the issue');

    expect(result).toBe(true);
  });

  it('returns false on error', async () => {
    const mockUpdate = vi.fn(() => ({
      eq: vi.fn(() => ({
        in: vi.fn().mockResolvedValue({ error: new Error('Resolve failed') }),
      })),
    }));
    supabase.from = vi.fn(() => ({ update: mockUpdate }));

    const result = await resolveAlert('alert-123');

    expect(result).toBe(false);
  });
});

// ============================================================================
// AUTO-RESOLVE ALERT TESTS
// ============================================================================

describe('alertEngineService autoResolveAlert', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('auto-resolves matching alerts', async () => {
    // Chain: .update().eq().eq().in(status).select()
    const createChainedUpdate = (data) => {
      const chain = {
        eq: vi.fn(() => chain),
        in: vi.fn(() => chain),
        select: vi.fn().mockResolvedValue({ data, error: null }),
      };
      return chain;
    };
    supabase.from = vi.fn(() => ({ update: vi.fn(() => createChainedUpdate([{ id: '1' }, { id: '2' }])) }));

    const count = await autoResolveAlert({
      type: ALERT_TYPES.DEVICE_OFFLINE,
      deviceId: 'device-123',
    });

    expect(count).toBe(2);
  });

  it('returns 0 when no alerts match', async () => {
    const createChainedUpdate = (data) => {
      const chain = {
        eq: vi.fn(() => chain),
        in: vi.fn(() => chain),
        select: vi.fn().mockResolvedValue({ data, error: null }),
      };
      return chain;
    };
    supabase.from = vi.fn(() => ({ update: vi.fn(() => createChainedUpdate([])) }));

    const count = await autoResolveAlert({
      type: ALERT_TYPES.DEVICE_OFFLINE,
    });

    expect(count).toBe(0);
  });
});

// ============================================================================
// GET ALERTS TESTS
// ============================================================================

describe('alertEngineService getAlerts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches alerts with default parameters', async () => {
    const mockAlerts = [
      { id: '1', title: 'Alert 1', status: 'open' },
      { id: '2', title: 'Alert 2', status: 'open' },
    ];
    const mockSelect = vi.fn(() => ({
      order: vi.fn(() => ({
        range: vi.fn().mockResolvedValue({ data: mockAlerts, error: null, count: 2 }),
      })),
    }));
    supabase.from = vi.fn(() => ({ select: mockSelect }));

    const result = await getAlerts();

    expect(result.data).toEqual(mockAlerts);
    expect(result.count).toBe(2);
  });

  it('applies status filter', async () => {
    // Chain: .select().order().range().eq(status)
    // The chain must be awaitable (like a Promise)
    const createChainedSelect = () => {
      const chain = {
        eq: vi.fn(() => chain),
        in: vi.fn(() => chain),
        order: vi.fn(() => chain),
        range: vi.fn(() => chain),
        // Make the chain awaitable by implementing .then()
        then: vi.fn((resolve) => resolve({ data: [], error: null, count: 0 })),
      };
      return chain;
    };
    supabase.from = vi.fn(() => ({ select: vi.fn(() => createChainedSelect()) }));

    await getAlerts({ status: 'open' });

    expect(supabase.from).toHaveBeenCalledWith('alerts');
  });

  it('handles errors gracefully', async () => {
    const mockSelect = vi.fn(() => ({
      order: vi.fn(() => ({
        range: vi.fn().mockResolvedValue({ data: null, error: new Error('Fetch failed') }),
      })),
    }));
    supabase.from = vi.fn(() => ({ select: mockSelect }));

    await expect(getAlerts()).rejects.toThrow();
  });
});

// ============================================================================
// GET ALERT SUMMARY TESTS
// ============================================================================

describe('alertEngineService getAlertSummary', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns summary counts', async () => {
    const mockAlerts = [
      { status: 'open', severity: 'critical' },
      { status: 'open', severity: 'warning' },
      { status: 'open', severity: 'info' },
      { status: 'acknowledged', severity: 'warning' },
    ];
    const mockSelect = vi.fn().mockResolvedValue({ data: mockAlerts, error: null });
    supabase.from = vi.fn(() => ({ select: mockSelect }));

    const summary = await getAlertSummary();

    expect(summary.open).toBe(3);
    expect(summary.critical).toBe(1);
    expect(summary.warning).toBe(1);
    expect(summary.info).toBe(1);
    expect(summary.acknowledged).toBe(1);
  });

  it('returns zeros on error', async () => {
    const mockSelect = vi.fn().mockResolvedValue({ data: null, error: new Error('Error') });
    supabase.from = vi.fn(() => ({ select: mockSelect }));

    const summary = await getAlertSummary();

    expect(summary.open).toBe(0);
    expect(summary.critical).toBe(0);
    expect(summary.warning).toBe(0);
    expect(summary.info).toBe(0);
    expect(summary.acknowledged).toBe(0);
  });
});

// ============================================================================
// BULK OPERATIONS TESTS
// ============================================================================

describe('alertEngineService bulkOperations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('bulkAcknowledge updates multiple alerts', async () => {
    const mockUpdate = vi.fn(() => ({
      in: vi.fn(() => ({
        eq: vi.fn(() => ({
          select: vi.fn().mockResolvedValue({ data: [{ id: '1' }, { id: '2' }], error: null }),
        })),
      })),
    }));
    supabase.from = vi.fn(() => ({ update: mockUpdate }));

    const count = await bulkAcknowledge(['1', '2']);

    expect(count).toBe(2);
  });

  it('bulkResolve updates multiple alerts', async () => {
    const mockUpdate = vi.fn(() => ({
      in: vi.fn(() => ({
        in: vi.fn(() => ({
          select: vi.fn().mockResolvedValue({ data: [{ id: '1' }], error: null }),
        })),
      })),
    }));
    supabase.from = vi.fn(() => ({ update: mockUpdate }));

    const count = await bulkResolve(['1']);

    expect(count).toBe(1);
  });

  it('bulkResolve includes notes when provided', async () => {
    const mockUpdate = vi.fn(() => ({
      in: vi.fn(() => ({
        in: vi.fn(() => ({
          select: vi.fn().mockResolvedValue({ data: [], error: null }),
        })),
      })),
    }));
    supabase.from = vi.fn(() => ({ update: mockUpdate }));

    await bulkResolve(['1'], 'Bulk resolved');

    expect(supabase.from).toHaveBeenCalled();
  });
});

// ============================================================================
// HELPER FUNCTION TESTS
// ============================================================================

describe('alertEngineService helper functions', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default mock for raiseAlert calls with properly chained methods support
    // The chain can be: .eq().eq().is().is().eq().is().single() etc.
    const createChainedMethods = () => {
      const chainedMethods = {
        eq: vi.fn(() => chainedMethods),
        is: vi.fn(() => chainedMethods),
        limit: vi.fn(() => chainedMethods),
        single: vi.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } }),
      };
      return chainedMethods;
    };

    const mockFrom = vi.fn(() => ({
      select: vi.fn(() => createChainedMethods()),
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({ data: { id: 'new-alert' }, error: null }),
        })),
      })),
    }));
    supabase.from = mockFrom;
  });

  describe('raiseDeviceOfflineAlert', () => {
    it('raises warning for 15-60 minute offline', async () => {
      const device = { id: 'device-1', name: 'TV 1', tenant_id: 'tenant-1' };
      const result = await raiseDeviceOfflineAlert(device, 30);

      expect(result.alertId).toBe('new-alert');
    });

    it('raises critical for 60+ minute offline', async () => {
      const device = { id: 'device-1', name: 'TV 1', tenant_id: 'tenant-1' };
      const result = await raiseDeviceOfflineAlert(device, 120);

      expect(result.alertId).toBe('new-alert');
    });
  });

  describe('raiseScreenshotFailedAlert', () => {
    it('raises warning for few failures', async () => {
      const device = { id: 'device-1', name: 'TV 1', tenant_id: 'tenant-1' };
      const result = await raiseScreenshotFailedAlert(device, 3, 'Network error');

      expect(result.alertId).toBe('new-alert');
    });

    it('raises critical for many failures', async () => {
      const device = { id: 'device-1', name: 'TV 1', tenant_id: 'tenant-1' };
      const result = await raiseScreenshotFailedAlert(device, 10, 'Timeout');

      expect(result.alertId).toBe('new-alert');
    });
  });

  describe('raiseDataSourceSyncFailedAlert', () => {
    it('raises alert for data source sync failure', async () => {
      const dataSource = { id: 'ds-1', name: 'Google Sheet', type: 'google_sheets', tenant_id: 'tenant-1' };
      const error = { message: 'API error', code: 'SYNC_FAILED' };
      const result = await raiseDataSourceSyncFailedAlert(dataSource, error);

      expect(result.alertId).toBe('new-alert');
    });
  });
});

// ============================================================================
// RATE LIMITING TESTS
// ============================================================================

describe('alertEngineService rate limiting', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetRateLimits();
    // Reset to default config
    configureRateLimit({
      maxAlertsPerWindow: 5,
      windowMs: 60000,
      enabled: true,
    });
  });

  describe('configureRateLimit', () => {
    it('updates maxAlertsPerWindow', () => {
      configureRateLimit({ maxAlertsPerWindow: 10 });
      const config = getRateLimitConfig();
      expect(config.maxAlertsPerWindow).toBe(10);
    });

    it('updates windowMs', () => {
      configureRateLimit({ windowMs: 120000 });
      const config = getRateLimitConfig();
      expect(config.windowMs).toBe(120000);
    });

    it('updates enabled flag', () => {
      configureRateLimit({ enabled: false });
      const config = getRateLimitConfig();
      expect(config.enabled).toBe(false);
    });

    it('supports partial updates', () => {
      configureRateLimit({ maxAlertsPerWindow: 3 });
      const config = getRateLimitConfig();
      expect(config.maxAlertsPerWindow).toBe(3);
      expect(config.windowMs).toBe(60000); // unchanged
      expect(config.enabled).toBe(true); // unchanged
    });
  });

  describe('getRateLimitConfig', () => {
    it('returns current configuration', () => {
      const config = getRateLimitConfig();
      expect(config).toHaveProperty('maxAlertsPerWindow');
      expect(config).toHaveProperty('windowMs');
      expect(config).toHaveProperty('enabled');
    });

    it('returns a copy, not the original', () => {
      const config1 = getRateLimitConfig();
      const config2 = getRateLimitConfig();
      expect(config1).not.toBe(config2);
      expect(config1).toEqual(config2);
    });
  });

  describe('resetRateLimits', () => {
    it('clears rate limit state', () => {
      // This should not throw and should reset internal state
      expect(() => resetRateLimits()).not.toThrow();
    });
  });

  describe('rate limiting behavior', () => {
    it('allows alerts when rate limit is disabled', async () => {
      configureRateLimit({ enabled: false, maxAlertsPerWindow: 1 });

      // Create chainable mock
      const createChainedMethods = () => {
        const chain = {
          eq: vi.fn(() => chain),
          is: vi.fn(() => chain),
          limit: vi.fn(() => chain),
          single: vi.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } }),
        };
        return chain;
      };

      supabase.from = vi.fn(() => ({
        select: vi.fn(() => createChainedMethods()),
        insert: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({ data: { id: 'alert-1' }, error: null }),
          })),
        })),
      }));

      // Should not be rate limited even after multiple alerts
      const result1 = await raiseAlert({
        type: ALERT_TYPES.DEVICE_OFFLINE,
        severity: ALERT_SEVERITIES.WARNING,
        title: 'Test 1',
        tenantId: 'tenant-1',
        deviceId: 'device-1',
      });

      expect(result1.alertId).toBe('alert-1');
    });

    it('drops new alerts after rate limit threshold', async () => {
      // Set a very low limit for testing
      configureRateLimit({ maxAlertsPerWindow: 2, enabled: true });
      resetRateLimits();

      let alertCounter = 0;
      const createChainedMethods = () => {
        const chain = {
          eq: vi.fn(() => chain),
          is: vi.fn(() => chain),
          limit: vi.fn(() => chain),
          single: vi.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } }),
        };
        return chain;
      };

      supabase.from = vi.fn(() => ({
        select: vi.fn(() => createChainedMethods()),
        insert: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn().mockImplementation(() => {
              alertCounter++;
              return Promise.resolve({ data: { id: `alert-${alertCounter}` }, error: null });
            }),
          })),
        })),
      }));

      // First two alerts should succeed
      const result1 = await raiseAlert({
        type: ALERT_TYPES.DEVICE_OFFLINE,
        severity: ALERT_SEVERITIES.WARNING,
        title: 'Test 1',
        tenantId: 'tenant-1',
        deviceId: 'device-1',
      });
      expect(result1.alertId).toBe('alert-1');

      const result2 = await raiseAlert({
        type: ALERT_TYPES.DEVICE_OFFLINE,
        severity: ALERT_SEVERITIES.WARNING,
        title: 'Test 2',
        tenantId: 'tenant-1',
        deviceId: 'device-1',
      });
      expect(result2.alertId).toBe('alert-2');

      // Third alert should be rate limited
      const result3 = await raiseAlert({
        type: ALERT_TYPES.DEVICE_OFFLINE,
        severity: ALERT_SEVERITIES.WARNING,
        title: 'Test 3',
        tenantId: 'tenant-1',
        deviceId: 'device-1',
      });
      expect(result3.alertId).toBeNull();
      expect(result3.rateLimited).toBe(true);
    });

    it('uses different buckets for different devices', async () => {
      configureRateLimit({ maxAlertsPerWindow: 1, enabled: true });
      resetRateLimits();

      let alertCounter = 0;
      const createChainedMethods = () => {
        const chain = {
          eq: vi.fn(() => chain),
          is: vi.fn(() => chain),
          limit: vi.fn(() => chain),
          single: vi.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } }),
        };
        return chain;
      };

      supabase.from = vi.fn(() => ({
        select: vi.fn(() => createChainedMethods()),
        insert: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn().mockImplementation(() => {
              alertCounter++;
              return Promise.resolve({ data: { id: `alert-${alertCounter}` }, error: null });
            }),
          })),
        })),
      }));

      // Alert for device-1
      const result1 = await raiseAlert({
        type: ALERT_TYPES.DEVICE_OFFLINE,
        severity: ALERT_SEVERITIES.WARNING,
        title: 'Device 1 offline',
        tenantId: 'tenant-1',
        deviceId: 'device-1',
      });
      expect(result1.alertId).toBe('alert-1');

      // Alert for device-2 (different bucket)
      const result2 = await raiseAlert({
        type: ALERT_TYPES.DEVICE_OFFLINE,
        severity: ALERT_SEVERITIES.WARNING,
        title: 'Device 2 offline',
        tenantId: 'tenant-1',
        deviceId: 'device-2',
      });
      expect(result2.alertId).toBe('alert-2');
    });

    it('uses different buckets for different alert types', async () => {
      configureRateLimit({ maxAlertsPerWindow: 1, enabled: true });
      resetRateLimits();

      let alertCounter = 0;
      const createChainedMethods = () => {
        const chain = {
          eq: vi.fn(() => chain),
          is: vi.fn(() => chain),
          limit: vi.fn(() => chain),
          single: vi.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } }),
        };
        return chain;
      };

      supabase.from = vi.fn(() => ({
        select: vi.fn(() => createChainedMethods()),
        insert: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn().mockImplementation(() => {
              alertCounter++;
              return Promise.resolve({ data: { id: `alert-${alertCounter}` }, error: null });
            }),
          })),
        })),
      }));

      // Alert type 1
      const result1 = await raiseAlert({
        type: ALERT_TYPES.DEVICE_OFFLINE,
        severity: ALERT_SEVERITIES.WARNING,
        title: 'Offline',
        tenantId: 'tenant-1',
        deviceId: 'device-1',
      });
      expect(result1.alertId).toBe('alert-1');

      // Alert type 2 (different bucket)
      const result2 = await raiseAlert({
        type: ALERT_TYPES.DEVICE_SCREENSHOT_FAILED,
        severity: ALERT_SEVERITIES.WARNING,
        title: 'Screenshot failed',
        tenantId: 'tenant-1',
        deviceId: 'device-1',
      });
      expect(result2.alertId).toBe('alert-2');
    });
  });
});

// ============================================================================
// SEVERITY ESCALATION TESTS
// ============================================================================

describe('alertEngineService severity escalation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetRateLimits();
    configureRateLimit({ enabled: false }); // Disable rate limiting for escalation tests
  });

  describe('getEscalationRules', () => {
    it('returns escalation rules configuration', () => {
      const rules = getEscalationRules();
      expect(rules).toHaveProperty('device_offline');
      expect(rules).toHaveProperty('device_screenshot_failed');
      expect(rules).toHaveProperty('data_source_sync_failed');
      expect(rules).toHaveProperty('social_feed_sync_failed');
      expect(rules).toHaveProperty('device_cache_stale');
    });

    it('device_offline rule has 30 minute threshold', () => {
      const rules = getEscalationRules();
      expect(rules.device_offline.escalateToCriticalAfterMinutes).toBe(30);
    });

    it('device_screenshot_failed rule has 5 failure threshold', () => {
      const rules = getEscalationRules();
      expect(rules.device_screenshot_failed.escalateToCriticalAfterFailures).toBe(5);
    });

    it('data_source_sync_failed rule has 3 occurrence threshold in 24h', () => {
      const rules = getEscalationRules();
      expect(rules.data_source_sync_failed.escalateToCriticalAfterOccurrences).toBe(3);
      expect(rules.data_source_sync_failed.occurrenceWindowHours).toBe(24);
    });

    it('social_feed_sync_failed rule has 5 occurrence threshold in 24h', () => {
      const rules = getEscalationRules();
      expect(rules.social_feed_sync_failed.escalateToCriticalAfterOccurrences).toBe(5);
      expect(rules.social_feed_sync_failed.occurrenceWindowHours).toBe(24);
    });

    it('device_cache_stale rule has 24 hour threshold', () => {
      const rules = getEscalationRules();
      expect(rules.device_cache_stale.escalateToCriticalAfterHours).toBe(24);
    });
  });

  describe('severity escalation during coalesce', () => {
    it('escalates device_offline to critical after 30 minutes via meta', async () => {
      // Setup existing alert with warning severity
      const existingAlert = {
        id: 'alert-1',
        type: ALERT_TYPES.DEVICE_OFFLINE,
        severity: ALERT_SEVERITIES.WARNING,
        meta: { minutes_offline: 15 },
        occurrences: 1,
        created_at: new Date().toISOString(),
      };

      // Mock to find existing alert and update it
      const selectChain = {
        eq: vi.fn(() => selectChain),
        is: vi.fn(() => selectChain),
        limit: vi.fn(() => selectChain),
        single: vi.fn().mockResolvedValue({ data: existingAlert, error: null }),
      };

      const updateChain = {
        eq: vi.fn(() => updateChain),
        select: vi.fn(() => updateChain),
        single: vi.fn().mockResolvedValue({
          data: { ...existingAlert, severity: ALERT_SEVERITIES.CRITICAL, occurrences: 2 },
          error: null,
        }),
      };

      supabase.from = vi.fn(() => ({
        select: vi.fn(() => selectChain),
        update: vi.fn(() => updateChain),
      }));

      const result = await raiseAlert({
        type: ALERT_TYPES.DEVICE_OFFLINE,
        severity: ALERT_SEVERITIES.WARNING,
        title: 'Device offline',
        tenantId: 'tenant-1',
        deviceId: 'device-1',
        meta: { minutes_offline: 35 }, // Over 30 minute threshold
      });

      expect(result.isNew).toBe(false); // Coalesced
    });

    it('escalates device_screenshot_failed to critical after 5 failures', async () => {
      const existingAlert = {
        id: 'alert-2',
        type: ALERT_TYPES.DEVICE_SCREENSHOT_FAILED,
        severity: ALERT_SEVERITIES.WARNING,
        meta: { failure_count: 3 },
        occurrences: 3,
        created_at: new Date().toISOString(),
      };

      const selectChain = {
        eq: vi.fn(() => selectChain),
        is: vi.fn(() => selectChain),
        limit: vi.fn(() => selectChain),
        single: vi.fn().mockResolvedValue({ data: existingAlert, error: null }),
      };

      const updateChain = {
        eq: vi.fn(() => updateChain),
        select: vi.fn(() => updateChain),
        single: vi.fn().mockResolvedValue({
          data: { ...existingAlert, severity: ALERT_SEVERITIES.CRITICAL, occurrences: 4 },
          error: null,
        }),
      };

      supabase.from = vi.fn(() => ({
        select: vi.fn(() => selectChain),
        update: vi.fn(() => updateChain),
      }));

      const result = await raiseAlert({
        type: ALERT_TYPES.DEVICE_SCREENSHOT_FAILED,
        severity: ALERT_SEVERITIES.WARNING,
        title: 'Screenshot failed',
        tenantId: 'tenant-1',
        deviceId: 'device-1',
        meta: { failure_count: 6 }, // Over 5 failure threshold
      });

      expect(result.isNew).toBe(false);
    });

    it('does not downgrade already critical alerts', async () => {
      const existingAlert = {
        id: 'alert-3',
        type: ALERT_TYPES.DEVICE_OFFLINE,
        severity: ALERT_SEVERITIES.CRITICAL,
        meta: { minutes_offline: 60 },
        occurrences: 5,
        created_at: new Date().toISOString(),
      };

      const selectChain = {
        eq: vi.fn(() => selectChain),
        is: vi.fn(() => selectChain),
        limit: vi.fn(() => selectChain),
        single: vi.fn().mockResolvedValue({ data: existingAlert, error: null }),
      };

      const updateChain = {
        eq: vi.fn(() => updateChain),
        select: vi.fn(() => updateChain),
        single: vi.fn().mockResolvedValue({
          data: { ...existingAlert, occurrences: 6 },
          error: null,
        }),
      };

      supabase.from = vi.fn(() => ({
        select: vi.fn(() => selectChain),
        update: vi.fn(() => updateChain),
      }));

      const result = await raiseAlert({
        type: ALERT_TYPES.DEVICE_OFFLINE,
        severity: ALERT_SEVERITIES.WARNING, // Lower severity requested
        title: 'Device offline',
        tenantId: 'tenant-1',
        deviceId: 'device-1',
        meta: { minutes_offline: 10 }, // Lower than threshold
      });

      // Should coalesce but not downgrade
      expect(result.isNew).toBe(false);
    });
  });
});

// ============================================================================
// PERFORMANCE METRICS TESTS
// ============================================================================

describe('alertEngineService performance metrics', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetPerformanceMetrics();
    resetRateLimits();
    configureRateLimit({ enabled: false });
  });

  describe('getPerformanceMetrics', () => {
    it('returns metrics snapshot with counters', () => {
      const metrics = getPerformanceMetrics();
      expect(metrics).toHaveProperty('counters');
      expect(metrics.counters).toHaveProperty('alertsRaised');
      expect(metrics.counters).toHaveProperty('alertsCoalesced');
      expect(metrics.counters).toHaveProperty('alertsResolved');
      expect(metrics.counters).toHaveProperty('alertsDroppedRateLimit');
      expect(metrics.counters).toHaveProperty('alertsDroppedValidation');
      expect(metrics.counters).toHaveProperty('notificationsSent');
      expect(metrics.counters).toHaveProperty('notificationsFailed');
    });

    it('returns metrics with average timings', () => {
      const metrics = getPerformanceMetrics();
      expect(metrics).toHaveProperty('averageTimings');
    });

    it('returns metrics with slow operation threshold', () => {
      const metrics = getPerformanceMetrics();
      expect(metrics).toHaveProperty('slowOperationThresholdMs');
      expect(typeof metrics.slowOperationThresholdMs).toBe('number');
    });
  });

  describe('resetPerformanceMetrics', () => {
    it('resets all counters to zero', async () => {
      // First, create an alert to increment counters
      const createChainedMethods = () => {
        const chain = {
          eq: vi.fn(() => chain),
          is: vi.fn(() => chain),
          limit: vi.fn(() => chain),
          single: vi.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } }),
        };
        return chain;
      };

      supabase.from = vi.fn(() => ({
        select: vi.fn(() => createChainedMethods()),
        insert: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({ data: { id: 'alert-1' }, error: null }),
          })),
        })),
      }));

      await raiseAlert({
        type: ALERT_TYPES.DEVICE_OFFLINE,
        severity: ALERT_SEVERITIES.WARNING,
        title: 'Test',
        tenantId: 'tenant-1',
      });

      // Verify counters were incremented
      let metrics = getPerformanceMetrics();
      expect(metrics.counters.alertsRaised).toBeGreaterThan(0);

      // Reset
      resetPerformanceMetrics();

      // Verify counters are zero
      metrics = getPerformanceMetrics();
      expect(metrics.counters.alertsRaised).toBe(0);
      expect(metrics.counters.alertsCoalesced).toBe(0);
      expect(metrics.counters.alertsResolved).toBe(0);
    });
  });

  describe('setSlowOperationThreshold', () => {
    it('updates the slow operation threshold', () => {
      setSlowOperationThreshold(500);
      const metrics = getPerformanceMetrics();
      expect(metrics.slowOperationThresholdMs).toBe(500);
    });

    it('accepts different threshold values', () => {
      setSlowOperationThreshold(100);
      expect(getPerformanceMetrics().slowOperationThresholdMs).toBe(100);

      setSlowOperationThreshold(1000);
      expect(getPerformanceMetrics().slowOperationThresholdMs).toBe(1000);
    });
  });

  describe('counter increments', () => {
    it('increments alertsRaised for new alerts', async () => {
      resetPerformanceMetrics();

      const createChainedMethods = () => {
        const chain = {
          eq: vi.fn(() => chain),
          is: vi.fn(() => chain),
          limit: vi.fn(() => chain),
          single: vi.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } }),
        };
        return chain;
      };

      supabase.from = vi.fn(() => ({
        select: vi.fn(() => createChainedMethods()),
        insert: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({ data: { id: 'alert-1' }, error: null }),
          })),
        })),
      }));

      await raiseAlert({
        type: ALERT_TYPES.DEVICE_OFFLINE,
        severity: ALERT_SEVERITIES.WARNING,
        title: 'Test',
        tenantId: 'tenant-1',
      });

      const metrics = getPerformanceMetrics();
      expect(metrics.counters.alertsRaised).toBe(1);
    });

    it('increments alertsCoalesced for existing alerts', async () => {
      resetPerformanceMetrics();

      const existingAlert = {
        id: 'alert-1',
        type: ALERT_TYPES.DEVICE_OFFLINE,
        severity: ALERT_SEVERITIES.WARNING,
        meta: {},
        occurrences: 1,
        created_at: new Date().toISOString(),
        tenant_id: 'tenant-1',
      };

      const selectChain = {
        eq: vi.fn(() => selectChain),
        is: vi.fn(() => selectChain),
        limit: vi.fn(() => selectChain),
        single: vi.fn().mockResolvedValue({ data: existingAlert, error: null }),
      };

      const updateChain = {
        eq: vi.fn(() => updateChain),
        select: vi.fn(() => updateChain),
        single: vi.fn().mockResolvedValue({
          data: { ...existingAlert, occurrences: 2 },
          error: null,
        }),
      };

      supabase.from = vi.fn(() => ({
        select: vi.fn(() => selectChain),
        update: vi.fn(() => updateChain),
      }));

      await raiseAlert({
        type: ALERT_TYPES.DEVICE_OFFLINE,
        severity: ALERT_SEVERITIES.WARNING,
        title: 'Test',
        tenantId: 'tenant-1',
      });

      const metrics = getPerformanceMetrics();
      expect(metrics.counters.alertsCoalesced).toBe(1);
    });

    it('increments alertsDroppedValidation for invalid types', async () => {
      resetPerformanceMetrics();

      await raiseAlert({
        type: 'invalid_type',
        severity: ALERT_SEVERITIES.WARNING,
        title: 'Test',
        tenantId: 'tenant-1',
      });

      const metrics = getPerformanceMetrics();
      expect(metrics.counters.alertsDroppedValidation).toBe(1);
    });

    it('increments alertsDroppedValidation for invalid severity', async () => {
      resetPerformanceMetrics();

      await raiseAlert({
        type: ALERT_TYPES.DEVICE_OFFLINE,
        severity: 'invalid_severity',
        title: 'Test',
        tenantId: 'tenant-1',
      });

      const metrics = getPerformanceMetrics();
      expect(metrics.counters.alertsDroppedValidation).toBe(1);
    });

    it('increments alertsResolved on auto-resolve', async () => {
      resetPerformanceMetrics();

      const createChainedUpdate = () => {
        const chain = {
          eq: vi.fn(() => chain),
          in: vi.fn(() => chain),
          select: vi.fn().mockResolvedValue({ data: [{ id: '1' }, { id: '2' }], error: null }),
        };
        return chain;
      };

      supabase.from = vi.fn(() => ({
        update: vi.fn(() => createChainedUpdate()),
      }));

      await autoResolveAlert({
        type: ALERT_TYPES.DEVICE_OFFLINE,
        deviceId: 'device-1',
      });

      const metrics = getPerformanceMetrics();
      expect(metrics.counters.alertsResolved).toBe(2);
    });
  });
});

// ============================================================================
// NO-SPAM BEHAVIOR (COALESCING) TESTS
// ============================================================================

describe('alertEngineService no-spam behavior', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetRateLimits();
    resetPerformanceMetrics();
    configureRateLimit({ enabled: false });
  });

  describe('alert coalescing', () => {
    it('coalesces alerts with same type and device', async () => {
      const existingAlert = {
        id: 'existing-alert',
        type: ALERT_TYPES.DEVICE_OFFLINE,
        severity: ALERT_SEVERITIES.WARNING,
        meta: { minutes_offline: 10 },
        occurrences: 2,
        created_at: new Date().toISOString(),
        tenant_id: 'tenant-1',
      };

      const selectChain = {
        eq: vi.fn(() => selectChain),
        is: vi.fn(() => selectChain),
        limit: vi.fn(() => selectChain),
        single: vi.fn().mockResolvedValue({ data: existingAlert, error: null }),
      };

      const updateChain = {
        eq: vi.fn(() => updateChain),
        select: vi.fn(() => updateChain),
        single: vi.fn().mockResolvedValue({
          data: { ...existingAlert, occurrences: 3 },
          error: null,
        }),
      };

      supabase.from = vi.fn(() => ({
        select: vi.fn(() => selectChain),
        update: vi.fn(() => updateChain),
      }));

      const result = await raiseAlert({
        type: ALERT_TYPES.DEVICE_OFFLINE,
        severity: ALERT_SEVERITIES.WARNING,
        title: 'Device offline again',
        tenantId: 'tenant-1',
        deviceId: 'device-1',
        meta: { minutes_offline: 15 },
      });

      expect(result.alertId).toBe('existing-alert');
      expect(result.isNew).toBe(false);
    });

    it('creates new alert when no matching alert exists', async () => {
      const selectChain = {
        eq: vi.fn(() => selectChain),
        is: vi.fn(() => selectChain),
        limit: vi.fn(() => selectChain),
        single: vi.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } }),
      };

      supabase.from = vi.fn(() => ({
        select: vi.fn(() => selectChain),
        insert: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({ data: { id: 'new-alert' }, error: null }),
          })),
        })),
      }));

      const result = await raiseAlert({
        type: ALERT_TYPES.DEVICE_OFFLINE,
        severity: ALERT_SEVERITIES.WARNING,
        title: 'New device offline',
        tenantId: 'tenant-1',
        deviceId: 'device-new',
      });

      expect(result.alertId).toBe('new-alert');
      expect(result.isNew).toBe(true);
    });

    it('merges metadata during coalesce', async () => {
      const existingAlert = {
        id: 'alert-merge',
        type: ALERT_TYPES.DATA_SOURCE_SYNC_FAILED,
        severity: ALERT_SEVERITIES.WARNING,
        meta: {
          data_source_name: 'Test Source',
          first_failure: '2024-01-01T00:00:00Z',
        },
        occurrences: 1,
        created_at: new Date().toISOString(),
        tenant_id: 'tenant-1',
      };

      const selectChain = {
        eq: vi.fn(() => selectChain),
        is: vi.fn(() => selectChain),
        limit: vi.fn(() => selectChain),
        single: vi.fn().mockResolvedValue({ data: existingAlert, error: null }),
      };

      let capturedUpdate = null;
      const updateChain = {
        eq: vi.fn(() => updateChain),
        select: vi.fn(() => updateChain),
        single: vi.fn().mockImplementation(() => {
          return Promise.resolve({
            data: { ...existingAlert, occurrences: 2 },
            error: null,
          });
        }),
      };

      supabase.from = vi.fn(() => ({
        select: vi.fn(() => selectChain),
        update: vi.fn((data) => {
          capturedUpdate = data;
          return updateChain;
        }),
      }));

      await raiseAlert({
        type: ALERT_TYPES.DATA_SOURCE_SYNC_FAILED,
        severity: ALERT_SEVERITIES.WARNING,
        title: 'Sync failed again',
        tenantId: 'tenant-1',
        dataSourceId: 'ds-1',
        meta: {
          last_failure: '2024-01-02T00:00:00Z',
          error_count: 5,
        },
      });

      // The update should contain merged metadata
      expect(capturedUpdate).toBeDefined();
      if (capturedUpdate?.meta) {
        expect(capturedUpdate.meta).toHaveProperty('data_source_name');
        expect(capturedUpdate.meta).toHaveProperty('last_failure');
        expect(capturedUpdate.meta).toHaveProperty('error_count');
      }
    });

    it('increments occurrence count during coalesce', async () => {
      const existingAlert = {
        id: 'alert-count',
        type: ALERT_TYPES.DEVICE_SCREENSHOT_FAILED,
        severity: ALERT_SEVERITIES.WARNING,
        meta: {},
        occurrences: 5,
        created_at: new Date().toISOString(),
        tenant_id: 'tenant-1',
      };

      const selectChain = {
        eq: vi.fn(() => selectChain),
        is: vi.fn(() => selectChain),
        limit: vi.fn(() => selectChain),
        single: vi.fn().mockResolvedValue({ data: existingAlert, error: null }),
      };

      let capturedUpdate = null;
      const updateChain = {
        eq: vi.fn(() => updateChain),
        select: vi.fn(() => updateChain),
        single: vi.fn().mockResolvedValue({
          data: { ...existingAlert, occurrences: 6 },
          error: null,
        }),
      };

      supabase.from = vi.fn(() => ({
        select: vi.fn(() => selectChain),
        update: vi.fn((data) => {
          capturedUpdate = data;
          return updateChain;
        }),
      }));

      await raiseAlert({
        type: ALERT_TYPES.DEVICE_SCREENSHOT_FAILED,
        severity: ALERT_SEVERITIES.WARNING,
        title: 'Screenshot failed',
        tenantId: 'tenant-1',
        deviceId: 'device-1',
      });

      expect(capturedUpdate).toBeDefined();
      expect(capturedUpdate.occurrences).toBe(6);
    });

    it('updates last_occurred_at during coalesce', async () => {
      const oldDate = '2024-01-01T00:00:00.000Z';
      const existingAlert = {
        id: 'alert-timestamp',
        type: ALERT_TYPES.DEVICE_OFFLINE,
        severity: ALERT_SEVERITIES.WARNING,
        meta: {},
        occurrences: 1,
        created_at: oldDate,
        last_occurred_at: oldDate,
        tenant_id: 'tenant-1',
      };

      const selectChain = {
        eq: vi.fn(() => selectChain),
        is: vi.fn(() => selectChain),
        limit: vi.fn(() => selectChain),
        single: vi.fn().mockResolvedValue({ data: existingAlert, error: null }),
      };

      let capturedUpdate = null;
      const updateChain = {
        eq: vi.fn(() => updateChain),
        select: vi.fn(() => updateChain),
        single: vi.fn().mockResolvedValue({
          data: { ...existingAlert, occurrences: 2 },
          error: null,
        }),
      };

      supabase.from = vi.fn(() => ({
        select: vi.fn(() => selectChain),
        update: vi.fn((data) => {
          capturedUpdate = data;
          return updateChain;
        }),
      }));

      await raiseAlert({
        type: ALERT_TYPES.DEVICE_OFFLINE,
        severity: ALERT_SEVERITIES.WARNING,
        title: 'Offline again',
        tenantId: 'tenant-1',
        deviceId: 'device-1',
      });

      expect(capturedUpdate).toBeDefined();
      expect(capturedUpdate.last_occurred_at).toBeDefined();
      // The timestamp should be newer than the old one
      expect(new Date(capturedUpdate.last_occurred_at).getTime()).toBeGreaterThan(
        new Date(oldDate).getTime()
      );
    });

    it('allows coalescing even when rate limited', async () => {
      // Enable rate limiting with low threshold
      configureRateLimit({ maxAlertsPerWindow: 1, enabled: true });
      resetRateLimits();

      const existingAlert = {
        id: 'existing-alert',
        type: ALERT_TYPES.DEVICE_OFFLINE,
        severity: ALERT_SEVERITIES.WARNING,
        meta: {},
        occurrences: 5,
        created_at: new Date().toISOString(),
        tenant_id: 'tenant-1',
      };

      // First call: new alert (uses rate limit)
      let callCount = 0;
      const createSelectChain = () => {
        const chain = {
          eq: vi.fn(() => chain),
          is: vi.fn(() => chain),
          limit: vi.fn(() => chain),
          single: vi.fn().mockImplementation(() => {
            callCount++;
            if (callCount <= 1) {
              // First call: no existing alert
              return Promise.resolve({ data: null, error: { code: 'PGRST116' } });
            }
            // Subsequent calls: existing alert found
            return Promise.resolve({ data: existingAlert, error: null });
          }),
        };
        return chain;
      };

      const updateChain = {
        eq: vi.fn(() => updateChain),
        select: vi.fn(() => updateChain),
        single: vi.fn().mockResolvedValue({
          data: { ...existingAlert, occurrences: 6 },
          error: null,
        }),
      };

      supabase.from = vi.fn(() => ({
        select: vi.fn(() => createSelectChain()),
        insert: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({ data: { id: 'new-alert' }, error: null }),
          })),
        })),
        update: vi.fn(() => updateChain),
      }));

      // First alert - should succeed (new)
      const result1 = await raiseAlert({
        type: ALERT_TYPES.DEVICE_OFFLINE,
        severity: ALERT_SEVERITIES.WARNING,
        title: 'First alert',
        tenantId: 'tenant-1',
        deviceId: 'device-1',
      });
      expect(result1.alertId).toBe('new-alert');

      // Second alert - should coalesce (not create new, so not rate limited)
      const result2 = await raiseAlert({
        type: ALERT_TYPES.DEVICE_OFFLINE,
        severity: ALERT_SEVERITIES.WARNING,
        title: 'Second alert',
        tenantId: 'tenant-1',
        deviceId: 'device-1',
      });
      expect(result2.alertId).toBe('existing-alert');
      expect(result2.isNew).toBe(false);
    });
  });
});
