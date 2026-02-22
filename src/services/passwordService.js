/**
 * Password Service - Password strength validation and breach checking
 */

import { createScopedLogger } from './loggingService.js';
import { supabase } from '../supabase';

const logger = createScopedLogger('PasswordService');

/**
 * Default password strength requirements.
 * These are compile-time defaults; runtime policy from tenant_settings overrides them.
 */
export const PASSWORD_REQUIREMENTS = {
  minLength: 8,
  maxLength: 128,
  requireUppercase: true,
  requireLowercase: true,
  requireNumber: true,
  requireSpecial: true,
  specialChars: '!@#$%^&*()_+-=[]{}|;:,.<>?',
};

// ============================================================================
// TENANT-LEVEL POLICY CRUD
// ============================================================================

const PASSWORD_POLICY_DEFAULTS = {
  minLength: 8,
  requireUppercase: true,
  requireNumbers: true,
  requireSpecial: true,
};

const SESSION_POLICY_DEFAULTS = {
  sessionTimeout: 24,
  jwtExpiry: 1,
};

/**
 * Get password policy for a tenant
 * @param {string} tenantId
 * @returns {Promise<Object>} policy object or defaults
 */
export async function getPasswordPolicy(tenantId) {
  try {
    const { data, error } = await supabase
      .from('tenant_settings')
      .select('value')
      .eq('tenant_id', tenantId)
      .eq('key', 'password_policy')
      .maybeSingle();

    if (error) {
      // PGRST error means table doesn't exist — return defaults silently
      if (error.code?.startsWith('PGRST') || error.code === '42P01') {
        return { ...PASSWORD_POLICY_DEFAULTS };
      }
      logger.warn('Error loading password policy', { error });
      return { ...PASSWORD_POLICY_DEFAULTS };
    }

    return data?.value ? { ...PASSWORD_POLICY_DEFAULTS, ...data.value } : { ...PASSWORD_POLICY_DEFAULTS };
  } catch (err) {
    logger.error('Failed to get password policy', { err });
    return { ...PASSWORD_POLICY_DEFAULTS };
  }
}

/**
 * Save password policy for a tenant
 * @param {string} tenantId
 * @param {Object} policy
 * @returns {Promise<{success: boolean}>}
 */
export async function savePasswordPolicy(tenantId, policy) {
  try {
    const { error } = await supabase
      .from('tenant_settings')
      .upsert(
        {
          tenant_id: tenantId,
          key: 'password_policy',
          value: policy,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'tenant_id,key' }
      );

    if (error) {
      logger.error('Error saving password policy', { error });
      return { success: false };
    }
    return { success: true };
  } catch (err) {
    logger.error('Failed to save password policy', { err });
    return { success: false };
  }
}

/**
 * Get session policy for a tenant
 * @param {string} tenantId
 * @returns {Promise<Object>} session policy or defaults
 */
export async function getSessionPolicy(tenantId) {
  try {
    const { data, error } = await supabase
      .from('tenant_settings')
      .select('value')
      .eq('tenant_id', tenantId)
      .eq('key', 'session_policy')
      .maybeSingle();

    if (error) {
      if (error.code?.startsWith('PGRST') || error.code === '42P01') {
        return { ...SESSION_POLICY_DEFAULTS };
      }
      logger.warn('Error loading session policy', { error });
      return { ...SESSION_POLICY_DEFAULTS };
    }

    return data?.value ? { ...SESSION_POLICY_DEFAULTS, ...data.value } : { ...SESSION_POLICY_DEFAULTS };
  } catch (err) {
    logger.error('Failed to get session policy', { err });
    return { ...SESSION_POLICY_DEFAULTS };
  }
}

/**
 * Save session policy for a tenant
 * @param {string} tenantId
 * @param {Object} policy
 * @returns {Promise<{success: boolean}>}
 */
export async function saveSessionPolicy(tenantId, policy) {
  try {
    const { error } = await supabase
      .from('tenant_settings')
      .upsert(
        {
          tenant_id: tenantId,
          key: 'session_policy',
          value: policy,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'tenant_id,key' }
      );

    if (error) {
      logger.error('Error saving session policy', { error });
      return { success: false };
    }
    return { success: true };
  } catch (err) {
    logger.error('Failed to save session policy', { err });
    return { success: false };
  }
}

/**
 * Common passwords to reject (top 100 most common)
 */
const COMMON_PASSWORDS = new Set([
  'password', '123456', '12345678', 'qwerty', 'abc123', 'monkey', '1234567',
  'letmein', 'trustno1', 'dragon', 'baseball', 'iloveyou', 'master', 'sunshine',
  'ashley', 'bailey', 'passw0rd', 'shadow', '123123', '654321', 'superman',
  'qazwsx', 'michael', 'football', 'password1', 'password123', 'batman',
  'login', 'admin', 'welcome', 'solo', 'princess', 'starwars', 'cheese',
]);

/**
 * Validate password strength
 * @param {string} password - The password to validate
 * @param {string} email - User's email to check for inclusion
 * @param {Object} [policy] - Optional tenant-level policy override (from getPasswordPolicy)
 * @returns {{valid: boolean, score: number, errors: string[], suggestions: string[]}}
 */
export function validatePassword(password, email = '', policy = null) {
  const errors = [];
  const suggestions = [];
  let score = 0;

  // Merge runtime policy with compile-time defaults
  const reqs = {
    ...PASSWORD_REQUIREMENTS,
    ...(policy?.minLength != null && { minLength: policy.minLength }),
    ...(policy?.requireUppercase != null && { requireUppercase: policy.requireUppercase }),
    ...(policy?.requireNumbers != null && { requireNumber: policy.requireNumbers }),
    ...(policy?.requireSpecial != null && { requireSpecial: policy.requireSpecial }),
  };

  // Length checks
  if (!password || password.length < reqs.minLength) {
    errors.push(`Password must be at least ${reqs.minLength} characters`);
  } else {
    score += 1;
    if (password.length >= 12) score += 1;
    if (password.length >= 16) score += 1;
  }

  if (password && password.length > reqs.maxLength) {
    errors.push(`Password must be less than ${reqs.maxLength} characters`);
  }

  // Character type checks
  if (reqs.requireUppercase && !/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  } else if (/[A-Z]/.test(password)) {
    score += 1;
  }

  if (reqs.requireLowercase && !/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  } else if (/[a-z]/.test(password)) {
    score += 1;
  }

  if (reqs.requireNumber && !/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number');
  } else if (/[0-9]/.test(password)) {
    score += 1;
  }

  if (reqs.requireSpecial) {
    const specialRegex = new RegExp(`[${reqs.specialChars.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&')}]`);
    if (!specialRegex.test(password)) {
      errors.push('Password must contain at least one special character (!@#$%^&*...)');
    } else {
      score += 1;
    }
  }

  // Common password check
  if (password && COMMON_PASSWORDS.has(password.toLowerCase())) {
    errors.push('This password is too common. Please choose a more unique password.');
    score = Math.max(0, score - 2);
  }

  // Email inclusion check
  if (email && password) {
    const emailParts = email.toLowerCase().split('@');
    const username = emailParts[0];
    if (username.length >= 3 && password.toLowerCase().includes(username)) {
      errors.push('Password should not contain your email address');
      score = Math.max(0, score - 1);
    }
  }

  // Sequential characters check
  if (password && hasSequentialChars(password)) {
    suggestions.push('Avoid sequential characters like "abc" or "123"');
    score = Math.max(0, score - 1);
  }

  // Repeated characters check
  if (password && hasRepeatedChars(password)) {
    suggestions.push('Avoid repeated characters like "aaa" or "111"');
    score = Math.max(0, score - 1);
  }

  // Suggestions based on score
  if (score < 4) {
    suggestions.push('Consider using a longer password');
    suggestions.push('Mix uppercase, lowercase, numbers, and symbols');
  }
  if (score >= 4 && score < 6) {
    suggestions.push('Consider using a passphrase for better security');
  }

  // Normalize score to 0-5
  const normalizedScore = Math.min(5, Math.max(0, score));

  return {
    valid: errors.length === 0,
    score: normalizedScore,
    errors,
    suggestions: errors.length === 0 ? suggestions : [],
    strength: getStrengthLabel(normalizedScore),
  };
}

/**
 * Check for sequential characters
 */
function hasSequentialChars(password) {
  const sequences = [
    'abcdefghijklmnopqrstuvwxyz',
    'zyxwvutsrqponmlkjihgfedcba',
    '0123456789',
    '9876543210',
    'qwertyuiop',
    'asdfghjkl',
    'zxcvbnm',
  ];

  const lower = password.toLowerCase();
  for (const seq of sequences) {
    for (let i = 0; i <= seq.length - 3; i++) {
      if (lower.includes(seq.substring(i, i + 3))) {
        return true;
      }
    }
  }
  return false;
}

/**
 * Check for repeated characters
 */
function hasRepeatedChars(password) {
  return /(.)\1{2,}/.test(password);
}

/**
 * Get strength label based on score
 */
function getStrengthLabel(score) {
  if (score <= 1) return 'Weak';
  if (score <= 2) return 'Fair';
  if (score <= 3) return 'Good';
  if (score <= 4) return 'Strong';
  return 'Very Strong';
}

/**
 * Get strength color for UI
 */
export function getStrengthColor(score) {
  if (score <= 1) return 'red';
  if (score <= 2) return 'orange';
  if (score <= 3) return 'yellow';
  if (score <= 4) return 'lime';
  return 'green';
}

/**
 * Check if password has been exposed in data breaches using Have I Been Pwned API
 * Uses k-anonymity model - only first 5 chars of SHA-1 hash sent to API
 * @param {string} password - The password to check
 * @returns {Promise<{breached: boolean, count: number, error?: string}>}
 */
export async function checkPasswordBreach(password) {
  try {
    // Generate SHA-1 hash of password
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-1', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase();

    // Split hash: first 5 chars (prefix) and rest (suffix)
    const prefix = hashHex.substring(0, 5);
    const suffix = hashHex.substring(5);

    // Query HIBP API with prefix only (k-anonymity)
    const response = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`, {
      headers: {
        'Add-Padding': 'true', // Adds random padding to prevent response size analysis
      },
    });

    if (!response.ok) {
      logger.warn('HIBP API error', { status: response.status });
      // Fail open - don't block user if API is down
      return { breached: false, count: 0 };
    }

    const text = await response.text();
    const lines = text.split('\n');

    // Check if our suffix appears in the results
    for (const line of lines) {
      const [hashSuffix, count] = line.split(':');
      if (hashSuffix.trim() === suffix) {
        return {
          breached: true,
          count: parseInt(count.trim(), 10),
        };
      }
    }

    return { breached: false, count: 0 };
  } catch (error) {
    logger.error('Password breach check failed', { error });
    // Fail open - don't block user if check fails
    return { breached: false, count: 0, error: error.message };
  }
}

/**
 * Full password validation including breach check
 * @param {string} password - The password to validate
 * @param {string} email - User's email
 * @param {boolean} checkBreach - Whether to check for breaches (async)
 * @returns {Promise<{valid: boolean, score: number, errors: string[], suggestions: string[], breached?: boolean, breachCount?: number}>}
 */
export async function validatePasswordFull(password, email = '', checkBreach = true) {
  const validation = validatePassword(password, email);

  if (checkBreach && validation.valid) {
    const breachResult = await checkPasswordBreach(password);
    if (breachResult.breached) {
      validation.valid = false;
      validation.errors.push(
        `This password has been exposed in ${breachResult.count.toLocaleString()} data breach${breachResult.count > 1 ? 'es' : ''}. Please choose a different password.`
      );
      validation.breached = true;
      validation.breachCount = breachResult.count;
      validation.score = Math.max(0, validation.score - 2);
    }
  }

  return validation;
}

export default {
  validatePassword,
  validatePasswordFull,
  checkPasswordBreach,
  getStrengthColor,
  PASSWORD_REQUIREMENTS,
  getPasswordPolicy,
  savePasswordPolicy,
  getSessionPolicy,
  saveSessionPolicy,
};
