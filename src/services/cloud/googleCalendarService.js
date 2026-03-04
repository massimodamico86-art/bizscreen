/**
 * Google Calendar Service
 *
 * Handles OAuth authentication for Google Calendar integration.
 * Follows the googleDriveService.js pattern but with key difference:
 * calendar tokens are persisted to the database (not localStorage)
 * for unattended player operation.
 *
 * Token flow: OAuth redirect -> consent -> callback -> handleGoogleCalendarCallback()
 * returns tokens -> caller persists via calendarService.saveCalendarSource() -> DB
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

const logger = createScopedLogger('GoogleCalendarService');

const PROVIDER = CLOUD_PROVIDERS.GOOGLE_CALENDAR;

// Configuration
const GOOGLE_CALENDAR_CLIENT_ID = import.meta.env.VITE_GOOGLE_CALENDAR_CLIENT_ID || '';
const GOOGLE_OAUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_SCOPES = 'https://www.googleapis.com/auth/calendar.events.readonly';

/**
 * Get redirect URI for Google Calendar OAuth
 */
function getRedirectUri() {
  return `${window.location.origin}/auth/cloud/callback?provider=${PROVIDER}`;
}

/**
 * Start Google Calendar OAuth flow -- generates PKCE + state, saves to session, redirects
 */
export async function startGoogleCalendarOAuth() {
  if (!GOOGLE_CALENDAR_CLIENT_ID) {
    throw new Error('Google Calendar Client ID not configured');
  }

  const codeVerifier = generateCodeVerifier();
  const codeChallenge = await generateCodeChallenge(codeVerifier);
  const state = crypto.randomUUID();

  saveOAuthState(PROVIDER, { codeVerifier, state });

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: GOOGLE_CALENDAR_CLIENT_ID,
    redirect_uri: getRedirectUri(),
    scope: GOOGLE_SCOPES,
    state,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
    access_type: 'offline',
    prompt: 'consent',
  });

  logger.info('Starting Google Calendar OAuth flow');
  window.location.href = `${GOOGLE_OAUTH_URL}?${params.toString()}`;
}

/**
 * Handle Google Calendar OAuth callback -- validates state, exchanges code for tokens
 *
 * IMPORTANT: Does NOT save tokens to localStorage. Calendar tokens must be
 * persisted to the database via calendarService.saveCalendarSource() for
 * unattended player operation. Returns token object for the caller to persist.
 *
 * @param {string} code - Authorization code from callback
 * @param {string} state - State parameter from callback
 * @returns {Promise<{ accessToken: string, refreshToken: string, expiresIn: number }>}
 */
export async function handleGoogleCalendarCallback(code, state) {
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
      client_id: GOOGLE_CALENDAR_CLIENT_ID,
      code_verifier: codeVerifier,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error_description || 'Failed to exchange Google Calendar code for token');
  }

  const data = await response.json();

  // Do NOT call saveTokens() -- calendar tokens are persisted to the database,
  // not localStorage. The caller (App.jsx) will call calendarService.saveCalendarSource().
  logger.info('Google Calendar OAuth token exchange successful');

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresIn: data.expires_in,
  };
}

/**
 * Refresh Google Calendar access token using stored refresh token.
 *
 * NOTE: This is a fallback for the editor UI only. The calendar-proxy Edge
 * Function handles its own token refresh server-side for player operation.
 *
 * @returns {Promise<string>} New access token
 */
export async function refreshGoogleCalendarToken() {
  const tokens = getTokens(PROVIDER);
  if (!tokens?.refreshToken) {
    throw new Error('No refresh token available for Google Calendar');
  }

  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: tokens.refreshToken,
      client_id: GOOGLE_CALENDAR_CLIENT_ID,
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to refresh Google Calendar token');
  }

  const refreshed = await response.json();

  saveTokens(PROVIDER, {
    accessToken: refreshed.access_token,
    refreshToken: refreshed.refresh_token || tokens.refreshToken,
    expiresIn: refreshed.expires_in,
  });

  logger.info('Google Calendar token refreshed');
  return refreshed.access_token;
}

/**
 * Get a valid Google Calendar access token (refreshes if needed)
 * @returns {Promise<string|null>}
 */
export async function getGoogleCalendarToken() {
  const tokens = getTokens(PROVIDER);
  if (!tokens) return null;

  if (isTokenExpired(PROVIDER)) {
    if (tokens.refreshToken) {
      try {
        return await refreshGoogleCalendarToken();
      } catch (err) {
        logger.error('Token refresh failed, disconnecting', { error: err });
        disconnectGoogleCalendar();
        return null;
      }
    }
    return null;
  }

  return tokens.accessToken;
}

/**
 * Disconnect from Google Calendar -- clears all stored tokens
 */
export function disconnectGoogleCalendar() {
  clearTokens(PROVIDER);
  logger.info('Google Calendar disconnected');
}

/**
 * Check if user is connected to Google Calendar
 * @returns {boolean}
 */
export function isGoogleCalendarConnected() {
  return !!getTokens(PROVIDER)?.accessToken;
}
