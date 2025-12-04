/**
 * Audit Logger Utility
 * Phase 18: Utilities for logging audit events and system events
 *
 * Usage:
 *   import { logAudit, logSystem, withAuditLogging } from '../lib/auditLogger.js';
 *
 *   // Log tenant-specific audit event
 *   await logAudit(req, {
 *     event_type: 'user.created',
 *     entity_type: 'user',
 *     entity_id: userId,
 *     metadata: { email: 'user@example.com' }
 *   });
 *
 *   // Log system event (no request context needed)
 *   await logSystem({
 *     source: 'scheduler',
 *     event_type: 'cleanup.completed',
 *     details: { deleted_count: 100 },
 *     severity: 'info'
 *   });
 */

import { createClient } from '@supabase/supabase-js';

// ============================================================================
// SUPABASE CLIENT
// ============================================================================

/**
 * Create a Supabase client with service role for audit operations
 */
function getSupabaseClient() {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const supabaseServiceKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Supabase configuration missing');
  }

  return createClient(supabaseUrl, supabaseServiceKey);
}

// ============================================================================
// AUDIT EVENT TYPES
// ============================================================================

/**
 * Standard audit event types
 * Use these for consistency across the application
 */
export const AUDIT_EVENT_TYPES = {
  // Authentication
  AUTH_LOGIN: 'auth.login',
  AUTH_LOGOUT: 'auth.logout',
  AUTH_PASSWORD_RESET: 'auth.password_reset',
  AUTH_PASSWORD_CHANGE: 'auth.password_change',
  AUTH_MFA_ENABLED: 'auth.mfa_enabled',
  AUTH_MFA_DISABLED: 'auth.mfa_disabled',

  // User management
  USER_CREATED: 'user.created',
  USER_UPDATED: 'user.updated',
  USER_DELETED: 'user.deleted',
  USER_DISABLED: 'user.disabled',
  USER_ENABLED: 'user.enabled',
  USER_ROLE_CHANGED: 'user.role_changed',
  USER_INVITED: 'user.invited',

  // Tenant management
  TENANT_CREATED: 'tenant.created',
  TENANT_UPDATED: 'tenant.updated',
  TENANT_SUSPENDED: 'tenant.suspended',
  TENANT_UNSUSPENDED: 'tenant.unsuspended',
  TENANT_PLAN_CHANGED: 'tenant.plan_changed',

  // Feature flags
  FEATURE_OVERRIDE_SET: 'feature.override_set',
  FEATURE_OVERRIDE_REMOVED: 'feature.override_removed',
  QUOTA_OVERRIDE_SET: 'quota.override_set',
  QUOTA_OVERRIDE_REMOVED: 'quota.override_removed',

  // Screen management
  SCREEN_CREATED: 'screen.created',
  SCREEN_UPDATED: 'screen.updated',
  SCREEN_DELETED: 'screen.deleted',
  SCREEN_REBOOTED: 'screen.rebooted',
  SCREEN_PAIRED: 'screen.paired',
  SCREEN_UNPAIRED: 'screen.unpaired',

  // Content management
  MEDIA_UPLOADED: 'media.uploaded',
  MEDIA_DELETED: 'media.deleted',
  PLAYLIST_CREATED: 'playlist.created',
  PLAYLIST_UPDATED: 'playlist.updated',
  PLAYLIST_DELETED: 'playlist.deleted',
  CAMPAIGN_CREATED: 'campaign.created',
  CAMPAIGN_UPDATED: 'campaign.updated',
  CAMPAIGN_DELETED: 'campaign.deleted',
  CAMPAIGN_PUBLISHED: 'campaign.published',

  // AI Assistant
  AI_QUERY: 'ai.query',
  AI_CONTENT_GENERATED: 'ai.content_generated',

  // Settings
  SETTINGS_UPDATED: 'settings.updated',
  INTEGRATION_CONNECTED: 'integration.connected',
  INTEGRATION_DISCONNECTED: 'integration.disconnected',

  // Billing
  SUBSCRIPTION_CREATED: 'subscription.created',
  SUBSCRIPTION_UPDATED: 'subscription.updated',
  SUBSCRIPTION_CANCELLED: 'subscription.cancelled',
  PAYMENT_SUCCEEDED: 'payment.succeeded',
  PAYMENT_FAILED: 'payment.failed',
};

/**
 * System event sources
 */
export const SYSTEM_EVENT_SOURCES = {
  API: 'api',
  SCHEDULER: 'scheduler',
  SYSTEM: 'system',
  ADMIN: 'admin',
  WORKER: 'worker',
};

/**
 * System event severity levels
 */
export const SEVERITY_LEVELS = {
  DEBUG: 'debug',
  INFO: 'info',
  WARNING: 'warning',
  ERROR: 'error',
  CRITICAL: 'critical',
};

// ============================================================================
// REQUEST HELPERS
// ============================================================================

/**
 * Extract client IP from request
 * Handles common proxy headers
 */
function getClientIp(req) {
  if (!req || !req.headers) return null;

  // Check X-Forwarded-For (may contain multiple IPs)
  const forwardedFor = req.headers['x-forwarded-for'];
  if (forwardedFor) {
    const ips = forwardedFor.split(',').map((ip) => ip.trim());
    return ips[0];
  }

  // Check other common headers
  return (
    req.headers['x-real-ip'] ||
    req.headers['cf-connecting-ip'] || // Cloudflare
    req.connection?.remoteAddress ||
    req.socket?.remoteAddress ||
    null
  );
}

/**
 * Extract user agent from request
 */
function getUserAgent(req) {
  if (!req || !req.headers) return null;
  return req.headers['user-agent'] || null;
}

/**
 * Get user context from request (if auth is available)
 */
async function getUserContext(req) {
  if (!req) return { userId: null, tenantId: null };

  // Check if context was already attached by auth middleware
  if (req.user || req.context) {
    const ctx = req.user || req.context;
    return {
      userId: ctx.userId || ctx.id || null,
      tenantId: ctx.tenantId || ctx.tenant_id || null,
    };
  }

  // Try to get from authorization header
  const authHeader = req.headers?.authorization || req.headers?.Authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { userId: null, tenantId: null };
  }

  try {
    const supabase = getSupabaseClient();
    const token = authHeader.replace('Bearer ', '');

    const {
      data: { user },
    } = await supabase.auth.getUser(token);

    if (!user) {
      return { userId: null, tenantId: null };
    }

    // Get profile for tenant_id
    const { data: profile } = await supabase
      .from('profiles')
      .select('tenant_id')
      .eq('id', user.id)
      .single();

    return {
      userId: user.id,
      tenantId: profile?.tenant_id || null,
    };
  } catch {
    return { userId: null, tenantId: null };
  }
}

// ============================================================================
// AUDIT LOGGING
// ============================================================================

/**
 * Log an audit event for a tenant
 *
 * @param {Request} req - HTTP request (for extracting user/tenant context, IP, user agent)
 * @param {Object} options - Event details
 * @param {string} options.event_type - Type of event (use AUDIT_EVENT_TYPES)
 * @param {string} [options.entity_type] - Type of entity affected
 * @param {string} [options.entity_id] - ID of entity affected
 * @param {Object} [options.metadata] - Additional event data
 * @param {string} [options.tenant_id] - Override tenant ID (if known)
 * @param {string} [options.user_id] - Override user ID (if known)
 * @returns {Promise<{success: boolean, id?: string, error?: string}>}
 */
export async function logAudit(req, options) {
  try {
    const supabase = getSupabaseClient();

    // Get context from request or use provided values
    const { userId: contextUserId, tenantId: contextTenantId } = await getUserContext(req);

    const userId = options.user_id || contextUserId;
    const tenantId = options.tenant_id || contextTenantId;

    // Tenant ID is required for audit logs
    if (!tenantId) {
      console.warn('Audit log skipped: No tenant_id available', { event_type: options.event_type });
      return { success: false, error: 'No tenant_id available' };
    }

    const { data, error } = await supabase.rpc('record_audit_event', {
      p_tenant_id: tenantId,
      p_user_id: userId,
      p_event_type: options.event_type,
      p_entity_type: options.entity_type || null,
      p_entity_id: options.entity_id?.toString() || null,
      p_metadata: options.metadata || {},
      p_ip_address: getClientIp(req),
      p_user_agent: getUserAgent(req),
    });

    if (error) {
      console.error('Failed to record audit event:', error);
      return { success: false, error: error.message };
    }

    return { success: true, id: data };
  } catch (error) {
    console.error('Audit logging error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Log audit event with explicit tenant and user IDs
 * Use when request context is not available
 *
 * @param {Object} options - Event details
 * @param {string} options.tenant_id - Tenant ID
 * @param {string} [options.user_id] - User ID (optional)
 * @param {string} options.event_type - Type of event
 * @param {string} [options.entity_type] - Type of entity affected
 * @param {string} [options.entity_id] - ID of entity affected
 * @param {Object} [options.metadata] - Additional event data
 * @returns {Promise<{success: boolean, id?: string, error?: string}>}
 */
export async function logAuditDirect(options) {
  try {
    const supabase = getSupabaseClient();

    if (!options.tenant_id) {
      console.warn('Audit log skipped: No tenant_id provided', { event_type: options.event_type });
      return { success: false, error: 'No tenant_id provided' };
    }

    const { data, error } = await supabase.rpc('record_audit_event', {
      p_tenant_id: options.tenant_id,
      p_user_id: options.user_id || null,
      p_event_type: options.event_type,
      p_entity_type: options.entity_type || null,
      p_entity_id: options.entity_id?.toString() || null,
      p_metadata: options.metadata || {},
      p_ip_address: null,
      p_user_agent: null,
    });

    if (error) {
      console.error('Failed to record audit event:', error);
      return { success: false, error: error.message };
    }

    return { success: true, id: data };
  } catch (error) {
    console.error('Audit logging error:', error);
    return { success: false, error: error.message };
  }
}

// ============================================================================
// SYSTEM EVENT LOGGING
// ============================================================================

/**
 * Log a system event (super admin only viewing)
 *
 * @param {Object} options - Event details
 * @param {string} options.source - Event source (use SYSTEM_EVENT_SOURCES)
 * @param {string} options.event_type - Type of event
 * @param {Object} [options.details] - Additional event data
 * @param {string} [options.severity] - Severity level (use SEVERITY_LEVELS)
 * @returns {Promise<{success: boolean, id?: string, error?: string}>}
 */
export async function logSystem(options) {
  try {
    const supabase = getSupabaseClient();

    const { data, error } = await supabase.rpc('record_system_event', {
      p_source: options.source || SYSTEM_EVENT_SOURCES.API,
      p_event_type: options.event_type,
      p_details: options.details || {},
      p_severity: options.severity || SEVERITY_LEVELS.INFO,
    });

    if (error) {
      console.error('Failed to record system event:', error);
      return { success: false, error: error.message };
    }

    return { success: true, id: data };
  } catch (error) {
    console.error('System logging error:', error);
    return { success: false, error: error.message };
  }
}

// ============================================================================
// MIDDLEWARE WRAPPER
// ============================================================================

/**
 * Middleware wrapper that automatically logs audit events for API actions
 *
 * @param {Object} config - Configuration
 * @param {string} config.event_type - Event type to log
 * @param {string} [config.entity_type] - Entity type
 * @param {Function} [config.getEntityId] - Function to extract entity ID from req/result
 * @param {Function} [config.getMetadata] - Function to extract metadata from req/result
 * @param {Function} handler - Route handler
 * @returns {Function}
 */
export function withAuditLogging(config, handler) {
  return async (req, res) => {
    const originalJson = res.json.bind(res);
    let responseData = null;

    // Wrap res.json to capture response
    res.json = (data) => {
      responseData = data;
      return originalJson(data);
    };

    try {
      // Execute the handler
      await handler(req, res);

      // Only log if successful
      if (res.statusCode >= 200 && res.statusCode < 300 && responseData?.success !== false) {
        const entityId = config.getEntityId
          ? config.getEntityId(req, responseData)
          : req.query?.id || req.body?.id || responseData?.data?.id;

        const metadata = config.getMetadata ? config.getMetadata(req, responseData) : {};

        await logAudit(req, {
          event_type: config.event_type,
          entity_type: config.entity_type,
          entity_id: entityId,
          metadata,
        });
      }
    } catch (error) {
      // Log error as system event
      await logSystem({
        source: SYSTEM_EVENT_SOURCES.API,
        event_type: `error.${config.event_type}`,
        severity: SEVERITY_LEVELS.ERROR,
        details: {
          error: error.message,
          path: req.url,
          method: req.method,
        },
      });

      throw error;
    }
  };
}

// ============================================================================
// QUERY FUNCTIONS (for retrieval)
// ============================================================================

/**
 * Get audit logs for a tenant
 *
 * @param {string} tenantId - Tenant ID
 * @param {Object} [options] - Query options
 * @returns {Promise<Object>}
 */
export async function getAuditLogs(tenantId, options = {}) {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase.rpc('get_tenant_audit_logs', {
    p_tenant_id: tenantId,
    p_limit: options.limit || 50,
    p_offset: options.offset || 0,
    p_event_type: options.event_type || null,
    p_entity_type: options.entity_type || null,
    p_user_id: options.user_id || null,
    p_start_date: options.start_date || null,
    p_end_date: options.end_date || null,
  });

  if (error) throw error;

  // Get total count
  const { data: countData, error: countError } = await supabase.rpc('count_tenant_audit_logs', {
    p_tenant_id: tenantId,
    p_event_type: options.event_type || null,
    p_entity_type: options.entity_type || null,
    p_user_id: options.user_id || null,
    p_start_date: options.start_date || null,
    p_end_date: options.end_date || null,
  });

  if (countError) throw countError;

  return {
    logs: data || [],
    total: countData || 0,
    page: Math.floor((options.offset || 0) / (options.limit || 50)) + 1,
    limit: options.limit || 50,
  };
}

/**
 * Get system events (super admin only)
 *
 * @param {Object} [options] - Query options
 * @returns {Promise<Object>}
 */
export async function getSystemEvents(options = {}) {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase.rpc('get_system_events', {
    p_limit: options.limit || 50,
    p_offset: options.offset || 0,
    p_source: options.source || null,
    p_event_type: options.event_type || null,
    p_severity: options.severity || null,
    p_start_date: options.start_date || null,
    p_end_date: options.end_date || null,
  });

  if (error) throw error;

  return {
    events: data || [],
    page: Math.floor((options.offset || 0) / (options.limit || 50)) + 1,
    limit: options.limit || 50,
  };
}

/**
 * Get distinct event types for filtering
 *
 * @param {string} tenantId - Tenant ID
 * @returns {Promise<Array>}
 */
export async function getEventTypes(tenantId) {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase.rpc('get_audit_event_types', {
    p_tenant_id: tenantId,
  });

  if (error) throw error;
  return data || [];
}

/**
 * Get distinct entity types for filtering
 *
 * @param {string} tenantId - Tenant ID
 * @returns {Promise<Array>}
 */
export async function getEntityTypes(tenantId) {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase.rpc('get_audit_entity_types', {
    p_tenant_id: tenantId,
  });

  if (error) throw error;
  return data || [];
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  logAudit,
  logAuditDirect,
  logSystem,
  withAuditLogging,
  getAuditLogs,
  getSystemEvents,
  getEventTypes,
  getEntityTypes,
  AUDIT_EVENT_TYPES,
  SYSTEM_EVENT_SOURCES,
  SEVERITY_LEVELS,
};
