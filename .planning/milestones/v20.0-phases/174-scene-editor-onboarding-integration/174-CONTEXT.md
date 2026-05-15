# Phase 174: Scene Editor + Onboarding Integration - Context

**Gathered:** 2026-04-26
**Status:** Ready for planning

<domain>
## Phase Boundary

Wire the Phase 173 starter-packs feature and the modernized template gallery (Phases 171–173) into two **new entry points**:

1. **Scene editor → gallery round-trip (TEDR-01..03):** A "Browse Templates" CTA in the SVG/Polotno scene editor topbar opens the gallery in `editorReturn` mode (URL flag). In this mode the gallery shows "Use Template" as the primary card/preview-modal CTA. Selecting a template **overwrites the active slide's `design_json`** in the origin scene, then navigates the user back to the same scene editor — no scene proliferation, no data loss outside the active slide. Polotno templates are filtered out in `editorReturn` mode (cross-editor-type apply is unsupported per Phase 172 D-16).
2. **Onboarding starter-pack step + first-visit gallery tour (TONB-01..04):** A new `starter_pack` step is inserted into `ONBOARDING_STEPS` between `logo` and `first_media`. The step embeds a top-N pack-card grid inside the existing `OnboardingWizard` modal; selecting a pack runs the existing `applyStarterPack` RPC (Phase 173 D-07) and auto-advances. Onboarding tracks the new column `completed_starter_pack`. On the user's first visit to `TemplateGalleryPage` thereafter, a driver.js tour highlights filter chips, search, a template card, and the apply CTA, then marks `completed_gallery_tour=TRUE` so it never re-appears.

**Not in this phase:**
- Polotno round-trip in editorReturn mode (filtered out for v20.0; Phase 172 D-16 deferral upheld)
- New template content / SVG validation gate / thumbnail pipeline (Phase 175)
- Pack convergence with legacy `content_templates` onboarding packs (deferred indefinitely per Phase 173 D-02)
- Tour replay / "Show me around" header button (deferred — single-shot tour is sufficient per ROADMAP SC #5)
- Tri-state ENUM for `completed_starter_pack`; we use a single boolean + the existing `onboarding_progress.skipped_at` to disambiguate chosen vs skipped vs not-reached
- Recording *which* pack was applied (`starter_pack_applied_id`) — analytics-only, not needed for v20.0 acceptance

</domain>

<decisions>
## Implementation Decisions

### Editor Return Apply Semantics

- **D-01:** **"Use Template" overwrites the active slide's `design_json`/`svgContent` only.** Other slides in the origin scene are untouched. ROADMAP SC #1 ("return to the same scene with the chosen template applied — with no data loss to existing scene work") maps to this literally: "active slide" is the unit being replaced, "scene work" outside that slide is preserved. A confirmation dialog ("Replace the current slide with this template?") is shown only when the active slide's `design_json` differs from the editor's default-empty design (i.e. user has actual edits). Default-empty slides are overwritten silently. Planner picks the exact "is this slide non-default" predicate (recommended: deep-equal against `getDefaultDesign()` from `sceneDesignService`).

- **D-02:** **Polotno templates are hidden in `editorReturn` mode.** When `?editorReturn=1` is present, `TemplateGalleryPage` filters `gallery_templates` rows to `editor_type='svg'` only. The "Use Template" CTA is never offered for polotno entries — they don't appear at all. Rationale: SceneEditorPage cannot render Polotno `design_json` (Phase 172 D-16 pre-existing gap), so applying one would silently break SC #1's no-data-loss guarantee. v20.1+ may revisit if SceneEditorPage gains polotno render support.

- **D-03:** **"Browse Templates" entry point lives in the SceneEditorPage topbar action cluster.** Add a new `<Button variant="ghost" size="sm">` next to the AI panel toggle (`src/pages/SceneEditorPage.jsx:527`). Icon: `LayoutTemplate` from lucide-react. Always visible (not gated on slide state). Clicking it navigates to the gallery via `onNavigate('templates')` with the editorReturn URL params attached (D-04). Planner picks exact button copy ("Browse Templates" recommended; "Templates" if the topbar feels crowded).

- **D-04:** **URL contract: `?editorReturn=1&returnSceneId=<sceneId>`.** Both query params are required to enter editorReturn mode. `TemplateGalleryPage` reads them via the existing `useSearchParams()` hook (Phase 171 D-10) to:
  - Flip `editor_type` filter to svg-only (D-02)
  - Swap the card/preview-modal CTA from "Apply" to "Use Template"
  - Hide the StarterPacksStrip in this mode (packs apply N templates; editorReturn applies one to a target slide — incompatible)
  - Hide the Favorites filter chip in this mode (optional polish — planner decides; recommended: keep favorites visible, they're useful for "find the template I like")
  After Use Template apply succeeds, navigate to `scene-editor-${returnSceneId}` (the existing pageMap key — see `src/App.jsx:917-1020` for the `scene-editor-<id>` page-key pattern). No template payload travels in the URL — strictly sceneId-driven (Phase 172 D-12 contract upheld).

- **D-05:** **New atomic RPC `apply_template_to_active_slide(p_scene_id UUID, p_slide_id UUID, p_template_id UUID, p_editor_type TEXT) RETURNS UUID`** (returns the updated slide id). Single PL/pgSQL transaction. Body:
  - Auth preamble (Phase 172.1 D-10): `auth.uid() IS NOT NULL` else raise.
  - Verify scene ownership: `scenes.owner_id = auth.uid()` (or super_admin bypass).
  - Verify template access via `gallery_templates` VIEW SELECT predicate (RLS already filters; the inline lookup raises if not visible).
  - Read `svg_templates.svg_content` for the target template (only `editor_type='svg'` is supported — see D-02).
  - `UPDATE scene_slides SET design_json = jsonb_set(design_json, '{svgContent}', to_jsonb($svg_content), true), updated_at = NOW() WHERE id = p_slide_id AND scene_id = p_scene_id`.
  - Return `p_slide_id`. All-or-nothing — same atomicity contract as Phase 172 D-09 / 172.1 D-02.
  Migration number: next available after 173 (likely 174). Idempotent guard via `CREATE OR REPLACE FUNCTION`.

- **D-06:** **Client-side dispatch in `marketplaceService.js`** — add `applyTemplateToActiveSlide(sceneId, slideId, templateId, editorType)` as a thin RPC wrapper (mirrors `applyStarterPack`'s pattern at `src/services/marketplaceService.js:632`). Hook into `TemplatePreviewModal`'s Apply branch via a new `mode` prop (`'new-scene'` default vs `'editor-return'`). When `mode='editor-return'`, the modal's Apply CTA reads the active sceneId/slideId from the URL params and the modal owner (TemplateGalleryPage) and calls the new wrapper instead of the existing `clone_template_with_customization` path.

### Onboarding Starter-Pack Step

- **D-07:** **Step position:** insert `'starter_pack'` between `'logo'` and `'first_media'` in `ONBOARDING_STEPS` (`src/services/onboardingService.js:30`). Final order: `welcome → logo → starter_pack → first_media → first_playlist → first_screen → screen_pairing` (7 steps). Rationale: lands after the user has uploaded a logo (so packs feel personal) but before they create solo media — packs ARE their first media, so this step naturally satisfies `first_media` for many users (planner may chain auto-completion of `first_media` from a pack apply, or leave them independent — recommended: leave independent so the wizard reads cleanly, even if redundant).

- **D-08:** **Step UI is an embedded grid inside the existing `OnboardingWizard` modal.** New `StepContent` branch (`src/components/OnboardingWizard.jsx:367+`) renders 6 pack cards in a vertical grid using the Phase 173 `PackCard` component. Modal chrome (header, progress bar, footer Skip / Continue) reused unchanged. **Do NOT** embed `StarterPacksStrip` (it's tuned for the gallery toolbar context). Card-click bypasses the gallery's `PackPreviewModal` — onboarding flow is "pick → apply → advance" without the preview detour.

- **D-09:** **Pack filtering: top 6 by display_order ASC, name ASC.** No industry filter; no `profiles.business_type` lookup. Reuses Phase 173's `fetchStarterPacks({ activeOnly: true })` and slices `slice(0, 6)` client-side. Rationale: `business_type` is unreliable per project notes; TPER-F1 personalization is explicitly deferred. Admins control onboarding-step ordering via the existing `display_order` they already set in `AdminStarterPacksPage`. Planner finalizes the limit (4–8 acceptable; 6 fits a 2-row × 3-col grid).

- **D-10:** **Post-apply behavior:** show a success toast ("Added N templates from <pack name>"), set `completed_starter_pack=TRUE` via `update_onboarding_step('starter_pack', true)`, then auto-advance to the next step (`first_media`). No "View scenes" action (that's the gallery's success path; in onboarding the user is mid-wizard). On RPC failure: inline error toast inside the step body, "Try again" affordance, no auto-advance — the user can retry or skip.

- **D-11:** **Skip button copy is unchanged ("Skip for now").** When the user clicks Skip on this specific step (vs the wizard-level skip), the step calls `update_onboarding_step('starter_pack', true)` (marks complete-without-apply) and advances. The wizard-level "Skip for now" button (which calls `skip_onboarding()` and writes `skipped_at`) is preserved on this step too — same dual-skip pattern the existing 6 steps already have.

### `completed_starter_pack` Tracking

- **D-12:** **Schema change: add `completed_starter_pack BOOLEAN DEFAULT FALSE` to `onboarding_progress`.** Single column, mirrors the existing 6 step columns (Phase 174's first migration, additive, idempotent: `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`). No backfill required — existing rows default to FALSE, which correctly maps to "not reached" for users mid-onboarding. No DOWN migration (project convention).

- **D-13:** **Tri-state from ROADMAP SC #4 (chosen / skipped / not-reached) is encoded as:**
  - `chosen` = `completed_starter_pack=TRUE AND skipped_at IS NULL` (and ideally a row exists in `apply_starter_pack`'s audit trail — Phase 173 doesn't write one explicitly, but the user's scenes table will have new rows with template_id provenance).
  - `skipped` = `completed_starter_pack=TRUE AND` (`skipped_at IS NOT NULL` OR no scenes were created in the time window between step entry and the FALSE→TRUE transition). Step-local skip click flips the boolean without applying a pack; wizard-level skip flips both `skipped_at` and the column.
  - `not_reached` = `completed_starter_pack=FALSE` (user hasn't reached the step yet, including all rows that pre-existed migration 174).
  Planner finalizes whether to add a `starter_pack_applied_at` timestamp for clean disambiguation if SC #4 demands hard guarantees. Recommended: skip the timestamp unless test/UAT discovers ambiguity — keeps the schema lean.

- **D-14:** **All three onboarding RPCs extended idempotently in the same migration via `CREATE OR REPLACE FUNCTION`:**
  - `get_onboarding_progress()` — extend the SELECT/return shape to include `completed_starter_pack`.
  - `update_onboarding_step(p_step TEXT, p_completed BOOLEAN)` — extend the validator to accept `'starter_pack'` as a valid step name and dispatch to the new column. The existing dynamic SQL (`'UPDATE public.onboarding_progress SET %I = $1, ...'`, line 592 of migration 034) handles the column write generically, so the only change is the step-name allowlist.
  - `skip_onboarding()` — no body change required; the wizard-level skip writes `skipped_at` + `is_complete=TRUE` in one shot. The new column inherits whatever default is on the row (FALSE), which correctly represents "not reached" for a wizard skipped at step 1.
  Migration is additive + `CREATE OR REPLACE` (idempotent), no DROP/CREATE.

- **D-15:** **`is_complete` rollup includes the new step.** The wizard's `is_complete` boolean (computed in `get_onboarding_progress` and consumed in `getNextStep` / `getProgressPercent`) now requires all **7** booleans TRUE. The wizard's progress bar denominator becomes 7 (`ONBOARDING_STEPS.length` already drives this — the array change in D-07 is the only client edit). **Skippability** is honored at the UI layer (D-11) — clicking Skip flips the column TRUE without applying a pack. No DB-level "optional step" concept; this matches every other step in the wizard.

### driver.js Tour (TONB-04)

- **D-16:** **Tour state lives in `onboarding_progress.completed_gallery_tour BOOLEAN DEFAULT FALSE`.** Same migration as D-12 adds this column. Per-user, durable across browsers/devices, single source of truth alongside the rest of onboarding state. **Resolves the STATE blocker** ("Phase 174 verify before planning: driver.js tour state persistence") — the integration with `onboardingService` Supabase progress tracking is a column on the same table, read/written via the existing RPC pattern.

- **D-17:** **Trigger: first `TemplateGalleryPage` mount where `completed_gallery_tour=FALSE`.** On mount, fetch the column (extend `get_onboarding_progress` return shape per D-14, or add a thin RPC `should_show_gallery_tour()` if the planner prefers a focused read — recommended: extend the existing RPC for parity). If FALSE, run the tour. On any tour exit (complete, X-close, skip-button), call a new mutation that sets `completed_gallery_tour=TRUE`. No dependency on `is_complete=TRUE` — the tour can fire even for users who arrive at the gallery mid-onboarding (rare; ROADMAP wording "after onboarding" is approximated, not strict). Avoids a coupled predicate and the "I bailed out of onboarding but still want the tour" failure mode.

- **D-18:** **Tour steps (4 stops, ROADMAP SC #5):**
  1. **Filter chips / sidebar** — anchor: the filter bar container in `TemplateGalleryPage`. Copy: "Filter by category, orientation, or favorites."
  2. **Search input** — anchor: the `SearchBar` component. Copy: "Search the catalog by name or tag."
  3. **Template card** — anchor: the first visible `TemplateCard` (planner picks selector — recommended: a `data-tour` attribute on the first card so the tour is robust to skeleton/loading states).
  4. **Apply CTA** — recommended: **static pointer at where the apply button will appear**, with copy "Click any template to preview and apply." Do NOT auto-open the preview modal during the tour — that mixes tour UI with modal UI and complicates focus management. Planner finalizes (auto-open is acceptable if step 4 explicitly closes any open tour-overlay first).
  Planner adds `data-tour` attributes to the four target nodes during implementation.

- **D-19:** **Dismissal semantics:** any tour exit (complete, X-close, skip-button, Escape) marks `completed_gallery_tour=TRUE`. The tour never re-appears for that user. No "Don't show again" checkbox (single-shot is sufficient per SC #5 wording). No replay button in the gallery header for v20.0 (deferred — see deferred section).

### Claude's Discretion

- **driver.js install version & integration shape:** library is not yet in `package.json`. Planner picks `driver.js@^1.x` (latest stable), npm-installs it, decides whether to wrap it in a small `useGalleryTour()` hook (recommended) or call the imperative API directly inside `TemplateGalleryPage`'s mount effect.
- **Migration number:** next available after 173. Recommended: a single migration `174_phase_174_onboarding_columns_and_template_apply_rpc.sql` that does all of D-05, D-12, D-14, D-16 in one file (additive, idempotent). Planner may split if size/clarity warrants.
- **Confirmation dialog wording for D-01:** Recommended: "Replace this slide with [template name]? Your current edits will be lost." with destructive-styled "Replace" button + "Cancel".
- **`data-tour` selector strategy** — DOM attribute vs ref vs CSS-class selector. Recommended: `data-tour="filter-bar" | "search-input" | "first-card" | "apply-cta"` attributes; driver.js picks them up via `element: '[data-tour="filter-bar"]'`.
- **Mobile/narrow-screen tour behavior** — driver.js handles small viewports adequately; planner tests the 4-step flow at <=768px and adjusts copy if any anchor is hidden behind a collapsed nav.
- **Onboarding step icon** — planner picks a lucide icon for the new `starter_pack` step in `STEP_ICONS` (recommended: `Package` or `LayoutTemplate`).
- **Whether applying a starter pack auto-completes `first_media`** — recommended: leave them independent; the wizard reads more honest if user still sees "Add Your First Media" after applying a pack (their pack templates are scenes, not media assets). Planner may revisit if UAT finds it confusing.
- **"Use Template" CTA visual treatment** — distinct copy, but reuse the existing `<Button variant="primary">` shape from `TemplatePreviewModal`. Phase 171 disallows divergent button styles.

### Folded Todos

None — todo cross-reference returned no matches for Phase 174 scope.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements & Roadmap
- `.planning/REQUIREMENTS.md` §Editor Return (TEDR-01..03) + §Onboarding Integration (TONB-01..04) — acceptance criteria
- `.planning/ROADMAP.md` §Phase 174 — goal, 5 success criteria, dependencies (Phase 172, Phase 173)
- `.planning/PROJECT.md` §Current Milestone v20.0 — milestone framing for "Adjacent surfaces: scene editor entry points back into gallery; onboarding integration with redesigned gallery"

### Prior Phase Context (decisions that carry forward)
- `.planning/phases/171-core-gallery-ui-redesign/171-CONTEXT.md` — flat-grid templates (D-01), URL-backed filter state via `useSearchParams()` (D-10), EmptyState pattern (D-12)
- `.planning/phases/172-preview-apply-flow/172-CONTEXT.md` — sceneId-only URL handoff (D-12), atomic-RPC pattern (D-09), dumb-persistor server contract (D-10), `?sceneId=` SVG editor branch (D-15), Polotno round-trip not supported (D-16), DOMPurify SVG boundary (D-17)
- `.planning/phases/172.1-fix-svg-apply-rpc/172.1-CONTEXT.md` — `clone_svg_template_to_scene` body and auth preamble (D-05, D-10) — blueprint for the new `apply_template_to_active_slide` RPC body
- `.planning/phases/173-starter-packs-favorites/173-CONTEXT.md` — `apply_starter_pack` RPC contract (D-07, D-08, D-09), `marketplaceService.applyStarterPack` wrapper (D-04), legacy onboarding packs left untouched (D-02), `PackCard` component shape (D-12)
- `.planning/research/PITFALLS.md` — Pitfall 4 (no sessionStorage handoff) — applies to editorReturn URL contract
- `.planning/STATE.md` §Blockers/Concerns — STATE blocker on driver.js tour persistence is resolved by D-16/D-17

### Database Schema (READ)
- `supabase/migrations/034_tenant_lifecycle_and_onboarding.sql` — `onboarding_progress` table schema (lines 38-89), `get_onboarding_progress` RPC (line 516), `update_onboarding_step` RPC (line 572), `skip_onboarding` RPC (line 644), grants (lines 730+)
- `supabase/migrations/167_gallery_templates_view_and_rls.sql` — `gallery_templates` VIEW + svg_templates RLS (used for the new RPC's template-access check)
- `supabase/migrations/170_clone_svg_template_to_scene.sql` — direct blueprint for the new `apply_template_to_active_slide` RPC body's svg-read branch
- `supabase/migrations/171_template_packs.sql`, `172_template_favorites.sql`, `173_apply_starter_pack.sql` — Phase 173 shipped surfaces, used unchanged by the onboarding step

### Source Files (READ / MODIFY)
- `src/pages/SceneEditorPage.jsx` (697 lines) — add "Browse Templates" topbar button at line ~527 next to AI panel toggle (D-03); navigate via `onNavigate('templates')` with editorReturn URL params attached (D-04)
- `src/pages/TemplateGalleryPage.jsx` — read `editorReturn` + `returnSceneId` query params (D-04); flip `editor_type` filter to svg-only (D-02); swap CTA to "Use Template"; hide StarterPacksStrip; navigate to `scene-editor-<returnSceneId>` after apply (D-04)
- `src/components/template-gallery/TemplatePreviewModal.jsx` — accept new `mode` prop ('new-scene' | 'editor-return'); dispatch Apply through `applyTemplateToActiveSlide` in editor-return mode (D-06)
- `src/services/marketplaceService.js` — add `applyTemplateToActiveSlide(sceneId, slideId, templateId, editorType)` thin RPC wrapper (D-06)
- `src/services/onboardingService.js` — extend `ONBOARDING_STEPS` with `starter_pack` entry between `logo` and `first_media` (D-07); extend `OnboardingProgress` typedef + `getOnboardingProgress` mapping + `getNextStep` + `getCompletedCount` to include `completedStarterPack` (D-15) and `completedGalleryTour` (D-16); add `markGalleryTourSeen()` mutation
- `src/components/OnboardingWizard.jsx` — add `STEP_ICONS.starter_pack` entry; new `StepContent` branch for the embedded pack grid (D-08); wire skip button to `update_onboarding_step('starter_pack', true)` (D-11)
- `src/components/template-gallery/PackCard.jsx` — reused unchanged in onboarding step (D-08)
- `src/services/sceneDesignService.js` — exports `getDefaultDesign()` used by D-01's "is the active slide non-default?" predicate

### New Files (CREATE)
- `src/hooks/useGalleryTour.js` — driver.js wrapper hook; reads `completed_gallery_tour`, runs the 4-step tour on mount when FALSE, writes TRUE on dismissal (D-16, D-17, D-18, D-19) — planner confirms file path
- New migration (planner picks number, likely 174) — adds `completed_starter_pack` + `completed_gallery_tour` columns to `onboarding_progress` (D-12, D-16); extends 3 RPCs idempotently via `CREATE OR REPLACE` (D-14); creates `apply_template_to_active_slide` RPC (D-05)

### Tests
- `tests/e2e/preview-apply.spec.js` (Phase 172 pattern) — mirror a new spec covering the editorReturn round-trip flow (TEDR-01..03)
- `tests/e2e/onboarding.spec.js` (likely exists from v2; verify) — extend to assert the new `starter_pack` step appears between `logo` and `first_media` and exercises both the apply path and the skip path (TONB-01..03)
- `tests/e2e/` — new spec for driver.js tour: assert the 4 anchors get highlighted on first visit, tour does not re-appear on second visit (TONB-04)
- `tests/integration/` — new spec for `apply_template_to_active_slide` RPC (atomicity, RLS, missing-template, polotno-rejection per D-02)
- `tests/unit/services/marketplaceService.test.js` — extend with `applyTemplateToActiveSlide` wrapper coverage
- `tests/unit/services/onboardingService.test.js` (verify exists) — extend `ONBOARDING_STEPS` length assertion to 7 (D-15) and assert `starter_pack` between `logo` and `first_media` (D-07)

### Design System
- `src/design-system/components/TemplateCard.jsx` — reused as gallery card (no changes for this phase; the CTA swap happens at the modal layer per D-06)
- `src/design-system/components/Button.jsx` — primary variant for "Use Template" CTA (no design changes)
- `src/design-system/index.js` — Toast helpers via `showToast` plumbing (already wired through `App.jsx → onShowToast`)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `applyStarterPack` in `marketplaceService.js:632` — Phase 173 RPC wrapper used unchanged by the onboarding step (D-08, D-10).
- `OnboardingWizard` (`src/components/OnboardingWizard.jsx`, 529 lines) — the modal chrome, progress bar, navigation, and skip plumbing all reused unchanged. Adding the starter-pack step is purely a `StepContent` switch-case branch + an entry in `ONBOARDING_STEPS`.
- `onboardingService.js` RPCs — `update_onboarding_step` already accepts arbitrary step names via dynamic SQL; the only change needed for D-14 is extending the step-name allowlist.
- `PackCard` (Phase 173 D-12) + `fetchStarterPacks` (Phase 173 D-04) — used in the onboarding step's embedded grid; no new fetch infrastructure.
- `TemplatePreviewModal` (Phase 172) — gains a `mode` prop to switch between Apply paths (D-06); no chrome/keyboard changes.
- `useSearchParams()` filter-state contract (Phase 171 D-10) — extended with `editorReturn=1` and `returnSceneId=<id>` (D-04). Same pattern as Phase 173's `favorites=1`.
- `clone_svg_template_to_scene` body (Phase 172.1) — direct blueprint for the svg-read branch of the new `apply_template_to_active_slide` RPC (D-05).

### Established Patterns
- Migrations are sequentially numbered, additive, idempotent (`CREATE TABLE IF NOT EXISTS`, `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`, `CREATE OR REPLACE FUNCTION`), no DOWN. The Phase 174 migration follows this verbatim.
- RPCs are `SECURITY DEFINER`, `SET search_path = public`, `GRANT EXECUTE ... TO authenticated`. The new `apply_template_to_active_slide` mirrors this.
- Services are pure JS modules with named async exports, thin supabase wrappers that throw on error. `applyTemplateToActiveSlide` follows.
- Pages consume `showToast` and `onNavigate` from `App.jsx` props — both editorReturn and the onboarding step use this plumbing for toasts and routing.
- Page-key routing uses `scene-editor-<id>` (App.jsx:917-1020) — editorReturn return-trip targets this exact key.
- The wizard's `STEP_ICONS` map (`src/components/OnboardingWizard.jsx:41`) is the single point where step icons are declared — adding `starter_pack` requires one entry there.

### Integration Points
- `SceneEditorPage` topbar (`src/pages/SceneEditorPage.jsx:527`) — new "Browse Templates" button hooks `onNavigate('templates')` with `?editorReturn=1&returnSceneId=<sceneId>` query string. App.jsx already consumes `setCurrentPage` for navigation, but the URL params need to flow through the existing `useSearchParams` consumer in TemplateGalleryPage — planner verifies that the App.jsx page-key router doesn't strip query params (recommended: pass via `setCurrentPage('templates?editorReturn=1&returnSceneId=' + sceneId)` and confirm App.jsx parses, OR transition the pageMap to react-router proper for this route).
- `OnboardingWizard.jsx:130-142` — `currentStep.navigateTo` mechanism; the new `starter_pack` step has no `navigateTo` (it stays inside the wizard) — same shape as `welcome`.
- `marketplaceService.js` — hosts the new client wrapper next to `applyStarterPack`.
- New migration extends `onboarding_progress` schema and three RPCs idempotently; adds the `apply_template_to_active_slide` RPC.

### Creative Options Enabled
- Because the new `apply_template_to_active_slide` RPC mutates an existing `scene_slides.design_json` (vs Phase 172's clone-into-new-scene), it is the **first non-cloning** apply RPC. The pattern is reusable for any future "apply X to existing slot" feature (e.g. swap one widget for another).
- Adding `completed_gallery_tour` as a column on `onboarding_progress` (vs a new table) opens the door to other gallery first-visit affordances (recents tour, favorites tour) using the same column-per-affordance pattern. v20.0 uses one column.
- The editor-return URL contract is symmetric with Phase 173's filter URL params — both extend `useSearchParams()` without restructuring. Future "open gallery in mode X" features can follow the same flag-based contract.

</code_context>

<specifics>
## Specific Ideas

- User invoked manually on 2026-04-26 after Phase 173 completion (308f84e0). No `--chain`, `--auto`, or `--all` — fully interactive 4-area session.
- User selected the recommended option for **all 12 of 12** primary questions (4 areas × ~3 questions each), plus chose all 4 tour-step targets in the multi-select. The decisions in this CONTEXT reflect the researcher/planner-suggested defaults — they are explicitly endorsed, not contrarian picks.
- ROADMAP SC #1 ("no data loss to existing scene work") is honored at the active-slide level — non-active slides are untouched. This is the spirit of the requirement: a slide-level apply is the natural granularity for a slide-based editor.
- ROADMAP SC #5 wording "on first visit … after onboarding" is approximated by "first visit, ever" (D-17). The user explicitly opted out of the strict-after-onboarding gate to avoid the "bailed out of onboarding but want the tour" edge case.
- STATE blocker "Phase 174 verify before planning: driver.js tour state persistence" is fully resolved by D-16/D-17 — column on `onboarding_progress`, read/written via the same `get_onboarding_progress` / `update_*` RPC pattern used by every other onboarding step.

</specifics>

<deferred>
## Deferred Ideas

- **Polotno round-trip in editorReturn mode** — D-02 filters polotno templates out. Re-enabling requires SceneEditorPage to mount PolotnoEditor (Phase 172 D-16 pre-existing gap). v20.1 candidate.
- **`starter_pack_applied_id` audit column on `onboarding_progress`** — recording which pack drove onboarding completion. Useful for analytics; not needed for v20.0 acceptance. Add when pack-conversion analytics are wanted.
- **Tri-state ENUM `starter_pack_status`** — D-13 uses BOOLEAN + `skipped_at` inference. If UAT finds the inference fragile, swap to a dedicated ENUM column in a v20.1 migration.
- **Tour replay / "Show me around" button** — D-19 ships single-shot only. Replay button + `last_seen_at` timestamp can land later if users ask.
- **Tour for non-onboarded users** — D-17 fires for any user with `completed_gallery_tour=FALSE`, including users who pre-existed migration 174. They get the tour on their next gallery visit. This is intentional (back-compat polish for existing tenants) but planner should call it out in the SUMMARY.
- **Auto-completing `first_media` from a starter-pack apply** — D-09 keeps the steps independent. If UAT shows confusion, link them in v20.1.
- **Mobile-first design for the editor-return CTA** — D-03 puts the button in the topbar. If narrow screens crowd the topbar, planner may move it to a more cramped affordance (overflow menu) — out of scope for v20.0 unless UAT pushes back.
- **Pack convergence with legacy `content_templates` onboarding packs** — Phase 173 D-02 deferral upheld. Future phase only if product wants a single "pack" abstraction.

### Reviewed Todos (not folded)
None reviewed — todo cross-reference returned no matches.

</deferred>

---

*Phase: 174-scene-editor-onboarding-integration*
*Context gathered: 2026-04-26*
