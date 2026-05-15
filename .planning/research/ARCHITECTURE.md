# Architecture Patterns — v21.0 Templates at Scale

**Domain:** Admin-driven template pipeline, gallery virtualization, Polotno QuickCustomize
**Researched:** 2026-05-06
**Baseline milestone:** v20.0 (migrations 167–175, committed — do not re-research)
**Overall confidence:** HIGH (all conclusions drawn from live code, not training assumptions)

---

## Recommended Architecture

### System Diagram

```
ADMIN PIPELINE (new)                    GALLERY READ PATH (extend)
─────────────────                       ──────────────────────────
AdminAiGeneratorPage (new)              TemplateGalleryPage (extend)
   │                                        │
   │ supabase.functions.invoke              │ fetchGalleryTemplates()
   │ 'generate-svg-template'                │    │
   ▼                                        ▼    ▼
Edge Function: generate-svg-template    gallery_templates VIEW
   │  @anthropic-ai/sdk                     │  (migration 167, update in mig 177)
   │  ANTHROPIC_API_KEY (env secret)         │
   │  admin-only auth gate                  svg_templates    template_library
   ▼                                        (EXTEND: +vertical,  (unchanged)
template_drafts table (new, mig 176)        +attribution keys
   │  status: pending|approved|rejected      in metadata jsonb)
   │  generated_svg TEXT
   │  prompt TEXT, generated_by uuid
   │  reviewed_by uuid, reviewed_at
   ▼
AdminDraftsQueuePage (new) — review UI
   │ approve → INSERT into svg_templates
   │           @resvg/resvg-js rasterize
   │           S3 upload thumbnail
   │ reject  → UPDATE status='rejected'
   ▼
svg_templates (is_active=TRUE)
   │
gallery_templates VIEW (auto-picks it up — VIEW updated in mig 177)
```

---

## Component Boundaries

| Component | Status | Responsibility | Communicates With |
|-----------|--------|---------------|-------------------|
| `AdminAiGeneratorPage` | NEW FILE `src/pages/Admin/AdminAiGeneratorPage.jsx` | Admin form: vertical + prompt → invoke Edge Function → insert draft row | Edge Function `generate-svg-template`, `template_drafts` table |
| `AdminDraftsQueuePage` | NEW FILE `src/pages/Admin/AdminDraftsQueuePage.jsx` | List pending drafts, SVG preview, approve/reject buttons | `template_drafts` table, `svgValidator`, S3 upload |
| `generate-svg-template` | NEW Edge Function (Deno/TypeScript) | Secrets-safe LLM call, svgValidator, INSERT into `template_drafts` | Anthropic API, `template_drafts` table |
| `template_drafts` | NEW TABLE (migration 176) | Staging queue for AI-generated and third-party SVGs pending admin review | `generate-svg-template` EF, `AdminDraftsQueuePage` |
| `templateGalleryService.js` | EXTEND — add `fetchTemplateAttribution()` helper | Read `metadata.attribution` for third-party display | `gallery_templates` VIEW |
| `TemplateGalleryPage` | EXTEND — add `useVirtualizer` + vertical filter | Virtualized grid over `displayedTemplates` (fuse.js output); vertical filter chip | `@tanstack/react-virtual`, `templateGalleryService` |
| `QuickCustomizePanel` | EXTEND — add `editor_type` dispatch (create in `src/` from worktree baseline) | Branch on `template.editor_type` → `svgCustomizeService` (svg) or `polotnoCustomizeService` (polotno) | `svgCustomizeService` (existing), `polotnoCustomizeService` (NEW) |
| `polotnoCustomizeService.js` | NEW FILE `src/services/polotnoCustomizeService.js` | Mutate Polotno JSON design_json: brand colors, logo, text overrides — in memory only, no DB write before Apply | `template_library_slides` table via Supabase query |
| `AdminBulkImportPage` | NEW FILE `src/pages/Admin/AdminBulkImportPage.jsx` | Drag-drop SVG zip, validate each via `svgValidator`, INSERT into `template_drafts` with `source='import'` | `svgValidator`, `template_drafts` |

---

## (a) AI Generator Architecture

**Decision: Supabase Edge Function (Deno), NOT client-side direct call.**

Rationale:
- `ANTHROPIC_API_KEY` never leaves the server — stored as Supabase secret, not a `VITE_` prefix env var. Client-side calls would expose the key in the browser, bundle, and network logs.
- Audit trail: the Edge Function inserts a `template_drafts` row with `generated_by = auth.uid()`, `prompt`, `model_id`, `generated_svg`, `created_at`. Every generation is logged immutably.
- Cost control: the Edge Function enforces `is_super_admin(auth.uid())` before calling the LLM. Non-admin requests get 403 before a single token is spent. A per-user rate limit (COUNT template_drafts WHERE generated_by=uid AND created_at > now()-1d < 20) prevents runaway generation.
- Precedent: the existing AI Designer is already invoked via Supabase Edge Function (confirmed by `supabase.functions.invoke` pattern in the codebase). Vercel.json has a single SPA rewrite rule with no active `api/` folder — all prior Vercel serverless routes are in `_api-disabled/`.

**Edge Function shape (new: `supabase/functions/generate-svg-template/index.ts`):**

```typescript
// Pseudo-code — implementation detail for the phase plan
Deno.serve(async (req) => {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const { vertical, prompt } = await req.json();

  // 1. Auth gate — verify JWT, check is_super_admin
  const user = await verifyAndGetUser(req, supabase);
  if (!user.is_super_admin) return new Response('Forbidden', { status: 403 });

  // 2. Rate limit: COUNT template_drafts WHERE generated_by=uid AND created_at > now()-1d
  await assertGenerationRateLimit(supabase, user.id);

  // 3. Build system prompt: SVG structure rules + svgValidator constraints
  //    (no currentColor/var(--*), must have customization anchors, <200KB, etc.)
  const systemPrompt = buildSvgSystemPrompt(vertical);

  // 4. Call Anthropic — @anthropic-ai/sdk (Deno-compatible)
  const anthropic = new Anthropic({ apiKey: Deno.env.get('ANTHROPIC_API_KEY') });
  const msg = await anthropic.messages.create({
    model: 'claude-opus-4-5',
    max_tokens: 4096,
    system: systemPrompt,
    messages: [{ role: 'user', content: prompt }],
  });
  const rawSvg = extractSvgFromResponse(msg.content[0].text);

  // 5. Validate — svgValidator (Node/Deno-compatible path with injected DOMParser)
  const { ok, errors, warnings } = validateSvg(rawSvg, { DOMParserCtor: ... });
  if (!ok) return Response.json({ error: 'Generated SVG failed validation', errors }, { status: 422 });

  // 6. INSERT template_drafts(status='pending', source='ai-generated', generated_svg, prompt, vertical, generated_by, model_id)
  const { data } = await supabase.from('template_drafts').insert({ ... }).select('id').single();

  // 7. Return { draftId, warnings } — client navigates to drafts queue
  return Response.json({ draftId: data.id, warnings });
});
```

**Note on `svgValidator` in Deno:** `svgValidator.js` is already written as a pure function with injectable `DOMParserCtor` and `DOMPurify` for Node use. The Edge Function injects Deno's `DOMParser` (available in Deno's browser-compatible globals) or a lightweight jsdom-equivalent.

---

## (b) New Tables / Columns and VIEW Extension

### New Table: `template_drafts` (migration 176)

```sql
CREATE TABLE template_drafts (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source       TEXT NOT NULL CHECK (source IN ('ai-generated', 'import')),
  status       TEXT NOT NULL DEFAULT 'pending'
                 CHECK (status IN ('pending', 'approved', 'rejected')),
  -- Content
  slug         TEXT,              -- assigned at approval time, nullable until then
  name         TEXT,
  description  TEXT,
  category     TEXT,              -- must match chk_svg_templates_category_enum values
  orientation  TEXT CHECK (orientation IN ('landscape', 'portrait', 'square')),
  vertical     TEXT CHECK (vertical IN ('Restaurant & QSR', 'Retail & e-commerce', 'Healthcare & wellness')),
  tags         TEXT[] NOT NULL DEFAULT '{}',
  svg_content  TEXT,              -- validated SVG string
  width        INTEGER DEFAULT 1920,
  height       INTEGER DEFAULT 1080,
  -- Attribution (third-party import; NULL for AI-generated)
  attribution  JSONB DEFAULT NULL,
  -- attribution shape: { "source_url": "...", "license": "CC0|MIT|Apache-2.0",
  --                      "author": "...", "collection": "..." }
  -- Audit
  generated_by UUID REFERENCES auth.users(id),
  reviewed_by  UUID REFERENCES auth.users(id),
  reviewed_at  TIMESTAMPTZ,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW(),
  -- LLM provenance (AI-generated only)
  prompt       TEXT,
  model_id     TEXT   -- e.g. 'claude-opus-4-5'
);
-- RLS: super_admin reads all; owner reads own drafts; no public read.
```

### New Column: `svg_templates.vertical` (migration 177)

**Decision: Dedicated `vertical TEXT` column on `svg_templates`, NOT tag-based filtering.**

Justification over alternatives:
- **Tags array**: Tags are display/search signals. Vertical is a routing axis. Mixing it into tags requires parsing prefixed strings (`vertical:restaurant`), loses type safety, and is invisible to DB CHECK constraints.
- **`metadata` JSONB**: Already used for `{ license, attribution }`. Storing vertical in JSONB makes it non-indexable without a generated column, non-enumerable at the CHECK constraint layer, and not surfaceable in the VIEW without an expression cast.
- **Separate `template_verticals` join table**: Overkill for a 3-value enum. Creates a join for every gallery query and complicates the VIEW union.
- **Conclusion**: A `TEXT` column with a `CHECK` constraint follows the exact same pattern as `category` (which has `chk_svg_templates_category_enum`). Same discipline, same tooling, lowest friction.

```sql
-- migration 177
ALTER TABLE svg_templates
  ADD COLUMN IF NOT EXISTS vertical TEXT
  CHECK (vertical IN ('Restaurant & QSR', 'Retail & e-commerce', 'Healthcare & wellness'));
-- NULL = cross-vertical (applies everywhere). No NOT NULL: existing 127 rows valid as-is.

-- Also update gallery_templates VIEW to surface the new column:
CREATE OR REPLACE VIEW gallery_templates AS
-- SVG leg
SELECT
  id, source_table, editor_type, name, description, category, tags, orientation,
  thumbnail, svg_url, svg_content, design_json, width, height, tenant_id, created_by,
  created_at, updated_at, use_count, is_featured, is_active, slug,
  vertical   -- NEW
FROM svg_templates
WHERE is_active = TRUE

UNION ALL

-- Polotno leg (vertical not applicable — NULL)
SELECT
  id, 'template_library'::text, 'polotno'::text, name, description,
  industry AS category, tags, NULL::text AS orientation, thumbnail_url AS thumbnail,
  NULL::text, NULL::text, NULL::jsonb, NULL::integer, NULL::integer,
  NULL::uuid, created_by, created_at, updated_at, install_count AS use_count,
  is_featured, is_active, NULL::text AS slug,
  NULL::text AS vertical   -- Polotno templates are not vertical-scoped in v21.0
FROM template_library
WHERE is_active = TRUE;
```

### Attribution for Third-Party Imports

**Decision: Extend `svg_templates.metadata` JSONB — no new column, no new table.**

`metadata JSONB DEFAULT '{}'` already exists on `svg_templates` (migration 094). Migration 175 already seeds it as `{ "license": "first-party", "attribution": null }`. For third-party imports approved from the drafts queue, the approval action writes:

```json
{
  "license": "CC0",
  "attribution": {
    "source_url": "https://svgrepo.com/svg/...",
    "author": "SVG Repo",
    "collection": "Business Icons Pack"
  }
}
```

No migration needed for attribution shape — JSONB is schema-free. A `fetchTemplateAttribution(id)` helper in `templateGalleryService.js` reads `metadata->>'license'` and `metadata->'attribution'` for display in the preview modal footer.

---

## (c) TanStack Virtual Integration with fuse.js and URL State

**Package to install:** `@tanstack/react-virtual` (confirmed NOT in `package.json` — add in TGAL-F1 phase)

**Integration pattern: Row-chunked single-axis virtualizer, NOT 2D grid virtualizer.**

The 2D grid API (`rowVirtualizer + columnVirtualizer`) requires absolute positioning of all cells, which conflicts with Tailwind's responsive `TemplateCardGrid` and the `StaggeredItem` wrapper. The correct pattern for a responsive card grid is to chunk the flat `displayedTemplates` array into rows of N cards, then virtualize the rows:

```javascript
// In TemplateGalleryPage — replaces StaggeredPageTransition + TemplateCardGrid
const COLS = 4; // match TemplateCardGrid columns={4}
const CARD_ROW_HEIGHT = 280; // px — uniform estimate; landscape cards ~260px

// Chunk the fuse.js-filtered array into rows
const rowChunks = useMemo(() => {
  const chunks = [];
  for (let i = 0; i < displayedTemplates.length; i += COLS) {
    chunks.push(displayedTemplates.slice(i, i + COLS));
  }
  return chunks;
}, [displayedTemplates]);

const parentRef = useRef(null);
const virtualizer = useVirtualizer({
  count: rowChunks.length,
  getScrollElement: () => parentRef.current,
  estimateSize: () => CARD_ROW_HEIGHT,
  overscan: 3,
});

// Render:
<div ref={parentRef} style={{ height: '100%', overflow: 'auto' }}>
  <div style={{ height: `${virtualizer.getTotalSize()}px`, position: 'relative' }}>
    {virtualizer.getVirtualItems().map((virtualRow) => (
      <div
        key={virtualRow.key}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: `${virtualRow.size}px`,
          transform: `translateY(${virtualRow.start}px)`,
        }}
      >
        <div className="grid grid-cols-4 gap-4">
          {rowChunks[virtualRow.index].map((t) => (
            <TemplateCard key={t.id} ... />
          ))}
        </div>
      </div>
    ))}
  </div>
</div>
```

**URL state compatibility:**

`TemplateGalleryPage` drives all filter state through `useSearchParams`. The virtualizer only receives `rowChunks.length` (derived from `displayedTemplates`, which is already the post-filter fuse.js output). Filter changes update `displayedTemplates` → `rowChunks` → `virtualizer.count` reactively. No URL integration in the virtualizer layer needed.

**Scroll restoration:**

Capture scroll offset before navigating away; restore via `virtualizer.scrollToOffset()` after data reloads. For back-button survival, store in `sessionStorage` keyed to the current URL search string:

```javascript
// Capture before apply (modify handleSelectTemplate)
const SCROLL_KEY = () => `bizscreen:galleryScroll:${location.search}`;

// On unmount or before navigate:
sessionStorage.setItem(SCROLL_KEY(), String(parentRef.current?.scrollTop ?? 0));

// On mount, after isFetching becomes false:
useEffect(() => {
  if (!isFetching) {
    const saved = Number(sessionStorage.getItem(SCROLL_KEY()) ?? 0);
    if (saved > 0) virtualizer.scrollToOffset(saved, { align: 'start' });
  }
}, [isFetching]);
```

Alternatively, `useVirtualizer({ initialOffset: () => Number(sessionStorage.getItem(SCROLL_KEY()) ?? 0) })` restores without a visible jump on first render.

**Skeleton / empty / error state compatibility:**

The virtualizer is only instantiated in the "content" branch of `TemplateGalleryPage`. Loading, error, zero-content, and no-results branches render their existing components unchanged. Zero risk to those paths.

**StaggeredPageTransition removal:**

`StaggeredPageTransition` + `StaggeredItem` use CSS `transition-delay` multiplied by index. With virtualization, new virtual rows mount/unmount continuously during scroll, re-triggering the animation. Remove these wrappers from the virtualized path. Replace with a single CSS `animation` on the virtualizer container `div` (e.g., `animate-fade-in` on mount). The filter-bar, active-filter chips, and StarterPacksStrip are outside the virtualizer container and are unaffected.

---

## (d) QuickCustomizePanel Dispatch: Polotno vs SVG

**Current state of QuickCustomizePanel:**

`QuickCustomizePanel.jsx` does NOT exist in `src/` (confirmed: `find src -name QuickCustomizePanel*` returns nothing). It exists only in `.claude/worktrees/agent-*` worktrees. TPRV-F1 is therefore a net-new file creation in `src/components/template-gallery/QuickCustomizePanel.jsx` using the worktree version as a baseline.

**Dispatch logic:**

```javascript
// QuickCustomizePanel.jsx — EXTEND (create in src/ from worktree baseline)
// template.editor_type is the authoritative discriminator (per 170-CONTEXT D-03)

function QuickCustomizePanel({ template, brandColors, logoUrl, textOverrides, onChange }) {
  const isSvg = template.editor_type === 'svg';

  // UI is IDENTICAL for both editor types — same color pickers, logo upload, text fields.
  // Only the mutation path differs.

  const applyCustomization = useCallback(async () => {
    if (isSvg) {
      // Existing path: svgCustomizeService (9 helpers)
      const mutated = svgCustomizeService.applyAll(template.svg_content, {
        brandColors, logoUrl, textOverrides
      });
      onChange({ customizedSvg: mutated });
    } else {
      // New path: polotnoCustomizeService
      const mutated = await polotnoCustomizeService.applyAll(template.id, {
        brandColors, logoUrl, textOverrides
      });
      onChange({ customizedSlides: mutated });
    }
  }, [isSvg, template, brandColors, logoUrl, textOverrides, onChange]);
}
```

**`polotnoCustomizeService.js` — NEW FILE `src/services/polotnoCustomizeService.js`:**

Polotno design JSON lives in `template_library_slides` (confirmed by migration 167 VIEW comment: "design_json is always NULL — polotno slides live in template_library_slides"). The service fetches slide JSON, mutates in memory, and returns mutated slides. It does NOT write to the DB — that happens only at Apply time via the apply RPC.

```javascript
// polotnoCustomizeService.js — parallel to svgCustomizeService

export async function fetchPolotnoSlides(templateId) {
  const { data, error } = await supabase
    .from('template_library_slides')
    .select('position, title, kind, design_json, duration_seconds')
    .eq('template_id', templateId)
    .order('position');
  if (error) throw error;
  return data;
}

export function applyBrandColors(slides, colorMap) {
  // Walk design_json.pages[].children[] for each slide
  // Replace fill/stroke on text and figure elements matching colorMap keys
  return slides.map(slide => ({
    ...slide,
    design_json: deepMutateColors(slide.design_json, colorMap)
  }));
}

export function applyLogoUrl(slides, logoUrl) {
  // Find image elements with custom?.role === 'logo' or id === 'logo'
  return slides.map(slide => ({
    ...slide,
    design_json: deepMutateImageSrc(slide.design_json, 'logo', logoUrl)
  }));
}

export function applyTextOverrides(slides, overrides) {
  // overrides: { [elementId]: string }
  return slides.map(slide => ({
    ...slide,
    design_json: deepMutateText(slide.design_json, overrides)
  }));
}

export async function applyAll(templateId, { brandColors, logoUrl, textOverrides }) {
  let slides = await fetchPolotnoSlides(templateId);
  if (brandColors) slides = applyBrandColors(slides, brandColors);
  if (logoUrl)     slides = applyLogoUrl(slides, logoUrl);
  if (textOverrides) slides = applyTextOverrides(slides, textOverrides);
  return slides; // caller passes as p_customized_slides to the apply RPC
}
```

**Apply RPC extension (migration 178):**

The existing `clone_template_to_scene` RPC (migration 110) writes slides verbatim from `template_library_slides`. To support customized Polotno JSON, a new RPC `clone_template_with_polotno_customization` is needed — analogous to how migration 168 added `p_customized_svg` to the SVG path. The new RPC accepts `p_customized_slides JSONB` (array of slide objects with mutated `design_json`) and uses them instead of the DB rows.

**Apply dispatch in `templateApplyService.applyTemplate` — EXTEND:**

The existing dispatch at lines 45–76 handles `svg` and `polotno`. A third conditional handles the customized Polotno path:

```javascript
// In templateApplyService.applyTemplate (existing file, add branch)
if (template.editor_type === 'polotno' && options.customizedSlides) {
  const { data, error } = await supabase.rpc('clone_template_with_polotno_customization', {
    p_template_id: template.id,
    p_scene_name: sceneName,
    p_customized_slides: options.customizedSlides,
  });
  if (error) throw error;
  return data;
}
// Falls through to existing polotno branch if no customization
```

---

## (e) Build Order — Phase Dependency Chain

Each phase compiles and ships green independently. Dependencies drive the order.

```
PHASE A — Schema Foundation
  Migrations:
    176: CREATE TABLE template_drafts
    177: ALTER svg_templates ADD COLUMN vertical
         UPDATE gallery_templates VIEW (add vertical column)
  Frontend changes: NONE — migration-only phase
  Ships green: migration applies cleanly, VIEW still selectable
  Unblocks: ALL phases below (table + column exist before any code uses them)

PHASE B — Polotno QuickCustomize Backend
  Migration:
    178: CREATE FUNCTION clone_template_with_polotno_customization(...)
  New files:
    src/services/polotnoCustomizeService.js
  Ships green: unit tests against fixture Polotno JSON; RPC callable from Supabase client
  Depends on: PHASE A (gallery_templates VIEW stable; no schema conflict)
  Unblocks: PHASE C

PHASE C — Polotno QuickCustomize UI (TPRV-F1)
  New files:
    src/components/template-gallery/QuickCustomizePanel.jsx
      (created in src/ from worktree baseline; add editor_type dispatch)
  Modified files:
    src/services/templateApplyService.js (add polotno customized branch)
    TemplatePreviewModal (if exists; integrate QuickCustomizePanel)
  Ships green: E2E — QuickCustomize on Polotno template; customized apply creates scene
  Depends on: PHASE B
  Independent of: PHASE D, E, F, G

PHASE D — AI Generator Pipeline
  New files:
    supabase/functions/generate-svg-template/index.ts
    src/pages/Admin/AdminAiGeneratorPage.jsx
    src/pages/Admin/AdminDraftsQueuePage.jsx
    src/services/aiTemplateGeneratorService.js (client-side invoke wrapper)
  Ships green: E2E — admin generates → draft in queue → approve → template in gallery
  Depends on: PHASE A (template_drafts table)
  Independent of: PHASE B, C
  Unblocks: PHASE E (drafts queue reused by import pipeline)

PHASE E — Third-Party SVG Bulk Import
  New files:
    src/pages/Admin/AdminBulkImportPage.jsx
  Modified files:
    svgValidator.js — add attribution metadata field to output (optional extend)
    AdminDraftsQueuePage.jsx — support source='import' display (minor extend)
  Ships green: E2E — zip upload → validated drafts → approve batch → gallery updated
  Depends on: PHASE A, PHASE D (queue UI reused)

PHASE F — Vertical Content Seeding (300+ templates)
  SQL seed script: ~300 INSERT statements with vertical column populated
    Executed via Supabase Mgmt API (same pattern as migration 175)
  Modified files:
    src/pages/TemplateGalleryPage.jsx — add vertical filter chip
      (reads from displayedTemplates; no new fetch; vertical is already in VIEW)
  Ships green: filter by vertical returns only matching templates; catalog ~500
  Depends on: PHASE A (vertical column exists on svg_templates)

PHASE G — Gallery Virtualization (TGAL-F1)
  Package install: @tanstack/react-virtual
  Modified files:
    src/pages/TemplateGalleryPage.jsx — add useVirtualizer over rowChunks
      Remove StaggeredPageTransition from the virtualized path
      Add scroll offset capture/restore
  Ships green: E2E — 500-template catalog renders without jank; back-nav restores scroll
  Depends on: PHASE F (catalog must be ~500 for the performance test to be meaningful;
              can develop against 127 but flip the green gate at 200+ templates)
```

**Critical path summary:**

```
A → D → E → F → G   (catalog growth path)
A → B → C           (Polotno QuickCustomize path, independent)
```

Phases B/C and D/E/F can be executed in parallel after Phase A ships.

---

## Anti-Patterns to Avoid

### Anti-Pattern 1: Client-Side LLM Call
**What:** Calling `@anthropic-ai/sdk` directly from the React SPA via a `VITE_ANTHROPIC_API_KEY` env var.
**Why bad:** Key is visible in the browser, bundle, and DevTools network tab. Any authenticated user can generate unlimited tokens. No audit trail.
**Instead:** Supabase Edge Function with `ANTHROPIC_API_KEY` as a Supabase project secret. Admin gate before any token is consumed.

### Anti-Pattern 2: Materialized VIEW for `gallery_templates`
**What:** Converting the regular VIEW to `CREATE MATERIALIZED VIEW` for query speed at 500+ rows.
**Why bad:** Materialized VIEWs require explicit `REFRESH`, do not inherit caller RLS (they snapshot permissions at REFRESH time), and would silently expose cross-tenant data in a stale snapshot. The `security_invoker=true` design from migration 167 is correct and must be preserved.
**Instead:** Add a GIN index on `svg_templates.vertical` if needed. At 500 rows the VIEW query is sub-20ms.

### Anti-Pattern 3: `vertical` in the `tags` Array
**What:** Using `tags = ARRAY[..., 'vertical:restaurant-qsr']` as a namespaced tag.
**Why bad:** Breaks the category CHECK constraint discipline. Requires all filter logic to parse prefixed strings. Not indexable. Invisible to `chk_svg_templates_category_enum` enforcement.
**Instead:** `svg_templates.vertical TEXT` with its own CHECK constraint.

### Anti-Pattern 4: 2D Grid Virtualizer for Template Cards
**What:** Using TanStack Virtual's dual-axis grid virtualizer (rowVirtualizer + columnVirtualizer) directly.
**Why bad:** Requires absolute-positioned cells with fixed pixel dimensions — overrides Tailwind's responsive `grid-cols-4`, breaks `TemplateCard`'s aspect-ratio classes, breaks `FavoriteButton` z-index stacking context, and requires uniform cell height (cards vary between landscape ~260px and portrait ~400px).
**Instead:** Row-chunked single-axis virtualizer — chunk flat array into rows of 4, virtualize rows.

### Anti-Pattern 5: Writing Polotno Customization Back to `template_library_slides`
**What:** Persisting brand-color / logo / text overrides into `template_library_slides.design_json` before Apply is clicked.
**Why bad:** `template_library_slides` is shared system data. Writing a tenant's brand colors there would corrupt the template for all other users. No RLS policy would catch this because the write goes through a SECURITY DEFINER function.
**Instead:** Keep customized slides in React state until Apply is clicked; pass as `p_customized_slides` to the apply RPC, which writes only to `scene_slides` (tenant-scoped).

---

## Scalability Considerations

| Concern | At 127 templates (now) | At 500 templates (v21.0) | At 5,000 templates (future) |
|---------|------------------------|---------------------------|------------------------------|
| `gallery_templates` query | <5ms | <20ms — no index needed | Needs pg_trgm FTS or Algolia |
| fuse.js in-memory index | ~150KB | ~600KB — acceptable | >6MB — browser OOM risk |
| React DOM nodes | 127 card nodes — fine | 500 nodes — jank (virtualize) | N/A — virtualize at ~200 |
| `@tanstack/react-virtual` | Not needed | Activate when catalog hits ~200 | Sufficient to 10K+ rows |
| Thumbnail S3 storage | 127 PNGs — negligible | 500 PNGs — negligible | CDN layer needed; S3 pattern holds |
| `template_drafts` table | N/A | ~50-100 rows (admin use) | Archive old reviewed rows after 90d |

---

## Sources

- `/supabase/migrations/094_svg_templates.sql` — `metadata JSONB` column definition (existing; confirms attribution needs no new column)
- `/supabase/migrations/167_gallery_templates_view_and_rls.sql` — VIEW schema, 21-column projection, RLS policy, `security_invoker` design
- `/supabase/migrations/168_clone_template_with_customization.sql` — `p_customized_svg` parameter pattern; confirms atomic apply RPC structure to mirror for Polotno
- `/supabase/migrations/175_seed_100_templates_and_taxonomy.sql` — `metadata` JSONB seeds, `chk_svg_templates_category_enum` CHECK constraint pattern
- `/src/services/templateGalleryService.js` — `gallery_templates_with_favorites` read path; `editor_type` discriminator confirmed
- `/src/services/templateApplyService.js` — dispatch-by-editor_type pattern; `DOMPurify` sanitization before RPC
- `/src/services/svgValidator.js` — 6-rule validator; injectable `DOMParserCtor` for Deno compatibility
- `/src/services/autoTaggingService.js` — calls `/api/ai/generate-tags` (DISABLED) → confirms AI must use Edge Functions
- `/src/pages/TemplateGalleryPage.jsx` — `displayedTemplates` fuse.js pipeline; `useSearchParams` URL state; `StaggeredPageTransition` wrapper (to remove)
- `/vercel.json` — single SPA rewrite confirms no active Vercel serverless API routes
- `/_api-disabled/ai/generate-tags.js` — `@anthropic-ai/sdk` import pattern for reference
- `package.json` — `@tanstack/react-virtual` NOT installed; `@resvg/resvg-js`, `fuse.js`, `dompurify` confirmed present
- TanStack Virtual docs via Context7 `/tanstack/virtual` — `useVirtualizer`, `initialOffset`, `scrollToOffset` API (HIGH confidence — current docs verified)
