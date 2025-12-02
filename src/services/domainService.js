/**
 * Domain Service
 *
 * Frontend service for managing custom domains and white-label settings.
 * Handles domain CRUD operations, verification, and white-label configuration.
 */

import { supabase } from '../supabase';
import { getEffectiveOwnerId } from './tenantService';

/**
 * Get auth headers for API requests
 * @returns {Promise<{Authorization: string}>}
 */
async function getAuthHeaders() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) {
    throw new Error('Not authenticated');
  }
  return {
    'Authorization': `Bearer ${session.access_token}`,
    'Content-Type': 'application/json'
  };
}

/**
 * List all domains for the current tenant
 * @param {string} [tenantId] - Optional tenant ID (for admins)
 * @returns {Promise<Array>}
 */
export async function listDomains(tenantId = null) {
  const headers = await getAuthHeaders();
  const effectiveTenantId = tenantId || await getEffectiveOwnerId();

  const response = await fetch(`/api/domains/list?tenantId=${effectiveTenantId}`, {
    headers
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Failed to list domains');
  }

  return data.domains || [];
}

/**
 * Add a new domain
 * @param {Object} params
 * @param {string} params.domain - Domain name to add
 * @param {string} [params.tenantId] - Optional tenant ID (for admins)
 * @returns {Promise<{domain: Object, verification: Object}>}
 */
export async function addDomain({ domain, tenantId = null }) {
  const headers = await getAuthHeaders();
  const effectiveTenantId = tenantId || await getEffectiveOwnerId();

  const response = await fetch('/api/domains/add', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      domain,
      tenantId: effectiveTenantId
    })
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Failed to add domain');
  }

  return {
    domain: data.domain,
    verification: data.verification
  };
}

/**
 * Remove a domain
 * @param {string} domainId - Domain ID to remove
 * @returns {Promise<void>}
 */
export async function removeDomain(domainId) {
  const headers = await getAuthHeaders();

  const response = await fetch('/api/domains/remove', {
    method: 'POST',
    headers,
    body: JSON.stringify({ domainId })
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Failed to remove domain');
  }
}

/**
 * Verify a domain via DNS TXT record check
 * @param {string} domainId - Domain ID to verify
 * @returns {Promise<{verified: boolean, domain?: Object, instructions?: Object}>}
 */
export async function verifyDomain(domainId) {
  const headers = await getAuthHeaders();

  const response = await fetch('/api/domains/verify', {
    method: 'POST',
    headers,
    body: JSON.stringify({ domainId })
  });

  const data = await response.json();

  if (!response.ok && !data.instructions) {
    throw new Error(data.error || 'Failed to verify domain');
  }

  return {
    verified: data.verified || false,
    domain: data.domain,
    message: data.message,
    expected: data.expected,
    found: data.found,
    instructions: data.instructions
  };
}

/**
 * Set a domain as primary
 * @param {string} domainId - Domain ID to set as primary
 * @returns {Promise<Object>}
 */
export async function setPrimaryDomain(domainId) {
  const headers = await getAuthHeaders();

  const response = await fetch('/api/domains/set-primary', {
    method: 'POST',
    headers,
    body: JSON.stringify({ domainId })
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Failed to set primary domain');
  }

  return data.domain;
}

/**
 * Get white-label settings for the current tenant
 * @param {string} [tenantId] - Optional tenant ID
 * @returns {Promise<Object>}
 */
export async function getWhiteLabelSettings(tenantId = null) {
  const effectiveTenantId = tenantId || await getEffectiveOwnerId();

  const { data, error } = await supabase
    .from('profiles')
    .select(`
      white_label_enabled,
      hide_powered_by,
      login_page_logo_url,
      login_page_background_url,
      login_page_title,
      login_page_subtitle,
      email_logo_url,
      email_from_name,
      support_email,
      support_url,
      custom_css
    `)
    .eq('id', effectiveTenantId)
    .single();

  if (error) throw error;

  return {
    whiteLabelEnabled: data?.white_label_enabled || false,
    hidePoweredBy: data?.hide_powered_by || false,
    loginPageLogoUrl: data?.login_page_logo_url || '',
    loginPageBackgroundUrl: data?.login_page_background_url || '',
    loginPageTitle: data?.login_page_title || '',
    loginPageSubtitle: data?.login_page_subtitle || '',
    emailLogoUrl: data?.email_logo_url || '',
    emailFromName: data?.email_from_name || '',
    supportEmail: data?.support_email || '',
    supportUrl: data?.support_url || '',
    customCss: data?.custom_css || ''
  };
}

/**
 * Update white-label settings
 * @param {Object} settings - Settings to update
 * @param {string} [tenantId] - Optional tenant ID
 * @returns {Promise<void>}
 */
export async function updateWhiteLabelSettings(settings, tenantId = null) {
  const headers = await getAuthHeaders();
  const effectiveTenantId = tenantId || await getEffectiveOwnerId();

  // Convert camelCase to snake_case for API
  const apiSettings = {};
  if (settings.whiteLabelEnabled !== undefined) apiSettings.white_label_enabled = settings.whiteLabelEnabled;
  if (settings.hidePoweredBy !== undefined) apiSettings.hide_powered_by = settings.hidePoweredBy;
  if (settings.loginPageLogoUrl !== undefined) apiSettings.login_page_logo_url = settings.loginPageLogoUrl;
  if (settings.loginPageBackgroundUrl !== undefined) apiSettings.login_page_background_url = settings.loginPageBackgroundUrl;
  if (settings.loginPageTitle !== undefined) apiSettings.login_page_title = settings.loginPageTitle;
  if (settings.loginPageSubtitle !== undefined) apiSettings.login_page_subtitle = settings.loginPageSubtitle;
  if (settings.emailLogoUrl !== undefined) apiSettings.email_logo_url = settings.emailLogoUrl;
  if (settings.emailFromName !== undefined) apiSettings.email_from_name = settings.emailFromName;
  if (settings.supportEmail !== undefined) apiSettings.support_email = settings.supportEmail;
  if (settings.supportUrl !== undefined) apiSettings.support_url = settings.supportUrl;
  if (settings.customCss !== undefined) apiSettings.custom_css = settings.customCss;

  const response = await fetch('/api/domains/white-label-settings', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      tenantId: effectiveTenantId,
      settings: apiSettings
    })
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Failed to update settings');
  }
}

/**
 * Get domain verification status details
 * @param {Object} domain - Domain object
 * @returns {{ status: string, color: string, bgColor: string }}
 */
export function getDomainStatus(domain) {
  if (domain.is_verified) {
    if (domain.ssl_status === 'active') {
      return { status: 'Active', color: 'text-green-600', bgColor: 'bg-green-100' };
    }
    if (domain.ssl_status === 'provisioning') {
      return { status: 'SSL Provisioning', color: 'text-blue-600', bgColor: 'bg-blue-100' };
    }
    return { status: 'Verified', color: 'text-green-600', bgColor: 'bg-green-100' };
  }
  return { status: 'Pending Verification', color: 'text-yellow-600', bgColor: 'bg-yellow-100' };
}

/**
 * Format domain for display
 * @param {Object} domain - Domain object
 * @returns {string}
 */
export function formatDomainUrl(domain) {
  return `https://${domain.domain_name}`;
}

export default {
  listDomains,
  addDomain,
  removeDomain,
  verifyDomain,
  setPrimaryDomain,
  getWhiteLabelSettings,
  updateWhiteLabelSettings,
  getDomainStatus,
  formatDomainUrl
};
