/**
 * GDPR Service - Data Export and Account Deletion
 *
 * Handles GDPR compliance features:
 * - Data export (Right to Data Portability - Article 20)
 * - Account deletion (Right to Erasure - Article 17)
 */

import { supabase } from '../supabase';

// ============================================
// DATA EXPORT
// ============================================

/**
 * Request a data export
 * @param {string} format - Export format ('json' or 'csv')
 * @returns {Promise<{success: boolean, requestId?: string, error?: string}>}
 */
export async function requestDataExport(format = 'json') {
  try {
    const { data, error } = await supabase.rpc('request_data_export', {
      p_format: format,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, requestId: data };
  } catch (error) {
    console.error('Data export request error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get data export requests for current user
 * @returns {Promise<Array>}
 */
export async function getDataExportRequests() {
  try {
    const { data, error } = await supabase
      .from('data_export_requests')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Failed to get export requests:', error);
    return [];
  }
}

/**
 * Get the latest export request status
 * @returns {Promise<object|null>}
 */
export async function getLatestExportStatus() {
  try {
    const { data, error } = await supabase
      .from('data_export_requests')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data;
  } catch (error) {
    console.error('Failed to get export status:', error);
    return null;
  }
}

/**
 * Download completed export
 * @param {string} fileUrl - URL of the export file
 */
export function downloadExport(fileUrl) {
  window.open(fileUrl, '_blank');
}

/**
 * Generate client-side data export (immediate, limited data)
 * For full export, use the async server-side export
 * @returns {Promise<Blob>}
 */
export async function generateClientSideExport() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const exportData = {
    exportDate: new Date().toISOString(),
    userId: user.id,
    email: user.email,
    profile: null,
    settings: null,
    consent: null,
    activity: [],
  };

  // Fetch profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();
  exportData.profile = profile;

  // Fetch user settings
  const { data: settings } = await supabase
    .from('user_settings')
    .select('*')
    .eq('user_id', user.id)
    .single();
  exportData.settings = settings;

  // Fetch consent history
  const { data: consent } = await supabase
    .from('consent_records')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });
  exportData.consent = consent;

  // Fetch activity log (last 100)
  const { data: activity } = await supabase
    .from('activity_log')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(100);
  exportData.activity = activity;

  // Create downloadable blob
  const blob = new Blob(
    [JSON.stringify(exportData, null, 2)],
    { type: 'application/json' }
  );

  return blob;
}

/**
 * Trigger download of client-side export
 */
export async function downloadClientSideExport() {
  try {
    const blob = await generateClientSideExport();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bizscreen-data-export-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    return { success: true };
  } catch (error) {
    console.error('Client-side export failed:', error);
    return { success: false, error: error.message };
  }
}

// ============================================
// ACCOUNT DELETION
// ============================================

/**
 * Request account deletion
 * @param {object} options
 * @param {string} options.reason - Reason for leaving
 * @param {string} options.feedback - Additional feedback
 * @returns {Promise<{success: boolean, requestId?: string, scheduledDate?: string, error?: string}>}
 */
export async function requestAccountDeletion({ reason = null, feedback = null } = {}) {
  try {
    const { data, error } = await supabase.rpc('request_account_deletion', {
      p_reason: reason,
      p_feedback: feedback,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    // Get the scheduled date
    const status = await getDeletionStatus();

    return {
      success: true,
      requestId: data,
      scheduledDate: status?.scheduled_deletion_at,
      daysRemaining: status?.days_remaining,
    };
  } catch (error) {
    console.error('Account deletion request error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Cancel account deletion request
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function cancelAccountDeletion() {
  try {
    const { data, error } = await supabase.rpc('cancel_account_deletion');

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: data };
  } catch (error) {
    console.error('Cancel deletion error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get current deletion status
 * @returns {Promise<object|null>}
 */
export async function getDeletionStatus() {
  try {
    const { data, error } = await supabase.rpc('get_deletion_status');

    if (error) throw error;
    return data?.[0] || null;
  } catch (error) {
    console.error('Failed to get deletion status:', error);
    return null;
  }
}

/**
 * Get deletion request history
 * @returns {Promise<Array>}
 */
export async function getDeletionHistory() {
  try {
    const { data, error } = await supabase
      .from('account_deletion_requests')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Failed to get deletion history:', error);
    return [];
  }
}

// ============================================
// DELETION REASONS
// ============================================

export const DELETION_REASONS = [
  { id: 'not_using', label: 'I no longer use this service' },
  { id: 'found_alternative', label: 'I found a better alternative' },
  { id: 'too_expensive', label: 'It\'s too expensive' },
  { id: 'privacy_concerns', label: 'Privacy concerns' },
  { id: 'technical_issues', label: 'Technical issues' },
  { id: 'missing_features', label: 'Missing features I need' },
  { id: 'temporary', label: 'Just taking a break' },
  { id: 'other', label: 'Other reason' },
];

export default {
  // Data Export
  requestDataExport,
  getDataExportRequests,
  getLatestExportStatus,
  downloadExport,
  generateClientSideExport,
  downloadClientSideExport,
  // Account Deletion
  requestAccountDeletion,
  cancelAccountDeletion,
  getDeletionStatus,
  getDeletionHistory,
  DELETION_REASONS,
};
