---
phase: 173-starter-packs-favorites
plan: 09
subsystem: admin
tags:
  - admin
  - ui
  - routing
  - tdd
requirements:
  - TPCK-03
dependency_graph:
  requires:
    - 05  # marketplaceService pack CRUD exports
  provides:
    - admin-starter-packs route for super_admin pack CRUD
    - sibling PackEditorPanel component (W-5 split — matches AdminEditTemplatePage convention)
    - VITE_E2E_TEST_MODE + test:setCurrentPage CustomEvent nav escape hatch for Plan 10 E2E
  affects:
    - src/App.jsx (4 additions: lazy import, pageMap, adminToolPages, test-mode listener)
    - playwright.config.js (webServer.env exposes VITE_E2E_TEST_MODE for E2E runs)
tech_stack:
  added: []
  patterns:
    - admin page drill-in split (AdminTemplatesPage + sibling AdminEditTemplatePage) — mirrored here as AdminStarterPacksPage + sibling PackEditorPanel
    - CustomEvent-based test-mode navigation guarded by two env flags (MODE === 'test' || VITE_E2E_TEST_MODE)
    - Modal-based confirmation dialog with UI-SPEC-verbatim copywriting
    - TDD RED/GREEN cycle via vitest + @testing-library/react + mocked service layer
key_files:
  created:
    - src/pages/Admin/AdminStarterPacksPage.jsx
    - src/pages/Admin/PackEditorPanel.jsx
    - tests/unit/pages/Admin/AdminStarterPacksPage.test.jsx
  modified:
    - src/App.jsx
    - playwright.config.js
decisions:
  - Button variant for the destructive confirm is `danger` (the design system's existing variant); the UI-SPEC wrote `variant="destructive"` but the Button component only ships `primary|secondary|ghost|danger`. The styling intent (destructive red) is preserved via `danger`. Rule 1 auto-fix applied.
  - Member-picker is a `<details>` disclosure showing up to 100 templates from fetchGalleryTemplates; GripVertical is rendered as decorative only — actual HTML5 drag-reorder wiring is deferred to Plan 10 or a follow-up phase.
  - New-pack save path uses `addPackItem` in a loop then `updatePack` — initial members are persisted via INSERT (reorderPackItems only UPDATEs, so it cannot add fresh rows). Existing-pack save uses `updatePack + reorderPackItems` to flush any local re-ordering.
  - playwright.config.js now sets `VITE_E2E_TEST_MODE=1` in `webServer.env`; without this, Plan 10's admin-starter-packs E2E cannot navigate to the route (SuperAdminDashboardPage admin-tools grid is intentionally not modified by this phase, per plan objective).
metrics:
  duration: approx 10 minutes
  tasks_completed: 2
  files_created: 3
  files_modified: 2
  commits: 3
  completed: 2026-04-22
---

# Phase 173 Plan 09: Admin starter-packs page + App.jsx route registration — Summary

Shipped the super_admin surface for pack CRUD: list-and-row-actions page `AdminStarterPacksPage` + sibling `PackEditorPanel` editor, and wired App.jsx at all 3 routing sites (lazy import, pageMap, adminToolPages) plus a 4th test-mode nav listener that lets Plan 10's E2E spec reach the page without touching the hardcoded SuperAdminDashboardPage admin-tools grid.

## Execution

| Task | Name                                                             | Commits                | Duration |
| ---- | ---------------------------------------------------------------- | ---------------------- | -------- |
| 1    | TDD RED: failing unit tests for AdminStarterPacksPage            | `7b3bbf63`             | ~2 min   |
| 1    | TDD GREEN: AdminStarterPacksPage + PackEditorPanel implementation | `d0777afa`             | ~4 min   |
| 2    | App.jsx route registration (4 edits) + playwright.config env flag | `9eb7ecee`             | ~3 min   |

**Plan-level TDD gate compliance:** `test(...)` commit `7b3bbf63` precedes `feat(...)` commit `d0777afa`. REFACTOR was not needed — the implementation passed all 9 tests on first run.

## What was built

### `src/pages/Admin/AdminStarterPacksPage.jsx` (236 lines — under the 260-line ceiling)

- Mirrors `AdminTemplatesPage` chrome: `PageLayout` with title/description/actions + a bg-white `shadow` table.
- Columns: **Name** | **Industry** | **Members** | **Active** | **Display Order** | **Actions** (Edit / Delete)
- `fetchStarterPacks({ activeOnly: false })` so admins see inactive packs too
- **"New pack"** button (`variant="primary"`, lucide `Plus` icon) opens `PackEditorPanel` with `packId="new"`
- Row **Toggle Active**: clicks flip `is_active` via `updatePack(id, { is_active: !current })`
- Row **Edit**: opens `PackEditorPanel` with the row's UUID
- Row **Delete**: opens confirmation modal; each button carries `data-testid="delete-pack-<id>"` (W-7 fix)
- Delete confirmation copy is **verbatim** from UI-SPEC `§Copywriting`:
  - Title: `Delete "[Pack name]"?`
  - Body: `This removes the pack but does not delete its templates or any scenes you've already created from it.`
  - Confirm button: `Delete pack` (destructive styling via `variant="danger"`)
  - Dismiss button: `Keep pack`

### `src/pages/Admin/PackEditorPanel.jsx` (352 lines — sibling file per W-5 split)

- Modal-based drill-in editor (`size="lg"`, `closeOnOverlay={false}`) for both `new` and existing packs
- On mount: fetches `gallery_templates` for the member-picker; fetches pack detail for existing packs via `fetchPackDetail(packId)`
- Metadata form fields: name, slug, industry, display_order, thumbnail_url, description, is_active checkbox
- Member management: `<details>` disclosure lists up to 100 available templates (filtered to exclude current members); click adds. Each current member row shows `GripVertical` handle + name + `editor_type` badge + remove button.
- Save flow:
  - **New pack:** `createPack(payload)` → loop `addPackItem(savedId, m.id, m.editor_type, i)` for each queued member
  - **Existing pack:** `updatePack(packId, payload)` → `reorderPackItems(packId, orderedItems)` to flush any local reorder
  - Add/remove for existing packs fire immediate API calls (`addPackItem` / `removePackItem`)
- Save disabled until `form.name.trim()` is non-empty (spoofing guard; STRIDE T-173-09-04)

### `src/App.jsx` — 4 surgical additions

| # | Location (line)      | What                                                                              |
| - | -------------------- | --------------------------------------------------------------------------------- |
| 1 | Lazy imports (~121)  | `const AdminStarterPacksPage = lazy(() => import('./pages/Admin/AdminStarterPacksPage'));` |
| 2 | pageMap (~578)       | `'admin-starter-packs': <Suspense ...><AdminStarterPacksPage showToast={showToast} onNavigate={setCurrentPage} /></Suspense>` |
| 3 | adminToolPages (~672) | Appended `'admin-starter-packs'` to the array — **Pitfall 6** avoided (super_admin keeps sidebar) |
| 4 | Nav effect (~175)    | New `useEffect` listening for `test:setCurrentPage` CustomEvent, guarded by `import.meta.env.MODE !== 'test' && !import.meta.env.VITE_E2E_TEST_MODE` — zero runtime cost in production builds (B-3 fix) |

**Grep-verified:** `grep -c "admin-starter-packs" src/App.jsx` → `3` (lazy import line counts the component name, not the string key, so the string appears in pageMap + adminToolPages + test-listener comment). `grep -c "AdminStarterPacksPage" src/App.jsx` → `2` (lazy import + pageMap usage).

### `playwright.config.js` — dev-server env bridge

Added `env: { ...process.env, VITE_E2E_TEST_MODE: '1' }` to the `webServer` block. Without this, Plan 10's `admin-starter-packs.spec.js` cannot use the `test:setCurrentPage` escape hatch to reach the route. Production `vite build` runs retain `MODE === 'production'` and `VITE_E2E_TEST_MODE` undefined, so the test-mode listener remains unregistered.

## Pitfall 6 compliance check

Per RESEARCH's App.jsx 3-location trap + parallel-executor PITFALL 6:

```text
$ grep -c "admin-starter-packs" src/App.jsx
3

$ grep -n "admin-starter-packs" src/App.jsx
176:  // E2E specs use: page.evaluate(() => window.dispatchEvent(new CustomEvent('test:setCurrentPage', { detail: 'admin-starter-packs' })))
578:    'admin-starter-packs': <Suspense fallback={<PageLoader />}><AdminStarterPacksPage showToast={showToast} onNavigate={setCurrentPage} /></Suspense>,
672:    'status', 'ops-console', 'tenant-admin', 'feature-flags', 'demo-tools', 'clients', 'admin-templates', 'admin-starter-packs'
```

All three required sites (pageMap line 578, adminToolPages line 672, lazy import at line 121 — plus the documentation comment inside the test-mode listener at line 176) are present. super_admin retains the sidebar on the new route.

## Verification

- **Unit tests:** 9/9 passing in `tests/unit/pages/Admin/AdminStarterPacksPage.test.jsx` — covers RED→GREEN lifecycle for list render, `fetchStarterPacks({activeOnly:false})`, "New pack" opens editor in `new` mode, Toggle Active calls `updatePack` with inverted flag, UI-SPEC verbatim delete confirmation, `deletePack` fires on confirm, dismisses on "Keep pack"
- **Build:** `npm run build` exits 0; `dist/assets/AdminStarterPacksPage-<hash>.js` emitted (code-splitting confirms lazy import works)
- **Live verification:** deferred to Plan 10 per plan's `<verification>` block. That plan will add the E2E spec, mount the page via `test:setCurrentPage`, and confirm the super_admin navigation path end-to-end.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Button variant `destructive` does not exist in the design system**
- **Found during:** Task 1 GREEN implementation (Button.jsx inspection)
- **Issue:** UI-SPEC `§Copywriting` and the plan's skeleton both specify `variant="destructive"` for the Delete-pack confirm button, but the design system's `Button` component only ships `primary|secondary|ghost|danger` variants (see `src/design-system/components/Button.jsx` lines 18-22). Using `variant="destructive"` would render an unstyled Button (no matching variant → fall-through to default styling).
- **Fix:** Used `variant="danger"` — the existing destructive-red variant in the design system. Styling intent ("destructive" red action button) is preserved; only the prop name differs from the UI-SPEC text.
- **Files modified:** `src/pages/Admin/AdminStarterPacksPage.jsx`
- **Commit:** `d0777afa`
- **Implication for UI-SPEC:** Either update UI-SPEC to say `variant="danger"`, or add a `destructive` alias to the Button component in a future phase. Did NOT modify the design system in this plan to keep the blast radius surgical.

### Added (beyond plan's explicit instructions)

**1. `playwright.config.js` — added `webServer.env: { ...process.env, VITE_E2E_TEST_MODE: '1' }`**
- **Why:** The plan's Task 2 action text explicitly flags that "If `VITE_E2E_TEST_MODE` is not currently set in the project's Playwright config, the executor MUST add it". A grep confirmed no prior usage of `VITE_E2E_TEST_MODE` in the repo. Added the single line to the existing `webServer` block.
- **Blast radius:** Only the dev server spawned by Playwright sees the flag; production vite builds are untouched.

## Known Stubs

**Drag-reorder UX (decorative-only in v1):** `GripVertical` icon is rendered on each member row inside `PackEditorPanel`, but no HTML5 `dragstart`/`dragover`/`drop` handlers are wired. Members are added to the end of the list via the picker and removed individually. The `reorderPackItems` API IS called on save, so any local ordering changes (via a future drag hook) will persist. Plan 10 or a subsequent phase can add the drag wiring.

## Pointer for Plan 10

Plan 10 is the Wave-6 live E2E + final verification pass. It needs:

1. An E2E spec at `tests/e2e/admin-starter-packs.spec.js` that:
   - Authenticates as a super_admin
   - Uses `page.evaluate(() => window.dispatchEvent(new CustomEvent('test:setCurrentPage', { detail: 'admin-starter-packs' })))` to navigate (since SuperAdminDashboardPage admin-tools grid is hardcoded and intentionally not modified by this phase)
   - Validates table render, "New pack" opens the editor, delete confirmation copy is verbatim, delete fires `deletePack`, toggle-active fires `updatePack`
2. A sidebar link (or explicit navigation item) IF the product decides the CustomEvent escape hatch is only acceptable for tests — the current wiring makes the route reachable, but day-to-day super_admin navigation still needs a surface (out of scope for Plan 10, but worth flagging).

## Self-Check: PASSED

- [x] `src/pages/Admin/AdminStarterPacksPage.jsx` — FOUND (236 lines, under the 260-line ceiling)
- [x] `src/pages/Admin/PackEditorPanel.jsx` — FOUND (352 lines)
- [x] `tests/unit/pages/Admin/AdminStarterPacksPage.test.jsx` — FOUND (9 tests passing)
- [x] `src/App.jsx` modified — `grep -c admin-starter-packs src/App.jsx` returns `3`
- [x] `playwright.config.js` modified — `webServer.env.VITE_E2E_TEST_MODE=1` present
- [x] Commit `7b3bbf63` (RED test) — FOUND in git log
- [x] Commit `d0777afa` (GREEN impl) — FOUND in git log
- [x] Commit `9eb7ecee` (Task 2 — App.jsx + playwright) — FOUND in git log
- [x] Build green: `npm run build` exits 0; `dist/assets/AdminStarterPacksPage-*.js` emitted
