/**
 * Quotas Configuration Unit Tests
 * Phase 16: Tests for plan quota definitions
 */

import { describe, it, expect } from 'vitest';
import {
  PlanSlug,
  PLAN_QUOTAS,
  QUOTA_FEATURE_NAMES,
  getQuotaForFeature,
  isQuotaUnlimited,
} from '../../../src/config/plans';

describe('Quotas Configuration', () => {
  describe('PLAN_QUOTAS', () => {
    it('defines quotas for all plan tiers', () => {
      expect(PLAN_QUOTAS[PlanSlug.FREE]).toBeDefined();
      expect(PLAN_QUOTAS[PlanSlug.STARTER]).toBeDefined();
      expect(PLAN_QUOTAS[PlanSlug.PRO]).toBeDefined();
      expect(PLAN_QUOTAS[PlanSlug.ENTERPRISE]).toBeDefined();
      expect(PLAN_QUOTAS[PlanSlug.RESELLER]).toBeDefined();
    });

    it('FREE plan has restrictive quotas', () => {
      const freeQuotas = PLAN_QUOTAS[PlanSlug.FREE];
      expect(freeQuotas.ai_assistant).toBe(10);
      expect(freeQuotas.campaigns).toBe(2);
      expect(freeQuotas.audit_logs).toBe(100);
      expect(freeQuotas.api_calls).toBe(100);
      expect(freeQuotas.screen_groups).toBe(1);
      expect(freeQuotas.bulk_operations).toBe(5);
      expect(freeQuotas.webhooks).toBe(10);
    });

    it('STARTER plan has moderate quotas', () => {
      const starterQuotas = PLAN_QUOTAS[PlanSlug.STARTER];
      expect(starterQuotas.ai_assistant).toBe(50);
      expect(starterQuotas.campaigns).toBe(10);
      expect(starterQuotas.audit_logs).toBe(1000);
      expect(starterQuotas.api_calls).toBe(1000);
      expect(starterQuotas.screen_groups).toBe(10);
      expect(starterQuotas.bulk_operations).toBe(50);
      expect(starterQuotas.webhooks).toBe(100);
    });

    it('PRO plan has generous quotas', () => {
      const proQuotas = PLAN_QUOTAS[PlanSlug.PRO];
      expect(proQuotas.ai_assistant).toBe(200);
      expect(proQuotas.campaigns).toBe(50);
      expect(proQuotas.audit_logs).toBe(10000);
      expect(proQuotas.api_calls).toBe(10000);
      expect(proQuotas.screen_groups).toBe(100);
      expect(proQuotas.bulk_operations).toBe(500);
      expect(proQuotas.webhooks).toBe(1000);
    });

    it('ENTERPRISE plan has unlimited quotas', () => {
      const enterpriseQuotas = PLAN_QUOTAS[PlanSlug.ENTERPRISE];
      Object.values(enterpriseQuotas).forEach((quota) => {
        expect(quota).toBeNull();
      });
    });

    it('RESELLER plan has unlimited quotas', () => {
      const resellerQuotas = PLAN_QUOTAS[PlanSlug.RESELLER];
      Object.values(resellerQuotas).forEach((quota) => {
        expect(quota).toBeNull();
      });
    });
  });

  describe('QUOTA_FEATURE_NAMES', () => {
    it('has display names for all tracked features', () => {
      expect(QUOTA_FEATURE_NAMES.ai_assistant).toBe('AI Assistant Requests');
      expect(QUOTA_FEATURE_NAMES.campaigns).toBe('Campaign Creations');
      expect(QUOTA_FEATURE_NAMES.audit_logs).toBe('Audit Log Entries');
      expect(QUOTA_FEATURE_NAMES.api_calls).toBe('API Calls');
      expect(QUOTA_FEATURE_NAMES.screen_groups).toBe('Screen Group Operations');
      expect(QUOTA_FEATURE_NAMES.bulk_operations).toBe('Bulk Operations');
      expect(QUOTA_FEATURE_NAMES.webhooks).toBe('Webhook Deliveries');
    });

    it('has 7 tracked features', () => {
      expect(Object.keys(QUOTA_FEATURE_NAMES)).toHaveLength(7);
    });
  });

  describe('getQuotaForFeature', () => {
    it('returns correct quota for valid plan and feature', () => {
      expect(getQuotaForFeature('ai_assistant', PlanSlug.FREE)).toBe(10);
      expect(getQuotaForFeature('ai_assistant', PlanSlug.STARTER)).toBe(50);
      expect(getQuotaForFeature('ai_assistant', PlanSlug.PRO)).toBe(200);
    });

    it('returns null for enterprise plans', () => {
      expect(getQuotaForFeature('ai_assistant', PlanSlug.ENTERPRISE)).toBeNull();
      expect(getQuotaForFeature('campaigns', PlanSlug.ENTERPRISE)).toBeNull();
    });

    it('returns null for reseller plans', () => {
      expect(getQuotaForFeature('ai_assistant', PlanSlug.RESELLER)).toBeNull();
      expect(getQuotaForFeature('campaigns', PlanSlug.RESELLER)).toBeNull();
    });

    it('returns null for unknown features', () => {
      expect(getQuotaForFeature('unknown_feature', PlanSlug.PRO)).toBeNull();
    });

    it('falls back to FREE plan for invalid plan', () => {
      expect(getQuotaForFeature('ai_assistant', 'invalid_plan')).toBe(10);
    });
  });

  describe('isQuotaUnlimited', () => {
    it('returns false for FREE plan features', () => {
      expect(isQuotaUnlimited('ai_assistant', PlanSlug.FREE)).toBe(false);
      expect(isQuotaUnlimited('campaigns', PlanSlug.FREE)).toBe(false);
    });

    it('returns false for STARTER plan features', () => {
      expect(isQuotaUnlimited('ai_assistant', PlanSlug.STARTER)).toBe(false);
      expect(isQuotaUnlimited('campaigns', PlanSlug.STARTER)).toBe(false);
    });

    it('returns false for PRO plan features', () => {
      expect(isQuotaUnlimited('ai_assistant', PlanSlug.PRO)).toBe(false);
      expect(isQuotaUnlimited('campaigns', PlanSlug.PRO)).toBe(false);
    });

    it('returns true for ENTERPRISE plan features', () => {
      expect(isQuotaUnlimited('ai_assistant', PlanSlug.ENTERPRISE)).toBe(true);
      expect(isQuotaUnlimited('campaigns', PlanSlug.ENTERPRISE)).toBe(true);
    });

    it('returns true for RESELLER plan features', () => {
      expect(isQuotaUnlimited('ai_assistant', PlanSlug.RESELLER)).toBe(true);
      expect(isQuotaUnlimited('campaigns', PlanSlug.RESELLER)).toBe(true);
    });

    it('returns true for unknown features (no quota defined)', () => {
      expect(isQuotaUnlimited('unknown_feature', PlanSlug.FREE)).toBe(true);
    });
  });

  describe('Quota Progression', () => {
    const features = ['ai_assistant', 'campaigns', 'api_calls', 'screen_groups'];
    const plans = [PlanSlug.FREE, PlanSlug.STARTER, PlanSlug.PRO];

    it('quotas increase with each tier upgrade', () => {
      features.forEach((feature) => {
        for (let i = 0; i < plans.length - 1; i++) {
          const currentQuota = getQuotaForFeature(feature, plans[i]);
          const nextQuota = getQuotaForFeature(feature, plans[i + 1]);
          expect(nextQuota).toBeGreaterThan(currentQuota);
        }
      });
    });

    it('enterprise quotas are always unlimited', () => {
      features.forEach((feature) => {
        expect(getQuotaForFeature(feature, PlanSlug.ENTERPRISE)).toBeNull();
      });
    });
  });

  describe('Quota Values Validation', () => {
    it('all non-null quotas are positive integers', () => {
      Object.values(PLAN_QUOTAS).forEach((planQuotas) => {
        Object.values(planQuotas).forEach((quota) => {
          if (quota !== null) {
            expect(Number.isInteger(quota)).toBe(true);
            expect(quota).toBeGreaterThan(0);
          }
        });
      });
    });

    it('all plans have the same feature keys', () => {
      const freeKeys = Object.keys(PLAN_QUOTAS[PlanSlug.FREE]).sort();

      Object.values(PlanSlug).forEach((planSlug) => {
        const planKeys = Object.keys(PLAN_QUOTAS[planSlug]).sort();
        expect(planKeys).toEqual(freeKeys);
      });
    });
  });
});
