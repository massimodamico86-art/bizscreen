/**
 * MFA Service - Two-Factor Authentication using Supabase MFA
 *
 * Supports TOTP (Time-based One-Time Password) via authenticator apps
 * like Google Authenticator, Authy, 1Password, etc.
 */

import { supabase } from '../supabase';
import { createScopedLogger } from './loggingService.js';

const logger = createScopedLogger('MfaService');

/**
 * Get current MFA status for the user
 * @returns {Promise<{enrolled: boolean, verified: boolean, factors: Array}>}
 */
export async function getMfaStatus() {
  try {
    const { data, error } = await supabase.auth.mfa.listFactors();

    if (error) {
      logger.error('Failed to get MFA status', { error });
      return { enrolled: false, verified: false, factors: [] };
    }

    const totpFactors = data?.totp || [];
    const verifiedFactors = totpFactors.filter(f => f.status === 'verified');

    return {
      enrolled: totpFactors.length > 0,
      verified: verifiedFactors.length > 0,
      factors: totpFactors,
    };
  } catch (error) {
    logger.error('MFA status exception', { error });
    return { enrolled: false, verified: false, factors: [] };
  }
}

/**
 * Get the current Authenticator Assurance Level (AAL)
 * - aal1: Password authentication only
 * - aal2: Password + MFA verified
 * @returns {Promise<{currentLevel: string, nextLevel: string|null}>}
 */
export async function getAssuranceLevel() {
  try {
    const { data, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();

    if (error) {
      logger.error('Failed to get AAL', { error });
      return { currentLevel: 'aal1', nextLevel: null };
    }

    return {
      currentLevel: data.currentLevel,
      nextLevel: data.nextLevel,
    };
  } catch (error) {
    logger.error('AAL exception', { error });
    return { currentLevel: 'aal1', nextLevel: null };
  }
}

/**
 * Check if MFA verification is required
 * @returns {Promise<boolean>}
 */
export async function isMfaRequired() {
  const { currentLevel, nextLevel } = await getAssuranceLevel();
  // MFA is required if we're at aal1 but aal2 is available
  return currentLevel === 'aal1' && nextLevel === 'aal2';
}

/**
 * Start MFA enrollment - generates QR code for authenticator app
 * @param {string} friendlyName - Name to display in authenticator app
 * @returns {Promise<{success: boolean, qrCode?: string, secret?: string, factorId?: string, error?: string}>}
 */
export async function enrollMfa(friendlyName = 'BizScreen') {
  try {
    const { data, error } = await supabase.auth.mfa.enroll({
      factorType: 'totp',
      friendlyName,
    });

    if (error) {
      logger.error('MFA enrollment failed', { error });
      return { success: false, error: error.message };
    }

    logger.info('MFA enrollment initiated', { factorId: data.id, friendlyName });
    return {
      success: true,
      qrCode: data.totp.qr_code,
      secret: data.totp.secret,
      factorId: data.id,
    };
  } catch (error) {
    logger.error('MFA enrollment exception', { error });
    return { success: false, error: error.message };
  }
}

/**
 * Verify MFA enrollment with TOTP code from authenticator app
 * @param {string} factorId - The factor ID from enrollment
 * @param {string} code - 6-digit TOTP code
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function verifyEnrollment(factorId, code) {
  try {
    // First, create a challenge
    const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({
      factorId,
    });

    if (challengeError) {
      return { success: false, error: challengeError.message };
    }

    // Then verify with the code
    const { data, error } = await supabase.auth.mfa.verify({
      factorId,
      challengeId: challengeData.id,
      code,
    });

    if (error) {
      logger.warn('MFA verification failed', { error, factorId });
      return { success: false, error: error.message };
    }

    logger.info('MFA enrollment verified', { factorId });
    return { success: true };
  } catch (error) {
    logger.error('MFA verification exception', { error, factorId });
    return { success: false, error: error.message };
  }
}

/**
 * Verify MFA during login (after password authentication)
 * @param {string} code - 6-digit TOTP code
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function verifyMfaLogin(code) {
  try {
    // Get the user's factors
    const { data: factorsData, error: factorsError } = await supabase.auth.mfa.listFactors();

    if (factorsError) {
      return { success: false, error: factorsError.message };
    }

    const verifiedFactors = factorsData?.totp?.filter(f => f.status === 'verified') || [];

    if (verifiedFactors.length === 0) {
      return { success: false, error: 'No MFA factor found' };
    }

    const factor = verifiedFactors[0];

    // Create a challenge
    const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({
      factorId: factor.id,
    });

    if (challengeError) {
      return { success: false, error: challengeError.message };
    }

    // Verify the code
    const { error: verifyError } = await supabase.auth.mfa.verify({
      factorId: factor.id,
      challengeId: challengeData.id,
      code,
    });

    if (verifyError) {
      logger.warn('MFA login verification failed', { error: verifyError });
      return { success: false, error: verifyError.message };
    }

    logger.info('MFA login verified');
    return { success: true };
  } catch (error) {
    logger.error('MFA login verification exception', { error });
    return { success: false, error: error.message };
  }
}

/**
 * Disable MFA for the current user
 * @param {string} factorId - The factor ID to remove
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function disableMfa(factorId) {
  try {
    const { error } = await supabase.auth.mfa.unenroll({
      factorId,
    });

    if (error) {
      logger.error('MFA disable failed', { error, factorId });
      return { success: false, error: error.message };
    }

    logger.info('MFA disabled', { factorId });
    return { success: true };
  } catch (error) {
    logger.error('MFA disable exception', { error, factorId });
    return { success: false, error: error.message };
  }
}

/**
 * Generate recovery codes (stored in user metadata)
 * Note: This is a custom implementation since Supabase doesn't provide recovery codes
 * @returns {Promise<{success: boolean, codes?: string[], error?: string}>}
 */
export async function generateRecoveryCodes() {
  try {
    // Generate 10 random recovery codes
    const codes = [];
    for (let i = 0; i < 10; i++) {
      const code = Array.from(crypto.getRandomValues(new Uint8Array(4)))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('')
        .toUpperCase();
      codes.push(`${code.slice(0, 4)}-${code.slice(4)}`);
    }

    // Hash the codes before storing (simple hash for demo - use bcrypt in production)
    const hashedCodes = codes.map(code => btoa(code));

    // Store in user metadata
    const { error } = await supabase.auth.updateUser({
      data: {
        mfa_recovery_codes: hashedCodes,
        mfa_recovery_codes_generated_at: new Date().toISOString(),
      },
    });

    if (error) {
      logger.error('Recovery code generation failed', { error });
      return { success: false, error: error.message };
    }

    logger.info('Recovery codes generated', { count: codes.length });
    return { success: true, codes };
  } catch (error) {
    logger.error('Recovery code generation exception', { error });
    return { success: false, error: error.message };
  }
}

/**
 * Verify a recovery code (one-time use)
 * @param {string} code - Recovery code
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function verifyRecoveryCode(code) {
  try {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    const storedCodes = user.user_metadata?.mfa_recovery_codes || [];
    const hashedCode = btoa(code.toUpperCase().replace(/[^A-Z0-9]/g, ''));

    const codeIndex = storedCodes.findIndex(c => c === hashedCode);

    if (codeIndex === -1) {
      return { success: false, error: 'Invalid recovery code' };
    }

    // Remove the used code
    storedCodes.splice(codeIndex, 1);

    await supabase.auth.updateUser({
      data: {
        mfa_recovery_codes: storedCodes,
      },
    });

    logger.info('Recovery code verified and consumed');
    return { success: true };
  } catch (error) {
    logger.error('Recovery code verification exception', { error });
    return { success: false, error: error.message };
  }
}

export default {
  getMfaStatus,
  getAssuranceLevel,
  isMfaRequired,
  enrollMfa,
  verifyEnrollment,
  verifyMfaLogin,
  disableMfa,
  generateRecoveryCodes,
  verifyRecoveryCode,
};
