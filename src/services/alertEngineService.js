/**
 * Alert Engine Service
 *
 * Core service for raising, coalescing, and managing system alerts.
 * Handles device offline, content errors, sync failures, and other issues.
 */

import { supabase } from '../supabase';
import { getEffectiveOwnerId } from './tenantService';
import {
  dispatchAlertNotifications,
  dispatchResolvedNotification,
} from './notificationDispatcherService';

// ============================================================================
// STRUCTURED LOGGING
// ============================================================================

/**
 * Create a structured log context for alert operations
 */
function createLogContext(params = {}) {
  return {
    tenant_id: params.tenantId || null,
    alert_type: params.type || null,
    alert_id: params.alertId || null,
    device_id: params.deviceId || null,
    scene_id: params.sceneId || null,
    schedule_id: params.scheduleId || null,
    data_source_id: params.dataSourceId || null,
    severity: params.severity || null,
    is_new: params.isNew ?? null,
    is_resolved: params.isResolved ?? null,
    occurrences: params.occurrences || null,
  };
}

/**
 * Structured log helper - logs with consistent format and context
 */
function structuredLog(level, message, context = {}) {
  const timestamp = new Date().toISOString();
  const prefix = '[AlertEngine]';

  // Filter out null/undefined values for cleaner logs
  const cleanContext = Object.fromEntries(
    Object.entries(context).filter(([_, v]) => v != null)
  );

  const contextStr = Object.keys(cleanContext).length > 0
    ? ` ${JSON.stringify(cleanContext)}`
    : '';

  switch (level) {
    case 'error':
      console.error(`${prefix} ${message}${contextStr}`);
      break;
    case 'warn':
      console.warn(`${prefix} ${message}${contextStr}`);
      break;
    case 'info':
      console.log(`${prefix} ${message}${contextStr}`);
      break;
    case 'debug':
      // Only log debug in development
      if (typeof process !== 'undefined' && process.env?.NODE_ENV === 'development') {
        console.log(`${prefix} [DEBUG] ${message}${contextStr}`);
      }
      break;
    default:
      console.log(`${prefix} ${message}${contextStr}`);
  }
}

// ============================================================================
// PERFORMANCE MEASUREMENT
// ============================================================================

/**
 * Performance metrics tracking
 * Tracks timing, counters, and slow operations
 */
const performanceMetrics = {
  counters: {
    alertsRaised: 0,
    alertsCoalesced: 0,
    alertsResolved: 0,
    alertsDroppedRateLimit: 0,
    alertsDroppedValidation: 0,
    notificationsSent: 0,
    notificationsFailed: 0,
  },
  timings: {
    raiseAlert: [],
    coalesceAlert: [],
    autoResolveAlert: [],
    findExistingAlert: [],
  },
  slowOperationThresholdMs: 300,
};

/**
 * Start a performance timer
 */
function startTimer() {
  return Date.now();
}

/**
 * End a performance timer and record the duration
 * Logs a warning if operation took longer than threshold
 */
function endTimer(startTime, operation, context = {}) {
  const duration = Date.now() - startTime;

  // Keep last 100 timings per operation
  if (performanceMetrics.timings[operation]) {
    performanceMetrics.timings[operation].push(duration);
    if (performanceMetrics.timings[operation].length > 100) {
      performanceMetrics.timings[operation].shift();
    }
  }

  // Log slow operations
  if (duration > performanceMetrics.slowOperationThresholdMs) {
    structuredLog('warn', `Slow operation: ${operation} took ${duration}ms`, {
      ...context,
      duration_ms: duration,
      threshold_ms: performanceMetrics.slowOperationThresholdMs,
    });
  }

  return duration;
}

/**
 * Increment a performance counter
 */
function incrementCounter(counter) {
  if (performanceMetrics.counters[counter] !== undefined) {
    performanceMetrics.counters[counter]++;
  }
}

/**
 * Get performance metrics snapshot
 */
export function getPerformanceMetrics() {
  const metrics = {
    counters: { ...performanceMetrics.counters },
    averageTimings: {},
    slowOperationThresholdMs: performanceMetrics.slowOperationThresholdMs,
  };

  // Calculate average timings
  for (const [operation, timings] of Object.entries(performanceMetrics.timings)) {
    if (timings.length > 0) {
      const sum = timings.reduce((a, b) => a + b, 0);
      metrics.averageTimings[operation] = {
        avg: Math.round(sum / timings.length),
        min: Math.min(...timings),
        max: Math.max(...timings),
        samples: timings.length,
      };
    }
  }

  return metrics;
}

/**
 * Reset performance metrics (for testing)
 */
export function resetPerformanceMetrics() {
  for (const key of Object.keys(performanceMetrics.counters)) {
    performanceMetrics.counters[key] = 0;
  }
  for (const key of Object.keys(performanceMetrics.timings)) {
    performanceMetrics.timings[key] = [];
  }
}

/**
 * Configure slow operation threshold
 */
export function setSlowOperationThreshold(thresholdMs) {
  performanceMetrics.slowOperationThresholdMs = thresholdMs;
}

// ============================================================================
// RATE LIMITING & THROTTLING
// ============================================================================

/**
 * Rate limiting configuration
 * Prevents alert spam by limiting new alerts per source per time window
 */
const RATE_LIMIT_CONFIG = {
  maxAlertsPerWindow: 5, // Max alerts per device/source per window
  windowMs: 60000, // 1 minute window
  enabled: true, // Can be disabled for testing
};

// In-memory rate limit tracking (resets on server restart)
// Key: `${type}:${deviceId || dataSourceId || tenantId}` -> { count, windowStart }
const rateLimitBuckets = new Map();

/**
 * Clean up expired rate limit buckets (call periodically)
 */
function cleanupRateLimitBuckets() {
  const now = Date.now();
  for (const [key, bucket] of rateLimitBuckets.entries()) {
    if (now - bucket.windowStart > RATE_LIMIT_CONFIG.windowMs * 2) {
      rateLimitBuckets.delete(key);
    }
  }
}

// Cleanup old buckets every 5 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(cleanupRateLimitBuckets, 5 * 60 * 1000);
}

/**
 * Generate a rate limit key for an alert
 */
function getRateLimitKey({ type, deviceId, dataSourceId, tenantId }) {
  // Prefer more specific identifiers
  const sourceId = deviceId || dataSourceId || tenantId || 'global';
  return `${type}:${sourceId}`;
}

/**
 * Check if alert should be rate limited
 * Returns { limited: boolean, remaining: number, resetIn: number }
 */
function checkRateLimit(params) {
  if (!RATE_LIMIT_CONFIG.enabled) {
    return { limited: false, remaining: RATE_LIMIT_CONFIG.maxAlertsPerWindow, resetIn: 0 };
  }

  const key = getRateLimitKey(params);
  const now = Date.now();

  let bucket = rateLimitBuckets.get(key);

  // Reset bucket if window expired
  if (!bucket || now - bucket.windowStart > RATE_LIMIT_CONFIG.windowMs) {
    bucket = { count: 0, windowStart: now };
    rateLimitBuckets.set(key, bucket);
  }

  const remaining = RATE_LIMIT_CONFIG.maxAlertsPerWindow - bucket.count;
  const resetIn = RATE_LIMIT_CONFIG.windowMs - (now - bucket.windowStart);

  if (bucket.count >= RATE_LIMIT_CONFIG.maxAlertsPerWindow) {
    return { limited: true, remaining: 0, resetIn };
  }

  return { limited: false, remaining, resetIn };
}

/**
 * Record an alert for rate limiting
 */
function recordAlertForRateLimit(params) {
  if (!RATE_LIMIT_CONFIG.enabled) return;

  const key = getRateLimitKey(params);
  const bucket = rateLimitBuckets.get(key);

  if (bucket) {
    bucket.count++;
  }
}

/**
 * Configure rate limiting (for testing or runtime adjustment)
 */
export function configureRateLimit(config) {
  if (config.maxAlertsPerWindow !== undefined) {
    RATE_LIMIT_CONFIG.maxAlertsPerWindow = config.maxAlertsPerWindow;
  }
  if (config.windowMs !== undefined) {
    RATE_LIMIT_CONFIG.windowMs = config.windowMs;
  }
  if (config.enabled !== undefined) {
    RATE_LIMIT_CONFIG.enabled = config.enabled;
  }
}

/**
 * Get current rate limit configuration
 */
export function getRateLimitConfig() {
  return { ...RATE_LIMIT_CONFIG };
}

/**
 * Reset rate limit state (for testing)
 */
export function resetRateLimits() {
  rateLimitBuckets.clear();
}

// ============================================================================
// SEVERITY AUTO-ESCALATION
// ============================================================================

/**
 * Escalation rules configuration
 * Defines when alerts should automatically escalate from warning → critical
 */
const ESCALATION_RULES = {
  device_offline: {
    // Escalate to critical after 30 minutes offline
    escalateToCriticalAfterMinutes: 30,
  },
  device_screenshot_failed: {
    // Escalate to critical after 5 consecutive failures
    escalateToCriticalAfterFailures: 5,
  },
  data_source_sync_failed: {
    // Escalate to critical after 3 failures in 24h
    escalateToCriticalAfterOccurrences: 3,
    occurrenceWindowHours: 24,
  },
  social_feed_sync_failed: {
    // Escalate to critical after 5 failures in 24h
    escalateToCriticalAfterOccurrences: 5,
    occurrenceWindowHours: 24,
  },
  device_cache_stale: {
    // Escalate to critical after 24 hours stale
    escalateToCriticalAfterHours: 24,
  },
};

/**
 * Check if severity should be escalated based on rules
 * Returns the escalated severity or the original if no escalation needed
 */
function checkSeverityEscalation({ type, currentSeverity, meta, occurrences, createdAt }) {
  // Already critical - no escalation needed
  if (currentSeverity === ALERT_SEVERITIES.CRITICAL) {
    return currentSeverity;
  }

  const rules = ESCALATION_RULES[type];
  if (!rules) {
    return currentSeverity;
  }

  // Check time-based escalation (device_offline)
  if (rules.escalateToCriticalAfterMinutes && meta?.minutes_offline) {
    if (meta.minutes_offline >= rules.escalateToCriticalAfterMinutes) {
      return ALERT_SEVERITIES.CRITICAL;
    }
  }

  // Check hours-based escalation (device_cache_stale)
  if (rules.escalateToCriticalAfterHours && meta?.hours_stale) {
    if (meta.hours_stale >= rules.escalateToCriticalAfterHours) {
      return ALERT_SEVERITIES.CRITICAL;
    }
  }

  // Check failure count escalation (screenshot failures)
  if (rules.escalateToCriticalAfterFailures && meta?.failure_count) {
    if (meta.failure_count >= rules.escalateToCriticalAfterFailures) {
      return ALERT_SEVERITIES.CRITICAL;
    }
  }

  // Check occurrence-based escalation (sync failures)
  if (rules.escalateToCriticalAfterOccurrences && occurrences) {
    // Check if occurrences are within the time window
    if (rules.occurrenceWindowHours && createdAt) {
      const windowMs = rules.occurrenceWindowHours * 60 * 60 * 1000;
      const alertAge = Date.now() - new Date(createdAt).getTime();
      if (alertAge <= windowMs && occurrences >= rules.escalateToCriticalAfterOccurrences) {
        return ALERT_SEVERITIES.CRITICAL;
      }
    } else if (occurrences >= rules.escalateToCriticalAfterOccurrences) {
      return ALERT_SEVERITIES.CRITICAL;
    }
  }

  return currentSeverity;
}

/**
 * Get escalation rules (for testing/debugging)
 */
export function getEscalationRules() {
  return { ...ESCALATION_RULES };
}

// ============================================================================
// ALERT TYPES
// ============================================================================

export const ALERT_TYPES = {
  DEVICE_OFFLINE: 'device_offline',
  DEVICE_SCREENSHOT_FAILED: 'device_screenshot_failed',
  DEVICE_CACHE_STALE: 'device_cache_stale',
  DEVICE_ERROR: 'device_error',
  SCHEDULE_MISSING_SCENE: 'schedule_missing_scene',
  SCHEDULE_CONFLICT: 'schedule_conflict',
  DATA_SOURCE_SYNC_FAILED: 'data_source_sync_failed',
  SOCIAL_FEED_SYNC_FAILED: 'social_feed_sync_failed',
  CONTENT_EXPIRED: 'content_expired',
  STORAGE_QUOTA_WARNING: 'storage_quota_warning',
  API_RATE_LIMIT: 'api_rate_limit',
};

export const ALERT_SEVERITIES = {
  INFO: 'info',
  WARNING: 'warning',
  CRITICAL: 'critical',
};

export const ALERT_STATUSES = {
  OPEN: 'open',
  ACKNOWLEDGED: 'acknowledged',
  RESOLVED: 'resolved',
};

// Severity levels for comparison (higher = more severe)
const SEVERITY_LEVELS = {
  info: 1,
  warning: 2,
  critical: 3,
};

// ============================================================================
// RAISE ALERT
// ============================================================================

/**
 * Raise a new alert or coalesce with an existing open alert
 *
 * @param {Object} params Alert parameters
 * @param {string} params.type Alert type (from ALERT_TYPES)
 * @param {string} params.severity Alert severity (from ALERT_SEVERITIES)
 * @param {string} params.title Alert title
 * @param {string} [params.message] Detailed message
 * @param {string} [params.tenantId] Tenant ID (auto-detected if not provided)
 * @param {string} [params.deviceId] Related device ID
 * @param {string} [params.sceneId] Related scene ID
 * @param {string} [params.scheduleId] Related schedule ID
 * @param {string} [params.dataSourceId] Related data source ID
 * @param {Object} [params.meta] Additional metadata
 * @returns {Promise<{alertId: string, isNew: boolean}>}
 */
export async function raiseAlert({
  type,
  severity,
  title,
  message = null,
  tenantId = null,
  deviceId = null,
  sceneId = null,
  scheduleId = null,
  dataSourceId = null,
  meta = {},
}) {
  const timerStart = startTimer();
  const logContext = createLogContext({
    type,
    severity,
    tenantId,
    deviceId,
    sceneId,
    scheduleId,
    dataSourceId,
  });

  try {
    // Validate alert type
    const validTypes = Object.values(ALERT_TYPES);
    if (!validTypes.includes(type)) {
      structuredLog('warn', `Dropping alert: invalid type "${type}"`, logContext);
      incrementCounter('alertsDroppedValidation');
      endTimer(timerStart, 'raiseAlert', logContext);
      return { alertId: null, isNew: false };
    }

    // Validate severity
    const validSeverities = Object.values(ALERT_SEVERITIES);
    if (!validSeverities.includes(severity)) {
      structuredLog('warn', `Dropping alert: invalid severity "${severity}"`, logContext);
      incrementCounter('alertsDroppedValidation');
      endTimer(timerStart, 'raiseAlert', logContext);
      return { alertId: null, isNew: false };
    }

    // Get tenant ID if not provided
    const effectiveTenantId = tenantId || (await getEffectiveOwnerId());
    logContext.tenant_id = effectiveTenantId;

    if (!effectiveTenantId) {
      structuredLog('warn', 'Dropping alert: no tenant ID available', logContext);
      incrementCounter('alertsDroppedValidation');
      endTimer(timerStart, 'raiseAlert', logContext);
      return { alertId: null, isNew: false };
    }

    // Check rate limiting (only for new alerts, not coalescing)
    const rateLimitParams = { type, deviceId, dataSourceId, tenantId: effectiveTenantId };
    const rateLimit = checkRateLimit(rateLimitParams);
    if (rateLimit.limited) {
      structuredLog('warn', `Alert rate limited (${rateLimit.resetIn}ms until reset)`, {
        ...logContext,
        rate_limit_key: getRateLimitKey(rateLimitParams),
        reset_in_ms: rateLimit.resetIn,
      });
      // Note: We still check for existing alerts to allow coalescing
      // Rate limiting only prevents NEW alert creation spam
    }

    // Check for existing open alert
    const existingAlert = await findExistingAlert({
      tenantId: effectiveTenantId,
      type,
      deviceId,
      sceneId,
      scheduleId,
      dataSourceId,
    });

    if (existingAlert) {
      // Coalesce with existing alert (dedup - don't create duplicate alerts)
      // This prevents notification spam for repeated failures of the same condition
      const updatedAlert = await coalesceAlert(existingAlert.id, {
        severity,
        message,
        meta,
      });

      logContext.alert_id = updatedAlert?.id || existingAlert.id;
      logContext.is_new = false;
      logContext.occurrences = updatedAlert?.occurrences;

      structuredLog('info', 'Alert coalesced (deduplicated)', logContext);

      // Dispatch notifications for coalesced alert (isNewAlert=false to skip email)
      // Only in-app notifications are updated for coalesced alerts
      if (updatedAlert) {
        try {
          await dispatchAlertNotifications(updatedAlert, false);
        } catch (notifyError) {
          // Log but don't break the alert workflow
          structuredLog('warn', `Notification dispatch failed (non-fatal): ${notifyError.message}`, logContext);
        }
      }

      incrementCounter('alertsCoalesced');
      endTimer(timerStart, 'raiseAlert', logContext);
      return { alertId: updatedAlert?.id || existingAlert.id, isNew: false };
    }

    // For NEW alerts (no existing alert to coalesce), check rate limit
    if (rateLimit.limited) {
      structuredLog('warn', 'Dropping new alert due to rate limit', {
        ...logContext,
        rate_limit_key: getRateLimitKey(rateLimitParams),
        reset_in_ms: rateLimit.resetIn,
      });
      incrementCounter('alertsDroppedRateLimit');
      endTimer(timerStart, 'raiseAlert', logContext);
      return { alertId: null, isNew: false, rateLimited: true };
    }

    // Record this alert for rate limiting
    recordAlertForRateLimit(rateLimitParams);

    // Create new alert
    const { data, error } = await supabase
      .from('alerts')
      .insert({
        tenant_id: effectiveTenantId,
        type,
        severity,
        title,
        message,
        device_id: deviceId,
        scene_id: sceneId,
        schedule_id: scheduleId,
        data_source_id: dataSourceId,
        meta,
      })
      .select()
      .single();

    if (error) {
      structuredLog('error', `Failed to create alert: ${error.message}`, logContext);
      throw error;
    }

    logContext.alert_id = data.id;
    logContext.is_new = true;
    logContext.occurrences = 1;

    structuredLog('info', `New alert created: ${title}`, logContext);

    // Dispatch notifications for new alert (isNewAlert=true to send email)
    try {
      await dispatchAlertNotifications(data, true);
      incrementCounter('notificationsSent');
    } catch (notifyError) {
      // Log but don't break the alert workflow
      structuredLog('warn', `Notification dispatch failed (non-fatal): ${notifyError.message}`, logContext);
      incrementCounter('notificationsFailed');
    }

    incrementCounter('alertsRaised');
    endTimer(timerStart, 'raiseAlert', logContext);
    return { alertId: data.id, isNew: true };
  } catch (error) {
    structuredLog('error', `Error raising alert: ${error.message}`, logContext);
    endTimer(timerStart, 'raiseAlert', logContext);
    throw error;
  }
}

/**
 * Find an existing open alert matching the criteria
 */
async function findExistingAlert({
  tenantId,
  type,
  deviceId,
  sceneId,
  scheduleId,
  dataSourceId,
}) {
  let query = supabase
    .from('alerts')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('type', type)
    .eq('status', 'open');

  // Match on related entities (null-safe)
  if (deviceId) {
    query = query.eq('device_id', deviceId);
  } else {
    query = query.is('device_id', null);
  }

  if (sceneId) {
    query = query.eq('scene_id', sceneId);
  } else {
    query = query.is('scene_id', null);
  }

  if (scheduleId) {
    query = query.eq('schedule_id', scheduleId);
  } else {
    query = query.is('schedule_id', null);
  }

  if (dataSourceId) {
    query = query.eq('data_source_id', dataSourceId);
  } else {
    query = query.is('data_source_id', null);
  }

  const { data, error } = await query.limit(1).single();

  if (error && error.code !== 'PGRST116') {
    console.error('[AlertEngine] Error finding existing alert:', error);
  }

  return data;
}

/**
 * Coalesce an alert (increment occurrences, update timestamp)
 */
async function coalesceAlert(alertId, { severity, message, meta }) {
  const logContext = createLogContext({ alertId });

  const { data: current } = await supabase
    .from('alerts')
    .select('severity, meta, occurrences, type, tenant_id, created_at')
    .eq('id', alertId)
    .single();

  if (!current) {
    structuredLog('warn', 'Cannot coalesce: alert not found', logContext);
    return null;
  }

  logContext.alert_type = current.type;
  logContext.tenant_id = current.tenant_id;
  logContext.severity = current.severity;

  // Merge metadata first (needed for escalation check)
  const mergedMeta = { ...current.meta, ...meta };
  const newOccurrences = current.occurrences + 1;

  // Check for auto-escalation based on rules
  const escalatedSeverity = checkSeverityEscalation({
    type: current.type,
    currentSeverity: current.severity,
    meta: mergedMeta,
    occurrences: newOccurrences,
    createdAt: current.created_at,
  });

  // Determine final severity (max of: current, requested, escalated)
  let finalSeverity = current.severity;
  if (SEVERITY_LEVELS[severity] > SEVERITY_LEVELS[finalSeverity]) {
    finalSeverity = severity;
  }
  if (SEVERITY_LEVELS[escalatedSeverity] > SEVERITY_LEVELS[finalSeverity]) {
    finalSeverity = escalatedSeverity;
  }
  const severityEscalated = finalSeverity !== current.severity;

  const { data, error } = await supabase
    .from('alerts')
    .update({
      occurrences: newOccurrences,
      last_occurred_at: new Date().toISOString(),
      severity: finalSeverity,
      meta: mergedMeta,
      message: message || undefined,
    })
    .eq('id', alertId)
    .select()
    .single();

  if (error) {
    structuredLog('error', `Error coalescing alert: ${error.message}`, logContext);
    return null;
  }

  logContext.occurrences = data.occurrences;
  if (severityEscalated) {
    logContext.severity = finalSeverity;
    structuredLog('info', `Alert auto-escalated: ${current.severity} → ${finalSeverity}`, {
      ...logContext,
      escalation_reason: escalatedSeverity === finalSeverity ? 'auto-escalation-rule' : 'requested-severity',
    });
  }

  return data;
}

// ============================================================================
// ACKNOWLEDGE ALERT
// ============================================================================

/**
 * Acknowledge an alert (marks as seen but not resolved)
 *
 * @param {string} alertId Alert ID to acknowledge
 * @returns {Promise<boolean>} Success status
 */
export async function acknowledgeAlert(alertId) {
  try {
    const { data: user } = await supabase.auth.getUser();

    const { error } = await supabase
      .from('alerts')
      .update({
        status: ALERT_STATUSES.ACKNOWLEDGED,
        acknowledged_by: user?.user?.id,
        acknowledged_at: new Date().toISOString(),
      })
      .eq('id', alertId)
      .eq('status', ALERT_STATUSES.OPEN);

    if (error) {
      console.error('[AlertEngine] Error acknowledging alert:', error);
      return false;
    }

    console.log(`[AlertEngine] Acknowledged alert ${alertId}`);
    return true;
  } catch (error) {
    console.error('[AlertEngine] Error acknowledging alert:', error);
    return false;
  }
}

// ============================================================================
// RESOLVE ALERT
// ============================================================================

/**
 * Resolve an alert (marks as fixed)
 *
 * @param {string} alertId Alert ID to resolve
 * @param {string} [notes] Resolution notes
 * @returns {Promise<boolean>} Success status
 */
export async function resolveAlert(alertId, notes = null) {
  try {
    const { data: user } = await supabase.auth.getUser();

    const { error } = await supabase
      .from('alerts')
      .update({
        status: ALERT_STATUSES.RESOLVED,
        resolved_by: user?.user?.id,
        resolved_at: new Date().toISOString(),
        resolution_notes: notes,
      })
      .eq('id', alertId)
      .in('status', [ALERT_STATUSES.OPEN, ALERT_STATUSES.ACKNOWLEDGED]);

    if (error) {
      console.error('[AlertEngine] Error resolving alert:', error);
      return false;
    }

    console.log(`[AlertEngine] Resolved alert ${alertId}`);
    return true;
  } catch (error) {
    console.error('[AlertEngine] Error resolving alert:', error);
    return false;
  }
}

// ============================================================================
// AUTO-RESOLVE ALERT
// ============================================================================

/**
 * Auto-resolve alerts when the underlying condition clears
 *
 * @param {Object} params Parameters matching the alert to resolve
 * @returns {Promise<number>} Number of alerts resolved
 */
export async function autoResolveAlert({
  type,
  tenantId = null,
  deviceId = null,
  sceneId = null,
  scheduleId = null,
  dataSourceId = null,
  notes = 'Auto-resolved: condition cleared',
}) {
  const timerStart = startTimer();
  const logContext = createLogContext({
    type,
    tenantId,
    deviceId,
    sceneId,
    scheduleId,
    dataSourceId,
    isResolved: true,
  });

  try {
    const effectiveTenantId = tenantId || (await getEffectiveOwnerId());
    logContext.tenant_id = effectiveTenantId;

    if (!effectiveTenantId) {
      structuredLog('debug', 'Auto-resolve skipped: no tenant ID', logContext);
      endTimer(timerStart, 'autoResolveAlert', logContext);
      return 0;
    }

    let query = supabase
      .from('alerts')
      .update({
        status: ALERT_STATUSES.RESOLVED,
        resolved_at: new Date().toISOString(),
        resolution_notes: notes,
      })
      .eq('tenant_id', effectiveTenantId)
      .eq('type', type)
      .in('status', [ALERT_STATUSES.OPEN, ALERT_STATUSES.ACKNOWLEDGED]);

    if (deviceId) {
      query = query.eq('device_id', deviceId);
    }
    if (sceneId) {
      query = query.eq('scene_id', sceneId);
    }
    if (scheduleId) {
      query = query.eq('schedule_id', scheduleId);
    }
    if (dataSourceId) {
      query = query.eq('data_source_id', dataSourceId);
    }

    const { data, error } = await query.select();

    if (error) {
      structuredLog('error', `Error auto-resolving alerts: ${error.message}`, logContext);
      endTimer(timerStart, 'autoResolveAlert', logContext);
      return 0;
    }

    const count = data?.length || 0;
    if (count > 0) {
      structuredLog('info', `Auto-resolved ${count} alert(s)`, {
        ...logContext,
        resolved_count: count,
        alert_ids: data.map(a => a.id),
      });

      // Update counter for resolved alerts
      for (let i = 0; i < count; i++) {
        incrementCounter('alertsResolved');
      }

      // Dispatch resolved notifications for each resolved alert
      for (const resolvedAlert of data) {
        try {
          await dispatchResolvedNotification(resolvedAlert, notes);
        } catch (notifyError) {
          // Log but don't break the resolve workflow
          structuredLog('warn', `Resolved notification dispatch failed (non-fatal): ${notifyError.message}`, {
            ...logContext,
            alert_id: resolvedAlert.id,
          });
        }
      }
    }
    endTimer(timerStart, 'autoResolveAlert', logContext);
    return count;
  } catch (error) {
    structuredLog('error', `Error auto-resolving alerts: ${error.message}`, logContext);
    endTimer(timerStart, 'autoResolveAlert', logContext);
    return 0;
  }
}

// ============================================================================
// FETCH ALERTS
// ============================================================================

/**
 * Get alerts for the current tenant with optional filters
 *
 * @param {Object} [filters] Filter options
 * @param {string} [filters.status] Filter by status
 * @param {string} [filters.severity] Filter by severity
 * @param {string} [filters.type] Filter by type
 * @param {string} [filters.deviceId] Filter by device
 * @param {string} [filters.sceneId] Filter by scene
 * @param {number} [filters.limit] Max results
 * @param {number} [filters.offset] Offset for pagination
 * @returns {Promise<{data: Array, count: number}>}
 */
export async function getAlerts({
  status = null,
  severity = null,
  type = null,
  deviceId = null,
  sceneId = null,
  limit = 50,
  offset = 0,
} = {}) {
  try {
    let query = supabase
      .from('alerts')
      .select(
        `
        *,
        device:tv_devices(id, name, status),
        scene:scenes(id, name),
        schedule:schedules(id, name),
        data_source:data_sources(id, name)
      `,
        { count: 'exact' }
      )
      .order('last_occurred_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (status) {
      query = query.eq('status', status);
    }
    if (severity) {
      query = query.eq('severity', severity);
    }
    if (type) {
      query = query.eq('type', type);
    }
    if (deviceId) {
      query = query.eq('device_id', deviceId);
    }
    if (sceneId) {
      query = query.eq('scene_id', sceneId);
    }

    const { data, error, count } = await query;

    if (error) {
      console.error('[AlertEngine] Error fetching alerts:', error);
      throw error;
    }

    return { data: data || [], count: count || 0 };
  } catch (error) {
    console.error('[AlertEngine] Error fetching alerts:', error);
    throw error;
  }
}

/**
 * Get a single alert by ID
 *
 * @param {string} alertId Alert ID
 * @returns {Promise<Object|null>}
 */
export async function getAlert(alertId) {
  try {
    const { data, error } = await supabase
      .from('alerts')
      .select(
        `
        *,
        device:tv_devices(id, name, status),
        scene:scenes(id, name),
        schedule:schedules(id, name),
        data_source:data_sources(id, name),
        acknowledged_user:profiles!acknowledged_by(id, full_name),
        resolved_user:profiles!resolved_by(id, full_name)
      `
      )
      .eq('id', alertId)
      .single();

    if (error) {
      console.error('[AlertEngine] Error fetching alert:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('[AlertEngine] Error fetching alert:', error);
    return null;
  }
}

/**
 * Get alert summary counts for the current tenant
 *
 * @returns {Promise<Object>} Summary counts
 */
export async function getAlertSummary() {
  try {
    const { data, error } = await supabase.from('alerts').select('status, severity');

    if (error) {
      console.error('[AlertEngine] Error fetching alert summary:', error);
      return {
        open: 0,
        critical: 0,
        warning: 0,
        info: 0,
        acknowledged: 0,
      };
    }

    const summary = {
      open: 0,
      critical: 0,
      warning: 0,
      info: 0,
      acknowledged: 0,
    };

    data?.forEach((alert) => {
      if (alert.status === 'open') {
        summary.open++;
        if (alert.severity === 'critical') summary.critical++;
        if (alert.severity === 'warning') summary.warning++;
        if (alert.severity === 'info') summary.info++;
      } else if (alert.status === 'acknowledged') {
        summary.acknowledged++;
      }
    });

    return summary;
  } catch (error) {
    console.error('[AlertEngine] Error fetching alert summary:', error);
    return {
      open: 0,
      critical: 0,
      warning: 0,
      info: 0,
      acknowledged: 0,
    };
  }
}

// ============================================================================
// BULK OPERATIONS
// ============================================================================

/**
 * Bulk acknowledge multiple alerts
 *
 * @param {string[]} alertIds Array of alert IDs
 * @returns {Promise<number>} Number of alerts acknowledged
 */
export async function bulkAcknowledge(alertIds) {
  try {
    const { data: user } = await supabase.auth.getUser();

    const { data, error } = await supabase
      .from('alerts')
      .update({
        status: ALERT_STATUSES.ACKNOWLEDGED,
        acknowledged_by: user?.user?.id,
        acknowledged_at: new Date().toISOString(),
      })
      .in('id', alertIds)
      .eq('status', ALERT_STATUSES.OPEN)
      .select();

    if (error) {
      console.error('[AlertEngine] Error bulk acknowledging alerts:', error);
      return 0;
    }

    return data?.length || 0;
  } catch (error) {
    console.error('[AlertEngine] Error bulk acknowledging alerts:', error);
    return 0;
  }
}

/**
 * Bulk resolve multiple alerts
 *
 * @param {string[]} alertIds Array of alert IDs
 * @param {string} [notes] Resolution notes
 * @returns {Promise<number>} Number of alerts resolved
 */
export async function bulkResolve(alertIds, notes = null) {
  try {
    const { data: user } = await supabase.auth.getUser();

    const { data, error } = await supabase
      .from('alerts')
      .update({
        status: ALERT_STATUSES.RESOLVED,
        resolved_by: user?.user?.id,
        resolved_at: new Date().toISOString(),
        resolution_notes: notes,
      })
      .in('id', alertIds)
      .in('status', [ALERT_STATUSES.OPEN, ALERT_STATUSES.ACKNOWLEDGED])
      .select();

    if (error) {
      console.error('[AlertEngine] Error bulk resolving alerts:', error);
      return 0;
    }

    return data?.length || 0;
  } catch (error) {
    console.error('[AlertEngine] Error bulk resolving alerts:', error);
    return 0;
  }
}

// ============================================================================
// HELPER FUNCTIONS FOR SPECIFIC ALERT TYPES
// ============================================================================

/**
 * Raise a device offline alert
 */
export async function raiseDeviceOfflineAlert(device, minutesOffline) {
  const severity =
    minutesOffline >= 60
      ? ALERT_SEVERITIES.CRITICAL
      : minutesOffline >= 15
        ? ALERT_SEVERITIES.WARNING
        : ALERT_SEVERITIES.INFO;

  return raiseAlert({
    type: ALERT_TYPES.DEVICE_OFFLINE,
    severity,
    title: `Device "${device.name}" is offline`,
    message: `Device has been offline for ${minutesOffline} minutes`,
    tenantId: device.tenant_id,
    deviceId: device.id,
    meta: {
      device_name: device.name,
      minutes_offline: minutesOffline,
      last_heartbeat: device.last_heartbeat,
    },
  });
}

/**
 * Raise a screenshot failure alert
 */
export async function raiseScreenshotFailedAlert(device, failureCount, lastError) {
  return raiseAlert({
    type: ALERT_TYPES.DEVICE_SCREENSHOT_FAILED,
    severity:
      failureCount >= 5 ? ALERT_SEVERITIES.CRITICAL : ALERT_SEVERITIES.WARNING,
    title: `Screenshot capture failing for "${device.name}"`,
    message: `${failureCount} consecutive screenshot failures`,
    tenantId: device.tenant_id,
    deviceId: device.id,
    meta: {
      device_name: device.name,
      failure_count: failureCount,
      last_error: lastError,
    },
  });
}

/**
 * Raise a data source sync failure alert
 */
export async function raiseDataSourceSyncFailedAlert(dataSource, error) {
  return raiseAlert({
    type: ALERT_TYPES.DATA_SOURCE_SYNC_FAILED,
    severity: ALERT_SEVERITIES.WARNING,
    title: `Data source "${dataSource.name}" sync failed`,
    message: error?.message || 'Unknown sync error',
    tenantId: dataSource.tenant_id,
    dataSourceId: dataSource.id,
    meta: {
      data_source_name: dataSource.name,
      data_source_type: dataSource.type,
      error_message: error?.message,
      error_code: error?.code,
    },
  });
}

/**
 * Raise a social feed sync failure alert
 */
export async function raiseSocialFeedSyncFailedAlert(account, error) {
  return raiseAlert({
    type: ALERT_TYPES.SOCIAL_FEED_SYNC_FAILED,
    severity: ALERT_SEVERITIES.WARNING,
    title: `Social feed sync failed for ${account.provider}`,
    message: error?.message || 'Failed to sync social media feed',
    tenantId: account.tenant_id,
    meta: {
      account_id: account.id,
      provider: account.provider,
      account_name: account.account_name,
      error_message: error?.message,
    },
  });
}

/**
 * Raise a schedule missing scene alert
 */
export async function raiseScheduleMissingSceneAlert(schedule, missingSceneIds) {
  return raiseAlert({
    type: ALERT_TYPES.SCHEDULE_MISSING_SCENE,
    severity: ALERT_SEVERITIES.WARNING,
    title: `Schedule "${schedule.name}" has missing scenes`,
    message: `${missingSceneIds.length} scene(s) referenced but not found`,
    tenantId: schedule.tenant_id,
    scheduleId: schedule.id,
    meta: {
      schedule_name: schedule.name,
      missing_scene_ids: missingSceneIds,
    },
  });
}

/**
 * Raise a cache stale alert
 */
export async function raiseCacheStaleAlert(device, hoursStale) {
  return raiseAlert({
    type: ALERT_TYPES.DEVICE_CACHE_STALE,
    severity:
      hoursStale >= 24 ? ALERT_SEVERITIES.CRITICAL : ALERT_SEVERITIES.WARNING,
    title: `Device "${device.name}" cache is stale`,
    message: `Cache has not been updated for ${hoursStale} hours`,
    tenantId: device.tenant_id,
    deviceId: device.id,
    meta: {
      device_name: device.name,
      hours_stale: hoursStale,
    },
  });
}
