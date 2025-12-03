/**
 * Usage Tracking Middleware
 * Phase 16: Feature usage tracking, quota enforcement, and billing preparation
 *
 * This module provides:
 * - trackUsage: Record feature usage events
 * - getTenantMonthlyUsage: Get usage summary for a tenant
 * - assertWithinQuota: Check if tenant is within quota limits
 * - getQuotaStatus: Get comprehensive quota status
 */

import { createClient } from '@supabase/supabase-js';
import { PlanSlug } from './featureCheck.js';

// ============================================================================
// QUOTA DEFINITIONS
// ============================================================================

/**
 * Default quotas per plan per feature (monthly limits)
 * null = unlimited
 */
export const PLAN_QUOTAS = {
  [PlanSlug.FREE]: {
    ai_assistant: 10,
    campaigns: 2,
    audit_logs: 100,
    api_calls: 100,
    screen_groups: 1,
    bulk_operations: 5,
    webhooks: 10,
  },

  [PlanSlug.STARTER]: {
    ai_assistant: 50,
    campaigns: 10,
    audit_logs: 1000,
    api_calls: 1000,
    screen_groups: 10,
    bulk_operations: 50,
    webhooks: 100,
  },

  [PlanSlug.PRO]: {
    ai_assistant: 200,
    campaigns: 50,
    audit_logs: 10000,
    api_calls: 10000,
    screen_groups: 100,
    bulk_operations: 500,
    webhooks: 1000,
  },

  [PlanSlug.ENTERPRISE]: {
    ai_assistant: null, // Unlimited
    campaigns: null,
    audit_logs: null,
    api_calls: null,
    screen_groups: null,
    bulk_operations: null,
    webhooks: null,
  },

  [PlanSlug.RESELLER]: {
    ai_assistant: null, // Unlimited
    campaigns: null,
    audit_logs: null,
    api_calls: null,
    screen_groups: null,
    bulk_operations: null,
    webhooks: null,
  },
};

/**
 * Feature key to human-readable name mapping
 */
export const QUOTA_FEATURE_NAMES = {
  ai_assistant: 'AI Assistant Requests',
  campaigns: 'Campaign Creations',
  audit_logs: 'Audit Log Entries',
  api_calls: 'API Calls',
  screen_groups: 'Screen Group Operations',
  bulk_operations: 'Bulk Operations',
  webhooks: 'Webhook Deliveries',
};

// ============================================================================
// ERROR CLASSES
// ============================================================================

/**
 * Error thrown when quota is exceeded
 */
export class QuotaExceededError extends Error {
  constructor(featureKey, currentUsage, quota, planSlug) {
    super(
      `Quota exceeded for ${QUOTA_FEATURE_NAMES[featureKey] || featureKey}. ` +
        `Used ${currentUsage} of ${quota} (${planSlug} plan). ` +
        `Upgrade your plan or wait until next month.`
    );
    this.name = 'QuotaExceededError';
    this.code = 'QUOTA_EXCEEDED';
    this.featureKey = featureKey;
    this.currentUsage = currentUsage;
    this.quota = quota;
    this.planSlug = planSlug;
    this.statusCode = 429; // Too Many Requests
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Create a Supabase client with service role for backend operations
 */
function getSupabaseClient() {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const supabaseServiceKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Supabase configuration missing');
  }

  return createClient(supabaseUrl, supabaseServiceKey);
}

/**
 * Get tenant context from request
 */
async function getTenantContext(req) {
  const supabase = getSupabaseClient();

  // Get authorization header
  const authHeader = req.headers.authorization || req.headers.Authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.replace('Bearer ', '');

  // Verify the token and get user
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser(token);

  if (authError || !user) {
    return null;
  }

  // Get user profile with tenant and plan info
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select(
      `
      id,
      tenant_id,
      role,
      tenants (
        id,
        name,
        subscriptions (
          plan_slug,
          status
        )
      )
    `
    )
    .eq('id', user.id)
    .single();

  if (profileError || !profile) {
    return null;
  }

  // Extract plan from subscription
  const subscription = profile.tenants?.subscriptions?.[0];
  const planSlug = subscription?.plan_slug || PlanSlug.FREE;

  return {
    userId: user.id,
    tenantId: profile.tenant_id,
    planSlug,
    role: profile.role,
    isSuperAdmin: profile.role === 'super_admin',
  };
}

/**
 * Get quota for a feature based on plan
 * @param {string} featureKey
 * @param {string} planSlug
 * @returns {number|null} Quota limit or null for unlimited
 */
export function getQuotaForFeature(featureKey, planSlug) {
  const planQuotas = PLAN_QUOTAS[planSlug] || PLAN_QUOTAS[PlanSlug.FREE];
  return planQuotas[featureKey] ?? null;
}

// ============================================================================
// MAIN FUNCTIONS
// ============================================================================

/**
 * Track a usage event
 *
 * @param {Object} req - Request object
 * @param {string} featureKey - Feature being used
 * @param {number} amount - Amount of usage (default 1)
 * @param {Object} metadata - Additional context
 * @returns {Promise<{eventId: string, currentUsage: number}>}
 */
export async function trackUsage(req, featureKey, amount = 1, metadata = {}) {
  const supabase = getSupabaseClient();
  const context = await getTenantContext(req);

  if (!context) {
    throw new Error('Unable to determine tenant context');
  }

  // Call the RPC function to record usage
  const { data, error } = await supabase.rpc('record_usage_event', {
    p_tenant_id: context.tenantId,
    p_feature_key: featureKey,
    p_quantity: amount,
    p_metadata: {
      ...metadata,
      user_id: context.userId,
      plan: context.planSlug,
      timestamp: new Date().toISOString(),
    },
  });

  if (error) {
    console.error('Failed to track usage:', error);
    throw new Error(`Failed to track usage: ${error.message}`);
  }

  // Get current month usage
  const currentUsage = await getFeatureMonthlyUsage(context.tenantId, featureKey);

  return {
    eventId: data,
    currentUsage,
    tenantId: context.tenantId,
    featureKey,
  };
}

/**
 * Get monthly usage for a specific feature
 *
 * @param {string} tenantId
 * @param {string} featureKey
 * @returns {Promise<number>}
 */
export async function getFeatureMonthlyUsage(tenantId, featureKey) {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase.rpc('get_feature_monthly_usage', {
    p_tenant_id: tenantId,
    p_feature_key: featureKey,
  });

  if (error) {
    console.error('Failed to get feature usage:', error);
    return 0;
  }

  return data || 0;
}

/**
 * Get usage summary for a tenant
 *
 * @param {string} tenantId
 * @param {Date} startDate - Optional start date (defaults to start of month)
 * @param {Date} endDate - Optional end date (defaults to now)
 * @returns {Promise<Array>}
 */
export async function getTenantMonthlyUsage(tenantId, startDate = null, endDate = null) {
  const supabase = getSupabaseClient();

  const start = startDate || new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const end = endDate || new Date();

  const { data, error } = await supabase.rpc('get_usage_summary', {
    p_tenant_id: tenantId,
    p_start_date: start.toISOString(),
    p_end_date: end.toISOString(),
  });

  if (error) {
    console.error('Failed to get usage summary:', error);
    return [];
  }

  return data || [];
}

/**
 * Check if tenant has a quota override
 *
 * @param {string} tenantId
 * @param {string} featureKey
 * @returns {Promise<{monthlyLimit: number|null, isUnlimited: boolean}|null>}
 */
export async function getQuotaOverride(tenantId, featureKey) {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase.rpc('get_quota_override', {
    p_tenant_id: tenantId,
    p_feature_key: featureKey,
  });

  if (error || !data || data.length === 0) {
    return null;
  }

  return {
    monthlyLimit: data[0].monthly_limit,
    isUnlimited: data[0].is_unlimited,
    expiresAt: data[0].expires_at,
  };
}

/**
 * Assert that a tenant is within their quota for a feature
 * Throws QuotaExceededError if over quota
 *
 * Resolution priority:
 * 1. Tenant override (if unlimited)
 * 2. Tenant override (if custom limit)
 * 3. Plan default quota
 * 4. Allow if no quota defined (feature not tracked)
 *
 * @param {string} tenantId
 * @param {string} featureKey
 * @param {string} planSlug
 * @param {number} additionalAmount - Amount about to be used (for pre-check)
 * @returns {Promise<{allowed: boolean, currentUsage: number, quota: number|null, remaining: number|null}>}
 */
export async function assertWithinQuota(tenantId, featureKey, planSlug, additionalAmount = 1) {
  // Check for tenant override first
  const override = await getQuotaOverride(tenantId, featureKey);

  if (override?.isUnlimited) {
    return {
      allowed: true,
      currentUsage: 0,
      quota: null,
      remaining: null,
      isUnlimited: true,
    };
  }

  // Determine effective quota
  const planQuota = getQuotaForFeature(featureKey, planSlug);
  const effectiveQuota = override?.monthlyLimit ?? planQuota;

  // If no quota defined (unlimited)
  if (effectiveQuota === null) {
    return {
      allowed: true,
      currentUsage: 0,
      quota: null,
      remaining: null,
      isUnlimited: true,
    };
  }

  // Get current usage
  const currentUsage = await getFeatureMonthlyUsage(tenantId, featureKey);

  // Check if within quota (considering additional amount about to be used)
  const projectedUsage = currentUsage + additionalAmount;
  const remaining = Math.max(0, effectiveQuota - currentUsage);
  const allowed = projectedUsage <= effectiveQuota;

  if (!allowed) {
    throw new QuotaExceededError(featureKey, currentUsage, effectiveQuota, planSlug);
  }

  return {
    allowed: true,
    currentUsage,
    quota: effectiveQuota,
    remaining: remaining - additionalAmount,
    isUnlimited: false,
    usagePercentage: Math.round((currentUsage / effectiveQuota) * 100),
  };
}

/**
 * Get comprehensive quota status for a feature
 *
 * @param {string} tenantId
 * @param {string} featureKey
 * @param {string} planSlug
 * @returns {Promise<Object>}
 */
export async function getQuotaStatus(tenantId, featureKey, planSlug) {
  const override = await getQuotaOverride(tenantId, featureKey);
  const planQuota = getQuotaForFeature(featureKey, planSlug);
  const effectiveQuota = override?.monthlyLimit ?? planQuota;
  const isUnlimited = override?.isUnlimited || effectiveQuota === null;

  const currentUsage = await getFeatureMonthlyUsage(tenantId, featureKey);

  return {
    featureKey,
    featureName: QUOTA_FEATURE_NAMES[featureKey] || featureKey,
    currentUsage,
    quota: effectiveQuota,
    isUnlimited,
    remaining: isUnlimited ? null : Math.max(0, effectiveQuota - currentUsage),
    usagePercentage: isUnlimited ? 0 : Math.round((currentUsage / effectiveQuota) * 100),
    isExceeded: isUnlimited ? false : currentUsage >= effectiveQuota,
    hasOverride: !!override,
    overrideExpiresAt: override?.expiresAt,
    status: isUnlimited
      ? 'unlimited'
      : currentUsage >= effectiveQuota
        ? 'exceeded'
        : currentUsage >= effectiveQuota * 0.95
          ? 'critical'
          : currentUsage >= effectiveQuota * 0.7
            ? 'warning'
            : 'ok',
  };
}

/**
 * Get quota status for all tracked features
 *
 * @param {string} tenantId
 * @param {string} planSlug
 * @returns {Promise<Object[]>}
 */
export async function getAllQuotaStatuses(tenantId, planSlug) {
  const featureKeys = Object.keys(QUOTA_FEATURE_NAMES);
  const statuses = await Promise.all(
    featureKeys.map((featureKey) => getQuotaStatus(tenantId, featureKey, planSlug))
  );
  return statuses;
}

/**
 * Middleware wrapper for quota-protected routes
 *
 * @param {string} featureKey - Feature to check quota for
 * @param {Function} handler - Route handler
 * @param {Object} options - Options
 * @returns {Function}
 */
export function withQuotaCheck(featureKey, handler, options = {}) {
  const { trackAfter = true, amount = 1 } = options;

  return async (req, res) => {
    try {
      const context = await getTenantContext(req);

      if (!context) {
        return res.status(401).json({
          error: 'Unauthorized',
          code: 'UNAUTHORIZED',
        });
      }

      // Super admins bypass quota checks
      if (context.isSuperAdmin) {
        // Still track usage for analytics
        if (trackAfter) {
          await trackUsage(req, featureKey, amount, { bypassed: true });
        }
        return handler(req, res, context);
      }

      // Check quota before proceeding
      const quotaStatus = await assertWithinQuota(
        context.tenantId,
        featureKey,
        context.planSlug,
        amount
      );

      // Execute the handler
      const result = await handler(req, res, context, quotaStatus);

      // Track usage after successful operation
      if (trackAfter && res.statusCode < 400) {
        await trackUsage(req, featureKey, amount);
      }

      return result;
    } catch (error) {
      if (error instanceof QuotaExceededError) {
        return res.status(429).json({
          error: error.message,
          code: error.code,
          featureKey: error.featureKey,
          currentUsage: error.currentUsage,
          quota: error.quota,
          planSlug: error.planSlug,
          upgradeUrl: '/account/plan',
        });
      }

      console.error('Quota check error:', error);
      return res.status(500).json({
        error: 'Internal server error',
        code: 'INTERNAL_ERROR',
      });
    }
  };
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  PLAN_QUOTAS,
  QUOTA_FEATURE_NAMES,
  QuotaExceededError,
  getQuotaForFeature,
  trackUsage,
  getFeatureMonthlyUsage,
  getTenantMonthlyUsage,
  getQuotaOverride,
  assertWithinQuota,
  getQuotaStatus,
  getAllQuotaStatuses,
  withQuotaCheck,
};
