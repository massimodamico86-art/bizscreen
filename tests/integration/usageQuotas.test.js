/**
 * Integration Tests for Usage & Quota System
 * Phase 16: Usage tracking and quota enforcement integration tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  PLAN_QUOTAS,
  QUOTA_FEATURE_NAMES,
  QuotaExceededError,
  getQuotaForFeature,
} from '../../api/lib/usageTracker.js';
import {
  PlanSlug,
  PLAN_QUOTAS as FRONTEND_QUOTAS,
  getQuotaForFeature as getFrontendQuota,
  isQuotaUnlimited,
} from '../../src/config/plans.js';

describe('Usage Quotas Integration', () => {
  describe('Backend and Frontend Quota Consistency', () => {
    it('backend and frontend quotas match for FREE plan', () => {
      Object.keys(PLAN_QUOTAS.free).forEach((feature) => {
        expect(PLAN_QUOTAS.free[feature]).toBe(FRONTEND_QUOTAS[PlanSlug.FREE][feature]);
      });
    });

    it('backend and frontend quotas match for STARTER plan', () => {
      Object.keys(PLAN_QUOTAS.starter).forEach((feature) => {
        expect(PLAN_QUOTAS.starter[feature]).toBe(FRONTEND_QUOTAS[PlanSlug.STARTER][feature]);
      });
    });

    it('backend and frontend quotas match for PRO plan', () => {
      Object.keys(PLAN_QUOTAS.pro).forEach((feature) => {
        expect(PLAN_QUOTAS.pro[feature]).toBe(FRONTEND_QUOTAS[PlanSlug.PRO][feature]);
      });
    });

    it('backend and frontend quotas match for ENTERPRISE plan', () => {
      Object.keys(PLAN_QUOTAS.enterprise).forEach((feature) => {
        expect(PLAN_QUOTAS.enterprise[feature]).toBe(FRONTEND_QUOTAS[PlanSlug.ENTERPRISE][feature]);
      });
    });

    it('backend and frontend quotas match for RESELLER plan', () => {
      Object.keys(PLAN_QUOTAS.reseller).forEach((feature) => {
        expect(PLAN_QUOTAS.reseller[feature]).toBe(FRONTEND_QUOTAS[PlanSlug.RESELLER][feature]);
      });
    });
  });

  describe('getQuotaForFeature Consistency', () => {
    it('backend and frontend return same values', () => {
      const plans = ['free', 'starter', 'pro', 'enterprise', 'reseller'];
      const features = Object.keys(QUOTA_FEATURE_NAMES);

      plans.forEach((plan) => {
        features.forEach((feature) => {
          const backendQuota = getQuotaForFeature(feature, plan);
          const frontendQuota = getFrontendQuota(feature, plan);
          expect(backendQuota).toBe(frontendQuota);
        });
      });
    });
  });

  describe('Quota Enforcement Logic', () => {
    it('correctly identifies when quota is exceeded', () => {
      const testCases = [
        { usage: 10, quota: 10, expected: true },
        { usage: 11, quota: 10, expected: true },
        { usage: 9, quota: 10, expected: false },
        { usage: 0, quota: 10, expected: false },
      ];

      testCases.forEach(({ usage, quota, expected }) => {
        const isExceeded = usage >= quota;
        expect(isExceeded).toBe(expected);
      });
    });

    it('correctly calculates usage percentage', () => {
      const testCases = [
        { usage: 0, quota: 100, expected: 0 },
        { usage: 50, quota: 100, expected: 50 },
        { usage: 70, quota: 100, expected: 70 },
        { usage: 100, quota: 100, expected: 100 },
        { usage: 150, quota: 100, expected: 150 },
      ];

      testCases.forEach(({ usage, quota, expected }) => {
        const percentage = Math.round((usage / quota) * 100);
        expect(percentage).toBe(expected);
      });
    });

    it('correctly identifies usage status thresholds', () => {
      const getStatus = (percentage) => {
        if (percentage >= 100) return 'exceeded';
        if (percentage >= 95) return 'critical';
        if (percentage >= 70) return 'warning';
        return 'ok';
      };

      expect(getStatus(0)).toBe('ok');
      expect(getStatus(69)).toBe('ok');
      expect(getStatus(70)).toBe('warning');
      expect(getStatus(94)).toBe('warning');
      expect(getStatus(95)).toBe('critical');
      expect(getStatus(99)).toBe('critical');
      expect(getStatus(100)).toBe('exceeded');
      expect(getStatus(200)).toBe('exceeded');
    });
  });

  describe('Quota Override Priority', () => {
    it('override takes precedence over plan quota', () => {
      // Simulate the resolution logic
      const resolveQuota = (planQuota, override) => {
        if (override?.isUnlimited) return null; // Unlimited
        if (override?.monthlyLimit !== undefined) return override.monthlyLimit;
        return planQuota;
      };

      // Plan quota is 10, no override
      expect(resolveQuota(10, null)).toBe(10);

      // Plan quota is 10, override to 50
      expect(resolveQuota(10, { monthlyLimit: 50 })).toBe(50);

      // Plan quota is 10, override to unlimited
      expect(resolveQuota(10, { isUnlimited: true })).toBeNull();

      // Plan quota is null (enterprise), no change needed
      expect(resolveQuota(null, null)).toBeNull();
    });
  });

  describe('QuotaExceededError Integration', () => {
    it('error contains all required information for API response', () => {
      const error = new QuotaExceededError('ai_assistant', 10, 10, 'free');

      // Check all fields needed for API response
      expect(error.statusCode).toBe(429);
      expect(error.code).toBe('QUOTA_EXCEEDED');
      expect(error.featureKey).toBe('ai_assistant');
      expect(error.currentUsage).toBe(10);
      expect(error.quota).toBe(10);
      expect(error.planSlug).toBe('free');
      expect(error.message).toBeDefined();
    });

    it('error message includes upgrade suggestion', () => {
      const error = new QuotaExceededError('campaigns', 2, 2, 'free');
      expect(error.message.toLowerCase()).toContain('upgrade');
    });
  });

  describe('Feature Name Display', () => {
    it('all tracked features have display names', () => {
      const trackedFeatures = Object.keys(PLAN_QUOTAS.free);

      trackedFeatures.forEach((feature) => {
        expect(QUOTA_FEATURE_NAMES[feature]).toBeDefined();
        expect(typeof QUOTA_FEATURE_NAMES[feature]).toBe('string');
        expect(QUOTA_FEATURE_NAMES[feature].length).toBeGreaterThan(0);
      });
    });
  });

  describe('Plan Upgrade Path', () => {
    it('upgrading from FREE to STARTER increases all quotas', () => {
      Object.keys(PLAN_QUOTAS.free).forEach((feature) => {
        const freeQuota = PLAN_QUOTAS.free[feature];
        const starterQuota = PLAN_QUOTAS.starter[feature];
        expect(starterQuota).toBeGreaterThan(freeQuota);
      });
    });

    it('upgrading from STARTER to PRO increases all quotas', () => {
      Object.keys(PLAN_QUOTAS.starter).forEach((feature) => {
        const starterQuota = PLAN_QUOTAS.starter[feature];
        const proQuota = PLAN_QUOTAS.pro[feature];
        expect(proQuota).toBeGreaterThan(starterQuota);
      });
    });

    it('upgrading to ENTERPRISE makes all quotas unlimited', () => {
      Object.keys(PLAN_QUOTAS.pro).forEach((feature) => {
        const proQuota = PLAN_QUOTAS.pro[feature];
        const enterpriseQuota = PLAN_QUOTAS.enterprise[feature];
        expect(proQuota).toBeGreaterThan(0);
        expect(enterpriseQuota).toBeNull();
      });
    });
  });

  describe('isQuotaUnlimited Integration', () => {
    it('correctly identifies limited vs unlimited quotas', () => {
      // Limited plans
      expect(isQuotaUnlimited('ai_assistant', PlanSlug.FREE)).toBe(false);
      expect(isQuotaUnlimited('ai_assistant', PlanSlug.STARTER)).toBe(false);
      expect(isQuotaUnlimited('ai_assistant', PlanSlug.PRO)).toBe(false);

      // Unlimited plans
      expect(isQuotaUnlimited('ai_assistant', PlanSlug.ENTERPRISE)).toBe(true);
      expect(isQuotaUnlimited('ai_assistant', PlanSlug.RESELLER)).toBe(true);
    });
  });
});
