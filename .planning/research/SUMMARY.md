# Project Research Summary - v2

**Project:** BizScreen Digital Signage Platform - v2 Templates & Platform Polish
**Domain:** Feature expansion for production React/Supabase digital signage platform
**Researched:** 2026-01-24
**Confidence:** HIGH

## Executive Summary

BizScreen v2 adds three major feature sets to an existing multi-tenant digital signage platform: Templates Marketplace, Multi-Language Content, and Advanced Scheduling. v1 has shipped with 12 phases complete, including testing infrastructure, security hardening, player reliability, and GDPR compliance. The v2 research reveals that existing architecture provides strong foundations - template marketplace schema already exists (migration 080), basic i18n for admin UI is functional, and the scheduling system supports scene-based scheduling with priority handling.

The recommended approach is phased implementation prioritizing features with lower architectural risk first. Advanced Scheduling extends existing systems with minimal new patterns (campaigns as grouped schedule entries). Templates Marketplace enhances existing infrastructure with ratings, reviews, and improved UX. Multi-Language Content introduces the most architectural complexity through a translation overlay pattern that requires careful player integration and offline cache management. Critical dependencies: timezone handling for DST-aware scheduling (@date-fns/tz), star ratings for templates (@smastrom/react-rating), and careful handling of cache size explosion with language variants.

Key risks center on integration complexity rather than greenfield features. The three highest-impact pitfalls are: (1) DST transitions causing schedule gaps or double-plays during time changes, (2) offline cache size explosion when multiple language variants multiply storage requirements, and (3) template marketplace tenant isolation where shared templates must never leak data between tenants. Mitigation: use IANA timezone database for DST-aware calculations, implement selective language caching with LRU eviction, and verify RLS policies on all new template-related tables. Secondary risk is Player.jsx complexity growth (currently 2775 lines) - must complete component splitting BEFORE adding language switching, template refresh, and campaign priority handling.

## Key Findings

### Recommended Stack

BizScreen v2 requires minimal new dependencies. The existing foundation (date-fns v4.1.0, lodash, React 19, Tailwind) handles most needs. Only two new packages required.

**New dependencies for v2:**
- **@date-fns/tz 1.2.0**: Timezone-aware date operations with DST handling - official date-fns companion package, uses IANA timezone database via Intl API, critical for schedule resolution across timezones
- **@smastrom/react-rating 1.5.0**: Template ratings UI component - zero dependencies, 7k+ weekly downloads, supports half-star ratings and keyboard navigation

**Installation:** `npm install @date-fns/tz @smastrom/react-rating`

**Existing stack reuse:**
- **date-fns v4.1.0** (installed): Time calculations, schedule previews, campaign date ranges
- **lodash** (available): JSON path manipulation for translation overlays (set/get/cloneDeep), already used for throttle/debounce
- **Polotno editor** (existing): Template rendering, scene preview generation
- **Tailwind + Lucide** (existing): Custom calendar grid components (avoiding React 19 compatibility issues with react-big-calendar)

**Explicitly avoiding:**
- react-big-calendar (React 19 navigation bugs documented in GitHub issue #2701)
- moment-timezone (date-fns v4 + @date-fns/tz is modern, smaller alternative)
- Translation management platform SDKs (overkill for content translations, simple DB tables suffice)
- deepmerge library (lodash.set/cloneDeep handles JSON overlay merging)

**Version confidence:** All verified 2026-01-24, actively maintained

### Expected Features

Research reveals clear patterns for the three target v2 capabilities, with existing BizScreen infrastructure providing substantial foundations.

**Templates Marketplace - Must have (table stakes):**
- **Category browsing** - Templates organized by industry (restaurant, retail, corporate) - `template_categories` table EXISTS
- **Search functionality** - Text search by name/description - `fetchTemplates` service EXISTS
- **Template preview** - Visual preview before applying - `thumbnail_url` field EXISTS, needs modal
- **One-click apply** - Apply template creates usable content immediately - `applyTemplate` RPC EXISTS
- **Featured templates** - Curated selection on homepage - `is_featured` flag EXISTS
- **Orientation filter** - Landscape vs portrait - `meta.orientation` EXISTS
- **Template ratings/reviews** - Community feedback on template quality - NEW (simple star rating + review text)

**Templates Marketplace - Should have (competitive):**
- **Starter packs** - Pre-configured scene+layout+schedule bundles - `apply_pack_template` RPC EXISTS, needs UX refinement
- **Template customization wizard** - Guided replacement of placeholder content (logo, colors, text) - NEW, improves on raw editor for non-designers
- **Smart template suggestions** - Recommend templates based on user's industry/usage - NEW, leverages `business_type` from onboarding
- **Usage analytics** - Show which templates perform best - NEW, extends existing analytics infrastructure

**Multi-Language Content - Must have (table stakes):**
- **Content language variants** - Same scene/playlist with multiple language versions - NEW (needs schema: translation table pattern)
- **Per-device language assignment** - Device plays content in assigned language - NEW (add `language_code` to `tv_devices`)
- **Language fallback** - If variant missing, show default language - NEW (player content resolution logic)
- **CMS language selector** - Easy toggle between language versions when editing - NEW (UI component for scene editor)
- **Language indicator** - Visual badge showing which languages have content - NEW (UI badge on content cards)
- **Bulk language management** - View all content needing translation in one place - NEW (translation status dashboard)

**Multi-Language Content - Should have (competitive):**
- **Screen group language assignment** - Assign language to group, all devices inherit - NEW, leverages existing `screen_groups` table
- **Translation workflow** - Track draft/review/approved status per language - NEW, similar to existing content approval workflow
- **AI translation suggestions** - Machine translation as starting point - DEFER to post-v2 (medium complexity, quality concerns)

**Advanced Scheduling - Must have (table stakes):**
- **Date range scheduling** - Content plays only between start/end dates - `start_date`/`end_date` fields EXIST in `schedule_entries`
- **Priority levels** - Higher priority content overrides lower - `priority` field EXISTS, verify player respects it
- **Conflict detection** - Warn when entries overlap - `check_schedule_entry_conflicts` RPC EXISTS
- **Week preview** - Visual 7-day view of schedule - `getWeekPreview` function EXISTS
- **Campaign grouping** - Group related schedule entries as campaign - NEW (needs `campaigns` table or campaign_id field)
- **Emergency override** - Instant content push that overrides all schedules - NEW (max priority entry + push notification to players)

**Advanced Scheduling - Should have (competitive):**
- **Campaign analytics** - Performance metrics grouped by campaign - NEW, extends existing analytics to campaign level
- **Content rotation rules** - Percentage-based content mix within time slot - NEW (multiple entries same slot with rotation logic)
- **Frequency limits** - Play content max N times per hour/day - NEW (add to `schedule_entries`)
- **Campaign templates** - Save campaign configuration for reuse - NEW (serialize campaign as JSON template)

**Defer to Post-v2:**
- **Canva integration** - Edit templates with Canva, sync to BizScreen - HIGH complexity, requires Canva Connect API
- **User template marketplace** - Buy/sell templates between users - Not aligned with platform model, requires complex moderation
- **AI-generated templates** - Generative AI for templates - Emerging trend but adds complexity, unpredictable results
- **RTL language support** - Hebrew, Arabic require complete UI/content mirroring - Current i18n config is LTR only
- **Real-time translation display** - On-screen language switching - Viewer-confusing and technically complex
- **Conditional triggers** - Play based on external data (weather, inventory) - HIGH complexity (though data feeds infrastructure exists)
- **Multi-zone scheduling** - Different content per zone within layout, per time - HIGH complexity, extends layout zone concept

### Architecture Approach

Research shows three distinct integration patterns, prioritized by architectural risk: Scheduling extends existing systems, Templates enhances existing infrastructure, Multi-Language introduces new translation overlay pattern.

**Build order recommendation:** Advanced Scheduling → Templates Marketplace → Multi-Language Content (lowest to highest architectural complexity and risk).

**Advanced Scheduling Architecture:**
Extends existing `schedules` and `schedule_entries` tables with campaigns concept. Priority resolution logic already exists in `get_resolved_player_content()` - campaign check inserts before schedule check in existing priority chain.

**Major components:**
1. **campaigns table** - Date-bounded content pushes with priority, device/group targeting
2. **campaign_entries table** - Content for campaign with optional time-of-day rules, rotation settings
3. **rotation_state table** - Tracks sequential rotation per device/campaign
4. **Enhanced priority resolution** - Device override → Campaign (priority-sorted) → Group scene → Device schedule → Group schedule → Device fallback
5. **DST-aware calculations** - @date-fns/tz for timezone-aware date operations using device.timezone

**Templates Marketplace Architecture:**
Enhances existing `template_library` tables (migration 080) with community features.

**Major components:**
1. **template_reviews table** - Ratings (1-5 stars) + review text, one per user per template
2. **template_submissions table** - User-submitted templates pending approval
3. **MarketplacePage.jsx** - Template browsing with category filters, search, ratings display
4. **Template installation flow** - Extends existing `clone_template_to_scene()` RPC, must use tenant context correctly
5. **Rating aggregation** - avg_rating and review_count columns on template_library

**Multi-Language Content Architecture:**
Translation table pattern to avoid content duplication. Stores translations separately from base scenes.

**Major components:**
1. **scene_slide_translations table** - Per-locale overrides stored as JSON path overrides (e.g., `{"blocks.0.props.text": "Bienvenido"}`)
2. **Translation merge strategy** - Player fetches base design_json + translations for device locale, applies lodash.set() to merge
3. **LocaleSwitcher UI** - Side panel in scene editor for switching editing locale
4. **Device language preference** - `display_locale` column on `tv_devices` and `screen_groups`
5. **Offline cache consideration** - Cache device locale + fallback (en) to avoid cache explosion

**Integration points with existing architecture:**
- Templates ratings integrate with `marketplaceService.js` (add rating CRUD methods)
- Template preview reuses Polotno editor scene rendering
- Content translations integrate with existing `design_json` structure (JSON overlay pattern)
- Locale picker reuses existing `i18nConfig.js` locale definitions
- Timezone handling uses existing `schedules.timezone` column
- Campaign calendar uses existing Tailwind + React patterns (custom grid, avoiding third-party libraries)

**Player.jsx impact:**
Templates: minimal (template refresh on install)
Multi-Language: moderate (locale switching, translation merge logic)
Advanced Scheduling: moderate (campaign priority handling, rotation algorithms)

**CRITICAL:** Must complete Player.jsx component splitting (currently 2775 lines) BEFORE adding v2 features. Extract LanguageController, ScheduleResolver, ContentRenderer as separate components. New features add to extracted components, not monolith.

### Critical Pitfalls

Based on codebase analysis, existing architecture constraints (offline-first, multi-tenant), and domain research, these are must-avoid mistakes for v2:

1. **DST Transition Causes Content to Skip or Double-Play** (CRITICAL) — Schedule entry for "2:30 AM daily" plays twice when clocks fall back, or not at all during spring-forward "impossible hour". BizScreen's `scheduleService.js` uses `start_time` and `end_time` as time strings; `getWeekPreview()` date arithmetic may not handle DST boundaries correctly. CONCERNS.md already flags "Edge case: daylight saving time transitions" under Schedule Engine fragility. **Prevention:** Use @date-fns/tz for DST-aware calculations, store all schedule times with explicit timezone (already have `timezone` column), add explicit handling for DST transition days (skip impossible hour with warning, handle double hour by playing once at first occurrence), add integration tests for DST transition dates. **Phase mapping:** Must address in scheduling core logic phase.

2. **Offline Cache Size Explosion with Language Variants** (CRITICAL) — Player caches content for offline use. Multi-language scenes create N copies of each scene (one per language). Cache size multiplies by number of languages. Current `offlineService.js` caches scenes by ID. `OFFLINE_CONFIG.MAX_QUEUE_SIZE: 100` exists but only for events, no cache size limit for scenes/media. Player devices (especially Tizen/WebOS) have limited storage. **Prevention:** Design decision for one scene with language-embedded content vs. separate scene per language, implement LRU eviction in cache (only keep active language cached), implement selective caching (only cache user's selected language(s)), add cache size limit (e.g., 500MB) with automatic eviction, add player diagnostic showing cache usage by language. **Phase mapping:** Critical design decision for multi-language architecture phase.

3. **Template Cloning Leaks Tenant Context** (CRITICAL) — When user installs a template, the cloned scene inherits incorrect tenant context. Scene appears in wrong tenant's library, or RLS policies block access entirely. BizScreen uses `owner_id` for RLS policies (verified in 53 services). Template cloning must set the correct owner, but the `clone_template_to_scene` RPC may inherit the template creator's ID instead of the installing user's tenant. Current `marketplaceService.js` calls `clone_template_to_scene` RPC. The RPC must explicitly use `getEffectiveOwnerId()` pattern from `tenantService.js` to resolve the correct tenant. **Prevention:** Verify `clone_template_to_scene` RPC uses `auth.uid()` or equivalent (not template's `created_by`), add test for installing template while impersonating client (verify scene owned by client), add test for installing same template from two tenants (verify no cross-contamination), log `owner_id` assignment during clone operation for audit. **Phase mapping:** Must address in early templates phase before public release.

4. **Missing Translation Fallback Causes Blank Screens** (CRITICAL) — Content created in English, user adds Spanish translation but misses some text fields. Player in Spanish mode shows blank text or crashes on undefined content. No fallback chain implemented. If Spanish translation missing, should fall back to English. Current i18n (`I18nContext.jsx`) has fallback for admin UI, but content translations are different pattern. Content is stored in `design_json` in scenes. If multi-language adds language-keyed text values, missing keys need graceful handling. **Prevention:** Implement content translation fallback (missing translation → default language → original value), add translation completeness indicator in editor ("Spanish: 80% translated"), prevent publishing content with incomplete critical translations, in player log missing translation keys for debugging but never show blank, follow i18next fallback principles. **Phase mapping:** Must address in multi-language content editor design.

5. **Campaign Priority Conflicts with Real-Time Updates Create Race Conditions** (CRITICAL) — Admin changes campaign priority while content is playing. Player receives update mid-playback. Player shows content from old schedule, then jumps to new, creating jarring experience. Real-time subscriptions push changes immediately. Player may be mid-slide when priority changes affect what should be showing. Player uses `subscribeToDeviceRefresh` from `realtimeService.js`. Immediate refresh during playback disrupts experience. Current Player.jsx handles real-time sync with `checkDeviceRefreshStatus` and `clearDeviceRefreshFlag`. **Prevention:** Queue schedule updates to apply at content boundary (after current item finishes), add transition buffer (don't apply changes during active playback, wait for natural transition), priority changes effective "on next cycle" not immediately, exception for emergency/interrupt content with highest priority can preempt immediately, display "updating schedule..." transition screen during refresh. **Phase mapping:** Address in campaign scheduling implementation.

**Additional moderate pitfalls:**
- **Template Versioning Breaks Installed Scenes** - Marketplace admin updates template, users who installed it either lose customizations when auto-updated or never see important fixes. Store `source_template_id` and `source_template_version`, provide "update available" notification, never auto-update without explicit user action.
- **Language Sync Race Condition on Device Language Change** - Device language setting changes while offline, player shows mixed content until full sync occurs. Define language source (device setting, user profile, or screen assignment), cache content for all configured languages (limited set: 2-3), add visual indicator showing content language vs device language mismatch.
- **Player.jsx Grows Even Larger with New Features** - Templates, multi-language, and scheduling all add code to Player.jsx (already 2775 lines). Complete Player.jsx component splitting BEFORE adding new features, extract LanguageController/ScheduleResolver/ContentRenderer as separate components, set hard limit of 1000 lines for Player.jsx (enforce in CI).
- **New Database Migrations Break Existing Player Cache** - New features add columns to scenes/schedules tables, cached content in player IndexedDB doesn't have new fields, player code assumes fields exist and crashes. All new fields must have default values in migration, player code must handle missing fields gracefully (optional chaining), bump `PLAYER_VERSION` constant to invalidate old cache on major schema changes.

## Implications for Roadmap

Based on research findings, dependencies, and risk assessment, recommended phase structure for v2:

### Phase 1: Technical Foundation - Player.jsx Splitting
**Rationale:** MUST precede v2 features. Player.jsx at 2775 lines (PROJECT.md tech debt). Templates, multi-language, scheduling will ALL add code to Player. Component splitting deferred from v1 but now blocking. Multi-language needs LanguageController, scheduling needs ScheduleResolver, templates need ContentRenderer. Adding features to monolith increases fragility.

**Delivers:**
- Widget extraction: ClockWidget, DateWidget, WeatherWidget, QRCodeWidget to `src/player/components/widgets/`
- Hook extraction (dependency order): useStuckDetection → useKioskMode → usePlayerHeartbeat → usePlayerCommands → usePlayerContent
- Scene/Layout extraction: SceneRenderer, SceneBlock, LayoutRenderer, ZoneRenderer
- LanguageController component (placeholder for multi-language)
- ScheduleResolver component (placeholder for campaigns)
- Directory restructure: `src/player/` with pages/, components/, hooks/, context/
- Set hard limit: Player.jsx max 1000 lines, enforce in CI

**Addresses:** Player.jsx growth pitfall (PITFALLS.md), v1 tech debt from PROJECT.md
**Avoids:** Adding features to 2775-line monolith
**Uses:** Strangler Fig pattern from v1 refactoring
**Complexity:** HIGH - offline capability MUST work after every change

**Research needed:** None - extraction patterns documented in V2_ARCHITECTURE.md

### Phase 2: Advanced Scheduling - Core Infrastructure
**Rationale:** Lowest architectural risk. Extends existing `schedule_entries` table. `get_resolved_player_content()` already has priority logic. Player already handles schedule-based content. DST handling is critical pitfall that must be addressed early.

**Delivers:**
- @date-fns/tz integration for DST-aware calculations
- Add date range columns to `schedule_entries`
- Create `campaigns` and `campaign_entries` tables
- Update `get_resolved_player_content()` with campaign logic (insert before schedule check)
- DST transition handling (skip impossible hour, handle double hour)
- Integration tests for DST transition dates (spring-forward, fall-back)

**Addresses:** Table stakes date range scheduling, DST pitfall (PITFALLS.md critical #1)
**Uses:** @date-fns/tz 1.2.0, existing schedules.timezone column
**Integrates with:** ScheduleResolver component from Phase 1
**Complexity:** MEDIUM - extends existing system

**Research needed:** None - DST handling patterns documented in PITFALLS.md

### Phase 3: Advanced Scheduling - Campaign Management
**Rationale:** After core scheduling infrastructure (Phase 2). Adds campaign grouping, priority override, content rotation. Builds on Phase 2 date range foundation.

**Delivers:**
- CampaignManager.jsx UI for campaign CRUD
- Campaign calendar visualization (custom week grid with Tailwind, avoiding react-big-calendar)
- Content rotation algorithms (sequential, weighted random)
- `rotation_state` table for sequential rotation tracking
- Priority conflict resolution (queue updates to content boundary)
- Emergency override capability (max priority + push notification)

**Addresses:** Campaign grouping (table stakes), emergency override (enterprise requirement), priority race condition pitfall (PITFALLS.md critical #5)
**Uses:** Existing Tailwind + React patterns for calendar grid
**Integrates with:** ScheduleResolver component, existing realtimeService.js
**Complexity:** MEDIUM - new UI, rotation logic

**Research needed:** None - campaign patterns documented in V2_ARCHITECTURE.md

### Phase 4: Advanced Scheduling - Polish & Analytics
**Rationale:** After core campaigns (Phase 3). Adds frequency limits, campaign templates, analytics. Lower priority than core functionality.

**Delivers:**
- Frequency limits (max N plays per hour/day)
- Campaign templates (save/reuse configuration)
- Campaign analytics view (performance metrics by campaign)
- Conflict detection enhancements (visual timeline showing all scheduled content)
- DaypartingGrid component for 7x24 hour grid editing

**Addresses:** Competitive features (frequency limits, analytics)
**Uses:** Existing analytics infrastructure
**Complexity:** LOW-MEDIUM - extends existing features

**Research needed:** None - patterns documented in FEATURES.md

### Phase 5: Templates Marketplace - Core Infrastructure
**Rationale:** Independent of scheduling. Core infrastructure exists (template_library, marketplaceService.js). Lower risk than multi-language. Tenant isolation is critical pitfall.

**Delivers:**
- @smastrom/react-rating integration
- `template_reviews` table with RLS policies
- Verify `clone_template_to_scene` RPC uses correct tenant context (`auth.uid()` not template creator)
- Test: install template while impersonating client (verify scene owned by client)
- Test: install same template from two tenants (verify no cross-contamination)
- Template rating/review CRUD in marketplaceService.js

**Addresses:** Template ratings (table stakes), tenant isolation pitfall (PITFALLS.md critical #3)
**Uses:** @smastrom/react-rating 1.5.0, existing marketplaceService.js
**Complexity:** LOW - extends existing system

**Research needed:** None - RLS patterns documented in PITFALLS.md

### Phase 6: Templates Marketplace - Enhanced Discovery
**Rationale:** After core marketplace (Phase 5). Improves UX with better browsing, search, preview. Category infrastructure exists.

**Delivers:**
- MarketplacePage.jsx with category sidebar, search, rating filters
- TemplateCard.jsx for grid view
- TemplateDetailModal.jsx with full-size preview, rating display, install button
- Template preview using existing Polotno editor rendering
- Featured templates widget on dashboard (uses existing `is_featured` flag)
- Rating aggregation (avg_rating, review_count on template_library)

**Addresses:** Table stakes category browsing, search, preview
**Uses:** Existing template_categories table, Polotno editor
**Complexity:** MEDIUM - new UI components

**Research needed:** None - UI patterns documented in V2_ARCHITECTURE.md

### Phase 7: Templates Marketplace - Submission Workflow
**Rationale:** After marketplace browsing (Phase 6). User submissions add moderation complexity. Similar to existing content approval workflow.

**Delivers:**
- `template_submissions` table with RLS policies
- SubmitTemplateModal.jsx in Scene Editor ("Submit as Template" button)
- Admin approval UI (review submissions, approve/reject with notes)
- Copy scene/slides to template_library on approval
- Template versioning support (store `source_template_id`, `source_template_version`)
- "Update available" notification for installed templates

**Addresses:** User template submissions (competitive), versioning pitfall (PITFALLS.md moderate)
**Uses:** Existing approval workflow patterns from v1
**Complexity:** MEDIUM - approval flow, version tracking

**Research needed:** None - patterns documented in FEATURES.md

### Phase 8: Multi-Language Content - Schema & Core Logic
**Rationale:** After templates (independent). Highest architectural complexity. Requires careful design for cache management and fallback handling.

**Delivers:**
- `scene_slide_translations` table with RLS policies (stores JSON path overrides)
- `playlist_item_translations` table
- `display_locale` column on `tv_devices` and `screen_groups`
- translationService.js for translation CRUD
- Translation merge strategy (lodash.set for JSON path overrides)
- Translation fallback logic (missing → default language → original value)
- Cache management strategy (device locale + fallback, LRU eviction)

**Addresses:** Content language variants (table stakes), cache explosion pitfall (PITFALLS.md critical #2), translation fallback pitfall (PITFALLS.md critical #4)
**Uses:** Existing lodash for JSON path manipulation, design_json structure
**Complexity:** HIGH - new pattern, player integration

**Research needed:** None - translation patterns documented in V2_ARCHITECTURE.md

### Phase 9: Multi-Language Content - Editor & UI
**Rationale:** After schema/logic (Phase 8). Builds UI for translation management on solid foundation.

**Delivers:**
- LocaleSwitcher component in scene editor toolbar
- TranslationPanel side panel for editing translations
- TranslationBadge showing translation status ("es: 80% translated")
- Device language settings UI (device detail page)
- Screen group language assignment (inherit to devices)
- Bulk language management dashboard (translation status across all content)

**Addresses:** CMS language selector, language indicator, bulk management (table stakes)
**Uses:** Existing i18nConfig.js locale definitions
**Integrates with:** LanguageController component from Phase 1
**Complexity:** MEDIUM - new UI components

**Research needed:** None - UI patterns documented in V2_ARCHITECTURE.md

### Phase 10: Multi-Language Content - Player Integration
**Rationale:** After editor (Phase 9). Player changes are highest risk due to offline complexity.

**Delivers:**
- Update `get_resolved_player_content()` with translation merge logic
- Locale resolution for devices (device.display_locale or group.display_locale)
- Offline cache updates (cache device locale + fallback)
- Cache size monitoring (diagnostic showing cache usage by language)
- Language sync handling (visual indicator for content vs device language mismatch)
- Testing across locales (verify merge logic, fallback, offline behavior)

**Addresses:** Player content resolution, language sync race condition pitfall (PITFALLS.md moderate)
**Uses:** LanguageController component, existing offlineService.js
**Complexity:** HIGH - offline cache complexity, careful testing needed

**Research needed:** None - player integration documented in V2_ARCHITECTURE.md

### Phase 11: Platform Polish - Mobile Responsive Admin
**Rationale:** Independent of core features. Improves UX for mobile device management. Can be implemented in parallel with other phases.

**Delivers:**
- Mobile-responsive navigation (hamburger menu, bottom nav)
- Touch-optimized controls (larger tap targets, swipe gestures)
- Mobile-optimized tables (card view, horizontal scroll)
- Mobile scene editor (simplified controls, preview mode)
- Mobile dashboard (widget grid, pull-to-refresh)

**Addresses:** Platform polish goal from v2 target features
**Uses:** Existing Tailwind responsive utilities
**Complexity:** MEDIUM - responsive design patterns

**Research needed:** Minimal - responsive patterns well-documented

### Phase 12: Platform Polish - Onboarding & Dashboard
**Rationale:** After core features complete. Improves first-time user experience and daily usage.

**Delivers:**
- Onboarding wizard (account setup, first device pairing, first content)
- Template starter packs on onboarding (use existing `apply_pack_template` RPC)
- Dashboard redesign (activity feed, quick actions, template suggestions)
- Smart template suggestions (based on `business_type` from onboarding)
- Welcome tour (product walkthrough for new users)

**Addresses:** Platform polish goal, starter packs (competitive feature)
**Uses:** Existing templates infrastructure
**Complexity:** MEDIUM - new user flows

**Research needed:** Minimal - onboarding patterns well-documented

### Phase Ordering Rationale

**Dependency-driven sequence:**
- Player splitting (Phase 1) must precede ALL feature work - cannot add to 2775-line monolith
- Scheduling phases sequential (2 → 3 → 4) - core infrastructure before campaigns before polish
- Templates phases sequential (5 → 6 → 7) - ratings before discovery before submissions
- Multi-language phases sequential (8 → 9 → 10) - schema before editor before player
- Platform polish phases (11-12) independent, can run in parallel

**Risk mitigation:**
- Lowest risk first: Scheduling extends existing, Templates enhances existing, Multi-Language new pattern
- DST handling early (Phase 2) - critical pitfall, affects all scheduling features
- Tenant isolation verification early (Phase 5) - critical security concern
- Player integration last (Phase 10) - highest complexity, offline testing needed

**Architecture-driven grouping:**
- Scheduling phases grouped (all campaign-related)
- Templates phases grouped (all marketplace-related)
- Multi-language phases grouped (all translation-related)
- Each group delivers value incrementally

**Value delivery:**
- Phase 2-4: Complete advanced scheduling feature set
- Phase 5-7: Complete templates marketplace feature set
- Phase 8-10: Complete multi-language content feature set
- Phase 11-12: Platform polish improvements

### Research Flags

**Phases with standard patterns (skip /gsd:research-phase):**
- **Phase 1 (Player Splitting):** React custom hook extraction well-documented, Strangler Fig pattern from v1
- **Phase 2-4 (Scheduling):** date-fns-tz usage clear, campaign patterns documented
- **Phase 5-7 (Templates):** RLS patterns established, marketplace UX patterns clear
- **Phase 8-10 (Multi-Language):** Translation table pattern documented, i18n fallback principles clear
- **Phase 11-12 (Polish):** Responsive design and onboarding patterns well-documented

**Phases needing validation during planning:**
- **Phase 2:** @date-fns/tz integration - verify date-fns v4.1.0 compatibility, test DST transition handling for specific timezones (America/New_York spring-forward, fall-back)
- **Phase 8:** Translation cache strategy - benchmark cache size growth with multiple languages, test LRU eviction on actual player devices (Tizen/WebOS storage limits)
- **Phase 10:** Player merge logic - extensive testing needed for offline scenarios, translation fallback, cache invalidation

**No deep research needed:** Existing architecture analysis, domain research, and library documentation provide sufficient guidance for all phases.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Minimal new dependencies (@date-fns/tz, @smastrom/react-rating), existing stack handles most needs, versions verified 2026-01-24 |
| Features | HIGH | Industry research from Yodeck, ScreenCloud, Xibo, existing BizScreen infrastructure verified from migrations 080, 074, 041 |
| Architecture | HIGH | Translation table pattern sound, campaign extension clear, player integration points identified from codebase analysis |
| Pitfalls | HIGH | BizScreen-specific (DST from CONCERNS.md, cache explosion from offlineService.js, tenant isolation from RLS patterns), domain-specific (marketplace moderation, language fallback) |

**Overall confidence:** HIGH

Research based on actual codebase analysis (migrations 080, 074, 041 reviewed), existing infrastructure verified (marketplaceService.js, scheduleService.js, i18nConfig.js examined), library compatibility confirmed (@date-fns/tz with date-fns v4.1.0, @smastrom/react-rating zero dependencies), industry practices cross-referenced (Yodeck 400+ templates, ScreenCloud multi-language, Xibo priority scheduling), Player.jsx impact assessed (current 2775 lines, component boundaries identified).

### Gaps to Address

**During planning/execution:**

- **Cache size benchmarking:** Measure actual cache growth with 2-3 language variants before Phase 8, test on target devices (Tizen, WebOS) to establish cache limits
- **DST transition testing:** Add integration tests for specific DST transition dates (2026-03-08 spring-forward, 2026-11-01 fall-back) during Phase 2, verify skip/double-play handling
- **Tenant isolation verification:** Comprehensive cross-tenant testing during Phase 5 (install template as Tenant A, verify no access from Tenant B), admin impersonation test (verify correct owner_id)
- **Translation completeness thresholds:** Define "critical translation" fields during Phase 8 (e.g., main heading required, footer text optional), establish completeness percentage for publish gate
- **Player.jsx refactoring validation:** Establish offline capability tests before Phase 1 (pairing flow, playlist playback, offline fallback), run after every extraction to verify no regression
- **Campaign priority resolution:** Test real-time priority changes during Phase 3 (change campaign priority mid-playback), verify content boundary queueing works
- **Template versioning policy:** Document update notification behavior during Phase 7 (when to notify, how to handle breaking changes), establish version numbering scheme

**No blockers identified:** All gaps are execution details, not fundamental unknowns. Research provides clear direction for v2 roadmap creation. v1 completion provides testing infrastructure, logging foundation, and component patterns to build upon.

## Sources

### Primary (HIGH confidence)

**Codebase analysis:**
- `/Users/massimodamico/bizscreen/supabase/migrations/080_template_marketplace.sql` - template_library, template_library_slides, template_categories tables
- `/Users/massimodamico/bizscreen/supabase/migrations/074_scene_scheduling.sql` - schedules, schedule_entries tables
- `/Users/massimodamico/bizscreen/supabase/migrations/041_internationalization_locale_preferences.sql` - profiles.preferred_locale
- `/Users/massimodamico/bizscreen/src/services/marketplaceService.js` - template CRUD, clone_template_to_scene RPC
- `/Users/massimodamico/bizscreen/src/services/scheduleService.js` - getWeekPreview, priority resolution
- `/Users/massimodamico/bizscreen/src/i18n/i18nConfig.js` - 6 locales (en, es, pt, it, fr, de)
- `/Users/massimodamico/bizscreen/src/services/offlineService.js` - cache management, OFFLINE_CONFIG
- CONCERNS.md - "Edge case: daylight saving time transitions" flagged
- PROJECT.md - "Player.jsx at 2775 lines (hooks extracted, component splitting deferred)"

**Official documentation:**
- [date-fns v4 with Time Zone Support](https://blog.date-fns.org/v40-with-time-zone-support/) - @date-fns/tz official announcement
- [@date-fns/tz GitHub](https://github.com/date-fns/tz) - Package documentation
- [@smastrom/react-rating GitHub](https://github.com/smastrom/react-rating) - Zero-dependency React rating component
- [npm package verification](https://www.npmjs.com/) - @date-fns/tz 1.2.0, @smastrom/react-rating 1.5.0 (verified 2026-01-24)

### Secondary (MEDIUM confidence)

**Industry standards:**
- [Yodeck Digital Signage](https://www.yodeck.com/) - 400+ templates, Canva integration
- [ScreenCloud Multilingual](https://screencloud.com/digital-signage/multilingual) - Language assignment patterns
- [Xibo Priority and Display Order](https://account.xibosignage.com/manual/en/scheduling_priority_display_order) - Priority scheduling documentation
- [NowSignage Content Scheduling](https://www.nowsignage.com/2024/07/content-scheduling) - Campaign scheduling
- [MetroClick Multi-Language Support](https://www.metroclick.com/digital-signage/software/implementing-multi-language-support-in-digital-signage-software/) - Technical considerations
- [Fugo Multi-Language Support](https://www.fugo.ai/wiki/localized-multi-language-support/) - Cultural adaptation

**Technical patterns:**
- [react-big-calendar React 19 Issue #2701](https://github.com/jquense/react-big-calendar/issues/2701) - Compatibility problems
- [PWA Service Worker Caching Strategies](https://www.magicbell.com/blog/offline-first-pwas-service-worker-caching-strategies) - Offline caching
- [i18next Fallback Principles](https://www.i18next.com/principles/fallback) - Translation fallback
- [Rails DST Handling](https://medium.com/@kabirpathak99/understanding-daylight-saving-time-dst-and-how-rails-handles-it-be218bb1ecd8) - DST patterns
- [Supabase RLS Multi-Tenant](https://dev.to/blackie360/-enforcing-row-level-security-in-supabase-a-deep-dive-into-lockins-multi-tenant-architecture-4hd2) - Tenant isolation

### Tertiary (LOW confidence - already validated)
- None - all sources cross-referenced and verified

---
*Research completed: 2026-01-24*
*Ready for roadmap: yes*
