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
- [x] **v3.2 Display Toolkit** — Phases 56-63 (shipped 2026-02-19)
- [ ] **v4.0 Player Hardening** — Phases 64-68 (in progress)

## Phase History

<details>
<summary>Completed Milestones (v1, v2, v2.1, v2.2, v2.3, v2.4, v3.0, v3.1, v3.2)</summary>

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

**v3.2 Display Toolkit** — Phases 56-63
See `.planning/milestones/v3.2-ROADMAP.md`

All milestones shipped successfully.

</details>

## Phases

**Phase Numbering:**
- Integer phases (64, 65, 66): Planned milestone work
- Decimal phases (64.1, 64.2): Urgent insertions (marked with INSERTED)

- [x] **Phase 64: Telemetry Pipeline & Offline Detection** - Device diagnostics on heartbeat, server-side heartbeat evaluator, automated offline alerts (completed 2026-02-19)
- [x] **Phase 65: Screenshot Enhancement** - Auto-capture on interval, display on screen detail page, on-demand capture, event-triggered screenshots (completed 2026-02-20)
- [x] **Phase 66: Auto-Recovery** - Stuck/blank detection with progressive recovery, crash counter safety, cached fallback content (completed 2026-02-20)
- [ ] **Phase 67: Content Verification** - Player reports content version, server detects mismatch, auto-retry sync, play-then-verify pattern
- [ ] **Phase 68: Alert Wiring & Notifications** - Recovery events generate alerts, in-app notification bell, email alerts for critical issues

## Phase Details

### Phase 64: Telemetry Pipeline & Offline Detection
**Goal**: Operators can see device health metrics and get automatically alerted when screens go offline
**Depends on**: Nothing (first phase of v4.0)
**Requirements**: TELM-01, TELM-02, ALRT-01, ALRT-02
**Success Criteria** (what must be TRUE):
  1. Player sends memory, storage, and network metrics to the server on every heartbeat cycle
  2. User can view latest device diagnostics (memory, storage, network) on the screen detail page
  3. Server automatically raises an offline alert when a device stops sending heartbeats
  4. Server automatically resolves the offline alert when the device resumes heartbeats
**Plans**: 3 plans

Plans:
- [ ] 64-01-PLAN.md — Telemetry pipeline: migration for device_metrics column, extend heartbeat RPC, collect browser metrics in player
- [ ] 64-02-PLAN.md — Offline detection & alerts: pg_cron evaluator, severity escalation, dual-path auto-resolve
- [ ] 64-03-PLAN.md — Diagnostics UI: Device Health section in ScreenDetailDrawer with metric cards and offline banner

### Phase 65: Screenshot Enhancement
**Goal**: Operators can see what their screens are actually displaying without visiting the physical location
**Depends on**: Phase 64 (heartbeat infrastructure for screenshot timing, alert events for SCRN-04)
**Requirements**: SCRN-01, SCRN-02, SCRN-03, SCRN-04
**Success Criteria** (what must be TRUE):
  1. Player automatically captures a screenshot every 5 minutes while content is playing
  2. User sees the latest screenshot with a timestamp on the screen detail page
  3. User can click a button to request an immediate screenshot and see the result
  4. Player captures an additional screenshot when an alert event fires (e.g., after recovering from offline)
**Plans**: 2 plans

Plans:
- [ ] 65-01-PLAN.md — Player-side screenshot triggers: periodic 5-min auto-capture, offline recovery capture, initial content load capture
- [ ] 65-02-PLAN.md — Dashboard screenshot UI: extend diagnostics RPC with screenshot fields, add Latest Screenshot section with Capture Now button to ScreenDetailDrawer

### Phase 66: Auto-Recovery
**Goal**: Screens self-heal from blank/frozen/crashed states without operator intervention
**Depends on**: Phase 64 (telemetry pipeline for reporting recovery state to server)
**Requirements**: RECV-01, RECV-02, RECV-03
**Success Criteria** (what must be TRUE):
  1. Player detects a blank screen or frozen content and automatically reloads to restore playback
  2. When a reload fails to restore playback, the player falls back to displaying cached content
  3. Player stops attempting recovery after 6 failed restarts and displays a static fallback screen (prevents infinite restart loops)
**Plans**: 2 plans

Plans:
- [ ] 66-01-PLAN.md — Core recovery infrastructure: useAutoRecovery hook with crash counter, extend useStuckDetection with blank screen detection, add recovery state to heartbeat telemetry
- [ ] 66-02-PLAN.md — ViewPage wiring and fallback UI: create RecoveryFallbackScreen, wire useAutoRecovery into ViewPage, connect all detection signals to progressive recovery

### Phase 67: Content Verification
**Goal**: Operators can trust that screens are displaying the correct published content, not stale versions
**Depends on**: Phase 64 (heartbeat carries content version), Phase 66 (recovery path for verification failures)
**Requirements**: VERI-01, VERI-02, VERI-03, VERI-04
**Success Criteria** (what must be TRUE):
  1. Player reports a content version identifier to the server on every heartbeat
  2. Server detects when a player's reported content version differs from the currently published version
  3. Player automatically retries content sync when the server signals a version mismatch
  4. Content verification runs after playback starts and never interrupts or delays active content display
**Plans**: 2 plans

Plans:
- [ ] 67-01-PLAN.md — Content version pipeline: migration for verification columns, extended heartbeat RPC with version comparison, player content version computation and reporting
- [ ] 67-02-PLAN.md — Player re-sync and dashboard UI: useContentVerification hook with transition-aware retry, mismatch warning in ScreenDetailDrawer with Force Sync button

### Phase 68: Alert Wiring & Notifications
**Goal**: Operators are proactively notified of all screen issues through in-app and email channels
**Depends on**: Phase 64 (offline alerts), Phase 66 (recovery events), Phase 67 (content mismatch events)
**Requirements**: ALRT-03, ALRT-04, ALRT-05
**Success Criteria** (what must be TRUE):
  1. Recovery events (crash detection, auto-reload, fallback activation) automatically generate alerts in the system
  2. User sees all device alerts in a notification bell with history (newest first)
  3. User receives email notification when a critical event occurs (device offline, recovery exhausted)
**Plans**: TBD

Plans:
- [ ] 68-01: TBD
- [ ] 68-02: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 64 → 65 → 66 → 67 → 68

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 64. Telemetry Pipeline & Offline Detection | 0/TBD | Complete    | 2026-02-19 |
| 65. Screenshot Enhancement | 0/TBD | Complete    | 2026-02-20 |
| 66. Auto-Recovery | 2/2 | Complete    | 2026-02-20 |
| 67. Content Verification | 1/2 | In Progress|  |
| 68. Alert Wiring & Notifications | 0/TBD | Not started | - |

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
| v3.2 Display Toolkit | 56-63 | 16 | Complete | 2026-02-19 |
| v4.0 Player Hardening | 64-68 | TBD | In progress | - |

**Total:** 63 phases complete, 211 plans executed | 9 milestones shipped

---
*Last updated: 2026-02-19 -- v4.0 Player Hardening roadmap created*
