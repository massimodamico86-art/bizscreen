/**
 * PII Detection and Redaction Utilities
 *
 * Provides functions to detect and redact personally identifiable information
 * from strings and objects before logging or external transmission.
 *
 * Patterns detected:
 * - Email addresses
 * - Phone numbers (US/international formats)
 * - Credit card numbers (with optional separators)
 * - Social Security Numbers (SSN)
 */

/**
 * Regex patterns for common PII types
 */
export const PII_PATTERNS = {
  // Standard email pattern
  email: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,

  // US and international phone formats: (123) 456-7890, 123-456-7890, +1-123-456-7890, etc.
  phone: /(?:\+?1[-.\s]?)?(?:\(?\d{3}\)?[-.\s]?)?\d{3}[-.\s]?\d{4}/g,

  // Credit card: 16 digits with optional separators (spaces, dashes)
  // Must have at least one separator or be exactly 16 digits to avoid matching phone numbers
  creditCard: /\b\d{4}[-\s]\d{4}[-\s]\d{4}[-\s]\d{4}\b|\b\d{16}\b/g,

  // SSN: XXX-XX-XXXX format
  ssn: /\b\d{3}-\d{2}-\d{4}\b/g,
};

/**
 * Keys that should have their values completely redacted (case-insensitive matching)
 */
const SENSITIVE_KEYS = [
  'password',
  'token',
  'secret',
  'key',
  'authorization',
  'credential',
  'apikey',
  'accesstoken',
  'refreshtoken',
  'auth',
  'bearer',
  'jwt',
  'session',
  'cookie',
];

/**
 * Redact PII patterns from a text string
 *
 * @param {string} text - The text to redact
 * @param {Object} options - Optional configuration
 * @param {Object} options.patterns - Custom patterns to use instead of defaults
 * @returns {string} Text with PII replaced by redaction markers
 */
export function redactPII(text, options = {}) {
  // Return unchanged if not a string
  if (typeof text !== 'string') {
    return text;
  }

  const patterns = options.patterns || PII_PATTERNS;
  let result = text;

  // Apply patterns in order from most specific to least specific
  // Credit cards first (16 digits), then SSN (9 digits), then phone (10 digits), then email
  if (patterns.creditCard) {
    result = result.replace(patterns.creditCard, '[CREDIT_CARD_REDACTED]');
  }
  if (patterns.ssn) {
    result = result.replace(patterns.ssn, '[SSN_REDACTED]');
  }
  if (patterns.phone) {
    result = result.replace(patterns.phone, '[PHONE_REDACTED]');
  }
  if (patterns.email) {
    result = result.replace(patterns.email, '[EMAIL_REDACTED]');
  }

  return result;
}

/**
 * Check if a key name is sensitive and should be fully redacted
 *
 * @param {string} key - The key name to check
 * @returns {boolean} True if the key is sensitive
 */
function isSensitiveKey(key) {
  if (typeof key !== 'string') return false;
  const lowerKey = key.toLowerCase();
  return SENSITIVE_KEYS.some((sensitive) => lowerKey.includes(sensitive));
}

/**
 * Recursively redact PII from an object
 *
 * @param {*} obj - The object to process
 * @param {Object} options - Optional configuration
 * @param {Object} options.patterns - Custom PII patterns
 * @param {Set} options._seen - Internal: tracks circular references
 * @returns {*} New object with PII redacted (original is not mutated)
 */
export function redactObject(obj, options = {}) {
  // Handle non-objects
  if (obj === null || obj === undefined) {
    return obj;
  }

  // Handle strings
  if (typeof obj === 'string') {
    return redactPII(obj, options);
  }

  // Handle non-object types
  if (typeof obj !== 'object') {
    return obj;
  }

  // Prevent infinite recursion on circular references
  const seen = options._seen || new WeakSet();
  if (seen.has(obj)) {
    return '[Circular]';
  }
  seen.add(obj);

  // Handle arrays
  if (Array.isArray(obj)) {
    return obj.map((item) => redactObject(item, { ...options, _seen: seen }));
  }

  // Handle plain objects
  const result = {};
  for (const [key, value] of Object.entries(obj)) {
    // Fully redact sensitive keys
    if (isSensitiveKey(key)) {
      result[key] = '[REDACTED]';
    } else if (typeof value === 'string') {
      // Redact PII patterns in string values
      result[key] = redactPII(value, options);
    } else if (value !== null && typeof value === 'object') {
      // Recurse into nested objects/arrays
      result[key] = redactObject(value, { ...options, _seen: seen });
    } else {
      // Pass through other types unchanged
      result[key] = value;
    }
  }

  return result;
}

export default {
  PII_PATTERNS,
  redactPII,
  redactObject,
};
