/**
 * SharePoint Integration Service
 *
 * Handles OAuth flow and API interactions with Microsoft SharePoint
 * via Microsoft Graph API. Uses shared cloudOAuthService for
 * token storage, PKCE, and state management.
 *
 * Shares VITE_MICROSOFT_CLIENT_ID with OneDrive (both use Microsoft
 * identity platform) but maintains separate token storage keys.
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

const logger = createScopedLogger('SharePointService');

// ── Configuration ──────────────────────────────────────────────────

const MICROSOFT_CLIENT_ID = import.meta.env.VITE_MICROSOFT_CLIENT_ID;
const OAUTH_URL = 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize';
const TOKEN_URL = 'https://login.microsoftonline.com/common/oauth2/v2.0/token';
const GRAPH_API_URL = 'https://graph.microsoft.com/v1.0';
const SCOPES = 'Sites.Read.All Files.Read.All offline_access';
const PROVIDER = CLOUD_PROVIDERS.SHAREPOINT;

// ── Internal Helpers ───────────────────────────────────────────────

/**
 * Make authenticated request to Microsoft Graph API for SharePoint
 */
async function sharepointFetch(url, options = {}) {
  const token = await getSharePointToken();
  if (!token) {
    throw new Error('Not authenticated with SharePoint');
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
    throw new Error(error.error?.message || `SharePoint API error: ${response.status}`);
  }

  return response.json();
}

// ── OAuth Flow ─────────────────────────────────────────────────────

/**
 * Start SharePoint OAuth flow - redirect to Microsoft identity platform
 */
export async function startSharePointOAuth() {
  if (!MICROSOFT_CLIENT_ID) {
    throw new Error('Microsoft Client ID not configured');
  }

  const codeVerifier = generateCodeVerifier();
  const codeChallenge = await generateCodeChallenge(codeVerifier);
  const state = crypto.randomUUID();

  saveOAuthState(PROVIDER, { codeVerifier, state });

  const redirectUri = `${window.location.origin}/auth/cloud/callback?provider=sharepoint`;

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: MICROSOFT_CLIENT_ID,
    redirect_uri: redirectUri,
    scope: SCOPES,
    state,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
  });

  logger.info('Starting SharePoint OAuth flow');
  window.location.href = `${OAUTH_URL}?${params.toString()}`;
}

/**
 * Handle OAuth callback - exchange authorization code for tokens
 */
export async function handleSharePointCallback(code, state) {
  const { valid, codeVerifier } = validateOAuthState(PROVIDER, state);
  if (!valid) {
    throw new Error('Invalid OAuth state');
  }

  const redirectUri = `${window.location.origin}/auth/cloud/callback?provider=sharepoint`;

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

  logger.info('SharePoint OAuth completed successfully');
  return tokens;
}

// ── Connection Status ──────────────────────────────────────────────

/**
 * Check if user is connected to SharePoint
 */
export function isSharePointConnected() {
  const tokens = getTokens(PROVIDER);
  if (!tokens) return false;
  if (isTokenExpired(PROVIDER) && !tokens.refreshToken) return false;
  return true;
}

/**
 * Get valid access token, refreshing if needed
 */
export async function getSharePointToken() {
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

        logger.debug('SharePoint token refreshed');
        return refreshed.access_token;
      } catch (err) {
        logger.warn('SharePoint token refresh failed, disconnecting', { error: err });
        disconnectSharePoint();
        return null;
      }
    }
    return null;
  }

  return tokens.accessToken;
}

/**
 * Disconnect from SharePoint - clear all tokens
 */
export function disconnectSharePoint() {
  clearTokens(PROVIDER);
  logger.info('Disconnected from SharePoint');
}

// ── Site Operations ────────────────────────────────────────────────

/**
 * List SharePoint sites the user has access to
 * @param {{ query?: string }} options
 * @returns {{ sites: Array }}
 */
export async function listSharePointSites({ query = '' } = {}) {
  const searchTerm = query || '*';
  const data = await sharepointFetch(`/sites?search=${encodeURIComponent(searchTerm)}`);

  const sites = (data.value || []).map(site => ({
    id: site.id,
    name: site.name,
    displayName: site.displayName,
    webUrl: site.webUrl,
  }));

  return { sites };
}

// ── File Operations ────────────────────────────────────────────────

/**
 * List files in a SharePoint site drive folder
 * @param {{ siteId: string, folderId?: string, pageToken?: string, query?: string }} options
 * @returns {{ files: Array, nextPageToken: string | null }}
 */
export async function listSharePointFiles({ siteId, folderId = 'root', pageToken = null, query = '' }) {
  if (!siteId) {
    throw new Error('siteId is required for listing SharePoint files');
  }

  let data;

  if (pageToken) {
    // Use the @odata.nextLink URL directly
    data = await sharepointFetch(pageToken);
  } else if (query) {
    // Search within the site drive
    data = await sharepointFetch(
      `/sites/${siteId}/drive/root/search(q='${encodeURIComponent(query)}')?$select=id,name,size,lastModifiedDateTime,file,folder,@microsoft.graph.downloadUrl&$top=50`
    );
  } else {
    // List folder children
    data = await sharepointFetch(
      `/sites/${siteId}/drive/items/${folderId}/children?$select=id,name,size,lastModifiedDateTime,file,folder,@microsoft.graph.downloadUrl&$top=50`
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
 * Get download URL for a specific SharePoint item
 * @param {string} siteId - The SharePoint site ID
 * @param {string} itemId - The item ID
 * @returns {string} Download URL
 */
export async function getSharePointDownloadUrl(siteId, itemId) {
  const data = await sharepointFetch(`/sites/${siteId}/drive/items/${itemId}`);
  return data['@microsoft.graph.downloadUrl'];
}
