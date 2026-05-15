import { describe, it, expect, beforeAll } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load real credentials over tests/setup.js stubs (mirrors tests/integration/favorites/view-per-user.test.js:18-46)
dotenv.config({ path: '.env.local', override: true });
dotenv.config({ path: '.env', override: false });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
// Live Supabase opt-in (see svgTaxonomy.test.js for rationale).
const LIVE_TESTS_ENABLED = process.env.RUN_LIVE_SUPABASE_TESTS === '1';
const SKIP =
  !LIVE_TESTS_ENABLED ||
  !SUPABASE_URL ||
  !SUPABASE_KEY ||
  SUPABASE_URL.includes('test-project.supabase.co');

let supabase;
beforeAll(() => {
  if (!SKIP) supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
});

describe.skipIf(SKIP)('svg_templates >= 112 active rows post-Phase-175', () => {
  it('SELECT COUNT(*) FROM svg_templates WHERE is_active=TRUE AND tenant_id IS NULL >= 112 (TCTN-01)', async () => {
    const { count, error } = await supabase
      .from('svg_templates')
      .select('id', { count: 'exact', head: true })
      .eq('is_active', true)
      .is('tenant_id', null);
    expect(error).toBeNull();
    expect(count).toBeGreaterThanOrEqual(112);
  });

  it('all rows created on/after 2026-04-29 have non-null thumbnail S3 URL (TCTN-04)', async () => {
    const { data, error } = await supabase
      .from('svg_templates')
      .select('id, thumbnail, slug')
      .gte('created_at', '2026-04-29T00:00:00Z')
      .is('tenant_id', null);
    expect(error).toBeNull();
    expect(data.length).toBeGreaterThanOrEqual(100);
    for (const row of data) {
      expect(row.thumbnail).toBeTruthy();
      // Reject the inline /templates/svg/.../design.svg pattern that the existing 12 use.
      expect(row.thumbnail).not.toMatch(/\/templates\/svg\//);
      // Accept any S3 URL (https://.*amazonaws.com or our presign returned URL).
      expect(row.thumbnail).toMatch(/^https?:\/\//);
    }
  });
});
