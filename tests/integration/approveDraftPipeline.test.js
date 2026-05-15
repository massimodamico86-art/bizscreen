/**
 * Phase 177 Wave 0 RED — approve pipeline integration (TADM-03).
 *
 * Skip-guarded by URL + KEY + ANTHROPIC_API_KEY presence (mirrors
 * tests/integration/templateDraftsRls.test.js skip-guard preamble verbatim).
 *
 * RED in Wave 0 (approve handler doesn't exist yet); flips GREEN at end of Wave 2 Plan 03.
 * Contract: action=approve produces svg_templates row + S3 thumbnail URL + draft.status='approved'.
 *
 * Requirements covered: TADM-03.
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

describe.runIf(SHOULD_RUN)('Phase 177 — approve draft pipeline (TADM-03)', () => {
  let supa;
  beforeAll(() => { supa = createClient(URL, KEY); });
  afterAll(() => { /* no-op */ });

  it('action=approve produces svg_templates row + S3 thumbnail URL + draft.status=approved', async () => {
    // 1. Seed a draft via service-role INSERT.
    const seedSvg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1920 1080">'
      + '<rect width="100%" height="100%" fill="#fff"/>'
      + '<text id="title" font-family="sans-serif" fill="#000" x="100" y="100">Test</text>'
      + '</svg>';
    const { data: draft, error: seedErr } = await supa
      .from('template_drafts')
      .insert({
        svg_content: seedSvg,
        prompt: 'phase-177-approve-test',
        source: 'ai_generation',
        status: 'pending',
        vertical: null,
        metadata: { template_type: 'menu' },
      })
      .select('id')
      .single();
    expect(seedErr).toBeNull();
    expect(draft?.id).toBeTruthy();
    const draftId = draft.id;

    // 2. Invoke approve.
    const { data, error } = await supa.functions.invoke('generate-svg-template', {
      body: { action: 'approve', draftId },
    });
    expect(error).toBeNull();
    expect(typeof data?.thumbnail_url).toBe('string');
    expect(data.thumbnail_url).toMatch(/^https:\/\/.*\.s3\..*amazonaws\.com\/.*\.png$|^https:\/\/.*amazonaws\.com\/.*\/thumbnails\/system\//);

    // 3. Verify svg_templates row.
    const { data: tmplRows, error: tmplErr } = await supa
      .from('svg_templates')
      .select('id, metadata')
      .eq('metadata->>draft_id', draftId);
    expect(tmplErr).toBeNull();
    expect(tmplRows?.length).toBe(1);

    // 4. Verify draft.status='approved'.
    const { data: updatedDraft, error: updErr } = await supa
      .from('template_drafts')
      .select('status')
      .eq('id', draftId)
      .single();
    expect(updErr).toBeNull();
    expect(updatedDraft?.status).toBe('approved');
  });
});
