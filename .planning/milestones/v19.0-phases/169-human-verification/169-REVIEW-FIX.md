---
phase: 169-human-verification
fixed_at: 2026-04-14T00:00:00Z
review_path: .planning/phases/169-human-verification/169-REVIEW.md
iteration: 1
findings_in_scope: 4
fixed: 4
skipped: 0
status: all_fixed
---

# Phase 169: Code Review Fix Report

**Fixed at:** 2026-04-14
**Source review:** `.planning/phases/169-human-verification/169-REVIEW.md`
**Iteration:** 1

**Summary:**
- Findings in scope (Critical + Warning): 4
- Fixed: 4
- Skipped: 0
- Info findings (7): skipped by scope — not in critical_warning scope

## Fixed Issues

### WR-01: Stale-closure risk in branding-tab fetch effect

**Files modified:** `src/pages/SettingsPage.jsx`
**Commit:** `1a25807f`
**Applied fix:** Added `useRef` to the React import, introduced a
`fetchedBrandThemesOnceRef` ref, and rewrote the branding-tab `useEffect`
to a one-shot pattern that early-returns when the branding tab is not
active or when the ref has already been tripped. Removes the
`brandThemes.length === 0 && !brandLoading` condition that could cause
silent retry loops after a failed fetch and eliminates the
exhaustive-deps mismatch that was ignoring `brandThemes` / `brandLoading`
in the dep array.

### WR-02: Variable shadowing of i18n `t` by callback parameter

**Files modified:** `src/pages/SettingsPage.jsx`
**Commit:** `753efd41`
**Applied fix:** Renamed the `t` callback parameter to `theme` in
`handleDeleteTheme` (`brandThemes.filter(theme => ...)`) and
`handleSetActiveTheme` (`brandThemes.map(theme => ({ ...theme, ... }))`).
Removes the shadow of the `t` translator destructured from
`useTranslation()` so future edits adding `t('...')` inside those
callbacks will call the translator instead of the array element.

### WR-03: 35-second fixed wait creates flaky/slow telemetry tests

**Files modified:** `tests/e2e/player-telemetry.spec.js`
**Commit:** `b8d7bd7c`
**Applied fix:** Replaced both `await page.waitForTimeout(35000)` calls
with event-driven `await expect.poll(...)` blocks:
- PLYR-05 test polls `contentFetchCount >= 2` with a 40s timeout and
  `[1000, 2000, 5000]` backoff intervals.
- PLYR-06 test polls the length of captured `player_heartbeat` RPC calls
  to be `>= 1`, keeping the subsequent `p_screen_id` assertion on the
  first captured call.
Also reworded the comments to remove the stale `Player.jsx line 2524`
pointer that would drift as the file changes. Tests now finish as soon
as the condition is observed instead of always consuming 35s per test,
and they no longer break if the underlying poll interval constant is
tweaked (within the 40s window).

### WR-04: Always-passing test provides no regression guard

**Files modified:** `tests/e2e/nav-accessibility-onboarding.spec.js`
**Commit:** `880dc406`
**Applied fix:** Extended the test signature to accept `testInfo`
(`async ({ page }, testInfo) => { ... }`), removed the trailing
`expect(true).toBe(true)` no-op assertion, and replaced it with
`testInfo.annotations.push({ type: 'onboarding-state', description:
String(result) })`. Diagnostic value (which branch ran) is preserved via
Playwright annotations, while the fake green assertion that made the
test unfailable is gone — real branch-level assertions (URL regex,
sidebar visibility) remain the only pass/fail gates.

## Skipped Issues

None — all in-scope findings were applied.

## Out-of-Scope (Info findings, not attempted this iteration)

IN-01 through IN-07 were Info-severity and outside `critical_warning`
scope. They remain documented in `169-REVIEW.md` for a future pass.

---

_Fixed: 2026-04-14_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
