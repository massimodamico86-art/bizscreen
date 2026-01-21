/**
 * API Token Service
 *
 * Frontend service for managing API tokens.
 * Tokens are used for programmatic access to the BizScreen Public API.
 *
 * Features:
 * - Token creation with scopes and optional expiration
 * - Token rotation (create new, revoke old)
 * - Expiration tracking and warnings
 * - Last-used monitoring
 * - Token revocation and deletion
 */

import { supabase } from '../supabase';
import { getEffectiveOwnerId } from './tenantService';

// Available scopes for API tokens
export const AVAILABLE_SCOPES = [
  { value: 'apps:read', label: 'Apps - Read', description: 'Read app configurations' },
  { value: 'apps:write', label: 'Apps - Write', description: 'Update app configurations' },
  { value: 'campaigns:read', label: 'Campaigns - Read', description: 'Read campaign data' },
  { value: 'campaigns:write', label: 'Campaigns - Write', description: 'Create, update, activate campaigns' },
  { value: 'playlists:read', label: 'Playlists - Read', description: 'Read playlist data' },
  { value: 'playlists:write', label: 'Playlists - Write', description: 'Create, update playlists' },
  { value: 'screens:read', label: 'Screens - Read', description: 'Read screen/device data' },
  { value: 'media:read', label: 'Media - Read', description: 'Read media assets' },
  { value: 'media:write', label: 'Media - Write', description: 'Upload and manage media' },
];

// Token lifecycle constants
export const TOKEN_EXPIRATION_OPTIONS = [
  { value: null, label: 'No expiration' },
  { value: 30, label: '30 days' },
  { value: 60, label: '60 days' },
  { value: 90, label: '90 days' },
  { value: 180, label: '6 months' },
  { value: 365, label: '1 year' },
];

// Warning threshold for expiring tokens (days)
export const EXPIRATION_WARNING_DAYS = 14;

/**
 * Generate a new API token (client-side token generation)
 * @returns {{ raw: string, hash: string, prefix: string }}
 */
function generateToken() {
  // Generate 32 random bytes as hex (64 chars)
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  const randomHex = Array.from(array, b => b.toString(16).padStart(2, '0')).join('');

  const raw = `biz_${randomHex}`;
  const prefix = raw.substring(0, 12); // "biz_" + first 8 hex chars

  return { raw, prefix };
}

/**
 * Hash a token using SHA-256 (for storage)
 * @param {string} raw - Raw token
 * @returns {Promise<string>} Hash
 */
async function hashToken(raw) {
  const encoder = new TextEncoder();
  const data = encoder.encode(raw);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Fetch all API tokens for the current tenant
 * @returns {Promise<Array>}
 */
export async function fetchTokens() {
  const ownerId = await getEffectiveOwnerId();
  if (!ownerId) throw new Error('No tenant context');

  const { data, error } = await supabase
    .from('api_tokens')
    .select('id, name, token_prefix, scopes, last_used_at, created_at, revoked_at, expires_at')
    .eq('owner_id', ownerId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

/**
 * Create a new API token
 * @param {Object} params
 * @param {string} params.name - Token name
 * @param {string[]} params.scopes - Token scopes
 * @param {string} [params.expiresAt] - Optional expiration date
 * @returns {Promise<{ token: Object, rawToken: string }>}
 */
export async function createToken({ name, scopes, expiresAt = null }) {
  const ownerId = await getEffectiveOwnerId();
  if (!ownerId) throw new Error('No tenant context');

  if (!name || !name.trim()) {
    throw new Error('Token name is required');
  }

  if (!scopes || scopes.length === 0) {
    throw new Error('At least one scope is required');
  }

  // Generate token
  const { raw, prefix } = generateToken();
  const hash = await hashToken(raw);

  // Insert token
  const { data, error } = await supabase
    .from('api_tokens')
    .insert({
      owner_id: ownerId,
      name: name.trim(),
      token_hash: hash,
      token_prefix: prefix,
      scopes,
      expires_at: expiresAt
    })
    .select('id, name, token_prefix, scopes, created_at, expires_at')
    .single();

  if (error) throw error;

  // Return both the created record and the raw token
  // The raw token is only shown once and never stored
  return {
    token: data,
    rawToken: raw
  };
}

/**
 * Revoke an API token
 * @param {string} tokenId - Token ID
 * @returns {Promise<Object>}
 */
export async function revokeToken(tokenId) {
  const { data, error } = await supabase
    .from('api_tokens')
    .update({ revoked_at: new Date().toISOString() })
    .eq('id', tokenId)
    .select('id, name, revoked_at')
    .single();

  if (error) throw error;
  return data;
}

/**
 * Delete an API token
 * @param {string} tokenId - Token ID
 * @returns {Promise<void>}
 */
export async function deleteToken(tokenId) {
  const { error } = await supabase
    .from('api_tokens')
    .delete()
    .eq('id', tokenId);

  if (error) throw error;
}

/**
 * Format token status
 * @param {Object} token
 * @returns {{ status: string, variant: string }}
 */
export function getTokenStatus(token) {
  if (token.revoked_at) {
    return { status: 'Revoked', variant: 'error' };
  }

  if (token.expires_at && new Date(token.expires_at) < new Date()) {
    return { status: 'Expired', variant: 'warning' };
  }

  return { status: 'Active', variant: 'success' };
}

/**
 * Format last used time
 * @param {string} lastUsedAt
 * @returns {string}
 */
export function formatLastUsed(lastUsedAt) {
  if (!lastUsedAt) return 'Never used';

  const date = new Date(lastUsedAt);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString();
}

/**
 * Calculate days until token expires
 * @param {Object} token
 * @returns {number|null} Days until expiration, or null if no expiration
 */
export function getDaysUntilExpiration(token) {
  if (!token.expires_at) return null;

  const expiresAt = new Date(token.expires_at);
  const now = new Date();
  const diffMs = expiresAt - now;
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Check if token is expiring soon
 * @param {Object} token
 * @returns {{ expiring: boolean, daysRemaining: number|null, warning: string|null }}
 */
export function getExpirationWarning(token) {
  const daysRemaining = getDaysUntilExpiration(token);

  if (daysRemaining === null) {
    return { expiring: false, daysRemaining: null, warning: null };
  }

  if (daysRemaining <= 0) {
    return { expiring: true, daysRemaining: 0, warning: 'Token has expired' };
  }

  if (daysRemaining <= EXPIRATION_WARNING_DAYS) {
    return {
      expiring: true,
      daysRemaining,
      warning: `Token expires in ${daysRemaining} day${daysRemaining === 1 ? '' : 's'}`,
    };
  }

  return { expiring: false, daysRemaining, warning: null };
}

/**
 * Get all tokens that are expiring soon
 * @returns {Promise<Array>}
 */
export async function getExpiringTokens() {
  const ownerId = await getEffectiveOwnerId();
  if (!ownerId) throw new Error('No tenant context');

  const warningDate = new Date();
  warningDate.setDate(warningDate.getDate() + EXPIRATION_WARNING_DAYS);

  const { data, error } = await supabase
    .from('api_tokens')
    .select('id, name, token_prefix, scopes, last_used_at, created_at, expires_at')
    .eq('owner_id', ownerId)
    .is('revoked_at', null)
    .not('expires_at', 'is', null)
    .lte('expires_at', warningDate.toISOString())
    .gte('expires_at', new Date().toISOString())
    .order('expires_at', { ascending: true });

  if (error) throw error;
  return data || [];
}

/**
 * Rotate an API token (create new one with same settings, revoke old)
 * @param {string} tokenId - ID of token to rotate
 * @returns {Promise<{ newToken: Object, rawToken: string, oldToken: Object }>}
 */
export async function rotateToken(tokenId) {
  const ownerId = await getEffectiveOwnerId();
  if (!ownerId) throw new Error('No tenant context');

  // Get existing token details
  const { data: existingToken, error: fetchError } = await supabase
    .from('api_tokens')
    .select('id, name, scopes, expires_at')
    .eq('id', tokenId)
    .eq('owner_id', ownerId)
    .is('revoked_at', null)
    .single();

  if (fetchError || !existingToken) {
    throw new Error('Token not found or already revoked');
  }

  // Calculate new expiration (same duration from now)
  let newExpiresAt = null;
  if (existingToken.expires_at) {
    const originalCreated = new Date(existingToken.created_at || Date.now());
    const originalExpires = new Date(existingToken.expires_at);
    const durationMs = originalExpires - originalCreated;
    newExpiresAt = new Date(Date.now() + durationMs).toISOString();
  }

  // Create new token with same settings
  const { raw, prefix } = generateToken();
  const hash = await hashToken(raw);

  const { data: newToken, error: createError } = await supabase
    .from('api_tokens')
    .insert({
      owner_id: ownerId,
      name: `${existingToken.name} (rotated)`,
      token_hash: hash,
      token_prefix: prefix,
      scopes: existingToken.scopes,
      expires_at: newExpiresAt,
    })
    .select('id, name, token_prefix, scopes, created_at, expires_at')
    .single();

  if (createError) throw createError;

  // Revoke old token
  const { data: oldToken, error: revokeError } = await supabase
    .from('api_tokens')
    .update({ revoked_at: new Date().toISOString() })
    .eq('id', tokenId)
    .select('id, name, revoked_at')
    .single();

  if (revokeError) throw revokeError;

  return {
    newToken,
    rawToken: raw,
    oldToken,
  };
}

/**
 * Update token expiration date
 * @param {string} tokenId
 * @param {Date|string|null} expiresAt - New expiration date or null to remove
 * @returns {Promise<Object>}
 */
export async function updateTokenExpiration(tokenId, expiresAt) {
  const { data, error } = await supabase
    .from('api_tokens')
    .update({
      expires_at: expiresAt ? new Date(expiresAt).toISOString() : null,
    })
    .eq('id', tokenId)
    .is('revoked_at', null)
    .select('id, name, token_prefix, expires_at')
    .single();

  if (error) throw error;
  return data;
}

/**
 * Extend token expiration by a number of days
 * @param {string} tokenId
 * @param {number} days - Days to extend
 * @returns {Promise<Object>}
 */
export async function extendTokenExpiration(tokenId, days) {
  // Get current token
  const { data: token, error: fetchError } = await supabase
    .from('api_tokens')
    .select('id, expires_at')
    .eq('id', tokenId)
    .is('revoked_at', null)
    .single();

  if (fetchError || !token) {
    throw new Error('Token not found or revoked');
  }

  // Calculate new expiration
  const baseDate = token.expires_at ? new Date(token.expires_at) : new Date();
  const newExpiration = new Date(baseDate);
  newExpiration.setDate(newExpiration.getDate() + days);

  return updateTokenExpiration(tokenId, newExpiration);
}

/**
 * Get token usage statistics
 * @param {string} tokenId
 * @returns {Promise<Object>}
 */
export async function getTokenUsageStats(tokenId) {
  const { data, error } = await supabase.rpc('get_token_usage_stats', {
    p_token_id: tokenId,
  });

  if (error) {
    // Fallback if RPC doesn't exist
    console.warn('Token usage stats RPC not available');
    return null;
  }

  return data;
}

/**
 * Get unused tokens (never used or not used in X days)
 * @param {number} daysInactive - Days of inactivity threshold
 * @returns {Promise<Array>}
 */
export async function getUnusedTokens(daysInactive = 30) {
  const ownerId = await getEffectiveOwnerId();
  if (!ownerId) throw new Error('No tenant context');

  const inactiveDate = new Date();
  inactiveDate.setDate(inactiveDate.getDate() - daysInactive);

  const { data, error } = await supabase
    .from('api_tokens')
    .select('id, name, token_prefix, scopes, last_used_at, created_at, expires_at')
    .eq('owner_id', ownerId)
    .is('revoked_at', null)
    .or(`last_used_at.is.null,last_used_at.lt.${inactiveDate.toISOString()}`)
    .order('last_used_at', { ascending: true, nullsFirst: true });

  if (error) throw error;
  return data || [];
}

/**
 * Get token summary for dashboard
 * @returns {Promise<Object>}
 */
export async function getTokenSummary() {
  const tokens = await fetchTokens();

  const now = new Date();
  const warningDate = new Date();
  warningDate.setDate(warningDate.getDate() + EXPIRATION_WARNING_DAYS);

  const summary = {
    total: tokens.length,
    active: 0,
    revoked: 0,
    expired: 0,
    expiringSoon: 0,
    neverUsed: 0,
  };

  for (const token of tokens) {
    if (token.revoked_at) {
      summary.revoked++;
    } else if (token.expires_at && new Date(token.expires_at) < now) {
      summary.expired++;
    } else {
      summary.active++;

      if (token.expires_at && new Date(token.expires_at) <= warningDate) {
        summary.expiringSoon++;
      }

      if (!token.last_used_at) {
        summary.neverUsed++;
      }
    }
  }

  return summary;
}
