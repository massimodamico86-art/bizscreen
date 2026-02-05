---
quick_task: 007
description: Fix unused variable warnings in load-tests folder
type: execute
autonomous: true
files_modified:
  - load-tests/auth-burst.js
  - load-tests/heartbeat.js
  - load-tests/media-library.js
  - load-tests/playlist-resolution.js
  - load-tests/run-all.js
---

<objective>
Fix 8 unused variable warnings in the load-tests folder to reduce ESLint noise.

Purpose: Clean up tech debt by addressing linting warnings in load test files.
Output: All `unused-imports/no-unused-vars` warnings resolved in load-tests folder.
</objective>

<context>
@.planning/STATE.md — Current project state (v2.2 Onboarding Polish)

Load test files created in Phase 13. These files have unused variables that were
set up for future use or are artifacts of development that can be cleaned up.
</context>

<tasks>

<task type="auto">
  <name>Task 1: Fix unused variables in all load-tests files</name>
  <files>
    load-tests/auth-burst.js
    load-tests/heartbeat.js
    load-tests/media-library.js
    load-tests/playlist-resolution.js
    load-tests/run-all.js
  </files>
  <action>
Fix 8 unused variable warnings:

**auth-burst.js (line 29):**
- `getNextCredentials` is defined but never used
- Prefix with underscore: `function _getNextCredentials()` (kept for documentation of auth pattern)

**heartbeat.js (line 81):**
- `payload` is assigned but never used
- Prefix with underscore: `const _payload = JSON.stringify(...)` (kept for documentation of heartbeat payload format)

**media-library.js (line 36):**
- `getNextQuery` is defined but never used
- Prefix with underscore: `function _getNextQuery()` (kept for documentation of query pattern)

**playlist-resolution.js (line 74):**
- `payload` is assigned but never used
- Prefix with underscore: `const _payload = JSON.stringify(...)` (kept for documentation of resolution payload format)

**run-all.js (lines 76, 96, 148, 165):**
- Two `stderr` variables assigned but never used (lines 76, 148)
  - Prefix with underscore: `let _stderr = ''`
- Two `e` catch parameters not used (lines 96, 165)
  - Use empty catch or prefix: `catch (_e)` or just `catch`

All these variables are intentionally kept (with underscore prefix) because:
1. They document expected data shapes for load test payloads
2. They may be useful for debugging if tests need to be extended
3. The underscore prefix satisfies ESLint while preserving the code
  </action>
  <verify>
Run `npx eslint load-tests/ --no-fix 2>&1 | grep "unused-imports/no-unused-vars"` returns no results
  </verify>
  <done>
All 8 `unused-imports/no-unused-vars` warnings in load-tests folder are resolved
  </done>
</task>

</tasks>

<verification>
- `npx eslint load-tests/` shows no unused variable warnings (may still have JSDoc warnings - those are separate)
- Load test files remain valid JavaScript (no syntax errors)
</verification>

<success_criteria>
- ESLint `unused-imports/no-unused-vars` warnings reduced from 8 to 0 in load-tests folder
- All load test files retain their functionality and documentation value
</success_criteria>

<output>
After completion, commit with message:
`fix: resolve unused variable warnings in load-tests folder`
</output>
