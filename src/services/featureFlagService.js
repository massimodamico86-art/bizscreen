/**
 * Feature Flag Service - Client-side feature flag evaluation
 *
 * Provides functions to check if features are enabled for the current tenant,
 * with support for caching and various rollout strategies.
 */
import { supabase } from '../supabase';

import { createScopedLogger } from './loggingService.js';

const logger = createScopedLogger('FeatureFlagService');

// In-memory cache for feature flags
let flagCache = {
  data: null,
  tenantId: null,
  plan: null,
  timestamp: null,
  ttl: 5 * 60 * 1000, // 5 minutes cache TTL
};

// localStorage key for persistent cache
const CACHE_KEY = 'bizscreen_feature_flags';

/**
 * @typedef {Object} FeatureFlag
 * @property {string} flagKey - Unique flag identifier
 * @property {string} flagName - Display name
 * @property {boolean} enabled - Whether the flag is enabled
 * @property {string} source - Where the flag value comes from (default, plan, override)
 */

/**
 * Load cached flags from localStorage
 * @returns {Object|null}
 */
function loadFromLocalStorage() {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
      const parsed = JSON.parse(cached);
      // Check if cache is still valid
      if (parsed.timestamp && Date.now() - parsed.timestamp < flagCache.ttl) {
        return parsed;
      }
    }
  } catch (e) {
    logger.warn('Failed to load feature flags from localStorage:', { data: e });
  }
  return null;
}

/**
 * Save flags to localStorage
 * @param {Object} cacheData
 */
function saveToLocalStorage(cacheData) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
  } catch (e) {
    logger.warn('Failed to save feature flags to localStorage:', { data: e });
  }
}

/**
 * Clear the feature flag cache
 */
export function clearFeatureFlagCache() {
  flagCache = {
    data: null,
    tenantId: null,
    plan: null,
    timestamp: null,
    ttl: flagCache.ttl,
  };
  try {
    localStorage.removeItem(CACHE_KEY);
  } catch (e) {
    // Ignore localStorage errors
  }
}

/**
 * Get the current user's tenant ID and plan
 * @returns {Promise<{tenantId: string|null, plan: string}>}
 */
async function getCurrentTenantInfo() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { tenantId: null, plan: 'free' };
  }

  // In this schema, the user ID IS the tenant ID for clients
  // (profiles.id = auth.users.id = tenant identifier)
  let tenantId = user.user_metadata?.tenant_id || user.id;
  let plan = 'free';

  // Get current plan
  if (tenantId) {
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('plan_id, plans(slug)')
      .eq('owner_id', tenantId)
      .in('status', ['active', 'trialing'])
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (subscription?.plans?.slug) {
      plan = subscription.plans.slug;
    }
  }

  return { tenantId, plan };
}

/**
 * Fetch all active feature flags for the current tenant
 * @param {boolean} [forceRefresh=false] - Bypass cache and fetch fresh data
 * @returns {Promise<Map<string, FeatureFlag>>}
 */
export async function getFeatureFlags(forceRefresh = false) {
  const { tenantId, plan } = await getCurrentTenantInfo();

  // Check in-memory cache first
  if (
    !forceRefresh &&
    flagCache.data &&
    flagCache.tenantId === tenantId &&
    flagCache.plan === plan &&
    flagCache.timestamp &&
    Date.now() - flagCache.timestamp < flagCache.ttl
  ) {
    return flagCache.data;
  }

  // Check localStorage cache
  if (!forceRefresh) {
    const localCache = loadFromLocalStorage();
    if (localCache && localCache.tenantId === tenantId && localCache.plan === plan) {
      flagCache = { ...flagCache, ...localCache };
      return flagCache.data;
    }
  }

  // Fetch from database
  const { data, error } = await supabase.rpc('get_active_feature_flags_for_tenant', {
    p_tenant_id: tenantId,
    p_plan: plan,
  });

  if (error) {
    logger.error('Error fetching feature flags:', { error: error });
    // Return empty map on error, don't break the app
    return new Map();
  }

  // Convert to Map for fast lookups
  const flagsMap = new Map();
  if (data) {
    data.forEach(flag => {
      flagsMap.set(flag.flag_key, {
        flagKey: flag.flag_key,
        flagName: flag.flag_name,
        enabled: flag.enabled,
        source: flag.source,
      });
    });
  }

  // Update caches
  flagCache = {
    data: flagsMap,
    tenantId,
    plan,
    timestamp: Date.now(),
    ttl: flagCache.ttl,
  };

  saveToLocalStorage({
    data: Array.from(flagsMap.entries()),
    tenantId,
    plan,
    timestamp: Date.now(),
  });

  return flagsMap;
}

/**
 * Check if a specific feature is enabled
 * @param {string} flagKey - The feature flag key (e.g., 'feature.ai_assistant')
 * @param {boolean} [defaultValue=false] - Default value if flag not found
 * @returns {Promise<boolean>}
 */
export async function isFeatureEnabled(flagKey, defaultValue = false) {
  try {
    const flags = await getFeatureFlags();
    const flag = flags.get(flagKey);
    return flag ? flag.enabled : defaultValue;
  } catch (e) {
    logger.error('Error checking feature flag:', { error: e });
    return defaultValue;
  }
}

/**
 * Synchronous check if a feature is enabled (uses cache only)
 * Returns defaultValue if cache is empty
 * @param {string} flagKey - The feature flag key
 * @param {boolean} [defaultValue=false] - Default value if flag not found
 * @returns {boolean}
 */
export function isFeatureEnabledSync(flagKey, defaultValue = false) {
  if (!flagCache.data) {
    // Try localStorage
    const localCache = loadFromLocalStorage();
    if (localCache && localCache.data) {
      flagCache.data = new Map(localCache.data);
    }
  }

  if (!flagCache.data) {
    return defaultValue;
  }

  const flag = flagCache.data.get(flagKey);
  return flag ? flag.enabled : defaultValue;
}

/**
 * Get multiple feature flags at once
 * @param {string[]} flagKeys - Array of flag keys to check
 * @returns {Promise<Object<string, boolean>>}
 */
export async function getMultipleFeatureFlags(flagKeys) {
  const flags = await getFeatureFlags();
  const result = {};
  flagKeys.forEach(key => {
    const flag = flags.get(key);
    result[key] = flag ? flag.enabled : false;
  });
  return result;
}

/**
 * Preload feature flags (call on app init)
 * @returns {Promise<void>}
 */
export async function preloadFeatureFlags() {
  await getFeatureFlags(true);
}

// Common feature flag keys
export const FeatureFlags = {
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
};

// ============================================
// Admin Functions (for FeatureFlagsPage)
// ============================================

/**
 * Get all feature flags (admin view)
 * @returns {Promise<Array>}
 */
export async function getAllFeatureFlags() {
  const { data, error } = await supabase
    .from('feature_flags')
    .select('*')
    .order('category', { ascending: true })
    .order('name', { ascending: true });

  if (error) {
    logger.error('Error fetching all feature flags:', { error: error });
    throw error;
  }

  return data || [];
}

/**
 * Create a new feature flag (admin only)
 * @param {Object} flag - The flag data
 * @returns {Promise<Object>}
 */
export async function createFeatureFlag(flag) {
  const { data, error } = await supabase
    .from('feature_flags')
    .insert({
      key: flag.key,
      name: flag.name,
      description: flag.description,
      default_enabled: flag.defaultEnabled || false,
      rollout_strategy: flag.rolloutStrategy || 'global',
      rollout_percentage: flag.rolloutPercentage,
      allowed_plans: flag.allowedPlans || [],
      category: flag.category || 'feature',
    })
    .select()
    .single();

  if (error) {
    logger.error('Error creating feature flag:', { error: error });
    throw error;
  }

  return data;
}

/**
 * Update a feature flag (admin only)
 * @param {string} flagId - The flag ID
 * @param {Object} updates - The updates to apply
 * @returns {Promise<Object>}
 */
export async function updateFeatureFlag(flagId, updates) {
  const updateData = {};
  if (updates.name !== undefined) updateData.name = updates.name;
  if (updates.description !== undefined) updateData.description = updates.description;
  if (updates.defaultEnabled !== undefined) updateData.default_enabled = updates.defaultEnabled;
  if (updates.rolloutStrategy !== undefined) updateData.rollout_strategy = updates.rolloutStrategy;
  if (updates.rolloutPercentage !== undefined) updateData.rollout_percentage = updates.rolloutPercentage;
  if (updates.allowedPlans !== undefined) updateData.allowed_plans = updates.allowedPlans;
  if (updates.category !== undefined) updateData.category = updates.category;

  const { data, error } = await supabase
    .from('feature_flags')
    .update(updateData)
    .eq('id', flagId)
    .select()
    .single();

  if (error) {
    logger.error('Error updating feature flag:', { error: error });
    throw error;
  }

  // Clear cache since flags changed
  clearFeatureFlagCache();

  return data;
}

/**
 * Delete a feature flag (admin only)
 * @param {string} flagId - The flag ID
 * @returns {Promise<void>}
 */
export async function deleteFeatureFlag(flagId) {
  const { error } = await supabase
    .from('feature_flags')
    .delete()
    .eq('id', flagId);

  if (error) {
    logger.error('Error deleting feature flag:', { error: error });
    throw error;
  }

  clearFeatureFlagCache();
}

/**
 * Get feature flag overrides for a specific tenant (admin)
 * @param {string} tenantId - The tenant ID
 * @returns {Promise<Array>}
 */
export async function getTenantOverrides(tenantId) {
  const { data, error } = await supabase
    .from('feature_flag_overrides')
    .select(`
      *,
      feature_flags(key, name)
    `)
    .eq('tenant_id', tenantId);

  if (error) {
    logger.error('Error fetching tenant overrides:', { error: error });
    throw error;
  }

  return data || [];
}

/**
 * Set a feature flag override for a tenant (admin)
 * @param {string} flagId - The flag ID
 * @param {string} tenantId - The tenant ID
 * @param {boolean} enabled - Whether to enable or disable
 * @returns {Promise<Object>}
 */
export async function setTenantOverride(flagId, tenantId, enabled) {
  const { data, error } = await supabase
    .from('feature_flag_overrides')
    .upsert({
      flag_id: flagId,
      tenant_id: tenantId,
      enabled,
    }, {
      onConflict: 'flag_id,tenant_id',
    })
    .select()
    .single();

  if (error) {
    logger.error('Error setting tenant override:', { error: error });
    throw error;
  }

  return data;
}

/**
 * Remove a tenant override (admin)
 * @param {string} flagId - The flag ID
 * @param {string} tenantId - The tenant ID
 * @returns {Promise<void>}
 */
export async function removeTenantOverride(flagId, tenantId) {
  const { error } = await supabase
    .from('feature_flag_overrides')
    .delete()
    .eq('flag_id', flagId)
    .eq('tenant_id', tenantId);

  if (error) {
    logger.error('Error removing tenant override:', { error: error });
    throw error;
  }
}
