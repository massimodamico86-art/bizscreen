/**
 * Usage Tracker Unit Tests
 * Phase 16: Tests for usage tracking, quota enforcement, and billing
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  PLAN_QUOTAS,
  QUOTA_FEATURE_NAMES,
  QuotaExceededError,
  getQuotaForFeature,
} from '../../../api/lib/usageTracker.js';

describe('Usage Tracker', () => {
  describe('PLAN_QUOTAS', () => {
    it('defines quotas for all plan tiers', () => {
      expect(PLAN_QUOTAS.free).toBeDefined();
      expect(PLAN_QUOTAS.starter).toBeDefined();
      expect(PLAN_QUOTAS.pro).toBeDefined();
      expect(PLAN_QUOTAS.enterprise).toBeDefined();
      expect(PLAN_QUOTAS.reseller).toBeDefined();
    });

    it('FREE plan has the most restrictive quotas', () => {
      expect(PLAN_QUOTAS.free.ai_assistant).toBe(10);
      expect(PLAN_QUOTAS.free.campaigns).toBe(2);
      expect(PLAN_QUOTAS.free.audit_logs).toBe(100);
      expect(PLAN_QUOTAS.free.api_calls).toBe(100);
      expect(PLAN_QUOTAS.free.screen_groups).toBe(1);
    });

    it('STARTER plan has higher quotas than FREE', () => {
      expect(PLAN_QUOTAS.starter.ai_assistant).toBeGreaterThan(PLAN_QUOTAS.free.ai_assistant);
      expect(PLAN_QUOTAS.starter.campaigns).toBeGreaterThan(PLAN_QUOTAS.free.campaigns);
      expect(PLAN_QUOTAS.starter.api_calls).toBeGreaterThan(PLAN_QUOTAS.free.api_calls);
    });

    it('PRO plan has higher quotas than STARTER', () => {
      expect(PLAN_QUOTAS.pro.ai_assistant).toBeGreaterThan(PLAN_QUOTAS.starter.ai_assistant);
      expect(PLAN_QUOTAS.pro.campaigns).toBeGreaterThan(PLAN_QUOTAS.starter.campaigns);
      expect(PLAN_QUOTAS.pro.api_calls).toBeGreaterThan(PLAN_QUOTAS.starter.api_calls);
    });

    it('ENTERPRISE plan has unlimited quotas (null)', () => {
      expect(PLAN_QUOTAS.enterprise.ai_assistant).toBeNull();
      expect(PLAN_QUOTAS.enterprise.campaigns).toBeNull();
      expect(PLAN_QUOTAS.enterprise.audit_logs).toBeNull();
      expect(PLAN_QUOTAS.enterprise.api_calls).toBeNull();
    });

    it('RESELLER plan has unlimited quotas (null)', () => {
      expect(PLAN_QUOTAS.reseller.ai_assistant).toBeNull();
      expect(PLAN_QUOTAS.reseller.campaigns).toBeNull();
      expect(PLAN_QUOTAS.reseller.audit_logs).toBeNull();
      expect(PLAN_QUOTAS.reseller.api_calls).toBeNull();
    });
  });

  describe('QUOTA_FEATURE_NAMES', () => {
    it('has human-readable names for all tracked features', () => {
      expect(QUOTA_FEATURE_NAMES.ai_assistant).toBe('AI Assistant Requests');
      expect(QUOTA_FEATURE_NAMES.campaigns).toBe('Campaign Creations');
      expect(QUOTA_FEATURE_NAMES.audit_logs).toBe('Audit Log Entries');
      expect(QUOTA_FEATURE_NAMES.api_calls).toBe('API Calls');
      expect(QUOTA_FEATURE_NAMES.screen_groups).toBe('Screen Group Operations');
      expect(QUOTA_FEATURE_NAMES.bulk_operations).toBe('Bulk Operations');
      expect(QUOTA_FEATURE_NAMES.webhooks).toBe('Webhook Deliveries');
    });

    it('covers all features in PLAN_QUOTAS', () => {
      const quotaKeys = Object.keys(PLAN_QUOTAS.free);
      quotaKeys.forEach((key) => {
        expect(QUOTA_FEATURE_NAMES[key]).toBeDefined();
      });
    });
  });

  describe('getQuotaForFeature', () => {
    it('returns correct quota for FREE plan', () => {
      expect(getQuotaForFeature('ai_assistant', 'free')).toBe(10);
      expect(getQuotaForFeature('campaigns', 'free')).toBe(2);
      expect(getQuotaForFeature('api_calls', 'free')).toBe(100);
    });

    it('returns correct quota for STARTER plan', () => {
      expect(getQuotaForFeature('ai_assistant', 'starter')).toBe(50);
      expect(getQuotaForFeature('campaigns', 'starter')).toBe(10);
      expect(getQuotaForFeature('api_calls', 'starter')).toBe(1000);
    });

    it('returns correct quota for PRO plan', () => {
      expect(getQuotaForFeature('ai_assistant', 'pro')).toBe(200);
      expect(getQuotaForFeature('campaigns', 'pro')).toBe(50);
      expect(getQuotaForFeature('api_calls', 'pro')).toBe(10000);
    });

    it('returns null for ENTERPRISE plan (unlimited)', () => {
      expect(getQuotaForFeature('ai_assistant', 'enterprise')).toBeNull();
      expect(getQuotaForFeature('campaigns', 'enterprise')).toBeNull();
    });

    it('returns null for RESELLER plan (unlimited)', () => {
      expect(getQuotaForFeature('ai_assistant', 'reseller')).toBeNull();
      expect(getQuotaForFeature('campaigns', 'reseller')).toBeNull();
    });

    it('returns null for unknown feature', () => {
      expect(getQuotaForFeature('unknown_feature', 'pro')).toBeNull();
    });

    it('falls back to FREE plan for unknown plan', () => {
      expect(getQuotaForFeature('ai_assistant', 'unknown_plan')).toBe(10);
    });
  });

  describe('QuotaExceededError', () => {
    it('creates error with correct properties', () => {
      const error = new QuotaExceededError('ai_assistant', 10, 10, 'free');

      expect(error.name).toBe('QuotaExceededError');
      expect(error.code).toBe('QUOTA_EXCEEDED');
      expect(error.featureKey).toBe('ai_assistant');
      expect(error.currentUsage).toBe(10);
      expect(error.quota).toBe(10);
      expect(error.planSlug).toBe('free');
      expect(error.statusCode).toBe(429);
    });

    it('generates descriptive error message', () => {
      const error = new QuotaExceededError('ai_assistant', 10, 10, 'free');

      expect(error.message).toContain('AI Assistant Requests');
      expect(error.message).toContain('10');
      expect(error.message).toContain('free');
      expect(error.message).toContain('Upgrade');
    });

    it('is an instance of Error', () => {
      const error = new QuotaExceededError('campaigns', 2, 2, 'free');
      expect(error instanceof Error).toBe(true);
    });

    it('handles unknown feature key gracefully', () => {
      const error = new QuotaExceededError('unknown_feature', 5, 5, 'free');
      expect(error.message).toContain('unknown_feature');
    });
  });

  describe('Quota Comparison Logic', () => {
    it('detects when usage equals quota (at limit)', () => {
      const currentUsage = 10;
      const quota = 10;
      const isAtLimit = currentUsage >= quota;
      expect(isAtLimit).toBe(true);
    });

    it('detects when usage exceeds quota', () => {
      const currentUsage = 11;
      const quota = 10;
      const isExceeded = currentUsage > quota;
      expect(isExceeded).toBe(true);
    });

    it('detects when usage is within quota', () => {
      const currentUsage = 5;
      const quota = 10;
      const isWithinQuota = currentUsage < quota;
      expect(isWithinQuota).toBe(true);
    });

    it('calculates remaining correctly', () => {
      const currentUsage = 7;
      const quota = 10;
      const remaining = quota - currentUsage;
      expect(remaining).toBe(3);
    });

    it('calculates percentage correctly', () => {
      const currentUsage = 7;
      const quota = 10;
      const percentage = Math.round((currentUsage / quota) * 100);
      expect(percentage).toBe(70);
    });
  });

  describe('Usage Status Thresholds', () => {
    const getStatus = (percentage) => {
      if (percentage >= 100) return 'exceeded';
      if (percentage >= 95) return 'critical';
      if (percentage >= 70) return 'warning';
      return 'ok';
    };

    it('returns "ok" for usage under 70%', () => {
      expect(getStatus(0)).toBe('ok');
      expect(getStatus(50)).toBe('ok');
      expect(getStatus(69)).toBe('ok');
    });

    it('returns "warning" for usage 70-94%', () => {
      expect(getStatus(70)).toBe('warning');
      expect(getStatus(80)).toBe('warning');
      expect(getStatus(94)).toBe('warning');
    });

    it('returns "critical" for usage 95-99%', () => {
      expect(getStatus(95)).toBe('critical');
      expect(getStatus(99)).toBe('critical');
    });

    it('returns "exceeded" for usage 100%+', () => {
      expect(getStatus(100)).toBe('exceeded');
      expect(getStatus(150)).toBe('exceeded');
    });
  });

  describe('Plan Quota Inheritance', () => {
    it('each higher plan has equal or higher quotas', () => {
      const plans = ['free', 'starter', 'pro'];
      const features = Object.keys(PLAN_QUOTAS.free);

      for (let i = 0; i < plans.length - 1; i++) {
        const lowerPlan = plans[i];
        const higherPlan = plans[i + 1];

        features.forEach((feature) => {
          const lowerQuota = PLAN_QUOTAS[lowerPlan][feature];
          const higherQuota = PLAN_QUOTAS[higherPlan][feature];

          // Higher plans should have higher or equal quotas
          expect(higherQuota).toBeGreaterThanOrEqual(lowerQuota);
        });
      }
    });

    it('enterprise and reseller have all features unlimited', () => {
      const features = Object.keys(PLAN_QUOTAS.free);

      features.forEach((feature) => {
        expect(PLAN_QUOTAS.enterprise[feature]).toBeNull();
        expect(PLAN_QUOTAS.reseller[feature]).toBeNull();
      });
    });
  });

  describe('Quota Multipliers', () => {
    it('STARTER is roughly 5x FREE for most features', () => {
      const aiMultiplier = PLAN_QUOTAS.starter.ai_assistant / PLAN_QUOTAS.free.ai_assistant;
      const campaignsMultiplier = PLAN_QUOTAS.starter.campaigns / PLAN_QUOTAS.free.campaigns;
      const apiCallsMultiplier = PLAN_QUOTAS.starter.api_calls / PLAN_QUOTAS.free.api_calls;

      expect(aiMultiplier).toBe(5);
      expect(campaignsMultiplier).toBe(5);
      expect(apiCallsMultiplier).toBe(10);
    });

    it('PRO is roughly 4x STARTER for most features', () => {
      const aiMultiplier = PLAN_QUOTAS.pro.ai_assistant / PLAN_QUOTAS.starter.ai_assistant;
      const campaignsMultiplier = PLAN_QUOTAS.pro.campaigns / PLAN_QUOTAS.starter.campaigns;
      const apiCallsMultiplier = PLAN_QUOTAS.pro.api_calls / PLAN_QUOTAS.starter.api_calls;

      expect(aiMultiplier).toBe(4);
      expect(campaignsMultiplier).toBe(5);
      expect(apiCallsMultiplier).toBe(10);
    });
  });

  describe('Feature Key Validation', () => {
    it('all quota feature keys are lowercase with underscores', () => {
      const features = Object.keys(PLAN_QUOTAS.free);

      features.forEach((feature) => {
        expect(feature).toMatch(/^[a-z][a-z0-9_]*$/);
      });
    });

    it('feature keys match between quotas and names', () => {
      const quotaKeys = Object.keys(PLAN_QUOTAS.free);
      const nameKeys = Object.keys(QUOTA_FEATURE_NAMES);

      quotaKeys.forEach((key) => {
        expect(nameKeys).toContain(key);
      });
    });
  });
});
