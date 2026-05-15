# Feature Research: Templates at Scale (v21.0)

**Domain:** Digital signage template catalog — vertical content strategy, AI generation pipeline, bulk import, gallery scalability
**Researched:** 2026-05-06
**Confidence:** MEDIUM-HIGH (competitive analysis of OptiSigns, Yodeck, ScreenCloud, Rise Vision, LOOK DS, truDigital, NoviSign, PosterMyWall; industry vertical research for Restaurants/QSR, Retail/e-commerce, Healthcare/wellness; AI generation pipeline research; current BizScreen codebase context from PROJECT.md + MILESTONES.md)

---

## Context: What Already Exists (Do Not Re-Build)

Shipped in v20.0 — these are foundations, not targets:

- `gallery_templates` Postgres VIEW unioning `template_library` + `svg_templates`
- `TemplateGalleryPage` with fuse.js search, filter chips (category/tag/orientation), sort, URL-synced state
- `TemplatePreviewModal` + integrated `QuickCustomizePanel` (SVG live preview — brand colors, logo, text overrides)
- Atomic single-RPC apply (migrations 168 Polotno + 170 SVG)
- `template_packs` schema + `apply_starter_pack` RPC + `AdminStarterPacksPage`
- Per-user `template_favorites`
- `svgValidator` (6-rule gate) + admin SVG upload UI
- 127 active SVG templates across 15 generic categories
- `@resvg/resvg-js` thumbnail rasterizer + 127/127 PNGs on S3

---

## Feature Landscape

### Table Stakes (Users and Admins Expect These)

Features that users of a "hundreds of templates" catalog take for granted. Missing any of these makes the catalog feel unfinished.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Vertical-filtered gallery browsing | Restaurants/QSR/Retail/Healthcare users want to see only what's relevant to them — OptiSigns, Yodeck all support industry filter | LOW | Extend existing category filter chips with vertical super-categories; current 15 generic categories become sub-categories under each vertical |
| Minimum template density per vertical | 30+ templates per vertical is the threshold where a category feels "real" (Yodeck has ~400 across all; Rise Vision 600+ for education alone) | MEDIUM | Target: ~100 per vertical = 300 net-new across 3 verticals + retain ~50 from generic existing catalog |
| Portrait + landscape variants for key templates | Every signage platform offers both orientations; missing one cuts the catalog's practical use in half | MEDIUM | Each hero template type (menu board, promo banner, etc.) needs both orientations |
| Thumbnail display for all templates | Gallery is unusable without rendered previews; current 127 PNGs on S3 must scale to ~500 | LOW | `@resvg/resvg-js` rasterizer already exists; pipeline must run for every new import or AI-generated template |
| Gallery virtualization at ~500 templates | fuse.js on 127 rows is instant; on 500 rows without windowing, DOM render slows to ~800ms on mid-range hardware | MEDIUM | `@tanstack/react-virtual` already deferred from v20.0 as TGAL-F1; this milestone's catalog scale-up is the trigger |
| Polotno QuickCustomize parity | `template_library` Polotno entries currently skip QuickCustomize; users landing on a Polotno template get a worse experience than SVG templates | MEDIUM | TPRV-F1 deferred from v20.0; required for vertical Polotno templates if any are added |
| Template search by vertical keyword | Searching "menu board" or "pharmacy" should surface relevant templates; tag-based search must cover vertical-specific terminology | LOW | Extend existing fuse.js tag index; vertical tags must be seeded on every new template |
| Admin publish/unpublish control | Curators need to hide broken or seasonal templates without deleting them; OptiSigns updates templates "weekly" suggesting frequent curation cycles | LOW | Add `published` boolean to `svg_templates`; gate gallery VIEW on `published = true`; admin toggle UI |

### Differentiators (Competitive Advantage)

Features that distinguish BizScreen's template offering — not table stakes, but where to compete.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Admin-only AI generation pipeline (prompt → SVG → validator → review queue → publish) | Lets a single admin curator produce 10-20 quality templates per day vs. 1-2 hand-authored; OptiSigns AI Designer is self-serve (no quality gate); BizScreen's gated pipeline produces higher-consistency output | HIGH | Depends on: svgValidator already exists; needs an LLM API call (Claude or GPT-4o), validator pass/fail loop, admin review queue UI, and approve/reject/edit actions |
| Vertical content depth for three specific industries | Yodeck has ~400 templates across ALL industries; 100 templates per vertical with sub-category specificity (menu board sub-types, daypart variants, clinic vs hospital) beats generic coverage | HIGH | Pure content work — high LOC count but low technical risk; bottleneck is authoring time, not architecture |
| License-cleared third-party SVG bulk import with attribution | No competitor publicly advertises this workflow; it closes the "authoring bottleneck" without depending solely on AI quality | MEDIUM | Needs: multi-file upload UI, attribution capture form, batch validator run, admin review queue (same queue as AI gen), S3 batch thumbnail generation |
| Sub-vertical tagging (e.g., "coffee-shop", "pharmacy", "fast-casual") | OptiSigns organizes by broad industry (Restaurant, Healthcare); sub-vertical tags let small businesses find templates instantly without scrolling through all 100+ vertical templates | LOW | Data work — add sub_vertical tag to each template during authoring; extend fuse.js index |
| Starter packs per vertical | "Get started with Restaurants" pack gives new users an instant working set; existing `template_packs` schema supports this; OptiSigns does not offer grouped starter packs in their public UX | LOW | Reuse AdminStarterPacksPage; create 3 vertical starter packs (one per vertical) during content pass |

### Anti-Features (What Not to Build in v21.0)

Features to explicitly exclude from this milestone's scope. These are NOT anti-features forever — they are explicitly out of scope NOW with a reason.

| Feature | Why Requested | Why to Exclude in v21.0 | What to Do Instead |
|---------|---------------|--------------------------|-------------------|
| Self-serve AI generation for end users | OptiSigns offers this; users will ask "why can't I generate my own?" | Quality control: AI-generated SVG quality is inconsistent; BizScreen's svgValidator rejects ~30-50% of AI outputs; exposing this to users creates frustration; admin-first pipeline lets us validate the pattern before opening it up | Build admin-only pipeline first; gate self-serve behind a future milestone once quality is proven |
| Animated / dynamic templates | Some platforms offer animated GIF or Lottie templates; users will request motion | Architecture complexity: animated SVGs require player rendering changes, thumbnail rasterization changes, and offline player compatibility testing across WebOS/Tizen; out of scope per PROJECT.md | Mark as Future milestone; static SVG templates remain the format for v21.0 |
| Brand Kit persistence across templates | Users will want "apply my brand once, all templates update" | Stateful brand kit requires a new DB schema, UI, and changes to all SVG apply RPCs; too large for this milestone | Mark as Future; current per-session QuickCustomize is sufficient for v21.0 |
| User-submitted templates / marketplace | Community contribution would expand catalog fast | Moderation, IP clearance, payment rails are out of scope; risks brand quality | Not in scope; admin-curated catalog is the model for now |
| Corporate vertical templates | Original scope included Corporate; user's benchmark is OptiSigns vertical depth for QSR/Retail/Healthcare | Corporate is generic and less differentiating than the three targeted verticals; dilutes authoring focus | Defer to v22.0 or later; focus the 300+ new templates on the three stated verticals |
| POS / ERP integration for live menu data | QSR users will want live price pulls from Toast/Square | Integration complexity is a separate workstream from template content | Existing Google Sheets widget already serves live data use case; template content is separate |
| Template versioning / rollback | Enterprise admins may want to revert a template update | No evidence this is requested by target users; adds DB schema complexity | Defer; use git history of migration files as informal versioning for now |

---

## Per-Vertical Template Inventories

### Vertical 1: Restaurants & QSR

Table-stakes template types every restaurant operator expects. Minimum 8 distinct template types, targeting ~100 total templates (variants across portrait/landscape, color schemes, cuisine styles).

| Template Type | Sub-types / Variants | Complexity | Notes |
|--------------|----------------------|------------|-------|
| Full menu board (landscape) | Fast-casual grid, café chalkboard, QSR combo board, fine-dining minimal, food truck compact | MEDIUM | Core SKU — every restaurant needs this; minimum 8 layout variants |
| Daypart menu board | Breakfast, Lunch, Dinner, Happy Hour — same layout brand but different content slots | LOW | Leverages dayparting scheduling already in BizScreen; template design notes daypart context |
| Daily specials / featured item | Hero image + price + description, prominent CTA | LOW | High-frequency use; operator updates content in QuickCustomize text override daily |
| Limited-time offer (LTO) / promotion | Countdown visual, "Today Only", "Weekend Deal" framing | LOW | Urgency-focused; bold typography |
| New item announcement | "Now Available" hero, ingredient callout, allergen note slot | LOW | Common for QSR product launches |
| Social proof / reviews | Google rating display, testimonial quote, star rating | LOW | Trust signal at entry/queue |
| Queue / wait time display | "Your order will be ready in ~X min", numbered queue | MEDIUM | Simple layout; ties to operational signage not just marketing |
| Seasonal campaign | Holiday theming (winter, summer, holidays), seasonal ingredient feature | LOW | Requires annual refresh; build 4 seasonal variants minimum |
| Loyalty program / app download | "Join our rewards", QR code prominent | LOW | QR widget already exists in BizScreen |
| Hours + location | Opening hours table, address, map QR code | LOW | Generic but essential for storefront screens |
| Café / coffee shop specials | Drink menu, "Today's Roast", seasonal latte | LOW | Sub-vertical: coffee shops have distinct visual language from QSR |
| Drive-thru board | Large text, high contrast, combo-focused, speed-optimized layout | MEDIUM | Landscape only; very specific legibility requirements from 15ft away |

**Minimum for vertical launch:** 8 distinct template types × ~8 variants each (portrait/landscape, 2+ color schemes) = ~64 templates minimum; target 100.

---

### Vertical 2: Retail & E-commerce

Table-stakes template types every retailer expects. Minimum 8 distinct types, targeting ~100 total templates.

| Template Type | Sub-types / Variants | Complexity | Notes |
|--------------|----------------------|------------|-------|
| Flash sale / promotion banner | Fullscreen hero, countdown timer variant, percentage-off focus | LOW | Highest urgency template; must feel punchy; 6+ variants |
| New arrivals showcase | Product grid (2-up, 4-up), single product hero, "Just In" badge | LOW | High-turnover content; QuickCustomize image slot critical |
| Product spotlight | Full-bleed product image, feature bullets, price | LOW | Works for flagship or featured SKU promotions |
| Seasonal campaign | Back to School, Holiday, Summer Sale, Valentine's — themed visual language | MEDIUM | At least 6 seasonal themes; each with 2 color variants |
| Customer testimonials / social proof | Star rating, quote, reviewer name; UGC photo variant | LOW | Trust-building at checkout or entrance |
| Social media wall / UGC | Instagram/TikTok feed display, hashtag campaign prompt | LOW | Social feed widget exists in BizScreen; template frames the widget |
| Loyalty program / rewards | "Earn points today", tier display, sign-up QR | LOW | Works across checkout and entry placements |
| Wayfinding / department directory | Department map, floor guide, restroom/fitting room pointer | MEDIUM | Larger retailers only; portrait-oriented; clear arrow system |
| Window / entrance display | Bold, simple, outdoor-legible; high contrast "Sale On Now" style | LOW | Must work at distance; minimal text, maximum impact |
| Product demo / how-to | "How to use", feature callout, before/after (for beauty/wellness crossover) | LOW | Portrait for in-aisle placement; video-slot variant |
| Price / SKU board | Simple price list, compare tiers, "Starting at" format | LOW | Supermarket / grocery crossover |
| Hours + location + contacts | Store hours, phone, QR for directions | LOW | Generic but essential |

**Minimum for vertical launch:** 8 distinct template types × ~8 variants each = ~64 templates minimum; target 100.

---

### Vertical 3: Healthcare & Wellness

Table-stakes template types every clinic/hospital/wellness center expects. Minimum 8 distinct types, targeting ~100 total templates.

| Template Type | Sub-types / Variants | Complexity | Notes |
|--------------|----------------------|------------|-------|
| Waiting room ambient display | Calming nature visual, soft color palette, "We'll be right with you" | LOW | Reduces perceived wait time; portrait and landscape variants |
| Wait time / queue status | "Estimated wait: X minutes", "Now serving #XX", "Dr. Smith is ready for Room 3" | MEDIUM | Simple layout but content requires operator data entry; no live data integration in v21.0 |
| Health tip / wellness fact | Single tip, infographic-style, rotation-ready (no date) | LOW | Evergreen content; high-volume template type; minimum 20 individual health tip designs |
| Appointment reminder / check-in | "Your appointment is at 2PM", "Check in at the front desk", QR for digital check-in | LOW | Reduces front-desk interruptions |
| Provider directory / physician schedule | Name, specialty, hours grid; "Dr. [Name] is in today" | MEDIUM | Simple table layout; portrait-oriented; operator fills in names |
| Vaccination / screening reminder | "Flu shots available", "Annual checkup time", preventive care callout | LOW | Seasonal freshness; health authority tone |
| Emergency / safety alert template | HIGH-contrast, all-red or high-visibility; "Important Notice" header; large body text | LOW | Must look distinct from ambient content; no subtle branding |
| Facility wayfinding | Department directory with arrows, floor map with zone labels | HIGH | Most complex layout in the vertical; requires spatial design skill |
| Staff recognition / internal comms | "Employee of the Month", department update, policy reminder (break room screen) | LOW | Staff-facing, not patient-facing; separate visual language |
| Health program promotion | "Join our wellness program", "Free yoga class", nutrition workshop | LOW | Community health / wellness center sub-vertical |
| Clinic hours + contacts | Hours table, phone, "Accepting new patients" flag, address | LOW | Generic but universally needed |
| Pharmacy / medication info | Drug interaction note, new medication available, pickup hours | LOW | Sub-vertical: pharmacy specifically; avoid medical advice framing |

**Minimum for vertical launch:** 8 distinct template types × ~8 variants each = ~64 templates minimum; target 100.

---

## AI Template Generator: Admin Pipeline UX

### What the Table-Stakes Pattern Looks Like (OptiSigns benchmark)

OptiSigns AI Designer is **self-serve, instant, no review gate**:
1. User describes intent in free text
2. AI generates 1+ designs in <30 seconds
3. Design opens directly in their full editor
4. User publishes immediately to screens

This is FAST but UNGATED — inappropriate for BizScreen's admin-curated catalog because:
- AI-generated SVGs regularly fail structural rules (missing viewBox, inline styles, unsafe `<script>`, broken paths)
- BizScreen's `svgValidator` already rejects malformed SVGs from human uploaders; AI output would have higher rejection rates
- Catalog quality is the differentiator; gating protects it

### BizScreen Admin-Only AI Pipeline (Recommended Pattern)

**Table stakes for the pattern to work:**

| Step | What Happens | Requirement |
|------|-------------|-------------|
| 1. Prompt entry | Admin enters a natural-language prompt ("Create a QSR combo board for a burger restaurant, landscape, dark background, 3 combo options with prices") | Admin-only UI; no end-user access |
| 2. LLM call | Backend calls Claude or GPT-4o API to generate SVG markup | Prompt must include: viewBox specification, no `<script>` tags, use named colors not arbitrary hex, include `data-text-slot` + `data-color-slot` attributes per BizScreen SVG convention |
| 3. svgValidator gate | Generated SVG runs through existing `svgValidator` (6 rules); if fail → auto-retry up to 2× with error message appended to prompt | svgValidator already ships; dependency satisfied |
| 4. Admin review queue | Passed SVGs surface in a "Pending Templates" admin queue with rendered preview; failed SVGs show validator error and raw SVG for manual fix | New UI: `AdminTemplateQueuePage` — list of pending items with approve/edit/reject actions |
| 5. Thumbnail generation | On approve, `@resvg/resvg-js` rasterizer runs; PNG uploaded to S3; template marked `published = true` | Rasterizer pipeline already ships; needs batch-mode invocation |
| 6. Published | Template appears in `gallery_templates` VIEW and is searchable | No further steps |

**Complexity:** HIGH overall (LLM API integration, retry loop, review queue UI, batch thumbnail pipeline). But individual components have known complexity: LLM call = MEDIUM, validator retry = LOW (reuses existing), review queue UI = MEDIUM, thumbnail pipeline = LOW (reuses existing).

**Dependency chain:**
```
AI Generator
    └──requires──> svgValidator (EXISTS)
    └──requires──> @resvg/resvg-js rasterizer (EXISTS)
    └──requires──> AdminTemplateQueuePage (NEW)
    └──requires──> LLM API integration (NEW — Claude or GPT-4o)
    └──requires──> SVG prompt engineering templates (NEW — one per template type)
```

### Anti-patterns to avoid in AI generator

- **Generating raster images embedded in SVG** — LLMs will hallucinate `<image href="data:image/png;base64,...">` blobs; prompt must prohibit this
- **Free-form color values** — AI output uses arbitrary hex codes that break QuickCustomize color slot detection; prompt must constrain to `data-color-slot` attribute convention
- **Missing viewBox** — SVG without viewBox renders at wrong scale in gallery; validator rule already catches this but prompt should pre-empt it
- **Assuming the first LLM output is usable** — expect 40-60% first-pass validator failure rate; build retry loop into the pipeline before surfacing to admin

---

## Bulk SVG Import Pipeline

### What Competitors Do

No digital signage platform publicly documents a bulk SVG import workflow for admins/curators. The pattern is reconstructed from general digital signage CMS admin tools (Navori, Poppulo, Xibo) that support batch asset upload with metadata tagging.

### Recommended Pattern for BizScreen

**Table stakes for the workflow:**

| Step | What Happens | Requirement |
|------|-------------|-------------|
| 1. Multi-file upload | Admin drops N SVG files into an upload zone | Extend existing admin SVG upload UI to accept multi-file; file size and type validation client-side |
| 2. Attribution form | Per-batch (not per-file): source URL, license type (CC0, CC-BY, purchased), author/creator name | Simple form before batch starts; stored as JSONB metadata on each `svg_templates` row |
| 3. Batch svgValidator run | Each file runs through existing `svgValidator`; results table shows file-by-file pass/fail with error details | Reuse svgValidator; add batch-mode wrapper that returns per-file results array |
| 4. Pass/fail review | Admin reviews validator errors inline; can remove failed files or fix and re-upload | Table UI with inline error messages; "Remove" action per file |
| 5. Metadata assignment | Assign category, vertical, sub-vertical tags, orientation to all files in batch (or per-file override) | Tag assignment UI; vertical picker required |
| 6. Batch thumbnail generation | On confirm, rasterizer runs for all passed files; S3 upload | Batch mode for `@resvg/resvg-js`; already used in migration 175 |
| 7. Published | Templates appear in gallery | Same as AI pipeline |

**Complexity:** MEDIUM. No new architectural patterns — reuses validator, rasterizer, S3 upload, admin auth. New work: multi-file upload UI, attribution form, batch runner, per-file result table.

**Dependency chain:**
```
Bulk Import Pipeline
    └──requires──> svgValidator (EXISTS)
    └──requires──> @resvg/resvg-js rasterizer (EXISTS)
    └──requires──> Admin multi-file upload UI (NEW — extend existing single-file uploader)
    └──requires──> Attribution metadata schema (NEW — JSONB column on svg_templates)
    └──requires──> Batch validator runner (NEW — thin wrapper over existing validator)
```

---

## Feature Dependencies

```
Gallery virtualization (TGAL-F1)
    └──requires──> Catalog scale-up to ~500 templates
                       └──requires──> AI generator pipeline OR bulk import OR hand-authoring
                                          └──requires──> svgValidator (EXISTS)
                                          └──requires──> Thumbnail rasterizer (EXISTS)

Polotno QuickCustomize (TPRV-F1)
    └──requires──> Polotno JSON mutation primitives (research needed)
    └──enhances──> Any Polotno template_library entries in the new verticals

Admin review queue
    └──shared-by──> AI generator pipeline
    └──shared-by──> Bulk import pipeline
    (build once, reuse for both)

Vertical starter packs
    └──requires──> Vertical template content (must exist first)
    └──requires──> template_packs schema (EXISTS)
    └──enhances──> Onboarding StarterPackStep (EXISTS)

Sub-vertical tagging
    └──enhances──> Gallery filter chips (EXISTS — just add new tag values)
    └──enhances──> fuse.js search index (EXISTS — tags already indexed)
```

### Dependency Notes

- **Admin review queue shared by AI gen and bulk import:** Build one `AdminTemplateQueuePage` that handles both sources; AI-generated items and bulk-imported items both flow through the same approve/reject UI. This avoids two separate admin queues.
- **Gallery virtualization is triggered by catalog scale-up:** TGAL-F1 should be activated early in the milestone (after first ~200 templates land) so performance degradation is never visible to users.
- **Polotno QuickCustomize (TPRV-F1) is independent** of content work — it can be phased in parallel with catalog authoring, but if any new vertical templates use `template_library` (Polotno) rather than `svg_templates`, TPRV-F1 is blocking.

---

## MVP Definition for v21.0

### Must Ship (v21.0 launch criteria)

- [ ] Gallery virtualization (`@tanstack/react-virtual`) active — sub-second scroll at 500 templates
- [ ] At minimum 300 net-new templates seeded (existing 127 + 300 new = ~427 total, close enough to the ~500 target)
- [ ] At minimum 80 templates per vertical across the three named verticals
- [ ] Vertical filter available in gallery (super-category above existing 15 categories)
- [ ] Admin publish/unpublish toggle for all templates
- [ ] Attribution metadata stored for all third-party-sourced templates
- [ ] Bulk import pipeline operational (multi-file upload, batch validator, attribution form, batch thumbnail)
- [ ] At least one working end-to-end AI generation run (prompt → SVG → validator → admin queue → published template) even if volume is low

### Add After Initial Content (v21.x)

- [ ] Polotno QuickCustomize (TPRV-F1) — unblocks Polotno vertical templates if any were added
- [ ] Sub-vertical tagging in gallery filter UI
- [ ] Vertical starter packs (3 packs, one per vertical)
- [ ] AI generator scaled-up output (once first-pass quality is validated, increase volume)

### Future (v22.0+)

- [ ] Brand Kit persistence across templates
- [ ] Animated / dynamic templates
- [ ] Self-serve AI generation for end users
- [ ] Corporate vertical templates
- [ ] Template versioning and rollback
- [ ] POS/ERP live data integration with menu board templates

---

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Gallery virtualization (TGAL-F1) | HIGH — blocks usability at scale | LOW (package already in stack) | P1 |
| Vertical content — Restaurants (100 templates) | HIGH — core milestone goal | HIGH (authoring volume) | P1 |
| Vertical content — Retail (100 templates) | HIGH — core milestone goal | HIGH (authoring volume) | P1 |
| Vertical content — Healthcare (100 templates) | HIGH — core milestone goal | HIGH (authoring volume) | P1 |
| Admin review queue UI | MEDIUM — prerequisite for AI gen + bulk import | MEDIUM | P1 |
| Bulk SVG import pipeline | HIGH — fastest path to catalog scale | MEDIUM | P1 |
| Admin publish/unpublish toggle | MEDIUM — catalog hygiene | LOW | P1 |
| AI generator pipeline (prompt → SVG → queue) | MEDIUM — differentiator but low initial volume | HIGH | P2 |
| Polotno QuickCustomize (TPRV-F1) | MEDIUM — parity for Polotno templates | MEDIUM | P2 |
| Sub-vertical tagging | MEDIUM — discoverability improvement | LOW | P2 |
| Vertical starter packs | MEDIUM — onboarding quality | LOW (schema exists) | P2 |
| Attribution metadata schema | LOW direct user value — compliance/legal | LOW (JSONB column) | P1 (legal/compliance) |

---

## Competitor Feature Analysis

| Feature | OptiSigns | Yodeck | Rise Vision | BizScreen v21.0 Approach |
|---------|-----------|--------|-------------|--------------------------|
| Template count | 1000+ (self-reported) | 400+ | 600+ (education-focused) | Target ~500 (three specific verticals, quality-gated) |
| Vertical organization | 15 industry pages | Organized by use case (menu board, hotel, healthcare, events) | Education-first | Three named verticals (Restaurants, Retail, Healthcare) as primary nav |
| AI generation | Self-serve, instant, no review gate | No AI generation | No AI generation | Admin-only, gated through svgValidator + review queue |
| Bulk template authoring | Not publicly documented | Not publicly documented | Not publicly documented | Explicit bulk import pipeline with attribution + batch validation |
| QuickCustomize | Yes (full Designer app) | Template editor with brand colors | Limited | Already ships for SVG; extend to Polotno via TPRV-F1 |
| Gallery virtualization | Unknown (browser-rendered) | Unknown | Unknown | `@tanstack/react-virtual` (explicit launch criterion) |
| Admin review queue | No (self-serve) | No | No | Yes — shared queue for AI gen + bulk import |
| Starter packs | Not in public UX | Not found | Not found | Yes — extend existing `template_packs` schema with vertical packs |

---

## Sources

- OptiSigns template library and vertical industry pages: https://www.optisigns.com/templates, https://www.optisigns.com/industries/restaurant, https://www.optisigns.com/industries/retail, https://www.optisigns.com/industries/healthcare
- OptiSigns AI Designer: https://www.optisigns.com/post/optisigns-ai-designer-idea-design-seconds
- Yodeck template library: https://www.yodeck.com/free-digital-signage-templates/
- LOOK DS healthcare: https://www.lookdigitalsignage.com/healthcare
- LOOK DS retail templates: https://www.lookdigitalsignage.com/blog/digital-signage-templates-for-retail
- truDigital healthcare templates: https://www.trudigital.com/blog/customizable-digital-signage-templates-for-healthcare
- PosterMyWall retail template guide: https://www.postermywall.com/blog/2025/04/14/10-must-have-digital-signage-displays-for-your-retail-store-customizable-templates/
- LOOK DS restaurant / QSR: https://www.lookdigitalsignage.com/digital-menu/qsr
- BizScreen PROJECT.md + MILESTONES.md (codebase context, v20.0 shipped features)

---

*Feature research for: BizScreen v21.0 Templates at Scale*
*Researched: 2026-05-06*
