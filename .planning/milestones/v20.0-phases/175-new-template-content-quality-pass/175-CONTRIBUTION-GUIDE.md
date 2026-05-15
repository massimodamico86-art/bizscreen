# Phase 175 — SVG Template Authoring Contribution Guide

**Created:** 2026-04-29
**Audience:** Anyone adding new SVG templates to `svg_templates`.

## Hard Rules (validator enforces — fail = INSERT blocked)

1. **Well-formed XML.** Open in any XML parser without error.
2. **No `currentColor`.** Use explicit hex (`#FF0000`) or rgb (`rgb(255,0,0)`).  Pitfall 6 silently defeats brand swap if violated.
3. **No `var(--*)` CSS variables.** Same reason — explicit colors only.
4. **Required dimensions.** Either `viewBox` attribute OR both `width` + `height`.
5. **Size cap.** ≤ 200 KB.
6. **DOMPurify-clean.** No `<script>`, no `on*` event handlers, no `javascript:` URLs in `xlink:href`. The validator runs DOMPurify with `{ USE_PROFILES: { svg: true, svgFilters: true } }` and flags any byte-equality drift > 5%.

## Strong Recommendations (validator warns — INSERT proceeds)

- **Include customization anchors** (one or more):
  - `<image id="logo" .../>` for logo replacement
  - `<text id="title">` or `<text id="text-headline">` for text replacement
  - Or `data-customize-color`, `data-customize-text`, `data-customize-logo` attributes
- **Standard dimensions:**
  - Landscape: 1920×1080 (16:9)
  - Portrait: 1080×1920 (9:16)
- **xmlns:xlink declared.** If you reference `xlink:href`, declare `xmlns:xlink="http://www.w3.org/1999/xlink"` on the root `<svg>` element. The validator tolerates omission (Plan 02 Decision 1) but warns.

## Required Metadata

Every INSERT row must set `metadata.license` to one of:
- `first-party` — authored in-house
- `CC0` — public domain
- `MIT` — MIT licensed
- `CC-BY-4.0` — REQUIRES `metadata.attribution` non-null

## Required Audit Trail

Every imported open-source template must be added to `175-LICENSE-MANIFEST.md`
with the source URL.

## Database Insert Rules

- `tenant_id = NULL` (global content visibility — RLS predicate)
- `created_by = NULL` (Pitfall 2 mitigation; superuser inserts during apply_migration)
- `is_active = TRUE`
- `id = uuid_generate_v5('6ba7b810-9dad-11d1-80b4-00c04fd430c8'::uuid, '<slug>')` (deterministic — same slug always yields same UUID)
- `thumbnail = NULL` (Plan 03's `scripts/generate-template-thumbnails.cjs` populates with S3 URL post-deploy)
- `ON CONFLICT (slug) WHERE slug IS NOT NULL DO NOTHING` (idempotent re-apply)

## Categories (TCTN-03 floor — snapshot enum)

The `chk_svg_templates_category_enum` CHECK constraint accepts only these 15 values:

`Restaurant`, `Retail`, `Corporate`, `Healthcare`, `Hospitality`, `Real Estate`, `Education`, `Events`, `Fitness`, `Entertainment`, `Beauty`, `Automotive`, `Technology`, `Finance`, `general`

Adding a new category requires a follow-up migration that DROPs and re-CREATEs the constraint with the expanded value list. This is intentional — taxonomy changes are reviewed at the SQL layer.

## Authoring Workflow

1. Create directory `public/templates/svg/<slug>/`.
2. Author `design.svg` following the hard rules above.
3. Run `npm run validate:templates` — must exit 0 (no errors). Warnings are advisory.
4. Add an INSERT row to the relevant Phase 175 migration file using the canonical pattern above.
5. Append a row to `175-LICENSE-MANIFEST.md`.
6. Commit migration + SVG content + manifest update together (atomic — content path resolves only after the migration row exists).
