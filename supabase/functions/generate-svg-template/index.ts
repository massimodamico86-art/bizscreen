// generate-svg-template Edge Function entry (Phase 177 / Phase 178 / refreshed Phase 180 Plan 02).
//
// Action dispatcher. Every action below is LIVE production code path —
// verified in Phase 177 HUMAN-UAT items 1+3+4 and Phase 178 bulk-approve waves
// (357 net-new templates published end-to-end).
//
//   - action="generate"     → Phase 177 Plan 02. Anthropic generation with validator-at-ingest
//                             (TGEN-05) + 2-retry-with-feedback (TGEN-02). Returns draftId on
//                             success, persists status='needs_human_review' after 3 failed attempts.
//   - action="approve"      → Phase 177 Plan 03. Atomic 4-step flow: validateSvg → rasterize (resvg-wasm)
//                             → S3 PUT (bizscreen-media/thumbnails/system/) → INSERT svg_templates
//                             → UPDATE template_drafts.status='approved' (idempotent — re-approving
//                             an approved draft returns existing thumbnail_url, no duplicate row).
//   - action="reject"       → Phase 177 Plan 03. UPDATE template_drafts.status='rejected' with audit
//                             metadata (rejected_reason + reviewed_by + reviewed_at). Race-guard
//                             accepts {'pending', 'needs_human_review'}; rejecting an approved draft
//                             returns the T-177-11 audit-integrity error.
//   - action="save_edit"    → Phase 177 Plan 10. UPDATE template_drafts.svg_content with server-side
//                             re-validation (B1 defense-in-depth — re-runs svgValidator at the EF
//                             boundary so a tampered client-validator cannot land malicious SVG).
//   - action="approve_bulk" → Phase 178 Plan 05. Loops over ≤50 draft IDs (BULK_HARD_CAP gate),
//                             invokes the same atomic approve flow per draft, returns per-draft
//                             success/failure map. Frontend chunks larger requests into ≤50 batches.
//   - action="reject_bulk"  → Phase 178 Plan 05. Loops over ≤50 draft IDs with a shared
//                             rejected_reason. Same BULK_HARD_CAP=50 server-side gate.
//
// The legacy action="spike" boot-probe (Plan 01's Wave 0 diagnostics) was retired during
// Phase 177 Plan 02 — the handler set above replaces it. cURL boot probes are now documented
// in 177-01-SUMMARY.md for historical reference.
//
// Admin gate: every action runs the JWT-scoped is_admin / is_super_admin RPC check from
// Phase 177 Plan 01 (admin → 200 path; non-admin → 403). Service-role client is constructed
// AFTER the admin gate for production handlers (split-client pattern per RESEARCH §Pattern 1).
//
// IMPORTANT (Phase 176 D-17 landmine — preserved from Plan 01):
//   jsr:@b-fuze/deno-dom does NOT support `image/svg+xml` mime type. The validator
//   shim in svgValidator.ts must parse SVG via `text/html`. The deno-dom DOMParser
//   is injected into the validator from handlers/generate.ts (and approve.ts /
//   saveEdit.ts) at runtime.

import { createClient } from "npm:@supabase/supabase-js@2";
import Anthropic from "npm:@anthropic-ai/sdk@0.95.0";
import { DOMParser } from "jsr:@b-fuze/deno-dom";
import { Resvg, initWasm } from "npm:@resvg/resvg-wasm@^2.6.2";
import { generate } from "./handlers/generate.ts";
import { approve } from "./handlers/approve.ts";
import { reject } from "./handlers/reject.ts";
import { saveEdit } from "./handlers/saveEdit.ts";
import { approveBulk } from "./handlers/approve_bulk.ts";
import { rejectBulk } from "./handlers/reject_bulk.ts";

// D-16 fail-fast: missing env vars surface at first request, NOT silent default.
if (!Deno.env.get("ANTHROPIC_API_KEY")) throw new Error("ANTHROPIC_API_KEY required");
if (!Deno.env.get("ANTHROPIC_MODEL_ID")) throw new Error("ANTHROPIC_MODEL_ID required (D-16 fail-fast)");

let wasmReady: Promise<void> | null = null;
async function ensureWasm() {
  if (!wasmReady) {
    const wasmBytes = await Deno.readFile(new URL("./index_bg.wasm", import.meta.url));
    wasmReady = initWasm(wasmBytes);
  }
  return wasmReady;
}

// BL-NEW-04 hotfix: CORS for browser-originated calls (admin queue UI, dev sessions).
// Pre-existing gap since 177-01 — Deno.serve handler 405'd OPTIONS preflights, blocking
// every browser POST regardless of origin (Supabase EFs do NOT auto-add CORS at the gateway).
const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Max-Age": "86400",
};

function withCors(res: Response): Response {
  const headers = new Headers(res.headers);
  for (const [k, v] of Object.entries(CORS_HEADERS)) headers.set(k, v);
  return new Response(res.body, { status: res.status, statusText: res.statusText, headers });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { status: 200, headers: CORS_HEADERS });
  }
  if (req.method !== "POST") return withCors(new Response("Method not allowed", { status: 405 }));

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return withCors(new Response("Unauthorized", { status: 401 }));

  // JWT-scoped client — RLS evaluates as the caller; is_admin() reads auth.uid().
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } },
  );

  const { data: isAdmin } = await supabase.rpc("is_admin");
  const { data: isSuper } = await supabase.rpc("is_super_admin");
  if (!isAdmin && !isSuper) return withCors(new Response("Forbidden", { status: 403 }));

  const body = await req.json().catch(() => ({}));

  try {
    if (body.action === "generate") {
      // Production generate handler — validator-at-ingest + 2-retry-with-feedback (TGEN-01/02/05).
      // Use service-role client for the INSERT (RLS already gates non-admin per D-18 defense-in-depth).
      const supabaseSr = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      );
      // Caller UID — extract from JWT-scoped client (already used for the admin RPC gate above).
      const { data: { user } } = await supabase.auth.getUser();
      const result = await generate(
        {
          vertical: body.vertical ?? null,
          template_type: body.template_type,
          prompt: body.prompt,
          orientation: body.orientation,  // Phase 178 D-10 — undefined defaults to landscape inside generate()
          callerUid: user?.id ?? body.callerUid,
        },
        supabaseSr,
      );
      return withCors(Response.json(result));
    }

    if (body.action === "approve") {
      // Service-role client for the cross-table mutations (svg_templates INSERT +
      // template_drafts UPDATE). The admin gate above already validated caller.
      const supabaseSr = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      );
      const { data: { user } } = await supabase.auth.getUser();
      return withCors(Response.json(
        await approve({ draftId: body.draftId, reviewerUid: user!.id }, supabaseSr),
      ));
    }

    if (body.action === "save_edit") {
      // BL-01 closure (177-10) — server-side validateSvg gate for the inline
      // edit modal's Save path. Replaces direct UPDATE in templateDraftsService.js
      // which bypassed server-side validation.
      const supabaseSr = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      );
      const { data: { user } } = await supabase.auth.getUser();
      return withCors(Response.json(
        await saveEdit(
          { draftId: body.draftId, svgContent: body.svgContent, callerUid: user!.id },
          supabaseSr,
        ),
      ));
    }

    if (body.action === "reject") {
      const supabaseSr = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      );
      const { data: { user } } = await supabase.auth.getUser();
      return withCors(Response.json(
        await reject(
          { draftId: body.draftId, reason: body.reason, reviewerUid: user!.id },
          supabaseSr,
        ),
      ));
    }

    // Phase 178 Plan 05 — D-05 closure: bulk approve.
    // Service-role client mirrors approve block (BL-NEW-01 boundary preserved); admin
    // gate at L73-75 has already authorized the caller.
    if (body.action === "approve_bulk") {
      const supabaseSr = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      );
      const { data: { user } } = await supabase.auth.getUser();
      return withCors(Response.json(
        await approveBulk({ draftIds: body.draftIds, reviewerUid: user!.id }, supabaseSr),
      ));
    }

    // Phase 178 Plan 05 — D-06 closure: bulk reject (shared reason across all drafts).
    if (body.action === "reject_bulk") {
      const supabaseSr = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      );
      const { data: { user } } = await supabase.auth.getUser();
      return withCors(Response.json(
        await rejectBulk({ draftIds: body.draftIds, reviewerUid: user!.id, reason: body.reason }, supabaseSr),
      ));
    }

    return withCors(new Response(`Unknown action: ${body.action}`, { status: 400 }));
  } catch (e) {
    console.error("[generate-svg-template]", e);
    return withCors(Response.json({ error: (e as Error).message }, { status: 500 }));
  }
});
