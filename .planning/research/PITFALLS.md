# Pitfalls Research: BizScreen v2

**Project:** BizScreen Digital Signage Platform - v2 Features
**Features:** Templates Marketplace, Multi-Language Content, Advanced Scheduling
**Researched:** 2026-01-24
**Confidence:** HIGH (combination of codebase analysis, domain research, and verified patterns)

## Summary

Adding templates marketplace, multi-language content, and advanced scheduling to an existing multi-tenant, offline-capable digital signage platform presents specific integration challenges. The three highest-risk pitfalls are:

1. **Template marketplace tenant isolation** - Shared templates must never leak data between tenants or allow one tenant's customizations to affect another's
2. **Multi-language content offline cache explosion** - Caching all language variants multiplies storage requirements and creates sync complexity
3. **Schedule priority resolution race conditions** - Real-time updates to schedules can create conflicts with currently-playing content on offline devices

Each feature area has pitfalls that specifically interact with BizScreen's existing architecture: RLS-based multi-tenancy, offline-first player design, and real-time Supabase sync.

---

## Templates Marketplace Pitfalls

### Critical

#### Pitfall 1: Template Cloning Leaks Tenant Context

**What goes wrong:** When user installs a template, the cloned scene inherits incorrect tenant context. Scene appears in wrong tenant's library, or RLS policies block access entirely.

**Why it happens:** BizScreen uses `owner_id` for RLS policies (verified in 53 services). Template cloning must set the correct owner, but the `clone_template_to_scene` RPC may inherit the template creator's ID instead of the installing user's tenant.

**BizScreen-specific risk:** Current `marketplaceService.js` calls `clone_template_to_scene` RPC. The RPC must explicitly use `getEffectiveOwnerId()` pattern from `tenantService.js` to resolve the correct tenant.

**Warning signs:**
- Installed templates not appearing in user's scene list
- "No rows returned" errors from RLS on installed scenes
- Templates appearing in wrong tenant's library
- Admin impersonation installs attributed to admin instead of target tenant

**Prevention strategy:**
1. Verify `clone_template_to_scene` RPC uses `auth.uid()` or equivalent, not template's `created_by`
2. Add test: install template while impersonating client, verify scene owned by client
3. Add test: install same template from two tenants, verify no cross-contamination
4. Log `owner_id` assignment during clone operation for audit

**Phase mapping:** Must address in early templates phase before public release

**Confidence:** HIGH (verified from codebase analysis and [Supabase RLS multi-tenant patterns](https://dev.to/blackie360/-enforcing-row-level-security-in-supabase-a-deep-dive-into-lockins-multi-tenant-architecture-4hd2))

---

#### Pitfall 2: Marketplace Template Media Not Isolated from Tenant Media

**What goes wrong:** Template thumbnails/previews stored in same bucket as tenant media. Deletion of tenant media accidentally removes template assets, or template assets count against tenant storage quotas.

**Why it happens:** Current `uploadTemplateThumbnail` stores in `template-assets` bucket (good), but installed templates may reference media from tenant's bucket or shared pool.

**BizScreen-specific risk:** Storage quota enforcement exists (v1 feature). If cloned template media counts against quota, users may hit limits unexpectedly. If it doesn't count, there's no storage governance on installed content.

**Warning signs:**
- Template thumbnails breaking after unrelated media cleanup
- Storage quota exceeded immediately after template install
- Template preview images appearing in tenant's media library

**Prevention strategy:**
1. Establish clear separation: `template-assets` bucket for marketplace assets, `tenant-media` for user content
2. When cloning template, decide: copy media to tenant bucket (counts against quota) OR reference shared read-only assets (doesn't count)
3. Document policy clearly for users
4. Add `is_template_asset` flag to media_assets table to distinguish

**Phase mapping:** Address during templates architecture phase

**Confidence:** HIGH (BizScreen-specific, verified from storage quota feature in PROJECT.md)

---

#### Pitfall 3: Template Versioning Breaks Installed Scenes

**What goes wrong:** Marketplace admin updates a template. Users who previously installed it either (a) lose their customizations when auto-updated, or (b) never see important fixes.

**Why it happens:** No clear policy on relationship between marketplace template and installed scene.

**BizScreen-specific risk:** Installed scenes are independent copies (good for isolation). But if template had a bug (e.g., broken animation, incorrect data binding), there's no mechanism to notify users of fix or offer "re-install."

**Warning signs:**
- Users complaining about bugs in scenes that were already fixed in template
- Support requests about lost customizations
- Confusion about "why doesn't my scene match the template preview"

**Prevention strategy:**
1. Design decision: installed scenes are fully independent copies (current approach, maintain)
2. Store `source_template_id` and `source_template_version` on installed scenes
3. Provide "update available" notification if template version differs
4. Offer "re-install" action that preserves user's content bindings but updates structure
5. Never auto-update installed content without explicit user action

**Phase mapping:** Consider during templates UX design phase

**Confidence:** MEDIUM (design decision, not technical bug)

---

### Moderate

#### Pitfall 4: Enterprise License Bypass via Plan Downgrade

**What goes wrong:** User with Pro plan installs Pro-licensed template. User downgrades to Free plan. Scene still works, effectively giving free access to premium content.

**Why it happens:** License check happens at install time, not runtime. Once cloned, scene is user's content.

**Current code:** `verifyTemplatePermissions()` in `marketplaceService.js` checks `can_access_template` RPC, but only at install time.

**Warning signs:**
- Revenue leakage from premium templates
- Free users having Pro-only scenes
- Complaints from paying users about fairness

**Prevention strategy:**
1. Accept this as business model: once installed, content is yours (recommended for user experience)
2. OR add runtime check in player: flag `requires_license: 'pro'` on scene, player checks current plan
3. OR add "deactivate on downgrade" logic that marks scenes as inactive when plan drops

**Phase mapping:** Business decision needed before templates launch

**Confidence:** MEDIUM (business decision, current pattern is common in marketplace models)

---

#### Pitfall 5: Template Search Indexing Doesn't Update on Changes

**What goes wrong:** Admin updates template name/description in marketplace. Search results still show old values. Users can't find renamed templates.

**Why it happens:** Template search uses `ILIKE` on database columns directly (verified in `templateService.js` line 92). If caching is added for performance, stale results occur.

**Warning signs:**
- Search results not matching visible template names
- Newly added templates not appearing in search
- Deleted templates still appearing in results

**Prevention strategy:**
1. Ensure no search result caching, or implement proper cache invalidation
2. Use PostgreSQL full-text search with `to_tsvector` for better performance without caching risks
3. Add admin tool to manually refresh search index if caching added

**Phase mapping:** Consider during templates search implementation

**Confidence:** MEDIUM (potential issue, current implementation is direct query which avoids this)

---

#### Pitfall 6: Missing Content Moderation for User-Submitted Templates

**What goes wrong:** If allowing users to share templates (future feature), inappropriate content enters marketplace without review.

**Why it happens:** Current marketplace is admin-curated only. If expanded to user contributions, moderation pipeline needed.

**Warning signs:**
- Inappropriate images in template previews
- Copyright-infringing content
- Malicious content (e.g., templates with XSS in text fields)

**Prevention strategy:**
1. Keep marketplace admin-curated (current approach) - simplest
2. If enabling user submissions: require approval workflow, use content moderation API (e.g., [Azure AI Content Safety](https://learn.microsoft.com/en-us/azure/ai-services/content-safety/overview))
3. Implement DOMPurify sanitization on all template text fields (extends existing XSS prevention)

**Phase mapping:** Future feature, not immediate concern

**Confidence:** MEDIUM (applies only if user submissions enabled)

---

## Multi-Language Content Pitfalls

### Critical

#### Pitfall 7: Offline Cache Size Explosion with Language Variants

**What goes wrong:** Player caches content for offline use. Multi-language scenes create N copies of each scene (one per language). Cache size multiplies by number of languages.

**Why it happens:** Current `offlineService.js` caches scenes by ID. If each language variant is a separate scene, cache grows linearly with languages. If same scene ID with language-specific content, cache invalidation becomes complex.

**BizScreen-specific risk:** `OFFLINE_CONFIG.MAX_QUEUE_SIZE: 100` exists but only for events. No cache size limit for scenes/media. Player devices (especially Tizen/WebOS) have limited storage.

**Warning signs:**
- IndexedDB quota errors on player devices
- Player failing to cache new content after language expansion
- Slow player startup as cache loading increases

**Prevention strategy:**
1. Design decision: one scene with language-embedded content vs. separate scene per language
2. If separate scenes: implement LRU eviction in cache, only keep active language cached
3. If embedded: implement selective caching - only cache user's selected language(s)
4. Add cache size limit (e.g., 500MB) with automatic eviction
5. Add player diagnostic showing cache usage by language

**Phase mapping:** Critical design decision for multi-language architecture phase

**Confidence:** HIGH (verified from `offlineService.js` analysis and [PWA caching best practices](https://www.magicbell.com/blog/offline-first-pwas-service-worker-caching-strategies))

---

#### Pitfall 8: Language Sync Race Condition on Device Language Change

**What goes wrong:** Device language setting changes while offline. Player shows mixed content (some old language, some new) until full sync occurs.

**Why it happens:** Language selection may be device-local or server-side. If local, cached content doesn't match new language preference until reconnection.

**BizScreen-specific risk:** Player has `getConnectionStatus()` and offline detection. If language preference is local (from player settings), cached content won't update until online. If server-side (device profile), requires sync.

**Current code:** `I18nContext.jsx` stores locale in localStorage. This is admin UI, not player. Player language handling is separate concern.

**Warning signs:**
- Text in wrong language after settings change
- Partial translations (some elements translated, some not)
- User confusion about which language is "active"

**Prevention strategy:**
1. Define language source: device setting (local), user profile (server), or screen assignment (admin-controlled)
2. If admin-controlled: language is part of content sync, handled by existing `deviceSyncService`
3. If device-local: cache content for all configured languages (limited set, e.g., 2-3)
4. Add visual indicator showing content language vs. device language mismatch
5. Provide "refresh content" action that forces full sync

**Phase mapping:** Requires architectural decision in multi-language design phase

**Confidence:** HIGH (BizScreen-specific, verified from offline architecture analysis)

---

#### Pitfall 9: Missing Translation Fallback Causes Blank Screens

**What goes wrong:** Content created in English. User adds Spanish translation but misses some text fields. Player in Spanish mode shows blank text or crashes on undefined content.

**Why it happens:** No fallback chain. If Spanish translation missing, should fall back to English. Current i18n (`I18nContext.jsx`) has fallback for admin UI, but content translations are different.

**BizScreen-specific risk:** Content is stored in `design_json` in scenes. If multi-language adds language-keyed text values, missing keys need graceful handling.

**Warning signs:**
- Blank text areas in player
- "undefined" or `{{translation_key}}` showing on screen
- Content appearing differently in preview vs. player

**Prevention strategy:**
1. Implement content translation fallback: missing translation -> default language -> original value
2. Add translation completeness indicator in editor: "Spanish: 80% translated"
3. Prevent publishing content with incomplete critical translations
4. In player: log missing translation keys for debugging, never show blank
5. Follow [i18next fallback principles](https://www.i18next.com/principles/fallback)

**Phase mapping:** Must address in multi-language content editor design

**Confidence:** HIGH (verified from [i18next documentation](https://www.i18next.com/principles/fallback) and admin i18n analysis)

---

### Moderate

#### Pitfall 10: Date/Time Formatting Inconsistent Across Languages

**What goes wrong:** Schedule times display in user's locale format, but player uses device locale. User schedules "3:00 PM" but player in Germany shows "3:00" (interpreting as 24-hour time).

**Why it happens:** Date/time formatting is locale-dependent. AM/PM vs. 24-hour, date order (MM/DD vs. DD/MM) varies by locale.

**BizScreen-specific risk:** `scheduleService.js` uses `formatTime()` which assumes 12-hour format with AM/PM. Player must interpret consistently regardless of device locale.

**Current code:** `formatTime()` in `scheduleService.js` (lines 489-496) hardcodes 12-hour format.

**Warning signs:**
- Content showing at wrong time in different locales
- Schedule preview showing different time than actual play time
- User confusion about "what time will this actually play"

**Prevention strategy:**
1. Store all times in UTC or explicit timezone internally
2. Display times in user's locale in admin UI (existing)
3. Player interprets times relative to device's configured timezone (existing `timezone` column)
4. Add explicit timezone indicator in schedule UI: "9:00 AM EST"
5. Validate player and admin agree on interpretation with integration tests

**Phase mapping:** Address during multi-language content testing

**Confidence:** HIGH (verified from schedule service code and [DST handling patterns](https://www.baeldung.com/java-daylight-savings))

---

#### Pitfall 11: RTL Language Support Missing in Player

**What goes wrong:** Content in Arabic or Hebrew displays left-to-right instead of right-to-left. Text alignment, element positioning incorrect.

**Why it happens:** Current `i18nConfig.js` includes `direction: 'ltr'` for all locales. No RTL languages configured. Player rendering may not respect direction attribute.

**BizScreen-specific risk:** Scene rendering uses Polotno editor design. Text elements may have hardcoded alignment. CSS layouts may not flex for RTL.

**Warning signs:**
- Arabic text appearing reversed or misaligned
- Elements overlapping in RTL scenes
- Mirror-image layouts compared to design

**Prevention strategy:**
1. If supporting RTL languages: add `direction: 'rtl'` to locale config
2. Update player to set `dir` attribute on content container
3. Use logical CSS properties (`margin-inline-start` vs. `margin-left`)
4. Test with RTL-first scene to verify rendering
5. OR explicitly exclude RTL languages from supported list (current state)

**Phase mapping:** Scope decision for multi-language feature set

**Confidence:** MEDIUM (depends on language scope, current config is LTR only)

---

#### Pitfall 12: Translation Memory Inconsistency Across Content

**What goes wrong:** Same phrase translated differently in different scenes. "Add to Cart" is "Agregar" in one scene, "Anadir" in another. Brand consistency breaks.

**Why it happens:** No centralized translation management. Each scene translated independently.

**Warning signs:**
- Same term appearing differently across screens
- Brand phrases translated inconsistently
- User complaints about professionalism of translations

**Prevention strategy:**
1. Implement glossary/translation memory for common terms
2. Provide "translate from template" option using approved translations
3. Add consistency checker: flag when same source text has different translations
4. Consider integrating with translation management system for large deployments

**Phase mapping:** Nice-to-have for initial release, important for enterprise

**Confidence:** MEDIUM (UX improvement, not functional bug)

---

## Advanced Scheduling Pitfalls

### Critical

#### Pitfall 13: DST Transition Causes Content to Skip or Double-Play

**What goes wrong:** Schedule entry for "2:30 AM daily" plays twice when clocks fall back (spring), or not at all when clocks spring forward (fall "impossible hour").

**Why it happens:** The hour from 2:00-3:00 AM doesn't exist during spring-forward DST transition. The hour from 1:00-2:00 AM happens twice during fall-back.

**BizScreen-specific risk:** `scheduleService.js` uses `start_time` and `end_time` as time strings. `getWeekPreview()` does date arithmetic that may not handle DST boundaries correctly.

**Current concern flagged:** CONCERNS.md mentions "Edge case: daylight saving time transitions" under Schedule Engine fragility.

**Warning signs:**
- Content missing during early morning hours on DST transition days
- Same content playing twice in succession
- Schedule preview showing different times than actual play

**Prevention strategy:**
1. Store all schedule times with explicit timezone (already have `timezone` column on schedules)
2. Use IANA timezone database (date-fns-tz or similar) for DST-aware calculations
3. Add explicit handling for DST transition days:
   - Skip "impossible hour" entries with warning
   - Handle "double hour" by playing once (first occurrence)
4. Add integration tests for DST transition dates
5. Reference: [Rails DST handling patterns](https://medium.com/@kabirpathak99/understanding-daylight-saving-time-dst-and-how-rails-handles-it-be218bb1ecd8)

**Phase mapping:** Must address in scheduling core logic phase

**Confidence:** HIGH (verified from CONCERNS.md and [calendar DST bugs](https://github.com/fullcalendar/fullcalendar/issues/3887))

---

#### Pitfall 14: Campaign Priority Conflicts with Real-Time Updates Create Race Conditions

**What goes wrong:** Admin changes campaign priority while content is playing. Player receives update mid-playback. Player shows content from old schedule, then jumps to new, creating jarring experience.

**Why it happens:** Real-time subscriptions push changes immediately. Player may be mid-slide when priority changes affect what should be showing.

**BizScreen-specific risk:** Player uses `subscribeToDeviceRefresh` from `realtimeService.js`. Immediate refresh during playback disrupts experience.

**Current code:** Player.jsx handles real-time sync with `checkDeviceRefreshStatus` and `clearDeviceRefreshFlag`.

**Warning signs:**
- Content cutting off mid-video when schedules change
- Flashing/jumping between content items
- User reports of "screen went blank then restarted"

**Prevention strategy:**
1. Queue schedule updates to apply at content boundary (after current item finishes)
2. Add transition buffer: don't apply changes during active playback, wait for natural transition
3. Priority changes effective "on next cycle" not immediately
4. Exception: emergency/interrupt content with highest priority can preempt immediately
5. Display "updating schedule..." transition screen during refresh

**Phase mapping:** Address in campaign scheduling implementation

**Confidence:** HIGH (verified from Player.jsx real-time sync analysis and [Xibo priority patterns](https://account.xibosignage.com/manual/en/scheduling_priority_display_order))

---

#### Pitfall 15: Offline Device Misses Schedule Changes Until Reconnection

**What goes wrong:** Admin updates schedule priority/adds emergency content. Offline devices continue showing old schedule. No way to force update on disconnected screens.

**Why it happens:** Offline devices can't receive real-time updates. Cached schedule plays until reconnection.

**BizScreen-specific risk:** Offline capability is core feature. Extended offline periods (network outages, remote locations) mean schedule changes may not propagate for hours or days.

**Warning signs:**
- Emergency messages not showing on some screens
- Inconsistent content across screen network during outages
- Compliance content showing on some screens, not others

**Prevention strategy:**
1. Accept limitation: offline devices will be delayed (document clearly)
2. Add schedule "effective date" support: schedule content changes for future time when devices likely online
3. Show "last sync" timestamp prominently in admin dashboard per device
4. Add warning when publishing urgent content: "X devices offline, may not receive immediately"
5. Implement aggressive sync on reconnection: immediately fetch latest schedule before any playback

**Phase mapping:** Document in advanced scheduling feature requirements

**Confidence:** HIGH (fundamental offline architecture constraint)

---

### Moderate

#### Pitfall 16: Conflict Detection Misses Edge Cases

**What goes wrong:** Admin creates two schedule entries that don't obviously conflict (different days, overlapping date ranges). System allows it, but conflict exists on specific dates.

**Why it happens:** Current `checkEntryConflicts` RPC checks time/day overlap but may miss complex cases: recurring schedules, date range boundaries, priority override scenarios.

**BizScreen-specific risk:** `scheduleService.js` has `checkEntryConflicts()` (lines 747-775) but relies on RPC. Edge cases in RPC logic may not catch all conflicts.

**Warning signs:**
- Two content items playing simultaneously (split second flicker)
- Content expected to show not showing (preempted by undetected conflict)
- Admin confusion about "why isn't my content playing"

**Prevention strategy:**
1. Enhance conflict detection to simulate actual play sequence for date range
2. Add "preview week" with visual timeline showing all scheduled content
3. Implement "schedule validation" that runs before publishing
4. Color-code conflicts in schedule editor: yellow (priority will resolve), red (same priority conflict)

**Phase mapping:** Enhance during advanced scheduling UX phase

**Confidence:** MEDIUM (current implementation exists, edge cases may remain)

---

#### Pitfall 17: Campaign Date Ranges Without Timezone Cause Off-by-One

**What goes wrong:** Campaign scheduled from Jan 15-31. User in EST creates it. Screen in PST starts showing on Jan 14 (because midnight EST is 9 PM PST previous day).

**Why it happens:** Date ranges stored without timezone. "Jan 15" is ambiguous without specifying Jan 15 in which timezone.

**BizScreen-specific risk:** `schedule_entries` has `start_date` and `end_date` columns. If these are DATE type without timezone, interpretation varies.

**Current code:** `createScheduleEntry()` accepts `start_date` and `end_date` as strings.

**Warning signs:**
- Campaigns starting a day early in western timezones
- Campaigns ending a day early in eastern timezones
- "Why is my New Year's content showing on Dec 31?"

**Prevention strategy:**
1. Store dates with schedule's timezone context, not as bare dates
2. Alternatively: store as "screen-local date" meaning "Jan 15 in whatever timezone the screen is"
3. Display dates with timezone indicator in admin: "Jan 15 (screen local)"
4. Add campaign preview for specific timezone/location

**Phase mapping:** Address during campaign date range implementation

**Confidence:** HIGH (common calendar bug pattern from [multiple timezone display issues](https://learn.microsoft.com/en-us/troubleshoot/outlook/calendaring/additional-time-zone-shows-one-hour-offset-on-dst))

---

#### Pitfall 18: Content Rotation Weights Ignored by Simple Random

**What goes wrong:** Admin sets rotation weights: Promo A (80%), Promo B (20%). Simple random selection doesn't respect weights over short periods. In 5 plays, user might see Promo B 3 times.

**Why it happens:** Weighted random is probabilistic, not deterministic. Small sample sizes show high variance.

**Warning signs:**
- "Low weight content shows too often"
- "High weight content shows same as low weight"
- Analytics not matching configured weights

**Prevention strategy:**
1. Implement weighted rotation as "play order" not "random chance": AAAAB sequence for 80/20
2. Or implement "minimum guaranteed plays" before allowing low-weight content
3. Track actual play counts and adjust probability dynamically
4. Show expected vs. actual play ratio in analytics

**Phase mapping:** Address if implementing content rotation feature

**Confidence:** MEDIUM (depends on rotation algorithm chosen)

---

## Integration Pitfalls

These pitfalls specifically arise from adding new features to BizScreen's existing system.

### Critical

#### Pitfall 19: Player.jsx Grows Even Larger with New Features

**What goes wrong:** Templates, multi-language, and scheduling all add code to Player.jsx. Already at 2775 lines, it becomes unmaintainable.

**Why it happens:** Path of least resistance is adding to existing component. Hooks extracted but core component still large.

**BizScreen-specific risk:** PROJECT.md notes "Player.jsx at 2775 lines (hooks extracted, component splitting deferred)". New features will add language switching, template refresh, campaign priority handling.

**Warning signs:**
- Player.jsx exceeding 3000 lines
- Multiple developers conflicting on Player.jsx changes
- Increasing difficulty testing player behavior
- New player bugs introduced by unrelated changes

**Prevention strategy:**
1. Complete Player.jsx component splitting BEFORE adding new features
2. Extract: LanguageController, ScheduleResolver, ContentRenderer as separate components
3. New features add to extracted components, not monolith
4. Set hard limit: Player.jsx max 1000 lines, enforce in CI

**Phase mapping:** Technical foundation phase MUST precede feature phases

**Confidence:** HIGH (verified from PROJECT.md tech debt section)

---

#### Pitfall 20: New Features Skip Structured Logging

**What goes wrong:** Templates, multi-language, scheduling code uses console.log instead of structured logging. Production debugging impossible.

**Why it happens:** Developers copy existing patterns. 38% of services lack structured logging (PROJECT.md). New code follows bad examples.

**BizScreen-specific risk:** v1 added `loggingService.js` but adoption incomplete. New features may regress logging quality.

**Warning signs:**
- New services using console.log
- Production issues in new features hard to diagnose
- Log aggregation missing new feature events

**Prevention strategy:**
1. Complete structured logging migration (38% remaining) BEFORE adding features
2. Add lint rule requiring `createScopedLogger` import in new services
3. Provide logging code template for new features
4. Review checklist: "Uses structured logging throughout"

**Phase mapping:** Technical foundation phase, logging completion

**Confidence:** HIGH (verified from PROJECT.md and CONCERNS.md)

---

#### Pitfall 21: New Database Migrations Break Existing Player Cache

**What goes wrong:** New features add columns to scenes/schedules tables. Cached content in player IndexedDB doesn't have new fields. Player code assumes fields exist, crashes or shows wrong content.

**Why it happens:** Offline cache stores snapshot of database record. Schema changes make cached records invalid.

**BizScreen-specific risk:** `offlineService.js` caches scenes with `design_json`, `content_hash`, etc. If multi-language adds `language_variants` column, cached scenes won't have it.

**Warning signs:**
- Player crashes after deployment (only affects devices that were offline during deploy)
- "Cannot read property 'language_variants' of undefined" errors
- Content showing correctly for newly paired devices but not existing

**Prevention strategy:**
1. All new fields must have default values in migration
2. Player code must handle missing fields gracefully (optional chaining, defaults)
3. Add migration that invalidates old cache: bump `PLAYER_VERSION` constant
4. On major schema changes, force cache clear on reconnection
5. Test deployment with device that has week-old cached content

**Phase mapping:** Every migration in every phase must follow this pattern

**Confidence:** HIGH (BizScreen-specific, verified from offline architecture)

---

### Moderate

#### Pitfall 22: RLS Policies Not Updated for New Tables

**What goes wrong:** New feature adds `content_translations` table. No RLS policy added. Table is world-readable or completely inaccessible.

**Why it happens:** Developer forgets to add RLS when creating table. Supabase allows table creation without RLS.

**BizScreen-specific risk:** Multi-tenant relies entirely on RLS. Any table without proper policies breaks isolation or access.

**Warning signs:**
- New tables returning empty results for authenticated users
- Cross-tenant data visible in new features
- "permission denied for table" errors

**Prevention strategy:**
1. Checklist for every new table: "RLS enabled and policy added"
2. Migration template includes RLS policy boilerplate
3. Add CI check: all tables must have RLS enabled
4. Test new features while impersonating different tenants

**Phase mapping:** Every migration that adds tables

**Confidence:** HIGH (verified from [Supabase RLS pitfalls](https://www.leanware.co/insights/supabase-best-practices))

---

#### Pitfall 23: Real-Time Subscriptions Grow Unbounded

**What goes wrong:** Each new feature adds its own Supabase subscription. Templates, languages, campaigns each subscribe. Memory leaks, connection limits hit.

**Why it happens:** Easy to add new subscription, hard to track total count. CONCERNS.md already notes "Multiple subscriptions created; no unified cleanup strategy."

**BizScreen-specific risk:** Player already uses `subscribeToDeviceCommands`, `subscribeToDeviceRefresh`, `subscribeToSceneUpdates`. Adding more increases fragility.

**Warning signs:**
- Memory usage growing over time in player
- Supabase connection limit errors
- Subscriptions not cleaning up on component unmount

**Prevention strategy:**
1. Centralize all subscriptions in `realtimeService.js`
2. Use subscription multiplexing where possible
3. Add subscription count monitoring to player diagnostics
4. Implement automatic cleanup on reconnection
5. Set maximum active subscriptions (e.g., 5)

**Phase mapping:** Review during each feature implementation

**Confidence:** HIGH (verified from CONCERNS.md and realtimeService.js)

---

#### Pitfall 24: Test Coverage Regression on New Features

**What goes wrong:** New features ship without adequate tests. Future changes break them without detection.

**Why it happens:** Pressure to deliver features. Tests seen as optional. PROJECT.md mentions "1 flaky test in useCampaignEditor."

**Warning signs:**
- New services with 0% test coverage
- Regression bugs in new features after subsequent changes
- Manual QA becoming bottleneck

**Prevention strategy:**
1. Require tests for all new services (minimum: happy path + error case)
2. Fix flaky test BEFORE adding new tests
3. Add characterization tests for Player.jsx BEFORE adding features
4. Code review checklist: "Tests added for new functionality"

**Phase mapping:** Technical foundation phase, test improvements

**Confidence:** HIGH (verified from PROJECT.md test gaps)

---

## Phase Mapping Summary

Based on pitfall analysis, recommended phase order and pitfall addressing:

| Phase | Focus Area | Critical Pitfalls to Address |
|-------|------------|------------------------------|
| 1 | Technical Foundation | P19 (Player split), P20 (Logging), P24 (Tests), P21 (Cache compatibility) |
| 2 | Templates Core | P1 (Tenant isolation), P2 (Media isolation), P22 (RLS policies) |
| 3 | Templates UX | P3 (Versioning), P5 (Search), P4 (License) |
| 4 | Multi-Language Core | P7 (Cache explosion), P8 (Sync race), P9 (Fallback), P10 (Date/time) |
| 5 | Multi-Language Player | P11 (RTL), P21 (Migration) |
| 6 | Scheduling Core | P13 (DST), P17 (Timezone dates), P16 (Conflict detection) |
| 7 | Scheduling Advanced | P14 (Priority race), P15 (Offline delay), P18 (Rotation weights) |
| 8 | Integration | P23 (Subscriptions), review all integration points |

## Confidence Assessment

| Area | Confidence | Reason |
|------|------------|--------|
| Templates Marketplace | HIGH | Verified from marketplaceService.js, RLS patterns, storage architecture |
| Multi-Language | HIGH | Verified from i18n implementation, offlineService.js, PWA caching research |
| Advanced Scheduling | HIGH | Verified from scheduleService.js, CONCERNS.md flagged issues, DST research |
| Integration | HIGH | Verified from Player.jsx, PROJECT.md tech debt, CONCERNS.md fragile areas |

## Sources

### Multi-Tenant & RLS
- [Supabase RLS Multi-Tenant Architecture](https://dev.to/blackie360/-enforcing-row-level-security-in-supabase-a-deep-dive-into-lockins-multi-tenant-architecture-4hd2)
- [Supabase RLS Best Practices](https://www.leanware.co/insights/supabase-best-practices)
- [Multi-Tenant SaaS Pitfalls](https://www.future-processing.com/blog/multi-tenant-architecture/)

### Offline & Caching
- [PWA Service Worker Caching Strategies](https://www.magicbell.com/blog/offline-first-pwas-service-worker-caching-strategies)
- [Taming PWA Cache Behavior](https://iinteractive.com/resources/blog/taming-pwa-cache-behavior)
- [Offline Digital Signage Guide](https://blog.pisignage.com/offline-digital-signage-how-to-keep-your-screens-running-when-the-internet-doesnt-2025-guide/)

### Internationalization
- [i18next Fallback Principles](https://www.i18next.com/principles/fallback)
- [React Localization with i18next](https://phrase.com/blog/posts/localizing-react-apps-with-i18next/)
- [Multi-Language Digital Signage](https://www.metroclick.com/digital-signage/software/implementing-multi-language-support-in-digital-signage-software/)

### Scheduling & DST
- [Rails DST Handling](https://medium.com/@kabirpathak99/understanding-daylight-saving-time-dst-and-how-rails-handles-it-be218bb1ecd8)
- [FullCalendar DST Bug](https://github.com/fullcalendar/fullcalendar/issues/3887)
- [Calendar DST Troubleshooting](https://learn.microsoft.com/en-us/troubleshoot/outlook/calendaring/additional-time-zone-shows-one-hour-offset-on-dst)
- [Xibo Priority & Display Order](https://account.xibosignage.com/manual/en/scheduling_priority_display_order)

### Content Moderation
- [Azure AI Content Safety](https://learn.microsoft.com/en-us/azure/ai-services/content-safety/overview)
- [Marketplace Content Moderation Challenges](https://besedo.com/blog/10-content-moderation-challenges-for-marketplaces/)

---

## v3.0 Pitfalls: Premium Template Browsing, Editor Polish, Stock Assets

**Researched:** 2026-02-10
**Focus:** Animation implementation, Unsplash API integration, Polotno editor customization, bundle size management
**Confidence:** HIGH (codebase-specific analysis combined with verified API documentation)

### Summary

v3.0's pitfalls are fundamentally different from v2's. Where v2 dealt with multi-tenant data isolation and offline cache correctness, v3.0's risks center on:

1. **Polotno iframe boundary complexity** -- Custom panels (Unsplash, icons) must work inside an iframe running React 18, isolated from the main app's React 19
2. **Unsplash API compliance** -- Download tracking, attribution requirements, and rate limits are contractual obligations, not just best practices
3. **Animation performance** -- Framer Motion on 20-50 animated cards simultaneously can cause jank if not properly constrained

The good news: v3.0 adds zero new npm dependencies, so there are no new supply chain risks. The risks are integration risks, not dependency risks.

---

### Critical

#### Pitfall 25: Polotno Iframe Version Mismatch Breaks Custom Panels

**What goes wrong:** Custom side panels (Unsplash, icons) work in development but break in production because the Polotno iframe bundle uses a different SDK version than expected.

**Why it happens:** The polotno-build `package.json` specifies `polotno ^2.10.0` while the main app has `polotno ^2.33.2`. The `ImagesGrid`, `SectionTab`, and `useInfiniteAPI` imports may have different APIs between these versions.

**BizScreen-specific risk:** Verified from codebase: `scripts/polotno-build/package.json` has `"polotno": "^2.10.0"` and `"react": "^18.2.0"`. The main app's `package.json` has `"polotno": "^2.33.2"`. This is a 23+ minor version gap.

**Warning signs:**
- Custom panel renders empty or throws errors in production iframe
- `ImagesGrid` missing props or changed API signature
- "Cannot find module 'polotno/side-panel/images-grid'" in iframe build
- Editor works in dev but fails in production build

**Prevention strategy:**
1. **Before building custom panels:** Align polotno-build version to match main app (`^2.33.2`)
2. Test custom panel imports against the exact version used in the iframe build
3. Lock the iframe's Polotno version (remove `^` caret) to prevent unexpected upgrades
4. Add iframe build to CI -- if it fails, it fails early
5. Test the production iframe bundle (not just dev mode)

**Phase mapping:** MUST resolve in first phase before any Polotno customization work

**Confidence:** HIGH (verified by direct comparison of both `package.json` files)

---

#### Pitfall 26: Unsplash API Key Exposed in Client-Side Code

**What goes wrong:** `VITE_UNSPLASH_ACCESS_KEY` is bundled into client JavaScript. Anyone can extract it from browser dev tools. Malicious actors use your key, exhaust rate limits, or get your key revoked by Unsplash.

**Why it happens:** Vite's `VITE_` prefix is designed to expose env vars to client-side code. This is standard for frontend apps but inappropriate for API keys that can be abused.

**BizScreen-specific risk:** Two integration paths exist:
- **Main app:** `unsplashService.js` uses `import.meta.env.VITE_UNSPLASH_ACCESS_KEY` -- exposed to client
- **Polotno iframe:** Also needs the key, would need it passed via postMessage or embedded in iframe bundle

**Warning signs:**
- Rate limit errors (50 req/hr demo, 5000 req/hr production) appearing for legitimate users
- Unsplash revocation notice email
- Unexpected API usage spike in Unsplash dashboard

**Prevention strategy:**
1. **Recommended:** Proxy Unsplash requests through a Supabase Edge Function. Edge Function holds the secret key server-side. Client calls `/functions/v1/unsplash-proxy?query=landscape&page=1`. This also enables server-side caching and rate limiting per tenant.
2. **Acceptable minimum for v3.0 MVP:** Use `VITE_UNSPLASH_ACCESS_KEY` directly (simpler), but register for Unsplash production approval (5000 req/hr) and monitor usage. Migrate to proxy before public launch.
3. For the Polotno iframe: pass search results via postMessage bridge (main app does the API call, sends results to iframe). This avoids embedding the key in the iframe bundle entirely.

**Phase mapping:** Architecture decision needed before Unsplash integration work starts

**Confidence:** HIGH (ARCHITECTURE.md v3.0 already recommends the Edge Function proxy approach)

---

#### Pitfall 27: Unsplash Attribution and Download Tracking Non-Compliance

**What goes wrong:** BizScreen integrates Unsplash photos but fails to (a) call the download tracking endpoint when a user uses an image, or (b) display proper attribution. Unsplash revokes API access.

**Why it happens:** Developers focus on "search and display" and forget the compliance requirements. Attribution is especially easy to miss because it is a UX requirement, not a technical one.

**BizScreen-specific risk:** In digital signage, Unsplash photos end up displayed on screens in public spaces. The attribution requirement says "credit the photographer" but signage screens typically don't show credits. This creates a gray area.

**Unsplash API requirements (verified):**
- **Download tracking:** Must call `GET /photos/:id/download` when a photo is used in a design (not when displayed in search results). This is how photographers get credited for downloads.
- **Attribution:** Must show photographer name linking to their Unsplash profile with UTM params (`?utm_source=bizscreen&utm_medium=referral`). Required in the design editor UI, not necessarily on the display screen.
- **Hotlinking:** Must use Unsplash CDN URLs directly (`images.unsplash.com`). Do NOT re-host images.

**Warning signs:**
- Unsplash API access revoked with notice of TOS violation
- Missing download counts for photographers (harms their analytics)
- Legal notice from Unsplash about attribution

**Prevention strategy:**
1. Call download tracking endpoint in `onSelect` handler of the Unsplash panel (when user adds image to design, not when browsing)
2. Show attribution line in the editor panel: "Photo by [Name] on Unsplash" with link
3. Store photographer name + profile URL in design JSON alongside the image URL
4. Do NOT attempt to show attribution on the signage screen itself (signage screens are for content, not credits). The editor-level attribution satisfies the requirement.
5. Add unit test: every Unsplash image selection triggers download tracking

**Phase mapping:** Must be built into the Unsplash panel from day one, not retrofitted

**Confidence:** HIGH (verified from [Unsplash API Guidelines](https://help.unsplash.com/en/articles/2511245-unsplash-api-guidelines))

---

### Moderate

#### Pitfall 28: Framer Motion Stagger Animation Causes Jank on Large Grids

**What goes wrong:** Template grid renders 50 cards with `staggerChildren: 0.06`. The 50th card animates 3 seconds after the first. During this time, the browser is running 50 concurrent animations, causing frame drops and jank on lower-end devices.

**Why it happens:** Framer Motion `staggerChildren` applies delay incrementally. With many children, the total animation duration = items * stagger_delay. Each item runs its own requestAnimationFrame loop.

**BizScreen-specific risk:** `TemplateGrid.jsx` renders up to 50 templates in a 4-column grid. If all 50 animate simultaneously with stagger, that is 50 concurrent motion components.

**Warning signs:**
- Frame rate drops below 30fps during grid animation
- Visible jank/stuttering as cards animate in
- CPU usage spike visible in performance profiler
- Users on tablets/low-end devices experience poor performance

**Prevention strategy:**
1. Only animate cards that are in the viewport using `useInView` (skip off-screen cards)
2. Limit stagger to first visible row (4-8 cards) -- rest appear instantly
3. Use `will-change: transform, opacity` hint on animating elements
4. Keep animations simple: opacity + translateY only (no blur, no scale during stagger)
5. Add `layout` prop only when needed (layout animations are expensive)
6. Test on a mid-range tablet, not just a MacBook Pro

**Phase mapping:** Performance testing during template grid animation implementation

**Confidence:** HIGH (standard Framer Motion performance guidance from [motion.dev performance docs](https://motion.dev/docs/react-performance))

---

#### Pitfall 29: layoutId Shared Element Transition Fails Across Modal Boundary

**What goes wrong:** `layoutId` on TemplateCard expects to morph into EditorModal, but the Modal component uses React Portal (renders in different DOM subtree). The layout animation either doesn't fire or animates to the wrong position.

**Why it happens:** Framer Motion `layoutId` tracks elements by measuring their DOM position. React Portals move elements to a different part of the DOM tree (typically `document.body`). If `AnimatePresence` doesn't wrap both the source and target, the animation fails.

**BizScreen-specific risk:** BizScreen's `Modal` component (from design system) likely uses a Portal. The `TemplateCard` is inside the page content. The `EditorModal` is rendered at the root level via Portal.

**Warning signs:**
- Template card disappears, editor modal appears with no animation
- Card animates to wrong screen position (corner instead of center)
- Flash of unstyled content during transition
- Works in some browsers, not others

**Prevention strategy:**
1. Wrap the entire page (including modal portal target) in a single `LayoutGroup` component from Framer Motion
2. OR abandon `layoutId` for this transition and use a simpler approach: fade-out card + zoom-in modal with matching thumbnail
3. Test the transition with the actual Modal component in a prototype BEFORE building the full flow
4. Have a fallback: if `layoutId` doesn't work reliably, a well-timed fade/scale transition is 90% as good

**Phase mapping:** Prototype early in the animation phase; don't assume it works

**Confidence:** MEDIUM (layoutId with Portals is a known challenge; [Framer Motion LayoutGroup docs](https://www.framer.com/motion/layout-group/) suggest this is solvable but tricky)

---

#### Pitfall 30: Icon Manifest JSON Becomes Stale After Lucide Update

**What goes wrong:** `npm update lucide-react` adds new icons, but the generated `icons-manifest.json` is not regenerated. The editor panel shows outdated icon set.

**Why it happens:** The icon manifest is generated by a build script (`generate-icon-manifest.cjs`). If this script is not part of the CI/CD pipeline or pre-build hook, it only runs when manually invoked.

**Warning signs:**
- Users asking "where is the [new icon]?" that exists in Lucide but not in editor
- Icon manifest has fewer icons than `lucide-react` package
- Manifest was last generated weeks/months ago

**Prevention strategy:**
1. Add manifest generation to the Vite build pipeline (plugin or pre-build script)
2. OR add to CI: regenerate manifest on any `package.json` change
3. Include manifest generation in the `npm run build` command: `"build": "node scripts/generate-icon-manifest.cjs && vite build"`
4. Add manifest metadata: include generation timestamp and Lucide version for debugging

**Phase mapping:** Address during icon panel build script implementation

**Confidence:** HIGH (standard build pipeline concern)

---

#### Pitfall 31: Polotno Custom Panel Styling Conflicts with Editor Theme

**What goes wrong:** Custom Unsplash and icon panels use styling that clashes with Polotno's built-in editor theme. Input fields, buttons, scrollbars look inconsistent.

**Why it happens:** Polotno editor has its own CSS theming (dark mode, specific fonts, padding). Custom panels inject unstyled or differently-styled React components.

**BizScreen-specific risk:** The Polotno iframe uses React 18 with its own styling. Custom panels cannot use BizScreen's Tailwind classes (Tailwind is not in the iframe bundle). Inline styles or a separate CSS file is needed.

**Warning signs:**
- Custom panel looks visually out of place (wrong colors, fonts, spacing)
- Dark mode in Polotno but custom panel is light
- Scrollbar style mismatch
- Input focus states don't match

**Prevention strategy:**
1. Study Polotno's built-in panel styling (inspect elements in browser) and match colors/fonts
2. Use inline styles (not Tailwind) for custom panels inside the iframe
3. Polotno exposes CSS variables for theming -- use them for colors/fonts
4. Keep custom panel UI minimal: search input + image grid. Let `ImagesGrid` handle most rendering (it inherits Polotno styling).
5. Test with both light and dark Polotno themes

**Phase mapping:** Address during custom panel UI implementation

**Confidence:** MEDIUM (depends on Polotno's theming API, which may have limited documentation)

---

#### Pitfall 32: Unsplash Rate Limit Exhaustion During Demo/Testing

**What goes wrong:** Development team has demo API key (50 req/hr). Multiple developers testing Unsplash search simultaneously exhaust rate limit. Search stops working for everyone.

**Why it happens:** Demo API keys have strict 50 req/hr limit. Development and testing often involve repeated searches.

**Warning signs:**
- `429 Too Many Requests` errors during development
- Unsplash search returns errors intermittently
- Works in morning, breaks by afternoon

**Prevention strategy:**
1. Apply for Unsplash production API access BEFORE starting development (takes 1-2 weeks review)
2. Implement request caching: cache search results for 1 hour (Unsplash allows this)
3. Add rate limit awareness: show "Rate limited, try again in X minutes" instead of generic error
4. Use mock data in unit/integration tests (never hit real API in CI)
5. Each developer can register their own demo key for local development

**Phase mapping:** Apply for production access as FIRST action, before any code

**Confidence:** HIGH (verified from [Unsplash API rate limits documentation](https://unsplash.com/documentation#rate-limiting))

---

### Minor

#### Pitfall 33: Animation Presets Not Accessible (Motion Sensitivity)

**What goes wrong:** Users with vestibular disorders experience motion sickness from template grid stagger animations and card hover effects.

**Why it happens:** Animations are enabled by default with no opt-out mechanism.

**Warning signs:**
- Accessibility audit failures
- User complaints about motion/nausea
- Reduced score in Lighthouse accessibility

**Prevention strategy:**
1. Respect `prefers-reduced-motion` media query: `const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches`
2. In motion.js presets, add reduced-motion variants (instant transitions, no scale/translate)
3. Framer Motion supports this natively: `<motion.div initial={false}>` when reduced motion preferred
4. Test all animations with "Reduce motion" enabled in OS settings

**Phase mapping:** Include in animation implementation from day one

**Confidence:** HIGH (WCAG 2.1 requirement, standard web accessibility)

---

#### Pitfall 34: canvas-confetti Blocks Main Thread on Low-End Devices

**What goes wrong:** Confetti celebration after save causes brief UI freeze on low-end tablets. Confetti particles are rendered on the main thread canvas.

**Why it happens:** `canvas-confetti` renders hundreds of particles in a single `requestAnimationFrame` loop. On fast devices this is invisible, but on slow devices it causes 100-200ms jank.

**Warning signs:**
- Save dialog appears sluggishly after save completes
- Visible frame drop when confetti fires
- Users think save failed because of UI freeze

**Prevention strategy:**
1. Limit particle count: `confetti({ particleCount: 50 })` instead of default (50 is already low)
2. Use a `setTimeout(() => confetti(...), 100)` to let the dialog render first, then fire confetti
3. Skip confetti on devices with `navigator.hardwareConcurrency < 4`
4. Keep confetti duration short: `ticks: 100` (about 1.5 seconds)

**Phase mapping:** Minor concern, address during save celebration implementation

**Confidence:** MEDIUM (depends on target device hardware; modern tablets handle it fine)

---

#### Pitfall 35: PostMessage Bridge Becomes Untyped Spaghetti

**What goes wrong:** Adding stock image and icon panel messages to the postMessage bridge creates an untyped, hard-to-debug communication channel. Messages get lost, handlers don't match, or new message types conflict with existing ones.

**Why it happens:** The current bridge in `PolotnoEditor.jsx` handles 8 message types. Adding stock images and icons could add 4-6 more. Without a schema, message contracts drift.

**Current messages (verified):** ready, save, close, error, designLoaded, templateLoaded, imageExported, triggerSave

**Warning signs:**
- "Unknown message type" warnings in console
- Iframe receiving messages from other sources (window.addEventListener is global)
- Message payloads silently missing required fields
- Debugging requires console.log on both sides of the iframe

**Prevention strategy:**
1. Define a message type enum: `const EDITOR_MESSAGES = { READY: 'ready', SAVE: 'save', SEARCH_STOCK: 'searchStockImages', ... }`
2. Validate incoming messages: check `event.data.target === 'polotno-editor'` (already done) and validate payload shape
3. Add TypeScript JSDoc types for all message payloads
4. Log all bridge messages in structured logging with correlation IDs
5. Consider using a thin abstraction: `bridge.send('searchStock', { query })` and `bridge.on('stockResults', handler)` on both sides

**Phase mapping:** Refactor bridge before adding new message types

**Confidence:** HIGH (verified from `PolotnoEditor.jsx` and `polotno-editor.jsx` message handling code)

---

## v3.0 Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|-------------|---------------|------------|
| Polotno version alignment | P25: Version mismatch between iframe and main app | Align `polotno-build/package.json` to `^2.33.2` first |
| Unsplash API setup | P32: Rate limit exhaustion during dev | Apply for production access immediately; P26: Key exposure -- decide proxy vs. direct |
| Template grid animations | P28: Jank on large grids | Limit stagger to visible cards; P33: Accessibility -- respect prefers-reduced-motion |
| Shared element transition | P29: Portal boundary breaks layoutId | Prototype early; have fallback animation ready |
| Custom Polotno panels | P31: Style conflicts with editor theme | Use Polotno CSS variables; P25: Test against correct SDK version |
| Icon manifest | P30: Stale after npm update | Add to build pipeline |
| PostMessage bridge | P35: Untyped message sprawl | Define message enum + payload types before adding new messages |
| Save celebration | P34: canvas-confetti main thread blocking | Limit particles, delay after dialog render |
| Unsplash compliance | P27: Attribution + download tracking | Build into panel from day one, not retrofitted |

---

### v3.0 Confidence Assessment

| Area | Confidence | Reason |
|------|------------|--------|
| Polotno iframe risks | HIGH | Verified version mismatch in codebase; iframe architecture well-understood |
| Unsplash compliance risks | HIGH | Verified from official API guidelines and TOS |
| Animation performance risks | HIGH | Standard Framer Motion performance considerations, verified from docs |
| Shared element transition | MEDIUM | layoutId with Portal is documented but known to be tricky |
| Custom panel styling | MEDIUM | Polotno theming API documentation is sparse; may need experimentation |

### v3.0 Sources

- [Unsplash API Guidelines](https://help.unsplash.com/en/articles/2511245-unsplash-api-guidelines) -- Attribution, download tracking, TOS requirements
- [Unsplash API Rate Limiting](https://unsplash.com/documentation#rate-limiting) -- Demo vs. production limits
- [Framer Motion Performance](https://motion.dev/docs/react-performance) -- Animation optimization guidance
- [Framer Motion LayoutGroup](https://www.framer.com/motion/layout-group/) -- Cross-component layout animations
- [WCAG 2.1 Motion Guidelines](https://www.w3.org/WAI/WCAG21/Understanding/animation-from-interactions.html) -- prefers-reduced-motion requirements
- Existing codebase: `scripts/polotno-build/package.json` (version mismatch), `PolotnoEditor.jsx` (postMessage bridge), `TemplateGrid.jsx` (animation targets), `EditorModal.jsx` (Modal/Portal), `PostSaveDialog.jsx` (confetti integration point)
