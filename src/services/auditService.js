/**
 * Audit Log Service
 * Phase 18: Frontend service for audit logs and system events
 */

import { supabase } from '../supabase';
import { createScopedLogger } from './loggingService';

const logger = createScopedLogger('AuditService');

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Get authorization headers for API calls
 */
async function getAuthHeaders() {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.access_token) {
    throw new Error('Not authenticated');
  }
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${session.access_token}`,
  };
}

/**
 * Make authenticated API call
 */
async function apiCall(endpoint, options = {}) {
  const headers = await getAuthHeaders();
  const response = await fetch(`/api${endpoint}`, {
    ...options,
    headers: {
      ...headers,
      ...options.headers,
    },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'API request failed');
  }

  return data;
}

// ============================================================================
// AUDIT LOGS (TENANT-SCOPED)
// ============================================================================

/**
 * List audit logs for the current tenant (or specified tenant for super_admin)
 *
 * @param {Object} options - Query options
 * @param {number} [options.page=1] - Page number
 * @param {number} [options.limit=50] - Items per page
 * @param {string} [options.event_type] - Filter by event type
 * @param {string} [options.entity_type] - Filter by entity type
 * @param {string} [options.user_id] - Filter by user
 * @param {string} [options.start_date] - Filter from date (ISO format)
 * @param {string} [options.end_date] - Filter to date (ISO format)
 * @param {string} [options.tenant_id] - Tenant ID (super_admin only)
 * @returns {Promise<Object>}
 */
export async function listAuditLogs(options = {}) {
  const params = new URLSearchParams();

  if (options.page) params.set('page', options.page.toString());
  if (options.limit) params.set('limit', options.limit.toString());
  if (options.event_type) params.set('event_type', options.event_type);
  if (options.entity_type) params.set('entity_type', options.entity_type);
  if (options.user_id) params.set('user_id', options.user_id);
  if (options.start_date) params.set('start_date', options.start_date);
  if (options.end_date) params.set('end_date', options.end_date);
  if (options.tenant_id) params.set('tenant_id', options.tenant_id);

  const response = await apiCall(`/audit/list?${params.toString()}`);
  return response.data;
}

/**
 * Get available filter options for audit logs
 *
 * @param {string} [tenantId] - Tenant ID (super_admin only)
 * @returns {Promise<Object>}
 */
export async function getAuditFilters(tenantId) {
  const params = new URLSearchParams();
  if (tenantId) params.set('tenant_id', tenantId);

  // We get filters from the main list endpoint
  const response = await apiCall(`/audit/list?limit=1&${params.toString()}`);
  return response.data.filters;
}

// ============================================================================
// SYSTEM EVENTS (SUPER ADMIN ONLY)
// ============================================================================

/**
 * List system events (super_admin only)
 *
 * @param {Object} options - Query options
 * @param {number} [options.page=1] - Page number
 * @param {number} [options.limit=50] - Items per page
 * @param {string} [options.source] - Filter by source
 * @param {string} [options.event_type] - Filter by event type
 * @param {string} [options.severity] - Filter by severity
 * @param {string} [options.start_date] - Filter from date (ISO format)
 * @param {string} [options.end_date] - Filter to date (ISO format)
 * @returns {Promise<Object>}
 */
export async function listSystemEvents(options = {}) {
  const params = new URLSearchParams();

  if (options.page) params.set('page', options.page.toString());
  if (options.limit) params.set('limit', options.limit.toString());
  if (options.source) params.set('source', options.source);
  if (options.event_type) params.set('event_type', options.event_type);
  if (options.severity) params.set('severity', options.severity);
  if (options.start_date) params.set('start_date', options.start_date);
  if (options.end_date) params.set('end_date', options.end_date);

  const response = await apiCall(`/audit/system?${params.toString()}`);
  return response.data;
}

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Human-readable event type labels
 */
export const EVENT_TYPE_LABELS = {
  // Authentication
  'auth.login': 'User Login',
  'auth.logout': 'User Logout',
  'auth.password_reset': 'Password Reset',
  'auth.password_change': 'Password Change',
  'auth.mfa_enabled': 'MFA Enabled',
  'auth.mfa_disabled': 'MFA Disabled',

  // User management
  'user.created': 'User Created',
  'user.updated': 'User Updated',
  'user.deleted': 'User Deleted',
  'user.disabled': 'User Disabled',
  'user.enabled': 'User Enabled',
  'user.role_changed': 'Role Changed',
  'user.invited': 'User Invited',

  // Tenant management
  'tenant.created': 'Tenant Created',
  'tenant.updated': 'Tenant Updated',
  'tenant.suspended': 'Tenant Suspended',
  'tenant.unsuspended': 'Tenant Unsuspended',
  'tenant.plan_changed': 'Plan Changed',

  // Feature flags
  'feature.override_set': 'Feature Override Set',
  'feature.override_removed': 'Feature Override Removed',
  'quota.override_set': 'Quota Override Set',
  'quota.override_removed': 'Quota Override Removed',

  // Screen management
  'screen.created': 'Screen Created',
  'screen.updated': 'Screen Updated',
  'screen.deleted': 'Screen Deleted',
  'screen.rebooted': 'Screen Rebooted',
  'screen.paired': 'Screen Paired',
  'screen.unpaired': 'Screen Unpaired',

  // Content management
  'media.uploaded': 'Media Uploaded',
  'media.deleted': 'Media Deleted',
  'playlist.created': 'Playlist Created',
  'playlist.updated': 'Playlist Updated',
  'playlist.deleted': 'Playlist Deleted',
  'campaign.created': 'Campaign Created',
  'campaign.updated': 'Campaign Updated',
  'campaign.deleted': 'Campaign Deleted',
  'campaign.published': 'Campaign Published',

  // AI Assistant
  'ai.query': 'AI Query',
  'ai.content_generated': 'AI Content Generated',

  // Settings
  'settings.updated': 'Settings Updated',
  'integration.connected': 'Integration Connected',
  'integration.disconnected': 'Integration Disconnected',

  // Billing
  'subscription.created': 'Subscription Created',
  'subscription.updated': 'Subscription Updated',
  'subscription.cancelled': 'Subscription Cancelled',
  'payment.succeeded': 'Payment Succeeded',
  'payment.failed': 'Payment Failed',
};

/**
 * Get human-readable label for event type
 */
export function getEventTypeLabel(eventType) {
  return EVENT_TYPE_LABELS[eventType] || eventType;
}

/**
 * Entity type labels
 */
export const ENTITY_TYPE_LABELS = {
  user: 'User',
  tenant: 'Tenant',
  screen: 'Screen',
  media: 'Media',
  playlist: 'Playlist',
  campaign: 'Campaign',
  subscription: 'Subscription',
  feature_flag: 'Feature Flag',
  quota: 'Quota',
  integration: 'Integration',
  settings: 'Settings',
};

/**
 * Get human-readable label for entity type
 */
export function getEntityTypeLabel(entityType) {
  return ENTITY_TYPE_LABELS[entityType] || entityType;
}

/**
 * Severity levels with colors
 */
export const SEVERITY_LEVELS = {
  debug: { label: 'Debug', color: 'gray' },
  info: { label: 'Info', color: 'blue' },
  warning: { label: 'Warning', color: 'yellow' },
  error: { label: 'Error', color: 'red' },
  critical: { label: 'Critical', color: 'purple' },
};

/**
 * System event sources with labels
 */
export const SYSTEM_SOURCES = {
  api: { label: 'API', color: 'blue' },
  scheduler: { label: 'Scheduler', color: 'purple' },
  system: { label: 'System', color: 'gray' },
  admin: { label: 'Admin', color: 'orange' },
  worker: { label: 'Worker', color: 'green' },
};

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  listAuditLogs,
  getAuditFilters,
  listSystemEvents,
  getEventTypeLabel,
  getEntityTypeLabel,
  EVENT_TYPE_LABELS,
  ENTITY_TYPE_LABELS,
  SEVERITY_LEVELS,
  SYSTEM_SOURCES,
};
