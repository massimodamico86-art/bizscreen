/**
 * Phase 176 — SC-2 second clause verification.
 * Asserts that an INSERT into svg_templates with an invalid `vertical` value
 * is rejected by the chk_svg_templates_vertical_enum CHECK constraint
 * (Postgres SQLSTATE 23514).
 *
 * Uses the service-role client to bypass RLS — we are explicitly testing
 * the CHECK constraint, not the RLS policy. The 3 allowed values are
 * 'restaurants', 'retail', 'healthcare'; NULL is also allowed. Anything
 * else MUST be rejected.
 *
 * Skip-guard: if VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is not set,
 * the test skips cleanly (CI-safe pattern from svgTemplatesCount.test.js).
 *
 * Cleanup: beforeAll AND afterAll hooks delete any rows whose name starts
 * with `phase-176-test-` — this guarantees a clean slate across runs even
 * after a partial failure.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load real credentials over tests/setup.js stubs (mirrors svgTemplatesCount.test.js).
// `.env.local` overrides `.env` so live keys take precedence over local-Docker stubs.
dotenv.config({ path: '.env.local', override: true });
dotenv.config({ path: '.env', override: false });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
// Live Supabase opt-in (see svgTaxonomy.test.js for rationale).
const LIVE_TESTS_ENABLED = process.env.RUN_LIVE_SUPABASE_TESTS === '1';
const SHOULD_RUN =
  LIVE_TESTS_ENABLED &&
  Boolean(SUPABASE_URL && SERVICE_KEY) &&
  !String(SUPABASE_URL).includes('test-project.supabase.co');

describe.runIf(SHOULD_RUN)('Phase 176 — svg_templates.vertical CHECK constraint', () => {
  // NOTE: createClient is deferred into beforeAll because vitest evaluates the
  // describe callback body even when the suite is skipped (only `it()` blocks
  // are gated by runIf). Constructing the client at top-level would throw
  // "supabaseKey is required" in environments where SERVICE_KEY is unset.
  // This mirrors the project's analog test pattern in svgTemplatesCount.test.js.
  let supa;

  // Cleanup any rows left from a prior partial run — prevents PGRST116 on .single()
  beforeAll(async () => {
    supa = createClient(SUPABASE_URL, SERVICE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    await supa.from('svg_templates').delete().like('name', 'phase-176-test-%');
  });

  afterAll(async () => {
    if (supa) await supa.from('svg_templates').delete().like('name', 'phase-176-test-%');
  });

  it('rejects INSERT with vertical="not_a_real_vertical" via chk_svg_templates_vertical_enum', async () => {
    // Pre-delete any prior negative-path row (defensive, in case beforeAll missed it)
    await supa.from('svg_templates').delete().eq('name', 'phase-176-test-vertical-bad-value');

    const { error, data } = await supa
      .from('svg_templates')
      .insert({
        name: 'phase-176-test-vertical-bad-value',
        category: 'general',
        orientation: 'landscape',
        svg_url: 'https://example.test/test.svg',
        tenant_id: null,
        created_by: null,
        vertical: 'not_a_real_vertical',
        is_active: false, // do not pollute the gallery if for some reason this slips through
      })
      .select()
      .single();

    expect(data).toBeNull();
    expect(error).toBeTruthy();
    // SQLSTATE 23514 = check_violation
    expect(error.code).toBe('23514');
    expect(error.message).toMatch(/chk_svg_templates_vertical_enum/);
  });

  it('accepts INSERT with vertical=NULL (CHECK allows NULL)', async () => {
    // Cleanup any prior run of this test row
    await supa.from('svg_templates').delete().eq('name', 'phase-176-test-vertical-null');

    const { error, data } = await supa
      .from('svg_templates')
      .insert({
        name: 'phase-176-test-vertical-null',
        category: 'general',
        orientation: 'landscape',
        svg_url: 'https://example.test/test.svg',
        tenant_id: null,
        created_by: null,
        vertical: null,
        is_active: false,
      })
      .select()
      .single();

    expect(error).toBeNull();
    expect(data).toBeTruthy();
    expect(data.vertical).toBeNull();

    // Cleanup so re-runs are idempotent
    await supa.from('svg_templates').delete().eq('id', data.id);
  });

  it.each(['restaurants', 'retail', 'healthcare'])(
    'accepts INSERT with vertical=%s (one of the 3 allowed enum values)',
    async (value) => {
      await supa.from('svg_templates').delete().eq('name', `phase-176-test-vertical-${value}`);

      const { error, data } = await supa
        .from('svg_templates')
        .insert({
          name: `phase-176-test-vertical-${value}`,
          category: 'general',
          orientation: 'landscape',
          svg_url: 'https://example.test/test.svg',
          tenant_id: null,
          created_by: null,
          vertical: value,
          is_active: false,
        })
        .select()
        .single();

      expect(error).toBeNull();
      expect(data.vertical).toBe(value);

      await supa.from('svg_templates').delete().eq('id', data.id);
    }
  );
});
