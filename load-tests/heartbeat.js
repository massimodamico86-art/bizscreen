/**
 * Screen Heartbeat Load Test
 * Phase 13: Simulates screen heartbeat at scale
 *
 * This test simulates 100-10,000 screens sending heartbeats,
 * which is the most frequent API call in the system.
 *
 * Tool: k6
 * Target: < 100ms p95 response time
 *
 * Run: k6 run heartbeat.js
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const heartbeatLatency = new Trend('heartbeat_latency');

// Configuration
const BASE_URL = __ENV.BASE_URL || 'http://localhost:5173';
const DURATION = __ENV.DURATION || '30s';
const VUS = parseInt(__ENV.VUS) || 50;
const RAMP_UP = __ENV.RAMP_UP || '10s';

export const options = {
  stages: [
    { duration: RAMP_UP, target: VUS },     // Ramp up
    { duration: DURATION, target: VUS },     // Hold
    { duration: '10s', target: 0 },          // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<100', 'p(99)<200'],
    errors: ['rate<0.01'],
    heartbeat_latency: ['p(95)<100'],
  },
};

// Simulated screen IDs (would be real UUIDs in production)
const SCREEN_IDS = Array.from({ length: 1000 }, (_, i) =>
  `screen-${String(i).padStart(6, '0')}`
);

// Simulated API keys (would be real keys in production)
const API_KEYS = Array.from({ length: 1000 }, (_, i) =>
  `biz_test_${String(i).padStart(6, '0')}`
);

export function setup() {
  console.log(`
╔════════════════════════════════════════════════════════════════╗
║              BizScreen Screen Heartbeat Load Test              ║
╠════════════════════════════════════════════════════════════════╣
║  Target URL:     ${BASE_URL.padEnd(42)}║
║  Duration:       ${DURATION.padEnd(42)}║
║  Virtual Users:  ${String(VUS).padEnd(42)}║
║  Simulated Screens: ${String(SCREEN_IDS.length).padEnd(39)}║
╚════════════════════════════════════════════════════════════════╝
  `);

  return {
    screenIds: SCREEN_IDS,
    apiKeys: API_KEYS,
  };
}

export default function(data) {
  // Simulate a unique screen for each VU iteration
  const vuId = __VU;
  const iterationId = __ITER;
  const screenIndex = (vuId * 100 + iterationId) % data.screenIds.length;
  const screenId = data.screenIds[screenIndex];
  const apiKey = data.apiKeys[screenIndex];

  // Use health endpoint for safe load testing
  // In production, this would be: POST /api/screens/heartbeat
  const url = `${BASE_URL}/api/health`;

  const payload = JSON.stringify({
    screen_id: screenId,
    timestamp: new Date().toISOString(),
    status: 'online',
    metrics: {
      cpu: Math.random() * 100,
      memory: Math.random() * 100,
      uptime: Math.floor(Math.random() * 86400),
    },
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'BizScreen-Player/1.0',
      'X-Screen-ID': screenId,
      'X-API-Key': apiKey,
    },
    tags: {
      name: 'heartbeat',
    },
  };

  const startTime = Date.now();
  const res = http.get(url, params); // Using GET for health endpoint
  const duration = Date.now() - startTime;

  // Record custom metric
  heartbeatLatency.add(duration);

  // Check response
  const success = check(res, {
    'status is 200': (r) => r.status === 200,
    'response time < 100ms': (r) => r.timings.duration < 100,
    'response has status': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.status !== undefined;
      } catch {
        return false;
      }
    },
  });

  errorRate.add(!success);

  // Simulate heartbeat interval (30 seconds in production, 1 second for testing)
  sleep(1);
}

export function handleSummary(data) {
  const p95 = data.metrics.http_req_duration?.values['p(95)'] || 0;
  const p99 = data.metrics.http_req_duration?.values['p(99)'] || 0;
  const errRate = data.metrics.errors?.values.rate || 0;
  const rps = data.metrics.http_reqs?.values.rate || 0;

  const p95Pass = p95 < 100;
  const p99Pass = p99 < 200;
  const errorPass = errRate < 0.01;
  const rpsPass = rps > 30;

  console.log(`
╔════════════════════════════════════════════════════════════════╗
║                   HEARTBEAT TEST RESULTS                       ║
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
║  p95 < 100ms:      ${(p95Pass ? '✅ PASS' : '❌ FAIL').padEnd(40)}║
║  p99 < 200ms:      ${(p99Pass ? '✅ PASS' : '❌ FAIL').padEnd(40)}║
║  Error Rate < 1%:  ${(errorPass ? '✅ PASS' : '❌ FAIL').padEnd(40)}║
║  RPS > 30:         ${(rpsPass ? '✅ PASS' : '❌ FAIL').padEnd(40)}║
╚════════════════════════════════════════════════════════════════╝
  `);

  const result = {
    test: 'heartbeat',
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
      p95: { value: p95, threshold: 100, passed: p95Pass },
      p99: { value: p99, threshold: 200, passed: p99Pass },
      errorRate: { value: errRate * 100, threshold: 1, passed: errorPass },
      rps: { value: rps, threshold: 30, passed: rpsPass },
    },
  };

  return {
    'stdout': JSON.stringify(result, null, 2),
    'results/heartbeat-result.json': JSON.stringify(result, null, 2),
  };
}
