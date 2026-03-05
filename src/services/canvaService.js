/**
 * Canva Integration Service
 *
 * Handles OAuth flow and API interactions with Canva Connect API via the
 * canva-proxy Edge Function. All token storage is server-side in the
 * canva_oauth_tokens table -- no localStorage token storage.
 *
 * Token persistence path:
 *   OAuth redirect -> Canva callback page -> handleCanvaCallback()
 *   -> canva-proxy Edge Function (exchange_token action) writes to canva_oauth_tokens DB
 *   -> subsequent API calls go through canva-proxy which reads/refreshes tokens
 *
 * Documentation: https://www.canva.dev/docs/connect/
 */

import { supabase } from '../supabase';
import { createScopedLogger } from './loggingService';

const logger = createScopedLogger('CanvaService');

const CANVA_CLIENT_ID = import.meta.env.VITE_CANVA_CLIENT_ID;
const CANVA_OAUTH_URL = 'https://www.canva.com/api/oauth/authorize';

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

// ─── OAuth Flow ──────────────────────────────────────────────────────────────

/**
 * Start OAuth flow - redirect to Canva
 * PKCE flow stays client-side (redirect to Canva OAuth page).
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
    scope: 'design:meta:read design:content:read asset:read profile:read',
    state,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
  });

  window.location.href = `${CANVA_OAUTH_URL}?${params.toString()}`;
}

/**
 * Handle OAuth callback - exchange code for tokens via Edge Function.
 * Tokens are stored server-side by the Edge Function, not in the browser.
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

  // Exchange code for tokens via Edge Function (tokens stored server-side)
  const { data, error } = await supabase.functions.invoke('canva-proxy', {
    body: {
      action: 'exchange_token',
      code,
      codeVerifier,
      redirectUri,
    },
  });

  if (error) {
    logger.error('Token exchange failed', error);
    throw new Error(error.message || 'Failed to exchange code for token');
  }

  // Clean up sessionStorage
  sessionStorage.removeItem('canva_code_verifier');
  sessionStorage.removeItem('canva_oauth_state');

  return data;
}

// ─── Connection Status ───────────────────────────────────────────────────────

/**
 * Check if user is connected to Canva (server-side token exists).
 * @returns {Promise<boolean>}
 */
export async function checkCanvaConnection() {
  try {
    const { data, error } = await supabase.functions.invoke('canva-proxy', {
      body: { action: 'check_connection' },
    });

    if (error) {
      logger.warn('Connection check failed', error);
      return false;
    }

    return data?.connected === true;
  } catch (err) {
    logger.warn('Connection check error', err);
    return false;
  }
}

/**
 * Disconnect from Canva - delete the canva_oauth_tokens row for current user.
 */
export async function disconnectCanva() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const { error } = await supabase
    .from('canva_oauth_tokens')
    .delete()
    .eq('user_id', user.id);

  if (error) {
    logger.error('Failed to disconnect Canva', error);
    throw error;
  }
}

// ─── Design Browsing & Import ────────────────────────────────────────────────

/**
 * List the user's Canva designs via the Edge Function.
 *
 * @param {{ query?: string, continuation?: string, limit?: number }} options
 * @returns {Promise<{ items: object[], continuation: string|null }>}
 */
export async function listCanvaDesigns({ query, continuation, limit } = {}) {
  const { data, error } = await supabase.functions.invoke('canva-proxy', {
    body: {
      action: 'list_designs',
      query,
      continuation,
      limit,
    },
  });

  if (error) {
    logger.error('Failed to list designs', error);
    throw new Error(error.message || 'Failed to list Canva designs');
  }

  return {
    items: data?.items || [],
    continuation: data?.continuation || null,
  };
}

/**
 * Import a Canva design as a media asset (PNG image).
 *
 * Steps:
 *   1. Export design via Edge Function (PNG)
 *   2. Download exported image
 *   3. Upload to Supabase Storage 'media' bucket
 *   4. Create media_assets record
 *
 * @param {string} designId - Canva design ID
 * @param {string} designTitle - Design title for the media asset name
 * @returns {Promise<object>} The created media_assets record
 */
export async function importCanvaDesign(designId, designTitle) {
  // Step 1: Export design via Edge Function
  const { data: exportData, error: exportError } = await supabase.functions.invoke('canva-proxy', {
    body: {
      action: 'export_design',
      designId,
      format: 'png',
    },
  });

  if (exportError) {
    logger.error('Design export failed', exportError);
    throw new Error(exportError.message || 'Failed to export Canva design');
  }

  const imageUrl = exportData?.url;
  if (!imageUrl) {
    throw new Error('No export URL returned from Canva');
  }

  // Step 2: Download exported image
  const imageResponse = await fetch(imageUrl);
  if (!imageResponse.ok) {
    throw new Error('Failed to download exported image');
  }
  const imageBlob = await imageResponse.blob();

  // Step 3: Upload to Supabase Storage
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const filename = `canva-${designId}-${Date.now()}.png`;
  const storagePath = `${user.id}/${filename}`;

  const { error: uploadError } = await supabase.storage
    .from('media')
    .upload(storagePath, imageBlob, {
      contentType: 'image/png',
      upsert: false,
    });

  if (uploadError) {
    logger.error('Storage upload failed', uploadError);
    throw uploadError;
  }

  // Get public URL
  const { data: { publicUrl } } = supabase.storage
    .from('media')
    .getPublicUrl(storagePath);

  // Step 4: Create media_assets record
  const { data: asset, error: insertError } = await supabase
    .from('media_assets')
    .insert({
      owner_id: user.id,
      name: designTitle || `Canva Design ${designId}`,
      type: 'image',
      url: publicUrl,
      mime_type: 'image/png',
      file_size: imageBlob.size,
      metadata: {
        source: 'canva',
        canva_design_id: designId,
      },
    })
    .select()
    .single();

  if (insertError) {
    logger.error('Failed to create media_assets record', insertError);
    throw insertError;
  }

  logger.info('Canva design imported', { designId, assetId: asset.id });
  return asset;
}

/**
 * Re-import a Canva design, updating an existing media asset.
 *
 * Same as importCanvaDesign but updates the existing record instead of inserting.
 *
 * @param {string} designId - Canva design ID
 * @param {string} existingAssetId - ID of the existing media_assets record to update
 * @returns {Promise<object>} The updated media_assets record
 */
export async function reimportCanvaDesign(designId, existingAssetId) {
  // Step 1: Export design via Edge Function
  const { data: exportData, error: exportError } = await supabase.functions.invoke('canva-proxy', {
    body: {
      action: 'export_design',
      designId,
      format: 'png',
    },
  });

  if (exportError) {
    logger.error('Design re-export failed', exportError);
    throw new Error(exportError.message || 'Failed to export Canva design');
  }

  const imageUrl = exportData?.url;
  if (!imageUrl) {
    throw new Error('No export URL returned from Canva');
  }

  // Step 2: Download exported image
  const imageResponse = await fetch(imageUrl);
  if (!imageResponse.ok) {
    throw new Error('Failed to download exported image');
  }
  const imageBlob = await imageResponse.blob();

  // Step 3: Upload to Supabase Storage (overwrite)
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const filename = `canva-${designId}-${Date.now()}.png`;
  const storagePath = `${user.id}/${filename}`;

  const { error: uploadError } = await supabase.storage
    .from('media')
    .upload(storagePath, imageBlob, {
      contentType: 'image/png',
      upsert: false,
    });

  if (uploadError) {
    logger.error('Storage upload failed', uploadError);
    throw uploadError;
  }

  // Get public URL
  const { data: { publicUrl } } = supabase.storage
    .from('media')
    .getPublicUrl(storagePath);

  // Step 4: Update existing media_assets record
  const { data: asset, error: updateError } = await supabase
    .from('media_assets')
    .update({
      url: publicUrl,
      file_size: imageBlob.size,
      updated_at: new Date().toISOString(),
    })
    .eq('id', existingAssetId)
    .select()
    .single();

  if (updateError) {
    logger.error('Failed to update media_assets record', updateError);
    throw updateError;
  }

  logger.info('Canva design re-imported', { designId, assetId: asset.id });
  return asset;
}

// ─── Template Categories & Helpers ───────────────────────────────────────────

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
 * Open Canva to create a new design with callback
 * This uses Canva's button/embed approach
 */
export function openCanvaDesigner(options = {}) {
  const {
    _designType = 'Presentation',
    _width = 1920,
    _height = 1080,
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
