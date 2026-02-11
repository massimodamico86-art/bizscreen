# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-10)

**Core value:** Screens reliably display the right content at the right time, even when offline
**Current focus:** v3.0 Creative Experience — Phase 50 in progress

## Current Position

Phase: 50 of 50 (Editor Polish)
Plan: 2 of 2 in current phase
Status: Phase 50 complete -- all plans executed
Last activity: 2026-02-11 — Phase 50 Plan 02 executed (1/1 tasks)

Progress: [██████████] 100%

## Milestones Shipped

| Milestone | Phases | Plans | Shipped |
|-----------|--------|-------|---------|
| v1 Production Release | 1-12 | 75 | 2026-01-24 |
| v2 Templates & Platform | 13-23 | 39 | 2026-01-27 |
| v2.1 Tech Debt Cleanup | 24-29 | 11 | 2026-01-28 |
| v2.2 Onboarding Polish | 30-35 | 16 | 2026-02-05 |
| v2.3 Production Hardening | 36-41 | 18 | 2026-02-09 |
| v2.4 Tech Debt Zero | 42-45 | 11 | 2026-02-10 |

## Performance Metrics

**Cumulative (v1 through v2.4):**
- Total plans executed: 174
- Total phases: 47 completed
- Total codebase: ~361,000 LOC JavaScript/JSX/CSS/JSON

**v3.0 Creative Experience:**

| Phase | Plan | Duration | Tasks | Files |
|-------|------|----------|-------|-------|
| 46 | 01 | 3min | 2 | 4 |
| 46 | 02 | 1min | 1 | 1 |
| 47 | 01 | 2min | 1 | 3 |
| 47 | 02 | 2min | 1 | 1 |
| 48 | 01 | 4min | 2 | 6 |
| 48 | 02 | 3min | 2 | 2 |
| 49 | 01 | 4min | 2 | 2 |
| 49 | 02 | 3min | 2 | 2 |
| 50 | 01 | 1min | 2 | 2 |
| 50 | 02 | 3min | 1 | 1 |

## Accumulated Context

### Key Research Insights

- Polotno runs in an isolated React 18 iframe -- stock asset panels MUST be built inside the iframe, not bridged via postMessage
- `unsplash-js` npm package is archived -- use raw HTTP fetch to Unsplash REST API
- Unsplash API has 4 mandatory compliance requirements: attribution with UTM, hotlinking CDN, download tracking endpoint, no re-hosting
- Existing Framer Motion (12.x) and Lucide React (0.548+) cover all animation and icon needs -- zero new dependencies
- Unsplash hotlinking vs offline player conflict needs resolution during Phase 46

### Decisions

- [46-01] Database-backed cache over Redis/Upstash -- avoids external dependency, PostgreSQL already available in Edge Functions
- [46-01] Hourly window rate limiting (date_trunc) over sliding window -- simpler, adequate for per-tenant throttling
- [46-01] Graceful degradation: rate limit check failures and download tracking errors do not block user requests
- [46-02] Fire-and-forget pattern for download tracking -- never blocks user workflow
- [46-02] Input validation throws errors rather than returning null for stricter editor integration
- [47-01] Fixed height (h-60/h-80) over aspect-ratio for thumbnails to prevent layout shift
- [47-01] cardLift preset uses y-translate + scale + boxShadow for premium hover feel
- [47-02] Horizontal scroll cards kept as simple ScrollCard, not DSTemplateCard (different layout context)
- [47-02] Raw searchQuery drives UI visibility, debouncedSearch drives filtering (immediate feedback + 300ms debounce)
- [47-02] Composite key on motion.div container for re-animation on search/filter changes
- [48-01] Scroll restore gated on loading===false with requestAnimationFrame for post-render DOM scroll
- [48-01] isFromTemplate uses !!urlTemplateId && !urlDesignId so saved designs do not trigger customize panel
- [48-02] Dark theme (bg-gray-800) for QuickCustomizePanel to match editor chrome
- [48-02] Dominant color replacement over per-object targeting for simpler brand color application UX
- [48-02] Canvas resize uses 250ms timeout after panel toggle to account for AnimatePresence animation
- [49-01] Removed hardcoded Unsplash API key -- all calls now go through server-side proxy
- [49-01] Attribution overlay on hover using group/opacity-0 pattern for clean UX
- [49-01] Drag data uses dual format (text/plain + application/json) for maximum compatibility
- [49-01] Dropped images scale to 40% of canvas (vs 50% for click-insert) to leave room for positioning
- [49-02] Iconify API with 5 curated prefixes (mdi,lucide,tabler,heroicons,fa-solid) to avoid complex emoji SVGs
- [49-02] loadSVGFromString for vector insertion preserving scalability over rasterized FabricImage
- [49-02] Single SVG objects insert directly without Group wrapper for simpler object tree
- [49-02] Fallback to rasterized image if SVG parsing returns empty result
- [50-01] Conditional scaleTap spread for disabled undo/redo buttons instead of always applying
- [50-01] Dark-themed custom overlay instead of design-system Modal to match editor chrome
- [50-01] Mac detection via navigator.platform.includes('Mac') on mount with useState initializer
- [50-02] Confetti zIndex 10001 above all editor overlays
- [50-02] Single undoRedoToast state replaces on rapid actions instead of stacking
- [50-02] ? key checks activeObj.isEditing to avoid triggering during Fabric text editing
- [50-02] 2-second saveSuccess timeout before reverting to Save button

### Blockers/Concerns

- Unsplash offline caching question: TOS may conflict with offline player requirement. Needs clarification before Phase 46 implementation.

## Session Continuity

Last session: 2026-02-11
Stopped at: Completed 50-02-PLAN.md
Resume file: None
Next: Phase 50 complete -- v3.0 Creative Experience milestone ready for review

---
*Updated: 2026-02-11 — Phase 50 complete (editor polish: skeleton loading, save celebration, undo/redo toast, shortcuts overlay).*
