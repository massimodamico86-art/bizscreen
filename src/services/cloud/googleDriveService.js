/**
 * Google Drive Service
 *
 * Handles OAuth authentication, file listing, and download URL generation
 * for Google Drive cloud storage integration.
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

const logger = createScopedLogger('GoogleDriveService');

const PROVIDER = CLOUD_PROVIDERS.GOOGLE_DRIVE;

// Configuration
const GOOGLE_DRIVE_CLIENT_ID = import.meta.env.VITE_GOOGLE_DRIVE_CLIENT_ID || '';
const GOOGLE_OAUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_API_URL = 'https://www.googleapis.com/drive/v3';
const GOOGLE_SCOPES = 'https://www.googleapis.com/auth/drive.readonly';

/**
 * Get redirect URI for Google Drive OAuth
 */
function getRedirectUri() {
  return `${window.location.origin}/auth/cloud/callback?provider=${PROVIDER}`;
}

/**
 * Start Google Drive OAuth flow — generates PKCE + state, saves to session, redirects
 */
export async function startGoogleDriveOAuth() {
  if (!GOOGLE_DRIVE_CLIENT_ID) {
    throw new Error('Google Drive Client ID not configured');
  }

  const codeVerifier = generateCodeVerifier();
  const codeChallenge = await generateCodeChallenge(codeVerifier);
  const state = crypto.randomUUID();

  saveOAuthState(PROVIDER, { codeVerifier, state });

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: GOOGLE_DRIVE_CLIENT_ID,
    redirect_uri: getRedirectUri(),
    scope: GOOGLE_SCOPES,
    state,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
    access_type: 'offline',
    prompt: 'consent',
  });

  logger.info('Starting Google Drive OAuth flow');
  window.location.href = `${GOOGLE_OAUTH_URL}?${params.toString()}`;
}

/**
 * Handle Google Drive OAuth callback — validates state, exchanges code for tokens
 * @param {string} code - Authorization code from callback
 * @param {string} state - State parameter from callback
 */
export async function handleGoogleDriveCallback(code, state) {
  const { valid, codeVerifier } = validateOAuthState(PROVIDER, state);
  if (!valid) {
    throw new Error('Invalid OAuth state');
  }

  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: getRedirectUri(),
      client_id: GOOGLE_DRIVE_CLIENT_ID,
      code_verifier: codeVerifier,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error_description || 'Failed to exchange Google Drive code for token');
  }

  const tokens = await response.json();

  saveTokens(PROVIDER, {
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token,
    expiresIn: tokens.expires_in,
  });

  logger.info('Google Drive connected successfully');
  return tokens;
}

/**
 * Check if user is connected to Google Drive
 * @returns {boolean}
 */
export function isGoogleDriveConnected() {
  const tokens = getTokens(PROVIDER);
  if (!tokens) return false;
  if (isTokenExpired(PROVIDER) && !tokens.refreshToken) return false;
  return true;
}

/**
 * Get a valid Google Drive access token (refreshes if needed)
 * @returns {Promise<string|null>}
 */
export async function getGoogleDriveToken() {
  const tokens = getTokens(PROVIDER);
  if (!tokens) return null;

  if (isTokenExpired(PROVIDER)) {
    if (tokens.refreshToken) {
      try {
        const response = await fetch(GOOGLE_TOKEN_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            grant_type: 'refresh_token',
            refresh_token: tokens.refreshToken,
            client_id: GOOGLE_DRIVE_CLIENT_ID,
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to refresh Google Drive token');
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
        disconnectGoogleDrive();
        return null;
      }
    }
    return null;
  }

  return tokens.accessToken;
}

/**
 * Disconnect from Google Drive — clears all stored tokens
 */
export function disconnectGoogleDrive() {
  clearTokens(PROVIDER);
  logger.info('Google Drive disconnected');
}

/**
 * Internal: Authenticated fetch wrapper for Google Drive API
 */
async function gdriveFetch(url, options = {}) {
  const token = await getGoogleDriveToken();
  if (!token) {
    throw new Error('Not authenticated with Google Drive');
  }

  const response = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error?.message || `Google Drive API error: ${response.status}`);
  }

  return response.json();
}

/**
 * List files in Google Drive
 * @param {{ folderId?: string, pageToken?: string, query?: string }} options
 * @returns {Promise<{ files: Array, nextPageToken: string|null }>}
 */
export async function listGoogleDriveFiles({ folderId = 'root', pageToken = null, query = '' } = {}) {
  let q = `trashed=false and '${folderId}' in parents`;
  if (query) {
    q += ` and name contains '${query}'`;
  }

  const params = new URLSearchParams({
    q,
    fields: 'files(id,name,mimeType,thumbnailLink,size,modifiedTime),nextPageToken',
    pageSize: '50',
    orderBy: 'folder,name',
  });

  if (pageToken) {
    params.set('pageToken', pageToken);
  }

  const url = `${GOOGLE_API_URL}/files?${params.toString()}`;
  const data = await gdriveFetch(url);

  const files = (data.files || []).map(file => ({
    id: file.id,
    name: file.name,
    mimeType: file.mimeType,
    isFolder: file.mimeType === 'application/vnd.google-apps.folder',
    thumbnailUrl: file.thumbnailLink || null,
    size: file.size ? parseInt(file.size, 10) : null,
    modified: file.modifiedTime || null,
  }));

  return {
    files,
    nextPageToken: data.nextPageToken || null,
  };
}

/**
 * Get download URL for a Google Drive file
 * @param {string} fileId - The file ID
 * @returns {{ url: string, headers: object }} URL and auth headers for fetch-based download
 */
export function getGoogleDriveDownloadUrl(fileId) {
  return {
    url: `${GOOGLE_API_URL}/files/${fileId}?alt=media`,
    // Headers must be attached by caller since this is a direct download URL
    getHeaders: async () => {
      const token = await getGoogleDriveToken();
      return { Authorization: `Bearer ${token}` };
    },
  };
}
