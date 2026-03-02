/**
 * Dev Bypass Utilities
 *
 * Shared constants and helpers for the VITE_DEV_BYPASS_AUTH mode.
 * Services that need the authenticated user ID should call
 * getAuthenticatedUserId() instead of supabase.auth.getUser() directly.
 *
 * This module is safe to import anywhere -- in production builds,
 * DEV_AUTH_BYPASS is false and the mock ID is never used.
 */
import { supabase } from '../supabase.js';

/** Whether the dev auth bypass is active (dev mode + env var set) */
export const DEV_AUTH_BYPASS = import.meta.env.DEV && import.meta.env.VITE_DEV_BYPASS_AUTH === 'true';

/** Mock user ID used by the dev bypass (matches AuthContext.jsx DEV_MOCK_USER.id) */
export const DEV_MOCK_USER_ID = '00000000-0000-0000-0000-000000000000';

/**
 * Get the authenticated user ID, with dev bypass fallback.
 *
 * First tries supabase.auth.getUser(). If that returns null AND
 * dev bypass is active, returns the mock user ID instead.
 * In production, this is equivalent to the standard getUser() pattern.
 *
 * @returns {Promise<string>} The user ID
 * @throws {Error} If no user is authenticated and dev bypass is not active
 */
export async function getAuthenticatedUserId() {
  const { data: { user } } = await supabase.auth.getUser();
  if (user) return user.id;

  if (DEV_AUTH_BYPASS) {
    return DEV_MOCK_USER_ID;
  }

  throw new Error('User must be authenticated');
}
