/**
 * Password Validation Tests
 *
 * Verifies SEC-03: Password policy enforces minimum 8 characters with complexity
 *
 * Success criteria from ROADMAP.md:
 * 1. User cannot set password shorter than 8 characters
 * 2. User cannot set password without complexity (uppercase, lowercase, number)
 */

import { describe, it, expect } from 'vitest';
import { validatePassword, PASSWORD_REQUIREMENTS } from '../../../src/services/passwordService.js';

describe('Password Validation - SEC-03', () => {
  describe('Length requirements', () => {
    it('rejects passwords shorter than 8 characters', () => {
      const result = validatePassword('Short1!');
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('8 characters'))).toBe(true);
    });

    it('accepts passwords with exactly 8 characters meeting all requirements', () => {
      const result = validatePassword('Abcdef1!');
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('rejects passwords longer than 128 characters', () => {
      const longPassword = 'Aa1!' + 'x'.repeat(130);
      const result = validatePassword(longPassword);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('128'))).toBe(true);
    });

    it('accepts passwords at maximum length with requirements', () => {
      const maxPassword = 'Aa1!' + 'x'.repeat(124); // 128 chars total
      const result = validatePassword(maxPassword);
      expect(result.valid).toBe(true);
    });
  });

  describe('Complexity requirements', () => {
    it('rejects passwords without uppercase letter', () => {
      const result = validatePassword('abcdefg1!');
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('uppercase'))).toBe(true);
    });

    it('rejects passwords without lowercase letter', () => {
      const result = validatePassword('ABCDEFG1!');
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('lowercase'))).toBe(true);
    });

    it('rejects passwords without number', () => {
      const result = validatePassword('Abcdefgh!');
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('number'))).toBe(true);
    });

    it('rejects passwords without special character', () => {
      const result = validatePassword('Abcdefg1');
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('special'))).toBe(true);
    });

    it('accepts passwords meeting all complexity requirements', () => {
      const result = validatePassword('Abcdefg1!');
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('Common password blocking', () => {
    it('rejects common passwords like "password" (with complexity issues)', () => {
      // "password" is in the common list, but also fails complexity
      const result = validatePassword('password');
      expect(result.valid).toBe(false);
      // Should have both common password error and complexity errors
      expect(result.errors.some(e => e.includes('common'))).toBe(true);
    });

    it('rejects common passwords regardless of case', () => {
      // "PASSWORD" lowercased is "password" which is in the common list
      const result = validatePassword('PASSWORD');
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('common'))).toBe(true);
    });

    it('does not block passwords containing common words with additions', () => {
      // "Password1!" lowercased is "password1!" which is NOT an exact match to "password"
      // This passes the common password check but verifies the check is exact-match only
      const result = validatePassword('Password1!');
      expect(result.errors.some(e => e.includes('common'))).toBe(false);
    });
  });

  describe('Email inclusion check', () => {
    it('rejects passwords containing email username', () => {
      const result = validatePassword('JohnDoe1!xyz', 'johndoe@example.com');
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('email'))).toBe(true);
    });

    it('accepts passwords not containing email parts', () => {
      const result = validatePassword('Secure99!', 'johndoe@example.com');
      expect(result.valid).toBe(true);
    });
  });

  describe('Password strength scoring', () => {
    it('gives score based on length and complexity', () => {
      // 8 chars with all complexity requirements, avoiding sequences
      const result = validatePassword('Pmtk9753!');
      // Score includes: length(1) + upper(1) + lower(1) + number(1) + special(1) = 5
      // No sequential penalty since 9753 is reverse and not in sequence list
      expect(result.score).toBe(5);
    });

    it('reduces score for sequential characters', () => {
      // Password with "abc" sequence gets penalty
      const hasSeq = validatePassword('Abcptmk1!'); // Has "abc" sequence
      const noSeq = validatePassword('Ptmk1234!');  // No common sequences (no abc, no 123 in sequence pattern)

      // Both have similar complexity, but hasSeq has "abc" penalty
      // Note: "1234" contains "123" and "234" sequences too
      // Let's use a password that definitively avoids sequences
      const cleanPass = validatePassword('Pmtk9753!'); // No sequences

      // Sequential chars reduce score
      expect(hasSeq.score).toBeLessThan(cleanPass.score);
    });

    it('returns score in valid range 0-5', () => {
      const weak = validatePassword('a'); // Fails many checks
      const strong = validatePassword('Pmtk9753!'); // Passes all, no sequences

      expect(weak.score).toBeGreaterThanOrEqual(0);
      expect(weak.score).toBeLessThanOrEqual(5);
      expect(strong.score).toBeGreaterThanOrEqual(0);
      expect(strong.score).toBeLessThanOrEqual(5);
    });

    it('max score is 5', () => {
      // Even with very long password, score caps at 5
      const longPass = validatePassword('Pmtkrlvq9753!');
      expect(longPass.score).toBe(5);
    });
  });

  describe('Requirements configuration', () => {
    it('has correct minimum length configured', () => {
      expect(PASSWORD_REQUIREMENTS.minLength).toBe(8);
    });

    it('has correct maximum length configured', () => {
      expect(PASSWORD_REQUIREMENTS.maxLength).toBe(128);
    });

    it('requires uppercase letters', () => {
      expect(PASSWORD_REQUIREMENTS.requireUppercase).toBe(true);
    });

    it('requires lowercase letters', () => {
      expect(PASSWORD_REQUIREMENTS.requireLowercase).toBe(true);
    });

    it('requires numbers', () => {
      expect(PASSWORD_REQUIREMENTS.requireNumber).toBe(true);
    });

    it('requires special characters', () => {
      expect(PASSWORD_REQUIREMENTS.requireSpecial).toBe(true);
    });
  });
});
