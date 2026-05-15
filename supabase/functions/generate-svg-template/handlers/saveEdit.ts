// Phase 177 — saveEdit handler (BL-01 closure 177-10).
//
// Server-side re-validation gate for the Wave 4 inline edit modal's Save path.
// Mirrors the B1 re-validation pattern from handlers/approve.ts:120-156:
//   1. Fetch draft (refuse if not 'pending' or 'needs_human_review')
//   2. Run validateSvg with deno-dom DOMParser + DOMPurify=null
//      (RESEARCH §Constraint 4 — Rule 4 silently skipped server-side)
//   3. On pass: UPDATE template_drafts.svg_content via service-role client
//      (RLS double-defense per D-18 — admin gate at index.ts:53-55 +
//      template_drafts_admin_only RLS policy from Phase 176)
//   4. On fail: throw 422 Response with { error, issues }
//
// Defense-in-depth: client-side validateSvg in TemplateDraftEditModal.jsx is
// feedback-only and devtools-bypassable. The server-side gate here is the
// load-bearing security boundary.
//
// Inherits 177-07 hardening — the FORBIDDEN_CONTENT_TOKENS in
// src/services/svgValidator.js (re-exported via svgValidator.ts) now blocks
// @import / url(http(s):) / url(//) / javascript: pseudo-protocols, so this
// handler's validateSvg gate catches CSS-injection payloads on the
// admin-edit path AS WELL AS the ingest path (handlers/generate.ts) and
// the approve-time re-validation (handlers/approve.ts:143).
//
// Source-order awk gate (verified by tests/integration/saveEditValidation.test.js Test 5):
//   validateSvg(body.svgContent → .from("template_drafts").update(

import { validateSvg } from "../svgValidator.ts";

interface SaveEditBody {
  draftId: string;
  svgContent: string;
  callerUid: string;
}

interface SaveEditResult {
  ok: true;
  draftId: string;
}

export async function saveEdit(
  body: SaveEditBody,
  // deno-lint-ignore no-explicit-any
  supabase: any,
): Promise<SaveEditResult> {
  // Step 1 — fetch + validate status.
  const { data: draft, error: fetchErr } = await supabase
    .from("template_drafts")
    .select("status")
    .eq("id", body.draftId)
    .single();
  if (fetchErr || !draft) throw new Error(`Draft not found: ${body.draftId}`);
  if (draft.status !== "pending" && draft.status !== "needs_human_review") {
    throw new Error(
      `Cannot save edit on draft in status '${draft.status}' — only pending/needs_human_review drafts can be edited`,
    );
  }

  // Step 2 — RE-VALIDATE the edited svg_content server-side (BL-01 closure).
  // Same DOMParser + DOMPurify config as handlers/approve.ts:120-146.
  const denoDomSpecifier = "jsr:" + "@b-fuze/deno-dom";
  const denoDomMod = await import(/* @vite-ignore */ denoDomSpecifier);
  const DenoDOMParser = denoDomMod.DOMParser;
  class DenoSvgDOMParser {
    // deno-lint-ignore no-explicit-any
    parseFromString(input: string, _mime: string): any {
      return new DenoDOMParser().parseFromString(input, "text/html");
    }
  }

  const validatorResult = validateSvg(body.svgContent, {
    DOMParserCtor: DenoSvgDOMParser,
    DOMPurify: null,
  });
  if (!validatorResult.ok) {
    // 422 — semantically unprocessable; draft.svg_content unchanged.
    throw new Response(
      JSON.stringify({
        error: "Edit failed server-side validation",
        issues: validatorResult.errors,
      }),
      { status: 422, headers: { "Content-Type": "application/json" } },
    );
  }

  // Step 3 — UPDATE template_drafts.svg_content (only after validator passed).
  const { error: updateErr } = await supabase
    .from("template_drafts")
    .update({ svg_content: body.svgContent })
    .eq("id", body.draftId);
  if (updateErr) throw updateErr;

  return { ok: true, draftId: body.draftId };
}
