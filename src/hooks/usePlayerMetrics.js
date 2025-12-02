/**
 * Player Network Metrics Hook
 *
 * Tracks and reports network quality metrics from player devices.
 * Collects latency, jitter, packet loss, retry rates, and reconnection events.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../supabase';

// Latency buckets matching database enum
const LATENCY_BUCKETS = {
  EXCELLENT: { name: 'excellent', max: 50 },
  GOOD: { name: 'good', max: 100 },
  FAIR: { name: 'fair', max: 200 },
  POOR: { name: 'poor', max: 500 },
  CRITICAL: { name: 'critical', max: Infinity }
};

// Reporting interval (30 seconds)
const REPORT_INTERVAL = 30000;

// Ping interval for latency measurement (5 seconds)
const PING_INTERVAL = 5000;

/**
 * Get latency bucket for a given latency value
 */
function getLatencyBucket(latencyMs) {
  if (latencyMs <= LATENCY_BUCKETS.EXCELLENT.max) return LATENCY_BUCKETS.EXCELLENT.name;
  if (latencyMs <= LATENCY_BUCKETS.GOOD.max) return LATENCY_BUCKETS.GOOD.name;
  if (latencyMs <= LATENCY_BUCKETS.FAIR.max) return LATENCY_BUCKETS.FAIR.name;
  if (latencyMs <= LATENCY_BUCKETS.POOR.max) return LATENCY_BUCKETS.POOR.name;
  return LATENCY_BUCKETS.CRITICAL.name;
}

/**
 * Calculate jitter from latency samples
 */
function calculateJitter(samples) {
  if (samples.length < 2) return 0;

  let totalDiff = 0;
  for (let i = 1; i < samples.length; i++) {
    totalDiff += Math.abs(samples[i] - samples[i - 1]);
  }
  return totalDiff / (samples.length - 1);
}

/**
 * Player Network Metrics Hook
 */
export function usePlayerMetrics({ deviceId, tenantId, enabled = true }) {
  const [metrics, setMetrics] = useState({
    latencyMs: null,
    jitterMs: null,
    packetLossPercent: 0,
    latencyBucket: null,
    isOnline: true,
    lastUpdated: null
  });

  const [connectionQuality, setConnectionQuality] = useState('unknown');
  const [isReporting, setIsReporting] = useState(false);

  // Refs for tracking metrics
  const latencySamples = useRef([]);
  const pingCount = useRef(0);
  const failedPings = useRef(0);
  const retryCount = useRef(0);
  const reconnectCount = useRef(0);
  const reportTimer = useRef(null);
  const pingTimer = useRef(null);

  /**
   * Measure latency with a ping request
   */
  const measureLatency = useCallback(async () => {
    if (!enabled) return;

    const startTime = performance.now();
    pingCount.current++;

    try {
      // Use Supabase health check as ping endpoint
      const { error } = await supabase.from('tv_devices').select('id').limit(1).single();

      if (error && error.code !== 'PGRST116') {
        // PGRST116 is "no rows" which is fine
        throw error;
      }

      const latency = Math.round(performance.now() - startTime);
      latencySamples.current.push(latency);

      // Keep last 10 samples
      if (latencySamples.current.length > 10) {
        latencySamples.current.shift();
      }

      const avgLatency = Math.round(
        latencySamples.current.reduce((a, b) => a + b, 0) / latencySamples.current.length
      );
      const jitter = Math.round(calculateJitter(latencySamples.current));
      const bucket = getLatencyBucket(avgLatency);

      setMetrics(prev => ({
        ...prev,
        latencyMs: avgLatency,
        jitterMs: jitter,
        latencyBucket: bucket,
        isOnline: true,
        lastUpdated: new Date()
      }));

      // Update connection quality
      if (avgLatency <= 100 && jitter <= 30) {
        setConnectionQuality('excellent');
      } else if (avgLatency <= 200 && jitter <= 50) {
        setConnectionQuality('good');
      } else if (avgLatency <= 500) {
        setConnectionQuality('fair');
      } else {
        setConnectionQuality('poor');
      }
    } catch (error) {
      failedPings.current++;

      setMetrics(prev => ({
        ...prev,
        isOnline: false,
        lastUpdated: new Date()
      }));
      setConnectionQuality('offline');
    }
  }, [enabled]);

  /**
   * Report metrics to the database
   */
  const reportMetrics = useCallback(async () => {
    if (!enabled || !deviceId || !tenantId) return;
    if (latencySamples.current.length === 0) return;

    setIsReporting(true);

    try {
      const avgLatency = Math.round(
        latencySamples.current.reduce((a, b) => a + b, 0) / latencySamples.current.length
      );
      const jitter = Math.round(calculateJitter(latencySamples.current));
      const packetLoss = pingCount.current > 0
        ? (failedPings.current / pingCount.current) * 100
        : 0;

      await supabase.rpc('record_player_network_metrics', {
        p_device_id: deviceId,
        p_tenant_id: tenantId,
        p_latency_ms: avgLatency,
        p_jitter_ms: jitter,
        p_packet_loss_percent: Math.round(packetLoss * 100) / 100,
        p_retry_count: retryCount.current,
        p_reconnect_count: reconnectCount.current
      });

      // Reset counters after successful report
      retryCount.current = 0;
      reconnectCount.current = 0;
      failedPings.current = 0;
      pingCount.current = 0;

      setMetrics(prev => ({
        ...prev,
        packetLossPercent: Math.round(packetLoss * 100) / 100
      }));
    } catch (error) {
      console.warn('Failed to report player metrics:', error.message);
    } finally {
      setIsReporting(false);
    }
  }, [deviceId, tenantId, enabled]);

  /**
   * Record a retry event
   */
  const recordRetry = useCallback(() => {
    retryCount.current++;
  }, []);

  /**
   * Record a reconnection event
   */
  const recordReconnect = useCallback(() => {
    reconnectCount.current++;
  }, []);

  /**
   * Record a custom latency measurement (for specific operations)
   */
  const recordLatency = useCallback((latencyMs) => {
    latencySamples.current.push(latencyMs);
    if (latencySamples.current.length > 10) {
      latencySamples.current.shift();
    }
  }, []);

  // Start/stop measurement timers
  useEffect(() => {
    if (!enabled || !deviceId) return;

    // Initial measurement
    measureLatency();

    // Set up ping interval
    pingTimer.current = setInterval(measureLatency, PING_INTERVAL);

    // Set up report interval
    reportTimer.current = setInterval(reportMetrics, REPORT_INTERVAL);

    return () => {
      if (pingTimer.current) {
        clearInterval(pingTimer.current);
        pingTimer.current = null;
      }
      if (reportTimer.current) {
        clearInterval(reportTimer.current);
        reportTimer.current = null;
      }
    };
  }, [enabled, deviceId, measureLatency, reportMetrics]);

  // Report on unmount
  useEffect(() => {
    return () => {
      if (enabled && deviceId && tenantId) {
        reportMetrics();
      }
    };
  }, [enabled, deviceId, tenantId, reportMetrics]);

  return {
    metrics,
    connectionQuality,
    isReporting,
    recordRetry,
    recordReconnect,
    recordLatency,
    forceReport: reportMetrics
  };
}

/**
 * Hook to get historical player metrics
 */
export function usePlayerMetricsHistory({ deviceId, hours = 24 }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!deviceId) {
      setLoading(false);
      return;
    }

    const fetchHistory = async () => {
      setLoading(true);
      setError(null);

      try {
        const since = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();

        const { data: metrics, error: fetchError } = await supabase
          .from('player_network_metrics')
          .select('*')
          .eq('device_id', deviceId)
          .gte('measured_at', since)
          .order('measured_at', { ascending: true });

        if (fetchError) throw fetchError;

        // Calculate summary
        if (metrics && metrics.length > 0) {
          const summary = {
            avgLatencyMs: Math.round(
              metrics.reduce((sum, m) => sum + (m.latency_ms || 0), 0) / metrics.length
            ),
            avgJitterMs: Math.round(
              metrics.reduce((sum, m) => sum + (m.jitter_ms || 0), 0) / metrics.length
            ),
            avgPacketLoss: Math.round(
              metrics.reduce((sum, m) => sum + (m.packet_loss_percent || 0), 0) / metrics.length * 100
            ) / 100,
            totalRetries: metrics.reduce((sum, m) => sum + (m.retry_count || 0), 0),
            totalReconnects: metrics.reduce((sum, m) => sum + (m.reconnect_count || 0), 0),
            latencyBuckets: {
              excellent: metrics.filter(m => m.latency_bucket === 'excellent').length,
              good: metrics.filter(m => m.latency_bucket === 'good').length,
              fair: metrics.filter(m => m.latency_bucket === 'fair').length,
              poor: metrics.filter(m => m.latency_bucket === 'poor').length,
              critical: metrics.filter(m => m.latency_bucket === 'critical').length
            },
            samples: metrics.length
          };

          // Calculate health score
          const excellentGood = summary.latencyBuckets.excellent + summary.latencyBuckets.good;
          summary.healthScore = summary.samples > 0
            ? Math.round((excellentGood / summary.samples) * 100)
            : 100;

          setData({
            metrics,
            summary,
            period: { hours, since }
          });
        } else {
          setData(null);
        }
      } catch (err) {
        console.error('Error fetching player metrics history:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, [deviceId, hours]);

  return { data, loading, error };
}

/**
 * Network quality indicator component helper
 */
export function getQualityIndicator(quality) {
  const indicators = {
    excellent: { color: 'text-green-500', bg: 'bg-green-100', label: 'Excellent' },
    good: { color: 'text-green-400', bg: 'bg-green-50', label: 'Good' },
    fair: { color: 'text-yellow-500', bg: 'bg-yellow-100', label: 'Fair' },
    poor: { color: 'text-orange-500', bg: 'bg-orange-100', label: 'Poor' },
    offline: { color: 'text-red-500', bg: 'bg-red-100', label: 'Offline' },
    unknown: { color: 'text-gray-400', bg: 'bg-gray-100', label: 'Unknown' }
  };

  return indicators[quality] || indicators.unknown;
}

export default usePlayerMetrics;
