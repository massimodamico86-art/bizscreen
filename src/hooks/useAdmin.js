/**
 * useAdmin Hook
 * Phase 17: React hook for admin panel state management
 */

import { useState, useCallback, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
  listTenants,
  getTenantById,
  updateTenantPlan,
  suspendTenant,
  overrideFeatureFlag,
  overrideQuota,
  resetUserPassword,
  disableUser,
  rebootScreen,
} from '../services/adminService';

// ============================================================================
// TENANT LIST HOOK
// ============================================================================

/**
 * Hook for managing tenant list with pagination and filters
 */
export function useTenantList(initialOptions = {}) {
  const { userProfile } = useAuth();
  const [tenants, setTenants] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    search: '',
    plan: '',
    status: '',
    ...initialOptions,
  });

  const isSuperAdmin = userProfile?.role === 'super_admin';

  const fetchTenants = useCallback(async (page = 1) => {
    if (!isSuperAdmin) {
      setError('Admin access required');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const result = await listTenants({
        page,
        limit: pagination.limit,
        ...filters,
      });

      setTenants(result.tenants);
      setPagination(result.pagination);
    } catch (err) {
      console.error('Failed to fetch tenants:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [isSuperAdmin, filters, pagination.limit]);

  useEffect(() => {
    fetchTenants();
  }, [fetchTenants]);

  const updateFilters = useCallback((newFilters) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  }, []);

  const goToPage = useCallback((page) => {
    fetchTenants(page);
  }, [fetchTenants]);

  const refresh = useCallback(() => {
    fetchTenants(pagination.page);
  }, [fetchTenants, pagination.page]);

  return {
    tenants,
    pagination,
    loading,
    error,
    filters,
    updateFilters,
    goToPage,
    refresh,
    isSuperAdmin,
  };
}

// ============================================================================
// TENANT DETAIL HOOK
// ============================================================================

/**
 * Hook for managing tenant detail view
 */
export function useTenantDetail(tenantId) {
  const { userProfile } = useAuth();
  const [tenant, setTenant] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  const isSuperAdmin = userProfile?.role === 'super_admin';

  const fetchTenant = useCallback(async () => {
    if (!isSuperAdmin || !tenantId) {
      setError('Admin access required');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const result = await getTenantById(tenantId);
      setTenant(result);
    } catch (err) {
      console.error('Failed to fetch tenant:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [isSuperAdmin, tenantId]);

  useEffect(() => {
    fetchTenant();
  }, [fetchTenant]);

  // Action helpers
  const changePlan = useCallback(async (planSlug, reason) => {
    try {
      setActionLoading(true);
      const result = await updateTenantPlan(tenantId, planSlug, reason);
      await fetchTenant(); // Refresh
      return result;
    } catch (err) {
      throw err;
    } finally {
      setActionLoading(false);
    }
  }, [tenantId, fetchTenant]);

  const toggleSuspend = useCallback(async (reason) => {
    try {
      setActionLoading(true);
      const action = tenant?.status === 'suspended' ? 'unsuspend' : 'suspend';
      const result = await suspendTenant(tenantId, action, reason);
      await fetchTenant(); // Refresh
      return result;
    } catch (err) {
      throw err;
    } finally {
      setActionLoading(false);
    }
  }, [tenantId, tenant?.status, fetchTenant]);

  const setFeatureOverride = useCallback(async (featureKey, enabled, reason) => {
    try {
      setActionLoading(true);
      const result = await overrideFeatureFlag(tenantId, featureKey, enabled, reason);
      await fetchTenant(); // Refresh
      return result;
    } catch (err) {
      throw err;
    } finally {
      setActionLoading(false);
    }
  }, [tenantId, fetchTenant]);

  const setQuotaOverride = useCallback(async (featureKey, options) => {
    try {
      setActionLoading(true);
      const result = await overrideQuota(tenantId, featureKey, options);
      await fetchTenant(); // Refresh
      return result;
    } catch (err) {
      throw err;
    } finally {
      setActionLoading(false);
    }
  }, [tenantId, fetchTenant]);

  const resetPassword = useCallback(async (userId, sendEmail = true) => {
    try {
      setActionLoading(true);
      const result = await resetUserPassword(userId, sendEmail);
      return result;
    } catch (err) {
      throw err;
    } finally {
      setActionLoading(false);
    }
  }, []);

  const toggleUserDisabled = useCallback(async (userId, currentStatus, reason) => {
    try {
      setActionLoading(true);
      const action = currentStatus === 'disabled' ? 'enable' : 'disable';
      const result = await disableUser(userId, action, reason);
      await fetchTenant(); // Refresh
      return result;
    } catch (err) {
      throw err;
    } finally {
      setActionLoading(false);
    }
  }, [fetchTenant]);

  const forceReboot = useCallback(async (screenId, reason) => {
    try {
      setActionLoading(true);
      const result = await rebootScreen(screenId, reason);
      await fetchTenant(); // Refresh
      return result;
    } catch (err) {
      throw err;
    } finally {
      setActionLoading(false);
    }
  }, [fetchTenant]);

  return {
    tenant,
    loading,
    error,
    actionLoading,
    refresh: fetchTenant,
    isSuperAdmin,
    // Actions
    changePlan,
    toggleSuspend,
    setFeatureOverride,
    setQuotaOverride,
    resetPassword,
    toggleUserDisabled,
    forceReboot,
  };
}

// ============================================================================
// ADMIN ACCESS HOOK
// ============================================================================

/**
 * Simple hook to check admin access
 */
export function useAdminAccess() {
  const { userProfile, loading } = useAuth();

  return {
    isSuperAdmin: userProfile?.role === 'super_admin',
    isAdmin: userProfile?.role === 'admin' || userProfile?.role === 'super_admin',
    loading,
    role: userProfile?.role,
  };
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  useTenantList,
  useTenantDetail,
  useAdminAccess,
};
