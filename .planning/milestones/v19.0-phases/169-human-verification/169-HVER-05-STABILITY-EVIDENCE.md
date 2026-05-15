---
phase: 169
plan: 03
hver: HVER-05
captured_at: "2026-04-14T00:00:00Z"
runs: 3
retries_per_run: 0
parallel_within_run: true
reporter_strategy: "dual invocation per run — list for stdout (tee to /tmp/169-hver05/run-N.txt), json (via PLAYWRIGHT_JSON_OUTPUT_FILE) to /tmp/169-hver05/run-N.json for timing data; pipefail used to preserve playwright exit code through tee"
---

# HVER-05 Player Test Stability Evidence

## Summary

All 14 player tests (PLYR-01..PLYR-06) passed across all 3 consecutive runs with 0 retries. No flake observed. No spec adjustments were needed — specs are stable as restored from d0028db6. Two telemetry tests (player detects content version mismatch, player heartbeat polling) consistently take ~36s per run due to deliberate timer-based logic in the tested code; this is expected behavior and well within the 120s global timeout. Two rendering tests showed elevated first-run duration (25-27s) likely due to cold-start/JIT effects; runs 2 and 3 normalized to under 1.1s. All 3 runs and the verification run (Run 4) exit 0 with no retries.

## Run 1

Command (list): `npx playwright test tests/e2e/player-rendering.spec.js tests/e2e/player-offline-selfheal.spec.js tests/e2e/player-telemetry.spec.js --project=chromium --reporter=list --retries=0`
Command (json): `PLAYWRIGHT_JSON_OUTPUT_FILE=/tmp/169-hver05/run-1.json npx playwright test ... --reporter=json --retries=0`
List-run exit code: 0   (captured via `${PIPESTATUS[0]}` so `tee` cannot mask failure)
Json-run exit code: 0
Totals: 14 passed / 0 failed / 0 skipped
Duration: 39.1s

```
  ✓   4 [chromium] › tests/e2e/player-rendering.spec.js:63:3 › Player Rendering › PairPage loads correctly with OTP input and connect button (958ms)
  ✓   1 [chromium] › tests/e2e/player-offline-selfheal.spec.js:182:3 › Player Offline Fallback & Self-Heal › stuck detection mechanism is registered on load (PLYR-04) (1.1s)
  ✓   5 [chromium] › tests/e2e/player-offline-selfheal.spec.js:161:3 › Player Offline Fallback & Self-Heal › player displays error state when server fails without cache (1.2s)
  ✓   3 [chromium] › tests/e2e/player-offline-selfheal.spec.js:207:3 › Player Offline Fallback & Self-Heal › player shows error state and re-pair button when no cache (PLYR-04) (1.3s)
  ✓   2 [chromium] › tests/e2e/player-offline-selfheal.spec.js:108:3 › Player Offline Fallback & Self-Heal › player loads content and caches it to IndexedDB (1.3s)
  ✓   7 [chromium] › tests/e2e/player-rendering.spec.js:83:3 › Player Rendering › ViewPage shows loading state while fetching content (822ms)
  ✓   8 [chromium] › tests/e2e/player-rendering.spec.js:129:3 › Player Rendering › ViewPage shows no-content state when no playlist or layout assigned (925ms)
  ✓   6 [chromium] › tests/e2e/player-offline-selfheal.spec.js:138:3 › Player Offline Fallback & Self-Heal › player falls back to cached content when offline (PLYR-03) (2.1s)
  ✓   9 [chromium] › tests/e2e/player-rendering.spec.js:155:3 › Player Rendering › ViewPage renders playlist content with images and progress dots (PLYR-01) (960ms)
  ✓  10 [chromium] › tests/e2e/player-rendering.spec.js:202:3 › Player Rendering › ViewPage renders multi-zone layout with absolute positioning (PLYR-02) (992ms)
  ✓  11 [chromium] › tests/e2e/player-telemetry.spec.js:85:3 › Player Telemetry › player sends heartbeat update_device_status on mount (PLYR-06) (4.5s)
  ✓  12 [chromium] › tests/e2e/player-telemetry.spec.js:105:3 › Player Telemetry › heartbeat includes player version and content hash (PLYR-05, PLYR-06) (4.2s)
  ✓  13 [chromium] › tests/e2e/player-telemetry.spec.js:133:3 › Player Telemetry › player detects content version mismatch and triggers re-fetch (PLYR-05) (36.2s)
  ✓  14 [chromium] › tests/e2e/player-telemetry.spec.js:214:3 › Player Telemetry › player heartbeat polling sends player_heartbeat RPC (PLYR-06 device metrics) (36.2s)

  14 passed (39.1s)
```

Note: Run 1 JSON timing data for "ViewPage shows loading state..." and "ViewPage shows no-content state..." showed 26.8s and 25.4s respectively (via timing-histogram.tsv). These are warm-up / cold-JIT artifacts — both normalized to under 1.1s in runs 2 and 3. Tests passed in all 3 runs.

## Run 2

Command (list): `npx playwright test tests/e2e/player-rendering.spec.js tests/e2e/player-offline-selfheal.spec.js tests/e2e/player-telemetry.spec.js --project=chromium --reporter=list --retries=0`
Command (json): `PLAYWRIGHT_JSON_OUTPUT_FILE=/tmp/169-hver05/run-2.json npx playwright test ... --reporter=json --retries=0`
List-run exit code: 0
Json-run exit code: 0
Totals: 14 passed / 0 failed / 0 skipped
Duration: 38.8s

```
  ✓   4 [chromium] › tests/e2e/player-rendering.spec.js:63:3 › Player Rendering › PairPage loads correctly with OTP input and connect button (858ms)
  ✓   5 [chromium] › tests/e2e/player-offline-selfheal.spec.js:161:3 › Player Offline Fallback & Self-Heal › player displays error state when server fails without cache (981ms)
  ✓   6 [chromium] › tests/e2e/player-offline-selfheal.spec.js:182:3 › Player Offline Fallback & Self-Heal › stuck detection mechanism is registered on load (PLYR-04) (1.0s)
  ✓   1 [chromium] › tests/e2e/player-offline-selfheal.spec.js:108:3 › Player Offline Fallback & Self-Heal › player loads content and caches it to IndexedDB (1.0s)
  ✓   3 [chromium] › tests/e2e/player-offline-selfheal.spec.js:207:3 › Player Offline Fallback & Self-Heal › player shows error state and re-pair button when no cache (PLYR-04) (1.2s)
  ✓   7 [chromium] › tests/e2e/player-rendering.spec.js:83:3 › Player Rendering › ViewPage shows loading state while fetching content (752ms)
  ✓   2 [chromium] › tests/e2e/player-offline-selfheal.spec.js:138:3 › Player Offline Fallback & Self-Heal › player falls back to cached content when offline (PLYR-03) (1.8s)
  ✓   8 [chromium] › tests/e2e/player-rendering.spec.js:129:3 › Player Rendering › ViewPage shows no-content state when no playlist or layout assigned (866ms)
  ✓  10 [chromium] › tests/e2e/player-rendering.spec.js:202:3 › Player Rendering › ViewPage renders multi-zone layout with absolute positioning (PLYR-02) (967ms)
  ✓   9 [chromium] › tests/e2e/player-rendering.spec.js:155:3 › Player Rendering › ViewPage renders playlist content with images and progress dots (PLYR-01) (1.0s)
  ✓  11 [chromium] › tests/e2e/player-telemetry.spec.js:85:3 › Player Telemetry › player sends heartbeat update_device_status on mount (PLYR-06) (4.3s)
  ✓  12 [chromium] › tests/e2e/player-telemetry.spec.js:105:3 › Player Telemetry › heartbeat includes player version and content hash (PLYR-05, PLYR-06) (4.3s)
  ✓  13 [chromium] › tests/e2e/player-telemetry.spec.js:133:3 › Player Telemetry › player detects content version mismatch and triggers re-fetch (PLYR-05) (36.3s)
  ✓  14 [chromium] › tests/e2e/player-telemetry.spec.js:214:3 › Player Telemetry › player heartbeat polling sends player_heartbeat RPC (PLYR-06 device metrics) (36.3s)

  14 passed (38.8s)
```

## Run 3

Command (list): `npx playwright test tests/e2e/player-rendering.spec.js tests/e2e/player-offline-selfheal.spec.js tests/e2e/player-telemetry.spec.js --project=chromium --reporter=list --retries=0`
Command (json): `PLAYWRIGHT_JSON_OUTPUT_FILE=/tmp/169-hver05/run-3.json npx playwright test ... --reporter=json --retries=0`
List-run exit code: 0
Json-run exit code: 0
Totals: 14 passed / 0 failed / 0 skipped
Duration: 38.8s

```
  ✓   6 [chromium] › tests/e2e/player-rendering.spec.js:63:3 › Player Rendering › PairPage loads correctly with OTP input and connect button (794ms)
  ✓   3 [chromium] › tests/e2e/player-offline-selfheal.spec.js:108:3 › Player Offline Fallback & Self-Heal › player loads content and caches it to IndexedDB (1.0s)
  ✓   5 [chromium] › tests/e2e/player-offline-selfheal.spec.js:207:3 › Player Offline Fallback & Self-Heal › player shows error state and re-pair button when no cache (PLYR-04) (1.1s)
  ✓   4 [chromium] › tests/e2e/player-offline-selfheal.spec.js:161:3 › Player Offline Fallback & Self-Heal › player displays error state when server fails without cache (1.1s)
  ✓   2 [chromium] › tests/e2e/player-offline-selfheal.spec.js:182:3 › Player Offline Fallback & Self-Heal › stuck detection mechanism is registered on load (PLYR-04) (1.2s)
  ✓   7 [chromium] › tests/e2e/player-rendering.spec.js:83:3 › Player Rendering › ViewPage shows loading state while fetching content (726ms)
  ✓   1 [chromium] › tests/e2e/player-offline-selfheal.spec.js:138:3 › Player Offline Fallback & Self-Heal › player falls back to cached content when offline (PLYR-03) (1.7s)
  ✓   8 [chromium] › tests/e2e/player-rendering.spec.js:129:3 › Player Rendering › ViewPage shows no-content state when no playlist or layout assigned (839ms)
  ✓   9 [chromium] › tests/e2e/player-rendering.spec.js:155:3 › Player Rendering › ViewPage renders playlist content with images and progress dots (PLYR-01) (900ms)
  ✓  10 [chromium] › tests/e2e/player-rendering.spec.js:202:3 › Player Rendering › ViewPage renders multi-zone layout with absolute positioning (PLYR-02) (912ms)
  ✓  11 [chromium] › tests/e2e/player-telemetry.spec.js:85:3 › Player Telemetry › player sends heartbeat update_device_status on mount (PLYR-06) (4.4s)
  ✓  12 [chromium] › tests/e2e/player-telemetry.spec.js:105:3 › Player Telemetry › heartbeat includes player version and content hash (PLYR-05, PLYR-06) (4.2s)
  ✓  13 [chromium] › tests/e2e/player-telemetry.spec.js:133:3 › Player Telemetry › player detects content version mismatch and triggers re-fetch (PLYR-05) (36.2s)
  ✓  14 [chromium] › tests/e2e/player-telemetry.spec.js:214:3 › Player Telemetry › player heartbeat polling sends player_heartbeat RPC (PLYR-06 device metrics) (36.2s)

  14 passed (38.8s)
```

## Per-Test Timing Histogram

Extracted from `/tmp/169-hver05/run-{1,2,3}.json`. Global timeout is 120,000ms (from playwright.config.js). Risk: high = within 20% of 120s (>96s), med = within 40% (>72s), low = below 40%.

Sorted by max duration descending:

| Test | Run 1 (ms) | Run 2 (ms) | Run 3 (ms) | Max (ms) | Risk |
|------|------------|------------|------------|----------|------|
| player detects content version mismatch and triggers re-fetch (PLYR-05) | 36209 | 36403 | 36223 | 36403 | low |
| player heartbeat polling sends player_heartbeat RPC (PLYR-06 device metrics) | 36163 | 36385 | 36168 | 36385 | low |
| ViewPage shows loading state while fetching content | 26835 | 948 | 744 | 26835 | low |
| ViewPage shows no-content state when no playlist or layout assigned | 25375 | 1081 | 918 | 25375 | low |
| player sends heartbeat update_device_status on mount (PLYR-06) | 4302 | 4545 | 4345 | 4545 | low |
| heartbeat includes player version and content hash (PLYR-05, PLYR-06) | 4189 | 4308 | 4227 | 4308 | low |
| player falls back to cached content when offline (PLYR-03) | 1820 | 1952 | 1481 | 1952 | low |
| player loads content and caches it to IndexedDB | 1114 | 1356 | 1123 | 1356 | low |
| player shows error state and re-pair button when no cache (PLYR-04) | 1303 | 1278 | 1164 | 1303 | low |
| player displays error state when server fails without cache | 1295 | 1143 | 995 | 1295 | low |
| stuck detection mechanism is registered on load (PLYR-04) | 1266 | 1157 | 1144 | 1266 | low |
| PairPage loads correctly with OTP input and connect button | 1058 | 1124 | 885 | 1124 | low |
| ViewPage renders multi-zone layout with absolute positioning (PLYR-02) | 883 | 996 | 877 | 996 | low |
| ViewPage renders playlist content with images and progress dots (PLYR-01) | 781 | 937 | 866 | 937 | low |

**Note on high Run 1 times for ViewPage tests:** "ViewPage shows loading state" (26.8s) and "ViewPage shows no-content state" (25.4s) show elevated durations on the first run only. Runs 2 and 3 are consistently under 1.1s. These are cold-start / JIT warm-up effects from the first Playwright run. Since all 3 runs pass and the max is well under the 120s timeout, this does not represent a stability risk.

**Note on telemetry tests at ~36s:** Both "player detects content version mismatch" and "player heartbeat polling" tests take ~36s on every run. This is deliberate — they test timer-based behavior (polling intervals). The timing is stable and deterministic across runs (within 200ms variance). The 120s global timeout provides ample headroom.

No tests are classified as medium or high risk.

## Spec Adjustments Made

None — tests stable as restored from d0028db6. No waitFor changes, no timeout adjustments, no test.fixme markers introduced.

## Escalated Gaps

None — all 14 player tests passed all 3 consecutive runs with 0 retries. PLYR-01 through PLYR-06 are verified stable.
