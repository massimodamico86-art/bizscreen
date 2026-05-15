---
phase: 177-ai-generation-pipeline-admin-queue-ui
plan: 02
subsystem: edge-function
tags: [phase-177, edge-function, anthropic, prompt-library, validator-at-ingest, retry-loop, deno-dom, claude-haiku, tool-use, dependency-injection]

# Dependency graph
requires:
  - phase: 177-01
    provides: Spike Edge Function deployed live; deno.json + index_bg.wasm + supabase/config.toml; D-17 landmine documented; 5 RED tests committed
  - phase: 176-schema-foundation
    provides: template_drafts table + admin-only RLS + is_admin/is_super_admin SQL helpers
provides:
  - Production generate path live — `supabase.functions.invoke('generate-svg-template', { body: { action: 'generate', vertical, template_type, prompt }})` returns `{ draftId, status, warnings, attempt_count }`
  - svgValidator runs at INGEST boundary BEFORE every template_drafts INSERT (TGEN-05 / Pitfall A1) — locked by tests/unit/generateValidatorOrder.test.js + source-order awk check
  - 2-retry-with-feedback loop (TGEN-02) — capped at 3 total attempts per Pitfall A3; previous attempt's validator errors fed back into next prompt's user message
  - 6-entry version-controlled prompt library (TGEN-06 SC #1): src/services/aiTemplate/promptLibrary.js + supabase/functions/generate-svg-template/prompts.json, parity-locked by Vitest deep-equal test (D-08)
  - DI seam (B2): handler accepts deps.anthropic / deps.Anthropic for pure-mock unit tests; production path dynamically imports npm:@anthropic-ai/sdk via runtime-string specifier so Vitest can statically load the module
  - D-17 landmine wrapper: handler injects DenoSvgDOMParser class that translates `image/svg+xml` → `text/html` (deno-dom 0.1.x doesn't implement image/svg+xml mime); the upstream svgValidator.js stays browser/jsdom-compatible
  - Frontend service-layer wrapper: src/services/aiTemplate/templateDraftsService.js — fetchPendingDrafts + generateDraft + approveDraft + rejectDraft + saveDraftSvgContent
  - index.ts action dispatcher: spike (Plan 01 probes preserved) | generate (production) | approve|reject (501 stubs, Plan 03 fills)
  - TGEN-04 build-time gate: `npm run build && grep -r ANTHROPIC dist/` exits 1 (no matches in client bundle)
affects: [phase-177-03, phase-177-04, phase-177-05, phase-177-06, phase-178, phase-179]

# Tech tracking
tech-stack:
  added:
    - npm:dompurify@^3.0.0 to deno.json imports map (Deno bundler needs to resolve top-level dompurify import in src/services/svgValidator.js even though Rule 4 is silently skipped server-side)
  patterns:
    - "Vitest-tolerant Deno handler: `import promptsJson from '../prompts.json' with { type: 'json' }` works in both Deno and Vitest 4 / Node 22+; Deno-only `npm:`/`jsr:` specifiers loaded via dynamic import with string-concatenated specifier + /* @vite-ignore */ comment so Vite doesn't statically analyze them"
    - "DI seam pattern for Edge Function handlers — accept `deps` object with optional Anthropic client + validateSvg ctor, fall back to runtime imports + globalThis.DOMParser when missing; lets Vitest exercise full handler logic with no env / no API spend"
    - "DenoSvgDOMParser wrapper — class with parseFromString(input, _mime) that ignores the requested mime and always parses as text/html; the canonical fix for the Phase 176 D-17 landmine when the validator is invoked from Deno"
    - "Validator-at-ingest order guarantee enforced two ways: (1) tests/unit/generateValidatorOrder.test.js mocks the call order, (2) source-order awk check verifies validateSvg(svg call appears BEFORE from(\"template_drafts\") call in the same file"
    - "Anthropic tool-use for structured SVG output: tools=[{ name: 'emit_svg_template', input_schema: { properties: { svg, rationale }, required: ['svg'] }}], tool_choice={ type: 'tool', name: 'emit_svg_template' }; eliminates Pitfall A4-style false confidence in free-text SVG extraction"

key-files:
  created:
    - src/services/aiTemplate/promptLibrary.js (60 LOC) — frontend prompt source, 6 cross-vertical entries
    - src/services/aiTemplate/templateDraftsService.js (78 LOC) — frontend service: fetchPendingDrafts + generateDraft + approveDraft + rejectDraft + saveDraftSvgContent
    - supabase/functions/generate-svg-template/prompts.json (8.6KB) — server-side parallel prompt library, parity-locked with promptLibrary.js
    - supabase/functions/generate-svg-template/svgValidator.ts (~24 LOC) — re-export shim for src/services/svgValidator.js (Option A per RESEARCH §svgValidator extensibility)
    - supabase/functions/generate-svg-template/handlers/generate.ts (~280 LOC) — production generate handler with validator-at-ingest + retry-with-feedback + DI seam + DOMParser wrapper
  modified:
    - supabase/functions/generate-svg-template/index.ts — Wave 0 spike body replaced with action dispatcher (spike preserved for diagnostics; generate live; approve/reject 501 stubs)
    - supabase/functions/generate-svg-template/deno.json — added dompurify imports map entry
    - tests/integration/generateSvgTemplate.test.js — TGEN-02 stub replaced with two real pure-mock retry-budget tests; TGEN-01 happy-path augmented with W7 SC3 explicit content assertions

key-decisions:
  - "DI seam supports BOTH lowercase deps.anthropic (Plan 02 plan-spec) AND capitalized deps.Anthropic (existing tests/unit/generateValidatorOrder.test.js shape) for backwards compatibility with Wave 0 RED scaffolds"
  - "Deno-only npm:/jsr: specifiers loaded via runtime-string dynamic imports with /* @vite-ignore */ — keeps the .ts file statically loadable by Vitest while letting Deno resolve natively at runtime via the imports map"
  - "DenoSvgDOMParser wrapper class lives in handlers/generate.ts (not svgValidator.ts) because the upstream svgValidator.js continues to call parseFromString(svg, 'image/svg+xml'); wrapping at injection point keeps the validator pure"
  - "dompurify import map entry — top-level import in svgValidator.js loads regardless of opts.DOMPurify=null; Deno bundler needs the specifier to RESOLVE even though sanitize() never runs"
  - "501 stubs for action=approve|reject return JSON error body (not opaque 501) — frontend service layer can show actionable 'TODO Wave 2 / Plan 03' message when the wired UI hits the stubs"

patterns-established:
  - "Plan 02 EF action dispatcher pattern: try/catch around inner if-chain on body.action; service-role client only constructed in branches that need it; spike branch stays for live diagnostics across waves"
  - "Vitest-tolerant ESM handler in supabase/functions/: handlers/*.ts can be loaded by Vitest via static `import` of the file path (Vite resolves .ts via esbuild) so long as Deno-only specifiers are dynamic (string concat + @vite-ignore); JSON imports use `with { type: 'json' }` (works in both runtimes)"
  - "Mock-test pattern for retry-budget contracts: vi.fn().mockResolvedValueOnce(...).mockResolvedValueOnce(...).mockResolvedValueOnce(...) returns 3 different SVGs; insertedRow captured by mockSupa.from().insert hook; assertions on result.status + result.attempt_count + insertedRow.metadata.validator_failures.length"
  - "Service-layer error-throw pattern (cloned from marketplaceService.js): const { data, error } = await supabase...; if (error) throw error; return data — caller catches and toasts"

requirements-completed: [TGEN-01, TGEN-02, TGEN-03, TGEN-05, TGEN-06]

# Metrics
duration: ~30min
completed: 2026-05-07
---

# Phase 177 Plan 02: Wave 1 Production Generate Path Summary

**Production AI generate path live with validator-at-ingest, 2-retry-with-feedback, and 6-entry parity-locked prompt library — first live admin-JWT generate call returned status=pending in 7s with all W7 SC3 SVG-content assertions GREEN.**

## Performance

- **Duration:** ~30 min
- **Started:** 2026-05-07T00:18Z (plan execution begin)
- **Completed:** 2026-05-07T00:33Z (final commit + verification)
- **Tasks:** 3 (prompt library, generate handler + tests, frontend service)
- **Files created:** 5
- **Files modified:** 3
- **Commits:** 3 task commits
- **EF deploys:** 2 (initial + DOMParser-wrapper bug fix)

## Accomplishments

- **Production generate path live.** Live admin JWT + `action=generate` round-trip:

  ```json
  {
    "draftId": "e816e75a-c9cd-4312-920e-766d66db2d40",
    "status": "pending",
    "warnings": ["DOMPurify unavailable — sanitization check skipped"],
    "attempt_count": 1
  }
  ```

  HTTP 200, 7s elapsed. Persisted SVG (1700 bytes) passes all 3 W7 SC3 content assertions: contains `viewBox`, NOT contains `currentColor`, matches `/fill\s*=\s*['"]#[0-9a-f]{3,8}['"]/i`.

- **Wave 0 RED tests flipped GREEN:**
  - `tests/integration/promptLibraryParity.test.js` — RED → GREEN (2/2 tests pass; deep-equal contract on prompt library JSON ↔ JS).
  - `tests/unit/generateValidatorOrder.test.js` — RED → GREEN (1/1 test passes; validator-before-INSERT order).
  - `tests/integration/generateSvgTemplate.test.js` — TGEN-02 retry-budget stub replaced with 2 real pure-mock tests; both GREEN. TGEN-01 happy-path + TGEN-03 admin gate skip-guarded (run when env present; admin gate verified live via direct curl).

- **D-17 landmine resolved at the validator boundary.** First live generate attempt before fix returned 3 attempts of `XML parse threw: image/svg+xml unimplemented`. Fixed by injecting a `DenoSvgDOMParser` wrapper class at handler level; the upstream `src/services/svgValidator.js` stays unchanged (still calls `parseFromString(svg, 'image/svg+xml')` — the wrapper translates the mime to `text/html`).

- **TGEN-04 build-time gate confirmed.** `npm run build && grep -r ANTHROPIC dist/` exits with code 1 (zero matches in client bundle).

- **6 prompt entries shipped** covering all 6 template types (TGEN-06 SC #1):
  - `menu-cross-vertical-v1`
  - `promo-cross-vertical-v1`
  - `announcement-cross-vertical-v1`
  - `reminder-cross-vertical-v1`
  - `wayfinding-cross-vertical-v1`
  - `health_tip-cross-vertical-v1`

  Each with `vertical: null` (per D-10 — per-vertical specialization deferred to Phase 178). Each system_prompt encodes svgValidator gates (viewBox, no currentColor, sans-serif/serif/monospace, customization anchor, non-white background, ≤200KB) plus per-template-type guidance block.

## Live Verification

### Action dispatch matrix (admin JWT for test@bizscreen.com)

| Action | HTTP | Body |
|--------|------|------|
| `spike` | 200 | `{"ok":true,"anthropic_ok":true,"deno_dom_ok":true,"resvg_wasm_ok":true,"aws_sdk_ok":true,"is_admin":true,"is_super_admin":false}` |
| `generate` | 200 | `{"draftId":"...","status":"pending","warnings":[...],"attempt_count":1}` (7s elapsed) |
| `approve` | 501 | `{"error":"TODO Wave 2 (Plan 03) — approve handler ships in next plan"}` |
| `reject` | 501 | `{"error":"TODO Wave 2 (Plan 03) — reject handler ships in next plan"}` |
| (no auth) | 401 | `{"code":"UNAUTHORIZED_NO_AUTH_HEADER","message":"Missing authorization header"}` |
| (anon JWT) | 403 | `Forbidden` |

### Validator-order verification (defense-in-depth beyond unit test)

```
$ awk '/validateSvg\(svg/ {v=NR} /from\("template_drafts"\)/ {if(!i) i=NR} END {exit (v && i && v < i) ? 0 : 1}' supabase/functions/generate-svg-template/handlers/generate.ts
validator line: 245  | insert line: 268
exit: 0
```

### EF deployed timestamp

```
generate-svg-template | ACTIVE | version 8 | 2026-05-07 00:29:50 (UTC)
```

### Test suite results

```
tests/integration/promptLibraryParity.test.js — 2/2 PASS
tests/unit/generateValidatorOrder.test.js — 1/1 PASS
tests/integration/generateSvgTemplate.test.js — 2/2 mock tests PASS, 2 live tests SKIPPED (env-absent box)
```

## Task Commits

1. **Task 1: Prompt library JSON + JS mirror** — `364cfc91` (feat)
2. **Task 2: Generate handler + DI seam + retry-budget tests** — `eb6b1228` (feat)
3. **Task 3: Frontend templateDraftsService** — `4a888cab` (feat)

**Plan metadata:** [final commit at end of this plan with SUMMARY.md + STATE.md + ROADMAP.md]

## Files Created/Modified

### Created (5)

- `src/services/aiTemplate/promptLibrary.js` — Frontend prompt source. 6 entries, vertical=null. Parity-tested against prompts.json.
- `src/services/aiTemplate/templateDraftsService.js` — Frontend service. 5 named exports mirroring marketplaceService.js error-throw pattern.
- `supabase/functions/generate-svg-template/prompts.json` — Server-side prompt library, deep-equal with promptLibrary.js (Pitfall 8 — JSON over TS for Vitest parity).
- `supabase/functions/generate-svg-template/svgValidator.ts` — Re-export shim. `export { validateSvg } from "../../../src/services/svgValidator.js"`.
- `supabase/functions/generate-svg-template/handlers/generate.ts` — Production handler. ~280 LOC. Pickprompt + tool-use Anthropic call + DI seam + validator-at-ingest + retry-with-feedback + INSERT.

### Modified (3)

- `supabase/functions/generate-svg-template/index.ts` — Wave 0 spike body replaced with action dispatcher. Spike branch preserved for diagnostics. Service-role client only constructed in `action=generate` branch.
- `supabase/functions/generate-svg-template/deno.json` — Added `dompurify` → `npm:dompurify@^3.0.0` to imports map (Deno bundler resolution).
- `tests/integration/generateSvgTemplate.test.js` — TGEN-02 stub replaced with 2 real pure-mock retry-budget tests; TGEN-01 happy-path augmented with W7 SC3 content assertions; TODO comments removed (B2 acceptance).

## Decisions Made

- **DI seam supports both `deps.anthropic` (lowercase) and `deps.Anthropic` (capitalized).** The Plan 02 spec calls for `deps.anthropic`, but the existing TGEN-05 unit test (Wave 0 RED, committed in Plan 01) passes `{ Anthropic: ..., validateSvg: ... }`. Supporting both keeps the Wave 0 RED test intact while satisfying the Plan 02 mock-test contract.

- **Deno-only `npm:` / `jsr:` specifiers loaded via runtime-string dynamic imports** (e.g., `const spec = "jsr:" + "@b-fuze/deno-dom"; await import(spec)`). Vite (Vitest's bundler) statically analyzes string-literal `import()` calls and tries to resolve them; concatenating defeats the static analyzer. The `/* @vite-ignore */` comment is added defensively in case Vite later supports concatenation analysis.

- **`DenoSvgDOMParser` wrapper lives in handlers/generate.ts, not svgValidator.ts.** The upstream `src/services/svgValidator.js` continues to call `parseFromString(svg, 'image/svg+xml')`. Wrapping at the EF handler injection point keeps the validator runtime-agnostic — browser/jsdom paths still work without modification, and the EF gets the deno-dom-compatible `text/html` translation.

- **`dompurify` added to `deno.json` imports map.** The validator passes `DOMPurify: null` to skip Rule 4 server-side, but the top-level `import DOMPurifyDefault from 'dompurify'` in svgValidator.js must still RESOLVE during Deno bundling. Adding the imports map entry is the minimum-surface fix.

- **501 stubs for approve/reject return JSON error body.** Frontend service catches `error` and can display "TODO Wave 2 (Plan 03)" — actionable for the Wave 4 admin queue UI when wired before Plan 03 ships.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] D-17 landmine resurfaced via svgValidator.js's hardcoded `image/svg+xml` mime type**

- **Found during:** Task 2 — first live generate test post-deploy
- **Issue:** First live admin-JWT generate call returned `{ status: "needs_human_review", attempt_count: 3 }`. Inspecting the persisted draft's `metadata.validator_failures`, all 3 attempts had the identical error: `XML parse threw: DOMParser: "image/svg+xml" unimplemented`. Plan 01's spike preserved the D-17 mime fix in `index.ts`'s `deno_dom_ok` probe (which uses `text/html`), but the upstream `src/services/svgValidator.js:57` calls `parseFromString(svgString, 'image/svg+xml')` — and the re-export shim's plan was to inject the deno-dom DOMParser ctor directly.
- **Fix:** Added a `DenoSvgDOMParser` wrapper class inside `resolveDOMParserCtor()` (handlers/generate.ts). The wrapper has a `parseFromString(input, _mime)` method that ignores the requested mime and always parses as `text/html`. Vitest path uses `globalThis.DOMParser` (jsdom — supports `image/svg+xml`), so the wrapper only activates in Deno production.
- **Files modified:** `supabase/functions/generate-svg-template/handlers/generate.ts`
- **Verification:** Redeployed EF (v8); live generate call post-fix returned `status: "pending"`, `attempt_count: 1`, 7s elapsed. Persisted SVG passes all 3 W7 SC3 content assertions.
- **Committed in:** `eb6b1228` (Task 2 commit; the corrected wrapper is the version on disk).

**2. [Rule 3 - Blocking] Deno bundler couldn't resolve top-level `import DOMPurifyDefault from 'dompurify'`**

- **Found during:** Task 2 — first `supabase functions deploy` attempt
- **Issue:** Deploy failed with `Error: failed to create the graph / Caused by: Relative import path "dompurify" not prefixed with / or ./ or ../ and not in import map from "file:///.../src/services/svgValidator.js"`. The validator's top-level dompurify import is fine in browser/Node (npm package available) but Deno needs an explicit imports map entry.
- **Fix:** Added `"dompurify": "npm:dompurify@^3.0.0"` to `deno.json` imports map. The validator runs with `opts.DOMPurify = null` so the `purifier.sanitize(...)` code path is silently skipped (per RESEARCH §Constraint 4), but the import statement still needs a resolvable specifier.
- **Files modified:** `supabase/functions/generate-svg-template/deno.json`
- **Verification:** Redeploy succeeded. Bundle script size grew from 4.572MB → 4.675MB (small bump from added handlers/generate.ts + prompts.json + dompurify).
- **Committed in:** `eb6b1228` (Task 2 commit).

---

**Total deviations:** 2 auto-fixed (1 Rule 1 bug + 1 Rule 3 blocker).
**Impact on plan:** Both auto-fixes were necessary for production correctness. The D-17 bug was a known landmine from Phase 176 — Plan 01 documented the fix in spike code, but the upstream validator's hardcoded mime forces it to be re-applied at the injection point. The dompurify import-map entry is a Deno-bundling-only concern. No scope creep; both changes are inside Task 2's handler implementation.

## Issues Encountered

- **Vitest 4 changed `--reporter=basic` API.** The CLI flag now resolves `basic` as a custom reporter file path and fails. Re-running without the flag gave normal verbose output. Test commands updated to omit `--reporter=basic`.

- **`grep -c` for multi-line patterns counts lines, not occurrences.** The Plan 02 acceptance criterion `grep -c 'id="title"' prompts.json ≥ 6` returns 0 because each prompt's `system_prompt` is a single JSON line containing the literal `\\\"title\\\"`. Verified the substantive contract per-entry via Node JSON parsing (all 6 entries have `id=\"title\"` in their system_prompt). The literal grep with the `\\` form returns 6.

- **Node ESM CLI verify command in plan's `<verify>` failed due to no auto-`.js` extension.** `node -e "import('./src/services/aiTemplate/templateDraftsService.js')"` resolves the inner `import { supabase } from '../../supabase'` via raw Node ESM (no auto-extension), which fails. The substantive contract (5 named exports as functions) was verified via a temporary Vitest test instead.

## TDD Gate Compliance

This plan's `type: execute`. Three Wave 0 RED tests committed in Plan 01 are flipped here:

- ✅ `tests/integration/promptLibraryParity.test.js` (RED in 228a6f2b → GREEN in 364cfc91)
- ✅ `tests/unit/generateValidatorOrder.test.js` (RED in 1b5b8362 → GREEN in eb6b1228)
- ✅ `tests/integration/generateSvgTemplate.test.js` retry-budget block (RED in 36e83d4c → GREEN in eb6b1228)

The TGEN-01 happy-path live integration test stays skip-guarded (no `SUPABASE_SERVICE_ROLE_KEY` in operator's `.env.local` per Plan 01 decision 2); a fresh live cURL probe with admin JWT verified the production path end-to-end (captured in this SUMMARY's "Live Verification" table).

## Known Stubs

- **`supabase/functions/generate-svg-template/index.ts` action=approve and action=reject return HTTP 501 with body `{ error: "TODO Wave 2 (Plan 03) — ... handler ships in next plan" }`.** This is intentional per the plan's `<phase_context>` — Wave 2 / Plan 03 will swap the 501 stubs for real handlers. The frontend service layer (templateDraftsService.js) wires `approveDraft` and `rejectDraft` exports that point at these stubs; calls will throw with the actionable error body.

## Threat Flags

None — Plan 02's surface area (Anthropic API + validator-at-ingest + template_drafts INSERT) was fully enumerated in the plan's `<threat_model>` block. T-177-01..05, T-177-08 dispositions all met:
- T-177-01 (stored prompt injection): admin prompt enters as discrete `messages[{ role: 'user', content }]` — never concatenated into system_prompt.
- T-177-02 (pre-INSERT validation): enforced; locked by Wave 0 unit test.
- T-177-03 (API key in browser bundle): TGEN-04 build-time grep returns 0 matches.
- T-177-04 (admin gate bypass): triple defense intact (frontend allowlist [Wave 4] + EF is_admin/is_super_admin RPC + RLS template_drafts_admin_only).
- T-177-05 (retry storm): MAX_RETRIES = 2 hard cap (3 total attempts); after failure status='needs_human_review' (no further auto-retry).
- T-177-08 (prompt library drift): Vitest deep-equal parity test runs every CI build.

## User Setup Required

None for Plan 02. All server-side env vars (`ANTHROPIC_API_KEY`, `ANTHROPIC_MODEL_ID`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`) are already set on the project (Plan 01 verified).

## Next Phase Readiness

- **Plan 03 (Wave 2 — approve/reject handlers) UNBLOCKED.** Plan 03 builds `handlers/approve.ts` (rasterize + S3 + INSERT svg_templates + UPDATE template_drafts) and `handlers/reject.ts` (UPDATE template_drafts). The action-dispatch shape in `index.ts` is trivially extensible — Plan 03 just swaps the 501 stubs for real handler imports.
- **Plan 04 (Wave 3 — admin queue page) UNBLOCKED on the service-layer side.** `templateDraftsService.js` exports the 5 functions Wave 4's `AdminTemplateQueuePage.jsx` will consume.
- **Plan 06 (Wave 5 — A/B harness) UNBLOCKED on the prompt-library side.** The 6 prompts are version-controlled and parity-tested; the A/B harness will measure first-pass success with vs without the curated system_prompts.
- **Wave 0 RED tests for TGEN-01/02/05 + D-08 are GREEN.** Only `tests/integration/approveDraftPipeline.test.js` (TADM-03) remains RED — Plan 03 flips it.
- **First production AI-generated SVG draft persisted live** (`e816e75a-c9cd-4312-920e-766d66db2d40`). Available in DB for Plan 04 Pending tab to render.

## Self-Check: PASSED

Verified after writing SUMMARY.md:

- ✅ All 5 created files exist on disk (`src/services/aiTemplate/promptLibrary.js`, `src/services/aiTemplate/templateDraftsService.js`, `supabase/functions/generate-svg-template/prompts.json`, `supabase/functions/generate-svg-template/svgValidator.ts`, `supabase/functions/generate-svg-template/handlers/generate.ts`)
- ✅ All 3 modified files have updated content (`index.ts` action dispatch, `deno.json` dompurify entry, `generateSvgTemplate.test.js` mock tests + W7 assertions)
- ✅ All 3 task commits exist in git history (`364cfc91`, `eb6b1228`, `4a888cab`)
- ✅ All 3 RED tests now GREEN (parity, validator-order, retry-budget)
- ✅ Live admin JWT generate call returned status=pending in 7s with W7 SC3 content assertions GREEN
- ✅ Source-order awk check exits 0 (validator before INSERT)
- ✅ TGEN-04 build-time gate: `grep -r ANTHROPIC dist/` returns no matches

---
*Phase: 177-ai-generation-pipeline-admin-queue-ui*
*Completed: 2026-05-07*
