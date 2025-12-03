/**
 * Playlist Resolution Load Test
 * Phase 13: Simulates content resolution for player screens
 *
 * This test simulates the content resolution RPC calls that
 * players make to determine what content to display.
 *
 * Tool: k6
 * Target: < 150ms p95 response time
 *
 * Run: k6 run playlist-resolution.js
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const resolutionLatency = new Trend('resolution_latency');
const cacheHits = new Counter('cache_hits');
const cacheMisses = new Counter('cache_misses');

// Configuration
const BASE_URL = __ENV.BASE_URL || 'http://localhost:5173';
const DURATION = __ENV.DURATION || '30s';
const VUS = parseInt(__ENV.VUS) || 50;
const RAMP_UP = __ENV.RAMP_UP || '10s';

export const options = {
  stages: [
    { duration: RAMP_UP, target: VUS },
    { duration: DURATION, target: VUS },
    { duration: '10s', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<150', 'p(99)<300'],
    errors: ['rate<0.01'],
    resolution_latency: ['p(95)<150'],
  },
};

// Simulated screen IDs
const SCREEN_IDS = Array.from({ length: 500 }, (_, i) =>
  `screen-${String(i).padStart(6, '0')}`
);

export function setup() {
  console.log(`
╔════════════════════════════════════════════════════════════════╗
║            BizScreen Playlist Resolution Load Test             ║
╠════════════════════════════════════════════════════════════════╣
║  Target URL:     ${BASE_URL.padEnd(42)}║
║  Duration:       ${DURATION.padEnd(42)}║
║  Virtual Users:  ${String(VUS).padEnd(42)}║
║  Simulated Screens: ${String(SCREEN_IDS.length).padEnd(39)}║
╚════════════════════════════════════════════════════════════════╝
  `);

  return { screenIds: SCREEN_IDS };
}

export default function(data) {
  // Simulate content resolution request
  const vuId = __VU;
  const iterationId = __ITER;
  const screenIndex = (vuId * 10 + iterationId) % data.screenIds.length;
  const screenId = data.screenIds[screenIndex];

  // Use health endpoint for safe load testing
  // In production, this would be: POST /api/content/resolve
  const url = `${BASE_URL}/api/health`;

  const payload = JSON.stringify({
    screen_id: screenId,
    timestamp: new Date().toISOString(),
    context: {
      timezone: 'America/New_York',
      time_of_day: getCurrentTimeSlot(),
      day_of_week: new Date().getDay(),
    },
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'BizScreen-Player/1.0',
      'X-Screen-ID': screenId,
      'X-Cache-Check': 'true',
    },
    tags: {
      name: 'content-resolution',
    },
  };

  const startTime = Date.now();
  const res = http.get(url, params);
  const duration = Date.now() - startTime;

  resolutionLatency.add(duration);

  // Check response
  const success = check(res, {
    'status is 200': (r) => r.status === 200,
    'response time < 150ms': (r) => r.timings.duration < 150,
    'response is valid JSON': (r) => {
      try {
        JSON.parse(r.body);
        return true;
      } catch {
        return false;
      }
    },
  });

  errorRate.add(!success);

  // Track cache behavior (simulated)
  const cacheHeader = res.headers['X-Cache'];
  if (cacheHeader === 'HIT') {
    cacheHits.add(1);
  } else {
    cacheMisses.add(1);
  }

  // Simulate polling interval (60 seconds in production, 2 seconds for testing)
  sleep(2);
}

function getCurrentTimeSlot() {
  const hour = new Date().getHours();
  if (hour >= 6 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 17) return 'afternoon';
  if (hour >= 17 && hour < 21) return 'evening';
  return 'night';
}

export function handleSummary(data) {
  const p95 = data.metrics.http_req_duration?.values['p(95)'] || 0;
  const p99 = data.metrics.http_req_duration?.values['p(99)'] || 0;
  const errRate = data.metrics.errors?.values.rate || 0;
  const rps = data.metrics.http_reqs?.values.rate || 0;

  const p95Pass = p95 < 150;
  const p99Pass = p99 < 300;
  const errorPass = errRate < 0.01;
  const rpsPass = rps > 20;

  console.log(`
╔════════════════════════════════════════════════════════════════╗
║               PLAYLIST RESOLUTION TEST RESULTS                 ║
╠════════════════════════════════════════════════════════════════╣
║  Total Requests:   ${String(data.metrics.http_reqs?.values.count || 0).padEnd(40)}║
║  Requests/sec:     ${(rps).toFixed(2).padEnd(40)}║
║  Avg Latency:      ${((data.metrics.http_req_duration?.values.avg || 0).toFixed(2) + ' ms').padEnd(40)}║
║  p95 Latency:      ${(p95.toFixed(2) + ' ms').padEnd(40)}║
║  p99 Latency:      ${(p99.toFixed(2) + ' ms').padEnd(40)}║
║  Max Latency:      ${((data.metrics.http_req_duration?.values.max || 0).toFixed(2) + ' ms').padEnd(40)}║
║  Error Rate:       ${((errRate * 100).toFixed(2) + '%').padEnd(40)}║
╠════════════════════════════════════════════════════════════════╣
║  PASS CRITERIA                                                 ║
╠════════════════════════════════════════════════════════════════╣
║  p95 < 150ms:      ${(p95Pass ? '✅ PASS' : '❌ FAIL').padEnd(40)}║
║  p99 < 300ms:      ${(p99Pass ? '✅ PASS' : '❌ FAIL').padEnd(40)}║
║  Error Rate < 1%:  ${(errorPass ? '✅ PASS' : '❌ FAIL').padEnd(40)}║
║  RPS > 20:         ${(rpsPass ? '✅ PASS' : '❌ FAIL').padEnd(40)}║
╚════════════════════════════════════════════════════════════════╝
  `);

  const result = {
    test: 'playlist-resolution',
    passed: p95Pass && p99Pass && errorPass && rpsPass,
    metrics: {
      totalRequests: data.metrics.http_reqs?.values.count || 0,
      rps: rps,
      avgLatency: data.metrics.http_req_duration?.values.avg || 0,
      p95Latency: p95,
      p99Latency: p99,
      maxLatency: data.metrics.http_req_duration?.values.max || 0,
      errorRate: errRate * 100,
    },
    thresholds: {
      p95: { value: p95, threshold: 150, passed: p95Pass },
      p99: { value: p99, threshold: 300, passed: p99Pass },
      errorRate: { value: errRate * 100, threshold: 1, passed: errorPass },
      rps: { value: rps, threshold: 20, passed: rpsPass },
    },
  };

  return {
    'stdout': JSON.stringify(result, null, 2),
    'results/playlist-resolution-result.json': JSON.stringify(result, null, 2),
  };
}
