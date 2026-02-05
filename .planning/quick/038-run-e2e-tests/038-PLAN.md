---
id: quick-038
type: quick
title: Run E2E Tests
status: planned
created: 2026-02-04
---

# Quick Task 038: Run E2E Tests

## Objective

Run the full E2E test suite to verify current application state.

## Context

- Previous run (quick-037): 380 passed, 462 failed, 321 skipped (36.7m)
- Infrastructure is healthy (Docker/Supabase stable)
- 406 fix has been verified working
- Scene tests (81) are intentionally skipped (feature not in navigation)

## Tasks

### Task 1: Verify Infrastructure

<task type="auto">
  <name>Check Supabase is running</name>
  <files>None</files>
  <action>
    Run `npx supabase status` to verify local Supabase is running.
    If not running, start with `npx supabase start`.
  </action>
  <verify>Supabase status shows all services running (API, DB, Studio, etc.)</verify>
  <done>Supabase infrastructure confirmed healthy</done>
</task>

### Task 2: Run E2E Tests

<task type="auto">
  <name>Execute Playwright E2E test suite</name>
  <files>None (test execution only)</files>
  <action>
    Run full E2E test suite with `npx playwright test`.
    Capture results including pass/fail/skip counts and duration.
  </action>
  <verify>Test run completes (all tests execute or timeout)</verify>
  <done>E2E test results captured with pass/fail/skip counts</done>
</task>

### Task 3: Document Results

<task type="auto">
  <name>Update STATE.md with test results</name>
  <files>.planning/STATE.md</files>
  <action>
    Update STATE.md with:
    - Test counts (passed, failed, skipped)
    - Duration
    - Any notable changes from baseline (quick-037: 380/462/321)
    - Add quick task entry to completed table
  </action>
  <verify>STATE.md has updated E2E baseline section and quick task entry</verify>
  <done>STATE.md reflects current test status</done>
</task>

## Success Criteria

- E2E test suite runs to completion
- Results documented in STATE.md
- Any regressions or improvements noted

## Baseline Comparison

Compare results to quick-037 baseline:
- Passed: 380
- Failed: 462
- Skipped: 321
- Duration: 36.7m
