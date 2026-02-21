/**
 * Dropbox Service
 *
 * Handles OAuth authentication, file listing, and download URL generation
 * for Dropbox cloud storage integration.
 *
 * Pattern follows canvaService.js with shared utilities from cloudOAuthService.
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

const logger = createScopedLogger('DropboxService');

const PROVIDER = CLOUD_PROVIDERS.DROPBOX;

// Configuration
const DROPBOX_APP_KEY = import.meta.env.VITE_DROPBOX_APP_KEY || '';
const DROPBOX_OAUTH_URL = 'https://www.dropbox.com/oauth2/authorize';
const DROPBOX_TOKEN_URL = 'https://api.dropboxapi.com/oauth2/token';
const DROPBOX_API_URL = 'https://api.dropboxapi.com/2';
const DROPBOX_CONTENT_URL = 'https://content.dropboxapi.com/2';

/**
 * Get redirect URI for Dropbox OAuth
 */
function getRedirectUri() {
  return `${window.location.origin}/auth/cloud/callback?provider=${PROVIDER}`;
}

/**
 * Start Dropbox OAuth flow — generates PKCE + state, saves to session, redirects
 */
export async function startDropboxOAuth() {
  if (!DROPBOX_APP_KEY) {
    throw new Error('Dropbox App Key not configured');
  }

  const codeVerifier = generateCodeVerifier();
  const codeChallenge = await generateCodeChallenge(codeVerifier);
  const state = crypto.randomUUID();

  saveOAuthState(PROVIDER, { codeVerifier, state });

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: DROPBOX_APP_KEY,
    redirect_uri: getRedirectUri(),
    state,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
    token_access_type: 'offline',
  });

  logger.info('Starting Dropbox OAuth flow');
  window.location.href = `${DROPBOX_OAUTH_URL}?${params.toString()}`;
}

/**
 * Handle Dropbox OAuth callback — validates state, exchanges code for tokens
 * @param {string} code - Authorization code from callback
 * @param {string} state - State parameter from callback
 */
export async function handleDropboxCallback(code, state) {
  const { valid, codeVerifier } = validateOAuthState(PROVIDER, state);
  if (!valid) {
    throw new Error('Invalid OAuth state');
  }

  const response = await fetch(DROPBOX_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: getRedirectUri(),
      client_id: DROPBOX_APP_KEY,
      code_verifier: codeVerifier,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error_description || 'Failed to exchange Dropbox code for token');
  }

  const tokens = await response.json();

  saveTokens(PROVIDER, {
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token,
    expiresIn: tokens.expires_in,
  });

  logger.info('Dropbox connected successfully');
  return tokens;
}

/**
 * Check if user is connected to Dropbox
 * @returns {boolean}
 */
export function isDropboxConnected() {
  const tokens = getTokens(PROVIDER);
  if (!tokens) return false;
  if (isTokenExpired(PROVIDER) && !tokens.refreshToken) return false;
  return true;
}

/**
 * Get a valid Dropbox access token (refreshes if needed)
 * @returns {Promise<string|null>}
 */
export async function getDropboxToken() {
  const tokens = getTokens(PROVIDER);
  if (!tokens) return null;

  if (isTokenExpired(PROVIDER)) {
    if (tokens.refreshToken) {
      try {
        const response = await fetch(DROPBOX_TOKEN_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            grant_type: 'refresh_token',
            refresh_token: tokens.refreshToken,
            client_id: DROPBOX_APP_KEY,
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to refresh Dropbox token');
        }

        const refreshed = await response.json();
        saveTokens(PROVIDER, {
          accessToken: refreshed.access_token,
          refreshToken: refreshed.refresh_token || tokens.refreshToken,
          expiresIn: refreshed.expires_in,
        });

        return refreshed.access_token;
      } catch (err) {
        logger.error('Token refresh failed, disconnecting', { error: err });
        disconnectDropbox();
        return null;
      }
    }
    return null;
  }

  return tokens.accessToken;
}

/**
 * Disconnect from Dropbox — clears all stored tokens
 */
export function disconnectDropbox() {
  clearTokens(PROVIDER);
  logger.info('Dropbox disconnected');
}

/**
 * Internal: Authenticated fetch wrapper for Dropbox API
 */
async function dropboxFetch(url, body = null, options = {}) {
  const token = await getDropboxToken();
  if (!token) {
    throw new Error('Not authenticated with Dropbox');
  }

  const fetchOptions = {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  };

  if (body) {
    fetchOptions.body = JSON.stringify(body);
  }

  const response = await fetch(url, fetchOptions);

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(
      error.error_summary || error.error?.message || `Dropbox API error: ${response.status}`
    );
  }

  return response.json();
}

/**
 * List files in Dropbox
 * @param {{ path?: string, cursor?: string, query?: string }} options
 * @returns {Promise<{ files: Array, cursor: string|null, hasMore: boolean }>}
 */
export async function listDropboxFiles({ path = '', cursor = null, query = '' } = {}) {
  let data;

  if (query) {
    // Search mode
    data = await dropboxFetch(`${DROPBOX_API_URL}/files/search_v2`, {
      query,
      options: {
        path: path || '',
        max_results: 50,
        file_categories: [{ '.tag': 'image' }, { '.tag': 'video' }, { '.tag': 'document' }],
      },
    });

    const files = (data.matches || []).map(match => mapDropboxEntry(match.metadata?.metadata || match.metadata));

    return {
      files,
      cursor: data.cursor || null,
      hasMore: data.has_more || false,
    };
  }

  if (cursor) {
    // Continue listing from cursor
    data = await dropboxFetch(`${DROPBOX_API_URL}/files/list_folder/continue`, {
      cursor,
    });
  } else {
    // Initial folder listing
    data = await dropboxFetch(`${DROPBOX_API_URL}/files/list_folder`, {
      path: path || '',
      include_media_info: true,
      limit: 50,
    });
  }

  const files = (data.entries || []).map(mapDropboxEntry);

  return {
    files,
    cursor: data.cursor || null,
    hasMore: data.has_more || false,
  };
}

/**
 * Map a Dropbox entry to a normalized file object
 */
function mapDropboxEntry(entry) {
  if (!entry) return null;

  return {
    id: entry.id || entry.path_lower,
    name: entry.name,
    isFolder: entry['.tag'] === 'folder',
    size: entry.size || null,
    modified: entry.server_modified || entry.client_modified || null,
    thumbnailUrl: null, // Dropbox thumbnails require separate API call
    path: entry.path_lower || entry.path_display || '',
  };
}

/**
 * Get a temporary download URL for a Dropbox file
 * @param {string} path - The file path in Dropbox
 * @returns {Promise<string>} Temporary download link URL
 */
export async function getDropboxDownloadUrl(path) {
  const data = await dropboxFetch(`${DROPBOX_CONTENT_URL}/files/get_temporary_link`, {
    path,
  });

  return data.link;
}
