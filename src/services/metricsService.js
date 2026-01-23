/**
 * Metrics Service
 *
 * Provides client-side metrics collection and reporting.
 * Tracks request duration, errors, and performance metrics.
 */

import { supabase } from '../supabase';

import { createScopedLogger } from './loggingService.js';

const logger = createScopedLogger('MetricsService');

// Metrics buffer for batching
let metricsBuffer = [];
const FLUSH_INTERVAL = 30000; // 30 seconds
const MAX_BUFFER_SIZE = 100;
let flushTimer = null;

// Start flush timer
function startFlushTimer() {
  if (flushTimer) return;
  flushTimer = setInterval(flushMetrics, FLUSH_INTERVAL);
}

// Stop flush timer
function stopFlushTimer() {
  if (flushTimer) {
    clearInterval(flushTimer);
    flushTimer = null;
  }
}

/**
 * Record a metric event
 * @param {string} eventType - Type of event
 * @param {string} eventName - Name/identifier of the event
 * @param {Object} data - Event data
 */
export function recordMetric(eventType, eventName, data = {}) {
  const metric = {
    event_type: eventType,
    event_name: eventName,
    duration_ms: data.durationMs,
    status_code: data.statusCode,
    error_class: data.errorClass,
    error_message: data.errorMessage,
    metadata: data.metadata || {},
    timestamp: Date.now(),
  };

  metricsBuffer.push(metric);

  // Flush if buffer is full
  if (metricsBuffer.length >= MAX_BUFFER_SIZE) {
    flushMetrics();
  }

  // Ensure timer is running
  startFlushTimer();
}

/**
 * Flush metrics buffer to server
 */
export async function flushMetrics() {
  if (metricsBuffer.length === 0) return;

  const metrics = [...metricsBuffer];
  metricsBuffer = [];

  try {
    // Get current user for tenant context
    const { data: { user } } = await supabase.auth.getUser();
    const tenantId = user?.id;

    // Record each metric
    for (const metric of metrics) {
      await supabase.rpc('record_metric_event', {
        p_tenant_id: tenantId,
        p_trace_id: metric.metadata?.traceId || null,
        p_span_id: metric.metadata?.spanId || null,
        p_event_type: metric.event_type,
        p_event_name: metric.event_name,
        p_duration_ms: metric.duration_ms,
        p_status_code: metric.status_code,
        p_error_class: metric.error_class,
        p_error_message: metric.error_message,
        p_metadata: metric.metadata,
      });
    }
  } catch (error) {
    logger.warn('Failed to flush metrics:', error.message);
    // Re-add to buffer for retry (up to limit)
    if (metricsBuffer.length < MAX_BUFFER_SIZE * 2) {
      metricsBuffer.unshift(...metrics);
    }
  }
}

/**
 * Record an API request metric
 * @param {string} endpoint - API endpoint
 * @param {string} method - HTTP method
 * @param {number} startTime - Request start time (Date.now())
 * @param {Response} response - Fetch response
 */
export function recordApiMetric(endpoint, method, startTime, response) {
  const durationMs = Date.now() - startTime;
  const isError = !response.ok;

  recordMetric('api_call', `${method} ${endpoint}`, {
    durationMs,
    statusCode: response.status,
    errorClass: isError ? `HTTP_${response.status}` : null,
    errorMessage: isError ? response.statusText : null,
    metadata: {
      endpoint,
      method,
    },
  });
}

/**
 * Record a page navigation metric
 * @param {string} pageName - Name of the page
 * @param {number} loadTime - Time to load in ms
 */
export function recordPageMetric(pageName, loadTime) {
  recordMetric('request', `page.${pageName}`, {
    durationMs: loadTime,
    metadata: {
      page: pageName,
    },
  });
}

/**
 * Record an error metric
 * @param {string} errorClass - Error class/type
 * @param {string} message - Error message
 * @param {Object} context - Additional context
 */
export function recordErrorMetric(errorClass, message, context = {}) {
  recordMetric('error', errorClass, {
    errorClass,
    errorMessage: message,
    metadata: context,
  });
}

/**
 * Get metrics dashboard data
 * @param {string} tenantId - Optional tenant ID
 * @param {number} hours - Hours to query
 */
export async function getMetricsDashboard(tenantId = null, hours = 24) {
  try {
    const { data, error } = await supabase.rpc('get_metrics_dashboard', {
      p_tenant_id: tenantId,
      p_hours: hours,
    });

    if (error) throw error;
    return data || [];
  } catch (error) {
    logger.error('Error fetching metrics dashboard:', { error: error });
    return [];
  }
}

/**
 * Get usage counters for a tenant
 * @param {string} tenantId - Tenant UUID
 * @param {string} periodType - Period type (hourly, daily, monthly)
 */
export async function getUsageCounters(tenantId, periodType = 'daily') {
  try {
    const { data, error } = await supabase
      .from('api_usage_counters')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('period_type', periodType)
      .order('period_start', { ascending: false })
      .limit(30);

    if (error) throw error;
    return data || [];
  } catch (error) {
    logger.error('Error fetching usage counters:', { error: error });
    return [];
  }
}

/**
 * Get response time histogram for an endpoint
 * @param {string} tenantId - Tenant UUID
 * @param {string} endpointName - Endpoint to query
 * @param {number} hours - Hours to query
 */
export async function getResponseTimeHistogram(tenantId, endpointName, hours = 24) {
  try {
    const since = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();

    const { data, error } = await supabase
      .from('response_time_histograms')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('endpoint_name', endpointName)
      .gte('bucket_start', since)
      .order('bucket_start', { ascending: true });

    if (error) throw error;

    // Aggregate histogram data
    if (!data?.length) return null;

    const aggregated = {
      endpoint: endpointName,
      period: { hours, since },
      buckets: {
        '0-50ms': data.reduce((sum, d) => sum + (d.bucket_0_50ms || 0), 0),
        '50-100ms': data.reduce((sum, d) => sum + (d.bucket_50_100ms || 0), 0),
        '100-250ms': data.reduce((sum, d) => sum + (d.bucket_100_250ms || 0), 0),
        '250-500ms': data.reduce((sum, d) => sum + (d.bucket_250_500ms || 0), 0),
        '500-1000ms': data.reduce((sum, d) => sum + (d.bucket_500_1000ms || 0), 0),
        '1-2.5s': data.reduce((sum, d) => sum + (d.bucket_1000_2500ms || 0), 0),
        '2.5-5s': data.reduce((sum, d) => sum + (d.bucket_2500_5000ms || 0), 0),
        '5s+': data.reduce((sum, d) => sum + (d.bucket_5000_plus_ms || 0), 0),
      },
      totalRequests: data.reduce((sum, d) => sum + (d.total_requests || 0), 0),
      totalDurationMs: data.reduce((sum, d) => sum + (d.total_duration_ms || 0), 0),
    };

    aggregated.avgDurationMs = aggregated.totalRequests > 0
      ? aggregated.totalDurationMs / aggregated.totalRequests
      : 0;

    return aggregated;
  } catch (error) {
    logger.error('Error fetching response time histogram:', { error: error });
    return null;
  }
}

/**
 * Get player network metrics for a device
 * @param {string} deviceId - Device UUID
 * @param {number} hours - Hours to query
 */
export async function getPlayerNetworkMetrics(deviceId, hours = 24) {
  try {
    const since = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();

    const { data, error } = await supabase
      .from('player_network_metrics')
      .select('*')
      .eq('device_id', deviceId)
      .gte('measured_at', since)
      .order('measured_at', { ascending: false })
      .limit(100);

    if (error) throw error;

    if (!data?.length) return null;

    // Calculate summary
    const summary = {
      avgLatencyMs: data.reduce((sum, d) => sum + (d.latency_ms || 0), 0) / data.length,
      avgJitterMs: data.reduce((sum, d) => sum + (d.jitter_ms || 0), 0) / data.length,
      avgPacketLoss: data.reduce((sum, d) => sum + (d.packet_loss_percent || 0), 0) / data.length,
      totalRetries: data.reduce((sum, d) => sum + (d.retry_count || 0), 0),
      totalReconnects: data.reduce((sum, d) => sum + (d.reconnect_count || 0), 0),
      latencyBuckets: {
        excellent: data.filter(d => d.latency_bucket === 'excellent').length,
        good: data.filter(d => d.latency_bucket === 'good').length,
        fair: data.filter(d => d.latency_bucket === 'fair').length,
        poor: data.filter(d => d.latency_bucket === 'poor').length,
        critical: data.filter(d => d.latency_bucket === 'critical').length,
      },
      samples: data.length,
    };

    return {
      metrics: data,
      summary,
      period: { hours, since },
    };
  } catch (error) {
    logger.error('Error fetching player network metrics:', { error: error });
    return null;
  }
}

/**
 * Get tenant-wide player network summary
 * @param {string} tenantId - Tenant UUID
 * @param {number} hours - Hours to query
 */
export async function getTenantNetworkSummary(tenantId, hours = 24) {
  try {
    const since = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();

    const { data, error } = await supabase
      .from('player_network_metrics')
      .select('latency_ms, latency_bucket, jitter_ms, packet_loss_percent, retry_count, reconnect_count, device_id')
      .eq('tenant_id', tenantId)
      .gte('measured_at', since);

    if (error) throw error;

    if (!data?.length) return null;

    // Get unique devices
    const uniqueDevices = new Set(data.map(d => d.device_id));

    const summary = {
      avgLatencyMs: Math.round(data.reduce((sum, d) => sum + (d.latency_ms || 0), 0) / data.length),
      avgJitterMs: Math.round(data.reduce((sum, d) => sum + (d.jitter_ms || 0), 0) / data.length),
      avgPacketLoss: Math.round(data.reduce((sum, d) => sum + (d.packet_loss_percent || 0), 0) / data.length * 100) / 100,
      totalRetries: data.reduce((sum, d) => sum + (d.retry_count || 0), 0),
      totalReconnects: data.reduce((sum, d) => sum + (d.reconnect_count || 0), 0),
      latencyBuckets: {
        excellent: data.filter(d => d.latency_bucket === 'excellent').length,
        good: data.filter(d => d.latency_bucket === 'good').length,
        fair: data.filter(d => d.latency_bucket === 'fair').length,
        poor: data.filter(d => d.latency_bucket === 'poor').length,
        critical: data.filter(d => d.latency_bucket === 'critical').length,
      },
      uniqueDevices: uniqueDevices.size,
      totalSamples: data.length,
      period: { hours, since },
    };

    // Calculate network health score (0-100)
    const excellentGood = summary.latencyBuckets.excellent + summary.latencyBuckets.good;
    const total = summary.totalSamples;
    summary.healthScore = total > 0 ? Math.round((excellentGood / total) * 100) : 100;

    return summary;
  } catch (error) {
    logger.error('Error fetching tenant network summary:', { error: error });
    return null;
  }
}

/**
 * Get error breakdown by class
 * @param {string} tenantId - Tenant UUID
 * @param {number} hours - Hours to query
 */
export async function getErrorBreakdown(tenantId, hours = 24) {
  try {
    const since = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();

    const { data, error } = await supabase
      .from('metric_events')
      .select('error_class, event_name')
      .eq('tenant_id', tenantId)
      .not('error_class', 'is', null)
      .gte('created_at', since);

    if (error) throw error;

    // Group by error class
    const breakdown = {};
    (data || []).forEach(event => {
      const key = event.error_class;
      if (!breakdown[key]) {
        breakdown[key] = { count: 0, events: {} };
      }
      breakdown[key].count++;
      breakdown[key].events[event.event_name] = (breakdown[key].events[event.event_name] || 0) + 1;
    });

    // Sort by count
    const sorted = Object.entries(breakdown)
      .sort(([, a], [, b]) => b.count - a.count)
      .map(([errorClass, data]) => ({
        errorClass,
        count: data.count,
        topEvents: Object.entries(data.events)
          .sort(([, a], [, b]) => b - a)
          .slice(0, 5)
          .map(([event, count]) => ({ event, count })),
      }));

    return {
      errors: sorted,
      totalErrors: data?.length || 0,
      period: { hours, since },
    };
  } catch (error) {
    logger.error('Error fetching error breakdown:', { error: error });
    return { errors: [], totalErrors: 0 };
  }
}

/**
 * Increment a usage counter
 * @param {string} tenantId - Tenant UUID
 * @param {string} counterType - Type of counter
 * @param {number} amount - Amount to increment
 */
export async function incrementUsageCounter(tenantId, counterType, amount = 1) {
  try {
    const { data, error } = await supabase.rpc('increment_usage_counter', {
      p_tenant_id: tenantId,
      p_counter_type: counterType,
      p_amount: amount,
    });

    if (error) throw error;
    return data;
  } catch (error) {
    logger.warn('Failed to increment usage counter:', error.message);
    return -1;
  }
}

// Cleanup on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    stopFlushTimer();
    // Attempt final flush (may not complete)
    if (metricsBuffer.length > 0) {
      navigator.sendBeacon?.('/api/metrics/batch', JSON.stringify(metricsBuffer));
    }
  });
}

export default {
  recordMetric,
  recordApiMetric,
  recordPageMetric,
  recordErrorMetric,
  flushMetrics,
  getMetricsDashboard,
  getUsageCounters,
  getResponseTimeHistogram,
  getPlayerNetworkMetrics,
  getTenantNetworkSummary,
  getErrorBreakdown,
  incrementUsageCounter,
};
