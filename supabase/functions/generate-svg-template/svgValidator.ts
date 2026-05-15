// Phase 177 — Edge Function svgValidator shim.
//
// Re-exports the existing JS validator (`src/services/svgValidator.js`) so the
// Edge Function uses the SAME validation logic that the Vite/SPA bundle uses.
// Per RESEARCH §"svgValidator extensibility for Deno injection" Option A — the
// validator already accepts opts.DOMParserCtor + opts.DOMPurify (line 47-49 +
// line 123 of svgValidator.js), so no port is needed.
//
// In Deno production: caller injects `DOMParserCtor: <jsr:@b-fuze/deno-dom DOMParser>`
// and `DOMPurify: null` (per RESEARCH §Constraint 4 — Rule 4 silently skipped
// server-side; the validator gate runs Rules 1, 2, 3, 5, 6).
//
// In Vitest (jsdom) mock-test env: caller can omit `DOMParserCtor` (validator
// falls back to globalThis.DOMParser which jsdom provides) and DOMPurify works
// natively (jsdom provides DOM globals dompurify needs).
//
// BL-04 closure (Phase 177 gap-closure 177-07): the new FORBIDDEN_CONTENT_TOKENS
// (@import / url(http(s):) / url(//) / javascript:) defined in
// src/services/svgValidator.js automatically flow through this re-export and
// gate BOTH the ingest path (handlers/generate.ts) AND the approve-time
// re-validation (handlers/approve.ts:143). No code change required here —
// the re-export shim's value IS that the EF validator IS the SPA validator.
//
// @ts-ignore — JS-from-TS import; type signature declared inline below.
export { validateSvg } from "../../../src/services/svgValidator.js";

export type ValidateOpts = {
  DOMParserCtor?: any;       // jsr:@b-fuze/deno-dom DOMParser ctor in EF context
  DOMPurify?: any | null;    // null in EF context (skip Rule 4 — RESEARCH §Constraint 4)
};
export type ValidateResult = { ok: boolean; errors: string[]; warnings: string[] };
