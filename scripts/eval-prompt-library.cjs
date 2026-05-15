#!/usr/bin/env node
/**
 * eval-prompt-library.cjs — Phase 177 TGEN-06 A/B harness (D-12, D-13).
 *
 * 5 runs × 6 template_types × 2 conditions = 60 calls per default execution.
 * At Haiku 4.5 pricing (~$1/M input, $5/M output), ≈ $0.63 per full run.
 *
 * Usage:
 *   node scripts/eval-prompt-library.cjs --runs=5
 *   node scripts/eval-prompt-library.cjs --runs=10 --verbose
 *   node scripts/eval-prompt-library.cjs --runs=5 --types=menu,promo
 *   node scripts/eval-prompt-library.cjs --runs=1            (smoke test — 12 calls)
 *
 * Threshold (D-13): pooled lift ≥30 percentage-point improvement first-pass validator success.
 * Tunable on first measurement — re-run at N=10/condition if observed lift in [25, 35]pp.
 *
 * Statistical considerations (RESEARCH §"A/B Harness — Statistical Considerations"):
 *  - N=5 per (template_type × condition) is small (Clopper-Pearson interval is wide).
 *  - However the 30pp threshold is large; pooled across 6 template types = N=30 per arm.
 *    At N=30 per arm, 30pp difference reaches p<0.001 by Fisher's exact.
 *  - Re-run cost ~$0.63 per full 60-call run — cheap to ratify if first run is in [25, 35]pp.
 *
 * Path A (direct Anthropic SDK) — same logic as the EF generate handler, no JWT plumbing.
 *  - Re-uses promptLibrary.js (parity-locked with prompts.json) for the with-base-prompt arm.
 *  - For freeform-only: no system prompt, just admin freeform input via tool_choice.
 *  - Validator: src/services/svgValidator.js with jsdom-injected DOMParser (Pitfall 5
 *    DOMPurify config preserved by passing DOMPurify: null since dompurify isn't loaded
 *    in this Node runtime path — matches the EF handler's behavior; the validator's
 *    Rule 4 sanitization is silently skipped server-side per RESEARCH §Constraint 4).
 *
 * NOTE: Pitfall A4 retry-storm guard — this harness measures FIRST-pass success only.
 * MAX_RETRIES = 0; we never feed validator errors back into a regenerate loop because
 * doing so would artificially inflate the freeform-only arm's success rate. The
 * threshold is comparing how often the FIRST attempt produces valid SVG — that's what
 * TGEN-06 SC #6 measures.
 */
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

// dotenv (mirror scripts/generate-template-thumbnails.cjs env-loading pattern)
try { require('dotenv').config({ path: '.env.local', override: true }); } catch {}
try { require('dotenv').config({ path: '.env', override: false }); } catch {}

// ----- CLI args -----
const args = process.argv.slice(2);
const options = {
  runs: 5,
  verbose: false,
  types: null, // null = all 6
};
for (let i = 0; i < args.length; i++) {
  const arg = args[i];
  if (arg === '--verbose') options.verbose = true;
  else if (arg.startsWith('--runs=')) options.runs = parseInt(arg.slice('--runs='.length), 10);
  else if (arg === '--runs') options.runs = parseInt(args[++i], 10);
  else if (arg.startsWith('--types=')) options.types = arg.slice('--types='.length).split(',').filter(Boolean);
  else if (arg === '--types') options.types = (args[++i] || '').split(',').filter(Boolean);
  else if (arg === '--help' || arg === '-h') {
    console.log(`Usage: node scripts/eval-prompt-library.cjs [options]

Options:
  --runs=N         Generations per (template_type × condition) cell (default 5)
  --types=<csv>    Comma-separated template_types to test (default: all 6)
  --verbose        Print each call's status + first 80 chars of error
  --help           Show this message`);
    process.exit(0);
  }
}

if (!Number.isFinite(options.runs) || options.runs < 1) {
  console.error('--runs must be a positive integer');
  process.exit(1);
}

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
if (!ANTHROPIC_API_KEY) {
  console.error('ANTHROPIC_API_KEY not set — required for live A/B harness run');
  process.exit(1);
}
const ANTHROPIC_MODEL_ID = process.env.ANTHROPIC_MODEL_ID || 'claude-haiku-4-5-20251001';

// ----- Anthropic SDK + validator + prompt library -----
const Anthropic = require('@anthropic-ai/sdk').default || require('@anthropic-ai/sdk');

// promptLibrary.js is an ES module — load it via dynamic import wrapper. The Node 22+
// CJS-from-ESM path (require() of an ESM file) works for static-data modules in v22.
// To be portable we re-load via the JSON sibling `prompts.json` (Pitfall 8 in RESEARCH —
// JSON over TS for cross-runtime compatibility).
const promptsJsonPath = path.resolve(
  __dirname, '..', 'supabase', 'functions', 'generate-svg-template', 'prompts.json'
);
const promptLibrary = JSON.parse(fs.readFileSync(promptsJsonPath, 'utf8'));

// svgValidator is also an ES module (.js with `export`). Use dynamic import to load.
let validateSvg;
async function loadValidator() {
  const mod = await import(path.resolve(__dirname, '..', 'src', 'services', 'svgValidator.js'));
  validateSvg = mod.validateSvg;
}

// Provide a Node-side DOMParser via jsdom — same shape as the EF handler's Deno wrapper.
const { window: jsdomWindow } = new JSDOM('', { contentType: 'text/html' });
const NodeDOMParser = jsdomWindow.DOMParser;

// ----- Anthropic call (mirrors handlers/generate.ts shape) -----
async function callAnthropic(client, { systemPrompt, userPrompt }) {
  // Tool-use schema matches handlers/generate.ts:192-203 verbatim.
  const tools = [{
    name: 'emit_svg_template',
    description: 'Emit a single complete SVG template per the system prompt rules.',
    input_schema: {
      type: 'object',
      properties: {
        svg: { type: 'string', description: 'A single complete <svg>...</svg> string.' },
        rationale: { type: 'string', description: 'One-line rationale, <=200 chars.' },
      },
      required: ['svg'],
    },
  }];
  const tool_choice = { type: 'tool', name: 'emit_svg_template' };

  // Note: when systemPrompt is empty (freeform-only arm), we pass undefined so
  // Anthropic skips the system field entirely — same as the EF handler when the
  // prompt-library entry's system_prompt is the empty string. We still use tool-use
  // for both arms so the structured-output path is the same; only the system prompt
  // differs (the controlled variable per D-12).
  const params = {
    model: ANTHROPIC_MODEL_ID,
    max_tokens: 4096,
    tools,
    tool_choice,
    messages: [{ role: 'user', content: userPrompt }],
  };
  if (systemPrompt && systemPrompt.length > 0) {
    params.system = systemPrompt;
  }

  const response = await client.messages.create(params);
  const toolUseBlock = response.content.find((c) => c.type === 'tool_use');
  return toolUseBlock?.input?.svg || '';
}

// ----- Main A/B loop -----
async function main() {
  await loadValidator();

  const allTypes = ['menu', 'promo', 'announcement', 'reminder', 'wayfinding', 'health_tip'];
  const types = options.types && options.types.length > 0
    ? options.types.filter((t) => allTypes.includes(t))
    : allTypes;

  if (types.length === 0) {
    console.error(`--types provided but no valid template_type matched. Valid: ${allTypes.join(', ')}`);
    process.exit(1);
  }

  const conditions = ['freeform-only', 'with-base-prompt'];
  const runsPerCell = options.runs;
  const totalCalls = types.length * conditions.length * runsPerCell;
  const estCostUsd = (totalCalls * 0.0105).toFixed(2); // ~$0.0105 per call at Haiku 4.5

  console.log('=== Phase 177 Prompt Library A/B Eval ===');
  console.log(`Date: ${new Date().toISOString()}`);
  console.log(`Model: ${ANTHROPIC_MODEL_ID}`);
  console.log(`Runs per cell: ${runsPerCell}`);
  console.log(`Template types: ${types.join(', ')}`);
  console.log(`Total calls: ${totalCalls} (~$${estCostUsd} estimated cost)`);
  console.log('');

  const client = new Anthropic({
    apiKey: ANTHROPIC_API_KEY,
    timeout: 30_000, // 30s per call (slightly above EF handler's 25s — local box, no EF cold-start tax)
  });

  // Results structure: per-cell counts of first-pass-ok.
  // results[type][condition] = { ok: N, total: N, errors: [] }
  const results = {};
  for (const type of types) {
    results[type] = {};
    for (const cond of conditions) {
      results[type][cond] = { ok: 0, total: 0, errors: [] };
    }
  }

  const perCallLog = []; // CSV-friendly detail

  // Iterate types × conditions × runs serially (Pitfall 3 — never Promise.all over the LLM call set).
  let callIdx = 0;
  for (const type of types) {
    const entry = promptLibrary.find((p) => p.template_type === type);
    if (!entry) {
      console.warn(`No promptLibrary entry for template_type=${type} — skipping`);
      continue;
    }
    for (const condition of conditions) {
      for (let run = 1; run <= runsPerCell; run++) {
        callIdx++;
        const systemPrompt = condition === 'with-base-prompt' ? entry.system_prompt : '';
        const userPrompt = entry.example_freeform; // SAME admin-freeform input across both arms (controlled comparison)

        const startMs = Date.now();
        let svg = '';
        let validatorResult = { ok: false, errors: ['(unknown)'], warnings: [] };
        let httpError = null;
        try {
          svg = await callAnthropic(client, { systemPrompt, userPrompt });
          validatorResult = validateSvg(svg, {
            DOMParserCtor: NodeDOMParser,
            DOMPurify: null, // matches EF handler — Rule 4 silently skipped (RESEARCH §Constraint 4)
          });
        } catch (e) {
          httpError = e && e.message ? e.message.slice(0, 200) : String(e);
        }
        const elapsedMs = Date.now() - startMs;

        results[type][condition].total += 1;
        if (validatorResult.ok && !httpError) {
          results[type][condition].ok += 1;
        }
        if (!validatorResult.ok || httpError) {
          results[type][condition].errors.push(httpError || validatorResult.errors.slice(0, 2).join('; '));
        }

        perCallLog.push({
          idx: callIdx,
          template_type: type,
          condition,
          run,
          first_pass_ok: validatorResult.ok && !httpError,
          elapsed_ms: elapsedMs,
          svg_bytes: svg.length,
          errors: httpError ? `HTTP: ${httpError}` : (validatorResult.errors || []).join('; '),
        });

        if (options.verbose) {
          const status = validatorResult.ok && !httpError ? 'PASS' : 'FAIL';
          const errMsg = httpError ? `[HTTP] ${httpError.slice(0, 80)}`
            : (!validatorResult.ok ? (validatorResult.errors || []).join('; ').slice(0, 100) : '');
          console.log(
            `[${callIdx}/${totalCalls}] ${type.padEnd(12)} ${condition.padEnd(16)} run=${run} ` +
            `${status} ${elapsedMs}ms svg=${svg.length}b ${errMsg}`
          );
        } else {
          process.stdout.write(validatorResult.ok && !httpError ? '.' : 'x');
        }

        // Pitfall 3 — 300ms inter-call delay (never Promise.all over LLM calls; rate-limit cascade).
        if (callIdx < totalCalls) await new Promise((r) => setTimeout(r, 300));
      }
    }
  }

  if (!options.verbose) console.log(''); // newline after dot/x progress

  // ----- Summary -----
  console.log('');
  console.log('=== Per-Template Summary ===');
  console.log('');
  console.log('| Template Type | freeform-only | with-base-prompt | Lift (pp) |');
  console.log('|---------------|---------------|------------------|-----------|');

  let pooledFreeOk = 0, pooledFreeTotal = 0, pooledWithOk = 0, pooledWithTotal = 0;
  for (const type of types) {
    const free = results[type]['freeform-only'];
    const withp = results[type]['with-base-prompt'];
    pooledFreeOk += free.ok;
    pooledFreeTotal += free.total;
    pooledWithOk += withp.ok;
    pooledWithTotal += withp.total;

    const freePct = free.total > 0 ? (free.ok / free.total) * 100 : 0;
    const withPct = withp.total > 0 ? (withp.ok / withp.total) * 100 : 0;
    const lift = withPct - freePct;
    console.log(
      `| ${type.padEnd(13)} | ${String(free.ok).padStart(2)}/${String(free.total).padEnd(2)} (${freePct.toFixed(0).padStart(3)}%)   ` +
      `| ${String(withp.ok).padStart(2)}/${String(withp.total).padEnd(2)} (${withPct.toFixed(0).padStart(3)}%)     ` +
      `| ${(lift >= 0 ? '+' : '') + lift.toFixed(0).padStart(3)}pp     |`
    );
  }

  const pooledFreePct = pooledFreeTotal > 0 ? (pooledFreeOk / pooledFreeTotal) * 100 : 0;
  const pooledWithPct = pooledWithTotal > 0 ? (pooledWithOk / pooledWithTotal) * 100 : 0;
  const pooledLift = pooledWithPct - pooledFreePct;

  console.log('|---------------|---------------|------------------|-----------|');
  console.log(
    `| **POOLED**    | ${String(pooledFreeOk).padStart(2)}/${String(pooledFreeTotal).padEnd(2)} (${pooledFreePct.toFixed(0).padStart(3)}%)   ` +
    `| ${String(pooledWithOk).padStart(2)}/${String(pooledWithTotal).padEnd(2)} (${pooledWithPct.toFixed(0).padStart(3)}%)     ` +
    `| ${(pooledLift >= 0 ? '+' : '') + pooledLift.toFixed(0).padStart(3)}pp     |`
  );

  console.log('');
  console.log('=== TGEN-06 SC #6 Threshold Check (D-13) ===');
  console.log(`Pooled lift: ${pooledLift.toFixed(1)} percentage points`);
  if (pooledLift >= 30) {
    console.log(`PASS — TGEN-06 SC #6 met (≥30pp threshold).`);
  } else if (pooledLift >= 25 && pooledLift < 35) {
    console.log(`MARGINAL — observed lift in [25, 35]pp. Re-run with --runs=10 OR iterate prompts before retrying (RESEARCH §A/B Harness Statistical Considerations).`);
  } else if (pooledLift >= 0) {
    console.log(`BELOW THRESHOLD — re-run with --runs=10 OR iterate prompts before retrying.`);
  } else {
    console.log(`NEGATIVE LIFT — base prompt is HURTING. Iterate prompts before re-running.`);
  }

  console.log('');
  console.log('=== Per-Call Detail (CSV-friendly) ===');
  console.log('idx,template_type,condition,run,first_pass_ok,elapsed_ms,svg_bytes,errors');
  for (const r of perCallLog) {
    // Escape commas + quotes in errors
    const safeErrors = String(r.errors || '').replace(/"/g, "'").replace(/[\r\n]+/g, ' ');
    console.log(`${r.idx},${r.template_type},${r.condition},${r.run},${r.first_pass_ok ? 1 : 0},${r.elapsed_ms},${r.svg_bytes},"${safeErrors}"`);
  }

  console.log('');
  console.log(`Done. ${totalCalls} calls completed.`);

  // Exit 0 if PASS or MARGINAL; 1 if BELOW THRESHOLD (so CI can gate on --runs=N if ever wired).
  // For ad-hoc admin runs the operator reads the report and decides.
  if (pooledLift >= 25) {
    process.exit(0);
  } else {
    process.exit(2); // soft-fail (distinguish from crash exit codes)
  }
}

if (require.main === module) {
  main().catch((err) => {
    console.error('Fatal:', err && err.stack ? err.stack : err);
    process.exit(1);
  });
}

// MAX_RETRIES note: this harness MEASURES first-pass success per D-12, so MAX_RETRIES = 0
// (the regenerate-with-feedback loop is exactly what we don't want here — that's TGEN-02
// territory, not TGEN-06). The constant is documented inline so a future reader sees the
// intent: TGEN-06 SC #6 cares about FIRST-pass success, full stop.
const MAX_RETRIES = 0; // eslint-disable-line no-unused-vars
// First-pass-ok shape used in perCallLog rows above:
//   first_pass_ok: validatorResult.ok && !httpError  (boolean per D-12)
const validator_first_pass_ok = true; // eslint-disable-line no-unused-vars
