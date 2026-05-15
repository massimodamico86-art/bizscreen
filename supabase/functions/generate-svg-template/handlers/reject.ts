// Phase 177 — reject handler.
//
// Single UPDATE template_drafts.status='rejected' with audit metadata per D-07.
// No row deletion — audit trail preserved (mirrors src/services/marketplaceService.js
// lines 222-247 update-then-select pattern).
//
// T-177-11 mitigation: refuses to reject an already-approved draft (audit-trail
// integrity — admins should not be able to "re-reject" something that already
// produced a published svg_templates row + S3 thumbnail).
//
// BL-03 closure (Phase 177 gap-closure 177-09):
//   - Idempotency-on-rejected fast-path symmetric to approve.ts:111-118 — re-rejecting
//     does NOT overwrite the original reviewer's reviewed_by / reviewed_at / rejected_reason.
//   - Race-guard .eq('status', 'pending') on the UPDATE — concurrent approve+reject
//     cannot leave draft in 'rejected' status while a published svg_templates row
//     remains active. On PGRST116 (no row matched) throws documented race error.
//   - Pairs with 177-08 approve_draft_atomic RPC's pg_try_advisory_xact_lock for
//     deterministic approve-vs-reject race outcomes.
//   - This plan depends on 177-08 — the EF redeploy in 177-08 Step 4c carries
//     this reject.ts source change live to the production Edge Function.
interface RejectBody {
  draftId: string;
  reason?: string;
  reviewerUid: string;
}

interface RejectResult {
  ok: true;
  draftId: string;
}

export async function reject(
  body: RejectBody,
  // deno-lint-ignore no-explicit-any
  supabase: any,
): Promise<RejectResult> {
  const { data: draft, error: fetchErr } = await supabase
    .from("template_drafts")
    .select("metadata, status")
    .eq("id", body.draftId)
    .single();
  if (fetchErr || !draft) throw new Error(`Draft not found: ${body.draftId}`);

  // BL-03 closure 177-09: idempotency guard symmetric to approve.ts:111-118.
  // Re-rejecting must not overwrite the original reviewer's audit metadata.
  if (draft.status === "rejected") {
    return { ok: true, draftId: body.draftId };
  }

  // Pre-existing T-177-11 mitigation: refuses to flip an already-approved draft.
  if (draft.status === "approved") {
    throw new Error("Cannot reject an already-approved draft");
  }

  // BL-03 closure 177-09: race-guard WHERE clause — only flip if still in a rejectable state.
  // BL-NEW-02 fix: include 'needs_human_review' in the guard. The Pending tab queue
  // shows both `pending` and `needs_human_review` drafts (fetchPendingDrafts), and
  // approve.ts handles both via the RPC's `status IN (...)` clause. Previously
  // restricting to `.eq('status', 'pending')` made `needs_human_review` drafts
  // un-rejectable — a 0-row UPDATE → misleading "concurrently approved or already
  // rejected" PGRST116. The .in() match pairs with approve.ts:124's status set.
  //
  // If admin B's reject fires after admin A's approve completes, the .in('status', [...])
  // WHERE still won't match 'approved' → PGRST116 → documented race error.
  // This pairs with the approve handler's RPC-side advisory lock (177-08) to make
  // the approve-vs-reject race deterministic instead of last-write-wins.
  const { data, error } = await supabase
    .from("template_drafts")
    .update({
      status: "rejected",
      metadata: {
        ...(draft.metadata ?? {}),
        reviewed_by: body.reviewerUid,
        reviewed_at: new Date().toISOString(),
        rejected_reason: body.reason ?? null, // D-07
      },
    })
    .eq("id", body.draftId)
    .in("status", ["pending", "needs_human_review"]) // ← BL-03 race guard, BL-NEW-02 widened to match approve.ts
    .select("id")
    .single();

  if (error) {
    // PostgREST returns code 'PGRST116' when .single() finds zero rows.
    // This means the WHERE clause didn't match — draft was concurrently approved
    // or already rejected (but we already checked status above, so this is the
    // approve-race case).
    if (error.code === "PGRST116" || /no.*rows/i.test(error.message ?? "")) {
      throw new Error(
        "Cannot reject — draft was concurrently approved or already rejected",
      );
    }
    throw error;
  }

  return { ok: true, draftId: data.id };
}
