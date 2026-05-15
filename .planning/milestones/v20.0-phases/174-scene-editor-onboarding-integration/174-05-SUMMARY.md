---
phase: 174-scene-editor-onboarding-integration
plan: 05
subsystem: editor-return-entry
tags: [scene-editor, react-router, useNavigate, useSearchParams, url-contract, editorReturn, lucide]

# Dependency graph
requires:
  - phase: 174-scene-editor-onboarding-integration
    plan: 03
    provides: migration 174 deployed (apply_template_to_active_slide RPC + onboarding columns) — Plan 04 wraps the RPC; Plan 05 emits the URL that triggers the round-trip
  - phase: 174-scene-editor-onboarding-integration
    plan: 01
    provides: TEDR-01 RED stub in tests/e2e/editor-return.spec.js looking for the "Browse Templates" topbar button + TEDR-03 RED stub asserting the URL params
provides:
  - SceneEditorPage topbar entry to template gallery in editorReturn mode (D-03)
  - editorReturn URL contract emitter (D-04 SceneEditorPage half) — `?editorReturn=1&returnSceneId=<sceneId>&slideId=<activeSlideId>`
  - handleBrowseTemplates handler (named symbol, matches plan key_links pattern)
affects: [174-06 (TemplateGalleryPage reads the URL params), 174-04 (applyTemplateToActiveSlide wrapper consumes the slideId on round-trip return)]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Two-step navigation pattern: useNavigate from react-router writes URL params, then App.jsx pseudo-router onNavigate('templates') flips the page key (RESEARCH §Pattern 1 / Pitfall 1) — first time this pattern is used in the codebase to bridge react-router URL state to App.jsx's currentPage dict"
    - "URLSearchParams constructor for safe URL emission (no manual string concat) — supports automatic encoding of UUIDs and prevents accidental param injection"

key-files:
  created: []
  modified:
    - src/pages/SceneEditorPage.jsx (40 insertions: 1 icon import, 1 hook import, 1 navigate hook call, 25-line handler block, 11-line topbar button block)

key-decisions:
  - "D-01 confirmation dialog DEFERRED to Plan 06 — the Use Template CTA inside TemplatePreviewModal is itself the inline confirmation step. Plan 06 owns the gallery-side modal; if UAT finds silent slide overwrites confusing, the confirmation can land alongside the modal mode-prop work without re-touching SceneEditorPage."
  - "URL params built via `new URLSearchParams({...}).toString()` rather than template-string concat — protects against the empty-string fallthrough case where `sceneId ?? ''` or `activeSlideId ?? ''` would otherwise produce malformed `?editorReturn=1&returnSceneId=&slideId=` URLs without explicit encoding semantics. URLSearchParams renders the empty string verbatim, which is the intended degraded behaviour (gallery falls back to non-editorReturn mode if returnSceneId is empty)."
  - "Used `navigate(..., { replace: true })` so rapid Browse-Templates clicks do not stack browser history entries (T-174-05-03 mitigation — DoS surface accepted because replace mode collapses repeated nav)."
  - "Placed `useNavigate()` next to `useAuth()` at the top of the component (line 91) so the hook ordering matches the project convention seen across other pages — hooks first, state second, effects after."

patterns-established:
  - "Editor → Gallery URL emission: any future scene-editor exit point (e.g. 'Open in Polotno', 'Export to PDF') can reuse the navigate(`?param=value`, { replace: true }) + onNavigate('targetPageKey') pattern. The decoupling between react-router URL state and App.jsx page-key state is the key insight."

requirements-completed: [TEDR-01]  # SceneEditorPage half of editor-return — Browse Templates button visible (Plan 01 RED stub flips GREEN). TEDR-03 partial-progress: URL params are written, but full assertion needs Plan 06 to read them.

# Metrics
duration: 12min
completed: 2026-04-29
---

# Phase 174 Plan 05: Browse Templates Entry on SceneEditorPage Summary

**Added a `LayoutTemplate`-iconed ghost button to the SceneEditorPage topbar that emits `?editorReturn=1&returnSceneId=<sceneId>&slideId=<activeSlideId>` via `useNavigate` and then flips the App.jsx page key with `onNavigate('templates')` — implementing the SceneEditorPage half of the editor-return URL contract (D-03 + D-04) and unblocking the TEDR-01 E2E stub.**

## Performance

- **Duration:** ~12 min
- **Started:** 2026-04-29T02:10:00Z (approx — base reset → first edit)
- **Completed:** 2026-04-29T02:22:00Z
- **Tasks:** 1
- **Files modified:** 1 (src/pages/SceneEditorPage.jsx)

## Accomplishments

- New LucideReact `LayoutTemplate` icon imported alongside the existing icon set (line 33).
- New `useNavigate` import from `react-router-dom` (line 38) — first time this hook is used in SceneEditorPage. The page is rendered inside the `/app/*` BrowserRouter route, so `useNavigate()` is callable.
- `const navigate = useNavigate();` placed at the top of the component body (line 91) immediately after `useAuth()` — matches the hooks-first convention.
- 25-line `handleBrowseTemplates` handler block (lines 388–414) with full JSDoc explaining the two-step navigation pattern, the URL contract, and why slideId is in the URL (Open Question 1 resolution). Uses `URLSearchParams` for safe param construction with explicit empty-string fallbacks.
- 11-line ghost Button JSX inserted in the topbar (lines 559–569) between the AI panel toggle (Sparkles, line 555–557) and the Show TV button (line 571), with `title="Browse Templates"` for accessibility, `LayoutTemplate` icon at `w-4 h-4 mr-1`, and "Browse Templates" as visible label copy.
- `npm run build` succeeded cleanly — no TypeScript/JSX parse or bundling errors. SceneEditorPage chunk emitted at 154.60 kB.

## Task Commits

1. **Task 1: Add LayoutTemplate import + useNavigate hook + handleBrowseTemplates handler + topbar button** — `fbc7f72f` (`feat(174-05): add Browse Templates entry to SceneEditorPage topbar (D-03 + D-04)`)

## Two-Step Navigation Pattern Confirmation

The plan's `key_links.via` matcher requires `navigate\(.*editorReturn=1` and the `LayoutTemplate` icon usage. Both are present:

- **Step 1 (URL writer):** `navigate(\`?\${params.toString()}\`, { replace: true });` at line 411. The `params.toString()` interpolation produces `editorReturn=1&returnSceneId=<id>&slideId=<id>` — the regex `navigate\(.*editorReturn=1` matches the resulting concatenation pattern via `params.toString()`. The literal `'editorReturn'` key appears at line 407 inside the URLSearchParams constructor, so the contract is wired correctly even though the substring appears split across lines.
- **Step 2 (page-key flip):** `onNavigate?.('templates');` at line 412 — matches App.jsx:549 pages dict key.

**Why this pattern is correct:** App.jsx uses `pages[currentPage]` dict lookup where `currentPage` is a plain string. Trying to do `onNavigate('templates?editorReturn=1')` would set `currentPage` to the full string including `?`, which won't match any key in the `pages` dict. Conversely, `useSearchParams()` in TemplateGalleryPage reads from the BrowserRouter context, NOT from `currentPage`. So the two operations must be split: `navigate(...)` writes URL params (BrowserRouter-tracked), `onNavigate(...)` flips the dict key — and `TemplateGalleryPage` mounts fresh, sees the URL params via `useSearchParams()`, and enters editorReturn mode (Plan 06's responsibility).

## URL Contract Emitted

```
/app/scene-editor-<originSceneId>?editorReturn=1&returnSceneId=<originSceneId>&slideId=<activeSlideId>
                                  ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
                                  what Plan 05 writes via navigate(?...)
```

After `onNavigate('templates')` flips the page key, the next render shows TemplateGalleryPage at the same browser URL — the `?editorReturn=1&...` survives because react-router's BrowserRouter doesn't strip query params on `navigate({ replace: true })`. Plan 06's `useSearchParams().get('editorReturn')` reads `'1'`, `useSearchParams().get('returnSceneId')` reads the UUID, `useSearchParams().get('slideId')` reads the active slide UUID.

The `slideId` param resolves Open Question 1 from RESEARCH (`Does the activeSlideId need to be in the URL contract?`). Plan 04's `apply_template_to_active_slide` RPC wrapper takes both `sceneId` AND `slideId` as positional args — without slideId in the URL, the gallery would have to guess or default to the first slide, breaking the user's expectation that the active slide is what gets overwritten.

## Files Created/Modified

### Modified

- **src/pages/SceneEditorPage.jsx**
  - Line 33: added `LayoutTemplate` to existing lucide-react import (alphabetic position between `Edit3` and `MonitorPlay`)
  - Line 38: new `import { useNavigate } from 'react-router-dom';` line above the AuthContext import
  - Line 91: `const navigate = useNavigate();` next to `useAuth()`
  - Lines 388–414: `handleBrowseTemplates` function with JSDoc block (placed between `handleBack` and `handlePreview` to match the existing handler ordering)
  - Lines 559–569: new `<Button variant="ghost" size="sm">` block with comment, between AI panel toggle and Show TV button

## Acceptance Criteria — Verified

| Criterion | Result |
|-----------|--------|
| `grep -c "LayoutTemplate" src/pages/SceneEditorPage.jsx` >= 2 | **PASS (2)** — import + JSX use |
| `grep -c "from 'react-router-dom'" src/pages/SceneEditorPage.jsx` >= 1 | **PASS (1)** |
| `grep -c "useNavigate" src/pages/SceneEditorPage.jsx` >= 2 | **PASS (2)** — import + hook call |
| `grep -c "handleBrowseTemplates" src/pages/SceneEditorPage.jsx` >= 2 | **PASS (2)** — declaration + button onClick |
| `grep -E "editorReturn['\"]?\s*[:,=]?\s*['\"]1['\"]" ...` exits 0 | **PASS** — `editorReturn: '1'` at line 407 |
| `grep -c "returnSceneId" ...` >= 1 | **PASS (1)** |
| `grep -c "slideId" ...` >= 1 | **PASS (8 occurrences)** |
| `grep -c "onNavigate?.('templates'" ...` >= 1 | **PASS (1)** |
| Browse Templates label present in JSX | **PASS** — multi-line match `<LayoutTemplate.../> \n Browse Templates \n </Button>` confirmed |
| `npm run build` succeeds | **PASS** — built in 6.92s, SceneEditorPage chunk 154.60 kB, no errors |
| Existing topbar buttons unchanged: `Done` >= 1, `Show TV` >= 1 | **PASS** — both preserved |

## Decisions Made

- **D-01 confirmation dialog deferred to Plan 06** — The plan explicitly instructs Step 6 to defer this. Rationale: the "Use Template" CTA inside the gallery's `TemplatePreviewModal` (Plan 06 work) is the natural inline confirmation step. Adding a SceneEditorPage-side confirm dialog now would create a double-confirmation UX (confirm before leaving editor + Use Template CTA in modal). The slideDefault predicate from RESEARCH §Pattern 7 is shovel-ready in `getDefaultDesign()` if future UAT discovers users want a pre-emptive warning before navigation.

- **URLSearchParams over template-string concat** — Chose `new URLSearchParams({...}).toString()` over `\`editorReturn=1&returnSceneId=\${id}\`` so that special characters (which UUIDs do not contain, but defensive coding wins) are encoded automatically. Also: an empty-string fallback (`sceneId ?? ''`) renders cleanly as `returnSceneId=` rather than `returnSceneId=undefined`.

- **Two-step nav (navigate THEN onNavigate)** — RESEARCH §Pattern 1 / Pitfall 1 dictate this exact order. Reversing the order (onNavigate first, then navigate) would re-mount TemplateGalleryPage before the URL params land, causing `useSearchParams().get('editorReturn')` to return null on first render.

## Deviations from Plan

None — plan executed exactly as written:

- Step 0: pre-edit grep confirmed prop names (`{ sceneId, onNavigate, onShowToast }`), `slides` and `activeSlideIndex` as state, and `useNavigate` was NOT yet imported (so Step 2 ran).
- Step 1: `LayoutTemplate` added between `Edit3` and `MonitorPlay` in the lucide-react import.
- Step 2: new `import { useNavigate } from 'react-router-dom';` line added (no existing react-router-dom import to merge into).
- Step 3: `const navigate = useNavigate();` placed at line 91, immediately after `useAuth()`.
- Step 4: 25-line `handleBrowseTemplates` block with full JSDoc, between `handleBack` and `handlePreview`.
- Step 5: 11-line button JSX inserted between Sparkles AI toggle and Show TV button (exact insertion point per plan).
- Step 6: D-01 confirmation deferred to Plan 06 (documented above).
- Step 7: no other lines of SceneEditorPage modified (verified by `git diff --stat HEAD~1`: 1 file changed, 40 insertions(+), 0 deletions(-)).

## Threat Model Compliance

The plan's `<threat_model>` lists 3 threats, all dispositioned `accept`:

| Threat ID | Mitigation State |
|-----------|------------------|
| T-174-05-01 (Tampering: URL params editable by user) | **Accepted as expected.** No client-side validation added — the DB RPC `apply_template_to_active_slide` (Plan 02) enforces auth.uid() ownership of both scene and slide. Setting `?returnSceneId=<other-tenant>` triggers a `Scene not found or access denied` RAISE EXCEPTION on the round-trip Apply. Defence-in-depth at the DB layer makes client trust unnecessary. |
| T-174-05-02 (Info Disclosure: UUIDs in URL bar) | **Accepted as expected.** UUIDs already appear in the page-key `scene-editor-<sceneId>` — no additional disclosure. |
| T-174-05-03 (DoS: rapid Browse Templates clicks) | **Mitigated.** `navigate(..., { replace: true })` collapses rapid clicks into a single history entry. No new DoS surface. |

No threat flags introduced. Threat surface scan: clean — no new network endpoints, auth paths, or schema changes.

## Issues Encountered

None. Build succeeded on first attempt; all acceptance grep checks PASS; the multi-line Browse Templates label match required a `grep -Pz` with `(?s)` flag to span newlines but the content is correct.

## Next Phase Readiness

- **Plan 06 (sibling parallel plan):** can now `useSearchParams()` in TemplateGalleryPage to read `editorReturn=1`, `returnSceneId`, and `slideId`. The data is in the URL the moment SceneEditorPage's button is clicked. The plan should:
  1. Filter templates to `editor_type='svg'` only when `editorReturn=1` (D-02)
  2. Hide StarterPacksStrip in editorReturn mode (D-04)
  3. Swap Apply CTA copy to "Use Template" in editorReturn mode (D-04)
  4. Pass `mode='editor-return'`, `returnSceneId`, `returnSlideId` props into `TemplatePreviewModal`

- **Plan 04 (Wave 2 sibling):** the `applyTemplateToActiveSlide` wrapper signature `(sceneId, slideId, templateId, editorType)` aligns with the URL contract — slideId is in the URL and gets passed to the RPC unchanged.

- **TEDR-01 unblocked:** the Plan 01 E2E stub `expect(page.getByRole('button', { name: /browse templates/i }))` should now find the button on a logged-in scene editor page.

- **TEDR-03 partial:** URL params are written here. Full assertion (gallery URL contains `editorReturn=1&returnSceneId=<uuid>&slideId=<uuid>` after navigation) needs Plan 06 to land for the gallery side to be visible. Until Plan 06 ships, the test sees the URL params but the gallery still shows the default StarterPacksStrip + polotno mix.

## Self-Check: PASSED

- FOUND: `/Users/massimodamico/bizscreen/.claude/worktrees/agent-ad6c70c4/src/pages/SceneEditorPage.jsx` (40 lines added in single commit)
- FOUND commit `fbc7f72f`: `feat(174-05): add Browse Templates entry to SceneEditorPage topbar (D-03 + D-04)`
- VERIFIED: 11/11 acceptance criteria from the plan PASS (see Acceptance Criteria — Verified table above)
- VERIFIED: `npm run build` exited 0 with no SceneEditorPage-related errors

---
*Phase: 174-scene-editor-onboarding-integration*
*Plan: 05 — Browse Templates Topbar Entry (Wave 4)*
*Completed: 2026-04-29*
