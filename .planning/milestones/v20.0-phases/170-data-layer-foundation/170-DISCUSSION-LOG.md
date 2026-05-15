# Phase 170: Data Layer Foundation - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-15
**Phase:** 170-data-layer-foundation
**Areas discussed:** (all delegated — user answered "you decide")

---

## Gray Areas Presented

| Option | Description | Selected |
|--------|-------------|----------|
| VIEW schema & discriminator | Column set in gallery_templates — wide (all columns from both tables) vs minimal normalized; include editor_type discriminator ('svg'\|'polotno') to route apply flow in Phase 172. | |
| RLS audit & global templates | How svg_templates rows with tenant_id/created_by NULL should be treated; policy style; verification method. | |
| LOCAL_SVG_TEMPLATES seed identity | Preserve hardcoded IDs so existing refs keep working, or assign new DB UUIDs and audit callers now. | |
| Service cutover strategy | Hard-delete legacy fetchSvgTemplates in this phase, or leave as deprecation shim until Phase 171. | |

**User's choice:** "you decide" — full delegation to Claude across all four areas.

**Notes:** User invoked `/gsd-discuss-phase 170` and, when presented with the four gray areas (multi-select), responded with "you decide". No interactive Q&A followed. Claude made all decisions based on v20.0 research synthesis (`.planning/research/SUMMARY.md`), direct codebase inspection, and existing migration conventions. Decisions are documented in CONTEXT.md `<decisions>` section with rationale; user should review and override by editing CONTEXT.md before planning if any decision conflicts with intent.

---

## Claude's Discretion

- VIEW schema: wide with `editor_type` discriminator and `source_table` for observability (D-02, D-03)
- VIEW type: regular VIEW (not materialized) given catalog scale (D-01)
- FTS column: deferred to v20.1 (D-06)
- Service shape: single `fetchGalleryTemplates` function, raw row return, no caching (D-07, D-08, D-09)
- RLS remediation: drop both existing SELECT policies, replace with scoped policy using `tenant_id IS NULL OR created_by = auth.uid()` (D-13, D-14)
- RLS verification: belt-and-suspenders SQL + Playwright (D-15)
- Seed ownership: `tenant_id = NULL, created_by = NULL` (D-17)
- Seed IDs: deterministic UUID v5 from slug + new `slug` column on svg_templates (D-18)
- Cutover: delete LOCAL_SVG_TEMPLATES, keep fetchSvgTemplates as DB-only adapter until Phase 171 (D-19, D-20)
- Migration: single file `111_gallery_templates_view_and_rls.sql`, no DOWN (D-21, D-22, D-23)

## Deferred Ideas

- tsvector FTS column — v20.1
- `use_count` increment on apply — Phase 175
- `template_library` RLS re-audit — not required by TDAT-03
- Materialized view variant — not needed at current scale
- `content_templates` pack integrity check — Phase 173
