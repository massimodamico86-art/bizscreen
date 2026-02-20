# Requirements: BizScreen v4.0 Player Hardening

**Defined:** 2026-02-19
**Core Value:** Screens reliably display the right content at the right time, even when offline

## v4.0 Requirements

Requirements for player hardening milestone. Each maps to roadmap phases.

### Screenshots

- [ ] **SCRN-01**: Player auto-captures screenshot every 5 minutes while content is playing
- [ ] **SCRN-02**: User can view latest screenshot on screen detail page
- [ ] **SCRN-03**: User can request on-demand screenshot capture from screen detail page
- [ ] **SCRN-04**: Player auto-captures screenshot when an alert event fires (offline recovery, crash detection)

### Auto-Recovery

- [x] **RECV-01**: Player detects blank screen or frozen content and auto-reloads
- [x] **RECV-02**: Player falls back to cached content when reload fails to restore playback
- [x] **RECV-03**: Player tracks crash count to prevent infinite restart loops (max 6 restarts, then static fallback)

### Content Verification

- [x] **VERI-01**: Player reports content version identifier on each heartbeat
- [x] **VERI-02**: Server detects content version mismatch between published and player-reported versions
- [ ] **VERI-03**: Player auto-retries content sync when server signals version mismatch
- [ ] **VERI-04**: Content verification never blocks active playback (play-then-verify pattern)

### Telemetry

- [ ] **TELM-01**: Player reports device metrics (memory, storage, network status) piggybacked on heartbeat
- [ ] **TELM-02**: User can view latest device metrics on screen detail page

### Alerts

- [ ] **ALRT-01**: Server automatically detects devices that stop sending heartbeats and raises offline alert
- [ ] **ALRT-02**: Server auto-resolves offline alert when device resumes heartbeats
- [ ] **ALRT-03**: Recovery events (crash detection, auto-reload, fallback activation) generate alerts
- [ ] **ALRT-04**: User receives in-app notifications for all device alerts (bell icon with history)
- [ ] **ALRT-05**: User receives email notification for critical alerts (device offline, recovery exhausted)

## Future Requirements

Deferred to future release. Tracked but not in current roadmap.

### Enhanced Recovery

- **RECV-04**: Multi-stage recovery escalation (soft refresh -> hard reload -> cached fallback -> static error screen)
- **RECV-05**: Recovery incident reports visible on screen detail page with timeline

### Enhanced Telemetry

- **TELM-03**: Automatic threshold alerts when storage full, memory high, or network degraded
- **TELM-04**: Telemetry history chart on screen detail page

### Enhanced Alerts

- **ALRT-06**: Content version mismatch generates dedicated alert type
- **ALRT-07**: Alert noise reduction with root-cause correlation (suppress symptoms when parent cause active)
- **ALRT-08**: Fleet-level alert deduplication (1 alert for N simultaneous device outages)

### Advanced Player

- **PLAY-01**: Service worker watchdog detects frozen main thread and force-reloads
- **PLAY-02**: Fleet monitoring dashboard with at-a-glance health indicators

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Screenshot history timeline | User wants latest only -- keep it simple |
| Fleet monitoring dashboard | Alert-driven monitoring preferred over dashboard watching |
| SHA-256 content hashing on player | Too expensive on Tizen/WebOS hardware -- use HTTP HEAD instead |
| Service worker watchdog | Needs device testing on smart TVs, defer to future milestone |
| Real-time streaming telemetry | Time-series data bloat; JSONB snapshot on heartbeat sufficient |
| Per-device screenshot interval config | Fixed 5-min default sufficient for v4.0 |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| SCRN-01 | Phase 65 | Pending |
| SCRN-02 | Phase 65 | Pending |
| SCRN-03 | Phase 65 | Pending |
| SCRN-04 | Phase 65 | Pending |
| RECV-01 | Phase 66 | Complete |
| RECV-02 | Phase 66 | Complete |
| RECV-03 | Phase 66 | Complete |
| VERI-01 | Phase 67 | Complete |
| VERI-02 | Phase 67 | Complete |
| VERI-03 | Phase 67 | Pending |
| VERI-04 | Phase 67 | Pending |
| TELM-01 | Phase 64 | Pending |
| TELM-02 | Phase 64 | Pending |
| ALRT-01 | Phase 64 | Pending |
| ALRT-02 | Phase 64 | Pending |
| ALRT-03 | Phase 68 | Pending |
| ALRT-04 | Phase 68 | Pending |
| ALRT-05 | Phase 68 | Pending |

**Coverage:**
- v4.0 requirements: 18 total
- Mapped to phases: 18
- Unmapped: 0

---
*Requirements defined: 2026-02-19*
*Last updated: 2026-02-19 after roadmap creation*
