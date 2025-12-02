/**
 * Tenant Service - Handles multi-tenant context and impersonation
 *
 * Provides functions for:
 * - Getting the current effective tenant (considering impersonation)
 * - Getting current branding configuration
 * - Starting/stopping impersonation (super_admin/admin only)
 *
 * Impersonation Flow:
 * 1. Super_admin/admin calls startImpersonation(clientId)
 * 2. Client ID is stored in localStorage
 * 3. All tenant/branding calls return the impersonated client's data
 * 4. stopImpersonation() clears the stored client ID
 */

import { supabase } from '../supabase';

// Storage key for impersonation
const IMPERSONATION_KEY = 'bizscreen_impersonated_client';

// Default branding values
const DEFAULT_BRANDING = {
  businessName: 'BizScreen',
  logoUrl: null,
  primaryColor: '#3B82F6', // Blue-500
  secondaryColor: '#1D4ED8', // Blue-700
  isDarkTheme: false,
};

/**
 * Get the currently impersonated client ID from localStorage
 * @returns {string|null}
 */
export function getImpersonatedClientId() {
  try {
    return localStorage.getItem(IMPERSONATION_KEY);
  } catch {
    return null;
  }
}

/**
 * Check if currently impersonating a client
 * @returns {boolean}
 */
export function isImpersonating() {
  return !!getImpersonatedClientId();
}

/**
 * Start impersonating a client
 * Only super_admin and admin users should call this
 *
 * @param {string} clientId - UUID of the client to impersonate
 * @param {object} clientInfo - Optional client info to cache
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function startImpersonation(clientId, clientInfo = null) {
  try {
    // Verify the caller has permission by fetching the target profile
    const { data, error } = await supabase.rpc('get_profile_for_impersonation', {
      target_id: clientId,
    });

    if (error) {
      console.error('Impersonation permission check failed:', error);
      return { success: false, error: 'Permission denied or client not found' };
    }

    if (!data || data.length === 0) {
      return { success: false, error: 'Client not found or you do not have permission to impersonate' };
    }

    // Store impersonation state
    localStorage.setItem(IMPERSONATION_KEY, clientId);

    // Also cache client info for quick access
    if (clientInfo) {
      localStorage.setItem(`${IMPERSONATION_KEY}_info`, JSON.stringify(clientInfo));
    } else {
      // Cache the fetched profile
      localStorage.setItem(`${IMPERSONATION_KEY}_info`, JSON.stringify(data[0]));
    }

    return { success: true };
  } catch (err) {
    console.error('startImpersonation error:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Stop impersonating and return to own account
 */
export function stopImpersonation() {
  try {
    localStorage.removeItem(IMPERSONATION_KEY);
    localStorage.removeItem(`${IMPERSONATION_KEY}_info`);
  } catch (err) {
    console.error('stopImpersonation error:', err);
  }
}

/**
 * Get cached impersonated client info
 * @returns {object|null}
 */
export function getImpersonatedClientInfo() {
  try {
    const info = localStorage.getItem(`${IMPERSONATION_KEY}_info`);
    return info ? JSON.parse(info) : null;
  } catch {
    return null;
  }
}

/**
 * Get the current tenant profile
 * Returns the impersonated client if impersonating, otherwise returns the logged-in user's profile
 *
 * @returns {Promise<{data: object|null, error: string|null, isImpersonated: boolean}>}
 */
export async function getCurrentTenant() {
  try {
    const impersonatedId = getImpersonatedClientId();

    if (impersonatedId) {
      // Fetch impersonated client's profile
      const { data, error } = await supabase.rpc('get_profile_for_impersonation', {
        target_id: impersonatedId,
      });

      if (error) {
        console.error('Error fetching impersonated profile:', error);
        // Clear invalid impersonation
        stopImpersonation();
        // Fall back to own profile
        return getCurrentTenant();
      }

      if (data && data.length > 0) {
        return {
          data: data[0],
          error: null,
          isImpersonated: true,
        };
      }

      // Invalid impersonation, clear it
      stopImpersonation();
    }

    // Get own profile
    const { data, error } = await supabase.rpc('get_current_tenant_profile');

    if (error) {
      console.error('Error fetching own profile:', error);
      return { data: null, error: error.message, isImpersonated: false };
    }

    return {
      data: data && data.length > 0 ? data[0] : null,
      error: null,
      isImpersonated: false,
    };
  } catch (err) {
    console.error('getCurrentTenant error:', err);
    return { data: null, error: err.message, isImpersonated: false };
  }
}

/**
 * Get the effective owner_id for data queries
 * When impersonating, returns the impersonated client's ID
 * Otherwise returns the logged-in user's ID
 *
 * @returns {Promise<string|null>}
 */
export async function getEffectiveOwnerId() {
  const impersonatedId = getImpersonatedClientId();
  if (impersonatedId) {
    return impersonatedId;
  }

  const { data: { user } } = await supabase.auth.getUser();
  return user?.id || null;
}

/**
 * Get the current branding configuration
 * Based on the current tenant (considering impersonation)
 *
 * @returns {Promise<{
 *   businessName: string,
 *   logoUrl: string|null,
 *   primaryColor: string,
 *   secondaryColor: string,
 *   isDarkTheme: boolean
 * }>}
 */
export async function getCurrentBranding() {
  try {
    const { data: tenant } = await getCurrentTenant();

    if (!tenant) {
      return { ...DEFAULT_BRANDING };
    }

    return {
      businessName: tenant.business_name || DEFAULT_BRANDING.businessName,
      logoUrl: tenant.branding_logo_url || DEFAULT_BRANDING.logoUrl,
      primaryColor: tenant.branding_primary_color || DEFAULT_BRANDING.primaryColor,
      secondaryColor: tenant.branding_secondary_color || DEFAULT_BRANDING.secondaryColor,
      isDarkTheme: tenant.branding_is_dark_theme ?? DEFAULT_BRANDING.isDarkTheme,
    };
  } catch (err) {
    console.error('getCurrentBranding error:', err);
    return { ...DEFAULT_BRANDING };
  }
}

/**
 * Get full impersonation status with client details
 * Used by UI to show impersonation banner
 *
 * @returns {{
 *   isImpersonating: boolean,
 *   impersonatedClient: {id: string, businessName: string, fullName: string, email: string}|null
 * }}
 */
export function getImpersonationStatus() {
  const clientId = getImpersonatedClientId();
  const clientInfo = getImpersonatedClientInfo();

  if (!clientId) {
    return {
      isImpersonating: false,
      impersonatedClient: null,
    };
  }

  return {
    isImpersonating: true,
    impersonatedClient: clientInfo
      ? {
          id: clientInfo.id,
          businessName: clientInfo.business_name || clientInfo.full_name || 'Unknown Client',
          fullName: clientInfo.full_name || '',
          email: clientInfo.email || '',
        }
      : {
          id: clientId,
          businessName: 'Client',
          fullName: '',
          email: '',
        },
  };
}

/**
 * Subscribe to impersonation changes
 * Returns an unsubscribe function
 *
 * @param {function} callback - Called when impersonation state changes
 * @returns {function} Unsubscribe function
 */
export function subscribeToImpersonationChanges(callback) {
  const handler = (event) => {
    if (event.key === IMPERSONATION_KEY) {
      callback(getImpersonationStatus());
    }
  };

  window.addEventListener('storage', handler);

  return () => {
    window.removeEventListener('storage', handler);
  };
}

/**
 * Resolve tenant by custom domain
 * Used for white-label login pages and domain-based branding
 *
 * @param {string} domain - The domain to resolve
 * @returns {Promise<{found: boolean, tenantId?: string, branding?: object}>}
 */
export async function resolveTenantByDomain(domain) {
  try {
    const response = await fetch(`/api/domains/resolve?domain=${encodeURIComponent(domain)}`);
    const data = await response.json();

    if (!response.ok || !data.found) {
      return { found: false };
    }

    return {
      found: true,
      tenantId: data.tenantId,
      domain: data.domain,
      branding: data.branding
    };
  } catch (err) {
    console.error('resolveTenantByDomain error:', err);
    return { found: false };
  }
}

/**
 * Check if the current hostname is a custom domain
 * @returns {boolean}
 */
export function isCustomDomain() {
  const hostname = window.location.hostname;
  // These are the known "standard" domains - anything else is custom
  const standardDomains = [
    'localhost',
    'bizscreen.io',
    'www.bizscreen.io',
    'app.bizscreen.io',
    'bizscreen.vercel.app'
  ];

  return !standardDomains.some(d =>
    hostname === d || hostname.endsWith(`.${d}`)
  );
}

/**
 * Get branding for the current domain
 * First checks if we're on a custom domain, if so fetches branding from API
 * Otherwise returns the current tenant's branding
 *
 * @returns {Promise<object>}
 */
export async function getDomainBranding() {
  if (isCustomDomain()) {
    const hostname = window.location.hostname;
    const result = await resolveTenantByDomain(hostname);

    if (result.found && result.branding) {
      return {
        businessName: result.branding.business_name || DEFAULT_BRANDING.businessName,
        logoUrl: result.branding.logo_url || DEFAULT_BRANDING.logoUrl,
        primaryColor: result.branding.primary_color || DEFAULT_BRANDING.primaryColor,
        secondaryColor: result.branding.secondary_color || DEFAULT_BRANDING.secondaryColor,
        isDarkTheme: result.branding.is_dark_theme ?? DEFAULT_BRANDING.isDarkTheme,
        hidePoweredBy: result.branding.hide_powered_by ?? false,
        loginLogoUrl: result.branding.login_logo_url,
        loginBackgroundUrl: result.branding.login_background_url,
        loginTitle: result.branding.login_title,
        loginSubtitle: result.branding.login_subtitle,
        supportEmail: result.branding.support_email,
        supportUrl: result.branding.support_url,
        isWhiteLabel: true,
        tenantId: result.tenantId
      };
    }
  }

  // Fall back to standard branding resolution
  return getCurrentBranding();
}

export default {
  getImpersonatedClientId,
  isImpersonating,
  startImpersonation,
  stopImpersonation,
  getImpersonatedClientInfo,
  getCurrentTenant,
  getEffectiveOwnerId,
  getCurrentBranding,
  getImpersonationStatus,
  subscribeToImpersonationChanges,
  resolveTenantByDomain,
  isCustomDomain,
  getDomainBranding,
  DEFAULT_BRANDING,
};
