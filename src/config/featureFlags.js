/**
 * Feature Flags Configuration
 * Phase 14: Centralized feature flag definitions and resolution
 *
 * Resolution priority (highest to lowest):
 * 1. Tenant-specific override (enabled/disabled for specific tenant)
 * 2. Plan-based features (features included in current plan)
 * 3. Global flags (enabled for everyone)
 * 4. Default (disabled)
 *
 * Usage:
 *   import { resolveFeatureFlags, isFeatureResolved } from '../config/featureFlags';
 */

import { PLANS, Feature, isPlanFeature, PlanSlug } from './plans';

// ============================================================================
// GLOBAL FLAG DEFINITIONS
// ============================================================================

/**
 * Global flags that are enabled for everyone regardless of plan
 * These are typically for:
 * - Core features that should always be available
 * - Beta features being tested globally
 * - Temporary feature rollouts
 */
export const GLOBAL_FLAGS = {
  // Core features always enabled
  [Feature.BASIC_SCREENS]: true,
  [Feature.BASIC_PLAYLISTS]: true,
  [Feature.BASIC_MEDIA]: true,
  [Feature.TEMPLATES_GALLERY]: true,

  // Beta features (can toggle here for global rollout)
  // 'beta_new_player': false,
  // 'beta_dark_mode': false,
};

/**
 * Feature flag keys that map to the database feature_flags table
 * Use these when querying the database
 */
export const FeatureFlagKey = {
  AI_ASSISTANT: 'feature.ai_assistant',
  TEMPLATES_GALLERY: 'feature.templates_gallery',
  RESELLER_PORTAL: 'feature.reseller_portal',
  ENTERPRISE_SECURITY: 'feature.enterprise_security',
  PMS_INTEGRATION: 'feature.pms_integration',
  SERVICE_QUALITY_ALERTS: 'feature.service_quality_alerts',
  ADVANCED_SCHEDULING: 'feature.advanced_scheduling',
  CUSTOM_DOMAINS: 'feature.custom_domains',
  BULK_OPERATIONS: 'feature.bulk_operations',
  API_ACCESS: 'feature.api_access',
  CAMPAIGNS: 'feature.campaigns',
  WHITE_LABEL: 'feature.white_label',
  ENTERPRISE_SSO: 'feature.enterprise_sso',
  SCIM_PROVISIONING: 'feature.scim_provisioning',
  ADVANCED_ANALYTICS: 'feature.advanced_analytics',
  AUDIT_LOGS: 'feature.audit_logs',
  WEBHOOKS: 'feature.webhooks',
};

/**
 * Map Feature keys to FeatureFlagKey (for database lookups)
 */
export const FEATURE_TO_FLAG_KEY = {
  [Feature.AI_ASSISTANT]: FeatureFlagKey.AI_ASSISTANT,
  [Feature.TEMPLATES_GALLERY]: FeatureFlagKey.TEMPLATES_GALLERY,
  [Feature.RESELLER_PORTAL]: FeatureFlagKey.RESELLER_PORTAL,
  [Feature.ENTERPRISE_SSO]: FeatureFlagKey.ENTERPRISE_SSO,
  [Feature.SCIM_PROVISIONING]: FeatureFlagKey.SCIM_PROVISIONING,
  [Feature.PMS_INTEGRATION]: FeatureFlagKey.PMS_INTEGRATION,
  [Feature.ADVANCED_SCHEDULING]: FeatureFlagKey.ADVANCED_SCHEDULING,
  [Feature.CUSTOM_DOMAINS]: FeatureFlagKey.CUSTOM_DOMAINS,
  [Feature.BULK_OPERATIONS]: FeatureFlagKey.BULK_OPERATIONS,
  [Feature.API_ACCESS]: FeatureFlagKey.API_ACCESS,
  [Feature.CAMPAIGNS]: FeatureFlagKey.CAMPAIGNS,
  [Feature.WHITE_LABEL]: FeatureFlagKey.WHITE_LABEL,
  [Feature.ADVANCED_ANALYTICS]: FeatureFlagKey.ADVANCED_ANALYTICS,
  [Feature.AUDIT_LOGS]: FeatureFlagKey.AUDIT_LOGS,
  [Feature.WEBHOOKS]: FeatureFlagKey.WEBHOOKS,
};

// ============================================================================
// FEATURE RESOLUTION LOGIC
// ============================================================================

/**
 * @typedef {Object} FeatureContext
 * @property {string} [plan] - Current plan slug (e.g., 'pro')
 * @property {string} [tenantId] - Tenant ID for override lookups
 * @property {Object<string, boolean>} [tenantOverrides] - Pre-fetched tenant overrides
 * @property {Object<string, boolean>} [globalOverrides] - Runtime global overrides
 */

/**
 * @typedef {Object} ResolvedFeature
 * @property {string} key - Feature key
 * @property {boolean} enabled - Whether feature is enabled
 * @property {string} source - Where the decision came from: 'override', 'plan', 'global', 'default'
 */

/**
 * Resolve a single feature flag
 *
 * @param {string} featureKey - Feature key (from Feature enum)
 * @param {FeatureContext} context - Resolution context
 * @returns {ResolvedFeature}
 */
export function resolveFeature(featureKey, context = {}) {
  const { plan = PlanSlug.FREE, tenantOverrides = {}, globalOverrides = {} } = context;

  // 1. Check tenant-specific override (highest priority)
  if (tenantOverrides[featureKey] !== undefined) {
    return {
      key: featureKey,
      enabled: tenantOverrides[featureKey],
      source: 'override',
    };
  }

  // 2. Check runtime global overrides (for testing/dev)
  if (globalOverrides[featureKey] !== undefined) {
    return {
      key: featureKey,
      enabled: globalOverrides[featureKey],
      source: 'global_override',
    };
  }

  // 3. Check if feature is included in the plan
  if (isPlanFeature(plan, featureKey)) {
    return {
      key: featureKey,
      enabled: true,
      source: 'plan',
    };
  }

  // 4. Check global flags (features enabled for everyone)
  if (GLOBAL_FLAGS[featureKey] !== undefined) {
    return {
      key: featureKey,
      enabled: GLOBAL_FLAGS[featureKey],
      source: 'global',
    };
  }

  // 5. Default: disabled
  return {
    key: featureKey,
    enabled: false,
    source: 'default',
  };
}

/**
 * Resolve multiple feature flags at once
 *
 * @param {string[]} featureKeys - Array of feature keys to resolve
 * @param {FeatureContext} context - Resolution context
 * @returns {Object<string, ResolvedFeature>}
 */
export function resolveFeatures(featureKeys, context = {}) {
  const results = {};
  featureKeys.forEach((key) => {
    results[key] = resolveFeature(key, context);
  });
  return results;
}

/**
 * Resolve all features for a plan (with optional tenant overrides)
 *
 * @param {FeatureContext} context - Resolution context
 * @returns {Object<string, ResolvedFeature>}
 */
export function resolveAllFeatures(context = {}) {
  const allFeatureKeys = Object.values(Feature);
  return resolveFeatures(allFeatureKeys, context);
}

/**
 * Simple boolean check if a feature is enabled
 *
 * @param {string} featureKey - Feature key to check
 * @param {FeatureContext} context - Resolution context
 * @returns {boolean}
 */
export function isFeatureResolved(featureKey, context = {}) {
  return resolveFeature(featureKey, context).enabled;
}

/**
 * Get all enabled features for a context
 *
 * @param {FeatureContext} context - Resolution context
 * @returns {string[]} Array of enabled feature keys
 */
export function getEnabledFeatures(context = {}) {
  const resolved = resolveAllFeatures(context);
  return Object.entries(resolved)
    .filter(([, value]) => value.enabled)
    .map(([key]) => key);
}

/**
 * Get effective features with their sources (for debugging)
 *
 * @param {FeatureContext} context - Resolution context
 * @returns {Object} Detailed feature resolution info
 */
export function getEffectiveFeatures(context = {}) {
  const resolved = resolveAllFeatures(context);

  const bySource = {
    override: [],
    plan: [],
    global: [],
    default: [],
  };

  Object.entries(resolved).forEach(([key, value]) => {
    const entry = { key, enabled: value.enabled };
    if (value.source.includes('override')) {
      bySource.override.push(entry);
    } else {
      bySource[value.source]?.push(entry);
    }
  });

  return {
    context: {
      plan: context.plan || PlanSlug.FREE,
      tenantId: context.tenantId || null,
      hasOverrides: Object.keys(context.tenantOverrides || {}).length > 0,
    },
    features: resolved,
    bySource,
    summary: {
      total: Object.keys(resolved).length,
      enabled: Object.values(resolved).filter((v) => v.enabled).length,
      fromOverride: bySource.override.filter((v) => v.enabled).length,
      fromPlan: bySource.plan.filter((v) => v.enabled).length,
      fromGlobal: bySource.global.filter((v) => v.enabled).length,
    },
  };
}

// ============================================================================
// PERMISSION HELPERS
// ============================================================================

/**
 * Check if user can access a feature, throwing an error if not
 *
 * @param {string} featureKey - Feature key to check
 * @param {FeatureContext} context - Resolution context
 * @throws {Error} If feature is not enabled
 */
export function requireFeature(featureKey, context = {}) {
  const resolved = resolveFeature(featureKey, context);
  if (!resolved.enabled) {
    const error = new Error(`Feature "${featureKey}" is not enabled for your plan`);
    error.code = 'FEATURE_NOT_ENABLED';
    error.featureKey = featureKey;
    throw error;
  }
}

/**
 * Check multiple features, returning which are missing
 *
 * @param {string[]} requiredFeatures - Features that must all be enabled
 * @param {FeatureContext} context - Resolution context
 * @returns {{ allowed: boolean, missing: string[] }}
 */
export function checkRequiredFeatures(requiredFeatures, context = {}) {
  const missing = [];

  requiredFeatures.forEach((featureKey) => {
    const resolved = resolveFeature(featureKey, context);
    if (!resolved.enabled) {
      missing.push(featureKey);
    }
  });

  return {
    allowed: missing.length === 0,
    missing,
  };
}

// ============================================================================
// PLAN UPGRADE HELPERS
// ============================================================================

/**
 * Get features that would be gained by upgrading to a higher plan
 *
 * @param {string} currentPlan - Current plan slug
 * @param {string} targetPlan - Target plan to compare
 * @returns {string[]} Array of feature keys that would be gained
 */
export function getFeaturesGainedByUpgrade(currentPlan, targetPlan) {
  const currentFeatures = new Set(PLANS[currentPlan]?.features || []);
  const targetFeatures = PLANS[targetPlan]?.features || [];

  return targetFeatures.filter((f) => !currentFeatures.has(f));
}

/**
 * Get the upgrade path for a feature (which plan enables it)
 *
 * @param {string} featureKey - Feature to check
 * @param {string} currentPlan - Current plan
 * @returns {{ required: string, name: string } | null}
 */
export function getUpgradePathForFeature(featureKey, currentPlan) {
  // If the current plan already has this feature, no upgrade needed
  if (isPlanFeature(currentPlan, featureKey)) {
    return null;
  }

  const planOrder = [PlanSlug.FREE, PlanSlug.STARTER, PlanSlug.PRO, PlanSlug.ENTERPRISE];
  const currentIndex = planOrder.indexOf(currentPlan);

  for (let i = currentIndex + 1; i < planOrder.length; i++) {
    const plan = planOrder[i];
    if (isPlanFeature(plan, featureKey)) {
      return {
        required: plan,
        name: PLANS[plan].name,
      };
    }
  }

  // Check reseller
  if (isPlanFeature(PlanSlug.RESELLER, featureKey)) {
    return {
      required: PlanSlug.RESELLER,
      name: PLANS[PlanSlug.RESELLER].name,
    };
  }

  return null;
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  GLOBAL_FLAGS,
  FeatureFlagKey,
  FEATURE_TO_FLAG_KEY,
  resolveFeature,
  resolveFeatures,
  resolveAllFeatures,
  isFeatureResolved,
  getEnabledFeatures,
  getEffectiveFeatures,
  requireFeature,
  checkRequiredFeatures,
  getFeaturesGainedByUpgrade,
  getUpgradePathForFeature,
};
