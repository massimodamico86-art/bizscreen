// Preview Service - Shareable preview link management
import { supabase } from '../supabase';
import { getOpenReviewForResource } from './approvalService';
import { createScopedLogger } from './loggingService';

const logger = createScopedLogger('PreviewService');

/**
 * Resource types that support preview
 */
export const PREVIEW_RESOURCE_TYPES = {
  PLAYLIST: 'playlist',
  LAYOUT: 'layout',
  CAMPAIGN: 'campaign'
};

/**
 * Expiry presets in hours
 */
export const EXPIRY_PRESETS = {
  '24h': 24,
  '7d': 24 * 7,
  '30d': 24 * 30,
  'never': null
};

/**
 * Generate a secure random token client-side
 * @returns {string} URL-safe token
 */
function generateToken() {
  const array = new Uint8Array(24);
  crypto.getRandomValues(array);
  // Convert to base64 and make URL-safe
  const base64 = btoa(String.fromCharCode.apply(null, array));
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

/**
 * Create a preview link for a resource
 * @param {Object} options - Link options
 * @param {string} options.resourceType - Type of resource (playlist, layout, campaign)
 * @param {string} options.resourceId - ID of the resource
 * @param {string|null} options.expiresAt - Expiration date/time (null for no expiry)
 * @param {boolean} options.allowComments - Whether to allow external comments
 * @returns {Promise<Object>} Created preview link with full URL
 */
export async function createPreviewLink({ resourceType, resourceId, expiresAt = null, allowComments = false }) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User must be authenticated');

  // Get user's tenant_id
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, managed_tenant_id')
    .eq('id', user.id)
    .single();

  const tenantId = profile?.managed_tenant_id || user.id;

  // Get the open review for this resource if any (to link comments)
  let reviewId = null;
  if (allowComments) {
    const openReview = await getOpenReviewForResource(resourceType, resourceId);
    reviewId = openReview?.id || null;
  }

  // Generate token
  const token = generateToken();

  const { data, error } = await supabase
    .from('preview_links')
    .insert({
      tenant_id: tenantId,
      resource_type: resourceType,
      resource_id: resourceId,
      review_id: reviewId,
      token,
      expires_at: expiresAt,
      allow_comments: allowComments,
      created_by: user.id
    })
    .select()
    .single();

  if (error) throw error;

  // Build full URL
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
  const previewUrl = `${baseUrl}/preview/${token}`;

  return {
    ...data,
    url: previewUrl
  };
}

/**
 * Create a preview link with an expiry preset
 * @param {Object} options - Link options
 * @param {string} options.resourceType - Type of resource
 * @param {string} options.resourceId - ID of the resource
 * @param {string} options.expiryPreset - Expiry preset key ('24h', '7d', '30d', 'never')
 * @param {boolean} options.allowComments - Whether to allow external comments
 * @returns {Promise<Object>} Created preview link
 */
export async function createPreviewLinkWithPreset({ resourceType, resourceId, expiryPreset = '7d', allowComments = false }) {
  const hours = EXPIRY_PRESETS[expiryPreset];
  const expiresAt = hours
    ? new Date(Date.now() + hours * 60 * 60 * 1000).toISOString()
    : null;

  return createPreviewLink({
    resourceType,
    resourceId,
    expiresAt,
    allowComments
  });
}

/**
 * Fetch preview links for a resource
 * @param {string} resourceType - Type of resource
 * @param {string} resourceId - ID of the resource
 * @returns {Promise<Array>} Preview links for the resource
 */
export async function fetchPreviewLinksForResource(resourceType, resourceId) {
  const { data, error } = await supabase
    .from('preview_links')
    .select(`
      *,
      created_by_profile:profiles!preview_links_created_by_fkey(full_name)
    `)
    .eq('resource_type', resourceType)
    .eq('resource_id', resourceId)
    .order('created_at', { ascending: false });

  if (error) throw error;

  // Build URLs and check expiry
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
  return (data || []).map(link => ({
    ...link,
    url: `${baseUrl}/preview/${link.token}`,
    is_expired: link.expires_at && new Date(link.expires_at) < new Date(),
    created_by_name: link.created_by_profile?.full_name || 'Unknown'
  }));
}

/**
 * Revoke (delete) a preview link
 * @param {string} linkId - Preview link ID
 * @returns {Promise<boolean>} Success
 */
export async function revokePreviewLink(linkId) {
  const { error } = await supabase
    .from('preview_links')
    .delete()
    .eq('id', linkId);

  if (error) throw error;
  return true;
}

/**
 * Get preview content using token (for authenticated users)
 * This is mainly for debugging; public access uses the API route
 * @param {string} token - Preview token
 * @returns {Promise<Object>} Preview content
 */
export async function getPreviewContent(token) {
  const { data, error } = await supabase.rpc('get_preview_content', { p_token: token });
  if (error) throw error;
  return data;
}

/**
 * Fetch active (non-expired) preview links for a resource
 * @param {string} resourceType - Type of resource
 * @param {string} resourceId - ID of the resource
 * @returns {Promise<Array>} Active preview links
 */
export async function fetchActivePreviewLinks(resourceType, resourceId) {
  const links = await fetchPreviewLinksForResource(resourceType, resourceId);
  return links.filter(link => !link.is_expired);
}

/**
 * Get expiry label for display
 * @param {string|null} expiresAt - Expiration date
 * @returns {string} Human-readable expiry label
 */
export function getExpiryLabel(expiresAt) {
  if (!expiresAt) return 'Never expires';

  const expiryDate = new Date(expiresAt);
  const now = new Date();

  if (expiryDate < now) return 'Expired';

  const diffMs = expiryDate - now;
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);

  if (diffDays > 1) return `Expires in ${diffDays} days`;
  if (diffHours > 1) return `Expires in ${diffHours} hours`;
  return 'Expires soon';
}

/**
 * Format a preview link for display
 * @param {Object} link - Preview link object
 * @returns {Object} Formatted link with display properties
 */
export function formatPreviewLink(link) {
  const isExpired = link.expires_at && new Date(link.expires_at) < new Date();
  return {
    ...link,
    is_expired: isExpired,
    expiry_label: getExpiryLabel(link.expires_at),
    short_url: link.url ? `${link.url.substring(0, 50)}...` : ''
  };
}

export default {
  createPreviewLink,
  createPreviewLinkWithPreset,
  fetchPreviewLinksForResource,
  fetchActivePreviewLinks,
  revokePreviewLink,
  getPreviewContent,
  getExpiryLabel,
  formatPreviewLink,
  PREVIEW_RESOURCE_TYPES,
  EXPIRY_PRESETS
};
