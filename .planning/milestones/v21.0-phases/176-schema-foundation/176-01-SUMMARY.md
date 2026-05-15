---
phase: 176
plan: 01
subsystem: database/migrations
tags:
  - migration
  - supabase
  - rls
  - view
  - schema-foundation
requires:
  - svg_templates table (migration 094 + 167 + 175)
  - template_library table
  - is_admin() / is_super_admin() helpers (migration 009)
  - gallery_templates VIEW (migration 167, 22-col baseline)
provides:
  - template_drafts table (admin-only staging)
  - template_drafts_admin_only RLS policy
  - svg_templates.vertical column + CHECK constraint
  - gallery_templates VIEW (23 columns, with vertical)
  - chk_template_drafts_vertical_enum
  - chk_template_drafts_status_enum
  - chk_svg_templates_vertical_enum
  - idx_template_drafts_status / _created_at / _vertical
  - idx_svg_templates_vertical (partial)
  - DO ASSERT verification block (6 assertions, 3 SCs)
affects:
  - Phase 177 (AI generation pipeline → writes to template_drafts)
  - Phase 178 (vertical content seeding → INSERTs vertical values)
  - Phase 179 (gallery virtualization → reads gallery_templates with vertical)
tech-stack:
  added: []
  patterns:
    - DROP-then-ADD CONSTRAINT for idempotent CHECK migration (from mig 175)
    - DO $$ ASSERT $$ self-verifying migration block (from mig 175)
    - CREATE OR REPLACE VIEW for additive UNION ALL column expansion (from mig 167)
    - Single combined FOR ALL RLS policy with is_admin() OR is_super_admin() predicate
key-files:
  created:
    - supabase/migrations/176_template_drafts_and_vertical.sql
  modified: []
decisions:
  - "Combined FOR ALL RLS policy on template_drafts (vs split per-action) — simpler and matches admin-only semantics; tighter than mig 102's split pattern"
  - "vertical CHECK allows NULL on both template_drafts and svg_templates — drafts may pre-date tagging; existing 100+ svg_templates rows from mig 175 stay NULL until curated"
  - "Status TEXT (not enum) with CHECK constraint — cheap to evolve via DROP-then-ADD; matches project precedent"
  - "Three indexes on template_drafts (status, created_at DESC, vertical partial) — admin queue UI in Phase 177 will filter on all three"
  - "Migration file is NOT applied here — embedded DO ASSERT block is what makes Plan 02's apply itself the live verification"
metrics:
  completed: "2026-05-06T19:28:56Z"
  duration_minutes: 1.6
  tasks_completed: 1
  files_changed: 1
---

# Phase 176 Plan 01: Schema Foundation Summary

**One-liner:** Atomic Supabase migration `176_template_drafts_and_vertical.sql` (252 lines) adding `template_drafts` admin-only staging table, `svg_templates.vertical` enum column, expanded 23-column `gallery_templates` VIEW, and a self-asserting DO ASSERT block — committed but not yet applied (Plan 02 owns the live push).

## Final Migration File

- **Path:** `supabase/migrations/176_template_drafts_and_vertical.sql`
- **Total line count:** 252 lines
- **Commit:** `1c2a5ac4` (single file, 252 insertions, 0 deletions)

## Block Confirmation (6 numbered blocks, in order)

| # | Block | Verified |
|---|-------|----------|
| 1 | `template_drafts` table (8 cols) + 2 CHECK constraints (vertical, status) + table COMMENT | ✓ `CREATE TABLE IF NOT EXISTS template_drafts` present |
| 2 | RLS enable + single `template_drafts_admin_only` FOR ALL policy with `is_admin() OR is_super_admin()` | ✓ `ALTER TABLE template_drafts ENABLE ROW LEVEL SECURITY` + policy DROP/CREATE present |
| 3 | `svg_templates.vertical` TEXT column + `chk_svg_templates_vertical_enum` CHECK + constraint COMMENT + partial index | ✓ `ADD COLUMN IF NOT EXISTS vertical TEXT` present |
| 4 | `CREATE OR REPLACE VIEW gallery_templates` — 23 columns on both legs, `vertical` added (svg leg natural, polotno leg `NULL::text AS vertical`); both legs filtered to `is_active = TRUE`; VIEW COMMENT | ✓ Both legs have 23 SELECT items; `'svg_templates'::text` and `'template_library'::text` discriminators present |
| 5 | Three indexes on `template_drafts` (status, created_at DESC, vertical partial) | ✓ All three `CREATE INDEX IF NOT EXISTS` present |
| 6 | `DO $$ ASSERT $$` self-verification block | ✓ 6 ASSERTs present (see below) |

## DO ASSERT Block — 6 Assertions Confirmed

| # | Assertion | Maps to | Verified |
|---|-----------|---------|----------|
| 1 | `ASSERT v_drafts_cols = 8` (template_drafts has all 8 required columns) | SC-1.a | ✓ |
| 2 | `ASSERT v_drafts_rls = TRUE` (RLS enabled on template_drafts) | SC-1.b | ✓ |
| 3 | `ASSERT v_drafts_policy = 1` (exactly one policy named template_drafts_admin_only) | SC-1.c | ✓ |
| 4 | `ASSERT v_svg_vertical = 1` (svg_templates.vertical column exists) | SC-2.a | ✓ |
| 5 | `ASSERT v_view_vertical = 1` (gallery_templates VIEW has vertical column) | SC-3.a | ✓ |
| 6 | `ASSERT v_view_columns = 23` (gallery_templates VIEW has 23 columns total) | SC-3.b | ✓ |

All 3 ROADMAP success criteria (SC-1, SC-2, SC-3) covered by at least one ASSERT. The block fails the `apply_migration` call atomically if any precondition is violated, preventing partial schema landing.

## Idempotency Verification

| Check | Count | Floor |
|-------|------:|------:|
| `DROP CONSTRAINT IF EXISTS` occurrences | 3 | ≥ 3 |
| `IF NOT EXISTS` occurrences | 6 | ≥ 5 |
| `DROP POLICY IF EXISTS` occurrences | 1 | ≥ 1 |
| `CREATE OR REPLACE VIEW` (idempotent VIEW replace) | 1 | ≥ 1 |

Re-running the migration leaves all schema state identical and the ASSERT block tolerates the re-run (count-based assertions).

## Verify Block Result

Plan's automated `<verify>` grep chain returned `OK` on first attempt — all 11 string-literal checks pass:
- Table DDL ✓
- Vertical column ADD ✓
- Vertical CHECK predicate (3-value enum) ✓
- VIEW replacement ✓
- Admin RLS predicate ✓
- Policy name ✓
- RLS enable ✓
- ASSERT v_drafts_cols = 8 ✓
- ASSERT v_view_columns = 23 ✓
- Polotno leg `NULL::text AS vertical` cast (whitespace-aligned form) ✓

## Hand-off to Plan 02

> **Apply this migration via direct Mgmt API call (matches Phase 175 Plan 06 pattern). The embedded DO ASSERT block will fail the apply if any SC is not met.**

The 252-line file fits comfortably under the MCP `apply_migration` payload limit (Phase 175's 84KB / 2,043-line file is the documented ceiling that requires the Mgmt API direct-call workaround); for migration 176, either the MCP `apply_migration` tool or a direct Mgmt API POST is acceptable. Plan 02 should:

1. Apply the migration to the live DB
2. Confirm the DO ASSERT block did NOT raise (apply succeeded → all 6 assertions held)
3. Run a targeted post-apply spot-check (`information_schema` columns + `pg_policies` row + `\d+ gallery_templates` 23-col output) as belt-and-suspenders verification
4. Commit the post-apply state record

## Deviations from Plan

None — plan executed exactly as written. The migration file matches the verbatim spec in the plan's `<action>` block (whitespace-tolerant), all acceptance criteria pass, all six numbered blocks are present in correct order, and the DO ASSERT block has all six assertions.

## Threat Flags

None — migration introduces no new trust boundaries beyond those already enumerated in the plan's `<threat_model>`. T-176-01, T-176-02, T-176-03, T-176-04 all mitigated by file contents (RLS policy, CHECK constraints, idempotency guards). T-176-05 explicitly accepted out-of-scope.

## Self-Check: PASSED

- [x] File `supabase/migrations/176_template_drafts_and_vertical.sql` exists on disk
- [x] Commit `1c2a5ac4` exists in `git log` and contains exactly the migration file
- [x] No file deletions in commit
- [x] All 6 numbered blocks present in correct order
- [x] All 6 ASSERTs present and matching ROADMAP success criteria
- [x] Idempotency floors met (≥3 DROP CONSTRAINT, ≥5 IF NOT EXISTS)
- [x] No DOWN clauses (no `DROP TABLE template_drafts`, no `DROP VIEW gallery_templates`)
- [x] Migration NOT yet applied to live DB (per scope)
