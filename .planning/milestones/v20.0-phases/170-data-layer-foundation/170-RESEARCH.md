# Phase 170: Data Layer Foundation - Research

**Researched:** 2026-04-15
**Domain:** Supabase SQL migrations, RLS policy remediation, Postgres VIEW design, JS service layer
**Confidence:** HIGH (all claims verified against actual source files)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions (D-01 through D-23 — ALL Claude's discretion, all locked)

- **D-01:** `gallery_templates` is a read-only VIEW (not materialized) — freshness over caching at <500 rows
- **D-02:** Wide schema — `id UUID`, `source_table TEXT`, `editor_type TEXT`, `name`, `description`, `category`, `tags TEXT[]`, `orientation`, `thumbnail`, `svg_url`, `svg_content`, `design_json JSONB`, `width`, `height`, `tenant_id`, `created_by`, `created_at`, `updated_at`, `use_count`, `is_featured`, `is_active`
- **D-03:** `editor_type` discriminator: `'svg'` | `'polotno'`; `source_table` is debug only — downstream MUST NOT branch on it
- **D-04:** VIEW enforces `is_active = TRUE` at definition time
- **D-05:** Add GIN index on `template_library.tags` only if absent (check first); `svg_templates.tags` GIN exists
- **D-06:** Defer tsvector FTS column to v20.1
- **D-07:** Single function `fetchGalleryTemplates({ category?, orientation?, editorType?, tags?, limit?, offset?, search?, sortBy? })` → `{ data, error }`; ILIKE search over name+description; DB-level filtering only
- **D-08:** Return shape is raw `gallery_templates` row (camelCased); no normalization layer
- **D-09:** No caching (no react-query, no module-level memo)
- **D-10:** File: `src/services/templateGalleryService.js`; pure JS, named exports, supabase client import
- **D-11:** RLS audit scoped to `svg_templates`; `template_library` spot-checked only
- **D-12:** Confirmed leak: `svg_templates` policy `"Authenticated users can read svg templates"` has no tenant filter
- **D-13:** Fix: drop broken policy, add `tenant_id IS NULL OR created_by = auth.uid()`
- **D-14:** Drop redundant `"Anyone can read active global svg templates"` policy; replacement covers it
- **D-15:** Both SQL test AND Playwright two-tenant smoke test required
- **D-16:** Migration RLS fix MUST run before seed (D-17)
- **D-17:** Seed `LOCAL_SVG_TEMPLATES` with `tenant_id = NULL`, `created_by = NULL` (system-global)
- **D-18:** Use `uuid_generate_v5(namespace, slug)` for deterministic UUIDs; add `slug TEXT UNIQUE WHERE NOT NULL` column
- **D-19:** Delete `LOCAL_SVG_TEMPLATES` export; audit all importers; update callsites to fetch by slug/UUID
- **D-20:** `svgTemplateService.fetchSvgTemplates` stays in Phase 170 — reimplemented to delegate to `templateGalleryService`; Phase 171 deletes it
- **D-21:** Single migration file `111_gallery_templates_view_and_rls.sql` — atomic, covers all deliverables
- **D-22:** Idempotent: `CREATE OR REPLACE VIEW`, `CREATE INDEX IF NOT EXISTS`, `DROP POLICY IF EXISTS`, `INSERT ... ON CONFLICT (slug) DO NOTHING`
- **D-23:** No DOWN migration — aligns with existing convention

### Claude's Discretion
All decisions D-01 through D-23 were delegated to Claude and are now locked.

### Deferred Ideas (OUT OF SCOPE)
- tsvector FTS column and trigger (v20.1)
- `use_count` increment on apply (Phase 175)
- `template_library` RLS re-audit
- Materialized view variant
- `content_templates` pack integrity check (Phase 173)
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| TDAT-01 | Gallery UI reads from a single `gallery_templates` Postgres VIEW UNIONing `template_library` and `svg_templates` | VIEW schema fully designed; both source table columns verified; NULL casts identified |
| TDAT-02 | `templateGalleryService.js` is sole data-access point for gallery UI, replacing three-source JS merge | Exact columns, import pattern, and delegation wrapper verified from source |
| TDAT-03 | `svg_templates` RLS audit; cross-tenant gap fixed via migration | Broken policies identified by line number; correct replacement policy designed |
| TDAT-04 | `LOCAL_SVG_TEMPLATES` seeded into `svg_templates` and removed from source | All 12 entries catalogued; all 3 importers found; UUID approach verified |
</phase_requirements>

---

## Summary

Phase 170 is a DB-and-service-layer phase with no new UI. The three deliverables — a migration, a new service, and a service refactor — are all well-understood from codebase inspection. Research has fully mapped the source and target schemas, identified all `LOCAL_SVG_TEMPLATES` importers (three files, not one), confirmed the UUID extension strategy, verified GIN index gaps, and documented the exact broken RLS policies and their replacements.

The most important discovery beyond what CONTEXT.md already contained: `FabricSvgEditor.jsx` also imports `LOCAL_SVG_TEMPLATES` (passed as a `templates` prop to `LeftSidebar`). CONTEXT.md references only `SvgEditorPage.jsx` as a confirmed importer. The planner must handle this third callsite.

The second important discovery: no `uuid_generate_v5` usage exists in any prior migration, but `uuid-ossp` IS enabled (migration 001, line 5), which provides `uuid_generate_v5`. The `gen_random_uuid()` used in recent migrations is non-deterministic and must not be used for seed rows. `uuid_generate_v5('6ba7b810-9dad-11d1-80b4-00c04fd430c8'::uuid, slug)` (DNS namespace) is the correct idempotent pattern.

**Primary recommendation:** Build the migration in four discrete sub-blocks (schema change, RLS swap, seed, VIEW + index), verify each with a SQL assertion before committing, then write the service layer against the VIEW.

---

## Standard Stack

### Core (all existing — no new installs)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Supabase JS | v2 (existing) | DB client for service layer | Project standard; all services import from `../supabase` |
| PostgreSQL via Supabase | — | VIEW, RLS, GIN index | Entire data layer runs in Supabase Postgres |

**No new npm packages required for Phase 170.** [VERIFIED: source inspection]

### Supabase Client Import Pattern

All services import the singleton client identically: [VERIFIED: templateService.js:7, svgTemplateService.js]

```js
import { supabase } from '../supabase';
```

The `src/supabase.js` file initializes via `createClient(VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY)`.

---

## Architecture Patterns

### Recommended Project Structure (changes only)

```
supabase/migrations/
└── 111_gallery_templates_view_and_rls.sql   NEW (atomic, idempotent)

src/services/
├── templateGalleryService.js               NEW — sole gallery data source
└── svgTemplateService.js                   MODIFIED — remove LOCAL_SVG_TEMPLATES,
                                             reimplement fetchSvgTemplates as delegate

src/components/svg-editor/
└── FabricSvgEditor.jsx                     MODIFIED — remove LOCAL_SVG_TEMPLATES import,
                                             replace templates prop with DB fetch

src/pages/
└── SvgEditorPage.jsx                       MODIFIED — migrate LOCAL_SVG_TEMPLATES usage
```

### Pattern 1: Migration Sub-Block Ordering (CRITICAL)

Per D-16, the migration blocks must execute in this order:

1. `ALTER TABLE svg_templates ADD COLUMN IF NOT EXISTS slug TEXT` + `UNIQUE INDEX IF NOT EXISTS`
2. `DROP POLICY IF EXISTS` + `CREATE POLICY` (RLS swap — before seed so audit baseline is clean)
3. `INSERT INTO svg_templates ... ON CONFLICT (slug) DO NOTHING` (seed)
4. `CREATE OR REPLACE VIEW gallery_templates AS ...`
5. `CREATE INDEX IF NOT EXISTS idx_template_library_tags ON template_library USING GIN(tags)` (absent — verified)

### Pattern 2: VIEW SQL Structure

Based on verified column sets from migrations 080 and 094: [VERIFIED: source inspection]

```sql
CREATE OR REPLACE VIEW gallery_templates AS

-- SVG templates leg
SELECT
  id,
  'svg_templates'::text        AS source_table,
  'svg'::text                  AS editor_type,
  name,
  description,
  category,
  tags,
  orientation,
  thumbnail                    AS thumbnail,
  svg_url,
  svg_content,
  NULL::jsonb                  AS design_json,
  width,
  height,
  tenant_id,
  created_by,
  created_at,
  updated_at,
  use_count,
  is_featured,
  is_active,
  slug
FROM svg_templates
WHERE is_active = TRUE

UNION ALL

-- Template library leg
SELECT
  id,
  'template_library'::text     AS source_table,
  'polotno'::text              AS editor_type,
  name,
  description,
  industry                     AS category,
  tags,
  NULL::text                   AS orientation,
  thumbnail_url                AS thumbnail,
  NULL::text                   AS svg_url,
  NULL::text                   AS svg_content,
  -- design_json lives in template_library_slides, not in template_library itself
  NULL::jsonb                  AS design_json,
  NULL::integer                AS width,
  NULL::integer                AS height,
  NULL::uuid                   AS tenant_id,
  created_by,
  created_at,
  updated_at,
  install_count                AS use_count,
  is_featured,
  is_active,
  NULL::text                   AS slug
FROM template_library
WHERE is_active = TRUE;
```

**Important column gaps requiring NULL casts:**
- `template_library` has no `orientation`, `svg_url`, `svg_content`, `width`, `height`, `tenant_id`, `slug` columns — all NULL cast [VERIFIED: migration 080]
- `svg_templates` has no `design_json` column — NULL cast [VERIFIED: migration 094]
- `template_library.install_count` maps to `use_count` (alias required) [VERIFIED: migration 080:29]
- `template_library.industry` maps to `category` (alias required) [VERIFIED: migration 080:23]
- `template_library.thumbnail_url` maps to `thumbnail` [VERIFIED: migration 080:18]
- `svg_templates` does NOT have `design_json` — it stores SVG inline in `svg_content` [VERIFIED: migration 094:16]

### Pattern 3: Service Function Skeleton

```js
// src/services/templateGalleryService.js
import { supabase } from '../supabase';

export async function fetchGalleryTemplates({
  category,
  orientation,
  editorType,
  tags,
  limit = 50,
  offset = 0,
  search,
  sortBy = 'created_at',
} = {}) {
  let query = supabase
    .from('gallery_templates')
    .select('*');

  if (category)    query = query.eq('category', category);
  if (orientation) query = query.eq('orientation', orientation);
  if (editorType)  query = query.eq('editor_type', editorType);
  if (tags?.length) query = query.overlaps('tags', tags);
  if (search) {
    query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`);
  }
  query = query.order(sortBy, { ascending: false })
               .range(offset, offset + limit - 1);

  const { data, error } = await query;
  return { data: data ?? [], error: error ?? null };
}
```

### Pattern 4: fetchSvgTemplates Delegation Wrapper (Phase 170 cutover, Phase 171 deletion)

```js
// svgTemplateService.js — replaces the three-source merge
export async function fetchSvgTemplates(options = {}) {
  const { category, orientation, search } = options;
  const { data, error } = await fetchGalleryTemplates({
    category: category !== 'all' ? category : undefined,
    orientation: orientation !== 'all' ? orientation : undefined,
    search: search || undefined,
    editorType: 'svg',   // SvgTemplateGalleryPage shows SVG templates only
  });
  if (error) {
    console.warn('fetchSvgTemplates: DB error', error.message);
    return [];
  }
  return data;
}
```

### Pattern 5: Deterministic UUID Seed

`uuid-ossp` extension is enabled (migration 001:5), which provides `uuid_generate_v5`. [VERIFIED: migration 001:5]

```sql
-- In the seed block of migration 111:
INSERT INTO svg_templates (id, slug, name, description, category, orientation,
  thumbnail, svg_url, width, height, tags, is_featured, is_active,
  tenant_id, created_by)
VALUES
  (
    uuid_generate_v5('6ba7b810-9dad-11d1-80b4-00c04fd430c8'::uuid, 'restaurant-menu-1'),
    'restaurant-menu-1',
    'Restaurant Menu',
    ...
  ),
  ...
ON CONFLICT (slug) DO NOTHING;
```

The DNS namespace UUID `6ba7b810-9dad-11d1-80b4-00c04fd430c8` is the standard v5 namespace for DNS names — appropriate for stable, reproducible IDs keyed by slug string. [ASSUMED — standard UUID v5 namespace; uuid-ossp docs confirm this is valid]

### Anti-Patterns to Avoid

- **DO NOT use `gen_random_uuid()` for seed rows** — non-deterministic; breaks idempotency re-runs
- **DO NOT branch on `source_table`** — per D-03; `editor_type` is the discriminator
- **DO NOT add `is_active` filter in service** — VIEW already enforces `is_active = TRUE` per D-04
- **DO NOT leave `LOCAL_SVG_TEMPLATES.find()` in `fetchSvgTemplateById`** — it too must be replaced with a DB read by slug

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Deterministic UUIDs for seed | Custom hash function | `uuid_generate_v5(namespace, slug)` | Already available via uuid-ossp extension in migration 001 |
| RLS tenant isolation | Application-layer filter | Postgres `CREATE POLICY` | Policy enforced at DB level, cannot be bypassed from JS layer |
| Tag array filtering | JS `.filter(t => t.tags.includes(...))` | Supabase `.overlaps('tags', tags)` | Pushes filter to DB; correct for large datasets |
| Case-insensitive search | JS `.toLowerCase()` loop | Supabase `.or('name.ilike.%X%,description.ilike.%X%')` | DB-native, indexed when tsvector added later |

**Key insight:** All filtering logic for this phase belongs in Postgres, not in JS. The three-source JS merge is the exact anti-pattern being eliminated.

---

## All LOCAL_SVG_TEMPLATES Importers (CRITICAL — 3 files, not 1)

| File | Import | Usage | Migration Action |
|------|--------|-------|-----------------|
| `src/services/svgTemplateService.js:117` | Defines the export | Array definition + `fetchSvgTemplates` merge + `fetchSvgTemplateById` fallback (line 409) | Delete array; reimplement `fetchSvgTemplates` as delegate; reimplement `fetchSvgTemplateById` to query DB by slug or UUID |
| `src/components/svg-editor/FabricSvgEditor.jsx:25` | `import { ..., LOCAL_SVG_TEMPLATES }` | Passed as `templates={LOCAL_SVG_TEMPLATES}` prop to `LeftSidebar` (line 2490) | Replace with DB fetch or fetch-on-demand; update `LeftSidebar` prop type |
| `src/pages/SvgEditorPage.jsx` | Imports from `svgTemplateService` | Does NOT currently import `LOCAL_SVG_TEMPLATES` directly — it uses `loadUserSvgDesign` / `saveUserSvgDesign` only [VERIFIED: SvgEditorPage.jsx:16] | No direct action needed on the import; the template loading goes through `svgTemplateService` functions |

**Correction to CONTEXT.md:** `SvgEditorPage.jsx` does NOT directly import `LOCAL_SVG_TEMPLATES`. The confirmed additional importer is `FabricSvgEditor.jsx`. [VERIFIED: grep of src/]

---

## LOCAL_SVG_TEMPLATES Entry Count and Schema

**12 entries confirmed** [VERIFIED: svgTemplateService.js:117-267]:

| slug | name | category | orientation | is_featured |
|------|------|----------|-------------|-------------|
| restaurant-menu-1 | Restaurant Menu | Restaurant | landscape | true |
| cafe-special-1 | Cafe Daily Special | Restaurant | portrait | false |
| retail-sale-1 | Retail Sale Banner | Retail | landscape | false |
| welcome-sign-1 | Welcome Display | Corporate | landscape | false |
| holiday-sale-1 | Holiday Sale | Retail | landscape | true |
| real-estate-1 | Real Estate Listing | Real Estate | landscape | true |
| healthcare-info-1 | Healthcare Services | Healthcare | landscape | false |
| corporate-welcome-1 | Corporate Welcome | Corporate | landscape | false |
| happy-hour-1 | Happy Hour Specials | Restaurant | portrait | true |
| fitness-promo-1 | Fitness Gym Promo | Fitness | landscape | false |
| hotel-amenities-1 | Hotel Amenities | Hospitality | portrait | false |
| event-promo-1 | Event Promotion | Events | landscape | true |

**Column mapping from LOCAL_SVG_TEMPLATES fields to svg_templates columns:**

| JS field | DB column | Notes |
|----------|-----------|-------|
| `id` (string slug) | `slug` | New column; UUID generated via `uuid_generate_v5` |
| `name` | `name` | Direct |
| `description` | `description` | Direct |
| `category` | `category` | Direct (TEXT) |
| `orientation` | `orientation` | Direct; CHECK constraint satisfied by all 12 entries |
| `thumbnail` (path) | `thumbnail` | Direct |
| `svgUrl` (path) | `svg_url` | Direct |
| `width` | `width` | Direct; all 1920 or 1080 |
| `height` | `height` | Direct; all 1080 or 1920 |
| `tags` (array) | `tags` | Direct TEXT[] |
| `isFeatured` | `is_featured` | camelCase → snake_case |
| — | `is_active` | DEFAULT TRUE; no JS field needed |
| — | `tenant_id` | NULL (global per D-17) |
| — | `created_by` | NULL (system per D-17) |

---

## RLS Audit Findings (TDAT-03)

### Current Policies on svg_templates [VERIFIED: migration 094:40-68]

| Policy Name | Line | FOR | Role | Condition | Problem |
|-------------|------|-----|------|-----------|---------|
| `"Anyone can read active global svg templates"` | 42-44 | SELECT | public | `is_active = TRUE AND tenant_id IS NULL` | Redundant after fix |
| `"Authenticated users can read svg templates"` | 47-50 | SELECT | authenticated | `is_active = TRUE` | **BROKEN — no tenant filter** |
| `"Authenticated users can create svg templates"` | 53-56 | INSERT | authenticated | `created_by = auth.uid()` | OK |
| `"Users can update own svg templates"` | 59-62 | UPDATE | authenticated | `created_by = auth.uid()` | OK |
| `"Users can delete own svg templates"` | 65-68 | DELETE | authenticated | `created_by = auth.uid()` | OK |

### Required Remediation (migration 111)

```sql
-- Step 1: Drop both broken/redundant SELECT policies
DROP POLICY IF EXISTS "Anyone can read active global svg templates" ON svg_templates;
DROP POLICY IF EXISTS "Authenticated users can read svg templates" ON svg_templates;

-- Step 2: Replacement — covers globals (tenant_id IS NULL) and user-owned rows
CREATE POLICY "svg_templates_select" ON svg_templates
  FOR SELECT
  TO authenticated
  USING (
    is_active = TRUE
    AND (tenant_id IS NULL OR created_by = auth.uid())
  );
```

### template_library RLS Spot-Check [VERIFIED: migration 080:100-117]

`template_library` uses `USING (true)` for all SELECT/INSERT/UPDATE/DELETE — effectively open to all authenticated users. This is a pre-existing design decision; not a bug for Phase 170 scope. The VIEW will inherit this permissiveness for `template_library` rows. [VERIFIED: migration 080:100-102]

---

## GIN Index Audit

| Table | Column | GIN Index Exists | Action in Migration 111 |
|-------|--------|-----------------|------------------------|
| `svg_templates` | `tags` | YES — `idx_svg_templates_tags` (migration 094:35) | None |
| `template_library` | `tags` | NO — not in migration 080 or any subsequent migration | `CREATE INDEX IF NOT EXISTS idx_template_library_tags ON template_library USING GIN(tags)` |

[VERIFIED: full grep of supabase/migrations/]

---

## Migration Style Reference (from migration 110)

Migration 110 establishes the current style to follow for migration 111: [VERIFIED: migration 110]

- Header comment block with migration number, phase, decision references
- `CREATE OR REPLACE FUNCTION` (not CREATE + DROP)
- `GRANT EXECUTE` re-issued after each function
- No schema changes, clearly sectioned blocks with `===` comment dividers
- No DOWN migration

Migration 111 should follow this style. Key additions over migration 110:
- `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` for slug column
- `CREATE UNIQUE INDEX IF NOT EXISTS` for slug uniqueness
- `DROP POLICY IF EXISTS` before new `CREATE POLICY` (idempotency)
- `INSERT ... ON CONFLICT (slug) DO NOTHING` for seed (idempotency)

---

## Common Pitfalls

### Pitfall 1: Missing NULL Casts in UNION ALL View
**What goes wrong:** Postgres UNION ALL requires matching column count and compatible types. A missing NULL cast causes `ERROR: UNION types text and integer cannot be matched`.
**Why it happens:** `template_library` lacks `width`, `height` (integers); `svg_templates` lacks `design_json` (jsonb). Omitting explicit `NULL::integer` or `NULL::jsonb` causes type mismatch errors.
**How to avoid:** Each NULL in the VIEW must carry an explicit type cast. Refer to the VIEW SQL in Architecture Patterns section.
**Warning signs:** Migration fails with `UNION types ... cannot be matched`.

### Pitfall 2: `fetchSvgTemplateById` Still Uses LOCAL_SVG_TEMPLATES.find()
**What goes wrong:** `svgTemplateService.fetchSvgTemplateById` (line 409) falls back to `LOCAL_SVG_TEMPLATES.find()` before querying DB. After the array is deleted, any caller passing a string slug (not a UUID) will receive `undefined`.
**Why it happens:** The callsite in `FabricSvgEditor` uses the old string-slug IDs from `LOCAL_SVG_TEMPLATES`.
**How to avoid:** After seeding, `fetchSvgTemplateById` must query DB by slug first (`WHERE slug = $1`), falling back to UUID lookup. Replace the `.find()` with a DB query.

### Pitfall 3: FabricSvgEditor LeftSidebar Still Needs Templates
**What goes wrong:** `FabricSvgEditor.jsx:2490` passes `templates={LOCAL_SVG_TEMPLATES}` to `LeftSidebar`. Deleting the export breaks the component's template browser in the editor sidebar.
**Why it happens:** This callsite was not in CONTEXT.md's confirmed importer list — it would be missed without grep.
**How to avoid:** Replace `templates={LOCAL_SVG_TEMPLATES}` with either: (a) a `useState` + `useEffect` that calls `fetchGalleryTemplates({ editorType: 'svg' })` on mount inside `FabricSvgEditor`, or (b) fetch once in `SvgEditorPage` and pass down as a prop. Option (a) is simpler and keeps the component self-contained.

### Pitfall 4: Slug UNIQUE Constraint Needs Partial Index
**What goes wrong:** If `UNIQUE(slug)` is a full-column unique constraint, two rows with `slug = NULL` (all `template_library` rows in the VIEW, plus any future non-seeded rows) will conflict.
**Why it happens:** In Postgres, UNIQUE constraints on nullable columns treat two NULLs as distinct — but `ADD CONSTRAINT UNIQUE (slug)` vs `CREATE UNIQUE INDEX ... WHERE slug IS NOT NULL` behave differently.
**How to avoid:** Use a partial unique index: `CREATE UNIQUE INDEX IF NOT EXISTS idx_svg_templates_slug ON svg_templates(slug) WHERE slug IS NOT NULL`. This is safer than a UNIQUE column constraint.

### Pitfall 5: RLS Policy Ordering — Both SELECT Policies Must Be Dropped
**What goes wrong:** Dropping only `"Authenticated users can read svg templates"` leaves `"Anyone can read active global svg templates"` which has `TO public` (no role restriction). Anonymous/unauthenticated users could still read global templates.
**Why it happens:** PG evaluates multiple SELECT policies with OR — the more permissive one wins.
**How to avoid:** Drop BOTH existing SELECT policies before adding the replacement, as per D-14.

### Pitfall 6: VIEW Does Not Expose design_json for Polotno Templates
**What goes wrong:** `design_json` is in `template_library_slides`, not in `template_library`. The VIEW returns `NULL::jsonb` for `design_json` for polotno rows.
**Why it happens:** Polotno templates are multi-slide; the gallery row references the parent template, not a slide.
**How to avoid:** Phase 171+ must not expect `design_json` to be non-null in the VIEW. The apply flow (Phase 172) fetches slides separately via `template_library_slides` when needed. Document this in the service file as a comment.

---

## Code Examples

### Verified RLS Pattern from Migration 094

```sql
-- Source: supabase/migrations/094_svg_templates.sql:53-56
CREATE POLICY "Authenticated users can create svg templates"
    ON svg_templates FOR INSERT
    TO authenticated
    WITH CHECK (created_by = auth.uid());
```

### Service Error Handling Pattern (from marketplaceService.js)

```js
// Source: src/services/marketplaceService.js
const { data, error } = await supabase.rpc('get_marketplace_templates', {...});
if (error) throw error;
return data || [];
```

`templateGalleryService.js` should return `{ data, error }` (not throw), matching the `{ data: Template[], error }` signature in D-07.

### Supabase Array Overlap Filter

```js
// Tags filter — overlaps means any tag in the array matches
query = query.overlaps('tags', tags);
// Equivalent SQL: tags && '{tag1,tag2}'::text[]
```

[ASSUMED — Supabase JS v2 `.overlaps()` method; standard PostgREST operator]

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `uuid_generate_v4()` (early migrations) | `gen_random_uuid()` (migrations 094+) | Migration 094 | Both valid; for seed rows, use `uuid_generate_v5()` which is deterministic |
| `plan_tier` column in `profiles` | Removed (migration 110) | Phase 166.2 | `can_access_template` no longer references it |
| Three-source JS merge in `fetchSvgTemplates` | Single DB VIEW query | Phase 170 (this phase) | Eliminates filter divergence pitfall |

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `uuid_generate_v5('6ba7b810-9dad-11d1-80b4-00c04fd430c8'::uuid, slug)` is the correct DNS namespace UUID | Architecture Patterns / Pattern 5 | Wrong UUIDs generated; stable across re-runs but wouldn't match official DNS namespace docs. Fallback: use any fixed UUID as namespace — just has to be consistent. |
| A2 | Supabase JS v2 `.overlaps()` method available for `TEXT[]` columns | Code Examples | Tags filter won't work; fallback is `.filter('tags', 'cs', '{tag}')` (contains) |
| A3 | `LeftSidebar` in FabricSvgEditor renders a template browser — replacing `templates={LOCAL_SVG_TEMPLATES}` prop requires understanding its internal contract | Don't Hand-Roll | Could break editor sidebar; requires reading LeftSidebar component before implementing |

**If this table is empty:** Not empty — 3 assumptions need verification during implementation.

---

## Open Questions

1. **FabricSvgEditor LeftSidebar prop contract**
   - What we know: `templates={LOCAL_SVG_TEMPLATES}` is passed; the component accepts it
   - What's unclear: Does `LeftSidebar` expect the full LOCAL_SVG_TEMPLATES shape, or a subset? How does it use the prop?
   - Recommendation: Read `LeftSidebar.jsx` before implementing — it must be checked before the planner specifies the prop replacement approach

2. **`fetchSvgTemplateById` slug-based lookup after seed**
   - What we know: Line 409 uses `.find(t => t.id === templateId)` where `templateId` is a string slug
   - What's unclear: After seed, will callers pass the old string slugs or the new UUIDs?
   - Recommendation: Add `slug` to the DB lookup: `WHERE id = $1 OR slug = $1` — handles both old and new callers

3. **Template svgUrl paths after seed**
   - What we know: `LOCAL_SVG_TEMPLATES` entries use paths like `/templates/svg/restaurant-menu/menu-design.svg`
   - What's unclear: These are relative paths to `public/`. Are these files actually present in the repo?
   - Recommendation: Run `ls public/templates/svg/` before writing the seed to confirm paths exist; if not, the `svg_url` will be broken post-seed

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Supabase CLI | Migration apply | Must be installed per project convention | Check `supabase --version` | — |
| Local Supabase (docker) | Migration test + SQL RLS test | Assumed running for dev | `supabase status` | Remote branch |
| Playwright + Chromium | Two-tenant smoke test | YES — `playwright.config.js` exists, chromium project defined | Existing install | — |
| `TEST_USER_EMAIL` / `TEST_USER_PASSWORD` | Playwright single-tenant | Set per project convention | env var | Skip guard pattern |
| Second tenant credentials | Two-tenant RLS smoke test | UNKNOWN — no `TEST_TENANT_B_EMAIL` env seen in codebase | — | Must be provisioned or test is manual-only |

**Missing dependencies with no fallback:**
- Second tenant credentials for two-tenant Playwright smoke test — must be provisioned or the test falls back to a SQL-only verification. The planner should flag this for user confirmation.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Playwright (E2E) + Supabase SQL assertion (integration) |
| Config file | `playwright.config.js` |
| Quick run command | `npx playwright test tests/e2e/template-gallery-rls.spec.js --project=chromium` |
| Full suite command | `npx playwright test --project=chromium` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| TDAT-01 | `gallery_templates` VIEW returns rows from both tables | SQL assertion (psql/supabase) | `supabase db query "SELECT source_table, COUNT(*) FROM gallery_templates GROUP BY source_table"` | No — Wave 0 |
| TDAT-02 | `fetchGalleryTemplates()` returns `{ data, error }` with DB-sourced templates | Unit (manual) or integration | `node -e "import('./src/services/templateGalleryService.js').then(m => m.fetchGalleryTemplates().then(console.log))"` | No — Wave 0 |
| TDAT-03 | Authenticated Tenant B cannot see Tenant A's non-global svg_templates rows | Playwright E2E (two-tenant) | `npx playwright test tests/e2e/template-gallery-rls.spec.js` | No — Wave 0 |
| TDAT-03 | RLS policy blocks cross-tenant read at SQL level | SQL test (SET role) | SQL: `SET LOCAL role = authenticated; SET request.jwt.claim.sub = '${tenantA_id}'; SELECT COUNT(*) FROM svg_templates WHERE created_by != auth.uid() AND tenant_id IS NOT NULL` | No — Wave 0 |
| TDAT-04 | All 12 slug entries queryable from svg_templates | SQL assertion | `supabase db query "SELECT slug FROM svg_templates WHERE tenant_id IS NULL ORDER BY slug"` | No — Wave 0 |
| TDAT-04 | `LOCAL_SVG_TEMPLATES` export absent from source | Lint / grep | `grep -r "LOCAL_SVG_TEMPLATES" src/ --include="*.js" --include="*.jsx" \|\| echo "CLEAN"` | No — manual check |

### Sampling Rate

- **Per task commit:** SQL assertions for the specific migration block just applied
- **Per wave merge:** `npx playwright test tests/e2e/template-gallery-rls.spec.js`
- **Phase gate:** Full SQL assertion suite + Playwright RLS smoke test green before `/gsd-verify-work`

### Wave 0 Gaps

- [ ] `tests/e2e/template-gallery-rls.spec.js` — two-tenant RLS smoke test (TDAT-03)
- [ ] SQL assertion script or inline migration comments for TDAT-01, TDAT-04
- [ ] Second tenant env credentials (`TEST_TENANT_B_EMAIL`, `TEST_TENANT_B_PASSWORD`) — provisioning prerequisite for E2E RLS test

*(The SQL assertions for VIEW existence and seed content can be embedded as `DO $$ ... ASSERT ... $$ LANGUAGE plpgsql;` blocks at the end of migration 111 for self-verifying behavior.)*

---

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | — |
| V3 Session Management | no | — |
| V4 Access Control | YES | Postgres RLS on `svg_templates`; policy `tenant_id IS NULL OR created_by = auth.uid()` |
| V5 Input Validation | partial | No user input in migration; service receives filter params but no mutation |
| V6 Cryptography | no | — |

### Known Threat Patterns for This Stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Cross-tenant template read (confirmed gap) | Information Disclosure | RLS policy: `tenant_id IS NULL OR created_by = auth.uid()` enforced at DB level |
| RLS bypass via SECURITY DEFINER function | Elevation of Privilege | `gallery_templates` VIEW does not use SECURITY DEFINER; inherits caller's RLS context |
| Direct `svg_templates` table read bypassing VIEW | Tampering | RLS on `svg_templates` itself (not just VIEW) prevents bypass |

**Security note:** The VIEW is not SECURITY DEFINER, so it inherits the authenticated user's RLS policies. This is correct. The RLS fix on the underlying `svg_templates` table is the actual security control. [VERIFIED: migration 080 — `template_library` has `USING(true)` policies, intentionally permissive for global templates]

---

## Sources

### Primary (HIGH confidence)
- `supabase/migrations/001_initial_schema.sql` — uuid-ossp extension confirmed enabled
- `supabase/migrations/080_template_marketplace.sql` — template_library schema, all columns, RLS policies
- `supabase/migrations/094_svg_templates.sql` — svg_templates schema, broken RLS policies at lines 42-50
- `supabase/migrations/110_fix_can_access_template.sql` — migration style reference
- `src/services/svgTemplateService.js:117-267` — LOCAL_SVG_TEMPLATES 12 entries, full field schema
- `src/services/svgTemplateService.js:274-399` — three-source merge logic to be replaced
- `src/services/svgTemplateService.js:409` — LOCAL_SVG_TEMPLATES.find() callsite
- `src/services/templateService.js` — service patterns to mirror (named exports, supabase import)
- `src/components/svg-editor/FabricSvgEditor.jsx:25,2490` — third LOCAL_SVG_TEMPLATES importer
- `src/pages/SvgEditorPage.jsx:1-60` — does NOT import LOCAL_SVG_TEMPLATES directly
- `playwright.config.js` — test framework config, chromium-only, retries: 2 on CI
- Grep: no GIN index on template_library.tags in any migration

### Secondary (MEDIUM confidence)
- `.planning/research/ARCHITECTURE.md` — component map, VIEW design rationale
- `.planning/research/PITFALLS.md` — pitfall inventory including cross-tenant leakage detail
- `.planning/research/STACK.md` — no new packages needed for Phase 170
- `.planning/milestones/v20.0-phases/170-data-layer-foundation/170-CONTEXT.md` — all locked decisions

### Tertiary (LOW confidence — marked with [ASSUMED])
- UUID v5 DNS namespace value (A1 above)
- Supabase `.overlaps()` method availability (A2 above)

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all patterns verified from source files
- Architecture: HIGH — VIEW SQL derived from actual column inspection
- Pitfalls: HIGH — RLS lines verified by line number; third importer found by grep
- Security: HIGH — broken policies confirmed in migration 094

**Research date:** 2026-04-15
**Valid until:** 2026-05-15 (stable stack; uuid-ossp and Supabase v2 APIs are stable)
