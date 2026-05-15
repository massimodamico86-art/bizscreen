---
phase: 173-starter-packs-favorites
plan: 02
subsystem: database
tags: [migration, schema, rls, starter-packs, favorites, view]

# Dependency graph
requires:
  - phase: 170-gallery-data-layer
    provides: gallery_templates VIEW (extended by gallery_templates_with_favorites) and is_super_admin() helper
  - phase: 172-preview-apply-flow
    provides: established editor_type CHECK convention and per-user auth.uid() RLS pattern
provides:
  - "template_packs table — admin-curated pack metadata with polymorphic editor_type CHECK (TPCK-01, TPCK-03, TPCK-04)"
  - "template_pack_items junction — composite PK (pack_id, template_id, editor_type), parent-pack EXISTS RLS (TPCK-01)"
  - "template_favorites table — per-user bookmarks, PK (user_id, template_id, editor_type), SELECT/INSERT/DELETE RLS on auth.uid() and NO UPDATE policy (TFAV-01, TFAV-03)"
  - "gallery_templates_with_favorites VIEW — additive over gallery_templates; LEFT JOIN filtered by auth.uid() so is_favorited surfaces per-caller (TFAV-02)"
  - "Idempotent guards throughout — CREATE TABLE IF NOT EXISTS, CREATE INDEX IF NOT EXISTS, DROP POLICY IF EXISTS + CREATE POLICY (Pattern A)"
affects:
  - 173-03 (apply_starter_pack RPC — selects from template_packs / template_pack_items)
  - 173-04 (db push — applies 171 + 172 + 173 to live Supabase)
  - 173-05 (marketplaceService + templateGalleryService — reads these tables + the favorites VIEW)
  - 173-06, 173-08 (FavoriteButton + gallery page integration — rely on is_favorited column)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Additive VIEW for per-user context — gallery_templates_with_favorites LEFT JOINs favorites filtered on auth.uid() so read-side code can continue to query one relation (Pattern 4)"
    - "Parent-pack EXISTS RLS for junction tables — template_pack_items delegates SELECT/write auth to the parent template_packs SELECT predicate instead of duplicating the predicate (Pattern 2)"
    - "Toggle = insert/delete for per-user bookmark tables — no UPDATE policy; PK collision (23505) is tolerated at the service layer (Pattern 3)"
    - "Idempotent DROP + CREATE POLICY pairs so RLS can be re-run safely on a live DB (Pattern A)"
---

# Phase 173 Plan 02: Schema Migrations Summary

**Two new SQL migrations landed: `171_template_packs.sql` defines admin-curated `template_packs` + `template_pack_items` with polymorphic editor_type and parent-pack EXISTS RLS; `172_template_favorites.sql` defines per-user `template_favorites` + `gallery_templates_with_favorites` VIEW that surfaces `is_favorited` via a LEFT JOIN filtered on `auth.uid()`. Both files are fully idempotent and use `is_super_admin()` for admin-write policies.**

## Tasks

| Task | Name | Commit | Status |
|------|------|--------|--------|
| 1 | Write migration 171 — template_packs + pack_items + RLS | 5a6ecaad | ✓ |
| 2 | Write migration 172 — template_favorites + gallery VIEW | f101da37 | ✓ |

Task 1 was executed in a parallel worktree (`worktree-agent-a7cba448`) and merged into main via `4a81249f`. Task 2 was executed inline on `main` by the orchestrator after the executor subagent hit a transient sandbox block on the second file-write (see **Deviations** below — single-task setback, zero scope change).

## Key Files Created

### `supabase/migrations/171_template_packs.sql` (167 lines)

- `template_packs` table — PK id, polymorphic `editor_type` CHECK (`'svg' | 'polotno'`), optional `thumbnail_path`, `display_order`, `industry`, `is_active`; timestamps.
- `template_pack_items` junction — composite PK `(pack_id, template_id, editor_type)` per CONTEXT D-01 (NOT `(pack_id, position)` — RESEARCH Pitfall 4).
- Indexes: `idx_template_packs_active_order`, `idx_template_pack_items_pack` (`(pack_id, position)`).
- RLS on `template_packs`: SELECT permissive when `is_active = TRUE` OR `is_super_admin()`; INSERT/UPDATE/DELETE super_admin-only.
- RLS on `template_pack_items`: parent-pack EXISTS check (Pattern 2) — delegates to `template_packs` visibility predicate instead of duplicating it.
- Idempotent: `CREATE TABLE IF NOT EXISTS`, `CREATE INDEX IF NOT EXISTS`, `DROP POLICY IF EXISTS` + `CREATE POLICY` pairs.
- `DO $$` self-assert block at file end verifies both tables are queryable post-migration.

### `supabase/migrations/172_template_favorites.sql` (79 lines)

- `template_favorites` table — PK `(user_id, template_id, editor_type)` (toggle = insert/delete — no surrogate id, no UPDATE policy).
- Index `idx_template_favorites_user` on `(user_id, created_at DESC)` for the favorites-only filter in the UI.
- Three RLS policies: SELECT, INSERT (WITH CHECK), DELETE — all gated on `user_id = auth.uid()`. Deliberately NO UPDATE policy per Pattern 3.
- `gallery_templates_with_favorites` VIEW: `SELECT gt.*, (tf.user_id IS NOT NULL) AS is_favorited FROM gallery_templates gt LEFT JOIN template_favorites tf ON tf.template_id = gt.id AND tf.editor_type = gt.editor_type AND tf.user_id = auth.uid()` (Pattern 4 — additive over Phase 170's gallery_templates VIEW).
- `DO $$` self-assert block verifies both `template_favorites` rows and the VIEW are callable post-migration.

## Constraint Compliance

- ✅ `template_packs` table with PK on `id`, polymorphic `editor_type` CHECK, and explicit RLS for SELECT/INSERT/UPDATE/DELETE per CONTEXT D-03.
- ✅ `template_pack_items` composite PK `(pack_id, template_id, editor_type)` — matches D-01, not (pack_id, position).
- ✅ `template_pack_items` RLS uses parent-pack EXISTS (Pattern 2) — not a duplicated predicate.
- ✅ `template_favorites` PK `(user_id, template_id, editor_type)` with three RLS policies and NO UPDATE policy.
- ✅ `gallery_templates_with_favorites` VIEW LEFT JOINs `template_favorites` filtered by `tf.user_id = auth.uid()` (Pattern 4).
- ✅ Both files are fully idempotent (Pattern A — CREATE TABLE IF NOT EXISTS, CREATE INDEX IF NOT EXISTS, DROP/CREATE POLICY pairs).
- ✅ `is_super_admin()` helper used on all write policies in 171 — matches Phase 170 convention.

## Deviations

**Sandbox block mid-plan (transient, not a plan defect).** The parallel executor subagent (`a7cba448`) successfully wrote and committed migration 171 (Task 1, commit `5a6ecaad`) in its worktree, then reported that every subsequent file-creation tool call (Write / heredoc / touch / tee) was denied, while read-only and git commands continued to work. The agent could not write migration 172 or its SUMMARY.md inside the worktree.

Resolution: orchestrator merged both worktrees into main, force-removed the two locked worktrees, then wrote `supabase/migrations/172_template_favorites.sql` inline on `main` using the VERBATIM SQL block from `173-02-PLAN.md` lines 323-402 and committed as `f101da37`. No plan content changed; only the execution environment for Task 2. Plan 03 (sibling worktree) completed cleanly with both commits and its own SUMMARY — no contagion.

## Self-Check: PASSED

- [x] Migration 171 file exists and self-asserts against `template_packs` + `template_pack_items` at apply time
- [x] Migration 172 file exists and self-asserts against `template_favorites` + `gallery_templates_with_favorites` at apply time
- [x] Both files idempotent (re-runnable)
- [x] Super_admin helper referenced correctly in 171 (no function-not-found risk post-push)
- [x] No `git add -A` / `git add .` — only explicit file paths
- [x] Plan 03 (sibling) landed on main without conflicts — orthogonal file sets, no merge issues
- [x] Plan 04 (next wave) is a human-action checkpoint — user runs `supabase db push` to apply 171 + 172 + 173 in order and smoke-test before Plan 05 service code depends on them
