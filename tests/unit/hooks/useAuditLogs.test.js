/**
 * useAuditLogs Hook Unit Tests
 * Phase 18: Tests for audit log hooks
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useAuditLogs, useSystemEvents } from '../../../src/hooks/useAuditLogs';

// Mock the auth context
const mockUseAuth = vi.fn();
vi.mock('../../../src/contexts/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

// Mock the audit service
const mockListAuditLogs = vi.fn();
const mockListSystemEvents = vi.fn();

vi.mock('../../../src/services/auditService', () => ({
  listAuditLogs: (...args) => mockListAuditLogs(...args),
  listSystemEvents: (...args) => mockListSystemEvents(...args),
  getEventTypeLabel: (type) => type || 'Unknown',
  getEntityTypeLabel: (type) => type || 'Unknown',
  EVENT_TYPE_LABELS: {},
  ENTITY_TYPE_LABELS: {},
  SEVERITY_LEVELS: {
    debug: { label: 'Debug', color: 'gray' },
    info: { label: 'Info', color: 'blue' },
    warning: { label: 'Warning', color: 'yellow' },
    error: { label: 'Error', color: 'red' },
    critical: { label: 'Critical', color: 'purple' },
  },
  SYSTEM_SOURCES: {
    api: { label: 'API', color: 'blue' },
    scheduler: { label: 'Scheduler', color: 'purple' },
    system: { label: 'System', color: 'gray' },
    admin: { label: 'Admin', color: 'orange' },
    worker: { label: 'Worker', color: 'green' },
  },
}));

describe('useAuditLogs', () => {
  beforeEach(() => {
    mockUseAuth.mockReset();
    mockListAuditLogs.mockReset();
    mockListSystemEvents.mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('sets error when not admin', async () => {
    mockUseAuth.mockReturnValue({
      userProfile: { role: 'client' },
    });

    const { result } = renderHook(() => useAuditLogs());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.isAdmin).toBe(false);
    expect(result.current.error).toBe('Admin access required');
    expect(result.current.logs).toEqual([]);
  });

  it('fetches logs when admin', async () => {
    mockUseAuth.mockReturnValue({
      userProfile: { role: 'admin' },
    });

    mockListAuditLogs.mockResolvedValue({
      logs: [
        { id: '1', event_type: 'user.created', entity_type: 'user' },
        { id: '2', event_type: 'auth.login', entity_type: null },
      ],
      pagination: { page: 1, limit: 50, total: 2, totalPages: 1 },
      filters: { eventTypes: [], entityTypes: [] },
    });

    const { result } = renderHook(() => useAuditLogs());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.isAdmin).toBe(true);
    expect(result.current.error).toBeNull();
    expect(result.current.logs).toHaveLength(2);
    expect(mockListAuditLogs).toHaveBeenCalled();
  });

  it('fetches logs when super_admin', async () => {
    mockUseAuth.mockReturnValue({
      userProfile: { role: 'super_admin' },
    });

    mockListAuditLogs.mockResolvedValue({
      logs: [],
      pagination: { page: 1, limit: 50, total: 0, totalPages: 0 },
      filters: { eventTypes: [], entityTypes: [] },
    });

    const { result } = renderHook(() => useAuditLogs());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.isAdmin).toBe(true);
  });

  it('supports filtering', async () => {
    mockUseAuth.mockReturnValue({
      userProfile: { role: 'admin' },
    });

    mockListAuditLogs.mockResolvedValue({
      logs: [],
      pagination: { page: 1, limit: 50, total: 0, totalPages: 0 },
      filters: { eventTypes: [], entityTypes: [] },
    });

    const { result } = renderHook(() =>
      useAuditLogs({ event_type: 'auth.login' })
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.filters.event_type).toBe('auth.login');
  });

  it('handles updateFilters', async () => {
    mockUseAuth.mockReturnValue({
      userProfile: { role: 'admin' },
    });

    mockListAuditLogs.mockResolvedValue({
      logs: [],
      pagination: { page: 1, limit: 50, total: 0, totalPages: 0 },
      filters: { eventTypes: [], entityTypes: [] },
    });

    const { result } = renderHook(() => useAuditLogs());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    act(() => {
      result.current.updateFilters({ event_type: 'user.created' });
    });

    expect(result.current.filters.event_type).toBe('user.created');
  });

  it('handles clearFilters', async () => {
    mockUseAuth.mockReturnValue({
      userProfile: { role: 'admin' },
    });

    mockListAuditLogs.mockResolvedValue({
      logs: [],
      pagination: { page: 1, limit: 50, total: 0, totalPages: 0 },
      filters: { eventTypes: [], entityTypes: [] },
    });

    const { result } = renderHook(() =>
      useAuditLogs({ event_type: 'auth.login' })
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    act(() => {
      result.current.clearFilters();
    });

    expect(result.current.filters.event_type).toBe('');
    expect(result.current.filters.entity_type).toBe('');
    expect(result.current.filters.user_id).toBe('');
    expect(result.current.filters.start_date).toBe('');
    expect(result.current.filters.end_date).toBe('');
  });

  it('handles API errors gracefully', async () => {
    mockUseAuth.mockReturnValue({
      userProfile: { role: 'admin' },
    });

    mockListAuditLogs.mockRejectedValue(new Error('API Error'));

    const { result } = renderHook(() => useAuditLogs());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe('API Error');
    expect(result.current.logs).toEqual([]);
  });
});

describe('useSystemEvents', () => {
  beforeEach(() => {
    mockUseAuth.mockReset();
    mockListAuditLogs.mockReset();
    mockListSystemEvents.mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('sets error when not super_admin', async () => {
    mockUseAuth.mockReturnValue({
      userProfile: { role: 'admin' },
    });

    const { result } = renderHook(() => useSystemEvents());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.isSuperAdmin).toBe(false);
    expect(result.current.error).toBe('Super admin access required');
    expect(result.current.events).toEqual([]);
  });

  it('fetches events when super_admin', async () => {
    mockUseAuth.mockReturnValue({
      userProfile: { role: 'super_admin' },
    });

    mockListSystemEvents.mockResolvedValue({
      events: [
        { id: '1', source: 'api', event_type: 'system.startup', severity: 'info' },
        { id: '2', source: 'scheduler', event_type: 'cleanup.completed', severity: 'info' },
      ],
      pagination: { page: 1, limit: 50 },
      filters: { sources: [], severities: [] },
    });

    const { result } = renderHook(() => useSystemEvents());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.isSuperAdmin).toBe(true);
    expect(result.current.error).toBeNull();
    expect(result.current.events).toHaveLength(2);
    expect(mockListSystemEvents).toHaveBeenCalled();
  });

  it('supports filtering by severity', async () => {
    mockUseAuth.mockReturnValue({
      userProfile: { role: 'super_admin' },
    });

    mockListSystemEvents.mockResolvedValue({
      events: [],
      pagination: { page: 1, limit: 50 },
      filters: { sources: [], severities: [] },
    });

    const { result } = renderHook(() =>
      useSystemEvents({ severity: 'error' })
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.filters.severity).toBe('error');
  });

  it('supports filtering by source', async () => {
    mockUseAuth.mockReturnValue({
      userProfile: { role: 'super_admin' },
    });

    mockListSystemEvents.mockResolvedValue({
      events: [],
      pagination: { page: 1, limit: 50 },
      filters: { sources: [], severities: [] },
    });

    const { result } = renderHook(() =>
      useSystemEvents({ source: 'scheduler' })
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.filters.source).toBe('scheduler');
  });

  it('handles updateFilters', async () => {
    mockUseAuth.mockReturnValue({
      userProfile: { role: 'super_admin' },
    });

    mockListSystemEvents.mockResolvedValue({
      events: [],
      pagination: { page: 1, limit: 50 },
      filters: { sources: [], severities: [] },
    });

    const { result } = renderHook(() => useSystemEvents());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    act(() => {
      result.current.updateFilters({ severity: 'critical' });
    });

    expect(result.current.filters.severity).toBe('critical');
  });

  it('handles clearFilters', async () => {
    mockUseAuth.mockReturnValue({
      userProfile: { role: 'super_admin' },
    });

    mockListSystemEvents.mockResolvedValue({
      events: [],
      pagination: { page: 1, limit: 50 },
      filters: { sources: [], severities: [] },
    });

    const { result } = renderHook(() =>
      useSystemEvents({ source: 'api', severity: 'error' })
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    act(() => {
      result.current.clearFilters();
    });

    expect(result.current.filters.source).toBe('');
    expect(result.current.filters.severity).toBe('');
    expect(result.current.filters.start_date).toBe('');
    expect(result.current.filters.end_date).toBe('');
  });

  it('handles API errors gracefully', async () => {
    mockUseAuth.mockReturnValue({
      userProfile: { role: 'super_admin' },
    });

    mockListSystemEvents.mockRejectedValue(new Error('System Events API Error'));

    const { result } = renderHook(() => useSystemEvents());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe('System Events API Error');
    expect(result.current.events).toEqual([]);
  });
});

describe('Hook exports', () => {
  it('exports all required hooks', async () => {
    const auditHooks = await import('../../../src/hooks/useAuditLogs');

    expect(typeof auditHooks.useAuditLogs).toBe('function');
    expect(typeof auditHooks.useSystemEvents).toBe('function');
  });
});
