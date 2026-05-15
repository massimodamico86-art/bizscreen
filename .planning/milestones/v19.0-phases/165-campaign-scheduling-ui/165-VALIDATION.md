---
phase: 165
slug: campaign-scheduling-ui
status: validated
nyquist_compliant: true
wave_0_complete: true
created: 2026-04-11
audited: 2026-04-13
---

# Phase 165 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Playwright |
| **Config file** | playwright.config.ts |
| **Quick run command** | `npx playwright test tests/e2e/campaigns.spec.js --project=chromium --grep "SCHED"` |
| **Full suite command** | `npx playwright test tests/e2e/campaigns.spec.js --project=chromium` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `cd /Users/massimodamico/bizscreen && grep -c` (structural verify)
- **After every plan wave:** Run `npx playwright test tests/e2e/campaigns.spec.js --project=chromium`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 165-01-01 | 01 | 1 | SCHED-01 | — | N/A | structural | `grep -c ToggleChips CampaignEditorPage.jsx` | ✅ | ✅ green |
| 165-01-02 | 01 | 1 | SCHED-02 | — | N/A | structural | `grep -c getCampaignStats CampaignEditorPage.jsx` | ✅ | ✅ green |
| 165-01-03 | 01 | 1 | SCHED-01, SCHED-02 | — | N/A | e2e | `npx playwright test tests/e2e/campaigns.spec.js --project=chromium --grep "SCHED"` | ✅ | ✅ green |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- Task 165-01-03 creates E2E tests for both SCHED-01 and SCHED-02 in `tests/e2e/campaigns.spec.js`

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Dayparting preset chip visual selection feedback | SCHED-01 | Visual UX validation | Select each preset chip, verify active state styling and time field population |
| Campaign analytics stat cards render correctly | SCHED-02 | Visual layout validation | Navigate to existing campaign editor, verify stat cards display |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 30s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** pending

---

## Validation Audit 2026-04-13

| Metric | Count |
|--------|-------|
| Gaps found | 0 |
| Resolved | 0 |
| Escalated | 0 |

**Audit summary:**
- 3/3 tasks have automated verification passing
- Structural grep checks (165-01-01, 165-01-02): ✅ green — all required identifiers present in `CampaignEditorPage.jsx`
- E2E Playwright suite (165-01-03): ✅ green — 5 passed, 1 gracefully skipped when no existing campaign exists (expected behavior)
- Pre-existing test env profiles seed gap noted in SUMMARY.md appears resolved — tests now authenticate and navigate successfully
- No new test files required; no requirements escalated to manual-only
- `nyquist_compliant: true` confirmed
