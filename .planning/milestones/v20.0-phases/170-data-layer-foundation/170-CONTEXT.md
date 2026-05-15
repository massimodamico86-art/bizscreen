# Phase 170: Data Layer Foundation - Context

**Gathered:** 2026-04-15
**Status:** Ready for planning

<domain>
## Phase Boundary

Deliver a single, correct, RLS-safe data source that the v20.0 gallery UI reads from. Concretely:

- A Postgres VIEW `gallery_templates` that UNIONs `template_library` and `svg_templates` so the gallery fetches in one query
- A new `templateGalleryService.js` that is the sole data-access point for gallery reads
- A closed cross-tenant RLS gap on `svg_templates` (currently leaks across tenants)
- The hardcoded `LOCAL_SVG_TEMPLATES` array seeded into `svg_templates` and removed from source

Not in this phase: new gallery UI, preview modal, apply-flow changes, starter packs, content creation, favorites, editor integration. UI work begins in Phase 171.

</domain>

<decisions>
## Implementation Decisions

### VIEW Schema (TDAT-01)
- **D-01:** `gallery_templates` is a read-only VIEW (not a materialized view) — catalog size is small (<500 rows expected at v20.0 launch) so freshness beats caching.
- **D-02:** Wide schema — expose every column the gallery, preview modal, and apply flow will need so Phase 171/172 don't require re-fetches from source tables. Columns: `id UUID`, `source_table TEXT` (`'svg_templates'` | `'template_library'`), `editor_type TEXT` (`'svg'` | `'polotno'`), `name`, `description`, `category`, `tags TEXT[]`, `orientation`, `thumbnail`, `svg_url`, `svg_content`, `design_json JSONB` (NULL for svg rows), `width`, `height`, `tenant_id`, `created_by`, `created_at`, `updated_at`, `use_count`, `is_featured`, `is_active`. NULL out columns that don't exist on one side.
- **D-03:** `editor_type` is the discriminator Phase 172 uses to route Apply — `'svg'` → FabricSvgEditor/QuickCustomize, `'polotno'` → Polotno scene editor. `source_table` is kept alongside strictly for debugging/observability; downstream code must NOT branch on `source_table`.
- **D-04:** VIEW enforces `is_active = TRUE` at definition time so the service never has to add that predicate.
- **D-05:** No GIN index on `template_library.tags` if it already exists (check first); otherwise add in same migration. GIN on `svg_templates.tags` exists (migration 094 line 35).
- **D-06:** Defer the tsvector FTS column to v20.1 — fuse.js covers client-side search through Phase 175; don't add columns the gallery isn't wired to use yet.

### Service Surface (TDAT-02)
- **D-07:** `templateGalleryService.js` exposes a single primary function `fetchGalleryTemplates({ category?, orientation?, editorType?, tags?, limit?, offset?, search?, sortBy? })` that returns `{ data: Template[], error: null | Error }`. DB-level filtering only; no client-side merge. Search is a case-insensitive `ILIKE` over `name || description` when present — fuse.js for richer search lands in Phase 171.
- **D-08:** Return shape is the raw `gallery_templates` row (camelCased) — no normalization layer. Phase 171 card components adapt if needed.
- **D-09:** No caching in this service (no react-query wrapper, no module-level memo). Phase 171 decides UI-side caching.
- **D-10:** Service file path: `src/services/templateGalleryService.js`. Pure JS, follows existing service conventions (named exports, supabase client import, thin error mapping).

### RLS Audit & Remediation (TDAT-03)
- **D-11:** The audit is scoped to `svg_templates` per TDAT-03. `template_library` RLS is also spot-checked for the VIEW's sake but not re-audited — it was added in migration 080 and has not been flagged.
- **D-12:** Confirmed leak in `svg_templates` (migration 094 lines 47-50): policy `"Authenticated users can read svg templates"` has no tenant filter — any authenticated user can read any row. This is the bug TDAT-03 addresses.
- **D-13:** Remediation: drop the broken policy and replace with one scoped to `tenant_id IS NULL OR created_by = auth.uid()`. Rationale: `tenant_id IS NULL` is the existing convention for global/system-owned templates (migration 094 line 9 comment); `created_by = auth.uid()` covers user-saved designs. There is no `tenants` table to join against for explicit tenant-scoped access — following existing conventions over inventing new ones.
- **D-14:** Also drop the redundant `"Anyone can read active global svg templates"` policy (migration 094 line 42) once the replacement covers the same cases — two overlapping SELECT policies are confusing and PG evaluates them with OR, so the more permissive one wins. The replacement policy covers globals.
- **D-15:** Verification: both a SQL test (set `auth.uid()` via `SET request.jwt.claim.sub` or similar, query across seeded rows per tenant) AND a Playwright two-tenant smoke test are required. Defense-in-depth is warranted — cross-tenant leakage is a high-severity class of bug. The SQL test is fast CI feedback; the Playwright test catches integration regressions.
- **D-16:** Migration MUST run before the `LOCAL_SVG_TEMPLATES` seed (D-17) — seed rows arriving under a broken policy would contaminate the audit's baseline.

### LOCAL_SVG_TEMPLATES Seed (TDAT-04)
- **D-17:** Seed into `svg_templates` with `tenant_id = NULL` and `created_by = NULL` (system-global / free content). These are curated starter content, not user-generated.
- **D-18:** IDs: `LOCAL_SVG_TEMPLATES` uses string slugs (e.g., `'restaurant-menu-1'`) but `svg_templates.id` is UUID (migration 094 line 8). Generate deterministic UUIDs via SQL `uuid_generate_v5(namespace, slug)` or equivalent so IDs are stable and reproducible across environments. Add a `slug` TEXT column (nullable, UNIQUE where NOT NULL) to `svg_templates` in the same migration, populated for seeded rows — gives human-readable stable keys for future reference.
- **D-19:** After seeding, delete the `LOCAL_SVG_TEMPLATES` export and the array definition (svgTemplateService.js line 117-272 range). Audit all imports: `SvgEditorPage.jsx` is confirmed importer — update it to fetch by slug or by slug-resolved UUID from `svg_templates`.
- **D-20:** The `svgTemplateService.fetchSvgTemplates` function stays in this phase. Reimplement it to read DB-only (no LOCAL_SVG_TEMPLATES merge) by delegating to `templateGalleryService.fetchGalleryTemplates` with a result-shape adapter. Phase 171 deletes it entirely when `SvgTemplateGalleryPage` is removed. Rationale: `SvgTemplateGalleryPage` still ships to users during Phase 170; it must keep working without the three-source merge.

### Migration Packaging
- **D-21:** Single migration file `111_gallery_templates_view_and_rls.sql` covers: add `slug` column to `svg_templates`, seed `LOCAL_SVG_TEMPLATES`, RLS policy swap, create `gallery_templates` VIEW, add missing GIN index on `template_library.tags` if absent. Atomic deployment avoids partial-state windows.
- **D-22:** Migration must be idempotent where possible (`CREATE OR REPLACE VIEW`, `CREATE INDEX IF NOT EXISTS`, `DROP POLICY IF EXISTS` before `CREATE POLICY`, `INSERT ... ON CONFLICT (slug) DO NOTHING`).
- **D-23:** No DOWN migration — aligns with existing convention in `supabase/migrations/` (none of the 108 recent migrations ship a DOWN).

### Claude's Discretion
All four gray areas above were delegated to Claude (user answered "you decide"). Decisions D-01 through D-23 are Claude's best judgment given research synthesis, codebase state, and v20.0 goals. User should review CONTEXT.md and flag any decision that conflicts with intent before planning begins.

### Folded Todos
None — no cross-referenced todos matched this phase.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements & Roadmap
- `.planning/REQUIREMENTS.md` §Data Layer Foundation — TDAT-01 through TDAT-04 acceptance criteria
- `.planning/ROADMAP.md` §Phase 170 (lines 237-246) — goal, success criteria, dependencies

### v20.0 Research Synthesis
- `.planning/research/SUMMARY.md` §Phase A (lines 178-192) — data layer rationale, deliverables, pitfalls addressed
- `.planning/research/SUMMARY.md` §Critical Pitfalls (lines 156-170) — Pitfall 1 (dual-source merge), Pitfall 2 (RLS leakage)
- `.planning/research/ARCHITECTURE.md` — component map, VIEW integration chain
- `.planning/research/PITFALLS.md` — deeper pitfall detail and prevention strategies
- `.planning/research/STACK.md` — confirmed Supabase-native stack (no external search vendors)

### Existing Source (to modify or read)
- `src/services/svgTemplateService.js:117` — `LOCAL_SVG_TEMPLATES` array (seed source + to-be-deleted export)
- `src/services/svgTemplateService.js:274` — `fetchSvgTemplates` (three-source merge to be reimplemented)
- `src/services/svgTemplateService.js:409` — `LOCAL_SVG_TEMPLATES.find` lookup (must migrate to DB read)
- `src/services/marketplaceService.js` — `installWithCustomization` (reads template data; confirm VIEW compatibility)
- `src/services/templateService.js` — existing template service (do not reuse for gallery reads — new service is sole gallery access)
- `src/pages/SvgEditorPage.jsx` — imports `LOCAL_SVG_TEMPLATES` (callsite to migrate)
- `src/pages/SvgTemplateGalleryPage.jsx` — current gallery page; calls `fetchSvgTemplates`; must keep working through Phase 170 (deleted in Phase 171)

### Migrations
- `supabase/migrations/080_template_marketplace.sql` — `template_library` schema
- `supabase/migrations/094_svg_templates.sql` — `svg_templates` schema; **lines 40-56 are the RLS policies** (line 47-50 is the broken policy)
- `supabase/migrations/110_fix_can_access_template.sql` — most recent template-related migration; follow its style for migration 111

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `supabase/` client singleton — use as-is in new service
- Existing migration style (SQL files numbered, idempotent, no DOWN) — follow for migration 111
- `svg_templates.tags` GIN index (migration 094:35) — reuse; no duplicate index needed

### Established Patterns
- Services are pure JS modules with named exports and a thin supabase client wrapper (no class, no DI)
- RLS convention: `tenant_id IS NULL` denotes global/system-owned rows (migration 094:9 comment)
- Migrations are numbered sequentially (`NNN_description.sql`); next is `111_`
- No DOWN migrations anywhere — schema is forward-only

### Integration Points
- `gallery_templates` VIEW will be read by: `templateGalleryService.fetchGalleryTemplates` (this phase), future `TemplateGalleryPage` (Phase 171), future `TemplatePreviewModal` (Phase 172)
- `svgTemplateService.fetchSvgTemplates` will internally delegate to `templateGalleryService` during Phase 170 cutover — preserves `SvgTemplateGalleryPage` compatibility
- RLS policy swap on `svg_templates` affects every current authenticated caller of that table — the rewritten policy is strictly tighter, so callers that relied on cross-tenant read (if any exist) will break visibly in testing

### Creative Options Enabled
- Wide VIEW schema with `editor_type` discriminator means Phase 172 can implement Preview+Apply routing without schema changes
- `slug` column on `svg_templates` enables stable human-readable lookups (e.g., future `?template=restaurant-menu-1` URLs)

</code_context>

<specifics>
## Specific Ideas

- Research (`SUMMARY.md` §Open Questions) flagged: "Which `content_templates` packs currently exist and work after migration 110?" — NOT in scope for Phase 170 but worth noting for Phase 173.
- The redundant dual-SELECT-policy pattern on `svg_templates` (migration 094 lines 42-50) suggests prior authors were uncertain about RLS composition. The fix collapses to one policy that explicitly covers both cases — simpler to audit.

</specifics>

<deferred>
## Deferred Ideas

- tsvector FTS column and trigger — deferred to v20.1 per research (SUMMARY.md line 107); not needed while catalog <500 and fuse.js handles client-side search
- `use_count` increment on apply — deferred to Phase 175 per research (SUMMARY.md line 107 anti-features)
- `template_library` RLS re-audit — deferred; not flagged by research and not required by TDAT-03
- Materialized view variant of `gallery_templates` — deferred; regular VIEW is fine at current scale
- `content_templates` pack integrity check — deferred to Phase 173 (Starter Packs)

### Reviewed Todos (not folded)
None.

</deferred>

---

*Phase: 170-data-layer-foundation*
*Context gathered: 2026-04-15*
