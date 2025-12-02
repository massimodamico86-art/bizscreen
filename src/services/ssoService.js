/**
 * SSO Service
 *
 * Manages Single Sign-On provider configuration and authentication flows.
 *
 * @module services/ssoService
 */
import { supabase } from '../supabase';

/**
 * SSO Provider types
 */
export const SSO_TYPES = {
  OIDC: 'oidc',
  SAML: 'saml'
};

/**
 * Default roles for SSO users
 */
export const SSO_DEFAULT_ROLES = [
  { value: 'viewer', label: 'Viewer' },
  { value: 'editor', label: 'Editor' },
  { value: 'admin', label: 'Admin' }
];

/**
 * Get SSO provider configuration for a tenant
 */
export async function getSSOProvider(tenantId = null) {
  const { data: { user } } = await supabase.auth.getUser();
  const targetTenantId = tenantId || user?.id;

  const { data, error } = await supabase
    .from('sso_providers')
    .select('*')
    .eq('tenant_id', targetTenantId)
    .maybeSingle();

  if (error && error.code !== 'PGRST116') {
    throw error;
  }

  return data;
}

/**
 * Create or update SSO provider configuration
 */
export async function saveSSOProvider(config) {
  const { data: { user } } = await supabase.auth.getUser();

  const providerData = {
    tenant_id: config.tenantId || user.id,
    type: config.type,
    name: config.name,
    default_role: config.defaultRole || 'viewer',
    auto_create_users: config.autoCreateUsers ?? true,
    is_enabled: config.isEnabled ?? false,
    enforce_sso: config.enforceSso ?? false,
    attribute_mapping: config.attributeMapping || {
      email: 'email',
      name: 'name',
      given_name: 'given_name',
      family_name: 'family_name'
    }
  };

  // Add OIDC-specific fields
  if (config.type === 'oidc') {
    Object.assign(providerData, {
      issuer: config.issuer,
      client_id: config.clientId,
      client_secret: config.clientSecret,
      authorization_endpoint: config.authorizationEndpoint,
      token_endpoint: config.tokenEndpoint,
      userinfo_endpoint: config.userinfoEndpoint
    });
  }

  // Add SAML-specific fields
  if (config.type === 'saml') {
    Object.assign(providerData, {
      metadata_url: config.metadataUrl,
      metadata_xml: config.metadataXml,
      entity_id: config.entityId,
      sso_url: config.ssoUrl,
      certificate: config.certificate
    });
  }

  // Check if provider exists
  const existing = await getSSOProvider(providerData.tenant_id);

  if (existing) {
    // Update
    const { data, error } = await supabase
      .from('sso_providers')
      .update(providerData)
      .eq('id', existing.id)
      .select()
      .single();

    if (error) throw error;
    return data;
  } else {
    // Insert
    const { data, error } = await supabase
      .from('sso_providers')
      .insert(providerData)
      .select()
      .single();

    if (error) throw error;
    return data;
  }
}

/**
 * Delete SSO provider configuration
 */
export async function deleteSSOProvider(providerId) {
  const { error } = await supabase
    .from('sso_providers')
    .delete()
    .eq('id', providerId);

  if (error) throw error;
  return true;
}

/**
 * Toggle SSO enabled/disabled
 */
export async function toggleSSOEnabled(providerId, isEnabled) {
  const { data, error } = await supabase
    .from('sso_providers')
    .update({ is_enabled: isEnabled })
    .eq('id', providerId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Toggle SSO enforcement (disable local passwords)
 */
export async function toggleSSOEnforcement(providerId, enforceSso) {
  const { data, error } = await supabase
    .from('sso_providers')
    .update({ enforce_sso: enforceSso })
    .eq('id', providerId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Check if SSO is enforced for a tenant
 */
export async function isSSOEnforced(tenantId = null) {
  const { data, error } = await supabase.rpc('is_sso_enforced', {
    p_tenant_id: tenantId
  });

  if (error) throw error;
  return data;
}

/**
 * Generate OIDC authorization URL
 */
export function generateOIDCAuthUrl(provider, state, nonce, redirectUri) {
  const params = new URLSearchParams({
    client_id: provider.client_id,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid email profile',
    state: state,
    nonce: nonce
  });

  const authEndpoint = provider.authorization_endpoint ||
    `${provider.issuer}/authorize`;

  return `${authEndpoint}?${params.toString()}`;
}

/**
 * Generate random state/nonce for OIDC
 */
export function generateRandomString(length = 32) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  const randomValues = new Uint8Array(length);
  crypto.getRandomValues(randomValues);
  for (let i = 0; i < length; i++) {
    result += chars[randomValues[i] % chars.length];
  }
  return result;
}

/**
 * Initiate SSO login flow
 */
export async function initiateSSOLogin(tenantId) {
  // Get SSO provider
  const provider = await getSSOProvider(tenantId);

  if (!provider || !provider.is_enabled) {
    throw new Error('SSO is not configured or enabled for this tenant');
  }

  // Generate state and nonce
  const state = generateRandomString();
  const nonce = generateRandomString();
  const redirectUri = `${window.location.origin}/api/sso/callback`;

  // Store session info
  const { error } = await supabase
    .from('sso_sessions')
    .insert({
      provider_id: provider.id,
      state: state,
      nonce: nonce,
      redirect_uri: redirectUri,
      expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString() // 10 minutes
    });

  if (error) throw error;

  // Generate auth URL based on type
  if (provider.type === 'oidc') {
    return generateOIDCAuthUrl(provider, state, nonce, redirectUri);
  } else if (provider.type === 'saml') {
    // SAML flow would redirect to IdP SSO URL
    return provider.sso_url;
  }

  throw new Error('Unknown SSO provider type');
}

/**
 * Get SSO callback URL
 */
export function getSSOCallbackUrl() {
  return `${window.location.origin}/api/sso/callback`;
}

/**
 * Validate OIDC discovery document
 */
export async function validateOIDCIssuer(issuerUrl) {
  try {
    const discoveryUrl = `${issuerUrl.replace(/\/$/, '')}/.well-known/openid-configuration`;
    const response = await fetch(discoveryUrl);

    if (!response.ok) {
      return { valid: false, error: 'Could not fetch OIDC discovery document' };
    }

    const config = await response.json();

    return {
      valid: true,
      config: {
        issuer: config.issuer,
        authorizationEndpoint: config.authorization_endpoint,
        tokenEndpoint: config.token_endpoint,
        userinfoEndpoint: config.userinfo_endpoint,
        jwksUri: config.jwks_uri
      }
    };
  } catch (err) {
    return { valid: false, error: err.message };
  }
}

/**
 * List all SSO providers (super_admin only)
 */
export async function listAllSSOProviders() {
  const { data, error } = await supabase
    .from('sso_providers')
    .select(`
      *,
      tenant:profiles(id, full_name, email, business_name)
    `)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}
