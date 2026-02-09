# Phase 38: E2E Test Coverage Gate - Research

**Researched:** 2026-02-08
**Domain:** E2E Test Pass Rate Enforcement (Playwright + GitHub Actions)
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

#### Pass rate measurement
- Best of 3 runs (run tests up to 3 times, take the best result to account for flakiness)
- Chromium only -- single browser for the official gate
- Skipped tests are excluded from the total (pass rate = passed / (passed + failed))
- Skipped test count tracked as a separate metric

#### Failure triage
- Fix first, skip as last resort -- attempt to fix every failing test before skipping
- Valid skip reasons: real app bugs (not test bugs) OR infrastructure dependencies (external services, env requirements)
- No cap on skip count -- as long as 90% pass rate is met on non-skipped tests
- Build on Phase 37's SKIPPED-TESTS.md as the starting baseline -- re-evaluate each previously skipped test

#### CI enforcement
- GitHub Actions workflow
- 90% pass rate is a hard gate -- PRs cannot merge if pass rate drops below threshold
- Tests run on both PRs and push to main
- Best-of-3 retry logic applies in CI as well

#### Failure documentation
- Update Phase 37's SKIPPED-TESTS.md as the living tracking document
- Create a new COVERAGE-REPORT.md in Phase 38 directory as a final snapshot
- Failures categorized by root cause type (auth, timing, selector, app bug, infrastructure, etc.)
- Final snapshot only -- no trend tracking needed

### Claude's Discretion
- Worker count for test runs (Phase 37 recommended --workers=1)
- CI artifact upload strategy (screenshots, traces)
- Detail level per failure in coverage report (root cause + fix plan vs root cause only)
- GitHub Actions workflow structure and caching strategy

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope
</user_constraints>

## Summary

This phase focuses on achieving and enforcing a 90%+ E2E test pass rate across the existing test suite. The codebase contains 1218 total tests across 39 files, distributed evenly across three Playwright projects (chromium: 405, chromium-admin: 405, chromium-superadmin: 405, plus 3 setup tests). Phase 37 already stabilized the suite by removing all 172 `waitForTimeout` calls, converting auth patterns to storage state, and documenting skipped tests in SKIPPED-TESTS.md.

The key technical challenge is implementing a "best of 3 full runs" pass rate gate in CI. Playwright's built-in retry mechanism (`retries` config) retries individual failing tests, not full suite runs. The user's requirement is different: run the entire suite up to 3 times and take the best overall result. This requires a custom wrapper script that runs `npx playwright test` up to 3 times, parses the JSON reporter output after each run, computes the pass rate (passed / (passed + failed), excluding skipped), and exits successfully if any run meets the 90% threshold.

The existing CI workflow already has Playwright configured with Chromium-only testing, proper caching, Supabase test data seeding, and artifact upload on failure. This phase extends it with the pass rate gate script and modifies the workflow to use this script instead of calling `npm run test:e2e` directly.

**Primary recommendation:** Build a Node.js gate script (`scripts/e2e-gate.js`) that runs the Playwright suite up to 3 times, parses JSON results, calculates pass rate, and exits with appropriate code. Integrate this into the existing CI workflow.

## Standard Stack

### Core (Already Installed)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @playwright/test | ^1.57.0 | E2E testing framework | Already configured, has JSON reporter built-in |
| Node.js | 20 | Gate script runtime | Already required by CI, no dependencies needed |

### Supporting (No Additional Dependencies Required)
| Tool | Purpose | When to Use |
|------|---------|-------------|
| Playwright JSON reporter | Machine-readable test results | Parse pass/fail/skip counts after each run |
| Playwright HTML reporter | Human-readable report | Already configured, upload as CI artifact |
| `jq` (optional) | JSON parsing in shell | Alternative to Node.js for simple pass rate calc |
| GitHub Actions `actions/upload-artifact@v4` | CI artifact upload | Already configured for reports |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Custom Node.js gate script | playwright-ctrf-json-reporter NPM package | Adds dependency; native JSON reporter sufficient |
| Custom Node.js gate script | Shell script with jq | Simpler but less portable; jq not pre-installed everywhere |
| Custom pass rate check | Tesults GitHub Action | Adds external dependency; overkill for simple threshold check |
| Multiple full runs | Playwright `retries` config | Different semantics: retries individual tests, not full suite |

**No new dependencies needed.** The gate script uses Node.js built-ins (`child_process`, `fs`, `path`) and the native Playwright JSON reporter.

## Architecture Patterns

### Recommended Project Structure
```
scripts/
  e2e-gate.js              # Best-of-3 gate script (NEW)
  seed-ci-test-user.cjs     # Existing CI seed script
.github/
  workflows/
    ci.yml                   # Modified E2E job to use gate script
tests/
  e2e/                       # Existing test files (39 files, NO changes needed)
.planning/
  phases/
    37-e2e-test-stabilization/
      SKIPPED-TESTS.md       # Living tracking document (UPDATED)
    38-e2e-test-coverage-gate/
      COVERAGE-REPORT.md     # Final snapshot (NEW)
      38-RESEARCH.md          # This file
```

### Pattern 1: Best-of-3 Gate Script
**What:** A Node.js script that runs the full Playwright suite up to 3 times, parses JSON results, and succeeds if any run achieves 90%+ pass rate.
**When to use:** In CI and locally for gate verification.

```javascript
// scripts/e2e-gate.js
// Source: Custom implementation using Playwright JSON reporter

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const THRESHOLD = 0.9; // 90% pass rate
const MAX_RUNS = 3;
const RESULTS_FILE = 'test-results/e2e-results.json';

function runTests() {
  try {
    execSync(
      `npx playwright test --reporter=json --reporter=html`,
      {
        stdio: 'inherit',
        env: {
          ...process.env,
          PLAYWRIGHT_JSON_OUTPUT_FILE: RESULTS_FILE,
        },
      }
    );
    return true; // All tests passed
  } catch {
    return false; // Some tests failed (non-zero exit)
  }
}

function parseResults() {
  const raw = fs.readFileSync(RESULTS_FILE, 'utf-8');
  const report = JSON.parse(raw);

  let passed = 0, failed = 0, skipped = 0;

  // Walk suites recursively to find all test results
  function walkSuites(suites) {
    for (const suite of suites) {
      if (suite.suites) walkSuites(suite.suites);
      if (suite.specs) {
        for (const spec of suite.specs) {
          for (const test of spec.tests) {
            // Each test has results array; take the last result
            const lastResult = test.results[test.results.length - 1];
            if (!lastResult) continue;
            if (lastResult.status === 'skipped') skipped++;
            else if (lastResult.status === 'passed') passed++;
            else failed++; // failed, timedOut, interrupted
          }
        }
      }
    }
  }

  walkSuites(report.suites || []);

  const total = passed + failed; // Excluding skipped per user decision
  const rate = total > 0 ? passed / total : 0;

  return { passed, failed, skipped, total, rate };
}

let bestResult = null;

for (let run = 1; run <= MAX_RUNS; run++) {
  console.log(`\n=== E2E Gate: Run ${run}/${MAX_RUNS} ===\n`);

  const allPassed = runTests();
  const result = parseResults();

  console.log(`\nRun ${run} results:`);
  console.log(`  Passed: ${result.passed}`);
  console.log(`  Failed: ${result.failed}`);
  console.log(`  Skipped: ${result.skipped}`);
  console.log(`  Pass rate: ${(result.rate * 100).toFixed(1)}%`);
  console.log(`  Threshold: ${(THRESHOLD * 100).toFixed(1)}%`);

  if (!bestResult || result.rate > bestResult.rate) {
    bestResult = result;
  }

  if (result.rate >= THRESHOLD) {
    console.log(`\n✓ GATE PASSED on run ${run}: ${(result.rate * 100).toFixed(1)}% >= ${(THRESHOLD * 100).toFixed(1)}%`);
    process.exit(0);
  }

  if (run < MAX_RUNS) {
    console.log(`\nPass rate ${(result.rate * 100).toFixed(1)}% below threshold, retrying...`);
  }
}

console.log(`\n✗ GATE FAILED after ${MAX_RUNS} runs`);
console.log(`Best result: ${(bestResult.rate * 100).toFixed(1)}% (need ${(THRESHOLD * 100).toFixed(1)}%)`);
console.log(`Best run: ${bestResult.passed} passed, ${bestResult.failed} failed, ${bestResult.skipped} skipped`);
process.exit(1);
```

### Pattern 2: JSON Reporter Configuration
**What:** Add JSON reporter alongside existing reporters to produce machine-parseable output.
**When to use:** Always -- the gate script depends on it.

```javascript
// playwright.config.js - reporter modification
reporter: [
  ['list'],
  ['html', { open: 'never', outputFolder: 'playwright-report' }],
  ['json', { outputFile: 'test-results/e2e-results.json' }],
],
```

Note: The JSON reporter output can be controlled via `PLAYWRIGHT_JSON_OUTPUT_FILE` env var instead of hardcoding in config, which is more flexible for the gate script.

### Pattern 3: CI Workflow Integration
**What:** Replace direct `npm run test:e2e` call with the gate script.
**When to use:** In `.github/workflows/ci.yml`.

```yaml
# Replace:
#   - name: Run E2E tests
#     run: npm run test:e2e

# With:
- name: Run E2E tests (coverage gate)
  run: node scripts/e2e-gate.js
  env:
    CI: true
    TEST_USER_EMAIL: ${{ secrets.TEST_USER_EMAIL }}
    TEST_USER_PASSWORD: ${{ secrets.TEST_USER_PASSWORD }}
    TEST_CLIENT_EMAIL: ${{ secrets.TEST_CLIENT_EMAIL }}
    TEST_CLIENT_PASSWORD: ${{ secrets.TEST_CLIENT_PASSWORD }}
    VITE_SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
    VITE_SUPABASE_ANON_KEY: ${{ secrets.SUPABASE_ANON_KEY }}
```

### Pattern 4: Pass Rate Formula
**What:** The exact formula for pass rate calculation matching user decisions.
**When to use:** In the gate script and COVERAGE-REPORT.md.

```
pass_rate = passed / (passed + failed)

Where:
- passed = tests with status "passed" (including those that passed on retry)
- failed = tests with status "failed", "timedOut", or "interrupted"
- skipped tests are EXCLUDED from both numerator and denominator
- Playwright "flaky" tests (failed then passed on retry) count as "passed"
```

### Anti-Patterns to Avoid

- **Using `retries` config for best-of-3:** Playwright's `retries` retries individual failing tests within a single run, not full suite re-runs. It solves a different problem.
- **Parsing HTML report for pass rate:** Not machine-readable. Use JSON reporter.
- **Setting threshold to 100%:** Too strict given infrastructure flakiness. The 90% threshold is explicitly decided.
- **Running all browsers:** Decision is Chromium only. The config already only has chromium-based projects, but be explicit with `--project=chromium --project=chromium-admin --project=chromium-superadmin` if needed.
- **Ignoring skipped test count drift:** While skipped tests are excluded from the rate, a growing skip count hides technical debt. Track the count as a separate metric.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Test result parsing | Custom log parser | Playwright JSON reporter | Structured data, handles edge cases |
| Per-test retry | Custom retry loop per test | Playwright `retries: 2` config | Built-in, handles worker isolation |
| Browser caching in CI | Custom cache logic | `actions/cache@v4` | Already working in existing CI |
| Test user seeding | Manual SQL scripts | `scripts/seed-ci-test-user.cjs` | Already exists and works |
| Artifact upload | Custom upload logic | `actions/upload-artifact@v4` | Already configured |

**Key insight:** The only custom code needed is the gate script (`e2e-gate.js`) that bridges Playwright's test runner with the pass rate threshold check. Everything else uses existing infrastructure.

## Common Pitfalls

### Pitfall 1: JSON Reporter Schema Misunderstanding
**What goes wrong:** Gate script fails to parse results because the JSON structure has nested suites/specs/tests hierarchy.
**Why it happens:** The Playwright JSON reporter has a deeply nested structure: `suites[] > suites[] > specs[] > tests[] > results[]`. Not a flat list.
**How to avoid:** Walk the tree recursively. Each `test` object has a `results` array where each entry has a `status` field. For tests with retries, a test can have multiple results -- take the last one (the final outcome).
**Warning signs:** Pass rate showing 0% or NaN because no tests were counted.

### Pitfall 2: Retry Semantics vs Best-of-3 Conflict
**What goes wrong:** Combining Playwright's `retries` config with the best-of-3 gate script causes confusion about what "passed" means.
**Why it happens:** With `retries: 2` (already in config for CI), a test that fails once but passes on retry is "flaky" in Playwright's view but "passed" overall. If the gate then re-runs the entire suite, you get 3 outer runs x 3 attempts per test = up to 9 attempts per test.
**How to avoid:** Keep `retries: 2` in playwright.config.js for CI (already set). The gate script treats each full run as one attempt. A flaky test that passes on retry within a run counts as passed for that run's pass rate. This is correct behavior -- it accounts for both individual test flakiness and systemic issues.
**Warning signs:** Extremely long CI times (3 runs x 3 retries x 1218 tests).

### Pitfall 3: Timeout Multiplication in CI
**What goes wrong:** Best-of-3 gate triples the CI time budget.
**Why it happens:** If the suite takes 15 minutes per run, worst case is 45 minutes.
**How to avoid:** Short-circuit: exit immediately when any run passes 90%. The timeout for the CI job should be increased from 20 to 60 minutes. Most runs should exit on the first attempt if the pass rate is above threshold.
**Warning signs:** CI job timing out at 20 minutes with `timeout-minutes: 20`.

### Pitfall 4: Worker Count Impact on Stability
**What goes wrong:** Parallel workers cause race conditions in tests sharing state (DB, auth sessions).
**Why it happens:** Tests may create/modify shared resources.
**How to avoid:** Use `--workers=1` as Phase 37 recommended. The playwright.config.js already sets `workers: process.env.CI ? 1 : undefined` for CI. Keep this.
**Warning signs:** Tests passing locally with 1 worker but failing in CI, or vice versa.

### Pitfall 5: Skipped Test Count Growing Silently
**What goes wrong:** Pass rate stays at 90%+ but more and more tests are skipped, hiding real coverage regression.
**Why it happens:** Easy to skip failing tests to maintain the threshold.
**How to avoid:** Track skipped test count as a separate metric. Print it in gate script output. The COVERAGE-REPORT.md should capture the baseline count. Consider adding a CI warning (not failure) if skipped count exceeds baseline + N.
**Warning signs:** Pass rate steady at 95% but skipped count growing from 100 to 200.

### Pitfall 6: Test Results File Overwrite Between Runs
**What goes wrong:** Run 2 overwrites run 1's JSON results, losing the ability to compare runs.
**How to avoid:** Save each run's results to a unique file (`e2e-results-run-1.json`, `e2e-results-run-2.json`, etc.) or parse results immediately after each run before the next run overwrites. The gate script pattern above parses immediately after each run.
**Warning signs:** Gate script reports same results for all 3 runs.

### Pitfall 7: Missing CI Environment Variables
**What goes wrong:** Tests skip silently because `TEST_CLIENT_EMAIL`, `TEST_ADMIN_EMAIL`, `TEST_SUPERADMIN_EMAIL` are not configured as GitHub secrets.
**Why it happens:** The existing CI only passes `TEST_USER_EMAIL`, `TEST_USER_PASSWORD`, `TEST_CLIENT_EMAIL`, `TEST_CLIENT_PASSWORD`. Admin and superadmin credentials may not be configured.
**How to avoid:** Audit which env vars are needed for each project. The auth.setup.js needs `TEST_USER_EMAIL`, `TEST_ADMIN_EMAIL`, and `TEST_SUPERADMIN_EMAIL`. If admin/superadmin credentials are not set, those auth setups skip, and tests using those storage states may fail or skip. Ensure all needed secrets are configured.
**Warning signs:** High skip count in chromium-admin and chromium-superadmin projects.

## Code Examples

### Example 1: Parsing Playwright JSON Reporter Output
```javascript
// Source: Playwright JSON reporter documentation + TestResult API
// https://playwright.dev/docs/api/class-testresult

function parsePlaywrightJson(filePath) {
  const report = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  const stats = { passed: 0, failed: 0, skipped: 0, flaky: 0 };

  function walkSuites(suites) {
    for (const suite of suites) {
      if (suite.suites) walkSuites(suite.suites);
      if (suite.specs) {
        for (const spec of suite.specs) {
          // spec.ok indicates if the spec ultimately passed (including after retries)
          for (const test of spec.tests) {
            const status = test.status; // "expected", "unexpected", "flaky", "skipped"
            if (status === 'skipped') stats.skipped++;
            else if (status === 'expected') stats.passed++;
            else if (status === 'flaky') { stats.flaky++; stats.passed++; } // Flaky = passed on retry
            else stats.failed++; // "unexpected" = truly failed
          }
        }
      }
    }
  }

  walkSuites(report.suites || []);
  return stats;
}
```

**Important note on JSON schema:** The JSON reporter's `test.status` field uses these values:
- `"expected"` -- test passed (matches expected outcome)
- `"unexpected"` -- test failed (does not match expected outcome)
- `"flaky"` -- test initially failed but passed on retry
- `"skipped"` -- test was skipped

This is different from the `TestResult.status` API (which uses `"passed"`, `"failed"`, `"timedOut"`, etc.). The gate script should use `test.status` from the JSON output, not `result.status` from individual attempts.

### Example 2: Package.json Script Entry
```json
{
  "scripts": {
    "test:e2e:gate": "node scripts/e2e-gate.js"
  }
}
```

### Example 3: CI Workflow Artifact Upload (Always, Not Just on Failure)
```yaml
# Upload artifacts always (not just on failure) to allow pass rate inspection
- name: Upload Playwright report
  uses: actions/upload-artifact@v4
  if: always()
  with:
    name: playwright-report
    path: playwright-report/
    retention-days: 7

- name: Upload test results
  uses: actions/upload-artifact@v4
  if: always()
  with:
    name: test-results
    path: test-results/
    retention-days: 7
```

### Example 4: COVERAGE-REPORT.md Template
```markdown
# E2E Test Coverage Report

**Generated:** [date]
**Phase:** 38 - E2E Test Coverage Gate
**Pass Rate:** XX.X% (XXX passed / XXX total, XXX skipped)

## Summary

| Metric | Count |
|--------|-------|
| Total tests | 1218 |
| Passed | XXX |
| Failed | XXX |
| Skipped | XXX |
| Pass rate | XX.X% |

## Failed Tests by Root Cause

### Auth Issues
| Test | File | Root Cause |
|------|------|------------|
| ... | ... | ... |

### Selector Mismatches
| Test | File | Root Cause |
|------|------|------------|
| ... | ... | ... |

### Infrastructure Dependencies
| Test | File | Root Cause |
|------|------|------------|
| ... | ... | ... |

### App Bugs
| Test | File | Root Cause |
|------|------|------------|
| ... | ... | ... |

## Skipped Tests Summary

| Category | Count | Reason |
|----------|-------|--------|
| Feature not accessible | XX | Scenes not in sidebar nav |
| Missing features | XX | SEO tags, accessibility |
| Test design | XX | Auth pattern incompatible |
| External dependencies | XX | Cloudinary widget |
| Feature-gated | XX | Content performance, usage |
| Manual debug | XX | debug.spec.js |
```

## Current Test Suite Analysis

### Test Distribution (1218 total tests)

| Project | Test Count | Purpose |
|---------|-----------|---------|
| setup | 3 | Auth state creation (client, admin, superadmin) |
| chromium | 405 | Standard client user tests |
| chromium-admin | 405 | Admin user tests |
| chromium-superadmin | 405 | Superadmin user tests |

### Known Skipped Tests (from Phase 37 SKIPPED-TESTS.md)

| Category | Approx Count | Reason |
|----------|-------------|--------|
| Scenes + Scene Editor | 30 tests | Feature not in sidebar nav |
| Usage Dashboard | 33 tests | Route not wired up |
| Feature Diagnostic | 7 tests | Auth pattern incompatible |
| Location Diagnostic | 1 test | Auth pattern incompatible |
| Debug | 6 tests | Manual debug test |
| SEO (4 tests) | 4 tests | Missing meta tags / accessibility |
| Auth loading states | 2 tests | Too fast to test in E2E |
| Media upload | 1 test | Cloudinary external service |
| Content Performance | ~8 tests | Feature-gated |
| Enterprise | ~42 tests | Enterprise credentials not configured |
| Performance | ~39 tests | Performance budget tests (many skipped) |
| Various credential-gated | ~50+ tests | Skipped when specific role credentials missing |

**Note:** Many tests are conditionally skipped based on environment variables. The actual skip count depends on which credentials are configured. In CI with `TEST_USER_EMAIL`, `TEST_USER_PASSWORD`, `TEST_CLIENT_EMAIL`, `TEST_CLIENT_PASSWORD` (and likely NOT `TEST_ADMIN_EMAIL`, `TEST_SUPERADMIN_EMAIL`, `TEST_ENTERPRISE_EMAIL`, `TEST_RESELLER_EMAIL`), a significant number of tests will be skipped.

### Known Failure Categories (from Phase 37)

1. **Selector mismatches** -- template-marketplace, template-packs, playlist-template tests have selectors that do not match current UI
2. **Infrastructure stability** -- Backend connection timeouts (brand-theme, others)
3. **Missing features** -- SEO meta tags, skip-to-content link
4. **Credential mismatch** -- Tests running on wrong project (e.g., client tests on admin project)

### Recommendations (Claude's Discretion Areas)

#### Worker Count
**Recommendation: `--workers=1`** (keep existing Phase 37 recommendation)

Rationale: Phase 37 documented that parallel workers increase load on Supabase and cause connection timeouts. The `playwright.config.js` already sets `workers: process.env.CI ? 1 : undefined`. Keep this for stability. The trade-off is slower runs, but with best-of-3, stability is more important than speed.

#### CI Artifact Upload Strategy
**Recommendation: Upload always, not just on failure**

Change `if: failure()` to `if: always()` for artifact upload steps. This allows developers to inspect pass rates even on passing runs, which is important for monitoring trends. Keep `retention-days: 7` to avoid storage bloat.

Additionally, upload the JSON results file alongside the HTML report for programmatic access.

#### Detail Level in Coverage Report
**Recommendation: Root cause + brief fix plan**

For each failed test, include:
- Test name and file
- Root cause category (auth, selector, infrastructure, app bug, timing)
- One-line fix suggestion (e.g., "Update selector to match current UI", "Add missing meta tag")

This provides actionable information without excessive detail.

#### GitHub Actions Workflow Structure
**Recommendation: Modify existing `ci.yml` E2E job, do not create separate workflow**

The existing CI workflow already has proper caching, dependency setup, and Supabase seeding. Changes needed:
1. Replace `npm run test:e2e` with `node scripts/e2e-gate.js`
2. Increase `timeout-minutes` from 20 to 60 (worst case: 3 runs x 15 min + overhead)
3. Change artifact upload to `if: always()`
4. Add JSON results to artifact upload

#### Caching Strategy
**Recommendation: Keep existing caching, add no changes**

The existing CI already caches:
- `node_modules` (keyed by `package-lock.json` hash)
- Playwright browsers (`~/.cache/ms-playwright`, keyed by `package-lock.json` hash)

This is sufficient. No additional caching needed.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `retries` for flake tolerance | Retries + pass rate gate | Phase 38 | Prevents regression below threshold |
| All-or-nothing CI pass | Percentage-based gate | Phase 38 | Allows known failures while preventing regression |
| Manual test triage | SKIPPED-TESTS.md tracking | Phase 37 | Documented decisions for each skip |
| `waitForTimeout` delays | Auto-waiting patterns | Phase 37 | Eliminated timing-based failures |

## Open Questions

1. **Admin/Superadmin Credentials in CI**
   - What we know: CI configures `TEST_USER_EMAIL`, `TEST_USER_PASSWORD`, `TEST_CLIENT_EMAIL`, `TEST_CLIENT_PASSWORD`. Auth setup uses `TEST_ADMIN_EMAIL` and `TEST_SUPERADMIN_EMAIL`.
   - What's unclear: Are `TEST_ADMIN_EMAIL`, `TEST_ADMIN_PASSWORD`, `TEST_SUPERADMIN_EMAIL`, `TEST_SUPERADMIN_PASSWORD` configured as GitHub secrets?
   - Impact: If not configured, admin and superadmin auth setups will skip, and all tests depending on those storage states will likely skip or fail.
   - Recommendation: The gate script should detect and report this. If admin/superadmin creds are not available in CI, those projects' tests will be skipped (counted as skipped, not failed). This is acceptable per the user's formula (pass_rate = passed / (passed + failed), skipped excluded).

2. **Playwright JSON Reporter Output Schema**
   - What we know: The JSON reporter produces a nested structure with `suites`, `specs`, `tests`. The `test.status` field uses `"expected"`, `"unexpected"`, `"flaky"`, `"skipped"`.
   - What's unclear: The exact schema is not officially documented (GitHub issue #26954 requests it).
   - Recommendation: Generate a sample JSON output locally before writing the final gate script. Run `PLAYWRIGHT_JSON_OUTPUT_FILE=sample.json npx playwright test --reporter=json` and inspect the structure. The gate script should be validated against actual output.
   - Confidence: MEDIUM -- needs validation with actual output.

3. **Current Actual Pass Rate**
   - What we know: Phase 37 left `test-results/.last-run.json` showing `"status": "passed"`, but this may be from a subset run.
   - What's unclear: What is the full suite pass rate right now?
   - Recommendation: Run the full suite once before planning tasks to establish the baseline. The planner should include this as an early task.

## Sources

### Primary (HIGH confidence)
- **Playwright Official Docs** -- Test Retries: https://playwright.dev/docs/test-retries
  - Confirmed: `retries` config retries individual failing tests, not full suite
  - Confirmed: Test categorization as "passed", "flaky", "failed"
- **Playwright Official Docs** -- Test Reporters: https://playwright.dev/docs/test-reporters
  - Confirmed: JSON reporter configuration via `outputFile` or `PLAYWRIGHT_JSON_OUTPUT_FILE` env var
  - Confirmed: Multiple reporters can be used simultaneously
- **Playwright Official Docs** -- Reporter API: https://playwright.dev/docs/api/class-reporter
  - Confirmed: `onEnd` receives `FullResult` with `status: "passed" | "failed" | "timedout" | "interrupted"`
- **Playwright Official Docs** -- TestResult API: https://playwright.dev/docs/api/class-testresult
  - Confirmed: TestResult status values: `"passed"`, `"failed"`, `"timedOut"`, `"skipped"`, `"interrupted"`
- **Project codebase** -- Direct inspection of:
  - `playwright.config.js` -- current configuration (HIGH confidence)
  - `.github/workflows/ci.yml` -- current CI setup (HIGH confidence)
  - `tests/e2e/*.spec.js` -- all 39 test files (HIGH confidence)
  - `.planning/phases/37-e2e-test-stabilization/SKIPPED-TESTS.md` -- skip tracking (HIGH confidence)
  - `package.json` -- Playwright version ^1.57.0 (HIGH confidence)

### Secondary (MEDIUM confidence)
- **Playwright Solutions blog** -- JSON reporter parsing patterns: https://playwrightsolutions.com/is-it-possible-to-get-a-list-of-all-passed-or-failed-tests-after-a-playwright-test-run/
  - Verified against official docs: JSON output structure
- **GitHub Issue #12768** -- Custom reporter test count access: https://github.com/microsoft/playwright/issues/12768
  - Verified: `suite.allTests()`, `result.status`, `result.retry` fields
- **GitHub Issue #26954** -- JSON reporter schema documentation request: https://github.com/microsoft/playwright/issues/26954
  - Confirmed: Schema not officially documented, hence MEDIUM confidence on exact field names

### Tertiary (LOW confidence)
- **BrowserStack Guide** -- Playwright best practices 2026: https://www.browserstack.com/guide/playwright-best-practices
  - General patterns, not verified against official source for specifics

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- existing tools, no new dependencies, verified versions
- Architecture patterns: HIGH -- gate script pattern is straightforward Node.js; CI workflow extension is minimal
- JSON reporter schema: MEDIUM -- field names need validation against actual output
- Pitfalls: HIGH -- drawn from Phase 37 experience and official documentation
- Current test state: MEDIUM -- need to run full suite to establish actual baseline

**Research date:** 2026-02-08
**Valid until:** 60 days (Playwright patterns are stable; CI patterns are stable)
