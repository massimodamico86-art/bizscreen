---
phase: 176
plan: 02
plan_name: schema-foundation
status: complete
started: 2026-05-06
updated: 2026-05-06
type: execute
tasks_total: 3
tasks_complete: 3
self_check: PASSED
key_files:
  created: []
  modified:
    - supabase/migrations/176_template_drafts_and_vertical.sql  # one-token fix in DO ASSERT (polname → policyname)
verifications:
  - name: post_apply_4_metric
    status: passed
    evidence: "drafts_cols=8, view_cols=23, drafts_rls=true, admin_policy_count=1"
  - name: smoke_1_drafts_columns
    status: passed
    evidence: "8 columns: id(uuid NOT NULL), svg_content(text NOT NULL), prompt(text), source(text NOT NULL), status(text NOT NULL), vertical(text), metadata(jsonb NOT NULL), created_at(timestamptz NOT NULL)"
  - name: smoke_2_drafts_empty
    status: passed
    evidence: "row_count = 0"
  - name: smoke_3_rls_and_policy
    status: passed
    evidence: "rls_enabled=true, policy_name=template_drafts_admin_only"
  - name: smoke_4_svg_vertical_check
    status: passed
    evidence: "CHECK def: ((vertical IS NULL) OR (vertical = ANY (ARRAY['restaurants','retail','healthcare'])))"
  - name: smoke_5_view_vertical_queryable
    status: passed
    evidence: "SELECT vertical FROM gallery_templates LIMIT 1 → NULL (expected pre-Phase-178)"
  - name: smoke_6_view_23_columns
    status: passed
    evidence: "view_column_count = 23"
  - name: gallery_e2e_template_gallery_spec
    status: partial
    evidence: "5 of 6 passed; TDSC-04 (URL-synced filters restore state) fails. Verified pre-existing on clean working tree (stashed AuthContext WIP, same failure) — not a Phase 176 regression."
sc_traceability:
  - id: SC-1
    clauses_closed_by_this_plan: ["a-clause: schema shape", "b-clause-partial: RLS enabled + policy present"]
    clauses_remaining_for_plan_03: ["b-clause-runtime: non-admin INSERT actually rejected"]
  - id: SC-2
    clauses_closed_by_this_plan: ["a-clause: column exists with CHECK"]
    clauses_remaining_for_plan_03: ["b-clause: invalid value INSERT actually rejected"]
  - id: SC-3
    clauses_closed_by_this_plan: ["fully closed: VIEW exposes vertical, 23 columns, queryable"]
    clauses_remaining_for_plan_03: []
threat_flags: []
deviations:
  - id: D-176-02-01
    summary: "Migration's DO ASSERT block referenced pg_policies.polname (catalog name); pg_policies system view exposes it as policyname. Postgres rejected at apply time with 42703. Surgical one-token fix committed; migration is still atomic and idempotent. Re-applied successfully."
    impact: low
    commit: dc1c16ea
duration_min: ~6
hand_off:
  to_plan: 03
  note: "Negative-path tests (admin RLS rejection + CHECK violation) are next. Live DB has migration 176 applied and verified at the schema layer."
---

# Plan 02 — Apply Migration 176 to Live DB

## Outcome

Migration 176 is applied to the live Supabase project (`gdxizdiltfqeugbsgtpx`) atomically. The embedded DO ASSERT block did not raise on the second attempt. All 6 live smoke SELECTs pass. Gallery E2E suite runs with 5 of 6 passing; the single failing test (TDSC-04, URL-synced filter restoration) is verified to be a pre-existing condition unrelated to migration 176.

## Apply Outcome

| Field | Value |
|-------|-------|
| Tool path | `mcp__supabase__apply_migration` (preferred) |
| Project ID | `gdxizdiltfqeugbsgtpx` |
| Migration name | `176_template_drafts_and_vertical` |
| First attempt | FAILED — `42703 column "polname" does not exist` raised inside the DO ASSERT block. Atomic rollback. |
| Surgical fix | Renamed `polname` → `policyname` in the DO ASSERT (`pg_policies` view exposes the policy name via `policyname`; the underlying `pg_policy` catalog uses `polname`). One-line change. Committed as `dc1c16ea`. |
| Second attempt | SUCCESS — `{success: true}`. DO ASSERT block did not raise — all 6 internal assertions held. |
| Apply timestamp | 2026-05-06 (executed live during this plan) |

## Post-Apply Verification (Step 4 — 4-metric)

Run via `mcp__supabase__execute_sql` against the live project:

```sql
SELECT
  (SELECT count(*) FROM information_schema.columns
     WHERE table_schema='public' AND table_name='template_drafts')                  AS drafts_cols,
  (SELECT count(*) FROM information_schema.columns
     WHERE table_schema='public' AND table_name='gallery_templates')                AS view_cols,
  (SELECT relrowsecurity FROM pg_class
     WHERE relname='template_drafts' AND relnamespace='public'::regnamespace)       AS drafts_rls,
  (SELECT count(*) FROM pg_policies
     WHERE tablename='template_drafts' AND policyname='template_drafts_admin_only') AS admin_policy_count;
```

Result:

```
drafts_cols=8 | view_cols=23 | drafts_rls=true | admin_policy_count=1
```

Every metric matches the expected exact value.

## 6 Smoke SELECTs

### Smoke 1 — template_drafts has 8 columns with correct types

```
| column_name  | data_type                | is_nullable |
|--------------|--------------------------|-------------|
| id           | uuid                     | NO          |
| svg_content  | text                     | NO          |
| prompt       | text                     | YES         |
| source       | text                     | NO          |
| status       | text                     | NO          |
| vertical     | text                     | YES         |
| metadata     | jsonb                    | NO          |
| created_at   | timestamp with time zone | NO          |
```

8 rows; column set is exactly `{id, svg_content, prompt, source, status, vertical, metadata, created_at}`. NOT NULL on id/svg_content/source/status/metadata/created_at; nullable on prompt and vertical. Matches the plan's spec verbatim.

### Smoke 2 — template_drafts is empty

`SELECT COUNT(*) AS row_count FROM template_drafts;` → `row_count = 0`. Pass.

### Smoke 3 — RLS + admin-only policy

```
rls_enabled = true
policy_name = template_drafts_admin_only
```

Pass.

### Smoke 4 — svg_templates.vertical column + CHECK constraint

`SELECT vertical FROM svg_templates LIMIT 1` → 1 row, value NULL (expected — Phase 178 will backfill).

`SELECT pg_get_constraintdef(oid)` for `chk_svg_templates_vertical_enum`:

```
CHECK (((vertical IS NULL) OR (vertical = ANY (ARRAY['restaurants'::text, 'retail'::text, 'healthcare'::text]))))
```

CHECK definition contains `restaurants`, `retail`, `healthcare`. Pass.

### Smoke 5 — gallery_templates VIEW.vertical queryable

`SELECT vertical FROM gallery_templates LIMIT 1` → 1 row, value NULL. Pass.

### Smoke 6 — gallery_templates VIEW has exactly 23 columns

`view_column_count = 23`. Pass.

## Gallery E2E Smoke (Task 176-02-03)

Command: `npx playwright test tests/e2e/template-gallery.spec.js --project=chromium --reporter=list`

Outcome: **5 passed, 1 failed**

| # | Test | Result |
|---|------|--------|
| 1 | renders card grid with page heading (TGAL-01) | PASS (2.6s) |
| 2 | clear all resets search (TDSC-03) | PASS (2.7s) |
| 3 | search filters instantly (TDSC-01) | PASS (3.3s) |
| 4 | template-marketplace alias still resolves (Pitfall 1) | PASS (2.5s) |
| 5 | URL-synced filters restore state (TDSC-04) | **FAIL** — `getByRole('button', { name: /^Landscape$/i })` not visible after navigating to `?orientation=landscape&sort=alpha` |
| 6 | mobile single-column layout (TGAL-05) | PASS (2.7s) |

### Why TDSC-04 is not a Phase 176 regression

The plan's failure-mode rubric for this task says: *"a test FAILED ... means the VIEW replacement broke a column the gallery service consumes."* The failing test does not match that pattern:

1. **The 5 other tests in the same spec PASS** — including `renders card grid` (TGAL-01) which directly exercises the gallery_templates VIEW data flow. If the VIEW were broken, that test would fail first.
2. **The test runs against UI rendering of the orientation chip**, not the gallery_templates VIEW data. The `orientationOptions` array in `src/pages/TemplateGalleryPage.jsx` is hardcoded; it does not depend on `vertical` or any column added/changed by migration 176.
3. **Test fails on a clean working tree.** I temporarily stashed the unrelated WIP changes (`AuthContext.jsx` rewrite, `errorTracking.js` deletion) and re-ran the test — same failure, same locator timeout. This proves the failure existed before phase 176 work began. The migration is not the cause.
4. **Migration 176 only ADDED a `vertical` column to the VIEW.** It did not rename, remove, or change any pre-existing column. The orientation column is untouched.

The TDSC-04 failure is an out-of-scope pre-existing condition. **Already documented** in `STATE.md` "Blockers/Concerns" section ("Pre-existing E2E failures ... Phase 171 TDSC-04 product-routing") and in `.planning/milestones/v20.0-phases/175-new-template-content-quality-pass/deferred-items.md`. Not a blocker for SC-3 verification.

## ROADMAP Success Criteria Verdict

| SC | Clause closed in Plan 02 | Clause remaining for Plan 03 |
|----|--------------------------|------------------------------|
| SC-1 | a (schema shape), b-partial (RLS enabled + policy present) | b-runtime (non-admin INSERT actually rejected) |
| SC-2 | a (column exists with CHECK) | b (invalid value INSERT actually rejected by CHECK) |
| SC-3 | fully closed (23 cols, vertical accessible) | (none) |

Plan 03 will close the remaining "rejection at runtime" clauses with two integration tests.

## Hand-off to Plan 03

> Negative-path tests are next:
> - `tests/integration/templateDraftsRls.test.js` — non-admin INSERT must fail with RLS violation (JWT path + SQL fallback path)
> - `tests/integration/svgTemplatesVerticalCheck.test.js` — INSERT with `vertical='not_a_real_vertical'` must fail with CHECK constraint violation
>
> Both tests run against the live DB (now carrying migration 176). Live schema state matches every assertion in the migration's DO ASSERT block.

## Self-Check

- [x] Migration applied successfully (after one-token fix)
- [x] All 4 post-apply metrics match expected exact values
- [x] All 6 smoke SELECTs return expected results
- [x] Gallery E2E run completed; the single failing test verified pre-existing and unrelated
- [x] No deviations beyond the documented `polname` → `policyname` fix
- [x] Live DB state matches every assertion in the migration's DO ASSERT block
