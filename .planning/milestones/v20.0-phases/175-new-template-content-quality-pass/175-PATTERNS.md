# Phase 175: New Template Content + Quality Pass — Pattern Map

**Mapped:** 2026-04-29
**Files analyzed:** 14 (9 NEW + 4 MODIFIED + 1 OPTIONAL)
**Analogs found:** 13 / 14 (one file has no exact analog — `scripts/generate-template-thumbnails.cjs`, partial match via `svgTemplateService.uploadThumbnailToS3` + `scripts/svg-to-polotno.cjs`)

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `src/services/svgValidator.js` | service (pure validator) | transform | `src/services/templateApplyService.js` (DOMPurify config) + `src/services/svgCustomizeService.js` (parse + extract pure functions) | exact (DOMPurify config) + role-match (pure JS service) |
| `scripts/validate-svg-templates.cjs` | script (CLI validator) | batch / file-I/O | `scripts/svg-to-polotno.cjs` + `scripts/batch-auto-tag-templates.cjs` | exact (Node CLI walking SVGs with JSDOM) |
| `scripts/generate-template-thumbnails.cjs` | script (rasterizer + uploader) | batch / file-I/O + HTTP PUT | `scripts/batch-auto-tag-templates.cjs` (DB walk + serial loop + delay) + `src/services/svgTemplateService.js:27` (`uploadThumbnailToS3`) | partial (assemble pieces — no single existing analog rasterizes SVG) |
| `supabase/migrations/175_seed_100_templates_and_taxonomy.sql` | migration | CRUD (DDL + DML) + ASSERT | `supabase/migrations/167_gallery_templates_view_and_rls.sql` | exact (deterministic UUID seed + DO $$ ASSERT $$ + ON CONFLICT (slug) DO NOTHING) |
| `tests/unit/services/svgValidator.test.js` | test (unit) | transform-input/output | `tests/unit/services/svgCustomize.test.js` + `tests/unit/services/templateApplyService.test.js` | exact (vitest, fixture SVG strings, describe-per-function) |
| `tests/integration/svgTemplatesCount.test.js` | test (integration) | CRUD (read) | `tests/integration/favorites/view-per-user.test.js` | exact (live Supabase + dotenv override + describe.skipIf) |
| `tests/integration/svgTaxonomy.test.js` | test (integration) | CRUD (insert + reject) | `tests/integration/favorites/view-per-user.test.js` | role-match (live Supabase pattern) |
| `tests/e2e/template-gallery.spec.js` | test (E2E) | request-response | (modify in place — already structural per Phase 171) | self-reference (audit only) |
| `tests/e2e/helpers.js` | test helper | utility | `tests/e2e/helpers.js` (existing — extend with `expectAtLeastOneTemplateCard`) | exact |
| `src/components/Admin/BulkTemplateUpload.jsx` | component (admin) | file-I/O + CRUD | (self-modify — wire `validateSvg` before `createTemplate`) | self-reference |
| `package.json` | config | — | (additive — new `scripts.*` entries: `validate:templates`, `thumbnails:generate`) | self-reference |
| `public/templates/svg/<100+ slugs>/design.svg` | content (static asset) | file-I/O | `public/templates/svg/restaurant-menu/menu-design.svg` (existing 12) | exact (Adobe-Illustrator-emitted SVG, explicit hex colors, viewBox + width + height) |
| `.planning/phases/175-new-template-content-quality-pass/175-CONTRIBUTION-GUIDE.md` | doc (optional) | — | n/a | none — new artifact |
| `.planning/phases/175-new-template-content-quality-pass/175-LICENSE-MANIFEST.md` | doc (optional) | — | n/a | none — new artifact |

---

## Pattern Assignments

### `src/services/svgValidator.js` (service, transform)

**Analogs:** `src/services/templateApplyService.js` (DOMPurify config — load-bearing), `src/services/svgCustomizeService.js` (pure-JS no-React contract).

**Locked DOMPurify config (must mirror byte-for-byte) — `src/services/templateApplyService.js:51-56`:**
```javascript
// T-172-01: sanitize user-crafted SVG before it leaves the browser.
// Default DOMPurify behavior with the svg profile strips <script>, on*
// handlers, and javascript: URLs while preserving data-customize-* attrs.
const sanitized = customizedSvg
  ? DOMPurify.sanitize(customizedSvg, { USE_PROFILES: { svg: true, svgFilters: true } })
  : null;
```
**Rule:** Phase 175 Pitfall 5 — `svgValidator.js` MUST use the EXACT same `{ USE_PROFILES: { svg: true, svgFilters: true } }` config. Any drift means validator passes templates that templateApplyService strips at runtime (or vice versa).

**Imports/header pattern — `src/services/templateApplyService.js:1-25`:**
```javascript
/**
 * templateApplyService — Phase 172 Preview + Apply Flow
 *
 * Responsibilities: ...
 * Conventions:
 *  - Named exports only (service-per-responsibility)
 *  - `{ data, error }` destructure + `if (error) throw error` (standard supabase RPC idiom)
 *  - No try/catch in the service layer — errors propagate so the caller ...
 */
import { supabase } from '../supabase';
import DOMPurify from 'dompurify';
```
**Rule for svgValidator:** Named exports only (`export function validateSvg`), explicit JSDoc header listing responsibilities, conventions, and the byte-equality contract. No try/catch — errors return as `{ ok: false, errors: [...] }` (research Pattern 1).

**Pure-function service contract — `src/services/svgCustomizeService.js`:**
- 9 pure functions (`parseSvgForCustomize`, `extractColors`, `extractTextNodes`, `findLogoElement`, `swapColor`, `updateText`, `replaceLogo`, `serializeSvg`, `normalizeColor`)
- No React state, no network calls, no Supabase calls
- DOMParser-based parsing (works in browser; Node side passes `{ DOMParserCtor }` opt)

**Rule for svgValidator:** Same contract — single primary export `validateSvg(svgString, opts)` returning `{ ok, errors[], warnings[] }`. Optional `opts.DOMParserCtor` and `opts.DOMPurify` injection so the same module runs in browser (`BulkTemplateUpload.jsx`) and Node (`scripts/validate-svg-templates.cjs`).

**Forbidden tokens (Pitfall 6 root cause) — `src/services/svgCustomizeService.js:24-36`:** `normalizeColor()` passes `currentColor` and `var(--*)` through unchanged → `swapColor()` string-compares → silent no-op.

**Rule for svgValidator:** Reject any SVG containing `currentColor` (case-insensitive) or `var(--`. The validator detects what `swapColor` cannot fix. Research Pattern 1 lines 287-292.

---

### `scripts/validate-svg-templates.cjs` (script, batch / file-I/O)

**Analog:** `scripts/svg-to-polotno.cjs` (JSDOM Node CLI walking SVGs) + `scripts/batch-auto-tag-templates.cjs` (CLI args, `--dry-run`, `--verbose`, exit-non-zero on failure, batch loop with per-file status).

**JSDOM bootstrap pattern — `scripts/svg-to-polotno.cjs:17-19`:**
```javascript
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');
```
**Rule:** Use the same JSDOM idiom. Construct DOMPurify and DOMParser from the JSDOM window:
```javascript
const dom = new JSDOM('');
const DOMPurify = require('dompurify')(dom.window);
const DOMParser = dom.window.DOMParser;
```
(per RESEARCH.md lines 487-506).

**CLI argument parsing pattern — `scripts/batch-auto-tag-templates.cjs:25-80`:**
```javascript
const args = process.argv.slice(2);
const options = { dir: null, database: false, dryRun: false, rulesOnly: false, verbose: false };
for (let i = 0; i < args.length; i++) {
  switch (args[i]) {
    case '--dir': options.dir = args[++i]; break;
    case '--dry-run': options.dryRun = true; break;
    case '--verbose': options.verbose = true; break;
    case '--help': /* print usage; process.exit(0) */
  }
}
```
**Rule:** Mirror this `switch` style — no yargs/commander dependency. Support `--help`, `--dir`, `--verbose`, `--exit-on-warning`. Default scan dir: `public/templates/svg`.

**Per-file status logging pattern — `scripts/batch-auto-tag-templates.cjs:398-407`:**
```javascript
console.log(`[${i + 1}/${files.length}] [${statusIcon}] ${file}`);
console.log(`  Category: ${result.category}`);
```
**Rule:** Print one numbered line per file (`[N/total] [PASS|FAIL] <slug>`), then indent error/warning lines underneath. Emit summary block at end (mirror lines 547-572).

**Exit code contract — `scripts/batch-auto-tag-templates.cjs:580-583`:**
```javascript
main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
```
**Rule:** Exit `0` on all-pass, `1` on any failure. CI guard depends on exit code.

**JSON report output — `scripts/batch-auto-tag-templates.cjs:574-576`:**
```javascript
const outputPath = path.join(process.cwd(), 'auto-tag-results.json');
fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));
```
**Rule:** Write `.planning/175-validation-report.json` with shape `{ files: [...], errors: [...], warnings: [...], totals: {...} }` (per RESEARCH.md line 156).

---

### `scripts/generate-template-thumbnails.cjs` (script, batch / file-I/O + HTTP)

**Analogs (composed):**
1. `scripts/batch-auto-tag-templates.cjs:421-519` — DB walk + serial loop + 300ms delay (Pitfall 3 mitigation).
2. `src/services/svgTemplateService.js:22-66` — S3 presign + PUT pattern (`uploadThumbnailToS3`).

**DB-walk + Supabase env pattern — `scripts/batch-auto-tag-templates.cjs:91-101`:**
```javascript
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
if (!supabaseUrl || !supabaseKey) {
  console.error('Error: Supabase credentials not found in environment');
  process.exit(1);
}
supabase = createClient(supabaseUrl, supabaseKey);
```
**Rule:** Mirror this exact env precedence. Service-role key when available (admin bulk operation), anon key fallback for local dev.

**Serial loop with delay (Pitfall 3) — `scripts/batch-auto-tag-templates.cjs:438-518`:**
```javascript
for (let i = 0; i < templates.length; i++) {
  const template = templates[i];
  // ... rasterize + upload + UPDATE ...
  if (!options.rulesOnly && i < templates.length - 1) {
    await new Promise(r => setTimeout(r, 300));
  }
}
```
**Rule:** Serial loop with 300ms `await new Promise(r => setTimeout(r, 300))` between iterations. **DO NOT** use `Promise.all` for the bulk batch — RESEARCH.md Pitfall 3 explicitly forbids this.

**S3 presign + PUT pattern — `src/services/svgTemplateService.js:27-66`:**
```javascript
async function uploadThumbnailToS3(blob, userId) {
  const filename = `thumbnail-${Date.now()}.png`;
  const response = await fetch(`${API_BASE}/api/media/presign`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      filename,
      contentType: 'image/png',
      folder: `thumbnails/${userId}`,
    }),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to get upload URL');
  }
  const { uploadUrl, fileUrl } = await response.json();
  const uploadResponse = await fetch(uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': 'image/png' },
    body: blob,
  });
  if (!uploadResponse.ok) throw new Error(`S3 upload failed with status ${uploadResponse.status}`);
  return fileUrl;
}
```
**Rule:** The new script must call the same `/api/media/presign` endpoint with the same JSON body shape (`filename`, `contentType: 'image/png'`, `folder`). Use `folder: 'thumbnails/system'` for global templates (svg_templates with `tenant_id = NULL`). Convert resvg `Buffer` to a Node-compatible body (`fetch` body parameter) — no `Blob` constructor needed in Node 18+.

**Resvg-js rasterization (NEW package, RESEARCH.md lines 510-526):**
```javascript
const { Resvg } = require('@resvg/resvg-js');
function rasterize(svgPath, { width = 480, height = 270 } = {}) {
  const svgString = fs.readFileSync(svgPath, 'utf8');
  const resvg = new Resvg(svgString, {
    fitTo: { mode: 'width', value: width },
    background: 'rgba(255, 255, 255, 1)',
    font: { loadSystemFonts: true },
  });
  return resvg.render().asPng();
}
```
**Rule:** Landscape templates → 480×270; portrait → 270×480 (read orientation from `svg_templates.orientation` column).

**Idempotent re-run — RESEARCH.md lines 169-175:**
- `SELECT id, slug, svg_url FROM svg_templates WHERE thumbnail IS NULL OR thumbnail LIKE '%design.svg'` → only un-rasterized rows.
- `UPDATE svg_templates SET thumbnail = $fileUrl WHERE id = $id` after each upload.
- Re-runnable: skip rows whose thumbnail is already an S3 URL.

---

### `supabase/migrations/175_seed_100_templates_and_taxonomy.sql` (migration)

**Analog:** `supabase/migrations/167_gallery_templates_view_and_rls.sql` — load-bearing reference for **all** Phase 175 migration patterns.

**Header pattern — `migrations/167_gallery_templates_view_and_rls.sql:1-12`:**
```sql
-- ============================================================================
-- Migration 175: Seed 100+ Templates + Taxonomy CHECK Constraints
-- Phase 175 — New Template Content + Quality Pass (v20.0 Templates Reimagined)
--
-- Addresses:
--   TCTN-01 — At least 100 net-new SVG templates queryable
--   TCTN-02 — Validation gate (validator runs on content; not in this migration)
--   TCTN-03 — Taxonomy enforced at admin-upload time (CHECK constraint floor)
--
-- Decisions referenced: D-XX through D-YY (175-CONTEXT.md if discuss runs).
-- Idempotent. No DOWN migration.
-- ============================================================================
```

**Taxonomy CHECK constraint pattern (RESEARCH.md Code Example 4, lines 547-566):**
```sql
ALTER TABLE svg_templates
  DROP CONSTRAINT IF EXISTS chk_svg_templates_category_enum;

ALTER TABLE svg_templates
  ADD CONSTRAINT chk_svg_templates_category_enum
  CHECK (category IN (
    'Restaurant', 'Retail', 'Corporate', 'Healthcare', 'Hospitality',
    'Real Estate', 'Education', 'Events', 'Fitness', 'Entertainment',
    'Beauty', 'Automotive', 'Technology', 'Finance', 'general'
  ));

ALTER TABLE svg_templates
  ALTER COLUMN tags SET NOT NULL,
  ALTER COLUMN tags SET DEFAULT '{}'::TEXT[];
```
**Rule:** Snapshot category values at migration time (RESEARCH Anti-Pattern: do NOT reference `template_categories` dynamically — explicit reviewable enum). Use `DROP CONSTRAINT IF EXISTS` before `ADD` for idempotency.

**Deterministic UUID v5 seed pattern — `migrations/167_gallery_templates_view_and_rls.sql:55-204`:**
```sql
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
**Rules (mandatory for every Phase 175 INSERT row):**
1. `id = uuid_generate_v5('6ba7b810-9dad-11d1-80b4-00c04fd430c8'::uuid, '<slug>')` — DNS namespace UUID (RFC 4122). Same namespace as migration 167.
2. `tenant_id = NULL` — RLS Pitfall 2: required for global visibility.
3. `created_by = NULL` — Pitfall 2: WITH CHECK from migration 094:56 does NOT apply to superuser inserts (apply_migration runs as postgres).
4. `is_active = TRUE` — RLS predicate from migration 167:43 requires this.
5. `thumbnail = NULL` — populated post-deploy by `scripts/generate-template-thumbnails.cjs`. Do NOT inline-store SVG content as the existing 12 do (per RESEARCH Anti-Pattern lines 376-377).
6. `metadata = jsonb_build_object('license', '...', 'attribution', '...' OR null)` — Pitfall 6 mitigation. License must be one of `{'CC0','MIT','CC-BY-4.0','first-party'}`.
7. `ON CONFLICT (slug) WHERE slug IS NOT NULL DO NOTHING` — Pitfall 4 from migration 167 (partial UNIQUE index).

**Self-asserting verification — `migrations/167_gallery_templates_view_and_rls.sql:286-320`:**
```sql
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

  ASSERT v_total >= 112,
    format('expected svg_templates total >= 112, got %s', v_total);
  ASSERT v_new >= 100,
    format('expected at least 100 net-new templates, got %s', v_new);
END $$;
```
**Rule:** Embed `DO $$ ASSERT $$` block at the BOTTOM of the migration. Migration FAILS to apply if seed didn't insert what it claimed. SC-1 (≥100) is verified by the migration itself, not by an external Node check.

**Comment table pattern — `migrations/171_template_packs.sql:166-167`:**
```sql
COMMENT ON TABLE  public.template_packs       IS 'Phase 173 — curated bundles of gallery templates (TPCK-01..04). Distinct from legacy content_templates (D-02 — left untouched).';
```
**Rule:** Add `COMMENT ON CONSTRAINT chk_svg_templates_category_enum IS 'Phase 175 — TCTN-03 taxonomy floor; snapshot of template_categories enum.';`

---

### `tests/unit/services/svgValidator.test.js` (test, unit)

**Analogs:** `tests/unit/services/svgCustomize.test.js` (fixture SVG strings + per-function describes) and `tests/unit/services/templateApplyService.test.js` (DOMPurify mocking via `vi.mock`).

**Vitest + fixture SVG pattern — `tests/unit/services/svgCustomize.test.js:1-30`:**
```javascript
import { describe, it, expect, beforeEach } from 'vitest';
import { /* named exports */ } from '../../../src/services/svgCustomizeService.js';

const TEST_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600">
  <rect fill="#FF0000" width="800" height="600"/>
  <text id="title">Restaurant Name</text>
  <image id="logo" xlink:href="placeholder.png"/>
</svg>`;

const NO_IMAGE_SVG = `<svg ...>...</svg>`;
const INLINE_STYLE_SVG = `<svg ...>...</svg>`;
```
**Rule:** Same multi-fixture top-of-file pattern. Create `VALID_SVG`, `MALFORMED_XML`, `CURRENTCOLOR_SVG`, `CSS_VAR_SVG`, `OVERSIZED_SVG`, `NO_ANCHORS_SVG`, `XSS_SCRIPT_SVG` fixtures.

**DOMPurify mocking pattern (browser-side validator test) — `tests/unit/services/templateApplyService.test.js:23-30`:**
```javascript
vi.mock('dompurify', () => ({
  default: { sanitize: vi.fn((s) => s) },
}));
import { applyTemplate } from '../../../src/services/templateApplyService';
import DOMPurify from 'dompurify';
```
**Rule:** For svgValidator unit tests, do NOT mock DOMPurify by default — the byte-equality check is the load-bearing contract. Use real DOMPurify with JSDOM env (`vitest.config.js` already runs jsdom). Mock only in the specific test that asserts "validator returns warning when DOMPurify drift > 5%".

**Test naming pattern (TCTN-X traceability) — `tests/unit/services/templateApplyService.test.js:41-58`:**
```javascript
it("editor_type='svg' with customizedSvg sanitizes, calls rpc('clone_svg_template_to_scene', ...) (TPRV-04)", ...);
```
**Rule:** Every it() block name ends with `(TCTN-XX)` so the requirement-to-test map is grep-able. Mirror RESEARCH.md test map (lines 689-705):
- `('malformed XML returns ok=false', () => ...)` — TCTN-02
- `('currentColor token rejected', ...)` — TCTN-02 (Pitfall 6)
- `('var(--*) token rejected', ...)` — TCTN-02 (Pitfall 6)
- `('DOMPurify drift > 5% returns warning', ...)` — TCTN-02 (Pitfall 5)
- `('valid SVG with id="logo" passes', ...)` — TCTN-02
- `('valid SVG with data-customize-* passes', ...)` — TCTN-02
- `('SVG > 200KB returns error', ...)` — TCTN-02

---

### `tests/integration/svgTemplatesCount.test.js` (test, integration)

**Analog:** `tests/integration/favorites/view-per-user.test.js` — exact pattern for live-DB Supabase integration tests.

**Live Supabase + dotenv override — `tests/integration/favorites/view-per-user.test.js:18-46`:**
```javascript
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load .env.local (and .env as fallback) so process.env holds real credentials.
// vitest's environment doesn't auto-load dotenv. `tests/setup.js` runs FIRST and
// calls `vi.stubEnv('VITE_SUPABASE_URL', 'https://test-project.supabase.co')`.
// Pass `override: true` to force the real credentials over the stubbed values.
dotenv.config({ path: '.env.local', override: true });
dotenv.config({ path: '.env', override: false });

const TEST_EMAIL = process.env.TEST_USER_EMAIL;
const TEST_PASSWORD = process.env.TEST_USER_PASSWORD;
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
const SKIP =
  !TEST_EMAIL ||
  !TEST_PASSWORD ||
  !SUPABASE_URL ||
  !SUPABASE_ANON_KEY ||
  SUPABASE_URL.includes('test-project.supabase.co');
```
**Rule:** Copy this exact preamble verbatim — including the `tests/setup.js` stub-leak guard. The `override: true` is required because `setup.js` stubs `VITE_SUPABASE_URL` to a fake.

**describe.skipIf pattern — `tests/integration/favorites/view-per-user.test.js:48`:**
```javascript
describe.skipIf(SKIP)('gallery_templates_with_favorites VIEW per-user filter', () => {
```
**Rule for svgTemplatesCount.test.js:**
```javascript
describe.skipIf(SKIP)('svg_templates ≥100 active rows post-Phase-175', () => {
  it('SELECT COUNT(*) FROM svg_templates WHERE is_active = TRUE AND tenant_id IS NULL >= 112', ...);
  it('all rows created on/after 2026-04-29 have non-null thumbnail (after thumbnails:generate runs)', ...);
});
```

---

### `tests/integration/svgTaxonomy.test.js` (test, integration)

**Analog:** `tests/integration/favorites/view-per-user.test.js` (same live-DB pattern).

**Insert-and-expect-rejection pattern (NEW — composed from Supabase error shape):**
```javascript
it('INSERT with category="invalid_category_xyz" rejected by chk_svg_templates_category_enum', async () => {
  const { error } = await supabase.from('svg_templates').insert({
    name: 'test',
    slug: `test-${Date.now()}`,
    category: 'invalid_category_xyz',
    svg_url: '/test.svg',
    tenant_id: null,
  });
  expect(error).toBeTruthy();
  expect(error.message).toMatch(/chk_svg_templates_category_enum|check constraint/i);
});
```
**Rule:** Test must run as authenticated user (RLS will allow the INSERT to be ATTEMPTED — CHECK runs at DB layer regardless of RLS). Cleanup any rows that did land via slug uniqueness.

---

### `tests/e2e/template-gallery.spec.js` (test, E2E — MODIFIED)

**Analog:** Self — file already exists from Phase 171 and is already structural per TQAL-05.

**Existing structural patterns — `tests/e2e/template-gallery.spec.js:54-58`:**
```javascript
await expect(page.getByRole('heading', { name: /^Templates$/ })).toBeVisible();
await expect(page.getByPlaceholder('Search templates...')).toBeVisible();
await expect(page.locator('[role="alert"]')).toHaveCount(0);  // ONLY allowed toHaveCount: 0
```
**Rule (Phase 175 audit):**
1. Run `grep -rE "toHaveCount\(\s*[1-9]" tests/e2e/template-*.spec.js` — must return zero matches (TQAL-05).
2. Add a thumbnail assertion test (TCTN-04): `await expect(page.locator('img[alt*="thumbnail" i], img[loading="lazy"]').first()).toBeVisible()` — structural, not screenshot-diff.
3. Pitfall 4 mitigation: any test that targets a specific template by name MUST use `?search=<name>` URL param (e.g., `await page.goto(\`${base}?search=Healthcare\`)`).

---

### `tests/e2e/helpers.js` (test helper — EXTEND)

**Analog:** Self (existing file with `loginAndPrepare`, `waitForPageReady`).

**New helpers to add (RESEARCH.md Pattern 3, lines 354-368):**
```javascript
export async function expectAtLeastOneTemplateCard(page) {
  const grid = page.getByRole('main');
  const cards = grid.locator('h3').filter({ hasNotText: /^(Templates|Sort|Filters)$/ });
  await expect(cards.first()).toBeVisible({ timeout: 5000 });
}

export async function expectGalleryRendersWithoutError(page) {
  await expect(page.getByRole('heading', { name: /^Templates$/ })).toBeVisible();
  await expect(page.locator('[role="alert"]')).toHaveCount(0);
  await expect(page.getByText("Couldn't load templates")).not.toBeVisible();
}
```

---

### `src/components/Admin/BulkTemplateUpload.jsx` (component, admin — MODIFIED)

**Analog:** Self.

**Existing pre-INSERT validation site — `src/components/Admin/BulkTemplateUpload.jsx:163-200`:**
```javascript
const handleSaveAll = async () => {
  setIsSaving(true);
  const readyFiles = files.filter(f => f.status === STATUS.READY);
  for (const fileEntry of readyFiles) {
    updateFile(fileEntry.id, { status: STATUS.SAVING });
    try {
      const svgDataUrl = fileEntry.content ? svgToDataUrl(fileEntry.content) : null;
      await createTemplate({
        name: fileEntry.name,
        // ...
      });
      updateFile(fileEntry.id, { status: STATUS.SAVED });
    } catch (err) {
      updateFile(fileEntry.id, { status: STATUS.ERROR, error: err.message });
    }
  }
  setIsSaving(false);
};
```
**Rule (TCTN-03 enforcement):** Insert validateSvg call BEFORE `createTemplate(...)`:
```javascript
import { validateSvg } from '../../services/svgValidator';
// ...
const validation = validateSvg(fileEntry.content);
if (!validation.ok) {
  updateFile(fileEntry.id, {
    status: STATUS.ERROR,
    error: `Validation failed: ${validation.errors.join('; ')}`,
  });
  continue;  // do NOT call createTemplate
}
// (warnings can be surfaced inline but don't block)
await createTemplate({ /* existing args */ });
```
**Existing pre-parse step exists at line 87-108** (`addFiles` calls `parseSvgDimensions`). Validator must run after `parseSvgDimensions` succeeds (so dimensions are known) and before `createTemplate` (so taxonomy / forbidden-tokens / DOMPurify checks all run client-side first).

---

### `package.json` (config — MODIFIED)

**Analog:** Self (existing `scripts.*` block).

**Rule:** Add two entries:
```json
"validate:templates": "node scripts/validate-svg-templates.cjs --dir public/templates/svg",
"thumbnails:generate": "node scripts/generate-template-thumbnails.cjs"
```
**Rule:** Add devDependency `@resvg/resvg-js@^2.6.2` (RESEARCH.md line 116). Commit `package-lock.json`. No global install.

---

### `public/templates/svg/<slug>/design.svg` (content)

**Analog:** Existing 12 templates in `public/templates/svg/` (e.g. `restaurant-menu/menu-design.svg`).

**Rule (per RESEARCH Pitfall 6 + Pattern 1):**
- Width + height + viewBox attributes mandatory.
- Explicit hex colors only — `currentColor` and `var(--*)` rejected by validator.
- At least one of: `id="logo"` (image), `id="text-*"` or `id="title"`, `data-customize-color`, `data-customize-text`, `data-customize-logo` — for QuickCustomize anchors.
- File size < 200KB.
- DOMPurify byte-equality (no `<script>`, no `on*` handlers, no `javascript:` URLs).
- Each row gets a `metadata.license` JSON entry — `'CC0'` | `'MIT'` | `'CC-BY-4.0'` | `'first-party'`.

---

## Shared Patterns

### Pattern A: DOMPurify Configuration (LOAD-BEARING)

**Source:** `src/services/templateApplyService.js:53-55`
**Apply to:** `src/services/svgValidator.js`, all unit tests, `BulkTemplateUpload.jsx` integration site
```javascript
DOMPurify.sanitize(svgString, { USE_PROFILES: { svg: true, svgFilters: true } })
```
**Rule:** **EXACT** config — RESEARCH Pitfall 5. Any drift causes validator/runtime mismatch. The validator must run a byte-equality check (~5% drift threshold per RESEARCH Pattern 1).

### Pattern B: Migration Self-Assert

**Source:** `supabase/migrations/167_gallery_templates_view_and_rls.sql:286-320`
**Apply to:** `supabase/migrations/175_*.sql`
```sql
DO $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count FROM svg_templates WHERE ...;
  ASSERT v_count >= 100, format('expected ≥100, got %s', v_count);
END $$;
```
**Rule:** Migration is the authoritative SC-1 verification point. If the migration applies, the count is satisfied. No external Node check needed (research Don't-Hand-Roll line 390).

### Pattern C: Deterministic UUID Seed

**Source:** `supabase/migrations/167_gallery_templates_view_and_rls.sql:55-204`
**Apply to:** Every INSERT row in `migrations/175_*.sql`
```sql
uuid_generate_v5('6ba7b810-9dad-11d1-80b4-00c04fd430c8'::uuid, '<slug>')
```
**Rule:** Same DNS namespace UUID. Idempotent re-apply: same slug → same UUID → ON CONFLICT DO NOTHING.

### Pattern D: tenant_id IS NULL + created_by IS NULL for global rows

**Source:** `supabase/migrations/167_gallery_templates_view_and_rls.sql:39-45`, line 56-58 (RLS predicate); migration 094:56 (WITH CHECK)
**Apply to:** Every INSERT in `migrations/175_*.sql`
```sql
INSERT INTO svg_templates (..., tenant_id, created_by) VALUES (..., NULL, NULL)
```
**Rule:** RLS predicate is `is_active = TRUE AND (tenant_id IS NULL OR created_by = auth.uid())`. Global content needs `tenant_id = NULL`. apply_migration runs as superuser — WITH CHECK doesn't apply to inserts. **Pitfall 2 — non-null tenant_id makes the row invisible to all users.**

### Pattern E: ON CONFLICT (slug) WHERE slug IS NOT NULL DO NOTHING

**Source:** `supabase/migrations/167_gallery_templates_view_and_rls.sql:204`
**Apply to:** Every INSERT in `migrations/175_*.sql`
**Rule:** Migration 167:21-25 created a partial UNIQUE index. Conflict target must include the partial predicate.

### Pattern F: Serial Loop with 300ms Delay (S3 Rate-Limit Mitigation)

**Source:** `scripts/batch-auto-tag-templates.cjs:438-518`
**Apply to:** `scripts/generate-template-thumbnails.cjs`
**Rule:** RESEARCH Pitfall 3 — never use `Promise.all` for bulk uploads. 300ms delay between iterations. For 100 templates this is ~30s, acceptable for a one-off script.

### Pattern G: Live-DB Integration Test Preamble

**Source:** `tests/integration/favorites/view-per-user.test.js:18-46`
**Apply to:** `tests/integration/svgTemplatesCount.test.js`, `tests/integration/svgTaxonomy.test.js`
**Rule:** Copy preamble verbatim — `dotenv.config({ override: true })`, the stub-leak guard (`SUPABASE_URL.includes('test-project.supabase.co')`), `describe.skipIf(SKIP)`. Required because `tests/setup.js` stubs the URL to a fake.

### Pattern H: Structural E2E Assertions (TQAL-05)

**Source:** `tests/e2e/template-gallery.spec.js:54-58`
**Apply to:** All Phase 175 E2E audits
**Rule:**
- ALLOWED: `getByRole`, `getByText`, `getByPlaceholder`, `getByLabel`, `toBeVisible()`, `not.toBeVisible()`, `toHaveCount(0)` (only zero — error-toast absence).
- FORBIDDEN: `toHaveCount(N)` for N > 0, exact template-name pinning without `?search=` URL param, screenshot-diff assertions.

### Pattern I: Pure-JS Service Contract (Browser + Node)

**Source:** `src/services/svgCustomizeService.js` (9 pure functions, no React, no network)
**Apply to:** `src/services/svgValidator.js`
**Rule:** Single primary export. Optional `opts.DOMParserCtor` and `opts.DOMPurify` injection so the same module runs in browser (admin UI) and Node (CLI). No try/catch — return `{ ok: false, errors: [...] }`. No React imports. No Supabase imports.

### Pattern J: License Manifest in metadata JSONB

**Source:** RESEARCH Pitfall 6, lines 471-480 + Code Example 5 line 588
**Apply to:** Every INSERT in `migrations/175_*.sql`, `LICENSE-MANIFEST.md`
```sql
metadata = jsonb_build_object('license', 'CC0', 'attribution', null)
```
**Rule:** License must be one of `{'CC0','MIT','CC-BY-4.0','first-party'}`. If `'CC-BY-4.0'`, `attribution` MUST be non-null (validator can also enforce). Maintain `175-LICENSE-MANIFEST.md` as a parallel audit trail.

---

## No Analog Found

| File | Role | Data Flow | Reason | Recommendation |
|------|------|-----------|--------|----------------|
| `scripts/generate-template-thumbnails.cjs` (rasterizer half) | script | transform | No existing code rasterizes SVG to PNG. The codebase has CLI scripts (✓) and S3 upload (✓), but no Node-side SVG → bitmap pipeline. | Compose: `scripts/batch-auto-tag-templates.cjs` (loop + dotenv + supabase client) + `svgTemplateService.uploadThumbnailToS3` (presign + PUT) + NEW `@resvg/resvg-js` rasterization. RESEARCH.md lines 510-526 has the verified resvg snippet from upstream README. |
| `.planning/phases/175-new-template-content-quality-pass/175-CONTRIBUTION-GUIDE.md` (optional) | doc | — | Net-new artifact — no project precedent. | Treat as discretionary; if produced, document the SVG authoring conventions (explicit hex, semantic IDs or `data-customize-*`, viewBox + width + height, license metadata). |
| `.planning/phases/175-new-template-content-quality-pass/175-LICENSE-MANIFEST.md` (optional) | doc | — | Net-new artifact (Pitfall 6 mitigation). | Discretionary; if produced, list every imported template with source URL + license + attribution. |

---

## Metadata

**Analog search scope:**
- `src/services/` — templateApplyService, svgCustomizeService, svgTemplateService, templateGalleryService, marketplaceService
- `src/components/Admin/` — BulkTemplateUpload.jsx
- `src/design-system/components/` — TemplateCard.jsx (LayoutTemplate placeholder anchor)
- `scripts/` — svg-to-polotno.cjs, batch-auto-tag-templates.cjs, smoke-template-gallery.mjs
- `supabase/migrations/` — 094 (table base), 167 (Phase 170 RLS + seed + VIEW), 171/172/173/174 (recent precedent for self-assert + idempotency)
- `tests/unit/services/` — svgCustomize.test.js, templateApplyService.test.js
- `tests/integration/favorites/` — view-per-user.test.js (live-DB preamble)
- `tests/integration/preview-apply/` — svg-rpc-atomicity.test.js (vi.mock supabase pattern)
- `tests/e2e/` — template-gallery.spec.js (TQAL-05 baseline), template-packs.spec.js, template-gallery-rls.spec.js, gallery-tour.spec.js

**Files scanned:** 18 source files + 6 migration files + 6 test files + 4 script files = 34 files

**Pattern extraction date:** 2026-04-29

**Cross-references:**
- RESEARCH Pitfall 5 — DOMPurify config drift (see Pattern A)
- RESEARCH Pitfall 6 — license metadata audit (see Pattern J)
- RESEARCH Pitfall 2 — RLS + tenant_id NULL (see Pattern D)
- RESEARCH Pitfall 3 — S3 rate-limit serial loop (see Pattern F)
- RESEARCH Pitfall 4 — pagination + `?search=` URL param (see template-gallery.spec.js audit rules)
- RESEARCH Anti-Pattern (line 376) — no inline data URL thumbnails; S3 only (Pattern affecting `INSERT` rows)
- RESEARCH Don't-Hand-Roll line 390 — DO $$ ASSERT $$ over external Node check (see Pattern B)
