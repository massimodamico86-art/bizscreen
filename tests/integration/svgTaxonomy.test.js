import { describe, it, expect, beforeAll } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local', override: true });
dotenv.config({ path: '.env', override: false });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
// Live Supabase opt-in: tests hitting the hosted DB must be explicitly enabled
// so local `npm run test:integration` doesn't fail on DNS/network errors when
// a developer has real credentials in .env.local for app dev.
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

describe.skipIf(SKIP)('svg_templates taxonomy CHECK constraint (TCTN-03)', () => {
  it('INSERT with category="invalid_category_xyz" rejected by chk_svg_templates_category_enum', async () => {
    const slug = `taxonomy-test-${Date.now()}`;
    const { error } = await supabase.from('svg_templates').insert({
      slug,
      name: 'Taxonomy test',
      description: 'should fail',
      category: 'invalid_category_xyz',
      orientation: 'landscape',
      svg_url: '/test.svg',
      width: 1920,
      height: 1080,
      tags: ['test'],
      is_featured: false,
      is_active: true,
      tenant_id: null,
    });
    expect(error).toBeTruthy();
    expect(error.message).toMatch(/chk_svg_templates_category_enum|check constraint|violates/i);
  });

  it('INSERT with category="Restaurant" succeeds (cleanup after) (TCTN-03)', async () => {
    const slug = `taxonomy-ok-${Date.now()}`;
    const { error: insertError } = await supabase.from('svg_templates').insert({
      slug,
      name: 'Taxonomy ok',
      description: 'should succeed',
      category: 'Restaurant',
      orientation: 'landscape',
      svg_url: '/test.svg',
      width: 1920,
      height: 1080,
      tags: ['test'],
      is_featured: false,
      is_active: false, // do not pollute live gallery
      tenant_id: null,
    });
    // Cleanup regardless of result
    await supabase.from('svg_templates').delete().eq('slug', slug);
    expect(insertError).toBeNull();
  });
});
