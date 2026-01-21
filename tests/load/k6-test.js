/**
 * k6 Load Test Script for BizScreen
 *
 * Supports multiple test types:
 * - smoke: Quick validation (1 VU, 1 minute)
 * - load: Standard load test (configurable VUs, 5 minutes default)
 * - stress: Find breaking point (ramp up to high VUs)
 * - soak: Extended duration test (moderate VUs, 30+ minutes)
 *
 * Usage:
 *   k6 run --env BASE_URL=https://staging.bizscreen.app --env TEST_TYPE=smoke k6-test.js
 */

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const apiLatency = new Trend('api_latency');
const pageLoadTime = new Trend('page_load_time');
const apiCalls = new Counter('api_calls');

// Environment variables
const BASE_URL = __ENV.BASE_URL || 'https://staging.bizscreen.app';
const TEST_TYPE = __ENV.TEST_TYPE || 'smoke';
const CUSTOM_DURATION = __ENV.DURATION || '5m';
const CUSTOM_VUS = parseInt(__ENV.VUS || '10');

// Test configurations
const testConfigs = {
  smoke: {
    vus: 1,
    duration: '1m',
    thresholds: {
      http_req_duration: ['p(95)<3000'],
      errors: ['rate<0.1'],
    },
  },
  load: {
    stages: [
      { duration: '1m', target: CUSTOM_VUS },      // Ramp up
      { duration: CUSTOM_DURATION, target: CUSTOM_VUS }, // Stay at target
      { duration: '1m', target: 0 },               // Ramp down
    ],
    thresholds: {
      http_req_duration: ['p(95)<2000', 'p(99)<5000'],
      errors: ['rate<0.05'],
      http_req_failed: ['rate<0.05'],
    },
  },
  stress: {
    stages: [
      { duration: '2m', target: 10 },   // Below normal
      { duration: '5m', target: 50 },   // Normal load
      { duration: '5m', target: 100 },  // Around breaking point
      { duration: '5m', target: 150 },  // Beyond breaking point
      { duration: '3m', target: 0 },    // Recovery
    ],
    thresholds: {
      http_req_duration: ['p(95)<5000'],
      errors: ['rate<0.2'],
    },
  },
  soak: {
    stages: [
      { duration: '5m', target: CUSTOM_VUS },     // Ramp up
      { duration: CUSTOM_DURATION, target: CUSTOM_VUS }, // Stay at target (30m+ recommended)
      { duration: '5m', target: 0 },              // Ramp down
    ],
    thresholds: {
      http_req_duration: ['p(95)<3000'],
      errors: ['rate<0.01'],
    },
  },
};

// Select configuration based on test type
const config = testConfigs[TEST_TYPE] || testConfigs.smoke;

export const options = {
  ...(config.stages ? { stages: config.stages } : { vus: config.vus, duration: config.duration }),
  thresholds: {
    ...config.thresholds,
    api_latency: ['p(95)<2000'],
    page_load_time: ['p(95)<3000'],
  },
  // Discard response bodies we don't need
  discardResponseBodies: false,
  // HTTP debugging (set to true for troubleshooting)
  httpDebug: 'none',
};

// Common headers
const headers = {
  'Content-Type': 'application/json',
  'Accept': 'application/json',
  'User-Agent': 'k6-load-test/1.0',
};

/**
 * Main test function
 */
export default function () {
  group('Public Pages', function () {
    testHomePage();
    testHealthEndpoint();
  });

  group('Static Assets', function () {
    testStaticAssets();
  });

  group('API Endpoints', function () {
    testPublicApiEndpoints();
  });

  // Simulate user think time
  sleep(Math.random() * 3 + 1);
}

/**
 * Test home page load
 */
function testHomePage() {
  const startTime = new Date();
  const res = http.get(BASE_URL, { headers, tags: { name: 'home_page' } });

  const loadTime = new Date() - startTime;
  pageLoadTime.add(loadTime);

  const success = check(res, {
    'home page status is 200': (r) => r.status === 200,
    'home page has content': (r) => r.body && r.body.length > 0,
    'home page loads within 3s': (r) => r.timings.duration < 3000,
  });

  errorRate.add(!success);
}

/**
 * Test health endpoint
 */
function testHealthEndpoint() {
  const startTime = new Date();
  const res = http.get(`${BASE_URL}/api/health`, {
    headers,
    tags: { name: 'health_check' },
  });

  apiLatency.add(new Date() - startTime);
  apiCalls.add(1);

  const success = check(res, {
    'health endpoint status is 200': (r) => r.status === 200,
    'health endpoint responds within 1s': (r) => r.timings.duration < 1000,
  });

  errorRate.add(!success);
}

/**
 * Test static assets
 */
function testStaticAssets() {
  // Test common static assets
  const assets = [
    '/favicon.ico',
    '/manifest.json',
  ];

  for (const asset of assets) {
    const res = http.get(`${BASE_URL}${asset}`, {
      headers: { 'Accept': '*/*' },
      tags: { name: 'static_asset' },
    });

    check(res, {
      [`${asset} returns successfully`]: (r) => r.status === 200 || r.status === 304,
    });
  }
}

/**
 * Test public API endpoints
 */
function testPublicApiEndpoints() {
  // Test API version endpoint (if exists)
  const versionRes = http.get(`${BASE_URL}/api/v1/version`, {
    headers,
    tags: { name: 'api_version' },
  });

  apiCalls.add(1);

  // This might 404 if not implemented, which is okay
  check(versionRes, {
    'version endpoint responds': (r) => r.status < 500,
  });
}

/**
 * Setup function - runs once at the start
 */
export function setup() {
  console.log(`Starting ${TEST_TYPE} test against ${BASE_URL}`);
  console.log(`Configuration: VUs=${CUSTOM_VUS}, Duration=${CUSTOM_DURATION}`);

  // Verify target is reachable
  const res = http.get(`${BASE_URL}/api/health`);
  if (res.status !== 200) {
    console.error(`Target ${BASE_URL} is not healthy. Status: ${res.status}`);
  }

  return { startTime: new Date().toISOString() };
}

/**
 * Teardown function - runs once at the end
 */
export function teardown(data) {
  console.log(`Test completed. Started at: ${data.startTime}`);
  console.log(`Test type: ${TEST_TYPE}`);
}

/**
 * Handle test summary
 */
export function handleSummary(data) {
  const summary = {
    timestamp: new Date().toISOString(),
    testType: TEST_TYPE,
    baseUrl: BASE_URL,
    metrics: {
      http_req_duration: data.metrics.http_req_duration,
      http_req_failed: data.metrics.http_req_failed,
      errors: data.metrics.errors,
      api_latency: data.metrics.api_latency,
      page_load_time: data.metrics.page_load_time,
      api_calls: data.metrics.api_calls,
    },
    thresholds: data.root_group ? {
      passed: Object.values(data.root_group.checks || {}).every(c => c.passes > 0),
    } : { passed: true },
  };

  return {
    'results/summary.json': JSON.stringify(summary, null, 2),
    stdout: textSummary(data, { indent: ' ', enableColors: true }),
  };
}

/**
 * Generate text summary
 */
function textSummary(data, options = {}) {
  const lines = [
    '',
    '='.repeat(60),
    `  Load Test Summary - ${TEST_TYPE.toUpperCase()}`,
    '='.repeat(60),
    '',
    `  Target: ${BASE_URL}`,
    `  Test Type: ${TEST_TYPE}`,
    '',
    '  HTTP Request Metrics:',
  ];

  if (data.metrics.http_req_duration) {
    const duration = data.metrics.http_req_duration;
    lines.push(`    Duration (avg): ${duration.values.avg?.toFixed(2) || 'N/A'}ms`);
    lines.push(`    Duration (p95): ${duration.values['p(95)']?.toFixed(2) || 'N/A'}ms`);
    lines.push(`    Duration (p99): ${duration.values['p(99)']?.toFixed(2) || 'N/A'}ms`);
  }

  if (data.metrics.http_req_failed) {
    lines.push(`    Failed Rate: ${(data.metrics.http_req_failed.values.rate * 100).toFixed(2)}%`);
  }

  if (data.metrics.api_calls) {
    lines.push(`    Total API Calls: ${data.metrics.api_calls.values.count || 0}`);
  }

  lines.push('');
  lines.push('='.repeat(60));
  lines.push('');

  return lines.join('\n');
}
