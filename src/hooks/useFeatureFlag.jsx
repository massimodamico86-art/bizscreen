/**
 * Feature Flag React Hooks
 * Phase 14: React hooks for checking feature flags in components
 *
 * Usage:
 *   const isEnabled = useFeatureFlag('ai_assistant');
 *   const { isEnabled, isLoading } = useFeatureFlagWithLoading('campaigns');
 */

import { useState, useEffect, useCallback, useMemo, createContext, useContext } from 'react';
import { createScopedLogger } from '../services/loggingService.js';

const logger = createScopedLogger('useFeatureFlag');
import {
  isFeatureEnabled as checkFeatureEnabled,
  isFeatureEnabledSync,
  getFeatureFlags,
  preloadFeatureFlags,
  clearFeatureFlagCache,
} from '../services/featureFlagService';
import { Feature, PlanSlug } from '../config/plans';
import {
  resolveFeature,
  isFeatureResolved,
  getEffectiveFeatures,
  getUpgradePathForFeature,
} from '../config/featureFlags';

// ============================================================================
// FEATURE CONTEXT (for passing plan/tenant info down the tree)
// ============================================================================

const FeatureContext = createContext({
  plan: PlanSlug.FREE,
  tenantId: null,
  tenantOverrides: {},
  isLoading: true,
  error: null,
  refresh: () => {},
});

/**
 * Feature flag provider - wraps your app to provide feature context
 *
 * @example
 * <FeatureFlagProvider plan={userPlan} tenantId={userId}>
 *   <App />
 * </FeatureFlagProvider>
 */
export function FeatureFlagProvider({ children, plan = PlanSlug.FREE, tenantId = null }) {
  const [tenantOverrides, setTenantOverrides] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      // Preload flags from database (will populate cache)
      await preloadFeatureFlags();

      // Get the flags map and convert overrides
      const flags = await getFeatureFlags(true);
      const overrides = {};

      // Extract tenant-specific overrides from the flags
      flags.forEach((flag, key) => {
        if (flag.source === 'override') {
          overrides[key] = flag.enabled;
        }
      });

      setTenantOverrides(overrides);
    } catch (err) {
      logger.error('Failed to load feature flags:', err);
      setError(err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh, tenantId, plan]);

  const value = useMemo(
    () => ({
      plan,
      tenantId,
      tenantOverrides,
      isLoading,
      error,
      refresh,
    }),
    [plan, tenantId, tenantOverrides, isLoading, error, refresh]
  );

  return <FeatureContext.Provider value={value}>{children}</FeatureContext.Provider>;
}

/**
 * Hook to access the feature context
 */
export function useFeatureContext() {
  return useContext(FeatureContext);
}

// ============================================================================
// FEATURE FLAG HOOKS
// ============================================================================

/**
 * Check if a feature is enabled (uses cached/preloaded data)
 *
 * @param {string} featureKey - Feature key from Feature enum or database flag key
 * @param {boolean} [defaultValue=false] - Default if not determinable
 * @returns {boolean}
 *
 * @example
 * const hasAI = useFeatureFlag(Feature.AI_ASSISTANT);
 * const hasCampaigns = useFeatureFlag('campaigns');
 */
export function useFeatureFlag(featureKey, defaultValue = false) {
  const { plan, tenantOverrides, isLoading } = useFeatureContext();

  // Use local resolution (fast, synchronous)
  const isEnabled = useMemo(() => {
    if (isLoading) {
      return defaultValue;
    }

    // First try local resolution based on plan + overrides
    const resolved = resolveFeature(featureKey, { plan, tenantOverrides });
    return resolved.enabled;
  }, [featureKey, plan, tenantOverrides, isLoading, defaultValue]);

  return isEnabled;
}

/**
 * Check if a feature is enabled with loading state
 *
 * @param {string} featureKey - Feature key
 * @param {boolean} [defaultValue=false]
 * @returns {{ isEnabled: boolean, isLoading: boolean, error: Error|null }}
 */
export function useFeatureFlagWithLoading(featureKey, defaultValue = false) {
  const { plan, tenantOverrides, isLoading, error } = useFeatureContext();

  const isEnabled = useMemo(() => {
    if (isLoading) {
      return defaultValue;
    }
    return isFeatureResolved(featureKey, { plan, tenantOverrides });
  }, [featureKey, plan, tenantOverrides, isLoading, defaultValue]);

  return { isEnabled, isLoading, error };
}

/**
 * Check multiple features at once
 *
 * @param {string[]} featureKeys - Array of feature keys
 * @returns {Object<string, boolean>}
 *
 * @example
 * const features = useFeatureFlags([Feature.AI_ASSISTANT, Feature.CAMPAIGNS]);
 * if (features.ai_assistant) { ... }
 */
export function useFeatureFlags(featureKeys) {
  const { plan, tenantOverrides, isLoading } = useFeatureContext();

  return useMemo(() => {
    const result = {};
    featureKeys.forEach((key) => {
      if (isLoading) {
        result[key] = false;
      } else {
        result[key] = isFeatureResolved(key, { plan, tenantOverrides });
      }
    });
    return result;
  }, [featureKeys, plan, tenantOverrides, isLoading]);
}

/**
 * Get detailed feature info (for debugging or upgrade prompts)
 *
 * @param {string} featureKey
 * @returns {{ enabled: boolean, source: string, upgradePath: Object|null }}
 */
export function useFeatureInfo(featureKey) {
  const { plan, tenantOverrides } = useFeatureContext();

  return useMemo(() => {
    const resolved = resolveFeature(featureKey, { plan, tenantOverrides });
    const upgradePath = resolved.enabled ? null : getUpgradePathForFeature(featureKey, plan);

    return {
      enabled: resolved.enabled,
      source: resolved.source,
      upgradePath,
    };
  }, [featureKey, plan, tenantOverrides]);
}

/**
 * Get all effective features with debug info
 *
 * @returns {Object} Full feature resolution details
 */
export function useEffectiveFeatures() {
  const { plan, tenantId, tenantOverrides, isLoading } = useFeatureContext();

  return useMemo(() => {
    if (isLoading) {
      return { features: {}, summary: {}, isLoading: true };
    }
    return {
      ...getEffectiveFeatures({ plan, tenantId, tenantOverrides }),
      isLoading: false,
    };
  }, [plan, tenantId, tenantOverrides, isLoading]);
}

/**
 * Hook for async feature check (queries database if needed)
 *
 * @param {string} flagKey - Database feature flag key (e.g., 'feature.ai_assistant')
 * @param {boolean} [defaultValue=false]
 * @returns {{ isEnabled: boolean, isLoading: boolean }}
 */
export function useAsyncFeatureFlag(flagKey, defaultValue = false) {
  const [isEnabled, setIsEnabled] = useState(defaultValue);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function check() {
      try {
        // First try sync cache
        const syncResult = isFeatureEnabledSync(flagKey, null);
        if (syncResult !== null && mounted) {
          setIsEnabled(syncResult);
          setIsLoading(false);
          return;
        }

        // Fall back to async check
        const result = await checkFeatureEnabled(flagKey, defaultValue);
        if (mounted) {
          setIsEnabled(result);
        }
      } catch (err) {
        logger.error('Error checking feature flag:', err);
        if (mounted) {
          setIsEnabled(defaultValue);
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    }

    check();

    return () => {
      mounted = false;
    };
  }, [flagKey, defaultValue]);

  return { isEnabled, isLoading };
}

// ============================================================================
// CONVENIENCE HOOKS FOR COMMON FEATURES
// ============================================================================

export function useHasAIAssistant() {
  return useFeatureFlag(Feature.AI_ASSISTANT);
}

export function useHasCampaigns() {
  return useFeatureFlag(Feature.CAMPAIGNS);
}

export function useHasAdvancedAnalytics() {
  return useFeatureFlag(Feature.ADVANCED_ANALYTICS);
}

export function useHasEnterpriseSSO() {
  return useFeatureFlag(Feature.ENTERPRISE_SSO);
}

export function useHasResellerPortal() {
  return useFeatureFlag(Feature.RESELLER_PORTAL);
}

export function useHasAPIAccess() {
  return useFeatureFlag(Feature.API_ACCESS);
}

export function useHasWhiteLabel() {
  return useFeatureFlag(Feature.WHITE_LABEL);
}

export function useHasCustomDomains() {
  return useFeatureFlag(Feature.CUSTOM_DOMAINS);
}

// ============================================================================
// CACHE MANAGEMENT HOOKS
// ============================================================================

/**
 * Hook to manage feature flag cache
 */
export function useFeatureFlagCache() {
  const { refresh } = useFeatureContext();

  const clear = useCallback(() => {
    clearFeatureFlagCache();
  }, []);

  return {
    refresh,
    clear,
  };
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  FeatureFlagProvider,
  useFeatureContext,
  useFeatureFlag,
  useFeatureFlagWithLoading,
  useFeatureFlags,
  useFeatureInfo,
  useEffectiveFeatures,
  useAsyncFeatureFlag,
  useHasAIAssistant,
  useHasCampaigns,
  useHasAdvancedAnalytics,
  useHasEnterpriseSSO,
  useHasResellerPortal,
  useHasAPIAccess,
  useHasWhiteLabel,
  useHasCustomDomains,
  useFeatureFlagCache,
};
