/**
 * OneDrive Integration Service
 *
 * Handles OAuth flow and API interactions with Microsoft OneDrive
 * via Microsoft Graph API. Uses shared cloudOAuthService for
 * token storage, PKCE, and state management.
 *
 * Uses Microsoft identity platform (v2.0) endpoints.
 */

import { createScopedLogger } from '../loggingService';
import {
  CLOUD_PROVIDERS,
  generateCodeVerifier,
  generateCodeChallenge,
  saveOAuthState,
  validateOAuthState,
  saveTokens,
  getTokens,
  clearTokens,
  isTokenExpired,
} from './cloudOAuthService';

const logger = createScopedLogger('OneDriveService');

// ── Configuration ──────────────────────────────────────────────────

const MICROSOFT_CLIENT_ID = import.meta.env.VITE_MICROSOFT_CLIENT_ID;
const OAUTH_URL = 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize';
const TOKEN_URL = 'https://login.microsoftonline.com/common/oauth2/v2.0/token';
const GRAPH_API_URL = 'https://graph.microsoft.com/v1.0';
const SCOPES = 'Files.Read.All offline_access';
const PROVIDER = CLOUD_PROVIDERS.ONEDRIVE;

// ── Internal Helpers ───────────────────────────────────────────────

/**
 * Make authenticated request to Microsoft Graph API
 */
async function onedriveFetch(url, options = {}) {
  const token = await getOneDriveToken();
  if (!token) {
    throw new Error('Not authenticated with OneDrive');
  }

  const fullUrl = url.startsWith('http') ? url : `${GRAPH_API_URL}${url}`;

  const response = await fetch(fullUrl, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error?.message || `OneDrive API error: ${response.status}`);
  }

  return response.json();
}

// ── OAuth Flow ─────────────────────────────────────────────────────

/**
 * Start OneDrive OAuth flow - redirect to Microsoft identity platform
 */
export async function startOneDriveOAuth() {
  if (!MICROSOFT_CLIENT_ID) {
    throw new Error('Microsoft Client ID not configured');
  }

  const codeVerifier = generateCodeVerifier();
  const codeChallenge = await generateCodeChallenge(codeVerifier);
  const state = crypto.randomUUID();

  saveOAuthState(PROVIDER, { codeVerifier, state });

  const redirectUri = `${window.location.origin}/auth/cloud/callback?provider=onedrive`;

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: MICROSOFT_CLIENT_ID,
    redirect_uri: redirectUri,
    scope: SCOPES,
    state,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
  });

  logger.info('Starting OneDrive OAuth flow');
  window.location.href = `${OAUTH_URL}?${params.toString()}`;
}

/**
 * Handle OAuth callback - exchange authorization code for tokens
 */
export async function handleOneDriveCallback(code, state) {
  const { valid, codeVerifier } = validateOAuthState(PROVIDER, state);
  if (!valid) {
    throw new Error('Invalid OAuth state');
  }

  const redirectUri = `${window.location.origin}/auth/cloud/callback?provider=onedrive`;

  const response = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: MICROSOFT_CLIENT_ID,
      code,
      code_verifier: codeVerifier,
      redirect_uri: redirectUri,
      scope: SCOPES,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error_description || 'Failed to exchange code for token');
  }

  const tokens = await response.json();

  saveTokens(PROVIDER, {
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token,
    expiresIn: tokens.expires_in,
  });

  logger.info('OneDrive OAuth completed successfully');
  return tokens;
}

// ── Connection Status ──────────────────────────────────────────────

/**
 * Check if user is connected to OneDrive
 */
export function isOneDriveConnected() {
  const tokens = getTokens(PROVIDER);
  if (!tokens) return false;
  if (isTokenExpired(PROVIDER) && !tokens.refreshToken) return false;
  return true;
}

/**
 * Get valid access token, refreshing if needed
 */
export async function getOneDriveToken() {
  const tokens = getTokens(PROVIDER);
  if (!tokens) return null;

  if (isTokenExpired(PROVIDER)) {
    if (tokens.refreshToken) {
      try {
        const response = await fetch(TOKEN_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            grant_type: 'refresh_token',
            client_id: MICROSOFT_CLIENT_ID,
            refresh_token: tokens.refreshToken,
            scope: SCOPES,
          }),
        });

        if (!response.ok) throw new Error('Refresh failed');

        const refreshed = await response.json();
        saveTokens(PROVIDER, {
          accessToken: refreshed.access_token,
          refreshToken: refreshed.refresh_token || tokens.refreshToken,
          expiresIn: refreshed.expires_in,
        });

        logger.debug('OneDrive token refreshed');
        return refreshed.access_token;
      } catch (err) {
        logger.warn('OneDrive token refresh failed, disconnecting', { error: err });
        disconnectOneDrive();
        return null;
      }
    }
    return null;
  }

  return tokens.accessToken;
}

/**
 * Disconnect from OneDrive - clear all tokens
 */
export function disconnectOneDrive() {
  clearTokens(PROVIDER);
  logger.info('Disconnected from OneDrive');
}

// ── File Operations ────────────────────────────────────────────────

/**
 * List files in a OneDrive folder
 * @param {{ folderId?: string, pageToken?: string, query?: string }} options
 * @returns {{ files: Array, nextPageToken: string | null }}
 */
export async function listOneDriveFiles({ folderId = 'root', pageToken = null, query = '' } = {}) {
  let data;

  if (pageToken) {
    // Use the @odata.nextLink URL directly
    data = await onedriveFetch(pageToken);
  } else if (query) {
    // Search across all files
    data = await onedriveFetch(
      `/me/drive/root/search(q='${encodeURIComponent(query)}')?$select=id,name,size,lastModifiedDateTime,file,folder,@microsoft.graph.downloadUrl&$top=50`
    );
  } else {
    // List folder children
    data = await onedriveFetch(
      `/me/drive/items/${folderId}/children?$select=id,name,size,lastModifiedDateTime,file,folder,@microsoft.graph.downloadUrl&$top=50`
    );
  }

  const files = (data.value || []).map(item => ({
    id: item.id,
    name: item.name,
    isFolder: !!item.folder,
    size: item.size,
    modified: item.lastModifiedDateTime,
    thumbnailUrl: null,
    mimeType: item.file?.mimeType || null,
    downloadUrl: item['@microsoft.graph.downloadUrl'] || null,
  }));

  return {
    files,
    nextPageToken: data['@odata.nextLink'] || null,
  };
}

/**
 * Get download URL for a specific OneDrive item
 * @param {string} itemId - The OneDrive item ID
 * @returns {string} Download URL
 */
export async function getOneDriveDownloadUrl(itemId) {
  const data = await onedriveFetch(`/me/drive/items/${itemId}`);
  return data['@microsoft.graph.downloadUrl'];
}
