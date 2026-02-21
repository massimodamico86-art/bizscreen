/**
 * Google Photos Integration Service
 *
 * Handles OAuth flow and API interactions with Google Photos Library API.
 * Uses shared cloudOAuthService for token storage, PKCE, and state management.
 *
 * Note: Google Photos API uses POST for mediaItems:search (not GET).
 * baseUrl from media items is temporary (~60 min), so getGooglePhotosDownloadUrl
 * should be called just before downloading.
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

const logger = createScopedLogger('GooglePhotosService');

// ── Configuration ──────────────────────────────────────────────────

const GOOGLE_PHOTOS_CLIENT_ID = import.meta.env.VITE_GOOGLE_PHOTOS_CLIENT_ID;
const OAUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const API_URL = 'https://photoslibrary.googleapis.com/v1';
const SCOPES = 'https://www.googleapis.com/auth/photoslibrary.readonly';
const PROVIDER = CLOUD_PROVIDERS.GOOGLE_PHOTOS;

// ── Internal Helpers ───────────────────────────────────────────────

/**
 * Make authenticated request to Google Photos Library API
 */
async function gphotosFetch(url, options = {}) {
  const token = await getGooglePhotosToken();
  if (!token) {
    throw new Error('Not authenticated with Google Photos');
  }

  const fullUrl = url.startsWith('http') ? url : `${API_URL}${url}`;

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
    throw new Error(error.error?.message || `Google Photos API error: ${response.status}`);
  }

  return response.json();
}

// ── OAuth Flow ─────────────────────────────────────────────────────

/**
 * Start Google Photos OAuth flow - redirect to Google OAuth
 * Includes access_type=offline and prompt=consent to ensure refresh token
 */
export async function startGooglePhotosOAuth() {
  if (!GOOGLE_PHOTOS_CLIENT_ID) {
    throw new Error('Google Photos Client ID not configured');
  }

  const codeVerifier = generateCodeVerifier();
  const codeChallenge = await generateCodeChallenge(codeVerifier);
  const state = crypto.randomUUID();

  saveOAuthState(PROVIDER, { codeVerifier, state });

  const redirectUri = `${window.location.origin}/auth/cloud/callback?provider=gphotos`;

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: GOOGLE_PHOTOS_CLIENT_ID,
    redirect_uri: redirectUri,
    scope: SCOPES,
    state,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
    access_type: 'offline',
    prompt: 'consent',
  });

  logger.info('Starting Google Photos OAuth flow');
  window.location.href = `${OAUTH_URL}?${params.toString()}`;
}

/**
 * Handle OAuth callback - exchange authorization code for tokens
 */
export async function handleGooglePhotosCallback(code, state) {
  const { valid, codeVerifier } = validateOAuthState(PROVIDER, state);
  if (!valid) {
    throw new Error('Invalid OAuth state');
  }

  const redirectUri = `${window.location.origin}/auth/cloud/callback?provider=gphotos`;

  const response = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: GOOGLE_PHOTOS_CLIENT_ID,
      code,
      code_verifier: codeVerifier,
      redirect_uri: redirectUri,
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

  logger.info('Google Photos OAuth completed successfully');
  return tokens;
}

// ── Connection Status ──────────────────────────────────────────────

/**
 * Check if user is connected to Google Photos
 */
export function isGooglePhotosConnected() {
  const tokens = getTokens(PROVIDER);
  if (!tokens) return false;
  if (isTokenExpired(PROVIDER) && !tokens.refreshToken) return false;
  return true;
}

/**
 * Get valid access token, refreshing if needed
 */
export async function getGooglePhotosToken() {
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
            client_id: GOOGLE_PHOTOS_CLIENT_ID,
            refresh_token: tokens.refreshToken,
          }),
        });

        if (!response.ok) throw new Error('Refresh failed');

        const refreshed = await response.json();
        saveTokens(PROVIDER, {
          accessToken: refreshed.access_token,
          refreshToken: refreshed.refresh_token || tokens.refreshToken,
          expiresIn: refreshed.expires_in,
        });

        logger.debug('Google Photos token refreshed');
        return refreshed.access_token;
      } catch (err) {
        logger.warn('Google Photos token refresh failed, disconnecting', { error: err });
        disconnectGooglePhotos();
        return null;
      }
    }
    return null;
  }

  return tokens.accessToken;
}

/**
 * Disconnect from Google Photos - clear all tokens
 */
export function disconnectGooglePhotos() {
  clearTokens(PROVIDER);
  logger.info('Disconnected from Google Photos');
}

// ── Album Operations ───────────────────────────────────────────────

/**
 * List Google Photos albums
 * @param {{ pageToken?: string }} options
 * @returns {{ albums: Array, nextPageToken: string | null }}
 */
export async function listGooglePhotosAlbums({ pageToken = null } = {}) {
  const params = new URLSearchParams({ pageSize: '50' });
  if (pageToken) {
    params.set('pageToken', pageToken);
  }

  const data = await gphotosFetch(`/albums?${params.toString()}`);

  const albums = (data.albums || []).map(album => ({
    id: album.id,
    title: album.title,
    mediaItemsCount: parseInt(album.mediaItemsCount || '0', 10),
    coverPhotoBaseUrl: album.coverPhotoBaseUrl || null,
  }));

  return {
    albums,
    nextPageToken: data.nextPageToken || null,
  };
}

// ── Media Operations ───────────────────────────────────────────────

/**
 * List Google Photos media items (optionally filtered by album)
 * Uses POST to /mediaItems:search as required by the API
 * @param {{ albumId?: string, pageToken?: string, pageSize?: number }} options
 * @returns {{ mediaItems: Array, nextPageToken: string | null }}
 */
export async function listGooglePhotosMedia({ albumId = null, pageToken = null, pageSize = 50 } = {}) {
  const body = { pageSize };

  if (albumId) {
    body.albumId = albumId;
  }
  if (pageToken) {
    body.pageToken = pageToken;
  }

  const data = await gphotosFetch('/mediaItems:search', {
    method: 'POST',
    body: JSON.stringify(body),
  });

  const mediaItems = (data.mediaItems || []).map(item => ({
    id: item.id,
    filename: item.filename,
    mimeType: item.mimeType,
    baseUrl: item.baseUrl,
    mediaMetadata: item.mediaMetadata
      ? {
          width: parseInt(item.mediaMetadata.width || '0', 10),
          height: parseInt(item.mediaMetadata.height || '0', 10),
          creationTime: item.mediaMetadata.creationTime,
        }
      : null,
  }));

  return {
    mediaItems,
    nextPageToken: data.nextPageToken || null,
  };
}

/**
 * Get download URL for a Google Photos media item
 * baseUrl from listing is temporary (~60 min), append '=d' for download variant.
 * Unlike other providers, Google Photos uses baseUrl directly (not file IDs).
 * @param {string} baseUrl - The baseUrl from a media item listing
 * @returns {string} Download URL
 */
export function getGooglePhotosDownloadUrl(baseUrl) {
  return `${baseUrl}=d`;
}
