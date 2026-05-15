// Phase 177 — generate handler. Validator-at-ingest (TGEN-05/Pitfall A1) + 2-retry-with-feedback (TGEN-02/Pitfall A3).
// CRITICAL: validateSvg() runs BEFORE every INSERT. Refactors that change this order MUST fail
// tests/unit/generateValidatorOrder.test.js. Do not reorder.
//
// Runtime support:
//   - Production:  Supabase Edge Function (Deno). Imports npm:@anthropic-ai/sdk and
//                  jsr:@b-fuze/deno-dom dynamically inside generate() so that Vitest
//                  (which can't resolve npm:/jsr: specifiers) can still load this module
//                  for unit/integration tests.
//   - Tests:       Vitest. Tests inject deps.anthropic (or deps.Anthropic) + optionally
//                  deps.validateSvg (DI seam — B2). The dynamic Deno imports never fire
//                  in test env because deps.anthropic short-circuits the Anthropic path
//                  and globalThis.DOMParser (jsdom) is used as the DOMParser fallback.
//
// JSON import is `with { type: "json" }` — supported by Deno 1.40+ and Vitest 4 / Node 22+.

import promptsJson from "../prompts.json" with { type: "json" };
import { validateSvg as validateSvgDefault } from "../svgValidator.ts";

// ---------------------------------------------------------------------------
// Types (locked by 177-CONTEXT.md D-06 + D-09)
// ---------------------------------------------------------------------------

type TemplateType =
  | "menu" | "promo" | "announcement" | "reminder" | "wayfinding" | "health_tip";

type Vertical = "restaurants" | "retail" | "healthcare" | null;

interface PromptLibraryEntry {
  id: string;
  template_type: TemplateType;
  vertical: Vertical;
  label: string;
  example_freeform: string;
  system_prompt: string;
}

interface ValidatorFailure {
  attempt: 1 | 2 | 3;
  model_id: string;
  errors: string[];
  warnings: string[];
  raw_svg_excerpt: string;
  prompt_used: string;
  ts: string;
}

interface GenerateBody {
  vertical: Vertical;
  template_type: TemplateType;
  prompt: string;
  // Phase 178 D-10 — defaults to "landscape" inside generate(); promptLibrary
  // entries stay orientation-agnostic. composeSystemPrompt() (below) swaps
  // viewBox literal + appends PORTRAIT-SPECIFIC GUIDANCE when "portrait".
  orientation?: "landscape" | "portrait";
  callerUid?: string;
}

interface GenerateDeps {
  // DI seam — B2. Lowercase per Plan 02 retry-budget mock tests; capitalized per
  // existing TGEN-05 unit test (tests/unit/generateValidatorOrder.test.js).
  anthropic?: { messages: { create: (args: any) => Promise<any> } };
  // deno-lint-ignore no-explicit-any
  Anthropic?: any;
  // deno-lint-ignore no-explicit-any
  validateSvg?: (svg: string, opts?: any) => { ok: boolean; errors: string[]; warnings: string[] };
}

interface GenerateResult {
  draftId: string;
  status: "pending" | "needs_human_review";
  warnings: string[];
  attempt_count: number;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MAX_RETRIES = 2;             // Pitfall A3 — hard cap (3 total attempts max)
const DEFAULT_TIMEOUT_MS = 25_000; // RESEARCH Open Question #5 — 25s × 3 attempts < 60s EF cap

// Phase 178 D-10 — portrait orientation guidance.
// Appended to baseSystemPrompt (after viewBox literal swap) when body.orientation === 'portrait'.
const PORTRAIT_GUIDANCE = `

PORTRAIT-SPECIFIC GUIDANCE:
- Layout vertically: header at top, content stacked, footer at bottom
- Use full canvas height (1920); avoid wide horizontal arrangements
- Hero text remains the largest element; sub-elements stack below
- Maintain at least 80px top/bottom margins for kiosk-mount viewing`;

// Phase 178 D-10 — composeSystemPrompt swaps viewBox 1920×1080 → 1080×1920 and
// appends PORTRAIT_GUIDANCE when orientation === 'portrait'. Landscape is a
// no-op (returns baseSystemPrompt unchanged). Source-order awk gate (TGEN-05)
// is unaffected: orientation injection happens upstream of the LLM call;
// validateSvg() still runs BEFORE the INSERT.
function composeSystemPrompt(
  baseSystemPrompt: string,
  orientation: "landscape" | "portrait",
): string {
  if (orientation === "landscape") return baseSystemPrompt;
  return baseSystemPrompt
    .replace(/viewBox="0 0 1920 1080"/g, 'viewBox="0 0 1080 1920"')
    + PORTRAIT_GUIDANCE;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function pickPrompt(template_type: TemplateType, vertical: Vertical): PromptLibraryEntry {
  const entries = promptsJson as PromptLibraryEntry[];
  // Exact (template_type, vertical) match first.
  const exact = entries.find((p) => p.template_type === template_type && p.vertical === vertical);
  if (exact) return exact;
  // Fallback to vertical=null per D-09.
  const generic = entries.find((p) => p.template_type === template_type && p.vertical === null);
  if (generic) return generic;
  throw new Error(`No prompt entry for template_type=${template_type} vertical=${vertical}`);
}

function extractSvg(response: any): string {
  return response?.content?.find?.((c: any) => c.type === "tool_use")?.input?.svg ?? "";
}

// Resolve a DOMParser ctor for the validator. In Deno production we dynamically
// import jsr:@b-fuze/deno-dom (the npm: import would fail in vitest static load).
// In Vitest (jsdom env), globalThis.DOMParser exists and the validator falls
// back to it automatically when DOMParserCtor is undefined.
async function resolveDOMParserCtor(): Promise<any | undefined> {
  // @ts-ignore — Deno global only exists in production runtime.
  if (typeof Deno !== "undefined") {
    // Specifier is a runtime string so Vite (test bundler) does NOT statically
    // analyze and try to resolve "jsr:@b-fuze/deno-dom". Deno resolves it natively
    // at runtime via the imports map / jsr: scheme.
    const denoDomSpecifier = "jsr:" + "@b-fuze/deno-dom";
    const mod = await import(/* @vite-ignore */ denoDomSpecifier);
    const DenoDOMParser = mod.DOMParser;
    // D-17 landmine wrapper (Plan 01 SUMMARY):
    //   jsr:@b-fuze/deno-dom 0.1.x throws `DOMParser: "image/svg+xml" unimplemented`
    //   when called with the standard SVG mime type. svgValidator.js calls
    //   `new DOMParserCtor().parseFromString(svg, 'image/svg+xml')` (line 57) — that
    //   would fail in production. We MUST translate the mime to `text/html` because
    //   SVG is well-formed XML and HTML5 inline SVG is a first-class construct in
    //   deno-dom's HTML parser. Plan 01's spike `index.ts` documents this pattern;
    //   here we apply it via a wrapper class so the upstream svgValidator.js stays
    //   browser/jsdom-compatible and the EF gets a working validator.
    class DenoSvgDOMParser {
      // deno-lint-ignore no-explicit-any
      parseFromString(input: string, _mime: string): any {
        return new DenoDOMParser().parseFromString(input, "text/html");
      }
    }
    return DenoSvgDOMParser;
  }
  return undefined; // jsdom: validator falls back to globalThis.DOMParser
}

// Resolve an Anthropic client. If deps.anthropic / deps.Anthropic provided, use it.
// Otherwise (production) dynamically import npm:@anthropic-ai/sdk and instantiate.
// Throws if production path is missing ANTHROPIC_API_KEY.
async function resolveAnthropic(deps: GenerateDeps): Promise<{ messages: { create: (args: any) => Promise<any> } }> {
  if (deps.anthropic) return deps.anthropic;
  if (deps.Anthropic) return deps.Anthropic;
  // @ts-ignore — Deno global only exists in production runtime.
  if (typeof Deno === "undefined") {
    throw new Error("No Anthropic client available — pass deps.anthropic in test env");
  }
  // @ts-ignore — Deno-only
  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY required");
  const anthropicSpecifier = "npm:" + "@anthropic-ai/sdk@0.95.0";
  const mod = await import(/* @vite-ignore */ anthropicSpecifier);
  const Anthropic = mod.default ?? mod;
  return new Anthropic({ apiKey, timeout: DEFAULT_TIMEOUT_MS });
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Generate an SVG template draft via Anthropic, validate at ingest, retry with
 * feedback up to 2× (3 total attempts), and INSERT the result into template_drafts.
 *
 * Order guarantee (TGEN-05): validateSvg() runs BEFORE every insert. The unit
 * test tests/unit/generateValidatorOrder.test.js enforces this contract.
 *
 * Retry budget (TGEN-02): hard cap at 3 total attempts (see MAX_RETRIES constant).
 * After 3 consecutive validator failures, draft inserts with status='needs_human_review'
 * and metadata.validator_failures of length 3.
 */
export async function generate(
  body: GenerateBody,
  // deno-lint-ignore no-explicit-any
  supabase: any,
  deps: GenerateDeps = {},
): Promise<GenerateResult> {
  // Resolve model_id. In test env (deps.anthropic or deps.Anthropic provided),
  // skip the Deno.env check so unit tests don't need ANTHROPIC_MODEL_ID set.
  const isTestEnv = Boolean(deps.anthropic || deps.Anthropic);
  let modelId: string;
  if (isTestEnv) {
    // @ts-ignore — Deno may or may not exist in tests; tolerate either.
    modelId = (typeof Deno !== "undefined" ? Deno.env.get("ANTHROPIC_MODEL_ID") : null)
      || "claude-haiku-4-5-20251001";
  } else {
    // @ts-ignore — Deno-only
    modelId = Deno.env.get("ANTHROPIC_MODEL_ID") || "";
    if (!modelId) throw new Error("ANTHROPIC_MODEL_ID required (D-16 fail-fast)");
  }

  const validateSvg = deps.validateSvg ?? validateSvgDefault;
  const DOMParserCtor = await resolveDOMParserCtor();
  const anthropic = await resolveAnthropic(deps);

  const promptEntry = pickPrompt(body.template_type, body.vertical);
  // Phase 178 D-10 — orientation injection at composition time (NOT validation
  // time). Landscape: no-op; portrait: viewBox swap + PORTRAIT_GUIDANCE append.
  const systemPrompt = composeSystemPrompt(
    promptEntry.system_prompt,
    body.orientation ?? "landscape",
  );

  const tools = [{
    name: "emit_svg_template",
    description: "Emit a single complete SVG template per the system prompt rules.",
    input_schema: {
      type: "object",
      properties: {
        svg: { type: "string", description: "A single complete <svg>...</svg> string." },
        rationale: { type: "string", description: "One-line rationale, <=200 chars." },
      },
      required: ["svg"],
    },
  }];
  const tool_choice = { type: "tool", name: "emit_svg_template" };

  const attempts: ValidatorFailure[] = [];
  let svg = "";
  let lastWarnings: string[] = [];
  let lastUserContent = "";

  for (let attempt = 1; attempt <= MAX_RETRIES + 1; attempt++) {
    // Build messages with retry-feedback (RESEARCH §TGEN-02 verbatim shape).
    const messages = attempts.length === 0
      ? [{ role: "user" as const, content: body.prompt }]
      : [
          { role: "user" as const, content: body.prompt },
          {
            role: "assistant" as const,
            content: "(previous attempt's SVG was rejected by validator)",
          },
          {
            role: "user" as const,
            content:
              `The previous SVG had these validator errors:\n${attempts.at(-1)!.errors.join("\n")}\n` +
              `Regenerate addressing each error specifically. Output a complete corrected SVG.`,
          },
        ];

    lastUserContent = messages.at(-1)!.content as string;

    const response = await anthropic.messages.create({
      model: modelId,
      max_tokens: 4096,
      system: systemPrompt,
      tools,
      tool_choice,
      messages,
    });

    svg = extractSvg(response);

    // CRITICAL ORDER (TGEN-05 / Pitfall A1) — validateSvg(svg ...) MUST execute
    // BEFORE any supabase.from('template_drafts').insert call. The unit test
    // tests/unit/generateValidatorOrder.test.js asserts this. Do not reorder.
    const result = validateSvg(svg, { DOMParserCtor, DOMPurify: null });

    if (result.ok) {
      lastWarnings = result.warnings;
      break;
    }

    attempts.push({
      attempt: attempt as 1 | 2 | 3,
      model_id: modelId,
      errors: result.errors,
      warnings: result.warnings,
      raw_svg_excerpt: svg.slice(0, 500),
      prompt_used: lastUserContent,
      ts: new Date().toISOString(),
    });
  }

  const allFailed = attempts.length === MAX_RETRIES + 1;
  const finalStatus: "pending" | "needs_human_review" = allFailed ? "needs_human_review" : "pending";
  const attempt_count = allFailed ? MAX_RETRIES + 1 : attempts.length + 1;

  // INSERT — strictly AFTER the validator loop (TGEN-05 order guarantee).
  const { data, error } = await supabase.from("template_drafts").insert({
    svg_content: allFailed ? (attempts.at(-1)?.raw_svg_excerpt ?? "") : svg,
    prompt: body.prompt,
    source: "ai_generation",
    status: finalStatus,
    vertical: body.vertical,
    metadata: {
      template_type: body.template_type,
      validator_failures: attempts,
      generated_by: body.callerUid ?? null,
      model_id: modelId,
      attempt_count,
    },
  }).select("id").single();

  if (error) throw error;
  return {
    draftId: data.id,
    status: finalStatus,
    warnings: lastWarnings,
    attempt_count,
  };
}
