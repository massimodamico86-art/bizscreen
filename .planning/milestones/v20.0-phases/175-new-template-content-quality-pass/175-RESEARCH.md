# Phase 175: New Template Content + Quality Pass — Research

**Researched:** 2026-04-29
**Domain:** Bulk SVG content authoring, validation tooling (DOMPurify + svgCustomizeService preflight), thumbnail generation pipeline (Node-side SVG rasterization), Postgres taxonomy enforcement (CHECK / NOT NULL / RPC validation), Playwright structural assertions
**Confidence:** HIGH — all assertions backed by direct codebase inspection; one MEDIUM area (thumbnail generation tooling choice — multiple viable Node packages, recommended pick is the lightest one that fits the existing stack).

---

## Summary

Phase 175 ships **content + a validation gate**. It is *not* a UI feature phase — there is no new gallery surface, no new page, no new route. The work is concentrated in three areas:

1. **Validation tooling** — a deterministic, pure-Node script (`scripts/validate-svg-templates.cjs`) that runs in CI and at admin-upload time, asserting well-formed XML, no `currentColor` / CSS `var(--*)` colors that silently break `svgCustomizeService.swapColor()`, and DOMPurify-clean markup. The Phase 170 `svg_templates` schema already exists; **no migration is needed for validation itself**, but a small migration adds taxonomy CHECK / NOT NULL constraints to enforce TCTN-03.
2. **Thumbnail generation** — a Node-side rasterizer (`@resvg/resvg-js` + `sharp` for PNG conversion, OR alternatively the Playwright that's already in the stack) that converts each SVG into a 480×270 PNG, uploads to S3 via the existing `s3UploadService.js`, and writes the URL to `svg_templates.thumbnail`. **Recommendation: `@resvg/resvg-js`** — pure Rust→WASM rasterizer, no headless browser, ~2MB install, runs in the existing Node CLI.
3. **Content + structural test pass** — author / curate / commit ≥100 net-new SVGs into `public/templates/svg/<slug>/design.svg`, seed them into `svg_templates` via a new migration (175 — next safe version after 174), then refactor `tests/e2e/template-gallery.spec.js` and any sister specs to use structural assertions only (already mostly done in Phase 171, but the `template-marketplace alias` test still relies on heading text — defensible — and any `toHaveCount(N)` patterns must be audited and replaced).

**The "validation gate" is the load-bearing deliverable.** Without it, every new template is a potential silent failure at apply-time. The same script must run as both (a) a CI guard on `public/templates/svg/**` and (b) a pre-INSERT validator inside the admin upload path (`BulkTemplateUpload.jsx` → `marketplaceService.createTemplate()` calls validation first; on failure, surface clear inline error per file).

**Primary recommendation:** Treat `scripts/validate-svg-templates.cjs` (Node-side validator using `jsdom` + `dompurify`) as the *first* deliverable of this phase — every other piece of work depends on it. Build it before the first new template is added.

---

<user_constraints>
## User Constraints (from CONTEXT.md)

**No CONTEXT.md exists for Phase 175 yet.** The orchestrator either has not run `/gsd-discuss-phase` for this phase, or the discuss-phase output was not persisted. Per the agent contract, this means:

- The planner must derive constraints directly from `.planning/REQUIREMENTS.md` (TCTN-01, TCTN-02, TCTN-03, TCTN-04, TQAL-05) and `.planning/ROADMAP.md` (Phase 175 goal + 5 success criteria).
- The orchestrator's `additional_context` block (in the spawn prompt) explicitly enumerates open questions and a "What NOT to do" section — those are treated as the de facto user constraints for this research pass:

### Locked from orchestrator additional_context (treat as decisions until /gsd-discuss-phase runs)

- **No phase splitting** — the ROADMAP scope is the contract.
- **No success criteria changes** — research informs HOW, not WHAT.
- **No `svgCustomizeService` rewrite** — work within the existing 9-function surface (see Pitfall 6 in `.planning/research/PITFALLS.md`).
- **No Phase 170 schema changes** — Phase 170 shipped 2026-04-16. The `svg_templates` table, `gallery_templates_with_favorites` VIEW, and RLS policy are immutable for this phase. Build on top.

### Claude's Discretion (orchestrator open questions — research recommendations follow)

1. SVG validation gate location and exact assertions
2. Thumbnail generation strategy (Node rasterizer vs headless browser vs build-time vs client-side)
3. Taxonomy enforcement layer (DB CHECK vs Zod-style validator vs admin UI guard)
4. Source of the 100+ templates (curated open-source vs hand-authored vs LLM-assisted vs generated)
5. Structural E2E migration patterns
6. DB count assertion mechanism for the ≥100 SC
7. CI implications (test runtime, fixture seeding, validation pre-commit vs build vs CI job)

### Deferred Ideas (OUT OF SCOPE — orchestrator explicit)

- Polotno-side QuickCustomize parity (acknowledged in REQUIREMENTS.md as **TPRV-F1**, future requirement)
- Virtualized grid activation (**TGAL-F1**, future)
- Industry-personalized recommendations (**TPER-F1**, future)
- User-created template marketplace, AI-generated templates, headless CMS, Algolia (REQUIREMENTS.md "Out of Scope" table — locked)
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| **TCTN-01** | At least 100 net-new SVG templates ship at v20.0 launch across a defined category taxonomy. | Section 4 (Content sourcing strategy — SVGRepo / undraw curated import + targeted hand-authored fillers); Section 6 (DB count assertion via `SELECT COUNT(*) FROM svg_templates WHERE created_at >= '2026-04-29'` baselined in migration 175). |
| **TCTN-02** | All net-new templates pass an SVG validation gate (well-formed XML, expected `data-customize-*` attributes, no CSS variables / `currentColor`, sanitized markup). | Section 1 (Validation gate spec — six checks); Section 2 (Existing SVG inventory — none today use `data-customize-*`, all use Adobe Illustrator-emitted `class="stN"` patterns; the new content authoring guide must explicitly require either `id="logo"` / `id="text-headline"` semantic anchors **or** `data-customize-*` attributes). |
| **TCTN-03** | Template taxonomy (categories, tags, industries) is documented and enforced at admin-upload time. | Section 5 (Taxonomy contract — fixed enum for `category`, fixed enum for `industry`, free-form `tags TEXT[]` with min-length=1 and tag-vocabulary lint warning; enforcement layered DB CHECK + service-level zod-shape validator). |
| **TCTN-04** | Admin pipeline generates template thumbnails automatically (replacing the LayoutTemplate icon placeholder). | Section 3 (Thumbnail pipeline — `@resvg/resvg-js` Node rasterizer @ 480×270, S3 upload via `uploadThumbnailToS3`); Section 7 (Card placeholder — confirmed `TemplateCard.jsx:81` renders `<LayoutTemplate>` only when `imageUrl` falsy; populating `svg_templates.thumbnail` ends the placeholder). |
| **TQAL-05** | Gallery E2E tests use structural assertions (no count-exact or screenshot-diff). | Section 8 (E2E audit — `template-gallery.spec.js` already structural; new content cannot break the spec by design; one helper to add: `expectAtLeastOneCard(page)`). |
</phase_requirements>

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| SVG well-formedness check | Build-time / CLI script (Node) | Admin upload path (browser) | Ship validation as a single shared module (pure JS, no DOM-only deps) so both `scripts/validate-svg-templates.cjs` (CI guard) and `BulkTemplateUpload.jsx` (admin UX) can call it. |
| `data-customize-*` & `currentColor` lint | Build-time / CLI script | Admin upload path | Same shared module — DOM parse + querySelector pass over each SVG. |
| DOMPurify sanitization preflight | Build-time / CLI script | Admin upload path | DOMPurify already in deps (`^3.3.3`). The check runs `DOMPurify.sanitize(svg, { USE_PROFILES: { svg: true } })` and asserts the output is byte-identical to input — anything stripped is a security concern. |
| Thumbnail rasterization | Node CLI (build-time + admin batch) | API / Backend (future per-upload hook) | Run as a CLI (`scripts/generate-template-thumbnails.cjs`) that walks `svg_templates`, finds rows with `thumbnail IS NULL OR thumbnail LIKE '%design.svg'`, rasterizes via `@resvg/resvg-js`, uploads to S3, UPDATEs the row. Future enhancement: hook into admin upload. |
| Taxonomy enforcement (CHECK constraint) | Database / Storage | Service layer (zod) + admin UI | DB CHECK is the floor — no row can land without valid `category`/`industry`. Service-level zod gives nicer error messages. Admin UI is just UX polish. |
| Taxonomy enforcement (vocabulary lint) | Service layer (validator module) | — | Tag *vocabulary* is open-ended (free-form `tags TEXT[]`); enforcement is a *warning*, not a block, gated in the service-level validator. |
| ≥100-template DB count assertion | Database (migration self-assert) + Test (integration) | — | Migration 175 self-asserts `COUNT(*) >= 100` after seed via a `DO $$` block (the same pattern migrations 167 / 174 use). Integration test re-asserts post-deploy. |
| Net-new template SVG storage | CDN / Static (`public/templates/svg/<slug>/design.svg`) + Database (`svg_templates` row) | S3 (rasterized thumbnail only) | Mirror the existing 12-template pattern. SVG source in repo. Thumbnail PNG in S3. |
| E2E gallery structural assertion patterns | Browser (Playwright) | — | Already implemented in Phase 171; one helper extraction recommended for reuse. |

---

## Standard Stack

### Core (already installed — no new deps required for validation/test work)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `dompurify` | `^3.3.3` (installed) | XSS sanitizer for SVG content; baseline of TCTN-02 "DOMPurify-clean" check | [VERIFIED: package.json line 41]. Already used by `templateApplyService.js` (Phase 172) — same import idiom (`USE_PROFILES: { svg: true, svgFilters: true }`). |
| `jsdom` | `^27.3.0` (devDep) | Server-side DOM for SVG parsing in CLI scripts | [VERIFIED: package.json line 73]. Already used by `scripts/svg-to-polotno.cjs`. Validator script reuses this. |
| `@playwright/test` | `^1.57.0` | Structural E2E assertions for TQAL-05 | [VERIFIED: package.json line 71]. Already powers all gallery E2E tests. |
| `vitest` | `^4.0.14` | Unit tests for the new validator module | [VERIFIED: package.json line 89]. Already powers all service-level tests. |
| `@supabase/supabase-js` | `^2.80.0` | Migration self-assertion + integration test count check | [VERIFIED: package.json line 39]. |

### New (recommended — only for TCTN-04 thumbnail rasterization)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@resvg/resvg-js` | `^2.6.2` | SVG → PNG rasterization in pure Node (Rust→WASM bindings). 480×270 thumbnail output. | [VERIFIED: npm view @resvg/resvg-js — latest=2.6.2]. ~2MB install. No headless browser. No native build. **Strong fit:** runs in CI without Docker, deterministic output, very fast (~50ms per 1920×1080 SVG). [CITED: github.com/yisibl/resvg-js README]. Recommended over `sharp` (Sharp does not natively rasterize complex SVGs — it relies on librsvg which is shaky on macOS/Windows CI). |
| `sharp` (optional — only for post-resvg PNG compression) | `^0.34.5` | Compress the resvg-emitted PNG before S3 upload | [VERIFIED: npm view sharp — latest=0.34.5]. Likely **not needed** — resvg-js emits reasonable PNGs for 480×270 thumbnails (typical size ~30–80KB). Add only if S3 storage cost or LCP becomes a concern. **Default recommendation: skip.** |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `@resvg/resvg-js` | `puppeteer` / headless Chromium | Faithful rendering of complex SVGs (filters, foreign objects, web fonts), but ~150MB install, slow startup, fragile in CI. Reserve for Polotno thumbnails only. |
| `@resvg/resvg-js` | `playwright` (already installed) | Could rasterize via existing Playwright. But it's a heavyweight tool for a simple bulk batch task; running 100+ Playwright contexts is slow and adds CI runtime. Use Playwright only if the SVGs need web font / filter fidelity that resvg cannot provide — empirically (per resvg-js README) resvg supports the SVG 1.1 + filter primitives features used by all 12 existing templates. |
| `@resvg/resvg-js` | `sharp` (uses librsvg under the hood) | librsvg has known parity gaps with Adobe-Illustrator-emitted SVGs (clipPath, gradient handling). resvg-js is purpose-built for this. |
| Custom DOM-based validator | `xmldom` + manual schema | jsdom is already in the build; do not add another XML parser. |
| DB CHECK constraint enforcement | Application-only validation (skip DB) | DB CHECK is the only enforcement that survives bypasses (raw SQL inserts, future bulk-upload tools, Supabase Studio direct edits). Required for TCTN-03 to be defensible. |
| Postgres FTS search | (Out of scope for this phase) | Phase 171 already chose `fuse.js` client-side; do not touch. |

**Installation (only if TCTN-04 implementation chooses resvg-js — confirmed via `/gsd-discuss-phase`):**
```bash
npm install --save-dev @resvg/resvg-js@^2.6.2
```

**Version verification:**
- `@resvg/resvg-js@2.6.2` — published 2025-09-23 (npm registry, verified 2026-04-29) [VERIFIED: npm view @resvg/resvg-js dist-tags]
- `dompurify@3.3.3` — installed [VERIFIED: package.json]
- `jsdom@27.3.0` — installed [VERIFIED: package.json]
- `sharp@0.34.5` — published 2025-11-06 [VERIFIED: npm view sharp time --json]

---

## Architecture Patterns

### System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  AUTHORING / SOURCING (manual + scripted)                                   │
│  ┌────────────────────┐   ┌─────────────────────┐   ┌────────────────────┐ │
│  │ Designer Figma →   │   │ SVGRepo / curated   │   │ scripts/svg-       │ │
│  │ export → SVGO →    │   │ open-license bulk   │   │ to-polotno.cjs     │ │
│  │ optimize → commit  │   │ download (CC-BY/MIT)│   │ (existing helper)  │ │
│  └────────┬───────────┘   └─────────┬───────────┘   └────────┬───────────┘ │
│           └──────────────────┬──────┴────────────────────────┘             │
│                              ▼                                              │
│                  public/templates/svg/<slug>/design.svg                    │
├────────────────────────────────────────────────────────────────────────────┤
│  VALIDATION GATE  (NEW — scripts/validate-svg-templates.cjs)                │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │ 1. Walk public/templates/svg/**/*.svg                                │  │
│  │ 2. For each file:                                                    │  │
│  │    • parse via JSDOM → throw if !querySelector('svg')                │  │
│  │    • DOMPurify.sanitize(content, { svg profile }) === content?       │  │
│  │      (byte-equality assert — anything stripped = security flag)      │  │
│  │    • grep for `currentColor` and `var(--` → fail (Pitfall 6)         │  │
│  │    • require either id="logo" / id="text-*" anchor                   │  │
│  │      OR data-customize-* attributes                                  │  │
│  │    • assert width + height + viewBox attrs present                   │  │
│  │    • assert size <= 200KB (perf trap from PITFALLS.md)               │  │
│  │ 3. Emit JSON report to .planning/175-validation-report.json          │  │
│  │ 4. Exit non-zero on any failure                                      │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│           │                                  │                              │
│           │ shared validator module          │                              │
│           ▼                                  ▼                              │
│  ┌────────────────────────┐   ┌─────────────────────────────────────────┐  │
│  │ CI: package.json script│   │ Admin Upload (BulkTemplateUpload.jsx)   │  │
│  │ "validate:templates"   │   │ Pre-INSERT validation hook              │  │
│  │ runs in test:ci         │   │ Inline error messaging per file        │  │
│  └────────────────────────┘   └─────────────────────────────────────────┘  │
├────────────────────────────────────────────────────────────────────────────┤
│  THUMBNAIL PIPELINE  (NEW — scripts/generate-template-thumbnails.cjs)       │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │ 1. SELECT id, slug, svg_url FROM svg_templates                       │  │
│  │    WHERE thumbnail IS NULL OR thumbnail LIKE '%design.svg'           │  │
│  │ 2. For each row:                                                     │  │
│  │    • read SVG from public/templates/svg/<slug>/design.svg            │  │
│  │    • @resvg/resvg-js rasterize to 480×270 PNG                        │  │
│  │    • uploadThumbnailToS3(blob, 'system') → fileUrl                   │  │
│  │    • UPDATE svg_templates SET thumbnail=fileUrl WHERE id=?           │  │
│  │ 3. Idempotent — re-runnable, skips already-rasterized rows           │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
├────────────────────────────────────────────────────────────────────────────┤
│  CONTENT SEED (Migration 175)                                               │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │ 1. ALTER svg_templates ADD CONSTRAINT chk_category_enum              │  │
│  │    CHECK (category IN ('Restaurant','Retail','Corporate',...))       │  │
│  │ 2. ALTER svg_templates ALTER COLUMN tags SET NOT NULL                │  │
│  │ 3. INSERT INTO svg_templates (... 100+ new rows ...)                 │  │
│  │    using uuid_generate_v5() for deterministic IDs (mirrors 167)      │  │
│  │ 4. DO $$ ASSERT (SELECT COUNT(*) FROM svg_templates                  │  │
│  │       WHERE created_at >= migration_timestamp) >= 100; END $$        │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
├────────────────────────────────────────────────────────────────────────────┤
│  E2E STRUCTURAL PASS (TQAL-05)                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │ tests/e2e/template-gallery.spec.js  — already structural (Phase 171) │  │
│  │ tests/e2e/template-packs.spec.js    — audit + add `>=1` patterns    │  │
│  │ tests/e2e/gallery-tour.spec.js      — audit + structural             │  │
│  │ tests/e2e/template-gallery-rls.spec.js — audit                        │  │
│  │ Add helper: expectAtLeastOneCard(page) — getByRole('article'/'link') │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────────────────┘
```

### Recommended Project Structure (additions only)

```
scripts/
├── validate-svg-templates.cjs        NEW — CI + admin upload validator
├── generate-template-thumbnails.cjs  NEW — bulk SVG → PNG rasterizer
└── seed-svg-templates.cjs            NEW (optional) — content batch helper

src/
└── services/
    └── svgValidator.js               NEW — pure-JS validator, shared by CLI + admin UI

src/components/Admin/
└── BulkTemplateUpload.jsx            MODIFIED — call svgValidator before createTemplate

supabase/migrations/
└── 175_seed_100_templates_and_taxonomy.sql   NEW — taxonomy CHECK + 100+ INSERTs + self-assert

public/templates/svg/
└── <100+ new slug folders>/
    └── design.svg                    NEW — content commits (probably 5–10 batched commits)

tests/unit/services/
└── svgValidator.test.js              NEW — unit tests for the 6 validation rules

tests/integration/
└── svgTemplatesCount.test.js         NEW — integration test asserting ≥100 active rows

tests/e2e/
└── template-gallery.spec.js          MODIFIED (audit only — already structural)

.planning/phases/175-new-template-content-quality-pass/
└── 175-CONTRIBUTION-GUIDE.md         NEW (optional) — author-side rules: SVGO, color encoding,
                                                       semantic IDs, dimension presets
```

### Pattern 1: Shared validator module (CLI + UI)

**What:** A single ES module (`src/services/svgValidator.js`) exports `validateSvg(svgString) → { ok: boolean, errors: string[], warnings: string[] }`. It uses **only browser-and-Node-safe APIs** (DOMParser via JSDOM in Node, native DOMParser in browser; DOMPurify works in both), so the CLI script and `BulkTemplateUpload.jsx` import the same module.

**When to use:** Any time validation logic must run both at build/CI time and at runtime in the admin UI. Eliminates the drift risk where the CI script and the upload UI use different rules.

**Example:**
```js
// src/services/svgValidator.js
// Source: extracted pattern from existing svgCustomizeService + svgAnalyzerService
import DOMPurify from 'dompurify';

const FORBIDDEN_COLOR_TOKENS = [/currentColor/i, /var\(--/i];
const MAX_BYTES = 200_000;
const REQUIRED_ATTRS = ['width', 'height']; // viewBox optional but preferred

export function validateSvg(svgString, opts = {}) {
  const errors = [];
  const warnings = [];

  if (!svgString || typeof svgString !== 'string') {
    return { ok: false, errors: ['Empty input'], warnings };
  }
  if (svgString.length > MAX_BYTES) {
    errors.push(`SVG exceeds ${MAX_BYTES} bytes (got ${svgString.length})`);
  }

  // 1. Well-formed XML
  const DOMParserCtor = opts.DOMParserCtor || (typeof DOMParser !== 'undefined' ? DOMParser : null);
  if (!DOMParserCtor) {
    errors.push('No DOMParser available');
    return { ok: false, errors, warnings };
  }
  const doc = new DOMParserCtor().parseFromString(svgString, 'image/svg+xml');
  const svg = doc.querySelector('svg');
  const parserError = doc.querySelector('parsererror');
  if (parserError) errors.push(`XML parse error: ${parserError.textContent.slice(0, 200)}`);
  if (!svg) errors.push('No <svg> root element found');

  // 2. Required attributes (or viewBox alternative)
  if (svg) {
    const hasW = svg.hasAttribute('width');
    const hasH = svg.hasAttribute('height');
    const hasVB = svg.hasAttribute('viewBox');
    if (!hasVB && (!hasW || !hasH)) {
      errors.push('SVG must declare viewBox OR both width and height');
    }
  }

  // 3. No currentColor / CSS variables (Pitfall 6 from PITFALLS.md)
  for (const re of FORBIDDEN_COLOR_TOKENS) {
    if (re.test(svgString)) {
      errors.push(`Forbidden color token matched ${re.source} — must use explicit hex/rgb`);
    }
  }

  // 4. DOMPurify byte-equality check
  const sanitized = DOMPurify.sanitize(svgString, { USE_PROFILES: { svg: true, svgFilters: true } });
  if (sanitized.length === 0) {
    errors.push('DOMPurify returned empty — likely stripped <svg> root or contains only forbidden content');
  } else if (Math.abs(sanitized.length - svgString.length) / svgString.length > 0.05) {
    // >5% delta means meaningful sanitization (script tag, on* attr, javascript: URL)
    warnings.push(`DOMPurify altered SVG (${svgString.length} → ${sanitized.length} bytes); review for stripped content`);
  }

  // 5. Customization anchors — at least one of: id="logo", id^="text-", or [data-customize-*]
  if (svg) {
    const hasLogo = !!doc.querySelector('image#logo, image.logo, image#logo-placeholder');
    const hasTextAnchor = !!doc.querySelector('text[id^="text-"], text[id]');
    const hasDataCustomize = !!doc.querySelector('[data-customize-color], [data-customize-text], [data-customize-logo]');
    if (!hasLogo && !hasTextAnchor && !hasDataCustomize) {
      warnings.push('No customization anchors found (id="logo", id="text-*", or data-customize-*) — QuickCustomize will offer no edit targets');
    }
  }

  return { ok: errors.length === 0, errors, warnings };
}
```

### Pattern 2: Migration with self-assertion DO blocks

**What:** Mirror the established Phase 167 / 174 pattern — every seed migration ends with a `DO $$ DECLARE ... BEGIN ASSERT (SELECT COUNT(*) ...) >= 100; END $$;` block. The migration FAILS to apply if the seed didn't insert what it claimed.

**When to use:** Phase 175's content seed migration. SC-1 ("≥100 net-new SVG templates queryable") is verified by the migration itself.

**Example:**
```sql
-- supabase/migrations/175_seed_100_templates_and_taxonomy.sql
-- (excerpt — bottom of file)

DO $$
DECLARE
  v_total INTEGER;
  v_new   INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_total FROM svg_templates WHERE is_active = TRUE;
  SELECT COUNT(*) INTO v_new
    FROM svg_templates
    WHERE created_at >= '2026-04-29'::timestamptz
      AND tenant_id IS NULL
      AND is_active = TRUE;

  ASSERT v_total >= 112,    -- 12 existing + 100 new minimum
    format('expected svg_templates total >= 112, got %s', v_total);
  ASSERT v_new >= 100,
    format('expected at least 100 net-new templates, got %s', v_new);
END $$;
```

### Pattern 3: Structural Playwright assertion helpers

**What:** Extract the `expect(...).toBeVisible()` / `getByRole('article').first()` patterns into a small helper bank co-located with `tests/e2e/helpers.js`. Specs import these helpers — exact-count assertions never appear in spec bodies.

**When to use:** Any new E2E pattern in this phase, plus the audit pass over existing gallery specs.

**Example:**
```js
// tests/e2e/helpers.js (additions)
export async function expectAtLeastOneTemplateCard(page) {
  // Cards render as <a> with role="link" and have a heading inside (template name)
  // Per Phase 171 TemplateCard: it's a forwardRef <div> with onClick — so use the
  // structural marker that's actually present: an <h3> inside a card grid item.
  const grid = page.getByRole('main'); // page wrapper
  const cards = grid.locator('h3').filter({ hasNotText: /^(Templates|Sort|Filters)$/ });
  await expect(cards.first()).toBeVisible({ timeout: 5000 });
}

export async function expectGalleryRendersWithoutError(page) {
  await expect(page.getByRole('heading', { name: /^Templates$/ })).toBeVisible();
  await expect(page.locator('[role="alert"]')).toHaveCount(0);
  await expect(page.getByText("Couldn't load templates")).not.toBeVisible();
}
```

### Anti-Patterns to Avoid

- **Hand-written XML parser:** Don't reinvent SVG parsing. Use `DOMParser` (browser) or `JSDOM` (Node). Both already in the stack.
- **Sanitizing inside the validator:** Validator should *detect*, not *fix*. If DOMPurify changes the bytes, it's a content problem the author must fix — don't silently rewrite.
- **CHECK constraint with too many enums:** Postgres CHECK with `IN (...)` is fine for ≤20 values. For larger / more dynamic taxonomies, use a referenced lookup table (`template_categories` already exists from migration 023). For Phase 175, the 12-ish category list is small enough that an inline CHECK is the simplest correct approach. **Use `template_categories` as the source of truth — write the CHECK to dynamically read from it via a function, OR snapshot the values into the CHECK at migration time and accept that adding categories requires a follow-up migration.** Recommendation: snapshot — explicit and reviewable.
- **Storing rasterized thumbnails inline as data URLs in `thumbnail` column:** That's the existing 12-template pattern, and it pollutes RPC responses with ~80KB strings. New rule: thumbnails MUST be S3 URLs. Eventually backfill the 12 existing.
- **Using `node-canvas` to rasterize SVG:** node-canvas requires native build (cairo / pango), painful in CI. `@resvg/resvg-js` is pure WASM, far more portable.
- **Generating thumbnails client-side at upload time only:** Loses the ability to backfill / re-rasterize from a clean source. The script-based pipeline is the canonical path; admin upload is the convenience layer.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| SVG XML parsing | Regex-based "find `<text>` tags" | `JSDOM` / `DOMParser` | SVG namespace handling, CDATA sections, entity references — get one wrong and the validator misses real bugs. JSDOM is already in devDeps. |
| SVG sanitization | Manual `<script>` strip + regex | `DOMPurify` (already installed) | DOMPurify handles namespaced events (`xlink:onload`), `javascript:` URLs in `xlink:href`, CSS injection in `<style>`, foreign objects, and the SVG 2 vs 1.1 spec drift. Hand-rolled regexes miss at least one of these. |
| SVG rasterization | Custom canvas-based rasterizer running in JSDOM | `@resvg/resvg-js` | resvg implements the full SVG 1.1 spec including filters, gradients, and clipPath — written in Rust by the makers of usvg, used by the Tauri ecosystem. A hand-rolled rasterizer will not match Adobe Illustrator output. |
| PNG compression (if needed) | Custom DEFLATE | `sharp` | Industry standard. Skip entirely unless thumbnail file size measurably hurts gallery LCP. |
| Postgres count assertion | "Run a SELECT in Node and `assert >= 100`" | DO $$ ASSERT $$ block in the migration itself | The migration is the authoritative point — if it applies, the count is satisfied. A separate Node check has its own flake surface. |
| Tag vocabulary lint | "Reject any tag not in this list" | Soft warning + DB CHECK on `category` only | The taxonomy spec has *enum*-style hard constraints (category, industry) and *open*-style guidelines (tags). Treating tags as enum prevents the catalog from growing organically. The right rule is: hard-constrain category/industry, soft-warn unknown tags so authors see prompts but aren't blocked. |
| ID-format / slug uniqueness | Hand-roll a uniqueness check | Postgres `UNIQUE` index on `slug` (already exists from migration 167) | Migration 175 must populate `slug` for every new row using `uuid_generate_v5()` deterministic IDs (same pattern as migration 167) so re-applying the migration is idempotent. |

**Key insight:** The validation gate's failure modes are subtle (silent color-swap no-op, hidden XSS in third-party SVGs). Hand-rolled validation looks done but isn't. Stick to DOMPurify + JSDOM + a small explicit rule list.

---

## Runtime State Inventory

> Phase 175 is a content-addition + new-tooling phase. It is *not* a rename / refactor / migration in the sense Step 2.5 of the agent contract intends. **However**, two state categories deserve explicit attention:

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| **Stored data** | (1) Existing 12 `svg_templates` rows seeded by migration 167 — `thumbnail` column points at `/templates/svg/<slug>/design.svg` (the SVG itself, not a rasterized PNG). After Phase 175's thumbnail pipeline runs, those 12 should *also* be rasterized for consistency. (2) Existing `template_library` rows seeded by migration 109. | Backfill thumbnails for the existing 12 seeded SVG rows as part of Phase 175 (NOT a separate phase). |
| **Live service config** | None. No external service configuration depends on template content (Datadog tags / Tailscale ACLs / Cloudflare Tunnel — none touch templates). | None. |
| **OS-registered state** | None. No Task Scheduler / systemd / pm2 dependency. | None. |
| **Secrets and env vars** | `VITE_API_URL` (existing, used by `uploadThumbnailToS3`) and Supabase keys (existing) — no new envs. The new thumbnail script uses the same S3 presign endpoint at `/api/media/presign`. | None. |
| **Build artifacts / installed packages** | `@resvg/resvg-js` will add a small (~2MB) WASM binary to `node_modules`. No global installs. The `package-lock.json` will gain new entries — commit it. | Commit `package-lock.json` deltas. |

**Other runtime state worth surfacing:**

- **`fuse.js` index** — Phase 171 builds a client-side `fuse` index over the gallery results. Adding 100+ templates increases the index size from ~12 records to ~112. Empirically (per fuse.js docs, [CITED: fusejs.io]) a few thousand records is fine — at 112 records this is a **non-issue**, but worth verifying with a quick perf test.
- **Postgres GIN index on `tags`** — already exists (`idx_svg_templates_tags`, migration 094). Adding 100+ rows with new tags is supported by GIN. No new index needed.
- **`gallery_templates` VIEW** — already unioned across `svg_templates` + `template_library`. The new content lands in `svg_templates`, so the VIEW automatically surfaces it. No VIEW change.
- **CI runtime impact** — adding 100+ Playwright assertions WOULD slow CI, but this phase does not add new specs (only audits existing ones). Validation script + thumbnail script run in `test:ci` via `npm run validate:templates` — both are pure-Node, sub-second per file, total < 1 minute even at 200 files.

---

## Common Pitfalls

### Pitfall 1: `currentColor` and CSS Variables Silently Defeat `swapColor()`

**What goes wrong:** New SVGs sourced from third-party libraries (Heroicons, Tabler Icons, undraw, SVGRepo) often use `fill="currentColor"` or `fill="var(--brand-primary)"` to defer color resolution. `svgCustomizeService.swapColor()` normalizes both sides through `normalizeColor()` and then string-compares — `currentColor` and `var(--*)` pass through `normalizeColor()` unchanged (per `svgCustomizeService.js:30-36`), so the comparison never matches and the swap silently no-ops. Users brand-customize, see nothing change, file no bug, abandon the template.

**Why it happens:** Authors copy/paste SVG snippets from icon libraries. Adobe Illustrator never emits `currentColor` (it always emits explicit hex), but Figma export and most modern open-source icon SVGs do.

**How to avoid:** Validation gate rejects ANY occurrence of `currentColor` or `var(--` in the SVG source (case-insensitive regex). At ingest time, authors must run a "color-explicitization" pass — `sed -E 's/currentColor/#000000/g'` is the trivial fix; better is a one-time SVGO plugin that resolves the inherited color stack.

**Warning signs:** `extractColors(doc)` returns an empty array for a visually colorful template; brand-color swap UI shows the swatch grid empty.

### Pitfall 2: Migration 175 Runs Locally but Fails Live (RLS Policy + tenant_id Drift)

**What goes wrong:** Phase 173 / 174 confirmed the `supabase db push` CLI has version-drift issues; the team has been using `mcp_apply_migration` (Path B) for the last 4 phases. Migration 175 will likely take the same path. Bulk INSERTs of 100+ rows into `svg_templates` triggered by `apply_migration` run as the postgres superuser in Supabase, bypassing RLS — but the WITH CHECK clause from migration 167 (`created_by = auth.uid()`) does NOT apply to superuser inserts, so `created_by IS NULL` is acceptable. The Phase 167 RLS policy reads `tenant_id IS NULL OR created_by = auth.uid()`, so all new rows must have `tenant_id = NULL` to be visible to all authenticated users.

**Why it happens:** Easy to forget — the seed pattern from migration 167 explicitly sets `tenant_id = NULL, created_by = NULL`. Any deviation (e.g., `created_by = 'some-uuid'`) makes the row invisible to everyone except that user.

**How to avoid:** Migration 175 INSERT statements MUST set `tenant_id = NULL` and `created_by = NULL` for every row. The migration's self-assert block must verify the count under the same RLS predicate the gallery uses (or via a `SET LOCAL ROLE authenticated` test block, but that's complex — simpler to just confirm `tenant_id IS NULL`).

**Warning signs:** Live smoke SELECT under an authenticated user role returns 12 rows when 112 expected. Look for any row where `tenant_id IS NOT NULL` or `is_active = FALSE`.

### Pitfall 3: Thumbnail Script Hits S3 Rate Limit on Bulk Upload

**What goes wrong:** Rasterizing 100+ SVGs and uploading them serially via the existing `/api/media/presign` endpoint is fine, but if it accidentally goes parallel (Promise.all over the entire set) you can hit S3's bucket put rate limit (3500 PUT/s per prefix — generous, but the presign API itself may rate-limit at 100 req/min).

**Why it happens:** Naive `Promise.all(templates.map(rasterize))` looks idiomatic but isn't appropriate for I/O-heavy bulk operations. Existing uploads in the codebase use serial loops with 300ms delays (see `BulkTemplateUpload.jsx:155`).

**How to avoid:** Mirror the `BulkTemplateUpload.jsx` pattern: serial loop with a 100–300ms delay between uploads. For 100 templates this is 30s — acceptable for a one-off script. For larger batches, add chunked parallelism (e.g., 5-at-a-time) instead of unbounded.

**Warning signs:** Random 429s in the script log; some thumbnails missing in S3 with no error in the script output.

### Pitfall 4: Adding New Templates Breaks Existing Gallery E2E Tests via Pagination Boundary

**What goes wrong:** `tests/e2e/template-gallery.spec.js` is structural (TQAL-05), but `templateGalleryService.fetchGalleryTemplates()` defaults `limit=50`. Going from 12 to 112 rows pushes the catalog past the default page size, and any E2E test that specifically searches for a specific template name (e.g., a "Healthcare Services" smoke test) may now find that template on page 2 — making the assertion fail because the test only checks page 1.

**Why it happens:** Pagination is invisible to structural assertions until result counts cross the page-size threshold.

**How to avoid:** During the audit pass: any spec that targets a specific template by name must use a `?search=<name>` URL param to pin it to page 1. Better still: gallery deep-link via `?orientation=portrait&search=Healthcare`. This is structural (still no exact-count) but defensive against pagination drift.

**Warning signs:** A spec that was green pre-seed turns red post-migration with "expected `Healthcare Services` to be visible".

### Pitfall 5: DOMPurify Strips `xlink:href` from Logo Images (Cross-Profile Drift)

**What goes wrong:** DOMPurify with `USE_PROFILES: { svg: true }` is permissive of most SVG, but its default config has historically stripped `xlink:href` on `<image>` elements (the "logo replacement" anchor used by `svgCustomizeService.replaceLogo()`). If the validator's DOMPurify config differs from `templateApplyService.js`'s config, you get false positives at validation time and false negatives at apply time.

**Why it happens:** DOMPurify config inheritance is opaque — different `USE_PROFILES` combinations include/exclude different attributes.

**How to avoid:** Use the EXACT same DOMPurify config in `svgValidator.js` as in `templateApplyService.js` line 53: `{ USE_PROFILES: { svg: true, svgFilters: true } }`. Add a unit test that round-trips a known-good SVG (with `<image xlink:href="logo.png">`) through the validator and asserts the byte-equality check passes.

**Warning signs:** Validator passes; admin upload fails; or worse, validator fails for a template that the live `templateApplyService` would have happily accepted.

### Pitfall 6: Curated Open-Source SVGs Carry Inconsistent License Metadata

**What goes wrong:** Pulling templates from SVGRepo, undraw, or similar bulk libraries — even within their MIT/CC-BY licensed sets — surfaces individual files that may have been imported under a different license. A subset may be CC-BY (requires attribution), some CC0 (no attribution), some MIT — leaving you with an unauditable license trail.

**Why it happens:** The libraries themselves are aggregators; they don't always re-flow upstream license metadata into individual SVG files.

**How to avoid:** Document license + attribution per template in `metadata.license` JSON column of `svg_templates`. Validation script asserts `metadata.license` is one of `{'CC0', 'MIT', 'CC-BY-4.0', 'first-party'}`. If CC-BY: assert `metadata.attribution` is non-empty. Maintain a top-level `.planning/phases/175-new-template-content-quality-pass/175-LICENSE-MANIFEST.md` listing every imported template + source URL + license + attribution for audit.

**Warning signs:** A new contributor adds 20 templates from "an SVG library I found" with no metadata. Migration applies. Year later, takedown request from upstream author.

---

## Code Examples

Verified patterns from official sources:

### 1. JSDOM-based SVG parsing (Node CLI pattern, used in scripts/svg-to-polotno.cjs)

```js
// scripts/validate-svg-templates.cjs
// Source: existing scripts/svg-to-polotno.cjs:18 — same JSDOM idiom
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');
const createDOMPurify = require('dompurify');

const dom = new JSDOM('');
const DOMPurify = createDOMPurify(dom.window);
const DOMParser = dom.window.DOMParser;

function validateFile(filepath) {
  const svgString = fs.readFileSync(filepath, 'utf8');
  // Identical contract to src/services/svgValidator.js (shared rule list)
  return validateSvg(svgString, { DOMParser, DOMPurify });
}
```

### 2. @resvg/resvg-js rasterization (Node CLI pattern)

```js
// scripts/generate-template-thumbnails.cjs
// Source: github.com/yisibl/resvg-js README, verified 2026-04-29
const { Resvg } = require('@resvg/resvg-js');
const fs = require('fs');

function rasterize(svgPath, { width = 480, height = 270 } = {}) {
  const svgString = fs.readFileSync(svgPath, 'utf8');
  const resvg = new Resvg(svgString, {
    fitTo: { mode: 'width', value: width },
    background: 'rgba(255, 255, 255, 1)', // white bg for transparent SVGs
    font: { loadSystemFonts: true }, // mac/linux system fonts
  });
  const pngData = resvg.render();
  return pngData.asPng(); // Buffer
}
```

### 3. DOMPurify byte-equality validation (in-browser pattern, mirrors templateApplyService.js)

```js
// src/services/svgValidator.js (excerpt)
// Source: templateApplyService.js:53 — same USE_PROFILES config (Pitfall 5)
import DOMPurify from 'dompurify';

const cleaned = DOMPurify.sanitize(svgString, {
  USE_PROFILES: { svg: true, svgFilters: true }
});
const drift = Math.abs(cleaned.length - svgString.length) / svgString.length;
if (cleaned.length === 0 || drift > 0.05) {
  return { ok: false, error: 'Sanitizer altered SVG meaningfully' };
}
```

### 4. Postgres CHECK constraint snapshot (mirrors migration 167 D-18 pattern)

```sql
-- supabase/migrations/175_seed_100_templates_and_taxonomy.sql (excerpt)
-- Snapshot of category enum from template_categories at migration time.
-- Adding a new category later requires a follow-up migration that DROPs and
-- recreates this constraint — explicit by design (taxonomy changes are reviewed).
ALTER TABLE svg_templates
  DROP CONSTRAINT IF EXISTS chk_svg_templates_category_enum;

ALTER TABLE svg_templates
  ADD CONSTRAINT chk_svg_templates_category_enum
  CHECK (category IN (
    'Restaurant', 'Retail', 'Corporate', 'Healthcare', 'Hospitality',
    'Real Estate', 'Education', 'Events', 'Fitness', 'Entertainment',
    'Beauty', 'Automotive', 'Technology', 'Finance', 'general'
  ));

-- tags must be a non-NULL array (empty array OK — soft-warn elsewhere)
ALTER TABLE svg_templates
  ALTER COLUMN tags SET NOT NULL,
  ALTER COLUMN tags SET DEFAULT '{}'::TEXT[];
```

### 5. Deterministic UUID seed pattern (mirrors migration 167)

```sql
-- Each new template gets a deterministic UUID from its slug.
-- Re-running the migration is idempotent — same slug → same UUID.
INSERT INTO svg_templates (
  id, slug, name, description, category, orientation,
  thumbnail, svg_url, width, height, tags, is_featured, is_active,
  tenant_id, created_by, metadata
) VALUES (
  uuid_generate_v5('6ba7b810-9dad-11d1-80b4-00c04fd430c8'::uuid, 'pizzeria-menu-1'),
  'pizzeria-menu-1',
  'Pizzeria Menu Board',
  'Italian pizzeria menu with daily specials and prices',
  'Restaurant', 'landscape',
  NULL,  -- thumbnail populated by scripts/generate-template-thumbnails.cjs
  '/templates/svg/pizzeria-menu/design.svg',
  1920, 1080,
  ARRAY['pizza','italian','menu','restaurant','food']::TEXT[],
  FALSE, TRUE, NULL, NULL,
  jsonb_build_object('license', 'CC0', 'attribution', null)
) ON CONFLICT (slug) WHERE slug IS NOT NULL DO NOTHING;
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Hardcoded `LOCAL_SVG_TEMPLATES` array in `svgTemplateService.js` | Seeded into `svg_templates` table via migration 167 | 2026-04-16 (Phase 170) | All templates now DB-managed; Phase 175 simply adds rows. |
| Multi-source merge in `fetchSvgTemplates` (LOCAL + svg_templates + template_library) | Single VIEW `gallery_templates_with_favorites` queried by `templateGalleryService` | 2026-04-16 (Phase 170) | New templates land in `svg_templates`, immediately visible via VIEW. |
| `sessionStorage` template handoff | URL-param-only (`?templateId=...&editorReturn=1`) | Phase 172 / 172.1 | New templates work with the URL flow as-is — no sessionStorage refs. |
| Inline SVG data URLs as thumbnails (existing 12) | Rasterized PNG at S3 (this phase forward) | Phase 175 | Card LCP improves; gallery payload shrinks (~80KB → ~3KB per row in JSON response). |
| `svg-templates` aliases pointing to legacy gallery | `template-marketplace` / `svg-templates` / `templates` all → `TemplateGalleryPage` | Phase 171 | All entry points show new templates without app code change. |

**Deprecated/outdated:**

- `LOCAL_SVG_TEMPLATES` constant — removed Phase 170 (per `svgTemplateService.js:7-13`). Do not revive.
- `SvgTemplateGalleryPage` — deleted Phase 171. Don't reference.
- `node-canvas` for SVG rendering — deprecated approach industry-wide (per `@resvg/resvg-js` README, native build pain on macOS/Windows runners).

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | "≥100 net-new templates" means **100 new rows in `svg_templates`** specifically — not 100 across `svg_templates` + `template_library` combined. | TCTN-01 interpretation | If user wanted Polotno templates included, content sourcing is harder (Polotno is JSON, not SVG). RECOMMEND CONFIRM in `/gsd-discuss-phase`. |
| A2 | "`data-customize-*` attributes" in TCTN-02 is a **future authoring convention** (no existing template uses these attrs — confirmed via `grep -rn data-customize public/` returning zero hits). The new SVGs being authored will adopt this convention; the validator enforces it. | Section 1 | If user expected existing templates to already use `data-customize-*`, that's not the case — research confirmed via grep. The convention has to be NEWLY adopted. RECOMMEND CONFIRM. |
| A3 | The 5%-byte-equality DOMPurify drift threshold for "DOMPurify-clean" is reasonable (allows whitespace normalization but flags real strips). | Section 1, Pattern 1 | Could be stricter (1%) or looser (10%); 5% is a defensible empirical pick. Tune if false-positive rate is high during initial validation pass. |
| A4 | `@resvg/resvg-js` is the right rasterizer choice over Playwright. | TCTN-04 stack | If Playwright is mandated for org-wide consistency, switch to that — but cost is +CI runtime + Docker complexity. RECOMMEND CONFIRM. |
| A5 | Curated open-source bulk import (SVGRepo, undraw, hand-authored fillers) is acceptable for the 100+ count, with per-template license metadata. | Section 4 | If org legal requires only first-party authored content, count is harder to hit in a single phase. Pitfall 6 outlines the mitigation. RECOMMEND CONFIRM with legal/policy. |
| A6 | The category CHECK constraint should snapshot 15 enum values at migration time (not reference `template_categories` dynamically). | Section 2, Code Example 4 | If org wants the CHECK to live-update from `template_categories`, requires a custom function — adds complexity. The snapshot approach is simpler and explicitly reviewable. |
| A7 | Phase 175 `migration 175` is the next safe migration number (no conflicts with the 174 → 175 sequence on the live DB). | Section 6 | If there is in-flight migration work outside this phase chain, double-check via `supabase migration list --linked`. STATE.md last-applied is 174 (Phase 174 work), so 175 is presumed safe. |
| A8 | Existing `template_packs` and `template_favorites` (Phase 173) tables do NOT need updates for Phase 175. New templates can be added to packs in subsequent admin work; favorites are per-user and accumulate organically. | Section 7 | If success criteria implicitly required new templates to land in default starter packs, that's an extra step. Treating as future admin work. |

**If this table is short:** Most claims in this research are verified against the codebase. The assumptions above are explicitly the policy / preference questions that need user confirmation before plans are written.

---

## Open Questions

1. **Sourcing strategy for the 100+ templates**
   - What we know: SVGRepo (CC0/CC-BY MIT-friendly), undraw (MIT), Heroicons (MIT, but icon-scale), Tabler Icons (MIT, icon-scale). Hand-authoring 100 SVGs in a phase is unrealistic without a designer; LLM-generated SVGs are out-of-scope per REQUIREMENTS.md.
   - What's unclear: How much budget is available for designer time? Is the phase OK with primarily curated open-source content (with attribution where required)?
   - Recommendation: Plan for 70% curated open-source (with `metadata.license` + `metadata.attribution` populated) + 30% hand-authored / lightly-modified-from-existing (the existing 12 templates can be variant-extended — e.g., "Restaurant Menu — Steakhouse Variant", "Restaurant Menu — Cafe Variant"). Confirm this split in `/gsd-discuss-phase`.

2. **Should `data-customize-*` attribute convention be NEW (this phase introduces it) or grandfathered (validator only requires `id="logo"` / `id="text-*"`)?**
   - What we know: No template currently uses `data-customize-*`; success criteria mentions it explicitly.
   - What's unclear: Whether the SC author intended (a) "from now on, new templates must use these" (introducing a convention) or (b) "templates already use these and validator should check them" (grandfathering check).
   - Recommendation: Treat as **introducing the convention**. Allow either the legacy `id="logo"` / `id="text-*"` pattern OR the new `data-customize-*` attributes as valid customization anchors (per Pattern 1 example). Phase 176+ can deprecate the legacy pattern. **Document the new convention in `175-CONTRIBUTION-GUIDE.md`.**

3. **Is the thumbnail rendering ground truth 480×270, 800×450, or some other size?**
   - What we know: Existing `TemplateCard.jsx` uses `aspect-video` (16:9), `aspect-[9/16]` for portrait — so the card is responsive.
   - What's unclear: Source resolution. Smaller = faster gallery; larger = better preview when card is large on big screens.
   - Recommendation: 480×270 for landscape, 270×480 for portrait. ~30–80KB PNG per thumbnail. Total 100 thumbnails ≈ 5–8MB S3 storage — trivial.

4. **Does the validation script run on `pre-commit` (husky), `pre-push`, or only in CI?**
   - What we know: No husky / pre-commit setup found in the repo (verified via no `.husky` directory and no `prepare` script in package.json).
   - What's unclear: Team's appetite for adding pre-commit tooling.
   - Recommendation: CI-only for now via `npm run validate:templates` in the existing `test:ci` chain. Pre-commit is a v20.1+ enhancement.

5. **Should the existing 12 templates (Phase 167 seed) also pass the new validation gate?**
   - What we know: The 12 templates are Adobe-Illustrator-emitted, use `class="stN"` patterns and explicit hex colors. Spot-check of `restaurant-menu/menu-design.svg` (line 1) shows they're well-formed and have explicit hex colors — Pitfall 6 (CSS variables) likely doesn't apply.
   - What's unclear: Whether they have `id="logo"` / `id="text-*"` semantic anchors, or whether they fail the "customization anchor" check.
   - Recommendation: Run the validator over the existing 12 as part of plan 175-01 (Wave 0). Document results. If failures, decide per-template: backfix vs grandfather. Likely most pass with warnings, not errors.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node ≥ 18 | Validation script + thumbnail script | ✓ | (project standard) | — |
| `jsdom` | Validation script (Node-side DOM parse) | ✓ | 27.3.0 | — |
| `dompurify` | Validation script + admin UI sanitizer | ✓ | 3.3.3 | — |
| `@resvg/resvg-js` | Thumbnail generation script | ✗ | — | Use Playwright (already installed) for rasterization — slower, but available without new install |
| Supabase CLI / MCP `apply_migration` tool | Migration 175 deploy | ✓ (MCP path used since Phase 172.1) | — | Supabase Studio Direct SQL Runner (last-resort manual path) |
| S3 presign endpoint `/api/media/presign` | Thumbnail upload | ✓ | (existing) | — |
| Postgres `uuid_generate_v5` (uuid-ossp) | Deterministic seed UUIDs | ✓ | (migrated since migration 001) | — |

**Missing dependencies with no fallback:** None (with `@resvg/resvg-js` planned-install).

**Missing dependencies with fallback:** `@resvg/resvg-js` not yet installed — fallback is Playwright. Plan should include the install step.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | `vitest@^4.0.14` for unit/integration; `@playwright/test@^1.57.0` for E2E |
| Config file | `vitest.config.js` (root) for vitest; `playwright.config.js` (root) for Playwright |
| Quick run command | `npm run test:unit -- tests/unit/services/svgValidator.test.js` |
| Full suite command | `npm run test && npm run test:e2e` (or `npm run test:ci`) |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|--------------|
| TCTN-01 | At least 100 active net-new SVG templates queryable | integration | `npm run test:integration -- tests/integration/svgTemplatesCount.test.js` | ❌ Wave 0 |
| TCTN-01 | Migration 175 self-asserts `COUNT(*) >= 100` of new rows | migration DO block | (runs at apply time) | ❌ Wave 0 / Wave 1 |
| TCTN-02 | Validator rejects malformed XML | unit | `npm run test:unit -- tests/unit/services/svgValidator.test.js -t 'malformed XML'` | ❌ Wave 0 |
| TCTN-02 | Validator rejects `currentColor` and `var(--`  | unit | `npm run test:unit -- tests/unit/services/svgValidator.test.js -t 'currentColor'` | ❌ Wave 0 |
| TCTN-02 | Validator rejects DOMPurify-altered content >5% | unit | `npm run test:unit -- tests/unit/services/svgValidator.test.js -t 'sanitization drift'` | ❌ Wave 0 |
| TCTN-02 | Validator runs across `public/templates/svg/**` | CLI smoke | `npm run validate:templates` (exit 0 = pass) | ❌ Wave 0 (script + script entry in package.json) |
| TCTN-02 | All 100+ new content passes validator | CLI integration | `npm run validate:templates` after content commit | (gated by content commits) |
| TCTN-03 | Invalid `category` rejected at INSERT | integration | `npm run test:integration -- tests/integration/svgTaxonomy.test.js -t 'category check'` | ❌ Wave 0 |
| TCTN-03 | Invalid `category` rejected at admin upload | E2E (skip-guarded) | `npm run test:e2e -- admin-templates.spec.js` (if `TEST_ADMIN_EMAIL` set) | (existing admin spec — extend) |
| TCTN-03 | Service-level zod validator surfaces clear error | unit | `npm run test:unit -- tests/unit/services/svgValidator.test.js -t 'taxonomy'` | ❌ Wave 0 |
| TCTN-04 | Thumbnail script produces a valid PNG | unit (script-level) | `node scripts/generate-template-thumbnails.cjs --dry-run --slug restaurant-menu-1` | ❌ Wave 1 |
| TCTN-04 | All new svg_templates rows have a non-null `thumbnail` URL | integration | `tests/integration/svgTemplatesCount.test.js` (extend) | ❌ Wave 0 |
| TCTN-04 | Gallery card displays real image (not LayoutTemplate icon) | E2E | `npm run test:e2e -- template-gallery.spec.js -t 'thumbnail'` | ❌ — extend existing spec |
| TQAL-05 | Gallery E2E uses `getByRole` / `getByText` (no `toHaveCount(N)` for N != 0) | static lint | `grep -rE "toHaveCount\(\s*[1-9]" tests/e2e/template-*.spec.js` (must match nothing) | (verify in Wave 0 audit) |
| TQAL-05 | Gallery stays green at 12 + at 112+ templates | manual run | `TEMPLATE_COUNT=12 npm run test:e2e` then `TEMPLATE_COUNT=112 npm run test:e2e` | ✅ existing spec is structural |

### Sampling Rate

- **Per task commit:** `npm run test:unit -- tests/unit/services/svgValidator.test.js` — fast, deterministic, no DB.
- **Per wave merge:** `npm run validate:templates && npm run test` — full unit + content validation.
- **Phase gate:** Full suite + `npm run test:e2e -- template-gallery.spec.js template-packs.spec.js gallery-tour.spec.js` green before `/gsd-verify-work`.

### Wave 0 Gaps

- [ ] `src/services/svgValidator.js` — shared validator module (CLI + admin UI)
- [ ] `tests/unit/services/svgValidator.test.js` — unit coverage for the 6 validation rules + edge cases (empty input, oversize, malformed XML, currentColor, var(--), no anchors)
- [ ] `tests/integration/svgTemplatesCount.test.js` — DB integration test asserting ≥112 active rows + all new rows have `thumbnail` populated
- [ ] `tests/integration/svgTaxonomy.test.js` — DB integration test asserting CHECK constraint rejects bogus categories
- [ ] `scripts/validate-svg-templates.cjs` — CLI wrapper (Node entry) for the validator
- [ ] `scripts/generate-template-thumbnails.cjs` — Node CLI for SVG → PNG pipeline (dry-run + real modes)
- [ ] `package.json` script entry: `"validate:templates": "node scripts/validate-svg-templates.cjs"`
- [ ] `package.json` script entry: `"thumbnails:generate": "node scripts/generate-template-thumbnails.cjs"`
- [ ] Optional: `.planning/phases/175-new-template-content-quality-pass/175-CONTRIBUTION-GUIDE.md` — author-side convention doc
- [ ] Optional: `.planning/phases/175-new-template-content-quality-pass/175-LICENSE-MANIFEST.md` — per-template license trail

---

## Security Domain

> Required because `security_enforcement` is enabled (default per agent contract).

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | Out of scope — Phase 175 doesn't change auth |
| V3 Session Management | no | Out of scope |
| V4 Access Control | yes | RLS policy on `svg_templates` from Phase 167 unchanged. New rows must have `tenant_id IS NULL` to be visible to all authenticated users (per migration 167 RLS predicate). |
| V5 Input Validation | yes | `svgValidator.js` enforces well-formed XML, taxonomy enum, size cap. DB CHECK enforces category. Admin UI passes user-uploaded SVGs through validator before INSERT. |
| V6 Cryptography | no | No crypto changes in this phase. |

### Known Threat Patterns for {React 19 + Supabase + S3 SVG content pipeline}

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| XSS via `<script>` in user-uploaded SVG | Tampering / Information Disclosure | DOMPurify sanitization at validation gate AND at apply-time (Phase 172 `templateApplyService` already does the latter). Validator enforces byte-equality so any meaningful sanitizer drift is flagged. |
| XSS via `<a href="javascript:">` in SVG | Tampering | DOMPurify svg profile strips javascript: URLs. Validator's byte-equality check catches this — the file fails to land. |
| XSS via `xlink:onload` event handler | Tampering | DOMPurify strips event handlers. Same byte-equality detection. |
| XSS via foreignObject with HTML script | Tampering | DOMPurify svg profile rejects `<foreignObject>` content — same detection mechanism. |
| Stored XSS via `metadata.svgContent` field | Tampering / Information Disclosure | All SVG content rendered in `<img src=data:...>` (Phase 171) or via DOMPurify-sanitized `dangerouslySetInnerHTML` (Phase 172 modal preview). Migration 175 must NOT bypass this — `svg_url` only, no `svg_content` inline write. |
| RLS bypass: cross-tenant template visibility | Information Disclosure | Phase 170 RLS audit (TDAT-03) closed this. Phase 175 inserts must keep `tenant_id = NULL`. Migration self-assert verifies. |
| Supply-chain attack via curated open-source SVG | Tampering | Per-template `metadata.license` + `metadata.attribution` audit trail (Pitfall 6). Validator runs on every commit so a tampered SVG can't land silently. |
| `currentColor` / `var(--*)` defeating brand swap (UX-impacting silent failure) | Information Disclosure (the user *thinks* they branded it) | Validator rejects these tokens. Pitfall 6 in PITFALLS.md. |

---

## Sources

### Primary (HIGH confidence — direct codebase / migration / test inspection)

- `src/services/svgCustomizeService.js` (full file, 284 lines) — `normalizeColor()` line 24 confirms `currentColor` and `var(--*)` pass through unchanged; `swapColor()` line 215 confirms string comparison is the swap mechanism (Pitfall 6 root cause).
- `src/services/templateApplyService.js` (lines 1–80) — DOMPurify config: `{ USE_PROFILES: { svg: true, svgFilters: true } }` (Pitfall 5 reference contract).
- `src/services/templateGalleryService.js` — VIEW source `gallery_templates_with_favorites` (Phase 170+173 base).
- `src/services/svgTemplateService.js` (full file head) — `uploadThumbnailToS3()` line 22, S3 presign API `/api/media/presign`, existing thumbnail flow.
- `src/services/svgAnalyzerService.js` (lines 1–120) — existing SVG feature extraction (auto-tagging precedent).
- `src/components/Admin/BulkTemplateUpload.jsx` — admin upload codepath, `parseSvgDimensions()` pattern, `createTemplate()` call site.
- `src/components/templates/` — directory listing confirms `TemplateCard.jsx`, `TemplatePreviewModal.jsx`, `QuickCustomizePanel.jsx`, `StarterPacksStrip.jsx` exist.
- `src/design-system/components/TemplateCard.jsx` (lines 1–130) — `LayoutTemplate` placeholder render at line 81 (TCTN-04 anchor).
- `supabase/migrations/094_svg_templates.sql` — table schema, existing CHECK on orientation, GIN index on tags.
- `supabase/migrations/167_gallery_templates_view_and_rls.sql` — RLS policy `tenant_id IS NULL OR created_by = auth.uid()`, deterministic UUID seed pattern, DO $$ ASSERT precedent.
- `supabase/migrations/174_phase_174_onboarding_columns_and_template_apply_rpc.sql` — most-recent migration, confirms 175 is next safe version.
- `tests/e2e/template-gallery.spec.js` (full file) — Phase 171 already-structural pattern (TQAL-05 baseline).
- `tests/e2e/template-packs.spec.js`, `tests/e2e/template-gallery-rls.spec.js`, `tests/e2e/gallery-tour.spec.js` — confirmed exist (E2E audit scope).
- `package.json` — verified versions: `dompurify@^3.3.3`, `jsdom@^27.3.0`, `@playwright/test@^1.57.0`, `vitest@^4.0.14`, `fuse.js@^7.3.0`, `framer-motion@^12.23.24`. No `@resvg/resvg-js` or `sharp` currently installed.
- `scripts/svg-to-polotno.cjs` — existing JSDOM-based Node CLI pattern (mirrored by validator + thumbnail scripts).
- `scripts/batch-auto-tag-templates.cjs` — existing CLI tool pattern with `--dry-run`, `--verbose` flags.
- `public/templates/svg/restaurant-menu/menu-design.svg` line 1 — confirms existing templates are Adobe-Illustrator-emitted, no `currentColor`, no `data-customize-*`.
- `.planning/research/PITFALLS.md` — Pitfall 6 (`svgCustomizeService` color normalization mismatches on new templates) is the canonical root-cause document for the validator's `currentColor` rule.
- `.planning/research/STACK.md` — already-locked stack constraints (no new search lib, no new motion lib).
- `.planning/research/ARCHITECTURE.md` — Phase 170 VIEW + service contract.
- `.planning/research/FEATURES.md` — content authoring pipeline notes (lines 184–212).
- `.planning/STATE.md` — last-applied migration 174, MCP `apply_migration` Path B precedent.
- `.planning/REQUIREMENTS.md` — TCTN-01..04, TQAL-05 traceability table.
- `.planning/ROADMAP.md` — Phase 175 goal + 5 success criteria.

### Secondary (MEDIUM confidence — verified npm registry)

- `npm view @resvg/resvg-js dist-tags` → `latest=2.6.2` (verified 2026-04-29 from this session)
- `npm view sharp time --json` → `latest=0.34.5`, published 2025-11-06 (verified 2026-04-29)
- `npm view svgo dist-tags` → `latest=4.0.1` (verified 2026-04-29; not recommending svgo as a dep — content authors run it locally)

### Tertiary (training-knowledge)

- `@resvg/resvg-js` README claims (Rust-Wasm, no native deps, supports SVG 1.1 + filter primitives) — sourced from training data; validate behavior against the existing 12 templates as part of Wave 0 (the 12 are Adobe-Illustrator-emitted with clipPath / gradient / linearGradient — exact resvg-js coverage is the empirical question).
- DOMPurify svg profile attribute handling (xlink:href on `<image>` allowed) — sourced from training data; verified by Phase 172's working `templateApplyService` flow (Pitfall 5 mitigation: copy that exact config).

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — every existing dep verified in package.json; new `@resvg/resvg-js` verified via npm view in this session.
- Architecture: HIGH — directly read existing services, migrations, components.
- Validator design: HIGH — every rule maps to a documented pitfall (PITFALLS.md Pitfall 6) or a verified DOMPurify config (templateApplyService.js:53).
- Thumbnail pipeline: MEDIUM-HIGH — `@resvg/resvg-js` is the right *category* of tool (pure-Wasm SVG rasterizer); empirical fidelity vs Adobe-Illustrator-emitted SVGs is the spot-test recommendation in Open Question #5.
- Content sourcing: MEDIUM — open-source bulk import is feasible but per-license audit overhead is non-trivial; Open Question #1 flags for confirmation.
- E2E patterns: HIGH — Phase 171 already structural, audit pass is incremental.
- Security: HIGH — DOMPurify config locked to existing successful pattern from Phase 172.

**Research date:** 2026-04-29
**Valid until:** 2026-05-29 (30 days — stack picks are stable; content sourcing details may shift if licensing constraints change)
