# OptiSigns Templates — Authenticated Walkthrough

**Researched:** 2026-05-06
**Method:** Live navigation of `https://app.optisigns.com/app/templateManagement` (authenticated session) via Playwright MCP
**Researcher:** Claude Opus 4.7 + user logged-in session
**Purpose:** Ground v21.0 Templates at Scale design decisions in observed competitor UX, not just marketing-page claims

---

## Surfaces Walked

| Surface | URL | Screenshot |
|---------|-----|------------|
| Gallery overview | `/app/templateManagement` | [01](optisigns-screenshots/optisigns-01-gallery-overview.png) |
| Template detail / preview modal | `/app/templateManagement` (modal over gallery) | [02](optisigns-screenshots/optisigns-02-template-detail.png) |
| AI Designer | iframe `/ai` (sub-app route) | [03](optisigns-screenshots/optisigns-03-ai-designer.png) |
| Category filter applied (Restaurants) | `/app/templateManagement` (no URL change) | [04](optisigns-screenshots/optisigns-04-restaurants-filter.png) |

---

## Architectural Observations

### 1. The Templates page is an embedded sub-app (iframe)

The OptiSigns shell (top nav: Screens / Files-Assets / Playlists / Schedules / Templates / Engage / Analytics) loads the template UI inside an `<iframe id="templateFrame">`. Routes inside the iframe (`/`, `/ai`, `/designs`, `/templates/tag/<tag>`, `/templates/search/<q>`) are sub-app paths, not OptiSigns app paths — navigating directly to `https://app.optisigns.com/ai` redirects elsewhere because that route doesn't exist at the shell level.

**Implication for BizScreen:** v20.0 already keeps `TemplateGalleryPage` as a regular React Router route inside the SPA — simpler than an iframe, and we can keep going that way. No reason to mimic the iframe split.

### 2. Filter state is NOT URL-synced

Clicking "Restaurants" in the Categories filter changed the grid and breadcrumb but the page URL stayed `/app/templateManagement`. There is no shareable URL for "Restaurants templates only".

**Implication:** v20.0 BizScreen already URL-syncs filter / sort / search state (TGAL/TDSC requirements). v21.0 TVRZ-04 explicitly preserves this. **BizScreen is ahead of OptiSigns on this dimension.** Don't lose it during virtualization.

### 3. Single-CTA detail modal — validates `df2926e2`

Clicking a template card opens a modal with:
- Large preview (left) with prev/next chevrons
- Right rail: name, dimensions (1920×1080), **single "Use this Template" CTA**, 10 descriptive tags
- Below preview: **"See More Like This"** content-based recommendation row

There is **no pre-apply customize step**. "Use this Template" opens their full Designer — same architecture BizScreen landed on with `df2926e2` (2026-05-04, "feat(templates): apply template directly on card click").

**Implication:** BizScreen's revert was the industry pattern. The piece BizScreen is missing relative to OptiSigns is the lightweight preview modal as a *confirmation* step (not a customize step) and the "See More Like This" recommendation row. Both are v21.x candidates, not v21.0 requirements.

---

## Filter Taxonomy: 8 dimensions vs BizScreen's 3

| Dimension | OptiSigns count | Examples | BizScreen v21.0 status |
|-----------|---|----------|------------------------|
| Categories | 40+ | All, Featured, Popular, Holidays, Menu, Restaurants, Promotion Series | ✓ 15 generic categories already shipped (TVRT-05 preserves) |
| Orientation | 2 | Landscape, Portrait | ✓ Already shipped |
| **Visual Mode** | 2 | Static, Animation | ✗ Out of scope (animated templates deferred) |
| **Industries** | 20+ | Retail, Hospitality, Food & Beverage, Services, Corporate, Education, Fitness, Community + 12 more | △ Tagged (TVRT-04) but **no filter chip** (TCAT-F2 deferred) |
| **Template Types** | 15+ | Promotion, Event, Holiday, Announcement, celebration | ✗ Concept embedded in TVRT-01..03 success criteria but no first-class filter |
| **Visual Styles** | 15+ | casual, Playful, Professional, formal, celebratory | ✗ Not in v21.0 |
| **Color Moods** | 10+ | Vibrant, Warm, Energetic, festive, patriotic | ✗ Not in v21.0 |
| Tags | 20+ | Animated, Dynamic, Sale, Motion, Video | ✓ fuse.js indexes them |

### Key insight: orthogonal axes, not nested

OptiSigns separates **Categories** ("Holidays", "Menu") from **Industries** ("Restaurants", "Healthcare") from **Template Types** ("Promotion", "Event") — three orthogonal axes that a single template carries simultaneously. BizScreen v21.0 conflates them into one 15-category enum + a vertical tag.

**Implication for v21.x:** the natural evolution of BizScreen's taxonomy is to split into orthogonal axes (category × vertical × template-type) rather than adding sub-vertical tags. This would let users filter "Menu templates AND Restaurants AND Promotion type" — a depth of discoverability the current single-enum model can't reach.

---

## AI Designer (`/ai` inside the templates iframe)

**Visible UI:**
- Hero section: "OptiSigns AI Designer" + ✨ icon
- **Single text input:** "Describe your idea..." with image-upload icon (left), orientation dropdown (Landscape default), submit arrow (right)
- Disclaimer: "OptiSigns AI can make mistakes. Please check for accuracy. See terms. Give Feedback."
- "Explore AI Prompts" cards — 7+ pre-curated example prompts, **each tagged with category**:

| Tag | Example prompt |
|-----|----------------|
| Menu | "Promote Mother's Day brunch special featuring mimosas" |
| Retail | "Announce a flash sale for summer dresses that ends in 8 hours" |
| Announcement | "Alert residents about pool maintenance this week" |
| Reminder | "Display current wait times and reminders at your dental clinic" |
| Wayfinding | "Guide your guests to the event" |
| Instructions | "Create a reminder for a fire drill at the office" |
| Food | (partially visible — implied) |

### Critical findings for v21.0 TGEN

1. **Single-prompt UX is the right baseline.** OptiSigns doesn't ask the user to pick a category up front — they infer from prompt content. v21.0 TGEN-01 (single prompt → SVG) matches this baseline.

2. **Image upload as ground-truth input** — OptiSigns supports feeding a reference image to anchor generation. Not in v21.0; **v21.x candidate**.

3. **Orientation dropdown is essential.** Covers TCAT-02 portrait+landscape requirements at generation time. Add a similar dropdown to BizScreen's admin generator.

4. **The category-tagged example prompts are a free taxonomy hint.** Those 6+ tags (Menu / Retail / Announcement / Reminder / Wayfinding / Instructions / Food) are exactly the prompt-library partition that v21.0's deferred TGEN-F1 should target. **OptiSigns demonstrates this is a critical-path quality multiplier, not polish** — they ship it, they curate prompts per category, and the category becomes part of the user-facing UX. (See "Scope adjustment" below.)

5. **OptiSigns is self-serve, no admin gate, no review queue.** v21.0 deliberately diverges (TGEN-03 admin-only + TADM admin queue). **Keep this divergence** — quality gating is BizScreen's differentiator vs OptiSigns's volume play.

6. **Disclaimer + Feedback link** — accountability surface, not a gate. Without an admin review queue, OptiSigns relies on users to self-correct. BizScreen's queue is a stronger gate.

---

## Layout patterns

### Home view: hero + horizontal carousels + flat grid

- Hero search section with 5 pre-populated seasonal queries + "Try AI Designer" button
- **Horizontal scrollable carousels** per category (Featured, Popular, Holidays and Observances, Menu, Restaurants, Shopping, Event Planning) — each with "View all" link
- Bottom: flat **All Designs** grid (masonry-ish)
- Each carousel ~15-20 templates visible, with right-arrow scroll affordance

### Category view: branded hero + masonry grid

When a Category is selected:
- Breadcrumb header ("Home > Restaurants")
- **Branded category hero banner** (orange/brown gradient for Restaurants, presumably different colors per category) with category title + same 5 search-suggestion chips
- **Masonry grid** of templates (variable card heights — portraits are taller, landscapes are wider, mixed in same view)

### Implication for BizScreen

- **Masonry layout is a content-discovery upgrade** for mixed-orientation catalogs. v20.0 BizScreen uses a strict card grid. TanStack Virtual (TVRZ-01) supports variable-height items via `useVirtualizer({ measureElement })` — worth considering during Phase 179 implementation. Not a v21.0 requirement, but the same package handles it.
- **Branded category hero banners** are pure design work — high visual polish, no architectural change. v21.x candidate when the design system has time for category-specific theming.
- **Horizontal carousels per category** on home view — already partially shipped (StarterPacksStrip). Could be expanded to per-category carousels in v21.x without major architectural changes.

---

## What v21.0 Will Do **Better** Than OptiSigns

1. **URL-synced filter / sort / search state** — OptiSigns doesn't share URLs (TGAL/TDSC v20.0; TVRZ-04 preserves)
2. **Admin-curated AI generation with `svgValidator` ingest gate** (TGEN-05) — OptiSigns has no quality gate; their disclaimer "AI can make mistakes" is an apology, not a fix
3. **Atomic single-RPC apply** (mig 168/170/173/174) — race-safe; OptiSigns architecture opaque
4. **Auto-retry on validator fail** (TGEN-02) — OptiSigns presumably surfaces failures to the end user; BizScreen's queue + retry hides them
5. **Per-vertical depth** — ≥80 templates × ≥8 distinct types in 3 verticals beats OptiSigns's broader-but-shallower coverage
6. **Self-healing player + offline capability** — out of scope for templates but a platform differentiator OptiSigns can't match

## What v21.0 Will Lag (deferred to v21.x)

1. Vertical filter chip (TCAT-F2) — OptiSigns has it as "Industries"
2. Sub-vertical tags (TCAT-F1) — OptiSigns embeds in tags + template names
3. Per-vertical starter packs (TCAT-F3) — implicit in OptiSigns category carousels
4. Publish/unpublish toggle (TCAT-F4) — OptiSigns has staff curation
5. ~~Per-template-type AI prompt library (TGEN-F1)~~ — **promoted to v21.0 TGEN-06 based on this walkthrough**. See scope adjustment below.
6. Branded category hero banners — pure design work
7. Image upload as AI generation input — not in v21.0 or v21.x roadmap; future candidate
8. "See More Like This" content-based recommendation row in detail modal — not in v21.0 (modal itself was removed in df2926e2)

---

## Scope adjustment driven by this walkthrough

**TGEN-F1 (per-template-type prompt library)** was deferred to v21.x during requirements scoping on 2026-05-06. The OptiSigns walkthrough showed that competitors treat per-category prompt curation as critical-path infrastructure (visible in their "Explore AI Prompts" card row, with each example tagged Menu / Retail / Announcement / etc.) — not as a polish item.

Combined with FEATURES.md's projected 40-60% first-pass validator failure rate for raw LLM output, a curated prompt library is the highest-leverage quality lever available. Auto-retry-2× alone (TGEN-02) does not cover the failure modes that come from missing domain framing in the base prompt.

**Promoted to v21.0 active scope as TGEN-06.** Folded into Phase 177 (AI Generation Pipeline + Admin Queue UI) requirement set. The category taxonomy comes for free from the FEATURES.md per-vertical inventories — minimum 6 curated prompts (one per primary template type: Menu / Promo / Announcement / Reminder / Wayfinding / Health Tip) covering the three named verticals.

See REQUIREMENTS.md TGEN-06 + ROADMAP.md Phase 177 success criteria.

---

## Concrete UX patterns to mirror or diverge from

| OptiSigns pattern | v21.0 decision | Rationale |
|---|---|---|
| 8 filter dimensions (Categories, Orientation, Visual Mode, Industries, Template Types, Visual Styles, Color Moods, Tags) | **Diverge:** keep 3 (categories, orientation, tags) + vertical tag | Discoverability ROI is non-linear — 8 dimensions overwhelm at <500 templates; v21.x can split orthogonally |
| Single-CTA "Use this Template" card-click flow | **Mirror:** already shipped via df2926e2 | Industry-validated UX; BizScreen converged on this independently |
| Detail modal as preview-confirmation | **Defer to v21.x:** modal was removed in df2926e2 | Lightweight modal (no customize) is a v21.x judgment call |
| AI Designer single-prompt UX | **Mirror:** TGEN-01 baseline | Industry standard; matches BizScreen's intended pattern |
| AI Designer self-serve, no review gate | **Diverge:** admin-only + queue | Quality gate is BizScreen's differentiator |
| Per-category curated example prompts | **Mirror:** promoted as TGEN-06 | Critical-path quality multiplier (see scope adjustment) |
| Image upload as AI generation input | **Defer:** v22.0+ candidate | Not on near-term roadmap |
| Masonry grid for mixed orientations | **Defer to v21.x:** TanStack Virtual supports it | Polish, not blocking |
| Branded per-category hero banners | **Defer to v21.x** | Pure design work |
| URL-synced filter state | **Mirror what BizScreen already does:** preserve in TVRZ-04 | BizScreen ahead of OptiSigns here |
| Atomic single-RPC apply | **Keep BizScreen's lead** | OptiSigns architecture opaque; race-safety is a differentiator |

---

*Walkthrough captured 2026-05-06. Screenshots in `.planning/research/optisigns-screenshots/`. Validated through authenticated Playwright MCP session against `app.optisigns.com`.*
