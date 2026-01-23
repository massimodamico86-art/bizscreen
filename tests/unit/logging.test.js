import { describe, it, expect } from 'vitest';
import { redactPII, redactObject, PII_PATTERNS } from '../../src/utils/pii.js';
import { safeStringify } from '../../src/utils/safeStringify.js';

describe('PII Redaction (SEC-05)', () => {
  describe('redactPII', () => {
    it('redacts email addresses', () => {
      const input = 'Contact: user@example.com for info';
      const result = redactPII(input);
      expect(result).toBe('Contact: [EMAIL_REDACTED] for info');
      expect(result).not.toContain('user@example.com');
    });

    it('redacts phone numbers', () => {
      const input = 'Call me at 555-123-4567';
      const result = redactPII(input);
      expect(result).toContain('[PHONE_REDACTED]');
      expect(result).not.toContain('555-123-4567');
    });

    it('redacts credit card numbers', () => {
      const input = 'Card: 4111-1111-1111-1111';
      const result = redactPII(input);
      expect(result).toContain('[CREDIT_CARD_REDACTED]');
    });

    it('redacts SSN format', () => {
      const input = 'SSN: 123-45-6789';
      const result = redactPII(input);
      expect(result).toContain('[SSN_REDACTED]');
    });

    it('returns non-strings unchanged', () => {
      expect(redactPII(null)).toBeNull();
      expect(redactPII(undefined)).toBeUndefined();
      expect(redactPII(123)).toBe(123);
    });
  });

  describe('redactObject', () => {
    it('redacts sensitive keys', () => {
      const input = { password: 'secret123', username: 'john' };
      const result = redactObject(input);
      expect(result.password).toBe('[REDACTED]');
      expect(result.username).toBe('john');
    });

    it('redacts PII in string values', () => {
      const input = { message: 'User email: test@test.com' };
      const result = redactObject(input);
      expect(result.message).toContain('[EMAIL_REDACTED]');
    });

    it('handles nested objects', () => {
      const input = { user: { email: 'test@test.com', token: 'abc123' } };
      const result = redactObject(input);
      expect(result.user.email).toContain('[EMAIL_REDACTED]');
      expect(result.user.token).toBe('[REDACTED]');
    });

    it('handles arrays', () => {
      const input = { emails: ['a@b.com', 'c@d.com'] };
      const result = redactObject(input);
      expect(result.emails[0]).toContain('[EMAIL_REDACTED]');
      expect(result.emails[1]).toContain('[EMAIL_REDACTED]');
    });

    it('does not mutate original object', () => {
      const input = { password: 'secret' };
      const originalPassword = input.password;
      redactObject(input);
      expect(input.password).toBe(originalPassword);
    });
  });
});

describe('Safe Stringify', () => {
  it('handles circular references', () => {
    const obj = { a: 1 };
    obj.self = obj;
    const result = safeStringify(obj);
    expect(result).toContain('[Circular]');
    // Verify it's valid JSON-like structure
    expect(typeof result).toBe('string');
  });

  it('handles Error objects', () => {
    const error = new Error('Test error');
    const result = safeStringify({ error });
    const parsed = JSON.parse(result);
    expect(parsed.error.name).toBe('Error');
    expect(parsed.error.message).toBe('Test error');
    expect(parsed.error.stack).toBeDefined();
  });

  it('handles null and undefined', () => {
    expect(safeStringify(null)).toBe('null');
    expect(safeStringify({ a: undefined })).toBe('{}'); // JSON.stringify drops undefined
  });

  it('handles deeply nested objects', () => {
    const deep = { a: { b: { c: { d: { e: 'value' } } } } };
    const result = safeStringify(deep);
    expect(result).toContain('value');
  });
});

describe('Logging Service Utilities', () => {
  // Test PII patterns are defined
  it('exports PII patterns', () => {
    expect(PII_PATTERNS).toBeDefined();
    expect(PII_PATTERNS.email).toBeInstanceOf(RegExp);
    expect(PII_PATTERNS.phone).toBeInstanceOf(RegExp);
    expect(PII_PATTERNS.creditCard).toBeInstanceOf(RegExp);
    expect(PII_PATTERNS.ssn).toBeInstanceOf(RegExp);
  });

  // Test redaction with multiple PII types
  it('redacts multiple PII types in single string', () => {
    const input = 'Email: user@test.com Phone: 555-123-4567';
    const result = redactPII(input);
    expect(result).toContain('[EMAIL_REDACTED]');
    expect(result).toContain('[PHONE_REDACTED]');
    expect(result).not.toContain('user@test.com');
    expect(result).not.toContain('555-123-4567');
  });

  // Test deep object redaction
  it('redacts deeply nested sensitive data', () => {
    const input = {
      user: {
        profile: {
          personal: {
            email: 'deep@test.com',
            password: 'secret'
          }
        }
      }
    };
    const result = redactObject(input);
    expect(result.user.profile.personal.email).toContain('[EMAIL_REDACTED]');
    expect(result.user.profile.personal.password).toBe('[REDACTED]');
  });

  // Test safe stringify with complex circular structures
  it('handles complex circular references', () => {
    const obj1 = { name: 'obj1' };
    const obj2 = { name: 'obj2', ref: obj1 };
    obj1.ref = obj2;

    const result = safeStringify(obj1);
    expect(typeof result).toBe('string');
    expect(result).toContain('[Circular]');
  });
});
