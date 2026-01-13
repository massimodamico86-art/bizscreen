/**
 * Usage Service
 * Frontend API wrapper for usage tracking and quota management
 */

import { supabase } from '../supabase';

/**
 * Get usage summary for the current tenant
 * @returns {Promise<Object>}
 */
export async function getUsageSummary() {
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      throw new Error('Not authenticated');
    }

    const response = await fetch('/api/usage/summary', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch usage summary');
    }

    return await response.json();
  } catch (error) {
    console.error('Usage summary error:', error);
    throw error;
  }
}

/**
 * Get quota status for a specific feature
 * @param {string} featureKey
 * @returns {Promise<Object>}
 */
export async function getQuotaStatus(featureKey) {
  try {
    const summary = await getUsageSummary();
    const quota = summary.data.quotas.find((q) => q.featureKey === featureKey);
    return quota || null;
  } catch (error) {
    console.error('Quota status error:', error);
    throw error;
  }
}

/**
 * Record a client-side usage event
 * This can be used for tracking UI events or other client-side actions
 * @param {string} featureKey
 * @param {Object} metadata
 * @returns {Promise<void>}
 */
export async function recordClientEvent(featureKey, metadata = {}) {
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      console.warn('Not authenticated, skipping client event recording');
      return;
    }

    // In this schema, user.id IS the tenant_id for clients
    const tenantId = session.user.user_metadata?.tenant_id || session.user.id;

    if (!tenantId) {
      console.warn('No tenant found, skipping client event recording');
      return;
    }

    // Record usage event via RPC
    await supabase.rpc('record_usage_event', {
      p_tenant_id: tenantId,
      p_feature_key: featureKey,
      p_quantity: 1,
      p_metadata: {
        ...metadata,
        source: 'client',
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    // Don't throw for client events - just log
    console.error('Client event recording error:', error);
  }
}

/**
 * Get usage status with color coding
 * @param {number} percentage - Usage percentage (0-100)
 * @returns {'ok' | 'warning' | 'critical' | 'exceeded'}
 */
export function getUsageStatus(percentage) {
  if (percentage >= 100) return 'exceeded';
  if (percentage >= 95) return 'critical';
  if (percentage >= 70) return 'warning';
  return 'ok';
}

/**
 * Get color for usage status
 * @param {string} status
 * @returns {string} Tailwind color class
 */
export function getUsageColor(status) {
  switch (status) {
    case 'exceeded':
      return 'bg-red-500';
    case 'critical':
      return 'bg-red-400';
    case 'warning':
      return 'bg-yellow-500';
    case 'ok':
    default:
      return 'bg-green-500';
  }
}

/**
 * Get text color for usage status
 * @param {string} status
 * @returns {string} Tailwind text color class
 */
export function getUsageTextColor(status) {
  switch (status) {
    case 'exceeded':
      return 'text-red-600';
    case 'critical':
      return 'text-red-500';
    case 'warning':
      return 'text-yellow-600';
    case 'ok':
    default:
      return 'text-green-600';
  }
}

/**
 * Format quota display
 * @param {number|null} used
 * @param {number|null} limit
 * @param {boolean} isUnlimited
 * @returns {string}
 */
export function formatQuotaDisplay(used, limit, isUnlimited) {
  if (isUnlimited) {
    return `${used ?? 0} / Unlimited`;
  }
  return `${used ?? 0} / ${limit ?? 0}`;
}

/**
 * Calculate days until quota reset
 * @returns {number}
 */
export function getDaysUntilReset() {
  const now = new Date();
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return Math.ceil((endOfMonth - now) / (1000 * 60 * 60 * 24));
}

export default {
  getUsageSummary,
  getQuotaStatus,
  recordClientEvent,
  getUsageStatus,
  getUsageColor,
  getUsageTextColor,
  formatQuotaDisplay,
  getDaysUntilReset,
};
