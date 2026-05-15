---
phase: 177-ai-generation-pipeline-admin-queue-ui
reviewed: 2026-05-09T00:00:00Z
depth: deep
files_reviewed: 18
files_reviewed_list:
  - supabase/migrations/177_approve_draft_atomic.sql
  - supabase/functions/generate-svg-template/handlers/approve.ts
  - supabase/functions/generate-svg-template/handlers/reject.ts
  - supabase/functions/generate-svg-template/handlers/saveEdit.ts
  - supabase/functions/generate-svg-template/index.ts
  - supabase/functions/generate-svg-template/s3.ts
  - supabase/functions/generate-svg-template/svgValidator.ts
  - src/services/svgValidator.js
  - src/services/aiTemplate/templateDraftsService.js
  - src/services/templateApplyService.js
  - src/components/Admin/TemplateDraftPreview.jsx
  - tests/integration/svgValidatorXss.test.js
  - tests/integration/approveAtomicity.test.js
  - tests/integration/rejectIdempotency.test.js
  - tests/integration/saveEditValidation.test.js
  - tests/unit/services/templateApplyService.test.js
  - .planning/phases/177-ai-generation-pipeline-admin-queue-ui/177-07-SUMMARY.md
  - .planning/phases/177-ai-generation-pipeline-admin-queue-ui/177-08-SUMMARY.md
  - .planning/phases/177-ai-generation-pipeline-admin-queue-ui/177-09-SUMMARY.md
  - .planning/phases/177-ai-generation-pipeline-admin-queue-ui/177-10-SUMMARY.md
findings:
  blocker: 2
  warning: 4
  info: 0
  total: 6
status: issues_found
---

# Phase 177 Gap-Closure (Plans 07-10): Code Review Report

**Reviewed:** 2026-05-09
**Depth:** deep
**Files Reviewed:** 18
**Status:** issues_found

## Summary

Plans 07-10 close the four BLOCKER-rooted gaps identified in 177-VERIFICATION.md (gaps_found). The review
confirms that BL-01 (saveDraftSvgContent EF gate), BL-02/BL-06 (approve atomicity + race), BL-03 (reject
idempotency), and BL-04 (CSS injection) are all addressed at the source level. The TDD approach produces
solid test coverage; the SQL migration is correctly structured with advisory lock, FOR UPDATE, and
idempotency handling.

However, two new BLOCKERs are introduced by the gap-closure work itself:

1. **The `approve_draft_atomic` SECURITY DEFINER function lacks a GRANT restriction.** In Postgres,
   CREATE FUNCTION grants EXECUTE to PUBLIC by default. Any authenticated user can call
   `/rpc/approve_draft_atomic` via PostgREST, and SECURITY DEFINER runs as the function owner
   (bypassing RLS). The migration comment claims "RLS provides defense-in-depth" — this claim is
   structurally false for SECURITY DEFINER functions: the function owner's session bypasses row-level
   security unless `SET row_security = on` is explicitly set inside the function body. It is not.

2. **`reject.ts` race-guard uses `.eq('status', 'pending')` but the queue shows
   `needs_human_review` drafts too.** Both `fetchPendingDrafts` and the approve RPC's WHERE clause
   handle `needs_human_review` status. The reject handler does not — the UPDATE WHERE matches 0 rows
   for any `needs_human_review` draft, triggering PGRST116 and the error message "Cannot reject —
   draft was concurrently approved or already rejected." This blocks the legitimate Reject action
   on all `needs_human_review` drafts, directly breaking a stated queue UI feature.

Four pre-existing issues from the original 177-REVIEW.md (BL-05, WR-06, WR-07, WR-08) remain unfixed
and are re-noted as warnings where the gap-closure plans touch the same code paths.

Requirements traceability: the plans declare TGEN-05, TADM-01, TADM-02, TADM-03 as covered. All four
requirement IDs exist in REQUIREMENTS.md Phase 177. The source changes correctly address those
requirements at the code level. No orphaned requirement IDs.

---

## BLOCKER

### BL-NEW-01: `approve_draft_atomic` SECURITY DEFINER function grants EXECUTE to PUBLIC — any authenticated user can insert into `svg_templates` by calling the RPC directly

**File:** `supabase/migrations/177_approve_draft_atomic.sql:52-144`

**Issue:** Postgres grants EXECUTE on new functions to PUBLIC by default. The function has `SECURITY
DEFINER` and `SET search_path = public`, which means it runs as its owner (typically `postgres` /
superuser in Supabase). Inside a SECURITY DEFINER function, RLS policies are evaluated for the
**function owner**, not the calling user. Because the owner is a superuser/service-role, Supabase RLS
policies on `svg_templates` and `template_drafts` do not apply inside the function body unless
`SET row_security = on` is explicitly declared. It is not declared here.

Result: any authenticated (non-admin) user can call:
```
POST /rest/v1/rpc/approve_draft_atomic
Authorization: Bearer <user_jwt>
{ "p_draft_id": "<known_uuid>",
  "p_svg_template": { "svg_content": "<script>alert(1)</script>", "name": "...", ... },
  "p_metadata_patch": { "reviewed_by": "attacker", "thumbnail_url": "https://evil.example/" } }
```
and have an `svg_templates` row created with attacker-controlled content. The advisory lock and
idempotency checks are purely data-integrity features; they offer no auth check.

The migration comment at lines 46-49 states "Even if callable via PostgREST, INSERT into svg_templates
is governed by admin-only RLS (migration 176)." This is incorrect for SECURITY DEFINER functions — the
cited RLS is bypassed.

The project pattern (migrations 041, 102, 173) consistently uses explicit `GRANT EXECUTE ... TO
authenticated` (or a narrower role) to control who can call an RPC. Migration 177 omits this entirely.

**Fix:** Add a `GRANT EXECUTE ... TO service_role` (restricting to EF-only) and an explicit revoke from
less-privileged roles, OR add a caller-identity check inside the function:

```sql
-- Option A: restrict to service_role only (EF invokes with service-role credentials)
REVOKE EXECUTE ON FUNCTION public.approve_draft_atomic(UUID, JSONB, JSONB) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.approve_draft_atomic(UUID, JSONB, JSONB) TO service_role;

-- Option B: add admin-identity guard inside the function body (defense-in-depth)
-- After the advisory lock, before any mutation:
IF NOT (SELECT is_admin() OR is_super_admin()) THEN
  RAISE EXCEPTION 'approve_draft_atomic: caller is not an admin';
END IF;
-- This requires auth.uid() to be set, which it is when called via PostgREST with a JWT.
-- is_admin() and is_super_admin() already exist (used in index.ts:53-55).
```

Option A is the minimal fix matching the project's existing GRANT pattern. Option B adds defense-in-depth
regardless of how the function is invoked.

---

### BL-NEW-02: `reject.ts` race-guard `.eq('status', 'pending')` blocks rejection of `needs_human_review` drafts — functional regression introduced by BL-03 fix

**File:** `supabase/functions/generate-svg-template/handlers/reject.ts:60-87`

**Issue:** The BL-03 closure adds `.eq('status', 'pending')` to the UPDATE WHERE clause as a race guard.
This is correct logic for the approve-vs-reject race scenario. However, the queue UI fetches both
`pending` AND `needs_human_review` drafts (`fetchPendingDrafts` at `templateDraftsService.js:23`).
Admins see Reject buttons for both status types. The pre-existing approve RPC correctly handles
`needs_human_review` via `status IN ('pending', 'needs_human_review')` at SQL migration line 131.

When an admin clicks Reject on a `needs_human_review` draft:
1. The fetch at line 37-41 returns the draft (status = `needs_human_review`)
2. The `rejected` idempotency guard at line 46 does not match
3. The `approved` guard at line 51 does not match
4. The UPDATE at line 60 fires with `.eq('status', 'pending')` — matches 0 rows (status is `needs_human_review`)
5. PGRST116 fires → handler throws "Cannot reject — draft was concurrently approved or already rejected"

The error message is factually wrong (no race occurred), and the reject action fails for an entire
class of drafts that the UI presents as rejectable. This breaks the `needs_human_review` review
workflow: admins reviewing drafts that failed all 3 validator retries cannot reject them.

**Fix:**

```typescript
// Change line 72 from:
.eq("status", "pending")
// To:
.in("status", ["pending", "needs_human_review"])
// OR two chained .eq calls:
// PostgREST doesn't support .or() on update, so use .or() via filter:
.or('status.eq.pending,status.eq.needs_human_review')
```

The Supabase JS client supports `.filter()` with raw PostgREST query strings if `.in()` on `.update()`
is not available:
```typescript
.update({ status: 'rejected', metadata: { ... } })
.eq('id', body.draftId)
.in('status', ['pending', 'needs_human_review'])  // BL-03 race guard extended
.select('id')
.single()
```

Also update the race-guard comment at line 56-59 to mention `needs_human_review`.

---

## Warnings

### WR-GAP-01: `throw new Response(...)` for 422 errors in `saveEdit.ts` and `approve.ts` is caught by `index.ts` as `(e as Error).message` — validation errors returned to client as `{ error: undefined }` with HTTP 500

**File:** `supabase/functions/generate-svg-template/index.ts:186-188`, `handlers/saveEdit.ts:76-82`, `handlers/approve.ts:160-166`

**Issue:** Pre-existing WR-06 from 177-REVIEW.md. The gap-closure plans add `saveEdit.ts` which uses the
same `throw new Response(...)` pattern (line 76). The outer catch at `index.ts:188` does
`(e as Error).message`, but `Response` objects have no `.message` property — it is `undefined`.

When admin SVG edit fails server-side validation:
- `saveEdit.ts:76` throws `new Response(JSON.stringify({ error, issues }), { status: 422 })`
- `index.ts:186` catches it, evaluates `(e as Error).message` = `undefined`
- Client receives HTTP 500 with body `{ "error": undefined }`
- The admin sees a generic error with no validation detail

This affects every validation failure through `save_edit` and `approve` (re-validation at line 160).
Both new handlers introduced by plans 07-10 use this broken error channel.

**Fix:** Check `instanceof Response` before the `(e as Error).message` cast:

```typescript
} catch (e) {
  console.error("[generate-svg-template]", e);
  if (e instanceof Response) return e;  // passthrough 422/409 from handlers
  return Response.json({ error: (e as Error).message }, { status: 500 });
}
```

---

### WR-GAP-02: `saveEdit.ts` does not validate that `body.svgContent` is non-null before passing it to `validateSvg` — null/undefined passthrough produces an opaque 500 error

**File:** `supabase/functions/generate-svg-template/handlers/saveEdit.ts:70`

**Issue:** `validateSvg(body.svgContent, ...)` is called without a prior null/undefined check on
`body.svgContent`. If a client sends `{ action: 'save_edit', draftId: '<id>' }` (omitting
`svgContent`), the call reaches `validateSvg(undefined, ...)`. `validateSvg` handles this correctly
(returns `{ ok: false, errors: ['Empty or non-string input'] }`), so the 422 response is thrown.
However, given WR-GAP-01 (the 422 is caught as 500), the admin receives an opaque "Internal error"
rather than a clear "svgContent is required" message.

This is also a defense-in-depth gap: if `validateSvg`'s null check were ever removed, the `undefined`
would be passed to the Deno DOM import and cause a cryptic runtime failure.

**Fix:** Add an explicit guard before the validate call:

```typescript
if (!body.svgContent || typeof body.svgContent !== 'string') {
  throw new Response(
    JSON.stringify({ error: 'svgContent is required and must be a string' }),
    { status: 400, headers: { 'Content-Type': 'application/json' } },
  );
}
```

---

### WR-GAP-03: Approve handler fetches `draft.svg_content` without a row lock; concurrent `save_edit` between the initial SELECT and the RPC call publishes a stale SVG version

**File:** `supabase/functions/generate-svg-template/handlers/approve.ts:115-119` and `:188-216`

**Issue:** The approve handler reads `draft.svg_content` at line 115-119 via a plain `SELECT * WHERE
id = draftId` (no FOR UPDATE lock). It validates this content, rasterizes it, uploads the PNG to S3,
then calls `approve_draft_atomic` passing `draft.svg_content` in `p_svg_template->>'svg_content'`.

The RPC acquires a FOR UPDATE row lock on `template_drafts` inside its transaction — but this lock only
covers the status/metadata columns. The `p_svg_template` payload was already captured from the stale
initial SELECT.

Concurrency window: if an admin in Tab A starts approve (initial SELECT), and an admin in Tab B
successfully calls `save_edit` to update `svg_content`, then Tab A's approve completes and publishes
the **pre-edit** svg_content to `svg_templates`. The saved edit is silently discarded from the gallery
despite the draft row showing the new `svg_content`.

This scenario is particularly plausible with `TemplateDraftEditModal`'s Save & Publish flow, which
calls `saveDraftSvgContent` then `approveDraft` in two sequential EF round-trips — a concurrent approve
from another admin's session could interleave between these two calls.

**Fix:** Either:

(a) Have `approve_draft_atomic` re-read `svg_content` from `template_drafts` inside the transaction
(after the FOR UPDATE lock) and use that version for the INSERT, rather than trusting the caller-supplied
`p_svg_template->>'svg_content'`:

```sql
-- Inside approve_draft_atomic, after SELECT ... FOR UPDATE:
SELECT svg_content INTO v_svg_content FROM template_drafts WHERE id = p_draft_id;
-- Then use v_svg_content for the INSERT rather than p_svg_template->>'svg_content'
```

(b) OR pass the draft's `updated_at` timestamp as a 4th parameter and verify it matches inside the
RPC before proceeding (optimistic-concurrency check as described in the original BL-01 fix suggestion
in 177-REVIEW.md).

This is an edge case that requires two concurrent admin sessions and specific timing, but the modal's
two-round-trip pattern makes it more likely than a pure double-click race.

---

### WR-GAP-04: `BL-05` remains unaddressed — top-level `Deno.env.get("ANTHROPIC_API_KEY")` throw still blocks `reject`, `approve`, and `save_edit` actions when only the Anthropic secret is missing

**File:** `supabase/functions/generate-svg-template/index.ts:29-30`

**Issue:** Pre-existing BL-05 from the original 177-REVIEW.md, explicitly not in scope for plans 07-10.
Noted here because the gap-closure plans add `save_edit` as a new action that also does NOT require
`ANTHROPIC_API_KEY`, yet it will be blocked by the top-level throw if that secret is ever unset.

Plans 07-10 declare BL-01, BL-02, BL-03, BL-04 as the scope. BL-05 and WR-06 through WR-11 were
outside that scope. However, the new `save_edit` action is a third non-Anthropic action now blocked
by the misplaced top-level check, expanding BL-05's blast radius.

**Fix:** Same as originally described — move the `ANTHROPIC_API_KEY`/`ANTHROPIC_MODEL_ID` checks into
the `generate` action arm only:

```typescript
if (body.action === 'generate') {
  if (!Deno.env.get('ANTHROPIC_API_KEY')) return Response.json({ error: 'ANTHROPIC_API_KEY required' }, { status: 500 });
  if (!Deno.env.get('ANTHROPIC_MODEL_ID')) return Response.json({ error: 'ANTHROPIC_MODEL_ID required' }, { status: 500 });
  // ... proceed
}
```

---

## Gap-Closure Verification

The four originally-identified BLOCKER gaps are now assessed:

| Gap | Plan | Verdict | Notes |
|-----|------|---------|-------|
| BL-04 CSS injection | 177-07 | CLOSED | FORBIDDEN_CONTENT_TOKENS (4 patterns) added. DOMPurify config tightened to FORBID_TAGS+FORBID_ATTR:['style'] across all 3 mirror sites. EF re-export inherits automatically. 6/6 tests GREEN. |
| BL-02 + BL-06 approve atomicity | 177-08 | CLOSED (code level) | `approve_draft_atomic` RPC wraps INSERT+UPDATE in single transaction with advisory lock and FOR UPDATE. Deterministic S3 key. 7/7 tests GREEN. Live DB probe confirmed. New BLOCKER introduced: no GRANT restriction on the SECURITY DEFINER function (BL-NEW-01). |
| BL-03 reject idempotency | 177-09 | PARTIALLY CLOSED | Idempotency-on-rejected fast-path added. `.eq('status','pending')` race guard added. However, this race guard breaks rejection of `needs_human_review` drafts (BL-NEW-02). The `needs_human_review` population is a first-class queue feature; fixing the race guard must include both statuses. |
| BL-01 saveDraftSvgContent EF gate | 177-10 | CLOSED | `handlers/saveEdit.ts` adds validateSvg-before-UPDATE. `templateDraftsService.js` refactored from direct UPDATE to EF invoke. Source-order contract locked by Test 5. 6/6 tests GREEN. |
| BL-06 (bundled into 177-08) | 177-08 | CLOSED | Advisory lock in RPC handles concurrent double-click. 409 response for lock contention. |
| WR-09 (bundled into 177-08) | 177-08 | CLOSED | Deterministic S3 key `thumbnails/system/${slug}.png` — no timestamp suffix. |

### Specific Checks Requested

**BL-01..04 closures at source level:**
- BL-01: `templateDraftsService.js:80-86` invokes EF `save_edit`; `saveEdit.ts:70-83` runs `validateSvg` BEFORE `UPDATE`. Source order confirmed.
- BL-02: `approve.ts:188-216` calls `supabase.rpc('approve_draft_atomic', ...)` replacing the 2-step INSERT+UPDATE. No direct `svg_templates.insert` call remains.
- BL-03: `reject.ts:46-48` returns idempotently on `status === 'rejected'`. `reject.ts:72` adds `.eq('status', 'pending')` race guard. BUT missing `needs_human_review` in the guard (BL-NEW-02).
- BL-04: `svgValidator.js:35-40` adds 4-pattern FORBIDDEN_CONTENT_TOKENS. `svgValidator.js:155-156` adds `FORBID_TAGS/FORBID_ATTR`. All 3 mirror sites updated.

**SQL migration safety:**
- SECURITY DEFINER: present at line 58. `SET search_path = public` at line 59. Self-verifying ASSERT block at lines 151-170.
- Advisory lock: `pg_try_advisory_xact_lock(hashtext(p_draft_id::text))` at line 70 — correct transaction-scoped lock.
- FOR UPDATE: `SELECT ... FOR UPDATE` at line 77-81 — correct row-level pessimistic lock.
- Idempotency: `IF v_draft_status = 'approved'` at line 90 — race-free inside transaction after locks acquired.
- INSERT+UPDATE atomicity: both in same `$$` block, single PL/pgSQL call. If UPDATE raises NOT FOUND at line 133, the entire transaction rolls back including the INSERT. Correct.
- **GRANT missing** — see BL-NEW-01.

**`saveEdit.ts` validates BEFORE UPDATE:**
- `validateSvg` at line 70 precedes `.from('template_drafts').update()` at line 87. Test 5 in `saveEditValidation.test.js` asserts this order via `search()` index comparison. CONFIRMED.

**DOMPurify config consistency across 3 mirror sites:**
All three sites use identical config:
```javascript
{ USE_PROFILES: { svg: true, svgFilters: true }, FORBID_TAGS: ['style'], FORBID_ATTR: ['style'] }
```
- `src/services/svgValidator.js:153-157` — CONFIRMED
- `src/services/templateApplyService.js:55-60` — CONFIRMED
- `src/components/Admin/TemplateDraftPreview.jsx:19-24` — CONFIRMED

Test 6 in `svgValidatorXss.test.js` reads the source file and asserts `FORBID_TAGS`/`FORBID_ATTR` presence. This test provides a regression catch for future drift.

**Reject idempotency fast-path is race-safe:**
The `status === 'rejected'` guard is at line 46, before the `status === 'approved'` guard at line 51, and before the UPDATE. This ordering ensures re-reject is a fast-path return without hitting the DB. The guard is symmetric to `approve.ts:123-129`. CONFIRMED.

Race-safety of the `status === 'rejected'` path itself: if two concurrent reject calls both fetch `status = 'pending'`, the first UPDATE will flip the status to `rejected` and the second UPDATE's `.eq('status', 'pending')` will match 0 rows, throwing the race error. The first caller returns `{ ok: true }` and the second caller gets an error. This is acceptable behavior — one reject succeeds, one fails with a clear error rather than silently overwriting audit metadata.

**Approve symmetry on idempotency:**
The `approve_draft_atomic` RPC handles the `status === 'approved'` idempotency check INSIDE the transaction (after acquiring the advisory lock and FOR UPDATE). The top-of-handler `draft.status === 'approved'` check at `approve.ts:123` is a pre-check that avoids rasterize/S3 on the common case. Both paths return `{ ok: true, thumbnail_url, svg_template_id }`. CONFIRMED.

### Requirements Traceability

| Requirement | Plans | Source Changes | Coverage |
|-------------|-------|----------------|----------|
| TGEN-05 (validator-at-ingest + admin-edit boundary) | 177-07, 177-10 | FORBIDDEN_CONTENT_TOKENS in svgValidator.js; saveEdit.ts server-side gate | SATISFIED |
| TADM-01 (queue preview CSS-injection safe) | 177-07 | DOMPurify FORBID_TAGS/FORBID_ATTR at preview render | SATISFIED |
| TADM-02 (Edit action audit-trail integrity; Reject idempotency) | 177-09, 177-10 | reject.ts idempotency guard; saveEdit.ts EF gate | SATISFIED WITH GAP (BL-NEW-02 breaks reject for needs_human_review drafts — TADM-02 is not fully satisfied until BL-NEW-02 is fixed) |
| TADM-03 (approve atomicity) | 177-08 | approve_draft_atomic RPC transaction | SATISFIED WITH GAP (BL-NEW-01 — unauthenticated path to the RPC bypasses the EF admin gate) |

---

## Notes on Passing Areas

The following were specifically inspected and found acceptable:

- **FORBIDDEN_CONTENT_TOKENS check order** — runs BEFORE DOMPurify Rule 4 (`svgValidator.js:138-142` vs `:153`). Correct defense-in-depth ordering per 177-07 decision.
- **EF re-export shim** — `svgValidator.ts` remains a pure re-export; FORBIDDEN_CONTENT_TOKENS flows through to both ingest (generate.ts) and approve-time re-validation (approve.ts:154) automatically. No drift risk from a separate port.
- **S3 deterministic key** — `s3.ts:39` uses `` `thumbnails/system/${slug}.png` `` with no timestamp suffix. Retries overwrite correctly.
- **Test 6 drift detector** — `svgValidatorXss.test.js:76-84` reads the source file as a string and asserts `FORBID_TAGS`/`FORBID_ATTR` patterns. This is an effective CI guard against future contributor drift on the 3-site config.
- **Advisory lock key correctness** — `hashtext(p_draft_id::text)` produces a stable int8 for the UUID string. This is the correct pattern for string-keyed advisory locks in Postgres.
- **`save_edit` dispatch inherits admin gate** — the `save_edit` branch at `index.ts:154-169` is inside the `try` block that follows the admin gate at lines 54-56. No bypass path.
- **DOMPurify config byte-equality** — all 3 mirror sites confirmed identical (see above). The `templateApplyService.test.js` update correctly asserts the new `FORBID_TAGS`/`FORBID_ATTR` config in the DOMPurify call expectation.
- **`callerUid: user!.id`** — the `save_edit` dispatch at `index.ts:165` uses `user!.id` (strict non-null assertion, same as approve/reject). The `body.callerUid` fallback vulnerability (WR-07) does not affect `save_edit`.

---

_Reviewed: 2026-05-09_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: deep_
_Supersedes: previous 177-REVIEW.md (2026-05-06) — this report covers gap-closure plans 07-10 only; original BLOCKERs BL-01..06 from the original review are addressed above_
