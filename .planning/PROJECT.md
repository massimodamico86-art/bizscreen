# BizScreen

## What This Is

BizScreen is a digital signage platform enabling businesses to manage content across distributed screens. Users create playlists (with nested sub-playlists and background audio), design scenes with a visual editor, schedule content by time/day with campaigns and priorities, browse a templates marketplace for pre-built content, manage multi-language content with device-specific delivery, display live data from Google Sheets/CSV/RSS feeds/social media on screens, embed YouTube/Vimeo videos, web pages, Google Slides, PDF/Office documents, and Google/Outlook calendars as widgets, import Canva designs, play video content with HLS adaptive streaming, manage screen groups with tags, deploy screens in portrait or landscape orientation, display structured menu boards with realtime updates, configure multi-screen video walls with synchronized playback, and monitor device health with diagnostic telemetry, screenshots, and alert-driven notifications. Enterprise features include SAML SSO, a public REST API with scoped tokens, Proof of Play compliance reporting, and per-screen working hours scheduling. The player self-heals from blank/frozen/crashed states, verifies it is displaying the correct published content, and reports device metrics on every heartbeat cycle. All 17+ widget types are fully configurable from both the layout editor and scene editor. The platform supports multi-tenant architecture with role-based access, feature-gated plans, and offline-capable player devices with a centralized widget registry.

## Core Value

**Screens reliably display the right content at the right time, even when offline.** Everything else — the editor, the scheduling, the templates, the translations — exists to ensure content reaches screens correctly and plays without interruption.

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
- ✓ Template ratings and suggestions — v2
- ✓ Language variants of scenes — v2
- ✓ Device language assignment with fallback — v2
- ✓ Translation dashboard and AI suggestions — v2
- ✓ Campaigns with priority scheduling — v2
- ✓ Emergency content override — v2
- ✓ Dayparting presets — v2
- ✓ Campaign analytics and templates — v2
- ✓ Mobile responsive admin UI — v2
- ✓ Dashboard redesign with health indicators — v2
- ✓ Guided onboarding flow — v2

**v2.1 Tech Debt Cleanup (2026-01-28):**
- ✓ Player.jsx restructured to 23 lines (98% reduction) — v2.1
- ✓ ViewPage extracted to player/pages/ with hooks — v2.1
- ✓ Test suite stabilized: 2071 tests, 0 failures — v2.1
- ✓ Circular dependency resolved in test infrastructure — v2.1
- ✓ TEST-PATTERNS.md with testing guidelines — v2.1
- ✓ Weighted campaign rotation enforced — v2.1
- ✓ Template usage tracking verified — v2.1
- ✓ Bundle baseline and tree shaking enabled — v2.1
- ✓ Code splitting verified per route — v2.1
- ✓ Pre-commit hooks with ESLint enforcement — v2.1
- ✓ PropTypes and JSDoc on core components/services — v2.1
- ✓ README rewritten with architecture docs — v2.1

**v2.2 Onboarding Polish (2026-02-05):**
- ✓ Unified onboarding flow with 5-step state machine — v2.2
- ✓ Screen pairing integrated into onboarding (QR/OTP/polling) — v2.2
- ✓ SuccessStep with completion celebration and CTAs — v2.2
- ✓ Legacy code cleanup (1,005 lines removed) — v2.2
- ✓ DashboardPage reduced 46% (16 state variables eliminated) — v2.2
- ✓ Polotno editor hardened (modal wrapper, 10s timeout, dialogs) — v2.2

**v2.3 Production Hardening (2026-02-09):**
- ✓ E2E test pass rate 92.7% (from ~35%) with best-of-3 gate at 90% threshold — v2.3
- ✓ 172 waitForTimeout calls removed across 32 E2E test files — v2.3
- ✓ Custom Playwright fixtures (authenticatedPage/freshPage) for test isolation — v2.3
- ✓ Sentry SDK integrated with React 19 error hooks and Router v7 tracing — v2.3
- ✓ Frontend/API errors captured with user context and Supabase breadcrumbs — v2.3
- ✓ Source map upload pipeline (@sentry/vite-plugin) with CI secrets — v2.3
- ✓ VITE_USE_UNIFIED_ONBOARDING feature flag removed — v2.3
- ✓ Dead AutoBuild onboarding code removed from App.jsx — v2.3

**v2.4 Tech Debt Zero (2026-02-10):**
- ✓ Dead code eliminated: AutoBuildOnboardingModal.jsx, autoBuildService.js (631 lines removed) — v2.4
- ✓ Corrective migration 141 dropping orphaned tenant_id from application_logs — v2.4
- ✓ E2E test audit: 917 skipped tests categorized into 9 actionable categories — v2.4
- ✓ 3 obsolete diagnostic test files deleted, 8 fixable tests re-enabled — v2.4
- ✓ SKIP REASON documentation on all remaining test.skip/test.fixme/describe.skip — v2.4
- ✓ `__fixtures__/` shared test data pattern adopted in 3 service unit tests — v2.4
- ✓ ESLint zero warnings: 7,332 warnings fixed to zero across 271 files — v2.4
- ✓ All ESLint warn rules promoted to error with pre-commit enforcement — v2.4
- ✓ Sentry Slack integration with dual alert rules (#sentry-alerts channel) — v2.4

**v3.0 Creative Experience (2026-02-11):**
- ✓ Unsplash proxy Edge Function with database cache, rate limiting, TOS compliance — v3.0
- ✓ Client-side proxy service with fire-and-forget download tracking — v3.0
- ✓ Premium template gallery with Framer Motion cardLift hover, skeleton loading, stagger animations — v3.0
- ✓ Debounced search (300ms) with responsive 4→1 column grid — v3.0
- ✓ One-click template-to-editor flow (no intermediate modals) — v3.0
- ✓ QuickCustomizePanel with brand colors, logo placement, text overrides — v3.0
- ✓ Scroll position save/restore via sessionStorage with RAF gating — v3.0
- ✓ In-editor Unsplash photo search with attribution and download tracking — v3.0
- ✓ In-editor Iconify icon search (15k+ icons, 5 curated sets) with SVG vector insertion — v3.0
- ✓ In-editor My Media panel with uploaded image browsing — v3.0
- ✓ Drag-and-drop from all asset panels with zoom-aware canvas positioning — v3.0
- ✓ Toolbar scaleTap press animations via Framer Motion — v3.0
- ✓ Editor loading skeleton matching editor layout structure — v3.0
- ✓ Save celebration with confetti burst and green "Saved!" badge — v3.0
- ✓ Undo/redo toast with auto-dismiss and replacement on rapid actions — v3.0
- ✓ Keyboard shortcuts overlay with Mac/PC detection and text editing guard — v3.0

**v3.1 Data-Driven Screens (2026-02-13):**
- ✓ Google Sheets data rendered as styled table on screen with headers, alternating rows, theming — v3.1
- ✓ CSV data rendered as styled table on screen (identical to Google Sheets) — v3.1
- ✓ Configurable auto-refresh intervals (5/15/30/60 min) per data widget — v3.1
- ✓ Data source field binding to text elements in scene editor — v3.1
- ✓ Auto-pagination for large datasets with smooth fade transitions — v3.1
- ✓ Image URL fields in data sources render as actual images on screen — v3.1
- ✓ Offline data caching via IndexedDB (last-known data on network drop) — v3.1
- ✓ RSS feed as scrolling news ticker with seamless loop animation — v3.1
- ✓ RSS feed in card/article layout with images and text excerpts — v3.1
- ✓ Server-side RSS proxy Edge Function with content sanitization — v3.1
- ✓ Social feed widget assignable to layout zones — v3.1
- ✓ Content moderation queue with approve/reject before screen display — v3.1
- ✓ Social feed hashtag filtering — v3.1
- ✓ Countdown timer with timezone awareness (TZDate) and daily recurring mode — v3.1
- ✓ Locale-based date/time formatting (6 locales: en/es/pt/it/fr/de) — v3.1
- ✓ Sync status indicator ("last updated") on all dynamic widgets — v3.1
- ✓ Unified data refresh orchestrator managing per-widget timers with deduplication — v3.1
- ✓ No API keys exposed in client-side player bundle — v3.1

**v3.2 Display Toolkit (2026-02-19):**
- ✓ Centralized widget registry replacing 9 duplication sites with single-file registration — v3.2
- ✓ Widget type switching resets props to new type's defaults — v3.2
- ✓ Timezone-aware clock widget with 12h/24h, seconds toggle, analog SVG style — v3.2
- ✓ Combined clock+date widget — v3.2
- ✓ Clock/date/weather widgets use screen's assigned timezone — v3.2
- ✓ QR code multi-type (URL/WiFi/text) with error correction and brand logo overlay — v3.2
- ✓ Weather proxy Edge Function hiding API key server-side — v3.2
- ✓ Weather forecast mode with multi-day layout — v3.2
- ✓ Weather offline caching via IndexedDB — v3.2
- ✓ Video playback in layout zones with HLS adaptive streaming (hls.js) — v3.2
- ✓ Per-element video stall detection and recovery — v3.2
- ✓ Screen group tag management with GIN-indexed filtering — v3.2
- ✓ Playlist push to screen groups and bulk operations — v3.2
- ✓ Per-screen portrait/landscape orientation with CSS rotation mismatch handling — v3.2
- ✓ 3 portrait templates seeded (Info Board, Menu Strip, Social Wall) — v3.2
- ✓ Orientation mismatch warnings in editor and scheduler — v3.2
- ✓ Menu board CRUD with drag-and-drop reordering (@dnd-kit/sortable) — v3.2
- ✓ Menu board widget with themed rendering, auto-pagination, Supabase Realtime — v3.2
- ✓ Dietary/allergen tags and locale-aware currency formatting — v3.2

**v4.0 Player Hardening (2026-02-20):**
- ✓ Player reports device metrics (memory, storage, network) on every heartbeat — v4.0
- ✓ User views device diagnostics on screen detail page with color-coded status — v4.0
- ✓ Server detects offline devices and raises alert with severity escalation — v4.0
- ✓ Server auto-resolves offline alert when device resumes heartbeats — v4.0
- ✓ Player auto-captures screenshot every 5 minutes while content is playing — v4.0
- ✓ User views latest screenshot on screen detail page — v4.0
- ✓ User requests on-demand screenshot from screen detail page — v4.0
- ✓ Player captures screenshot on alert events (offline recovery, crash detection) — v4.0
- ✓ Player detects blank/frozen screen and auto-reloads to restore playback — v4.0
- ✓ Player falls back to cached content when reload fails — v4.0
- ✓ Crash counter prevents infinite restart loops (max 6, then static fallback) — v4.0
- ✓ Player reports content version identifier on each heartbeat — v4.0
- ✓ Server detects content version mismatch between published and player-reported — v4.0
- ✓ Player auto-retries content sync on version mismatch — v4.0
- ✓ Content verification never blocks active playback (play-then-verify) — v4.0
- ✓ Recovery events generate alerts in the system — v4.0
- ✓ In-app notification bell with alert history — v4.0
- ✓ Email alerts for critical issues (device offline, recovery exhausted) — v4.0

**v5.0 UI Completeness (2026-02-20):**
- ✓ All 12 widget types configurable from layout editor zone properties — v5.0
- ✓ Menu board widget controls in scene editor (board selector, theme, accent color) — v5.0
- ✓ Screen orientation and display language verified end-to-end — v5.0
- ✓ Device recovery and recovery exhausted alert toggles in notification settings — v5.0
- ✓ 6 unused service/hook dead code files removed (1,716 LOC) — v5.0
- ✓ YodeckLayoutEditorPage missing component imports resolved — v5.0

**v6.0 Functional Completeness (2026-02-23):**
- ✓ Full SVG editor completeness — hyperlinks, settings panels, expanded menus, aspect ratio lock, image position/crop/replace — v6.0
- ✓ AI Designer — text-prompt layout generation via Anthropic API, iterative refinement, brand context, image upload — v6.0
- ✓ OAuth cloud imports — Google Drive, Dropbox, OneDrive, SharePoint, Google Photos — v6.0
- ✓ Enterprise security controls — password policies, session/JWT config, multi-step tenant data deletion — v6.0
- ✓ Video uploads in carousel, property events CRUD, graphics library in layout editor, content analytics timeline — v6.0
- ✓ Payment method update via Stripe portal, app config editing with pre-populated modals — v6.0
- ✓ SVG editor integration polish — PositionPanel crash fix, hyperlink target wiring, layer sync, panel auto-close — v6.0

**v7.0 UI Verification (2026-02-27):**
- ✓ All authentication flows (signup, login, reset, invite, update-password) verified — v7.0
- ✓ Dashboard widgets, quick actions, and navigation verified — v7.0
- ✓ Media library upload, preview, rename, delete, bulk select, search/filter verified — v7.0
- ✓ SVG scene editor tools, property panels, AI Designer, cloud imports verified — v7.0
- ✓ Playlist CRUD, layout editor zones, 12 widget types, template marketplace verified — v7.0
- ✓ Schedule creation, conflict detection, dayparting, campaign CRUD verified — v7.0
- ✓ Screen list, pairing, groups, diagnostics, remote commands verified — v7.0
- ✓ Data sources, app editing, menu boards, content moderation verified — v7.0
- ✓ Analytics dashboards, content metrics, activity log, alerts, notifications verified — v7.0
- ✓ Settings (billing, branding, security, team, white-label) verified — v7.0
- ✓ Admin tools, reseller portal, help center, legacy pages verified — v7.0
- ✓ 4 cross-phase integration breaks fixed (toast, layout nav, campaign routing, screen groups) — v7.0
- ✓ 15+ missing imports, Badge/Button collisions, Modal prop mismatches fixed — v7.0

**v8.0 Comprehensive E2E (2026-02-28):**
- ✓ Screenshot helper infrastructure (screenshotStep(), VIEWPORTS, cleanScreenshots()) — v8.0
- ✓ Playwright viewport projects (mobile/tablet/desktop) with testMatch opt-in — v8.0
- ✓ CI pipeline screenshot artifact upload with 14-day retention — v8.0
- ✓ Login flow screenshot tests (valid, invalid, empty-field validation) — v8.0
- ✓ Auth flows screenshot tests (signup, password reset, invite, session persistence) — v8.0
- ✓ Onboarding wizard screenshot tests (welcome, industry, pairing, success) — v8.0

**v9.0 Production Polish (2026-02-28):**
- ✓ Dashboard retry with exponential backoff (max 3, 1s/2s/4s) replacing unbounded loop — v9.0
- ✓ Toast deduplication with 5s throttle per error type — v9.0
- ✓ Data-driven breadcrumb routing for all app routes — v9.0

**v11.0 Stability Pass (2026-03-02):**
- ✓ 6 page crashes fixed via defensive EmptyState icon rendering (typeof/$$typeof detection) — v11.0
- ✓ TemplateSidebar missing sub-components defined, ErrorBoundary gains Try Again button — v11.0
- ✓ Settings/Status/DataSources pages gracefully degrade with local defaults when RPCs unavailable — v11.0
- ✓ Public preview with invalid token shows clean error page (Content-Type header check) — v11.0
- ✓ "Use Template" with missing ID shows graceful error instead of broken editor — v11.0
- ✓ Shared dev bypass utility (getAuthenticatedUserId) fixing playlist creation and dashboard retry — v11.0
- ✓ Unsplash proxy graceful empty state with actionable "functions serve" hint — v11.0
- ✓ Templates page mobile filter collapse at 375px (sm:hidden toggle) — v11.0
- ✓ Pricing page tablet 2-column grid at 768px (sm:grid-cols-2 lg:grid-cols-3) — v11.0
- ✓ SVG Editor export preview dialog with format/quality/scale options — v11.0
- ✓ Branding save button tracks unsaved changes state — v11.0

**v12.0 Feature Parity (2026-03-05):**
- ✓ YouTube, Vimeo, web page, Google Slides embed widgets with offline fallback — v12.0
- ✓ Nested playlists with circular reference prevention and 5-level depth limit — v12.0
- ✓ Background audio with volume control per playlist — v12.0
- ✓ Per-screen working hours scheduling (on/off by day of week) — v12.0
- ✓ SAML SSO login with domain auto-detection and enforcement mode — v12.0
- ✓ 9-endpoint REST API gateway with scoped tokens and rate limiting — v12.0
- ✓ Proof of Play reporting with monthly partitioning and CSV export — v12.0
- ✓ PDF/Office document upload with server-side conversion for smart TVs — v12.0
- ✓ Google Calendar and Outlook calendar widgets via OAuth — v12.0
- ✓ Canva design import via Edge Function proxy with PKCE flow — v12.0
- ✓ Multi-screen video wall with Realtime broadcast sync and bezel compensation — v12.0

**v13.0 Full Stability Pass (2026-03-12):**
- ✓ 148 E2E screenshot test requirements satisfied across all app pages — v13.0
- ✓ React error boundaries on all route segments with fallback UI and Try Again — v13.0
- ✓ API call hook with exponential backoff, max retries, and clear error state — v13.0
- ✓ Connection state indicator (offline/reconnecting/online) in app header — v13.0
- ✓ 8 skeleton loader variants replacing spinners (Dashboard, Card, Table, Grid, Form, Editor, Screens, Analytics) — v13.0
- ✓ Error state redesign with icon, descriptive message, and actionable CTA — v13.0
- ✓ CI pipeline with SHA-256 screenshot comparison, 90% pass rate gate, best-of-3 retry — v13.0
- ✓ Responsive tests at 375px/768px/1440px viewports — v13.0
- ✓ Edge case coverage: 404, session expiry, empty states, form validation, network errors — v13.0

### Active

(No active requirements — planning next milestone)

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
- Conditional scheduling triggers — high complexity
- Per-viewer personalization — privacy concerns

## Context

**Current State (post v13.0):**
- React 19 SPA with Supabase backend (auth, database, real-time)
- ~204,700 lines of JavaScript/JSX/CSS in src/
- 19 milestones shipped (v1 through v13.0), 125 phases, 351 plans executed
- Every page audited (v7.0), bugs resolved (v11.0), and E2E screenshot tested (v13.0)
- 148 E2E screenshot tests covering all pages and flows with CI artifact upload
- Error resilience: React error boundaries on all routes, API backoff, connection state indicator
- UX polish: 8 skeleton loader variants, redesigned error states with actionable CTAs
- Graceful degradation on all pages when Supabase RPCs unavailable
- Centralized widget registry with 17+ widget types (clock, date, weather, QR, video, data-table, RSS, social, countdown, menu-board, YouTube, Vimeo, web page, Google Slides, document, calendar, Canva)
- 7 Edge Function proxies: Unsplash, RSS, Weather, AI Designer, doc-converter, calendar-proxy, canva-proxy
- Enterprise features: SAML SSO, REST API gateway, Proof of Play reporting
- Content model: nested playlists, background audio, working hours scheduling
- Canva design import and multi-screen video wall with Realtime sync
- Player self-healing with content version verification and alert pipeline
- Cloud media imports: 5 providers + Canva with shared PKCE OAuth utility
- CI pipeline: SHA-256 screenshot comparison, 90% pass rate gate, best-of-3 retry
- ESLint: zero warnings, zero errors, all rules at error level with pre-commit enforcement
- Sentry error monitoring with Slack alerting

**Technical Debt (Minimal):**
- ~900 E2E tests skipped (intentional: ~800 project-specific multi-project pattern)
- Sentry alert environment set to "all" (will narrow to "production" once environment auto-creates)
- Unsplash offline caching: TOS may conflict with offline player requirement
- Duplicate legacy player_heartbeat RPC in usePlayerContent
- ViewPage passes wrong lastActivityRef to useStuckDetection
- canEditContent()/canEditScreens() async called sync in CampaignsPage
- SidebarSuggestedSection returns null (intentional stub)
- 3 standalone Sidebar*Section.jsx files are orphaned dead code
- PDF stored as single convertedPages entry (magick-wasm page splitting deferred)
- initiateSSOLogin() deprecated but not removed
- 13 E2E test tech debt items from v13.0 audit (defensive fallbacks, duplicate helpers, feature-gated screenshots)

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
| Player.jsx hooks before component extraction | Proven pattern needed first | ✓ Good — pattern works |
| Accept 1,265 lines Player.jsx | 56% reduction still achieved | ✓ Superseded — now 23 lines |
| Build order: Scheduling > Templates > Multi-Language | Risk order (extends > enhances > new) | ✓ Good — smooth progression |
| TZDate for schedule calculations | DST-safe handling required | ✓ Good — no DST bugs |
| Separate scenes for language variants | Simpler than embedded JSONB | ✓ Good — clean model |
| 3-level language fallback via RPC | Prevent blank screens | ✓ Good — no blank screens |
| Emergency bypasses language resolution | Same content for all devices | ✓ Good — instant push works |
| Starter packs via inline expansion | Better UX than separate page | ✓ Good — high engagement |
| Modal wizard for customization | Single-screen form per research | ✓ Good — fast completion |
| Player routing-only with ViewPage extraction | Clean separation of concerns | ✓ Good — 98% reduction |
| Global vi.mock for circular dependency | Breaks loggingService/supabase cycle | ✓ Good — tests pass |
| sideEffects for tree shaking | Explicit bundler hints | ✓ Good — verified working |
| Pre-commit hooks via Husky/lint-staged | Enforce quality at commit time | ✓ Good — clean commits |
| PropTypes at warn level | Gradual adoption without blocking | ✓ Good — coverage growing |
| Unified step sequence for onboarding | Single state machine prevents fragmentation | ✓ Good — 5 overlapping flows consolidated |
| Feature flag for onboarding rollout | Safe A/B testing and instant rollback | ✓ Good — legacy flow preserved |
| QR code primary pairing method | Faster than manual OTP entry | ✓ Good — 180px prominent |
| Screenshot proof deferred | 30+ second device polling infeasible | ✓ Accepted — text confirmation adequate |
| Modal-based editor isolation | Prevent navigation during editing | ✓ Good — 10s timeout with fallback |
| Custom Playwright fixtures for test isolation | authenticatedPage/freshPage patterns | ✓ Good — consistent test execution |
| Promise.race soft timeouts over waitForTimeout | Element-based waits are deterministic | ✓ Good — 172 calls removed |
| Best-of-3 E2E gate with 90% threshold | Account for environmental flakiness | ✓ Good — 92.7% achieved |
| Proxy-based Supabase instrumentation for Sentry | Automatic breadcrumbs without modifying consumers | ✓ Good — zero consumer changes |
| sendDefaultPii:false in Sentry | GDPR compliance | ✓ Good — no PII leakage |
| Hidden source maps via @sentry/vite-plugin | Readable stack traces without public exposure | ✓ Good — debug IDs auto-injected |
| Auto-injected release IDs (no manual Sentry.init release) | Prevents release mismatch between build and init | ✓ Good — eliminated drift |
| Feature flag removal over file deletion | De-wire first, delete in separate cleanup | ✓ Good — safe incremental approach |
| Corrective migration over editing applied migration | Migration 105 already applied to DB | ✓ Good — migration 141 safely alters schema |
| 9-category skip classification for E2E triage | Structured audit of 917 skips | ✓ Good — clear action paths per category |
| Disable react/prop-types, jsdoc, react-refresh ESLint rules | Impractical for this codebase | ✓ Good — 6,815 warnings eliminated instantly |
| _ prefix convention for unused variables | Consistent pattern across codebase | ✓ Good — 355 warnings fixed cleanly |
| eslint-disable with reason for mount-only effects | Inline functions recreate every render | ✓ Good — intentional suppression documented |
| All ESLint warn rules promoted to error | Zero-warning standard with enforcement | ✓ Good — pre-commit blocks violations |
| Dual Sentry alert strategy (issue + metric) | Different alert types for different patterns | ✓ Good — covers new errors and spikes |
| Database-backed Unsplash cache over Redis | PostgreSQL already available in Edge Functions | ✓ Good — no external dependency |
| Hourly window rate limiting (date_trunc) | Simpler than sliding window, adequate for per-tenant throttling | ✓ Good — clean implementation |
| Fire-and-forget download tracking | Never blocks user workflow per Unsplash TOS | ✓ Good — UX unaffected |
| Fixed height thumbnails (h-60/h-80) over aspect-ratio | Prevents layout shift during load | ✓ Good — consistent grid |
| cardLift preset (y-translate + scale + boxShadow) | Premium hover feel on template cards | ✓ Good — feels responsive |
| Dominant color replacement for brand colors | Simpler than per-object targeting | ✓ Good — intuitive UX |
| Iconify API with 5 curated prefixes | Avoids complex emoji SVGs, 15k+ quality icons | ✓ Good — vector insertion works |
| loadSVGFromString for icon insertion | Preserves scalability over rasterized FabricImage | ✓ Good — crisp at any size |
| Server-side Unsplash proxy (removed client key) | API key never reaches browser | ✓ Good — security improvement |
| Dark-themed editor overlays (shortcuts, customize) | Matches editor chrome aesthetic | ✓ Good — cohesive look |
| Scroll restore gated on loading===false with RAF | Prevents premature scroll before DOM ready | ✓ Good — accurate positioning |
| Full-bleed table rendering (no card wrapper) | Maximum screen real estate for data widgets | ✓ Good — clean display |
| Silent offline fallback for data widgets | No error UI on player screen (show cached data) | ✓ Good — seamless UX |
| fast-xml-parser + sanitize-html via npm: specifiers | Pure JS, no native deps for Deno Edge Functions | ✓ Good — RSS proxy works |
| 15-min cache TTL with conditional GET for RSS | Efficient feed refresh without hammering sources | ✓ Good — balanced freshness |
| Seamless ticker loop via content duplication | Render items twice, translateX(-50%) for wrap | ✓ Good — smooth animation |
| SocialFeedWidget as thin wrapper | SocialFeedRenderer manages own data lifecycle | ✓ Good — minimal coupling |
| Client-side status filtering for moderation | Avoids multiple API calls for tab switching | ✓ Good — responsive UI |
| TZDate for countdown timezone handling | DST-safe, device timezone via Intl.DateTimeFormat | ✓ Good — accurate countdowns |
| UNIT_LABELS constant for countdown locale | No I18nProvider dependency on player side | ✓ Good — lightweight |
| Dual-page state for fade transitions | currentPage vs displayedPage prevents content flash | ✓ Good — smooth pagination |
| Orchestrator version state for re-renders | useMemo in useWidgetData triggers consumer updates | ✓ Good — efficient reactivity |
| 200ms fade on DataTable/RssCard refresh only | Bulk content swaps need transition; tickers/social skip | ✓ Good — appropriate per widget |
| Widget registry as single source of truth | Eliminates 9 duplication sites; one-file registration | ✓ Good — all 12 types in registry |
| Duplicate resolveTimezone per widget | Avoids cross-component coupling; ~5 lines each | ✓ Good — simple, independent |
| Intl.DateTimeFormat.formatToParts for analog clock | No TZDate dependency for hand positioning | ✓ Good — accurate angles |
| Dual auth in weather-proxy Edge Function | JWTs for admin, anon key for unauthenticated players | ✓ Good — both paths work |
| Client-side in-memory cache + server DB cache | 30min client / 15min server TTL layers | ✓ Good — reduced API calls |
| hls.js light build for video streaming | Smaller bundle; full build not needed for signage | ✓ Good — HLS works |
| Per-element stall detection in VideoPlayer | Layouts have multiple independent video zones | ✓ Good — independent recovery |
| Client-side tag filtering on RPC results | <100 rows per tenant; RPC doesn't support .contains() | ✓ Good — fast enough |
| CSS rotation wraps entire LayoutRenderer | Not individual elements; per anti-pattern guidance | ✓ Good — clean rotation |
| No rotation for playlist-only mode | Playlists lack inherent aspect_ratio | ✓ Good — correct behavior |
| Immediate-save CRUD for menu board editor | Each action calls service with optimistic local state | ✓ Good — responsive editing |
| Nested DndContext for item reordering | Separate from category-level DndContext | ✓ Good — independent sorting |
| Realtime re-fetch via refreshTrigger counter | Simpler than granular state patching | ✓ Good — reliable sync |
| Browser timezone as editor preview default | Layouts are screen-agnostic; no inherent screen timezone | ✓ Good — reasonable default |
| Metrics in hook file not playerService | Browser APIs are player-specific | ✓ Good — clean separation |
| Individual try-catch per browser API call | Graceful degradation if one API unavailable | ✓ Good — robust on all platforms |
| DROP old function before CREATE OR REPLACE | Avoids PostgreSQL overload conflict on signature change | ✓ Good — clean migration |
| Dual-path alert resolution (heartbeat + cron) | Instant resolve on heartbeat, sweep catches edge cases | ✓ Good — reliable detection |
| ON CONFLICT upsert for alert coalescing | Eliminates race conditions vs SELECT-then-INSERT | ✓ Good — atomic operations |
| SQL-level severity escalation in cron | Fully autonomous cron job, no application code needed | ✓ Good — self-contained |
| Screenshot timing within heartbeat sendBeat | No separate setInterval; piggybacks on existing 30s cycle | ✓ Good — efficient |
| Recovery detection via wasOfflineRef | Set in catch block, cleared on successful heartbeat | ✓ Good — minimal state |
| Blank screen: 10s grace + 3 consecutive checks | 30s total prevents false positives during transitions | ✓ Good — avoids flapping |
| Recovery metrics only when crashCount > 0 | Avoids polluting normal telemetry with zero values | ✓ Good — clean data |
| Lightweight ID-based content version (mode:source:contentId) | Tizen/WebOS constraint precludes SHA-256 hashing | ✓ Good — fast computation |
| Mismatch suppressed during needs_refresh window | Prevents false positives immediately after publish | ✓ Good — no ghost alerts |
| verifiedAdvanceToNext wrapper at ViewPage level | All playlist transition paths go through verification | ✓ Good — single gate |
| All verification state uses refs not useState | Avoids player re-renders during mismatch handling | ✓ Good — no visual glitch |
| Recovery alerts detected at SQL level in heartbeat | Player may be in recovery loop, can't rely on JS dispatch | ✓ Good — server-authoritative |
| Postgres AFTER INSERT trigger for notifications | Handles ALL alert types reliably without JS coordination | ✓ Good — database-authoritative |
| Email restricted to critical severity only | Prevents alert fatigue per ALRT-05 requirement | ✓ Good — appropriate filtering |
| Reuse scene-editor controls in layout editor via prop adapter | Zero new component code for 5 widget types | ✓ Good — DRY, consistent UI |
| onPropChange adapter bridging scene/layout editor | Single-prop callback to object-based update | ✓ Good — clean interface |
| Size control for all 4 widgets with size in defaultProps | Consistent behavior across clock/date/weather | ✓ Good — uniform UX |
| Verify zero importers before dead code deletion | Safety check prevents breaking changes | ✓ Good — no regressions |
| SCRN-01/SCRN-02 confirmed complete, no changes needed | End-to-end verification vs unnecessary code | ✓ Good — avoided wasted work |
| AI-driven page audit approach for v7.0 | Code analysis catches import/prop bugs without runtime | ✓ Good — found 15+ import/collision bugs |
| Badge collision pattern: remove from lucide-react import | Design-system Badge shadows lucide-react Badge | ✓ Good — consistent fix across 5 pages |
| Modal prop rename isOpen→open | Design-system Modal uses open prop, not isOpen | ✓ Good — 3 pages fixed |
| Button variant outline→secondary | Design-system Button has no "outline" variant | ✓ Good — 8 occurrences fixed |
| onNavigate prop pattern over useNavigate | Parent controls navigation for embedded editors | ✓ Good — campaign and layout editors fixed |
| navigateAdapter for campaign editor | Bridges useCampaignEditor hook to onNavigate prop | ✓ Good — minimal adapter |
| Phase 91 gap closure approach | Audit-then-fix instead of re-executing phases | ✓ Good — surgical 2-plan phase |
| Quick task executor for small audit plans | Skip research/context agents for 1-3 task plans | ✓ Good — 5-minute execution |
| Dev auth bypass (VITE_DEV_BYPASS_AUTH) | MCP Playwright automation needs deterministic login | ✓ Good — env-gated, no production risk |
| Viewport projects with testMatch opt-in | Avoid tripling test suite run time | ✓ Good — responsive tests opt-in per spec |
| Screenshot artifacts 14-day CI retention | Documentation evidence without storage bloat | ✓ Good — sufficient for review cycles |
| Barrel re-exports for helpers backward compat | Existing imports continue working | ✓ Good — zero consumer changes |
| Dev-bypass detection in login tests | Skip gracefully when VITE_DEV_BYPASS_AUTH=true | ✓ Good — tests portable across configs |
| VITE_DEV_BYPASS_AUTH=false in webServer | Override .env.local for accurate E2E auth testing | ✓ Good — real auth flow tested |
| Promise.race soft timeouts for onboarding | Document visible state rather than fail on timing | ✓ Good — resilient evidence capture |
| Ship v8.0 with 2/18 phases complete | Capture infrastructure + auth foundation; resume later | — Accepted — 139 reqs deferred |
| Defensive typeof/$$typeof icon detection in EmptyState | Root cause fix for 6 page crashes instead of just changing call sites | ✓ Good — handles both component refs and JSX elements |
| Standardize all 13 EmptyState call sites to JSX pattern | Consistency even though defensive check handles both | ✓ Good — prevents future confusion |
| Service-level fallback (return defaults on error) | getUserSettings/getDashboardStats/DataSources swallow RPC errors | ✓ Good — pages never show error states for missing backend |
| Vite env vars as StatusPage fallback | import.meta.env.MODE for env name when health API unavailable | ✓ Good — always shows meaningful values |
| Content-Type header check for preview tokens | Detect HTML error pages before JSON.parse | ✓ Good — clean error page instead of parse crash |
| Centralized dev bypass utility (devBypass.js) | getAuthenticatedUserId with mock user fallback | ✓ Good — reusable across all services needing user ID |
| Inline dark-themed SVG export dialog | Matches editor's dark UI aesthetic | ✓ Good — cohesive look |
| canvas.toSVG() for vector export format | True vector output vs raster toDataURL for PNG/JPEG | ✓ Good — format-appropriate output |
| sm:hidden toggle for mobile filter collapse | 640px breakpoint gives small tablets more room | ✓ Good — accessible with aria-expanded |
| sm:grid-cols-2 lg:grid-cols-3 for pricing | Starts 2-column at 640px for better tablet use of space | ✓ Good — comfortable spacing |

| Edge Function proxy pattern (canva-proxy, calendar-proxy, doc-converter) | Server-side API key hiding, token refresh, CORS | ✓ Good — consistent pattern |
| signInWithSSO for SAML login | Preserves Supabase RLS session | ✓ Good — no custom auth bypass |
| Monthly table partitioning for Proof of Play | Performance at scale, auto-partition via pg_cron | ✓ Good — 15 partitions created |
| Server-side document conversion via Gotenberg | Smart TV (WebOS/Tizen) cannot render raw documents | ✓ Good — image-based display |
| Leader/follower Realtime broadcast for video wall | Simple sync model, 200ms drift threshold | ✓ Good — adequate for signage |
| Widget registry pattern in ZonePlayer | Single branch handles all 17+ widget types | ✓ Good — auto-extensible |
| Circular reference prevention via DB trigger | Guarantees data integrity regardless of client | ✓ Good — impossible to bypass |
| Canva PKCE OAuth via Edge Function proxy | No client-side secrets, server-side token storage | ✓ Good — secure flow |

---
*Last updated: 2026-03-12 after v13.0 milestone*
