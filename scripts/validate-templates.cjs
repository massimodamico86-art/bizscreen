#!/usr/bin/env node
/**
 * validate-templates.cjs — Phase 178 Wave 0 validator-CLI wrapper (closes RESEARCH Open Q1).
 *
 * Wraps src/services/svgValidator.js to walk live svg_templates rows filtered by
 * --vertical=<csv> and --since=<ISO timestamp>, run validateSvg per row, and
 * report aggregate pass/fail. Used by Plan 08 Task 4-6 verification.
 *
 * Source-of-truth: 178-RESEARCH.md Open Q1 (lines 1080-1085 — confirmed missing
 * on 2026-05-09; Wave 0 closure).
 *
 * Usage:
 *   node scripts/validate-templates.cjs --vertical=restaurants
 *   node scripts/validate-templates.cjs --vertical=restaurants,retail,healthcare --since=2026-05-09
 *   node scripts/validate-templates.cjs --since=2026-05-09 --verbose
 *
 * Exit codes:
 *   0 — every row passed
 *   2 — at least one row failed
 *   1 — environment misconfiguration
 *
 * Threat-mitigation (T-178-01-02): SUPABASE_SERVICE_ROLE_KEY is read by name only,
 * never logged.
 */
const path = require('path');
const url = require('url');
const { JSDOM } = require('jsdom');
const { createClient } = require('@supabase/supabase-js');

try { require('dotenv').config({ path: '.env.local', override: true }); } catch {}
try { require('dotenv').config({ path: '.env', override: false }); } catch {}

// ----- CLI args -----
const args = process.argv.slice(2);
const options = {
  vertical: ['restaurants', 'retail', 'healthcare'],
  since: null,
  verbose: false,
  limit: 1000,
};
for (let i = 0; i < args.length; i++) {
  const a = args[i];
  if (a.startsWith('--vertical=')) options.vertical = a.slice('--vertical='.length).split(',').filter(Boolean);
  else if (a === '--vertical') options.vertical = (args[++i] || '').split(',').filter(Boolean);
  else if (a.startsWith('--since=')) options.since = a.slice('--since='.length);
  else if (a === '--since') options.since = args[++i];
  else if (a.startsWith('--limit=')) options.limit = parseInt(a.slice('--limit='.length), 10);
  else if (a === '--limit') options.limit = parseInt(args[++i], 10);
  else if (a === '--verbose' || a === '-v') options.verbose = true;
  else if (a === '--help' || a === '-h') {
    console.log(`Usage: node scripts/validate-templates.cjs [options]

Options:
  --vertical <csv>   Comma-separated verticals to validate (default: restaurants,retail,healthcare). Use 'all' to skip the vertical filter.
  --since <ISO>      Validate only rows with created_at >= this ISO timestamp
  --limit <N>        Max rows to validate (default 1000)
  --verbose, -v      Print per-row errors
  --help, -h         Show this message

Wraps src/services/svgValidator.js validateSvg() over live svg_templates rows.`);
    process.exit(0);
  }
}

if (options.vertical.length === 1 && options.vertical[0] === 'all') options.vertical = null;

const URL = process.env.VITE_SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL || !KEY) {
  console.error('Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment.');
  process.exit(1);
}
const supabase = createClient(URL, KEY);

const dom = new JSDOM('');
const DOMPurify = require('dompurify')(dom.window);
const DOMParserCtor = dom.window.DOMParser;

async function loadValidator() {
  const validatorUrl = url.pathToFileURL(
    path.resolve(__dirname, '..', 'src', 'services', 'svgValidator.js'),
  ).href;
  const mod = await import(validatorUrl);
  return mod.validateSvg;
}

async function main() {
  const validateSvg = await loadValidator();
  let q = supabase
    .from('svg_templates')
    .select('id, slug, svg_content, vertical, created_at, is_active')
    .eq('is_active', true)
    .limit(options.limit);
  if (options.vertical) q = q.in('vertical', options.vertical);
  if (options.since) q = q.gte('created_at', options.since);

  const { data, error } = await q;
  if (error) {
    console.error('Query failed:', error.message);
    process.exit(2);
  }
  const rows = data || [];
  console.log(`validate-templates: scope=vertical=[${(options.vertical || ['*']).join(',')}], since=${options.since || '(open)'}, n=${rows.length}`);
  if (rows.length === 0) {
    console.log('No rows in scope — exiting clean (0 failures).');
    process.exit(0);
  }

  let passed = 0;
  let failed = 0;
  const failureSamples = [];
  for (const r of rows) {
    if (!r.svg_content) {
      failed++;
      if (options.verbose) console.log(`  [FAIL] ${r.slug}: svg_content is null`);
      failureSamples.push({ slug: r.slug, errors: ['svg_content is null'] });
      continue;
    }
    let result;
    try {
      result = validateSvg(r.svg_content, { DOMParser: DOMParserCtor, DOMPurify });
    } catch (e) {
      failed++;
      if (options.verbose) console.log(`  [FAIL] ${r.slug}: validator threw: ${e.message}`);
      failureSamples.push({ slug: r.slug, errors: [`validator threw: ${e.message}`] });
      continue;
    }
    if (result && result.ok) passed++;
    else {
      failed++;
      if (options.verbose) console.log(`  [FAIL] ${r.slug}: ${(result.errors || []).join('; ')}`);
      if (failureSamples.length < 10) failureSamples.push({ slug: r.slug, errors: result.errors });
    }
    await new Promise((rs) => setTimeout(rs, 50));
  }

  console.log('---');
  console.log(`Total: ${rows.length}  passed=${passed}  failed=${failed}`);
  if (failed > 0 && failureSamples.length) {
    console.log('First failures:');
    for (const s of failureSamples.slice(0, 10)) {
      console.log(`  ${s.slug}: ${(s.errors || []).slice(0, 3).join('; ')}`);
    }
    process.exit(2);
  }
  process.exit(0);
}

main().catch((e) => {
  console.error('Unhandled error:', e.message);
  process.exit(1);
});
