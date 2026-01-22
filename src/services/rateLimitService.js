/**
 * Rate Limit Service - Wrapper for database rate limiting
 *
 * Provides rate limiting for high-frequency API endpoints.
 * Uses PostgreSQL check_rate_limit() function for atomic checks.
 */

import { supabase } from '../supabase';

/**
 * Rate limit configurations per action
 * Authenticated users get 2x the base limit
 */
export const RATE_LIMITS = {
  media_upload: { base: 50, window: 15 },
  scene_create: { base: 30, window: 15 },
  ai_generation: { base: 20, window: 15 },
};

/**
 * Check rate limit for an action
 * @param {string} action - Action type (e.g., 'media_upload')
 * @param {Object} options - Options
 * @param {string} options.userId - User ID (optional, uses IP if not provided)
 * @param {boolean} options.isAuthenticated - Whether user is authenticated (2x limit)
 * @returns {Promise<{allowed: boolean, retryAfter?: number, remaining?: number}>}
 */
export async function checkRateLimit(action, options = {}) {
  const config = RATE_LIMITS[action];
  if (!config) {
    console.warn(`Unknown rate limit action: ${action}`);
    return { allowed: true }; // Fail open for unknown actions
  }

  // Use user ID if authenticated, otherwise use a session identifier
  // In production, you'd get the real IP from headers
  const { userId, isAuthenticated = false } = options;
  const identifier = userId || 'anonymous';

  // Authenticated users get 2x the limit
  const maxRequests = isAuthenticated ? config.base * 2 : config.base;

  try {
    const { data, error } = await supabase.rpc('check_rate_limit', {
      p_identifier: identifier,
      p_action: action,
      p_max_requests: maxRequests,
      p_window_minutes: config.window,
    });

    if (error) {
      console.error('Rate limit check error:', error);
      // Fail open - don't block users if rate limit check fails
      return { allowed: true };
    }

    if (!data.allowed) {
      return {
        allowed: false,
        retryAfter: data.retry_after_seconds,
        currentCount: data.current_count,
        limit: data.limit,
      };
    }

    return {
      allowed: true,
      remaining: data.remaining,
      limit: data.limit,
    };
  } catch (err) {
    console.error('Rate limit check exception:', err);
    // Fail open
    return { allowed: true };
  }
}

/**
 * Create a rate limit error with standard format
 * @param {number} retryAfter - Seconds until rate limit resets
 * @returns {Error}
 */
export function createRateLimitError(retryAfter) {
  const minutes = Math.ceil(retryAfter / 60);
  const error = new Error(
    `Too many requests. Please try again in ${minutes} minute${minutes > 1 ? 's' : ''}.`
  );
  error.code = 'RATE_LIMIT_EXCEEDED';
  error.retryAfter = retryAfter;
  return error;
}

export default {
  checkRateLimit,
  createRateLimitError,
  RATE_LIMITS,
};
