---
phase: 174-scene-editor-onboarding-integration
plan: 07
subsystem: onboarding
tags: [onboarding, service, data-mapping, rpc, starter-pack, gallery-tour, wave-4]
requires:
  - phase: 174
    plan: 02
    provides: "extended get_onboarding_progress RETURNS TABLE with completed_starter_pack + completed_gallery_tour BOOLEANs; update_onboarding_step allowlist accepts 'starter_pack' and 'gallery_tour'"
  - phase: 174
    plan: 03
    provides: "live + local DB confirmation that the migration is applied — RPC return shape matches client expectations"
  - phase: 174
    plan: 01
    provides: "RED tests in tests/unit/services/onboardingService.test.js (TONB-01 — 7 steps, position, no navigateTo) and tests/integration/onboarding-rpc.test.js (TONB-03 — RPC column mapping + markGalleryTourSeen contract)"
provides:
  - "ONBOARDING_STEPS array with 7 entries (welcome, logo, starter_pack, first_media, first_playlist, first_screen, screen_pairing)"
  - "OnboardingProgress typedef extended with completedStarterPack + completedGalleryTour"
  - "getOnboardingProgress maps both new columns on happy AND error fallback paths (Pitfall 5 closed)"
  - "getNextStep walks 7 entries in correct D-07 order"
  - "getCompletedCount counts completedStarterPack toward wizard total (gallery_tour intentionally excluded — Pitfall 3 / D-15)"
  - "markGalleryTourSeen export — non-throwing wrapper around update_onboarding_step('gallery_tour', true)"
affects:
  - "Plan 08 (OnboardingWizard StepContent) — consumes the new ONBOARDING_STEPS entry + completedStarterPack mapping"
  - "Plan 09 (useGalleryTour) — consumes markGalleryTourSeen + completedGalleryTour"
tech-stack:
  added: []
  patterns:
    - "Non-throwing RPC wrapper (markGalleryTourSeen logs + swallows errors so a tour-mark failure cannot break gallery UX — Pitfall 5 surface)"
    - "Tri-state column write via existing dynamic update_onboarding_step (no service-layer code change for new step names — server allowlist gates)"
key-files:
  created: []
  modified:
    - "src/services/onboardingService.js (310 → 356 lines)"
    - "tests/unit/services/onboardingService.test.js (updated 4 phase-7 tests for 7-step denominator + added 1 new starter_pack getNextStep case)"
decisions:
  - "Used Package as the icon name string — matches lucide-react availability and the planner's recommendation; OnboardingWizard.jsx (Plan 08) imports + maps it"
  - "Updated 4 existing phase-7 tests (1 in getNextStep, 3 in getProgressPercent) to reflect the new 7-step denominator. These were direct consequences of extending ONBOARDING_STEPS — Rule 1 auto-fix"
  - "Added a +1 new test case ('returns starter_pack step when welcome and logo are complete') so getNextStep coverage now walks the full 7-step ladder explicitly"
metrics:
  duration_min: 2
  completed: 2026-04-29
---

# Phase 174 Plan 07: Onboarding Service Extension Summary

Extended `src/services/onboardingService.js` to support the new `starter_pack` wizard step and the `gallery_tour` first-visit affordance — pure data-mapping + service layer, zero UI. Plan 08 (OnboardingWizard StepContent) and Plan 09 (useGalleryTour) now have the contracts they consume.

## What Changed

### 6 mutations to `src/services/onboardingService.js`

1. **`ONBOARDING_STEPS` array (length 6 → 7).** Inserted `starter_pack` entry at index 2 (between `logo` at index 1 and `first_media` at index 3). The new entry carries `id`, `title` ("Choose a Starter Pack"), `description`, `icon: 'Package'`, and notably **no `navigateTo`** (D-08 — step stays inside the wizard rather than navigating away).

2. **`OnboardingProgress` JSDoc typedef.** Two new boolean properties added before `isComplete`:
   - `completedStarterPack` — D-12 / D-15 (counts toward wizard completion)
   - `completedGalleryTour` — D-16 (does NOT count toward `isComplete`)

3. **`getOnboardingProgress` happy-path mapper.** Maps `row.completed_starter_pack` and `row.completed_gallery_tour` to camelCase, both defaulting to `false` via `|| false` (matches the existing pattern for the 6 prior columns).

4. **`getOnboardingProgress` error-fallback object.** Adds `completedStarterPack: false` and `completedGalleryTour: false` to the resource-fallback shape. **This closes Pitfall 5**: without these fields in the fallback path, `useGalleryTour` (Plan 09) would mis-fire on every mount-after-error because `progress.completedGalleryTour` would be `undefined` (truthy-false but not specifically `false`), reading as "tour never seen" even when the DB write succeeded.

5. **`getNextStep` stepChecks array (6 → 7 entries).** Inserted `{ id: 'starter_pack', check: progress.completedStarterPack }` between `logo` and `first_media` — preserves the canonical D-07 ladder.

6. **`getCompletedCount` (6 → 7 increments).** Added `if (progress.completedStarterPack) count++;` between the `logo` and `first_media` checks. **`completedGalleryTour` is intentionally NOT counted** — Pitfall 3 / D-15: gallery_tour is a separate single-shot affordance, not a wizard step. Confirmed via negative grep (`grep -E "if\s*\(progress\.completedGalleryTour\)\s*count\+\+"` returns no match).

### 1 new export

7. **`markGalleryTourSeen()`** — appended at end of file (after `syncOnboardingProgress`). Thin RPC wrapper:
   - Calls `supabase.rpc('update_onboarding_step', { p_step: 'gallery_tour', p_completed: true })`
   - **Non-throwing**: errors are logged via `console.error('[onboardingService] markGalleryTourSeen failed:', error)` and swallowed (returns `{ success: false, error: msg }` — caller continues). This is intentional because a tour-mark failure must NOT break the gallery UX (T-174-07-03 mitigation). Worst case: tour replays on next visit, which is harmless.

The Phase 174 migration (Plan 02) gates the allowlist server-side — `update_onboarding_step` already accepts arbitrary `p_step` values, so no service-layer change to `updateOnboardingStep` was needed for the new step names.

### Pitfall 3 negative check confirmed

`grep -E "if\s*\(progress\.completedGalleryTour\)\s*count\+\+" src/services/onboardingService.js` exits with no match. Inline comment in `getCompletedCount` documents the intentional omission so future maintainers do not "fix" it.

## Plan 01 GREEN Flips

**Unit tests (tests/unit/services/onboardingService.test.js — TONB-01)** — flipped from RED to GREEN:
- `ONBOARDING_STEPS constant > contains all 7 steps` (was: expected 7, got 6)
- `ONBOARDING_STEPS constant > has starter_pack step between logo and first_media (D-07)` (was: indexOf 'starter_pack' returned -1)
- `ONBOARDING_STEPS constant > starter_pack step has no navigateTo (stays inside wizard per D-08)` (was: step undefined)

**Integration tests (tests/integration/onboarding-rpc.test.js — TONB-03)** — flipped from RED to GREEN:
- `updateOnboardingStep("starter_pack", true) calls update_onboarding_step RPC with p_step="starter_pack"` (was: import failed because markGalleryTourSeen export missing — entire file failed at module-load)
- `getOnboardingProgress maps completed_starter_pack and completed_gallery_tour to camelCase` (was: progress.completedStarterPack === undefined, expected true)
- `markGalleryTourSeen calls update_onboarding_step with p_step="gallery_tour", p_completed=true` (was: undefined import)

## Tests Updated (Rule 1 auto-fix)

4 pre-existing phase-7 tests assumed 6 steps — extending the array to 7 broke their math/ordering. Direct consequence of the current task's array change → Rule 1 (auto-fix bugs caused by current task's changes).

- `getNextStep > returns first_media step when welcome and logo are complete` → split into two: a new `returns starter_pack step when welcome and logo are complete (Phase 174 D-07)` AND a corrected `returns first_media step when welcome, logo, and starter_pack are complete (Phase 174 D-07)`. Net: +1 test case (28 total, was 27).
- `getProgressPercent > returns approximately 17% for 1 of 6 steps` → `returns approximately 14% for 1 of 7 steps` (1/7 = 14.29% → 14)
- `getProgressPercent > returns 50% for 3 of 6 steps` → `returns approximately 43% for 3 of 7 steps` (3/7 = 42.86% → 43)
- `getProgressPercent > returns 100% when all steps are complete` → updated mock progress to include `completedStarterPack: true` so the count reaches 7/7

## Verification Results

| Check | Expected | Result |
|-------|----------|--------|
| `grep -c "id: 'starter_pack'" src/services/onboardingService.js` | >= 1 | 2 (array entry + getNextStep stepChecks) |
| `grep -c "completedStarterPack" src/services/onboardingService.js` | >= 4 | 5 (typedef + happy mapper + error mapper + getNextStep + getCompletedCount) |
| `grep -c "completedGalleryTour" src/services/onboardingService.js` | >= 3 | 4 (typedef + happy + error + comment in getCompletedCount) |
| `grep -c "export async function markGalleryTourSeen" src/services/onboardingService.js` | 1 | 1 |
| `grep -c "p_step: 'gallery_tour'" src/services/onboardingService.js` | 1 | 1 |
| Negative grep for `if (progress.completedGalleryTour) count++` | no match (PASS) | no match — PASS (Pitfall 3) |
| `npx vitest run tests/unit/services/onboardingService.test.js tests/integration/onboarding-rpc.test.js` | all pass | **28 passed** (was: 5 failing RED) |
| `npm run build` | clean | clean (6.73s, no errors) |
| `wc -l src/services/onboardingService.js` | >= 320 | 356 |
| `grep -c "starter_pack" src/services/onboardingService.js` (must_haves.contains) | >= 1 | 5 |

## Plans Unblocked

- **Plan 08 (OnboardingWizard StepContent — Wave 5)** — can now branch on `step.id === 'starter_pack'`, render the picker UI, and call `updateOnboardingStep('starter_pack', true)` after the user chooses or skips. Will need to add a `Package` import + `STEP_ICONS` map entry to OnboardingWizard.jsx.
- **Plan 09 (useGalleryTour — Wave 5)** — can now read `progress.completedGalleryTour` to decide whether to show the tour, and call `markGalleryTourSeen()` after the user completes/dismisses it. Non-throwing semantics ensure the gallery never breaks even if the mark fails.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Updated 4 pre-existing phase-7 tests for 7-step model**
- **Found during:** Task 1 vitest run after array extension
- **Issue:** Tests in `tests/unit/services/onboardingService.test.js` hardcoded 6-step assumptions (`getNextStep` after welcome+logo expected `first_media`; `getProgressPercent` denominator was 6, asserting 17%/50%/100%)
- **Fix:** Updated test expectations to match the new 7-step ladder: 1/7=14%, 3/7=43%, 7/7=100%; the welcome+logo→next-step test split into two cases (one expecting `starter_pack`, one with starter_pack also complete expecting `first_media`)
- **Files modified:** `tests/unit/services/onboardingService.test.js`
- **Commit:** `1b4e3fe4`

No other deviations — Rule 4 (architectural) did not apply; no auth gates encountered.

## Threat Model Compliance

All threats from the plan's `<threat_model>`:

- **T-174-07-01** (Tampering — markGalleryTourSeen invoked by attacker): accept (RPC operates on auth.uid() server-side; mitigated by Plan 02). ✓
- **T-174-07-02** (Information Disclosure — console.error leaks RPC error): accept (Supabase server-side messages, no PII). ✓
- **T-174-07-03** (DoS — tour-mark failure breaking gallery): mitigate via non-throwing wrapper. ✓ — `markGalleryTourSeen` returns `{ success: false, error: msg }` instead of throwing; caller proceeds normally.

No new trust boundaries or surfaces introduced beyond what the plan already documented.

## Self-Check: PASSED

- File `src/services/onboardingService.js` exists (modified, 356 lines): FOUND
- File `tests/unit/services/onboardingService.test.js` exists (modified): FOUND
- File `tests/integration/onboarding-rpc.test.js` unchanged (no edits — already correct from Plan 01): present
- Commit `1b4e3fe4` (`feat(174-07): extend onboarding service for starter_pack + gallery_tour`): FOUND in `git log --oneline`
- Vitest: **28/28 passing** across both target test files (`tests/unit/services/onboardingService.test.js` + `tests/integration/onboarding-rpc.test.js`)
- Build: clean (`npm run build` succeeded in 6.73s, no errors mentioning onboardingService)

All success criteria met. Plans 08 and 09 are unblocked.
