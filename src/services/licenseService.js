/**
 * License Service
 *
 * Handles license key generation, redemption, and management.
 *
 * @module services/licenseService
 */
import { supabase } from '../supabase';
import { createScopedLogger } from './loggingService';

const logger = createScopedLogger('LicenseService');

/**
 * License types
 */
export const LICENSE_TYPES = [
  { value: 'trial', label: 'Trial', description: '14-day trial' },
  { value: 'standard', label: 'Standard', description: 'Standard license' },
  { value: 'pro', label: 'Pro', description: 'Pro features' },
  { value: 'enterprise', label: 'Enterprise', description: 'Enterprise features' }
];

/**
 * Plan levels
 */
export const PLAN_LEVELS = [
  { value: 'starter', label: 'Starter', screens: 5 },
  { value: 'pro', label: 'Pro', screens: 25 },
  { value: 'enterprise', label: 'Enterprise', screens: 100 }
];

/**
 * License status values
 */
export const LICENSE_STATUS = {
  AVAILABLE: 'available',
  RESERVED: 'reserved',
  ACTIVATED: 'activated',
  EXPIRED: 'expired',
  REVOKED: 'revoked'
};

/**
 * Generate new licenses
 */
export async function generateLicenses(options) {
  const {
    resellerId,
    licenseType = 'standard',
    planLevel = 'starter',
    maxScreens = 5,
    durationDays = 365,
    quantity = 1,
    notes = null
  } = options;

  const { data, error } = await supabase.rpc('generate_license', {
    p_reseller_id: resellerId,
    p_license_type: licenseType,
    p_plan_level: planLevel,
    p_max_screens: maxScreens,
    p_duration_days: durationDays,
    p_quantity: quantity,
    p_notes: notes
  });

  if (error) throw error;
  return data || [];
}

/**
 * Redeem a license code
 */
export async function redeemLicense(code, tenantId = null) {
  const { data, error } = await supabase.rpc('redeem_license', {
    p_code: code.toUpperCase().replace(/-/g, ''),
    p_tenant_id: tenantId
  });

  if (error) throw error;
  return data;
}

/**
 * Get license by code
 */
export async function getLicenseByCode(code) {
  const normalizedCode = code.toUpperCase();

  const { data, error } = await supabase
    .from('licenses')
    .select(`
      *,
      reseller:reseller_accounts(id, company_name),
      tenant:profiles(id, email, business_name)
    `)
    .or(`code.eq.${normalizedCode},code.eq.${normalizedCode.replace(/-/g, '')}`)
    .maybeSingle();

  if (error && error.code !== 'PGRST116') {
    throw error;
  }

  return data;
}

/**
 * Get license by ID
 */
export async function getLicenseById(licenseId) {
  const { data, error } = await supabase
    .from('licenses')
    .select(`
      *,
      reseller:reseller_accounts(id, company_name),
      tenant:profiles(id, email, business_name)
    `)
    .eq('id', licenseId)
    .single();

  if (error) throw error;
  return data;
}

/**
 * List licenses for a reseller
 */
export async function listResellerLicenses(resellerId, options = {}) {
  const { status = null, limit = 50, offset = 0 } = options;

  let query = supabase
    .from('licenses')
    .select(`
      *,
      tenant:profiles(id, email, business_name)
    `)
    .eq('reseller_id', resellerId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (status) {
    query = query.eq('status', status);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

/**
 * Revoke a license
 */
export async function revokeLicense(licenseId, reason = null) {
  const { data, error } = await supabase
    .from('licenses')
    .update({
      status: 'revoked',
      notes: reason ? `Revoked: ${reason}` : 'Revoked'
    })
    .eq('id', licenseId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Extend license expiration
 */
export async function extendLicense(licenseId, additionalDays) {
  const license = await getLicenseById(licenseId);

  const currentExpiry = license.expires_at ? new Date(license.expires_at) : new Date();
  const newExpiry = new Date(currentExpiry.getTime() + additionalDays * 24 * 60 * 60 * 1000);

  const { data, error } = await supabase
    .from('licenses')
    .update({
      expires_at: newExpiry.toISOString(),
      notes: `Extended by ${additionalDays} days`
    })
    .eq('id', licenseId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Check if a license code is valid (without redeeming)
 */
export async function validateLicenseCode(code) {
  const license = await getLicenseByCode(code);

  if (!license) {
    return { valid: false, error: 'Invalid license code' };
  }

  if (license.status !== 'available') {
    return {
      valid: false,
      error: license.status === 'activated' ? 'License already activated' :
        license.status === 'expired' ? 'License has expired' :
          license.status === 'revoked' ? 'License has been revoked' :
            'License not available'
    };
  }

  return {
    valid: true,
    license: {
      id: license.id,
      planLevel: license.plan_level,
      maxScreens: license.max_screens,
      durationDays: license.duration_days,
      licenseType: license.license_type,
      reseller: license.reseller?.company_name
    }
  };
}

/**
 * Get license statistics for reseller
 */
export async function getLicenseStats(resellerId) {
  const { data, error } = await supabase
    .from('licenses')
    .select('status')
    .eq('reseller_id', resellerId);

  if (error) throw error;

  const stats = {
    total: data.length,
    available: 0,
    activated: 0,
    expired: 0,
    revoked: 0
  };

  data.forEach(l => {
    if (stats[l.status] !== undefined) {
      stats[l.status]++;
    }
  });

  return stats;
}

/**
 * Bulk generate licenses
 */
export async function bulkGenerateLicenses(resellerId, configs) {
  const results = [];

  for (const config of configs) {
    const licenses = await generateLicenses({
      resellerId,
      ...config
    });
    results.push(...licenses);
  }

  return results;
}

/**
 * Export licenses as CSV
 */
export async function exportLicensesCSV(resellerId) {
  const licenses = await listResellerLicenses(resellerId, { limit: 1000 });

  const headers = ['Code', 'Type', 'Plan', 'Max Screens', 'Status', 'Tenant', 'Created', 'Expires'];
  const rows = licenses.map(l => [
    l.code,
    l.license_type,
    l.plan_level,
    l.max_screens,
    l.status,
    l.tenant?.email || '',
    l.created_at,
    l.expires_at || ''
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map(r => r.map(c => `"${c}"`).join(','))
  ].join('\n');

  // Trigger download
  const blob = new Blob([csvContent], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `licenses-${new Date().toISOString().split('T')[0]}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  return { success: true, count: licenses.length };
}

/**
 * Format license code with dashes
 */
export function formatLicenseCode(code) {
  const clean = code.replace(/-/g, '').toUpperCase();
  if (clean.length !== 16) return code;
  return `${clean.slice(0, 4)}-${clean.slice(4, 8)}-${clean.slice(8, 12)}-${clean.slice(12, 16)}`;
}

/**
 * Check for expiring licenses
 */
export async function getExpiringLicenses(resellerId, daysAhead = 30) {
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + daysAhead);

  const { data, error } = await supabase
    .from('licenses')
    .select(`
      *,
      tenant:profiles(id, email, business_name)
    `)
    .eq('reseller_id', resellerId)
    .eq('status', 'activated')
    .lt('expires_at', futureDate.toISOString())
    .gt('expires_at', new Date().toISOString())
    .order('expires_at', { ascending: true });

  if (error) throw error;
  return data || [];
}
