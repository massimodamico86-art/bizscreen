/**
 * useAuditLogs Hook
 * Phase 18: React hooks for audit logs and system events
 */

import { useState, useCallback, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
  listAuditLogs,
  listSystemEvents,
  getEventTypeLabel,
  getEntityTypeLabel,
} from '../services/auditService';

// ============================================================================
// AUDIT LOGS HOOK
// ============================================================================

/**
 * Hook for fetching and managing audit logs
 *
 * @param {Object} initialFilters - Initial filter values
 * @param {string} [tenantId] - Tenant ID (super admin can specify)
 * @returns {Object}
 */
export function useAuditLogs(initialFilters = {}, tenantId = null) {
  const { userProfile } = useAuth();
  const [logs, setLogs] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 50,
    total: 0,
    totalPages: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    event_type: '',
    entity_type: '',
    user_id: '',
    start_date: '',
    end_date: '',
    ...initialFilters,
  });
  const [filterOptions, setFilterOptions] = useState({
    eventTypes: [],
    entityTypes: [],
  });

  const isAdmin = userProfile?.role === 'admin' || userProfile?.role === 'super_admin';

  const fetchLogs = useCallback(
    async (page = 1) => {
      if (!isAdmin) {
        setError('Admin access required');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const result = await listAuditLogs({
          page,
          limit: pagination.limit,
          tenant_id: tenantId,
          ...filters,
        });

        setLogs(result.logs || []);
        setPagination(result.pagination || { page, limit: 50, total: 0, totalPages: 0 });
        setFilterOptions(result.filters || { eventTypes: [], entityTypes: [] });
      } catch (err) {
        console.error('Failed to fetch audit logs:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    },
    [isAdmin, filters, pagination.limit, tenantId]
  );

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const updateFilters = useCallback((newFilters) => {
    setFilters((prev) => ({ ...prev, ...newFilters }));
  }, []);

  const clearFilters = useCallback(() => {
    setFilters({
      event_type: '',
      entity_type: '',
      user_id: '',
      start_date: '',
      end_date: '',
    });
  }, []);

  const goToPage = useCallback(
    (page) => {
      fetchLogs(page);
    },
    [fetchLogs]
  );

  const refresh = useCallback(() => {
    fetchLogs(pagination.page);
  }, [fetchLogs, pagination.page]);

  // Transform logs with human-readable labels
  const formattedLogs = logs.map((log) => ({
    ...log,
    eventTypeLabel: getEventTypeLabel(log.event_type),
    entityTypeLabel: log.entity_type ? getEntityTypeLabel(log.entity_type) : null,
  }));

  return {
    logs: formattedLogs,
    pagination,
    loading,
    error,
    filters,
    filterOptions,
    updateFilters,
    clearFilters,
    goToPage,
    refresh,
    isAdmin,
  };
}

// ============================================================================
// SYSTEM EVENTS HOOK
// ============================================================================

/**
 * Hook for fetching and managing system events (super admin only)
 *
 * @param {Object} initialFilters - Initial filter values
 * @returns {Object}
 */
export function useSystemEvents(initialFilters = {}) {
  const { userProfile } = useAuth();
  const [events, setEvents] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 50,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    source: '',
    event_type: '',
    severity: '',
    start_date: '',
    end_date: '',
    ...initialFilters,
  });
  const [filterOptions, setFilterOptions] = useState({
    sources: [],
    severities: [],
  });

  const isSuperAdmin = userProfile?.role === 'super_admin';

  const fetchEvents = useCallback(
    async (page = 1) => {
      if (!isSuperAdmin) {
        setError('Super admin access required');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const result = await listSystemEvents({
          page,
          limit: pagination.limit,
          ...filters,
        });

        setEvents(result.events || []);
        setPagination({ page, limit: pagination.limit });
        setFilterOptions(result.filters || { sources: [], severities: [] });
      } catch (err) {
        console.error('Failed to fetch system events:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    },
    [isSuperAdmin, filters, pagination.limit]
  );

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const updateFilters = useCallback((newFilters) => {
    setFilters((prev) => ({ ...prev, ...newFilters }));
  }, []);

  const clearFilters = useCallback(() => {
    setFilters({
      source: '',
      event_type: '',
      severity: '',
      start_date: '',
      end_date: '',
    });
  }, []);

  const goToPage = useCallback(
    (page) => {
      fetchEvents(page);
    },
    [fetchEvents]
  );

  const refresh = useCallback(() => {
    fetchEvents(pagination.page);
  }, [fetchEvents, pagination.page]);

  return {
    events,
    pagination,
    loading,
    error,
    filters,
    filterOptions,
    updateFilters,
    clearFilters,
    goToPage,
    refresh,
    isSuperAdmin,
  };
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  useAuditLogs,
  useSystemEvents,
};
