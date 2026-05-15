#!/usr/bin/env node
/**
 * verify-178-counts.cjs — Phase 178 Wave 0 RED verification harness.
 *
 * Runs all 9 Phase 178 success-criteria SQL counts via the Supabase service-role
 * client and reports per-check pass/fail. Hard-fails (process.exit(2)) if any
 * threshold is missed.
 *
 * Pre-Phase-178-execution invocation will RED-fail (counts below threshold).
 * Post-Phase-178 execution will GREEN-pass.
 *
 * Checks:
 *   - TVRT-01..03: ≥80 active templates per vertical (restaurants, retail, healthcare)
 *                  AND ≥8 distinct template_types per vertical
 *   - TCAT-01:     ≥427 active gallery_templates rows (existing 127 + ≥300 net-new)
 *   - TCAT-02:     hero types per vertical have BOTH portrait and landscape live
 *   - TCAT-04:     chk_svg_templates_category_enum CHECK constraint present
 *   - TVRT-04:     no NULL vertical for net-new rows (created_at >= 2026-05-09)
 *   - S3 thumbnail audit: HEAD probe returns 200 for each net-new thumbnail
 *
 * Source-of-truth: 178-RESEARCH.md §"SC verification queries" (lines 567-581).
 *
 * Exit codes:
 *   0 — all checks passed
 *   2 — at least one check failed
 *   1 — environment misconfiguration (missing service-role key etc)
 *
 * Threat-mitigation (T-178-01-01): SUPABASE_SERVICE_ROLE_KEY is read by name only,
 * never logged. The script honours --verbose for per-check detail but never echoes
 * env values.
 */
const { createClient } = require('@supabase/supabase-js');

try { require('dotenv').config({ path: '.env.local', override: true }); } catch {}
try { require('dotenv').config({ path: '.env', override: false }); } catch {}

// ----- CLI args -----
const args = process.argv.slice(2);
const options = {
  exitOnFail: true,
  verbose: false,
  cutoff: '2026-05-09', // pre-Phase-178 timestamp baseline (D-16 backfill date)
};
for (let i = 0; i < args.length; i++) {
  const a = args[i];
  if (a === '--no-exit-on-fail') options.exitOnFail = false;
  else if (a === '--verbose' || a === '-v') options.verbose = true;
  else if (a.startsWith('--cutoff=')) options.cutoff = a.slice('--cutoff='.length);
  else if (a === '--cutoff') options.cutoff = args[++i];
  else if (a === '--help' || a === '-h') {
    console.log(`Usage: node scripts/verify-178-counts.cjs [options]

Options:
  --no-exit-on-fail   Always exit 0 (still log per-check status)
  --verbose, -v       Print per-row detail for thumbnail HEAD probes
  --cutoff <ISO>      Cutoff timestamp for "net-new" rows (default 2026-05-09)
  --help, -h          Show this message

Reports per-check pass/fail for TVRT-01..04 + TCAT-01..04 (9 SC gates).`);
    process.exit(0);
  }
}

const URL = process.env.VITE_SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL || !KEY) {
  console.error('Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment.');
  process.exit(1);
}
const supabase = createClient(URL, KEY);

const VERTICALS = ['restaurants', 'retail', 'healthcare'];
const HERO_TYPES = {
  restaurants: ['menu', 'daypart_menu'],
  retail: ['promo', 'flash_sale'],
  healthcare: ['reminder', 'waiting_room_ambient'],
};

const results = []; // { id, label, pass, detail }

function record(id, label, pass, detail) {
  results.push({ id, label, pass, detail });
  const tag = pass ? '[OK]  ' : '[FAIL]';
  // eslint-disable-next-line no-console
  console.log(`${tag} ${id}  ${label}  ${detail}`);
}

async function checkVerticalFloor(vertical) {
  // TVRT-01..03 row count: ≥80 active per vertical
  const { count, error } = await supabase
    .from('svg_templates')
    .select('id', { count: 'exact', head: true })
    .eq('vertical', vertical)
    .eq('is_active', true);
  if (error) {
    record(`TVRT-${vertical}`, `vertical=${vertical} active count`, false, `query error: ${error.message}`);
    return;
  }
  record(
    `TVRT-${vertical}-COUNT`,
    `≥80 active svg_templates with vertical='${vertical}'`,
    (count ?? 0) >= 80,
    `actual=${count ?? 0}`,
  );

  // ≥8 distinct template_types per vertical
  const { data, error: e2 } = await supabase
    .from('svg_templates')
    .select('metadata')
    .eq('vertical', vertical)
    .eq('is_active', true);
  if (e2) {
    record(`TVRT-${vertical}-TYPES`, `≥8 template_types for vertical='${vertical}'`, false, `query error: ${e2.message}`);
    return;
  }
  const types = new Set(
    (data || [])
      .map((r) => (r.metadata && r.metadata.template_type) || null)
      .filter(Boolean),
  );
  record(
    `TVRT-${vertical}-TYPES`,
    `≥8 distinct template_types for vertical='${vertical}'`,
    types.size >= 8,
    `distinct=${types.size}`,
  );
}

async function checkGalleryTotal() {
  // TCAT-01: ≥427 active gallery_templates rows
  const { count, error } = await supabase
    .from('gallery_templates')
    .select('id', { count: 'exact', head: true })
    .eq('is_active', true);
  if (error) {
    record('TCAT-01', '≥427 active gallery_templates', false, `query error: ${error.message}`);
    return;
  }
  record('TCAT-01', '≥427 active gallery_templates', (count ?? 0) >= 427, `actual=${count ?? 0}`);
}

async function checkOrientationCoverage(vertical) {
  // TCAT-02: hero types per vertical have BOTH portrait and landscape live
  const heroTypes = HERO_TYPES[vertical];
  for (const t of heroTypes) {
    const { data, error } = await supabase
      .from('svg_templates')
      .select('orientation')
      .eq('vertical', vertical)
      .eq('is_active', true)
      .filter('metadata->>template_type', 'eq', t);
    if (error) {
      record(
        `TCAT-02-${vertical}-${t}`,
        `${vertical}/${t} orientation coverage`,
        false,
        `query error: ${error.message}`,
      );
      continue;
    }
    const orientations = new Set((data || []).map((r) => r.orientation).filter(Boolean));
    const hasBoth = orientations.has('landscape') && orientations.has('portrait');
    record(
      `TCAT-02-${vertical}-${t}`,
      `hero type ${vertical}/${t} has BOTH portrait + landscape`,
      hasBoth,
      `orientations=[${Array.from(orientations).join(',')}]`,
    );
  }
}

async function checkCheckConstraint() {
  // TCAT-04: chk_svg_templates_category_enum present
  const { data, error } = await supabase.rpc('exec_sql', {
    sql: `SELECT COUNT(*) AS c FROM information_schema.check_constraints WHERE constraint_name='chk_svg_templates_category_enum'`,
  }).catch(() => ({ data: null, error: { message: 'rpc exec_sql not available' } }));
  if (error || !data) {
    // Fallback: skip with a clear FAIL — the DBA should run the SQL directly.
    record(
      'TCAT-04',
      'chk_svg_templates_category_enum CHECK constraint present',
      false,
      'exec_sql RPC not available; run SQL manually: SELECT COUNT(*) FROM information_schema.check_constraints WHERE constraint_name=\'chk_svg_templates_category_enum\'',
    );
    return;
  }
  const c = (data && data[0] && data[0].c) || 0;
  record(
    'TCAT-04',
    'chk_svg_templates_category_enum present',
    Number(c) === 1,
    `count=${c}`,
  );
}

async function checkVerticalTagging() {
  // TVRT-04: no NULL vertical for net-new rows (created_at >= cutoff)
  const { count, error } = await supabase
    .from('svg_templates')
    .select('id', { count: 'exact', head: true })
    .gte('created_at', options.cutoff)
    .is('vertical', null);
  if (error) {
    record('TVRT-04', 'no NULL vertical for net-new rows', false, `query error: ${error.message}`);
    return;
  }
  record(
    'TVRT-04',
    `net-new (since ${options.cutoff}) rows have non-NULL vertical`,
    (count ?? 0) === 0,
    `null_count=${count ?? 0}`,
  );
}

async function checkThumbnailHeads() {
  const { data, error } = await supabase
    .from('svg_templates')
    .select('id, slug, thumbnail')
    .gte('created_at', options.cutoff)
    .not('vertical', 'is', null)
    .eq('is_active', true)
    .limit(500);
  if (error) {
    record('TCAT-03-THUMB', 'net-new thumbnail HEAD probes', false, `query error: ${error.message}`);
    return;
  }
  const rows = data || [];
  if (rows.length === 0) {
    record('TCAT-03-THUMB', 'net-new thumbnail HEAD probes', true, 'no net-new rows yet (Wave 0 RED state)');
    return;
  }
  let ok = 0;
  let fail = 0;
  for (const r of rows) {
    if (!r.thumbnail) {
      fail++;
      if (options.verbose) console.log(`  [THUMB-MISSING] ${r.slug}: thumbnail is null`);
      continue;
    }
    try {
      const res = await fetch(r.thumbnail, { method: 'HEAD' });
      if (res.status === 200) ok++;
      else {
        fail++;
        if (options.verbose) console.log(`  [THUMB-${res.status}] ${r.slug}: ${r.thumbnail}`);
      }
    } catch (e) {
      fail++;
      if (options.verbose) console.log(`  [THUMB-ERR] ${r.slug}: ${e.message}`);
    }
    await new Promise((rs) => setTimeout(rs, 50));
  }
  record(
    'TCAT-03-THUMB',
    `net-new thumbnails return HTTP 200 (n=${rows.length})`,
    fail === 0,
    `ok=${ok} fail=${fail}`,
  );
}

(async function main() {
  console.log(`Phase 178 verification harness — cutoff=${options.cutoff}`);
  console.log('---');
  for (const v of VERTICALS) await checkVerticalFloor(v);
  await checkGalleryTotal();
  for (const v of VERTICALS) await checkOrientationCoverage(v);
  await checkCheckConstraint();
  await checkVerticalTagging();
  await checkThumbnailHeads();
  console.log('---');
  const failed = results.filter((r) => !r.pass);
  console.log(`Total: ${results.length} checks  passed=${results.length - failed.length}  failed=${failed.length}`);
  if (failed.length > 0 && options.exitOnFail) process.exit(2);
  process.exit(0);
})().catch((e) => {
  console.error('Unhandled error:', e.message);
  process.exit(1);
});
