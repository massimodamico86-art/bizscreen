# Requirements: BizScreen v3.1 Data-Driven Screens

**Defined:** 2026-02-11
**Core Value:** Screens reliably display the right content at the right time, even when offline

## v3.1 Requirements

Requirements for v3.1 milestone. Each maps to roadmap phases.

### Data Source Rendering

- [ ] **DATA-01**: User can display Google Sheets data as a styled table on screen
- [ ] **DATA-02**: User can display CSV data as a styled table on screen
- [ ] **DATA-03**: User can configure auto-refresh interval (5/15/30/60 min) per data widget
- [ ] **DATA-04**: Screen shows data in table layout with headers, alternating rows, and theming
- [ ] **DATA-05**: User can bind data source fields to text elements in the scene editor
- [ ] **DATA-06**: Data table auto-paginates when rows exceed visible area on screen
- [ ] **DATA-07**: Image URL fields in data sources render as actual images on screen
- [ ] **DATA-08**: Data refreshes on screen with smooth transition animations
- [ ] **DATA-09**: Screen continues showing last-known data when network drops (offline cache)

### RSS Feed Display

- [ ] **RSS-01**: User can add an RSS feed URL as a content source
- [ ] **RSS-02**: User can display RSS feed as a scrolling ticker on screen
- [ ] **RSS-03**: User can display RSS feed in card/article layout with images and excerpts
- [ ] **RSS-04**: RSS content is sanitized server-side (no XSS from external feeds)

### Social Feed Integration

- [ ] **SOCIAL-01**: User can assign social feed widget to layout zones
- [ ] **SOCIAL-02**: User can moderate social feed posts before they appear on screens
- [ ] **SOCIAL-03**: User can filter social feeds by hashtag

### Utility Widgets

- [ ] **WIDGET-01**: User can add a countdown timer to scenes targeting a specific date/time
- [ ] **WIDGET-02**: Countdown handles timezone correctly across screen locations
- [ ] **WIDGET-03**: User can set recurring daily countdowns (e.g., "Happy Hour in...")
- [ ] **WIDGET-04**: User can configure date/time display format per locale
- [ ] **WIDGET-05**: User can see "last updated" sync status indicator on dynamic widgets

### Player Infrastructure

- [ ] **INFRA-01**: Dynamic widget data persists in IndexedDB for offline playback
- [ ] **INFRA-02**: RSS feeds fetched server-side via Edge Function (no CORS/key exposure)
- [ ] **INFRA-03**: Player data orchestrator manages per-widget refresh timers
- [ ] **INFRA-04**: External API keys not exposed in client-side player bundle

## Future Requirements

Deferred to v3.2 or later. Tracked but not in current roadmap.

### Fleet Management

- **FLEET-01**: User can create screen groups with cascading content assignments
- **FLEET-02**: User can see device health monitoring dashboard with alerts
- **FLEET-03**: User can preview what's currently playing on a remote screen
- **FLEET-04**: User can perform bulk actions across multiple screens

### Analytics & Reporting

- **ANALYTICS-01**: User can generate proof-of-play reports for advertisers
- **ANALYTICS-02**: User can view device uptime/SLA reports

### Data Source Enhancements

- **DATA-10**: User can preview live data in the scene editor while designing
- **DATA-11**: User can combine multiple data sources in one layout (multi-source dashboard)

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Google Sheets OAuth integration | API key reads on public sheets sufficient; OAuth complexity not justified |
| User-editable data on player screens | Signage is display-only; data editing belongs in CMS |
| Real-time social media API polling from player | Players should never make external API calls (rate limits, key exposure) |
| Custom widget SDK / plugin system | Premature abstraction; too few widget types to justify SDK overhead |
| AI-powered data interpretation | Display data as structured; users control layout via templates |
| Bi-directional data sync (write back to Sheets) | One-way sync is standard; edits happen in Sheets or DataSourcesPage |
| Social media posting/scheduling | Different product category; BizScreen only displays content |
| Embeddable third-party widget marketplace | Build first-party widgets first; consider marketplace later |
| Analog clock face | Nice to have, not core to data-driven milestone |
| Multi-feed aggregation | Individual feeds work fine for v3.1 |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| DATA-01 | — | Pending |
| DATA-02 | — | Pending |
| DATA-03 | — | Pending |
| DATA-04 | — | Pending |
| DATA-05 | — | Pending |
| DATA-06 | — | Pending |
| DATA-07 | — | Pending |
| DATA-08 | — | Pending |
| DATA-09 | — | Pending |
| RSS-01 | — | Pending |
| RSS-02 | — | Pending |
| RSS-03 | — | Pending |
| RSS-04 | — | Pending |
| SOCIAL-01 | — | Pending |
| SOCIAL-02 | — | Pending |
| SOCIAL-03 | — | Pending |
| WIDGET-01 | — | Pending |
| WIDGET-02 | — | Pending |
| WIDGET-03 | — | Pending |
| WIDGET-04 | — | Pending |
| WIDGET-05 | — | Pending |
| INFRA-01 | — | Pending |
| INFRA-02 | — | Pending |
| INFRA-03 | — | Pending |
| INFRA-04 | — | Pending |

**Coverage:**
- v3.1 requirements: 25 total
- Mapped to phases: 0
- Unmapped: 25 (pending roadmap creation)

---
*Requirements defined: 2026-02-11*
*Last updated: 2026-02-11 after initial definition*
