/**
 * Webhook Service
 *
 * Frontend service for managing webhook endpoints and viewing delivery history.
 */

import { supabase } from '../supabase';
import { getEffectiveOwnerId } from './tenantService';

// Available webhook events
export const AVAILABLE_WEBHOOK_EVENTS = [
  { value: 'device.online', label: 'Device Online', description: 'When a screen comes online' },
  { value: 'device.offline', label: 'Device Offline', description: 'When a screen goes offline' },
  { value: 'campaign.activated', label: 'Campaign Activated', description: 'When a campaign is activated' },
  { value: 'campaign.deactivated', label: 'Campaign Deactivated', description: 'When a campaign is paused' },
  { value: 'campaign.ended', label: 'Campaign Ended', description: 'When a campaign ends' },
  { value: 'content.approved', label: 'Content Approved', description: 'When content is approved' },
  { value: 'content.rejected', label: 'Content Rejected', description: 'When content is rejected' },
  { value: 'playlist.updated', label: 'Playlist Updated', description: 'When a playlist is modified' },
  { value: 'layout.updated', label: 'Layout Updated', description: 'When a layout is modified' },
  { value: 'media.uploaded', label: 'Media Uploaded', description: 'When new media is uploaded' },
];

/**
 * Generate a webhook secret
 * @returns {string}
 */
function generateSecret() {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return 'whsec_' + Array.from(array, b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Validate webhook URL
 * @param {string} url
 * @returns {{ valid: boolean, error?: string }}
 */
export function validateWebhookUrl(url) {
  if (!url) {
    return { valid: false, error: 'URL is required' };
  }

  try {
    const parsed = new URL(url);

    // Must be HTTPS
    if (parsed.protocol !== 'https:') {
      return { valid: false, error: 'URL must use HTTPS' };
    }

    // Block localhost and private IPs
    const hostname = parsed.hostname.toLowerCase();
    if (
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname.startsWith('192.168.') ||
      hostname.startsWith('10.') ||
      hostname.startsWith('172.')
    ) {
      return { valid: false, error: 'Private/local URLs are not allowed' };
    }

    return { valid: true };
  } catch (e) {
    return { valid: false, error: 'Invalid URL format' };
  }
}

/**
 * Fetch all webhook endpoints for the current tenant
 * @returns {Promise<Array>}
 */
export async function fetchWebhookEndpoints() {
  const ownerId = await getEffectiveOwnerId();
  if (!ownerId) throw new Error('No tenant context');

  const { data, error } = await supabase
    .from('webhook_endpoints')
    .select('id, url, events, is_active, description, created_at, updated_at')
    .eq('owner_id', ownerId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

/**
 * Create a new webhook endpoint
 * @param {Object} params
 * @param {string} params.url - Endpoint URL (HTTPS only)
 * @param {string[]} params.events - Events to subscribe to
 * @param {string} [params.description] - Optional description
 * @returns {Promise<{ endpoint: Object, secret: string }>}
 */
export async function createWebhookEndpoint({ url, events, description = '' }) {
  const ownerId = await getEffectiveOwnerId();
  if (!ownerId) throw new Error('No tenant context');

  // Validate URL
  const validation = validateWebhookUrl(url);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  if (!events || events.length === 0) {
    throw new Error('At least one event is required');
  }

  // Generate secret
  const secret = generateSecret();

  // Insert endpoint
  const { data, error } = await supabase
    .from('webhook_endpoints')
    .insert({
      owner_id: ownerId,
      url,
      secret,
      events,
      description: description.trim(),
      is_active: true
    })
    .select('id, url, events, is_active, description, created_at')
    .single();

  if (error) throw error;

  // Return both the created record and the secret
  // The secret is only shown once
  return {
    endpoint: data,
    secret
  };
}

/**
 * Update a webhook endpoint
 * @param {string} endpointId
 * @param {Object} updates
 * @returns {Promise<Object>}
 */
export async function updateWebhookEndpoint(endpointId, { url, events, description, is_active }) {
  const updates = {};

  if (url !== undefined) {
    const validation = validateWebhookUrl(url);
    if (!validation.valid) {
      throw new Error(validation.error);
    }
    updates.url = url;
  }

  if (events !== undefined) {
    if (events.length === 0) {
      throw new Error('At least one event is required');
    }
    updates.events = events;
  }

  if (description !== undefined) {
    updates.description = description.trim();
  }

  if (is_active !== undefined) {
    updates.is_active = is_active;
  }

  const { data, error } = await supabase
    .from('webhook_endpoints')
    .update(updates)
    .eq('id', endpointId)
    .select('id, url, events, is_active, description, updated_at')
    .single();

  if (error) throw error;
  return data;
}

/**
 * Toggle webhook endpoint active status
 * @param {string} endpointId
 * @param {boolean} isActive
 * @returns {Promise<Object>}
 */
export async function toggleWebhookEndpoint(endpointId, isActive) {
  return updateWebhookEndpoint(endpointId, { is_active: isActive });
}

/**
 * Delete a webhook endpoint
 * @param {string} endpointId
 * @returns {Promise<void>}
 */
export async function deleteWebhookEndpoint(endpointId) {
  const { error } = await supabase
    .from('webhook_endpoints')
    .delete()
    .eq('id', endpointId);

  if (error) throw error;
}

/**
 * Fetch webhook deliveries for an endpoint
 * @param {string} endpointId
 * @param {number} limit
 * @returns {Promise<Array>}
 */
export async function fetchWebhookDeliveries(endpointId, limit = 20) {
  const { data, error } = await supabase.rpc('get_webhook_deliveries', {
    p_endpoint_id: endpointId,
    p_limit: limit
  });

  if (error) throw error;
  return data || [];
}

/**
 * Fetch recent webhook events for the tenant
 * @param {number} limit
 * @returns {Promise<Array>}
 */
export async function fetchRecentWebhookEvents(limit = 50) {
  const ownerId = await getEffectiveOwnerId();
  if (!ownerId) throw new Error('No tenant context');

  const { data, error } = await supabase
    .from('webhook_events')
    .select(`
      id,
      event_type,
      status,
      attempt_count,
      response_status,
      last_error,
      created_at,
      last_attempt_at,
      endpoint:webhook_endpoints(url)
    `)
    .eq('owner_id', ownerId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data || [];
}

/**
 * Get delivery status info
 * @param {Object} event
 * @returns {{ label: string, color: string }}
 */
export function getDeliveryStatus(event) {
  switch (event.status) {
    case 'delivered':
      return { label: 'Delivered', color: 'text-green-600', bgColor: 'bg-green-100' };
    case 'pending':
      return { label: 'Pending', color: 'text-yellow-600', bgColor: 'bg-yellow-100' };
    case 'failed':
      return { label: 'Retrying', color: 'text-orange-600', bgColor: 'bg-orange-100' };
    case 'exhausted':
      return { label: 'Failed', color: 'text-red-600', bgColor: 'bg-red-100' };
    default:
      return { label: 'Unknown', color: 'text-gray-600', bgColor: 'bg-gray-100' };
  }
}

/**
 * Format event type for display
 * @param {string} eventType
 * @returns {string}
 */
export function formatEventType(eventType) {
  const event = AVAILABLE_WEBHOOK_EVENTS.find(e => e.value === eventType);
  return event?.label || eventType;
}
