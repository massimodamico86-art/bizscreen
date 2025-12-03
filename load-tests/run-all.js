#!/usr/bin/env node
/**
 * Load Test Runner
 * Phase 13: Runs all load tests and generates baseline report
 *
 * Usage: node load-tests/run-all.js [--quick] [--json]
 *
 * Options:
 *   --quick  Run shorter tests (10s instead of 30s)
 *   --json   Output JSON results only
 */

import { spawn } from 'child_process';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const args = process.argv.slice(2);
const isQuick = args.includes('--quick');
const isJson = args.includes('--json');

const RESULTS_DIR = join(__dirname, 'results');

// Ensure results directory exists
if (!existsSync(RESULTS_DIR)) {
  mkdirSync(RESULTS_DIR, { recursive: true });
}

const log = (msg) => {
  if (!isJson) console.log(msg);
};

// Test configurations
const tests = [
  {
    name: 'auth-burst',
    type: 'autocannon',
    script: 'auth-burst.js',
    description: 'Authentication burst simulation',
  },
  {
    name: 'media-library',
    type: 'autocannon',
    script: 'media-library.js',
    description: 'Media library load test',
  },
  {
    name: 'heartbeat',
    type: 'k6',
    script: 'heartbeat.js',
    description: 'Screen heartbeat at scale',
  },
  {
    name: 'playlist-resolution',
    type: 'k6',
    script: 'playlist-resolution.js',
    description: 'Content resolution for players',
  },
];

async function runAutocannonTest(test) {
  return new Promise((resolve) => {
    const env = {
      ...process.env,
      DURATION: isQuick ? '10' : '30',
      JSON_OUTPUT: 'true',
    };

    const scriptPath = join(__dirname, test.script);
    const proc = spawn('node', [scriptPath], { env, stdio: 'pipe' });

    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (data) => {
      stdout += data.toString();
      if (!isJson) process.stdout.write(data);
    });

    proc.stderr.on('data', (data) => {
      stderr += data.toString();
      if (!isJson) process.stderr.write(data);
    });

    proc.on('close', (code) => {
      // Try to extract JSON result
      const jsonMatch = stdout.match(/--- JSON RESULT ---\s*([\s\S]*?)$/);
      let result = null;

      if (jsonMatch) {
        try {
          result = JSON.parse(jsonMatch[1].trim());
        } catch (e) {
          // Ignore parse errors
        }
      }

      resolve({
        name: test.name,
        passed: code === 0,
        exitCode: code,
        result,
      });
    });

    proc.on('error', (err) => {
      resolve({
        name: test.name,
        passed: false,
        error: err.message,
      });
    });
  });
}

async function runK6Test(test) {
  return new Promise((resolve) => {
    // Check if k6 is available
    const k6Check = spawn('which', ['k6']);
    k6Check.on('close', (code) => {
      if (code !== 0) {
        log(`  [SKIP] k6 not installed - skipping ${test.name}`);
        resolve({
          name: test.name,
          passed: true,
          skipped: true,
          reason: 'k6 not installed',
        });
        return;
      }

      const env = {
        ...process.env,
        DURATION: isQuick ? '10s' : '30s',
        VUS: isQuick ? '10' : '50',
      };

      const scriptPath = join(__dirname, test.script);
      const proc = spawn('k6', ['run', '--quiet', scriptPath], {
        env,
        stdio: 'pipe',
      });

      let stdout = '';
      let stderr = '';

      proc.stdout.on('data', (data) => {
        stdout += data.toString();
        if (!isJson) process.stdout.write(data);
      });

      proc.stderr.on('data', (data) => {
        stderr += data.toString();
        if (!isJson) process.stderr.write(data);
      });

      proc.on('close', (code) => {
        // Try to parse JSON result from stdout
        let result = null;
        try {
          result = JSON.parse(stdout.trim());
        } catch (e) {
          // k6 might output non-JSON, ignore
        }

        resolve({
          name: test.name,
          passed: code === 0,
          exitCode: code,
          result,
        });
      });

      proc.on('error', (err) => {
        resolve({
          name: test.name,
          passed: false,
          error: err.message,
        });
      });
    });
  });
}

async function runTest(test) {
  log(`\n${'='.repeat(64)}`);
  log(`Running: ${test.name} (${test.description})`);
  log(`${'='.repeat(64)}\n`);

  if (test.type === 'autocannon') {
    return runAutocannonTest(test);
  } else if (test.type === 'k6') {
    return runK6Test(test);
  }

  return { name: test.name, passed: false, error: 'Unknown test type' };
}

async function main() {
  const startTime = Date.now();

  log(`
╔════════════════════════════════════════════════════════════════╗
║            BizScreen Load Test Suite - Phase 13                ║
╠════════════════════════════════════════════════════════════════╣
║  Mode:           ${(isQuick ? 'Quick (10s)' : 'Full (30s)').padEnd(42)}║
║  Tests:          ${String(tests.length).padEnd(42)}║
║  Started:        ${new Date().toISOString().padEnd(42)}║
╚════════════════════════════════════════════════════════════════╝
`);

  // Check dependencies
  log('Checking dependencies...');

  const autocannonCheck = spawn('which', ['autocannon']);
  const hasAutocannon = await new Promise((resolve) => {
    autocannonCheck.on('close', (code) => resolve(code === 0));
  });

  if (!hasAutocannon) {
    log('\nNote: autocannon not found globally. Using node to run scripts directly.');
  }

  // Run tests sequentially
  const results = [];
  for (const test of tests) {
    const result = await runTest(test);
    results.push(result);
  }

  const endTime = Date.now();
  const duration = ((endTime - startTime) / 1000).toFixed(1);

  // Generate baseline report
  const report = {
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    baseUrl: process.env.BASE_URL || 'http://localhost:5173',
    duration: `${duration}s`,
    mode: isQuick ? 'quick' : 'full',
    summary: {
      total: results.length,
      passed: results.filter((r) => r.passed).length,
      failed: results.filter((r) => !r.passed && !r.skipped).length,
      skipped: results.filter((r) => r.skipped).length,
    },
    results: results.reduce((acc, r) => {
      acc[r.name] = {
        passed: r.passed,
        skipped: r.skipped || false,
        metrics: r.result?.metrics || null,
        thresholds: r.result?.thresholds || null,
      };
      return acc;
    }, {}),
  };

  // Save report
  const reportPath = join(RESULTS_DIR, 'baseline-report.json');
  writeFileSync(reportPath, JSON.stringify(report, null, 2));

  // Print summary
  const allPassed = results.every((r) => r.passed);

  if (isJson) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    log(`
╔════════════════════════════════════════════════════════════════╗
║                    LOAD TEST SUITE SUMMARY                     ║
╠════════════════════════════════════════════════════════════════╣
║  Total Tests:    ${String(report.summary.total).padEnd(42)}║
║  Passed:         ${String(report.summary.passed).padEnd(42)}║
║  Failed:         ${String(report.summary.failed).padEnd(42)}║
║  Skipped:        ${String(report.summary.skipped).padEnd(42)}║
║  Duration:       ${report.duration.padEnd(42)}║
╠════════════════════════════════════════════════════════════════╣
║  RESULTS                                                       ║
╠════════════════════════════════════════════════════════════════╣`);

    for (const r of results) {
      const status = r.skipped ? '⏭️  SKIP' : r.passed ? '✅ PASS' : '❌ FAIL';
      log(`║  ${r.name.padEnd(18)} ${status.padEnd(41)}║`);
    }

    log(`╠════════════════════════════════════════════════════════════════╣
║  Report saved: ${reportPath.slice(-45).padEnd(45)}║
╚════════════════════════════════════════════════════════════════╝
`);

    log(allPassed ? '\n✅ All tests passed!' : '\n❌ Some tests failed.');
  }

  process.exit(allPassed ? 0 : 1);
}

main().catch((err) => {
  console.error('Load test runner failed:', err);
  process.exit(1);
});
