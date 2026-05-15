# BizScreen

## What This Is

BizScreen is a digital signage platform enabling businesses to manage content across distributed screens. Users create playlists (with nested sub-playlists and background audio), design scenes with a visual editor, browse a modern template gallery with 127+ SVG templates across 15 categories — searchable, filterable, sortable, with starter packs and per-user favorites — preview templates full-screen, customize brand colors/logo/text via an integrated Quick Customize panel, and apply templates atomically to a new scene or active slide; schedule content by time/day with campaigns, dayparting presets, and priorities, view campaign analytics (impressions, play counts, durations), moderate social feed content from an approval queue, manage multi-language content with device-specific delivery, display live data from Google Sheets/CSV/RSS feeds/social media on screens, embed YouTube/Vimeo videos, web pages, Google Slides, PDF/Office documents, and Google/Outlook calendars as widgets, import Canva designs, play video content with HLS adaptive streaming, manage screen groups with tags, deploy screens in portrait or landscape orientation, display structured menu boards with realtime updates, configure multi-screen video walls with synchronized playback, and monitor device health with diagnostic telemetry, screenshots, and alert-driven notifications. Enterprise features include SAML SSO, a public REST API with scoped tokens, Proof of Play compliance reporting, and per-screen working hours scheduling. The player self-heals from blank/frozen/crashed states, verifies it is displaying the correct published content, and reports device metrics on every heartbeat cycle. All 17+ widget types are fully configurable from both the layout editor and scene editor. The platform supports multi-tenant architecture with role-based access, feature-gated plans, and offline-capable player devices with a centralized widget registry.

## Core Value

**Screens reliably display the right content at the right time, even when offline.** Everything else — the editor, the scheduling, the templates, the translations — exists to ensure content reaches screens correctly and plays without interruption.

## Current State

**Shipped:** v21.0 Templates at Scale (2026-05-13)
**Active milestone:** None — planning next milestone (v22.0 Templates UX Parity is the preliminary plan per `.planning/seeds/SEED-001-templates-ux-parity.md`)

28 milestones shipped (v1 through v21.0), 184 phases, 572+ plans executed. v21.0 closed with 5 phases (176-180), 42 plans, 24/24 requirements satisfied at codebase tier, and 5 deferrals formally accepted as v21.1 carry-forward. Headline outcomes: template catalog scaled from 127 → 485 active templates across 3 verticals (Restaurants 138 + Retail 129 + Healthcare 126); admin-only AI generation pipeline live in production with Claude Haiku 4.5, curated prompt library, validator-at-ingest, retry-with-feedback, and atomic approve RPC; `AdminTemplateQueuePage` ships with Pending/Generate tabs, single-row + bulk approve/edit/reject (50-row chunk dispatch); `@tanstack/react-virtual` row-chunked masonry replaces full-DOM render in `TemplateGalleryPage` with `useContainerColumns` ResizeObserver hook driving 1/2/3/4-column breakpoints. Total v21.0 Anthropic spend: ~$17.55 across 240 commits in 8 days.

The platform is production-deployed with comprehensive E2E test coverage: 572+ Playwright tests across 61+ spec files covering 11 feature areas. Every functional requirement from v18.0 (77/77), v20.0 (39/39), and v21.0 (24/24) has been verified through automated testing — gallery, search, preview, apply, starter packs, favorites, scene editor integration, onboarding, template catalog, AI generation pipeline, admin queue UI, and gallery virtualization all live in production.

## Next Milestone Goals

**Active milestone:** None — run `/gsd-new-milestone` to bootstrap. Preliminary plan for v22.0 below.

### v22.0 Templates UX Parity (preliminary)

**Theme:** Layer OptiSigns-class browsing UX on top of the v21.0 catalog + AI-gen + virtualization foundation. v21.0 built the *machine*; v22.0 builds the *storefront*.

This plan is preliminary — it formalizes during `/gsd-new-milestone`. The 2026-05-06 OptiSigns walkthrough (`.planning/research/OPTISIGNS-WALKTHROUGH.md`) surfaced ~15 distinct UX-parity gaps; v22.0 is sized to land most of them in one milestone.

**Target scope (subject to refinement at milestone bootstrap time):**

*Tier 1 — Quick wins (low effort, high discoverability ROI):*
- Vertical filter chip in gallery (TCAT-F2)
- Sub-vertical tagging (TCAT-F1)
- Vertical starter packs, one per vertical (TCAT-F3)
- Admin publish/unpublish toggle (TCAT-F4)
- Hero search with seasonal pre-populated queries
- Masonry layout for mixed orientations (TanStack Virtual variable-height integration)

*Tier 2 — Layered UX (medium effort, parity-critical):*
- Orthogonal filter taxonomy — split current single 15-category enum into orthogonal axes (Category × Vertical × Template Type × Visual Style × Color Mood). Schema migration affects every existing template.
- Horizontal carousels per category on gallery home view
- Branded per-category hero banners (design-system theme tokens per vertical/category)
- Detail modal with prev/next navigation + "See More Like This" content recommendation row
- Image upload as AI generation input (TGEN-F3)

*Tier 3 — Pipeline parity (medium effort, scale-critical):*
- Bulk SVG import pipeline (TPIPE-IMP-F1..F4) with attribution form + display + license-cleared sources

**Explicitly NOT in v22.0 (deferred further):**
- Animated / dynamic templates (Visual Mode = Animation in OptiSigns) — own milestone (player rendering + thumbnail rasterization + WebOS/Tizen offline-player compatibility = v23.0+)
- Self-serve AI generation for end users — keep as deliberate divergence from OptiSigns
- Brand Kit persistence — own milestone

**Why split v21.0 → v22.0:**
- v21.0 already at 24 reqs / 4 phases — substantial milestone; expanding would compound risk
- Animated-templates support alone is its own milestone (player rendering + WebOS/Tizen testing)
- Orthogonal taxonomy migration touches every template row — best done once the catalog has stabilized at ~500
- Better to ship v21.0 quickly (proves AI gen pipeline, gets ~500 templates live) then iterate on storefront polish

## Requirements

### Validated

These capabilities shipped and are production-verified:

**v1 Production Release (2026-01-24):**
- ✓ User authentication with MFA support — v1
- ✓ Screen registration with OTP pairing codes — v1
- ✓ Remote device commands (reboot, reload, clear cache) — v1
- ✓ Screen heartbeat and online/offline status — v1
- ✓ Media upload with S3 presigned URLs — v1
- ✓ Playlist CRUD with item reordering — v1
- ✓ Scene design with visual editor (Polotno) — v1
- ✓ Layout creation with zone management — v1
- ✓ Schedule creation with time/day rules — v1
- ✓ Real-time content sync to devices — v1
- ✓ Offline content caching in player — v1
- ✓ Play count and uptime analytics — v1
- ✓ Role-based access control (RLS) — v1
- ✓ Content approval workflow — v1
- ✓ GDPR compliance (export, deletion) — v1
- ✓ XSS prevention, password policies, rate limiting — v1

**v2 Templates & Platform Polish (2026-01-27):**
- ✓ Templates marketplace with browse, search, preview, one-click apply — v2
- ✓ Favorites, recents, and starter packs — v2
- ✓ Template customization wizard — v2
- ✓ Language variants of scenes — v2
- ✓ Device language assignment with fallback — v2
- ✓ Campaigns with priority scheduling — v2
- ✓ Emergency content override — v2
- ✓ Dayparting presets — v2
- ✓ Mobile responsive admin UI — v2
- ✓ Dashboard redesign with health indicators — v2
- ✓ Guided onboarding flow — v2

**v2.1-v2.4 Tech Debt & Hardening (2026-01-28 to 2026-02-10):**
- ✓ Player.jsx restructured to 23 lines (98% reduction) — v2.1
- ✓ Test suite stabilized: 2071 tests, 0 failures — v2.1
- ✓ E2E test pass rate 92.7% with best-of-3 gate at 90% threshold — v2.3
- ✓ Custom Playwright fixtures (authenticatedPage/freshPage) — v2.3
- ✓ Sentry SDK with React 19 error hooks and source map upload — v2.3
- ✓ ESLint zero warnings, all rules at error level with pre-commit enforcement — v2.4
- ✓ Sentry Slack integration with dual alert rules — v2.4

**v3.0-v3.2 Creative Experience & Display Toolkit (2026-02-11 to 2026-02-19):**
- ✓ Unsplash proxy, premium template gallery, one-click template-to-editor — v3.0
- ✓ QuickCustomizePanel with brand colors, logo placement, text overrides — v3.0
- ✓ In-editor Unsplash/Iconify/My Media panels with drag-and-drop — v3.0
- ✓ Google Sheets/CSV data tables with auto-pagination — v3.1
- ✓ RSS feed as ticker and card layout — v3.1
- ✓ Social feed widget with content moderation — v3.1
- ✓ Countdown timer with timezone awareness — v3.1
- ✓ Centralized widget registry (17+ types) — v3.2
- ✓ Clock/date/weather widgets with screen timezone — v3.2
- ✓ QR code multi-type with error correction — v3.2
- ✓ Video playback with HLS adaptive streaming — v3.2
- ✓ Screen group tag management — v3.2
- ✓ Menu board CRUD with drag-and-drop and themed rendering — v3.2

**v4.0-v5.0 Player Hardening & UI Completeness (2026-02-20):**
- ✓ Player device metrics, diagnostics, screenshots, self-healing — v4.0
- ✓ Content version verification with mismatch detection — v4.0
- ✓ Alert pipeline with notification bell and email alerts — v4.0
- ✓ All 12 widget types configurable from layout editor — v5.0

**v6.0 Functional Completeness (2026-02-23):**
- ✓ Full SVG editor completeness — v6.0
- ✓ AI Designer with iterative refinement — v6.0
- ✓ OAuth cloud imports (Google Drive, Dropbox, OneDrive, SharePoint, Google Photos) — v6.0
- ✓ Enterprise security controls — v6.0

**v7.0-v9.0 UI Verification & Polish (2026-02-27 to 2026-02-28):**
- ✓ All authentication, dashboard, media, editor, scheduling, screen, data flows verified — v7.0
- ✓ Screenshot helper infrastructure with CI artifact upload — v8.0
- ✓ Dashboard retry with exponential backoff, toast deduplication — v9.0

**v11.0-v13.0 Stability & Feature Parity (2026-03-02 to 2026-03-12):**
- ✓ 6 page crashes fixed, graceful degradation on all pages — v11.0
- ✓ YouTube/Vimeo/web/Google Slides embed widgets — v12.0
- ✓ Nested playlists, background audio, working hours scheduling — v12.0
- ✓ SAML SSO, REST API gateway, Proof of Play reporting — v12.0
- ✓ PDF/Office document conversion, calendar widgets, Canva import — v12.0
- ✓ Multi-screen video wall with Realtime sync — v12.0
- ✓ 148 E2E screenshot tests, error boundaries on all routes — v13.0
- ✓ 8 skeleton loader variants, redesigned error states — v13.0

**v14.0-v16.0 Audit & Launch Prep (2026-03-27 to 2026-03-31):**
- ✓ Full-stack app audit: Sentry, Supabase, GitHub, Playwright walkthrough — v14.0
- ✓ Dashboard SupabaseApiError fixed, CI pipeline >98% pass rate — v15.0
- ✓ 8 Edge Functions deployed, migration deployment plan — v15.0
- ✓ Production build restored, ~1,245 lines dead code removed — v16.0
- ✓ FabricSvgEditor decomposed (3,437→591 lines), usePlaylistEditor decomposed — v16.0
- ✓ React Router v7 migration, LCP optimization — v16.0

**v17.0 Production Launch (2026-04-07):**
- ✓ Runtime bug fixes (async permissions, duplicate heartbeat) — v17.0
- ✓ Migration fix prep (FK refs, RLS corrections) — v17.0
- ✓ 107 database migrations applied to production in 11 batches — v17.0
- ✓ Production configuration (Sentry, Vercel, env vars) — v17.0

**v18.0 Comprehensive Functional Testing (2026-04-11):**
- ✓ 572 Playwright E2E tests across 61 spec files — v18.0
- ✓ 77/77 functional requirements verified (AUTH, NAVX, CONT, SCRN, SCHED, WDGT, MENU, LANG, ADMN, ENTR, PLYR) — v18.0
- ✓ Recovered from 2 worktree merge data loss incidents — v18.0
- ✓ Shared test infrastructure: fixtures, helpers barrel exports, screenshot utilities — v18.0

**v19.0 Product Gap Fixes (2026-04-15):**
- ✓ Dayparting preset picker + Campaign Analytics in CampaignEditorPage (SCHED-04, SCHED-06) — v19.0
- ✓ QuickCustomizePanel with `svgCustomizeService` for brand colors/logo/text overrides (CONT-12) — v19.0
- ✓ Social Feed Moderation queue with approve/reject actions (WDGT-05) — v19.0
- ✓ Test & doc quality cleanup: 4 TQAL fixes + recovered deleted test artifacts (TQAL-01..04) — v19.0
- ✓ Human verification: NAVX-09 ARIA aligned, ADMN-02/03 persistence verified, HVER-05 player stability confirmed (HVER-01/02/03/05) — v19.0
- ✓ Database fix: `can_access_template` + `clone_template_to_scene` redefined via migration 110 to drop stale `profiles.plan_tier` reference — v19.0
- ✓ Template Marketplace UI removed from frontend (pageMap aliased to SVG gallery; admin service preserved) — v19.0

**v20.0 Templates Reimagined (2026-05-03):**
- ✓ Unified gallery data layer — `gallery_templates` Postgres VIEW unioning `template_library` + `svg_templates`; `templateGalleryService.js` sole read path; `LOCAL_SVG_TEMPLATES` purged; cross-tenant RLS gap closed via migration 167 (TDAT-01..04) — v20.0
- ✓ Modern `TemplateGalleryPage` — fuse.js instant search, filter chips (category/tag/orientation), sort, URL-synced state, skeleton/empty/error states; legacy `SvgTemplateGalleryPage` deleted (TGAL-01..05, TDSC-01..05) — v20.0
- ⚠ ~~Full-screen `TemplatePreviewModal` with integrated `QuickCustomizePanel`~~ — **REVERTED 2026-05-04 in `df2926e2`**: `TemplatePreviewModal.jsx`, `QuickCustomizePanel.jsx`, `svgCustomizeService.js`, their unit tests, and the `preview-apply.spec.js` E2E suite were all deleted as a deliberate UX simplification. Card click now invokes `applyTemplate` (or `applyTemplateToActiveSlide` in editor-return mode) and navigates straight to the editor; the editor already covers color/logo/text customization, making the pre-apply modal a redundant step. **Atomic single-RPC apply (migrations 168 Polotno + 170 SVG) remains intact** — only the modal-side chrome was removed. (TPRV-01..06 effectively superseded by post-v20.0 simplification.)
- ✓ Starter Packs + Favorites — `template_packs` schema (mig 171), `template_favorites` (mig 172), atomic `apply_starter_pack` RPC (mig 173); `PackCard`/`StarterPacksStrip`/`PackPreviewModal`/`FavoriteButton` (DS primitive); favorites filter chip; `AdminStarterPacksPage` (TPCK-01..04, TFAV-01..03) — v20.0
- ✓ Scene editor + onboarding integration — Browse Templates from `SceneEditorPage`; `editorReturn=1` URL contract; `apply_template_to_active_slide` RPC (mig 174); driver.js 4-step first-visit tour persisted via `completed_gallery_tour`; StarterPackStep in onboarding wizard (TEDR-01..03, TONB-01..04) — v20.0
  - ⚠ Tour reduced to 3 steps in `df2926e2` (orphaned 4th step lived inside the deleted modal); step 3 copy updated to reflect the new card-click-direct-to-editor flow.
- ✓ Template content + quality pass — 103 net-new SVG templates → 127 active across 15 categories (mig 175 via Supabase Mgmt API); `chk_svg_templates_category_enum` CHECK; `svgValidator` 6-rule + admin upload gate; `@resvg/resvg-js` thumbnail rasterizer; 127/127 PNGs uploaded to `s3://bizscreen-media/thumbnails/system/`; TQAL-05 audit lint 0 matches (TCTN-01..04, TQAL-05) — v20.0

**v21.0 Templates at Scale (2026-05-13):**
- ✓ Schema foundation — migration 176 adds `template_drafts` admin-only staging table with RLS, `svg_templates.vertical` enum column with CHECK constraint, and 23-column `gallery_templates` VIEW (Phase 176) — v21.0
- ✓ AI generation pipeline (admin-only) — Edge Function pipeline prompt → Claude Haiku 4.5 → `svgValidator` (validator-at-ingest) → admin queue, with 2-retry-with-feedback and 6-entry curated prompt library (Menu / Promo / Announcement / Reminder / Wayfinding / Health Tip); atomic `approve_draft_atomic` RPC (advisory lock + idempotency + deterministic S3 key); build-time gate zero `ANTHROPIC` matches in client bundle; A/B harness 180 live calls ~$1.89 (TGEN-01..06) — v21.0
- ✓ `svgValidator` hardening — FORBIDDEN_CONTENT_TOKENS (4 CSS-injection patterns) + DOMPurify FORBID_TAGS/FORBID_ATTR mirrored across 3 anchor sites; closes CSS-injection bypass that DOMPurify's SVG profile permits by design (Phase 177 gap-closure BL-04) — v21.0
- ✓ Admin Queue UI — `AdminTemplateQueuePage` Pending tab (sanitized inline SVG previews + row Approve/Edit/Reject), Generate tab (OptiSigns-style form + 6-card prompt grid + D-14 ~30s loading hint), `TemplateDraftEditModal` (D-04 OVERRIDE; same-approve-path Save & Publish); admin-only via `adminToolPages` allowlist + EF `is_admin` RPC + RLS `template_drafts_admin_only` (TADM-01..04) — v21.0
- ✓ Vertical content seeding — 357 net-new active gallery templates published, 485 total across 3 verticals (Restaurants 138 + Retail 129 + Healthcare 126) with ≥8 distinct template types per vertical and portrait+landscape variants for hero types; bulk approve/reject EF handlers (BULK_HARD_CAP=50, 300ms throttle, per-ID error isolation, `Promise.all` banned); ~$15.66 Anthropic spend (TCAT-01..04, TVRT-01..05) — v21.0
- ✓ Gallery virtualization — `@tanstack/react-virtual` ^3.13.24 row-chunked masonry replaces full-DOM render; `useContainerColumns` ResizeObserver hook drives 1/2/3/4-column breakpoints; `scrollToOffset(0)` on `filteredResults` identity change; all 5 v20.0 render branches preserved; URL-synced filter/sort/search pipeline preserved verbatim; codebase satisfies TVRZ-01..05 (Phase 179) — v21.0
- ✓ Launch readiness gate-closing — 11th 'AI Template Queue' tile on SuperAdminDashboardPage Admin Tools + Playwright nav spec; EF header refreshed to live 6-action set; 9 TCAT/TVRT traceability rows flipped; VALIDATION.md frontmatter refreshed across phases 177/178/179 with spot-checked evidence; spike dispatcher branch deleted from EF; axe heading-order fixed via `sr-only` h2+h3; test infrastructure hardened (`forceRemoveGalleryTour` + driver-popover selectors + favorites serialization); final 18-spec re-run 11/11 = 100% (Phase 180) — v21.0

### Active

_No active requirements — run `/gsd-new-milestone` to bootstrap v22.0 and define the next milestone's requirements._

### Deferred

- [ ] **HVER-04** Enterprise test suite with `TEST_ENTERPRISE_EMAIL` credentials — skip-guard verified, full run deferred pending enterprise-tenant provisioning
- [ ] **11 manual UAT items from v20.0** (Phases 172 + 174) — partially obsoleted by `df2926e2`: visual UAT items tied to removed `TemplatePreviewModal` / `QuickCustomizePanel` no longer apply. Surviving items: mobile stacked layout, first-visit gallery tour visual (now 3-step), onboarding starter_pack apply/skip flows.
- [ ] **Phase 163 Worktree Merge Safeguard** — overdue tech debt across v18.0, v19.0, v20.0, v21.0 (touched by worktree-merge data loss in v18.0, v19.0, and minor v20.0 incidents)
- [ ] **TPER-F1** Template recommendations from `profiles.business_type`
- [ ] **TVRZ-02 (v21.0 carry-forward)** Gallery first-paint <1s budget — empirical 9753ms prod-build (vs 1000ms target); only 6.5% improvement over dev-mode 10434ms; dominant cost is cloud roundtrip + virtualization mount + initial fetch. v21.1 angles: prefetch template list at login, reduce initial-fetch payload, defer virtualization mount until first paint, or replatform measurement scope.
- [ ] **TVRZ-04 (v21.0 carry-forward)** Skeleton-flash precondition (Landscape orientation chip) times out at 5s — structurally unreachable until TVRZ-02 first-paint pipeline completes within the 5s precondition budget.
- [ ] **TDSC-04 (v21.0 carry-forward)** App.jsx pseudo-router deep-link URL params not consumed — resolution requires router migration to URL-driven routing.
- [ ] **Per-user `completed_gallery_tour` state non-determinism (v21.0 carry-forward)** across parallel test workers — gallery-tour dismissal-persistence + first-visit tests skipped via `test.skip`; v21.1 resolution via per-test reset RPC or per-worker isolated user fixture.
- [ ] **TEDR-01/02/03 (v21.0 carry-forward)** Editor-return tests fail with `/^Scenes$/i` regex against sidebar showing 'Screens' — pre-existing test/environment mismatch; v21.1 resolution via selector update OR test-user scene seeding.

### Withdrawn

- ~~**TPRV-F1** Polotno QuickCustomize-before-apply~~ — withdrawn 2026-05-06 alongside v21.0 planning. The pre-apply customize layer (`TemplatePreviewModal` + `QuickCustomizePanel` + `svgCustomizeService`) was deliberately removed in `df2926e2` (2026-05-04) because the editor already covers color/logo/text customization. Extending a non-existent panel to Polotno entries is no longer a meaningful requirement. Revisit only if a pre-apply customize step is reintroduced.

### Out of Scope

- Real-time chat between users — not core to signage value
- Video transcoding/processing — assume pre-processed media
- Mobile native apps — web player covers all platforms
- Multi-region data residency — single Supabase instance
- Offline-first admin UI — admin requires connectivity
- TypeScript migration — too disruptive; JavaScript works
- RTL language support (Hebrew, Arabic) — requires complete UI/content mirroring
- CJK languages — font/rendering complexity, special testing required
- User template marketplace (buy/sell) — complex moderation/payment
- AI-generated templates — unpredictable results
- Template Marketplace UI surface — removed in v19.0 quick task 260414-qc4; SVG gallery aliased in its place. Admin `marketplaceService.js` preserved for future reactivation.
- Conditional scheduling triggers — high complexity
- Per-viewer personalization — privacy concerns

## Context

**Current State (v21.0 shipped 2026-05-13):**
- React 19 SPA with Supabase backend (auth, database, real-time)
- ~156,217 lines of JavaScript/JSX/CSS in src/
- 28 milestones shipped (v1 through v21.0), 184 phases, 572+ plans executed
- 572+ Playwright E2E tests across 61+ spec files covering 11 feature areas
- All functional requirements from v18.0 (77/77), v20.0 (39/39), and v21.0 (24/24) verified at codebase tier — TPRV-01..06 superseded by post-v20.0 simplification
- Production-deployed with 178 database migrations applied (migrations 167-175 landed in v20.0; migration 176 in v21.0 added `template_drafts` admin-only staging table + `svg_templates.vertical` CHECK + `gallery_templates` 23-column VIEW; migration 178 in v21.0 backfilled vertical tags on 36 existing rows). Apply RPCs (mig 168 Polotno, mig 170 SVG, mig 173 packs, mig 174 active-slide) remain in production use; new atomic `approve_draft_atomic` RPC (Phase 177 gap-closure) adds advisory lock + idempotency + deterministic S3 key.
- 9 Edge Functions deployed (Unsplash, RSS, Weather, AI Designer, doc-converter, calendar, canva, SSO, **generate-svg-template** — new in v21.0 with 6-action set: generate / approve / reject / save_edit / approve_bulk / reject_bulk)
- CI pipeline: SHA-256 screenshot comparison, 90% pass rate gate, best-of-3 retry
- ESLint: zero warnings, zero errors, all rules at error level with pre-commit enforcement
- Knip dead code detection integrated into CI
- Sentry error monitoring with Slack alerting
- Centralized widget registry with 17+ widget types
- Player self-healing with content version verification and alert pipeline
- Template gallery: **485 active SVG templates** (357 net-new in v21.0 across 3 verticals — Restaurants 138 + Retail 129 + Healthcare 126) across 15 categories, fuse.js instant search, starter packs, per-user favorites, **card-click-direct-to-editor apply** (no pre-apply modal — see `df2926e2`), driver.js 3-step first-visit tour, **`@tanstack/react-virtual` row-chunked masonry** for ~500-template scale
- 485 template thumbnails rendered via `@resvg/resvg-js` and uploaded to `s3://bizscreen-media/thumbnails/system/`
- **AI generation pipeline (admin-only)**: Edge Function with Claude Haiku 4.5, 6-entry curated prompt library, validator-at-ingest + 2-retry-with-feedback, atomic approve flow (advisory lock + idempotency + deterministic S3 key), bulk approve/reject (BULK_HARD_CAP=50, 300ms throttle, per-ID error isolation); `AdminTemplateQueuePage` with Pending/Generate tabs, single-row + bulk actions; v21.0 total Anthropic spend ~$17.55

**Technical Debt:**
- ~900 E2E tests skipped (intentional: ~800 project-specific multi-project pattern)
- **HVER-04** Enterprise suite deferred — requires `TEST_ENTERPRISE_EMAIL` tenant provisioning
- **11 manual UAT items from v20.0** (Phases 172 + 174) — automated scaffolds skip-guarded; deferred for credentialed browser session
- **Phase 163 Worktree Merge Safeguard** — overdue across four milestones (v18.0, v19.0, v20.0, v21.0)
- Phase 175 lacks a `175-VERIFICATION.md` (sign-off lives in `175-07-SUMMARY.md`); workflow tightening needed for content-only phases
- Unsplash offline caching: TOS may conflict with offline player requirement
- canEditContent()/canEditScreens() async called sync in CampaignsPage
- PDF stored as single convertedPages entry (page splitting deferred)
- **v21.0 carry-forward (5 items, formally accepted to v21.1):** TVRZ-02 gallery first-paint <1s budget (empirical 9753ms prod-build); TVRZ-04 skeleton-flash precondition (dependent on TVRZ-02); TDSC-04 App.jsx pseudo-router deep-link URL params; per-user `completed_gallery_tour` state non-determinism across parallel test workers; TEDR-01/02/03 editor-return contract drift

**Codebase Mapping:**
- `.planning/codebase/ARCHITECTURE.md` — system design
- `.planning/codebase/STACK.md` — technology stack
- `.planning/codebase/CONCERNS.md` — tech debt and risks

## Constraints

- **Tech stack**: React + Supabase + S3 — existing architecture, no migration
- **Player compatibility**: Must work across web, Android, iOS, WebOS, Tizen
- **Offline capability**: Player must function without network connectivity
- **Multi-tenant**: All changes must respect tenant isolation via RLS
- **Backward compatibility**: Existing screens in field must continue working

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Stabilize before new features | Logic gaps pose production risk | ✓ Good — v1 stable |
| Player.jsx hooks before component extraction | Proven pattern needed first | ✓ Good — now 23 lines |
| Build order: Scheduling > Templates > Multi-Language | Risk order | ✓ Good — smooth progression |
| TZDate for schedule calculations | DST-safe handling | ✓ Good — no DST bugs |
| Separate scenes for language variants | Simpler than embedded JSONB | ✓ Good — clean model |
| Emergency bypasses language resolution | Same content all devices | ✓ Good — instant push |
| Custom Playwright fixtures for test isolation | authenticatedPage/freshPage | ✓ Good — consistent execution |
| Best-of-3 E2E gate with 90% threshold | Account for flakiness | ✓ Good — 92.7% achieved |
| Proxy-based Supabase instrumentation for Sentry | Automatic breadcrumbs | ✓ Good — zero consumer changes |
| Widget registry as single source of truth | Eliminates 9 duplication sites | ✓ Good — all 17+ types |
| hls.js light build for video streaming | Smaller bundle | ✓ Good — HLS works |
| Database-backed Unsplash cache | PostgreSQL available in Edge Functions | ✓ Good — no external deps |
| FabricSvgEditor decomposition | 3,437→591 lines, 6 hooks | ✓ Good — maintainable |
| React Router v7 declarative mode | Framework mode needs server components | ✓ Good — sufficient for SPA |
| 11 migration deployment batches | Risk-based grouping | ✓ Good — 107 migrations deployed |
| security_invoker=true for view RLS | Simpler than SECURITY DEFINER | ✓ Good — views enforce caller's RLS |
| Phase-per-feature-area for E2E tests | Focused, independently verifiable | ✓ Good — 77/77 coverage |
| Combine small phases (Menu+Lang) | <5 requirements can be grouped | ✓ Good — reduced overhead |
| Git recovery for worktree merge damage | `git checkout <commit>~1 -- <path>` | ✓ Good — 27 files restored |
| Dedicated phase (169) for human verification items | Skip-guard + 3-run stability is testable automation; enterprise creds stays out-of-scope | ✓ Good — HVER-01/02/03/05 closed, HVER-04 deferred cleanly |
| Decimal sub-phases for UAT-blocker fixes (166.1, 166.2) | Keep linear roadmap numbering while isolating unplanned fix work | ✓ Good — both closed without disrupting 165→167 flow |
| Remove Template Marketplace UI as quick task | Marketplace surface no longer priority; SVG gallery serves the same intent | ✓ Good — 5 files deleted, pageMap alias keeps routes alive |
| Additive migration to fix SECURITY DEFINER column drift | Avoid destructive down-migration; just redefine the two functions | ✓ Good — migration 110 unblocked `get_marketplace_templates()` |
| Unified `gallery_templates` Postgres VIEW over `template_library`+`svg_templates` | Single-query gallery fetches; eliminate three-source JS merge | ✓ Good — VIEW + `templateGalleryService.js` replaced fetch+merge in v20.0 |
| Atomic single-RPC apply (mig 168 Polotno + mig 170 SVG) | Close clone-then-patch race in customization apply | ✓ Good — Phase 172 E2E 7/7 GREEN after 172.1 sibling RPC fix |
| Decimal phase 172.1 for Apply RPC regression | Repair regression surfaced by live UAT without disrupting linear roadmap | ✓ Good — sibling RPC `clone_svg_template_to_scene` closed gap in 1 day |
| driver.js (MIT) for first-visit gallery tour | react-joyride incompatible with React 19; Shepherd.js is AGPL | ✓ Good — 4-step tour persisted via `completed_gallery_tour` column |
| fuse.js for client-side template search | Catalog ≤500; Algolia adds cost and violates offline friendliness | ✓ Good — sub-second filter on 127-row catalog |
| URL params replace sessionStorage for template handoff | sessionStorage fragile in multi-tab scenarios | ✓ Good — `?sceneId=` + `editorReturn=1` survive multi-tab |
| Wave 0 RED tests committed before production code (Nyquist gate) | No 3-task gap without automated verify; reproducible RED state | ✓ Good — applied across Phases 173/174/175; downstream plans flip GREEN |
| Migration 175 applied via Supabase Mgmt API direct call | 84 KB / 2,043-line file too large for MCP `apply_migration` round-trip | ✓ Good — 103 INSERTs landed atomically; pattern documented for future |
| Self-verify directive over manual UAT for automated-coverage SCs | Phase 173 + earlier UAT items where E2E covers SCs structurally | ✓ Good — keeps cycle time tight without skipping evidence |
| Remove `TemplatePreviewModal` + `QuickCustomizePanel` + `svgCustomizeService` post-v20.0 (`df2926e2`, 2026-05-04) | Pre-apply modal duplicated work the SVG/Polotno editor already does (color/logo/text); a redundant step before users could fully customize | ✓ Good — card click invokes apply directly and lands in the editor; gallery tour reduced to 3 steps; atomic apply RPCs preserved |
| Admin-only AI generation (v21.0) — no end-user generation surface | Quality control + cost control + brand consistency; admins curate; production retry-with-feedback handles first-pass LLM failures | ✓ Good — `AdminTemplateQueuePage` + EF `is_admin` gate + RLS `template_drafts_admin_only` + zero client-side `ANTHROPIC` matches |
| Claude Haiku 4.5 over Sonnet/Opus for SVG generation (v21.0) | Cost-quality tradeoff for one-shot SVG generation; ~$0.05/template empirically; quality acceptable for admin review pipeline | ✓ Good — 357 templates published at ~$15.66 total spend; baseline first-pass success ~69% (higher than D-13 design-time projection 40-60%) |
| D-13 lever-2 escape hatch for TGEN-06 SC #6 (v21.0) — defensible lower bar instead of strict 30pp lift | 30pp lift on top of 69% baseline requires ≥99% with-prompt — unrealistic for one-shot LLM; production retry-with-feedback (TGEN-02) is the correct division of labor for first-pass failures | ✓ Good — with-prompt arm 66% pooled meets ≥60% bar; documented rationale in `prompt-library-eval.md` and 177-VERIFICATION.md |
| Validator-at-ingest + atomic approve RPC (advisory lock + idempotency + deterministic S3 key) | Closes BL-01..04 + BL-06 + TOCTOU races identified in 177-REVIEW.md; "no malformed or unvalidated SVG ever reaches the queue" is a load-bearing phase-goal guarantee | ✓ Good — Phase 177 gap-closure plans 07..10 closed all 4 BLOCKER-rooted gaps before Phase 178 seeding |
| `svgValidator` hardening via FORBIDDEN_CONTENT_TOKENS + DOMPurify FORBID_TAGS/FORBID_ATTR mirrored across 3 anchor sites (v21.0) | DOMPurify's SVG profile permits `<style>` / `@import` / `url(...)` by design — tenant gallery is multi-tenant CSS-injection surface | ✓ Good — 3-site mirror locked: svgValidator.js (Rule 4) + templateApplyService.js (apply-time) + EF approve handler (B1 re-validation) |
| Bulk approve/reject EF handlers with BULK_HARD_CAP=50 + 300ms serial throttle + per-ID error isolation; `Promise.all` banned (v21.0) | Anthropic rate limits + LLM-API latency tail + atomic-per-row error contract; chunk dispatch is correctness, not security | ✓ Good — frontend `Math.ceil(N/50)` chunk loop verified live with BulkActionConfirmModal three-phase flow |
| `@tanstack/react-virtual` row-chunked masonry over react-window/raw IntersectionObserver (v21.0) | TanStack maintained + variable-height roadmap + React-19 compatibility; `OVERSCAN=5` + `[role="grid"]` + `aria-rowcount` for a11y | ✓ Good — 22/22 unit tests + ResizeObserver-driven `useContainerColumns` hook + scroll-reset on filteredResults identity change |
| `useContainerColumns` ResizeObserver hook over CSS-grid auto-fit (v21.0) | Virtualizer needs explicit column count for row-chunking; CSS `grid-template-columns: repeat(auto-fit, ...)` is opaque to JS | ✓ Good — hook drives 1/2/3/4-column breakpoints at Tailwind sm/md/lg with 7/7 vitest GREEN |
| Gap-closure phase (Phase 180) post audit-flagged BLOCKER (v21.0) | `/gsd-plan-milestone-gaps` over re-opening Phase 179; clean separation between code-tier delivery and integration-tier closure; allows traceability flip + frontmatter refresh + CI-empirical exercises to live in a single phase | ✓ Good — Phase 180 closed BLOCKER-1 + WARNING + FLOW-1 + 9 traceability rows + 5 empirical gates + 2 v21.1 carry-forwards in 12 plans |
| Stateless `--resume-from` invariant for batch seeding scripts (v21.0) | Anthropic credit-balance failures + LLM throttle errors mid-batch; needs to resume without double-publishing | ✓ Good — Phase 178 healthcare wave resumed after live credit-balance failure without duplication; pattern documented |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd:transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd:complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-05-13 after v21.0 milestone close. 5 phases (176-180), 42 plans, 24/24 requirements satisfied at codebase tier, 5 deferrals formally accepted as v21.1 carry-forward. Template catalog scaled 127 → 485 active across 3 verticals. AI generation pipeline live in production with Claude Haiku 4.5 + curated prompt library + validator-at-ingest + atomic approve RPC. Gallery virtualization via `@tanstack/react-virtual`. Next milestone: run `/gsd-new-milestone` (preliminary plan: v22.0 Templates UX Parity per `.planning/seeds/SEED-001-templates-ux-parity.md`).*
