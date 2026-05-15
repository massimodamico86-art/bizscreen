---
phase: 172-preview-apply-flow
plan: 05
subsystem: ui
tags: [ui, modal, split-view, keyboard, polotno, security, xss, tprv-01, tprv-02, tprv-03, tprv-04]

# Dependency graph
requires:
  - phase: 172-preview-apply-flow
    plan: 01
    provides: "tests/unit/components/template-gallery/TemplatePreviewModal.test.jsx scaffold with 8 it.skip stubs"
  - phase: 172-preview-apply-flow
    plan: 03
    provides: "src/services/templateApplyService.js — applyTemplate + editorRouteFor (DOMPurify-first consumer)"
  - phase: 172-preview-apply-flow
    plan: 04
    provides: "src/components/template-gallery/QuickCustomizePanel.jsx — SVG customize panel with onChange(serializedSvg) emit"
provides:
  - "src/components/template-gallery/TemplatePreviewModal.jsx — full-screen split-view modal shell"
  - "Atomic Apply pipeline wired: applyTemplate(current, {customizedSvg}) → editorRouteFor(current, sceneId) → onNavigate + onClose"
  - "Prev/next template nav: arrow buttons + ArrowLeft/ArrowRight keyboard with INPUT/TEXTAREA guard"
  - "Polotno variant: PolotnoInfoBlock 'Advanced customization' copy when editor_type='polotno'"
  - "Defense-in-depth T-172-01 mitigation: DOMPurify.sanitize before dangerouslySetInnerHTML at the render site"
  - "Snapshot semantics (Pitfall 7): templates array captured once on open edge"
  - "Inline Alert (D-13) for Apply failure — modal stays open; customize state preserved"
  - "All 8 Plan-01 scaffolded TemplatePreviewModal unit tests filled and passing green"
affects: [172-06]

# Tech tracking
tech-stack:
  added: []  # DOMPurify was added by Plan 03; Plan 05 is the second consumer.
  patterns:
    - "Modal shell composition: design-system Modal with size='full', closeOnOverlay={false}, closeOnEscape, showCloseButton={false} + custom toolbar"
    - "Snapshot-on-open idiom: useRef captures templates[] on the open transition and null-resets on close; subsequent parent renders don't shift the index"
    - "Keyboard nav with focus guard: window keydown listener checks document.activeElement.tagName and bails on INPUT/TEXTAREA"
    - "loading-before-await for async CTAs: setApplying(true) BEFORE the await so Button.loading disables the click before the promise resolves (Pitfall 2)"
    - "useMemo-wrapped DOMPurify.sanitize keyed on current+customizedSvg so the sanitizer only runs when the preview source actually changes"
    - "Modal-local state (currentIndex / customizedSvg / applying / error) reset via useEffect on [open, initialIndex] — parent-controlled open/initialIndex drive a fresh session each time"

key-files:
  created:
    - "/Users/massimodamico/bizscreen/src/components/template-gallery/TemplatePreviewModal.jsx"
  modified:
    - "/Users/massimodamico/bizscreen/tests/unit/components/template-gallery/TemplatePreviewModal.test.jsx"

key-decisions:
  - "Used design-system Modal primitive with createPortal — did NOT copy LayoutPreviewModal's legacy 'fixed inset-0 z-50' shell (it would conflict with Modal's own portal + backdrop + focus-trap)"
  - "Badge variant='default' for the 'N of M' counter — Badge.jsx has NO 'neutral' variant (Focus Area 9 verified; UI-SPEC's reference to 'neutral' was corrected in RESEARCH)"
  - "role='img' + aria-label on the SVG preview wrapper — gives the preview an accessible name without exposing internal SVG DOM, and gives tests a stable locator ('Preview of <name>') that matches any svg_content payload"
  - "Arrow buttons wrapped in <> fragment and only rendered when total > 1 — avoids dead nav chrome on the single-template edge case"
  - "Applied CSS transition-opacity duration-150 + key={current.id} on both preview wrappers — satisfies UI-SPEC animation contract without pulling in framer-motion for a cross-fade (Modal already owns enter/exit animation)"
  - "Defense-in-depth DOMPurify at the render site even though Plan 03 sanitizes pre-RPC — T-172-01 explicitly lists the render-site mitigation as separate from the network-egress one; they protect against different threat vectors (raw template SVG vs. customized SVG)"
  - "Silenced expected console.error in the Apply-rejection test via vi.spyOn + mockRestore — the failure path intentionally logs, and the test shouldn't pollute the vitest output"
  - "Used input[type='text'] querySelector (NOT a text-input-count that would include the hidden color + file inputs) as the Pitfall-3 remount proxy in Test 6 — rock-solid and doesn't couple to aria labels"

patterns-established:
  - "TemplatePreviewModal is the first full-screen composition of design-system Modal with split-view grid; any future multi-pane modal should copy this layout skeleton (toolbar + grid-cols-[65fr_35fr] + overflow-hidden min-h-0)"
  - "The snapshot-on-open ref pattern is now the canonical idiom in this codebase for any modal that takes an array prop it needs to freeze against parent state churn"
  - "applyTemplate + editorRouteFor composed with onNavigate + onClose is the canonical Apply flow — Plan 06 should use the SAME shape for any other Apply button in the app"

requirements-completed: [TPRV-01, TPRV-02, TPRV-03, TPRV-04]
# Notes:
#   - TPRV-01 (full-screen preview + prev/next): covered by Tests 1, 2, 3.
#   - TPRV-02 (integrated QuickCustomizePanel): covered by Test 6 + Plan 04's six green panel tests.
#   - TPRV-03 (live updates via dangerouslySetInnerHTML): covered by Test 8.
#   - TPRV-04 (one-click Apply pipeline): covered by Tests 4, 5 + Plan 03's dispatcher tests.

# Metrics
duration: ~8min
completed: 2026-04-21
---

# Phase 172 Plan 05: TemplatePreviewModal Summary

**Full-screen split-view modal with DOMPurify-sanitized SVG preview, QuickCustomizePanel/PolotnoInfoBlock right pane, keyboard nav, snapshot semantics, and loading-first Apply — 8/8 unit tests green, 14/14 combined template-gallery suite.**

## Performance

- **Duration:** ~8 min
- **Tasks:** 2/2
- **Files created:** 1
- **Files modified:** 1
- **Commits:** 2 (one per task)

## Accomplishments

### Task 1 — TemplatePreviewModal.jsx (commit `477ff50f`)

- Default-exported React function component at `src/components/template-gallery/TemplatePreviewModal.jsx` (314 lines).
- **Modal shell:** Uses design-system `Modal` with `size="full"`, `closeOnOverlay={false}`, `closeOnEscape={true}`, `showCloseButton={false}`. Custom toolbar owns the Close button so overlay-click (which historically closed LayoutPreviewModal) is suppressed per D-01.
- **Toolbar:** Ghost Close button (X + `aria-label="Close template preview"`) on the left, template name heading (id="preview-title", referenced by `aria-labelledby`), and `Badge variant="default"` showing `"{idx+1} of {total}"`.
- **Layout:** `grid-cols-1 md:grid-cols-[65fr_35fr]` — split on ≥768px, stacked on narrower viewports. `min-h-0` on the grid + `overflow-hidden` on the preview pane prevents flex overflow cascades.
- **Preview pane (left):** absolutely-positioned Prev/Next `Button variant="ghost"` at `left-3`/`right-3 top-1/2 -translate-y-1/2` with `aria-label="Previous template"` / `"Next template"`. Hidden when `total < 2`. Content: sanitized SVG via `dangerouslySetInnerHTML` (svg case), static `<img>` (polotno case), or "Preview unavailable" fallback.
- **Right pane:** `QuickCustomizePanel key={current.id} template={current} onChange={setCustomizedSvg}` for SVG; local `PolotnoInfoBlock` component (with exact UI-SPEC copy) for Polotno.
- **Apply area:** sticky-bottom wrapper with optional `Alert variant="error" dismissible` (exact D-13 copy) and `Button variant="primary" size="lg" fullWidth loading={applying} aria-busy={applying}` labeled "Applying…" / "Apply to new scene".
- **Snapshot semantics (Pitfall 7):** `snapshotRef = useRef(null)` captures `[...templates]` on the open-edge and resets to null on close. `snapshot = snapshotRef.current || templates` serves only the very first render before the open effect commits.
- **Index state reset:** `useEffect` on `[open, initialIndex]` resets `currentIndex`, `customizedSvg`, `applying`, `error` whenever `open` transitions true — modal opens fresh every time.
- **Nav handlers:** `onPrev`/`onNext` wrap `(i - 1 + total) % total` / `(i + 1) % total`; clear `customizedSvg` and `error` alongside the index change (prev template's edits shouldn't leak into the new template's preview).
- **Keyboard nav:** `window.addEventListener('keydown', ...)` installed while `open`, guards on `document.activeElement?.tagName === 'INPUT' || 'TEXTAREA'`, `preventDefault`'s + fires `onPrev`/`onNext` on ArrowLeft/ArrowRight.
- **Apply pipeline (Pitfall 2):** `setApplying(true)` BEFORE awaiting `applyTemplate(current, { customizedSvg })`. On success → `onNavigate(editorRouteFor(current, sceneId))` then `onClose()`. On failure → set exact D-13 error copy + `setApplying(false)` so the button re-enables.
- **Defense-in-depth sanitization (T-172-01):** `useMemo` wraps `DOMPurify.sanitize(raw, { USE_PROFILES: { svg: true, svgFilters: true } })` keyed on `[current, customizedSvg]`. The sanitized string flows into `dangerouslySetInnerHTML`; raw svg_content or panel-emitted customized SVG never reaches the DOM directly.
- **Early returns:** `!open` → null (avoids rendering the portal when closed). `!current` (defensive, should not occur when parent gates on non-empty templates) → renders an empty Modal with an unavailable-state icon.
- **No framer-motion imports in this file** — the Modal primitive already owns enter/exit animation. Preview cross-fade is CSS `transition-opacity duration-150` keyed on `current.id` (satisfies UI-SPEC animation contract without a second motion dependency).

### Task 2 — TemplatePreviewModal.test.jsx (commit `0d81761b`)

- All 8 `it.skip` stubs replaced with real assertions. `grep -c "it.skip"` returns 0; `grep -Ec "^\s+(it|test)\("` returns 8. Describe block and test names preserved verbatim from the Plan 01 scaffold.
- **Mocks:** `supabase` (canonical shape), `templateApplyService` (applyTemplate resolves 'scene-uuid-123' / editorRouteFor returns 'svg-editor?sceneId=scene-uuid-123'), `brandThemeService.getBrandTheme` (null data/no error), and `dompurify` (identity sanitize — lets us assert on raw fixture bytes). `QuickCustomizePanel` is NOT mocked — the real panel mounts and exercises `svgCustomizeService` against the fixture SVGs, so Test 6's remount assertion tests the actual Pitfall-3 behavior.
- **Fixture:** three-item `TEMPLATES` array — t1 (Ocean, svg, `<rect fill="#ff0000"/>` no text), t2 (Sunset, svg, `<rect fill="#00ff00"/>` + `<text id="h">Hi</text>`), t3 (Gala, polotno, thumbnail URL only). Mixed editor_type lets Test 6 prove the panel content changes with the template AND lets the preview-pane code path serve both editor_types within a single suite.
- **Test 1 (TPRV-01 initial open):** `initialIndex={1}` → toolbar shows "Sunset" and counter "2 of 3".
- **Test 2 (TPRV-01 wrapping nav):** `initialIndex={2}`, ArrowRight → "1 of 3" (wrap from last to first), ArrowLeft → "3 of 3" (wrap from first back to last).
- **Test 3 (TPRV-01 keyboard guard):** focus a distractor `<input>` outside the modal, fire window ArrowRight → counter stays at "1 of 3" (INPUT guard bails the handler).
- **Test 4 (Pitfall 2 loading state):** `applyTemplate.mockReturnValueOnce(new Promise(() => {}))` to keep it in-flight. After click → `getByRole('button', { name: /Applying/ })` appears, is `.toBeDisabled()`, has `aria-busy="true"`.
- **Test 5 (D-13 inline Alert):** `applyTemplate.mockRejectedValueOnce(new Error('boom'))` with a console.error spy to silence expected noise. After click → `role="alert"` with "Couldn't apply template" copy, Apply button back to idle label, dismiss button clears the alert.
- **Test 6 (Pitfall 3 remount):** pre-nav — `document.querySelectorAll('input[type="text"]').length === 0` because t1 has no text. After ArrowRight to t2 — at least one `input[type="text"]` exists AND `getByDisplayValue('Hi')` confirms the new template's text flowed into the panel (proving remount, not state preservation).
- **Test 7 (Pitfall 7 snapshot):** `initialIndex={1}` on 3-item array → "Sunset" + "2 of 3". Rerender with a different 2-item array → STILL "Sunset" + "2 of 3", NOT "Bravo" + "2 of 2". `queryByText('Bravo')` asserted not-in-document.
- **Test 8 (TPRV-03 live preview):** find preview by `getByRole('img', { name: /Preview of Ocean/ })` → `preview.innerHTML` contains `<rect` and `#ff0000` (from t1's svg_content, flowed through the identity DOMPurify mock to dangerouslySetInnerHTML).

**Run result:** `npx vitest run tests/unit/components/template-gallery/TemplatePreviewModal.test.jsx` → `8 passed / 8`, 248ms. Combined template-gallery run (both files): `14 passed / 14`, 787ms total. Well under the 15s latency budget.

## Commits

| Task | Subject                                                     | Commit     |
| ---- | ----------------------------------------------------------- | ---------- |
| 1    | `feat(172-05): add TemplatePreviewModal component`          | `477ff50f` |
| 2    | `test(172-05): fill TemplatePreviewModal unit tests — 8 green` | `0d81761b` |

## Deviations from Plan

**None — plan executed exactly as written.**

Every concrete element the plan asked for (design-system Modal with `size="full"` + `closeOnOverlay={false}`, toolbar shape, `md:grid-cols-[65fr_35fr]`, absolute-positioned prev/next arrow buttons, ArrowLeft/Right keyboard with INPUT/TEXTAREA guard, `QuickCustomizePanel key={current.id}`, PolotnoInfoBlock with exact "Advanced customization" copy, `useMemo` DOMPurify.sanitize at the render site, `setApplying(true)` BEFORE await, inline Alert with exact D-13 copy, snapshot semantics via `useRef(null)` captured on open edge) is present in the finished component.

Both Task 1 grep-acceptance and Task 2 grep-acceptance passed green on first run, as did the 8-test suite (248ms). No Rule 1–3 auto-fixes, no Rule 4 architectural checkpoints, no authentication gates, no scaffolding regressions (Plan 04's 6 panel tests also still green).

One small discretionary note on Test 6 (documented here for the record): the plan's behavior clause says "the simplest proxy: the first template has no text nodes, the second has a text node 'Hi'. Assert that pre-nav the panel shows 0 text inputs and post-nav shows 1 text input." I used `document.querySelectorAll('input[type="text"]')` for the count (explicitly excluding the color + file inputs) and added `getByDisplayValue('Hi')` as a second, stronger assertion that the NEW template's text flowed into the panel. That's the cleanest possible proof of remount — it falsifies both "state preserved across nav" and "panel didn't remount at all".

## Authentication gates

**None.** This plan is pure client-side UI composition. `applyTemplate` and `editorRouteFor` are mocked in tests; at production runtime `applyTemplate` ultimately calls `supabase.rpc(...)` which enforces `auth.uid() IS NOT NULL` at the RPC layer, but that's Plan 02's migration contract, not a Plan 05 gate.

## Hand-off to Plan 06 (TemplateGalleryPage wiring + SvgEditorPage sceneId branch + marketplaceService cleanup)

**Mount contract for Plan 06:**

```jsx
<TemplatePreviewModal
  open={previewState.open}
  templates={displayedTemplates}   // snapshotted internally — OK to pass the live memo'd array
  initialIndex={previewState.index}
  onClose={() => setPreviewState((s) => ({ ...s, open: false }))}
  onNavigate={onNavigate}          // app-level navigator from TemplateGalleryPage parent
  // showToast prop is accepted but unused (Alert inline preferred per D-13)
/>
```

**Wiring note — use verbatim (from 172-PATTERNS.md §File 5):**

> Change the `.map((t) =>` to `.map((t, i) =>` in `TemplateGalleryPage.jsx` so the `TemplateCard onSelect` closure can capture the index as `previewState.index`. The modal will snapshot `displayedTemplates` on its own open-edge, so Plan 06 does NOT need to compute a stable reference or snapshot the array itself.

**Prop contract notes:**

1. `templates` MUST be a stable-enough array for the FIRST render after `open` flips true — the snapshot ref reads it at that edge. Subsequent mutations are tolerated (Pitfall 7 covered). `displayedTemplates` memo from Phase 171 satisfies this.
2. The modal does NOT call `onNavigate` on prev/next — only on successful Apply. Plan 06's parent router should accept a pageMap key like `svg-editor?sceneId=<uuid>` or `scene-editor-<uuid>` (per D-12/D-15/D-16 in 172-CONTEXT.md).
3. `onClose` is called after `onNavigate` on successful Apply — parent's close handler should be idempotent and must not re-trigger the modal before navigation fully commits.
4. For the TPRV-06 sessionStorage-delete work and the SvgEditorPage `?sceneId=` branch that Plan 06 owns: this plan did NOT touch `src/pages/TemplateGalleryPage.jsx`, `src/pages/SvgEditorPage.jsx`, or `src/services/marketplaceService.js`. All three remain exactly as they were at Plan 04's completion.

## Design-system primitive usage (confirmation)

`grep` on the finished component:

```
Modal              — design-system Modal with size="full", closeOnOverlay={false}
Button             — variants: ghost (Close + arrows), primary (Apply)
Badge              — variant="default" for "N of M" counter (NOT "neutral" — Badge.jsx has no neutral variant)
Alert              — variant="error", dismissible, onDismiss — for D-13 inline failure
```

Negative assertions (all pass):
- `grep "fixed inset-0 z-50"` → 0 hits (NOT the legacy LayoutPreviewModal shell)
- `grep "LayoutPreviewModal"` → 0 hits in the whole `src/components/template-gallery/` directory (no cross-import from the legacy analog)
- `grep 'variant="neutral"'` → 0 hits (correct Badge variant used)

## Known Stubs

**None.** Every piece of visible UI is wired to real props or real state:

- Toolbar template name → `current.name` from the snapshot
- Counter → `{currentIndex + 1} of {total}` from real state
- Preview (SVG) → DOMPurify-sanitized `customizedSvg || current.svg_content`
- Preview (Polotno) → real `current.thumbnail` URL
- Customize panel → real QuickCustomizePanel from Plan 04 (not a placeholder)
- Polotno info block → static copy per UI-SPEC (intentional — D-05 deferred Polotno in-preview customization to v20.1)
- Apply button → real `applyTemplate` call; the in-flight + error + success branches all flow through genuine user-controlled state

The PolotnoInfoBlock's static copy is NOT a stub — it's the intentional Polotno variant per D-05 / D-16. TPRV-F1 (Polotno in-preview customization) is explicitly deferred to v20.1 in 172-CONTEXT.md `<decisions>`.

## Threat Flags

**None.** Threat model T-172-01 (render-site XSS via `dangerouslySetInnerHTML`) is mitigated exactly as planned with `DOMPurify.sanitize(raw, { USE_PROFILES: { svg: true, svgFilters: true } })`, memoized so sanitization runs only when `current` or `customizedSvg` actually changes. T-172-04 (DoS via oversize SVG) is mitigated upstream in Plan 03's `applyTemplate` (500KB cap) — the modal's preview is bounded by whatever QuickCustomizePanel emits, which in turn is bounded by Plan 04's 2MB logo cap and the fact that svgCustomizeService only mutates (never inflates) the source SVG. T-172-13 (nav discards customize state) is accepted by D-04 decision, not a security threat. T-172-14 (double-click Apply) is mitigated by setting `applying=true` before the await + Button.loading disabling the click handler (Button.jsx:176). T-172-15 (template-name leakage to history) is accepted — the modal does not push history state or set window.title.

No new security surface was introduced outside the plan's `<threat_model>`.

## Self-Check: PASSED

- **Created file:** `src/components/template-gallery/TemplatePreviewModal.jsx` — FOUND (verified with `test -f`, 314 lines)
- **Modified file:** `tests/unit/components/template-gallery/TemplatePreviewModal.test.jsx` — FOUND, 0 `it.skip`, 8 `it()`
- **Commit `477ff50f`** (Task 1): FOUND in `git log --oneline -5`
- **Commit `0d81761b`** (Task 2): FOUND in `git log --oneline -5`
- **Test suite:** `npx vitest run tests/unit/components/template-gallery/TemplatePreviewModal.test.jsx` → 8 passed / 8 (248ms)
- **Combined suite:** `npx vitest run tests/unit/components/template-gallery` → 14 passed / 14 (787ms)
- **All Task 1 grep acceptance criteria:** PASS (`export default`, Modal `size="full"`, `closeOnOverlay={false}`, `closeOnEscape`, ChevronLeft/Right, ArrowLeft/Right, INPUT/TEXTAREA guard, applyTemplate, editorRouteFor, `setApplying(true)`, QuickCustomizePanel, `key={current.id}`, "Apply to new scene", "Applying…", "Advanced customization", aria-labels "Previous/Next template" + "Close template preview", DOMPurify.sanitize, `md:grid-cols-[65fr_35fr]`, Badge `variant="default"`)
- **All Task 1 negative acceptance criteria:** PASS (no `variant="neutral"`, no `fixed inset-0 z-50`, no `LayoutPreviewModal`)
- **All Task 2 grep acceptance criteria:** PASS (zero `it.skip`, 8 `it()`, keyDown usage, "Applying…" in test, "Couldn't apply template" in test, rerender, live-preview assertion with `#ff0000`)
- **No modifications to STATE.md or ROADMAP.md:** verified with `git diff --name-only` from base HEAD
- **No modifications to Plan 03/04 files or src/pages/*:** verified — the only src/ file touched is the new TemplatePreviewModal.jsx
