/**
 * Calendar Service
 *
 * Manages calendar OAuth connections and event fetching via the calendar-proxy
 * Edge Function. Calendar tokens are stored in the database (calendar_oauth_tokens
 * table) for unattended player operation -- not in localStorage.
 *
 * Token persistence path:
 *   OAuth callback -> handleXxxCallback() returns tokens
 *   -> saveCalendarSource() writes to calendar_oauth_tokens DB table
 *   -> calendar-proxy Edge Function reads from calendar_oauth_tokens DB table
 */

import { supabase } from '../supabase';
import { createScopedLogger } from './loggingService';

const logger = createScopedLogger('CalendarService');

// ─── Calendar Source CRUD ────────────────────────────────────────────

/**
 * Save or update a calendar OAuth connection in the database.
 *
 * Upserts to calendar_oauth_tokens on the unique constraint (owner_id, provider, calendar_id).
 * Called after a successful OAuth callback to persist tokens for server-side use.
 *
 * @param {{ provider: string, calendarId: string, label: string, accessToken: string, refreshToken: string, tokenExpiry: string|null }} params
 * @returns {Promise<object>} The upserted record
 */
export async function saveCalendarSource({ provider, calendarId, label, accessToken, refreshToken, tokenExpiry }) {
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    throw new Error('Not authenticated');
  }

  const { data, error } = await supabase
    .from('calendar_oauth_tokens')
    .upsert(
      {
        owner_id: user.id,
        provider,
        calendar_id: calendarId,
        label,
        access_token: accessToken,
        refresh_token: refreshToken,
        token_expiry: tokenExpiry,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'owner_id, provider, calendar_id' }
    )
    .select()
    .single();

  if (error) {
    logger.error('Failed to save calendar source', { error, provider, calendarId });
    throw new Error(`Failed to save calendar source: ${error.message}`);
  }

  logger.info('Calendar source saved', { provider, calendarId, label });
  return data;
}

/**
 * Get all calendar sources for the current user.
 *
 * Returns only safe fields (no access_token or refresh_token) for UI display.
 *
 * @returns {Promise<Array<{ id: string, provider: string, calendarId: string, label: string, created_at: string }>>}
 */
export async function getCalendarSources() {
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    throw new Error('Not authenticated');
  }

  const { data, error } = await supabase
    .from('calendar_oauth_tokens')
    .select('id, provider, calendar_id, label, created_at')
    .eq('owner_id', user.id)
    .order('created_at', { ascending: true });

  if (error) {
    logger.error('Failed to fetch calendar sources', { error });
    throw new Error(`Failed to fetch calendar sources: ${error.message}`);
  }

  return (data || []).map(row => ({
    id: row.id,
    provider: row.provider,
    calendarId: row.calendar_id,
    label: row.label,
    created_at: row.created_at,
  }));
}

/**
 * Remove a calendar source (disconnect a calendar).
 *
 * @param {string} sourceId - UUID of the calendar_oauth_tokens record
 */
export async function removeCalendarSource(sourceId) {
  const { error } = await supabase
    .from('calendar_oauth_tokens')
    .delete()
    .eq('id', sourceId);

  if (error) {
    logger.error('Failed to remove calendar source', { error, sourceId });
    throw new Error(`Failed to remove calendar source: ${error.message}`);
  }

  logger.info('Calendar source removed', { sourceId });
}

// ─── Calendar Event Fetching ─────────────────────────────────────────

/**
 * Fetch calendar events for a single source via the calendar-proxy Edge Function.
 *
 * The Edge Function handles token refresh, caching, and provider-specific API calls.
 *
 * @param {string} sourceId - UUID of the calendar_oauth_tokens record
 * @returns {Promise<Array<{ id: string, title: string, description: string, startTime: string, endTime: string, allDay: boolean, location: string|null }>>}
 */
export async function fetchCalendarEvents(sourceId) {
  const { data, error } = await supabase.functions.invoke('calendar-proxy', {
    body: { action: 'fetch', sourceId },
  });

  if (error) {
    logger.error('Failed to fetch calendar events', { error, sourceId });
    throw new Error(`Failed to fetch calendar events: ${error.message}`);
  }

  if (!data?.ok) {
    const errMsg = data?.error?.message || 'Unknown error fetching calendar events';
    logger.error('Calendar proxy returned error', { error: data?.error, sourceId });
    throw new Error(errMsg);
  }

  return data.data || [];
}

/**
 * Fetch calendar events from all provided sources and merge them.
 *
 * Events are merged and sorted by startTime ascending for chronological display.
 *
 * @param {string[]} sourceIds - Array of calendar_oauth_tokens record UUIDs
 * @returns {Promise<Array<{ id: string, title: string, description: string, startTime: string, endTime: string, allDay: boolean, location: string|null }>>}
 */
export async function fetchAllCalendarEvents(sourceIds) {
  if (!sourceIds || sourceIds.length === 0) {
    return [];
  }

  const results = await Promise.all(
    sourceIds.map(id => fetchCalendarEvents(id).catch(err => {
      logger.warn('Failed to fetch events for source, skipping', { sourceId: id, error: err.message });
      return []; // graceful degradation -- skip failed sources
    }))
  );

  // Merge all event arrays and sort by startTime ascending
  const allEvents = results.flat();
  allEvents.sort((a, b) => {
    const aTime = new Date(a.startTime).getTime();
    const bTime = new Date(b.startTime).getTime();
    return aTime - bTime;
  });

  return allEvents;
}
