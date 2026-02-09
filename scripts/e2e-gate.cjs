#!/usr/bin/env node
/**
 * E2E Test Pass Rate Gate
 *
 * Runs the full Playwright E2E suite up to MAX_RUNS times.
 * After each run, reads the JSON reporter output and computes pass rate.
 * If any run achieves >= THRESHOLD pass rate, exits 0 (success).
 * If all runs fail to meet the threshold, exits 1 (failure).
 *
 * Pass rate formula: passed / (passed + failed)
 *   - "expected" status  -> passed
 *   - "flaky" status     -> passed (counts as passed per project decision)
 *   - "unexpected" status -> failed
 *   - "skipped" status   -> excluded from both numerator and denominator
 *
 * Usage:
 *   node scripts/e2e-gate.cjs [--threshold=0.9] [--max-runs=3]
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// ---------------------------------------------------------------------------
// Parse CLI arguments
// ---------------------------------------------------------------------------

function parseArgs(argv) {
  const args = { threshold: 0.9, maxRuns: 3 };

  for (const arg of argv.slice(2)) {
    if (arg === '--help' || arg === '-h') {
      console.log(`
E2E Test Pass Rate Gate

Usage:
  node scripts/e2e-gate.cjs [options]

Options:
  --threshold=N   Pass rate threshold (0-1, default: 0.9)
  --max-runs=N    Maximum retry attempts (default: 3)
  --help, -h      Show this help message
`);
      process.exit(0);
    }

    const thresholdMatch = arg.match(/^--threshold=(.+)$/);
    if (thresholdMatch) {
      const val = parseFloat(thresholdMatch[1]);
      if (isNaN(val) || val < 0 || val > 1) {
        console.error(`Error: --threshold must be a number between 0 and 1, got "${thresholdMatch[1]}"`);
        process.exit(1);
      }
      args.threshold = val;
    }

    const maxRunsMatch = arg.match(/^--max-runs=(.+)$/);
    if (maxRunsMatch) {
      const val = parseInt(maxRunsMatch[1], 10);
      if (isNaN(val) || val < 1) {
        console.error(`Error: --max-runs must be a positive integer, got "${maxRunsMatch[1]}"`);
        process.exit(1);
      }
      args.maxRuns = val;
    }
  }

  return args;
}

// ---------------------------------------------------------------------------
// Parse Playwright JSON reporter output
// ---------------------------------------------------------------------------

const RESULTS_FILE = 'test-results/e2e-results.json';

/**
 * Recursively walk the suites structure and collect test results.
 * Playwright JSON structure: report.suites[] > suites[] > specs[] > tests[]
 */
function collectTestResults(suites) {
  const counts = { passed: 0, failed: 0, skipped: 0, flaky: 0 };

  function walkSuites(suiteList) {
    for (const suite of suiteList) {
      // Process specs in this suite
      if (Array.isArray(suite.specs)) {
        for (const spec of suite.specs) {
          if (Array.isArray(spec.tests)) {
            for (const test of spec.tests) {
              switch (test.status) {
                case 'expected':
                  counts.passed++;
                  break;
                case 'flaky':
                  counts.passed++;
                  counts.flaky++;
                  break;
                case 'unexpected':
                  counts.failed++;
                  break;
                case 'skipped':
                  counts.skipped++;
                  break;
                default:
                  // Unknown status -- treat as failed to be safe
                  counts.failed++;
                  break;
              }
            }
          }
        }
      }

      // Recurse into nested suites
      if (Array.isArray(suite.suites)) {
        walkSuites(suite.suites);
      }
    }
  }

  walkSuites(suites);
  return counts;
}

/**
 * Read and parse the JSON results file.
 * Returns null if the file does not exist or cannot be parsed.
 */
function readResults() {
  const filePath = path.resolve(RESULTS_FILE);
  if (!fs.existsSync(filePath)) {
    return null;
  }

  try {
    const raw = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    console.error(`Warning: Failed to parse ${RESULTS_FILE}: ${err.message}`);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main() {
  const { threshold, maxRuns } = parseArgs(process.argv);

  console.log('='.repeat(70));
  console.log('E2E TEST PASS RATE GATE');
  console.log('='.repeat(70));
  console.log(`Threshold: ${(threshold * 100).toFixed(0)}%`);
  console.log(`Max runs:  ${maxRuns}`);
  console.log('='.repeat(70));
  console.log('');

  let bestPassRate = 0;
  let bestCounts = null;

  for (let run = 1; run <= maxRuns; run++) {
    console.log(`--- Run ${run} of ${maxRuns} ---`);
    console.log('');

    // Remove previous results file so we don't read stale data
    const resultsPath = path.resolve(RESULTS_FILE);
    if (fs.existsSync(resultsPath)) {
      fs.unlinkSync(resultsPath);
    }

    // Run Playwright tests
    try {
      execSync('npx playwright test', {
        stdio: 'inherit',
        env: {
          ...process.env,
          PLAYWRIGHT_JSON_OUTPUT_FILE: RESULTS_FILE,
        },
      });
    } catch (_err) {
      // Playwright exits non-zero when tests fail -- this is expected
      // We'll read the JSON results to determine actual pass rate
    }

    console.log('');

    // Read results
    const report = readResults();
    if (!report) {
      console.log(`Warning: No results file found at ${RESULTS_FILE}`);
      console.log('Treating this run as 0% pass rate.');
      console.log('');

      if (run < maxRuns) {
        console.log(`Retrying... (${maxRuns - run} attempt(s) remaining)`);
        console.log('');
      }
      continue;
    }

    // Parse results
    const suites = report.suites || [];
    const counts = collectTestResults(suites);
    const total = counts.passed + counts.failed;
    const passRate = total > 0 ? counts.passed / total : 0;

    // Print summary
    console.log('-'.repeat(50));
    console.log(`Run ${run} Results:`);
    console.log(`  Passed:  ${counts.passed}${counts.flaky > 0 ? ` (includes ${counts.flaky} flaky)` : ''}`);
    console.log(`  Failed:  ${counts.failed}`);
    console.log(`  Skipped: ${counts.skipped} (excluded from rate)`);
    console.log(`  Total:   ${total} (passed + failed)`);
    console.log(`  Pass rate: ${(passRate * 100).toFixed(1)}%`);
    console.log(`  Threshold: ${(threshold * 100).toFixed(1)}%`);
    console.log('-'.repeat(50));
    console.log('');

    // Track best result
    if (passRate > bestPassRate) {
      bestPassRate = passRate;
      bestCounts = { ...counts };
    }

    // Check threshold
    if (passRate >= threshold) {
      console.log(`PASS: Run ${run} achieved ${(passRate * 100).toFixed(1)}% pass rate (>= ${(threshold * 100).toFixed(1)}% threshold)`);
      console.log('');
      process.exit(0);
    }

    if (run < maxRuns) {
      console.log(`Pass rate ${(passRate * 100).toFixed(1)}% is below ${(threshold * 100).toFixed(1)}% threshold.`);
      console.log(`Retrying... (${maxRuns - run} attempt(s) remaining)`);
      console.log('');
    }
  }

  // All runs exhausted
  console.log('='.repeat(70));
  console.log('FAIL: All runs exhausted without meeting the pass rate threshold.');
  console.log('');
  if (bestCounts) {
    console.log('Best result across all runs:');
    console.log(`  Pass rate: ${(bestPassRate * 100).toFixed(1)}%`);
    console.log(`  Passed:  ${bestCounts.passed}${bestCounts.flaky > 0 ? ` (includes ${bestCounts.flaky} flaky)` : ''}`);
    console.log(`  Failed:  ${bestCounts.failed}`);
    console.log(`  Skipped: ${bestCounts.skipped}`);
  } else {
    console.log('No valid results were produced in any run.');
  }
  console.log(`  Threshold: ${(threshold * 100).toFixed(1)}%`);
  console.log('='.repeat(70));
  process.exit(1);
}

main();
