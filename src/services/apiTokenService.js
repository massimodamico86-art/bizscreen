/**
 * API Token Service
 *
 * Frontend service for managing API tokens.
 * Tokens are used for programmatic access to the BizScreen Public API.
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
