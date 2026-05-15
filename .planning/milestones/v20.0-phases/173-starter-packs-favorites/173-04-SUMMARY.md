---
phase: 173-starter-packs-favorites
plan: 04
subsystem: database
tags: [db-push, schema-deploy, starter-packs, favorites, blocking, wave-2]

# Dependency graph
requires:
  - phase: 173-starter-packs-favorites plan 02
    provides: supabase/migrations/171_template_packs.sql + 172_template_favorites.sql
  - phase: 173-starter-packs-favorites plan 03
    provides: supabase/migrations/173_apply_starter_pack.sql
  - phase: 170-gallery-data-layer
    provides: gallery_templates VIEW (migration 167) referenced by the new gallery_templates_with_favorites VIEW
  - phase: migration 012
    provides: is_super_admin() boolean helper referenced by template_packs write policies
provides:
  - "Live schema on `gdxizdiltfqeugbsgtpx` — template_packs + template_pack_items + template_favorites tables, gallery_templates_with_favorites VIEW, apply_starter_pack(uuid) RPC"
  - "9 RLS policies active (4 + 2 + 3) matching plan expectations"
  - "24-row baseline in gallery_templates_with_favorites (same cardinality as Phase 170 gallery_templates — additive LEFT JOIN did not drop rows)"
affects:
  - 173-05 (marketplaceService + templateGalleryService now have real tables/RPC to target)
  - 173-06, 173-07, 173-08, 173-09 (UI + page integration can read gallery_templates_with_favorites and call toggleFavorite/applyStarterPack)
  - 173-10 (E2E suite can exercise the live end-to-end flow)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "MCP-based migration deploy — used `mcp__supabase__apply_migration` because the local supabase CLI is known to drift on version (STATE.md blocker), avoiding the interactive TTY prompt that blocks non-TTY agents"
    - "Idempotent re-apply safety verified — the three files can be re-pushed without side effects since every object uses IF NOT EXISTS / CREATE OR REPLACE / DROP POLICY IF EXISTS"
---

# Phase 173 Plan 04: Live DB Push Summary

**Migrations 171, 172, 173 applied to production Supabase project `gdxizdiltfqeugbsgtpx` via MCP (`mcp__supabase__apply_migration`) in strict 171 → 172 → 173 order. All 5 mandated smoke SELECTs returned the expected shape, plus the `is_super_admin()` helper was verified callable. No errors, no partial apply. The live schema now matches the local migration files, so all Plan 05+ service code can bind against real tables/RPCs instead of generated types.**

## Tasks

| Task | Name | Tooling | Status |
|------|------|---------|--------|
| 1 | Apply 171 → 172 → 173 to live project + 5 smoke SELECTs | MCP `apply_migration` + `execute_sql` | ✓ |

## Deploy log

Three `apply_migration` calls against project `gdxizdiltfqeugbsgtpx`, in order:

| # | Local file | MCP migration name | Result |
|---|-----------|-------------------|--------|
| 1 | `supabase/migrations/171_template_packs.sql` | `template_packs_and_items` | `{"success":true}` |
| 2 | `supabase/migrations/172_template_favorites.sql` | `template_favorites_and_gallery_view` | `{"success":true}` |
| 3 | `supabase/migrations/173_apply_starter_pack.sql` | `apply_starter_pack_rpc` | `{"success":true}` |

Naming note — MCP `apply_migration` stores a timestamp version + the supplied `name` (snake_case) as metadata; the sequential numeric prefix (171/172/173) used by the local repo is a convention for file ordering only. The live DB records these under its own timestamp sequence (same pattern used by 172.1 — see `clone_template_with_customization` (`20260421202556`) and `clone_svg_template_to_scene` (`20260422191755`) in `supabase/list_migrations`).

## Smoke SELECT outputs (live DB — captured verbatim)

### Test 1 — RLS active on all 3 new tables

```
relname              | relrowsecurity | relforcerowsecurity
---------------------+----------------+---------------------
template_favorites   | true           | false
template_pack_items  | true           | false
template_packs       | true           | false
```

✓ 3 rows, all `relrowsecurity = true` (matches plan criterion — `relforcerowsecurity` is false by design; we use RLS, not forced RLS).

### Test 2 — `gallery_templates_with_favorites` VIEW callable

```
row_count
---------
24
```

✓ VIEW returns 24 rows — identical cardinality to Phase 170's `gallery_templates` (the 24 active SVG templates). LEFT JOIN against an empty `template_favorites` correctly surfaces `is_favorited = FALSE` for every row with no data loss.

### Test 3 — `apply_starter_pack(uuid)` RPC exists as SECURITY DEFINER

```
proname            | args             | prosecdef
-------------------+------------------+-----------
apply_starter_pack | p_pack_id uuid   | true
```

✓ 1 row, args = `p_pack_id uuid`, `prosecdef = true`.

### Test 4 — Policy counts per table

```
tablename            | policy_count
---------------------+-------------
template_favorites   | 3
template_pack_items  | 2
template_packs       | 4
```

✓ Exact match: 4 (SELECT/INSERT/UPDATE/DELETE) + 2 (SELECT / mutate-ALL) + 3 (SELECT/INSERT/DELETE, no UPDATE).

### Test 5 — `is_favorited` column surfaces on the VIEW

```
column_name
------------
is_favorited
```

✓ Column present on `gallery_templates_with_favorites`.

### Bonus — `is_super_admin()` helper callable

```
proname         | args | ret
----------------+------+---------
is_super_admin  |      | boolean
```

✓ Zero-arg boolean helper exists; no function-not-found risk from the `template_packs` write policies.

## Pre-push state check

Ran a collision probe before pushing:

```sql
SELECT tablename FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('template_packs','template_pack_items','template_favorites',
                    'starter_packs','template_favorites_history');
```

Result: only `starter_packs` (legacy v2 table from migration 130). Our new tables (`template_packs` / `template_pack_items` / `template_favorites`) did not exist — greenfield apply, no collision, no rename needed. The STATE.md blocker "`template_favorites` table state unknown" is resolved: the v2 table was dropped somewhere in the 108 migrations between 130 and 167 and only the `template_favorites_history` audit shadow stub was named similarly; neither object exists now.

## Constraint Compliance

- ✅ Migrations 171, 172, 173 applied successfully to `gdxizdiltfqeugbsgtpx` (push log shows `{"success":true}` for all three).
- ✅ Smoke Test 1 (RLS): 3 rows, all `relrowsecurity = true`.
- ✅ Smoke Test 2 (VIEW): row count = 24, no error.
- ✅ Smoke Test 3 (RPC): proname + args + prosecdef all match.
- ✅ Smoke Test 4 (policies): 4 + 2 + 3 = 9 policies, exact match to plan.
- ✅ Smoke Test 5 (VIEW column): `is_favorited` column present.
- ✅ `is_super_admin()` helper is callable from the new RLS policies (verified directly).
- ✅ Local migration files unchanged (push read them; we did not edit them in this plan).
- ✅ No rollback, no partial apply, no transient errors during deploy.

## Deviations

None — plan executed exactly as written, via **Path B** (MCP supabase tools) per the plan's own fallback ladder. Path A (local `supabase db push --linked`) was skipped because the project's history of CLI version drift (logged in STATE.md and visible in `supabase/.temp/cli-latest` git noise) makes it unreliable for a non-TTY execution. Path C (`db query --file`) not needed.

## Self-Check: PASSED

- [x] Three migrations applied to live project in 171 → 172 → 173 order
- [x] All 5 mandated smoke SELECTs returned the expected shape
- [x] RLS is enabled on all 3 new tables (relrowsecurity = true)
- [x] RPC signature + SECURITY DEFINER confirmed
- [x] Policy counts exactly 4 + 2 + 3
- [x] `is_favorited` column on VIEW
- [x] `is_super_admin()` helper callable — no function-not-found risk
- [x] No collision with legacy `starter_packs` (different name) or `template_favorites_history` (doesn't exist)
- [x] Schema is live — Plan 05 service code will bind against real DB objects, not generated types
