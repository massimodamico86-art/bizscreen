---
phase: 173-starter-packs-favorites
plan: 06
subsystem: favorites-ui
tags: [ui, design-system, favorites, optimistic-ui, a11y, template-card, template-preview-modal]

requires:
  - phase: 173-starter-packs-favorites
    plan: 01
    provides: RED FavoriteButton.test.jsx stub (3 it.skip cases, W-2) — flipped GREEN here
  - phase: 173-starter-packs-favorites
    plan: 05
    provides: toggleFavorite named export in templateGalleryService.js (PG 23505-tolerant insert, composite-PK delete) — consumed by TemplatePreviewModal heart

provides:
  - src/design-system/components/FavoriteButton.jsx — heart primitive with optimistic state, 48x48 tap target, aria-pressed, e.stopPropagation, revert-on-error
  - src/design-system/index.js — FavoriteButton barrel export (new "Favorites (Phase 173)" section; append-only; no existing exports touched)
  - src/design-system/components/TemplateCard.jsx — backwards-compatible heart slot at top-right (conditional on onToggleFavorite prop; Phase 171 callers unaffected)
  - src/components/template-gallery/TemplatePreviewModal.jsx — heart in header between close button and title, wired live to toggleFavorite({ templateId, editorType, nextValue }) with fail-soft showToast
  - tests/unit/components/FavoriteButton.test.jsx — 3 live @testing-library/react + vitest cases (optimistic-before-await, revert-on-error, busy-guard re-entry) — flipped RED→GREEN on first run

affects:
  - 173-07-PLAN (pack UI components — parallel with this plan; no file overlap, zero conflict)
  - 173-08-PLAN (TemplateGalleryPage integration — wires isFavorited + onToggleFavorite props from gallery_templates_with_favorites VIEW rows into each TemplateCard)
  - 173-10-PLAN (E2E verification wave — flips favorites.spec.js RED→GREEN; FavoriteButton rendered-state assertions pass through to TemplateCard top-right position)

tech-stack:
  added: []
  patterns:
    - "Optimistic UI flip BEFORE await (RESEARCH Pattern 5) — setOptimistic(next) synchronously sets aria-pressed; on error setOptimistic(!next) reverts + onError fires for caller toast"
    - "48x48 tap target via invisible padding (min-h-12 min-w-12 p-[14px]) — icon visually 20px, target hits UI-SPEC §Spacing accessibility floor"
    - "Belt-and-suspenders click guard — FavoriteButton internally calls e.stopPropagation AND parent TemplateCard lines 60-64 guards on e.target.closest('button'); either alone suffices, combined prevents T-173-06-04 regressions if one guard is later refactored"
    - "Backwards-compatible prop gate — heart renders ONLY when onToggleFavorite is truthy; keeps Phase 171 TemplateCard callers (which never pass favorites props) visually unchanged"
    - "Barrel export appended under a named section comment — Modal/Button/Badge etc. untouched; scan-and-append shape matches existing Phase 171/172 additions"

key-files:
  created:
    - src/design-system/components/FavoriteButton.jsx
  modified:
    - src/design-system/index.js
    - src/design-system/components/TemplateCard.jsx
    - src/components/template-gallery/TemplatePreviewModal.jsx
    - tests/unit/components/FavoriteButton.test.jsx

key-decisions:
  - "[173-06] UI-SPEC wins over RESEARCH §Example 5 on heart color: filled state uses text-brand-500 fill-current (NOT text-red-500 from RESEARCH). Per UI-SPEC §Color (brand accent is reserved for filled heart, Apply pack CTA, favorites chip, count badge, focus ring). Checker sign-off authority binds here."
  - "[173-06] Optimistic flip happens BEFORE await onToggle (Pattern 5). Caller's onToggle may be sync or async; async errors propagate to onError. No retry logic inside the primitive — re-entry is caller's concern."
  - "[173-06] TemplateCard heart is conditional on onToggleFavorite prop, NOT isFavorited — absent handler means no heart slot. Avoids the alternative of 'always render but silent onClick' which would clutter Phase 171 callers with a visible but non-functional button."
  - "[173-06] TemplatePreviewModal heart sources current.id + current.editor_type directly from the snapshot template row (from gallery_templates_with_favorites VIEW with caller-auth RLS, Plan 04). Cannot inject foreign template IDs (T-173-06-01 mitigated)."
  - "[173-06] FavoriteButton accepts size prop (default 20px per UI-SPEC §Component Inventory §FavoriteButton icon size) — NOT the RESEARCH §Example 5 default of 16px. Two consumers (TemplateCard + TemplatePreviewModal) both pass size={20} explicitly; default only matters for future callers."
  - "[173-06] showToast prop on TemplatePreviewModal was previously eslint-disable-no-unused-vars; now genuinely used by heart onError — removed the disable and updated the comment. No shape change to the prop contract; callers that already pass showToast gain the error surface for free."

requirements-completed: [TFAV-01]

metrics:
  duration: ~4min
  completed: 2026-04-23
  files_created: 1
  files_modified: 4
  tasks_completed: 2
  tests_added: 3  # 3 live tests (Plan 01 had 3 it.skip, now 3 live it)
  tests_green: 3  # FavoriteButton.test.jsx 3/3 pass
  lines_added_net: ~95
---

# Phase 173 Plan 06: FavoriteButton Primitive + Heart Slots Summary

**Ship the favorites UI surface: design-system FavoriteButton primitive (optimistic, a11y-compliant, 48x48 tap target), top-right slot on TemplateCard (backwards-compatible), and live-wired heart in TemplatePreviewModal header — Plan 01's RED FavoriteButton.test.jsx (W-2 fix) flipped GREEN on first run.**

## Performance

- **Duration:** ~4 min
- **Started:** 2026-04-23T13:11:54Z
- **Completed:** 2026-04-23T13:16:15Z
- **Tasks:** 2
- **Files created:** 1
- **Files modified:** 4
- **Tests:** 3 flipped RED→GREEN, 0 regressions

## Accomplishments

- **FavoriteButton primitive shipped** with the exact UI-SPEC contract: 48x48 tap target via `min-h-12 min-w-12 p-[14px]`, lucide `<Heart size={20}>`, `aria-pressed={optimistic}`, `aria-label` switching between "Add to favorites" / "Remove from favorites", `transition-colors duration-150 ease-out` (no scale), filled state `text-brand-500 fill-current`, outline state `text-gray-400`.
- **Optimistic state owned entirely by the primitive** — caller passes `isFavorited` (current truth) + `onToggle(nextValue)`; the heart flips `aria-pressed` SYNCHRONOUSLY before awaiting the toggle promise (RESEARCH Pattern 5). On error: reverts + invokes `onError?.(err)` so the caller can toast.
- **Busy guard prevents double-fire** — `if (busy) return` early-returns; second/third rapid clicks are no-ops until the first toggle settles. Unit test proves only 1 call per intent across 3 consecutive fireEvent.click calls.
- **Plan 01 W-2 RED test flipped GREEN on first run** — all 3 cases (optimistic-before-await, revert-on-error, busy-guard re-entry) pass: `Tests 3 passed (3)`, `Duration 355ms`. No iteration needed.
- **TemplateCard backwards-compatible slot** — heart renders ONLY when `onToggleFavorite` prop is truthy; the 11 existing Phase 171/172 TemplateCard callers (which do not pass favorites props) continue rendering identically with zero visual change. Verified: `npm run build` exits 0.
- **TemplatePreviewModal live-wired heart** in the toolbar header between close button and title (grep-verified ordering: close@179, FavoriteButton@185, h2@203). Wired to the live `toggleFavorite` from templateGalleryService (Plan 05's PG 23505-tolerant insert path — optimistic flip cannot duplicate-key fail). Fail-soft on showToast via optional chain.
- **Zero overlap with the sibling Plan 07 agent** — Plan 07 touches `PackCard.jsx`, `StarterPacksStrip.jsx`, `PackPreviewModal.jsx`; this plan touches `FavoriteButton.jsx`, `index.js`, `TemplateCard.jsx`, `TemplatePreviewModal.jsx`. Parallel worktree execution is clean.
- **Build green** (6.66s, all 39 vendor + page chunks emitted).

## Task Commits

1. **Task 1: Create FavoriteButton primitive + barrel export + flip W-2 stub GREEN** — `56c28c8a` (feat)
2. **Task 2: Slot FavoriteButton into TemplateCard + wire heart in TemplatePreviewModal header** — `a219eb33` (feat)

_Metadata commit for this SUMMARY will be recorded as the final commit in this plan._

## Files Created/Modified

### Created (1)

- `src/design-system/components/FavoriteButton.jsx` (67 lines) — Heart primitive with optimistic state. Exports `default function FavoriteButton({ isFavorited, onToggle, onError, size = 20, className = '' })`. Internal state: `optimistic` (initialized from `isFavorited`) + `busy` (idempotency guard). Click flow: `e.stopPropagation()` → busy check → flip optimistic BEFORE await → try/catch (await onToggle, revert+onError on throw) → finally setBusy(false). JSX: `<button type="button">` with all UI-SPEC a11y + tap-target + color classes.

### Modified (4)

- `src/design-system/index.js` (+3 lines) — Appended `// Favorites (Phase 173)` section divider + `export { default as FavoriteButton } from './components/FavoriteButton';`. No existing exports touched; append-only.
- `src/design-system/components/TemplateCard.jsx` (+14 lines, 1 import added) — Added `import FavoriteButton from './FavoriteButton';` after the Badge import. Added two optional props `isFavorited` and `onToggleFavorite` to the destructure block (before `className = ''`). Inserted a conditional heart slot (`{onToggleFavorite && ...}`) at `absolute top-2 right-2` inside the image region, mirroring the existing Featured badge's `top-2 left-2` slot. Passes `isFavorited={!!isFavorited}` + `onToggle={onToggleFavorite}` + `onError={console.error}` + `size={20}`.
- `src/components/template-gallery/TemplatePreviewModal.jsx` (+22 lines, 2 imports added, 1 eslint-disable removed) — Added `import FavoriteButton from '../../design-system/components/FavoriteButton';` and `import { toggleFavorite } from '../../services/templateGalleryService';` after the existing templateApplyService import. Removed the `// eslint-disable-next-line no-unused-vars` on `showToast` (now genuinely used) and updated its comment to reflect the Phase 173 heart onError path usage. Inserted `<FavoriteButton>` in the toolbar `<div>` between the close `<Button>` and the `<h2 id="preview-title">`. Wires `isFavorited={!!current.is_favorited}`, `onToggle={async (nextValue) => await toggleFavorite({ templateId: current.id, editorType: current.editor_type, nextValue })}`, `onError={(err) => { console.error(...); showToast?.({ variant: 'error', message: 'Failed to update favorite' }); }}`, `size={20}`. Gated on `{current && ...}` defensively (Modal defensive-empty-state branch at lines 138-154 would normally prevent `current === null` reaching the toolbar, but the gate is cheap insurance).
- `tests/unit/components/FavoriteButton.test.jsx` (~31 lines churn — 3 it.skip → 3 live it) — Replaced the entire file per plan VERBATIM spec. Adds `render, screen, fireEvent, waitFor` imports from `@testing-library/react` + `vi` from vitest + `FavoriteButton` from the source path. Three `it()` blocks: (1) optimistic flip BEFORE await — uses a deferred-resolve promise to pin the assertion between click and resolution; (2) revert on error — Promise.reject + waitFor(aria-pressed='false') + onError called with err; (3) busy guard — never-resolving promise + 3 rapid clicks + toHaveBeenCalledTimes(1). All 3 GREEN on first run (355ms, 631ms on re-run after Task 2).

## Decisions Made

- **Heart color: UI-SPEC text-brand-500 (NOT RESEARCH text-red-500).** UI-SPEC §Color explicitly reserves brand accent (`#F26F26`) for filled heart; RESEARCH §Example 5 ships the same component with `text-red-500` as reference code that was linked pre-UI-SPEC. Per the UI-SPEC checker sign-off authority and the plan's explicit "UI-SPEC wins" instruction, brand-500 wins. Verified with `! grep -q "text-red-500" src/design-system/components/FavoriteButton.jsx`.
- **Optimistic flip BEFORE await onToggle.** Pattern 5 from RESEARCH + UI-SPEC §Interaction States mandate immediate visual feedback; the promise is fired afterwards. On rejection, `setOptimistic(!next)` reverts and `onError?.(err)` fires — the caller decides whether to show a toast. FavoriteButton itself is toast-agnostic (keeps the primitive pure).
- **TemplateCard heart is gated on onToggleFavorite prop only**, not on isFavorited. An `isFavorited === undefined` caller would still need the handler to interact; an `isFavorited === false` caller with a handler legitimately wants the outline heart visible. The `!!isFavorited` cast inside the slot normalizes the initial optimistic state to a real boolean so aria-pressed is always literal `"true"` or `"false"`, never the string `"undefined"`.
- **Heart rendered in TemplatePreviewModal header BETWEEN close button and title** (per UI-SPEC §PackPreviewModal note that template modal DOES get a heart, packs do NOT). Alternative placements considered: right of the Badge, far-right after the page-of-N badge. Chose between-close-and-title because (a) UI-SPEC explicitly says "left of close button" — but close is already leftmost due to flex-justify-between, so "between close and title" honors the intent while respecting the existing three-zone toolbar; (b) grouping primary action affordances on the left keeps the right reserved for secondary info (page-of-N).
- **showToast prop now wired for real in TemplatePreviewModal.** Previously marked `// eslint-disable-next-line no-unused-vars` because inline Alert was preferred for Apply-flow errors per D-13. Favorites errors are transient and non-blocking — the Alert box is reserved for Apply errors. Toast is the right surface for favorite-toggle failure; the optional chain (`showToast?.(...)`) keeps the change safe if any caller ever omits the prop.
- **PackPreviewModal does NOT get a heart** — UI-SPEC §Component Inventory §PackPreviewModal explicitly states "packs themselves are NOT favoritable — this slot does NOT appear in PackPreviewModal; favorites are template-level only". Plan 07 (parallel sibling) is responsible for PackPreviewModal and honors this — no coordination needed; separate file sets.
- **FavoriteButton default size=20 (not 16 as in RESEARCH Example 5).** Both current consumers pass `size={20}` explicitly per UI-SPEC §FavoriteButton "Heart icon 20×20px". Default is only a defensive value for future callers; made it the spec-aligned value rather than the research-draft value.

## Deviations from Plan

None — plan executed exactly as written. Task 1's W-2 RED stub flipped GREEN on the first verify run (no debugging needed); Task 2's build went green on first `npm run build` (no lint failures, no type errors, no broken imports). All 10 Task-1 acceptance grep checks and all 10 Task-2 acceptance grep checks passed on first attempt.

## Issues Encountered

**Non-blocking — vitest reporter change.** The plan's `<verify>` block runs `npx vitest run ... --reporter=basic`, but the worktree's vitest version is v4.0.14 which no longer ships the `basic` reporter. Running without the flag produced clean, verbose output showing all 3 tests GREEN in 355ms. Did not treat this as a deviation (the reporter flag is a UX hint, not a correctness requirement; the 3-passed assertion baked into the plan's checker logic still held).

## User Setup Required

None — plan is purely UI component additions + test update. No env vars, no DB touch, no auth flow. The new heart in TemplatePreviewModal depends on Plan 05's live `toggleFavorite` service + Plan 04's live `gallery_templates_with_favorites` VIEW (both deployed 2026-04-23).

## Known Stubs

None — the FavoriteButton renders real state and fires a real onToggle; TemplateCard's heart slot is fully functional when the caller (Plan 08 will be the first) provides `onToggleFavorite`; TemplatePreviewModal's heart is already live-wired and will persist to Supabase on click. No placeholder-data paths.

## Threat Flags

None beyond the plan's `<threat_model>` register. Scan: the heart surface touches (a) auth.uid() via templateGalleryService.toggleFavorite (existing Plan 05 boundary, no new surface) and (b) template_id + editor_type sourced from the snapshot row via the auth-filtered VIEW (T-173-06-01 mitigated as designed). No new network endpoints, no new RLS touch, no new file I/O.

## Next Phase Readiness

**Plan 08 (Wave 5) can now wire favorites end-to-end.** Consumption map:
- `TemplateGalleryPage.jsx` iterates `displayedTemplates` from `fetchGalleryTemplates()` → each row has the VIEW's new `is_favorited` column (Plan 05) → pass `isFavorited={t.is_favorited}` + `onToggleFavorite={async (next) => { await toggleFavorite({ templateId: t.id, editorType: t.editor_type, nextValue: next }); /* refresh gallery */ }}` to each `<TemplateCard>`. The heart primitive handles optimistic state + error revert internally; page only needs to refresh the backing array on success to keep the next-navigation's initial state in sync.
- Favorites filter chip (also Plan 08) consumes `filters.favorites` URL param from `useSearchParams()` + a row filter `rows = rows.filter((t) => t.is_favorited === true)` per RESEARCH Pattern 7 integration.
- TemplatePreviewModal heart already works live as of Task 2 — Plan 08 does not need to re-wire it.

**Plan 01 RED test status** (post-Plan 06):
- `FavoriteButton.test.jsx`: 3/3 GREEN (flipped here, Task 1).
- `PackCard.test.jsx`: 6 it.skip — Plan 07 (parallel sibling) flips.
- `view-per-user.test.js`: 3 it.skip under `describe.skipIf(SKIP)` — Plan 10 flips with TEST_USER_EMAIL env.
- `apply-starter-pack-atomicity.test.js`: 4/4 GREEN (flipped by Plan 05).

**Plan 10 E2E `favorites.spec.js`** will now have concrete DOM targets to assert against:
- `aria-pressed="true"`/`"false"` on each heart
- `aria-label="Add to favorites"`/`"Remove from favorites"` text match
- `[data-testid]` — not added here (not in plan scope); Plan 10 can add via the TemplateCard pass-through `...props` if needed.

## Self-Check: PASSED

- File `src/design-system/components/FavoriteButton.jsx`: FOUND (67 lines)
- File `src/design-system/index.js` (modified): FOUND; grep "FavoriteButton" matches
- File `src/design-system/components/TemplateCard.jsx` (modified): FOUND; grep all 5 Task-2 markers match
- File `src/components/template-gallery/TemplatePreviewModal.jsx` (modified): FOUND; grep all 5 Task-2 markers match; header ordering grep confirms close@179 < FavoriteButton@185 < h2@203
- File `tests/unit/components/FavoriteButton.test.jsx` (modified): FOUND; grep -c "it.skip(" = 0
- Commit `56c28c8a` (Task 1 — FavoriteButton + barrel + W-2 flip): FOUND in git log
- Commit `a219eb33` (Task 2 — TemplateCard slot + TemplatePreviewModal heart): FOUND in git log
- `npx vitest run tests/unit/components/FavoriteButton.test.jsx`: 3 passed (0 failed)
- `npm run build`: exit 0, all chunks emitted, no import errors
- File contains `aria-pressed={optimistic}`: VERIFIED
- File contains `min-h-12 min-w-12 p-[14px]`: VERIFIED
- File contains `text-brand-500`: VERIFIED
- File does NOT contain `text-red-500`: VERIFIED

---
*Phase: 173-starter-packs-favorites*
*Completed: 2026-04-23*
