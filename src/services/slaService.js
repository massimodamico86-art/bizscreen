/**
 * SLA Service
 *
 * Provides service-level agreement monitoring and alerting.
 * Tracks uptime, latency, webhook success rates, and device health.
 */

import { supabase } from '../supabase';

// SLA tier configurations
export const SLA_TIERS = {
  free: {
    name: 'Free',
    uptimeTarget: null, // No SLA guarantee
    latencyTarget: null,
    alertingEnabled: false,
    detailedMetrics: false,
  },
  starter: {
    name: 'Starter',
    uptimeTarget: 99.0, // 99% uptime
    latencyTarget: 1000, // 1s p95 latency
    alertingEnabled: false,
    detailedMetrics: false,
  },
  pro: {
    name: 'Pro',
    uptimeTarget: 99.5, // 99.5% uptime
    latencyTarget: 500, // 500ms p95 latency
    alertingEnabled: true,
    detailedMetrics: true,
  },
  enterprise: {
    name: 'Enterprise',
    uptimeTarget: 99.9, // 99.9% uptime
    latencyTarget: 200, // 200ms p95 latency
    alertingEnabled: true,
    detailedMetrics: true,
    customAlerts: true,
  },
};

// Default alert thresholds
export const ALERT_THRESHOLDS = {
  errorRate: {
    warning: 5, // 5% error rate
    critical: 10, // 10% error rate
  },
  latency: {
    warning: 500, // 500ms p95
    critical: 1000, // 1s p95
  },
  uptime: {
    warning: 99.5, // Below 99.5%
    critical: 99.0, // Below 99%
  },
  deviceOffline: {
    warning: 10, // 10% offline
    critical: 25, // 25% offline
  },
  webhookFailure: {
    warning: 5, // 5% failure
    critical: 15, // 15% failure
  },
};

/**
 * Get SLA breakdown for a tenant over time
 * @param {string} tenantId - Tenant UUID
 * @param {number} days - Number of days to query
 * @returns {Promise<Object>} SLA metrics over time
 */
export async function getSlaBreakdown(tenantId, days = 30) {
  try {
    const { data, error } = await supabase.rpc('get_sla_breakdown', {
      p_tenant_id: tenantId,
      p_days: days,
    });

    if (error) throw error;

    // Calculate summary statistics
    const summary = calculateSlaSummary(data || []);

    return {
      daily: data || [],
      summary,
      period: {
        start: new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString(),
        end: new Date().toISOString(),
        days,
      },
    };
  } catch (error) {
    console.error('Error fetching SLA breakdown:', error);
    return { daily: [], summary: null, period: null, error: error.message };
  }
}

/**
 * Calculate summary statistics from daily SLA data
 */
function calculateSlaSummary(dailyData) {
  if (!dailyData.length) return null;

  const totalRequests = dailyData.reduce((sum, d) => sum + (d.total_requests || 0), 0);
  const totalErrors = dailyData.reduce((sum, d) => sum + (d.total_errors || 0), 0);

  // Weighted average for uptime and latency
  const avgUptime = totalRequests > 0
    ? dailyData.reduce((sum, d) => sum + (d.uptime_percent || 100) * (d.total_requests || 0), 0) / totalRequests
    : 100;

  const avgLatency = totalRequests > 0
    ? dailyData.reduce((sum, d) => sum + (d.avg_latency_ms || 0) * (d.total_requests || 0), 0) / totalRequests
    : 0;

  const avgP95Latency = totalRequests > 0
    ? dailyData.reduce((sum, d) => sum + (d.p95_latency_ms || 0) * (d.total_requests || 0), 0) / totalRequests
    : 0;

  const avgDeviceUptime = dailyData.reduce((sum, d) => sum + (d.device_uptime_percent || 100), 0) / dailyData.length;
  const avgWebhookSuccess = dailyData.reduce((sum, d) => sum + (d.webhook_success_percent || 100), 0) / dailyData.length;

  return {
    uptime: Math.round(avgUptime * 100) / 100,
    avgLatencyMs: Math.round(avgLatency),
    p95LatencyMs: Math.round(avgP95Latency),
    deviceUptime: Math.round(avgDeviceUptime * 100) / 100,
    webhookSuccess: Math.round(avgWebhookSuccess * 100) / 100,
    totalRequests,
    totalErrors,
    errorRate: totalRequests > 0 ? Math.round((totalErrors / totalRequests) * 10000) / 100 : 0,
  };
}

/**
 * Get current SLA status for a tenant
 * @param {string} tenantId - Tenant UUID
 * @returns {Promise<Object>} Current SLA status
 */
export async function getCurrentSlaStatus(tenantId) {
  try {
    // Get last 24 hours of metrics
    const { data: metrics, error: metricsError } = await supabase.rpc('get_metrics_dashboard', {
      p_tenant_id: tenantId,
      p_hours: 24,
    });

    if (metricsError) throw metricsError;

    // Get device status
    const { data: devices, error: devicesError } = await supabase
      .from('tv_devices')
      .select('id, is_online')
      .eq('tenant_id', tenantId);

    if (devicesError) throw devicesError;

    // Get webhook status (last 24h)
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data: webhooks, error: webhooksError } = await supabase
      .from('webhook_events')
      .select('status')
      .eq('tenant_id', tenantId)
      .gte('created_at', yesterday);

    if (webhooksError) throw webhooksError;

    // Calculate current status
    const totalDevices = devices?.length || 0;
    const onlineDevices = devices?.filter(d => d.is_online).length || 0;
    const deviceUptime = totalDevices > 0 ? (onlineDevices / totalDevices) * 100 : 100;

    const totalWebhooks = webhooks?.length || 0;
    const successfulWebhooks = webhooks?.filter(w => w.status === 'delivered').length || 0;
    const webhookSuccess = totalWebhooks > 0 ? (successfulWebhooks / totalWebhooks) * 100 : 100;

    // Aggregate metrics
    const totalRequests = metrics?.reduce((sum, m) => sum + (m.total_count || 0), 0) || 0;
    const totalErrors = metrics?.reduce((sum, m) => sum + (m.error_count || 0), 0) || 0;
    const avgLatency = metrics?.length > 0
      ? metrics.reduce((sum, m) => sum + (m.avg_duration_ms || 0), 0) / metrics.length
      : 0;
    const avgP95 = metrics?.length > 0
      ? metrics.reduce((sum, m) => sum + (m.p95_duration_ms || 0), 0) / metrics.length
      : 0;

    const uptime = totalRequests > 0 ? ((totalRequests - totalErrors) / totalRequests) * 100 : 100;
    const errorRate = totalRequests > 0 ? (totalErrors / totalRequests) * 100 : 0;

    return {
      uptime: Math.round(uptime * 100) / 100,
      errorRate: Math.round(errorRate * 100) / 100,
      avgLatencyMs: Math.round(avgLatency),
      p95LatencyMs: Math.round(avgP95),
      deviceUptime: Math.round(deviceUptime * 100) / 100,
      webhookSuccess: Math.round(webhookSuccess * 100) / 100,
      totalRequests,
      totalErrors,
      totalDevices,
      onlineDevices,
      offlineDevices: totalDevices - onlineDevices,
      totalWebhooks,
      failedWebhooks: totalWebhooks - successfulWebhooks,
      period: '24h',
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    console.error('Error fetching current SLA status:', error);
    return { error: error.message };
  }
}

/**
 * Get critical alerts for a tenant
 * @param {string} tenantId - Optional tenant ID (null for all tenants)
 * @param {number} limit - Maximum alerts to return
 * @returns {Promise<Array>} Open alerts
 */
export async function getCriticalAlerts(tenantId = null, limit = 50) {
  try {
    const { data, error } = await supabase.rpc('get_critical_alerts', {
      p_tenant_id: tenantId,
      p_limit: limit,
    });

    if (error) throw error;

    return data || [];
  } catch (error) {
    console.error('Error fetching critical alerts:', error);
    return [];
  }
}

/**
 * Acknowledge an alert
 * @param {string} alertId - Alert UUID
 * @param {string} userId - User acknowledging the alert
 */
export async function acknowledgeAlert(alertId, userId) {
  try {
    const { error } = await supabase
      .from('alert_events')
      .update({
        status: 'acknowledged',
        acknowledged_at: new Date().toISOString(),
        acknowledged_by: userId,
      })
      .eq('id', alertId);

    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('Error acknowledging alert:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Resolve an alert
 * @param {string} alertId - Alert UUID
 */
export async function resolveAlert(alertId) {
  try {
    const { error } = await supabase
      .from('alert_events')
      .update({
        status: 'resolved',
        resolved_at: new Date().toISOString(),
      })
      .eq('id', alertId);

    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('Error resolving alert:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Create a new alert event
 * @param {Object} alert - Alert details
 */
export async function createAlert(alert) {
  try {
    const { data, error } = await supabase
      .from('alert_events')
      .insert({
        tenant_id: alert.tenantId,
        rule_id: alert.ruleId,
        alert_type: alert.type,
        severity: alert.severity || 'warning',
        title: alert.title,
        description: alert.description,
        current_value: alert.currentValue,
        threshold_value: alert.thresholdValue,
        status: 'open',
        metadata: alert.metadata || {},
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error creating alert:', error);
    return null;
  }
}

/**
 * Evaluate alert rules for a tenant
 * @param {string} tenantId - Tenant UUID
 * @param {Object} metrics - Current metrics
 */
export async function evaluateAlertRules(tenantId, metrics) {
  const alerts = [];

  // Check error rate
  if (metrics.errorRate >= ALERT_THRESHOLDS.errorRate.critical) {
    alerts.push({
      tenantId,
      type: 'error_rate',
      severity: 'critical',
      title: 'Critical: High Error Rate',
      description: `Error rate is ${metrics.errorRate}%, exceeding ${ALERT_THRESHOLDS.errorRate.critical}% threshold`,
      currentValue: metrics.errorRate,
      thresholdValue: ALERT_THRESHOLDS.errorRate.critical,
    });
  } else if (metrics.errorRate >= ALERT_THRESHOLDS.errorRate.warning) {
    alerts.push({
      tenantId,
      type: 'error_rate',
      severity: 'warning',
      title: 'Warning: Elevated Error Rate',
      description: `Error rate is ${metrics.errorRate}%, exceeding ${ALERT_THRESHOLDS.errorRate.warning}% threshold`,
      currentValue: metrics.errorRate,
      thresholdValue: ALERT_THRESHOLDS.errorRate.warning,
    });
  }

  // Check latency
  if (metrics.p95LatencyMs >= ALERT_THRESHOLDS.latency.critical) {
    alerts.push({
      tenantId,
      type: 'latency',
      severity: 'critical',
      title: 'Critical: High Latency',
      description: `P95 latency is ${metrics.p95LatencyMs}ms, exceeding ${ALERT_THRESHOLDS.latency.critical}ms threshold`,
      currentValue: metrics.p95LatencyMs,
      thresholdValue: ALERT_THRESHOLDS.latency.critical,
    });
  } else if (metrics.p95LatencyMs >= ALERT_THRESHOLDS.latency.warning) {
    alerts.push({
      tenantId,
      type: 'latency',
      severity: 'warning',
      title: 'Warning: Elevated Latency',
      description: `P95 latency is ${metrics.p95LatencyMs}ms, exceeding ${ALERT_THRESHOLDS.latency.warning}ms threshold`,
      currentValue: metrics.p95LatencyMs,
      thresholdValue: ALERT_THRESHOLDS.latency.warning,
    });
  }

  // Check uptime
  if (metrics.uptime < ALERT_THRESHOLDS.uptime.critical) {
    alerts.push({
      tenantId,
      type: 'uptime',
      severity: 'critical',
      title: 'Critical: Low Uptime',
      description: `Uptime is ${metrics.uptime}%, below ${ALERT_THRESHOLDS.uptime.critical}% threshold`,
      currentValue: metrics.uptime,
      thresholdValue: ALERT_THRESHOLDS.uptime.critical,
    });
  } else if (metrics.uptime < ALERT_THRESHOLDS.uptime.warning) {
    alerts.push({
      tenantId,
      type: 'uptime',
      severity: 'warning',
      title: 'Warning: Degraded Uptime',
      description: `Uptime is ${metrics.uptime}%, below ${ALERT_THRESHOLDS.uptime.warning}% threshold`,
      currentValue: metrics.uptime,
      thresholdValue: ALERT_THRESHOLDS.uptime.warning,
    });
  }

  // Check device offline rate
  const offlinePercent = 100 - metrics.deviceUptime;
  if (offlinePercent >= ALERT_THRESHOLDS.deviceOffline.critical) {
    alerts.push({
      tenantId,
      type: 'device_offline',
      severity: 'critical',
      title: 'Critical: Many Devices Offline',
      description: `${offlinePercent.toFixed(1)}% of devices are offline`,
      currentValue: offlinePercent,
      thresholdValue: ALERT_THRESHOLDS.deviceOffline.critical,
    });
  } else if (offlinePercent >= ALERT_THRESHOLDS.deviceOffline.warning) {
    alerts.push({
      tenantId,
      type: 'device_offline',
      severity: 'warning',
      title: 'Warning: Devices Offline',
      description: `${offlinePercent.toFixed(1)}% of devices are offline`,
      currentValue: offlinePercent,
      thresholdValue: ALERT_THRESHOLDS.deviceOffline.warning,
    });
  }

  // Check webhook failure rate
  const webhookFailure = 100 - metrics.webhookSuccess;
  if (webhookFailure >= ALERT_THRESHOLDS.webhookFailure.critical) {
    alerts.push({
      tenantId,
      type: 'webhook_failure',
      severity: 'critical',
      title: 'Critical: High Webhook Failure Rate',
      description: `Webhook failure rate is ${webhookFailure.toFixed(1)}%`,
      currentValue: webhookFailure,
      thresholdValue: ALERT_THRESHOLDS.webhookFailure.critical,
    });
  } else if (webhookFailure >= ALERT_THRESHOLDS.webhookFailure.warning) {
    alerts.push({
      tenantId,
      type: 'webhook_failure',
      severity: 'warning',
      title: 'Warning: Elevated Webhook Failures',
      description: `Webhook failure rate is ${webhookFailure.toFixed(1)}%`,
      currentValue: webhookFailure,
      thresholdValue: ALERT_THRESHOLDS.webhookFailure.warning,
    });
  }

  return alerts;
}

/**
 * Get SLA tier config for a subscription tier
 * @param {string} subscriptionTier - Subscription tier name
 */
export function getSlaTierConfig(subscriptionTier) {
  return SLA_TIERS[subscriptionTier] || SLA_TIERS.free;
}

/**
 * Check if current metrics meet SLA targets
 * @param {Object} metrics - Current metrics
 * @param {string} subscriptionTier - Subscription tier
 */
export function checkSlaCompliance(metrics, subscriptionTier) {
  const config = getSlaTierConfig(subscriptionTier);

  const results = {
    tier: config.name,
    targets: {},
    violations: [],
    compliant: true,
  };

  if (config.uptimeTarget) {
    results.targets.uptime = config.uptimeTarget;
    if (metrics.uptime < config.uptimeTarget) {
      results.violations.push({
        metric: 'uptime',
        target: config.uptimeTarget,
        actual: metrics.uptime,
        message: `Uptime ${metrics.uptime}% below SLA target of ${config.uptimeTarget}%`,
      });
      results.compliant = false;
    }
  }

  if (config.latencyTarget) {
    results.targets.latency = config.latencyTarget;
    if (metrics.p95LatencyMs > config.latencyTarget) {
      results.violations.push({
        metric: 'latency',
        target: config.latencyTarget,
        actual: metrics.p95LatencyMs,
        message: `P95 latency ${metrics.p95LatencyMs}ms exceeds SLA target of ${config.latencyTarget}ms`,
      });
      results.compliant = false;
    }
  }

  return results;
}

/**
 * Get alert rules for a tenant
 * @param {string} tenantId - Tenant UUID
 */
export async function getAlertRules(tenantId = null) {
  try {
    let query = supabase
      .from('alert_rules')
      .select('*')
      .eq('is_enabled', true);

    if (tenantId) {
      query = query.or(`tenant_id.eq.${tenantId},tenant_id.is.null`);
    } else {
      query = query.is('tenant_id', null);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching alert rules:', error);
    return [];
  }
}

/**
 * Update an alert rule
 * @param {string} ruleId - Rule UUID
 * @param {Object} updates - Fields to update
 */
export async function updateAlertRule(ruleId, updates) {
  try {
    const { data, error } = await supabase
      .from('alert_rules')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', ruleId)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error updating alert rule:', error);
    return null;
  }
}

export default {
  SLA_TIERS,
  ALERT_THRESHOLDS,
  getSlaBreakdown,
  getCurrentSlaStatus,
  getCriticalAlerts,
  acknowledgeAlert,
  resolveAlert,
  createAlert,
  evaluateAlertRules,
  getSlaTierConfig,
  checkSlaCompliance,
  getAlertRules,
  updateAlertRule,
};
