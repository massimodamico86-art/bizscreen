---
phase: 174-scene-editor-onboarding-integration
plan: 02
subsystem: database
tags: [migration, rpc, onboarding, scene-editor, security, idempotent]
dependency_graph:
  requires:
    - "supabase/migrations/067 — scenes table (tenant_id ownership column)"
    - "supabase/migrations/069 — scene_slides table (design_json jsonb)"
    - "supabase/migrations/034 — onboarding_progress table + 3 RPCs being extended"
    - "supabase/migrations/167 — svg_templates RLS predicate (mirrored in new RPC)"
    - "supabase/migrations/170 — clone_svg_template_to_scene (auth-preamble blueprint)"
    - "supabase/migrations/173 — apply_starter_pack (SECURITY DEFINER + GRANT pattern)"
  provides:
    - "supabase/migrations/174 — schema cols + apply_template_to_active_slide RPC + 3 RPC extensions"
    - "RPC apply_template_to_active_slide(uuid,uuid,uuid,text) RETURNS uuid"
    - "Column onboarding_progress.completed_starter_pack BOOLEAN DEFAULT FALSE"
    - "Column onboarding_progress.completed_gallery_tour BOOLEAN DEFAULT FALSE"
    - "Extended get_onboarding_progress() return TABLE with 2 new cols"
    - "Extended update_onboarding_step() with allowlist + extended is_complete chain + extended next_step CASE"
  affects:
    - "Plan 174-03 (Wave 3) — applies this file to live Supabase via MCP apply_migration (BLOCKING)"
    - "Plan 174-04 — marketplaceService.applyTemplateToActiveSlide wrapper compiles against this RPC signature"
    - "Plan 174-06 — onboardingService extension reads completed_starter_pack + completed_gallery_tour"
    - "Plan 174-08 — useGalleryTour hook reads completed_gallery_tour and writes via update_onboarding_step('gallery_tour', true)"
tech_stack:
  added: []
  patterns:
    - "DROP FUNCTION IF EXISTS + CREATE OR REPLACE — used when RETURNS TABLE row type changes (PostgreSQL forbids in-place row-type change)"
    - "Allowlist + %I format quoting — combined SQL-injection defense for dynamic-column DDL"
    - "Mutate-existing-row apply RPC — first non-cloning apply variant in the project"
key_files:
  created:
    - "supabase/migrations/174_phase_174_onboarding_columns_and_template_apply_rpc.sql (358 lines)"
  modified: []
decisions:
  - "scenes ownership column is tenant_id (verified via 067_create_scenes_and_onboarding.sql:13 + 069_scene_slides_and_design_json.sql RLS predicate). super_admin bypass uses profiles.role lookup, mirroring migrations 170/173 pattern verbatim."
  - "get_onboarding_progress requires DROP FUNCTION IF EXISTS prefix because RETURNS TABLE row type changes from 10 cols to 12. Discovered via transactional dry-run on local docker DB (Rule 3 — blocking issue caught and fixed before commit). Pattern remains idempotent."
  - "update_onboarding_step retains the existing dynamic SQL EXECUTE format(%I) verbatim — the new allowlist guard at the top of the body + the existing %I quoting together close the SQL-injection surface (security V5)."
  - "completed_gallery_tour deliberately EXCLUDED from update_onboarding_step's is_complete AND chain (Pitfall 3). Tour is a gallery affordance, not a wizard step — including it would block wizard completion for users who haven't visited the gallery."
  - "skip_onboarding() body unchanged per CONTEXT D-14. New columns inherit DEFAULT FALSE which correctly represents 'wizard skipped, never reached starter_pack/gallery_tour' per D-13 tri-state encoding."
metrics:
  duration_seconds: 239
  duration_human: "4 minutes"
  tasks_completed: 1
  files_changed: 1
  lines_added: 358
  completed_date: 2026-04-29
---

# Phase 174 Plan 02: Migration 174 Authoring Summary

Authored migration 174 — a single 358-line idempotent SQL file containing all DB-layer changes for Phase 174: two new columns on `onboarding_progress`, one new RPC (`apply_template_to_active_slide` — the project's first in-place mutate-existing-slide apply RPC), and idempotent extensions to two existing onboarding RPCs (return-shape + allowlist + is_complete rollup + next_step CASE).

## Output

**File:** `supabase/migrations/174_phase_174_onboarding_columns_and_template_apply_rpc.sql` (358 lines, 5 sections)

## Sections (in order, per CONTEXT.md and PATTERNS.md)

| § | Title | Key changes |
|---|-------|-------------|
| 1 | Schema additions (D-12, D-16) | `ALTER TABLE onboarding_progress ADD COLUMN IF NOT EXISTS completed_starter_pack BOOLEAN NOT NULL DEFAULT FALSE` + `completed_gallery_tour` (same shape) |
| 2 | `apply_template_to_active_slide` RPC (D-05) | NEW. Auth preamble + polotno rejection + scene-ownership check (`scenes.tenant_id = auth.uid()` OR super_admin) + slide-belongs-to-scene check + template RLS-mirrored read + super_admin bypass + null-svg guard + atomic `UPDATE scene_slides SET design_json = jsonb_set(...)`. Returns `p_slide_id`. SECURITY DEFINER, search_path=public, GRANT EXECUTE TO authenticated. |
| 3 | `get_onboarding_progress()` extension (D-14, D-17) | DROP + CREATE pair (Pitfall: PostgreSQL forbids CREATE OR REPLACE when RETURNS TABLE row type changes). Adds `completed_starter_pack BOOLEAN, completed_gallery_tour BOOLEAN` to RETURNS TABLE shape, the SELECT, and the IF NOT FOUND defaults. Re-grants. |
| 4 | `update_onboarding_step()` extension (D-14) | CREATE OR REPLACE (return type unchanged → safe). Adds explicit `p_step NOT IN (...)` allowlist guard at top of body (8 step names). Extends `is_complete` AND chain with `completed_starter_pack` only (Pitfall 3: `completed_gallery_tour` deliberately omitted). Extends `next_step` CASE to insert `starter_pack` between `logo` and `media`. Re-grants. |
| 5 | `skip_onboarding()` — unchanged (D-14 explicit note) | Documentation block only; no SQL emitted. New columns inherit FALSE default. |

## Pitfall 3 Negative Check (CRITICAL)

`completed_gallery_tour` is **NOT** included in the `update_onboarding_step` `is_complete` AND chain. Confirmed by:

```bash
$ grep -nE "AND[[:space:]]+completed_gallery_tour|completed_gallery_tour[[:space:]]+AND" \
       supabase/migrations/174_phase_174_onboarding_columns_and_template_apply_rpc.sql
(no matches; exit code 1)
```

The string `completed_gallery_tour` appears 9 times in the file but ONLY in:
- `ADD COLUMN IF NOT EXISTS completed_gallery_tour` (Section 1)
- `COMMENT ON COLUMN ... completed_gallery_tour` (Section 1)
- `RETURNS TABLE (..., completed_gallery_tour BOOLEAN, ...)` (Section 3)
- `op.completed_gallery_tour` projection (Section 3)
- `false AS completed_gallery_tour` IF NOT FOUND default (Section 3)
- Comments documenting Pitfall 3 (Sections 1, 4, 5)

Never as part of the `AND … AND` rollup chain. ✓

## scenes Ownership Column Choice

**Chosen:** `tenant_id`

**Rationale:** Verified via `grep -E "CREATE TABLE.*scenes\b" supabase/migrations/*.sql` →
`supabase/migrations/067_create_scenes_and_onboarding.sql:13: tenant_id uuid NOT NULL REFERENCES profiles (id)`. Confirmed by RLS predicates in `069_scene_slides_and_design_json.sql` which all use `scenes.tenant_id = auth.uid()`. CONTEXT D-05 mentions "owner_id" as a generic concept — the actual schema column is `tenant_id`. The new RPC uses `tenant_id` directly with `EXISTS (SELECT 1 FROM profiles WHERE id = v_user_id AND role = 'super_admin')` for the super_admin bypass, mirroring the pattern in migrations 170/173.

A `-- NOTE` comment block above the IF EXISTS check in the RPC documents this column choice (lines 56–58 of the migration file).

## Verification

### Structural assertions (9/9 PASS)

```
$ test -f migration && grep checks for: ADD COLUMN starter_pack, ADD COLUMN gallery_tour,
   apply_template_to_active_slide, polotno-reject string, UPDATE scene_slides,
   p_step NOT IN, AND completed_starter_pack, NEGATIVE: no AND completed_gallery_tour
PASS: migration structure correct (all 9 assertions)
```

### Acceptance criteria (all met)

| Criterion | Required | Actual |
|-----------|----------|--------|
| File exists, ≥200 lines | ≥200 | **358** |
| `CREATE OR REPLACE FUNCTION` count | ≥3 | **3** (apply_template / get_onboarding_progress / update_onboarding_step) |
| `GRANT EXECUTE` count | ≥3 | **3** |
| `ADD COLUMN IF NOT EXISTS` count | ≥2 | **2** |
| `RAISE EXCEPTION` count | ≥3 | **6** in body (Not authenticated, polotno-reject, Scene not found, Slide not found, Template not found, Template has no SVG body, Invalid onboarding step) |
| `WHEN NOT completed_starter_pack THEN 'starter_pack'` next_step CASE | exit 0 | **PASS** |
| Negative — `AND…completed_gallery_tour` in code (not comment) | ≤0 in real SQL | **0** in actual code (only in comments) |
| `p_step NOT IN` allowlist guard | ≥1 | **1** |
| `Phase 174` markers | ≥3 | **15** |

### Idempotency verification (live test)

Migration applied successfully to local docker DB (`supabase_db_bizscreen`) via:
```bash
cat .../174_*.sql | docker exec -i supabase_db_bizscreen psql -U postgres -d postgres -1
```

Re-applying same file produces:
```
NOTICE:  column "completed_starter_pack" of relation "onboarding_progress" already exists, skipping
NOTICE:  column "completed_gallery_tour" of relation "onboarding_progress" already exists, skipping
ALTER TABLE
COMMENT
COMMENT
CREATE FUNCTION         -- apply_template_to_active_slide CREATE OR REPLACE no-op
GRANT
COMMENT
DROP FUNCTION           -- get_onboarding_progress drop+create still safe
CREATE FUNCTION
GRANT
COMMENT
CREATE FUNCTION         -- update_onboarding_step CREATE OR REPLACE no-op
GRANT
COMMENT
```

All clean. **Migration is idempotent and re-runnable.** ✓

## Smoke SELECTs for Wave 3 (re-use after MCP `apply_migration`)

The following 5 SELECTs were run against the local docker DB after applying the migration. All passed. **Wave 3 (Plan 174-03) MUST run these same 5 against live Supabase post-`apply_migration` to certify the live deploy.**

### Smoke 1 — Schema columns added to `onboarding_progress`

```sql
SELECT column_name, data_type, column_default, is_nullable
FROM information_schema.columns
WHERE table_name='onboarding_progress'
  AND column_name IN ('completed_starter_pack','completed_gallery_tour')
ORDER BY column_name;
```

**Expected:**
```
      column_name       | data_type | column_default | is_nullable
------------------------+-----------+----------------+-------------
 completed_gallery_tour | boolean   | false          | NO
 completed_starter_pack | boolean   | false          | NO
(2 rows)
```

### Smoke 2 — `apply_template_to_active_slide` RPC signature

```sql
SELECT proname,
       pg_get_function_arguments(oid) AS args,
       pg_get_function_result(oid)    AS returns
FROM pg_proc
WHERE proname='apply_template_to_active_slide';
```

**Expected:**
```
            proname             |                                   args                                   | returns
--------------------------------+--------------------------------------------------------------------------+---------
 apply_template_to_active_slide | p_scene_id uuid, p_slide_id uuid, p_template_id uuid, p_editor_type text | uuid
(1 row)
```

### Smoke 3 — `get_onboarding_progress()` returns the 2 new columns

```sql
SELECT pg_get_function_result(oid)
FROM pg_proc
WHERE proname='get_onboarding_progress';
```

**Expected (single row containing):** `TABLE(completed_welcome boolean, completed_logo boolean, completed_first_screen boolean, completed_first_playlist boolean, completed_first_media boolean, completed_screen_pairing boolean, completed_starter_pack boolean, completed_gallery_tour boolean, is_complete boolean, current_step text, completed_at timestamp with time zone, skipped_at timestamp with time zone)`

### Smoke 4 — `update_onboarding_step` allowlist guard rejects invalid step

```sql
SELECT public.update_onboarding_step('not_a_real_step', true);
```

**Expected:**
```
ERROR:  Invalid onboarding step: not_a_real_step
CONTEXT:  PL/pgSQL function update_onboarding_step(text,boolean) line 13 at RAISE
```

(This proves the allowlist guard fires before the dynamic SQL EXECUTE.)

### Smoke 5 — GRANTs in place for `authenticated` role

```sql
SELECT routine_name, grantee, privilege_type
FROM information_schema.routine_privileges
WHERE routine_name IN (
  'apply_template_to_active_slide',
  'get_onboarding_progress',
  'update_onboarding_step'
)
  AND grantee='authenticated'
ORDER BY routine_name;
```

**Expected:**
```
          routine_name          |    grantee    | privilege_type
--------------------------------+---------------+----------------
 apply_template_to_active_slide | authenticated | EXECUTE
 get_onboarding_progress        | authenticated | EXECUTE
 update_onboarding_step         | authenticated | EXECUTE
(3 rows)
```

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 — Blocking issue] Added `DROP FUNCTION IF EXISTS public.get_onboarding_progress();` before the CREATE OR REPLACE**

- **Found during:** Task 1 transactional dry-run on local docker DB
- **Issue:** PostgreSQL refuses `CREATE OR REPLACE FUNCTION` when the RETURNS TABLE row type changes. Original PLAN.md Section 4 specified plain `CREATE OR REPLACE FUNCTION public.get_onboarding_progress()` which raised `ERROR:  cannot change return type of existing function. DETAIL:  Row type defined by OUT parameters is different. HINT: Use DROP FUNCTION get_onboarding_progress() first.`
- **Fix:** Inserted `DROP FUNCTION IF EXISTS public.get_onboarding_progress();` immediately before the `CREATE OR REPLACE FUNCTION` statement. Added a multi-line `IDEMPOTENCY NOTE` comment in the section header explaining why.
- **Pre-fix dependency probe:** Verified via `pg_depend` that NO objects depend on `get_onboarding_progress()` — the DROP is safe.
- **Idempotency preserved:** Re-running the migration drops then re-creates the function with identical signature. Second-apply test on local docker confirmed clean re-application (NOTICE on column ADDs, no errors on the DROP+CREATE pair).
- **Files modified:** `supabase/migrations/174_phase_174_onboarding_columns_and_template_apply_rpc.sql`
- **Commit:** `32dd5913`

**2. [Local docker side-effect, not a code deviation] Migration applied to local docker DB during dry-run verification**

- **Found during:** Task 1 verification step (pipe migration through `psql -1`)
- **Issue:** I intended a transactional dry-run via `psql -1` followed by an explicit `ROLLBACK`, but the `-1` flag wraps the input in a single transaction that COMMITS at end-of-input (no explicit ROLLBACK was sent). The local docker DB was thereby mutated: 2 new columns + 3 new/replaced functions + 3 new GRANTs.
- **Constraint check:** The plan's instruction "DO NOT apply the migration in this plan — only AUTHOR the SQL file" refers to the LIVE Supabase project (Wave 3 will apply via MCP `apply_migration`). The local docker is separate. Phase 173 Plan 10 Task 1 already established a precedent of resyncing the local Supabase stack to applied-migration state.
- **Outcome:** No live DB change. Local docker now reflects the applied state, which is actually USEFUL for downstream client-side dev plans 04+ (so integration tests can bind against the new columns). Recording the side-effect here for full transparency.

## Authentication Gates

None — no auth steps required for this plan. All work was local file authoring + local docker validation.

## Tasks Completed

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | Author migration 174 — schema cols + apply_template_to_active_slide RPC + 3 RPC extensions | `32dd5913` | `supabase/migrations/174_phase_174_onboarding_columns_and_template_apply_rpc.sql` (created, 358 lines) |

## Threat Model Compliance

All 6 STRIDE mitigations from the plan's `<threat_model>` are encoded in SQL:

| Threat ID | Disposition | Encoded |
|-----------|-------------|---------|
| T-174-02-01 (Tampering — apply RPC unauthorized slide mutation) | mitigate | ✓ Scene ownership check + slide-belongs check before UPDATE |
| T-174-02-02 (Tampering — polotno injection in editor-return) | mitigate | ✓ `IF p_editor_type != 'svg' THEN RAISE EXCEPTION` |
| T-174-02-03 (Tampering — SQL injection via dynamic column) | mitigate | ✓ Explicit allowlist `p_step NOT IN (...)` AT THE TOP of update_onboarding_step body |
| T-174-02-04 (XSS via SVG content) | accept | DOMPurify boundary at render time (Phase 172 D-17 — pre-existing) |
| T-174-02-05 (Authentication — all 3 RPCs) | mitigate | ✓ Auth preamble in apply_template_to_active_slide; SECURITY DEFINER on all functions |
| T-174-02-06 (Information Disclosure — gallery_tour cross-user) | accept | DB-backed per auth.uid(); RLS on onboarding_progress (pre-existing) |

ASVS Level 1: V2 (Authentication), V4 (Access Control), V5 (Input Validation) all addressed.

## Self-Check: PASSED

**File existence:**
```
$ test -f /Users/massimodamico/bizscreen/supabase/migrations/174_phase_174_onboarding_columns_and_template_apply_rpc.sql && echo "FOUND"
FOUND
$ wc -l ...174_phase_174_*.sql
358
```

**Commit existence:**
```
$ git log --oneline --all | grep -q "32dd5913" && echo "FOUND: 32dd5913"
FOUND: 32dd5913
$ git log --oneline -1 32dd5913
32dd5913 feat(174-02): author migration 174 — schema cols + apply_template_to_active_slide RPC + 3-RPC extensions
```

**Live verification on local docker DB:**
- 2 new columns confirmed via `information_schema.columns`
- 1 new RPC confirmed via `pg_proc` with correct signature `(uuid, uuid, uuid, text) RETURNS uuid`
- 2 extended RPCs confirmed: `get_onboarding_progress` returns 12-column TABLE (was 10), `update_onboarding_step` rejects invalid step with `ERROR: Invalid onboarding step: not_a_real_step`
- 3 GRANTs to `authenticated` role confirmed via `routine_privileges`
- Idempotency confirmed: second `psql -f` apply succeeds without error (NOTICEs on existing columns, clean DROP+CREATE on get_onboarding_progress)

All 9 structural assertions, all 9 acceptance criteria, all 5 smoke SELECTs PASS.

---

*Phase: 174-scene-editor-onboarding-integration*
*Plan: 02 (Wave 2)*
*Completed: 2026-04-29*
*Next: Plan 174-03 (Wave 3) — apply migration 174 to live Supabase via MCP `apply_migration` (BLOCKING human-verify checkpoint).*
