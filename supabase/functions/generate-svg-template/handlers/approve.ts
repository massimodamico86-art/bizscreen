// Phase 177 — approve handler (refactored 177-08 for BL-02 + BL-06 + WR-09 closure).
//
// TADM-03 atomicity: validate → rasterize → S3 PUT → rpc('approve_draft_atomic').
// The RPC wraps INSERT svg_templates + UPDATE template_drafts in a single Postgres
// transaction, so failure of either mutation rolls back the other — no partial publish.
// Failure of steps before the RPC (validate/rasterize/S3) leaves draft in 'pending'
// so the admin can retry.
//
// BL-02 closure (177-08): replaced two-step INSERT-then-UPDATE pair with single
// rpc('approve_draft_atomic', ...) call. The RPC's transaction ensures both mutations
// commit or both roll back — orphaned svg_templates rows no longer possible.
//
// BL-06 closure (177-08): the RPC takes pg_try_advisory_xact_lock(hashtext(draftId))
// at function entry. Concurrent double-clicks produce a second invocation that fails
// the lock check and receives 'concurrent_approve_in_progress' → 409 response.
// FOR UPDATE row lock inside the RPC additionally serializes the status read.
//
// WR-09 closure (177-08): see ./s3.ts — S3 key is now deterministic
// (thumbnails/system/${slug}.png, no Date.now() suffix). Retries overwrite same object.
//
// B1 — defense-in-depth re-validation: validateSvg() runs FIRST (after fetching
// the draft, before rasterize/S3/RPC). The Wave 4 Edit modal can mutate
// svg_content; client-side validateSvg can be bypassed via devtools. Re-running
// the validator at approve guarantees no malformed/XSS SVG reaches svg_templates
// or the gallery. On failure → 422 + draft remains 'pending'.
//
// B3 — direct AWS SDK upload (NOT presign). The Vite dev presign route is dev-only
// middleware (vite.config.js:53-54) with NO production counterpart (vercel.json
// rewrites /api/* → /index.html). EF uploads via uploadPng() helper in ./s3.ts
// using Supabase secrets directly. See ./s3.ts for the full rationale.
//
// Source-order awk gate enforces the atomic sequence in this file:
//   validateSvg(draft.svg_content) → rasterize( → uploadPng( → rpc("approve_draft_atomic"
import { rasterize } from "../resvg-wasm-init.ts";
import { uploadPng } from "../s3.ts";
import { validateSvg } from "../svgValidator.ts";

interface ApproveBody {
  draftId: string;
  reviewerUid: string;
}

interface ApproveResult {
  ok: true;
  thumbnail_url: string;
  svg_template_id: string;
}

// Default thumbnail dimensions — matches scripts/generate-template-thumbnails.cjs precedent
// (lines 190-191 — landscape 480x270, portrait 270x480).
const THUMB_LANDSCAPE = { width: 480, height: 270 };
const THUMB_PORTRAIT = { width: 270, height: 480 };

function parseSvgDimensions(svg: string): {
  width: number;
  height: number;
  orientation: "landscape" | "portrait";
} {
  // viewBox="0 0 W H" — capture group 4-tuple; tolerate extra whitespace.
  const m = svg.match(
    /viewBox\s*=\s*["']\s*[\d.]+\s+[\d.]+\s+([\d.]+)\s+([\d.]+)\s*["']/,
  );
  if (m) {
    const w = parseFloat(m[1]);
    const h = parseFloat(m[2]);
    if (w > 0 && h > 0) {
      return { width: w, height: h, orientation: w >= h ? "landscape" : "portrait" };
    }
  }
  // Fallback: prompt-library default (1920×1080 landscape).
  return { width: 1920, height: 1080, orientation: "landscape" };
}

// deno-lint-ignore no-explicit-any
function deriveNameFromDraft(draft: any): string {
  const tt: string = draft.metadata?.template_type ?? "template";
  const v: string = draft.vertical ?? "general";
  const ts = new Date().toISOString().slice(0, 10);
  return `AI ${tt} (${v}) — ${ts}`;
}

// deno-lint-ignore no-explicit-any
function deriveDescriptionFromDraft(draft: any): string {
  return (draft.prompt ?? "").slice(0, 240);
}

// Map template_type → svg_templates.category (must satisfy chk_svg_templates_category_enum
// from migration 175 — values: Restaurant | Retail | Corporate | Healthcare | Hospitality
// | Real Estate | Education | Events | Fitness | Entertainment | Beauty | Automotive
// | Technology | Finance | general).
//
// AUTO-FIX (Rule 1) — the plan's draft mapping ("Menu" / "Promotion" / "Announcement" /
// "Reminder" / "Wayfinding" / "Health & Safety") would VIOLATE the CHECK constraint
// because none of those tokens are enum members. Instead, derive a valid category
// from the draft's vertical (the canonical taxonomic axis), falling back to 'general'.
// template_type is preserved in metadata.template_type so downstream filters retain
// the per-type signal without polluting the category column with non-enum values.
// deno-lint-ignore no-explicit-any
function deriveCategoryFromDraft(draft: any): string {
  const v: string = (draft.vertical ?? "").toLowerCase();
  const verticalToCategory: Record<string, string> = {
    restaurants: "Restaurant",
    retail: "Retail",
    healthcare: "Healthcare",
  };
  return verticalToCategory[v] ?? "general";
}

export async function approve(
  body: ApproveBody,
  // deno-lint-ignore no-explicit-any
  supabase: any,
): Promise<ApproveResult> {
  // Step 1 — load draft.
  const { data: draft, error: fetchErr } = await supabase
    .from("template_drafts")
    .select("*")
    .eq("id", body.draftId)
    .single();
  if (fetchErr || !draft) throw new Error(`Draft not found: ${body.draftId}`);

  // Idempotency — return existing thumbnail URL if already approved.
  if (draft.status === "approved") {
    return {
      ok: true,
      thumbnail_url: draft.metadata?.thumbnail_url ?? "",
      svg_template_id: draft.metadata?.svg_template_id ?? "",
    };
  }

  // Step 1b — RE-VALIDATE draft.svg_content (B1, T-177-19 — defense-in-depth).
  //
  // The Wave 4 Edit modal can mutate svg_content; client-side validateSvg can be
  // bypassed via devtools. We re-run the validator here so no malformed/XSS SVG
  // reaches svg_templates / the gallery. DOMPurify=null per RESEARCH §"Constraint 4"
  // (Rule 4 silently skipped server-side; the inline preview re-sanitizes via
  // DOMPurify when admins view it). DOMParserCtor=DenoSvgDOMParser wrapper so
  // svgValidator.js's `parseFromString(svg, 'image/svg+xml')` translates to
  // text/html (Phase 176 D-17 landmine, also handled in handlers/generate.ts).
  //
  // Defer the deno-dom import to runtime via string-concat specifier so Vitest
  // can statically load this module if needed for unit tests. (Vite's static
  // analyzer would otherwise try — and fail — to resolve `jsr:@b-fuze/deno-dom`.)
  const denoDomSpecifier = "jsr:" + "@b-fuze/deno-dom";
  const denoDomMod = await import(/* @vite-ignore */ denoDomSpecifier);
  const DenoDOMParser = denoDomMod.DOMParser;
  class DenoSvgDOMParser {
    // deno-lint-ignore no-explicit-any
    parseFromString(input: string, _mime: string): any {
      return new DenoDOMParser().parseFromString(input, "text/html");
    }
  }

  const validatorResult = validateSvg(draft.svg_content, {
    DOMParserCtor: DenoSvgDOMParser,
    DOMPurify: null,
  });
  if (!validatorResult.ok) {
    // 422 — semantically unprocessable. Draft remains 'pending' so admin can fix or reject.
    throw new Response(
      JSON.stringify({
        error: "Draft failed re-validation at approve",
        issues: validatorResult.errors,
      }),
      { status: 422, headers: { "Content-Type": "application/json" } },
    );
  }

  const dim = parseSvgDimensions(draft.svg_content);
  const thumbDim = dim.orientation === "landscape" ? THUMB_LANDSCAPE : THUMB_PORTRAIT;

  // Step 2 — rasterize (only after validator gates the content).
  const png = await rasterize(draft.svg_content, thumbDim);
  if (png.byteLength < 100) {
    throw new Error("Rasterize produced suspiciously small PNG (<100 bytes) — Pitfall A4 guard");
  }

  // Step 3 — S3 PUT (B3 — direct AWS SDK upload via ./s3.ts; no presign route).
  const fileUrl = await uploadPng(png, `ai-${draft.id}`);

  // Step 4 — atomic INSERT svg_templates + UPDATE template_drafts (BL-02 + BL-06 closure 177-08).
  // The RPC wraps both mutations in a single Postgres transaction with
  // pg_try_advisory_xact_lock(hashtext(draftId)) at entry — concurrent
  // double-clicks serialize OR short-circuit with 'concurrent_approve_in_progress'.
  // Idempotency short-circuit (status='approved' already) lives INSIDE the
  // RPC's transaction (race-free); the top-of-handler fast-path at lines 111-118
  // remains as a cheap pre-check that avoids rasterize/upload when possible.
  const { data: rpcResult, error: rpcErr } = await supabase.rpc("approve_draft_atomic", {
    p_draft_id: body.draftId,
    p_svg_template: {
      name: deriveNameFromDraft(draft),
      description: deriveDescriptionFromDraft(draft),
      category: deriveCategoryFromDraft(draft),
      orientation: dim.orientation,
      thumbnail: fileUrl,
      svg_url: "",
      svg_content: draft.svg_content,
      width: Math.round(dim.width),
      height: Math.round(dim.height),
      tags: [],
      is_active: true,
      vertical: draft.vertical,
      metadata: {
        source: "ai_generation",
        draft_id: draft.id,
        prompt: draft.prompt,
        model_id: draft.metadata?.model_id ?? null,
        template_type: draft.metadata?.template_type ?? null,
      },
    },
    p_metadata_patch: {
      reviewed_by: body.reviewerUid,
      reviewed_at: new Date().toISOString(),
      thumbnail_url: fileUrl,
    },
  });
  if (rpcErr) {
    const msg = rpcErr.message ?? String(rpcErr);
    if (msg.includes("concurrent_approve_in_progress")) {
      throw new Response(
        JSON.stringify({ error: "Approve already in progress for this draft — please retry in a moment" }),
        { status: 409, headers: { "Content-Type": "application/json" } },
      );
    }
    if (msg.includes("draft_not_found")) {
      throw new Error(`Draft not found: ${body.draftId}`);
    }
    throw rpcErr;
  }

  return {
    ok: true,
    thumbnail_url: rpcResult.thumbnail_url,
    svg_template_id: rpcResult.svg_template_id,
  };
}
