---
phase: 176-schema-foundation
reviewed: 2026-05-06T19:54:53Z
depth: standard
files_reviewed: 3
files_reviewed_list:
  - supabase/migrations/176_template_drafts_and_vertical.sql
  - tests/integration/svgTemplatesVerticalCheck.test.js
  - tests/integration/templateDraftsRls.test.js
findings:
  blocker: 1
  warning: 8
  total: 9
status: issues_found
---

# Phase 176: Code Review Report

**Reviewed:** 2026-05-06T19:54:53Z
**Depth:** standard
**Files Reviewed:** 3
**Status:** issues_found

## Summary

The migration is well-structured, follows established project patterns (DROP-then-ADD CHECK idempotency, DO $$ ASSERT $$ self-verification, `is_admin() OR is_super_admin()` admin gate from migration 102), and the RLS posture on `template_drafts` is correctly the tightest possible (FOR ALL with both USING and WITH CHECK). The two test files use defensive skip-guards and avoid top-level client construction.

However, the review surfaced one BLOCKER and several WARNINGs:

- **BLOCKER:** Hardcoded Supabase project ID (`gdxizdiltfqeugbsgtpx`) in `templateDraftsRls.test.js`. This couples the negative-path test to a single live remote project, leaks project identity into source control, and silently runs against the wrong target if the test is executed from a fork or a different environment with `SUPABASE_ACCESS_TOKEN` set.
- **WARNINGs:** Missing CHECK on `template_drafts.source` despite an enum-shaped contract in the column comment; a destructive cleanup pattern in `beforeAll` that could delete unrelated rows; missing negative-path coverage for `template_drafts.vertical` CHECK; uses-`.single()` then-asserts-`data===null` pattern that masks success-cases differently than failure-cases; SC-3.b assertion is brittle to future column additions; Path B fallback test relies on string-substring matching rather than structured assertion; `dotenv.config({ override: true })` for `.env.local` can silently shadow CI-provided env (test-env hijack risk in some CI shapes); `vertical` column is referenced in the plan as one of the 8 required cols but is added to a brand-new table with NULL semantics inconsistent with the value-add narrative.

No critical security holes in the migration itself were detected. The RLS policy (`FOR ALL TO authenticated USING/WITH CHECK is_admin() OR is_super_admin()`) is correct and matches the documented pattern.

## Blocker Issues

### BL-01: Hardcoded production Supabase project ID in test source

**File:** `tests/integration/templateDraftsRls.test.js:109`
**Issue:** The test hardcodes the Supabase project ID:
```js
const PROJECT_ID = 'gdxizdiltfqeugbsgtpx';
```
This is then used to construct the Mgmt API URL: `https://api.supabase.com/v1/projects/${PROJECT_ID}/database/query`.

Three real problems:
1. **Wrong-target execution.** If a developer fork, a second environment, or a CI runner happens to provide `SUPABASE_ACCESS_TOKEN` (`PATH_B_SHOULD_RUN === true`) for an account that owns *a different* project, the test will silently issue SQL against the hardcoded production project — not against their own project. There is no `expect`-time guard that ties the project to the URL the test is supposedly verifying.
2. **Identity leak.** Project IDs are not credentials, but they are infrastructure identifiers the project does not appear to publish elsewhere in this repo. Coupling tests to a hardcoded prod project ID makes it impossible to point this test at a staging clone, and it leaks the prod project handle into the codebase indefinitely.
3. **CI bypass risk.** Combined with the `dotenv.config({ override: true })` calls earlier in the file (which silently override CI-provided env vars with whatever is in `.env.local`), a misconfigured developer machine could end up issuing the SQL fallback test against this hardcoded project even when CI intended the test to skip.

**Fix:**
```js
// Read project from env, fail-closed if not provided.
const PROJECT_ID = process.env.SUPABASE_PROJECT_ID;
const PATH_B_SHOULD_RUN = Boolean(MGMT_TOKEN && PROJECT_ID);
```
And document the required env in the test header alongside `SUPABASE_ACCESS_TOKEN`. This makes the target explicit, scopes the test to a single intended environment per CI run, and removes the prod project ID from source.

## Warnings

### WR-01: `template_drafts.source` missing CHECK constraint despite enum-shaped contract

**File:** `supabase/migrations/176_template_drafts_and_vertical.sql:42, 57-62`
**Issue:** The column comment promises an enum (`'ai_generation' | 'admin_upload'`):
```sql
--   source        — provenance label, e.g. 'ai_generation' | 'admin_upload'
```
But the column is declared `TEXT NOT NULL` with no CHECK constraint, while the sibling `status` column (with the same enum-shaped contract) **does** get a CHECK constraint via DROP-then-ADD. This is asymmetric and lets any free-form text into `source` (e.g., typos, deprecated values, or attacker-controlled strings if Phase 177's admin route ever proxies user input). Defense-in-depth was applied to `status` and `vertical`; `source` is the odd one out.

**Fix:**
```sql
ALTER TABLE template_drafts
  DROP CONSTRAINT IF EXISTS chk_template_drafts_source_enum;
ALTER TABLE template_drafts
  ADD CONSTRAINT chk_template_drafts_source_enum
  CHECK (source IN ('ai_generation', 'admin_upload'));
```
Add a corresponding assertion to the DO $$ block to catch regressions.

### WR-02: Destructive `LIKE 'phase-176-test-%'` cleanup with no tenant filter

**File:** `tests/integration/svgTemplatesVerticalCheck.test.js:47, 51`
**Issue:** Cleanup runs as service-role (RLS-bypass):
```js
await supa.from('svg_templates').delete().like('name', 'phase-176-test-%');
```
There is no `tenant_id IS NULL` (or any other) qualifier. If any non-test row ever has a name matching `phase-176-test-%` (developer-error, prior partial run from a different feature, copy-pasted test name from another suite), this cleanup will silently destroy that row in production. With service_role this bypasses RLS and is irrecoverable.

**Fix:**
```js
await supa.from('svg_templates')
  .delete()
  .like('name', 'phase-176-test-%')
  .is('tenant_id', null)
  .eq('is_active', false); // tests insert is_active:false; this scopes the blast radius
```
Or — preferred — use a sentinel UUID prefix instead of a name prefix, e.g. seed each test row with a known-deterministic id and delete by `id IN (...)`.

### WR-03: No negative-path test for `template_drafts.vertical` CHECK

**File:** `tests/integration/svgTemplatesVerticalCheck.test.js` (entire file) and `supabase/migrations/176_template_drafts_and_vertical.sql:51-55`
**Issue:** The migration adds two parallel CHECK constraints — one on `svg_templates.vertical` (test covered) and one on `template_drafts.vertical` (NOT test covered). The plan's narrative claims "negative-paths (RLS rejection + CHECK violation)" but the CHECK violation test only exercises `svg_templates`. If a future migration drops or weakens `chk_template_drafts_vertical_enum`, no test will fail, and the constraint comment ("Aligns with template_drafts.vertical CHECK") becomes a lie nobody catches.

**Fix:** Either add a third `it()` to `svgTemplatesVerticalCheck.test.js` that does an admin-context (service-role) INSERT into `template_drafts` with `vertical='not_a_real_vertical'` and asserts `error.code === '23514'` and `error.message` matches `/chk_template_drafts_vertical_enum/`, or add a parallel `templateDraftsCheck.test.js`. The same beforeAll/afterAll cleanup pattern can be reused (with `template_drafts` instead of `svg_templates`, and a sentinel `prompt LIKE 'phase-176-test-%'` filter).

### WR-04: `.single()` + `expect(data).toBeNull()` is correct only by coincidence

**File:** `tests/integration/templateDraftsRls.test.js:60-87`, `tests/integration/svgTemplatesVerticalCheck.test.js:71-78`
**Issue:** Pattern in both files:
```js
const { error, data } = await supa.from('...').insert({...}).select().single();
expect(data).toBeNull();
expect(error).toBeTruthy();
```
This works because `.single()` after a failed INSERT returns `data: null, error: <PGRST/Postgres error>`. But if the INSERT *succeeded* and somehow returned no representation row (e.g., the policy permitted the write but the SELECT-after-write portion of the policy did not), `.single()` could return `data: null, error: { code: 'PGRST116' }` (No rows returned). That would cause the test to incorrectly PASS — `data` is null, `error` is truthy — even though the INSERT was *not* RLS-rejected.

The svg test does already strengthen this with `expect(error.code).toBe('23514')` and a regex on the constraint name (line 76-77), so it is safer. The RLS test only checks for one of several substrings, with no positive code-match floor. A single PGRST116 (post-insert select returned 0 rows) would silently satisfy the assertion.

**Fix:** In `templateDraftsRls.test.js:80-86`, tighten the assertion to require that the rejection is RLS-shaped, not just any error-shaped:
```js
const errCode = String(error.code || '');
const errMsg = String(error.message || '').toLowerCase();
const isRlsRejection =
  errCode === '42501' ||
  errMsg.includes('row-level security') ||
  errMsg.includes('violates row-level security policy');
// Explicitly reject the PGRST116 false-positive
expect(errCode).not.toBe('PGRST116');
expect(isRlsRejection).toBe(true);
```
And drop the loose `permission denied` substring match — that string is generic enough to also fire on JWT-expired errors, which is not what this test claims to verify.

### WR-05: SC-3.b column-count assertion is brittle

**File:** `supabase/migrations/176_template_drafts_and_vertical.sql:248-254`
**Issue:**
```sql
ASSERT v_view_columns = 23,
  format('SC-3: gallery_templates expected 23 columns, got %s', v_view_columns);
```
The intent is "exactly 23 cols today, after this migration." But this is a magic number that assumes nothing else (no concurrent migration, no out-of-order apply) modified the view. More importantly, future Phase 177/178 work that legitimately adds a column to `gallery_templates` will silently break this self-test on re-run, causing migration apply to fail in environments that re-run migrations idempotently — even though the new state is correct.

**Fix:** The minimum-floor check is more robust:
```sql
ASSERT v_view_columns >= 23,
  format('SC-3: gallery_templates expected at least 23 columns, got %s', v_view_columns);
```
The earlier assertion (line 245 — `v_view_vertical = 1`) already covers the actual SC-3 outcome (presence of `vertical`). The 23-column assertion is redundant for SC-3 verification and adds future-fragility for no marginal coverage.

### WR-06: Path B fallback test relies on substring matching against a stringified body

**File:** `tests/integration/templateDraftsRls.test.js:135-158`
**Issue:**
```js
const bodyStr = JSON.stringify(body).toLowerCase();
const isRlsRejection =
  bodyStr.includes('row-level security') ||
  bodyStr.includes('row level security') ||
  bodyStr.includes('violates row-level security policy') ||
  bodyStr.includes('permission denied') ||
  bodyStr.includes('"code":"42501"') ||
  bodyStr.includes('42501');
```
Two failure modes:
1. **`bodyStr.includes('42501')` is overly loose.** Any substring containing `42501` will match — including unrelated numeric IDs, timestamps, or row counts. A SQL execution that legitimately succeeds but happens to print `42501` somewhere in its trace would erroneously pass the test.
2. **`permission denied` is substring-matched.** As noted in WR-04, this string can fire on JWT/role errors unrelated to RLS, masking the true cause.

**Fix:** Parse `body` as a structured object and check `body.code === '42501'` or `body.message.includes('row-level security')` against the actual Mgmt API error shape (which is documented). Avoid stringify-and-substring patterns when structured data is available. Also, remove the bare `'42501'` substring match — keep only `'"code":"42501"'` or, better, structured `body.code === '42501'`.

### WR-07: `dotenv.config({ override: true })` can silently override CI-provided env

**File:** `tests/integration/svgTemplatesVerticalCheck.test.js:25`, `tests/integration/templateDraftsRls.test.js:25`
**Issue:**
```js
dotenv.config({ path: '.env.local', override: true });
```
The `override: true` flag causes any value already in `process.env` (e.g., set by CI before `vitest` boots) to be overwritten by `.env.local`. If CI is set up to run these tests against a CI-specific staging project but the test runner has a `.env.local` checked into the dev box (or shipped alongside cached node_modules in some build pipelines), the test silently runs against the wrong target. This compounds the BL-01 hardcoded project ID risk.

**Fix:** Use `override: false` for `.env.local` (or read `.env.local` only as a fallback after `process.env` is missing the keys). The comment ("`.env.local` overrides `.env` so live keys take precedence over local-Docker stubs") describes a developer-laptop case; CI hosts shouldn't have `.env.local` present, but defense-in-depth is cheap here.

### WR-08: SC-1 self-test fixates on policy *name* rather than policy *behavior*

**File:** `supabase/migrations/176_template_drafts_and_vertical.sql:223-228`
**Issue:** The assertion checks that there is exactly one policy named `template_drafts_admin_only` on the table:
```sql
SELECT COUNT(*) INTO v_drafts_policy
  FROM pg_policies
  WHERE tablename = 'template_drafts'
    AND policyname = 'template_drafts_admin_only';
ASSERT v_drafts_policy = 1, ...
```
This proves the *named* policy exists, but not that it has the correct USING/WITH CHECK clause, target role (`authenticated`), or command scope (`ALL`). A future migration that mistakenly does `ALTER POLICY ... USING (TRUE)` on this exact name would not be caught by this assertion. Combined with WR-04 (test does not strictly assert RLS rejection), an accidentally-permissive policy could ship undetected.

**Fix:** Strengthen the SC-1 assertion to also pin the policy expression:
```sql
SELECT COUNT(*) INTO v_drafts_policy
  FROM pg_policies
  WHERE tablename = 'template_drafts'
    AND policyname = 'template_drafts_admin_only'
    AND cmd = 'ALL'
    AND 'authenticated' = ANY(roles)
    AND qual LIKE '%is_admin%'
    AND with_check LIKE '%is_admin%';
```
This couples the self-test to the policy *behavior*, not just its name. Note `qual` and `with_check` are TEXT columns on `pg_policies`; substring-matching on `is_admin` is sufficient defense against the most likely regression (a `USING (TRUE)` accident).

---

_Reviewed: 2026-05-06T19:54:53Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
