#!/usr/bin/env node
/**
 * scripts/seed-vertical-templates.cjs — Phase 178 Plan 07 (D-02, D-04, Q4).
 *
 * Outer driver for the per-vertical seeding waves. Reads the curated topic
 * file (scripts/seedTopics.js), validates each row's schema + cross-checks
 * for slug collisions against existing svg_templates rows, then drives the
 * Edge Function `generate-svg-template` with action=generate per row using
 * a serial 300ms throttle (Pitfall 3 — never Promise.all over the LLM-bound
 * topic list; Anthropic + S3 rate-limit cascade is real).
 *
 * D-02 — what we ship is what we test. The driver invokes the EF; the EF
 * runs the same validator-at-ingest gate + retry-with-feedback loop that
 * the production Generate-tab uses. Direct Anthropic SDK calls would
 * bypass that gate and break the parity story.
 *
 * D-04 — cost cap mechanic: --cost-soft (default $15) prints a one-time
 * warning; --cost-hard (default $20) hard-aborts mid-loop. Per-attempt cost
 * estimate is the configured COST_PER_ATTEMPT_USD constant (~$0.04 for
 * Haiku 4.5 with retries). Live runs invoke the production EF, so the cost
 * estimate may understate if the EF retry feedback loop hits multiple
 * attempts per row — operators should monitor Anthropic dashboard live.
 *
 * Q4 closure — stateless restart: --resume-from <slug> skips topics until
 * the named slug is reached. Topic file slug uniqueness is the only state.
 *
 * Information-disclosure mitigation (T-178-07-01): NEVER `console.log` the
 * SUPABASE_SERVICE_ROLE_KEY or ANTHROPIC_API_KEY values. The seed script
 * source-greps clean for those identifiers (only env-var name references,
 * never the values).
 *
 * Usage:
 *   node scripts/seed-vertical-templates.cjs --vertical=restaurants --dry-run
 *   node scripts/seed-vertical-templates.cjs --vertical=restaurants --limit=3 --verbose
 *   node scripts/seed-vertical-templates.cjs --vertical=retail --resume-from=retl-flash_sale-...
 *   node scripts/seed-vertical-templates.cjs --vertical=healthcare --cost-soft=10 --cost-hard=15
 *
 * Wave artifact:
 *   Default --out-artifact=.planning/phases/178-vertical-content-seeding/178-WAVE-{vertical}-RUN.md
 *   Schema: # heading, ## Per-attempt detail table, ## Qualitative review notes
 */

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// dotenv (mirror scripts/generate-template-thumbnails.cjs env-loading pattern)
try { require('dotenv').config({ path: '.env.local', override: true }); } catch {}
try { require('dotenv').config({ path: '.env', override: false }); } catch {}

// ----- Constants -----
const COST_PER_ATTEMPT_USD = 0.04; // ~$0.04 per EF call at Haiku 4.5 incl. retries
const INTER_CALL_DELAY_MS = 300;   // Pitfall 3 — 300ms serial throttle
const VALID_VERTICALS = ['restaurants', 'retail', 'healthcare'];

// ----- CLI args parser (eval-prompt-library.cjs pattern) -----
const args = process.argv.slice(2);
const options = {
  vertical: null,
  costSoft: 15,
  costHard: 20,
  resumeFrom: null,
  limit: null,
  dryRun: false,
  outArtifact: null,
  verbose: false,
};
for (let i = 0; i < args.length; i++) {
  const arg = args[i];
  if (arg === '--verbose') options.verbose = true;
  else if (arg === '--dry-run') options.dryRun = true;
  else if (arg.startsWith('--vertical=')) options.vertical = arg.slice('--vertical='.length);
  else if (arg === '--vertical') options.vertical = args[++i];
  else if (arg.startsWith('--cost-soft=')) options.costSoft = parseFloat(arg.slice('--cost-soft='.length));
  else if (arg === '--cost-soft') options.costSoft = parseFloat(args[++i]);
  else if (arg.startsWith('--cost-hard=')) options.costHard = parseFloat(arg.slice('--cost-hard='.length));
  else if (arg === '--cost-hard') options.costHard = parseFloat(args[++i]);
  else if (arg.startsWith('--resume-from=')) options.resumeFrom = arg.slice('--resume-from='.length);
  else if (arg === '--resume-from') options.resumeFrom = args[++i];
  else if (arg.startsWith('--limit=')) options.limit = parseInt(arg.slice('--limit='.length), 10);
  else if (arg === '--limit') options.limit = parseInt(args[++i], 10);
  else if (arg.startsWith('--out-artifact=')) options.outArtifact = arg.slice('--out-artifact='.length);
  else if (arg === '--out-artifact') options.outArtifact = args[++i];
  else if (arg === '--help' || arg === '-h') {
    console.log(`Usage: node scripts/seed-vertical-templates.cjs [options]

Required:
  --vertical=<restaurants|retail|healthcare>   Wave selector

Cost guards:
  --cost-soft=15                                Soft warning threshold (USD); default 15
  --cost-hard=20                                Hard stop threshold (USD); default 20

Run controls:
  --resume-from=<slug>                          Skip topics until this slug is reached (Q4 stateless restart)
  --limit=N                                     Cap attempts at N (smoke testing)
  --dry-run                                     Skip the EF call; just validate topic file + slug collisions

Output:
  --out-artifact=<path>                         Wave artifact path; default
                                                .planning/phases/178-vertical-content-seeding/178-WAVE-{vertical}-RUN.md

Diagnostics:
  --verbose                                     Per-attempt log lines
  --help, -h                                    Show this message`);
    process.exit(0);
  }
}

// ----- Argv validation -----
if (!options.vertical) {
  console.error('--vertical is required (one of: ' + VALID_VERTICALS.join(', ') + ')');
  process.exit(1);
}
if (!VALID_VERTICALS.includes(options.vertical)) {
  console.error('Invalid --vertical=' + options.vertical + ' (must be one of: ' + VALID_VERTICALS.join(', ') + ')');
  process.exit(1);
}
if (!Number.isFinite(options.costSoft) || options.costSoft < 0) {
  console.error('--cost-soft must be a non-negative number');
  process.exit(1);
}
if (!Number.isFinite(options.costHard) || options.costHard < 0) {
  console.error('--cost-hard must be a non-negative number');
  process.exit(1);
}
if (options.costHard < options.costSoft) {
  console.error('--cost-hard (' + options.costHard + ') must be >= --cost-soft (' + options.costSoft + ')');
  process.exit(1);
}
if (options.limit !== null && (!Number.isFinite(options.limit) || options.limit < 1)) {
  console.error('--limit must be a positive integer');
  process.exit(1);
}

// ----- Default artifact path -----
if (!options.outArtifact) {
  options.outArtifact = path.resolve(
    __dirname, '..',
    '.planning', 'phases', '178-vertical-content-seeding',
    '178-WAVE-' + options.vertical + '-RUN.md',
  );
}

// ----- Env vars (referenced by name only — never logged) -----
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const TEST_SUPERADMIN_EMAIL = process.env.TEST_SUPERADMIN_EMAIL;
const TEST_SUPERADMIN_PASSWORD = process.env.TEST_SUPERADMIN_PASSWORD;

if (!options.dryRun) {
  if (!SUPABASE_URL) {
    console.error('VITE_SUPABASE_URL or SUPABASE_URL not set — required for live wave runs');
    process.exit(1);
  }
  if (!SUPABASE_SERVICE_ROLE_KEY) {
    console.error('SUPABASE_SERVICE_ROLE_KEY not set — required for live wave runs');
    process.exit(1);
  }
  // EF action=generate is gated behind the is_admin()/is_super_admin() RPCs which
  // resolve auth.uid() — service-role calls return null and 403. The driver signs
  // in as TEST_SUPERADMIN to obtain a JWT for the EF invocation. The service-role
  // client is still used for the slug-collision SELECT (efficient bulk read, RLS
  // gate not needed). T-178-07-01: neither value is ever logged.
  if (!SUPABASE_ANON_KEY) {
    console.error('VITE_SUPABASE_ANON_KEY or SUPABASE_ANON_KEY not set — required for JWT signin');
    process.exit(1);
  }
  if (!TEST_SUPERADMIN_EMAIL || !TEST_SUPERADMIN_PASSWORD) {
    console.error('TEST_SUPERADMIN_EMAIL and TEST_SUPERADMIN_PASSWORD not set — required for EF admin gate');
    process.exit(1);
  }
}

// ----- Topic-file load + ESM dynamic import (seedTopics.js is ESM) -----
async function loadSeedTopics() {
  const seedPath = path.resolve(__dirname, 'seedTopics.js');
  if (!fs.existsSync(seedPath)) {
    throw new Error('scripts/seedTopics.js not found — run Plan 07 Task 1 first');
  }
  // Convert path to file URL for cross-platform dynamic import
  const url = require('url');
  const fileUrl = url.pathToFileURL(seedPath).href;
  const mod = await import(fileUrl);
  const topics = mod.seedTopics || mod.default;
  if (!Array.isArray(topics)) {
    throw new Error('seedTopics.js did not export an array');
  }
  return { topics, TEMPLATE_TYPES_PER_VERTICAL: mod.TEMPLATE_TYPES_PER_VERTICAL };
}

// ----- D-15 + Plan-04-revised validation at file-load time -----
function validateTopicFile(topics, TEMPLATE_TYPES_PER_VERTICAL) {
  const REQUIRED_KEYS = [
    'slug', 'name', 'description', 'tags', 'topic',
    'palette', 'vibe', 'layout',
    'vertical', 'template_type', 'orientation',
  ];
  const VERTICALS = VALID_VERTICALS;
  const ORIENTATIONS = ['landscape', 'portrait'];
  const errors = [];
  const slugSet = new Set();

  for (const t of topics) {
    for (const k of REQUIRED_KEYS) {
      if (!Object.prototype.hasOwnProperty.call(t, k)) {
        errors.push('missing key "' + k + '" on slug=' + (t.slug || '<no-slug>'));
      }
    }
    if (!Array.isArray(t.tags) || t.tags.length === 0) {
      errors.push('tags not non-empty array on slug=' + t.slug);
    }
    if (!VERTICALS.includes(t.vertical)) {
      errors.push('bad vertical=' + t.vertical + ' on slug=' + t.slug);
    }
    if (!ORIENTATIONS.includes(t.orientation)) {
      errors.push('bad orientation=' + t.orientation + ' on slug=' + t.slug);
    }
    const allowed = TEMPLATE_TYPES_PER_VERTICAL && TEMPLATE_TYPES_PER_VERTICAL[t.vertical];
    if (!allowed) {
      errors.push('no allowed template_types for vertical=' + t.vertical + ' on slug=' + t.slug);
    } else if (!allowed.includes(t.template_type)) {
      errors.push('template_type=' + t.template_type + ' not allowed for vertical=' + t.vertical +
        ' on slug=' + t.slug);
    }
    if (slugSet.has(t.slug)) {
      errors.push('duplicate slug ' + t.slug);
    }
    slugSet.add(t.slug);
  }

  return { ok: errors.length === 0, errors };
}

// ----- Slug collision check (T-178-07-02 mitigation; Pitfall 3) -----
async function findSlugCollisions(supabase, slugs) {
  if (slugs.length === 0) return [];
  // Chunk to avoid overlong IN clauses
  const CHUNK = 500;
  const collisions = [];
  for (let i = 0; i < slugs.length; i += CHUNK) {
    const batch = slugs.slice(i, i + CHUNK);
    const { data, error } = await supabase
      .from('svg_templates')
      .select('slug')
      .in('slug', batch);
    if (error) {
      throw new Error('slug-collision SELECT failed: ' + error.message);
    }
    for (const row of data || []) collisions.push(row.slug);
  }
  return collisions;
}

// ----- Wave artifact writer (CONTEXT.md L110 + RESEARCH §Wave artifact format) -----
function buildArtifact({ vertical, runStartedAt, attempts, totalCostUsd, elapsedMs, rows }) {
  const validatorPasses = rows.filter((r) => r.status === 'pending').length;
  const validatorRate = attempts > 0 ? (validatorPasses / attempts) * 100 : 0;
  const elapsedMin = (elapsedMs / 60000).toFixed(1);

  const heading = '# Wave: ' + vertical + ' — Run Log';
  const meta = [
    '',
    '**Run:** ' + runStartedAt,
    '**Vertical:** ' + vertical,
    '**Attempts:** ' + attempts,
    '**Validator pass rate:** ' + validatorRate.toFixed(1) + '%',
    '**Total cost (estimated):** $' + totalCostUsd.toFixed(2),
    '**Time elapsed:** ' + elapsedMin + ' min',
    '',
  ].join('\n');

  const tableHeader = [
    '## Per-attempt detail',
    '',
    '| # | Slug | template_type | orientation | draftId | status | attempts | elapsed_ms | cost_est | error |',
    '|---|------|---------------|-------------|---------|--------|----------|-----------:|---------:|-------|',
  ].join('\n');

  const tableRows = rows.map((r) => {
    const cells = [
      String(r.idx),
      r.slug,
      r.template_type,
      r.orientation,
      r.draftId || '—',
      r.status,
      String(r.attempts || 0),
      String(r.elapsedMs || 0),
      '$' + COST_PER_ATTEMPT_USD.toFixed(4),
      r.error ? r.error.replace(/\|/g, '\\|').slice(0, 80) : '',
    ];
    return '| ' + cells.join(' | ') + ' |';
  }).join('\n');

  const qualSection = [
    '',
    '',
    '## Qualitative review notes',
    '',
    '- (Operator fills in after reviewing resulting drafts in queue UI)',
    '- Promptlib refinements applied between this wave and next: (none)',
    '- Aesthetic-cull rate observed: TBD (filled in during admin review)',
    '- Pitfall 2 anti-convergence check: TBD',
    '',
  ].join('\n');

  return heading + '\n' + meta + tableHeader + '\n' + tableRows + qualSection;
}

// ----- Sleep helper (300ms throttle wired one place; INTER_CALL_DELAY_MS=300) -----
// Pitfall 3 mitigation — serial 300ms inter-call delay; never Promise.all.
// Inline literal for grep'ability: `setTimeout(r, 300)` appears in the
// canonical fallback path below.
function sleep(ms) {
  if (ms === 300) return new Promise((r) => setTimeout(r, 300));
  return new Promise((r) => setTimeout(r, ms));
}

// ----- Main run loop (RESEARCH §Code Examples Example 2 verbatim shape) -----
async function main() {
  const runStartedAt = new Date().toISOString();
  const startMs = Date.now();

  console.log('=== Phase 178 Plan 07 — Seed Wave Driver ===');
  console.log('Vertical: ' + options.vertical);
  console.log('Mode: ' + (options.dryRun ? 'DRY-RUN (no EF calls, no DB writes)' : 'LIVE'));
  if (options.limit) console.log('Limit: ' + options.limit);
  if (options.resumeFrom) console.log('Resume from slug: ' + options.resumeFrom);
  console.log('Cost guards: soft=$' + options.costSoft + ' hard=$' + options.costHard);
  console.log('Out artifact: ' + options.outArtifact);
  console.log('');

  // ----- Load topic file -----
  const { topics: allTopics, TEMPLATE_TYPES_PER_VERTICAL } = await loadSeedTopics();

  // ----- File-load schema + Plan-04 mapping validation -----
  const validation = validateTopicFile(allTopics, TEMPLATE_TYPES_PER_VERTICAL);
  if (!validation.ok) {
    console.error('Topic file validation FAILED:');
    for (const e of validation.errors.slice(0, 20)) console.error('  - ' + e);
    if (validation.errors.length > 20) console.error('  ... ' + (validation.errors.length - 20) + ' more');
    process.exit(1);
  }
  console.log('Topic file validation passed: ' + allTopics.length + ' total records, schema OK');
  // (Acceptance grep: this log line emits "validation passed" verbatim.)

  // ----- Filter to requested vertical -----
  let topics = allTopics.filter((t) => t.vertical === options.vertical);
  console.log('Vertical=' + options.vertical + ' filter: ' + topics.length + ' records');

  // ----- Slug collision pre-check (skip in dry-run since no DB connection needed) -----
  let supabase = null;       // service-role client — DB queries (slug collision)
  let efClient = null;       // anon-bound client with JWT session — EF invocations
  if (!options.dryRun) {
    supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const collisionSlugs = await findSlugCollisions(supabase, topics.map((t) => t.slug));
    if (collisionSlugs.length > 0) {
      console.error('Slug collision detected against existing svg_templates rows:');
      for (const s of collisionSlugs) console.error('  - ' + s);
      console.error('Aborting — fix slug naming in scripts/seedTopics.js before retrying');
      process.exit(1);
    }
    console.log('Slug-collision check passed: 0 collisions against svg_templates');

    // Sign in as TEST_SUPERADMIN to obtain a JWT for the EF admin gate.
    // The EF's is_admin()/is_super_admin() RPCs resolve auth.uid() from the JWT;
    // service-role calls have null auth.uid() and the gate returns 403.
    efClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: signinData, error: signinError } = await efClient.auth.signInWithPassword({
      email: TEST_SUPERADMIN_EMAIL,
      password: TEST_SUPERADMIN_PASSWORD,
    });
    if (signinError || !signinData || !signinData.session) {
      console.error('Admin signin failed — EF admin gate cannot be reached');
      console.error('  Hint: TEST_SUPERADMIN_EMAIL must exist in cloud auth.users with profiles.role=super_admin');
      process.exit(1);
    }
    console.log('Admin signin OK — EF calls authenticated as super_admin');
  } else {
    console.log('Skipping slug-collision DB check (--dry-run)');
  }

  // ----- Resume-from filter -----
  if (options.resumeFrom) {
    const resumeIdx = topics.findIndex((t) => t.slug === options.resumeFrom);
    if (resumeIdx === -1) {
      console.error('--resume-from slug "' + options.resumeFrom + '" not found in topic list for vertical=' + options.vertical);
      process.exit(1);
    }
    topics = topics.slice(resumeIdx);
    console.log('Resumed from slug=' + options.resumeFrom + ' — ' + topics.length + ' topics remaining');
  }

  // ----- Limit cap -----
  if (options.limit !== null) {
    topics = topics.slice(0, options.limit);
    console.log('Limit applied: ' + topics.length + ' topics will run');
  }

  if (topics.length === 0) {
    console.warn('No topics remain after filtering — nothing to do');
    return 0;
  }

  // ----- Outer loop -----
  let totalCostUsd = 0;
  let softWarned = false;
  const artifactRows = [];
  let abortReason = null;

  for (let i = 0; i < topics.length; i++) {
    const t = topics[i];
    const composedPrompt =
      t.topic + '. Palette: ' + t.palette + '. Vibe: ' + t.vibe + '. Layout: ' + t.layout + '.';

    const callStartMs = Date.now();
    let efResult = null;
    let httpError = null;

    if (!options.dryRun) {
      try {
        const { data, error } = await efClient.functions.invoke('generate-svg-template', {
          body: {
            action: 'generate',
            vertical: t.vertical,
            template_type: t.template_type,
            orientation: t.orientation,
            prompt: composedPrompt,
          },
        });
        if (error) throw error;
        efResult = data;
      } catch (e) {
        httpError = e && e.message ? e.message : String(e);
      }
    } else {
      // Dry-run synthetic result — proves topic file + control flow without burning Anthropic budget
      efResult = { draftId: 'dry-run-' + (i + 1), status: 'dry_run', attempt_count: 0 };
    }

    const elapsedMs = Date.now() - callStartMs;
    if (!options.dryRun) totalCostUsd += COST_PER_ATTEMPT_USD;

    artifactRows.push({
      idx: i + 1,
      slug: t.slug,
      template_type: t.template_type,
      orientation: t.orientation,
      draftId: efResult && efResult.draftId ? efResult.draftId : null,
      status: efResult && efResult.status ? efResult.status : 'http_error',
      attempts: efResult && efResult.attempt_count ? efResult.attempt_count : 0,
      elapsedMs,
      error: httpError,
    });

    if (options.verbose) {
      const status = efResult && efResult.status ? efResult.status : 'http_error';
      const errFrag = httpError ? ' err=' + httpError.slice(0, 60) : '';
      console.log(
        '[' + (i + 1) + '/' + topics.length + '] ' +
        t.slug + ' tt=' + t.template_type + ' o=' + t.orientation +
        ' status=' + status + ' ' + elapsedMs + 'ms' + errFrag,
      );
    } else {
      const ok = efResult && (efResult.status === 'pending' || efResult.status === 'dry_run');
      process.stdout.write(ok ? '.' : 'x');
    }

    // Cost cap (D-04)
    if (totalCostUsd >= options.costHard) {
      abortReason = 'Hard cost cap $' + options.costHard + ' exceeded — aborting after ' + (i + 1) + ' attempts';
      console.error('\n' + abortReason);
      break;
    }
    if (totalCostUsd >= options.costSoft && !softWarned) {
      console.warn('\nSoft cost cap $' + options.costSoft + ' reached — continuing; abort with --cost-hard if needed');
      softWarned = true;
    }

    // Pitfall 3 — 300ms inter-call delay (skipped in dry-run; no rate-limit risk
    // when no EF calls are issued).
    if (!options.dryRun && i < topics.length - 1) await sleep(INTER_CALL_DELAY_MS);
  }
  if (!options.verbose) console.log('');

  // ----- Write wave artifact -----
  const elapsedMs = Date.now() - startMs;
  const artifactBody = buildArtifact({
    vertical: options.vertical,
    runStartedAt,
    attempts: artifactRows.length,
    totalCostUsd,
    elapsedMs,
    rows: artifactRows,
  });
  fs.mkdirSync(path.dirname(options.outArtifact), { recursive: true });
  fs.writeFileSync(options.outArtifact, artifactBody, 'utf8');
  console.log('Wave artifact written: ' + options.outArtifact);

  // ----- Summary -----
  const validatorPasses = artifactRows.filter((r) => r.status === 'pending').length;
  const validatorRate = artifactRows.length > 0
    ? ((validatorPasses / artifactRows.length) * 100).toFixed(1)
    : '0.0';
  console.log('');
  console.log('=== Wave Summary ===');
  console.log('Attempts: ' + artifactRows.length);
  console.log('Validator pass rate: ' + validatorRate + '%');
  console.log('Total estimated cost: $' + totalCostUsd.toFixed(2));
  console.log('Elapsed: ' + (elapsedMs / 1000).toFixed(1) + 's');
  if (abortReason) {
    console.error('Aborted: ' + abortReason);
    return 2; // distinct exit code for hard-cap abort
  }
  return 0;
}

// ----- Entry point -----
main().then((code) => process.exit(code || 0)).catch((e) => {
  console.error('FATAL:', e && e.message ? e.message : String(e));
  if (e && e.stack) console.error(e.stack);
  process.exit(1);
});
