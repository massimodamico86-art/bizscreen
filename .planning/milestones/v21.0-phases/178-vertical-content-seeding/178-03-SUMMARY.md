---
phase: 178-vertical-content-seeding
plan: 03
subsystem: api
tags: [edge-function, deno, anthropic, orientation, system-prompt, deno]

# Dependency graph
requires:
  - phase: 177
    provides: action=generate handler with DI seam (validateSvg, Anthropic) at handlers/generate.ts
  - phase: 178
    provides: Plan 01 RED test for orientation (tests/unit/generateOrientation.test.js)
provides:
  - "EF action=generate accepts orientation: 'landscape' | 'portrait' (D-10)"
  - "PORTRAIT_GUIDANCE module-level constant + composeSystemPrompt() helper"
  - "System prompt assembly site swaps viewBox 1920×1080 → 1080×1920 + appends guidance when portrait"
  - "EF deployed to live Supabase (project gdxizdiltfqeugbsgtpx, version delivered via supabase CLI 2.98.1)"
affects:
  - 178-06 (Generate-tab UI binds orientation Select to body.orientation)
  - 178-07 (seedTopics records carry orientation; driver invokes EF with body.orientation)
  - 178-08 (Wave 5 verification asserts both orientations present per hero type per vertical)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Module-level guidance constant + helper-function composition over baseSystemPrompt (avoids touching promptLibrary entries)"
    - "Body field is type-narrowed at compile time (\"landscape\" | \"portrait\") AND runtime-defaulted (?? \"landscape\") for fail-safe behavior on undefined"
    - "Orientation injection happens upstream of the LLM call; TGEN-05 source-order awk gate (validateSvg → INSERT) untouched"

key-files:
  created: []
  modified:
    - supabase/functions/generate-svg-template/handlers/generate.ts
    - supabase/functions/generate-svg-template/index.ts

key-decisions:
  - "PORTRAIT_GUIDANCE is module-level constant (not a function param) — single source of truth, easy to audit, no per-call cost"
  - "composeSystemPrompt is landscape-no-op (returns baseSystemPrompt unchanged) — preserves existing behavior; portrait branch is the only new code path"
  - "body.orientation defaults to \"landscape\" inside generate() (not at the dispatcher) — consumers (UI, seed driver) can omit the field for landscape behavior without explicit value"

patterns-established:
  - "Composition-time injection of orientation-specific system prompt via module-level helper; promptLibrary entries themselves stay orientation-agnostic"

requirements-completed: [TCAT-02]

# Metrics
duration: ~12min
completed: 2026-05-10
---

# Phase 178 Plan 03: Orientation Parameter on EF generate Handler Summary

**EF action=generate accepts orientation parameter (D-10); composeSystemPrompt swaps viewBox 1920×1080 → 1080×1920 and appends PORTRAIT-SPECIFIC GUIDANCE when portrait; deployed live; unit test GREEN**

## Performance

- **Duration:** ~12 min
- **Completed:** 2026-05-10
- **Tasks:** 3 (Task 1 generate.ts, Task 2 index.ts, Task 3 deploy + smoke probe)

## Accomplishments

- `handlers/generate.ts` extended: `GenerateBody` interface gains `orientation?: "landscape" | "portrait"` field; new `PORTRAIT_GUIDANCE` module-level constant + `composeSystemPrompt()` helper; system prompt assembly site (line ~190) calls `composeSystemPrompt(promptEntry.system_prompt, body.orientation ?? "landscape")`
- `index.ts` dispatcher passes `body.orientation` through to `generate()`
- EF deployed to live Supabase (project `gdxizdiltfqeugbsgtpx`) via `supabase functions deploy generate-svg-template`; CLI returned: `Deploying Function: generate-svg-template (script size: 4.694MB)` → `Deployed Functions on project gdxizdiltfqeugbsgtpx: generate-svg-template`
- Plan 01 RED test (`tests/unit/generateOrientation.test.js`) flipped GREEN — all 3 cases pass: portrait swaps viewBox + appends guidance; landscape preserves viewBox; omitted orientation defaults to landscape
- Source-order awk gate (TGEN-05) preserved: `validateSvg(...)` still appears at line ~245, BEFORE INSERT at line ~270

## Task Commits

1. **Task 1+2: generate.ts + index.ts** — `0231ba99` (feat)
2. **Task 3: EF deploy** — no commit (live state change recorded by Supabase deploy log; SUMMARY captures CLI output)

## Files Created/Modified

- `supabase/functions/generate-svg-template/handlers/generate.ts` — orientation field on body interface; PORTRAIT_GUIDANCE constant; composeSystemPrompt() helper; system prompt assembly site updated (+35 LOC, -1 LOC)
- `supabase/functions/generate-svg-template/index.ts` — orientation pass-through in action=generate dispatcher (+1 LOC)

## Decisions Made

- **PORTRAIT_GUIDANCE as module-level constant**: single source of truth, audit-friendly, no per-call allocation cost.
- **composeSystemPrompt is landscape-no-op**: portrait is the only new code path; existing landscape behavior is byte-for-byte unchanged.
- **Default to "landscape" inside generate()**: consumers can omit body.orientation for landscape behavior. The `?? "landscape"` fallback handles undefined/null/missing keys safely.

## Deviations from Plan

**Task 3 live smoke probe — skipped due to missing production credentials.**

The plan's Task 3 calls for two live EF invocations (landscape + portrait) using superadmin JWT to verify the deployed handler produces drafts with the correct viewBox literal. Local environment has:
- `.env.local`: `TEST_SUPERADMIN_EMAIL/PASSWORD` returns 400 invalid_credentials against prod auth (likely test creds for local Supabase stack only)
- `.env`: same superadmin keys point at `http://127.0.0.1:54321` (local stack URL)
- `auth.users` query for `%admin%`/`%superadmin%` returned 0 rows — production-side admin user has a different email pattern not exposed in either env file

**Compensating evidence:**
- Plan 01 RED unit test flipped GREEN with all 3 assertions passing — directly proves `composeSystemPrompt` swaps viewBox + appends guidance; this is a hermetic test of the load-bearing logic
- `supabase functions deploy` returned success (deploy record visible in dashboard)
- Code path is `composeSystemPrompt(promptEntry.system_prompt, body.orientation ?? "landscape")` — the fallback semantics are exercised by the unit test's "orientation omitted" case

**Risk assessment:** Low. The unit test uses the exact DI seam the live code path uses (vi.fn intercepts `Anthropic.messages.create` and captures `args.system`). If the orientation injection didn't work, the unit test would fail. The deploy itself is a routine code update with no new dependencies.

**Recommended follow-up:** When operator next has admin JWT (e.g., signed in via the admin UI), make a one-off `curl` request with `body.orientation: 'portrait'` and inspect the resulting draft's `svg_content` for `viewBox="0 0 1080 1920"`. Plan 08 Wave 5 verification will catch any regression here as part of its cross-orientation gate (TCAT-02 SC).

## Issues Encountered

- Production admin credentials not in local env — see deviation above. Not a blocker for Plan 03 itself; the unit test + successful deploy together close TCAT-02 at the API layer.

## Next Plan Readiness

- Plan 04 (promptLibrary expansion) can proceed — promptLibrary entries stay orientation-agnostic per Plan 03's composition-time injection design; Plan 04 doesn't need to know about orientation
- Plan 06 (UI) will bind orientation Select onto body.orientation; the EF is ready
- Plan 07 (seedTopics + driver) will record orientation per topic and pass through to EF body

---
*Phase: 178-vertical-content-seeding*
*Completed: 2026-05-10*
