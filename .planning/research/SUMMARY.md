# Project Research Summary

**Project:** BizScreen v12.0 Feature Parity
**Domain:** Digital signage platform -- closing feature gap with Yodeck, OptiSigns, ScreenCloud, Rise Vision
**Researched:** 2026-03-02
**Confidence:** HIGH

## Executive Summary

BizScreen v12.0 adds 14 features to reach competitive parity with established digital signage platforms. The research reveals a remarkably strong foundation: 10 of 14 features require zero new npm dependencies. The codebase already contains working OAuth flows for Google and Canva, a SAML/SSO service with provider CRUD, an API token system with 9 scopes and SHA-256 hashing, a playback tracking pipeline with offline queuing, a 12-type widget registry with automatic editor/player integration, and 4 production Edge Functions establishing the server-side proxy pattern. The only new production dependency is `pdfjs-dist` for PDF page rendering. This is not a greenfield build -- it is a wiring and finishing exercise on top of substantial existing infrastructure.

The recommended approach is to build outward from established patterns. Widget registry entries (YouTube, Vimeo, web page, calendar, Google Slides, documents) follow a proven one-file registration pattern. Media pipeline extensions (expiration dates, audio tracks, document conversion) build on the existing `media_assets` table and player rendering. Enterprise features (SSO, REST API, Proof of Play) wire existing service layers to their intended backends. The architecture research confirms that all 14 features fall into 5 clear integration categories, each with well-defined component boundaries and data flow patterns.

The primary risks are concentrated in four areas: nested playlists introducing infinite recursion in the content resolution RPC (which the player calls every 30 seconds); document display failing silently on WebOS/Tizen smart TV platforms if rendered client-side instead of server-side; video wall synchronization requiring a fundamentally different cross-device coordination model; and the public REST API potentially leaking tenant data if Edge Functions use the service role key. All four have concrete prevention strategies identified in the pitfalls research. The critical architectural constraint is that all new features must produce Supabase Auth sessions (not bypass them) and all new tables must include tenant isolation via RLS.

## Key Findings

### Recommended Stack

The existing stack (React 19, Supabase 2.80, Vite 7, S3, Vercel) handles all 14 features with minimal additions. Only 1 new npm package is needed (`pdfjs-dist` for PDF rendering), 4 new Supabase Edge Functions, 5 new database tables, 3 table modifications, and 8 new widget types in the registry. The total bundle impact is approximately 20KB for pdfjs-dist core, with its 800KB worker loaded separately.

**Core technologies (all existing):**
- **React 19 + Vite 7**: Frontend framework -- no changes needed
- **Supabase 2.80 (Auth, Realtime, Edge Functions, Postgres)**: Backend -- SSO via `signInWithSSO()`, Realtime for video wall sync, Edge Functions for API gateway and proxies, pg_cron for media expiration and power schedules
- **Widget Registry (`src/widgets/registry.js`)**: Extensible pattern for all new content types -- add one entry, get editor and player support automatically
- **Existing OAuth infrastructure (`cloudOAuthService.js`, `canvaService.js`)**: Extend scopes for Google Calendar, Google Slides; Canva flow already complete

**Only new dependency:**
- **`pdfjs-dist` ^4.x**: PDF page-to-canvas rendering -- Mozilla's PDF.js, the universal standard for browser PDF rendering. Worker loaded separately to avoid bundle bloat.

**Server-side addition:**
- **Document conversion API** (CloudConvert or Gotenberg): For DOCX/PPTX/XLSX to PDF/image conversion. Recommendation: start with PDF-only in Edge Function; Office format conversion via external service is a future enhancement.

### Expected Features

**Must have (table stakes -- 10 features):**
- YouTube/Vimeo embedding -- every competitor has this; LOW complexity (iframe + URL parser)
- Web page display widget -- all 4 competitors offer URL-as-content; LOW complexity (promote existing `WebPageApp`)
- Document display (PDF) -- corporate lobby/HR boards rely on this; MEDIUM complexity (conversion pipeline)
- Media expiration dates -- compliance requirement for pharma/finance/food; LOW complexity (single column + filter)
- Nested/sub-playlists -- essential for multi-department content mixing; MEDIUM complexity (recursive CTE)
- Working hours / power scheduling -- expected by any business with 5+ screens; MEDIUM complexity
- Proof of Play reporting -- required for advertising networks, franchise compliance; MEDIUM complexity (data collection exists, need reporting UI)
- Audio / background music -- common in retail, restaurants, waiting rooms; MEDIUM complexity
- Calendar widgets (Google/Outlook) -- meeting room displays are top-3 signage use case; MEDIUM complexity
- Google Slides integration -- users already have presentations they want on screens; LOW-MEDIUM complexity

**Should have (differentiators -- 4 features):**
- Public REST API with key management -- well-documented, scoped API is a genuine differentiator vs. competitors' limited APIs
- SSO via SAML -- instant credibility with enterprise IT procurement
- Video wall support -- "wow" feature, multi-screen synchronized display
- Canva integration (OAuth import) -- only OptiSigns has meaningful Canva integration

**Defer (v2+):**
- Video wall frame-perfect sync (software loose-sync sufficient for v12)
- API write endpoints beyond media upload and playlist update
- SCIM user provisioning
- CEC hardware power commands (start with software black-screen)
- Native video transcoding
- Client-side Office rendering
- GraphQL API endpoint

### Architecture Approach

The 14 features integrate into the existing architecture through 5 clear tiers: (1) widget registry extensions for new content types, (2) media pipeline extensions for documents/expiration/audio, (3) content model extensions for nested playlists and power scheduling, (4) enterprise/API layer for SSO/REST API/Proof of Play, and (5) advanced player features for video wall and Canva import. Each tier has defined component boundaries, and the build order follows dependency chains -- widget registry entries first (zero risk, established pattern), then content model changes (core table migrations), then enterprise services (isolated from content pipeline), then advanced integrations (highest external dependency).

**Major components:**
1. **Widget Registry (6 new types)** -- YouTube, Vimeo, web page, calendar, Google Slides, document viewer; each is a single-file registration following the `ClockWidget` pattern
2. **Media Pipeline** -- `document-converter` Edge Function for PDF-to-image; `expires_at` column on `media_assets`; persistent `<audio>` element in ViewPage for background music
3. **Content Resolution RPC** -- Modified `get_resolved_player_content` with recursive CTE for nested playlists, expiration filtering, audio track inclusion, and video wall tile config
4. **API Gateway** -- Single `api-gateway` Edge Function routing REST requests, validating `biz_` tokens via SHA-256 hash lookup, enforcing scopes and rate limits
5. **Player Coordination** -- `useVideoWallSync` hook with Supabase Realtime leader/follower broadcast; `useWorkingHours` for display power; `useAudioTrack` for persistent background music
6. **SSO Integration** -- Wire existing `ssoService.js` to `supabase.auth.signInWithSSO()` for SAML flow; domain-based auto-detection on login page

### Critical Pitfalls

1. **Nested playlist infinite recursion** -- The content resolution RPC runs every 30s on every player. Without depth limits and circular reference checks, Playlist A referencing Playlist B referencing Playlist A crashes the player and exhausts the connection pool. Prevention: recursive CTE with `max_depth = 5`, DB trigger preventing circular references at write time, flatten to flat array before sending to player. Must be in the FIRST migration before any UI allows nesting.

2. **Document display failing on smart TVs** -- PDF.js requires heavy JS execution that crashes WebOS/Tizen devices (256-512MB memory limits). Prevention: mandatory server-side conversion to PNG images at upload time. Player only receives image URLs. Never send document URLs to the player.

3. **SSO bypassing Supabase Auth and breaking RLS** -- If SAML is implemented as a separate auth mechanism, users have no `auth.uid()` and all RLS policies return empty results. Prevention: use `supabase.auth.signInWithSSO()` exclusively. SSO users MUST end up with a Supabase session. Never build a parallel auth system.

4. **Public API leaking tenant data** -- API tokens use a different auth model than user sessions. Using service role key in Edge Functions bypasses RLS entirely. Prevention: explicit `WHERE tenant_id = $1` in every API query (defense in depth), never use service role for external-facing endpoints, integration tests that verify cross-tenant access returns 403.

5. **Proof of Play table bloat** -- 1,000 screens at 6 items/minute = 8.6M rows/day. Without partitioning, queries degrade within weeks. Prevention: partition `playback_events` by month from day one, materialized summary views for dashboard queries, 90-day archival policy.

## Implications for Roadmap

Based on research, the 14 features naturally group into 4 phases ordered by dependency chains, risk level, and architectural integration category.

### Phase 1: Quick Wins -- Widget Registry and Media Expiration
**Rationale:** These follow the most established pattern in the codebase (widget registry entry = one file). Zero new tables needed for widgets, one ALTER TABLE for expiration. Highest feature-per-effort ratio. Ships visible value immediately.
**Delivers:** 4 user-facing features with immediate competitive parity impact
**Addresses:** YouTube/Vimeo embedding, Web page widget, Google Slides integration, Media expiration dates
**Avoids:** No risky table changes; iframe-based widgets have clear offline fallback strategy (cached thumbnail)
**Estimated effort:** 1 week
**Stack used:** Existing widget registry, existing iframe patterns, existing `date-fns`, native HTML5 `<input type="datetime-local">`
**Pitfall to implement:** YouTube/Vimeo offline fallback (thumbnail + "requires internet" message) must ship alongside embed widget, not as follow-up. Add `requiresNetwork` flag to widget registry.

### Phase 2: Content Model Extensions -- Playlists, Audio, and Power Scheduling
**Rationale:** These modify core content tables (`playlist_items`, `playlists`, new `screen_power_schedules`). Group them in a single migration batch to minimize schema churn. Nested playlists must come before Proof of Play (PoP needs to track all content types including nested items). Audio requires a new player-level `AudioManager` that coordinates with video playback.
**Delivers:** 3 features that deepen content management capabilities
**Addresses:** Nested/sub-playlists, Audio/background music, Working hours/power scheduling
**Avoids:** Nested playlist recursion (circular reference check in first migration); Audio conflicts on WebOS/Tizen (AudioManager enforces single-stream)
**Estimated effort:** 2 weeks
**Stack used:** PostgreSQL recursive CTE, HTML5 `<audio>`, pg_cron for power schedule evaluation
**Pitfall to implement:** Circular reference prevention trigger must exist BEFORE any UI allows playlist nesting. AudioManager must exist BEFORE background music widget.

### Phase 3: Enterprise Features -- SSO, REST API, and Proof of Play
**Rationale:** Isolated from the content resolution pipeline. Each builds on existing service infrastructure (ssoService, apiTokenService, playbackTrackingService). SSO should come before API because API tokens need proper auth context for tenant resolution. Proof of Play comes after all content types are trackable (including nested playlists from Phase 2).
**Delivers:** 3 enterprise-grade capabilities that unlock higher-tier plan revenue
**Addresses:** SSO via SAML, Public REST API with key management, Proof of Play reporting
**Avoids:** SSO bypassing RLS (use `supabase.auth.signInWithSSO()` exclusively); API tenant data leaks (explicit tenant filters in every query); PoP table bloat (partition by month from day one)
**Estimated effort:** 2-3 weeks
**Stack used:** Supabase Auth SSO, Edge Functions (api-gateway), existing apiTokenService scopes, pg_cron for partition management
**Pitfall to implement:** First API endpoint must include a cross-tenant isolation integration test establishing the pattern. SSO architecture decision (Supabase native) must be locked before implementation.

### Phase 4: Advanced Integrations -- Documents, Calendars, Canva, Video Wall
**Rationale:** Highest external dependency and complexity. Document conversion needs a new Edge Function (or external service). Calendar widgets need Google/Microsoft OAuth scope extensions. Canva needs to compose existing services into an import workflow. Video wall is the most architecturally different feature -- it requires cross-device coordination that does not exist in the current single-screen player model. These should be last because they benefit from all infrastructure built in earlier phases.
**Delivers:** 4 features completing competitive parity and adding enterprise "wow" factor
**Addresses:** Document display (PDF + Office), Calendar widgets (Google/Outlook), Canva integration deepening, Video wall support
**Avoids:** Document rendering crash on smart TVs (server-side conversion mandatory); Calendar token refresh failures (proactive refresh, not reactive); Video wall sync drift (leader/follower via Realtime channels)
**Estimated effort:** 2-3 weeks
**Stack used:** `pdfjs-dist` (new), CloudConvert or Gotenberg (new external), Google Calendar API, Microsoft Graph API, Supabase Realtime broadcast channels
**Pitfall to implement:** Document conversion must be server-side from day one. Video wall needs its own Realtime channel architecture -- do NOT retrofit the single-screen playback model.

### Phase Ordering Rationale

- **Phase 1 before Phase 2:** Widget registry entries are zero-risk and demonstrate immediate value. They also establish CSP updates (frame-src for YouTube/Vimeo/Google) that Phase 4's calendar and Slides widgets will need.
- **Phase 2 before Phase 3:** Content model changes (nested playlists, audio tracks) affect the content resolution RPC. Proof of Play reporting in Phase 3 must track content from nested playlists. Working hours scheduling establishes the pg_cron pattern reused by media expiration archival.
- **Phase 3 before Phase 4:** Enterprise features are isolated from content rendering. Building them before advanced integrations means the API is available for external integrations to use. SSO being in place means calendar OAuth can leverage proper enterprise auth.
- **Phase 4 last:** Document conversion, calendar proxies, and video wall sync all require new Edge Functions and external service integration. These have the highest risk of unexpected delays (API rate limits, platform compatibility, sync quality). Shipping them last means the platform is already competitive before tackling the hardest problems.
- **Google Calendar + Google Slides together in Phase 4:** Both require Google OAuth scope extensions. Implementing them together avoids re-authorization prompts and consolidates OAuth testing.

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 3 (SSO/SAML):** Supabase SSO provider registration requires either their enterprise plan or manual CLI configuration. Verify Supabase plan supports multi-tenant SAML. Test with at least one real IdP (Okta or Azure AD) during development.
- **Phase 4 (Document Conversion):** CloudConvert pricing and Gotenberg self-hosting tradeoffs need validation. `pdfjs-dist` Deno compatibility in Edge Functions needs verification -- it may require a separate Docker-based worker instead.
- **Phase 4 (Video Wall):** CSS transform tiling approach and Supabase Realtime sub-200ms latency for content sync need validation on physical hardware. Start with static content walls only.
- **Phase 4 (Calendar Widgets):** Microsoft Graph API requires Azure AD app registration with admin consent for `Calendars.Read` scope in many organizations. This is a setup friction point.

Phases with standard patterns (skip additional research):
- **Phase 1 (Widget Registry + Media Expiration):** All patterns are established in the codebase. Widget registration, iframe embedding, and ALTER TABLE for expiration are well-documented and proven.
- **Phase 2 (Nested Playlists, Audio):** PostgreSQL recursive CTEs are standard. HTML5 Audio API is universal. The main complexity is in the circular reference detection logic, which is algorithmic, not research-dependent.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | 10 of 14 features need zero new dependencies. Only `pdfjs-dist` is new. Codebase analysis confirms all existing capabilities. |
| Features | MEDIUM | Competitor feature knowledge is from training data, not live-verified. Feature behavior expectations are well-grounded but specific competitor UX details may have shifted. |
| Architecture | HIGH | Deep codebase analysis of all integration points (widget registry, player hooks, Edge Functions, services, migrations). All recommended patterns are extensions of existing code. |
| Pitfalls | HIGH | 8 critical pitfalls identified with concrete prevention strategies derived from codebase analysis. Recovery costs assessed. Cross-cutting concerns (offline, multi-tenant, player compatibility) thoroughly mapped. |

**Overall confidence:** HIGH

### Gaps to Address

- **CloudConvert vs. Gotenberg pricing:** Cannot verify current CloudConvert API pricing or Gotenberg Docker resource requirements without web access. Validate during Phase 4 planning. Start with PDF-only in Edge Function (no external service needed).
- **`pdfjs-dist` latest version:** Version ^4.x recommended but exact latest version unconfirmed. Run `npm info pdfjs-dist version` before installing.
- **`pdfjs-dist` Deno compatibility:** Whether pdfjs-dist runs in Supabase Edge Functions (Deno runtime) needs verification. If not, the document-converter Edge Function may need to call an external Lambda or use a different approach.
- **Supabase SSO plan requirements:** Multi-tenant SAML provider registration may require Supabase Pro/Enterprise. Verify plan capabilities before Phase 3.
- **YouTube/Vimeo on WebOS/Tizen:** iframe embedding works on web players but may have restrictions on smart TV webviews. Needs testing on target devices during Phase 1.
- **Video wall sync quality:** 100-200ms tolerance is the stated industry standard, but Supabase Realtime latency on real-world connections (especially behind corporate firewalls) needs validation.
- **Google OAuth verification:** Google shows warnings for unverified apps. OAuth verification takes 2-6 weeks. Should be initiated early, before Phase 4 calendar/Slides features ship.
- **Canva OAuth token storage:** Currently in localStorage (XSS risk). Migration to httpOnly cookies or server-side vault should be planned but is acceptable for MVP.

## Sources

### Primary (HIGH confidence)
- BizScreen codebase analysis (196K LOC) -- widget registry, services, player subsystem, Edge Functions, migrations, config files
- `src/widgets/registry.js` -- 12 widget types, extensible registration pattern
- `src/services/canvaService.js` -- complete OAuth PKCE flow with export polling
- `src/services/ssoService.js` -- SAML/OIDC provider config, enforcement, attribute mapping
- `src/services/apiTokenService.js` -- token generation with SHA-256, 9 scopes, rotation
- `src/services/playbackTrackingService.js` -- event queue, offline queue, 30s flush, batch insert RPC
- `src/player/pages/ViewPage.jsx` -- player orchestration with 8 hooks
- `src/player/components/AppRenderer.jsx` -- WebPageApp iframe pattern
- `src/player/offlineService.js` -- 3-phase offline sync, IndexedDB caching
- `supabase/migrations/` -- 155+ migrations establishing schema patterns and RLS

### Secondary (MEDIUM confidence)
- Training data knowledge of competitor platforms (Yodeck, OptiSigns, ScreenCloud, Rise Vision) -- feature expectations and implementation patterns
- Training data knowledge of YouTube/Vimeo iframe embed API parameters
- Training data knowledge of Google Slides embed URL format
- Training data knowledge of SAML complexity and Supabase Auth SSO capabilities
- Training data knowledge of PostgreSQL recursive CTEs and partition strategies

### Tertiary (LOW confidence)
- CloudConvert API pricing and current availability -- needs web verification
- `pdfjs-dist` v4.x Deno runtime compatibility -- needs testing
- Video wall CSS transform tiling precision on physical hardware -- needs validation
- CEC display power control availability across WebOS/Tizen versions -- needs device testing

---
*Research completed: 2026-03-02*
*Ready for roadmap: yes*
