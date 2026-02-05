---
type: quick
task: 009
name: update-baseline-browser-mapping
status: pending
files_modified:
  - package.json
  - package-lock.json
autonomous: true
---

<objective>
Update baseline-browser-mapping to latest version to eliminate build warning about stale Baseline data.

Purpose: The npm build shows a warning that baseline-browser-mapping data is over two months old, affecting CSS autoprefixer accuracy for modern browser feature detection.

Output: Updated dependency with no build warnings about stale baseline data.
</objective>

<context>
@package.json

Current state:
- baseline-browser-mapping is a transitive dependency via autoprefixer -> browserslist
- Currently installed: v2.8.25 (via browserslist)
- Latest available: v2.9.19
- Warning appears during `npm run build`

The fix is to add baseline-browser-mapping as a direct dev dependency, which will override the transitive version.
</context>

<tasks>

<task type="auto">
  <name>Task 1: Add baseline-browser-mapping as dev dependency</name>
  <files>package.json, package-lock.json</files>
  <action>
    Run `npm i baseline-browser-mapping@latest -D` to add as a direct dev dependency.

    This will:
    1. Add baseline-browser-mapping to devDependencies in package.json
    2. Update package-lock.json with the latest version
    3. Override the older transitive version from browserslist
  </action>
  <verify>
    1. `npm ls baseline-browser-mapping` shows latest version (2.9.x or newer)
    2. `npm run build 2>&1 | grep -i baseline` shows no stale data warning
  </verify>
  <done>baseline-browser-mapping@latest is in devDependencies and build completes without baseline staleness warning</done>
</task>

<task type="auto">
  <name>Task 2: Commit the update</name>
  <files>package.json, package-lock.json</files>
  <action>
    Stage and commit the package.json and package-lock.json changes with a clear commit message.
  </action>
  <verify>`git log -1 --oneline` shows the commit</verify>
  <done>Changes committed with message referencing the baseline-browser-mapping update</done>
</task>

</tasks>

<verification>
1. `npm run build` completes without baseline-browser-mapping staleness warning
2. `npm ls baseline-browser-mapping` shows version 2.9.x or later
3. Git history shows the update commit
</verification>

<success_criteria>
- Build warning "[baseline-browser-mapping] The data in this module is over two months old" no longer appears
- baseline-browser-mapping is listed in devDependencies in package.json
- All changes committed to git
</success_criteria>
