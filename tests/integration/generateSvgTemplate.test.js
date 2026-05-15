/**
 * Phase 177 — generate-svg-template integration contracts (TGEN-01/02/03).
 *
 * Two describe blocks:
 *   1. TGEN-02 retry-budget pure-mock tests (no env required) — runs in CI on every
 *      `npm test` invocation. Exercises the DI seam `deps.anthropic` from
 *      handlers/generate.ts (B2). Asserts retry budget + needs_human_review +
 *      validator_failures.length contracts.
 *   2. TGEN-01 + TGEN-03 live integration block — skip-guarded by URL + KEY +
 *      ANTHROPIC_API_KEY presence (mirrors tests/integration/templateDraftsRls.test.js
 *      skip-guard preamble verbatim).
 *
 * Contracts:
 *   - TGEN-01: happy path returns draftId + status='pending' on valid SVG.
 *   - TGEN-02: 2 mocked validator failures + 1 success → status='pending', attempt_count=3,
 *              validator_failures.length=2; 3 consecutive failures → status='needs_human_review',
 *              validator_failures.length=3.
 *   - TGEN-03: POST without Authorization header returns 403.
 *
 * Requirements covered: TGEN-01, TGEN-02, TGEN-03.
 */
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local', override: true });
dotenv.config({ path: '.env', override: false });

const URL = process.env.VITE_SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ANTHROPIC = process.env.ANTHROPIC_API_KEY;
// Live Supabase opt-in (see svgTaxonomy.test.js for rationale). The pure-mock
// TGEN-02 retry-budget block below does NOT touch Supabase and runs always —
// only the live-DB TGEN-01/TGEN-03 block (gated by SHOULD_RUN) is opt-in.
const LIVE_TESTS_ENABLED = process.env.RUN_LIVE_SUPABASE_TESTS === '1';
const SHOULD_RUN = LIVE_TESTS_ENABLED && Boolean(URL && KEY && ANTHROPIC);

// ---------------------------------------------------------------------------
// TGEN-02 — Pure-mock retry-budget tests (B2; no env required, runs in CI).
// ---------------------------------------------------------------------------

const VALID_SVG_STR =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1920 1080">'
  + '<rect width="1920" height="1080" fill="#1a73e8"/>'
  + '<text id="title" font-family="sans-serif" fill="#ffffff">x</text>'
  + '</svg>';
const INVALID_SVG_STR = '<svg><rect/></svg>'; // missing viewBox + xmlns + customization anchor → fails Rules 2/5

describe('Phase 177 TGEN-02 — retry budget (mocked Anthropic — no env required)', () => {
  it('on 2 validator fails + 1 success, draft inserts as pending with attempt_count=3, failures.length=2', async () => {
    const mockAnthropicCreate = vi.fn()
      .mockResolvedValueOnce({ content: [{ type: 'tool_use', input: { svg: INVALID_SVG_STR } }] })
      .mockResolvedValueOnce({ content: [{ type: 'tool_use', input: { svg: INVALID_SVG_STR } }] })
      .mockResolvedValueOnce({ content: [{ type: 'tool_use', input: { svg: VALID_SVG_STR } }] });

    let insertedRow = null;
    const mockSupa = {
      from: () => ({
        insert: (row) => {
          insertedRow = row;
          return { select: () => ({ single: async () => ({ data: { id: 'fake-uuid-pending' }, error: null }) }) };
        },
      }),
    };

    // DI: pass anthropic as deps.anthropic. Handler does NOT call Deno.env.get for the mocked path.
    const { generate } = await import('../../supabase/functions/generate-svg-template/handlers/generate.ts');
    const result = await generate(
      { vertical: null, template_type: 'menu', prompt: 'test prompt', callerUid: 'fake-uid' },
      mockSupa,
      { anthropic: { messages: { create: mockAnthropicCreate } } },
    );

    expect(mockAnthropicCreate).toHaveBeenCalledTimes(3);
    expect(result.status).toBe('pending');
    expect(result.attempt_count).toBe(3);
    expect(insertedRow).not.toBeNull();
    expect(insertedRow.status).toBe('pending');
    expect(insertedRow.metadata.validator_failures.length).toBe(2);
    expect(insertedRow.metadata.attempt_count).toBe(3);
  });

  it('on 3 consecutive validator fails, draft inserts as needs_human_review with failures.length=3', async () => {
    const mockAnthropicCreate = vi.fn()
      .mockResolvedValue({ content: [{ type: 'tool_use', input: { svg: INVALID_SVG_STR } }] });

    let insertedRow = null;
    const mockSupa = {
      from: () => ({
        insert: (row) => {
          insertedRow = row;
          return { select: () => ({ single: async () => ({ data: { id: 'fake-uuid-nhr' }, error: null }) }) };
        },
      }),
    };

    const { generate } = await import('../../supabase/functions/generate-svg-template/handlers/generate.ts');
    const result = await generate(
      { vertical: null, template_type: 'menu', prompt: 'test prompt', callerUid: 'fake-uid' },
      mockSupa,
      { anthropic: { messages: { create: mockAnthropicCreate } } },
    );

    expect(mockAnthropicCreate).toHaveBeenCalledTimes(3);
    expect(result.status).toBe('needs_human_review');
    expect(result.attempt_count).toBe(3);
    expect(insertedRow).not.toBeNull();
    expect(insertedRow.status).toBe('needs_human_review');
    expect(insertedRow.metadata.validator_failures.length).toBe(3);
  });
});

// ---------------------------------------------------------------------------
// TGEN-01 + TGEN-03 — Live Edge Function integration (skip-guarded).
// ---------------------------------------------------------------------------

describe.runIf(SHOULD_RUN)('Phase 177 — generate-svg-template integration (TGEN-01/03)', () => {
  let supa;
  beforeAll(() => { supa = createClient(URL, KEY); });
  afterAll(() => { /* no-op */ });

  it('TGEN-01 happy path returns draftId + status=pending on valid generation', async () => {
    const { data, error } = await supa.functions.invoke('generate-svg-template', {
      body: {
        action: 'generate',
        vertical: null,
        template_type: 'menu',
        prompt: 'Promote Mother\'s Day brunch special featuring mimosas and french toast.',
      },
    });
    expect(error).toBeNull();
    expect(data).toMatchObject({ status: 'pending' });
    expect(typeof data.draftId).toBe('string');
    expect(data.draftId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);

    // W7 SC3 explicit SVG content assertions on the persisted draft row.
    const { data: draftRow } = await supa
      .from('template_drafts')
      .select('svg_content')
      .eq('id', data.draftId)
      .single();
    expect(draftRow.svg_content).toContain('viewBox');
    expect(draftRow.svg_content).not.toContain('currentColor');
    expect(draftRow.svg_content).toMatch(/fill\s*=\s*['"]#[0-9a-f]{3,8}['"]/i);
  });

  it('TGEN-03 admin gate: POST without Authorization header returns 403', async () => {
    // Use fetch directly so we can omit the JWT (SDK invoke would attach the service-role key).
    const fnUrl = `${URL}/functions/v1/generate-svg-template`;
    const resp = await fetch(fnUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'generate' }),
    });
    expect([401, 403]).toContain(resp.status);
  });
});
