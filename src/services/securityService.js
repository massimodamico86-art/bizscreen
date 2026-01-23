/**
 * Security Service - Sanitization event logging and monitoring
 *
 * Provides functions for:
 * - Logging sanitization events (when DOMPurify removes content)
 * - Fetching sanitization event history for admin dashboard
 * - Identifying users with repeated sanitization events (flagged users)
 *
 * Security notes:
 * - Store summary only (element types/counts), NOT actual malicious content
 * - Silent failure for logging to avoid breaking user flows
 * - Admin-only access to view events (enforced by RLS)
 */

import { supabase } from '../supabase.js';
import { createScopedLogger } from './loggingService.js';

const logger = createScopedLogger('SecurityService');

/**
 * Log a sanitization event
 *
 * Called when DOMPurify removes content during sanitization.
 * Stores summary data only - never stores the actual malicious content.
 *
 * @param {object} params - Event parameters
 * @param {string} params.userId - UUID of the user who submitted content (optional)
 * @param {object} params.removedSummary - Summary of removed elements (e.g., { scripts: 2, handlers: 1 })
 * @param {string} params.context - Where sanitization occurred (e.g., 'playlist-description', 'template-content')
 * @param {string} params.timestamp - ISO timestamp of the event
 * @returns {Promise<string|null>} Event ID or null on error
 */
export async function logSanitizationEvent({ userId, removedSummary, context, timestamp }) {
  try {
    const { data, error } = await supabase
      .from('sanitization_events')
      .insert({
        user_id: userId || null,
        removed_summary: removedSummary || {},
        context: context || 'unknown',
        created_at: timestamp || new Date().toISOString(),
      })
      .select('id')
      .single();

    if (error) {
      // Silent failure - don't throw, just log
      logger.error('Failed to log sanitization event', { error, context });
      return null;
    }

    logger.info('Sanitization event logged', { eventId: data?.id, context, userId });
    return data?.id || null;
  } catch (error) {
    // Silent failure for logging
    logger.error('Sanitization event logging exception', { error, context });
    return null;
  }
}

/**
 * Get recent sanitization events
 *
 * Fetches sanitization events with user info for admin dashboard.
 * Requires admin or super_admin role (enforced by RLS).
 *
 * @param {object} options - Query options
 * @param {number} options.limit - Max results (default: 50)
 * @param {number} options.offset - Offset for pagination (default: 0)
 * @returns {Promise<{data: Array, error: string|null}>}
 */
export async function getSanitizationEvents({ limit = 50, offset = 0 } = {}) {
  try {
    const { data, error } = await supabase
      .from('sanitization_events')
      .select(`
        id,
        user_id,
        removed_summary,
        context,
        created_at,
        profiles:user_id (
          email,
          full_name
        )
      `)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      logger.error('Failed to fetch sanitization events', { error });
      return { data: [], error: error.message };
    }

    // Transform data to flatten user info
    const events = (data || []).map(event => ({
      id: event.id,
      user_id: event.user_id,
      user_email: event.profiles?.email || null,
      user_name: event.profiles?.full_name || null,
      removed_summary: event.removed_summary,
      context: event.context,
      created_at: event.created_at,
    }));

    return { data: events, error: null };
  } catch (error) {
    logger.error('Sanitization events fetch exception', { error });
    return { data: [], error: error.message };
  }
}

/**
 * Get users with repeated sanitization events (flagged users)
 *
 * Returns users who have triggered more than the threshold number
 * of sanitization events. Useful for identifying potential bad actors.
 *
 * @param {object} options - Query options
 * @param {number} options.threshold - Minimum event count to be flagged (default: 5)
 * @returns {Promise<{data: Array, error: string|null}>}
 */
export async function getFlaggedUsers({ threshold = 5 } = {}) {
  try {
    // Use RPC function for aggregation with threshold filtering
    const { data, error } = await supabase.rpc('get_flagged_sanitization_users', {
      p_threshold: threshold,
    });

    if (error) {
      // Fallback: If RPC doesn't exist, try direct query
      if (error.code === '42883') {
        // Function not found - use fallback approach
        logger.debug('Using fallback for flagged users (RPC not found)');
        return await getFlaggedUsersFallback(threshold);
      }
      logger.error('Failed to fetch flagged users', { error });
      return { data: [], error: error.message };
    }

    return { data: data || [], error: null };
  } catch (error) {
    logger.error('Flagged users fetch exception', { error });
    return { data: [], error: error.message };
  }
}

/**
 * Fallback implementation for getFlaggedUsers without RPC
 * Uses client-side aggregation
 */
async function getFlaggedUsersFallback(threshold) {
  try {
    // Fetch all events with user info
    const { data, error } = await supabase
      .from('sanitization_events')
      .select(`
        user_id,
        created_at,
        profiles:user_id (
          email,
          full_name
        )
      `)
      .not('user_id', 'is', null)
      .order('created_at', { ascending: false });

    if (error) {
      return { data: [], error: error.message };
    }

    // Client-side aggregation
    const userCounts = {};
    const userInfo = {};
    const userLastEvent = {};

    for (const event of data || []) {
      const userId = event.user_id;
      if (!userId) continue;

      userCounts[userId] = (userCounts[userId] || 0) + 1;

      if (!userInfo[userId] && event.profiles) {
        userInfo[userId] = {
          email: event.profiles.email,
          full_name: event.profiles.full_name,
        };
      }

      // Track most recent event
      if (!userLastEvent[userId] || event.created_at > userLastEvent[userId]) {
        userLastEvent[userId] = event.created_at;
      }
    }

    // Filter by threshold and format
    const flaggedUsers = Object.entries(userCounts)
      .filter(([, count]) => count >= threshold)
      .map(([userId, count]) => ({
        user_id: userId,
        email: userInfo[userId]?.email || null,
        full_name: userInfo[userId]?.full_name || null,
        event_count: count,
        last_event: userLastEvent[userId],
      }))
      .sort((a, b) => b.event_count - a.event_count);

    return { data: flaggedUsers, error: null };
  } catch (error) {
    return { data: [], error: error.message };
  }
}

/**
 * Get total count of sanitization events
 *
 * @returns {Promise<{count: number, error: string|null}>}
 */
export async function getSanitizationEventCount() {
  try {
    const { count, error } = await supabase
      .from('sanitization_events')
      .select('*', { count: 'exact', head: true });

    if (error) {
      logger.error('Failed to fetch sanitization event count', { error });
      return { count: 0, error: error.message };
    }

    return { count: count || 0, error: null };
  } catch (error) {
    logger.error('Sanitization event count fetch exception', { error });
    return { count: 0, error: error.message };
  }
}

export default {
  logSanitizationEvent,
  getSanitizationEvents,
  getFlaggedUsers,
  getSanitizationEventCount,
};
