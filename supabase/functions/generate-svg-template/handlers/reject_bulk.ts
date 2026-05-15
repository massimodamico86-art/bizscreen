// Phase 178 Plan 05 — reject_bulk handler (D-06 closure).
//
// SHAPE: Pure serial-loop wrapper around the per-row `reject(...)` from ./reject.ts.
//        Symmetric to approve_bulk.ts. NO new mutation site; the bulk handler exists
//        ONLY to amortize a single admin click + shared rejection reason across up to 50 drafts.
//
// INVARIANTS PRESERVED PER-ID (defense-in-depth — ALL live in reject.ts):
//   - BL-03 race guard: .in('status', ['pending', 'needs_human_review']) on the UPDATE
//     — concurrent approve+reject cannot leave draft 'rejected' while svg_templates row remains active.
//   - BL-NEW-02 widened race-guard scope (matches approve.ts:124 status set).
//   - T-177-11 mitigation: refuses to flip an already-approved draft.
//   - 177-09 idempotency-on-rejected fast-path (no overwrite of original reviewer's audit metadata).
//
// PHASE 178 INVARIANTS ADDED HERE (bulk-only):
//   - BULK_HARD_CAP = 50 — server-side enforcement (400 if exceeded). Matches approve_bulk.ts.
//   - INTER_CALL_DELAY_MS = 300 — serial throttle. No EF-runtime concern (50ms per UPDATE × 50 ≈ 2.5s),
//     but the cadence mirrors approve_bulk.ts for symmetry and matches eval-prompt-library.cjs:249.
//   - Per-ID error isolation — try/catch per draftId; failures produce { ok: false, error } in results;
//     loop NEVER aborts.
//   - NO Promise.all — serial-only execution.
//   - D-06 shared-reason contract: a single `reason?: string` applies to ALL drafts in the batch.
//
// SECURITY (T-178-05-01..07 mitigations live in index.ts dispatcher block, not here):
//   - Admin gate runs BEFORE this handler (index.ts is_admin/is_super_admin RPC).
//   - Service-role client constructed in dispatcher AFTER admin gate (BL-NEW-01 boundary).
//   - This handler accepts the supabase param without re-creating it.
import { reject } from "./reject.ts";

const BULK_HARD_CAP = 50;
const INTER_CALL_DELAY_MS = 300;

interface RejectBulkBody {
  draftIds: string[];
  reviewerUid: string;
  reason?: string;
}

interface PerIdResult {
  draftId: string;
  ok: boolean;
  error?: string;
}

export async function rejectBulk(
  body: RejectBulkBody,
  // deno-lint-ignore no-explicit-any
  supabase: any,
): Promise<{ ok: true; results: PerIdResult[] }> {
  // Early validation 1 — body.draftIds must be a non-empty array.
  if (!Array.isArray(body.draftIds) || body.draftIds.length === 0) {
    throw new Response(
      JSON.stringify({ error: "draftIds must be a non-empty array" }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  // Early validation 2 — BULK_HARD_CAP enforcement (Pitfall 1; T-178-05-03 mitigation).
  if (body.draftIds.length > BULK_HARD_CAP) {
    throw new Response(
      JSON.stringify({
        error: `reject_bulk supports max ${BULK_HARD_CAP} drafts per call; got ${body.draftIds.length}`,
      }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  const results: PerIdResult[] = [];
  const total = body.draftIds.length;

  for (let i = 0; i < total; i++) {
    const draftId = body.draftIds[i];
    try {
      await reject({ draftId, reason: body.reason, reviewerUid: body.reviewerUid }, supabase);
      results.push({ draftId, ok: true });
    } catch (e) {
      const msg = e instanceof Response
        ? `HTTP ${e.status} — ${await e.text().catch(() => "")}`
        : (e instanceof Error ? e.message : String(e));
      results.push({ draftId, ok: false, error: msg });
    }

    // 300ms inter-call delay between iterations (NOT after the last one).
    // Literal `300` mirrors INTER_CALL_DELAY_MS above (cadence symmetric to approve_bulk.ts).
    if (i < total - 1) await new Promise(r => setTimeout(r, 300));
  }

  return { ok: true, results };
}
