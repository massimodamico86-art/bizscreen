---
phase: 172-preview-apply-flow
plan: 06
subsystem: wiring
tags: [wiring, integration, dead-code-removal, session-storage, url-params, scene-id, tprv-01, tprv-04, tprv-06]

# Dependency graph
requires:
  - phase: 172-preview-apply-flow
    plan: 03
    provides: "src/services/templateApplyService.js — applyTemplate + editorRouteFor"
  - phase: 172-preview-apply-flow
    plan: 05
    provides: "src/components/template-gallery/TemplatePreviewModal.jsx — split-view modal w/ open/templates/initialIndex/onClose/onNavigate contract"
  - phase: 172-preview-apply-flow
    plan: 02
    provides: "supabase/migrations/168_clone_template_with_customization.sql (applied) — atomic RPC that Plan 03 calls"
provides:
  - "Gallery → modal wiring: TemplateCard.onSelect opens TemplatePreviewModal at the correct index (TPRV-01 reachable)"
  - "SvgEditorPage ?sceneId= load branch (D-15) — scene fetched + first slide.design_json.svgContent → data URL → FabricSvgEditor; closes the editor-load path for the Apply → svg-editor?sceneId=<uuid> flow (TPRV-04)"
  - "Repo-wide TPRV-06 compliance: zero pendingTemplate readers in src/; sessionStorage template-handoff code permanently removed"
  - "Dead code removed: marketplaceService.installWithCustomization deleted (T-172-02 clone-then-patch race permanently closed at the language level)"
  - "Dead code removed: marketplaceService.installTemplateAsScene deleted (zero external callers confirmed across src/, tests/, scripts/, supabase/functions/)"
affects: [172-07]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Scene-by-id load branch in SvgEditorPage mirrors the existing urlDesignId branch — same cancelled-flag guard, same setEditorConfig shape, same effect structure"
    - "closure-over-map-index for modal open (previewState.index = i captured in .map((t, i) => onSelect))"
    - "dead-code audit idiom before deletion: `grep -rn <symbol> src/ tests/ scripts/ supabase/functions/` — only delete if zero callers outside the definition"

key-files:
  created: []
  modified:
    - path: "src/pages/TemplateGalleryPage.jsx"
      lines_delta: "+15 / -9"
      role: "Wires TemplatePreviewModal to TemplateCard.onSelect via previewState; mounts the modal in the content render branch with displayedTemplates/onNavigate/showToast props"
    - path: "src/pages/SvgEditorPage.jsx"
      lines_delta: "+38 / -41"
      role: "Adds ?sceneId= load branch (supabase.from('scenes') + .from('scene_slides')); deletes the sessionStorage('pendingTemplate') branch; updates parseQueryParams/destructure/console.log/useEffect dep array"
    - path: "src/services/marketplaceService.js"
      lines_delta: "+1 / -57"
      role: "Deletes installWithCustomization (29 lines) + installTemplateAsScene (15 lines) + INSTALL TEMPLATE banner. Export count 24 → 22"
    - path: "src/services/templateApplyService.js"
      lines_delta: "+1 / -1"
      role: "Updates a JSDoc comment that referenced the deleted installTemplateAsScene (doc drift cleanup, no behavior change)"
    - path: "tests/integration/preview-apply/rpc-atomicity.test.js"
      lines_delta: "+3 / -3"
      role: "Updates a doc comment that named the deleted installWithCustomization (doc drift cleanup, no assertion change)"

key-decisions:
  - "Deleted installTemplateAsScene along with installWithCustomization. Full-repo audit (src/ tests/ scripts/ supabase/functions/) returned ZERO external callers after installWithCustomization was removed. Per Plan 06 Task 3 acceptance criteria ('delete when ZERO external callers'), both dead-code functions are gone. The broader marketplaceService.js file retains 22 admin exports (template CRUD, categories, enterprise access, thumbnail/preview uploads) per the v19.0 'admin marketplaceService preserved for future reactivation' decision."
  - "Cleaned up 2 stale doc comments that named the deleted functions (one in templateApplyService.js, one in rpc-atomicity.test.js) — keeps future `grep installWithCustomization|installTemplateAsScene` runs clean for regression detection."
  - "Added `import { supabase } from '../supabase'` to SvgEditorPage.jsx — the new ?sceneId= branch needs it for `.from('scenes')` and `.from('scene_slides')`. Previously the file had no direct supabase dependency."
  - "Kept the Phase 171 urlDesignId branch untouched — it serves pre-existing svg_designs (not touched by the new Apply flow). D-15 explicitly retains the designId path."

patterns-established:
  - "Wiring-plan pattern: closure-over-map-index (map((t, i) => ...)) + parent-held open/initialIndex state is now the canonical way to launch a snapshot-capturing modal from a gallery. Any future gallery (starter-packs, favorites, etc.) should copy this shape."
  - "Scene-by-id URL branch template: supabase.from('scenes').select('id, name, settings').eq('id', sceneId).single() + supabase.from('scene_slides').select('design_json').eq('scene_id', sceneId).order('position').limit(1) — mirrors the RPC's write shape so there's no schema-drift between write and read."

requirements-completed: [TPRV-01, TPRV-04, TPRV-06]
# Notes:
#   - TPRV-01 (modal reachable from gallery): card clicks now open TemplatePreviewModal at the clicked index.
#   - TPRV-04 (routing end-to-end): Apply → editorRouteFor('svg-editor?sceneId=<uuid>') → SvgEditorPage loads the scene.
#   - TPRV-06 (sessionStorage removed): zero `pendingTemplate` hits in src/; only remaining hit is the Playwright E2E assertion that verifies absence.

# Metrics
duration: "~4 min"
tasks_completed: 4
tests_passing: "26 (8 unit svc + 4 integration + 14 modal/panel) — same as baseline, no regressions"
commits: 3
completed: 2026-04-21
---

# Phase 172 Plan 06: TemplateGalleryPage + SvgEditorPage Wiring + Dead Code Removal

**Gallery card clicks now open TemplatePreviewModal at the correct index; SvgEditorPage loads scenes via `?sceneId=<uuid>` (D-15); sessionStorage template-handoff branch permanently deleted (TPRV-06); marketplaceService.installWithCustomization + installTemplateAsScene (both zero-caller dead code) removed — 3 commits, 26/26 Phase 172 tests green.**

## Performance

- **Duration:** ~4 min
- **Tasks:** 4/4 (Task 4 was a verification gate, no commit needed)
- **Files modified:** 5 (3 core + 2 doc-drift cleanup)
- **Files created:** 0 (plan is purely integration)
- **Commits:** 3 (one per core task; Task 4 was verify-only)

## Commits

| Task | Subject                                                                                   | Commit     |
| ---- | ----------------------------------------------------------------------------------------- | ---------- |
| 1    | `feat(172-06): wire TemplatePreviewModal into TemplateGalleryPage`                        | `6444fdde` |
| 2    | `feat(172-06): add ?sceneId= load branch and remove sessionStorage branch from SvgEditorPage` | `2ce05994` |
| 3    | `refactor(172-06): delete installWithCustomization + installTemplateAsScene from marketplaceService` | `da29e78d` |

## Accomplishments

### Task 1 — TemplatePreviewModal wired into TemplateGalleryPage (commit `6444fdde`)

- Imported `TemplatePreviewModal` from `../components/template-gallery/TemplatePreviewModal`.
- Added `const [previewState, setPreviewState] = useState({ open: false, index: 0 })` alongside the other page state hooks.
- Changed `displayedTemplates.map((t) => ...)` → `.map((t, i) => ...)` so the TemplateCard's onSelect closure can capture the card's index in the filtered/sorted array.
- Replaced the Phase 171 placeholder `onSelect={() => { /* Phase 172 wires ... */ }}` with `onSelect={() => setPreviewState({ open: true, index: i })}`.
- Mounted `<TemplatePreviewModal open={previewState.open} templates={displayedTemplates} initialIndex={previewState.index} onClose={...} onNavigate={onNavigate} showToast={showToast} />` inside the existing content-render branch (right after `<StaggeredPageTransition>`).
- Removed the `void showToast;` + `void onNavigate;` no-op guards that Phase 171 used to reserve the props — both are now consumed by the modal.
- Preserved every other prop on the TemplateCard (`title`, `description`, `imageUrl`, `orientation`) and every surrounding piece (New/Popular badge overlays, StaggeredItem key).
- Did NOT touch the filter pipeline, displayedTemplates useMemo, Loading/Error/Zero-content/No-results branches — all Phase 171 behavior preserved.

**Acceptance criteria (all green):**
- `grep -q "import TemplatePreviewModal"` → OK
- `grep -Eq "\.map\(\(t,\s*i\)"` → OK
- `grep -q "setPreviewState.*open:\s*true"` → OK
- `grep -q "<TemplatePreviewModal"` → OK
- `grep -q "templates={displayedTemplates}"` → OK
- `grep -q "initialIndex={previewState.index}"` → OK
- Template-gallery unit tests after Task 1: 14/14 green (same as Plan 05 baseline)

### Task 2 — SvgEditorPage ?sceneId= branch + sessionStorage deletion (commit `2ce05994`)

Five logical edits applied:

1. **Import:** Added `import { supabase } from '../supabase';` — the file previously had no direct supabase dependency; the new scene-by-id branch requires `.from('scenes')` and `.from('scene_slides')`.
2. **parseQueryParams:** `templateId: params.get('templateId')` → `sceneId: params.get('sceneId')`. Preserved `designId: params.get('designId')`.
3. **Destructure:** `const { designId: urlDesignId, templateId: urlTemplateId } = queryParams;` → `const { designId: urlDesignId, sceneId: urlSceneId } = queryParams;`.
4. **console.log:** Updated the loadContent debug log to print `sceneId` in place of `templateId`.
5. **Effect body:**
   - DELETED the entire `else if (urlTemplateId) { ... }` block (lines 83-119) including the `sessionStorage.getItem('pendingTemplate')` + `sessionStorage.removeItem('pendingTemplate')` calls, the try/catch, the `templateData` JSON.parse, the btoa encoding, and its setEditorConfig call.
   - ADDED a new `else if (urlSceneId) { ... }` branch mirroring the `urlDesignId` branch shape:
     - `supabase.from('scenes').select('id, name, settings').eq('id', urlSceneId).single()` → scene row
     - `supabase.from('scene_slides').select('design_json').eq('scene_id', urlSceneId).order('position', { ascending: true }).limit(1)` → first slide
     - `slides?.[0]?.design_json?.svgContent` → base64 `data:image/svg+xml` URL via `btoa(unescape(encodeURIComponent(svgContent)))`
     - `setEditorConfig({ svgUrl, templateId: null, templateName: scene.name, initialJson: null, designId: null, canvasWidth: scene.settings?.width || 1920, canvasHeight: scene.settings?.height || 1080 })`
     - Honors the existing `cancelled` flag pattern used by the surrounding effect.
6. **useEffect dep array:** `[urlDesignId, urlTemplateId]` → `[urlDesignId, urlSceneId]`.

**Acceptance criteria (all green):**
- Negative `grep -q "urlTemplateId" src/pages/SvgEditorPage.jsx` → exits non-zero (fully removed)
- Negative `grep -q "sessionStorage.*pendingTemplate" src/pages/SvgEditorPage.jsx` → exits non-zero
- Negative `grep -q "'pendingTemplate'" src/pages/SvgEditorPage.jsx` → exits non-zero
- `grep -q "urlSceneId"` → OK
- `grep -q "params.get('sceneId')"` → OK
- `grep -q "\.from('scenes')"` → OK
- `grep -q "\.from('scene_slides')"` → OK
- `grep -Eq "design_json\??\.svgContent"` → OK
- `grep -q "btoa(unescape(encodeURIComponent("` → OK (data-URL pattern preserved)
- `grep -q "\[urlDesignId, urlSceneId\]"` → OK (dep array updated)
- Phase 172 tests after Task 2: 26/26 green

### Task 3 — Delete installWithCustomization + installTemplateAsScene from marketplaceService.js (commit `da29e78d`)

**Audit performed before deletion** (`grep -rn <symbol> src/ tests/ scripts/ supabase/functions/`):

| Symbol                      | Definition                                      | Internal callers                                                  | External callers                                                 |
|-----------------------------|-------------------------------------------------|-------------------------------------------------------------------|------------------------------------------------------------------|
| `installWithCustomization`  | `src/services/marketplaceService.js:209` (deleted) | NONE                                                              | NONE (1 stale doc comment in tests/integration/preview-apply/rpc-atomicity.test.js — rephrased) |
| `installTemplateAsScene`    | `src/services/marketplaceService.js:192` (deleted) | 1 call inside `installWithCustomization` line 211 (also deleted) | NONE (1 stale doc comment in src/services/templateApplyService.js:19 — rephrased) |

**Decision:** Delete both. Per Plan 06 Task 3 acceptance criteria: "If the grep returns ZERO hits outside marketplaceService.js → proceed to delete installTemplateAsScene too. No callers = no retention value." The v19.0 PROJECT.md note "admin marketplaceService preserved for future reactivation" applies to the FILE, not every individual symbol — the file still exports 22 admin functions (template CRUD, categories, enterprise access, thumbnail/preview uploads) that remain untouched.

**Deletions:**
- `installWithCustomization` function (29 lines, marketplaceService.js:209-237)
- `installTemplateAsScene` function (15 lines, marketplaceService.js:186-200)
- `// INSTALL TEMPLATE` banner comment (both functions under it are gone)
- Stale doc reference in `src/services/templateApplyService.js:19`
- Stale doc reference in `tests/integration/preview-apply/rpc-atomicity.test.js:98`

**Final export count:** 24 → 22 (verified via `grep -c "^export" src/services/marketplaceService.js`).

**Acceptance criteria (all green):**
- Negative `grep -q "installWithCustomization" src/services/marketplaceService.js` → exits non-zero
- Negative `grep -rq "installWithCustomization" src/ tests/ scripts/ supabase/functions/` → exits non-zero (zero callers anywhere)
- Negative `grep -q "installTemplateAsScene" src/services/marketplaceService.js` → exits non-zero
- Negative `grep -rq "installTemplateAsScene" src/ tests/ scripts/ supabase/functions/` → exits non-zero
- `grep -c "^export" src/services/marketplaceService.js` → 22
- Phase 172 tests still green after Task 3: 26/26

### Task 4 — Phase-wide sessionStorage sanity sweep (verification gate — no commit)

**`pendingTemplate` hits in src/:** 0 (acceptance: zero). 

**`pendingTemplate` hits in tests/:** 1 — `tests/e2e/preview-apply.spec.js:46` (`test.fixme('after Apply, sessionStorage has no pendingTemplate key — evaluated in page context (TPRV-06)', ...)`). This is a LEGITIMATE assertion-of-absence test authored by Plan 01 for the TPRV-06 E2E coverage — stays.

**All sessionStorage users in src/** (enumerated for transparency — none relate to template handoff):
- `src/Player.jsx` (lines 197, 199, 221, 2327) — display content cache (cacheKey-prefixed)
- `src/services/canvaService.js` (lines 65, 70, 90, 95, 132, 133) — Canva OAuth state + code verifier (canva_*)
- `src/services/webVitalsService.js` (lines 184, 187) — analytics session id (webvitals_session)
- `src/services/healthService.js` (line 327) — feature-detection only (`'sessionStorage' in window`), not a read/write
- `src/services/playerService.js` (line 687) — `sessionStorage.clear()` on player reset

**`grep -rn "sessionStorage" src/ | grep -i "template\|pendingTemplate"`:** 0 hits (template-related sessionStorage permanently gone).

**TPRV-06 verifiable at the repo level:** ✓

## Diff summary

```
 src/pages/SvgEditorPage.jsx                            | 79 +++++++++++-----------
 src/pages/TemplateGalleryPage.jsx                      | 24 ++++---
 src/services/marketplaceService.js                     | 57 ----------------
 src/services/templateApplyService.js                   |  2 +-
 tests/integration/preview-apply/rpc-atomicity.test.js  |  6 +-
 5 files changed, 58 insertions(+), 110 deletions(-)
```

Net -52 lines — classic dead-code-removal plan.

## installTemplateAsScene audit decision

**Decision: DELETED.** The orchestrator's prompt explicitly required: "grep across the entire repo (not just src/). If there are callers in admin pages, edge functions, supabase/functions/, scripts, or anywhere else — RETAIN it and note in SUMMARY. Only delete if ZERO external callers."

Audit command:
```
grep -rn "installTemplateAsScene" src/ tests/ scripts/ supabase/functions/
```

Pre-deletion results (before Task 3):
- `src/services/marketplaceService.js:192` — function definition (being removed)
- `src/services/marketplaceService.js:211` — caller inside `installWithCustomization` (being removed)
- `src/services/templateApplyService.js:19` — JSDoc comment (doc-drift, updated)

Post-deletion grep returns ZERO hits across src/, tests/, scripts/, supabase/functions/. No admin page, no edge function, no migration script, no test file references `installTemplateAsScene`. The `fetchMarketplaceTemplates` / admin CRUD surface (the reason marketplaceService.js was preserved in v19.0 quick task 260414-qc4) is fully untouched.

## Export count in src/services/marketplaceService.js (pre vs post)

- **Pre (Plan 05 baseline):** 24 exports
- **Post (Plan 06):** 22 exports (delta: -2 = `installWithCustomization` + `installTemplateAsScene`)
- Remaining 22 exports (all admin/preservation surface):
  - `TEMPLATE_TYPES`, `LICENSE_TIERS`, `LICENSE_LABELS` (3 constants)
  - `fetchMarketplaceTemplates`, `fetchFeaturedTemplates`, `fetchTemplatesByCategory`, `fetchTemplateDetail`, `fetchCategories` (5 fetch)
  - `verifyTemplatePermissions` (1 access)
  - `createTemplate`, `updateTemplate`, `deleteTemplate`, `fetchAdminTemplates` (4 admin CRUD)
  - `addTemplateSlide`, `updateTemplateSlide`, `deleteTemplateSlide`, `reorderTemplateSlides` (4 slide CRUD)
  - `grantEnterpriseAccess`, `revokeEnterpriseAccess`, `fetchEnterpriseAccess` (3 enterprise)
  - `uploadTemplateThumbnail`, `uploadTemplatePreview` (2 uploads)

## Final grep counts (acceptance gate)

| Grep                                                          | Result  | Required |
|---------------------------------------------------------------|---------|----------|
| `grep -rn "pendingTemplate" src/`                             | **0**   | 0        |
| `grep -rn "pendingTemplate" src/` (excl. *.test.*)            | **0**   | 0        |
| `grep -rn "installWithCustomization" src/ tests/ scripts/ supabase/functions/` | **0** | 0    |
| `grep -rn "installTemplateAsScene" src/ tests/ scripts/ supabase/functions/`   | **0** | 0    |
| `grep -rn "urlTemplateId" src/pages/SvgEditorPage.jsx`        | **0**   | 0        |
| `grep -n "TemplatePreviewModal" src/pages/TemplateGalleryPage.jsx` | **≥2** (import + mount) | ≥1 |
| `grep -n "urlSceneId" src/pages/SvgEditorPage.jsx`            | **4** (parseQueryParams destructure, console.log, branch body, dep array) | ≥3 |

## Deviations from Plan

**Minor deviation — rephrased 2 doc comments that were not in the plan's explicit `<action>` but were required to satisfy the acceptance criteria's negative greps.**

- `tests/integration/preview-apply/rpc-atomicity.test.js:98` — comment originally read `"(the deprecated non-atomic pattern in marketplaceService.installWithCustomization)"`. Rephrased to `"(the deprecated non-atomic clone-then-patch pattern removed in Phase 172 Plan 06)"`. Behavior unchanged; no assertion touched.
- `src/services/templateApplyService.js:19` — comment originally referenced `"(mirrors marketplaceService.installTemplateAsScene)"`. Rephrased to `"(standard supabase RPC idiom)"`. Behavior unchanged.

These rephrases were triggered by Task 3's strict acceptance criterion: `grep -rq "installWithCustomization" src/ ... tests/` must exit non-zero. Leaving the stale comments behind would have caused the acceptance check to fail, and more importantly would have left doc drift that future maintainers might interpret as a surviving caller. Classified as **Rule 3 (auto-fix blocking issue)** — without these two edits the acceptance criteria could not pass, since Task 4's verification gate is repo-wide.

Aside from those two doc-drift cleanups, **plan executed exactly as written**. No Rule 1/2 auto-fixes, no Rule 4 architectural checkpoints, no authentication gates.

## Authentication gates

**None.** This plan is pure client-side integration + dead-code removal. No auth flow touched. The new `?sceneId=` branch reads `scenes` and `scene_slides` via supabase — both tables inherit Phase 170's RLS policies (tenant_id filtering via auth.uid()). Users navigating to a sceneId they don't own will hit the existing error state, which is the expected behavior per T-172-06 `mitigate` disposition in the plan's threat model.

## Handoff to Plan 07 (E2E + docs wrap-up)

**Apply flow is now end-to-end traversable in the running app:**

1. User loads `/templates` (Phase 171 gallery)
2. Clicks a card → `TemplateCard.onSelect` fires
3. `previewState` flips to `{ open: true, index: <card-index> }`
4. `TemplatePreviewModal` snapshots `displayedTemplates` on the open-edge (Plan 05 Pitfall 7)
5. User optionally customizes via `QuickCustomizePanel` (Plan 04) or sees Polotno info block (Plan 05)
6. Clicks **Apply to new scene** → `applyTemplate(current, { customizedSvg })` (Plan 03 dispatcher)
7. SVG path: `clone_template_with_customization` RPC writes `scenes` + `scene_slides` atomically (Plan 02 migration 168)
8. `editorRouteFor(current, sceneId)` returns `'svg-editor?sceneId=<uuid>'`
9. `onNavigate(route)` → App routes to SvgEditorPage
10. `SvgEditorPage` reads `scenes` + `scene_slides[0].design_json.svgContent` → FabricSvgEditor mounts (NEW in Plan 06)

**E2E can now assert:**
- `await expect(page.evaluate(() => sessionStorage.getItem('pendingTemplate'))).toBeNull()` after Apply (TPRV-06)
- URL after Apply matches `/svg-editor?sceneId=<uuid>` for SVG templates
- URL after Apply matches `/scene-editor-<uuid>` for Polotno templates
- SvgEditorPage renders the customized SVG from design_json.svgContent (not from sessionStorage)

**Plan 01 scaffold status:** `tests/e2e/preview-apply.spec.js:46` has a `test.fixme` for the sessionStorage absence assertion — Plan 07 should un-fixme it and wire it into the full E2E flow.

## Known Stubs

**None.** Every surface element introduced by this plan is wired to real state:

- `previewState` → real useState-managed object
- `displayedTemplates` → real Phase 171 filter/sort pipeline
- `onSelect={() => setPreviewState(...)}` → real state setter
- `onNavigate` / `showToast` → real parent-provided props passed through to the modal
- `urlSceneId` branch → real supabase reads against real `scenes` + `scene_slides` tables
- `setEditorConfig` → real state setter consumed by the existing FabricSvgEditor render path

No placeholder text, no empty arrays flowing to UI, no "coming soon" copy, no TODO markers introduced.

## Threat Flags

**None.** No new threat surface outside the plan's `<threat_model>` register:

- **T-172-06 (EoP via ?sceneId= fetching scenes the user doesn't own):** Mitigated as planned via Supabase RLS on `scenes` and `scene_slides` (tenant_id filtering). The code does not attempt to bypass RLS — `supabase.from('scenes').eq('id', urlSceneId).single()` propagates the authenticated user's JWT, and any non-owned sceneId returns an error that the existing error state handles.
- **T-172-16 (Tampering via malicious sceneId URL param):** Mitigated by PostgREST query builder parameterization — no string concatenation in the SQL path.
- **T-172-17 (Info disclosure via design_json.svgContent rendered by FabricSvgEditor):** Mitigated by FabricSvgEditor's fabric.js-based SVG parsing (not dangerouslySetInnerHTML); Plan 03's DOMPurify is the primary gate pre-RPC.
- **T-172-18 (dead code revival):** Mitigated by hard deletion — `installWithCustomization` cannot be imported by any future caller because the symbol no longer exists in the module.
- **T-172-19 (direct URL navigation to svg-editor?sceneId=<own>):** Accepted per threat model (feature, not a threat).

## Self-Check: PASSED

- `test -f src/pages/TemplateGalleryPage.jsx` → FOUND (modified)
- `test -f src/pages/SvgEditorPage.jsx` → FOUND (modified)
- `test -f src/services/marketplaceService.js` → FOUND (modified — 2 functions removed, 22 exports remain)
- `test -f src/services/templateApplyService.js` → FOUND (modified — doc comment cleanup)
- `test -f tests/integration/preview-apply/rpc-atomicity.test.js` → FOUND (modified — doc comment cleanup)
- **Commit `6444fdde` (Task 1):** FOUND via `git log --oneline 841120b7..HEAD`
- **Commit `2ce05994` (Task 2):** FOUND via `git log --oneline 841120b7..HEAD`
- **Commit `da29e78d` (Task 3):** FOUND via `git log --oneline 841120b7..HEAD`
- **Branch file diff set matches plan:** only src/pages/SvgEditorPage.jsx, src/pages/TemplateGalleryPage.jsx, src/services/marketplaceService.js, src/services/templateApplyService.js (doc-drift), tests/integration/preview-apply/rpc-atomicity.test.js (doc-drift) — verified via `git diff --name-only 841120b7..HEAD`
- **No modifications to STATE.md / ROADMAP.md:** verified — neither file appears in `git diff --name-only 841120b7..HEAD`
- **All Task 1 grep acceptance criteria:** PASS
- **All Task 2 grep acceptance criteria:** PASS (negative + positive)
- **All Task 3 grep acceptance criteria:** PASS (negative + positive)
- **Task 4 verification gate:** PASS (0 pendingTemplate hits in src/, 1 legitimate E2E assertion in tests/)
- **Phase 172 tests:** 26/26 green (8 unit svc + 4 integration + 14 modal/panel) — no regressions from baseline
