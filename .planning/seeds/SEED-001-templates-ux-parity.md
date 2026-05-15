---
seed_id: SEED-001
planted_during: v21.0 Templates at Scale (during requirements scoping, after OptiSigns authenticated walkthrough)
planted_date: 2026-05-06
trigger_when: starting milestone after v21.0 ships
status: planted
---

# SEED-001: Templates UX Parity (target v22.0)

Layer OptiSigns-class browsing UX on top of the v21.0 catalog + AI-gen + virtualization foundation. v21.0 built the machine (admin AI pipeline, ~500 templates, virtualized gallery); v22.0 should build the storefront (filter taxonomy, masonry, branded category banners, detail modal with recommendations, vertical filter chip, sub-vertical tags, starter packs, publish toggle, image-input AI gen, bulk import pipeline).

## When to Surface

Surface this seed during the next `/gsd-new-milestone` run after v21.0 ships. Match conditions:

- Milestone goals mention templates, gallery, browsing, filters, OptiSigns parity, or template UX
- User asks "what next" after v21.0 ships
- User mentions discoverability, vertical-specific browsing, or template polish
- New milestone targets the v21.0 deferred-list items (TCAT-F1/F2/F3/F4, TGEN-F3, TPIPE-IMP-F1..F4, TPER-F1)

## Why This Matters

The 2026-05-06 OptiSigns authenticated walkthrough (`.planning/research/OPTISIGNS-WALKTHROUGH.md`) surfaced **~15 distinct UX-parity gaps** between OptiSigns Templates Management and BizScreen post-v21.0. The user explicitly stated they want to "clone the template page just like OptiSigns" but agreed to keep v21.0 lean (recommended) and queue the storefront work for v22.0.

The competitive gap is real: OptiSigns has 8 filter dimensions (Categories × Orientation × Visual Mode × Industries × Template Types × Visual Styles × Color Moods × Tags) vs BizScreen's 3, plus masonry, branded banners, and content-based recommendations. Catalog volume parity (≥500 templates) lands in v21.0; storefront parity is v22.0's job.

If v22.0 isn't framed as "Templates UX Parity" explicitly, the deferred items risk drifting milestone-by-milestone without ever being prioritized as a coherent theme.

## Recommended v22.0 Scope (preliminary; refine at /gsd-new-milestone)

**Tier 1 — Quick wins (low effort, high discoverability ROI):**
- Vertical filter chip in gallery (TCAT-F2)
- Sub-vertical tagging — coffee-shop, pharmacy, fast-casual, urgent-care, etc. (TCAT-F1)
- Vertical starter packs, one per vertical (TCAT-F3)
- Admin publish/unpublish toggle for catalog hygiene (TCAT-F4)
- Hero search with seasonal pre-populated queries (mirrors OptiSigns pattern)
- Masonry layout for mixed-orientation grid (TanStack Virtual `useVirtualizer({ measureElement })`)

**Tier 2 — Layered UX (medium effort, parity-critical):**
- Orthogonal filter taxonomy — split current single 15-category enum into orthogonal axes (Category × Vertical × Template Type × Visual Style × Color Mood). Schema migration affects every existing template — high-risk, do once the catalog has stabilized at ~500.
- Horizontal carousels per category on gallery home view
- Branded per-category hero banners — design-system theme tokens per vertical/category
- Detail modal with prev/next chevron navigation + "See More Like This" content-based recommendation row
- Image upload as AI generation input (TGEN-F3)

**Tier 3 — Pipeline parity (medium effort, scale-critical):**
- Bulk SVG import pipeline (TPIPE-IMP-F1..F4): multi-file upload, batch validator, attribution form (source/license/author), gallery-side attribution display, license-cleared source documentation

## Explicitly NOT in v22.0 (defer further to v23.0+)

- **Animated / dynamic templates** (Visual Mode = Animation in OptiSigns) — own milestone (player rendering + thumbnail rasterization for animated content + WebOS/Tizen offline-player compatibility testing). Too big to fold in.
- **Self-serve AI generation for end users** — keep as deliberate divergence from OptiSigns. Quality gate is BizScreen's differentiator.
- **Brand Kit persistence** — own milestone. Stateful brand kit = new schema + UI + apply RPC changes.

## Surfacing Notes for /gsd-new-milestone

When the workflow's seed-scan step (Step 2.5) finds this seed, recommend including it as the candidate theme. Default to **all three tiers in scope** for v22.0 — they're all storefront UX and ship coherently together. If the user wants leaner, drop Tier 3 first (bulk import is the lowest-leverage of the three for OptiSigns parity since OptiSigns doesn't publicly document bulk-import workflows).

If v21.0 itself slips or scope creeps, this seed remains valid for whatever the post-v21.0 milestone is named. The trigger is "after v21.0 ships", not a specific version number.
