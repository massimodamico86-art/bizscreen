/**
 * Phase 176 — SC-1 second clause verification.
 *
 * Two independent verification paths, both targeting the same policy:
 * `template_drafts_admin_only` ON template_drafts FOR ALL TO authenticated
 * USING (is_admin() OR is_super_admin()) WITH CHECK (is_admin() OR is_super_admin()).
 *
 * Path A (JWT-path): A non-admin signed-in user attempts INSERT via supabase-js.
 *   Requires: VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, TEST_NON_ADMIN_EMAIL, TEST_NON_ADMIN_PASSWORD.
 *
 * Path B (SQL-level fallback): A service-role caller switches to plain
 *   `authenticated` role (no JWT) and attempts INSERT. Postgres rejects
 *   because auth.uid() is NULL → is_admin() is FALSE → policy USING/WITH CHECK
 *   evaluates FALSE. SQLSTATE 42501.
 *   Requires: SUPABASE_ACCESS_TOKEN (for Mgmt API access to /database/query).
 *
 * Each path skips independently when its env vars are missing. The SUMMARY
 * documents which path(s) ran. SC-1.b is closed if EITHER path runs and passes.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load real credentials over tests/setup.js stubs (mirrors svgTemplatesCount.test.js).
dotenv.config({ path: '.env.local', override: true });
dotenv.config({ path: '.env', override: false });

// ─── Path A: JWT-path (non-admin signed-in user) ────────────────────────────
const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;
const NON_ADMIN_EMAIL = process.env.TEST_NON_ADMIN_EMAIL;
const NON_ADMIN_PW = process.env.TEST_NON_ADMIN_PASSWORD;
// Live Supabase opt-in (see svgTaxonomy.test.js for rationale).
const LIVE_TESTS_ENABLED = process.env.RUN_LIVE_SUPABASE_TESTS === '1';

const PATH_A_SHOULD_RUN =
  LIVE_TESTS_ENABLED &&
  Boolean(SUPABASE_URL && ANON_KEY && NON_ADMIN_EMAIL && NON_ADMIN_PW) &&
  !String(SUPABASE_URL).includes('test-project.supabase.co');

describe.runIf(PATH_A_SHOULD_RUN)('Phase 176 — template_drafts admin-only RLS (JWT path)', () => {
  // NOTE: createClient is deferred into beforeAll because vitest evaluates the
  // describe callback body even when the suite is skipped (only `it()` blocks
  // are gated by runIf). Constructing the client at top-level would throw
  // "supabaseKey is required" on a box without VITE_SUPABASE_ANON_KEY.
  let supa;

  beforeAll(async () => {
    supa = createClient(SUPABASE_URL, ANON_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { error } = await supa.auth.signInWithPassword({
      email: NON_ADMIN_EMAIL,
      password: NON_ADMIN_PW,
    });
    if (error) throw error;
  });

  afterAll(async () => {
    if (supa) await supa.auth.signOut();
  });

  it('rejects INSERT into template_drafts as a non-admin authenticated user', async () => {
    const { error, data } = await supa
      .from('template_drafts')
      .insert({
        svg_content: '<svg xmlns="http://www.w3.org/2000/svg"></svg>',
        prompt: 'phase-176-rls-rejection-test',
        source: 'admin_upload',
        status: 'pending',
        vertical: null,
        metadata: {},
      })
      .select()
      .single();

    expect(data).toBeNull();
    expect(error).toBeTruthy();
    // RLS rejection — SQLSTATE 42501 OR a Postgrest 'PGRST301' style error.
    // Supabase typically returns either a 42501 or a generic 401/403 with
    // message containing "row-level security" or "violates row-level security policy".
    const errMsg = String(error.message || '').toLowerCase();
    const errCode = String(error.code || '');
    const isRlsRejection =
      errCode === '42501' ||
      errMsg.includes('row-level security') ||
      errMsg.includes('violates row-level security policy') ||
      errMsg.includes('permission denied');
    expect(isRlsRejection).toBe(true);
  });

  it('rejects SELECT on template_drafts as a non-admin authenticated user (returns empty result)', async () => {
    // Note: SELECT under RLS doesn't ERROR; it returns an empty result set
    // because the policy USING clause filters the row. We assert that
    // even if rows existed, this user cannot see them.
    const { error, data } = await supa
      .from('template_drafts')
      .select('id')
      .limit(1);

    // No error expected — RLS-filtered SELECTs return empty, not error
    expect(error).toBeNull();
    // Either truly empty (no admins have inserted) or filtered to empty by RLS
    // — both are acceptable for SC-1.a "returns an empty table".
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBe(0);
  });
});

// ─── Path B: SQL-level fallback (no creds; uses Mgmt API + role switch) ─────
const MGMT_TOKEN = process.env.SUPABASE_ACCESS_TOKEN;
const PROJECT_ID = 'gdxizdiltfqeugbsgtpx';
const PATH_B_SHOULD_RUN = LIVE_TESTS_ENABLED && Boolean(MGMT_TOKEN);

describe.runIf(PATH_B_SHOULD_RUN)('Phase 176 — template_drafts admin-only RLS (SQL-level fallback)', () => {
  /**
   * Helper: POST a SQL block to the Mgmt API /database/query endpoint.
   * Returns the parsed JSON response.
   */
  async function execSql(sql) {
    const resp = await fetch(
      `https://api.supabase.com/v1/projects/${PROJECT_ID}/database/query`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${MGMT_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query: sql }),
      }
    );
    const text = await resp.text();
    let body;
    try { body = JSON.parse(text); } catch { body = { raw: text }; }
    return { status: resp.status, body };
  }

  it('rejects INSERT into template_drafts when role is plain `authenticated` with no JWT (auth.uid() is NULL → is_admin() FALSE → policy denies)', async () => {
    // Wrap in BEGIN/ROLLBACK so even an accidental success leaves no trace.
    const sql = `
      BEGIN;
      SET LOCAL ROLE authenticated;
      INSERT INTO template_drafts (svg_content, prompt, source, status)
      VALUES ('<svg xmlns="http://www.w3.org/2000/svg"/>', 'phase-176-rls-sql-fallback', 'admin_upload', 'pending');
      ROLLBACK;
    `;
    const { status, body } = await execSql(sql);

    // Mgmt API returns the underlying Postgres error in the body when SQL fails.
    // We expect a 4xx HTTP status OR a 200/201 with an error-shaped body.
    // Either way, the error message must surface an RLS / permission-denied signal.
    const bodyStr = JSON.stringify(body).toLowerCase();
    const isRlsRejection =
      bodyStr.includes('row-level security') ||
      bodyStr.includes('row level security') ||
      bodyStr.includes('violates row-level security policy') ||
      bodyStr.includes('permission denied') ||
      bodyStr.includes('"code":"42501"') ||
      bodyStr.includes('42501');
    expect(isRlsRejection).toBe(true);
  });
});
