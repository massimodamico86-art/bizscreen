import { useState, useEffect, useCallback } from 'react';
import {
  Activity,
  AlertTriangle,
  Bell,
  BellOff,
  CheckCircle2,
  Clock,
  Monitor,
  RefreshCw,
  Shield,
  TrendingDown,
  TrendingUp,
  Wifi,
  XCircle,
  Zap,
  BarChart2,
  PieChart,
  AlertCircle,
  ArrowUp,
  ArrowDown,
  Minus,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from '../i18n';
import {
  getSlaBreakdown,
  getCurrentSlaStatus,
  getCriticalAlerts,
  acknowledgeAlert,
  resolveAlert,
  SLA_TIERS,
} from '../services/slaService';
import {
  getMetricsDashboard,
  getUsageCounters,
  getTenantNetworkSummary,
  getErrorBreakdown,
} from '../services/metricsService';

// Design system imports
import {
  PageLayout,
  PageHeader,
  PageContent,
  Stack,
  Grid,
  Inline,
} from '../design-system';
import { Button } from '../design-system';
import { Card, CardHeader, CardTitle, CardContent } from '../design-system';
import { Badge } from '../design-system';
import { Select } from '../design-system';
import { Banner } from '../design-system';
import { useLogger } from '../hooks/useLogger.js';

// --------------------------------------------------------------------------
// Sub-components
// --------------------------------------------------------------------------

function TierBanner({ tier, config }) {
  const tierVariants = {
    free: 'neutral',
    starter: 'info',
    pro: 'info',
    enterprise: 'warning',
  };

  return (
    <Banner
      variant={tierVariants[tier] || 'neutral'}
      icon={<Shield size={20} />}
      title={
        <span className="capitalize">
          {tier} Plan
          {config.uptimeTarget && (
            <span className="font-normal opacity-75 ml-2">
              • {config.uptimeTarget}% uptime SLA
            </span>
          )}
        </span>
      }
      action={
        config.alertingEnabled ? (
          <Inline gap="xs" align="center" className="text-sm opacity-75">
            <Bell size={14} />
            Alerting enabled
          </Inline>
        ) : (
          <Inline gap="xs" align="center" className="text-sm opacity-75">
            <BellOff size={14} />
            Alerting not available
          </Inline>
        )
      }
    />
  );
}

function SlaGaugeCard({ title, value, target, suffix = '', icon, invertColors = false, trend }) {
  const numValue = typeof value === 'number' ? value : null;
  const displayValue = numValue !== null ? numValue.toFixed(1) : '--';

  const getStatus = () => {
    if (numValue === null || !target) return 'unknown';
    if (invertColors) {
      if (numValue <= target) return 'good';
      if (numValue <= target * 1.5) return 'warning';
      return 'critical';
    } else {
      if (numValue >= target) return 'good';
      if (numValue >= target * 0.95) return 'warning';
      return 'critical';
    }
  };

  const status = getStatus();

  const statusColors = {
    good: 'text-green-600',
    warning: 'text-yellow-600',
    critical: 'text-red-600',
    unknown: 'text-gray-400',
  };

  const bgColors = {
    good: 'bg-green-50 border-green-200',
    warning: 'bg-yellow-50 border-yellow-200',
    critical: 'bg-red-50 border-red-200',
    unknown: 'bg-gray-50 border-gray-200',
  };

  const TrendIcon = trend === 'up' ? ArrowUp : trend === 'down' ? ArrowDown : Minus;
  const trendColor = invertColors
    ? trend === 'up' ? 'text-red-500' : trend === 'down' ? 'text-green-500' : 'text-gray-400'
    : trend === 'up' ? 'text-green-500' : trend === 'down' ? 'text-red-500' : 'text-gray-400';

  return (
    <div className={`rounded-xl border p-4 ${bgColors[status]}`}>
      <Inline justify="between" className="mb-2">
        <Inline gap="xs" align="center" className="text-gray-600">
          {icon}
          <span className="text-sm font-medium">{title}</span>
        </Inline>
        {trend && <TrendIcon size={16} className={trendColor} />}
      </Inline>
      <Inline gap="xs" align="baseline">
        <span className={`text-3xl font-bold ${statusColors[status]}`}>{displayValue}</span>
        <span className="text-gray-500">{suffix}</span>
      </Inline>
      {target && (
        <p className="text-xs text-gray-500 mt-1">
          Target: {invertColors ? '≤' : '≥'} {target}{suffix}
        </p>
      )}
    </div>
  );
}

function AlertsFeed({ alerts, onAcknowledge, onResolve, alertingEnabled }) {
  const activeAlerts = alerts.filter((a) => a.status !== 'resolved');
  const resolvedAlerts = alerts.filter((a) => a.status === 'resolved').slice(0, 5);

  const severityStyles = {
    critical: 'bg-red-100 border-red-300 text-red-800',
    warning: 'bg-yellow-100 border-yellow-300 text-yellow-800',
    info: 'bg-blue-100 border-blue-300 text-blue-800',
  };

  const severityIcons = {
    critical: <XCircle size={16} />,
    warning: <AlertTriangle size={16} />,
    info: <AlertCircle size={16} />,
  };

  if (!alertingEnabled) {
    return (
      <Card variant="outlined">
        <CardHeader>
          <Inline gap="xs" align="center">
            <Bell size={18} />
            <CardTitle>Alerts</CardTitle>
          </Inline>
        </CardHeader>
        <CardContent className="text-center py-8 text-gray-500">
          <BellOff size={32} className="mx-auto mb-2 text-gray-400" />
          <p>Alerting is available on Pro and Enterprise plans</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card variant="outlined">
      <CardHeader>
        <Inline gap="sm" align="center">
          <Bell size={18} />
          <CardTitle>Active Alerts</CardTitle>
          {activeAlerts.length > 0 && (
            <Badge variant="error">{activeAlerts.length}</Badge>
          )}
        </Inline>
      </CardHeader>
      <CardContent>
        {activeAlerts.length === 0 ? (
          <div className="text-center py-6 text-gray-500">
            <CheckCircle2 size={32} className="mx-auto mb-2 text-green-400" />
            <p>No active alerts</p>
          </div>
        ) : (
          <Stack gap="sm" className="max-h-80 overflow-y-auto">
            {activeAlerts.map((alert) => (
              <div
                key={alert.id}
                className={`rounded-lg border p-3 ${severityStyles[alert.severity]}`}
              >
                <Inline justify="between" align="start">
                  <Inline gap="xs" align="start">
                    {severityIcons[alert.severity]}
                    <div>
                      <p className="font-medium text-sm">{alert.alert_type}</p>
                      <p className="text-xs opacity-75">{alert.message}</p>
                      <p className="text-xs mt-1 opacity-60">
                        {new Date(alert.created_at).toLocaleString()}
                      </p>
                    </div>
                  </Inline>
                  <Inline gap="xs">
                    {alert.status === 'active' && (
                      <button
                        onClick={() => onAcknowledge(alert.id)}
                        className="text-xs px-2 py-1 bg-white bg-opacity-50 rounded hover:bg-opacity-75 transition-colors"
                      >
                        Ack
                      </button>
                    )}
                    <button
                      onClick={() => onResolve(alert.id)}
                      className="text-xs px-2 py-1 bg-white bg-opacity-50 rounded hover:bg-opacity-75 transition-colors"
                    >
                      Resolve
                    </button>
                  </Inline>
                </Inline>
              </div>
            ))}
          </Stack>
        )}

        {resolvedAlerts.length > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <p className="text-sm text-gray-500 mb-2">Recently resolved</p>
            <Stack gap="xs">
              {resolvedAlerts.map((alert) => (
                <Inline key={alert.id} gap="sm" className="text-sm text-gray-500">
                  <CheckCircle2 size={14} className="text-green-500 shrink-0" />
                  <span className="flex-1 truncate">{alert.alert_type}</span>
                  <span className="text-xs">{new Date(alert.resolved_at).toLocaleTimeString()}</span>
                </Inline>
              ))}
            </Stack>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function NetworkHealthCard({ summary }) {
  if (!summary) {
    return (
      <Card variant="outlined">
        <CardHeader>
          <Inline gap="xs" align="center">
            <Wifi size={18} />
            <CardTitle>Network Health</CardTitle>
          </Inline>
        </CardHeader>
        <CardContent className="text-center py-6 text-gray-500">
          <p className="text-sm">No network data available</p>
        </CardContent>
      </Card>
    );
  }

  const healthColor = summary.healthScore >= 90 ? 'text-green-600' :
                      summary.healthScore >= 70 ? 'text-yellow-600' : 'text-red-600';

  const healthBg = summary.healthScore >= 90 ? 'bg-green-50' :
                   summary.healthScore >= 70 ? 'bg-yellow-50' : 'bg-red-50';

  return (
    <Card variant="outlined">
      <CardHeader>
        <Inline gap="xs" align="center">
          <Wifi size={18} />
          <CardTitle>Network Health</CardTitle>
        </Inline>
      </CardHeader>
      <CardContent>
        <Stack gap="md">
          <div className={`rounded-lg p-4 ${healthBg} text-center`}>
            <span className={`text-4xl font-bold ${healthColor}`}>{summary.healthScore}</span>
            <span className="text-gray-500">/100</span>
            <p className="text-sm text-gray-600 mt-1">Health Score</p>
          </div>

          <Stack gap="sm">
            <Inline justify="between">
              <span className="text-sm text-gray-600">Avg Latency</span>
              <span className="font-semibold">{summary.avgLatencyMs}ms</span>
            </Inline>
            <Inline justify="between">
              <span className="text-sm text-gray-600">Avg Jitter</span>
              <span className="font-semibold">{summary.avgJitterMs}ms</span>
            </Inline>
            <Inline justify="between">
              <span className="text-sm text-gray-600">Packet Loss</span>
              <span className="font-semibold">{summary.avgPacketLoss}%</span>
            </Inline>
            <Inline justify="between">
              <span className="text-sm text-gray-600">Devices</span>
              <span className="font-semibold">{summary.uniqueDevices}</span>
            </Inline>
          </Stack>

          <div className="pt-4 border-t border-gray-200">
            <p className="text-xs text-gray-500 mb-2">Latency Distribution</p>
            <div className="flex gap-1">
              {Object.entries(summary.latencyBuckets || {}).map(([bucket, count]) => {
                const colors = {
                  excellent: 'bg-green-400',
                  good: 'bg-green-300',
                  fair: 'bg-yellow-300',
                  poor: 'bg-orange-400',
                  critical: 'bg-red-500',
                };
                const total = summary.totalSamples || 1;
                const width = Math.max((count / total) * 100, 2);
                return (
                  <div
                    key={bucket}
                    className={`h-4 ${colors[bucket]} rounded-sm`}
                    style={{ width: `${width}%` }}
                    title={`${bucket}: ${count}`}
                  />
                );
              })}
            </div>
            <Inline justify="between" className="text-xs text-gray-400 mt-1">
              <span>Excellent</span>
              <span>Critical</span>
            </Inline>
          </div>
        </Stack>
      </CardContent>
    </Card>
  );
}

function LatencyDistributionCard({ metrics }) {
  const apiMetrics = metrics.filter((m) => m.event_type === 'api_call' || m.event_type === 'request');

  if (apiMetrics.length === 0) {
    return (
      <Card variant="outlined">
        <CardHeader>
          <Inline gap="xs" align="center">
            <BarChart2 size={18} />
            <CardTitle>API Latency</CardTitle>
          </Inline>
        </CardHeader>
        <CardContent className="text-center py-8 text-gray-500">
          <p className="text-sm">No latency data available</p>
        </CardContent>
      </Card>
    );
  }

  const sortedMetrics = [...apiMetrics]
    .sort((a, b) => (b.request_count || 0) - (a.request_count || 0))
    .slice(0, 8);

  const maxLatency = Math.max(...sortedMetrics.map((m) => m.avg_latency_ms || 0), 100);

  return (
    <Card variant="outlined">
      <CardHeader>
        <Inline gap="xs" align="center">
          <BarChart2 size={18} />
          <CardTitle>API Latency by Endpoint</CardTitle>
        </Inline>
      </CardHeader>
      <CardContent>
        <Stack gap="sm">
          {sortedMetrics.map((metric, i) => {
            const latency = metric.avg_latency_ms || 0;
            const width = (latency / maxLatency) * 100;
            const color = latency < 200 ? 'bg-green-400' : latency < 500 ? 'bg-yellow-400' : 'bg-red-400';

            return (
              <div key={i}>
                <Inline justify="between" className="text-sm mb-1">
                  <span className="text-gray-600 truncate max-w-[200px]" title={metric.event_name}>
                    {metric.event_name}
                  </span>
                  <span className="font-medium">{latency.toFixed(0)}ms</span>
                </Inline>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${color} rounded-full transition-all`}
                    style={{ width: `${width}%` }}
                  />
                </div>
              </div>
            );
          })}
        </Stack>
      </CardContent>
    </Card>
  );
}

function ErrorBreakdownCard({ breakdown }) {
  if (!breakdown || breakdown.errors?.length === 0) {
    return (
      <Card variant="outlined">
        <CardHeader>
          <Inline gap="xs" align="center">
            <AlertTriangle size={18} />
            <CardTitle>Error Breakdown</CardTitle>
          </Inline>
        </CardHeader>
        <CardContent className="text-center py-8 text-gray-500">
          <CheckCircle2 size={32} className="mx-auto mb-2 text-green-400" />
          <p className="text-sm">No errors in the selected period</p>
        </CardContent>
      </Card>
    );
  }

  const maxCount = Math.max(...breakdown.errors.map((e) => e.count), 1);

  return (
    <Card variant="outlined">
      <CardHeader>
        <Inline gap="sm" align="center">
          <AlertTriangle size={18} />
          <CardTitle>Error Breakdown</CardTitle>
          <span className="text-sm font-normal text-gray-500">({breakdown.totalErrors} total)</span>
        </Inline>
      </CardHeader>
      <CardContent className="max-h-64 overflow-y-auto">
        <Stack gap="sm">
          {breakdown.errors.slice(0, 10).map((error, i) => {
            const width = (error.count / maxCount) * 100;

            return (
              <div key={i}>
                <Inline justify="between" className="text-sm mb-1">
                  <span className="text-gray-600 truncate max-w-[200px]" title={error.errorClass}>
                    {error.errorClass}
                  </span>
                  <span className="font-medium text-red-600">{error.count}</span>
                </Inline>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-red-400 rounded-full" style={{ width: `${width}%` }} />
                </div>
                {error.topEvents?.length > 0 && (
                  <p className="text-xs text-gray-400 mt-1">
                    Top: {error.topEvents[0].event} ({error.topEvents[0].count})
                  </p>
                )}
              </div>
            );
          })}
        </Stack>
      </CardContent>
    </Card>
  );
}

function UsageCountersCard({ counters }) {
  if (!counters || counters.length === 0) {
    return (
      <Card variant="outlined">
        <CardHeader>
          <Inline gap="xs" align="center">
            <TrendingUp size={18} />
            <CardTitle>Usage Trends</CardTitle>
          </Inline>
        </CardHeader>
        <CardContent className="text-center py-8 text-gray-500">
          <p className="text-sm">No usage data available</p>
        </CardContent>
      </Card>
    );
  }

  const grouped = {};
  counters.forEach((c) => {
    if (!grouped[c.counter_type]) {
      grouped[c.counter_type] = [];
    }
    grouped[c.counter_type].push(c);
  });

  return (
    <Card variant="outlined">
      <CardHeader>
        <Inline gap="xs" align="center">
          <TrendingUp size={18} />
          <CardTitle>Usage Trends (Last 30 Days)</CardTitle>
        </Inline>
      </CardHeader>
      <CardContent>
        <Stack gap="md">
          {Object.entries(grouped).slice(0, 5).map(([type, values]) => {
            const total = values.reduce((sum, v) => sum + (v.counter_value || 0), 0);
            const recent = values[0]?.counter_value || 0;
            const previous = values[1]?.counter_value || 0;
            const trend = previous > 0 ? ((recent - previous) / previous) * 100 : 0;

            return (
              <Inline key={type} justify="between" align="center">
                <div>
                  <p className="font-medium text-sm capitalize">{type.replace(/_/g, ' ')}</p>
                  <p className="text-xs text-gray-500">Total: {total.toLocaleString()}</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold">{recent.toLocaleString()}</p>
                  {trend !== 0 && (
                    <Inline gap="xs" className={`text-xs justify-end ${trend > 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {trend > 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                      {Math.abs(trend).toFixed(1)}%
                    </Inline>
                  )}
                </div>
              </Inline>
            );
          })}
        </Stack>
      </CardContent>
    </Card>
  );
}

function SlaBreakdownCard({ breakdown }) {
  if (!breakdown) {
    return (
      <Card variant="outlined">
        <CardHeader>
          <Inline gap="xs" align="center">
            <PieChart size={18} />
            <CardTitle>SLA Components</CardTitle>
          </Inline>
        </CardHeader>
        <CardContent className="text-center py-8 text-gray-500">
          <p className="text-sm">No SLA data available</p>
        </CardContent>
      </Card>
    );
  }

  const components = [
    { name: 'API Availability', value: breakdown.api_availability, target: 99.9 },
    { name: 'Database Response', value: breakdown.db_response, target: 99.5 },
    { name: 'Media Delivery', value: breakdown.media_delivery, target: 99.0 },
    { name: 'Webhook Delivery', value: breakdown.webhook_delivery, target: 95.0 },
    { name: 'Device Connectivity', value: breakdown.device_connectivity, target: 95.0 },
  ].filter((c) => c.value !== undefined);

  return (
    <Card variant="outlined">
      <CardHeader>
        <Inline gap="xs" align="center">
          <PieChart size={18} />
          <CardTitle>SLA Components</CardTitle>
        </Inline>
      </CardHeader>
      <CardContent>
        <Stack gap="md">
          {components.map((component, i) => {
            const value = component.value || 0;
            const target = component.target;
            const meetsTarget = value >= target;
            const color = meetsTarget ? 'bg-green-400' : 'bg-red-400';

            return (
              <div key={i}>
                <Inline justify="between" className="text-sm mb-1">
                  <span className="text-gray-600">{component.name}</span>
                  <span className={`font-medium ${meetsTarget ? 'text-green-600' : 'text-red-600'}`}>
                    {value.toFixed(2)}%
                  </span>
                </Inline>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden relative">
                  <div
                    className={`h-full ${color} rounded-full transition-all`}
                    style={{ width: `${value}%` }}
                  />
                  <div
                    className="absolute top-0 h-full w-0.5 bg-gray-400"
                    style={{ left: `${target}%` }}
                    title={`Target: ${target}%`}
                  />
                </div>
                <p className="text-xs text-gray-400 mt-0.5">Target: {target}%</p>
              </div>
            );
          })}
        </Stack>
      </CardContent>
    </Card>
  );
}

// --------------------------------------------------------------------------
// Main Component
// --------------------------------------------------------------------------

export default function ServiceQualityPage() {
  const logger = useLogger('ServiceQualityPage');
