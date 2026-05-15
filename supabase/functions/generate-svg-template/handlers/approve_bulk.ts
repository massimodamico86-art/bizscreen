// Phase 178 Plan 05 — approve_bulk handler (D-05 closure).
//
// SHAPE: Pure serial-loop wrapper around the per-row `approve(...)` from ./approve.ts.
//        NO logic duplication; NO new validation site; NO new mutation site. The bulk
//        handler exists ONLY to amortize a single admin click across up to 50 drafts.
//
// INVARIANTS PRESERVED PER-ID (defense-in-depth — ALL live in approve.ts):
//   - Source-order awk gate: validateSvg(draft.svg_content) → rasterize( → uploadPng( → rpc("approve_draft_atomic"
//   - BL-02 atomicity (single Postgres transaction wrapping INSERT svg_templates + UPDATE template_drafts)
//   - BL-06 advisory lock (pg_try_advisory_xact_lock(hashtext(draftId)) inside the RPC)
//   - WR-09 deterministic S3 key (no Date.now() suffix)
//   - B1 re-validation gate (validateSvg called after fetch, before rasterize/S3/RPC)
//
// PHASE 178 INVARIANTS ADDED HERE (bulk-only):
//   - BULK_HARD_CAP = 50 — server-side enforcement (400 if exceeded). Pitfall 1 of RESEARCH.
//   - INTER_CALL_DELAY_MS = 300 — serial throttle between iterations. Pitfall 3 — protects
//     Anthropic + S3 rate limits even though this loop only hits S3 (no Anthropic call in
//     approve.ts); the 300ms cadence matches eval-prompt-library.cjs:249 precedent.
//   - Per-ID error isolation — try/catch around each approve(...) call; a single failure
//     produces { ok: false, error } in the result array and DOES NOT abort the loop.
//   - NO Promise.all — serial-only execution; bulk MUST be loop-not-fan-out (Pitfall 3).
//
// SECURITY (T-178-05-01..07 mitigations live in index.ts dispatcher block, not here):
//   - Admin gate runs BEFORE this handler (index.ts L73-75 is_admin/is_super_admin RPC).
//   - Service-role client constructed in dispatcher AFTER admin gate (BL-NEW-01 boundary).
//   - This handler accepts the supabase param without re-creating it.
import { approve } from "./approve.ts";

const BULK_HARD_CAP = 50;
const INTER_CALL_DELAY_MS = 300;

interface ApproveBulkBody {
  draftIds: string[];
  reviewerUid: string;
}

interface PerIdResult {
  draftId: string;
  ok: boolean;
  error?: string;
  thumbnail_url?: string;
  svg_template_id?: string;
}

export async function approveBulk(
  body: ApproveBulkBody,
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
        error: `approve_bulk supports max ${BULK_HARD_CAP} drafts per call; got ${body.draftIds.length}`,
      }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  const results: PerIdResult[] = [];
  const total = body.draftIds.length;

  for (let i = 0; i < total; i++) {
    const draftId = body.draftIds[i];
    try {
      const r = await approve({ draftId, reviewerUid: body.reviewerUid }, supabase);
      results.push({
        draftId,
        ok: true,
        thumbnail_url: r.thumbnail_url,
        svg_template_id: r.svg_template_id,
      });
    } catch (e) {
      const msg = e instanceof Response
        ? `HTTP ${e.status} — ${await e.text().catch(() => "")}`
        : (e instanceof Error ? e.message : String(e));
      results.push({ draftId, ok: false, error: msg });
    }

    // 300ms inter-call delay between iterations (NOT after the last one).
    // Literal `300` mirrors INTER_CALL_DELAY_MS above (Pitfall 3 — eval-prompt-library.cjs:249 cadence).
    if (i < total - 1) await new Promise(r => setTimeout(r, 300));
  }

  return { ok: true, results };
}
