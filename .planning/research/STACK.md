# Technology Stack

**Project:** BizScreen v21.0 Templates at Scale
**Researched:** 2026-05-06
**Confidence:** HIGH (all new library versions verified via npm registry; SDK APIs verified via Context7; integration points traced to live codebase files)

---

## Scope Boundary

This document covers **only new additions and changes** for v21.0. The following are settled and not re-researched:

- React 19, Vite, Tailwind CSS 3, React Router v7 — existing
- Supabase JS v2, S3 AWS SDK, Supabase Edge Functions (Deno) — existing
- Polotno v2.33.2 (installed), runs in iframe via postMessage — existing
- fuse.js ^7.3.0 — existing client-side search
- `@resvg/resvg-js` ^2.6.2 — existing SVG-to-PNG rasterizer (dev dependency, Node CLI only)
- `svgValidator` — existing 6-rule pure-function gate in `src/services/svgValidator.js`
- `dompurify`, framer-motion, lucide-react, date-fns — existing
- `driver.js` — existing first-visit tour
- Playwright, Vitest — existing test stack
- `ANTHROPIC_API_KEY` — already present in `.env.example`; existing `/api/ai/generate-tags` route pattern via `autoTaggingService.js`

---

## Capability Area 1: LLM-to-SVG Generation Pipeline

### Decision: `@anthropic-ai/sdk` — Claude Haiku 4.5 model

**Why Claude, not OpenAI:**
- `ANTHROPIC_API_KEY` is already present in the environment and used for auto-tagging (`autoTaggingService.js` → `/api/ai/generate-tags`). Adding a second LLM vendor (OpenAI) creates two secret rotation surfaces, two billing dashboards, and two failure domains for zero additional capability.
- The project already has Claude-flavored prompt engineering patterns. Consistency reduces cognitive overhead.
- Claude Haiku 4.5 is the fastest and cheapest Claude model: **$1/M input tokens, $5/M output tokens** (verified from benchlm.ai, 2026-04). An SVG template prompt is ~500 tokens in, ~2,000 tokens out. At 500 template generations that is ~$0.50 total — negligible.
- Claude structured output (`jsonSchemaOutputFormat` / `zodOutputFormat`) ensures the response is a valid JSON envelope containing the SVG string, avoiding free-text parsing heuristics. Context7-verified: `@anthropic-ai/sdk` helpers.md confirms `.parse()` with JSON Schema works on the Messages endpoint.

**Why Haiku 4.5, not Sonnet:**
- Latency budget: admin queue is async (not real-time user interaction), but shorter waits keep the admin UX snappy. Haiku generates output ~3-5× faster than Sonnet at half the cost.
- SVG generation at this scale (~500 total, admin-initiated, not real-time) does not require Sonnet-class reasoning. Haiku reliably handles constrained structured-output tasks.
- If generation quality is insufficient, escalation path to `claude-sonnet-4-6` is one model-ID string change with no SDK changes.

**Batch API note:** The Anthropic Batch API (Context7-verified) gives 50% cost reduction for async workloads. The admin seed pipeline is exactly an async workload. Phase that builds the generation pipeline should enable `client.messages.batches.create()` from the start, even if initial UX drives it synchronously.

**Where it runs:** Server-side only. The existing pattern (`/api/ai/generate-tags` in `autoTaggingService.js`) routes through a Vercel API route (or Supabase Edge Function) that holds the secret. The v21.0 generation pipeline follows the same pattern — a new Edge Function or Vercel route, never a VITE_* env var in the browser bundle.

**Supabase Edge Function compatibility:** Supabase Edge Functions are Deno-based and support npm imports. `@anthropic-ai/sdk` installs as `npm:@anthropic-ai/sdk` in Deno. Confirmed by Supabase npm compatibility docs.

### New Dependency

| Library | Version | Location | Purpose |
|---------|---------|----------|---------|
| `@anthropic-ai/sdk` | ^0.94.0 | Server-side only (Edge Function or Vercel API route) | Claude API client for SVG generation pipeline |

**Install:** `npm install @anthropic-ai/sdk` (server-side context only; do NOT add to Vite bundle)

### What NOT to add for LLM

- Do NOT add `openai` npm package — Claude already present, two vendors adds cost and complexity with zero benefit
- Do NOT add Vercel AI SDK (`ai`) — the project uses plain `fetch` / Supabase invocations; a streaming-first framework-level SDK is overkill for a batch generation pipeline
- Do NOT expose `ANTHROPIC_API_KEY` as `VITE_ANTHROPIC_API_KEY` — key must never reach the browser bundle

---

## Capability Area 2: Third-Party SVG Bulk Import (License-Cleared)

### Decision: No npm library for license detection — manual attribution pipeline with structured metadata

**Why no SPDX/license-checker library:**
- SPDX tooling (`spdx-expression-parse`, `license-checker-rseidelsohn`) is designed for detecting npm dependency licenses by scanning `node_modules`. That problem is entirely different from tracking provenance of externally sourced SVG asset files.
- There is no npm package that automatically detects licenses embedded in SVG files — SVGs do not have a standard machine-readable license field. Detection would require heuristic regex over comments/metadata, which is unreliable and false-confidence-generating.
- The correct architecture for this use case is: **human-curated source list + structured metadata schema per import batch**, not automated detection.

**Recommended pipeline:**
1. Admin selects a license-cleared source (CC0: SVG Repo CC0 collection, FreeSVG, Public Domain Vectors, OpenClipart, unDraw/OpenDoodles MIT)
2. Each import batch includes a metadata record: `source_url`, `license` (SPDX string: `"CC0-1.0"`, `"MIT"`), `attribution_required` (bool), `attribution_text` (nullable)
3. These fields land in a new `svg_import_batches` table, with a FK from `svg_templates.import_batch_id`
4. Attribution is rendered in the admin UI per-template, not surfaced to end users (no end-user attribution requirement for CC0/MIT)
5. The existing `svgValidator` gate runs identically on imported SVGs — no bypass

**For SPDX string validation only** (ensure admins enter valid SPDX identifiers), the `spdx-expression-parse` package is a lightweight option (~12KB). Treat it as optional tooling for an admin-form validator, not a detection engine.

### New Dependency (Optional, Admin UI Only)

| Library | Version | Location | Purpose |
|---------|---------|----------|---------|
| `spdx-expression-parse` | ^4.0.0 | Browser (admin form only) | Validate that license strings entered by admins are valid SPDX identifiers |

**Install (if used):** `npm install spdx-expression-parse`

**Note:** This is a validation helper for human-entered data, not a detection engine. If the admin UI uses a dropdown of pre-approved license types (CC0-1.0, MIT, Apache-2.0) rather than a free-text field, this library is unnecessary entirely.

### What NOT to add for SVG import

- Do NOT use `license-checker` or `license-checker-rseidelsohn` — those scan `node_modules`, not SVG asset provenance
- Do NOT rely on automated license scanning of SVG file content — no standard metadata format; false confidence is worse than no check
- Do NOT modify `svgValidator` for import — run it identically; source provenance is orthogonal to SVG structural validity
- Do NOT import `@resvg/resvg-js` into the browser — it is a Node-only binary; thumbnail generation for imported SVGs goes through the existing Node CLI / Edge Function rasterization path

---

## Capability Area 3: Gallery Virtualization (`@tanstack/react-virtual` Activation)

### Decision: Activate the already-planned `@tanstack/react-virtual` v3 as a row virtualizer over fuse.js filtered results

**Current state:** `@tanstack/react-virtual` is referenced in PROJECT.md as "already in package.json but not activated" — however, inspection of `package.json` confirms it is NOT currently installed. It must be added.

**Version:** 3.13.24 (current as of 2026-05-06 per `npm show`)

**Architecture for fuse.js + virtualizer integration:**

The key insight is that TanStack Virtual virtualizes an **array**, not the DOM directly. The integration is clean:

```
allTemplates (server fetch)
  → Fuse.search(query) → filteredTemplates[]
  → rowVirtualizer(count: filteredTemplates.length)
  → getVirtualItems() → render filteredTemplates[virtualRow.index]
```

When `filteredTemplates` changes (search/filter change), the `count` prop on the virtualizer updates, and it recalculates. No gotchas at the fuse.js boundary — fuse returns a plain array. The virtualizer count just tracks `filteredTemplates.length`.

**Grid layout pattern:** The current gallery uses a CSS grid (likely `grid-cols-2 sm:grid-cols-3 lg:grid-cols-4`). TanStack Virtual virtualizes by row, not individual cell. The correct approach is:

1. Compute `columns = 4` (or responsive breakpoint from container width)
2. Chunk `filteredTemplates` into rows of `columns` items each
3. Virtualizer `count = Math.ceil(filteredTemplates.length / columns)`
4. Each virtual row renders one row-slice of template cards

**Fixed row height vs dynamic:** Template cards in `TemplateCardGrid` have a consistent aspect ratio. Fixed row height via `estimateSize: () => ROW_HEIGHT_PX` is correct and avoids the complexity of `measureElement` dynamic measurement. The one gotcha to avoid: do NOT use dynamic height measurement (`measureElement` + `ResizeObserver`) unless cards vary in height — the overhead of per-card measurement is unnecessary for uniform grid tiles.

**Scroll container:** The virtualizer requires a scroll container with a fixed height and `overflow: auto`. The `TemplateGalleryPage` will need the main content area wrapped in a ref'd div with a known height (e.g., `height: calc(100vh - <header-height>px)`). This is a layout change, not a library change.

**fuse.js version compatibility:** fuse.js 7.3.0 is already installed. No update needed. The virtualizer integration is purely at the array level.

### New Dependency

| Library | Version | Location | Purpose |
|---------|---------|----------|---------|
| `@tanstack/react-virtual` | ^3.13.24 | Browser (TemplateGalleryPage only) | Virtualize the template card grid at 500+ items |

**Install:** `npm install @tanstack/react-virtual`

### What NOT to add for virtualization

- Do NOT add `react-window` or `react-virtualized` — TanStack Virtual is headless, has zero conflicting style opinions, and was already planned by the team
- Do NOT use dynamic height measurement (`measureElement`) for template cards — cards are uniform height; fixed `estimateSize` is correct and avoids ResizeObserver overhead
- Do NOT abandon fuse.js for server-side search — at 500 templates, client-side fuse.js remains sub-50ms; Algolia/Supabase FTS would add latency, cost, and offline incompatibility
- Do NOT virtualize the starter packs strip (StarterPacksStrip) — it is a horizontal scroll with ~10 items, not a large list

---

## Capability Area 4: Polotno QuickCustomize (TPRV-F1)

### Decision: Pure JSON mutation — no new library required; bespoke `polotnoCustomizeService.js`

**Critical architectural finding:** Polotno runs in an **iframe** (`/polotno/index.html`), not as an imported module in the main React app. The `PolotnoEditor.jsx` component communicates via `postMessage`. The main app never imports `polotno` directly and does not have a `createStore()` instance.

This means the QuickCustomize panel for Polotno templates **cannot use the Polotno store API** (`store.loadJSON`, `element.set()`). Those APIs are inside the iframe's sandboxed context.

**What it can do:** The `template_library` rows contain a `design_json` JSONB column holding the raw Polotno JSON object. Polotno JSON is a plain JavaScript object tree:

```
{
  pages: [{
    children: [
      { type: "text", text: "HELLO", fill: "#ffffff", ... },
      { type: "image", src: "...", ... },
      { type: "svg", ... }
    ]
  }]
}
```

From Context7 Polotno docs (confirmed): `json.pages[0].children[0].text = 'Updated text'` is valid direct mutation before re-serialization. The JSON is a plain object — no reactive proxy, no special setters required outside the Polotno store context.

**Pattern:** Create `src/services/polotnoCustomizeService.js` that mirrors the role of `svgCustomizeService` (for SVG) but operates on the Polotno JSON JSONB blob:

1. Deep-clone the `design_json` JSON object (no library needed — `structuredClone()` is available in all modern browsers and Node 17+)
2. Walk `json.pages[].children[]` matching elements by type/role conventions (same approach as SVG's `data-customize-*` attributes, but via element type and name/id fields)
3. Apply brand color swaps (find `fill`, `background`, `color` fields on text/shape elements with placeholder values), logo substitution (find `image` elements with placeholder src), and text overrides (find `text` elements by id/name)
4. Return the mutated JSON object
5. Pass the mutated JSON to the apply RPC as a new `p_customized_design_json` parameter (requires a new migration to add this parameter to `clone_template_to_scene`)

**Polotno JSON element conventions to establish:**
- Text customization target: elements with `name` matching `"title"`, `"subtitle"`, `"body"`, or `id` prefix `"text-"` (mirrors SVG convention)
- Color customization target: text elements and shape elements where `fill` matches a palette placeholder (e.g., a specific placeholder hex like `#BA0000` as primary brand color target)
- Logo target: `image` elements with `name: "logo"` or `id: "logo"`

This naming convention must be documented and enforced in the admin template authoring guide — there is no automated detection of "which elements are customizable" in Polotno JSON without the in-store context.

**Preview rendering:** For live preview of customized Polotno JSON without mounting the full Polotno editor, the `polotno/utils/to-svg` utility (`jsonToSVG`) is available per Context7 docs. However, this requires the Polotno package to be importable in the main app context. Since Polotno runs in an iframe, the preview path should render via a message to the iframe requesting a preview render, or accept that Polotno template preview is a static thumbnail (PNG from S3) with color-overlay CSS simulation rather than live SVG re-render.

**Recommendation:** For the initial TPRV-F1 implementation, skip live SVG preview for Polotno QuickCustomize (show the thumbnail PNG with a "Preview updates on apply" label). This avoids coupling the main bundle to the Polotno package. A live preview can be added in a later phase by adding a lightweight postMessage protocol to the preview iframe.

### New Dependency

None. `polotnoCustomizeService.js` is bespoke JavaScript using only `structuredClone()` (built-in) and the existing Supabase client.

### What NOT to add for Polotno QuickCustomize

- Do NOT import `polotno` (the npm package) into the main React 19 app bundle — it is React 18-based and currently sandboxed in an iframe for this reason
- Do NOT use `polotno-node` for server-side JSON manipulation — it is a heavy Puppeteer-based rendering package for image export, not JSON mutation
- Do NOT attempt to use `createStore()` from the main app for headless JSON mutation — the store requires DOM (canvas) context and is incompatible with the React 19 app's browser environment when loaded outside the iframe
- Do NOT try to implement live SVG preview via `jsonToSVG` in the first iteration — the import path for `polotno/utils/to-svg` may break Vite bundling of the main app due to the React 18 peer dependency in the polotno package

---

## Full New Dependencies Summary

| Library | Version | `npm install` | Context | Verified |
|---------|---------|---------------|---------|---------|
| `@anthropic-ai/sdk` | ^0.94.0 | server-side (Edge Fn / Vercel route) | LLM SVG generation pipeline | Context7 + npm registry |
| `@tanstack/react-virtual` | ^3.13.24 | `npm install @tanstack/react-virtual` | Browser (gallery page) | npm registry + Context7 |
| `spdx-expression-parse` | ^4.0.0 | `npm install spdx-expression-parse` (optional) | Browser (admin form validator only) | npm registry |

Zero new libraries for Polotno QuickCustomize (pure JSON mutation + bespoke service).

---

## Existing Dependencies: Version Notes

| Library | Current | Latest | Action |
|---------|---------|--------|--------|
| `polotno` | ^2.33.2 | 2.40.2 | Consider upgrading during TPRV-F1 phase — 7 minor versions behind. Do NOT upgrade without testing iframe postMessage behavior. |
| `fuse.js` | ^7.3.0 | 7.3.0 | No action — already at latest |
| `@resvg/resvg-js` | ^2.6.2 | latest via npm | Keep as dev dependency (Node CLI only) — no change |

---

## Integration Points

### LLM Pipeline → Existing Stack

- New Supabase Edge Function `ai-template-generator` or Vercel API route `/api/ai/generate-svg`
- Calls `@anthropic-ai/sdk` with `ANTHROPIC_API_KEY` (server secret, already in `.env.example`)
- Output SVG string passes through `validateSvg()` from `src/services/svgValidator.js` (same function used for admin uploads — Node-compatible pure function)
- Validated SVG goes into admin review queue (new `template_generation_queue` table, RLS admin-only)
- On approval: existing admin upload path (`BulkTemplateUpload.jsx`) or a new admin publish action calls `@resvg/resvg-js` to generate thumbnail, uploads to S3, inserts into `svg_templates`

### Virtualizer → Existing Gallery

- `TemplateGalleryPage.jsx` already holds `filteredTemplates` (output of fuse.js)
- Add `useVirtualizer` from `@tanstack/react-virtual` consuming `filteredTemplates.length` as `count`
- Wrap `TemplateCardGrid` render in virtualizer rows; each row renders a `columns`-wide slice of template cards
- Layout change required: main content area needs explicit height container with `overflow: auto`

### Polotno QuickCustomize → Existing Apply Flow

- New `src/services/polotnoCustomizeService.js`: pure function `customizePolotnoJson(designJson, overrides)` → returns mutated JSON object
- `templateApplyService.js` gains a new branch: if `editor_type === 'polotno'` and `customizedDesignJson` is provided, call a new RPC `clone_template_to_scene_with_customization` (new migration) that accepts `p_customized_design_json JSONB`
- `TemplatePreviewModal` (or its Polotno-specific variant) calls `polotnoCustomizeService` and passes result to `applyTemplate`

---

## Sources

- `@anthropic-ai/sdk` SDK docs: Context7 `/anthropics/anthropic-sdk-typescript` (structured output, batch API, model IDs)
- Claude pricing 2026: [benchlm.ai](https://benchlm.ai/blog/posts/claude-api-pricing) — Haiku 4.5 at $1/$5 per M tokens
- TanStack Virtual: Context7 `/websites/tanstack_virtual` (grid virtualizer, fixed height, count-based filtering pattern)
- TanStack Virtual + filtering discussion: [GitHub Discussion #290](https://github.com/TanStack/virtual/discussions/290)
- Polotno JSON structure: Context7 `/websites/polotno` (store.loadJSON, element.set, toJSON, Export Design to JSON example showing direct `json.pages[0].children[0].text` mutation)
- Polotno iframe isolation: `src/components/PolotnoEditor.jsx` (lines 1-60) — confirmed postMessage architecture
- `templateApplyService.js` — confirmed no customized JSON passed to Polotno clone RPC currently
- SPDX npm tooling: [spdx-expression-parse npm](https://www.npmjs.com/package/spdx-expression-parse)
- CC0 SVG sources: [SVG Repo licensing](https://www.svgrepo.com/page/licensing/), [FreeSVG](https://freesvg.org/), [Public Domain Vectors](https://publicdomainvectors.org/)
- `ANTHROPIC_API_KEY` already in project: `.env.example` line 163
- `autoTaggingService.js` existing Claude call pattern: `src/services/autoTaggingService.js` → `/api/ai/generate-tags`
- `@tanstack/react-virtual` current version: npm registry — 3.13.24 (2026-05-06)
- `@anthropic-ai/sdk` current version: npm registry — 0.94.0 (2026-05-06)

---

## Credential Rotation (Phase 177)

This section documents the rotation procedure for the three credential families used by the
`generate-svg-template` Edge Function (TGEN-04 SC requirement). All Supabase secrets are project-scoped
and never leave the server-side runtime.

### ANTHROPIC_API_KEY rotation
1. Generate new key in Anthropic Console (Settings → API Keys → Create).
2. Set on Supabase: `supabase secrets set ANTHROPIC_API_KEY=<new-key> --project-ref <ref>`.
3. Verify EF picks it up: `supabase functions invoke generate-svg-template --no-verify-jwt --body '{"action":"healthcheck"}'`.
4. Delete old key in Anthropic Console after 24h grace.

### ANTHROPIC_MODEL_ID update on deprecation
1. Anthropic emails 30-day deprecation notice for `claude-haiku-4-5-20251001` (or successor).
2. Test new snapshot in dev: `supabase secrets set ANTHROPIC_MODEL_ID=claude-haiku-X-Y-YYYYMMDD --project-ref <dev-ref>`.
3. Run A/B harness: `node scripts/eval-prompt-library.cjs --runs=5` — verify ≥30pp threshold still holds.
4. Promote to prod: `supabase secrets set ANTHROPIC_MODEL_ID=<new-snapshot> --project-ref <prod-ref>`.

### AWS S3 credential rotation
1. IAM → rotate `AWS_ACCESS_KEY_ID` for the EF service-account user.
2. `supabase secrets set AWS_ACCESS_KEY_ID=<new> AWS_SECRET_ACCESS_KEY=<new> --project-ref <ref>`.
3. Approve a test draft to verify upload works.
