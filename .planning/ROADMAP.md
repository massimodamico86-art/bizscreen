# Roadmap: BizScreen

## Milestones

- [x] **v1 Production Release** — Phases 1-12 (shipped 2026-01-24)
- [x] **v2 Templates & Platform Polish** — Phases 13-23 (shipped 2026-01-27)
- [x] **v2.1 Tech Debt Cleanup** — Phases 24-29 (shipped 2026-01-28)
- [x] **v2.2 Onboarding Polish** — Phases 30-35 (shipped 2026-02-05)
- [x] **v2.3 Production Hardening** — Phases 36-41 (shipped 2026-02-09)
- [x] **v2.4 Tech Debt Zero** — Phases 42-45 (shipped 2026-02-10)
- [x] **v3.0 Creative Experience** — Phases 46-50 (shipped 2026-02-11)
- [x] **v3.1 Data-Driven Screens** — Phases 51-55 (shipped 2026-02-13)
- [ ] **v3.2 Display Toolkit** — Phases 56-62 (in progress)

## Phase History

<details>
<summary>Completed Milestones (v1, v2, v2.1, v2.2, v2.3, v2.4, v3.0, v3.1)</summary>

**v1 Production Release** — Phases 1-12
See `.planning/milestones/v1-ROADMAP.md`

**v2 Templates & Platform Polish** — Phases 13-23
See `.planning/milestones/v2-ROADMAP.md`

**v2.1 Tech Debt Cleanup** — Phases 24-29
See `.planning/milestones/v2.1-ROADMAP.md`

**v2.2 Onboarding Polish** — Phases 30-35
See `.planning/milestones/v2.2-ROADMAP.md`

**v2.3 Production Hardening** — Phases 36-41
See `.planning/milestones/v2.3-ROADMAP.md`

**v2.4 Tech Debt Zero** — Phases 42-45
See `.planning/milestones/v2.4-ROADMAP.md`

**v3.0 Creative Experience** — Phases 46-50
See `.planning/milestones/v3.0-ROADMAP.md`

**v3.1 Data-Driven Screens** — Phases 51-55
See `.planning/milestones/v3.1-ROADMAP.md`

All milestones shipped successfully.

</details>

## v3.2 Display Toolkit

**Milestone Goal:** Make BizScreen versatile enough for any vertical by providing the display building blocks every signage deployment needs -- weather, video, screen groups, portrait mode, enhanced widgets, and menu boards.

### Phases

- [x] **Phase 56: Widget Registry + Clock/Date** — Centralized widget registry and timezone-aware clock/date widgets (completed 2026-02-13)
- [x] **Phase 57: QR Code Enhancement** — WiFi QR codes, error correction, brand logo overlay, import fix (completed 2026-02-18)
- [x] **Phase 58: Weather Security + Enhancement** — Server-side API key proxy, forecast mode, offline caching (completed 2026-02-18)
- [x] **Phase 59: Video Playback** — HTML5 video in layout zones with HLS adaptive streaming (completed 2026-02-18)
- [x] **Phase 60: Screen Groups & Tags** — Tag management, filtering, bulk operations, group content push (completed 2026-02-18)
- [x] **Phase 61: Portrait Mode** — Per-screen orientation, portrait canvas, CSS rotation, portrait templates (completed 2026-02-18)
- [x] **Phase 62: Menu Board Widget** — Structured menu CRUD, themed rendering, auto-pagination, realtime updates (completed 2026-02-18)

### Phase Details

#### Phase 56: Widget Registry + Clock/Date
**Goal**: Users see accurate, timezone-aware clocks and dates on their screens, and the codebase has a single widget registry that all rendering paths share
**Depends on**: Nothing (first phase, establishes patterns for all subsequent widget work)
**Requirements**: INFRA-01, INFRA-02, CLOCK-01, CLOCK-02, CLOCK-03, CLOCK-04, CLOCK-05, CLOCK-06
**Success Criteria** (what must be TRUE):
  1. Adding a new widget type requires registering in ONE place (the registry), not editing 3+ switch statements
  2. Switching a zone's widget type in the editor resets properties to the new type's defaults (no stale props from previous type)
  3. User can configure a clock widget with timezone, 12h/24h format, seconds toggle, and analog style -- and the player renders it using the screen's assigned timezone (not browser timezone)
  4. User can place a combined clock+date widget in a layout zone that shows both time and date together
**Plans:** 2 plans

Plans:
- [x] 56-01-PLAN.md — Widget registry refactor (centralize 9 duplication sites into single registry, fix stale props on type switch)
- [x] 56-02-PLAN.md — Clock/date widget enhancements (timezone, format, seconds, analog, combined clock+date widget)

#### Phase 57: QR Code Enhancement
**Goal**: Users can generate any QR code type they need -- URLs, WiFi credentials, plain text -- with brand customization and reliable rendering
**Depends on**: Phase 56 (widget registry pattern)
**Requirements**: QR-01, QR-02, QR-03, QR-04, QR-05
**Success Criteria** (what must be TRUE):
  1. User can select QR type (URL, WiFi, plain text) from a dropdown in the layout editor sidebar and the QR code renders correctly for each type
  2. User can configure a WiFi QR code with SSID, password, and encryption type that mobile devices can scan to auto-connect
  3. User can add a brand logo to the QR code center, which automatically sets error correction to H for scan reliability
  4. QR code widget renders without crashing on deployed players (QRCodeSVG import bug fixed)
**Plans:** 2/2 plans complete

Plans:
- [ ] 57-01-PLAN.md — Fix QRCodeSVG import bug, add multi-type QR support (URL/WiFi/Text), error correction control, color customization, extract QRCodeWidgetControls
- [ ] 57-02-PLAN.md — Brand logo overlay with auto-H error correction, wire QRCodeWidgetControls into layout editor, update type definitions

#### Phase 58: Weather Security + Enhancement
**Goal**: Weather data displays securely on screens with forecast capability and offline resilience, with no API keys exposed in the client bundle
**Depends on**: Phase 56 (widget registry)
**Requirements**: WTHR-01, WTHR-02, WTHR-03, WTHR-04
**Success Criteria** (what must be TRUE):
  1. Weather data is fetched through a server-side Edge Function proxy -- the OpenWeatherMap API key never appears in client JavaScript
  2. User can configure a weather widget in forecast mode showing multi-day forecast (not just current conditions)
  3. Weather widget displays times formatted to the screen's assigned timezone
  4. When a player goes offline, weather widget shows cached data from IndexedDB with a "last updated" indicator
**Plans:** 2/2 plans complete

Plans:
- [ ] 58-01-PLAN.md — Weather proxy Edge Function, cache table, weatherProxyService client, and migration of weatherService/geolocationService/WeatherWall to proxy
- [ ] 58-02-PLAN.md — Forecast mode rendering, screen timezone formatting, IndexedDB offline caching, editor controls

#### Phase 59: Video Playback
**Goal**: Users can add video content to their screen layouts with reliable autoplay and adaptive streaming support
**Depends on**: Phase 56 (widget registry)
**Requirements**: VIDEO-01, VIDEO-02, VIDEO-03, VIDEO-04, VIDEO-05
**Success Criteria** (what must be TRUE):
  1. User can add an MP4 video as an element in a layout zone and it autoplays muted and loops in the player
  2. User can use HLS (.m3u8) URLs for adaptive bitrate streaming that adjusts to network conditions
  3. Video elements show a static poster frame in the editor (no autoplay in editor)
  4. When a video stalls on a player, the existing stuck detection system recovers playback automatically
**Plans:** 2/2 plans complete

Plans:
- [ ] 59-01-PLAN.md — Video element type, editor rendering (poster frame + play overlay), properties panel, SceneRenderer video case
- [ ] 59-02-PLAN.md — VideoPlayer component with hls.js HLS streaming, error recovery, stall detection, wire into renderer and scene

#### Phase 60: Screen Groups & Tags
**Goal**: Users can organize screens with tags and push content to groups of screens efficiently
**Depends on**: Nothing (independent of widget phases, can execute in parallel)
**Requirements**: GROUP-01, GROUP-02, GROUP-03, GROUP-04, GROUP-05
**Success Criteria** (what must be TRUE):
  1. User can add and remove tags on screen groups using a chip-style UI
  2. User can filter the screen groups list by tag to find specific groups quickly
  3. User can push a playlist to all screens in a group with one action
  4. User can select multiple screen groups and perform bulk actions (delete, tag, assign content)
**Plans:** 2/2 plans complete

Plans:
- [ ] 60-01-PLAN.md — Tag management UI (TagChipInput, GroupFormModal tags field, FilterChips tag filter, GIN index migration)
- [ ] 60-02-PLAN.md — Group content push and bulk operations (PushPlaylistModal, bulk selection, bulk delete, bulk tag)

#### Phase 61: Portrait Mode
**Goal**: Users can deploy screens in portrait orientation with properly oriented content and templates
**Depends on**: Phase 56 (widget registry for portrait widget rendering)
**Requirements**: PORT-01, PORT-02, PORT-03, PORT-04, PORT-05
**Success Criteria** (what must be TRUE):
  1. User can set a screen's orientation to portrait in screen settings, and the system stores this per device
  2. User can design content in the layout editor using a portrait (9:16) canvas
  3. When portrait content plays on a landscape-mounted device (or vice versa), the player applies CSS rotation to display it correctly
  4. At least 3 portrait-oriented templates are available in the template marketplace
  5. User sees a warning when scheduling portrait content to a landscape screen (and vice versa)
**Plans:** 2/2 plans complete

Plans:
- [ ] 61-01-PLAN.md — Screen orientation setting, RPC updates, and portrait template seeding
- [ ] 61-02-PLAN.md — Player CSS rotation and orientation mismatch warnings

#### Phase 62: Menu Board Widget
**Goal**: Users can create and manage structured menu boards that render beautifully on screens with real-time updates
**Depends on**: Phase 56 (widget registry), Phase 61 (portrait mode -- menu boards often run portrait)
**Requirements**: MENU-01, MENU-02, MENU-03, MENU-04, MENU-05, MENU-06, MENU-07, MENU-08, MENU-09
**Success Criteria** (what must be TRUE):
  1. User can create a menu board with categories and items (name, description, price, image) and reorder them via drag-and-drop
  2. Menu board renders as a themed widget on screen with category headers, item names, prices, descriptions, and dietary/allergen badges
  3. Menu board supports multiple price columns (e.g., Small/Medium/Large) and auto-paginates long menus with smooth transitions
  4. User can toggle item availability on/off without deleting, and changes appear on screen in near-real-time via Supabase Realtime
  5. Menu board formats currency according to the tenant's locale setting
**Plans:** 3/3 plans complete

Plans:
- [ ] 62-01-PLAN.md — Database schema (3 tables + RLS) + menuBoardService.js (CRUD, reorder, realtime, dietary tags, currency formatting) + @dnd-kit/sortable
- [ ] 62-02-PLAN.md — MenuBoardEditorModal with DnD reordering, dietary tag picker, price columns, availability toggle + MenuBoardsPage + App.jsx navigation
- [ ] 62-03-PLAN.md — MenuBoardWidget player component with themed rendering, auto-pagination, Realtime subscriptions, locale-aware currency + widget registry

## Progress

**Execution Order:**
Phases execute in numeric order: 56 -> 57 -> 58 -> 59 -> 60 -> 61 -> 62
(Phase 60 is independent and can parallel with 57-59 if needed)

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 56. Widget Registry + Clock/Date | v3.2 | 2/2 | Complete | 2026-02-13 |
| 57. QR Code Enhancement | v3.2 | Complete    | 2026-02-18 | - |
| 58. Weather Security + Enhancement | v3.2 | Complete    | 2026-02-18 | - |
| 59. Video Playback | v3.2 | Complete    | 2026-02-18 | - |
| 60. Screen Groups & Tags | v3.2 | Complete    | 2026-02-18 | - |
| 61. Portrait Mode | v3.2 | Complete    | 2026-02-18 | - |
| 62. Menu Board Widget | v3.2 | Complete    | 2026-02-18 | - |

## Progress Summary

| Milestone | Phases | Plans | Status | Shipped |
|-----------|--------|-------|--------|---------|
| v1 Production Release | 1-12 | 75 | Complete | 2026-01-24 |
| v2 Templates & Platform | 13-23 | 39 | Complete | 2026-01-27 |
| v2.1 Tech Debt Cleanup | 24-29 | 11 | Complete | 2026-01-28 |
| v2.2 Onboarding Polish | 30-35 | 16 | Complete | 2026-02-05 |
| v2.3 Production Hardening | 36-41 | 18 | Complete | 2026-02-09 |
| v2.4 Tech Debt Zero | 42-45 | 11 | Complete | 2026-02-10 |
| v3.0 Creative Experience | 46-50 | 10 | Complete | 2026-02-11 |
| v3.1 Data-Driven Screens | 51-55 | 15 | Complete | 2026-02-13 |
| v3.2 Display Toolkit | 56-62 | 2/16 | In progress | - |

**Total:** 56 phases complete + 6 planned, 197 plans executed + 14 planned | 8 milestones shipped, 1 in progress

---
*Last updated: 2026-02-13 -- Phase 56 complete.*
