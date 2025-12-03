/**
 * Plans Configuration Unit Tests
 * Phase 14: Tests for centralized plan tier definitions
 */
import { describe, it, expect } from 'vitest';
import {
  PlanSlug,
  PLANS,
  PLAN_ORDER,
  Feature,
  FEATURE_METADATA,
  getPlanFeatures,
  isPlanFeature,
  getMinimumPlanForFeature,
  comparePlans,
  isPlanAtLeast,
  getPlanLimits,
  getAllPlans,
  groupFeaturesByCategory,
  formatPlanPrice,
} from '../../../src/config/plans';

describe('Plans Configuration', () => {
  describe('PlanSlug', () => {
    it('contains all expected plan slugs', () => {
      expect(PlanSlug.FREE).toBe('free');
      expect(PlanSlug.STARTER).toBe('starter');
      expect(PlanSlug.PRO).toBe('pro');
      expect(PlanSlug.ENTERPRISE).toBe('enterprise');
      expect(PlanSlug.RESELLER).toBe('reseller');
    });

    it('has 5 plan types', () => {
      expect(Object.keys(PlanSlug)).toHaveLength(5);
    });
  });

  describe('PLANS', () => {
    it('has definitions for all plan slugs', () => {
      Object.values(PlanSlug).forEach((slug) => {
        expect(PLANS[slug]).toBeDefined();
        expect(PLANS[slug].slug).toBe(slug);
      });
    });

    it('each plan has required properties', () => {
      Object.values(PLANS).forEach((plan) => {
        expect(plan).toHaveProperty('slug');
        expect(plan).toHaveProperty('name');
        expect(plan).toHaveProperty('description');
        expect(plan).toHaveProperty('limits');
        expect(plan).toHaveProperty('features');
        expect(Array.isArray(plan.features)).toBe(true);
      });
    });

    it('Free plan has basic features', () => {
      const freePlan = PLANS[PlanSlug.FREE];
      expect(freePlan.features).toContain(Feature.BASIC_SCREENS);
      expect(freePlan.features).toContain(Feature.BASIC_PLAYLISTS);
      expect(freePlan.features).toContain(Feature.BASIC_MEDIA);
      expect(freePlan.features).toContain(Feature.TEMPLATES_GALLERY);
    });

    it('Pro plan includes AI assistant and campaigns', () => {
      const proPlan = PLANS[PlanSlug.PRO];
      expect(proPlan.features).toContain(Feature.AI_ASSISTANT);
      expect(proPlan.features).toContain(Feature.CAMPAIGNS);
      expect(proPlan.features).toContain(Feature.ADVANCED_ANALYTICS);
    });

    it('Enterprise plan includes SSO and SCIM', () => {
      const enterprisePlan = PLANS[PlanSlug.ENTERPRISE];
      expect(enterprisePlan.features).toContain(Feature.ENTERPRISE_SSO);
      expect(enterprisePlan.features).toContain(Feature.SCIM_PROVISIONING);
      expect(enterprisePlan.features).toContain(Feature.AUDIT_LOGS);
    });

    it('Reseller plan includes reseller-specific features', () => {
      const resellerPlan = PLANS[PlanSlug.RESELLER];
      expect(resellerPlan.features).toContain(Feature.RESELLER_PORTAL);
      expect(resellerPlan.features).toContain(Feature.CLIENT_MANAGEMENT);
      expect(resellerPlan.features).toContain(Feature.LICENSE_MANAGEMENT);
    });
  });

  describe('PLAN_ORDER', () => {
    it('orders plans from free to reseller', () => {
      expect(PLAN_ORDER[PlanSlug.FREE]).toBe(0);
      expect(PLAN_ORDER[PlanSlug.STARTER]).toBe(1);
      expect(PLAN_ORDER[PlanSlug.PRO]).toBe(2);
      expect(PLAN_ORDER[PlanSlug.ENTERPRISE]).toBe(3);
      expect(PLAN_ORDER[PlanSlug.RESELLER]).toBe(4);
    });
  });

  describe('Feature', () => {
    it('contains expected feature keys', () => {
      expect(Feature.BASIC_SCREENS).toBe('basic_screens');
      expect(Feature.AI_ASSISTANT).toBe('ai_assistant');
      expect(Feature.ENTERPRISE_SSO).toBe('enterprise_sso');
      expect(Feature.RESELLER_PORTAL).toBe('reseller_portal');
    });

    it('has metadata for all features', () => {
      Object.values(Feature).forEach((featureKey) => {
        expect(FEATURE_METADATA[featureKey]).toBeDefined();
        expect(FEATURE_METADATA[featureKey]).toHaveProperty('name');
        expect(FEATURE_METADATA[featureKey]).toHaveProperty('category');
      });
    });
  });

  describe('getPlanFeatures', () => {
    it('returns features for a valid plan', () => {
      const features = getPlanFeatures(PlanSlug.PRO);
      expect(Array.isArray(features)).toBe(true);
      expect(features).toContain(Feature.AI_ASSISTANT);
    });

    it('returns Free plan features for invalid plan', () => {
      const features = getPlanFeatures('invalid_plan');
      expect(features).toEqual(PLANS[PlanSlug.FREE].features);
    });
  });

  describe('isPlanFeature', () => {
    it('returns true for features included in plan', () => {
      expect(isPlanFeature(PlanSlug.PRO, Feature.AI_ASSISTANT)).toBe(true);
      expect(isPlanFeature(PlanSlug.ENTERPRISE, Feature.ENTERPRISE_SSO)).toBe(true);
    });

    it('returns false for features not included in plan', () => {
      expect(isPlanFeature(PlanSlug.FREE, Feature.AI_ASSISTANT)).toBe(false);
      expect(isPlanFeature(PlanSlug.STARTER, Feature.ENTERPRISE_SSO)).toBe(false);
    });

    it('returns true for basic features in all plans', () => {
      Object.values(PlanSlug).forEach((slug) => {
        expect(isPlanFeature(slug, Feature.BASIC_SCREENS)).toBe(true);
      });
    });
  });

  describe('getMinimumPlanForFeature', () => {
    it('returns free for basic features', () => {
      expect(getMinimumPlanForFeature(Feature.BASIC_SCREENS)).toBe(PlanSlug.FREE);
      expect(getMinimumPlanForFeature(Feature.BASIC_PLAYLISTS)).toBe(PlanSlug.FREE);
    });

    it('returns starter for scheduling features', () => {
      expect(getMinimumPlanForFeature(Feature.ADVANCED_SCHEDULING)).toBe(PlanSlug.STARTER);
    });

    it('returns pro for AI features', () => {
      expect(getMinimumPlanForFeature(Feature.AI_ASSISTANT)).toBe(PlanSlug.PRO);
    });

    it('returns enterprise for SSO features', () => {
      expect(getMinimumPlanForFeature(Feature.ENTERPRISE_SSO)).toBe(PlanSlug.ENTERPRISE);
    });

    it('returns reseller for reseller features', () => {
      expect(getMinimumPlanForFeature(Feature.RESELLER_PORTAL)).toBe(PlanSlug.RESELLER);
    });

    it('returns null for unknown feature', () => {
      expect(getMinimumPlanForFeature('unknown_feature')).toBeNull();
    });
  });

  describe('comparePlans', () => {
    it('returns negative when first plan is lower', () => {
      expect(comparePlans(PlanSlug.FREE, PlanSlug.PRO)).toBeLessThan(0);
      expect(comparePlans(PlanSlug.STARTER, PlanSlug.ENTERPRISE)).toBeLessThan(0);
    });

    it('returns positive when first plan is higher', () => {
      expect(comparePlans(PlanSlug.PRO, PlanSlug.FREE)).toBeGreaterThan(0);
      expect(comparePlans(PlanSlug.ENTERPRISE, PlanSlug.STARTER)).toBeGreaterThan(0);
    });

    it('returns zero for same plan', () => {
      expect(comparePlans(PlanSlug.PRO, PlanSlug.PRO)).toBe(0);
    });
  });

  describe('isPlanAtLeast', () => {
    it('returns true when current plan meets requirement', () => {
      expect(isPlanAtLeast(PlanSlug.PRO, PlanSlug.STARTER)).toBe(true);
      expect(isPlanAtLeast(PlanSlug.ENTERPRISE, PlanSlug.PRO)).toBe(true);
    });

    it('returns true when plans are equal', () => {
      expect(isPlanAtLeast(PlanSlug.PRO, PlanSlug.PRO)).toBe(true);
    });

    it('returns false when current plan is lower', () => {
      expect(isPlanAtLeast(PlanSlug.FREE, PlanSlug.PRO)).toBe(false);
      expect(isPlanAtLeast(PlanSlug.STARTER, PlanSlug.ENTERPRISE)).toBe(false);
    });
  });

  describe('getPlanLimits', () => {
    it('returns limits for a valid plan', () => {
      const limits = getPlanLimits(PlanSlug.STARTER);
      expect(limits).toHaveProperty('maxScreens');
      expect(limits.maxScreens).toBe(5);
    });

    it('returns Free plan limits for invalid plan', () => {
      const limits = getPlanLimits('invalid_plan');
      expect(limits).toEqual(PLANS[PlanSlug.FREE].limits);
    });

    it('Enterprise plan has unlimited resources (null values)', () => {
      const limits = getPlanLimits(PlanSlug.ENTERPRISE);
      expect(limits.maxScreens).toBeNull();
      expect(limits.maxMediaAssets).toBeNull();
    });
  });

  describe('getAllPlans', () => {
    it('returns all plans including custom priced ones by default', () => {
      const allPlans = getAllPlans();
      expect(allPlans.length).toBe(5);
    });

    it('excludes custom priced plans when specified', () => {
      const standardPlans = getAllPlans(false);
      expect(standardPlans.length).toBe(3); // Free, Starter, Pro
      expect(standardPlans.every((p) => p.priceMonthly !== null)).toBe(true);
    });

    it('plans are sorted by displayOrder', () => {
      const allPlans = getAllPlans();
      for (let i = 0; i < allPlans.length - 1; i++) {
        expect(allPlans[i].displayOrder).toBeLessThan(allPlans[i + 1].displayOrder);
      }
    });
  });

  describe('groupFeaturesByCategory', () => {
    it('groups features by their category', () => {
      const features = [Feature.BASIC_SCREENS, Feature.AI_ASSISTANT, Feature.ENTERPRISE_SSO];
      const grouped = groupFeaturesByCategory(features);

      expect(grouped).toHaveProperty('core');
      expect(grouped).toHaveProperty('ai');
      expect(grouped).toHaveProperty('security');
    });

    it('includes feature metadata in grouped result', () => {
      const features = [Feature.AI_ASSISTANT];
      const grouped = groupFeaturesByCategory(features);

      expect(grouped.ai[0].key).toBe(Feature.AI_ASSISTANT);
      expect(grouped.ai[0].name).toBe('AI Content Assistant');
    });
  });

  describe('formatPlanPrice', () => {
    it('formats monthly price correctly', () => {
      expect(formatPlanPrice(2900)).toBe('$29/mo');
      expect(formatPlanPrice(9900)).toBe('$99/mo');
    });

    it('formats yearly price correctly', () => {
      expect(formatPlanPrice(29000, 'yearly')).toBe('$290/year');
    });

    it('returns "Free" for zero price', () => {
      expect(formatPlanPrice(0)).toBe('Free');
    });

    it('returns "Contact Sales" for null price', () => {
      expect(formatPlanPrice(null)).toBe('Contact Sales');
    });
  });
});
