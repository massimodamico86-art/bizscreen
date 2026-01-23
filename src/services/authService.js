/**
 * Auth Service - Encapsulates Supabase auth flows
 */

import { supabase } from '../supabase';
import { createScopedLogger } from './loggingService.js';

const logger = createScopedLogger('AuthService');

/**
 * Sign up a new user
 * @param {object} options
 * @param {string} options.email
 * @param {string} options.password
 * @param {string} options.fullName
 * @param {string} options.businessName
 * @returns {Promise<{user: object|null, error: string|null}>}
 */
export async function signUp({ email, password, fullName, businessName }) {
  try {
    // Create user in Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          business_name: businessName,
        },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (authError) {
      return { user: null, error: authError.message };
    }

    if (!authData.user) {
      return { user: null, error: 'Failed to create user' };
    }

    // The profile will be created by a database trigger or we create it here
    // Check if profile exists (trigger may have created it)
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', authData.user.id)
      .single();

    if (!existingProfile) {
      // Create profile manually if trigger didn't create it
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: authData.user.id,
          email: email,
          full_name: fullName,
          business_name: businessName,
          role: 'client',
          managed_by: null,
        });

      if (profileError) {
        logger.error('Failed to create profile during signup', { error: profileError, userId: authData.user.id });
        // Don't fail the signup, profile can be created later
      }
    } else {
      // Update profile with business name if it exists
      await supabase
        .from('profiles')
        .update({
          full_name: fullName,
          business_name: businessName,
        })
        .eq('id', authData.user.id);
    }

    logger.info('User signed up successfully', { userId: authData.user.id });
    return { user: authData.user, error: null };
  } catch (error) {
    logger.error('Signup failed', { error });
    return { user: null, error: error.message };
  }
}

/**
 * Check if account is locked out
 * @param {string} email
 * @returns {Promise<{locked: boolean, minutesRemaining?: number, remainingAttempts?: number}>}
 */
export async function checkLockout(email) {
  try {
    const { data, error } = await supabase.rpc('check_login_lockout', {
      p_email: email,
    });

    if (error) {
      logger.error('Lockout check failed', { error, email });
      // Fail open - allow login attempt if check fails
      return { locked: false };
    }

    return data;
  } catch (error) {
    logger.error('Lockout check exception', { error, email });
    return { locked: false };
  }
}

/**
 * Record a login attempt
 * @param {string} email
 * @param {boolean} success
 */
async function recordLoginAttempt(email, success) {
  try {
    await supabase.rpc('record_login_attempt', {
      p_email: email,
      p_success: success,
    });
  } catch (error) {
    // Non-blocking - don't fail login if recording fails
    logger.warn('Failed to record login attempt', { error, email });
  }
}

/**
 * Sign in with email and password
 * @param {string} email
 * @param {string} password
 * @returns {Promise<{user: object|null, error: string|null, locked?: boolean, minutesRemaining?: number}>}
 */
export async function signIn(email, password) {
  try {
    // Check if account is locked out
    const lockoutStatus = await checkLockout(email);

    if (lockoutStatus.locked) {
      const minutes = Math.ceil(lockoutStatus.minutes_remaining || 15);
      return {
        user: null,
        error: `Too many failed attempts. Please try again in ${minutes} minute${minutes !== 1 ? 's' : ''}.`,
        locked: true,
        minutesRemaining: minutes,
      };
    }

    // Attempt login
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      // Record failed attempt
      await recordLoginAttempt(email, false);

      // Check remaining attempts
      const newStatus = await checkLockout(email);
      const remaining = newStatus.remaining_attempts;

      let errorMessage = error.message;
      if (remaining !== undefined && remaining > 0 && remaining <= 3) {
        errorMessage += ` (${remaining} attempt${remaining !== 1 ? 's' : ''} remaining)`;
      }

      return { user: null, error: errorMessage };
    }

    // Record successful login
    await recordLoginAttempt(email, true);

    logger.info('User signed in successfully', { userId: data.user.id });
    return { user: data.user, error: null };
  } catch (error) {
    logger.error('Sign in failed', { error, email });
    return { user: null, error: error.message };
  }
}

/**
 * Sign out the current user
 * @returns {Promise<{error: string|null}>}
 */
export async function signOut() {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) {
      logger.error('Sign out failed', { error });
      return { error: error.message };
    }
    logger.info('User signed out successfully');
    return { error: null };
  } catch (error) {
    logger.error('Sign out exception', { error });
    return { error: error.message };
  }
}

/**
 * Request password reset email
 * @param {string} email
 * @returns {Promise<{success: boolean, error: string|null}>}
 */
export async function requestPasswordReset(email) {
  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/update-password`,
    });

    if (error) {
      logger.error('Password reset request failed', { error, email });
      return { success: false, error: error.message };
    }

    logger.info('Password reset email sent', { email });
    return { success: true, error: null };
  } catch (error) {
    logger.error('Password reset request exception', { error, email });
    return { success: false, error: error.message };
  }
}

/**
 * Update password (after clicking reset link)
 * @param {string} newPassword
 * @returns {Promise<{success: boolean, error: string|null}>}
 */
export async function updatePassword(newPassword) {
  try {
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) {
      logger.error('Password update failed', { error });
      return { success: false, error: error.message };
    }

    logger.info('Password updated successfully');
    return { success: true, error: null };
  } catch (error) {
    logger.error('Password update exception', { error });
    return { success: false, error: error.message };
  }
}

/**
 * Get current session
 * @returns {Promise<{session: object|null, error: string|null}>}
 */
export async function getSession() {
  try {
    const { data, error } = await supabase.auth.getSession();
    if (error) {
      return { session: null, error: error.message };
    }
    return { session: data.session, error: null };
  } catch (error) {
    logger.error('Get session failed', { error });
    return { session: null, error: error.message };
  }
}

/**
 * Get current user
 * @returns {Promise<{user: object|null, error: string|null}>}
 */
export async function getCurrentUser() {
  try {
    const { data, error } = await supabase.auth.getUser();
    if (error) {
      return { user: null, error: error.message };
    }
    return { user: data.user, error: null };
  } catch (error) {
    logger.error('Get user failed', { error });
    return { user: null, error: error.message };
  }
}

/**
 * Check if email confirmation is required
 * @param {object} user - Supabase user object
 * @returns {boolean}
 */
export function isEmailConfirmationPending(user) {
  if (!user) return false;
  // Check if user has confirmed their email
  return !user.email_confirmed_at && user.confirmation_sent_at;
}

/**
 * Resend confirmation email
 * @param {string} email
 * @returns {Promise<{success: boolean, error: string|null}>}
 */
export async function resendConfirmationEmail(email) {
  try {
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      logger.error('Resend confirmation email failed', { error, email });
      return { success: false, error: error.message };
    }

    logger.info('Confirmation email resent', { email });
    return { success: true, error: null };
  } catch (error) {
    logger.error('Resend confirmation exception', { error, email });
    return { success: false, error: error.message };
  }
}

export default {
  signUp,
  signIn,
  signOut,
  checkLockout,
  requestPasswordReset,
  updatePassword,
  getSession,
  getCurrentUser,
  isEmailConfirmationPending,
  resendConfirmationEmail,
};
