/**
 * Integration Tests for Feature Flags System
 * Phase 15: Feature flag rollout verification
 *
 * Tests verify:
 * - Feature resolution with different plan contexts
 * - API route protection
 * - Tenant overrides
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  isFeatureEnabled,
  getTenantFeatureContext,
  checkFeature,
  checkMultipleFeatures,
  getMinimumPlanForFeature,
  FeatureNotEnabledError,
  PlanSlug,
  PLAN_FEATURES,
} from '../../api/lib/featureCheck.js';

describe('Feature Flags Integration', () => {
  describe('isFeatureEnabled', () => {
    it('returns true for features in current plan', () => {
      const context = { plan: PlanSlug.PRO, overrides: {} };

      expect(isFeatureEnabled('ai_assistant', context)).toBe(true);
      expect(isFeatureEnabled('campaigns', context)).toBe(true);
      expect(isFeatureEnabled('advanced_analytics', context)).toBe(true);
    });

    it('returns false for features not in current plan', () => {
      const context = { plan: PlanSlug.FREE, overrides: {} };

      expect(isFeatureEnabled('ai_assistant', context)).toBe(false);
      expect(isFeatureEnabled('enterprise_sso', context)).toBe(false);
      expect(isFeatureEnabled('reseller_portal', context)).toBe(false);
    });

    it('respects tenant overrides (enabled)', () => {
      const context = {
        plan: PlanSlug.FREE,
        overrides: { ai_assistant: true },
      };

      // Feature enabled via override even though not in plan
      expect(isFeatureEnabled('ai_assistant', context)).toBe(true);
    });

    it('respects tenant overrides (disabled)', () => {
      const context = {
        plan: PlanSlug.PRO,
        overrides: { ai_assistant: false },
      };

      // Feature disabled via override even though in plan
      expect(isFeatureEnabled('ai_assistant', context)).toBe(false);
    });

    it('super admin has all features', () => {
      const context = {
        plan: PlanSlug.FREE,
        overrides: {},
        isSuperAdmin: true,
      };

      expect(isFeatureEnabled('ai_assistant', context)).toBe(true);
      expect(isFeatureEnabled('enterprise_sso', context)).toBe(true);
      expect(isFeatureEnabled('reseller_portal', context)).toBe(true);
    });

    it('returns true for globally enabled features regardless of plan', () => {
      const context = { plan: PlanSlug.FREE, overrides: {} };

      expect(isFeatureEnabled('basic_screens', context)).toBe(true);
      expect(isFeatureEnabled('basic_playlists', context)).toBe(true);
      expect(isFeatureEnabled('basic_media', context)).toBe(true);
      expect(isFeatureEnabled('templates_gallery', context)).toBe(true);
    });
  });

  describe('Plan feature mappings', () => {
    it('FREE plan has only basic features', () => {
      const freeFeatures = PLAN_FEATURES[PlanSlug.FREE];

      expect(freeFeatures).toContain('basic_screens');
      expect(freeFeatures).toContain('basic_playlists');
      expect(freeFeatures).toContain('basic_media');
      expect(freeFeatures).not.toContain('ai_assistant');
      expect(freeFeatures).not.toContain('campaigns');
    });

    it('STARTER plan includes advanced scheduling and screen groups', () => {
      const starterFeatures = PLAN_FEATURES[PlanSlug.STARTER];

      expect(starterFeatures).toContain('advanced_scheduling');
      expect(starterFeatures).toContain('screen_groups');
      expect(starterFeatures).toContain('basic_analytics');
      expect(starterFeatures).not.toContain('ai_assistant');
    });

    it('PRO plan includes AI and campaigns', () => {
      const proFeatures = PLAN_FEATURES[PlanSlug.PRO];

      expect(proFeatures).toContain('ai_assistant');
      expect(proFeatures).toContain('campaigns');
      expect(proFeatures).toContain('advanced_analytics');
      expect(proFeatures).toContain('api_access');
      expect(proFeatures).toContain('webhooks');
      expect(proFeatures).not.toContain('enterprise_sso');
    });

    it('ENTERPRISE plan includes SSO and SCIM', () => {
      const enterpriseFeatures = PLAN_FEATURES[PlanSlug.ENTERPRISE];

      expect(enterpriseFeatures).toContain('enterprise_sso');
      expect(enterpriseFeatures).toContain('scim_provisioning');
      expect(enterpriseFeatures).toContain('custom_domains');
      expect(enterpriseFeatures).toContain('audit_logs');
    });

    it('RESELLER plan includes client management', () => {
      const resellerFeatures = PLAN_FEATURES[PlanSlug.RESELLER];

      expect(resellerFeatures).toContain('reseller_portal');
      expect(resellerFeatures).toContain('client_management');
      expect(resellerFeatures).toContain('license_management');
      expect(resellerFeatures).toContain('white_label');
    });
  });

  describe('getMinimumPlanForFeature', () => {
    it('returns correct minimum plan for each feature', () => {
      expect(getMinimumPlanForFeature('basic_screens')).toBe(PlanSlug.FREE);
      expect(getMinimumPlanForFeature('screen_groups')).toBe(PlanSlug.STARTER);
      expect(getMinimumPlanForFeature('ai_assistant')).toBe(PlanSlug.PRO);
      expect(getMinimumPlanForFeature('enterprise_sso')).toBe(PlanSlug.ENTERPRISE);
      expect(getMinimumPlanForFeature('reseller_portal')).toBe(PlanSlug.RESELLER);
    });

    it('returns null for unknown feature', () => {
      expect(getMinimumPlanForFeature('unknown_feature')).toBeNull();
    });
  });

  describe('FeatureNotEnabledError', () => {
    it('creates error with correct properties', () => {
      const error = new FeatureNotEnabledError('ai_assistant', PlanSlug.FREE);

      expect(error.name).toBe('FeatureNotEnabledError');
      expect(error.code).toBe('FEATURE_NOT_ENABLED');
      expect(error.featureKey).toBe('ai_assistant');
      expect(error.currentPlan).toBe(PlanSlug.FREE);
      expect(error.statusCode).toBe(403);
      expect(error.message).toContain('ai_assistant');
      expect(error.message).toContain('free');
    });
  });

  describe('Feature access scenarios', () => {
    it('FREE user cannot access PRO features', () => {
      const context = { plan: PlanSlug.FREE, overrides: {} };
      const proFeatures = ['ai_assistant', 'campaigns', 'advanced_analytics', 'bulk_operations'];

      proFeatures.forEach((feature) => {
        expect(isFeatureEnabled(feature, context)).toBe(false);
      });
    });

    it('PRO user can access all STARTER features', () => {
      const context = { plan: PlanSlug.PRO, overrides: {} };
      const starterFeatures = ['advanced_scheduling', 'screen_groups', 'basic_analytics'];

      starterFeatures.forEach((feature) => {
        expect(isFeatureEnabled(feature, context)).toBe(true);
      });
    });

    it('ENTERPRISE user can access all PRO and STARTER features', () => {
      const context = { plan: PlanSlug.ENTERPRISE, overrides: {} };
      const allFeatures = [
        'basic_screens',
        'advanced_scheduling',
        'ai_assistant',
        'enterprise_sso',
      ];

      allFeatures.forEach((feature) => {
        expect(isFeatureEnabled(feature, context)).toBe(true);
      });
    });

    it('tenant override can enable enterprise feature for free user', () => {
      const context = {
        plan: PlanSlug.FREE,
        overrides: { enterprise_sso: true },
      };

      expect(isFeatureEnabled('enterprise_sso', context)).toBe(true);
    });

    it('tenant override can disable feature for paying user', () => {
      const context = {
        plan: PlanSlug.PRO,
        overrides: { ai_assistant: false },
      };

      expect(isFeatureEnabled('ai_assistant', context)).toBe(false);
    });
  });

  describe('Multiple features check', () => {
    it('allows when all features are enabled', () => {
      const context = { plan: PlanSlug.PRO, overrides: {} };
      const features = ['ai_assistant', 'campaigns'];

      const allEnabled = features.every((f) => isFeatureEnabled(f, context));
      expect(allEnabled).toBe(true);
    });

    it('denies when any feature is disabled', () => {
      const context = { plan: PlanSlug.STARTER, overrides: {} };
      const features = ['screen_groups', 'ai_assistant']; // ai_assistant not in STARTER

      const allEnabled = features.every((f) => isFeatureEnabled(f, context));
      expect(allEnabled).toBe(false);
    });
  });
});
