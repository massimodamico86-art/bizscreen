---
phase: 173-starter-packs-favorites
plan: 03
subsystem: database
tags: [migration, rpc, plpgsql, atomic-transaction, starter-packs, security-definer, rls]

# Dependency graph
requires:
  - phase: 172-preview-apply-flow
    provides: clone_template_with_customization body (polotno branch blueprint, migration 168)
  - phase: 172.1-fix-svg-apply-rpc
    provides: clone_svg_template_to_scene body (svg branch blueprint, migration 170)
  - phase: 173-starter-packs-favorites plan 02 (sibling worktree)
    provides: template_packs + template_pack_items tables (migration 171) and template_favorites (migration 172)
provides:
  - "apply_starter_pack(uuid) RETURNS uuid[] RPC — atomic bulk clone of a starter pack (TPCK-02)"
  - "Inlined svg + polotno branch bodies so all member inserts share a single PL/pgSQL transaction (all-or-nothing per CONTEXT D-07)"
  - "Empty-pack contract: returns empty uuid[] without error"
  - "Explicit template_packs SELECT RLS mirror inside SECURITY DEFINER (cannot broaden access)"
affects:
  - 173-04 (db push — will apply 171+172+173 atomically)
  - 173-05 (marketplaceService applyStarterPack client wrapper — RED→GREEN after push)
  - 173 integration tests — apply-starter-pack-atomicity
  - Phase 174 (onboarding integration with starter packs)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Inline-body atomic bulk RPC — bodies of single-template RPCs (168, 170) inlined into one PL/pgSQL function to preserve transactional atomicity across N member inserts"
    - "Per-call SECURITY DEFINER RLS mirror — RPC re-asserts the caller-level SELECT predicate so it cannot grant broader access than a plain SELECT would"
    - "super_admin bypass via profiles.role lookup (gated) — mirrors migration 170:67-77 at both pack-level and svg-member-level"

key-files:
  created:
    - supabase/migrations/173_apply_starter_pack.sql
  modified: []

key-decisions:
  - "Inline, never delegate: RPC does NOT call clone_svg_template_to_scene / clone_template_with_customization (delegating would break single-transaction atomicity per Pattern 1)"
  - "p_customized_svg = NULL for every member (CONTEXT D-08) — bulk apply writes raw svg_content verbatim; users customize per-scene afterward"
  - "Empty pack returns [] not an error — matches no-op-if-empty UX intent (RESEARCH §Example 3)"
  - "No EXCEPTION WHEN handlers around the member loop — any RAISE rolls the whole transaction back (D-07)"
  - "No source_pack_id lineage column, no ON CONFLICT on scenes INSERT (D-09 — duplicate Apply is allowed)"
  - "Scene name = v_template.name (no '(Copy)' suffix for bulk apply — CONTEXT Claude's Discretion)"

patterns-established:
  - "Pattern 1 inline bodies (RESEARCH): bulk bodies inlined verbatim from sibling single-item RPCs instead of being PERFORMed/SELECTed"
  - "Pattern B RPC footer: GRANT EXECUTE ... TO authenticated + COMMENT ON FUNCTION IS ... (migration 170:140-143)"
  - "Pattern C auth preamble: v_user_id := auth.uid() + RAISE EXCEPTION 'Not authenticated'"
  - "Pattern D super_admin bypass: profiles.role = 'super_admin' lookup gating a second, unrestricted SELECT"

requirements-completed: [TPCK-02]

# Metrics
duration: 2min
completed: 2026-04-23
---

# Phase 173 Plan 03: apply_starter_pack RPC Summary

**Atomic bulk-clone RPC (`apply_starter_pack(uuid) RETURNS uuid[]`) inlining the svg (migration 170) and polotno (migration 168) single-template bodies into one PL/pgSQL transaction — all-or-nothing per pack member; empty pack returns [] without error.**

## Performance

- **Duration:** 2 min
- **Started:** 2026-04-23T01:56:41Z
- **Completed:** 2026-04-23T01:58:32Z
- **Tasks:** 1 / 1
- **Files created:** 1
- **Files modified:** 0
- **Migration line count:** 188

## Accomplishments

- Landed migration 173 with `CREATE OR REPLACE FUNCTION public.apply_starter_pack(p_pack_id uuid) RETURNS uuid[]` — SECURITY DEFINER, SET search_path = public, LANGUAGE plpgsql.
- Svg branch inlines the body of `clone_svg_template_to_scene` (migration 170 lines 35-138) — RLS mirror on `svg_templates`, super_admin bypass, `is_active` + `svg_content NOT NULL` checks, scenes + scene_slides INSERT with `jsonb_build_object('svgContent', ...)`.
- Polotno branch inlines the body of `clone_template_with_customization` (migration 168 lines 40-151) — `template_library` fetch, license gate (free/pro/enterprise/super_admin), scenes INSERT, slide FOR-loop writing raw `design_json`.
- Pack-access re-asserts the `template_packs` SELECT RLS predicate explicitly (`is_active = TRUE AND (tenant_id IS NULL OR tenant_id = v_user_id)`) so SECURITY DEFINER does not broaden access.
- super_admin parity: profile lookup gates a second unrestricted SELECT both at pack-level and svg-member-level (5 `v_is_super_admin` references; criterion required ≥ 4).
- Footer: `GRANT EXECUTE ON FUNCTION public.apply_starter_pack(uuid) TO authenticated` + `COMMENT ON FUNCTION` citing Phase 173 TPCK-02 (Pattern B).

## Task Commits

1. **Task 1: Write migration 173 — atomic apply_starter_pack RPC** — `4a4ed445` (feat)

_No plan-metadata commit — parallel executor flow; orchestrator owns the wave-level commit._

## Files Created/Modified

- `supabase/migrations/173_apply_starter_pack.sql` — NEW. 188 lines. Defines `apply_starter_pack(uuid) RETURNS uuid[]` as a single PL/pgSQL function that iterates `template_pack_items` in (position ASC, template_id ASC) order and inlines the svg (migration 170) and polotno (migration 168) bodies per member. Reads `template_packs`, `template_pack_items` (both defined in sibling Plan 02's migration 171); reads `svg_templates`, `template_library`, `template_library_slides`, `template_enterprise_access`, `profiles`; writes `scenes` + `scene_slides`. `GRANT EXECUTE` to `authenticated`; COMMENT documents Phase 173 TPCK-02 contract.

## Verification

Plan acceptance criteria all satisfied (manual-verified via grep):

| Check | Expected | Actual |
|---|---|---|
| File exists | yes | yes |
| Function signature | `CREATE OR REPLACE FUNCTION public.apply_starter_pack(p_pack_id uuid)` | match |
| Return type | `RETURNS uuid[]` | match |
| Attributes | `LANGUAGE plpgsql` + `SECURITY DEFINER` + `SET search_path = public` | all match |
| Member loop | `FOR v_member IN` present | match |
| RAISE EXCEPTION: pack not found | `'Pack not found or inactive'` | match (line 65) |
| RAISE EXCEPTION: svg member not found | `'SVG member template not found or inactive: %'` | match (line 87) |
| RAISE EXCEPTION: polotno member not found | `'Polotno member template not found or inactive: %'` | match (line 130) |
| GRANT EXECUTE | `TO authenticated` | match (line 184) |
| No delegation | no PERFORM/SELECT of the two sibling RPCs | confirmed absent |
| INSERT INTO scenes count | exactly 2 (one per branch) | 2 |
| INSERT INTO scene_slides count | ≥ 2 (svg direct + polotno loop) | 2 |
| No EXCEPTION WHEN | no per-member error swallowing | confirmed absent |
| No p_customized_svg param/local | only in inline comments | confirmed (appears only on lines 13 and 155 as comment text) |
| No source_pack_id | no lineage tracking (D-09) | confirmed absent |
| No ON CONFLICT | duplicate apply allowed (D-09) | confirmed absent |
| super_admin bypass | `v_is_super_admin` references ≥ 4 | 5 |
| Empty array init | `v_result         uuid[] := '{}'` | match (line 33) |

Plan-script note: the plan's automated verify command used `grep -q "RAISE EXCEPTION 'SVG member template not found or inactive'"` (expecting a terminating single-quote immediately after "inactive"), but the VERBATIM content includes the `: %', v_member.template_id` format-string suffix (which was explicit in the plan's own VERBATIM SQL block). The actual file matches the VERBATIM spec exactly; the grep pattern was just slightly under-specified. This was NOT a deviation — the file is correct per the VERBATIM source-of-truth in the plan. See lines 87, 91, 130 of the migration for the full RAISE signatures.

No `psql --dry-run` parser check was available in this worktree (no local Supabase up); real syntax validation happens in Plan 04 (db push).

## Decisions Made

None — plan executed exactly as written. All listed decisions in the frontmatter were pre-locked in CONTEXT.md (D-07, D-08, D-09) and/or pasted verbatim from RESEARCH §Example 3 via the PLAN's VERBATIM block.

## Deviations from Plan

None — plan executed exactly as written.

The file contents match the VERBATIM SQL block in `173-03-PLAN.md` §Task 1 action byte-for-byte (with the plan's own header comment and `:=` initializer preserved).

## Issues Encountered

None.

Operating-context note (for the orchestrator, not a deviation): the PLAN frontmatter lists `depends_on: [01]` but CONTEXT + threat model make clear the RPC references `template_packs` and `template_pack_items` defined in sibling Plan 02's migration 171. The parallel-executor prompt explicitly acknowledges this: "Your plan only writes `supabase/migrations/173_apply_starter_pack.sql` — no file overlap. But the RPC references `template_packs` / `template_pack_items` defined in the sibling's migration 171. Write the RPC to those names as specified in the PLAN (it will be applied against the live DB in plan 04 after 171/172 land first by migration version ordering)." This summary file does NOT modify state — Plan 04 is the first point at which the DB sees all three migrations in their required order.

## User Setup Required

None — no external service configuration required. Migration is a .sql file; it will be applied by Plan 04's `supabase db push`.

## Next Phase Readiness

**Ready for Plan 04 [BLOCKING]:** the three migrations (171 `template_packs`, 172 `template_favorites`, 173 `apply_starter_pack`) must be pushed to the live DB **in that version order** as a single atomic step. By Postgres migration-runner ordering, 171 lands before 173, so `template_packs` / `template_pack_items` will exist before `CREATE OR REPLACE FUNCTION public.apply_starter_pack` parses.

**Ready for Plan 05 (marketplaceService client wrapper):** once Plan 04 succeeds, `supabase.rpc('apply_starter_pack', { p_pack_id: … })` becomes callable and the existing RED unit test (Plan 01 scaffolds) flips to GREEN.

**Not yet exercised:** no integration test executes this RPC against a real DB in this plan (that's the RED→GREEN gate in Plan 05). Syntax correctness is verified only via grep structural checks; PL/pgSQL parse-time validation happens at `supabase db push` time in Plan 04.

## Self-Check

- **File on disk:** `supabase/migrations/173_apply_starter_pack.sql` — FOUND (188 lines)
- **Commit:** `4a4ed445` — FOUND on current branch (`git log --oneline` confirmed)
- **No accidental deletions in commit:** 0 files deleted (only 1 file created)
- **No staged/untracked residue:** `git status` clean after commit (checked again below in the summary commit step)

## Self-Check: PASSED

---
*Phase: 173-starter-packs-favorites*
*Completed: 2026-04-23*
