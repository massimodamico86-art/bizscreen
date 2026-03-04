/**
 * Proof of Play Service
 *
 * Fetches proof-of-play report data, playback summary statistics,
 * and provides CSV export for compliance reporting.
 */

import { supabase } from '../supabase';

/**
 * Fetch proof-of-play report data aggregated by screen and content.
 *
 * @param {Object} params - Report parameters
 * @param {string} params.startDate - ISO start date string
 * @param {string} params.endDate - ISO end date string
 * @param {string[]} [params.screenIds] - Optional array of screen UUIDs to filter
 * @returns {Promise<Array>} Array of report rows
 */
export async function fetchProofOfPlayReport({ startDate, endDate, screenIds }) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const params = {
    p_tenant_id: user.id,
    p_start_date: startDate,
    p_end_date: endDate,
  };

  if (screenIds && screenIds.length > 0) {
    params.p_screen_ids = screenIds;
  }

  const { data, error } = await supabase.rpc('get_proof_of_play_report', params);

  if (error) {
    console.error('[ProofOfPlay] Failed to fetch report:', error);
    throw error;
  }

  return data || [];
}

/**
 * Fetch playback summary statistics for a date range.
 *
 * @param {Object} params - Summary parameters
 * @param {string} params.startDate - ISO start date string
 * @param {string} params.endDate - ISO end date string
 * @returns {Promise<Object>} Summary object with total_plays, total_hours, unique_content, active_screens
 */
export async function fetchPlaybackSummary({ startDate, endDate }) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase.rpc('get_playback_summary', {
    p_tenant_id: user.id,
    p_start_date: startDate,
    p_end_date: endDate,
  });

  if (error) {
    console.error('[ProofOfPlay] Failed to fetch summary:', error);
    throw error;
  }

  return data || { total_plays: 0, total_hours: 0, unique_content: 0, active_screens: 0 };
}

/**
 * Export report data as a CSV file download.
 *
 * @param {Array} reportData - Array of report rows from fetchProofOfPlayReport
 */
export function exportToCSV(reportData) {
  if (!reportData || reportData.length === 0) return;

  const headers = ['Screen', 'Content', 'Type', 'Total Plays', 'Total Duration (seconds)', 'First Played', 'Last Played'];

  const escapeCSV = (value) => {
    const str = String(value ?? '');
    // Wrap in quotes if contains comma, quote, or newline
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return '"' + str.replace(/"/g, '""') + '"';
    }
    return str;
  };

  const rows = reportData.map(row => [
    escapeCSV(row.screen_name),
    escapeCSV(row.content_name),
    escapeCSV(row.content_type),
    escapeCSV(row.total_plays),
    escapeCSV(row.total_duration_seconds),
    escapeCSV(row.first_played),
    escapeCSV(row.last_played),
  ].join(','));

  const csvContent = [headers.join(','), ...rows].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const today = new Date().toISOString().split('T')[0];
  const link = document.createElement('a');
  link.href = url;
  link.download = `proof-of-play-${today}.csv`;
  link.style.display = 'none';

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
}
