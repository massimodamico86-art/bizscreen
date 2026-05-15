---
phase: 178
slug: vertical-content-seeding
status: approved
nyquist_compliant: true
wave_0_complete: true
created: 2026-05-09
validation_signed_off: 2026-05-11
wave_0_evidence_ref: "178-01-SUMMARY.md key-files block — 5 RED test files created: tests/unit/generateOrientation.test.js, tests/integration/approveBulk.test.js, tests/integration/rejectBulk.test.js, tests/integration/templateDraftsService.bulk.test.js, tests/integration/seedTopics.schema.test.js; plus 2 verification CLI tools: scripts/verify-178-counts.cjs (9 SC harness for TVRT-01..04 + TCAT-01..04) and scripts/validate-templates.cjs (svgValidator bulk CLI). All Wave 0 artifacts committed before any production code per Plan 01 Wave 0 deliverable; downstream waves (Plans 02-08) flipped RED tests to GREEN and consumed the verification tools. Cross-reference: Phase 180 Plan 04 spot-check 2026-05-11 confirms files physically present + 178-01-SUMMARY.md cites them in key-files."
---

# Phase 178 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest (unit/integration) + Playwright (E2E) |
| **Config file** | `vitest.config.js`, `playwright.config.ts` |
| **Quick run command** | `npm run test:unit -- <pattern>` |
| **Full suite command** | `npm run test && npm run test:e2e` |
| **Estimated runtime** | ~120 seconds (full suite) |

---

## Sampling Rate

- **After every task commit:** Run scoped vitest `npm run test:unit -- <pattern>`
- **After every plan wave:** Run `npm run test` (full vitest suite)
- **Before `/gsd-verify-work`:** Full suite + Playwright spec for AdminTemplateQueuePage must be green
- **Max feedback latency:** 60 seconds for unit/integration; 90 seconds for Playwright

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| _populated by planner_ | _ | _ | _ | _ | _ | _ | _ | _ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

*The planner will populate this table per-plan; entries derive from PLAN.md `<acceptance_criteria>` blocks and any RED tests committed in Wave 0.*

---

## Wave 0 Requirements

Per RESEARCH.md §"Validation Architecture", Wave 0 commits these RED tests/scaffolds before production code:

- [ ] `tests/integration/promptLibraryParity.test.js` — extension assertion: ~24 entries, no parity drift after expansion (TVRT-04)
- [ ] `tests/integration/templateDraftsService.bulk.test.js` — RED tests for `bulkApproveDrafts` / `bulkRejectDrafts` (D-05/D-06)
- [ ] `tests/integration/seedTopics.schema.test.js` — RED tests asserting topic-file schema invariants (slug uniqueness, required fields, allowed-vertical/template_type/orientation enums) (D-15)
- [ ] `tests/e2e/admin-template-queue.spec.js` — extended Playwright assertions for filter chips + bulk-select + confirm modal (D-05/D-06/D-07/D-08, TVRT-05 regression baseline)
- [ ] `scripts/validate-templates.cjs` (or extension) — bulk svgValidator CLI for net-new content (TCAT-03)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Wave 1/2/3 visual cull (aesthetic review of generated drafts) | TVRT-01..03 | LLM-generated visual quality cannot be auto-graded; admin reviews ~120 drafts/wave and rejects ~25% via bulk-reject | After each wave runs, admin opens AdminTemplateQueuePage Pending tab, filters by vertical=current-wave, scans thumbnails, multi-selects unwanted, clicks Reject-selected, supplies shared reason. Logged in `178-WAVE-N-RUN.md`. |
| Hero-type orientation fidelity (portrait + landscape look intentional, not stretched) | TCAT-02 | Visual judgment | Admin reviews each hero type's portrait + landscape variant pair side-by-side post-approve in TemplateGalleryPage. |
| `178-WAVE-N-RUN.md` artifact completeness | TVRT-01..03 | Free-form qualitative notes plus quant metrics | Each wave commits a file with: timestamp, draft IDs, validator pass-rate, total cost, qualitative review notes. |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references (parity test, bulk service test, topic-schema test, Playwright spec, validator CLI)
- [ ] No watch-mode flags in CI commands
- [ ] Feedback latency < 90s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
