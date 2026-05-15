---
phase: 170
plan: 01
subsystem: tests/e2e
tags:
  - tests
  - rls
  - supabase
  - playwright
dependency_graph:
  requires: []
  provides:
    - tests/e2e/template-gallery-rls.spec.js
    - tests/e2e/helpers/tenantB.js
    - scripts/smoke-template-gallery.mjs
    - .env.example (TEST_TENANT_B_* entries)
  affects:
    - Plan 02 automated verify (170-01-03)
    - Plan 03 automated verify (170-02-01)
tech_stack:
  added: []
  patterns:
    - skip-guard via tenantBAvailable() for missing env vars
    - CLI smoke harness with dynamic import for service layer
key_files:
  created:
    - tests/e2e/template-gallery-rls.spec.js
    - tests/e2e/helpers/tenantB.js
    - scripts/smoke-template-gallery.mjs
  modified:
    - .env.example
decisions:
  - "Wave 0 infra created before migration — every downstream task has an executable <automated> verify with no MISSING fallback"
  - "Playwright spec uses test.skip(!tenantBAvailable()) pattern (matching HVER-04 enterprise skip-guard convention)"
  - "smoke-template-gallery.mjs intentionally fails MODULE_NOT_FOUND until Plan 03 lands — documented in file header"
metrics:
  duration: "~5 min"
  completed_date: "2026-04-15"
  tasks_completed: 1
  files_created: 3
  files_modified: 1
---

# Phase 170 Plan 01: Wave 0 Test Infrastructure Summary

**One-liner:** Skip-guarded two-tenant RLS Playwright spec skeleton plus CLI smoke harness and env var documentation, enabling executable automated verify for all downstream Phase 170 tasks.

## What Was Built

Four files constitute the Wave 0 test infrastructure required by VALIDATION.md before any migration or service code is written:

1. **`tests/e2e/helpers/tenantB.js`** — exports `tenantBAvailable()` (env var guard) and `loginAsTenantB(page)` (delegates to existing `loginAndPrepare` with credential override). Two exports, zero new dependencies beyond the existing `helpers.js`.

2. **`tests/e2e/template-gallery-rls.spec.js`** — two-test RLS skeleton spec. Guarded at the describe level with `test.skip(!tenantBAvailable(), ...)` so CI stays green until Tenant B is provisioned. Imports from `./fixtures/index.js` (matching the established spec pattern) and `./helpers/tenantB.js`.

3. **`scripts/smoke-template-gallery.mjs`** — Node CLI harness that dynamically imports `../src/services/templateGalleryService.js`, calls `fetchGalleryTemplates({ limit: 5 })`, and asserts the result is an array. Intentionally fails with `MODULE_NOT_FOUND` until Plan 03 creates the service — this is expected and documented in the file header.

4. **`.env.example`** — appended `TEST_TENANT_B_EMAIL=` and `TEST_TENANT_B_PASSWORD=` with a Phase 170 TDAT-03 comment block, matching the documentation style of the existing `TEST_ENTERPRISE_EMAIL` entry.

## Verification Results

All acceptance criteria passed:

- `test -f` checks: all three new files exist
- `grep -q "TEST_TENANT_B_EMAIL" .env.example`: passes
- `grep -Fxq "TEST_TENANT_B_EMAIL=" .env.example`: passes (exact empty-value line)
- `grep -Fxq "TEST_TENANT_B_PASSWORD=" .env.example`: passes
- `grep -c "^export" tests/e2e/helpers/tenantB.js`: returns 2
- `node --check scripts/smoke-template-gallery.mjs`: exits 0 (syntax valid)
- `npx playwright test tests/e2e/template-gallery-rls.spec.js --project=chromium --list`: exits 0, lists 2 tests

## Operational Notes for Tenant B Provisioning

To run the non-skipped RLS spec in a real environment:

1. Create a second Supabase auth user in a **separate tenant** (different `profiles.organization_id` than Tenant A).
2. Set `TEST_TENANT_B_EMAIL` and `TEST_TENANT_B_PASSWORD` in your `.env` (or CI secret store).
3. Run: `npx playwright test tests/e2e/template-gallery-rls.spec.js --project=chromium`

Until then, the spec reports as skipped (not failed) — identical to the `HVER-04` enterprise pattern.

## Deviations from Plan

None — plan executed exactly as written.

## Threat Flags

None — this plan creates test probes only; no new network endpoints, auth paths, or schema changes.

## Known Stubs

`tests/e2e/template-gallery-rls.spec.js` contains skeleton assertions (body visible, no error toast) rather than concrete row-count checks. This is intentional — Plan 02 task 170-01-03 replaces these with real assertions after migration 111 seeds 12 rows. The stubs do not prevent the plan's goal (providing an executable automated verify for downstream tasks).

## Self-Check: PASSED

- `tests/e2e/template-gallery-rls.spec.js` — FOUND
- `tests/e2e/helpers/tenantB.js` — FOUND
- `scripts/smoke-template-gallery.mjs` — FOUND
- `.env.example` contains `TEST_TENANT_B_EMAIL=` — FOUND
- Commit `3a2eeb37` — FOUND
