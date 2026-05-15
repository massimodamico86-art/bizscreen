---
phase: 177-ai-generation-pipeline-admin-queue-ui
plan: "08"
subsystem: approve-pipeline
tags: [phase-177, gap-closure, bl-02-fix, bl-06-fix, wr-09-fix, atomicity, race-guard]
requirements: [TADM-03]
---

# Phase 177 Plan 08: Approve Atomicity (BL-02 + BL-06 + WR-09 Closure) Summary

**One-liner:** Atomic approve_draft_atomic RPC wraps INSERT+UPDATE in single Postgres transaction with advisory lock + idempotency; deterministic S3 key eliminates orphan accretion on retry.

## Tasks Completed

| Task | Type | Name | Commit | Status |
|------|------|------|--------|--------|
| 1 | TDD RED | Write approveAtomicity.test.js | dbc66b48 | DONE |
| 2 | TDD GREEN | Author migration 177_approve_draft_atomic.sql | f4b7e68a | DONE |
| 3 | TDD GREEN | Refactor approve.ts + s3.ts | 36172ecb | DONE |
| 4 | orchestrator | Apply migration to live DB | (post-merge, via mcp__supabase__apply_migration on project gdxizdiltfqeugbsgtpx) | DONE — DO ASSERT passed, function landed with `pronargs=3, prosecdef=true` |
| 4b | orchestrator | Redeploy EF (consolidated) | `supabase functions deploy generate-svg-template --no-verify-jwt` | DONE — all 12 assets uploaded incl. new `handlers/saveEdit.ts` + refactored `approve.ts`/`s3.ts` |
| 4c | orchestrator | Live RPC probe via `mcp__supabase__execute_sql` | seed draft → first approve → idempotent re-approve | PASSED — first call returned `{ok:true, svg_template_id}`, draft+template linked atomically; re-call with deliberately-different payload returned `{ok:true, idempotent:true}` with the original `svg_template_id` (payload ignored, no duplicate INSERT) |

## Key Files

- CREATED: supabase/migrations/177_approve_draft_atomic.sql (170 LOC)
- CREATED: tests/integration/approveAtomicity.test.js (7 pure-mock tests, 7/7 GREEN)
- MODIFIED: supabase/functions/generate-svg-template/handlers/approve.ts (RPC replaces 2-step INSERT+UPDATE)
- MODIFIED: supabase/functions/generate-svg-template/s3.ts (deterministic key, no timestamp suffix)

## What Was Built

### Migration 177 SQL Function

approve_draft_atomic(UUID, JSONB, JSONB) RETURNS JSONB:
- pg_try_advisory_xact_lock(hashtext(p_draft_id::text)) at entry — serializes concurrent approves (BL-06)
- SELECT ... FOR UPDATE on template_drafts row — additional row-level protection
- Idempotency short-circuit if status='approved' — race-free, inside same transaction
- INSERT svg_templates + UPDATE template_drafts in single Postgres transaction (BL-02)
- SECURITY DEFINER + SET search_path = public
- DO ASSERT block: function exists with 3 params + SECURITY DEFINER verified
- Idempotent: DROP FUNCTION IF EXISTS prefix

### approve.ts Refactor

BEFORE (BL-02 vulnerable):
  supabase.from('svg_templates').insert({...}).select('id').single()  -- INSERT
  supabase.from('template_drafts').update({...}).eq('id', draftId)   -- UPDATE (non-atomic)

AFTER (BL-02 + BL-06 closure):
  supabase.rpc('approve_draft_atomic', { p_draft_id, p_svg_template, p_metadata_patch })
  - concurrent_approve_in_progress -> 409 Response (BL-06 closure in handler)
  - draft_not_found -> Error('Draft not found: ...')
  - ok: { ok, thumbnail_url, svg_template_id }

Source-order awk gate: validateSvg -> rasterize -> uploadPng -> rpc('approve_draft_atomic')

### s3.ts WR-09 Fix

BEFORE: key = thumbnails/system/slug-timestamp.png (non-deterministic)
AFTER:  key = thumbnails/system/slug.png (deterministic, retries overwrite same object)

## Test Results (7/7 GREEN after Task 3)

  Test 1: handler source no longer contains BL-02 vulnerable 2-step pattern - PASS
  Test 2: concurrent_approve_in_progress translates to 409 Response - PASS
  Test 3: idempotent fast-path short-circuits BEFORE rasterize - PASS
  Test 4: approve_draft_atomic appears in handler source - PASS
  Test 5: s3.ts uses deterministic key pattern - PASS
  Test 6: s3.ts key construction line uses deterministic key, no timestamp suffix - PASS
  Test 7: migration 177_approve_draft_atomic.sql defines the RPC - PASS

No regressions: generateSvgTemplate, promptLibraryParity, generateValidatorOrder all pass.

## Checkpoint: Task 4 [BLOCKING]

Migration 177 authored and committed but NOT YET APPLIED to live Supabase project.
Edge Function NOT redeployed. Both required before BL-02/BL-06/WR-09 ratified in production.

Verification steps for orchestrator:

Step 4a: Apply migration (MCP preferred):
  mcp__supabase__apply_migration(
    name='177_approve_draft_atomic',
    query=<content of supabase/migrations/177_approve_draft_atomic.sql>
  )
  OR Mgmt API: Project ID gdxizdiltfqeugbsgtpx, Token <SUPABASE_MANAGEMENT_API_TOKEN>

Step 4b: Verify via MCP execute_sql:
  SELECT proname, pronargs, prosecdef FROM pg_proc WHERE proname = 'approve_draft_atomic';
  Expected: 1 row, pronargs=3, prosecdef=true

Step 4c: Redeploy EF:
  supabase functions deploy generate-svg-template --no-verify-jwt

Step 4d-4f: Live approve probe + atomicity DB verify + idempotency re-approve
  (see 177-08-PLAN.md Task 4 how-to-verify for exact SQL and cURL commands)

## Deviations from Plan

1. [Rule 1 - Bug] Removed Date.now() literal from s3.ts comment to pass Test 6
   - Found during Task 3 (Test 6 remained red after implementation)
   - Issue: WR-09 closure comment used literal 'Date.now() suffix', causing Test 6
     regex to match comment text rather than functional code
   - Fix: Rewrote comment to say 'timestamp suffix' instead of 'Date.now() suffix'
   - Commit: 36172ecb

## Self-Check: PARTIAL

Tasks 1-3 PASSED: code committed (3 commits), 7/7 tests GREEN, no regression.
Task 4 PENDING: live DB apply + EF redeploy requires orchestrator/human with network access.
supabase/migrations/177_approve_draft_atomic.sql: EXISTS (170 LOC).
tests/integration/approveAtomicity.test.js: EXISTS (7/7 GREEN).
Commits dbc66b48, f4b7e68a, 36172ecb all verified in git log.
