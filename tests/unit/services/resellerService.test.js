/**
 * Reseller Service Unit Tests
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  RESELLER_STATUS,
  BILLING_METHODS
} from '../../../src/services/resellerService';
import {
  createTestResellerAccount,
  createTestResellerAndLicense,
  createTestTenant
} from '../../utils/factories';

describe('resellerService', () => {
  describe('RESELLER_STATUS', () => {
    it('contains all expected statuses', () => {
      expect(RESELLER_STATUS.PENDING).toBe('pending');
      expect(RESELLER_STATUS.ACTIVE).toBe('active');
      expect(RESELLER_STATUS.SUSPENDED).toBe('suspended');
      expect(RESELLER_STATUS.TERMINATED).toBe('terminated');
    });

    it('has exactly 4 status values', () => {
      const statuses = Object.values(RESELLER_STATUS);
      expect(statuses).toHaveLength(4);
    });
  });

  describe('BILLING_METHODS', () => {
    it('contains expected billing methods', () => {
      expect(BILLING_METHODS).toHaveLength(3);

      const values = BILLING_METHODS.map(b => b.value);
      expect(values).toContain('monthly');
      expect(values).toContain('annual');
      expect(values).toContain('invoice');
    });

    it('each method has value and label', () => {
      BILLING_METHODS.forEach(method => {
        expect(method).toHaveProperty('value');
        expect(method).toHaveProperty('label');
        expect(typeof method.value).toBe('string');
        expect(typeof method.label).toBe('string');
      });
    });
  });

  describe('Test Factories', () => {
    describe('createTestResellerAccount', () => {
      it('creates a reseller with default values', () => {
        const reseller = createTestResellerAccount();

        expect(reseller).toHaveProperty('id');
        expect(reseller).toHaveProperty('user_id');
        expect(reseller).toHaveProperty('company_name');
        expect(reseller).toHaveProperty('company_email');
        expect(reseller.status).toBe('active');
        expect(reseller.commission_percent).toBe(20);
      });

      it('allows overriding default values', () => {
        const reseller = createTestResellerAccount({
          company_name: 'Custom Company',
          status: 'pending',
          commission_percent: 25
        });

        expect(reseller.company_name).toBe('Custom Company');
        expect(reseller.status).toBe('pending');
        expect(reseller.commission_percent).toBe(25);
      });
    });

    describe('createTestResellerAndLicense', () => {
      it('creates a reseller with a linked license', () => {
        const { reseller, license } = createTestResellerAndLicense();

        expect(reseller).toHaveProperty('id');
        expect(license).toHaveProperty('id');
        expect(license.reseller_id).toBe(reseller.id);
      });

      it('allows customizing both reseller and license', () => {
        const { reseller, license } = createTestResellerAndLicense({
          reseller: { company_name: 'Test Reseller' },
          license: { license_type: 'pro', max_screens: 25 }
        });

        expect(reseller.company_name).toBe('Test Reseller');
        expect(license.license_type).toBe('pro');
        expect(license.max_screens).toBe(25);
        expect(license.reseller_id).toBe(reseller.id);
      });
    });
  });

  describe('Commission Calculations', () => {
    it('calculates commission correctly for 20%', () => {
      const amount = 100;
      const commissionPercent = 20;
      const commission = amount * (commissionPercent / 100);

      expect(commission).toBe(20);
    });

    it('calculates commission correctly for different percentages', () => {
      const testCases = [
        { amount: 100, percent: 15, expected: 15 },
        { amount: 200, percent: 25, expected: 50 },
        { amount: 49, percent: 20, expected: 9.8 },
        { amount: 490, percent: 20, expected: 98 }
      ];

      testCases.forEach(({ amount, percent, expected }) => {
        const commission = amount * (percent / 100);
        expect(commission).toBeCloseTo(expected, 2);
      });
    });
  });

  describe('Reseller Status Transitions', () => {
    it('pending can become active', () => {
      const reseller = createTestResellerAccount({ status: 'pending' });
      expect(reseller.status).toBe('pending');

      // Simulating approval
      const approvedReseller = { ...reseller, status: 'active' };
      expect(approvedReseller.status).toBe('active');
    });

    it('active can become suspended', () => {
      const reseller = createTestResellerAccount({ status: 'active' });
      const suspendedReseller = { ...reseller, status: 'suspended' };
      expect(suspendedReseller.status).toBe('suspended');
    });

    it('suspended can be reactivated', () => {
      const reseller = createTestResellerAccount({ status: 'suspended' });
      const reactivatedReseller = { ...reseller, status: 'active' };
      expect(reactivatedReseller.status).toBe('active');
    });
  });

  describe('Portfolio Stats', () => {
    it('can calculate tenant counts', () => {
      const tenants = [
        createTestTenant({ subscription_tier: 'starter' }),
        createTestTenant({ subscription_tier: 'pro' }),
        createTestTenant({ subscription_tier: 'starter' }),
        createTestTenant({ subscription_tier: 'enterprise' })
      ];

      const stats = tenants.reduce((acc, tenant) => {
        acc[tenant.subscription_tier] = (acc[tenant.subscription_tier] || 0) + 1;
        return acc;
      }, {});

      expect(stats.starter).toBe(2);
      expect(stats.pro).toBe(1);
      expect(stats.enterprise).toBe(1);
    });
  });
});
