/**
 * Limits Service - Plan limits and usage tracking
 *
 * Provides functions to check plan limits and current usage,
 * enabling frontend guards and backend enforcement.
 */
import { supabase } from '../supabase';

import { createScopedLogger } from './loggingService.js';

const logger = createScopedLogger('LimitsService');

/**
 * @typedef {Object} EffectiveLimits
 * @property {string} planSlug - Plan slug (free, starter, pro)
 * @property {string} planName - Display name of the plan
 * @property {string} status - Subscription status (trialing, active, past_due, canceled, expired, none)
 * @property {number|null} maxScreens - Maximum screens allowed (null = unlimited)
 * @property {number|null} maxMediaAssets - Maximum media assets allowed
 * @property {number|null} maxPlaylists - Maximum playlists allowed
 * @property {number|null} maxLayouts - Maximum layouts allowed
 * @property {number|null} maxSchedules - Maximum schedules allowed
 */

/**
 * @typedef {Object} UsageCounts
 * @property {number} screensCount - Current number of screens
 * @property {number} mediaCount - Current number of media assets
 * @property {number} playlistsCount - Current number of playlists
 * @property {number} layoutsCount - Current number of layouts
 * @property {number} schedulesCount - Current number of schedules
 */

/**
 * @typedef {Object} LimitsWithUsage
 * @property {EffectiveLimits} limits
 * @property {UsageCounts} usage
 */

/**
 * Get effective limits for the current user
 * @returns {Promise<EffectiveLimits>}
 */
export async function getEffectiveLimits() {
  const { data, error } = await supabase.rpc('get_effective_limits');

  if (error) {
    logger.error('Error fetching limits:', { error: error });
    // Return free plan defaults on error
    return {
      planSlug: 'free',
      planName: 'Free',
      status: 'none',
      maxScreens: 1,
      maxMediaAssets: 50,
      maxPlaylists: 3,
      maxLayouts: 2,
      maxSchedules: 1
    };
  }

  // RPC returns an array, take the first row
  const row = Array.isArray(data) ? data[0] : data;

  return {
    planSlug: row?.plan_slug || 'free',
    planName: row?.plan_name || 'Free',
    status: row?.status || 'none',
    maxScreens: row?.max_screens,
    maxMediaAssets: row?.max_media_assets,
    maxPlaylists: row?.max_playlists,
    maxLayouts: row?.max_layouts,
    maxSchedules: row?.max_schedules
  };
}

/**
 * Get current usage counts for the current user
 * @returns {Promise<UsageCounts>}
 */
export async function getUsageCounts() {
  const { data, error } = await supabase.rpc('get_usage_counts');

  if (error) {
    logger.error('Error fetching usage counts:', { error: error });
    return {
      screensCount: 0,
      mediaCount: 0,
      playlistsCount: 0,
      layoutsCount: 0,
      schedulesCount: 0
    };
  }

  // RPC returns an array, take the first row
  const row = Array.isArray(data) ? data[0] : data;

  return {
    screensCount: row?.screens_count || 0,
    mediaCount: row?.media_count || 0,
    playlistsCount: row?.playlists_count || 0,
    layoutsCount: row?.layouts_count || 0,
    schedulesCount: row?.schedules_count || 0
  };
}

/**
 * Get both limits and current usage in one call
 * @returns {Promise<LimitsWithUsage>}
 */
export async function getLimitsWithUsage() {
  const [limits, usage] = await Promise.all([
    getEffectiveLimits(),
    getUsageCounts()
  ]);

  return { limits, usage };
}

/**
 * Check if a resource limit allows creation
 * @param {number|null} max - Maximum allowed (null = unlimited)
 * @param {number} current - Current count
 * @returns {boolean}
 */
function isWithinLimit(max, current) {
  if (max === null || max === undefined) return true; // Unlimited
  return current < max;
}

/**
 * Check if user can create a new screen
 * @param {number} currentCount - Current number of screens
 * @param {EffectiveLimits} [limits] - Optional pre-fetched limits
 * @returns {Promise<boolean>}
 */
export async function canCreateScreen(currentCount, limits) {
  const effectiveLimits = limits || await getEffectiveLimits();
  return isWithinLimit(effectiveLimits.maxScreens, currentCount);
}

/**
 * Check if user can create a new media asset
 * @param {number} currentCount - Current number of media assets
 * @param {EffectiveLimits} [limits] - Optional pre-fetched limits
 * @returns {Promise<boolean>}
 */
export async function canCreateMedia(currentCount, limits) {
  const effectiveLimits = limits || await getEffectiveLimits();
  return isWithinLimit(effectiveLimits.maxMediaAssets, currentCount);
}

/**
 * Check if user can create a new playlist
 * @param {number} currentCount - Current number of playlists
 * @param {EffectiveLimits} [limits] - Optional pre-fetched limits
 * @returns {Promise<boolean>}
 */
export async function canCreatePlaylist(currentCount, limits) {
  const effectiveLimits = limits || await getEffectiveLimits();
  return isWithinLimit(effectiveLimits.maxPlaylists, currentCount);
}

/**
 * Check if user can create a new layout
 * @param {number} currentCount - Current number of layouts
 * @param {EffectiveLimits} [limits] - Optional pre-fetched limits
 * @returns {Promise<boolean>}
 */
export async function canCreateLayout(currentCount, limits) {
  const effectiveLimits = limits || await getEffectiveLimits();
  return isWithinLimit(effectiveLimits.maxLayouts, currentCount);
}

/**
 * Check if user can create a new schedule
 * @param {number} currentCount - Current number of schedules
 * @param {EffectiveLimits} [limits] - Optional pre-fetched limits
 * @returns {Promise<boolean>}
 */
export async function canCreateSchedule(currentCount, limits) {
  const effectiveLimits = limits || await getEffectiveLimits();
  return isWithinLimit(effectiveLimits.maxSchedules, currentCount);
}

/**
 * Backend enforcement check - calls RPC that raises exception on limit exceeded
 * @param {'screen'|'media'|'playlist'|'layout'|'schedule'} resourceType
 * @returns {Promise<{allowed: boolean, error?: string}>}
 */
export async function checkResourceLimit(resourceType) {
  try {
    const { data, error } = await supabase.rpc('check_resource_limit', {
      resource_type: resourceType
    });

    if (error) {
      // Parse limit_exceeded error
      if (error.message?.includes('limit_exceeded')) {
        return {
          allowed: false,
          error: `You've reached the maximum number of ${resourceType}s for your plan. Upgrade to add more.`
        };
      }
      throw error;
    }

    return { allowed: true };
  } catch (error) {
    logger.error('Error checking resource limit:', { error: error });
    return {
      allowed: false,
      error: error.message || 'Failed to check resource limit'
    };
  }
}

/**
 * Get usage percentage for a resource
 * @param {number|null} max - Maximum allowed
 * @param {number} current - Current count
 * @returns {number} - Percentage (0-100), 0 if unlimited
 */
export function getUsagePercent(max, current) {
  if (max === null || max === undefined || max === 0) return 0;
  return Math.min(100, Math.round((current / max) * 100));
}

/**
 * Format limit display string
 * @param {number|null} max - Maximum allowed
 * @param {number} current - Current count
 * @returns {string} - e.g. "3 / 5" or "3 / Unlimited"
 */
export function formatLimitDisplay(max, current) {
  if (max === null || max === undefined) {
    return `${current} / Unlimited`;
  }
  return `${current} / ${max}`;
}

/**
 * Check if user is approaching a limit (80%+)
 * @param {number|null} max - Maximum allowed
 * @param {number} current - Current count
 * @returns {boolean}
 */
export function isApproachingLimit(max, current) {
  if (max === null || max === undefined) return false;
  return (current / max) >= 0.8;
}

/**
 * Check if user has reached a limit
 * @param {number|null} max - Maximum allowed
 * @param {number} current - Current count
 * @returns {boolean}
 */
export function hasReachedLimit(max, current) {
  if (max === null || max === undefined) return false;
  return current >= max;
}
