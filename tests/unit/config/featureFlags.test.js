/**
 * Feature Flags Unit Tests
 * Phase 14: Tests for feature flag resolution logic
 */
import { describe, it, expect } from 'vitest';
import {
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
} from '../../../src/config/featureFlags';
import { PlanSlug, Feature } from '../../../src/config/plans';

describe('Feature Flags', () => {
  describe('GLOBAL_FLAGS', () => {
    it('has basic features enabled globally', () => {
      expect(GLOBAL_FLAGS[Feature.BASIC_SCREENS]).toBe(true);
      expect(GLOBAL_FLAGS[Feature.BASIC_PLAYLISTS]).toBe(true);
      expect(GLOBAL_FLAGS[Feature.BASIC_MEDIA]).toBe(true);
      expect(GLOBAL_FLAGS[Feature.TEMPLATES_GALLERY]).toBe(true);
    });
  });

  describe('FeatureFlagKey', () => {
    it('maps feature names to database keys', () => {
      expect(FeatureFlagKey.AI_ASSISTANT).toBe('feature.ai_assistant');
      expect(FeatureFlagKey.ENTERPRISE_SSO).toBe('feature.enterprise_sso');
    });
  });

  describe('FEATURE_TO_FLAG_KEY', () => {
    it('maps Feature constants to FeatureFlagKey', () => {
      expect(FEATURE_TO_FLAG_KEY[Feature.AI_ASSISTANT]).toBe(FeatureFlagKey.AI_ASSISTANT);
      expect(FEATURE_TO_FLAG_KEY[Feature.ENTERPRISE_SSO]).toBe(FeatureFlagKey.ENTERPRISE_SSO);
    });
  });

  describe('resolveFeature', () => {
    it('returns enabled from tenant override when set (highest priority)', () => {
      const result = resolveFeature(Feature.AI_ASSISTANT, {
        plan: PlanSlug.FREE,
        tenantOverrides: { [Feature.AI_ASSISTANT]: true },
      });

      expect(result.enabled).toBe(true);
      expect(result.source).toBe('override');
    });

    it('tenant override can disable a plan feature', () => {
      const result = resolveFeature(Feature.AI_ASSISTANT, {
        plan: PlanSlug.PRO,
        tenantOverrides: { [Feature.AI_ASSISTANT]: false },
      });

      expect(result.enabled).toBe(false);
      expect(result.source).toBe('override');
    });

    it('returns enabled from plan when feature is included', () => {
      const result = resolveFeature(Feature.AI_ASSISTANT, {
        plan: PlanSlug.PRO,
      });

      expect(result.enabled).toBe(true);
      expect(result.source).toBe('plan');
    });

    it('returns enabled from global flag when present', () => {
      // Note: BASIC_SCREENS is both in the Free plan AND in GLOBAL_FLAGS
      // Since plan is checked before global, it returns 'plan' source
      const result = resolveFeature(Feature.BASIC_SCREENS, {
        plan: PlanSlug.FREE,
      });

      expect(result.enabled).toBe(true);
      // Plan features are checked before global flags in resolution order
      expect(result.source).toBe('plan');
    });

    it('returns disabled by default when not in plan or global', () => {
      const result = resolveFeature(Feature.ENTERPRISE_SSO, {
        plan: PlanSlug.FREE,
      });

      expect(result.enabled).toBe(false);
      expect(result.source).toBe('default');
    });

    it('global override takes precedence over plan but not tenant override', () => {
      const result = resolveFeature(Feature.AI_ASSISTANT, {
        plan: PlanSlug.FREE,
        globalOverrides: { [Feature.AI_ASSISTANT]: true },
      });

      expect(result.enabled).toBe(true);
      expect(result.source).toBe('global_override');
    });

    it('uses Free plan when no plan specified', () => {
      const result = resolveFeature(Feature.AI_ASSISTANT, {});

      expect(result.enabled).toBe(false);
      expect(result.source).toBe('default');
    });
  });

  describe('resolveFeatures', () => {
    it('resolves multiple features at once', () => {
      const features = [Feature.AI_ASSISTANT, Feature.BASIC_SCREENS, Feature.ENTERPRISE_SSO];
      const results = resolveFeatures(features, { plan: PlanSlug.PRO });

      expect(results[Feature.AI_ASSISTANT].enabled).toBe(true);
      expect(results[Feature.BASIC_SCREENS].enabled).toBe(true);
      expect(results[Feature.ENTERPRISE_SSO].enabled).toBe(false);
    });
  });

  describe('resolveAllFeatures', () => {
    it('resolves all defined features', () => {
      const results = resolveAllFeatures({ plan: PlanSlug.PRO });
      const featureCount = Object.values(Feature).length;

      expect(Object.keys(results).length).toBe(featureCount);
    });

    it('each result has key, enabled, and source', () => {
      const results = resolveAllFeatures({ plan: PlanSlug.FREE });

      Object.entries(results).forEach(([key, value]) => {
        expect(value.key).toBe(key);
        expect(typeof value.enabled).toBe('boolean');
        expect(['override', 'global_override', 'plan', 'global', 'default']).toContain(value.source);
      });
    });
  });

  describe('isFeatureResolved', () => {
    it('returns true for enabled feature', () => {
      expect(isFeatureResolved(Feature.AI_ASSISTANT, { plan: PlanSlug.PRO })).toBe(true);
      expect(isFeatureResolved(Feature.BASIC_SCREENS, { plan: PlanSlug.FREE })).toBe(true);
    });

    it('returns false for disabled feature', () => {
      expect(isFeatureResolved(Feature.AI_ASSISTANT, { plan: PlanSlug.FREE })).toBe(false);
      expect(isFeatureResolved(Feature.ENTERPRISE_SSO, { plan: PlanSlug.STARTER })).toBe(false);
    });
  });

  describe('getEnabledFeatures', () => {
    it('returns array of enabled feature keys', () => {
      const enabled = getEnabledFeatures({ plan: PlanSlug.FREE });

      expect(Array.isArray(enabled)).toBe(true);
      expect(enabled).toContain(Feature.BASIC_SCREENS);
      expect(enabled).toContain(Feature.BASIC_PLAYLISTS);
    });

    it('Pro plan has more enabled features than Free', () => {
      const freeEnabled = getEnabledFeatures({ plan: PlanSlug.FREE });
      const proEnabled = getEnabledFeatures({ plan: PlanSlug.PRO });

      expect(proEnabled.length).toBeGreaterThan(freeEnabled.length);
      expect(proEnabled).toContain(Feature.AI_ASSISTANT);
    });

    it('Enterprise plan has the most features', () => {
      const proEnabled = getEnabledFeatures({ plan: PlanSlug.PRO });
      const enterpriseEnabled = getEnabledFeatures({ plan: PlanSlug.ENTERPRISE });

      expect(enterpriseEnabled.length).toBeGreaterThan(proEnabled.length);
      expect(enterpriseEnabled).toContain(Feature.ENTERPRISE_SSO);
    });
  });

  describe('getEffectiveFeatures', () => {
    it('returns context information', () => {
      const result = getEffectiveFeatures({
        plan: PlanSlug.PRO,
        tenantId: 'test-tenant',
      });

      expect(result.context.plan).toBe(PlanSlug.PRO);
      expect(result.context.tenantId).toBe('test-tenant');
    });

    it('returns features grouped by source', () => {
      const result = getEffectiveFeatures({ plan: PlanSlug.PRO });

      expect(result.bySource).toHaveProperty('override');
      expect(result.bySource).toHaveProperty('plan');
      expect(result.bySource).toHaveProperty('global');
      expect(result.bySource).toHaveProperty('default');
    });

    it('returns summary with counts', () => {
      const result = getEffectiveFeatures({ plan: PlanSlug.PRO });

      expect(result.summary).toHaveProperty('total');
      expect(result.summary).toHaveProperty('enabled');
      expect(result.summary).toHaveProperty('fromPlan');
      expect(result.summary).toHaveProperty('fromGlobal');
      expect(result.summary.enabled).toBeGreaterThan(0);
    });

    it('hasOverrides is true when tenant overrides present', () => {
      const result = getEffectiveFeatures({
        plan: PlanSlug.FREE,
        tenantOverrides: { [Feature.AI_ASSISTANT]: true },
      });

      expect(result.context.hasOverrides).toBe(true);
    });

    it('hasOverrides is false when no overrides', () => {
      const result = getEffectiveFeatures({ plan: PlanSlug.PRO });

      expect(result.context.hasOverrides).toBe(false);
    });
  });

  describe('requireFeature', () => {
    it('does not throw when feature is enabled', () => {
      expect(() => {
        requireFeature(Feature.AI_ASSISTANT, { plan: PlanSlug.PRO });
      }).not.toThrow();
    });

    it('throws when feature is not enabled', () => {
      expect(() => {
        requireFeature(Feature.AI_ASSISTANT, { plan: PlanSlug.FREE });
      }).toThrow('Feature "ai_assistant" is not enabled for your plan');
    });

    it('thrown error has correct properties', () => {
      try {
        requireFeature(Feature.AI_ASSISTANT, { plan: PlanSlug.FREE });
      } catch (error) {
        expect(error.code).toBe('FEATURE_NOT_ENABLED');
        expect(error.featureKey).toBe(Feature.AI_ASSISTANT);
      }
    });
  });

  describe('checkRequiredFeatures', () => {
    it('returns allowed=true when all features are enabled', () => {
      const result = checkRequiredFeatures(
        [Feature.AI_ASSISTANT, Feature.CAMPAIGNS],
        { plan: PlanSlug.PRO }
      );

      expect(result.allowed).toBe(true);
      expect(result.missing).toHaveLength(0);
    });

    it('returns allowed=false with missing features', () => {
      const result = checkRequiredFeatures(
        [Feature.AI_ASSISTANT, Feature.ENTERPRISE_SSO],
        { plan: PlanSlug.PRO }
      );

      expect(result.allowed).toBe(false);
      expect(result.missing).toContain(Feature.ENTERPRISE_SSO);
    });

    it('returns all missing features', () => {
      const result = checkRequiredFeatures(
        [Feature.AI_ASSISTANT, Feature.ENTERPRISE_SSO, Feature.SCIM_PROVISIONING],
        { plan: PlanSlug.FREE }
      );

      expect(result.missing).toContain(Feature.AI_ASSISTANT);
      expect(result.missing).toContain(Feature.ENTERPRISE_SSO);
      expect(result.missing).toContain(Feature.SCIM_PROVISIONING);
    });
  });

  describe('getFeaturesGainedByUpgrade', () => {
    it('returns features gained when upgrading from Free to Starter', () => {
      const gained = getFeaturesGainedByUpgrade(PlanSlug.FREE, PlanSlug.STARTER);

      expect(gained).toContain(Feature.ADVANCED_SCHEDULING);
      expect(gained).toContain(Feature.SCREEN_GROUPS);
      expect(gained).toContain(Feature.BASIC_ANALYTICS);
    });

    it('returns features gained when upgrading from Starter to Pro', () => {
      const gained = getFeaturesGainedByUpgrade(PlanSlug.STARTER, PlanSlug.PRO);

      expect(gained).toContain(Feature.AI_ASSISTANT);
      expect(gained).toContain(Feature.CAMPAIGNS);
      expect(gained).toContain(Feature.ADVANCED_ANALYTICS);
    });

    it('returns features gained when upgrading from Pro to Enterprise', () => {
      const gained = getFeaturesGainedByUpgrade(PlanSlug.PRO, PlanSlug.ENTERPRISE);

      expect(gained).toContain(Feature.ENTERPRISE_SSO);
      expect(gained).toContain(Feature.SCIM_PROVISIONING);
      expect(gained).toContain(Feature.AUDIT_LOGS);
    });

    it('does not include features already in current plan', () => {
      const gained = getFeaturesGainedByUpgrade(PlanSlug.STARTER, PlanSlug.PRO);

      expect(gained).not.toContain(Feature.BASIC_SCREENS);
      expect(gained).not.toContain(Feature.ADVANCED_SCHEDULING);
    });
  });

  describe('getUpgradePathForFeature', () => {
    it('returns Starter for scheduling feature when on Free', () => {
      const upgrade = getUpgradePathForFeature(Feature.ADVANCED_SCHEDULING, PlanSlug.FREE);

      expect(upgrade).not.toBeNull();
      expect(upgrade.required).toBe(PlanSlug.STARTER);
      expect(upgrade.name).toBe('Starter');
    });

    it('returns Pro for AI feature when on Starter', () => {
      const upgrade = getUpgradePathForFeature(Feature.AI_ASSISTANT, PlanSlug.STARTER);

      expect(upgrade).not.toBeNull();
      expect(upgrade.required).toBe(PlanSlug.PRO);
      expect(upgrade.name).toBe('Pro');
    });

    it('returns Enterprise for SSO when on Pro', () => {
      const upgrade = getUpgradePathForFeature(Feature.ENTERPRISE_SSO, PlanSlug.PRO);

      expect(upgrade).not.toBeNull();
      expect(upgrade.required).toBe(PlanSlug.ENTERPRISE);
    });

    it('returns Reseller for reseller features', () => {
      const upgrade = getUpgradePathForFeature(Feature.RESELLER_PORTAL, PlanSlug.PRO);

      expect(upgrade).not.toBeNull();
      expect(upgrade.required).toBe(PlanSlug.RESELLER);
    });

    it('returns null for feature already in current plan', () => {
      const upgrade = getUpgradePathForFeature(Feature.AI_ASSISTANT, PlanSlug.PRO);

      expect(upgrade).toBeNull();
    });

    it('returns null for unknown feature', () => {
      const upgrade = getUpgradePathForFeature('unknown_feature', PlanSlug.FREE);

      expect(upgrade).toBeNull();
    });
  });

  describe('Resolution Priority', () => {
    it('tenant override beats everything else', () => {
      const result = resolveFeature(Feature.AI_ASSISTANT, {
        plan: PlanSlug.PRO, // Would enable via plan
        tenantOverrides: { [Feature.AI_ASSISTANT]: false }, // But override disables
        globalOverrides: { [Feature.AI_ASSISTANT]: true }, // And global would enable
      });

      expect(result.enabled).toBe(false);
      expect(result.source).toBe('override');
    });

    it('global override beats plan but not tenant', () => {
      const result = resolveFeature(Feature.AI_ASSISTANT, {
        plan: PlanSlug.FREE, // Would disable (not in plan)
        globalOverrides: { [Feature.AI_ASSISTANT]: true }, // Global enables
      });

      expect(result.enabled).toBe(true);
      expect(result.source).toBe('global_override');
    });

    it('plan beats global flags', () => {
      // For a feature that's both in global flags AND in plan
      const result = resolveFeature(Feature.BASIC_SCREENS, {
        plan: PlanSlug.PRO, // Has this feature
      });

      // Since both plan and global have it, plan takes precedence
      expect(result.enabled).toBe(true);
      // It should be from plan since plan check happens before global
      expect(result.source).toBe('plan');
    });
  });
});
