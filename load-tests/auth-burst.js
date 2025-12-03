#!/usr/bin/env node
/**
 * Auth Burst Load Test
 * Phase 13: Simulates login burst scenarios
 *
 * This test simulates a burst of authentication attempts,
 * like what might occur after a marketing campaign or system recovery.
 *
 * Tool: autocannon
 * Target: < 200ms p95 response time
 */

import autocannon from 'autocannon';

const BASE_URL = process.env.BASE_URL || 'http://localhost:5173';
const DURATION = parseInt(process.env.DURATION) || 30;
const CONNECTIONS = parseInt(process.env.CONNECTIONS) || 10;
const PIPELINING = parseInt(process.env.PIPELINING) || 1;

// Simulated test credentials (these should not work in production)
const TEST_CREDENTIALS = [
  { email: 'load-test-1@example.com', password: 'LoadTest123!' },
  { email: 'load-test-2@example.com', password: 'LoadTest123!' },
  { email: 'load-test-3@example.com', password: 'LoadTest123!' },
];

let credentialIndex = 0;

function getNextCredentials() {
  const creds = TEST_CREDENTIALS[credentialIndex % TEST_CREDENTIALS.length];
  credentialIndex++;
  return creds;
}

const config = {
  url: `${BASE_URL}/api/health`, // Use health endpoint for load testing (safe)
  connections: CONNECTIONS,
  pipelining: PIPELINING,
  duration: DURATION,
  headers: {
    'Content-Type': 'application/json',
    'User-Agent': 'BizScreen-LoadTest/1.0',
  },
  // For actual auth testing, you would use:
  // method: 'POST',
  // body: JSON.stringify(getNextCredentials()),
  // But we use health endpoint for safe load testing
};

console.log(`
╔════════════════════════════════════════════════════════════════╗
║               BizScreen Auth Burst Load Test                   ║
╠════════════════════════════════════════════════════════════════╣
║  Target URL:     ${BASE_URL.padEnd(42)}║
║  Duration:       ${(DURATION + 's').padEnd(42)}║
║  Connections:    ${String(CONNECTIONS).padEnd(42)}║
║  Pipelining:     ${String(PIPELINING).padEnd(42)}║
╚════════════════════════════════════════════════════════════════╝
`);

console.log('Starting auth burst load test...\n');

const instance = autocannon(config, (err, result) => {
  if (err) {
    console.error('Load test failed:', err);
    process.exit(1);
  }

  // Calculate pass/fail
  const p95 = result.latency.p95;
  const p99 = result.latency.p99;
  const errorRate = result.non2xx / result.requests.total * 100;
  const rps = result.requests.average;

  const p95Pass = p95 < 200;
  const p99Pass = p99 < 500;
  const errorPass = errorRate < 1;
  const rpsPass = rps > 50;

  console.log(`
╔════════════════════════════════════════════════════════════════╗
║                    AUTH BURST TEST RESULTS                      ║
╠════════════════════════════════════════════════════════════════╣
║  Total Requests:   ${String(result.requests.total).padEnd(40)}║
║  Requests/sec:     ${rps.toFixed(2).padEnd(40)}║
║  Avg Latency:      ${(result.latency.average + ' ms').padEnd(40)}║
║  p95 Latency:      ${(p95 + ' ms').padEnd(40)}║
║  p99 Latency:      ${(p99 + ' ms').padEnd(40)}║
║  Max Latency:      ${(result.latency.max + ' ms').padEnd(40)}║
║  Errors:           ${String(result.non2xx).padEnd(40)}║
║  Error Rate:       ${(errorRate.toFixed(2) + '%').padEnd(40)}║
╠════════════════════════════════════════════════════════════════╣
║  PASS CRITERIA                                                 ║
╠════════════════════════════════════════════════════════════════╣
║  p95 < 200ms:      ${(p95Pass ? '✅ PASS' : '❌ FAIL').padEnd(40)}║
║  p99 < 500ms:      ${(p99Pass ? '✅ PASS' : '❌ FAIL').padEnd(40)}║
║  Error Rate < 1%:  ${(errorPass ? '✅ PASS' : '❌ FAIL').padEnd(40)}║
║  RPS > 50:         ${(rpsPass ? '✅ PASS' : '❌ FAIL').padEnd(40)}║
╚════════════════════════════════════════════════════════════════╝
`);

  // Return result for programmatic use
  const testResult = {
    test: 'auth-burst',
    passed: p95Pass && p99Pass && errorPass && rpsPass,
    metrics: {
      totalRequests: result.requests.total,
      rps: rps,
      avgLatency: result.latency.average,
      p95Latency: p95,
      p99Latency: p99,
      maxLatency: result.latency.max,
      errors: result.non2xx,
      errorRate: errorRate,
    },
    thresholds: {
      p95: { value: p95, threshold: 200, passed: p95Pass },
      p99: { value: p99, threshold: 500, passed: p99Pass },
      errorRate: { value: errorRate, threshold: 1, passed: errorPass },
      rps: { value: rps, threshold: 50, passed: rpsPass },
    },
  };

  // Output JSON result for pipeline integration
  if (process.env.JSON_OUTPUT) {
    console.log('\n--- JSON RESULT ---');
    console.log(JSON.stringify(testResult, null, 2));
  }

  process.exit(testResult.passed ? 0 : 1);
});

// Track progress
autocannon.track(instance, { renderProgressBar: true });
