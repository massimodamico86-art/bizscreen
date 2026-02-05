---
task: 024
type: quick
title: Re-run comprehensive client UI tests to verify fixes
wave: 1
depends_on: [023]
files_modified:
  - tests/e2e/client-interactions.spec.js
autonomous: true

must_haves:
  truths:
    - "Apps, Playlists, Templates pages pass without error boundary"
    - "Tests for fixed pages are no longer marked as fixme"
  artifacts:
    - path: "tests/e2e/client-interactions.spec.js"
      provides: "Updated test suite with enabled tests for fixed pages"
---

<objective>
Re-run the comprehensive client UI tests (from task 022) to verify the import fixes from task 023 resolved the page crashes.

Purpose: Confirm AppsPage, PlaylistsPage, and TemplatesPage no longer show error boundary after import fixes
Output: Test results showing previously-fixme tests now passing, updated test file with enabled tests
</objective>

<execution_context>
@/Users/massimodamico/.claude/get-shit-done/workflows/execute-plan.md
@/Users/massimodamico/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@.planning/quick/022-playwright-as-a-client-click-on-all-the/022-SUMMARY.md
@.planning/quick/023-fix-all-known-issues-medialibrarypage/023-SUMMARY.md
@tests/e2e/client-interactions.spec.js
</context>

<tasks>

<task type="auto">
  <name>Task 1: Run client interaction tests and verify fixes</name>
  <files>tests/e2e/client-interactions.spec.js</files>
  <action>
1. Ensure server is running at http://localhost:5176/
2. Run the client interaction tests:
   ```bash
   npx playwright test tests/e2e/client-interactions.spec.js --project=chromium
   ```
3. Temporarily enable (remove test.fixme) the fixed page tests to verify:
   - Apps page loads (line ~240)
   - Playlists page loads (line ~244)
   - Templates page loads (line ~248)
4. Run tests again with the enabled tests
5. If all three pass, keep them enabled
6. If any fail, report the specific error

Note: Media pages and Dashboard re-navigation were NOT fixed by task 023, so keep those as test.fixme.
  </action>
  <verify>
Run: `npx playwright test tests/e2e/client-interactions.spec.js --project=chromium`
Check: Apps, Playlists, Templates tests pass (not skipped as fixme)
  </verify>
  <done>
- Apps page test passes (no error boundary)
- Playlists page test passes (no error boundary)
- Templates page test passes (no error boundary)
- Tests for these 3 pages are enabled (not test.fixme)
- Remaining fixme tests stay fixme (Media, Dashboard re-nav)
  </done>
</task>

<task type="auto">
  <name>Task 2: Commit updated test file</name>
  <files>tests/e2e/client-interactions.spec.js</files>
  <action>
If Task 1 succeeded and tests were updated:
1. Stage the updated test file
2. Commit with message: "test(quick-024): enable Apps, Playlists, Templates tests after import fixes"

If Task 1 found issues:
1. Document what failed and why
2. Do NOT commit - leave tests as fixme
  </action>
  <verify>Run: `git log -1 --oneline` shows new commit</verify>
  <done>Test file committed with enabled tests, or issues documented for next fix task</done>
</task>

</tasks>

<verification>
- `npx playwright test tests/e2e/client-interactions.spec.js --project=chromium` shows 13+ passing tests
- Apps, Playlists, Templates are NOT in fixme section
- Only 2 tests remain as fixme: Media pages and Dashboard re-navigation
</verification>

<success_criteria>
- Previously-fixme tests for Apps, Playlists, Templates now pass
- Test file updated to enable these tests
- Commit created documenting the verification
</success_criteria>

<output>
After completion, create `.planning/quick/024-re-run-comprehensive-client-ui-tests-to/024-SUMMARY.md`
</output>
