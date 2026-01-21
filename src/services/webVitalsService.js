/**
 * Web Vitals Service - Performance Monitoring
 *
 * Tracks Core Web Vitals and other performance metrics:
 * - LCP (Largest Contentful Paint) - loading performance
 * - FID (First Input Delay) - interactivity
 * - CLS (Cumulative Layout Shift) - visual stability
 * - FCP (First Contentful Paint) - initial render
 * - TTFB (Time to First Byte) - server response
 * - INP (Interaction to Next Paint) - responsiveness
 */

import { onCLS, onFCP, onLCP, onTTFB, onINP } from 'web-vitals';
import { captureMessage, setContext } from '../utils/errorTracking';
import { isProduction } from '../config/env';

// Metrics storage for aggregation
const metricsBuffer = [];
const BUFFER_SIZE = 10;
const FLUSH_INTERVAL = 30000; // 30 seconds

// Thresholds based on Google's recommendations
const THRESHOLDS = {
  LCP: { good: 2500, needsImprovement: 4000 },
  FID: { good: 100, needsImprovement: 300 },
  CLS: { good: 0.1, needsImprovement: 0.25 },
  FCP: { good: 1800, needsImprovement: 3000 },
  TTFB: { good: 800, needsImprovement: 1800 },
  INP: { good: 200, needsImprovement: 500 },
};

/**
 * Get rating for a metric value
 */
function getRating(name, value) {
  const threshold = THRESHOLDS[name];
  if (!threshold) return 'unknown';
  if (value <= threshold.good) return 'good';
  if (value <= threshold.needsImprovement) return 'needs-improvement';
  return 'poor';
}

/**
 * Handle a web vitals metric
 */
function handleMetric(metric) {
  const { name, value, rating, id, navigationType } = metric;

  // Log in development
  if (!isProduction()) {
    const emoji = rating === 'good' ? '✅' : rating === 'needs-improvement' ? '⚠️' : '❌';
    console.log(`[WebVitals] ${emoji} ${name}: ${value.toFixed(2)} (${rating})`);
  }

  // Store in buffer
  metricsBuffer.push({
    name,
    value,
    rating: rating || getRating(name, value),
    id,
    navigationType,
    timestamp: Date.now(),
    url: window.location.pathname,
  });

  // Send poor metrics immediately
  if (rating === 'poor' || getRating(name, value) === 'poor') {
    reportPoorMetric(metric);
  }

  // Flush buffer if full
  if (metricsBuffer.length >= BUFFER_SIZE) {
    flushMetrics();
  }
}

/**
 * Report a poor metric to error tracking
 */
function reportPoorMetric(metric) {
  const { name, value, rating } = metric;

  captureMessage(`Poor Web Vital: ${name}`, 'warning', {
    metric: name,
    value: value.toFixed(2),
    rating,
    threshold: THRESHOLDS[name],
    url: window.location.pathname,
    userAgent: navigator.userAgent,
    connection: getConnectionInfo(),
  });
}

/**
 * Get connection information if available
 */
function getConnectionInfo() {
  const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  if (!conn) return null;

  return {
    effectiveType: conn.effectiveType,
    downlink: conn.downlink,
    rtt: conn.rtt,
    saveData: conn.saveData,
  };
}

/**
 * Flush metrics buffer to analytics/monitoring
 */
function flushMetrics() {
  if (metricsBuffer.length === 0) return;

  const metrics = [...metricsBuffer];
  metricsBuffer.length = 0;

  // Calculate aggregates
  const aggregates = {};
  metrics.forEach(m => {
    if (!aggregates[m.name]) {
      aggregates[m.name] = { values: [], ratings: { good: 0, 'needs-improvement': 0, poor: 0 } };
    }
    aggregates[m.name].values.push(m.value);
    aggregates[m.name].ratings[m.rating]++;
  });

  // Calculate averages and set context
  const summary = {};
  Object.entries(aggregates).forEach(([name, data]) => {
    const avg = data.values.reduce((a, b) => a + b, 0) / data.values.length;
    summary[name] = {
      average: avg.toFixed(2),
      rating: getRating(name, avg),
      samples: data.values.length,
    };
  });

  // Set context for error tracking
  setContext('webVitals', summary);

  // Log summary in development
  if (!isProduction()) {
    console.log('[WebVitals] Summary:', summary);
  }

  // Send to analytics endpoint if configured
  sendToAnalytics(metrics, summary);
}

/**
 * Send metrics to analytics backend
 */
async function sendToAnalytics(metrics, summary) {
  const analyticsEndpoint = import.meta.env.VITE_ANALYTICS_ENDPOINT;
  if (!analyticsEndpoint) return;

  try {
    await fetch(analyticsEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'web_vitals',
        metrics,
        summary,
        timestamp: Date.now(),
        sessionId: getSessionId(),
        url: window.location.href,
      }),
      keepalive: true, // Ensure delivery even on page unload
    });
  } catch (error) {
    // Silently fail - don't impact user experience
    if (!isProduction()) {
      console.warn('[WebVitals] Failed to send analytics:', error);
    }
  }
}

/**
 * Get or create session ID
 */
function getSessionId() {
  let sessionId = sessionStorage.getItem('webvitals_session');
  if (!sessionId) {
    sessionId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    sessionStorage.setItem('webvitals_session', sessionId);
  }
  return sessionId;
}

/**
 * Initialize Web Vitals monitoring
 */
export function initWebVitals() {
  // Register metric handlers
  onCLS(handleMetric);
  onFCP(handleMetric);
  onLCP(handleMetric);
  onTTFB(handleMetric);
  onINP(handleMetric);

  // Set up periodic flush
  setInterval(flushMetrics, FLUSH_INTERVAL);

  // Flush on page visibility change (user leaving)
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      flushMetrics();
    }
  });

  // Flush before page unload
  window.addEventListener('pagehide', flushMetrics);

  if (!isProduction()) {
    console.log('[WebVitals] Monitoring initialized');
  }
}

/**
 * Get current metrics summary
 */
export function getMetricsSummary() {
  const summary = {};

  metricsBuffer.forEach(m => {
    if (!summary[m.name] || m.timestamp > summary[m.name].timestamp) {
      summary[m.name] = {
        value: m.value,
        rating: m.rating,
        timestamp: m.timestamp,
      };
    }
  });

  return summary;
}

/**
 * Check if performance is acceptable
 */
export function isPerformanceAcceptable() {
  const summary = getMetricsSummary();
  const criticalMetrics = ['LCP', 'FID', 'CLS'];

  return criticalMetrics.every(name => {
    const metric = summary[name];
    return !metric || metric.rating !== 'poor';
  });
}

/**
 * Manual performance mark
 */
export function markPerformance(name) {
  if (typeof performance !== 'undefined' && performance.mark) {
    performance.mark(name);
  }
}

/**
 * Measure between two marks
 */
export function measurePerformance(name, startMark, endMark) {
  if (typeof performance !== 'undefined' && performance.measure) {
    try {
      const measure = performance.measure(name, startMark, endMark);
      return measure.duration;
    } catch (error) {
      return null;
    }
  }
  return null;
}

export default {
  init: initWebVitals,
  getMetricsSummary,
  isPerformanceAcceptable,
  markPerformance,
  measurePerformance,
  THRESHOLDS,
};
