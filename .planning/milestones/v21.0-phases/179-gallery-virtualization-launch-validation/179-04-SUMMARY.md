---
phase: 179-gallery-virtualization-launch-validation
plan: 04
subsystem: template-gallery
tags: [virtualization, component, masonry, accessibility, tdd-green]

# Dependency graph
requires:
  - phase: 179
    provides: Plan 01 — @tanstack/react-virtual ^3.13.24 dependency in package.json
  - phase: 179
    provides: Plan 02 — useContainerColumns hook (D-01 cols derivation) [unused by this component but consumed by Plan 05 caller]
  - phase: 179
    provides: Plan 03 — Nyquist RED unit scaffold tests/unit/components/VirtualizedTemplateGrid.test.jsx (4 active + 2 it.todo)
provides:
  - src/components/template-gallery/VirtualizedTemplateGrid.jsx — row-chunked masonry virtualizer with overscan=5, measureElement, scrollToOffset(0) on templates identity change, [role='grid'] + aria-rowcount/aria-rowindex contract, alignItems:'start' load-bearing masonry CSS, data-tour='first-card' anchor preserved
  - tests/unit/components/VirtualizedTemplateGrid.test.jsx (activated) — all 6 unit tests now GREEN, the 2 previously-todo markers wired with vi.mock('@tanstack/react-virtual') capturing useVirtualizer options and a scrollToOffsetSpy
affects: [179-05, 179-06, 179-07, 179-08]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Row-chunked masonry virtualizer (D-02 OptiSigns standard): chunk(templates, cols) then useVirtualizer({ count: rows.length }) with measureElement ref on each row — NOT native @tanstack/react-virtual lanes (OQ-1 / bug #1063)"
    - "vi.mock('@tanstack/react-virtual', () => ({ useVirtualizer: (options) => { capturedVirtualizerOptions = options; return { getVirtualItems: () => [], getTotalSize: () => 0, scrollToOffset: spy, measureElement: noop }; }})) — hoisted module mock for SC-1/SC-3 assertions without engaging RO/jsdom layout"
    - "alignItems: 'start' on each row container is LOAD-BEARING: default 'stretch' would equalize row heights and defeat mixed-orientation masonry tiling"
    - "useEffect([templates, virtualizer]) → virtualizer.scrollToOffset(0) for SC-3 filter-change scroll reset; templates identity flip from TemplateGalleryPage's useMemo (Pitfall 2 documented: assertion is 'called' not 'called-once' due to fuse rapid re-renders)"

key-files:
  created:
    - src/components/template-gallery/VirtualizedTemplateGrid.jsx (142 LOC)
  modified:
    - tests/unit/components/VirtualizedTemplateGrid.test.jsx (Plan 03 scaffold extended; 4 active → 6 active; 2 it.todo → 0)
    - tests/setup.js (Rule 3 unblock — see Deviations below)

key-decisions:
  - "Followed plan's verbatim implementation skeleton with zero deviations to the component contract (overscan=5, ESTIMATE_SIZE=320, chunk fn, row-chunked grid with measureElement, useEffect scroll reset, alignItems:'start')."
  - "Plan Task 2 vi.mock strategy: module-level let capturedVirtualizerOptions + scrollToOffsetSpy with factory closure write-on-call. Hoisting works as the plan predicted — all 6 tests exercise the mock; the 4 original tests still pass because aria-rowcount is computed from rows.length (component-owned math) independent of the mocked virtualizer's getVirtualItems() return."
  - "Per RESEARCH §Pitfall 2: SC-3 assertion is .toHaveBeenCalled() + .toHaveBeenCalledWith(0), NOT .toHaveBeenCalledTimes(1) — rapid fuse-driven re-renders can fire the effect more than once."

# Execution metrics
metrics:
  duration_min: 4.4
  tasks_completed: 2
  files_changed: 3  # 1 created + 2 modified
  tests_added: 2    # 2 it.todo → 2 active passing
  tests_passing: 6
  completed: 2026-05-11
---

# Phase 179 Plan 04: VirtualizedTemplateGrid Component Summary

One-liner: Row-chunked masonry virtualizer with `@tanstack/react-virtual` activating SC-1 (overscan=5), SC-3 (scrollToOffset on templates identity), and SC-5 (`[role='grid']` + aria-rowcount math); 6/6 unit tests GREEN, threat-model gate clean.

## What Shipped

**`src/components/template-gallery/VirtualizedTemplateGrid.jsx`** (142 LOC, new file) — the core of Phase 179. Mounts the `[role="grid"]` DOM contract, drives row-chunked masonry over `useVirtualizer({ count: rows.length })` with `measureElement` ref on each row, and reuses the existing `TemplateCard` (orientation prop already shipped in Phase 178 D-10) with the verbatim card-render pattern from `TemplateGalleryPage.jsx:749-784` (New/Popular badges + favorite button + tour anchor on absolute index 0).

**`tests/unit/components/VirtualizedTemplateGrid.test.jsx`** — Plan 03 scaffold extended in place. The two `it.todo` markers are now active tests using `vi.mock('@tanstack/react-virtual')` to capture `useVirtualizer` options (overscan ≥3 assertion, SC-1) and spy on `scrollToOffset` across a templates-reference rerender (SC-3 filter-change scroll reset assertion). All 6 tests pass.

## Locked Invariants (load-bearing details landed verbatim)

| Invariant | Where | Plan-required source |
|-----------|-------|----------------------|
| `overscan = 5` (>= 3 SC-1) | `const OVERSCAN = 5` (line 41) + `overscan: OVERSCAN` in useVirtualizer config (line 67) | RESEARCH §Pattern 1 line 224 |
| `count = 0` when templates=[] | `chunk([], cols)` returns `[]` → `rows.length === 0` → useVirtualizer count is 0 → grid renders with aria-rowcount="0" | SC-1 invariant + Test 1 |
| `aria-rowcount` math | `aria-rowcount={rows.length}` where `rows = chunk(templates, safeCols)` | SC-5 + Tests 2 & 3 (17/4=5, 12/3=4) |
| measureElement ref | `ref={virtualizer.measureElement}` + `data-index={vRow.index}` (REQUIRED association) | RESEARCH §Pattern 1 lines 252-253 |
| Masonry CSS | `alignItems: 'start'` on row container (load-bearing — `stretch` defeats masonry) | CONTEXT.md D-02 + RESEARCH §Anti-Patterns line 363-372 |
| SC-3 scroll reset | `useEffect(() => virtualizer.scrollToOffset(0), [templates, virtualizer])` | SC-3 contract |
| Per-row aria | `role="row"` + `aria-rowindex={vRow.index + 1}` (1-indexed per WAI-ARIA) | SC-5 |
| First-card tour anchor | `data-tour={absoluteIndex === 0 ? 'first-card' : undefined}` preserves useGalleryTour.js:45 selector | useGalleryTour.js + Plan 03 acceptance |
| Threat-model gate | Zero `dangerouslySetInnerHTML` (verified) | Plan 01 threat register inheritance |

## Test Results

```
Test Files  1 passed (1)
     Tests  6 passed (6)
```

| # | Test | Status |
|---|------|--------|
| 1 | renders role="grid" with aria-rowcount=0 when templates=[] | PASS |
| 2 | aria-rowcount equals ceil(templates.length / cols) at cols=4 (17→5) | PASS |
| 3 | aria-rowcount equals ceil(templates.length / cols) at cols=3 (12→4) | PASS |
| 4 | tolerates null scrollElement on first render (no crash) | PASS |
| 5 | overscan default is >= 3 (SC-1) — captured via vi.mock spy | PASS |
| 6 | scrollToOffset(0) is called when templates reference changes (SC-3) — spy across rerender | PASS |

Broader sweep (no regressions): `tests/unit/components/` → 15/15 across 3 files (PackCard, useContainerColumns hook, VirtualizedTemplateGrid).

## Commits

| Task | Commit | Message |
|------|--------|---------|
| 1 | `d7e244f6` | `feat(179-04): GREEN — VirtualizedTemplateGrid masonry virtualizer` |
| 2 | `339c19a6` | `test(179-04): activate overscan + scrollToOffset spies (SC-1/SC-3)` |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] tests/setup.js ResizeObserver/IntersectionObserver mocks rewritten from arrow function to regular function**
- **Found during:** Task 1 (initial test run after writing component)
- **Issue:** Two of the four active Plan 03 scaffold tests use `scrollElement={document.body}`, which causes `@tanstack/virtual-core` to invoke `new targetWindow.ResizeObserver(cb)`. The pre-existing global mock in `tests/setup.js` was `vi.fn().mockImplementation(() => ({ ... }))` using an arrow function. Vitest 4 (4.0.14) spies invoke implementations via `Reflect.construct(implementation, args, new.target)` on `new`, and arrow functions cannot be constructed via `Reflect.construct` (`TypeError: () => ({...}) is not a constructor`). Both tests at `cols=4` (17 templates) and `cols=3` (12 templates) failed inside React's `commitLayoutEffectOnFiber` chain.
- **Fix:** Rewrote both `ResizeObserver` and `IntersectionObserver` mock factories from arrow form to regular `function () { return { ... } }` form, preserving the exact observer/unobserve/disconnect shape. Documented the vitest 4 constructor-compatibility requirement inline.
- **Files modified:** `tests/setup.js` (lines 77-95)
- **Commit:** `d7e244f6` (bundled with Task 1's component because it's the load-bearing unblock)
- **Verification:** All 7 useContainerColumns hook tests still pass; full `tests/unit/components/` sweep returns 15/15.
- **Scope check:** This is a pre-existing infrastructure bug exposed by the new tests; the fix is surgical and limited to the exact two mock factories that needed it. No other shared infrastructure touched.

### Other deviations from verbatim plan code

None to the component contract or the test bodies. The component file matches the plan's literal skeleton; the test file matches the plan's literal vi.mock + 2 new tests.

## Authentication Gates

None. Plan was fully autonomous (`autonomous: true`), no auth-protected resources touched.

## Threat Flags

None. The new component renders user-provided `template.name`, `template.description`, and `template.thumbnail` via React text/attribute interpolation (auto-escaped) and through the existing `TemplateCard` component (no `dangerouslySetInnerHTML` in either). The threat-model gate from Plan 01 is inherited and verified.

## Known Stubs

None. The component is fully wired: `templates`, `cols`, `scrollElement`, `onApply`, `onToggleFavorite`, `applyingId`, `popularityThreshold`, and `isNew` props are all consumed and passed through to either virtualizer config, row layout, or the per-card `TemplateCard` render. Plan 05's `TemplateGalleryPage` rewire is the next step to provide these props from live data.

## Self-Check: PASSED

- `src/components/template-gallery/VirtualizedTemplateGrid.jsx` exists (142 lines) — VERIFIED on disk
- `tests/unit/components/VirtualizedTemplateGrid.test.jsx` modified (6 active `it(...)` + 0 `it.todo`) — VERIFIED on disk
- Commit `d7e244f6` exists in git log — VERIFIED via `git log --oneline`
- Commit `339c19a6` exists in git log — VERIFIED via `git log --oneline`
- Final test run: `npx vitest run tests/unit/components/VirtualizedTemplateGrid.test.jsx` → 6 passed (6) — VERIFIED
- Threat-model gate: zero `dangerouslySetInnerHTML` in new file — VERIFIED via grep
- All 13 grep acceptance criteria from Task 1 — VERIFIED (one multi-line useEffect/scrollToOffset pattern confirmed via perl `-0777` since macOS BSD grep doesn't span newlines with `-P`)
- All 6 grep acceptance criteria from Task 2 — VERIFIED including `it.todo` count = 0 and `  it(` count = 6
