/**
 * Canva Integration Service
 *
 * Handles OAuth flow and API interactions with Canva Connect API
 * Documentation: https://www.canva.dev/docs/connect/
 */

import { createScopedLogger } from './loggingService';

const logger = createScopedLogger('CanvaService');

const CANVA_CLIENT_ID = import.meta.env.VITE_CANVA_CLIENT_ID;
const CANVA_OAUTH_URL = 'https://www.canva.com/api/oauth/authorize';
const CANVA_TOKEN_URL = 'https://api.canva.com/rest/v1/oauth/token';
const CANVA_API_URL = 'https://api.canva.com/rest/v1';

// Storage keys
const TOKEN_KEY = 'canva_access_token';
const REFRESH_TOKEN_KEY = 'canva_refresh_token';
const TOKEN_EXPIRY_KEY = 'canva_token_expiry';

/**
 * Get the redirect URI, using 127.0.0.1 instead of localhost
 */
function getRedirectUri() {
  let origin = window.location.origin;
  // Canva requires 127.0.0.1 instead of localhost
  if (origin.includes('localhost')) {
    origin = origin.replace('localhost', '127.0.0.1');
  }
  return `${origin}/auth/canva/callback`;
}

/**
 * Generate a random string for PKCE code verifier
 */
function generateCodeVerifier() {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Generate code challenge from verifier (SHA-256)
 */
async function generateCodeChallenge(verifier) {
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return btoa(String.fromCharCode(...new Uint8Array(hash)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/**
 * Start OAuth flow - redirect to Canva
 */
export async function startCanvaOAuth() {
  if (!CANVA_CLIENT_ID) {
    throw new Error('Canva Client ID not configured');
  }

  // Generate PKCE codes
  const codeVerifier = generateCodeVerifier();
  const codeChallenge = await generateCodeChallenge(codeVerifier);

  // Store verifier for later
  sessionStorage.setItem('canva_code_verifier', codeVerifier);

  // Build OAuth URL
  const redirectUri = getRedirectUri();
  const state = crypto.randomUUID();
  sessionStorage.setItem('canva_oauth_state', state);

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: CANVA_CLIENT_ID,
    redirect_uri: redirectUri,
    scope: 'design:content:read design:content:write asset:read asset:write profile:read',
    state,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
  });

  window.location.href = `${CANVA_OAUTH_URL}?${params.toString()}`;
}

/**
 * Handle OAuth callback - exchange code for tokens
 */
export async function handleCanvaCallback(code, state) {
  // Verify state
  const savedState = sessionStorage.getItem('canva_oauth_state');
  if (state !== savedState) {
    throw new Error('Invalid OAuth state');
  }

  const codeVerifier = sessionStorage.getItem('canva_code_verifier');
  if (!codeVerifier) {
    throw new Error('Code verifier not found');
  }

  const redirectUri = getRedirectUri();

  // Exchange code for tokens
  const response = await fetch(CANVA_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
      client_id: CANVA_CLIENT_ID,
      code_verifier: codeVerifier,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error_description || 'Failed to exchange code for token');
  }

  const tokens = await response.json();

  // Store tokens
  localStorage.setItem(TOKEN_KEY, tokens.access_token);
  if (tokens.refresh_token) {
    localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refresh_token);
  }
  localStorage.setItem(TOKEN_EXPIRY_KEY, Date.now() + (tokens.expires_in * 1000));

  // Clean up
  sessionStorage.removeItem('canva_code_verifier');
  sessionStorage.removeItem('canva_oauth_state');

  return tokens;
}

/**
 * Check if user is connected to Canva
 */
export function isCanvaConnected() {
  const token = localStorage.getItem(TOKEN_KEY);
  const expiry = localStorage.getItem(TOKEN_EXPIRY_KEY);

  if (!token) return false;
  if (expiry && Date.now() > parseInt(expiry)) return false;

  return true;
}

/**
 * Get access token (refresh if needed)
 */
export async function getCanvaToken() {
  const token = localStorage.getItem(TOKEN_KEY);
  const expiry = localStorage.getItem(TOKEN_EXPIRY_KEY);
  const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);

  if (!token) return null;

  // Check if token is expired or about to expire (5 min buffer)
  if (expiry && Date.now() > parseInt(expiry) - 300000) {
    if (refreshToken) {
      try {
        await refreshCanvaToken();
        return localStorage.getItem(TOKEN_KEY);
      } catch {
        disconnectCanva();
        return null;
      }
    }
    return null;
  }

  return token;
}

/**
 * Refresh access token
 */
async function refreshCanvaToken() {
  const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
  if (!refreshToken) throw new Error('No refresh token');

  const response = await fetch(CANVA_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: CANVA_CLIENT_ID,
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to refresh token');
  }

  const tokens = await response.json();

  localStorage.setItem(TOKEN_KEY, tokens.access_token);
  if (tokens.refresh_token) {
    localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refresh_token);
  }
  localStorage.setItem(TOKEN_EXPIRY_KEY, Date.now() + (tokens.expires_in * 1000));

  return tokens;
}

/**
 * Disconnect from Canva
 */
export function disconnectCanva() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(TOKEN_EXPIRY_KEY);
}

/**
 * Make authenticated API request to Canva
 */
async function canvaFetch(endpoint, options = {}) {
  const token = await getCanvaToken();
  if (!token) {
    throw new Error('Not authenticated with Canva');
  }

  const response = await fetch(`${CANVA_API_URL}${endpoint}`, {
    ...options,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || `Canva API error: ${response.status}`);
  }

  return response.json();
}

/**
 * Get user profile
 */
export async function getCanvaUser() {
  return canvaFetch('/users/me');
}

/**
 * Create a new design
 */
export async function createDesign(options = {}) {
  const { width = 1920, height = 1080, title = 'New Design' } = options;

  return canvaFetch('/designs', {
    method: 'POST',
    body: JSON.stringify({
      design_type: 'Presentation',
      title,
      dimensions: {
        width,
        height,
        units: 'px',
      },
    }),
  });
}

/**
 * Get design by ID
 */
export async function getDesign(designId) {
  return canvaFetch(`/designs/${designId}`);
}

/**
 * Export design as image
 */
export async function exportDesign(designId, format = 'png') {
  const response = await canvaFetch(`/designs/${designId}/exports`, {
    method: 'POST',
    body: JSON.stringify({
      format: format.toUpperCase(),
    }),
  });

  // Poll for export completion
  const jobId = response.job.id;
  let result;
  let attempts = 0;
  const maxAttempts = 30;

  while (attempts < maxAttempts) {
    await new Promise(resolve => setTimeout(resolve, 1000));
    result = await canvaFetch(`/designs/${designId}/exports/${jobId}`);

    if (result.job.status === 'success') {
      return result;
    }
    if (result.job.status === 'failed') {
      throw new Error('Export failed');
    }
    attempts++;
  }

  throw new Error('Export timed out');
}

/**
 * Open Canva editor for a design
 */
export function openCanvaEditor(designId) {
  window.open(`https://www.canva.com/design/${designId}/edit`, '_blank');
}

/**
 * Get Canva design URL for embedding
 */
export function getCanvaDesignUrl(designId) {
  return `https://www.canva.com/design/${designId}/view`;
}

/**
 * Canva template categories with deep links
 * These open Canva's template browser pre-filtered by category
 */
export const CANVA_TEMPLATE_CATEGORIES = [
  {
    id: 'presentation',
    name: 'Presentations',
    description: '16:9 slides, perfect for digital signage',
    icon: 'Monitor',
    url: 'https://www.canva.com/presentations/',
    recommended: true,
  },
  {
    id: 'digital-signage',
    name: 'Digital Signage',
    description: 'Screens, menus, and info displays',
    icon: 'Tv',
    url: 'https://www.canva.com/create/digital-signage/',
    recommended: true,
  },
  {
    id: 'video',
    name: 'Videos',
    description: 'Animated content for screens',
    icon: 'Play',
    url: 'https://www.canva.com/videos/',
  },
  {
    id: 'poster',
    name: 'Posters',
    description: 'Portrait layouts and announcements',
    icon: 'FileImage',
    url: 'https://www.canva.com/posters/',
  },
  {
    id: 'menu',
    name: 'Menus',
    description: 'Restaurant and cafe menu boards',
    icon: 'UtensilsCrossed',
    url: 'https://www.canva.com/menus/',
  },
  {
    id: 'flyer',
    name: 'Flyers',
    description: 'Promotional and event content',
    icon: 'Megaphone',
    url: 'https://www.canva.com/flyers/',
  },
  {
    id: 'social-media',
    name: 'Social Media',
    description: 'Square and vertical formats',
    icon: 'Share2',
    url: 'https://www.canva.com/social-media/',
  },
  {
    id: 'infographic',
    name: 'Infographics',
    description: 'Data visualizations and stats',
    icon: 'BarChart3',
    url: 'https://www.canva.com/infographics/',
  },
];

/**
 * Open Canva template browser for a specific category
 */
export function openCanvaTemplates(categoryId = null) {
  const category = categoryId
    ? CANVA_TEMPLATE_CATEGORIES.find(c => c.id === categoryId)
    : null;

  const url = category?.url || 'https://www.canva.com/templates/';
  window.open(url, '_blank');
}

/**
 * Open Canva to create a new design with callback
 * This uses Canva's button/embed approach
 */
export function openCanvaDesigner(options = {}) {
  const {
    designType = 'Presentation',
    width = 1920,
    height = 1080,
    onDesignPublish,
  } = options;

  // Store callback for when design is published
  if (onDesignPublish) {
    window.__canvaDesignCallback = onDesignPublish;
  }

  // Open Canva with return URL
  const returnUrl = encodeURIComponent(`${window.location.origin}/layouts?canva_design=true`);
  const canvaUrl = `https://www.canva.com/design/create?returnUrl=${returnUrl}`;

  window.open(canvaUrl, '_blank');
}
