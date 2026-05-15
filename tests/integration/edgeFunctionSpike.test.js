/**
 * Phase 177 Wave 0 — Edge Function spike (Deno trio + AWS SDK boot probe).
 *
 * Skip-guarded by URL + KEY + ANTHROPIC_API_KEY presence (mirrors
 * tests/integration/templateDraftsRls.test.js skip-guard preamble verbatim;
 * Phase 176 lesson — DO NOT paraphrase, override semantics are load-bearing).
 *
 * Acceptance: action=spike round-trips Anthropic + deno-dom + resvg-wasm + aws-sdk
 * bootstrap and returns 200 with `{ ok: true, anthropic_ok: true, deno_dom_ok: true,
 * resvg_wasm_ok: true, aws_sdk_ok: true }`.
 *
 * Wave 0 RED state: SKIPPED locally (no service-role key); GREEN once Plan 01 Task 3
 * deploys the spike Edge Function and the operator runs the suite with full env.
 *
 * Requirements covered: Wave-0 spike contract (resolves D-17 + B3 — Plan 03 prereq).
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local', override: true });
dotenv.config({ path: '.env', override: false });

const URL = process.env.VITE_SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ANTHROPIC = process.env.ANTHROPIC_API_KEY;
// Live Supabase opt-in (see svgTaxonomy.test.js for rationale).
const LIVE_TESTS_ENABLED = process.env.RUN_LIVE_SUPABASE_TESTS === '1';
const SHOULD_RUN = LIVE_TESTS_ENABLED && Boolean(URL && KEY && ANTHROPIC);

describe.runIf(SHOULD_RUN)('Phase 177 W0 — Edge Function spike (Deno trio boots)', () => {
  let supa;
  beforeAll(() => { supa = createClient(URL, KEY); });
  afterAll(() => { /* no-op */ });

  it('round-trips action=spike and confirms anthropic + deno-dom + resvg-wasm + aws-sdk load (B3)', async () => {
    const { data, error } = await supa.functions.invoke('generate-svg-template', {
      body: { action: 'spike' },
    });
    expect(error).toBeNull();
    expect(data).toMatchObject({
      ok: true,
      anthropic_ok: true,
      deno_dom_ok: true,
      resvg_wasm_ok: true,
      aws_sdk_ok: true,
    });
  });
});
