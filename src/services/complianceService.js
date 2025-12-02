/**
 * Compliance Service
 *
 * Handles data export and deletion for GDPR/compliance requirements.
 *
 * @module services/complianceService
 */
import { supabase } from '../supabase';

/**
 * Export statuses
 */
export const EXPORT_STATUS = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  FAILED: 'failed',
  EXPIRED: 'expired'
};

/**
 * Request a data export
 */
export async function requestDataExport(options = {}) {
  const { tenantId = null, includeMedia = false, exportType = 'full' } = options;

  const { data: { user } } = await supabase.auth.getUser();
  const targetTenantId = tenantId || user?.id;

  // Create export request record
  const { data, error } = await supabase
    .from('data_export_requests')
    .insert({
      tenant_id: targetTenantId,
      requested_by: user.id,
      export_type: exportType,
      include_media: includeMedia,
      status: 'pending'
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Get export request status
 */
export async function getExportStatus(requestId) {
  const { data, error } = await supabase
    .from('data_export_requests')
    .select('*')
    .eq('id', requestId)
    .single();

  if (error) throw error;
  return data;
}

/**
 * List export requests for a tenant
 */
export async function listExportRequests(tenantId = null) {
  const { data: { user } } = await supabase.auth.getUser();
  const targetTenantId = tenantId || user?.id;

  const { data, error } = await supabase
    .from('data_export_requests')
    .select('*')
    .eq('tenant_id', targetTenantId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

/**
 * Execute data export (returns JSON data)
 */
export async function executeDataExport(tenantId = null) {
  const { data: { user } } = await supabase.auth.getUser();
  const targetTenantId = tenantId || user?.id;

  const { data, error } = await supabase.rpc('export_tenant_data', {
    p_tenant_id: targetTenantId
  });

  if (error) throw error;
  return data;
}

/**
 * Download export as JSON file
 */
export async function downloadExport(tenantId = null) {
  const data = await executeDataExport(tenantId);

  // Create downloadable blob
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: 'application/json'
  });

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `bizscreen-export-${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  return { success: true };
}

/**
 * Request tenant data deletion (super_admin only)
 */
export async function requestDataDeletion(tenantId, confirmationEmail, reason = null) {
  const { data, error } = await supabase.rpc('delete_tenant_data', {
    p_tenant_id: tenantId,
    p_confirmation_email: confirmationEmail,
    p_reason: reason
  });

  if (error) throw error;
  return data;
}

/**
 * Get deletion log (super_admin only)
 */
export async function getDeletionLog(limit = 50) {
  const { data, error } = await supabase
    .from('data_deletion_log')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data || [];
}

/**
 * Check if user has enterprise features
 */
export async function hasEnterpriseFeatures(tenantId = null) {
  const { data, error } = await supabase.rpc('has_enterprise_features', {
    p_tenant_id: tenantId
  });

  if (error) {
    console.error('Error checking enterprise features:', error);
    return false;
  }

  return data;
}

/**
 * Get data summary for a tenant
 */
export async function getDataSummary(tenantId = null) {
  const { data: { user } } = await supabase.auth.getUser();
  const targetTenantId = tenantId || user?.id;

  // Get counts of various data types
  const [screens, playlists, layouts, media, campaigns, teamMembers] = await Promise.all([
    supabase.from('tv_devices').select('id', { count: 'exact', head: true }).eq('owner_id', targetTenantId),
    supabase.from('playlists').select('id', { count: 'exact', head: true }).eq('owner_id', targetTenantId),
    supabase.from('layouts').select('id', { count: 'exact', head: true }).eq('owner_id', targetTenantId),
    supabase.from('media_assets').select('id', { count: 'exact', head: true }).eq('owner_id', targetTenantId),
    supabase.from('campaigns').select('id', { count: 'exact', head: true }).eq('owner_id', targetTenantId),
    supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('managed_by', targetTenantId)
  ]);

  return {
    screens: screens.count || 0,
    playlists: playlists.count || 0,
    layouts: layouts.count || 0,
    media: media.count || 0,
    campaigns: campaigns.count || 0,
    teamMembers: teamMembers.count || 0,
    totalItems: (screens.count || 0) + (playlists.count || 0) + (layouts.count || 0) +
      (media.count || 0) + (campaigns.count || 0) + (teamMembers.count || 0)
  };
}

/**
 * Export data in CSV format (simplified)
 */
export async function exportAsCSV(dataType, tenantId = null) {
  const { data: { user } } = await supabase.auth.getUser();
  const targetTenantId = tenantId || user?.id;

  let data;
  let filename;

  switch (dataType) {
    case 'screens':
      const { data: screens } = await supabase
        .from('tv_devices')
        .select('id, name, pairing_code, status, resolution, last_seen_at, created_at')
        .eq('owner_id', targetTenantId);
      data = screens;
      filename = 'screens';
      break;

    case 'playlists':
      const { data: playlists } = await supabase
        .from('playlists')
        .select('id, name, description, is_active, created_at, updated_at')
        .eq('owner_id', targetTenantId);
      data = playlists;
      filename = 'playlists';
      break;

    case 'media':
      const { data: media } = await supabase
        .from('media_assets')
        .select('id, name, type, url, file_size, duration, created_at')
        .eq('owner_id', targetTenantId);
      data = media;
      filename = 'media';
      break;

    case 'activity':
      const { data: activity } = await supabase
        .from('activity_log')
        .select('id, action, entity_type, entity_id, details, created_at')
        .eq('user_id', targetTenantId)
        .order('created_at', { ascending: false })
        .limit(1000);
      data = activity;
      filename = 'activity';
      break;

    default:
      throw new Error('Unknown data type');
  }

  if (!data || data.length === 0) {
    throw new Error('No data to export');
  }

  // Convert to CSV
  const headers = Object.keys(data[0]);
  const csvRows = [
    headers.join(','),
    ...data.map(row =>
      headers.map(h => {
        const val = row[h];
        if (val === null || val === undefined) return '';
        if (typeof val === 'object') return `"${JSON.stringify(val).replace(/"/g, '""')}"`;
        if (typeof val === 'string' && (val.includes(',') || val.includes('"'))) {
          return `"${val.replace(/"/g, '""')}"`;
        }
        return val;
      }).join(',')
    )
  ];

  const csvContent = csvRows.join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}-${new Date().toISOString().split('T')[0]}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  return { success: true, rows: data.length };
}
