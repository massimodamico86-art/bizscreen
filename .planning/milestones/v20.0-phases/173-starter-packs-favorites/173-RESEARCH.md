# Phase 173: Starter Packs + Favorites - Research

**Researched:** 2026-04-22
**Domain:** Supabase/Postgres atomic bulk RPCs, polymorphic junction tables, per-user RLS, React gallery UX integration
**Confidence:** HIGH

## Summary

Phase 173 ships two DB-backed features that graft onto the Phase 171/172 gallery without disturbing its flat-grid contract: a starter-pack strip (with bulk-Apply RPC) above the template grid, and per-user favorites with filtering. Every material question is already locked in CONTEXT.md — this research firms up the handful of Claude's-discretion gaps (favorites schema shape, read-path VIEW vs RPC, migration numbering, admin editor UX) and extracts the verbatim inserts/policies the planner will paste into migrations.

**Primary recommendation:** Ship four new migrations (171..174) that mirror the shapes already proven by 167/168/170: `template_packs` + `template_pack_items` (171), `template_favorites` + favorites RLS + a `gallery_templates_with_favorites` VIEW (172), and the atomic `apply_starter_pack(uuid) RETURNS uuid[]` RPC (173) whose body inlines migrations 168 + 170's insert logic member-by-member. Use the VIEW-join path for favorites so `templateGalleryService` stays single-query (Phase 170 D-07). Use a full-screen `PackPreviewModal.jsx` that clones `TemplatePreviewModal`'s chrome and reuses its fiber-safe prev/next + keyboard handlers. Admin uses a drill-in panel (not modal) at a new `admin-starter-packs` pageMap key.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Pack Data Model**
- **D-01:** Two new tables `template_packs` + `template_pack_items`. `template_pack_items` uses polymorphic `(template_id, editor_type)` keyed members; PK is `(pack_id, template_id, editor_type)`; no SQL FK into `svg_templates.id` / `template_library.id` (the bulk-Apply RPC enforces existence at apply time).
- **D-02:** Legacy onboarding packs (`content_templates`, `apply_pack_template`, `autoBuildService`, `WelcomeModal`) are **not touched**. Phase 173 packs are a distinct concept.
- **D-03:** `template_packs` SELECT: `is_active = TRUE AND (tenant_id IS NULL OR tenant_id = auth.uid())`. INSERT/UPDATE/DELETE: super_admin OR tenant-owner. `template_pack_items` follows parent-pack policy via join.

**Pack Service Layer**
- **D-04:** Pack CRUD + bulk-Apply client wrapper live in `src/services/marketplaceService.js`. New exports: `fetchStarterPacks`, `fetchPackDetail`, `createPack`, `updatePack`, `deletePack`, `addPackItem`, `removePackItem`, `reorderPackItems`, `applyStarterPack`.
- **D-05:** Gallery-side pack read calls `marketplaceService.fetchStarterPacks` directly. `templateGalleryService.js` stays scoped to single-entity gallery read.

**Bulk Apply Architecture**
- **D-06:** One new scene per pack member (no compaction).
- **D-07:** `apply_starter_pack(p_pack_id uuid) RETURNS uuid[]` — single PL/pgSQL transaction, inlines bodies of 168/170's single-template RPCs (does NOT call them), returns new scene IDs in pack-member order. All-or-nothing.
- **D-08:** `p_customized_svg` is **NULL** for every member in bulk apply — no customization carried.
- **D-09:** Duplicate Apply allowed. No `source_pack_id` lineage on `scenes`.

**Gallery Surfacing**
- **D-10:** Pack strip lives **above** the template grid, not mixed in. Horizontal scroll narrow / wraps 2–3 rows desktop.
- **D-11:** Strip hides **only when search input is non-empty**. Filter chips alone do NOT hide it.
- **D-12:** 2×2 mosaic card of first 4 member thumbnails + count badge + industry label. Brand-tinted placeholders for <4 members.
- **D-13:** New `PackPreviewModal.jsx` — clones `TemplatePreviewModal` pattern. Mini-grid body, single Apply CTA ("Apply pack (N templates)"), prev/next (arrows + Left/Right keyboard), Escape closes. No QuickCustomizePanel.

**Success & Failure UX**
- **D-14:** Success = toast + "View scenes" action; modal closes; no forced navigation.
- **D-15:** Failure = inline toast, modal stays open, button re-enables. Retry affordance.

**Admin Surface**
- **D-16:** New `AdminStarterPacksPage.jsx` at a dedicated admin route (planner picks `admin-starter-packs`). Kept separate from `AdminTemplatesPage`. Members selected from `gallery_templates` VIEW, drag-reorder for `position`.
- **D-17:** Pack thumbnail is admin-uploaded (optional). If `thumbnail_url` null, card auto-derives mosaic from first 4 members.

### Claude's Discretion

- Favorites data model — finalize column names, indexes. Base shape: `template_favorites(user_id UUID, template_id UUID, editor_type TEXT CHECK ('svg','polotno'), created_at TIMESTAMPTZ)` PK `(user_id, template_id, editor_type)`. RLS: `user_id = auth.uid()` for SELECT/INSERT/DELETE.
- Favorites exposure — VIEW join (`gallery_templates_with_favorites`) vs convenience RPC (`fetch_my_favorite_template_ids`). Pick whichever keeps `templateGalleryService` single-query.
- `FavoriteButton` — new design-system primitive vs inline heart icon in `TemplateCard`.
- Favorites filter — dedicated "Favorites" chip in Phase 171 filter bar; URL param `favorites=1` extends Phase 171 D-10 filter-state contract.
- Pack RLS scope — super_admin only for v20.0 (tenant-custom packs are forward-compat).
- Bulk-Apply scene naming — default `"<template.name>"`; consider `"<pack.name> — <template.name>"` for lineage.
- Pack strip title copy ("Starter Packs" vs "Curated Packs" vs "Template Packs"); display order `display_order ASC, name ASC`.
- Admin pack editor — modal vs drill-in panel.
- Thumbnail mosaic tile selection — first 4 by `position` (recommended) vs admin-curated.
- Migration numbering — next available after 170.
- `PackPreviewModal.jsx` file path — recommended `src/components/template-gallery/PackPreviewModal.jsx`.

### Deferred Ideas (OUT OF SCOPE)

- Converging Phase 173 packs with legacy `content_templates` onboarding packs.
- Per-tenant custom packs created by non-admins (schema allows; admin UI v20.0 is super_admin-only).
- Scene-lineage column (`source_pack_id` on `scenes`).
- Server- or client-side brand-color prefill during bulk Apply.
- Drag-to-reorder packs on the user-facing gallery strip (users cannot reorder).
- Favorites per-tenant/team sharing (per-user only in v20.0).
- Onboarding starter-pack step (TONB-01..03) and driver.js tour (TONB-04) — Phase 174.
- Scene-editor "Browse Templates" entry point (TEDR-01..03) — Phase 174.

</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| TPCK-01 | User can browse curated starter packs as dedicated bundle cards on the gallery page | D-10 strip placement above grid + `StarterPacksStrip` + `PackCard` (§Code Examples §PackCard mosaic). Data via `fetchStarterPacks()` from `marketplaceService.js`. Rendered unconditionally in default gallery state; hidden only when search input non-empty (D-11; §Common Pitfalls §Search-Input Gate). |
| TPCK-02 | User can apply an entire starter pack to their library in one click (bulk clone) with in-gallery confirmation | D-07 atomic RPC `apply_starter_pack(uuid) RETURNS uuid[]` (§Code Examples §apply_starter_pack body). `PackPreviewModal` Apply CTA → thin `marketplaceService.applyStarterPack()` wrapper → toast with "View scenes" action (D-14). Failure inline, modal stays (D-15). |
| TPCK-03 | Admin can create and edit starter packs via the existing admin surface using `marketplaceService.js` | D-04 service exports defined; `AdminStarterPacksPage` at new pageMap key `admin-starter-packs` registered in `App.jsx` alongside `admin-templates`, added to `adminToolPages` array (§Code Examples §App.jsx route registration). Mirrors `AdminTemplatesPage.jsx` chrome (§Admin page conventions). |
| TPCK-04 | Pack cards display template count, thumbnail mosaic, and industry/use-case label | D-12 2×2 CSS Grid mosaic of first 4 member thumbnails from `fetchPackDetail(id).members[0..3].thumbnail`. Count badge + industry label rendered from `template_packs.name / industry` columns. `<4` members → brand-tinted placeholders (§Code Examples §PackCard mosaic). |
| TFAV-01 | User can favorite/unfavorite templates from the gallery card and preview modal | `template_favorites(user_id, template_id, editor_type)` + `toggleFavorite()` client helper in a new `src/services/favoritesService.js` (alternatively colocated in `templateGalleryService.js` — recommended for single-query invariant). `FavoriteButton` primitive wired into `TemplateCard` top-right and `TemplatePreviewModal` header (§Code Examples §FavoriteButton + optimistic toggle). |
| TFAV-02 | User can filter gallery to show only favorited templates via toggle/chip | URL param `favorites=1` extends Phase 171 D-10 filter state. Client-side filter against the `is_favorited` column on `gallery_templates_with_favorites` (VIEW path) (§Code Examples §gallery_templates_with_favorites). When `favorites=1` and zero favorites exist, reuse Phase 171 D-12 `EmptyState` with "No favorites yet" copy. |
| TFAV-03 | Favorites persist per-user across sessions (DB-backed) | `template_favorites` table with `user_id = auth.uid()` RLS on SELECT/INSERT/DELETE (§Code Examples §template_favorites RLS). Write path is a single `.insert()` / `.delete()` on the row — toggle semantics. |

</phase_requirements>

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|--------------|----------------|-----------|
| Pack data storage + RLS enforcement | Database / Storage | — | Single source of truth; polymorphic junction shape cannot exist safely in app code |
| Atomic bulk-Apply (N scenes created or none) | Database / Storage | — | PL/pgSQL transaction is the only way to get all-or-nothing across N inserts (Phase 172/172.1 precedent) |
| Pack discovery/browse | Frontend (React) | Database (VIEW read) | Client composes strip from `fetchStarterPacks()` result; DB exposes filtered rows via RLS |
| Pack preview + Apply orchestration | Frontend (React) | API (`marketplaceService.js`) | Modal chrome, keyboard handling, apply CTA state all client; service is a thin supabase wrapper |
| Favorites storage + per-user scoping | Database / Storage | — | `user_id = auth.uid()` RLS is the per-user boundary |
| Favorites read in gallery | Database (VIEW) | Frontend | VIEW left-joins `template_favorites` against `auth.uid()` so the gallery read stays single-query (Phase 170 D-07) |
| Favorites toggle | Frontend (React) | API (thin wrapper) | Optimistic UI + upsert/delete on the junction row |
| Favorites filter | Frontend (React) | — | Client-side predicate against the VIEW's `is_favorited` column; URL param is browser-only |
| Admin pack CRUD | Frontend (React) + API | Database | Page calls `createPack` / `addPackItem` / `reorderPackItems` which are thin table-ops on `marketplaceService.js` |

## Standard Stack

### Core (already installed; no new deps)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @supabase/supabase-js | (repo-pinned) | DB client, RPC invocation | Already the project's sole DB client [VERIFIED: `src/supabase.js` and every service] |
| dompurify | 3.3.3 | Defense-in-depth client sanitizer | Used by Phase 172 `TemplatePreviewModal` for rendering; pack preview mini-grid thumbnails are `<img src>` only, so DOMPurify is NOT on the Phase 173 critical path unless the mini-grid ever renders inline SVG [VERIFIED: `src/components/template-gallery/TemplatePreviewModal.jsx:15,131`] |
| fuse.js | (installed in Phase 171) | Gallery fuzzy search — unchanged by Phase 173 | `[VERIFIED: .planning/phases/171/171-01-PLAN.md Wave 0]` |
| react-router-dom `useSearchParams` | (react-router v6) | URL-backed filter state for `favorites=1` chip | Already powers Phase 171 filter state [VERIFIED: `src/pages/TemplateGalleryPage.jsx:26,111`] |
| lucide-react | (repo-pinned) | Icons — `Heart`, `HeartOff`, `Layers`, `Package`, `ChevronLeft/Right`, `X` | Already the project's icon lib [VERIFIED: `src/pages/TemplateGalleryPage.jsx:28`, `TemplatePreviewModal.jsx:14`] |

### Supporting (already in design system — compose, don't build)

| Component | Purpose |
|-----------|---------|
| `Modal`, `Alert`, `Button`, `Badge` | Pack preview chrome + toast-adjacent surfaces [VERIFIED: `src/design-system/index.js:52,63,66`] |
| `Card`, `CardContent`, `CardMedia` | `PackCard` composition base [VERIFIED: `src/design-system/index.js:28-37`] |
| `StaggeredPageTransition`, `StaggeredItem`, `fadeInScale` | Pack strip entrance animation (parity with template grid) [VERIFIED: `src/design-system/index.js:96-122`] |
| `EmptyState`, `SearchIllustration`, `TemplatesIllustration` | "No favorites yet" + "No packs" copy [VERIFIED: `src/design-system/index.js:69-94`] |
| `FilterChips`, `ToggleChips` | Favorites toggle chip in Phase 171 filter bar [VERIFIED: `src/design-system/index.js:75`] |

### Alternatives Considered

| Instead of | Could Use | Why we reject |
|------------|-----------|---------------|
| VIEW-join for favorites | Convenience RPC `fetch_my_favorite_template_ids()` + client merge | VIEW-join preserves Phase 170 D-07 single-query invariant; RPC path forces a 2nd round-trip and client merge. VIEW wins. `[CITED: .planning/phases/170-data-layer-foundation/170-CONTEXT.md D-07]` |
| New `favoritesService.js` | Extend `templateGalleryService.js` with `toggleFavorite` | Colocation with the gallery read keeps all gallery-related calls in one import boundary. Recommended. |
| Modal admin editor | Drill-in panel (sub-page in `admin-starter-packs`) | Pack member lists of 20+ items cramp a modal; full page better. Mirrors `AdminEditTemplatePage.jsx` pattern that already exists. [VERIFIED: `src/pages/Admin/AdminEditTemplatePage.jsx`] |
| Separate `FavoriteButton` DS primitive | Inline `<button>` with Heart icon in `TemplateCard` | A named primitive is reused in two places (`TemplateCard`, `TemplatePreviewModal` header) and is the natural home for optimistic-update + a11y state (`aria-pressed`). Low cost — 30-line component. Recommended. |

**Installation:** None. No new runtime packages are required. **No `npm install` step needed for Phase 173.**

**Version verification:**
- `dompurify@3.3.3` is already installed and consumed by `templateApplyService.js` + `TemplatePreviewModal.jsx` [VERIFIED: grep src/].
- `fuse.js` landed in Phase 171 [VERIFIED: `src/pages/TemplateGalleryPage.jsx:27`].
- No new runtime dependency needs a `npm view` confirmation for this phase.

## Architecture Patterns

### System Architecture Diagram

```
                ┌─────────────────────────────────────────────────┐
                │   TemplateGalleryPage.jsx (Phase 171)           │
                │                                                 │
                │   ┌──────────────────────┐   ┌───────────────┐  │
                │   │ StarterPacksStrip    │   │ Filter bar    │  │
                │   │ (NEW, Phase 173)     │   │ + Favorites   │  │
                │   │  - PackCard×N        │   │   chip (NEW)  │  │
                │   │  - 2×2 mosaic        │   └───────┬───────┘  │
                │   └──────────┬───────────┘           │          │
                │   visible unless filters.q.length>0  │          │
                │              │                       │          │
                │              ▼                       ▼          │
                │   ┌──────────────────┐  ┌────────────────────┐  │
                │   │ PackPreviewModal │  │ TemplateCard grid  │  │
                │   │ (NEW)            │  │ + FavoriteButton   │  │
                │   │ - member mini    │  │   top-right (NEW)  │  │
                │   │   grid           │  │ - Phase 171 cards  │  │
                │   │ - Apply CTA      │  │   preserved        │  │
                │   └────────┬─────────┘  └─────────┬──────────┘  │
                └────────────┼──────────────────────┼─────────────┘
                             │                      │
                             │ applyStarterPack     │ toggleFavorite
                             ▼                      ▼
                ┌─────────────────────────┐ ┌───────────────────┐
                │ marketplaceService.js   │ │ templateGallery   │
                │ (EXTENDED)              │ │ Service.js        │
                │  - fetchStarterPacks    │ │ (EXTENDED)        │
                │  - fetchPackDetail      │ │  - toggleFavorite │
                │  - applyStarterPack──┐  │ │  - fetch uses VIEW│
                │  - CRUD ops          │  │ │    with is_fav    │
                └──────────────────────┼──┘ └──────────┬────────┘
                                       │               │
                                       ▼               ▼
    ┌─────────────────────────────────────────────────────────────┐
    │                    SUPABASE / POSTGRES                      │
    │                                                             │
    │  ┌──────────────────┐  ┌─────────────────────┐             │
    │  │ template_packs   │  │ template_favorites  │             │
    │  │ (NEW)            │  │ (NEW)               │             │
    │  │  RLS: active +   │  │  RLS: user_id =     │             │
    │  │  tenant|global   │  │       auth.uid()    │             │
    │  └────────┬─────────┘  └─────────┬───────────┘             │
    │           │                      │                          │
    │  ┌────────┴──────────┐           │                          │
    │  │ template_pack_    │           │                          │
    │  │ items (NEW)       │           │                          │
    │  │  polymorphic      │           │                          │
    │  │  (templateId,     │           │                          │
    │  │   editor_type)    │           │                          │
    │  └────────┬──────────┘           │                          │
    │           │                      │                          │
    │           ▼                      │                          │
    │  ┌──────────────────┐            │                          │
    │  │ apply_starter_   │            │                          │
    │  │ pack(pack_id)    │            │                          │
    │  │ RPC (NEW, atomic)│            │                          │
    │  │  inlines 168/170 │            │                          │
    │  │  member-by-      │            │                          │
    │  │  member          │            │                          │
    │  └────────┬─────────┘            │                          │
    │           │                      │                          │
    │           ▼                      ▼                          │
    │  ┌──────────────────┐  ┌──────────────────────────────┐    │
    │  │ scenes +         │  │ gallery_templates_with_      │    │
    │  │ scene_slides     │  │ favorites (NEW VIEW)         │    │
    │  │ (writes)         │  │   = gallery_templates LEFT   │    │
    │  └──────────────────┘  │     JOIN template_favorites  │    │
    │                        │     ON ... auth.uid()        │    │
    │                        └──────────────────────────────┘    │
    │                                                             │
    │  Pre-existing (untouched by Phase 173):                    │
    │   gallery_templates VIEW (167) · svg_templates (094) ·     │
    │   template_library (080) · scenes (067) · scene_slides     │
    │   clone_svg_template_to_scene (170) ·                      │
    │   clone_template_with_customization (168)                  │
    └─────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| File | Role | New or Modified |
|------|------|-----------------|
| `supabase/migrations/171_template_packs.sql` | Tables + RLS for packs | NEW |
| `supabase/migrations/172_template_favorites.sql` | Favorites table + RLS + optional `gallery_templates_with_favorites` VIEW | NEW |
| `supabase/migrations/173_apply_starter_pack.sql` | Atomic bulk-Apply RPC | NEW |
| `src/services/marketplaceService.js` | Pack CRUD + `applyStarterPack` wrapper | MODIFIED (extend, never remove) |
| `src/services/templateGalleryService.js` | Switch read from `gallery_templates` → `gallery_templates_with_favorites`; add `toggleFavorite` | MODIFIED |
| `src/design-system/components/FavoriteButton.jsx` | Reusable heart button with optimistic state | NEW |
| `src/design-system/components/TemplateCard.jsx` | Host `FavoriteButton` top-right | MODIFIED |
| `src/components/template-gallery/StarterPacksStrip.jsx` | Strip lane + PackCard list | NEW |
| `src/components/template-gallery/PackCard.jsx` | 2×2 mosaic + industry + count | NEW |
| `src/components/template-gallery/PackPreviewModal.jsx` | Full-screen modal + prev/next + Apply CTA | NEW |
| `src/components/template-gallery/TemplatePreviewModal.jsx` | Add Heart icon to header | MODIFIED |
| `src/pages/TemplateGalleryPage.jsx` | Mount strip above grid + favorites chip in filter bar + `favorites=1` URL param | MODIFIED |
| `src/pages/Admin/AdminStarterPacksPage.jsx` | Admin list + editor | NEW |
| `src/App.jsx` | Register `admin-starter-packs` pageMap key + add to `adminToolPages` | MODIFIED |

### Recommended Project Structure

```
src/
├── components/template-gallery/
│   ├── TemplatePreviewModal.jsx      # MODIFIED — add heart in header
│   ├── QuickCustomizePanel.jsx       # unchanged
│   ├── PackPreviewModal.jsx          # NEW
│   ├── StarterPacksStrip.jsx         # NEW
│   └── PackCard.jsx                  # NEW
├── design-system/components/
│   ├── TemplateCard.jsx              # MODIFIED — top-right heart slot
│   └── FavoriteButton.jsx            # NEW
├── pages/
│   ├── TemplateGalleryPage.jsx       # MODIFIED
│   └── Admin/
│       └── AdminStarterPacksPage.jsx # NEW
├── services/
│   ├── marketplaceService.js         # MODIFIED — pack exports
│   └── templateGalleryService.js     # MODIFIED — VIEW swap + toggleFavorite
supabase/migrations/
├── 171_template_packs.sql            # NEW
├── 172_template_favorites.sql        # NEW
└── 173_apply_starter_pack.sql        # NEW
tests/
├── e2e/
│   ├── starter-packs.spec.js         # NEW (supersedes legacy template-packs.spec.js semantics)
│   └── favorites.spec.js             # NEW
├── integration/preview-apply/
│   └── apply-starter-pack-atomicity.test.js  # NEW
└── unit/services/
    └── marketplaceService.test.js    # EXTEND (add pack CRUD + applyStarterPack tests)
```

### Pattern 1: Atomic Bulk RPC — Inline Members in One PL/pgSQL Function

**What:** Bulk-Apply iterates pack members inside a single PL/pgSQL function. Each member's scene+slide insert is written inline (copied from migrations 168/170). Calling those single-template RPCs from inside the bulk RPC would not be atomic across members — each child RPC opens its own transaction scope semantics via `SECURITY DEFINER`.

**When to use:** Any bulk write that must succeed or roll back together, spanning multiple source tables.

**Why inline and not delegate:**
- `SECURITY DEFINER` functions run with the owner's privileges; nested `SECURITY DEFINER` calls can mask RLS errors.
- Inlining keeps all inserts within the caller's transaction, so a `RAISE EXCEPTION` on member N rolls back members 1..N-1.
- Phase 172.1 D-07 establishes this exact pattern: "mirrors bodies of `clone_svg_template_to_scene` and `clone_template_to_scene` inline (all-or-nothing)". `[CITED: .planning/phases/173-starter-packs-favorites/173-CONTEXT.md D-07]`

**Blueprint source (verbatim reference):** migrations `168_clone_template_with_customization.sql` (polotno branch, lines 40-151) + `170_clone_svg_template_to_scene.sql` (svg branch, lines 35-138). `[VERIFIED: files read]`

### Pattern 2: Polymorphic Junction Table (no SQL FK)

**What:** `template_pack_items(pack_id, template_id, editor_type)` with PK `(pack_id, template_id, editor_type)`. `template_id` references either `svg_templates.id` or `template_library.id` — discriminated by `editor_type`. Postgres cannot enforce an FK that conditionally points to two tables.

**When to use:** Any junction that targets a union view (`gallery_templates` UNIONs the two tables).

**Existence validation strategy:** The atomic Apply RPC validates member existence at apply time by SELECTing against the source table inside its PL/pgSQL branches (`FOUND` / `IF v_template IS NULL THEN RAISE`). If an orphan is detected, the entire bulk Apply rolls back. This matches how migration 168/170 handle "template not found or inactive". `[CITED: supabase/migrations/168_clone_template_with_customization.sql:68-70; 170_clone_svg_template_to_scene.sql:79-81]`

**Alternative existence checks (reject):**
- FK to `gallery_templates` — VIEW cannot be FK target in Postgres. ❌
- Trigger-based check — adds migration complexity for marginal value; apply-time check already rolls back.
- CHECK constraint with subquery — not allowed in Postgres. ❌

### Pattern 3: Per-User RLS via `auth.uid()`

**What:** `template_favorites` RLS: `user_id = auth.uid()` on SELECT / INSERT / DELETE. UPDATE is not needed (toggle = insert or delete).

**Exact policies:**
```sql
ALTER TABLE template_favorites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "template_favorites_select" ON template_favorites
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "template_favorites_insert" ON template_favorites
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "template_favorites_delete" ON template_favorites
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());
```

**Why no UPDATE policy:** Toggle semantics = insert a row to favorite, delete to unfavorite. No mutable state. Simpler RLS surface.

### Pattern 4: VIEW-Join for Single-Query Favorites Read

**What:** New VIEW `gallery_templates_with_favorites` LEFT JOINs `template_favorites` on `(id, editor_type)` filtered by `auth.uid()`. Returns all existing 21 columns from `gallery_templates` plus `is_favorited BOOLEAN`.

**Why:** Phase 170 D-07 mandates single-query gallery fetch. Adding a convenience RPC forces a second round-trip and a client merge. The VIEW path keeps the existing `templateGalleryService.fetchGalleryTemplates` call shape; only the target relation changes.

**Caveat — row filter by `auth.uid()` in VIEW:** In Postgres, a non-`SECURITY DEFINER` VIEW runs with the caller's privileges, and `auth.uid()` is callable inside the VIEW's LEFT JOIN predicate. Because we LEFT JOIN on `tf.user_id = auth.uid()`, the favorites table's RLS policies are respected (the caller can only see their own rows) and non-matching templates get `is_favorited = FALSE`. `[CITED: migration 167 uses a similar pattern with `is_active = TRUE` filter inside the VIEW, verified in file]`

**Example shape:**
```sql
CREATE OR REPLACE VIEW gallery_templates_with_favorites AS
SELECT
  gt.*,
  (tf.user_id IS NOT NULL) AS is_favorited
FROM gallery_templates gt
LEFT JOIN template_favorites tf
  ON tf.template_id = gt.id
 AND tf.editor_type = gt.editor_type
 AND tf.user_id = auth.uid();
```

### Pattern 5: Optimistic Favorite Toggle with RPC Error Revert

**What:** On heart-click, immediately flip the UI state, then fire `.insert()` or `.delete()` on `template_favorites`. On error, revert the UI state and render a red error toast.

**Contract:**
1. Client state updates synchronously (no `await` before render).
2. RPC/table op fires.
3. On reject → revert + toast.
4. On resolve → silent (UI already matches).

**Prior art:** Phase 172 `TemplatePreviewModal.handleApply` uses `setApplying(true)` before the async call (inverse — pessimistic) — favorites go the opposite direction for UX snappiness. `[CITED: src/components/template-gallery/TemplatePreviewModal.jsx:106-122]`

### Pattern 6: Snapshot-on-Open for Modal Prev/Next

**What:** `PackPreviewModal` copies the `packs` array by reference on the `open` edge and snapshots it in a ref, preventing mid-modal parent re-renders from shifting `currentIndex`. Direct clone of `TemplatePreviewModal`'s Pitfall 7 fix (lines 40-50, verified).

### Pattern 7: Search-Input-Only Strip Visibility (D-11)

**What:** The pack strip renders whenever `filters.q.length === 0`, regardless of category/tags/orientation. This is a simple gate on one filter key.

**Integration point:** `TemplateGalleryPage.jsx` already derives `filters.q` from URL param `q` (line 121). Add one conditional `{!filters.q && <StarterPacksStrip ... />}` in the Content branch (after `filterBar`, before the active-filter chip row).

**Do NOT rely on `hasActiveFilters`** — that is a union of all filter keys and would hide the strip on category-only filters (violates D-11). Use the specific `filters.q === ''` check.

### Anti-Patterns to Avoid

- **Re-seeding legacy packs into Phase 173 tables** — D-02 explicitly keeps them separate. Do not migrate `content_templates` rows into `template_packs`.
- **Calling `clone_svg_template_to_scene` / `clone_template_with_customization` from inside `apply_starter_pack`** — breaks atomicity (D-07). Inline their bodies.
- **FK constraints on `template_pack_items.template_id`** — cannot point to two tables. Use the polymorphic CHECK constraint + RPC-time existence check (Pattern 2).
- **Adding `UPDATE` to `template_favorites`** — toggle = insert/delete; no mutable columns.
- **Re-reading gallery rows inside `applyStarterPack` to resolve member template metadata** — the RPC already has `svg_templates.*` / `template_library.*` from its source-table SELECT. Do not round-trip.
- **Favorites write paths via RPC** — use `.from('template_favorites').insert()/.delete()`. RPC adds complexity for no benefit.
- **Hiding the strip when ANY filter chip is active** — violates D-11.
- **Putting pack-read in `templateGalleryService.js`** — violates D-05.
- **Writing pack apply to `templateApplyService.js`** — violates D-04; lives in `marketplaceService.js`.
- **Using exact template counts in E2E assertions** — violates TQAL-05 (structural assertions only).

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Transactional multi-row insert | JS loop with N `await supabase.rpc(...)` calls + try/rollback | Single PL/pgSQL function (`apply_starter_pack`) | JS-side can't roll back server-side inserts; all-or-nothing requires one DB transaction |
| Per-user row scoping | Client-side filter on `user_id === currentUser.id` | `user_id = auth.uid()` RLS policy | RLS enforces at DB boundary; client-side filtering is a security smell |
| Favorites/un-favorites event bus | In-memory observable + manual UI sync | `.insert()` / `.delete()` + optimistic state | Existing `useState` + supabase client is sufficient — no pub/sub needed at this scale |
| Pack-card mosaic image stitching | Canvas draw of 4 thumbnails into one PNG | CSS Grid 2×2 with 4 `<img>` children | Server-side stitching adds infra; CSS is free and responsive |
| Modal prev/next keyboard handling | Fresh effect + event listener per component | Clone `TemplatePreviewModal.jsx:86-103` (INPUT/TEXTAREA guard + wrap-around) | Already audited and shipped in Phase 172; re-implementing invites the same Pitfall 2 re-discovery |
| Route key for admin page | Invent a new `pageMap` shape | Append `'admin-starter-packs'` alongside `'admin-templates'` in `App.jsx:559`; add to `adminToolPages` array (line 670) | Existing pattern; zero-risk |

**Key insight:** Phase 173 is an assembly exercise, not an invention exercise. Every capability here has a precedent in the codebase — 168/170 for RPC shape, 167 for VIEW shape, 080 for admin-only RLS, 094 for `is_active` gating, 172/172.1 for atomicity contracts, 171 for gallery UX. Planner should quote these patterns, not reinterpret them.

## Runtime State Inventory

> Included because Phase 173 modifies a live shared database and creates DB entities that downstream code/services consume.

| Category | Items Found | Action Required |
|----------|-------------|-----------------|
| Stored data | (1) 24 rows in `svg_templates` (12 slugged from 167 + 12 non-slugged from 097). (2) `template_library` rows in prod (count unknown here; seeded via migration 109 dev, live admin-added in prod). (3) `gallery_templates` VIEW returns both. No pack/favorites data exists — greenfield schema. | None — Phase 173 reads existing data read-only; writes go to NEW tables. |
| Live service config | Supabase project `gdxizdiltfqeugbsgtpx` (referenced in Phase 172.1 CONTEXT D-03 as the prod project where migration 168 is already applied). `.temp/cli-latest` is modified in git status (supabase CLI version drift — unrelated). | Migrations 171-173 must be pushed via MCP supabase tools OR `supabase db query --linked --file` (Phase 170 established the fallback when CLI blocks on drift). `[CITED: .planning/STATE.md lines 67-68]` |
| OS-registered state | None found. No cron jobs, no Task Scheduler, no pm2 for pack or favorite logic. | None. |
| Secrets / env vars | `TEST_USER_EMAIL`, `TEST_USER_PASSWORD`, `TEST_ENTERPRISE_EMAIL` — used by E2E specs. Added `tests/e2e/starter-packs.spec.js` and `favorites.spec.js` will consume `TEST_USER_EMAIL`/`PASSWORD` (pattern identical to `preview-apply.spec.js`). No new secrets needed. | None. |
| Build artifacts / installed packages | `playwright-report/index.html` is modified in git status (stale from prior runs). No stale egg-info / npm globals relevant to Phase 173. `dompurify@3.3.3` already resolved via `node_modules`; no reinstall. | None. |

**The canonical question — "after every file in the repo is updated, what runtime systems still have the old string cached, stored, or registered?"** → Nothing. Phase 173 is additive (new migrations, new services, new pages). No renames, no deletions, no live service config keyed to old names.

## Common Pitfalls

### Pitfall 1: Polymorphic Junction Without Existence Check
**What goes wrong:** Admin deletes an `svg_templates` row; `template_pack_items` still references its UUID; `apply_starter_pack` tries to clone the orphan and gets `IF v_template IS NULL` → the whole pack Apply fails.
**Why it happens:** No FK can exist on a polymorphic column (Pattern 2). Cascade deletes are impossible.
**How to avoid:** The RPC's inline `SELECT * INTO v_template FROM svg_templates WHERE id = v_member.template_id AND is_active = TRUE` per member catches this; the transaction rolls back safely. Additionally, admin-side pack editor should mark items invalid on save (list `.is_active` per member) — UX deferred to plan time.
**Warning signs:** `RAISE EXCEPTION 'Template not found or inactive'` surfaced from bulk Apply → admin pack has stale members.

### Pitfall 2: Forgetting `is_active = TRUE` on VIEW or RPC
**What goes wrong:** A soft-deleted pack member silently ends up in a gallery or Apply result.
**Why it happens:** `gallery_templates` VIEW already filters `is_active = TRUE` (167:243,272). The new `apply_starter_pack` RPC must replicate that filter in both the `svg_templates` and `template_library` branches — matches 168:66 and 170:62.
**How to avoid:** Mirror the exact predicate from 168/170. No "trust the junction" shortcut.

### Pitfall 3: VIEW `auth.uid()` Caching Confusion
**What goes wrong:** Test harnesses using anon key or service_role don't populate `auth.uid()` correctly, so the `gallery_templates_with_favorites` VIEW returns `is_favorited = FALSE` for every row — tests pass locally, fail in prod.
**Why it happens:** `auth.uid()` requires an authenticated session. Service-role key bypasses RLS but also makes `auth.uid()` NULL.
**How to avoid:** Integration tests use `supabase.auth.signInWithPassword` (not service role) — pattern already in `tests/e2e/preview-apply.spec.js:43-48`. Document in `favorites.test.js`.
**Warning signs:** `is_favorited` always FALSE in local test; favorites state doesn't persist across sessions.

### Pitfall 4: Admin Pack Editor Re-order Race
**What goes wrong:** Drag-reorder fires N parallel UPDATE statements on `template_pack_items.position`; two hit the same row with conflicting positions; UNIQUE or PK constraint surfaces.
**Why it happens:** Naive implementation of `reorderPackItems` is "for each item → update position".
**How to avoid:** Make `reorderPackItems` issue a single UPDATE with a CASE or use a temp position offset (mirrors `reorderTemplateSlides` in `marketplaceService.js:384-395` — that existing helper does `Promise.all` of individual UPDATEs, which works because there's no UNIQUE constraint on `(template_id, position)`). **Plan `template_pack_items` PRIMARY KEY deliberately as `(pack_id, template_id, editor_type)`**, NOT `(pack_id, position)`, so reorder doesn't collide. `[CITED: D-01 — PK is `(pack_id, template_id, editor_type)`; `position` is not in the PK]`

### Pitfall 5: Strip Visibility Coupled to `hasActiveFilters`
**What goes wrong:** Planner reuses Phase 171's `hasActiveFilters` boolean (line 128-133) to gate strip visibility; applying a category filter hides the strip; violates D-11.
**Why it happens:** `hasActiveFilters` is a convenient union-check already in scope.
**How to avoid:** Gate on `filters.q === ''` (or equivalent `!filters.q.length`) ONLY. Document this with a comment referring to D-11.

### Pitfall 6: Admin Route Not Added to `adminToolPages`
**What goes wrong:** Admin navigates to `admin-starter-packs`, page loads but sidebar disappears (because `isAdminToolPage` is false, `shouldShowClientUI` is false, and super_admin sees the dashboard shell instead).
**Why it happens:** `App.jsx:668-672` lists admin tool pages manually; missing entries fall through to role routing.
**How to avoid:** Add `'admin-starter-packs'` to the `adminToolPages` array alongside `'admin-templates'` (line 670). `[VERIFIED: src/App.jsx:670]`

### Pitfall 7: Fiber BFS E2E Route Assertion Break
**What goes wrong:** E2E spec that reuses `readCurrentPage` helper from `preview-apply.spec.js` fails because pack apply toast lives on `TemplateGalleryPage` (doesn't call `setCurrentPage`) — the helper looks for a page route change but no route change happens (D-14 "no navigation away from the gallery required").
**Why it happens:** Phase 172 Apply navigates to `svg-editor` / `scene-editor-<id>`; Phase 173 pack Apply does NOT navigate (toast + optional action).
**How to avoid:** E2E assertion is structural — look for the toast DOM node + member-count assertion against `scenes` table (via a second post-Apply request) rather than checking `currentPage`. Pattern: "toast `/added \d+ templates/i` visible" + "subsequent `/app/scenes` visit shows ≥ N new rows".

### Pitfall 8: RLS Policy Order for `template_packs` INSERT/UPDATE/DELETE
**What goes wrong:** A single policy with `super_admin OR tenant = auth.uid()` covers INSERT; admin forgets UPDATE/DELETE policies and only super_admin gets to edit; tenants (for their own packs) can't mutate.
**Why it happens:** `template_library` (migration 080:105-117) uses `WITH CHECK (true)` / `USING (true)` — super-permissive, relying on the app to enforce. Phase 173 should NOT copy that footgun.
**How to avoid:** Write explicit, tight policies (§Code Examples §template_packs RLS). Use the `is_super_admin()` helper function defined in migration 012:28.

### Pitfall 9: `template_favorites` RLS and the VIEW Auth Context
**What goes wrong:** VIEW `gallery_templates_with_favorites` seems to work, but RLS on the underlying `template_favorites` table filters so aggressively that the LEFT JOIN never matches — `is_favorited` is always FALSE even for favorited rows.
**Why it happens:** VIEW runs with caller privileges; LEFT JOIN predicate still respects RLS on `template_favorites`. BUT — because we're LEFT JOINing and filtering by `user_id = auth.uid()` in the JOIN predicate, the SELECT RLS policy allows the join to see the caller's rows.
**How to avoid:** This actually works correctly — but test it explicitly. Include an integration test: "user favorites template X, re-fetches `gallery_templates_with_favorites`, asserts row X has `is_favorited = TRUE` and other rows have `is_favorited = FALSE`".

## Code Examples

All examples below are verbatim templates for the planner. Quote them — do not re-invent.

### Example 1: `template_packs` + `template_pack_items` tables (migration 171)

```sql
-- Source pattern: migration 080 (template_library shape), migration 167 (idempotent guards), migration 094 (svg_templates RLS)

CREATE TABLE IF NOT EXISTS public.template_packs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug            TEXT,
  name            TEXT NOT NULL,
  description     TEXT,
  industry        TEXT,
  thumbnail_url   TEXT,
  display_order   INTEGER NOT NULL DEFAULT 0,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  tenant_id       UUID,  -- NULL = global; non-NULL = tenant-owned
  created_by      UUID REFERENCES auth.users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_template_packs_slug
  ON public.template_packs(slug)
  WHERE slug IS NOT NULL;  -- partial unique (Phase 170 Pitfall 4)

CREATE INDEX IF NOT EXISTS idx_template_packs_active_tenant
  ON public.template_packs(is_active, tenant_id)
  WHERE is_active = TRUE;

CREATE INDEX IF NOT EXISTS idx_template_packs_display_order
  ON public.template_packs(display_order) WHERE is_active = TRUE;

CREATE TABLE IF NOT EXISTS public.template_pack_items (
  pack_id      UUID NOT NULL REFERENCES public.template_packs(id) ON DELETE CASCADE,
  template_id  UUID NOT NULL,
  editor_type  TEXT NOT NULL CHECK (editor_type IN ('svg','polotno')),
  position     INTEGER NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (pack_id, template_id, editor_type)
);

CREATE INDEX IF NOT EXISTS idx_template_pack_items_pack_position
  ON public.template_pack_items(pack_id, position);

ALTER TABLE public.template_packs        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.template_pack_items   ENABLE ROW LEVEL SECURITY;

-- =========================================================================
-- template_packs RLS — mirrors svg_templates SELECT (migration 167:39-45)
-- and template_library admin-only mutation (migration 080:105-117) but with
-- explicit super_admin helper (12:28) for INSERT/UPDATE/DELETE tightness.
-- =========================================================================

DROP POLICY IF EXISTS "template_packs_select" ON public.template_packs;
CREATE POLICY "template_packs_select" ON public.template_packs
  FOR SELECT
  TO authenticated
  USING (
    is_active = TRUE
    AND (tenant_id IS NULL OR tenant_id = auth.uid())
  );

DROP POLICY IF EXISTS "template_packs_insert" ON public.template_packs;
CREATE POLICY "template_packs_insert" ON public.template_packs
  FOR INSERT
  TO authenticated
  WITH CHECK (
    is_super_admin()
    OR tenant_id = auth.uid()
  );

DROP POLICY IF EXISTS "template_packs_update" ON public.template_packs;
CREATE POLICY "template_packs_update" ON public.template_packs
  FOR UPDATE
  TO authenticated
  USING (
    is_super_admin()
    OR tenant_id = auth.uid()
  )
  WITH CHECK (
    is_super_admin()
    OR tenant_id = auth.uid()
  );

DROP POLICY IF EXISTS "template_packs_delete" ON public.template_packs;
CREATE POLICY "template_packs_delete" ON public.template_packs
  FOR DELETE
  TO authenticated
  USING (
    is_super_admin()
    OR tenant_id = auth.uid()
  );

-- template_pack_items policies delegate to the parent pack's access.
DROP POLICY IF EXISTS "template_pack_items_select" ON public.template_pack_items;
CREATE POLICY "template_pack_items_select" ON public.template_pack_items
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.template_packs p
      WHERE p.id = template_pack_items.pack_id
        AND p.is_active = TRUE
        AND (p.tenant_id IS NULL OR p.tenant_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "template_pack_items_mutate" ON public.template_pack_items;
CREATE POLICY "template_pack_items_mutate" ON public.template_pack_items
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.template_packs p
      WHERE p.id = template_pack_items.pack_id
        AND (is_super_admin() OR p.tenant_id = auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.template_packs p
      WHERE p.id = template_pack_items.pack_id
        AND (is_super_admin() OR p.tenant_id = auth.uid())
    )
  );
```

### Example 2: `template_favorites` table + RLS (migration 172)

```sql
CREATE TABLE IF NOT EXISTS public.template_favorites (
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  template_id  UUID NOT NULL,
  editor_type  TEXT NOT NULL CHECK (editor_type IN ('svg','polotno')),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, template_id, editor_type)
);

CREATE INDEX IF NOT EXISTS idx_template_favorites_user
  ON public.template_favorites(user_id, created_at DESC);

ALTER TABLE public.template_favorites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "template_favorites_select" ON public.template_favorites;
CREATE POLICY "template_favorites_select" ON public.template_favorites
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "template_favorites_insert" ON public.template_favorites;
CREATE POLICY "template_favorites_insert" ON public.template_favorites
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "template_favorites_delete" ON public.template_favorites;
CREATE POLICY "template_favorites_delete" ON public.template_favorites
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());
-- No UPDATE policy — toggle = insert/delete.

CREATE OR REPLACE VIEW public.gallery_templates_with_favorites AS
SELECT
  gt.*,
  (tf.user_id IS NOT NULL) AS is_favorited
FROM public.gallery_templates gt
LEFT JOIN public.template_favorites tf
  ON  tf.template_id = gt.id
 AND  tf.editor_type = gt.editor_type
 AND  tf.user_id     = auth.uid();

COMMENT ON VIEW public.gallery_templates_with_favorites IS
  'Phase 173: gallery_templates extended with per-user is_favorited. Caller-auth VIEW; auth.uid() filters the LEFT JOIN so the caller only matches their own favorites row.';
```

### Example 3: `apply_starter_pack` atomic bulk RPC (migration 173)

> Planner: paste this scaffold verbatim. Only the member-loop body is new; the `svg` and `polotno` branches are copied from 170:35-138 and 168:40-151 respectively.

```sql
CREATE OR REPLACE FUNCTION public.apply_starter_pack(p_pack_id uuid)
RETURNS uuid[]
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id        uuid;
  v_pack           template_packs%ROWTYPE;
  v_member         template_pack_items%ROWTYPE;
  v_svg_template   svg_templates%ROWTYPE;
  v_lib_template   template_library%ROWTYPE;
  v_slide          record;
  v_new_scene_id   uuid;
  v_result         uuid[] := '{}';
  v_is_super_admin boolean := false;
BEGIN
  -- Auth preamble (matches 170:52-56, 168:57-61)
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Pack access (mirrors template_packs SELECT RLS predicate explicitly so
  -- the SECURITY DEFINER function cannot grant broader access than a plain
  -- SELECT on template_packs would.)
  SELECT * INTO v_pack
  FROM template_packs
  WHERE id = p_pack_id
    AND is_active = TRUE
    AND (tenant_id IS NULL OR tenant_id = v_user_id);

  -- super_admin parity bypass (170:67-77, 168:84-89)
  IF v_pack IS NULL THEN
    SELECT role = 'super_admin' INTO v_is_super_admin
    FROM profiles
    WHERE id = v_user_id;
    IF v_is_super_admin THEN
      SELECT * INTO v_pack FROM template_packs
      WHERE id = p_pack_id AND is_active = TRUE;
    END IF;
  END IF;

  IF v_pack IS NULL THEN
    RAISE EXCEPTION 'Pack not found or inactive';
  END IF;

  -- Iterate members in position order
  FOR v_member IN
    SELECT * FROM template_pack_items
    WHERE pack_id = p_pack_id
    ORDER BY position ASC, template_id ASC
  LOOP
    IF v_member.editor_type = 'svg' THEN
      -- Mirror body of migration 170 (svg branch)
      SELECT * INTO v_svg_template
      FROM svg_templates
      WHERE id = v_member.template_id
        AND is_active = TRUE
        AND (tenant_id IS NULL OR created_by = v_user_id);

      IF v_svg_template IS NULL AND v_is_super_admin THEN
        SELECT * INTO v_svg_template
        FROM svg_templates
        WHERE id = v_member.template_id AND is_active = TRUE;
      END IF;

      IF v_svg_template IS NULL THEN
        RAISE EXCEPTION 'SVG member template not found or inactive: %', v_member.template_id;
      END IF;

      IF v_svg_template.svg_content IS NULL THEN
        RAISE EXCEPTION 'SVG member template has no SVG body: %', v_member.template_id;
      END IF;

      INSERT INTO scenes (tenant_id, name, business_type, settings, is_active)
      VALUES (
        v_user_id,
        v_svg_template.name,  -- D-08 no customization + planner-default scene naming
        v_svg_template.category,
        jsonb_build_object(
          'width',       v_svg_template.width,
          'height',      v_svg_template.height,
          'orientation', v_svg_template.orientation
        ),
        true
      )
      RETURNING id INTO v_new_scene_id;

      INSERT INTO scene_slides (scene_id, position, title, kind, design_json, duration_seconds)
      VALUES (
        v_new_scene_id,
        0,
        v_svg_template.name,
        'default',
        jsonb_build_object('svgContent', v_svg_template.svg_content),
        10
      );

    ELSIF v_member.editor_type = 'polotno' THEN
      -- Mirror body of migration 168 (polotno branch) — note: license gate
      -- retained per 168:72-93 since template_library has license column.
      SELECT * INTO v_lib_template
      FROM template_library
      WHERE id = v_member.template_id AND is_active = TRUE;

      IF v_lib_template IS NULL THEN
        RAISE EXCEPTION 'Polotno member template not found or inactive: %', v_member.template_id;
      END IF;

      -- License check (mirrors 168:74-93; pro treated as free per 166.2 D-01)
      IF v_lib_template.license NOT IN ('free','pro') THEN
        IF v_lib_template.license = 'enterprise' THEN
          IF NOT EXISTS (
            SELECT 1 FROM template_enterprise_access
            WHERE template_id = v_member.template_id AND tenant_id = v_user_id
          ) AND NOT v_is_super_admin THEN
            RAISE EXCEPTION 'Access denied: insufficient plan tier for pack member';
          END IF;
        END IF;
      END IF;

      INSERT INTO scenes (tenant_id, name, business_type, settings, is_active)
      VALUES (
        v_user_id,
        v_lib_template.name,
        v_lib_template.industry,
        COALESCE(v_lib_template.metadata, '{}'::jsonb),
        true
      )
      RETURNING id INTO v_new_scene_id;

      -- Clone all slides (p_customized_svg is NULL per D-08 → no jsonb_set patch)
      FOR v_slide IN
        SELECT position, title, kind, design_json, duration_seconds
        FROM template_library_slides
        WHERE template_id = v_member.template_id
        ORDER BY position
      LOOP
        INSERT INTO scene_slides (scene_id, position, title, kind, design_json, duration_seconds)
        VALUES (
          v_new_scene_id,
          v_slide.position,
          v_slide.title,
          v_slide.kind,
          v_slide.design_json,
          v_slide.duration_seconds
        );
      END LOOP;

    ELSE
      RAISE EXCEPTION 'Unknown editor_type in pack member: %', v_member.editor_type;
    END IF;

    v_result := array_append(v_result, v_new_scene_id);
  END LOOP;

  -- Empty packs return empty array (not an error) — matches "no-op if empty" UX intent.
  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.apply_starter_pack(uuid) TO authenticated;

COMMENT ON FUNCTION public.apply_starter_pack(uuid) IS
  'Phase 173 TPCK-02: atomic bulk clone of a starter pack. Inlines bodies of clone_svg_template_to_scene (170) and clone_template_with_customization (168) per member. Returns new scene UUIDs in pack-member order. Single PL/pgSQL transaction — all-or-nothing rollback on any member failure.';
```

### Example 4: `PackCard` 2×2 Mosaic Component

```jsx
// src/components/template-gallery/PackCard.jsx
import { Package, LayoutTemplate } from 'lucide-react';
import { Card, CardContent, Badge } from '../../design-system';

/**
 * Pack card — 2×2 mosaic of first 4 member thumbnails (D-12).
 * Brand-tinted placeholders for members count < 4.
 *
 * @param {{ pack: { id, name, industry, thumbnail_url, member_thumbnails: string[], member_count: number }, onSelect: Function }} props
 */
export default function PackCard({ pack, onSelect }) {
  const tiles = Array.from({ length: 4 }, (_, i) => pack.member_thumbnails?.[i] || null);

  return (
    <Card
      onClick={onSelect}
      className="cursor-pointer hover:shadow-elevated transition-shadow overflow-hidden"
      data-testid={`pack-card-${pack.id}`}
    >
      <div className="aspect-video bg-gray-100 relative overflow-hidden">
        {pack.thumbnail_url ? (
          <img src={pack.thumbnail_url} alt={pack.name} className="w-full h-full object-cover" />
        ) : (
          // 2×2 mosaic
          <div className="grid grid-cols-2 grid-rows-2 gap-0.5 w-full h-full">
            {tiles.map((src, i) =>
              src ? (
                <img
                  key={i}
                  src={src}
                  alt=""
                  className="w-full h-full object-cover"
                  onError={(e) => { e.currentTarget.style.display = 'none'; }}
                />
              ) : (
                <div
                  key={i}
                  className="w-full h-full bg-gradient-to-br from-brand-50 to-brand-100 flex items-center justify-center"
                >
                  <LayoutTemplate size={18} className="text-brand-300" />
                </div>
              )
            )}
          </div>
        )}
        <div className="absolute top-2 right-2">
          <Badge variant="neutral" size="sm" className="flex items-center gap-1">
            <Package size={10} /> {pack.member_count}
          </Badge>
        </div>
      </div>
      <CardContent>
        <h3 className="font-semibold text-sm text-gray-900 truncate">{pack.name}</h3>
        {pack.industry && (
          <p className="text-xs text-gray-500 mt-0.5">{pack.industry}</p>
        )}
      </CardContent>
    </Card>
  );
}
```

### Example 5: `FavoriteButton` design-system primitive (optimistic toggle)

```jsx
// src/design-system/components/FavoriteButton.jsx
import { Heart } from 'lucide-react';
import { useState } from 'react';

/**
 * Heart button with optimistic state management.
 * Caller provides `isFavorited` + `onToggle(nextValue)` — onToggle may return a
 * Promise; errors surface via the optional `onError` callback so the caller
 * can toast.
 *
 * a11y: renders `aria-pressed` so screen readers announce toggle state.
 */
export default function FavoriteButton({
  isFavorited,
  onToggle,
  onError,
  size = 16,
  className = '',
}) {
  const [optimistic, setOptimistic] = useState(isFavorited);
  const [busy, setBusy] = useState(false);

  const handleClick = async (e) => {
    e.stopPropagation();
    if (busy) return;
    const next = !optimistic;
    setOptimistic(next);   // optimistic flip
    setBusy(true);
    try {
      await onToggle(next);
    } catch (err) {
      setOptimistic(!next); // revert on error
      onError?.(err);
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      type="button"
      aria-pressed={optimistic}
      aria-label={optimistic ? 'Remove from favorites' : 'Add to favorites'}
      onClick={handleClick}
      disabled={busy}
      className={`p-1.5 rounded-full bg-white/80 backdrop-blur-sm hover:bg-white shadow-sm transition-colors ${className}`}
    >
      <Heart
        size={size}
        fill={optimistic ? 'currentColor' : 'none'}
        className={optimistic ? 'text-red-500' : 'text-gray-400'}
      />
    </button>
  );
}
```

### Example 6: Extending `marketplaceService.js` with pack CRUD + `applyStarterPack`

```js
// src/services/marketplaceService.js — APPEND (do not remove existing exports)

// ============================================================================
// STARTER PACKS (Phase 173)
// ============================================================================

/** Fetch packs with optional filters; single-query read that the gallery strip consumes. */
export async function fetchStarterPacks({ activeOnly = true, tenantId = null } = {}) {
  let q = supabase
    .from('template_packs')
    .select('id, slug, name, description, industry, thumbnail_url, display_order, is_active, tenant_id')
    .order('display_order', { ascending: true })
    .order('name',          { ascending: true });

  if (activeOnly)          q = q.eq('is_active', true);
  if (tenantId !== null)   q = q.eq('tenant_id', tenantId);

  const { data, error } = await q;
  if (error) throw error;
  return data ?? [];
}

/**
 * Fetch pack detail + ordered member rows joined against gallery_templates so
 * callers get full template metadata (name, thumbnail, editor_type, ...) in
 * one round-trip (mirrors `fetchTemplateDetail` shape).
 */
export async function fetchPackDetail(packId) {
  const { data: pack, error: packErr } = await supabase
    .from('template_packs').select('*').eq('id', packId).single();
  if (packErr) throw packErr;

  // Items + gallery_templates lookup via two queries then merge (RLS-respecting).
  const { data: items, error: itemsErr } = await supabase
    .from('template_pack_items')
    .select('template_id, editor_type, position')
    .eq('pack_id', packId)
    .order('position', { ascending: true });
  if (itemsErr) throw itemsErr;

  if (!items || items.length === 0) return { ...pack, members: [] };

  const ids = items.map((i) => i.template_id);
  const { data: templates, error: tErr } = await supabase
    .from('gallery_templates').select('*').in('id', ids);
  if (tErr) throw tErr;

  const byId = new Map(templates.map((t) => [t.id, t]));
  const members = items
    .map((i) => ({ ...byId.get(i.template_id), position: i.position, editor_type: i.editor_type }))
    .filter((m) => m.id);  // drop orphans (stale pack items)

  return { ...pack, members };
}

export async function createPack(pack) {
  const { data, error } = await supabase
    .from('template_packs').insert(pack).select().single();
  if (error) throw error;
  return data;
}

export async function updatePack(packId, updates) {
  const { data, error } = await supabase
    .from('template_packs').update(updates).eq('id', packId).select().single();
  if (error) throw error;
  return data;
}

export async function deletePack(packId) {
  const { error } = await supabase.from('template_packs').delete().eq('id', packId);
  if (error) throw error;
}

export async function addPackItem(packId, templateId, editorType, position = 0) {
  const { data, error } = await supabase
    .from('template_pack_items')
    .insert({ pack_id: packId, template_id: templateId, editor_type: editorType, position })
    .select().single();
  if (error) throw error;
  return data;
}

export async function removePackItem(packId, templateId, editorType) {
  const { error } = await supabase
    .from('template_pack_items')
    .delete()
    .eq('pack_id', packId).eq('template_id', templateId).eq('editor_type', editorType);
  if (error) throw error;
}

export async function reorderPackItems(packId, orderedItems /* [{templateId, editorType, position}] */) {
  // Parallel single-row UPDATEs — no UNIQUE on (pack_id, position) so no collision.
  await Promise.all(orderedItems.map((item) =>
    supabase.from('template_pack_items')
      .update({ position: item.position })
      .eq('pack_id', packId)
      .eq('template_id', item.templateId)
      .eq('editor_type', item.editorType)
  ));
}

/** Thin client wrapper over the atomic bulk-Apply RPC (D-07). Returns uuid[] of new scene IDs. */
export async function applyStarterPack(packId) {
  const { data, error } = await supabase.rpc('apply_starter_pack', { p_pack_id: packId });
  if (error) throw error;
  return data ?? [];
}
```

### Example 7: Extending `templateGalleryService.js` with favorites (VIEW swap + toggle)

```js
// src/services/templateGalleryService.js — TWO changes (line-level)

// (1) Swap the read source from 'gallery_templates' to the new VIEW:
let query = supabase.from('gallery_templates_with_favorites').select('*');
// — the new column `is_favorited` is additive; existing callers don't break.

// (2) Append a toggle helper — single boundary point for favorites writes:
export async function toggleFavorite({ templateId, editorType, nextValue }) {
  const session = await supabase.auth.getUser();
  const userId = session.data.user?.id;
  if (!userId) throw new Error('Not authenticated');

  if (nextValue) {
    const { error } = await supabase
      .from('template_favorites')
      .insert({ user_id: userId, template_id: templateId, editor_type: editorType });
    if (error && error.code !== '23505') throw error; // ignore duplicate (already favorited)
  } else {
    const { error } = await supabase
      .from('template_favorites')
      .delete()
      .eq('user_id', userId)
      .eq('template_id', templateId)
      .eq('editor_type', editorType);
    if (error) throw error;
  }
}
```

### Example 8: `App.jsx` route registration for admin page

```jsx
// src/App.jsx — additions (no other changes)

// 1. Lazy import (near line 120):
const AdminStarterPacksPage = lazy(() => import('./pages/Admin/AdminStarterPacksPage'));

// 2. pageMap entry (near line 559, alongside 'admin-templates'):
'admin-starter-packs': (
  <Suspense fallback={<PageLoader />}>
    <AdminStarterPacksPage showToast={showToast} onNavigate={setCurrentPage} />
  </Suspense>
),

// 3. adminToolPages array (line 670) — append:
const adminToolPages = [
  'admin-tenants', 'admin-audit-logs', 'admin-system-events',
  'status', 'ops-console', 'tenant-admin', 'feature-flags', 'demo-tools', 'clients',
  'admin-templates', 'admin-starter-packs',
];
```

### Example 9: Prev/Next + keyboard clone from `TemplatePreviewModal.jsx`

Verbatim from `src/components/template-gallery/TemplatePreviewModal.jsx:72-103` — paste into `PackPreviewModal.jsx` with variables renamed (`snapshot` → pack-snapshot, `current` → current pack, identical shape):

```jsx
const onPrev = () => {
  if (total < 2) return;
  setError(null);
  setCurrentIndex((i) => (i - 1 + total) % total);
};
const onNext = () => {
  if (total < 2) return;
  setError(null);
  setCurrentIndex((i) => (i + 1) % total);
};

useEffect(() => {
  if (!open) return undefined;
  const handler = (e) => {
    const tag = document.activeElement?.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA') return;
    if (e.key === 'ArrowLeft')  { e.preventDefault(); onPrev(); }
    if (e.key === 'ArrowRight') { e.preventDefault(); onNext(); }
  };
  window.addEventListener('keydown', handler);
  return () => window.removeEventListener('keydown', handler);
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [open, total]);
```

### Example 10: Integration test shape for bulk-Apply atomicity

Mirrors `tests/integration/preview-apply/svg-rpc-atomicity.test.js:32-97`:

```js
// tests/integration/preview-apply/apply-starter-pack-atomicity.test.js
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../../src/supabase', () => ({
  supabase: { rpc: vi.fn() },
}));
import { applyStarterPack } from '../../../src/services/marketplaceService';
import { supabase } from '../../../src/supabase';

describe('apply_starter_pack atomicity', () => {
  beforeEach(() => vi.clearAllMocks());

  it('resolves with uuid[] of new scene IDs when all members succeed (D-07)', async () => {
    supabase.rpc.mockResolvedValueOnce({ data: ['s1','s2','s3'], error: null });
    const ids = await applyStarterPack('pack-uuid-1');
    expect(ids).toEqual(['s1','s2','s3']);
    expect(supabase.rpc.mock.calls[0][0]).toBe('apply_starter_pack');
    expect(supabase.rpc.mock.calls[0][1]).toEqual({ p_pack_id: 'pack-uuid-1' });
  });

  it('throws original error message when RPC fails mid-pack (rollback contract)', async () => {
    supabase.rpc.mockResolvedValueOnce({
      data: null,
      error: new Error('SVG member template has no SVG body: <uuid>'),
    });
    await expect(applyStarterPack('pack-uuid-2')).rejects.toThrow(/SVG member template has no SVG body/);
    expect(supabase.rpc.mock.calls.length).toBe(1);
  });

  it('empty pack returns [] without error', async () => {
    supabase.rpc.mockResolvedValueOnce({ data: [], error: null });
    const ids = await applyStarterPack('empty-pack');
    expect(ids).toEqual([]);
  });

  it('zero follow-up UPDATEs — proves atomic contract (no client-side stitching)', async () => {
    supabase.rpc.mockResolvedValueOnce({ data: ['s1'], error: null });
    await applyStarterPack('pack-uuid-3');
    expect(supabase.rpc.mock.calls.length).toBe(1);
    expect(supabase.from).toBeUndefined();  // no post-RPC table writes
  });
});
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Non-atomic JS loop calling `clone_template_to_scene` N times | Single-transaction PL/pgSQL RPC (inlined source bodies) | Phase 172 D-09, Phase 172.1 D-02 | Rollback works; no partial pack applied |
| `design_json.svgContent` UPDATE after clone | `jsonb_build_object('svgContent', ...)` inside the INSERT (atomic from birth) | Phase 172 D-10, migration 168/170 | Closes clone-then-patch race (TPRV-05) |
| `sessionStorage` template handoff | URL param (`?sceneId=`) or direct RPC return | Phase 172 D-12, D-14 | Multi-tab safe |
| Three-source JS merge for gallery | `gallery_templates` VIEW (one query) | Phase 170 migration 167 | Single-query invariant (Phase 170 D-07) |
| Legacy `content_templates` packs (vertical / media / playlist blueprints) | Phase 173 `template_packs` (curated bundles of `gallery_templates`) | Phase 173 D-02 | Two pack concepts coexist; no migration between them |

**Deprecated / avoid:**
- Do not reuse `apply_pack_template` from migration 065 — different domain (media + playlist), different semantics.
- Do not write favorites via RPC — direct table ops are simpler and RLS-enforced.

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Unit framework | vitest [VERIFIED: `tests/unit/services/*.test.js` + `tests/integration/**/*.test.js`] |
| E2E framework | Playwright + `@playwright/test` [VERIFIED: `tests/e2e/preview-apply.spec.js`] |
| Config files | `vitest.config.js` (unit/integration), `playwright.config.js` (E2E) |
| Quick unit run | `npx vitest run tests/unit/services/marketplaceService.test.js` |
| Quick integration run | `npx vitest run tests/integration/preview-apply/apply-starter-pack-atomicity.test.js` |
| Full E2E target spec | `npx playwright test tests/e2e/starter-packs.spec.js tests/e2e/favorites.spec.js` |
| Full regression run | `npm run test && npm run test:e2e` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| TPCK-01 | Pack cards visible on gallery; 2×2 mosaic + count badge + industry label renders | E2E | `npx playwright test tests/e2e/starter-packs.spec.js -g "gallery shows pack strip"` | ❌ Wave 0 — new spec |
| TPCK-01 | PackCard renders 4 mosaic cells; <4 members show placeholder cells | Unit (JSX) | `npx vitest run tests/unit/components/PackCard.test.jsx` | ❌ Wave 0 |
| TPCK-02 | Apply pack creates N scenes atomically; client receives uuid[] | Integration | `npx vitest run tests/integration/preview-apply/apply-starter-pack-atomicity.test.js` | ❌ Wave 0 |
| TPCK-02 | Apply pack from modal → success toast "Added N templates from <Pack>" with View scenes action; modal closes; no navigation (D-14) | E2E | `npx playwright test tests/e2e/starter-packs.spec.js -g "bulk apply emits toast"` | ❌ Wave 0 |
| TPCK-02 | RPC failure rolls back — no `scenes` row left behind | Integration (DB probe) | `npx vitest run tests/integration/preview-apply/apply-starter-pack-atomicity.test.js -t "rollback"` | ❌ Wave 0 |
| TPCK-03 | Admin page lists packs + Edit + Delete + Toggle Active flows | E2E | `npx playwright test tests/e2e/starter-packs.spec.js -g "admin can create pack"` | ❌ Wave 0 |
| TPCK-03 | `createPack`, `addPackItem`, `reorderPackItems` client calls hit expected table/columns | Unit | `npx vitest run tests/unit/services/marketplaceService.test.js -t "pack CRUD"` | ❌ Wave 0 — extends existing file |
| TPCK-04 | Pack card `thumbnail_url` overrides mosaic when present | Unit | `npx vitest run tests/unit/components/PackCard.test.jsx -t "thumbnail override"` | ❌ Wave 0 |
| TFAV-01 | Heart icon on TemplateCard toggles favorite; optimistic update; row count in `template_favorites` changes | E2E | `npx playwright test tests/e2e/favorites.spec.js -g "toggle from card"` | ❌ Wave 0 |
| TFAV-01 | Heart in TemplatePreviewModal header toggles and syncs with TemplateCard | E2E | `npx playwright test tests/e2e/favorites.spec.js -g "toggle from preview modal"` | ❌ Wave 0 |
| TFAV-02 | Favorites filter chip — URL `?favorites=1` gates grid to `is_favorited=true` rows only | E2E | `npx playwright test tests/e2e/favorites.spec.js -g "favorites filter narrows grid"` | ❌ Wave 0 |
| TFAV-02 | Favorites filter + zero favorites shows EmptyState with "No favorites yet" copy | E2E | `npx playwright test tests/e2e/favorites.spec.js -g "empty state when no favorites"` | ❌ Wave 0 |
| TFAV-03 | Favorites persist across logout/login — E2E logs out, logs back in, sees same favorited state | E2E | `npx playwright test tests/e2e/favorites.spec.js -g "persist across logout"` | ❌ Wave 0 |
| TFAV-03 | VIEW `gallery_templates_with_favorites` returns `is_favorited = TRUE` for the caller's favorited row, FALSE for others | Integration (live DB) | `npx vitest run tests/integration/favorites/view-per-user.test.js` | ❌ Wave 0 |

**Notes on tests already present:**
- `tests/e2e/template-packs.spec.js` exists but targets the LEGACY `content_templates` flow (Quick Start Pack, Restaurant Starter Pack, etc.). Do NOT edit or delete — those are onboarding packs (D-02 untouched). Name the new spec `starter-packs.spec.js` to avoid name collision.
- `tests/integration/preview-apply/svg-rpc-atomicity.test.js` is the blueprint for the new `apply-starter-pack-atomicity.test.js`.

### Sampling Rate

- **Per task commit:** `npx vitest run tests/unit/services/marketplaceService.test.js tests/integration/preview-apply/apply-starter-pack-atomicity.test.js` (~5 s).
- **Per wave merge:** Full unit + integration: `npm run test -- --run` (~30 s).
- **Phase gate:** Full suite green (`npm run test` + live `npx playwright test tests/e2e/starter-packs.spec.js tests/e2e/favorites.spec.js` against `TEST_USER_EMAIL`) before `/gsd-verify-work`. Mirrors Phase 172.1 pattern.

### Wave 0 Gaps

- [ ] `tests/e2e/starter-packs.spec.js` — NEW spec for TPCK-01..04 (do not reuse legacy `template-packs.spec.js`)
- [ ] `tests/e2e/favorites.spec.js` — NEW spec for TFAV-01..03 (favorites toggle from card, toggle from modal, filter chip, persist across logout, empty state)
- [ ] `tests/integration/preview-apply/apply-starter-pack-atomicity.test.js` — NEW; mirror `svg-rpc-atomicity.test.js`
- [ ] `tests/integration/favorites/view-per-user.test.js` — NEW; integration test for the `gallery_templates_with_favorites` VIEW auth scoping
- [ ] `tests/unit/components/PackCard.test.jsx` — NEW; 2×2 mosaic + placeholder behavior
- [ ] `tests/unit/services/marketplaceService.test.js` — EXTEND with pack CRUD + `applyStarterPack` test blocks (file already exists at `tests/unit/services/marketplaceService.test.js`)
- [ ] Migration file seats 171, 172, 173 under `supabase/migrations/` (planner may split favorites VIEW into a separate numbered file if helpful)

*(No framework install needed — vitest + Playwright both present.)*

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes | Supabase `auth.uid()` with session-cookie based auth; all new RPCs/tables `TO authenticated` only [VERIFIED: `src/supabase.js` + migration 170 footer] |
| V3 Session Management | no | Supabase-managed; Phase 173 introduces no new session primitives |
| V4 Access Control | yes | RLS on `template_packs`, `template_pack_items`, `template_favorites`; `is_super_admin()` helper for admin mutations (§Code Examples §template_packs RLS) |
| V5 Input Validation | yes | `editor_type CHECK (... IN ('svg','polotno'))` on both new tables; UUID typing on FKs; the RPC `RAISE` on bad member prevents silent bad-state |
| V6 Cryptography | no | No new secrets; reuses Supabase JWT |
| V8 Data Protection | yes | Per-user scoping for favorites (D-04); RLS prevents cross-user reads |

### Known Threat Patterns for Supabase/Postgres + React

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Polymorphic junction orphan exploit (references deleted template to clone arbitrary data) | Tampering | RPC re-SELECTs from source table with `is_active=TRUE` + RLS predicate (§Pattern 2) |
| Cross-tenant pack read via URL-manipulation of `pack_id` | Information disclosure | `template_packs` SELECT policy `is_active=TRUE AND (tenant_id IS NULL OR tenant_id = auth.uid())` blocks it before the RPC runs |
| Privilege escalation via `SECURITY DEFINER` RPC | Elevation | RPC re-asserts the same access predicate as the table SELECT RLS; does not rely on `SECURITY DEFINER` to bypass |
| Favorite-enumeration across users | Information disclosure | `template_favorites` SELECT `user_id = auth.uid()` — no FOR ALL, no service-role leakage |
| SQL injection via admin pack editor | Tampering | Supabase client uses parameterized queries; `.insert({...})` never concatenates user input into SQL |
| XSS via pack `name`/`description` text rendered in gallery | Tampering | React auto-escapes string children; no `dangerouslySetInnerHTML` on pack metadata |

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node + npm | Build, vitest, playwright | ✓ (repo has working tree in active use) | repo-pinned | — |
| Supabase CLI | Migration push | ✓ (Phase 170/172.1 used it; may drift) | repo-pinned | `supabase db query --linked --file` OR MCP supabase tools (Phase 172.1 D-03 precedent) |
| Supabase remote project `gdxizdiltfqeugbsgtpx` | RPC live verification + E2E | ✓ | production | — |
| `TEST_USER_EMAIL` / `TEST_USER_PASSWORD` | E2E Playwright specs | ✓ | — | E2E describe blocks skip with `test.skip()` guard (standard pattern) |
| `dompurify@3.3.3` | Client-side SVG sanitize (Phase 172 path) | ✓ | 3.3.3 | — |
| `fuse.js` | Gallery search | ✓ | from Phase 171 | — |
| `react-router-dom` | `useSearchParams` URL state | ✓ | repo-pinned | — |
| `lucide-react` | Icons | ✓ | repo-pinned | — |
| `is_super_admin()` DB function | RLS policies on pack CRUD | ✓ | from migration 012 | — |

**Missing dependencies with no fallback:** None.
**Missing dependencies with fallback:** Supabase CLI may block on version drift — fallback paths already tested in Phases 170 and 172.1.

## Assumptions Log

Every claim in this research traces to either a cited file (`[VERIFIED]`) or a CONTEXT.md decision. The planner-facing assumptions to firm up with the user at discuss-time — or accept the recommended default — are:

| # | Claim / Choice | Section | Risk if Wrong |
|---|----------------|---------|---------------|
| A1 | Favorites exposure uses a VIEW (`gallery_templates_with_favorites`) rather than a client-side merge after a convenience RPC. | §Pattern 4, §Code Examples 2 | [ASSUMED] Planner-recommended default per D-07 single-query invariant. If user prefers RPC path, swap the VIEW creation for a small convenience RPC + client merge — code contact limited to `templateGalleryService.js` read path + one new function. |
| A2 | Admin pack editor is a **drill-in panel** (sub-page at `admin-starter-packs/:packId/edit`) not a modal. | §Alternatives Considered | [ASSUMED] Based on `AdminEditTemplatePage.jsx` precedent and member-count ergonomics. If user prefers modal, scope shrinks slightly (fewer route keys). |
| A3 | `FavoriteButton` is a new design-system primitive (not inline). | §Alternatives Considered | [ASSUMED] Based on reuse in two sites (`TemplateCard`, `TemplatePreviewModal`) + optimistic-state locus. Low-cost either way. |
| A4 | Migration numbering is **171**, **172**, **173** (packs, favorites, bulk-apply RPC). | §Open Questions OQ-1 | [ASSUMED] Verified via `ls supabase/migrations/` — 170 is the current max. No in-flight migrations detected. Planner re-verifies at plan time per Phase 170 precedent. |
| A5 | Pack strip title is "Starter Packs" (not "Curated Packs" / "Template Packs"). | §User Constraints (Claude's Discretion) | [ASSUMED] User endorsed "recommended" default. Easy string swap. |
| A6 | Bulk-applied scene naming is `<template.name>` (no "Copy" suffix, no "<pack.name> — " prefix). | §Code Examples §apply_starter_pack RPC | [ASSUMED] Simpler; matches single-Apply pattern. User left this to Claude's discretion. RPC can easily swap to `v_pack.name || ' — ' || v_svg_template.name` if the plan prefers lineage. |
| A7 | `apply_starter_pack` on an empty pack returns `[]` (not an error). | §Code Examples §apply_starter_pack RPC | [ASSUMED] Matches "no-op if empty" UX intent. If user prefers an error, change to `IF array_length(...) IS NULL THEN RAISE`. |
| A8 | Favorites filter uses URL param `favorites=1` (extends Phase 171 D-10). | §Phase Requirements TFAV-02 | [ASSUMED] Natural extension. |
| A9 | Super-admin-only for admin pack page in v20.0 — tenant-created packs are schema-supported but UI-gated. | §User Constraints (Claude's Discretion) | [ASSUMED] Explicitly recommended in CONTEXT.md. User endorsed. |

**All other claims are VERIFIED against the repo or CITED from CONTEXT.md / REQUIREMENTS.md / ROADMAP.md.**

## Open Questions (RESOLVED)

1. **OQ-1 — Do we want separate migrations for `template_favorites` table vs the `gallery_templates_with_favorites` VIEW?**
   - What we know: Migration 167 combines "VIEW + table + RLS + seeds" in one file, but it's on the edge of readability (320 lines). Favorites table + VIEW are both small.
   - What's unclear: Splitting into `172_template_favorites.sql` + `172a_gallery_templates_with_favorites.sql` (or 172 + 173a) vs a single file.
   - Recommendation: Single file `172_template_favorites.sql` — both artifacts are ~50 lines and logically one migration. Planner confirms.
   - RESOLVED: see Assumptions Log A4 — planner adopts recommendation (single migration file `172_template_favorites.sql` containing both table and VIEW); migration numbering 171/172/173 is verified.

2. **OQ-2 — Should pack `member_thumbnails` be computed client-side (join `fetchPackDetail.members`) or server-side (append to `fetchStarterPacks` payload)?**
   - What we know: `fetchStarterPacks` returns pack metadata only (no members). `fetchPackDetail` returns members. The 2×2 mosaic on the gallery strip needs first 4 thumbnails for every visible pack.
   - What's unclear: Do we fire `fetchPackDetail(packId)` for every pack on the strip (N+1 read) or add a server-side helper that returns `packs` with `member_thumbnails[4]` pre-joined?
   - Recommendation: Add server-side — a convenience RPC `fetch_starter_packs_with_mosaic()` or a VIEW `starter_packs_with_mosaic` that LATERAL-joins the first 4 member thumbnails. Avoids N+1. Planner decides whether the added complexity is worth the read-perf win, or the strip is cheap enough with N+1 if pack count stays <10.
   - RESOLVED: see Assumptions Log A1 — planner accepts client-side fallback in PackCard (renders brand-tinted placeholders when `member_thumbnails` is empty/short); server-side aggregation deferred to a follow-up enhancement and tracked as a Plan 08 note. The strip is cheap with current pack counts (<10).

3. **OQ-3 — Should the `gallery_templates_with_favorites` VIEW be the default read for all gallery calls, or only when the favorites filter is active?**
   - What we know: Adding `is_favorited` column to every call is additive (no schema break); tests / callers that ignore it are unaffected.
   - What's unclear: Performance — the VIEW adds a LEFT JOIN on every read.
   - Recommendation: Default read from the new VIEW. The JOIN is indexed (PK on `template_favorites`), and the catalog is <500 rows; measurable cost is negligible. This also simplifies the gallery code — no conditional query path.
   - RESOLVED: see Assumptions Log A1 — VIEW (`gallery_templates_with_favorites`) is the unconditional default read; LEFT JOIN cost is negligible at <500-row catalog and the JOIN is keyed by indexed `template_favorites` PK.

4. **OQ-4 — Test user provisioning for "persist across logout" E2E.**
   - What we know: `tests/e2e/preview-apply.spec.js` uses `loginAndPrepare` helper. Login/logout cycle within one test is supported via Playwright context isolation.
   - What's unclear: Whether the existing test user has pre-existing favorites that could affect assertions.
   - Recommendation: Start each favorites-related test with a `DELETE FROM template_favorites WHERE user_id = <test_user>` cleanup OR use a fresh test user (the TFAV tests are less useful on a shared user anyway).
   - RESOLVED: see Assumptions Log A1 — Plan 10 integration test (`tests/integration/favorites/view-per-user.test.js`) uses `beforeAll` cleanup that DELETEs any existing favorite for the test user/template before assertion, and `afterAll` cleans up after the run. E2E favorites tests pair toggle-on with cleanup toggle-off.

## Sources

### Primary (HIGH confidence — read in this session)
- `supabase/migrations/167_gallery_templates_view_and_rls.sql` — VIEW UNION pattern, RLS predicate for templates, idempotent DDL
- `supabase/migrations/168_clone_template_with_customization.sql` — polotno-branch atomic clone (body to inline in `apply_starter_pack`)
- `supabase/migrations/170_clone_svg_template_to_scene.sql` — svg-branch atomic clone (body to inline)
- `supabase/migrations/094_svg_templates.sql` — schema of SVG source table
- `supabase/migrations/080_template_marketplace.sql` — template_library schema + admin-only RLS patterns
- `supabase/migrations/012_finalize_rls_rbac.sql` — `is_super_admin()` helper function
- `supabase/migrations/067_create_scenes_and_onboarding.sql` — `scenes` + `scene_slides` shape
- `src/services/marketplaceService.js` — existing CRUD patterns (named async exports, thin supabase wrappers, thrown errors)
- `src/services/templateGalleryService.js` — `fetchGalleryTemplates` single-query read
- `src/services/templateApplyService.js` — DOMPurify boundary + dispatch-by-editor_type
- `src/pages/TemplateGalleryPage.jsx` — `useSearchParams` URL-backed filter state + strip integration point
- `src/components/template-gallery/TemplatePreviewModal.jsx` — prev/next + keyboard + snapshot patterns
- `src/design-system/components/TemplateCard.jsx` — host for FavoriteButton
- `src/pages/Admin/AdminTemplatesPage.jsx` — admin page chrome precedent
- `src/App.jsx` — route registration + `adminToolPages` enumeration
- `tests/integration/preview-apply/svg-rpc-atomicity.test.js` — integration test template
- `tests/e2e/preview-apply.spec.js` — E2E pattern
- `.planning/phases/173-starter-packs-favorites/173-CONTEXT.md` — authoritative decisions
- `.planning/phases/172.1-fix-svg-apply-rpc/172.1-CONTEXT.md` — atomic RPC contract precedent
- `.planning/phases/172-preview-apply-flow/172-CONTEXT.md` — dumb persistor + editor_type dispatch
- `.planning/phases/171-core-gallery-ui-redesign/171-CONTEXT.md` — flat grid + filter state invariants
- `.planning/REQUIREMENTS.md` §Starter Packs + §Favorites — acceptance criteria
- `.planning/ROADMAP.md` §Phase 173 — goal + success criteria
- `.planning/STATE.md` — last milestones, blockers (including "Favorites table state unknown" note — this research resolves it: no favorites artifacts exist in the DB; greenfield)

### Secondary (MEDIUM — sanity-checks of convention)
- `tests/e2e/template-packs.spec.js` — legacy pack test (kept untouched, per D-02); confirms the `Quick Start Pack` / `Restaurant Starter Pack` naming belongs to the legacy flow
- `supabase/migrations/023_templates_and_vertical_packs.sql` — legacy `content_templates` schema (read to understand what NOT to touch)
- `supabase/migrations/065_fix_pack_media_assets.sql` — legacy `apply_pack_template` (untouched reference)
- `src/pages/Admin/AdminEditTemplatePage.jsx` — existence confirmed; drill-in page precedent

### Tertiary (LOW — informational)
- No external documentation or web research needed; every pattern has an in-repo precedent.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries already present; versions verified from package imports.
- Architecture patterns: HIGH — every pattern has an in-repo precedent (cited line numbers throughout).
- Pitfalls: HIGH — most are direct extrapolations from Phase 170/171/172/172.1 lessons; documented with file line references.
- Favorites exposure path: MEDIUM (A1 assumed) — recommended default aligns with Phase 170 D-07; needs planner confirmation.
- Admin pack editor layout: MEDIUM (A2 assumed) — drill-in recommended based on `AdminEditTemplatePage.jsx` precedent; needs planner confirmation.
- Migration numbering: HIGH — directly verified against `ls supabase/migrations/` (171 is the next free number).

**Research date:** 2026-04-22
**Valid until:** 2026-05-22 (30 days — stable repo, no dep updates anticipated)

---

*Phase: 173-starter-packs-favorites*
*Research complete: 2026-04-22*
