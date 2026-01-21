/**
 * Webhook Service
 *
 * Frontend service for managing webhook endpoints and viewing delivery history.
 *
 * Features:
 * - Webhook endpoint management
 * - Delivery history tracking
 * - Event replay capability
 * - Dead letter queue for failed events
 * - Webhook testing (ping endpoint)
 * - Signature verification guide
 */

import { supabase } from '../supabase';
import { getEffectiveOwnerId } from './tenantService';

// Retry configuration
export const WEBHOOK_RETRY_CONFIG = {
  maxAttempts: 5,
  initialDelaySeconds: 30,
  backoffMultiplier: 2,
  // Results in: 30s, 60s, 120s, 240s, 480s (max ~8 minutes total wait)
};

// Webhook status constants
export const WEBHOOK_STATUSES = {
  PENDING: 'pending',
  DELIVERED: 'delivered',
  FAILED: 'failed',      // Still retrying
  EXHAUSTED: 'exhausted', // Max retries reached (dead letter)
};

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

// ============================================
// WEBHOOK RELIABILITY FEATURES
// ============================================

/**
 * Get failed/dead-letter webhook events
 * @param {number} limit
 * @returns {Promise<Array>}
 */
export async function getDeadLetterEvents(limit = 50) {
  const ownerId = await getEffectiveOwnerId();
  if (!ownerId) throw new Error('No tenant context');

  const { data, error } = await supabase
    .from('webhook_events')
    .select(`
      id,
      event_type,
      payload,
      status,
      attempt_count,
      response_status,
      last_error,
      created_at,
      last_attempt_at,
      endpoint:webhook_endpoints(id, url)
    `)
    .eq('owner_id', ownerId)
    .eq('status', WEBHOOK_STATUSES.EXHAUSTED)
    .order('last_attempt_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data || [];
}

/**
 * Replay a failed webhook event (reset for retry)
 * @param {string} eventId
 * @returns {Promise<Object>}
 */
export async function replayWebhookEvent(eventId) {
  const ownerId = await getEffectiveOwnerId();
  if (!ownerId) throw new Error('No tenant context');

  // Reset the event for retry
  const { data, error } = await supabase
    .from('webhook_events')
    .update({
      status: WEBHOOK_STATUSES.PENDING,
      attempt_count: 0,
      next_attempt_at: new Date().toISOString(),
      last_error: null,
    })
    .eq('id', eventId)
    .eq('owner_id', ownerId)
    .select('id, event_type, status')
    .single();

  if (error) throw error;
  return data;
}

/**
 * Replay multiple failed events
 * @param {string[]} eventIds
 * @returns {Promise<{ success: number, failed: number }>}
 */
export async function replayMultipleEvents(eventIds) {
  let success = 0;
  let failed = 0;

  for (const eventId of eventIds) {
    try {
      await replayWebhookEvent(eventId);
      success++;
    } catch (e) {
      failed++;
    }
  }

  return { success, failed };
}

/**
 * Permanently delete a dead letter event
 * @param {string} eventId
 * @returns {Promise<void>}
 */
export async function deleteDeadLetterEvent(eventId) {
  const ownerId = await getEffectiveOwnerId();
  if (!ownerId) throw new Error('No tenant context');

  const { error } = await supabase
    .from('webhook_events')
    .delete()
    .eq('id', eventId)
    .eq('owner_id', ownerId)
    .eq('status', WEBHOOK_STATUSES.EXHAUSTED);

  if (error) throw error;
}

/**
 * Clear all dead letter events for the tenant
 * @returns {Promise<number>} Number of deleted events
 */
export async function clearDeadLetterQueue() {
  const ownerId = await getEffectiveOwnerId();
  if (!ownerId) throw new Error('No tenant context');

  const { data, error } = await supabase
    .from('webhook_events')
    .delete()
    .eq('owner_id', ownerId)
    .eq('status', WEBHOOK_STATUSES.EXHAUSTED)
    .select('id');

  if (error) throw error;
  return data?.length || 0;
}

/**
 * Test a webhook endpoint with a ping event
 * @param {string} endpointId
 * @returns {Promise<{ success: boolean, statusCode?: number, error?: string, latencyMs: number }>}
 */
export async function testWebhookEndpoint(endpointId) {
  const ownerId = await getEffectiveOwnerId();
  if (!ownerId) throw new Error('No tenant context');

  // Get endpoint details
  const { data: endpoint, error: fetchError } = await supabase
    .from('webhook_endpoints')
    .select('id, url, secret')
    .eq('id', endpointId)
    .eq('owner_id', ownerId)
    .single();

  if (fetchError || !endpoint) {
    throw new Error('Endpoint not found');
  }

  // Create test payload
  const testPayload = {
    event: 'webhook.test',
    timestamp: new Date().toISOString(),
    test: true,
    message: 'This is a test webhook from BizScreen',
  };

  // Generate signature
  const signature = await generateWebhookSignature(testPayload, endpoint.secret);

  // Send test request
  const startTime = performance.now();
  try {
    const response = await fetch(endpoint.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-BizScreen-Signature': signature,
        'X-BizScreen-Event': 'webhook.test',
        'X-BizScreen-Delivery': `test_${Date.now()}`,
      },
      body: JSON.stringify(testPayload),
    });

    const latencyMs = Math.round(performance.now() - startTime);

    return {
      success: response.ok,
      statusCode: response.status,
      latencyMs,
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      latencyMs: Math.round(performance.now() - startTime),
    };
  }
}

/**
 * Generate HMAC-SHA256 signature for webhook payload
 * @param {Object} payload
 * @param {string} secret
 * @returns {Promise<string>}
 */
async function generateWebhookSignature(payload, secret) {
  const encoder = new TextEncoder();
  const data = encoder.encode(JSON.stringify(payload));
  const keyData = encoder.encode(secret);

  const key = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign('HMAC', key, data);
  const hashArray = Array.from(new Uint8Array(signature));
  return 'sha256=' + hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Get webhook endpoint statistics
 * @param {string} endpointId
 * @returns {Promise<Object>}
 */
export async function getEndpointStats(endpointId) {
  const { data, error } = await supabase.rpc('get_webhook_endpoint_stats', {
    p_endpoint_id: endpointId,
  });

  if (error) {
    // Fallback: calculate from events
    const events = await fetchWebhookDeliveries(endpointId, 100);

    const stats = {
      total: events.length,
      delivered: 0,
      failed: 0,
      pending: 0,
      successRate: 0,
      avgLatency: null,
    };

    for (const event of events) {
      if (event.status === 'delivered') stats.delivered++;
      else if (event.status === 'exhausted') stats.failed++;
      else stats.pending++;
    }

    stats.successRate = stats.total > 0
      ? Math.round((stats.delivered / stats.total) * 100)
      : 100;

    return stats;
  }

  return data;
}

/**
 * Get webhook event details with full payload
 * @param {string} eventId
 * @returns {Promise<Object>}
 */
export async function getWebhookEventDetails(eventId) {
  const ownerId = await getEffectiveOwnerId();
  if (!ownerId) throw new Error('No tenant context');

  const { data, error } = await supabase
    .from('webhook_events')
    .select(`
      id,
      event_type,
      payload,
      status,
      attempt_count,
      max_attempts,
      response_status,
      last_error,
      created_at,
      last_attempt_at,
      next_attempt_at,
      endpoint:webhook_endpoints(id, url, is_active)
    `)
    .eq('id', eventId)
    .eq('owner_id', ownerId)
    .single();

  if (error) throw error;
  return data;
}

/**
 * Rotate webhook secret
 * @param {string} endpointId
 * @returns {Promise<{ endpoint: Object, secret: string }>}
 */
export async function rotateWebhookSecret(endpointId) {
  const ownerId = await getEffectiveOwnerId();
  if (!ownerId) throw new Error('No tenant context');

  // Generate new secret
  const newSecret = generateSecret();

  const { data, error } = await supabase
    .from('webhook_endpoints')
    .update({ secret: newSecret })
    .eq('id', endpointId)
    .eq('owner_id', ownerId)
    .select('id, url, events, is_active, description')
    .single();

  if (error) throw error;

  return {
    endpoint: data,
    secret: newSecret,
  };
}

/**
 * Get webhook delivery summary for dashboard
 * @param {number} days - Number of days to look back
 * @returns {Promise<Object>}
 */
export async function getDeliverySummary(days = 7) {
  const ownerId = await getEffectiveOwnerId();
  if (!ownerId) throw new Error('No tenant context');

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const { data, error } = await supabase
    .from('webhook_events')
    .select('id, status, created_at')
    .eq('owner_id', ownerId)
    .gte('created_at', startDate.toISOString());

  if (error) throw error;

  const summary = {
    total: data?.length || 0,
    delivered: 0,
    pending: 0,
    failed: 0,
    exhausted: 0,
    successRate: 100,
    byDay: {},
  };

  for (const event of (data || [])) {
    // Count by status
    switch (event.status) {
      case 'delivered':
        summary.delivered++;
        break;
      case 'pending':
      case 'failed':
        summary.pending++;
        break;
      case 'exhausted':
        summary.exhausted++;
        break;
    }

    // Group by day
    const day = event.created_at.split('T')[0];
    if (!summary.byDay[day]) {
      summary.byDay[day] = { total: 0, delivered: 0, failed: 0 };
    }
    summary.byDay[day].total++;
    if (event.status === 'delivered') {
      summary.byDay[day].delivered++;
    } else if (event.status === 'exhausted') {
      summary.byDay[day].failed++;
    }
  }

  // Calculate success rate
  const completed = summary.delivered + summary.exhausted;
  if (completed > 0) {
    summary.successRate = Math.round((summary.delivered / completed) * 100);
  }

  return summary;
}

/**
 * Get signature verification code examples
 * @returns {Object}
 */
export function getSignatureVerificationExamples() {
  return {
    node: `
const crypto = require('crypto');

function verifyWebhookSignature(payload, signature, secret) {
  const expectedSignature = 'sha256=' + crypto
    .createHmac('sha256', secret)
    .update(JSON.stringify(payload))
    .digest('hex');

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}

// Usage in Express
app.post('/webhook', (req, res) => {
  const signature = req.headers['x-bizscreen-signature'];
  const isValid = verifyWebhookSignature(req.body, signature, WEBHOOK_SECRET);

  if (!isValid) {
    return res.status(401).send('Invalid signature');
  }

  // Process webhook...
  res.status(200).send('OK');
});
`,
    python: `
import hmac
import hashlib
import json

def verify_webhook_signature(payload, signature, secret):
    expected = 'sha256=' + hmac.new(
        secret.encode('utf-8'),
        json.dumps(payload, separators=(',', ':')).encode('utf-8'),
        hashlib.sha256
    ).hexdigest()

    return hmac.compare_digest(signature, expected)

# Usage in Flask
@app.route('/webhook', methods=['POST'])
def handle_webhook():
    signature = request.headers.get('X-BizScreen-Signature')
    is_valid = verify_webhook_signature(request.json, signature, WEBHOOK_SECRET)

    if not is_valid:
        return 'Invalid signature', 401

    # Process webhook...
    return 'OK', 200
`,
    php: `
<?php
function verifyWebhookSignature($payload, $signature, $secret) {
    $expected = 'sha256=' . hash_hmac(
        'sha256',
        json_encode($payload),
        $secret
    );

    return hash_equals($signature, $expected);
}

// Usage
$signature = $_SERVER['HTTP_X_BIZSCREEN_SIGNATURE'] ?? '';
$payload = json_decode(file_get_contents('php://input'), true);

if (!verifyWebhookSignature($payload, $signature, WEBHOOK_SECRET)) {
    http_response_code(401);
    exit('Invalid signature');
}

// Process webhook...
http_response_code(200);
echo 'OK';
?>
`,
  };
}
