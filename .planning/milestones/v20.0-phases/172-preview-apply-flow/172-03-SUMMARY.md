---
phase: 172-preview-apply-flow
plan: 03
subsystem: services
tags: [services, dispatcher, dompurify, security, xss, rpc, atomicity]
requirements: [TPRV-04, TPRV-05]
dependency_graph:
  requires:
    - "Plan 01 test scaffolds (tests/unit/services/templateApplyService.test.js, tests/integration/preview-apply/rpc-atomicity.test.js)"
    - "Plan 02 RPC migration 168_clone_template_with_customization.sql (applied to gdxizdiltfqeugbsgtpx)"
  provides:
    - "applyTemplate(template, {customizedSvg}) dispatcher — SVG (sanitized) / Polotno / unknown-throw branches"
    - "editorRouteFor(template, sceneId) navigation route builder"
    - "First dompurify consumer in src/ (T-172-01 mitigation point)"
    - "Client-side 500KB SVG payload cap (T-172-04 defense-in-depth)"
  affects:
    - "Plan 04 QuickCustomizePanel — will call applyTemplate after customize edits"
    - "Plan 05 TemplatePreviewModal — Apply CTA invokes applyTemplate + editorRouteFor, handles errors via Alert"
    - "Plan 06 cleanup — marketplaceService.installWithCustomization is replaced and ready for deletion"
tech-stack:
  added:
    - "dompurify@3.3.3 (was in package.json deps, zero prior consumers — Phase 172 Plan 03 is the first)"
  patterns:
    - "Service-per-responsibility: named exports only, {data,error} destructure, errors propagate (mirrors marketplaceService.installTemplateAsScene)"
    - "editor_type dispatcher — single switch in one client file (D-11)"
    - "Client-side sanitization BEFORE network egress (T-172-01), size cap BEFORE sanitization (T-172-04)"
key-files:
  created:
    - path: "src/services/templateApplyService.js"
      lines: 95
      role: "Apply dispatcher + navigation route builder; sole dompurify consumer in src/"
  modified:
    - path: "tests/unit/services/templateApplyService.test.js"
      lines_delta: "+101 / -30"
      role: "Plan 01 scaffolds (7 it.skip) filled; 8th test added for size cap (T-172-04)"
    - path: "tests/integration/preview-apply/rpc-atomicity.test.js"
      lines_delta: "+83 / -19"
      role: "Plan 01 scaffolds (4 it.skip) filled; real templateApplyService exercised with mocked supabase/dompurify"
decisions:
  - "DOMPurify ESM default import — matches package's exported shape and vitest's `default: { sanitize }` mock"
  - "Size cap enforced BEFORE sanitizer runs (avoids pathological CPU cost on oversized payloads)"
  - "Mocked supabase object exposes only `rpc` — any `.from().update()` in service would throw, which serves as a hard atomicity guard in Test 3"
  - "vi.useFakeTimers + vi.advanceTimersByTimeAsync for Test 1 deterministic 500ms simulation (no real waits)"
  - "No vitest.config.js edit — tests/integration/** glob was already present"
metrics:
  duration: "3 min"
  tasks_completed: 3
  tests_passing: "12 (8 unit + 4 integration)"
  commits: 3
  completed_date: "2026-04-21"
---

# Phase 172 Plan 03: templateApplyService Summary

Client-side Apply dispatcher delivered: `src/services/templateApplyService.js` routes by `template.editor_type` to either the new `clone_template_with_customization` RPC (SVG path, with DOMPurify sanitization + 500KB cap) or the existing `clone_template_to_scene` RPC (Polotno path, no third arg), and exposes an `editorRouteFor` helper that builds the post-Apply pageMap URL (`svg-editor?sceneId={id}` per D-15, `scene-editor-{id}` per D-12/D-16). All 12 tests green (8 unit + 4 integration).

## Deliverables

- **`/Users/massimodamico/bizscreen/src/services/templateApplyService.js`** (95 lines) — new file, sole dompurify consumer in src/, named exports only, no try/catch (errors propagate per D-13).
- **Tests now passing: 12** (8 in `tests/unit/services/templateApplyService.test.js`, 4 in `tests/integration/preview-apply/rpc-atomicity.test.js`).
- **vitest.config.js edit: NONE** — the config already included `tests/integration/**/*.{test,spec}.{js,jsx,ts,tsx}` in `test.include` (lines 23–26), so Task 3's optional config patch was not needed.

## Tasks Completed

| Task | Name                                          | Commit    |
| ---- | --------------------------------------------- | --------- |
| 1    | Create templateApplyService.js                | a8bb32c6  |
| 2    | Fill templateApplyService.test.js (8 tests)   | a7144008  |
| 3    | Fill rpc-atomicity.test.js (4 tests)          | 21276d87  |

## Requirements Closed

- **TPRV-04 (dispatcher, routing):** `editor_type` branches covered by Tests 1–4 + 7; `applyTemplate` + `editorRouteFor` exports present.
- **TPRV-05 (race-safe atomic RPC):** single-call assertion in integration Test 3 (`supabase.rpc.mock.calls.length === 1`); no follow-up UPDATE issued; RPC error propagation in Test 2.
- **T-172-01 (SVG XSS mitigation):** DOMPurify invoked with `USE_PROFILES { svg, svgFilters }`; unit Test 5 proves `<script>` gets stripped before the RPC receives the payload.
- **T-172-04 (DoS via oversize payload):** 500KB cap enforced before sanitizer; unit Test 8 asserts `.rejects.toThrow(/500KB/)` and that neither sanitizer nor RPC are invoked on oversize input.

## Test Results

```
tests/unit/services/templateApplyService.test.js   8 passed (4ms)
tests/integration/preview-apply/rpc-atomicity.test.js   4 passed (3ms)
Total: 12 passed / 0 failed / 0 skipped (exit 0)
Run time: ~400ms — well under the 20s latency budget
```

## First-Consumer Claim

`grep -r "dompurify\|DOMPurify" src/` at Plan 03 completion returns **exactly one file**:

```
src/services/templateApplyService.js
```

Phase 172 Plan 03 is therefore confirmed as the first consumer of `dompurify` in `src/`, matching 172-RESEARCH.md Runtime State Inventory.

## Deviations from Plan

None — plan executed exactly as written.

All 3 tasks completed on first attempt with full verification. No Rule 1–3 auto-fixes were needed. No Rule 4 architectural checkpoints were reached. No authentication gates encountered. No in-scope bugs discovered. Task 3's optional vitest.config.js patch was not triggered because the config already had the right globs.

## Notes for Downstream Plans

- **Plan 04 (QuickCustomizePanel):** will consume `applyTemplate(template, { customizedSvg })` directly. Panel is responsible for calling `svgCustomizeService.serializeSvg(...)` to produce the `customizedSvg` string; `applyTemplate` sanitizes + size-checks + dispatches.
- **Plan 05 (TemplatePreviewModal):** Apply CTA must await `applyTemplate` then call `editorRouteFor` to build the navigation target; errors must be caught at the MODAL level (not the service) and rendered as an Alert per D-13 (modal stays open).
- **Plan 06 (cleanup):** `marketplaceService.installWithCustomization` (src/services/marketplaceService.js:209-237) remains dead code — confirmed still present, zero callers in src/. Deletion is owned by Plan 06. The `installTemplateAsScene` helper in the same file is independent and still in use elsewhere (do NOT delete it).

## Threat Flags

No new threat surface introduced outside the plan's `<threat_model>`. The service file's two network-adjacent paths (SVG RPC + Polotno RPC) are exactly the two anticipated in 172-03-PLAN.md, and both threats (T-172-01 Tampering, T-172-04 DoS) are mitigated as planned. Error-message disclosure (T-172-09) is `accept` per the threat model and realized here: errors propagate raw so the modal's Alert (Plan 05) can render the generic "Couldn't apply template" message while logs retain detail.

## Self-Check: PASSED

- `test -f src/services/templateApplyService.js` → FOUND
- Commit `a8bb32c6` (Task 1) → FOUND in git log
- Commit `a7144008` (Task 2) → FOUND in git log
- Commit `21276d87` (Task 3) → FOUND in git log
- `grep -r "dompurify\|DOMPurify" src/` returns exactly 1 file (templateApplyService.js) → FOUND
- `vitest run` exits 0 with 12/12 passing → FOUND
