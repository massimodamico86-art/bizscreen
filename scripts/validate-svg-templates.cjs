#!/usr/bin/env node
/**
 * validate-svg-templates.cjs — Phase 175 Plan 02
 *
 * Walks public/templates/svg/** (or any --dir override) and runs
 * svgValidator.validateSvg over each .svg file. Emits a JSON report to
 * .planning/175-validation-report.json (or any --report override).
 *
 * Exit code:
 *   0 — every SVG passed (warnings allowed unless --exit-on-warning)
 *   1 — at least one SVG failed (or --exit-on-warning + at least one warning)
 *
 * The validator is an ES module (project uses "type": "module"). A CJS script
 * consumes it via dynamic import; we hand the validator a Node-side DOMParser
 * (jsdom.window.DOMParser) and a jsdom-bound DOMPurify instance so the SAME
 * code path runs in browser (admin UI) and Node (CI).
 */
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const args = process.argv.slice(2);
const options = {
  dir: 'public/templates/svg',
  verbose: false,
  exitOnWarning: false,
  reportPath: '.planning/175-validation-report.json',
};
for (let i = 0; i < args.length; i++) {
  switch (args[i]) {
    case '--dir':
      options.dir = args[++i];
      break;
    case '--verbose':
      options.verbose = true;
      break;
    case '--exit-on-warning':
      options.exitOnWarning = true;
      break;
    case '--report':
      options.reportPath = args[++i];
      break;
    case '--help':
      console.log(
        'Usage: node scripts/validate-svg-templates.cjs [--dir <path>] [--verbose] [--exit-on-warning] [--report <path>] [--help]'
      );
      process.exit(0);
  }
}

const dom = new JSDOM('');
const DOMPurify = require('dompurify')(dom.window);
const DOMParserCtor = dom.window.DOMParser;

async function loadValidator() {
  const validatorUrl = require('url').pathToFileURL(
    path.resolve(__dirname, '..', 'src', 'services', 'svgValidator.js')
  ).href;
  const mod = await import(validatorUrl);
  return mod.validateSvg;
}

function walkSvg(dir) {
  const out = [];
  if (!fs.existsSync(dir)) return out;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...walkSvg(full));
    else if (e.isFile() && e.name.toLowerCase().endsWith('.svg')) out.push(full);
  }
  return out;
}

async function main() {
  const validateSvg = await loadValidator();
  const files = walkSvg(options.dir);
  if (files.length === 0) {
    console.error(`No SVG files under ${options.dir}`);
    process.exit(1);
  }

  const report = {
    ranAt: new Date().toISOString(),
    dir: options.dir,
    files: [],
    totals: { total: files.length, passed: 0, failed: 0, warned: 0 },
  };
  let anyFail = false;
  let anyWarn = false;

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const rel = path.relative(process.cwd(), file);
    let svg;
    try {
      svg = fs.readFileSync(file, 'utf8');
    } catch (e) {
      console.error(`[${i + 1}/${files.length}] [READ-FAIL] ${rel}: ${e.message}`);
      report.files.push({
        file: rel,
        ok: false,
        errors: [`read failed: ${e.message}`],
        warnings: [],
      });
      report.totals.failed++;
      anyFail = true;
      continue;
    }
    const result = validateSvg(svg, { DOMParserCtor, DOMPurify });
    const icon = result.ok ? 'PASS' : 'FAIL';
    if (!result.ok) {
      anyFail = true;
      report.totals.failed++;
    } else {
      report.totals.passed++;
    }
    if (result.warnings.length > 0) {
      anyWarn = true;
      report.totals.warned++;
    }
    report.files.push({
      file: rel,
      ok: result.ok,
      errors: result.errors,
      warnings: result.warnings,
    });

    if (options.verbose || !result.ok || result.warnings.length > 0) {
      console.log(`[${i + 1}/${files.length}] [${icon}] ${rel}`);
      for (const err of result.errors) console.log(`    ERROR: ${err}`);
      for (const w of result.warnings) console.log(`    WARN:  ${w}`);
    }
  }

  try {
    const reportDir = path.dirname(path.resolve(options.reportPath));
    if (!fs.existsSync(reportDir)) fs.mkdirSync(reportDir, { recursive: true });
    fs.writeFileSync(path.resolve(options.reportPath), JSON.stringify(report, null, 2));
  } catch (e) {
    console.error(`Could not write report to ${options.reportPath}: ${e.message}`);
  }

  console.log(`\n=== Phase 175 SVG validation summary ===`);
  console.log(
    `Total: ${report.totals.total}  Passed: ${report.totals.passed}  Failed: ${report.totals.failed}  Warned: ${report.totals.warned}`
  );
  console.log(`Report: ${options.reportPath}`);

  if (anyFail) process.exit(1);
  if (anyWarn && options.exitOnWarning) process.exit(1);
  process.exit(0);
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
