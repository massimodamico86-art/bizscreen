/**
 * Outlook Calendar Service
 *
 * Handles OAuth authentication for Microsoft Outlook calendar integration.
 * Follows the googleCalendarService.js pattern with Microsoft identity platform.
 *
 * Key difference from cloud storage OAuth: calendar tokens are persisted to the
 * database (not localStorage) for unattended player operation.
 *
 * Token flow: OAuth redirect -> consent -> callback -> handleOutlookCalendarCallback()
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

const logger = createScopedLogger('OutlookCalendarService');

const PROVIDER = CLOUD_PROVIDERS.OUTLOOK_CALENDAR;

// Configuration
const MS_CLIENT_ID = import.meta.env.VITE_MICROSOFT_CALENDAR_CLIENT_ID || '';
const MS_OAUTH_URL = 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize';
const MS_TOKEN_URL = 'https://login.microsoftonline.com/common/oauth2/v2.0/token';
const MS_SCOPES = 'Calendars.ReadBasic offline_access';

/**
 * Get redirect URI for Outlook Calendar OAuth
 */
function getRedirectUri() {
  return `${window.location.origin}/auth/cloud/callback?provider=${PROVIDER}`;
}

/**
 * Start Outlook Calendar OAuth flow -- generates PKCE + state, saves to session, redirects
 */
export async function startOutlookCalendarOAuth() {
  if (!MS_CLIENT_ID) {
    throw new Error('Microsoft Calendar Client ID not configured');
  }

  const codeVerifier = generateCodeVerifier();
  const codeChallenge = await generateCodeChallenge(codeVerifier);
  const state = crypto.randomUUID();

  saveOAuthState(PROVIDER, { codeVerifier, state });

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: MS_CLIENT_ID,
    redirect_uri: getRedirectUri(),
    scope: MS_SCOPES,
    state,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
    response_mode: 'query',
  });

  logger.info('Starting Outlook Calendar OAuth flow');
  window.location.href = `${MS_OAUTH_URL}?${params.toString()}`;
}

/**
 * Handle Outlook Calendar OAuth callback -- validates state, exchanges code for tokens
 *
 * IMPORTANT: Does NOT save tokens to localStorage. Calendar tokens must be
 * persisted to the database via calendarService.saveCalendarSource() for
 * unattended player operation. Returns token object for the caller to persist.
 *
 * @param {string} code - Authorization code from callback
 * @param {string} state - State parameter from callback
 * @returns {Promise<{ accessToken: string, refreshToken: string, expiresIn: number }>}
 */
export async function handleOutlookCalendarCallback(code, state) {
  const { valid, codeVerifier } = validateOAuthState(PROVIDER, state);
  if (!valid) {
    throw new Error('Invalid OAuth state');
  }

  const response = await fetch(MS_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: getRedirectUri(),
      client_id: MS_CLIENT_ID,
      code_verifier: codeVerifier,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error_description || 'Failed to exchange Outlook Calendar code for token');
  }

  const data = await response.json();

  // Do NOT call saveTokens() -- calendar tokens are persisted to the database,
  // not localStorage. The caller (App.jsx) will call calendarService.saveCalendarSource().
  logger.info('Outlook Calendar OAuth token exchange successful');

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresIn: data.expires_in,
  };
}

/**
 * Refresh Outlook Calendar access token using stored refresh token.
 *
 * NOTE: This is a fallback for the editor UI only. The calendar-proxy Edge
 * Function handles its own token refresh server-side for player operation.
 *
 * @returns {Promise<string>} New access token
 */
export async function refreshOutlookCalendarToken() {
  const tokens = getTokens(PROVIDER);
  if (!tokens?.refreshToken) {
    throw new Error('No refresh token available for Outlook Calendar');
  }

  const response = await fetch(MS_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: tokens.refreshToken,
      client_id: MS_CLIENT_ID,
      scope: MS_SCOPES,
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to refresh Outlook Calendar token');
  }

  const refreshed = await response.json();

  saveTokens(PROVIDER, {
    accessToken: refreshed.access_token,
    refreshToken: refreshed.refresh_token || tokens.refreshToken,
    expiresIn: refreshed.expires_in,
  });

  logger.info('Outlook Calendar token refreshed');
  return refreshed.access_token;
}

/**
 * Get a valid Outlook Calendar access token (refreshes if needed)
 * @returns {Promise<string|null>}
 */
export async function getOutlookCalendarToken() {
  const tokens = getTokens(PROVIDER);
  if (!tokens) return null;

  if (isTokenExpired(PROVIDER)) {
    if (tokens.refreshToken) {
      try {
        return await refreshOutlookCalendarToken();
      } catch (err) {
        logger.error('Token refresh failed, disconnecting', { error: err });
        disconnectOutlookCalendar();
        return null;
      }
    }
    return null;
  }

  return tokens.accessToken;
}

/**
 * Disconnect from Outlook Calendar -- clears all stored tokens
 */
export function disconnectOutlookCalendar() {
  clearTokens(PROVIDER);
  logger.info('Outlook Calendar disconnected');
}

/**
 * Check if user is connected to Outlook Calendar
 * @returns {boolean}
 */
export function isOutlookCalendarConnected() {
  return !!getTokens(PROVIDER)?.accessToken;
}
