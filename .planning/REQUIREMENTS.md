# Requirements: BizScreen

**Defined:** 2026-03-03
**Core Value:** Screens reliably display the right content at the right time, even when offline

## v12.0 Requirements

Requirements for v12.0 Feature Parity milestone. Each maps to roadmap phases.

### Embeds (YouTube/Vimeo/Web Page)

- [x] **EMBED-01**: User can add a YouTube video widget to a layout zone with a video URL
- [x] **EMBED-02**: User can add a Vimeo video widget to a layout zone with a video URL
- [x] **EMBED-03**: YouTube/Vimeo widget plays the video on the screen player via iframe embed
- [x] **EMBED-04**: YouTube/Vimeo widget shows a cached thumbnail with "requires internet" message when offline
- [x] **EMBED-05**: User can add a web page widget to a layout zone with a URL
- [x] **EMBED-06**: Web page widget displays the live website on the screen player
- [x] **EMBED-07**: User can configure auto-refresh interval for web page widget

### Google Slides

- [x] **SLIDES-01**: User can add a Google Slides widget to a layout zone
- [x] **SLIDES-02**: User can paste a Google Slides URL to display a presentation
- [x] **SLIDES-03**: Google Slides widget renders slides on the screen with configurable auto-advance interval

### Calendar

- [ ] **CAL-01**: User can add a calendar widget to a layout zone
- [ ] **CAL-02**: User can connect Google Calendar via OAuth
- [ ] **CAL-03**: Calendar widget displays upcoming events on screen with auto-refresh
- [ ] **CAL-04**: User can connect Outlook calendar via Microsoft OAuth
- [ ] **CAL-05**: Calendar widget supports multiple calendar sources per widget

### Documents

- [ ] **DOC-01**: User can upload PDF documents as media assets
- [ ] **DOC-02**: User can upload Word/PPT/Excel documents as media assets
- [ ] **DOC-03**: Uploaded documents are converted to images server-side for player compatibility
- [ ] **DOC-04**: User can add a document widget to display pages in a layout zone
- [ ] **DOC-05**: Document pages auto-advance on the screen player with configurable interval
- [ ] **DOC-06**: Document widget works on WebOS/Tizen devices (rendered as pre-converted images)

### Nested Playlists

- [ ] **NEST-01**: User can add a playlist as an item within another playlist
- [ ] **NEST-02**: Nested playlists resolve to a flat content list on the player
- [ ] **NEST-03**: System prevents circular playlist references at write time
- [ ] **NEST-04**: Nesting depth is limited to 5 levels

### Background Audio

- [ ] **AUDIO-01**: User can assign a background audio track to a playlist
- [ ] **AUDIO-02**: Background audio plays continuously behind visual content transitions
- [ ] **AUDIO-03**: User can control audio volume per playlist
- [ ] **AUDIO-04**: User can upload audio files (MP3/WAV/OGG) as media assets

### Working Hours

- [ ] **POWER-01**: User can define working hours schedule per screen (on/off times by day of week)
- [ ] **POWER-02**: Screen displays black/standby outside working hours
- [ ] **POWER-03**: Screen automatically resumes content at working hours start

### SSO (SAML)

- [ ] **SSO-01**: Admin can configure a SAML identity provider with IdP metadata URL
- [ ] **SSO-02**: Users can sign in via SSO from the login page
- [ ] **SSO-03**: SSO login creates a proper Supabase Auth session (preserves RLS)
- [ ] **SSO-04**: Admin can enforce SSO-only login for their tenant
- [ ] **SSO-05**: System auto-detects SSO by email domain and redirects accordingly

### Public REST API

- [ ] **API-01**: Admin can generate API tokens with scoped permissions
- [ ] **API-02**: API supports reading screens, playlists, and media via REST endpoints
- [ ] **API-03**: API supports uploading media assets
- [ ] **API-04**: API supports updating playlists and screen assignments
- [ ] **API-05**: API rate limits requests per token
- [ ] **API-06**: API documentation page available in developer settings
- [ ] **API-07**: API tokens are tenant-isolated (cannot access other tenants' data)

### Proof of Play

- [ ] **POP-01**: Player logs content playback events (item ID, start time, duration, screen ID)
- [ ] **POP-02**: User can view Proof of Play report with date range filter
- [ ] **POP-03**: User can export Proof of Play data as CSV
- [ ] **POP-04**: Proof of Play data is partitioned by month for performance
- [ ] **POP-05**: Dashboard shows playback summary statistics

### Canva Integration

- [ ] **CANVA-01**: User can browse their Canva designs from within BizScreen
- [ ] **CANVA-02**: User can import a Canva design as a media asset (rendered as image)
- [ ] **CANVA-03**: Imported Canva designs display correctly on the screen player
- [ ] **CANVA-04**: User can re-import updated Canva designs to refresh content

### Video Wall

- [ ] **VWALL-01**: Admin can create a video wall configuration (grid of screens)
- [ ] **VWALL-02**: Admin can define screen positions within the wall grid (rows x columns)
- [ ] **VWALL-03**: Video wall distributes content across screens with bezel compensation
- [ ] **VWALL-04**: Screens in a video wall synchronize content playback via Realtime (within 200ms)

## Future Requirements

Deferred to future releases. Tracked but not in current roadmap.

### Media Management

- **MEDIA-01**: Media assets auto-archive after an expiration date
- **MEDIA-02**: Media expiration date visible in media library with filter

### API Extensions

- **API-08**: API supports write endpoints for schedules and campaigns
- **API-09**: GraphQL API endpoint
- **API-10**: API webhook notifications for content changes

### Enterprise Extensions

- **SSO-06**: SCIM user provisioning from identity provider
- **POWER-04**: CEC hardware power commands for compatible displays

### Advanced Video Wall

- **VWALL-05**: Frame-perfect video wall sync via hardware genlock
- **VWALL-06**: Video wall content preview in admin UI

## Out of Scope

| Feature | Reason |
|---------|--------|
| Frame-perfect video wall sync | Software loose-sync (200ms) sufficient; hardware genlock out of scope |
| Client-side Office rendering | Server-side conversion mandatory for smart TV compatibility |
| Native video transcoding | Assume pre-processed media; external service for doc conversion only |
| SCIM user provisioning | Complex; SSO authentication is sufficient for v12 |
| CEC display power commands | Platform-specific; software black screen is sufficient |
| GraphQL API | REST is sufficient for v12; GraphQL adds unnecessary complexity |
| Media expiration dates | Deferred by user preference; low priority |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| EMBED-01 | Phase 108 | Complete |
| EMBED-02 | Phase 108 | Complete |
| EMBED-03 | Phase 108 | Complete |
| EMBED-04 | Phase 108 | Complete |
| EMBED-05 | Phase 108 | Complete |
| EMBED-06 | Phase 108 | Complete |
| EMBED-07 | Phase 108 | Complete |
| SLIDES-01 | Phase 108 | Complete |
| SLIDES-02 | Phase 108 | Complete |
| SLIDES-03 | Phase 108 | Complete |
| NEST-01 | Phase 109 | Pending |
| NEST-02 | Phase 109 | Pending |
| NEST-03 | Phase 109 | Pending |
| NEST-04 | Phase 109 | Pending |
| AUDIO-01 | Phase 109 | Pending |
| AUDIO-02 | Phase 109 | Pending |
| AUDIO-03 | Phase 109 | Pending |
| AUDIO-04 | Phase 109 | Pending |
| POWER-01 | Phase 109 | Pending |
| POWER-02 | Phase 109 | Pending |
| POWER-03 | Phase 109 | Pending |
| SSO-01 | Phase 110 | Pending |
| SSO-02 | Phase 110 | Pending |
| SSO-03 | Phase 110 | Pending |
| SSO-04 | Phase 110 | Pending |
| SSO-05 | Phase 110 | Pending |
| API-01 | Phase 110 | Pending |
| API-02 | Phase 110 | Pending |
| API-03 | Phase 110 | Pending |
| API-04 | Phase 110 | Pending |
| API-05 | Phase 110 | Pending |
| API-06 | Phase 110 | Pending |
| API-07 | Phase 110 | Pending |
| POP-01 | Phase 110 | Pending |
| POP-02 | Phase 110 | Pending |
| POP-03 | Phase 110 | Pending |
| POP-04 | Phase 110 | Pending |
| POP-05 | Phase 110 | Pending |
| DOC-01 | Phase 111 | Pending |
| DOC-02 | Phase 111 | Pending |
| DOC-03 | Phase 111 | Pending |
| DOC-04 | Phase 111 | Pending |
| DOC-05 | Phase 111 | Pending |
| DOC-06 | Phase 111 | Pending |
| CAL-01 | Phase 111 | Pending |
| CAL-02 | Phase 111 | Pending |
| CAL-03 | Phase 111 | Pending |
| CAL-04 | Phase 111 | Pending |
| CAL-05 | Phase 111 | Pending |
| CANVA-01 | Phase 112 | Pending |
| CANVA-02 | Phase 112 | Pending |
| CANVA-03 | Phase 112 | Pending |
| CANVA-04 | Phase 112 | Pending |
| VWALL-01 | Phase 112 | Pending |
| VWALL-02 | Phase 112 | Pending |
| VWALL-03 | Phase 112 | Pending |
| VWALL-04 | Phase 112 | Pending |

**Coverage:**
- v12.0 requirements: 57 total
- Mapped to phases: 57
- Unmapped: 0

---
*Requirements defined: 2026-03-03*
*Last updated: 2026-03-03 after roadmap creation -- all 57 requirements mapped to phases*
