# Requirements: BizScreen v3.2 Display Toolkit

**Defined:** 2026-02-13
**Core Value:** Screens reliably display the right content at the right time, even when offline

## v3.2 Requirements

Requirements for Display Toolkit milestone. Each maps to roadmap phases.

### Clock & Date

- [ ] **CLOCK-01**: User can configure clock widget timezone (IANA timezone selector, e.g., "America/New_York")
- [ ] **CLOCK-02**: User can toggle 12h/24h time format on clock widget
- [ ] **CLOCK-03**: User can enable seconds display on clock widget
- [ ] **CLOCK-04**: User can select analog clock style with customizable accent color
- [ ] **CLOCK-05**: User can use combined clock+date widget showing time and date together in one zone
- [ ] **CLOCK-06**: Clock/date widgets use screen's assigned timezone instead of browser timezone

### Weather

- [ ] **WTHR-01**: Weather API key is proxied through server-side Edge Function (not exposed in client bundle)
- [ ] **WTHR-02**: Weather widget displays forecast mode (multi-day forecast in zone widget, not just current conditions)
- [ ] **WTHR-03**: Weather widget uses screen's timezone for display formatting
- [ ] **WTHR-04**: Weather widget caches data to IndexedDB for offline display with "last updated" indicator

### QR Code

- [ ] **QR-01**: User can select QR code type (URL, WiFi, plain text) in layout editor sidebar
- [ ] **QR-02**: User can configure WiFi QR code with SSID, password, and encryption type
- [ ] **QR-03**: User can set error correction level (L/M/Q/H) on QR code widget
- [ ] **QR-04**: User can add brand logo overlay to QR code center (auto-sets error correction to H)
- [ ] **QR-05**: QR code import bug fixed (QRCodeSVG import added to prevent player crash)

### Video Playback

- [ ] **VIDEO-01**: User can add video (MP4) as an element in layout zones
- [ ] **VIDEO-02**: Video elements play with autoplay, muted, and loop in player
- [ ] **VIDEO-03**: Player supports HLS adaptive streaming (.m3u8 URLs) via hls.js
- [ ] **VIDEO-04**: Video elements show poster frame/thumbnail in editor (not autoplay in editor)
- [ ] **VIDEO-05**: Video playback integrates with existing stuck detection for stall recovery

### Portrait Mode

- [ ] **PORT-01**: User can set screen orientation (landscape/portrait) per device in screen settings
- [ ] **PORT-02**: Layout editor supports portrait canvas (9:16 aspect ratio) for content design
- [ ] **PORT-03**: Player applies CSS rotation when content orientation differs from device hardware orientation
- [ ] **PORT-04**: At least 3 portrait-oriented templates available in template marketplace
- [ ] **PORT-05**: Orientation mismatch warning shown when scheduling portrait content to landscape screens (and vice versa)

### Screen Groups & Tags

- [ ] **GROUP-01**: User can add/remove tags on screen groups with tag chip UI
- [ ] **GROUP-02**: User can filter screen groups by tag in the groups list
- [ ] **GROUP-03**: User can push a playlist to all screens in a group
- [ ] **GROUP-04**: User can perform bulk actions on screen groups (delete, tag, assign content)
- [ ] **GROUP-05**: Tag queries use GIN index for efficient array matching

### Menu Board

- [ ] **MENU-01**: User can create a menu board with structured categories and items (name, description, price, image)
- [ ] **MENU-02**: User can reorder menu categories and items via drag-and-drop
- [ ] **MENU-03**: Menu board renders as themed widget in player with category sections, item names, prices, and descriptions
- [ ] **MENU-04**: Menu board supports multiple price columns (e.g., Small/Medium/Large)
- [ ] **MENU-05**: Menu board auto-paginates for long menus with smooth page transitions
- [ ] **MENU-06**: User can toggle item availability (show/hide items without deleting)
- [ ] **MENU-07**: Menu board widget updates in near-real-time via Supabase Realtime subscription
- [ ] **MENU-08**: User can add dietary/allergen tags to menu items (rendered as icons/badges)
- [ ] **MENU-09**: Menu board respects tenant locale for currency formatting

### Infrastructure

- [ ] **INFRA-01**: Widget registry pattern replaces switch statement duplication across EditorCanvas, LivePreviewWindow, and SceneRenderer
- [ ] **INFRA-02**: Widget type switching in editor resets props to new type's defaults (prevents stale prop cross-contamination)

## Future Requirements

Deferred to subsequent milestones. Tracked but not in current roadmap.

### Advanced Widgets
- **ADV-01**: Video wall sync across screen groups via WebSocket time-sync
- **ADV-02**: Weather-triggered content rules (show specific content based on temperature/conditions)
- **ADV-03**: Interactive QR code analytics with scan tracking via redirect URLs
- **ADV-04**: POS integration for menu boards (Toast, Square, Clover APIs)

### Advanced Screen Management
- **ADV-05**: Screen group scheduling (different content at different times per group)
- **ADV-06**: Auto-discovery of screens via mDNS/SSDP on local network

## Out of Scope

| Feature | Reason |
|---------|--------|
| Video transcoding on upload | Massive infrastructure cost; users upload web-ready MP4 |
| Custom video player controls (play/pause/seek) | Digital signage is passive; no viewer interaction needed |
| Real-time weather alerts (NOAA) | Liability concerns; emergency override system handles severe weather |
| Portrait auto-detection via accelerometer | Browser accelerometer access is unreliable; screens are physically mounted once |
| Menu board POS integration | Complex APIs, OAuth flows, frequent changes; defer to premium feature |
| Screen group auto-discovery | Network discovery unreliable across subnets/VLANs |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| INFRA-01 | Phase 56 | Pending |
| INFRA-02 | Phase 56 | Pending |
| CLOCK-01 | Phase 56 | Pending |
| CLOCK-02 | Phase 56 | Pending |
| CLOCK-03 | Phase 56 | Pending |
| CLOCK-04 | Phase 56 | Pending |
| CLOCK-05 | Phase 56 | Pending |
| CLOCK-06 | Phase 56 | Pending |
| QR-01 | Phase 57 | Pending |
| QR-02 | Phase 57 | Pending |
| QR-03 | Phase 57 | Pending |
| QR-04 | Phase 57 | Pending |
| QR-05 | Phase 57 | Pending |
| WTHR-01 | Phase 58 | Pending |
| WTHR-02 | Phase 58 | Pending |
| WTHR-03 | Phase 58 | Pending |
| WTHR-04 | Phase 58 | Pending |
| VIDEO-01 | Phase 59 | Pending |
| VIDEO-02 | Phase 59 | Pending |
| VIDEO-03 | Phase 59 | Pending |
| VIDEO-04 | Phase 59 | Pending |
| VIDEO-05 | Phase 59 | Pending |
| GROUP-01 | Phase 60 | Pending |
| GROUP-02 | Phase 60 | Pending |
| GROUP-03 | Phase 60 | Pending |
| GROUP-04 | Phase 60 | Pending |
| GROUP-05 | Phase 60 | Pending |
| PORT-01 | Phase 61 | Pending |
| PORT-02 | Phase 61 | Pending |
| PORT-03 | Phase 61 | Pending |
| PORT-04 | Phase 61 | Pending |
| PORT-05 | Phase 61 | Pending |
| MENU-01 | Phase 62 | Pending |
| MENU-02 | Phase 62 | Pending |
| MENU-03 | Phase 62 | Pending |
| MENU-04 | Phase 62 | Pending |
| MENU-05 | Phase 62 | Pending |
| MENU-06 | Phase 62 | Pending |
| MENU-07 | Phase 62 | Pending |
| MENU-08 | Phase 62 | Pending |
| MENU-09 | Phase 62 | Pending |

**Coverage:**
- v3.2 requirements: 41 total
- Mapped to phases: 41
- Unmapped: 0

---
*Requirements defined: 2026-02-13*
*Last updated: 2026-02-13 after roadmap creation (traceability complete)*
