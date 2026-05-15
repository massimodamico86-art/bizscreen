# Phase 173: Starter Packs + Favorites - Context

**Gathered:** 2026-04-22
**Status:** Ready for planning

<domain>
## Phase Boundary

Two parallel features land in the existing `TemplateGalleryPage` from Phase 171:

1. **Starter Packs** — curated bundles of existing `gallery_templates` (VIEW UNION of `svg_templates` + `template_library`) surfaced as pack cards in a dedicated strip at the top of the gallery, with a preview modal and one-click bulk Apply that creates N new scenes per pack (TPCK-01..04).
2. **Favorites** — per-user bookmarks on individual templates, togglable from the gallery card and from `TemplatePreviewModal`, persisted in Postgres, and filterable via a filter-bar toggle (TFAV-01..03).

Admin pack CRUD rides on the preserved `marketplaceService.js` (TPCK-03) via a new `AdminStarterPacksPage` route.

**Not in this phase:**
- Onboarding integration with starter packs (Phase 174, TONB-01..03)
- Scene-editor entry points (Phase 174)
- Driver.js tour on first gallery visit (Phase 174)
- Net-new template content, SVG validation gate, thumbnail pipeline (Phase 175)
- Any change to the legacy onboarding packs (`content_templates`, `apply_pack_template`, `autoBuildService`, `WelcomeModal`) — they keep working unchanged
- Customization during bulk Apply — the RPC writes raw SVG; users customize per-scene afterward

</domain>

<decisions>
## Implementation Decisions

### Pack Data Model

- **D-01:** Ship **two new tables** in a new migration: `template_packs` (pack metadata) and `template_pack_items` (pack → template junction). Both are additive; no DOWN migration; idempotent guards per the project convention (Phase 170/172 patterns).
  - `template_packs`: `id UUID PK`, `slug TEXT UNIQUE`, `name TEXT`, `description TEXT`, `industry TEXT`, `thumbnail_url TEXT NULL`, `display_order INT`, `is_active BOOLEAN DEFAULT TRUE`, `tenant_id UUID NULL` (NULL = global, non-NULL = per-tenant custom pack), `created_by UUID NULL`, `created_at`, `updated_at`.
  - `template_pack_items`: `pack_id UUID FK template_packs ON DELETE CASCADE`, `template_id UUID`, `editor_type TEXT CHECK editor_type IN ('svg','polotno')`, `position INT`, PRIMARY KEY `(pack_id, template_id, editor_type)`.
  - `template_id` is **polymorphic** — disambiguated by `editor_type` the same way `gallery_templates` VIEW does (Phase 170 D-03). `svg` rows point into `svg_templates.id`, `polotno` rows point into `template_library.id`. No SQL FK — Postgres cannot enforce a two-table FK; the bulk-Apply RPC enforces existence at apply time.

- **D-02:** **Legacy onboarding packs are left untouched.** `content_templates` (migration 023) + `apply_pack_template` RPC (migration 065) + `autoBuildService.js` + `WelcomeModal.jsx` continue to serve onboarding's business-type starter packs (`restaurant_starter_pack`, `salon_starter_pack`, etc.) without modification. Phase 173 packs are a distinct concept (curated bundles of gallery templates; not playlists/media). No seed data is migrated between the two. If convergence is ever desired, it is its own phase.

- **D-03:** **RLS:**
  - `template_packs` SELECT: `is_active = TRUE AND (tenant_id IS NULL OR tenant_id = auth.uid())` — mirrors the `svg_templates` SELECT RLS pattern (Phase 172.1 D-10) so global packs are visible to all authenticated users while tenant-owned packs stay isolated.
  - `template_packs` INSERT/UPDATE/DELETE: `profiles.role = 'super_admin'` (for global, tenant_id IS NULL) OR `tenant_id = auth.uid()` (for per-tenant custom packs). Planner/researcher to verify against the existing admin-role pattern in `template_library` policies.
  - `template_pack_items` follows parent-pack policy via join check.

### Pack Service Layer

- **D-04:** **Pack CRUD + fetch lives in `src/services/marketplaceService.js`** per TPCK-03. Add the following named exports alongside the existing marketplace functions:
  - `fetchStarterPacks({ activeOnly = true, tenantId = null })` — gallery read
  - `fetchPackDetail(packId)` — returns pack row + ordered member template rows (JOINed against `gallery_templates` so callers get full template metadata in one query)
  - `createPack(pack)`, `updatePack(packId, updates)`, `deletePack(packId)`
  - `addPackItem(packId, templateId, editorType, position)`, `removePackItem(packId, templateId)`, `reorderPackItems(packId, orderedTemplateIds)`
  - `applyStarterPack(packId)` — thin client wrapper over the bulk-Apply RPC (see D-07)
- **D-05:** Gallery-side read uses `fetchStarterPacks` directly from `marketplaceService.js`. `templateGalleryService.js` stays scoped to the single-entity gallery read (Phase 170 D-07). No duplicate pack-read surface.

### Bulk Apply Architecture

- **D-06:** **Bulk Apply creates one new scene per pack member.** Each pack-member template goes through scene creation in the same shape as Phase 172/172.1 single-Apply (scenes row + scene_slides row with `design_json.svgContent` for svg members, or `design_json` payload for polotno members). No "one scene with N slides" compaction, no pack-membership-only storage. Consistent with single-template Apply UX — packs are just "Apply these N at once".

- **D-07:** **New atomic RPC `apply_starter_pack(p_pack_id uuid) RETURNS uuid[]`** in a new migration (next available number after 170).
  - Single PL/pgSQL transaction.
  - Reads pack members from `template_pack_items` ordered by `position`.
  - For each member, performs the source-table-specific insert inline (mirrors the body of `clone_svg_template_to_scene` for svg members and `clone_template_to_scene` for polotno members — not by calling those RPCs, to keep everything in one transaction).
  - Returns `uuid[]` of new scene IDs in pack-member order.
  - **All-or-nothing** — if any member insert fails (missing template, RLS, malformed data), the whole transaction rolls back and the client retries. Matches Phase 172 D-09 and 172.1 D-02 atomicity contract.
  - Auth preamble matches Phase 172.1 D-10 (`auth.uid() IS NOT NULL` OR raise; pack row is_active=TRUE and access predicate; super_admin bypass for parity).

- **D-08:** **No customization carried on bulk Apply.** `p_customized_svg` is NULL for every member. Users customize each new scene afterward via QuickCustomize in the editor, or via single-template Apply from the gallery. Keeps the RPC "dumb persistor" (Phase 172 D-10) and sidesteps running `svgCustomizeService` + DOMPurify N times on the client.

- **D-09:** **Duplicate Apply is allowed.** Re-applying the same pack creates another N fresh scene rows; no de-dup check; no `source_pack_id` lineage column on `scenes`. Mirrors single-template Apply which also allows duplicates. Users clean up from the Scenes page.

### Gallery Surfacing (honors Phase 171 D-01 flat grid for templates)

- **D-10:** **Pack cards live in a dedicated strip above the template grid** — not mixed into the flat grid, not behind a tab. Strip title: "Starter Packs" (planner may refine). Layout: horizontally scrollable on narrow screens, wraps to 2–3 rows on desktop depending on pack count. Templates keep the pure flat-grid layout below the strip (Phase 171 D-01 preserved for template cards). The strip is a distinct lane so it doesn't break the "no curated sections" decision for templates themselves.

- **D-11:** **Strip visibility rule:** the pack strip is visible whenever the gallery is in its default browsing state OR when the user has applied category/tags/orientation/sort filter chips. The strip **hides only when the search input is non-empty** — text search implies "find a specific template" and packs are a browse affordance. Filter chips alone do NOT hide the strip.

- **D-12:** **Pack card shape — 2×2 thumbnail mosaic** showing the first 4 member template thumbnails in a 2×2 grid, with a count badge ("12 templates" or just "12") on a corner and the industry label ("Restaurant", "Retail", etc.) displayed beneath the pack name. Packs with fewer than 4 members show brand-tinted placeholders in the remaining cells. This reads clearly as "bundle of templates" without fighting the existing TemplateCard silhouette.

- **D-13:** **Click-to-preview via a full-screen pack preview modal** (new component `PackPreviewModal.jsx`, following the pattern of `TemplatePreviewModal` from Phase 172). Modal layout:
  - Header: pack name, industry badge, member count, close button.
  - Body: mini-grid (not a scroll list) of all member template thumbnails + names. Planner decides grid density.
  - Footer / right rail: single Apply CTA "Apply pack (N templates)". No QuickCustomize panel (D-08).
  - **Prev/Next pack navigation** — arrow buttons flanking the preview + Left/Right keyboard shortcuts (mirrors Phase 172 D-03). Cycles through the currently visible pack list.
  - Escape closes.

### Success & Failure UX

- **D-14:** **Success = toast + 'View scenes' action.** On bulk-Apply success, the pack modal closes, and a success toast shows: "Added [N] templates from [Pack name] — [View scenes]". The action navigates to the Scenes page; the toast auto-dismisses if ignored. Honors TPCK-02 "no navigation away from the gallery required" — navigation is opt-in, not forced.

- **D-15:** **Failure = inline toast, modal stays open, button re-enables.** RPC failure (rollback, auth, missing member) surfaces an error toast with a Retry affordance; the pack modal remains open with its state intact so the user can retry without re-selecting. Matches Phase 172 D-13 Apply-failure UX.

### Admin Surface

- **D-16:** **New `AdminStarterPacksPage.jsx`** at a dedicated admin route (planner picks `admin-starter-packs` or equivalent in `pageMap`). Kept separate from `AdminTemplatesPage` so admin surfaces stay focused. Page shows a list of packs with row actions (edit/delete/toggle active), a "New pack" CTA, and a pack editor (modal or drill-in panel — planner decides) with:
  - Pack metadata fields (name, slug, description, industry, thumbnail, display_order, is_active).
  - Member management: multi-select from the `gallery_templates` VIEW filtered by tenant scope; drag-reorder for `position`; per-row remove.
  - Save persists via `createPack` / `updatePack` / `addPackItem` / `removePackItem` / `reorderPackItems` in `marketplaceService.js` (D-04).
- **D-17:** Thumbnail: pack thumbnail is **admin-uploaded (optional)** — if `thumbnail_url` is null the card's mosaic auto-derives from the first 4 member thumbnails (D-12). Keeps TPCK-04 card content working even with minimal admin data.

### Claude's Discretion

- **Favorites data model (Claude's discretion):** New table `template_favorites(user_id UUID, template_id UUID, editor_type TEXT CHECK ('svg','polotno'), created_at TIMESTAMPTZ)` with PRIMARY KEY `(user_id, template_id, editor_type)` — polymorphic like `template_pack_items` (D-01). RLS: `user_id = auth.uid()` for SELECT/INSERT/DELETE. Per-user scope (teammates do NOT see each other's favorites). Planner/researcher finalize the exact column names and indexes.
- **Favorites exposure through the gallery:** recommended approach — add a convenience RPC `fetch_my_favorite_template_ids()` that returns `jsonb` or `uuid[]`; the client merges favorited state into gallery rows on render. Alternative: a view like `gallery_templates_with_favorites` that JOINs on auth.uid(). Planner picks whichever matches existing patterns more cleanly; a VIEW join keeps the read path in `templateGalleryService` single-query.
- **Favorites UI interaction:** Heart icon on `TemplateCard` in the top-right corner, always visible (not hover-reveal). Filled red/primary when favorited, outline-only when not. Also surfaces in `TemplatePreviewModal` header (to the left of the close button). Optimistic toggle on click (update UI immediately, revert on RPC error with a toast). Silent on success; red error toast on failure.
- **Favorites filter:** a dedicated "Favorites" toggle chip in the Phase 171 filter bar (next to the category dropdown). URL param `favorites=1` extends the Phase 171 D-10 filter-state contract. When the filter is on and the user has zero favorites, the `EmptyState` component (Phase 171 D-12) shows "No favorites yet — tap the heart on any template to save it" with a clear-filter action. Pack strip remains visible per D-11 (search-only hides the strip).
- **Pack RLS for per-tenant custom packs:** whether tenants can create their own packs vs only admins. Recommended: super_admin only for v20.0 (matches "curated starter packs" wording in TPCK-01); tenant-custom packs are forward-compat.
- **Bulk-Apply naming:** scene names for pack-applied scenes. Recommended: `"<template.name>"` (no "Copy" suffix for bulk apply since duplicates are expected and labeled per template), but consider `"<pack.name> — <template.name>"` if the planner finds value in pack lineage in the scene title. User explicitly declined to constrain this.
- **Pack strip title copy and sort order** — "Starter Packs" vs "Curated Packs" vs "Template Packs". Display order driven by `template_packs.display_order` ASC then `name` ASC by default.
- **Admin pack editor — modal vs drill-in panel:** planner decides based on member-count ergonomics (packs with 20+ members want more screen space; a modal may feel cramped).
- **Thumbnail mosaic tile selection** — whether to use first 4 `position`-ordered members or a curated subset admin picks. Recommended: first 4 by `position` for simplicity.
- **Migration numbering** — next available after 170. Planner confirms at plan time.
- **New `PackPreviewModal.jsx` file path** — recommended `src/components/template-gallery/PackPreviewModal.jsx` to colocate with Phase 172's `TemplatePreviewModal.jsx`.

### Folded Todos

None — no pending todos matched this phase scope.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements & Roadmap
- `.planning/REQUIREMENTS.md` §Starter Packs (TPCK-01..04) + §Favorites (TFAV-01..03) — acceptance criteria
- `.planning/ROADMAP.md` §Phase 173 — goal, success criteria (5 items), dependencies (Phase 171)

### Prior Phase Context (decisions that carry forward)
- `.planning/phases/171-core-gallery-ui-redesign/171-CONTEXT.md` — flat card grid (D-01), inline filter bar (D-05), URL-backed filter state (D-10), EmptyState pattern (D-12), design system inventory
- `.planning/phases/172-preview-apply-flow/172-CONTEXT.md` — `TemplatePreviewModal` pattern (D-01..D-04), atomic RPC pattern (D-09), dumb-persistor server contract (D-10), client dispatcher by `editor_type` (D-11), DOMPurify boundary (D-17)
- `.planning/phases/172.1-fix-svg-apply-rpc/172.1-CONTEXT.md` — `clone_svg_template_to_scene` body (D-05, D-10) — blueprint for the svg branch inside the new bulk-Apply RPC
- `.planning/research/SUMMARY.md` + `.planning/research/PITFALLS.md` — v20.0 research synthesis (bulk operations, RLS patterns)

### Database Schema (READ)
- `supabase/migrations/167_gallery_templates_view_and_rls.sql` — `gallery_templates` VIEW definition, svg_templates SELECT RLS (Phase 170 TDAT-03)
- `supabase/migrations/168_clone_template_with_customization.sql` — polotno-path RPC to mirror in the new bulk-Apply RPC's polotno branch
- `supabase/migrations/170_clone_svg_template_to_scene.sql` — svg-path RPC to mirror in the new bulk-Apply RPC's svg branch
- `supabase/migrations/094_svg_templates.sql` — `svg_templates` schema (svg_content TEXT, tenant_id nullable)
- `supabase/migrations/080_template_marketplace.sql` — `template_library` / `template_library_slides` / `scene_slides` schema (polotno source)
- `supabase/migrations/023_templates_and_vertical_packs.sql` — **legacy** `content_templates` + `apply_pack_template` (DO NOT MODIFY per D-02 — read to understand why the two pack concepts coexist)
- `supabase/migrations/065_fix_pack_media_assets.sql` — legacy pack RPC (read-only reference; not modified)

### Source Files (READ / MODIFY)
- `src/services/marketplaceService.js` — target for new pack CRUD + bulk-Apply client wrapper (D-04). Existing contents preserved.
- `src/services/templateGalleryService.js` — **unchanged** for pack read path (D-05)
- `src/services/templateApplyService.js` — **unchanged**; new `applyStarterPack` lives in marketplaceService.js
- `src/pages/TemplateGalleryPage.jsx` — mount the pack strip above the template grid (D-10); integrate the favorites filter chip; wire favorite toggles on `TemplateCard`
- `src/components/template-gallery/TemplatePreviewModal.jsx` — add heart icon in header (favorites UI, Claude's discretion)
- `src/design-system/components/TemplateCard.jsx` — add heart icon top-right (favorites UI, Claude's discretion)
- `src/pages/SvgEditorPage.jsx`, `src/components/svg-editor/FabricSvgEditor.jsx` — **unchanged** (per-scene customize flows after bulk apply)
- `src/services/autoBuildService.js`, `src/pages/dashboard/WelcomeModal.jsx`, `src/components/onboarding/AutoBuildOnboardingModal.jsx` — **unchanged** (legacy onboarding packs untouched per D-02)

### New Files (CREATE)
- `src/components/template-gallery/PackPreviewModal.jsx` — full-screen pack preview modal (D-13)
- `src/components/template-gallery/StarterPacksStrip.jsx` — horizontal strip above the template grid (D-10) (planner confirms file path)
- `src/components/template-gallery/PackCard.jsx` — 2×2 mosaic card (D-12)
- `src/pages/AdminStarterPacksPage.jsx` — admin list + editor (D-16)
- New migrations for: `template_packs`, `template_pack_items`, `template_favorites`, `apply_starter_pack` RPC (planner picks numbers, likely 171..174 or similar after 170)

### Design System
- `src/design-system/components/TemplateCard.jsx` — reuse for pack member rendering inside `PackPreviewModal`
- `src/design-system/components/Card.jsx` — composition base for `PackCard`
- `src/design-system/index.js` — Modal, Badge, Button, motion wrappers (PageTransition, StaggeredItem) for modal/strip composition

### Tests
- `tests/e2e/preview-apply.spec.js` — Phase 172 pattern; mirror a new `tests/e2e/starter-packs.spec.js` for TPCK-01..04 flows (browse → preview → bulk apply → toast → navigate)
- `tests/e2e/` (favorites) — new spec for TFAV-01..03 (toggle from card, toggle from modal, filter, persist across logout)
- `tests/integration/preview-apply/rpc-atomicity.test.js` — Phase 172/172.1 pattern; mirror for `apply_starter_pack` (all-or-nothing; empty pack; single-member pack; partial-failure rollback)
- `tests/unit/services/marketplaceService.test.js` (new or extend existing) — pack CRUD + `applyStarterPack` client wrapper

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `TemplatePreviewModal` (Phase 172) — proven pattern for full-screen modal with prev/next + keyboard bindings. `PackPreviewModal` mines it for chrome, close handling, keyboard focus trap.
- `TemplateCard`, `TemplateCardSkeleton`, `Badge`, `FilterChips`, `EmptyState`, `Modal`, `PageTransition` — design system primitives already used by Phase 171; `PackCard` composes the same Card primitive for visual consistency.
- `marketplaceService.js` — existing CRUD patterns (named async exports, supabase rpc/from wrappers, thrown errors) are directly reusable for pack CRUD.
- `clone_svg_template_to_scene` (Phase 172.1) and `clone_template_to_scene` (Phase 172) RPC bodies — direct blueprint for the per-member insert inside the new `apply_starter_pack` RPC.
- `gallery_templates` VIEW — already exposes `editor_type`, `thumbnail`, `name`, etc. for all pack members; no new fetch infrastructure needed.

### Established Patterns
- Services are pure JS modules with named async exports, thin supabase wrappers that throw on error.
- RPCs are `SECURITY DEFINER`, `SET search_path = public`, `GRANT EXECUTE ... TO authenticated`, return primitive types or arrays.
- Migrations are sequentially numbered, additive, idempotent (`CREATE TABLE IF NOT EXISTS`, `CREATE OR REPLACE FUNCTION`, `WHERE ... IS NULL` guards). No DOWN migrations.
- Pages consume `showToast` and `onNavigate` from `App.jsx` — pack flows use the same plumbing for the success toast + "View scenes" action.
- URL-backed filter state via `useSearchParams()` (Phase 171 D-10) — favorites chip extends the existing param set with `favorites=1`.
- Client-side DOMPurify + size cap at the SVG boundary (Phase 172 D-17) — bulk Apply does NOT write customized SVG (D-08), so DOMPurify is not on the Phase 173 critical path; but favorites/packs touch no SVG content directly.

### Integration Points
- `TemplateGalleryPage.jsx` — mount `StarterPacksStrip` above the template grid; wire favorites filter chip into the existing filter bar; wire favorite toggle on `TemplateCard`.
- `TemplatePreviewModal.jsx` — favorites heart icon in the header (no packs integration needed here).
- `App.jsx` — register new `admin-starter-packs` route for `AdminStarterPacksPage`.
- `marketplaceService.js` — hosts all pack + bulk-Apply client logic.
- New migrations — add tables (`template_packs`, `template_pack_items`, `template_favorites`) and the `apply_starter_pack` RPC.

### Creative Options Enabled
- Because `template_pack_items` uses the `(template_id, editor_type)` polymorphic shape symmetric with `gallery_templates`, a pack can freely mix svg and polotno members without schema gymnastics.
- The bulk-Apply RPC inlining each source-table's insert (rather than calling the single-template RPCs) keeps the whole bulk operation in a single PL/pgSQL transaction, which is required for all-or-nothing atomicity.
- Heart icon on `TemplateCard` is a net-new design-system primitive opportunity — planner may add a reusable `FavoriteButton` component rather than inline-wiring the heart SVG.

</code_context>

<specifics>
## Specific Ideas

- User invoked manually on 2026-04-22 after Phase 172.1 wrap-up (8e30e745). No `--chain`, `--auto`, or `--all` — fully interactive session.
- User opted to NOT discuss the Favorites area in depth — the five recommended defaults captured under Claude's Discretion are explicitly endorsed ("Yes — defaults below") and planner/researcher are authorized to refine them without another round-trip.
- User consistently selected the "recommended" option across every Pack-area question — the decisions above reflect the researcher/planner-suggested defaults, not contrarian picks.
- TPCK-03 wording "reuses preserved `marketplaceService.js`" was taken literally: pack CRUD lives there. Admin UI page is new, but the service layer is extended, not duplicated.
- Phase 171 D-01 (flat grid, no curated sections) is upheld — the pack strip is a distinct lane above the grid, not a curated section within the template grid.

</specifics>

<deferred>
## Deferred Ideas

- **Converging Phase 173 packs with legacy `content_templates` onboarding packs.** Today they are two separate concepts (Phase 173 = curated gallery bundles; legacy = onboarding business-type packs with playlists/media). A future phase could harmonize them if product wants a single "pack" abstraction. Not needed for v20.0.
- **Per-tenant custom packs created by non-admins.** D-03 allows the schema but the admin-surface (D-16) is super_admin-only for v20.0. Opening up to tenant-scoped CRUD is a v20.1+ product question.
- **Scene-lineage column (`source_pack_id` on `scenes`).** Skipped per D-09 (duplicate Apply allowed). If a future feature wants "show me which scenes came from which pack" (e.g., bulk-delete-by-pack, or reporting), revisit then.
- **Server-side or client-side brand-color prefill during bulk Apply.** Skipped per D-08. If users complain that bulk-applied scenes feel unbranded, revisit with an Edge Function or client-side pre-sanitization pass.
- **Ordering control on pack strip (drag-to-reorder in the gallery).** Admins order packs via `display_order`; users cannot reorder their view. If user-level pinning emerges as a need, revisit.
- **Favorites per-tenant/team sharing.** D-04/Claude's-discretion locked per-user scope. Team-shared favorites would be a v20.1+ feature.
- **Onboarding starter-pack step (TONB-01..03) and driver.js tour (TONB-04)** — Phase 174.
- **Scene-editor "Browse Templates" entry point (TEDR-01..03)** — Phase 174.

### Reviewed Todos (not folded)
None reviewed — todo cross-reference returned no matches.

</deferred>

---

*Phase: 173-starter-packs-favorites*
*Context gathered: 2026-04-22*
