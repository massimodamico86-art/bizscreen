/**
 * Phase 173 — gallery_templates_with_favorites VIEW per-user filter (TFAV-03, RESEARCH Pitfall 9).
 *
 * Live-DB integration test — uses supabase.auth.signInWithPassword (NOT service role,
 * because auth.uid() must be populated for the LEFT JOIN predicate per RESEARCH Pitfall 3).
 *
 * Env loading: dotenv picks up `.env.local` so `npx vitest run` picks up
 * TEST_USER_EMAIL / TEST_USER_PASSWORD / VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY
 * without requiring an env-wrapper command. If creds are absent (e.g. CI without
 * the secrets), describe.skipIf ensures the whole suite is skipped cleanly.
 *
 * We deliberately create a fresh supabase client via createClient() rather than
 * re-using `src/supabase.js` — tests/setup.js stubs VITE_SUPABASE_URL to a fake
 * value via vi.stubEnv, so the app-level singleton would point at the stub. This
 * file reads process.env BEFORE vi.stubEnv runs (module top-level, not inside
 * beforeAll), and uses those real values for the live connection.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load .env.local (and .env as fallback) so process.env holds real credentials.
// vitest's environment doesn't auto-load dotenv. `tests/setup.js` runs FIRST and
// calls `vi.stubEnv('VITE_SUPABASE_URL', 'https://test-project.supabase.co')`
// — a fake value used by unit tests that import src/supabase.js. Dotenv's
// default behavior is to NOT overwrite pre-existing env vars, so we pass
// `override: true` here to force the real credentials from .env.local to win
// over the stubbed values at module-top-level time (before the first test runs).
dotenv.config({ path: '.env.local', override: true });
dotenv.config({ path: '.env', override: false });

const TEST_EMAIL = process.env.TEST_USER_EMAIL;
const TEST_PASSWORD = process.env.TEST_USER_PASSWORD;
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
// Live Supabase opt-in (see svgTaxonomy.test.js for rationale).
const LIVE_TESTS_ENABLED = process.env.RUN_LIVE_SUPABASE_TESTS === '1';
const SKIP =
  !LIVE_TESTS_ENABLED ||
  !TEST_EMAIL ||
  !TEST_PASSWORD ||
  !SUPABASE_URL ||
  !SUPABASE_ANON_KEY ||
  // Guard against the setup.js stub leaking through — that URL is NOT a real project.
  SUPABASE_URL.includes('test-project.supabase.co');

let supabase;
let testTemplateRow;
let userId;

describe.skipIf(SKIP)('gallery_templates_with_favorites VIEW per-user filter', () => {
  beforeAll(async () => {
    supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const { data: auth, error: authErr } = await supabase.auth.signInWithPassword({
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
    });
    if (authErr) throw authErr;
    userId = auth.user.id;

    // Pick the first svg template available to the user as our toggle target.
    // We query the VIEW (not the base table) because that's what the app reads.
    const { data: rows, error: rowsErr } = await supabase
      .from('gallery_templates_with_favorites')
      .select('id, editor_type, is_favorited')
      .eq('editor_type', 'svg')
      .limit(1);
    if (rowsErr) throw rowsErr;
    if (!rows || rows.length === 0) throw new Error('No svg templates available for test user');
    testTemplateRow = rows[0];

    // Ensure clean baseline: delete any existing favorite for this row.
    // Idempotent — no error if the row already does not exist.
    await supabase
      .from('template_favorites')
      .delete()
      .eq('user_id', userId)
      .eq('template_id', testTemplateRow.id)
      .eq('editor_type', testTemplateRow.editor_type);
  });

  afterAll(async () => {
    // Cleanup: ensure no test-leftover favorite remains.
    if (supabase && userId && testTemplateRow) {
      await supabase
        .from('template_favorites')
        .delete()
        .eq('user_id', userId)
        .eq('template_id', testTemplateRow.id)
        .eq('editor_type', testTemplateRow.editor_type);
    }
    if (supabase) await supabase.auth.signOut();
  });

  it("VIEW returns is_favorited=TRUE for the caller's favorited row (TFAV-03, Pitfall 9)", async () => {
    // Insert favorite row via the same code path the app uses.
    const { error: insErr } = await supabase.from('template_favorites').insert({
      user_id: userId,
      template_id: testTemplateRow.id,
      editor_type: testTemplateRow.editor_type,
    });
    expect(insErr).toBeNull();

    // Re-query VIEW — is_favorited should flip to TRUE for this template
    const { data, error } = await supabase
      .from('gallery_templates_with_favorites')
      .select('id, editor_type, is_favorited')
      .eq('id', testTemplateRow.id)
      .eq('editor_type', testTemplateRow.editor_type)
      .single();
    expect(error).toBeNull();
    expect(data.is_favorited).toBe(true);
  });

  it('VIEW returns is_favorited=FALSE for templates the caller has not favorited', async () => {
    // Get a row OTHER than the favorited one.
    const { data: rows, error } = await supabase
      .from('gallery_templates_with_favorites')
      .select('id, editor_type, is_favorited')
      .eq('editor_type', 'svg')
      .neq('id', testTemplateRow.id)
      .limit(1);
    if (error) throw error;
    if (rows.length === 0) return; // single-template tenant; trivially satisfied
    expect(rows[0].is_favorited).toBe(false);
  });

  it('Removing the favorite flips is_favorited back to FALSE (TFAV-01 toggle delete path)', async () => {
    await supabase
      .from('template_favorites')
      .delete()
      .eq('user_id', userId)
      .eq('template_id', testTemplateRow.id)
      .eq('editor_type', testTemplateRow.editor_type);

    const { data, error } = await supabase
      .from('gallery_templates_with_favorites')
      .select('is_favorited')
      .eq('id', testTemplateRow.id)
      .eq('editor_type', testTemplateRow.editor_type)
      .single();
    expect(error).toBeNull();
    expect(data.is_favorited).toBe(false);
  });
});
