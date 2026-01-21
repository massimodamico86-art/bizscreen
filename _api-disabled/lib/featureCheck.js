/**
 * Server-Side Feature Check Utility
 * Phase 14: Feature flag verification for API routes
 *
 * This module provides server-authoritative feature checks that cannot be
 * bypassed by clients. Use these functions to gate sensitive API endpoints.
 *
 * Usage:
 *   import { checkFeatureOrThrow, requireFeature } from '../lib/featureCheck.js';
 *
 *   // In an API handler:
 *   export default async function handler(req, res) {
 *     await checkFeatureOrThrow(req, 'ai_assistant');
 *     // ... rest of handler
 *   }
 */

import { createClient } from '@supabase/supabase-js';

// ============================================================================
// PLAN AND FEATURE DEFINITIONS (mirrored from frontend for server use)
// ============================================================================

const PlanSlug = {
  FREE: 'free',
  STARTER: 'starter',
  PRO: 'pro',
  ENTERPRISE: 'enterprise',
  RESELLER: 'reseller',
};

const PLAN_ORDER = {
  [PlanSlug.FREE]: 0,
  [PlanSlug.STARTER]: 1,
  [PlanSlug.PRO]: 2,
  [PlanSlug.ENTERPRISE]: 3,
  [PlanSlug.RESELLER]: 4,
};

/**
 * Plan -> Features mapping (server-side source of truth)
 */
const PLAN_FEATURES = {
  [PlanSlug.FREE]: [
    'basic_screens',
    'basic_playlists',
    'basic_media',
    'templates_gallery',
  ],
  [PlanSlug.STARTER]: [
    'basic_screens',
    'basic_playlists',
    'basic_media',
    'templates_gallery',
    'advanced_scheduling',
    'screen_groups',
    'basic_analytics',
    'email_support',
  ],
  [PlanSlug.PRO]: [
    'basic_screens',
    'basic_playlists',
    'basic_media',
    'templates_gallery',
    'advanced_scheduling',
    'screen_groups',
    'basic_analytics',
    'advanced_analytics',
    'ai_assistant',
    'campaigns',
    'bulk_operations',
    'api_access',
    'webhooks',
    'priority_support',
  ],
  [PlanSlug.ENTERPRISE]: [
    'basic_screens',
    'basic_playlists',
    'basic_media',
    'templates_gallery',
    'advanced_scheduling',
    'screen_groups',
    'basic_analytics',
    'advanced_analytics',
    'ai_assistant',
    'campaigns',
    'bulk_operations',
    'api_access',
    'webhooks',
    'enterprise_sso',
    'scim_provisioning',
    'custom_domains',
    'white_label',
    'audit_logs',
    'sla_guarantee',
    'dedicated_support',
    'pms_integration',
  ],
  [PlanSlug.RESELLER]: [
    'basic_screens',
    'basic_playlists',
    'basic_media',
    'templates_gallery',
    'advanced_scheduling',
    'screen_groups',
    'basic_analytics',
    'advanced_analytics',
    'ai_assistant',
    'campaigns',
    'bulk_operations',
    'api_access',
    'webhooks',
    'reseller_portal',
    'client_management',
    'license_management',
    'reseller_billing',
    'white_label',
    'custom_domains',
    'priority_support',
  ],
};

// Global flags always enabled
const GLOBAL_FLAGS = {
  basic_screens: true,
  basic_playlists: true,
  basic_media: true,
  templates_gallery: true,
};

// ============================================================================
// ERROR CLASS
// ============================================================================

/**
 * Custom error for feature access denial
 */
export class FeatureNotEnabledError extends Error {
  constructor(featureKey, plan) {
    super(`Feature "${featureKey}" is not available on your current plan (${plan})`);
    this.name = 'FeatureNotEnabledError';
    this.code = 'FEATURE_NOT_ENABLED';
    this.featureKey = featureKey;
    this.currentPlan = plan;
    this.statusCode = 403;
  }
}

// ============================================================================
// SUPABASE CLIENT HELPERS
// ============================================================================

/**
 * Create a Supabase client for server-side use
 */
function getSupabaseClient() {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase configuration');
  }

  return createClient(supabaseUrl, supabaseKey);
}

/**
 * Get user from request authorization header
 */
async function getUserFromRequest(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.substring(7);
  const supabase = getSupabaseClient();

  const { data: { user }, error } = await supabase.auth.getUser(token);

  if (error || !user) {
    return null;
  }

  return user;
}

// ============================================================================
// FEATURE CONTEXT FETCHING
// ============================================================================

/**
 * Get the current tenant's plan and any feature overrides
 *
 * @param {string} userId - User ID
 * @returns {Promise<{ plan: string, tenantId: string|null, overrides: Object }>}
 */
export async function getTenantFeatureContext(userId) {
  const supabase = getSupabaseClient();

  // Get user's tenant and subscription
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, tenant_id, role')
    .eq('id', userId)
    .single();

  const tenantId = profile?.tenant_id || userId;
  let plan = PlanSlug.FREE;
  const overrides = {};

  // Get subscription plan
  const { data: subscription } = await supabase
    .from('subscriptions')
    .select(`
      status,
      plans(slug)
    `)
    .eq('owner_id', userId)
    .in('status', ['active', 'trialing'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (subscription?.plans?.slug) {
    plan = subscription.plans.slug;
  }

  // Get tenant-specific overrides
  const { data: flagOverrides } = await supabase
    .from('feature_flag_overrides')
    .select(`
      enabled,
      feature_flags(key)
    `)
    .eq('tenant_id', tenantId);

  if (flagOverrides) {
    flagOverrides.forEach((override) => {
      if (override.feature_flags?.key) {
        // Convert database key to feature key (remove 'feature.' prefix if present)
        const featureKey = override.feature_flags.key.replace(/^feature\./, '');
        overrides[featureKey] = override.enabled;
      }
    });
  }

  // Check for super_admin role (gets all features)
  const isSuperAdmin = profile?.role === 'super_admin';

  return {
    plan,
    tenantId,
    overrides,
    isSuperAdmin,
  };
}

// ============================================================================
// FEATURE RESOLUTION
// ============================================================================

/**
 * Check if a feature is enabled for a given context
 *
 * @param {string} featureKey - Feature to check
 * @param {Object} context - { plan, overrides, isSuperAdmin }
 * @returns {boolean}
 */
export function isFeatureEnabled(featureKey, context) {
  const { plan = PlanSlug.FREE, overrides = {}, isSuperAdmin = false } = context;

  // Super admins have all features
  if (isSuperAdmin) {
    return true;
  }

  // 1. Check tenant override (highest priority)
  if (overrides[featureKey] !== undefined) {
    return overrides[featureKey];
  }

  // 2. Check plan features
  const planFeatures = PLAN_FEATURES[plan] || PLAN_FEATURES[PlanSlug.FREE];
  if (planFeatures.includes(featureKey)) {
    return true;
  }

  // 3. Check global flags
  if (GLOBAL_FLAGS[featureKey]) {
    return true;
  }

  // 4. Default: disabled
  return false;
}

/**
 * Get all enabled features for a context
 */
export function getEnabledFeatures(context) {
  const allFeatures = new Set([
    ...Object.keys(GLOBAL_FLAGS),
    ...(PLAN_FEATURES[context.plan] || []),
    ...Object.keys(context.overrides || {}).filter((k) => context.overrides[k]),
  ]);

  return Array.from(allFeatures);
}

// ============================================================================
// API ROUTE HELPERS
// ============================================================================

/**
 * Check if a feature is enabled for the request user
 * Does not throw - returns boolean
 *
 * @param {Request} req - API request
 * @param {string} featureKey - Feature to check
 * @returns {Promise<boolean>}
 */
export async function checkFeature(req, featureKey) {
  try {
    const user = await getUserFromRequest(req);
    if (!user) {
      return false;
    }

    const context = await getTenantFeatureContext(user.id);
    return isFeatureEnabled(featureKey, context);
  } catch (error) {
    console.error('Error checking feature:', error);
    return false;
  }
}

/**
 * Check if a feature is enabled, throw if not
 *
 * @param {Request} req - API request
 * @param {string} featureKey - Feature to check
 * @throws {FeatureNotEnabledError}
 */
export async function checkFeatureOrThrow(req, featureKey) {
  const user = await getUserFromRequest(req);
  if (!user) {
    const error = new Error('Authentication required');
    error.statusCode = 401;
    throw error;
  }

  const context = await getTenantFeatureContext(user.id);

  if (!isFeatureEnabled(featureKey, context)) {
    throw new FeatureNotEnabledError(featureKey, context.plan);
  }

  return context;
}

/**
 * Middleware-style feature check
 * Returns a handler that checks the feature before proceeding
 *
 * @param {string} featureKey - Feature required
 * @param {Function} handler - Handler to call if feature is enabled
 * @returns {Function}
 */
export function requireFeature(featureKey, handler) {
  return async (req, res) => {
    try {
      await checkFeatureOrThrow(req, featureKey);
      return handler(req, res);
    } catch (error) {
      if (error instanceof FeatureNotEnabledError) {
        return res.status(403).json({
          error: error.message,
          code: error.code,
          featureKey: error.featureKey,
          currentPlan: error.currentPlan,
        });
      }

      if (error.statusCode === 401) {
        return res.status(401).json({
          error: 'Authentication required',
          code: 'UNAUTHORIZED',
        });
      }

      console.error('Feature check error:', error);
      return res.status(500).json({
        error: 'Internal server error',
        code: 'INTERNAL_ERROR',
      });
    }
  };
}

/**
 * Check multiple features, return which are missing
 *
 * @param {Request} req - API request
 * @param {string[]} featureKeys - Features to check
 * @returns {Promise<{ allowed: boolean, missing: string[], context: Object }>}
 */
export async function checkMultipleFeatures(req, featureKeys) {
  const user = await getUserFromRequest(req);
  if (!user) {
    return { allowed: false, missing: featureKeys, context: null };
  }

  const context = await getTenantFeatureContext(user.id);
  const missing = [];

  featureKeys.forEach((key) => {
    if (!isFeatureEnabled(key, context)) {
      missing.push(key);
    }
  });

  return {
    allowed: missing.length === 0,
    missing,
    context,
  };
}

// ============================================================================
// PLAN COMPARISON HELPERS
// ============================================================================

/**
 * Compare two plans
 */
export function comparePlans(planA, planB) {
  const orderA = PLAN_ORDER[planA] ?? 0;
  const orderB = PLAN_ORDER[planB] ?? 0;
  return orderA - orderB;
}

/**
 * Check if planA is at least as high as planB
 */
export function isPlanAtLeast(planA, planB) {
  return comparePlans(planA, planB) >= 0;
}

/**
 * Get the minimum plan required for a feature
 */
export function getMinimumPlanForFeature(featureKey) {
  const planOrder = [PlanSlug.FREE, PlanSlug.STARTER, PlanSlug.PRO, PlanSlug.ENTERPRISE];

  for (const plan of planOrder) {
    if (PLAN_FEATURES[plan]?.includes(featureKey)) {
      return plan;
    }
  }

  // Check reseller
  if (PLAN_FEATURES[PlanSlug.RESELLER]?.includes(featureKey)) {
    return PlanSlug.RESELLER;
  }

  return null;
}

// ============================================================================
// EXPORTS
// ============================================================================

export {
  PlanSlug,
  PLAN_FEATURES,
  GLOBAL_FLAGS,
};

export default {
  checkFeature,
  checkFeatureOrThrow,
  requireFeature,
  checkMultipleFeatures,
  getTenantFeatureContext,
  isFeatureEnabled,
  getEnabledFeatures,
  comparePlans,
  isPlanAtLeast,
  getMinimumPlanForFeature,
  FeatureNotEnabledError,
  PlanSlug,
};
