# Research Summary: BizScreen v4.0 Data-Driven Signage Widgets

**Domain:** Digital signage platform -- data source rendering, social/RSS feeds, weather/time/countdown widgets
**Researched:** 2026-02-11
**Overall confidence:** HIGH

## Executive Summary

BizScreen v4.0 is a "last mile" milestone. After comprehensive analysis of the existing codebase -- reading every relevant service file, player widget, Edge Function, and database schema -- the critical finding is that 80% of the infrastructure for data-driven signage already exists. The data source pipeline (CRUD, Google Sheets sync, CSV import, real-time subscriptions, binding resolution) is complete. The social feed system (Instagram, Facebook, TikTok, Google Reviews with 5-layout renderer and offline-safe player rendering) is complete. Weather and clock widgets render live on the player. The actual work is connecting these existing services to the screen rendering pipeline and filling a handful of specific gaps.

Zero new npm dependencies are needed. The existing stack (date-fns ^4.1.0, isomorphic-dompurify ^2.35.0, framer-motion ^12.23.24, @supabase/supabase-js ^2.80.0) covers every feature requirement. The only additions are two Supabase Edge Functions (`rss-proxy` and `data-proxy`) following the proven `unsplash-proxy` pattern, one new player widget (`CountdownWidget`), and service layer extensions to wire existing data sources through to player rendering.

The highest-risk area is not the features themselves but the player-side data lifecycle: ensuring dynamic widget data survives offline mode (current IndexedDB cache only stores scenes and media, not widget data), preventing polling multiplier problems (50 screens x 10 data sources x 12 polls/hour = 6,000 queries/hour per tenant), and sanitizing external content (RSS feeds contain arbitrary HTML that must be stripped before player rendering). These architectural decisions must be made in Phase 1 -- getting them wrong means rewriting the data pipeline later.

The recommended approach is "server-cached, player-polled": all external APIs (Google Sheets, RSS, weather, social) are fetched server-side and cached in Supabase tables. The player never calls external APIs directly. This enables offline mode, avoids CORS issues on constrained Tizen/WebOS devices, and centralizes rate limiting.

## Key Findings

**Stack:** Zero new npm dependencies. Two new Supabase Edge Functions (rss-proxy, data-proxy). One new player widget (CountdownWidget). Service layer extensions to existing dataSourceService.js and dataBindingResolver.js.

**Architecture:** "Server-cached, player-polled" pattern. All external data flows through Supabase as single source of truth. Player reads from DB tables, never from external APIs directly. Widget blocks use existing `type: 'widget'` with `widgetType` discriminator -- no new block types needed. PlayerDataOrchestrator manages per-widget refresh intervals.

**Critical pitfall:** Offline cache gap. The current IndexedDB cache stores scenes and media blobs but has no store for widget data. A restaurant TV showing a Google Sheets menu board will display "Loading..." if the network drops. This must be solved in Phase 1 before any data widget ships to the player.

## Implications for Roadmap

Based on research, suggested phase structure:

### 1. Data Source Widget Pipeline (Foundation)
**Rationale:** Highest user value ("I connected my Google Sheet, now show it on screen") with the most existing infrastructure to leverage. Establishes the widget rendering pipeline that all subsequent features depend on.

**Addresses from FEATURES.md:**
- Google Sheets table display (table stakes)
- CSV data display (table stakes)
- Auto-refresh/polling (table stakes)
- Table layout with header/rows (table stakes)
- Data binding to scene text elements (table stakes)

**Avoids from PITFALLS.md:**
- P1: Offline cache gap (add `widgetData` IndexedDB store)
- P4: Render blocking (implement ready-signal protocol for ZonePlayer)
- P7: Schema changes breaking bindings (field alias detection)

**Key deliverables:**
- DataTableRenderer player component
- Widget data IndexedDB cache layer
- Per-widget configurable polling wiring
- Ready-signal protocol for ZonePlayer duration timer

### 2. RSS & External Data Proxy (Infrastructure)
**Rationale:** RSS feed rendering is blocked by a non-existent backend endpoint (`useAppData` calls `/api/apps/data` which does not exist). The Edge Function infrastructure must be built before any RSS or external data features can work. Also addresses the security pitfall of API keys in client bundle.

**Addresses from FEATURES.md:**
- RSS feed content display (table stakes)
- RSS card/article layout (differentiator)
- REST API data source type (differentiator)

**Avoids from PITFALLS.md:**
- P3: Google Sheets API key exposed in client bundle (move to Edge Function)
- P9: RSS feed HTML injection on player (sanitize server-side in Edge Function)
- P15: Dangerous poll interval values (enforce server-side minimums)

**Key deliverables:**
- `rss-proxy` Supabase Edge Function
- `data-proxy` Supabase Edge Function
- `rss_feed_cache` and `data_proxy_cache` DB tables
- RssFeedRenderer player component (ticker + card layouts)
- `REST_API` and `RSS_FEED` data source types

### 3. Social Feed & Content Moderation (Wiring)
**Rationale:** SocialFeedWidget and SocialFeedRenderer are fully built with 5 layout modes. The work is wiring them into the layout zone system and enforcing content moderation in the player query path. Lower risk because all components exist.

**Addresses from FEATURES.md:**
- Social media wall/feed display (table stakes)
- Social feed in layout zones (table stakes)
- Content moderation/approval queue (differentiator)
- Hashtag-based filtering (differentiator)

**Avoids from PITFALLS.md:**
- P5: Content moderation gap (add `moderation_mode` to settings, filter in player query)
- P13: Social feed image CDN URLs expire (re-host media to BizScreen storage)
- P10: Realtime subscription memory leaks (subscription manager singleton)

**Key deliverables:**
- Social feed as layout zone content type
- Moderation enforcement in SocialFeedRenderer query
- CDN URL re-hosting during sync
- Subscription lifecycle manager

### 4. Countdown Widget & Utility Enhancements (New Component)
**Rationale:** CountdownWidget is the only genuinely missing component. Zero backend dependencies -- pure client-side computation. Quick win that completes the widget palette.

**Addresses from FEATURES.md:**
- Countdown timer (table stakes)
- Custom date format per locale (differentiator)

**Avoids from PITFALLS.md:**
- P8: Countdown timezone mismatch (store target with timezone offset, use screen timezone)
- P6: Tizen/WebOS timer throttling (watchdog pattern for stale timer detection)

**Key deliverables:**
- CountdownWidget.jsx (following ClockWidget pattern)
- Timezone-aware date storage (ISO 8601 with offset)
- Timer watchdog for smart TV platforms
- Widget registration in player/widgets/index.js

### 5. Player Data Orchestrator & Polish (Integration)
**Rationale:** After individual widgets work, build the unified refresh management layer. This is the "glue" that ties all widget types into a coherent data lifecycle on the player.

**Addresses from FEATURES.md:**
- Configurable refresh intervals (table stakes)
- Real-time sync status indicator (table stakes)
- Multi-row auto-pagination (differentiator)
- Transition animations between data refreshes (differentiator)

**Avoids from PITFALLS.md:**
- P2: Polling interval multiplier (push-based architecture, single channel per screen)
- P14: Conflicting realtime channels (batch data resolution, debounced re-render)
- P11: Large datasets on low-RAM devices (enforce display limits)

**Key deliverables:**
- PlayerDataOrchestrator service
- Per-widget refresh timers with jitter
- Supabase Realtime subscription management
- "Last updated" indicator overlay
- Auto-pagination for data tables

### Phase Ordering Rationale

- **Phase 1 before all others:** The data source widget pipeline establishes patterns (IndexedDB widget cache, ready-signal protocol, polling wiring) that every subsequent phase depends on. Getting this wrong means rewriting later.
- **Phase 2 before 3:** RSS proxy Edge Function establishes the server-side proxy pattern that social feed enhancements (media re-hosting, moderation) also benefit from.
- **Phase 3 before 4:** Social feed integration validates the layout zone widget wiring pattern before the simpler countdown widget uses it.
- **Phase 4 is independent:** CountdownWidget has zero backend dependencies and can run in parallel with Phase 3 if resources allow.
- **Phase 5 last:** The orchestrator is integration glue. It should be built after individual widgets are functional, not before.

### Research Flags

- **Phase 1:** Needs careful design -- the ZonePlayer ready-signal protocol and IndexedDB schema migration are architectural decisions with long-lasting impact. Allocate design spike.
- **Phase 2:** Needs validation -- `fast-xml-parser` compatibility with Deno npm imports is MEDIUM confidence (training data only, not live-tested). Plan a prototype spike.
- **Phase 3:** Standard patterns -- SocialFeedRenderer and SocialFeedWidget are feature-complete. Integration work is low-risk.
- **Phase 4:** Standard patterns -- ClockWidget provides an exact template. Timezone handling is the only complexity.
- **Phase 5:** Needs Phase 1-4 completion data -- orchestrator design depends on actual refresh patterns observed in earlier phases.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Every existing package verified in package.json. Zero new deps confirmed by reading all service files and identifying which existing libraries cover each feature. |
| Features | HIGH | Feature landscape drawn from verified codebase analysis (what exists, what is missing) combined with digital signage industry knowledge. All "existing state" claims verified by reading source code. |
| Architecture | HIGH | Architecture recommendations based on patterns already proven in codebase (unsplash-proxy Edge Function, widget block system, data binding resolver). Extends existing patterns rather than introducing new ones. |
| Pitfalls | HIGH | All 15 pitfalls verified against specific code locations (line numbers cited). Offline cache gap confirmed by reading cacheService.js IndexedDB stores. Polling multiplier confirmed by reading subscription patterns. API key exposure confirmed by reading VITE_ env var usage. |

## Gaps to Address

- **fast-xml-parser Deno compatibility:** MEDIUM confidence. Pure JS library, 50M+ weekly downloads, but Deno npm import not live-tested. Needs prototype spike in Phase 2.
- **Tizen/WebOS timer behavior:** MEDIUM confidence. setInterval throttling on smart TV platforms is based on domain knowledge, not tested against BizScreen's specific deployment. Needs platform testing in Phase 4.
- **Google Sheets API key migration timing:** Moving from VITE_GOOGLE_API_KEY (client-exposed) to Edge Function (server-only) is a security fix but also a breaking change. Needs careful rollout -- cannot remove client key until Edge Function is deployed and tested.
- **IndexedDB schema migration:** Adding `widgetData` store requires incrementing DB_VERSION from 1 to 2. Must verify upgrade handler preserves existing cached scenes and media. Test on a player with existing cache before deployment.
- **Subscription channel limits:** Supabase Realtime has default limits (200-500 concurrent connections depending on plan). With 200 screens each subscribing to 3+ data source channels, this could be exceeded. Need to verify Supabase plan limits and implement single-channel-per-screen pattern if needed.

---

*Research completed: 2026-02-11*
*Ready for roadmap: Yes*
*Researcher: gsd-researcher (stack/features/architecture/pitfalls synthesis)*
