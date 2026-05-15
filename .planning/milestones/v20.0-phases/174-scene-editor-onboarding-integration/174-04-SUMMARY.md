---
phase: 174-scene-editor-onboarding-integration
plan: 04
subsystem: client-services + ui-component
tags: [rpc-wrapper, modal-forking, editor-return, d-06, d-18-anchor, regression-clean]
wave: 4

# Dependency graph
dependency_graph:
  requires:
    - "Plan 174-01 — RED unit tests in tests/unit/services/marketplaceService.test.js (2 cases) and integration tests in tests/integration/apply-template-to-slide.test.js (4 cases) flipped GREEN by this plan"
    - "Plan 174-02 — apply_template_to_active_slide(p_scene_id uuid, p_slide_id uuid, p_template_id uuid, p_editor_type text) RETURNS uuid signature defined in migration 174"
    - "Plan 174-03 — RPC live on Supabase (verified via 4/6 smoke SELECTs)"
    - "Phase 173 D-04 — applyStarterPack at marketplaceService.js:632 (blueprint shape mirrored verbatim)"
    - "Phase 172 — existing TemplatePreviewModal handleApply (lines 108-124) — preserved as the new-scene path"
  provides:
    - "marketplaceService.applyTemplateToActiveSlide(sceneId, slideId, templateId, editorType) thin RPC wrapper — exported"
    - "TemplatePreviewModal mode prop (default 'new-scene', alt 'editor-return') with returnSceneId / returnSlideId companions"
    - "Apply button data-tour=\"apply-cta\" anchor — Plan 09 useGalleryTour will target this"
    - "CTA copy swap: 'Use Template' (editor-return) vs 'Apply to new scene' (default)"
  affects:
    - "Plan 174-05 — SceneEditorPage 'Browse Templates' button can rely on mode prop reaching the modal"
    - "Plan 174-06 — TemplateGalleryPage URL-param plumbing has a working component to pass mode + returnSceneId/Slide to"
    - "Plan 174-09 — driver.js tour step 4 has its anchor in place (apply-cta)"

# Tech tracking
tech_stack:
  added: []  # Both pieces are pure JS edits; no new deps
  patterns:
    - "Mode-fork inside an existing async handler — preserves the legacy path verbatim while adding a new branch (regression-zero pattern)"
    - "Defense-in-depth at the client layer — explicit !returnSceneId || !returnSlideId guard before RPC call (avoids opaque server error for a missing prop)"

key_files:
  created: []  # No new files in this plan
  modified:
    - "src/services/marketplaceService.js — appended applyTemplateToActiveSlide export (30 lines: doc-block + body)"
    - "src/components/template-gallery/TemplatePreviewModal.jsx — 5 edits: import, props signature, handleApply fork, button copy, data-tour anchor"

decisions:
  - "Inline error message uses different copy by mode — generic 'Couldn't apply template…' for new-scene (Phase 172 verbatim) vs 'Couldn't apply template to this slide. Tap Use Template to try again.' for editor-return (slide-specific so user understands what was being mutated)"
  - "data-tour anchor placed on the Apply button itself rather than on a wrapper div — driver.js can highlight the actual interactive element this way, and future tour-replay modes won't have a stale anchor if the button is re-rendered"
  - "Preserved Pitfall-2 mitigation (setApplying(true) BEFORE awaiting) in both branches — the pattern is identical so both paths are race-free"
  - "Used Phase 173 applyStarterPack as the wrapper blueprint verbatim — same throw-on-error shape, same {p_X} key naming, same single-await structure. Eight different reviewers should find it impossible to distinguish the two functions at a glance"

requirements_completed: [TEDR-02]

# Metrics
metrics:
  duration_seconds: 240
  duration_human: "4 minutes"
  tasks_completed: 2
  files_changed: 2
  lines_added: 65
  lines_removed: 5
  completed_date: 2026-04-28
---

# Phase 174 Plan 04: applyTemplateToActiveSlide Wrapper + TemplatePreviewModal Mode Fork Summary

**Bridges Wave 3 (RPC live on Supabase) to Wave 5 (onboarding wizard) by adding the lowest-risk client-side change first: a 30-line thin RPC wrapper plus a mode-prop forked handler in TemplatePreviewModal — flipping 6 RED tests to GREEN with zero regression on the 14 existing modal/QuickCustomizePanel unit tests.**

## Performance

- **Duration:** ~4 min
- **Started:** 2026-04-28T22:19:00Z
- **Completed:** 2026-04-28T22:23:00Z
- **Tasks:** 2
- **Files modified:** 2

## Output

| Task | What | Commit | Files |
|------|------|--------|-------|
| 1 | Add `applyTemplateToActiveSlide` RPC wrapper to marketplaceService.js | `0a1b7f99` | `src/services/marketplaceService.js` (+30 lines) |
| 2 | Fork `TemplatePreviewModal.handleApply` on `mode` prop | `f4fbeb5d` | `src/components/template-gallery/TemplatePreviewModal.jsx` (+35 / −5 lines) |

## Task 1 — Wrapper Export

**Append point:** `src/services/marketplaceService.js` immediately after `applyStarterPack` (Phase 173 D-07 wrapper at line 632–636).

**Shape (30 lines including JSDoc):**

```javascript
export async function applyTemplateToActiveSlide(sceneId, slideId, templateId, editorType) {
  const { data, error } = await supabase.rpc('apply_template_to_active_slide', {
    p_scene_id:    sceneId,
    p_slide_id:    slideId,
    p_template_id: templateId,
    p_editor_type: editorType,
  });
  if (error) throw error;
  return data;
}
```

**RPC signature match:** Plan 03 confirmed live signature is `apply_template_to_active_slide(p_scene_id uuid, p_slide_id uuid, p_template_id uuid, p_editor_type text) RETURNS uuid`. The wrapper sends exactly these 4 keys — verified by both unit and integration tests.

## Task 2 — TemplatePreviewModal Mode Fork

Five edits to `src/components/template-gallery/TemplatePreviewModal.jsx`:

1. **Import** (top of file, alongside existing `applyTemplate` import):
   ```javascript
   import { applyTemplateToActiveSlide } from '../../services/marketplaceService';
   ```

2. **Props signature** — added 3 new props with safe defaults:
   ```javascript
   mode = 'new-scene',      // 'new-scene' | 'editor-return'
   returnSceneId = null,    // required when mode === 'editor-return'
   returnSlideId = null,    // required when mode === 'editor-return'
   ```

3. **handleApply fork** — added `if (mode === 'editor-return') { … } else { … }` branch. Editor-return path:
   - Validates `returnSceneId` and `returnSlideId` (defense-in-depth — throws a client-side Error before reaching the RPC if either is missing)
   - Calls `applyTemplateToActiveSlide(returnSceneId, returnSlideId, current.id, current.editor_type)`
   - Navigates to `scene-editor-${returnSceneId}` (matches App.jsx page-key pattern from D-04)
   - Mode-specific error message: "Couldn't apply template to this slide. Tap Use Template to try again."
   - The new-scene path is **byte-equivalent** in behaviour to before — same `applyTemplate` call, same `editorRouteFor` navigation, same error copy.

4. **CTA copy swap** — Apply button text now reads:
   - `'Applying…'` while in-flight (unchanged for both modes)
   - `'Use Template'` when `mode === 'editor-return'`
   - `'Apply to new scene'` when `mode === 'new-scene'` (default — Phase 172 verbatim)

5. **`data-tour="apply-cta"` anchor** — added directly on the `<Button>` element (D-18 step 4 — Plan 09's tour will target it).

## Plan 01 RED → GREEN Flips

Six previously-RED test cases now pass:

### Unit tests (`tests/unit/services/marketplaceService.test.js`)

| Test name | RED → GREEN |
|-----------|-------------|
| `applyTemplateToActiveSlide (Phase 174 D-06) > calls apply_template_to_active_slide RPC with correct args (D-05 contract)` | ✓ GREEN |
| `applyTemplateToActiveSlide (Phase 174 D-06) > throws on error` | ✓ GREEN |

### Integration tests (`tests/integration/apply-template-to-slide.test.js`)

| Test name | RED → GREEN |
|-----------|-------------|
| `apply_template_to_active_slide atomicity (Phase 174 TEDR-02) > resolves with slide UUID on success (D-05)` | ✓ GREEN |
| `apply_template_to_active_slide atomicity (Phase 174 TEDR-02) > throws on RPC error (atomicity contract)` | ✓ GREEN |
| `apply_template_to_active_slide atomicity (Phase 174 TEDR-02) > zero follow-up calls — single RPC round-trip proves atomicity` | ✓ GREEN |
| `apply_template_to_active_slide atomicity (Phase 174 TEDR-02) > polotno editor_type is rejected server-side (D-02)` | ✓ GREEN |

### Test counts

```
$ npx vitest run tests/unit/services/marketplaceService.test.js tests/integration/apply-template-to-slide.test.js
Test Files  2 passed (2)
     Tests  41 passed (41)    # was 6 RED + 35 GREEN before; now all 41 GREEN
```

### Regression check (existing component tests)

```
$ npx vitest run tests/unit/components/template-gallery/
Test Files  2 passed (2)
     Tests  14 passed (14)    # zero regressions
```

### Build check

```
$ npm run build
✓ built in 6.65s
```

## Acceptance Criteria

### Task 1 (5/5 PASS)

| Criterion | Required | Actual |
|-----------|----------|--------|
| `grep -c "export async function applyTemplateToActiveSlide" src/services/marketplaceService.js` | 1 | **1** ✓ |
| `grep -c "supabase.rpc('apply_template_to_active_slide'" src/services/marketplaceService.js` | 1 | **1** ✓ |
| Plan 01 unit-test cases for `applyTemplateToActiveSlide` PASSING | ≥2 | **2** ✓ |
| Plan 01 integration-test cases for the wrapper PASSING | ≥4 | **4** ✓ |
| Regression: `grep -c "export async function applyStarterPack"` | 1 | **1** ✓ |

### Task 2 (10/10 PASS)

| Criterion | Required | Actual |
|-----------|----------|--------|
| `grep -c "import.*applyTemplateToActiveSlide" TemplatePreviewModal.jsx` | 1 | **1** ✓ |
| `grep -c "mode = 'new-scene'" TemplatePreviewModal.jsx` | 1 | **1** ✓ |
| `grep -c "returnSceneId = null" TemplatePreviewModal.jsx` | 1 | **1** ✓ |
| `grep -c "returnSlideId = null" TemplatePreviewModal.jsx` | 1 | **1** ✓ |
| `grep -c "if (mode === 'editor-return')" TemplatePreviewModal.jsx` | 1 | **1** ✓ |
| Return navigation matches App.jsx page-key (`scene-editor-${returnSceneId}`) | present | **present** ✓ |
| `grep -c 'data-tour="apply-cta"' TemplatePreviewModal.jsx` | 1 | **1** ✓ |
| `grep -c "Use Template" TemplatePreviewModal.jsx` | ≥1 | **2** ✓ |
| Phase 172 `applyTemplate` import preserved | 1 | **1** ✓ |
| `npm run build` succeeds | yes | **yes** ✓ |

## Decisions Made

- **Inline error copy varies by mode** — `'Couldn't apply template to this slide…'` (editor-return, slide-specific) vs `'Couldn't apply template…'` (new-scene, Phase 172 verbatim). Reasoning: in editor-return the user is mutating an active slide they just left; in new-scene they're creating something new. The wording should match the user's mental model.
- **`data-tour` on the Button itself, not a wrapper** — driver.js highlights the literal interactive element. If a future change re-orders the surrounding JSX, the anchor stays attached to the right node.
- **Defense-in-depth client guard for missing `returnSceneId`/`returnSlideId`** — instead of letting the RPC error with a potentially-confusing "not authenticated" or "Scene not found" message, the modal throws a precise client-side Error (`'editor-return mode requires returnSceneId and returnSlideId props'`) caught by the same try/catch and surfaced as the mode-specific error copy. This is a Rule-2 correctness add — not in the original plan but consistent with PATTERNS.md threat model T-174-04-02 (no leakage of ownership signals).
- **applyStarterPack as the wrapper blueprint** — same throw-on-error shape, same `{ p_X: ... }` key naming. The two functions are visually indistinguishable at the type/shape level, which makes future code-grep refactors trivial.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 — Critical correctness] Added `returnSceneId`/`returnSlideId` null-guard inside the editor-return branch**

- **Found during:** Task 2 — drafting the handleApply fork
- **Issue:** Plan didn't explicitly require a client-side guard. If a parent component forgot to pass returnSceneId/returnSlideId in editor-return mode, the RPC would receive `null` for both, fail server-side with a generic "Scene not found or access denied" error (per the RPC body), and the user would see a misleading "Couldn't apply template…" message. The actual error is a programming bug at the integration layer (Plan 06's job to wire), not a permissions issue.
- **Fix:** Added `if (!returnSceneId || !returnSlideId) throw new Error('editor-return mode requires returnSceneId and returnSlideId props');` before the RPC call. This surfaces the bug to the developer console with a clear message, while still routing through the same try/catch (so the user sees the same generic "Couldn't apply template…" Alert — no information disclosure).
- **Files modified:** `src/components/template-gallery/TemplatePreviewModal.jsx`
- **Commit:** `f4fbeb5d` (rolled into Task 2)
- **Threat-model alignment:** Reinforces T-174-04-02 mitigation (information disclosure — generic UI message; raw err goes to console.error only).

No other deviations — both tasks executed exactly as the plan's `<action>` steps specified.

## Authentication Gates

None — no auth steps required for this plan. All work was local file editing + local vitest runs + local npm build.

## Threat Model Compliance

All 3 threats from `<threat_model>` are honored:

| Threat | Disposition | Implementation |
|--------|-------------|----------------|
| T-174-04-01 (Tampering — wrapper pass-through) | accept | Wrapper has zero client-side validation — all real security checks live in the RPC body (Plan 02 mitigations T-174-02-01..05) |
| T-174-04-02 (Info Disclosure — error leakage) | mitigate | catch block uses generic UI string; raw `err` goes to console.error only. Mode-specific copy reveals NO ownership signals (no "you don't own this slide" leak) |
| T-174-04-03 (Tampering — mode prop tampering by parent) | accept | mode is set by TemplateGalleryPage from URL param; attacker can already write `?editorReturn=1`. RPC's ownership check rejects any sceneId/slideId they don't own |

## Downstream Unblock

- **Plan 174-05** — SceneEditorPage "Browse Templates" button now has a working modal target. The plan can navigate to the gallery, set URL params, and the modal will route Apply through the correct path on click.
- **Plan 174-06** — TemplateGalleryPage URL-param wiring has a typed contract: pass `mode={isEditorReturn ? 'editor-return' : 'new-scene'}` plus `returnSceneId={searchParams.get('returnSceneId')}` and `returnSlideId={searchParams.get('slideId')}` to TemplatePreviewModal.
- **Plan 174-09** — driver.js tour step 4 has its anchor (`[data-tour="apply-cta"]`) in place. The hook can target the modal's Apply button directly.

## Self-Check: PASSED

**File existence:**
- ✓ FOUND: `src/services/marketplaceService.js` (modified — applyTemplateToActiveSlide export at end of starter-packs section)
- ✓ FOUND: `src/components/template-gallery/TemplatePreviewModal.jsx` (modified — 5 edits documented above)

**Commit existence:**
- ✓ FOUND `0a1b7f99`: `feat(174-04): add applyTemplateToActiveSlide RPC wrapper`
- ✓ FOUND `f4fbeb5d`: `feat(174-04): fork TemplatePreviewModal Apply handler with mode prop`

**Test verification:**
- ✓ Plan 01 unit tests for the wrapper (2/2) PASSING
- ✓ Plan 01 integration tests for the wrapper (4/4) PASSING
- ✓ Existing TemplatePreviewModal/QuickCustomizePanel unit tests (14/14) STILL PASSING (zero regression)
- ✓ `npm run build` succeeds

**Plan acceptance criteria:**
- ✓ All 5 Task-1 criteria met
- ✓ All 10 Task-2 criteria met

---

*Phase: 174-scene-editor-onboarding-integration*
*Plan: 04 (Wave 4)*
*Completed: 2026-04-28*
*Next: Plans 174-05 + 174-06 (Wave 4 siblings) wire the SceneEditorPage button + the TemplateGalleryPage URL-param plumbing that pass mode/returnSceneId/returnSlideId into the modal landed by this plan.*
