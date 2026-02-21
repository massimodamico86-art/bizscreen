/**
 * Cloud OAuth Service
 *
 * Shared utilities for OAuth token storage, PKCE generation, state validation,
 * and token refresh across all cloud storage providers (Google Drive, Dropbox,
 * OneDrive, SharePoint, Google Photos).
 *
 * Pattern follows canvaService.js but extracted into reusable utilities.
 */

import { createScopedLogger } from '../loggingService';

const logger = createScopedLogger('CloudOAuthService');

// ─── Provider Registry ───────────────────────────────────────────────

export const CLOUD_PROVIDERS = {
  GOOGLE_DRIVE: 'gdrive',
  DROPBOX: 'dropbox',
  ONEDRIVE: 'onedrive',
  SHAREPOINT: 'sharepoint',
  GOOGLE_PHOTOS: 'gphotos',
};

// ─── PKCE Utilities ──────────────────────────────────────────────────

/**
 * Generate a random PKCE code verifier (32-byte hex string)
 */
export function generateCodeVerifier() {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Generate a PKCE code challenge from a verifier (SHA-256 + base64url)
 */
export async function generateCodeChallenge(verifier) {
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return btoa(String.fromCharCode(...new Uint8Array(hash)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

// ─── OAuth State Management ─────────────────────────────────────────

/**
 * Save OAuth state to sessionStorage (keyed by provider)
 * @param {string} provider - Provider key from CLOUD_PROVIDERS
 * @param {{ codeVerifier: string, state: string }} data
 */
export function saveOAuthState(provider, { codeVerifier, state }) {
  const key = `cloud_oauth_${provider}`;
  sessionStorage.setItem(key, JSON.stringify({ codeVerifier, state }));
  logger.debug(`OAuth state saved for ${provider}`);
}

/**
 * Retrieve and remove OAuth state from sessionStorage (one-time use)
 * @param {string} provider - Provider key from CLOUD_PROVIDERS
 * @returns {{ codeVerifier: string, state: string } | null}
 */
export function getOAuthState(provider) {
  const key = `cloud_oauth_${provider}`;
  const raw = sessionStorage.getItem(key);
  if (!raw) return null;

  sessionStorage.removeItem(key);
  try {
    return JSON.parse(raw);
  } catch {
    logger.warn(`Failed to parse OAuth state for ${provider}`);
    return null;
  }
}

/**
 * Validate received OAuth state against saved state
 * @param {string} provider - Provider key from CLOUD_PROVIDERS
 * @param {string} receivedState - The state value from the callback URL
 * @returns {{ valid: boolean, codeVerifier: string | null }}
 */
export function validateOAuthState(provider, receivedState) {
  const saved = getOAuthState(provider);
  if (!saved) {
    logger.warn(`No saved OAuth state for ${provider}`);
    return { valid: false, codeVerifier: null };
  }

  if (saved.state !== receivedState) {
    logger.warn(`OAuth state mismatch for ${provider}`);
    return { valid: false, codeVerifier: null };
  }

  return { valid: true, codeVerifier: saved.codeVerifier };
}

// ─── Token Storage ──────────────────────────────────────────────────

/**
 * Save OAuth tokens to localStorage (keyed by provider)
 * @param {string} provider - Provider key from CLOUD_PROVIDERS
 * @param {{ accessToken: string, refreshToken?: string, expiresIn: number }} tokens
 */
export function saveTokens(provider, { accessToken, refreshToken, expiresIn }) {
  localStorage.setItem(`cloud_${provider}_access_token`, accessToken);
  if (refreshToken) {
    localStorage.setItem(`cloud_${provider}_refresh_token`, refreshToken);
  }
  localStorage.setItem(
    `cloud_${provider}_token_expiry`,
    String(Date.now() + expiresIn * 1000)
  );
  logger.debug(`Tokens saved for ${provider}`);
}

/**
 * Retrieve tokens from localStorage
 * @param {string} provider - Provider key from CLOUD_PROVIDERS
 * @returns {{ accessToken: string, refreshToken: string | null, expiry: number } | null}
 */
export function getTokens(provider) {
  const accessToken = localStorage.getItem(`cloud_${provider}_access_token`);
  if (!accessToken) return null;

  const refreshToken = localStorage.getItem(`cloud_${provider}_refresh_token`);
  const expiry = parseInt(localStorage.getItem(`cloud_${provider}_token_expiry`) || '0', 10);

  return { accessToken, refreshToken, expiry };
}

/**
 * Clear all tokens for a provider
 * @param {string} provider - Provider key from CLOUD_PROVIDERS
 */
export function clearTokens(provider) {
  localStorage.removeItem(`cloud_${provider}_access_token`);
  localStorage.removeItem(`cloud_${provider}_refresh_token`);
  localStorage.removeItem(`cloud_${provider}_token_expiry`);
  logger.debug(`Tokens cleared for ${provider}`);
}

/**
 * Check if access token has expired (with 5-minute buffer)
 * @param {string} provider - Provider key from CLOUD_PROVIDERS
 * @returns {boolean}
 */
export function isTokenExpired(provider) {
  const tokens = getTokens(provider);
  if (!tokens) return true;

  // 5-minute buffer before actual expiry (matches canvaService pattern)
  return Date.now() > tokens.expiry - 300000;
}
