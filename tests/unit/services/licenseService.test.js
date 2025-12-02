/**
 * License Service Unit Tests
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  formatLicenseCode,
  LICENSE_TYPES,
  PLAN_LEVELS,
  LICENSE_STATUS
} from '../../../src/services/licenseService';
import {
  createTestLicense,
  generateLicenseCode,
  createTestResellerAndLicense
} from '../../utils/factories';

describe('licenseService', () => {
  describe('formatLicenseCode', () => {
    it('formats a 16-character code with dashes', () => {
      const code = 'ABCDEFGHJKMNPQRS';
      const formatted = formatLicenseCode(code);
      expect(formatted).toBe('ABCD-EFGH-JKMN-PQRS');
    });

    it('converts lowercase to uppercase', () => {
      const code = 'abcdefghjkmnpqrs';
      const formatted = formatLicenseCode(code);
      expect(formatted).toBe('ABCD-EFGH-JKMN-PQRS');
    });

    it('removes existing dashes before formatting', () => {
      const code = 'ABCD-EFGH-JKMN-PQRS';
      const formatted = formatLicenseCode(code);
      expect(formatted).toBe('ABCD-EFGH-JKMN-PQRS');
    });

    it('returns original code if not 16 characters', () => {
      const shortCode = 'ABC123';
      expect(formatLicenseCode(shortCode)).toBe(shortCode);

      const longCode = 'ABCDEFGHJKMNPQRSTUVWXYZ';
      expect(formatLicenseCode(longCode)).toBe(longCode);
    });

    it('handles mixed case with dashes', () => {
      const code = 'abcd-EFGH-jkmn-PQRS';
      const formatted = formatLicenseCode(code);
      expect(formatted).toBe('ABCD-EFGH-JKMN-PQRS');
    });
  });

  describe('LICENSE_TYPES', () => {
    it('contains expected license types', () => {
      expect(LICENSE_TYPES).toHaveLength(4);

      const values = LICENSE_TYPES.map(t => t.value);
      expect(values).toContain('trial');
      expect(values).toContain('standard');
      expect(values).toContain('pro');
      expect(values).toContain('enterprise');
    });

    it('each type has required properties', () => {
      LICENSE_TYPES.forEach(type => {
        expect(type).toHaveProperty('value');
        expect(type).toHaveProperty('label');
        expect(type).toHaveProperty('description');
        expect(typeof type.value).toBe('string');
        expect(typeof type.label).toBe('string');
        expect(typeof type.description).toBe('string');
      });
    });
  });

  describe('PLAN_LEVELS', () => {
    it('contains expected plan levels', () => {
      expect(PLAN_LEVELS).toHaveLength(3);

      const values = PLAN_LEVELS.map(p => p.value);
      expect(values).toContain('starter');
      expect(values).toContain('pro');
      expect(values).toContain('enterprise');
    });

    it('each level has screen limits', () => {
      PLAN_LEVELS.forEach(level => {
        expect(level).toHaveProperty('value');
        expect(level).toHaveProperty('label');
        expect(level).toHaveProperty('screens');
        expect(typeof level.screens).toBe('number');
        expect(level.screens).toBeGreaterThan(0);
      });
    });

    it('screen limits increase with plan level', () => {
      const starter = PLAN_LEVELS.find(p => p.value === 'starter');
      const pro = PLAN_LEVELS.find(p => p.value === 'pro');
      const enterprise = PLAN_LEVELS.find(p => p.value === 'enterprise');

      expect(pro.screens).toBeGreaterThan(starter.screens);
      expect(enterprise.screens).toBeGreaterThan(pro.screens);
    });
  });

  describe('LICENSE_STATUS', () => {
    it('contains all expected statuses', () => {
      expect(LICENSE_STATUS.AVAILABLE).toBe('available');
      expect(LICENSE_STATUS.RESERVED).toBe('reserved');
      expect(LICENSE_STATUS.ACTIVATED).toBe('activated');
      expect(LICENSE_STATUS.EXPIRED).toBe('expired');
      expect(LICENSE_STATUS.REVOKED).toBe('revoked');
    });
  });

  describe('Test Factories', () => {
    describe('generateLicenseCode', () => {
      it('generates a 19-character formatted code', () => {
        const code = generateLicenseCode();
        expect(code).toHaveLength(19); // 16 chars + 3 dashes
        expect(code).toMatch(/^[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/);
      });

      it('uses only unambiguous characters', () => {
        // Run multiple times to test randomness
        for (let i = 0; i < 100; i++) {
          const code = generateLicenseCode();
          const cleanCode = code.replace(/-/g, '');

          // Should not contain confusing characters
          expect(cleanCode).not.toMatch(/[0OIL1]/);
        }
      });

      it('generates unique codes', () => {
        const codes = new Set();
        for (let i = 0; i < 100; i++) {
          codes.add(generateLicenseCode());
        }
        expect(codes.size).toBe(100);
      });
    });

    describe('createTestLicense', () => {
      it('creates a license with default values', () => {
        const license = createTestLicense();

        expect(license).toHaveProperty('id');
        expect(license).toHaveProperty('code');
        expect(license).toHaveProperty('reseller_id');
        expect(license.status).toBe('available');
        expect(license.license_type).toBe('standard');
        expect(license.plan_level).toBe('starter');
        expect(license.max_screens).toBe(5);
        expect(license.duration_days).toBe(365);
      });

      it('allows overriding default values', () => {
        const license = createTestLicense({
          status: 'activated',
          license_type: 'pro',
          plan_level: 'pro',
          max_screens: 25
        });

        expect(license.status).toBe('activated');
        expect(license.license_type).toBe('pro');
        expect(license.plan_level).toBe('pro');
        expect(license.max_screens).toBe(25);
      });
    });

    describe('createTestResellerAndLicense', () => {
      it('creates a reseller with a linked license', () => {
        const { reseller, license } = createTestResellerAndLicense();

        expect(reseller).toHaveProperty('id');
        expect(reseller).toHaveProperty('company_name');
        expect(license).toHaveProperty('id');
        expect(license).toHaveProperty('code');
        expect(license.reseller_id).toBe(reseller.id);
      });
    });
  });
});
